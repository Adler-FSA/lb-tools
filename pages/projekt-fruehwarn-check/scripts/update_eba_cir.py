#!/usr/bin/env python3
import hashlib
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
DATA_DIR = BASE / "data"
RECORDS_FILE = DATA_DIR / "records.json"
SOURCES_FILE = DATA_DIR / "sources.json"

SOURCE_ID = "eba-credit-institutions"
API_URL = "https://euclid.eba.europa.eu/register/api/search/entities"
REGISTER_URL = "https://euclid.eba.europa.eu/register/cir/search"
USER_AGENT = "Akademie-Fruehwarn-Check/1.0 (+https://tools.liquiditybooster.de/pages/projekt-fruehwarn-check/)"

QUERY = {
    "$and": [
        {"_messagetype": "EUCLIDMD"},
        {"_payload.EntityType": "CRD_CRE_INS"},
    ]
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


def fetch_register():
    body = json.dumps(QUERY, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=body,
        method="POST",
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as response:
        raw = response.read()
    data = json.loads(raw.decode("utf-8"))
    if not isinstance(data, list):
        raise RuntimeError("EBA CIR: unerwartetes Antwortformat")
    return data, hashlib.sha256(raw).hexdigest()


def prop_map(entity):
    out = {}
    for item in entity.get("Properties") or []:
        if not isinstance(item, dict):
            continue
        for key, value in item.items():
            if key not in out:
                out[key] = value
            else:
                old = out[key]
                if not isinstance(old, list):
                    old = [old]
                if isinstance(value, list):
                    old.extend(value)
                else:
                    old.append(value)
                out[key] = old
    return out


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


def stable_id(entity_code):
    seed = f"{SOURCE_ID}|CRD_CRE_INS|{entity_code}".encode("utf-8")
    return f"{SOURCE_ID}-{hashlib.sha1(seed).hexdigest()[:18]}"


def active_from_history(history):
    # Die EBA-Daten führen ENT_AUT als Folge von Statuswechsel-Zeitpunkten.
    # Eine ungerade Zahl bedeutet aktuell aktiv, eine gerade Zahl beendet/inaktiv.
    dates = as_list(history)
    if not dates:
        return None, []
    return (len(dates) % 2 == 1), dates


def normalize_entity(raw):
    entity = raw.get("_payload", raw) if isinstance(raw, dict) else {}
    if entity.get("EntityType") != "CRD_CRE_INS":
        return None

    entity_code = clean(entity.get("EntityCode"))
    props = prop_map(entity)
    name = clean(props.get("ENT_NAM"))
    if not entity_code or not name:
        return None

    aliases = []
    for key in ("ENT_NAM_NON_LAT", "ENT_NAM_COM"):
        aliases.extend(as_list(props.get(key)))
    aliases = [x for x in unique(aliases) if x.casefold() != name.casefold()]

    current, auth_dates = active_from_history(props.get("ENT_AUT"))
    if current is True:
        status = "authorized"
        state_de = "Die im EBA-Datensatz geführte Zulassungshistorie weist den Eintrag derzeit als aktiv aus."
        state_en = "The authorisation history in the EBA dataset currently indicates an active entry."
    elif current is False:
        status = "authorization_ended"
        state_de = "Die im EBA-Datensatz geführte Zulassungshistorie weist den Eintrag derzeit als beendet/inaktiv aus."
        state_en = "The authorisation history in the EBA dataset currently indicates that the entry has ended/is inactive."
    else:
        status = "listed"
        state_de = "Für diesen Datensatz wird keine eindeutige ENT_AUT-Statushistorie ausgewiesen."
        state_en = "No unambiguous ENT_AUT status history is provided for this record."

    country = clean(props.get("ENT_COU_RES")).upper()
    city = clean(props.get("ENT_TOW_CIT_RES"))
    national_reference = clean(props.get("ENT_NAT_REF_COD"))
    lei = entity_code if re.fullmatch(r"[A-Z0-9]{20}", entity_code.upper()) else ""

    summary_de = (
        "Offizieller Eintrag im EBA-Kreditinstitutsregister als Kreditinstitut. "
        + state_de
        + " Das EBA-Register bündelt Angaben der zuständigen nationalen Aufsichtsbehörden; rechtlich maßgeblich bleiben die jeweiligen nationalen Register und Zuständigkeiten. Ein Registertreffer ist kein Gütesiegel für ein konkretes Angebot."
    )
    summary_en = (
        "Official entry in the EBA credit institutions register as a credit institution. "
        + state_en
        + " The EBA register consolidates information supplied by national competent authorities; the relevant national registers and competences remain legally authoritative. A register match is not a seal of approval for a specific offer."
    )

    match_terms = unique([name, *aliases, entity_code, lei, national_reference])
    return {
        "id": stable_id(entity_code),
        "source_id": SOURCE_ID,
        "region": "EU",
        "type": "register",
        "status": status,
        "name": name,
        "aliases": aliases,
        "domains": [],
        "authority": "European Banking Authority / zuständige nationale Aufsicht",
        "competent_authority_code": clean(entity.get("CA_OwnerID")),
        "country": country,
        "date": auth_dates[0] if auth_dates else "",
        "last_status_date": auth_dates[-1] if auth_dates else "",
        "authorization_history": auth_dates,
        "title": "EBA – Kreditinstitut",
        "summary_de": summary_de,
        "summary_en": summary_en,
        "source_url": REGISTER_URL,
        "source_dataset": API_URL,
        "entity_type": "CRD_CRE_INS",
        "entity_code": entity_code,
        "lei": lei,
        "national_reference": national_reference,
        "city": city,
        "last_update": clean(entity.get("__EBA_EntityVersion")),
        "match_terms": match_terms,
    }


def update_sources(success_at, count, response_sha):
    payload = load_json(SOURCES_FILE, {"schema_version": "1.0", "sources": []})
    sources = payload.setdefault("sources", [])
    source = next((s for s in sources if s.get("id") == SOURCE_ID), None)
    if source is None:
        source = {"id": SOURCE_ID}
        sources.append(source)
    source.update({
        "region": "EU",
        "category": "financial_supervision",
        "name": "EBA – Kreditinstitute (CRD)",
        "authority": "European Banking Authority",
        "mode": "auto",
        "status": "available",
        "url": REGISTER_URL,
        "note_de": "Automatisch aus dem offiziellen EBA-Kreditinstitutsregister aktualisiert. Gespiegelt werden die als CRD_CRE_INS geführten Kreditinstitute. Das EBA-Register bündelt Angaben nationaler Aufsichtsbehörden; rechtlich maßgeblich bleiben deren Register und Zuständigkeiten.",
        "note_en": "Automatically updated from the official EBA credit institutions register. The mirror contains entities classified as CRD_CRE_INS. The EBA register consolidates information from national competent authorities; their registers and competences remain legally authoritative.",
        "last_success": success_at,
        "record_count": count,
        "dataset_url": API_URL,
        "response_sha256": response_sha,
    })
    payload["last_review"] = success_at[:10]
    write_json(SOURCES_FILE, payload)


def main():
    print("EBA CIR: vollständigen Kreditinstitutsbestand laden …")
    raw_rows, response_sha = fetch_register()
    if len(raw_rows) < 3000:
        raise RuntimeError(f"EBA CIR Validierung fehlgeschlagen: nur {len(raw_rows)} Rohdatensätze")

    normalized = []
    for row in raw_rows:
        rec = normalize_entity(row)
        if rec:
            normalized.append(rec)

    if len(normalized) < 3000:
        raise RuntimeError(f"EBA CIR Validierung fehlgeschlagen: nur {len(normalized)} normalisierte Kreditinstitute")

    # Kritische Regression: Eine große deutsche Bank muss im offiziellen Bestand auffindbar sein.
    deutsche = [
        r for r in normalized
        if "deutsche bank" in r.get("name", "").casefold()
        and r.get("country") == "DE"
    ]
    if not deutsche:
        raise RuntimeError("EBA CIR Regression fehlgeschlagen: Deutsche Bank im deutschen Kreditinstitutsbestand nicht gefunden")

    existing = load_json(RECORDS_FILE, {"schema_version": "1.0", "records": [], "source_status": {}})
    keep = [r for r in existing.get("records", []) if r.get("source_id") != SOURCE_ID]
    generated = now_iso()

    normalized.sort(key=lambda r: (r.get("name", "").casefold(), r.get("entity_code", "")))
    combined = keep + normalized
    combined.sort(key=lambda r: (r.get("region", ""), r.get("source_id", ""), r.get("name", "").casefold()))

    source_status = existing.get("source_status", {}) or {}
    source_status[SOURCE_ID] = {
        "status": "available",
        "last_success": generated,
        "records": len(normalized),
        "dataset": API_URL,
        "response_sha256": response_sha,
    }
    payload = {
        "schema_version": existing.get("schema_version", "1.0"),
        "generated_at": generated,
        "source_status": source_status,
        "records": combined,
    }
    write_json(RECORDS_FILE, payload)
    update_sources(generated, len(normalized), response_sha)

    print(f"OK: {len(raw_rows)} EBA-Rohdatensätze; {len(normalized)} Kreditinstitute gespeichert")
    for r in deutsche[:5]:
        print("Regression Deutsche Bank:", r.get("name"), r.get("entity_code"), r.get("status"), r.get("competent_authority_code"))
    print(f"Gesamtbestand: {len(combined)} Datensätze")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"FEHLER: {exc}", file=sys.stderr)
        sys.exit(1)
