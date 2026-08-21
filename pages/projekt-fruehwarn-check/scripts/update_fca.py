#!/usr/bin/env python3
import hashlib
import json
import math
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path

from bs4 import BeautifulSoup

BASE = Path(__file__).resolve().parents[1]
DATA_DIR = BASE / "data"
RECORDS_FILE = DATA_DIR / "records.json"
SOURCES_FILE = DATA_DIR / "sources.json"

SOURCE_ID = "fca-warning-list"
LIST_URL = "https://www.fca.org.uk/consumers/warning-list-unauthorised-firms"
RSS_URL = "https://www.fca.org.uk/news/warnings/rss.xml"
USER_AGENT = "Akademie-Fruehwarn-Check/1.0 (+https://tools.liquiditybooster.de/pages/projekt-fruehwarn-check/)"


def now_dt():
    return datetime.now(timezone.utc)


def now_iso():
    return now_dt().replace(microsecond=0).isoformat().replace("+00:00", "Z")


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


def fetch_bytes(url, attempts=4, timeout=45):
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.8,de;q=0.6",
        "Cache-Control": "no-cache",
    }
    last = None
    for attempt in range(1, attempts + 1):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return response.read()
        except Exception as exc:
            last = exc
            if attempt < attempts:
                time.sleep(min(6, attempt * 1.5))
    raise RuntimeError(f"Abruf fehlgeschlagen: {url}: {last}")


def fetch_text(url):
    raw = fetch_bytes(url)
    for encoding in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def strip_marker(title):
    title = clean(title)
    title = re.sub(r"\s*\((?:new|updated)\)\s*$", "", title, flags=re.I)
    return clean(title)


def extract_domains(text):
    domains = []
    pattern = re.compile(r"(?<!@)(?:https?://)?(?:www\.)?([a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?\.[a-z]{2,})(?::\d+)?(?:[/\s,;|)]|$)", re.I)
    for match in pattern.finditer(str(text or "")):
        host = match.group(1).lower().strip(".")
        if host and host not in domains:
            domains.append(host)
    return domains


def alias_candidates(title):
    base = strip_marker(title)
    aliases = []
    for part in re.split(r"\s+/\s+|\s*\|\s*|\s*;\s*", base):
        part = clean(part)
        part = re.sub(r"\s*\((?:clone of|clone firm|clone of fca|fca clone).*?\)\s*$", "", part, flags=re.I)
        part = clean(part)
        if part and part.lower() not in {x.lower() for x in aliases}:
            aliases.append(part)
    for domain in extract_domains(base):
        if domain.lower() not in {x.lower() for x in aliases}:
            aliases.append(domain)
    return aliases


def record_id(url, title):
    seed = f"{SOURCE_ID}|{url}|{strip_marker(title).lower()}"
    return f"{SOURCE_ID}-{hashlib.sha1(seed.encode('utf-8')).hexdigest()[:18]}"


def build_record(title, url, date_added="", date_updated=""):
    display = strip_marker(title)
    aliases = alias_candidates(display)
    domains = extract_domains(display)
    primary = aliases[0] if aliases else (domains[0] if domains else display)
    clone = bool(re.search(r"clone", display, re.I))
    summary_de = "Eintrag in der offiziellen FCA Warning List für nicht autorisierte bzw. auffällige Anbieter im Vereinigten Königreich."
    summary_en = "Entry in the official FCA Warning List for unauthorised or concerning firms in the United Kingdom."
    if clone:
        summary_de += " Die FCA kennzeichnet den Eintrag als möglichen Klon eines autorisierten oder registrierten Unternehmens."
        summary_en += " The FCA marks the entry as a possible clone of an authorised or registered firm."
    return {
        "id": record_id(url, display),
        "source_id": SOURCE_ID,
        "region": "GLOBAL",
        "type": "warning",
        "status": "warning",
        "name": primary,
        "aliases": [a for a in aliases if a.lower() != primary.lower()],
        "domains": domains,
        "authority": "Financial Conduct Authority (UK)",
        "country": "GB",
        "date": date_added,
        "updated_date": date_updated,
        "title": display,
        "summary_de": summary_de,
        "summary_en": summary_en,
        "source_url": url,
        "source_dataset": LIST_URL,
        "match_terms": list(dict.fromkeys([x for x in [primary, display, *aliases, *domains] if x])),
    }


def parse_list_page(html, page_url):
    soup = BeautifulSoup(html, "html.parser")
    records = []
    for row in soup.find_all("tr"):
        link = row.find("a", href=re.compile(r"/news/warnings/"))
        if not link:
            continue
        title = clean(link.get_text(" ", strip=True))
        href = clean(link.get("href"))
        if not title or not href:
            continue
        url = urllib.parse.urljoin(page_url, href)
        cells = [clean(td.get_text(" ", strip=True)) for td in row.find_all("td")]
        date_added = cells[1] if len(cells) > 1 else ""
        date_updated = cells[2] if len(cells) > 2 else ""
        records.append(build_record(title, url, date_added, date_updated))
    text = soup.get_text(" ", strip=True)
    total = 0
    match = re.search(r"Displaying\s+\d+\s*-\s*\d+\s+of\s+([\d,]+)", text, re.I)
    if match:
        total = int(match.group(1).replace(",", ""))
    return records, total


def full_refresh():
    first_html = fetch_text(LIST_URL)
    first, total = parse_list_page(first_html, LIST_URL)
    if total < 10000:
        raise RuntimeError(f"FCA-Vollabzug unplausibel: Gesamtzahl {total}")
    if not first:
        raise RuntimeError("FCA-Vollabzug: erste Seite enthält keine Warnungen")

    per_page = max(1, len(first))
    pages = math.ceil(total / per_page)
    print(f"FCA Vollabzug: {total} Einträge, ca. {pages} Seiten")
    all_records = first[:]
    seen_urls = {r["source_url"] for r in all_records}

    for page in range(1, pages):
        url = LIST_URL + "?" + urllib.parse.urlencode({"page": page})
        html = fetch_text(url)
        rows, _ = parse_list_page(html, url)
        if not rows:
            # Bei der letzten Seite kann die Schätzung leicht abweichen; vorher ist eine leere Seite ein Fehler.
            if page < pages - 2:
                raise RuntimeError(f"FCA-Vollabzug brach auf Seite {page} unerwartet ab")
            break
        for rec in rows:
            if rec["source_url"] not in seen_urls:
                seen_urls.add(rec["source_url"])
                all_records.append(rec)
        if page % 50 == 0:
            print(f"  Seite {page}/{pages - 1}: {len(all_records)} eindeutige Einträge")
        time.sleep(0.03)

    if len(all_records) < int(total * 0.90):
        raise RuntimeError(f"FCA-Vollabzug unvollständig: {len(all_records)} von erwarteten {total}")
    return all_records


def parse_rss_date(value):
    value = clean(value)
    if not value:
        return ""
    try:
        from email.utils import parsedate_to_datetime
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).date().isoformat()
    except Exception:
        return value


def incremental_rss(existing_records):
    raw = fetch_bytes(RSS_URL)
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as exc:
        raise RuntimeError(f"FCA RSS ungültig: {exc}")
    items = root.findall(".//item")
    if len(items) < 3:
        raise RuntimeError(f"FCA RSS unerwartet klein: {len(items)} Einträge")

    by_url = {r.get("source_url"): r for r in existing_records if r.get("source_url")}
    changed = 0
    for item in items:
        title = clean(item.findtext("title"))
        link = clean(item.findtext("link"))
        pubdate = parse_rss_date(item.findtext("pubDate"))
        if not title or not link:
            continue
        rec = build_record(title, link, pubdate, pubdate)
        previous = by_url.get(link)
        if previous:
            # Erstellungsdatum behalten, aktualisierbare Felder aus dem aktuellen Feed übernehmen.
            if previous.get("date"):
                rec["date"] = previous["date"]
        if previous != rec:
            changed += 1
        by_url[link] = rec
    print(f"FCA RSS: {len(items)} Feed-Einträge, {changed} neu/aktualisiert")
    return list(by_url.values())


def parse_iso(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


def source_meta(records_payload):
    return (records_payload.get("source_status", {}) or {}).get(SOURCE_ID, {}) or {}


def update_sources(success_at, count, full_at=None):
    payload = load_json(SOURCES_FILE, {"schema_version": "1.0", "sources": []})
    for source in payload.get("sources", []):
        if source.get("id") == SOURCE_ID:
            source["mode"] = "auto"
            source["status"] = "available"
            source["url"] = LIST_URL
            source["last_success"] = success_at
            source["record_count"] = count
            if full_at:
                source["last_full_refresh"] = full_at
            source["note_de"] = "Automatisch aus der offiziellen FCA Warning List aktualisiert. Laufende Änderungen werden über den offiziellen FCA-RSS-Feed übernommen; der Gesamtbestand wird regelmäßig vollständig abgeglichen."
            source["note_en"] = "Automatically updated from the official FCA Warning List. Ongoing changes are ingested from the official FCA RSS feed and the full dataset is reconciled regularly."
            break
    payload["last_review"] = success_at[:10]
    write_json(SOURCES_FILE, payload)


def main():
    existing = load_json(RECORDS_FILE, {"schema_version": "1.0", "records": [], "source_status": {}})
    current_fca = [r for r in existing.get("records", []) if r.get("source_id") == SOURCE_ID]
    meta = source_meta(existing)
    last_full = parse_iso(meta.get("last_full_refresh"))
    need_full = len(current_fca) < 10000 or not last_full or (now_dt() - last_full) > timedelta(days=7)

    if need_full:
        print("FCA: vollständiger Warnlisten-Abgleich …")
        fca_records = full_refresh()
        full_at = now_iso()
    else:
        print("FCA: laufende RSS-Aktualisierung …")
        fca_records = incremental_rss(current_fca)
        full_at = meta.get("last_full_refresh")

    if len(fca_records) < 100:
        raise RuntimeError(f"FCA-Validierung fehlgeschlagen: nur {len(fca_records)} Einträge")

    keep = [r for r in existing.get("records", []) if r.get("source_id") != SOURCE_ID]
    fca_records.sort(key=lambda r: (r.get("name", "").lower(), r.get("source_url", "")))
    combined = keep + fca_records
    combined.sort(key=lambda r: (r.get("region", ""), r.get("source_id", ""), r.get("name", "").lower()))

    generated = now_iso()
    status = existing.get("source_status", {}) or {}
    status[SOURCE_ID] = {
        "status": "available",
        "last_success": generated,
        "last_full_refresh": full_at,
        "records": len(fca_records),
        "dataset": LIST_URL,
        "incremental_feed": RSS_URL,
    }
    payload = {
        "schema_version": existing.get("schema_version", "1.0"),
        "generated_at": generated,
        "source_status": status,
        "records": combined,
    }
    write_json(RECORDS_FILE, payload)
    update_sources(generated, len(fca_records), full_at)
    print(f"OK: {len(fca_records)} FCA-Warnungen; Gesamtbestand {len(combined)}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"FEHLER: {exc}", file=sys.stderr)
        sys.exit(1)
