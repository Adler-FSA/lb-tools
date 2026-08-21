#!/usr/bin/env python3
import hashlib
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from bs4 import BeautifulSoup

BASE = Path(__file__).resolve().parents[1]
DATA_DIR = BASE / "data"
RECORDS_FILE = DATA_DIR / "records.json"
SOURCES_FILE = DATA_DIR / "sources.json"

SOURCE_ID = "cftc-red-list"
SOURCE_URL = "https://www.cftc.gov/LearnAndProtect/Resources/Check/redlist.htm?combine=&items_per_page=All&order=field_date_registration_def&sort=desc"
SOURCE_HOME = "https://www.cftc.gov/LearnAndProtect/Resources/Check/redlist.htm"
USER_AGENT = "Akademie-Fruehwarn-Check/1.0 (+https://tools.liquiditybooster.de/pages/projekt-fruehwarn-check/)"


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


def fetch_html():
    req = urllib.request.Request(
        SOURCE_URL,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        raw = response.read()
    if len(raw) < 5000:
        raise RuntimeError(f"CFTC-Seite unerwartet klein: {len(raw)} Bytes")
    return raw.decode("utf-8", errors="replace")


def extract_domains(text):
    domains = []
    pattern = re.compile(r"(?<!@)(?:https?://)?(?:www\.)?([a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?\.[a-z]{2,})(?::\d+)?(?:[/\s,;|)]|$)", re.I)
    for m in pattern.finditer(str(text or "")):
        host = m.group(1).lower().strip(".")
        if host and host not in domains:
            domains.append(host)
    return domains


def stable_id(name, date):
    seed = f"{SOURCE_ID}|{clean(name).lower()}|{clean(date)}"
    return f"{SOURCE_ID}-{hashlib.sha1(seed.encode('utf-8')).hexdigest()[:18]}"


def parse_records(html):
    soup = BeautifulSoup(html, "html.parser")
    records = []
    seen = set()
    for row in soup.find_all("tr"):
        cells = [clean(td.get_text(" ", strip=True)) for td in row.find_all("td")]
        if len(cells) < 2:
            continue
        date, company = cells[0], cells[1]
        if not company or company.lower() in {"company", "name"}:
            continue
        if not re.search(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}", date):
            continue
        key = (company.lower(), date)
        if key in seen:
            continue
        seen.add(key)
        domains = extract_domains(company)
        aliases = []
        for part in re.split(r"\s+/\s+|\s*\|\s*|\s*;\s*", company):
            part = clean(part)
            if part and part.lower() != company.lower() and part.lower() not in {x.lower() for x in aliases}:
                aliases.append(part)
        records.append({
            "id": stable_id(company, date),
            "source_id": SOURCE_ID,
            "region": "GLOBAL",
            "type": "warning",
            "status": "registration_deficient",
            "name": company,
            "aliases": aliases,
            "domains": domains,
            "authority": "Commodity Futures Trading Commission (CFTC)",
            "country": "US",
            "date": date,
            "title": "CFTC RED List – Registration Deficient",
            "summary_de": "Eintrag in der offiziellen CFTC RED List. Die CFTC führt hier ausländische Anbieter auf, die offenbar Tätigkeiten ausüben, für die eine CFTC-Registrierung erforderlich wäre, ohne entsprechend registriert zu sein. Ein Listeneintrag ist keine gerichtliche Feststellung eines Gesetzesverstoßes.",
            "summary_en": "Entry in the official CFTC RED List. The CFTC lists foreign entities that appear to act in a capacity requiring CFTC registration but are not registered. Inclusion is not a judicial finding that a violation occurred.",
            "source_url": SOURCE_HOME,
            "source_dataset": SOURCE_URL,
            "match_terms": list(dict.fromkeys([company, *aliases, *domains])),
        })
    return records


def update_sources(success_at, count):
    payload = load_json(SOURCES_FILE, {"schema_version": "1.0", "sources": []})
    sources = payload.setdefault("sources", [])
    found = None
    for source in sources:
        if source.get("id") == SOURCE_ID:
            found = source
            break
    if found is None:
        found = {"id": SOURCE_ID}
        sources.append(found)
    found.update({
        "region": "GLOBAL",
        "category": "warning",
        "name": "CFTC RED List",
        "authority": "Commodity Futures Trading Commission (USA)",
        "mode": "auto",
        "status": "available",
        "url": SOURCE_HOME,
        "note_de": "Automatisch aus der offiziellen CFTC RED List aktualisiert.",
        "note_en": "Automatically updated from the official CFTC RED List.",
        "last_success": success_at,
        "record_count": count,
    })
    payload["last_review"] = success_at[:10]
    write_json(SOURCES_FILE, payload)


def main():
    html = fetch_html()
    records = parse_records(html)
    if len(records) < 100:
        raise RuntimeError(f"CFTC-Validierung fehlgeschlagen: nur {len(records)} verwertbare Einträge")

    existing = load_json(RECORDS_FILE, {"schema_version": "1.0", "records": [], "source_status": {}})
    keep = [r for r in existing.get("records", []) if r.get("source_id") != SOURCE_ID]
    combined = keep + records
    combined.sort(key=lambda r: (r.get("region", ""), r.get("source_id", ""), r.get("name", "").lower()))
    generated = now_iso()
    status = existing.get("source_status", {}) or {}
    status[SOURCE_ID] = {
        "status": "available",
        "last_success": generated,
        "records": len(records),
        "dataset": SOURCE_URL,
    }
    payload = {
        "schema_version": existing.get("schema_version", "1.0"),
        "generated_at": generated,
        "source_status": status,
        "records": combined,
    }
    write_json(RECORDS_FILE, payload)
    update_sources(generated, len(records))
    print(f"OK: {len(records)} CFTC-RED-List-Einträge; Gesamtbestand {len(combined)}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"FEHLER: {exc}", file=sys.stderr)
        sys.exit(1)
