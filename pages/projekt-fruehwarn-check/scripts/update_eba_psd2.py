#!/usr/bin/env python3
import hashlib
import json
import re
import sys
import tempfile
import urllib.request
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

try:
    import ijson
except ImportError:
    print("FEHLER: ijson fehlt. Workflow muss 'pip install ijson' ausführen.", file=sys.stderr)
    sys.exit(2)

BASE = Path(__file__).resolve().parents[1]
DATA_DIR = BASE / "data"
RECORDS_FILE = DATA_DIR / "records.json"
SOURCES_FILE = DATA_DIR / "sources.json"

SOURCE_ID = "eba-psd2-register"
META_URL = "https://euclid.eba.europa.eu/register/api/filemetadata"
REGISTER_URL = "https://euclid.eba.europa.eu/register/pir"
USER_AGENT = "Akademie-Fruehwarn-Check/1.0 (+https://tools.liquiditybooster.de/pages/projekt-fruehwarn-check/)"

# Eigentliche Anbieter-/Rechtstraeger-Kategorien. Agenten und EEA-Niederlassungen
# werden bewusst nicht in den lokalen Suchbestand uebernommen.
TYPE_INFO = {
    "PSD_PI": {
        "de": "Zahlungsinstitut",
        "en": "Payment institution",
        "active": "authorized",
        "ended": "authorization_ended",
    },
    "PSD_EPI": {
        "de": "ausgenommenes Zahlungsinstitut",
        "en": "Exempted payment institution",
        "active": "exempted",
        "ended": "exemption_ended",
    },
    "PSD_AISP": {
        "de": "Kontoinformationsdienst (AISP)",
        "en": "Account information service provider (AISP)",
        "active": "registered",
        "ended": "registration_ended",
    },
    "PSD_EMI": {
        "de": "E-Geld-Institut",
        "en": "Electronic money institution",
        "active": "authorized",
        "ended": "authorization_ended",
    },
    "PSD_EEMI": {
        "de": "ausgenommenes E-Geld-Institut",
        "en": "Exempted electronic money institution",
        "active": "exempted",
        "ended": "exemption_ended",
    },
    "PSD_ENL": {
        "de": "nach nationalem Recht zur Erbringung von Zahlungsdiensten berechtigte Einrichtung",
        "en": "Institution entitled under national law to provide payment services",
        "active": "national_entitlement",
        "ended": "national_entitlement_ended",
    },
    "PSD_EXC": {
        "de": "vom PSD2-Anwendungsbereich ausgenommener Dienstleister",
        "en": "Service provider excluded from the scope of PSD2",
        "active": "excluded_scope",
        "ended": "excluded_scope_ended",
    },
}


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def clean(value):
    return re.sub(r"\s+", " ", str(value or "").strip())


def load_json(path, fallback):
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json,*/*;q=0.8"})
    with urllib.request.urlopen(req, timeout=45) as response:
        raw = response.read()
    return json.loads(raw.decode("utf-8"))


def download_to(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/zip,*/*;q=0.8"})
    digest = hashlib.sha256()
    total = 0
    with urllib.request.urlopen(req, timeout=180) as response, open(path, "wb") as out:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
            digest.update(chunk)
            total += len(chunk)
    return total, digest.hexdigest()


def prop_map(entity):
    result = {}
    for item in entity.get("Properties") or []:
        if not isinstance(item, dict):
            continue
        for key, value in item.items():
            if key not in result:
                result[key] = value
            else:
                old = result[key]
                if not isinstance(old, list):
                    old = [old]
                if isinstance(value, list):
                    old.extend(value)
                else:
                    old.append(value)
                result[key] = old
    return result


def as_list(value):
    if value is None or value == "":
        return []
    if isinstance(value, list):
        return [clean(v) for v in value if clean(v)]
    return [clean(value)] if clean(value) else []


def unique(values):
    out = []
    seen = set()
    for value in values:
        v = clean(value)
        if not v:
            continue
        key = v.casefold()
        if key in seen:
            continue
        seen.add(key)
        out.append(v)
    return out


def extract_domains_from_values(values):
    domains = []
    pattern = re.compile(r"(?:https?://)?(?:www\.)?([a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?\.[a-z]{2,})(?::\d+)?(?:[/\s,;|)]|$)", re.I)
    for value in values:
        if isinstance(value, list):
            items = value
        else:
            items = [value]
        for item in items:
            for match in pattern.finditer(str(item or "")):
                host = match.group(1).lower().strip(".")
                if host and host not in domains:
                    domains.append(host)
    return domains


def stable_id(entity_type, entity_code):
    seed = f"{SOURCE_ID}|{entity_type}|{entity_code}".encode("utf-8")
    return f"{SOURCE_ID}-{hashlib.sha1(seed).hexdigest()[:18]}"


def active_from_history(history):
    # EBA-Oberflaeche interpretiert ENT_AUT als Wechselhistorie: ungerade Anzahl
    # der Zeitpunkte = derzeit YES/aktiv, gerade Anzahl = derzeit NO/inaktiv.
    dates = as_list(history)
    if not dates:
        return None, []
    return (len(dates) % 2 == 1), dates


def service_summary(entity, home_country):
    countries = []
    home_services = []
    for item in entity.get("Services") or []:
        if not isinstance(item, dict):
            continue
        for country, services in item.items():
            cc = clean(country).upper()
            if cc and cc not in countries:
                countries.append(cc)
            if cc == clean(home_country).upper():
                home_services.extend(as_list(services))
    return unique(home_services), countries


def normalize_entity(entity, dataset_url):
    entity_type = clean(entity.get("EntityType"))
    if entity_type not in TYPE_INFO:
        return None
    entity_code = clean(entity.get("EntityCode"))
    props = prop_map(entity)
    name = clean(props.get("ENT_NAM"))
    if not name or not entity_code:
        return None

    aliases = []
    for key, value in props.items():
        if key.startswith("ENT_NAM") and key != "ENT_NAM":
            aliases.extend(as_list(value))
    aliases = [x for x in unique(aliases) if x.casefold() != name.casefold()]

    country = clean(props.get("ENT_COU_RES")).upper()
    city = clean(props.get("ENT_TOW_CIT_RES"))
    address = clean(props.get("ENT_ADD"))
    postal_code = clean(props.get("ENT_POS_COD"))
    national_reference = clean(props.get("ENT_NAT_REF_COD"))
    current, auth_dates = active_from_history(props.get("ENT_AUT"))
    info = TYPE_INFO[entity_type]
    status = info["active"] if current is not False else info["ended"]

    # Manche Kategorien koennen ohne ENT_AUT geliefert werden; dann wird nur der
    # offizielle Registerstatus wiedergegeben und keine Aktivitaet hinzuerfunden.
    if current is None:
        status = "listed"

    home_services, service_countries = service_summary(entity, country)
    domains = extract_domains_from_values(list(props.values()))

    view_url = f"https://euclid.eba.europa.eu/register/pir/view/{quote(entity_type, safe='')}/{quote(entity_code, safe='!')}"
    category_de = info["de"]
    category_en = info["en"]

    if current is False:
        summary_de = f"Offizieller Eintrag im EBA-PSD2-Zentralregister als {category_de}. Die im Datensatz gefuehrte Statushistorie weist den Eintrag derzeit als beendet/inaktiv aus."
        summary_en = f"Official entry in the EBA PSD2 central register as {category_en}. The status history in the dataset currently indicates that the entry has ended/is inactive."
    elif current is True:
        summary_de = f"Offizieller Eintrag im EBA-PSD2-Zentralregister als {category_de}. Die im Datensatz gefuehrte Statushistorie weist den Eintrag derzeit als aktiv aus."
        summary_en = f"Official entry in the EBA PSD2 central register as {category_en}. The status history in the dataset currently indicates an active entry."
    else:
        summary_de = f"Offizieller Eintrag im EBA-PSD2-Zentralregister als {category_de}. Fuer diesen Datensatz wird keine eindeutige ENT_AUT-Statushistorie ausgewiesen."
        summary_en = f"Official entry in the EBA PSD2 central register as {category_en}. No unambiguous ENT_AUT status history is provided for this record."

    summary_de += " Das EBA-Zentralregister gibt die Meldungen nationaler Aufsichtsbehoerden wieder; rechtlich massgeblich bleibt das jeweilige nationale Register."
    summary_en += " The EBA central register reproduces information supplied by national competent authorities; the relevant national register remains legally authoritative."

    match_terms = unique([name, *aliases, *domains])
    return {
        "id": stable_id(entity_type, entity_code),
        "source_id": SOURCE_ID,
        "region": "EU",
        "type": "register",
        "status": status,
        "name": name,
        "aliases": aliases,
        "domains": domains,
        "authority": "European Banking Authority / zuständige nationale Aufsicht",
        "competent_authority_code": clean(entity.get("CA_OwnerID")),
        "country": country,
        "date": auth_dates[0] if auth_dates else "",
        "last_status_date": auth_dates[-1] if auth_dates else "",
        "authorization_history": auth_dates,
        "title": f"EBA PSD2 – {category_de}",
        "summary_de": summary_de,
        "summary_en": summary_en,
        "source_url": view_url,
        "source_dataset": dataset_url,
        "entity_type": entity_type,
        "entity_code": entity_code,
        "national_reference": national_reference,
        "address": address,
        "city": city,
        "postal_code": postal_code,
        "home_services": home_services,
        "service_country_count": len(service_countries),
        "last_update": clean(entity.get("__EBA_EntityVersion")),
        "match_terms": match_terms,
    }


def update_sources(success_at, count, dataset_url, dataset_timestamp, sha256_hash, type_counts):
    payload = load_json(SOURCES_FILE, {"schema_version": "1.0", "sources": []})
    sources = payload.setdefault("sources", [])
    source = next((s for s in sources if s.get("id") == SOURCE_ID), None)
    if source is None:
        source = {"id": SOURCE_ID}
        sources.append(source)
    source.update({
        "region": "EU",
        "category": "financial_supervision",
        "name": "EBA PSD2 – Zahlungs- und E-Geld-Institute",
        "authority": "European Banking Authority",
        "mode": "auto",
        "status": "available",
        "url": "https://www.eba.europa.eu/risk-and-data-analysis/data/registers/payment-institutions-register",
        "note_de": "Automatisch aus dem offiziellen maschinenlesbaren EBA-PSD2-Gesamtdatensatz aktualisiert. Agenten und Niederlassungen werden fuer den Fruehwarn-Check nicht als eigene Suchtreffer gespiegelt. Das EBA-Zentralregister hat keine eigene Rechtswirkung; rechtlich massgeblich bleiben die nationalen Register.",
        "note_en": "Automatically updated from the official machine-readable EBA PSD2 full dataset. Agents and branches are not mirrored as separate search results. The EBA central register has no legal significance of its own; national registers remain legally authoritative.",
        "last_success": success_at,
        "record_count": count,
        "dataset_url": dataset_url,
        "dataset_timestamp": dataset_timestamp,
        "dataset_sha256": sha256_hash,
        "entity_type_counts": dict(type_counts),
    })
    payload["last_review"] = success_at[:10]
    write_json(SOURCES_FILE, payload)


def main():
    print("EBA PSD2: Metadaten laden …")
    meta = fetch_json(META_URL)
    dataset_url = clean(meta.get("golden_copy_path_context")) + clean(meta.get("latest_version_relative_zip_path"))
    expected_sha = clean(meta.get("sha256_hash")).lower()
    expected_size = int(str(meta.get("latest_version_relative_zip_size") or "0"))
    dataset_timestamp = clean(meta.get("timestamp"))
    if not dataset_url.startswith("https://euclid.eba.europa.eu/") or not expected_sha:
        raise RuntimeError("EBA-Metadaten unvollstaendig oder unerwartet")

    with tempfile.TemporaryDirectory(prefix="eba-psd2-") as td:
        zip_path = Path(td) / "eba-psd2.zip"
        print("EBA PSD2: offiziellen ZIP-Datensatz laden …")
        actual_size, actual_sha = download_to(dataset_url, zip_path)
        if expected_size and actual_size != expected_size:
            raise RuntimeError(f"EBA-Dateigroesse stimmt nicht: {actual_size} statt {expected_size}")
        if actual_sha.lower() != expected_sha:
            raise RuntimeError(f"EBA-SHA256 stimmt nicht: {actual_sha} statt {expected_sha}")

        print("EBA PSD2: relevante Rechtstraeger streamend normalisieren …")
        normalized = []
        type_counts = Counter()
        scanned = 0
        with zipfile.ZipFile(zip_path) as archive:
            json_names = [i.filename for i in archive.infolist() if i.filename.lower().endswith(".json")]
            if len(json_names) != 1:
                raise RuntimeError(f"Unerwartete Zahl JSON-Dateien im EBA-ZIP: {len(json_names)}")
            with archive.open(json_names[0], "r") as stream:
                for item in ijson.items(stream, "item.item"):
                    if not isinstance(item, dict) or "EntityType" not in item:
                        continue
                    scanned += 1
                    entity_type = clean(item.get("EntityType"))
                    if entity_type not in TYPE_INFO:
                        continue
                    rec = normalize_entity(item, dataset_url)
                    if rec:
                        normalized.append(rec)
                        type_counts[entity_type] += 1

    # Sicherheitsnetz: niemals einen gueltigen Bestand durch einen defekten Abruf ersetzen.
    if scanned < 100000:
        raise RuntimeError(f"EBA-Validierung fehlgeschlagen: nur {scanned} Entitaeten im Gesamtdatensatz erkannt")
    if len(normalized) < 1000:
        raise RuntimeError(f"EBA-Validierung fehlgeschlagen: nur {len(normalized)} relevante Rechtstraeger")
    if type_counts.get("PSD_PI", 0) < 500 or type_counts.get("PSD_EMI", 0) < 100:
        raise RuntimeError(f"EBA-Validierung fehlgeschlagen: unplausible Typverteilung {dict(type_counts)}")

    existing = load_json(RECORDS_FILE, {"schema_version": "1.0", "records": [], "source_status": {}})
    keep = [r for r in existing.get("records", []) if r.get("source_id") != SOURCE_ID]
    generated = now_iso()
    normalized.sort(key=lambda r: (r.get("name", "").casefold(), r.get("entity_type", ""), r.get("entity_code", "")))
    combined = keep + normalized
    combined.sort(key=lambda r: (r.get("region", ""), r.get("source_id", ""), r.get("name", "").casefold()))

    source_status = existing.get("source_status", {}) or {}
    source_status[SOURCE_ID] = {
        "status": "available",
        "last_success": generated,
        "records": len(normalized),
        "dataset": dataset_url,
        "dataset_timestamp": dataset_timestamp,
        "sha256": expected_sha,
        "entity_type_counts": dict(type_counts),
    }
    payload = {
        "schema_version": existing.get("schema_version", "1.0"),
        "generated_at": generated,
        "source_status": source_status,
        "records": combined,
    }
    write_json(RECORDS_FILE, payload)
    update_sources(generated, len(normalized), dataset_url, dataset_timestamp, expected_sha, type_counts)

    print(f"OK: {scanned} EBA-Entitaeten gelesen; {len(normalized)} relevante Anbieter-Rechtstraeger gespeichert")
    print("Typen:", dict(type_counts))
    print(f"Gesamtbestand: {len(combined)} Datensaetze")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"FEHLER: {exc}", file=sys.stderr)
        sys.exit(1)
