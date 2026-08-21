#!/usr/bin/env python3
import csv
import io
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

BASE = Path(__file__).resolve().parents[1]
DATA_DIR = BASE / "data"
RECORDS_FILE = DATA_DIR / "records.json"
SOURCES_FILE = DATA_DIR / "sources.json"

ESMA_PAGE = "https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica"
CASP_URL = "https://www.esma.europa.eu/sites/default/files/2024-12/CASPS.csv"
NCASP_URL = "https://www.esma.europa.eu/sites/default/files/2024-12/NCASP.csv"
USER_AGENT = "Akademie-Fruehwarn-Check/1.0 (+https://tools.liquiditybooster.de/pages/projekt-fruehwarn-check/)"


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def norm_header(value):
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


def clean(value):
    return re.sub(r"\s+", " ", str(value or "").strip())


def download_csv(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/csv,*/*;q=0.8"})
    with urllib.request.urlopen(req, timeout=45) as response:
        raw = response.read()
    if len(raw) < 200:
        raise RuntimeError(f"ESMA-Datei unerwartet klein: {url}")
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            text = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise RuntimeError(f"Kodierung konnte nicht gelesen werden: {url}")
    sample = text[:10000]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    rows = [dict(row) for row in reader if any(clean(v) for v in row.values())]
    if not rows:
        raise RuntimeError(f"Keine Datensätze in ESMA-Datei: {url}")
    return rows


def keymap(row):
    return {norm_header(k): k for k in row.keys()}


def pick(row, exact=(), contains=(), exclude=()):
    km = keymap(row)
    for wanted in exact:
        key = km.get(norm_header(wanted))
        if key and clean(row.get(key)):
            return clean(row.get(key))
    for nk, original in km.items():
        if contains and not any(token in nk for token in contains):
            continue
        if exclude and any(token in nk for token in exclude):
            continue
        value = clean(row.get(original))
        if value:
            return value
    return ""


def all_values(row, contains=()):
    values = []
    for k, v in row.items():
        nk = norm_header(k)
        if contains and not any(token in nk for token in contains):
            continue
        value = clean(v)
        if value and value not in values:
            values.append(value)
    return values


def split_names(value):
    if not value:
        return []
    parts = re.split(r"\s*(?:\||;|\n|\r)\s*", value)
    return [p for p in (clean(x) for x in parts) if p]


def extract_domains(values):
    domains = []
    pattern = re.compile(r"(?:https?://)?(?:www\.)?([a-z0-9][a-z0-9.-]*\.[a-z]{2,})(?::\d+)?(?:[/\s,;|]|$)", re.I)
    for value in values:
        for match in pattern.finditer(str(value or "")):
            domain = match.group(1).lower().strip(".")
            if domain and domain not in domains:
                domains.append(domain)
        for token in re.split(r"[\s,;|]+", str(value or "")):
            token = token.strip("()[]{}<>.,;\"'")
            if token.startswith(("http://", "https://")):
                try:
                    host = (urlparse(token).hostname or "").lower().removeprefix("www.")
                    if host and host not in domains:
                        domains.append(host)
                except ValueError:
                    pass
    return domains


def stable_id(source_id, index, name, domains, date):
    seed = "|".join([source_id, clean(name).lower(), ",".join(domains), clean(date)])
    import hashlib
    return f"{source_id}-{hashlib.sha1(seed.encode('utf-8')).hexdigest()[:14]}-{index}"


def legal_name(row):
    value = pick(
        row,
        exact=("Name", "Entity name", "Legal name", "Name of crypto-asset service provider"),
        contains=("name",),
        exclude=("authority", "competent", "trade", "commercial", "memberstate", "country", "service", "platform")
    )
    return value


def trade_name(row):
    return pick(row, exact=("Trade name", "Commercial name"), contains=("tradename", "commercialname"))


def authority(row):
    return pick(row, exact=("Competent authority", "Supervisor"), contains=("competentauthority", "supervisor", "authority"), exclude=("date",)) or "ESMA / zuständige nationale Aufsicht"


def country(row):
    return pick(row, exact=("Member State", "Home Member State", "Country"), contains=("memberstate", "country"), exclude=("host",))


def website_values(row):
    return all_values(row, contains=("website", "webaddress", "url"))


def decision_date(row):
    return pick(row, exact=("Decision date",), contains=("decisiondate",))


def authorisation_date(row):
    return pick(row, exact=("Authorisation date", "Authorization date", "Date of authorisation", "Date of authorization"), contains=("authorisationdate", "authorizationdate"))


def withdrawal_date(row):
    return pick(row, exact=("Authorisation withdrawal/End date", "Authorization withdrawal/End date"), contains=("withdrawal", "enddate"))


def reason(row):
    return pick(row, exact=("Reason",), contains=("reason", "infringement", "violation"))


def casp_records(rows):
    result = []
    for i, row in enumerate(rows, start=1):
        name = legal_name(row) or trade_name(row)
        trade = trade_name(row)
        aliases = [x for x in split_names(trade) if x.lower() != name.lower()] if name else split_names(trade)
        domains = extract_domains(website_values(row))
        auth_date = authorisation_date(row)
        withdrawn = withdrawal_date(row)
        if not name and not domains:
            continue
        summary_de = "Eintrag im offiziellen ESMA-MiCA-Register autorisierter Crypto-Asset Service Provider."
        summary_en = "Entry in the official ESMA MiCA register of authorised crypto-asset service providers."
        if withdrawn:
            summary_de += f" Im Datensatz ist ein Ende/Widerruf der Zulassung mit {withdrawn} vermerkt."
            summary_en += f" The dataset records an authorisation end/withdrawal date of {withdrawn}."
        record = {
            "id": stable_id("esma-casp", i, name, domains, auth_date),
            "source_id": "esma-casp",
            "region": "EU",
            "type": "register",
            "status": "authorized" if not withdrawn else "authorization_ended",
            "name": name or (domains[0] if domains else "ESMA CASP"),
            "aliases": aliases,
            "domains": domains,
            "authority": authority(row),
            "country": country(row),
            "date": auth_date,
            "title": "ESMA MiCA – autorisierter CASP",
            "summary_de": summary_de,
            "summary_en": summary_en,
            "source_url": ESMA_PAGE,
            "source_dataset": CASP_URL,
            "withdrawal_date": withdrawn,
            "match_terms": [x for x in [name, trade, *domains] if x]
        }
        result.append(record)
    return result


def ncasp_records(rows):
    result = []
    for i, row in enumerate(rows, start=1):
        name = legal_name(row) or trade_name(row)
        trade = trade_name(row)
        aliases = [x for x in split_names(trade) if not name or x.lower() != name.lower()]
        web_values = website_values(row)
        domains = extract_domains(web_values)
        date = decision_date(row)
        why = reason(row)
        if not name and not domains:
            continue
        summary_de = "Eintrag im offiziellen ESMA-MiCA-Register nicht konformer Anbieter von Kryptowerte-Dienstleistungen."
        summary_en = "Entry in the official ESMA MiCA register of non-compliant entities providing crypto-asset services."
        if why:
            summary_de += f" Behördlicher Grund: {why}"
            summary_en += f" Regulatory reason: {why}"
        record = {
            "id": stable_id("esma-non-compliant", i, name, domains, date),
            "source_id": "esma-non-compliant",
            "region": "EU",
            "type": "warning",
            "status": "non_compliant",
            "name": name or (domains[0] if domains else "ESMA Non-Compliant Entity"),
            "aliases": aliases,
            "domains": domains,
            "authority": authority(row),
            "country": country(row),
            "date": date,
            "title": "ESMA MiCA – Non-Compliant Entity",
            "summary_de": summary_de,
            "summary_en": summary_en,
            "source_url": ESMA_PAGE,
            "source_dataset": NCASP_URL,
            "reason": why,
            "match_terms": [x for x in [name, trade, *domains] if x]
        }
        result.append(record)
    return result


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


def update_sources(success_at, casp_count, ncasp_count):
    payload = load_json(SOURCES_FILE, {"schema_version": "1.0", "sources": []})
    for source in payload.get("sources", []):
        if source.get("id") in {"esma-casp", "esma-non-compliant"}:
            source["mode"] = "auto"
            source["status"] = "available"
            source["last_success"] = success_at
            source["record_count"] = casp_count if source.get("id") == "esma-casp" else ncasp_count
            source["note_de"] = "Automatisch aus dem offiziellen ESMA-MiCA-CSV-Datensatz aktualisiert."
            source["note_en"] = "Automatically updated from the official ESMA MiCA CSV dataset."
    payload["last_review"] = success_at[:10]
    write_json(SOURCES_FILE, payload)


def main():
    print("ESMA CASP laden …")
    casp_rows = download_csv(CASP_URL)
    print("ESMA Non-Compliant laden …")
    ncasp_rows = download_csv(NCASP_URL)

    casp = casp_records(casp_rows)
    ncasp = ncasp_records(ncasp_rows)

    # Sicherheitsnetz: niemals einen gültigen Datenbestand durch offensichtlich defekte/leer geladene Quellen ersetzen.
    if len(casp) < 100:
        raise RuntimeError(f"CASP-Validierung fehlgeschlagen: nur {len(casp)} verwertbare Datensätze")
    if len(ncasp) < 50:
        raise RuntimeError(f"NCASP-Validierung fehlgeschlagen: nur {len(ncasp)} verwertbare Datensätze")

    existing = load_json(RECORDS_FILE, {"schema_version": "1.0", "records": [], "source_status": {}})
    keep = [r for r in existing.get("records", []) if r.get("source_id") not in {"esma-casp", "esma-non-compliant"}]
    generated = now_iso()
    combined = keep + casp + ncasp
    combined.sort(key=lambda r: (r.get("region", ""), r.get("source_id", ""), r.get("name", "").lower()))

    source_status = existing.get("source_status", {}) or {}
    source_status["esma-casp"] = {
        "status": "available",
        "last_success": generated,
        "records": len(casp),
        "dataset": CASP_URL
    }
    source_status["esma-non-compliant"] = {
        "status": "available",
        "last_success": generated,
        "records": len(ncasp),
        "dataset": NCASP_URL
    }

    payload = {
        "schema_version": "1.0",
        "generated_at": generated,
        "source_status": source_status,
        "records": combined
    }
    write_json(RECORDS_FILE, payload)
    update_sources(generated, len(casp), len(ncasp))

    print(f"OK: {len(casp)} CASP + {len(ncasp)} Non-Compliant = {len(casp)+len(ncasp)} ESMA-Datensätze")
    print(f"Gesamtbestand: {len(combined)} Datensätze")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"FEHLER: {exc}", file=sys.stderr)
        sys.exit(1)
