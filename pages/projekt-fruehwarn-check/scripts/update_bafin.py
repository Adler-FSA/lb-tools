#!/usr/bin/env python3
import hashlib
import json
import re
import sys
import time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

BASE = Path(__file__).resolve().parents[1]
DATA_DIR = BASE / "data"
RECORDS_FILE = DATA_DIR / "records.json"
SOURCES_FILE = DATA_DIR / "sources.json"

BAFIN_BASE = "https://www.bafin.de"
BAFIN_WARNINGS = "https://www.bafin.de/DE/verbraucherinnen-verbraucher/news-warnungen/warnmeldungen/warnmeldungen_node.html"
BAFIN_SEARCH = "https://www.bafin.de/SiteGlobals/Forms/Suche/Expertensuche/Servicesuche_Formular.html?pageLocale=de&cl2Categories_Format=meldung&sortOrder=searchDate_dt%20desc&zeitraum=zeitraum_thisYear&resultsPerPage=50"
BAFIN_LIST_SEEDS = [BAFIN_SEARCH]
USER_AGENT = "Akademie-Fruehwarn-Check/1.0 (+https://tools.liquiditybooster.de/pages/projekt-fruehwarn-check/)"
MAX_LIST_PAGES = 80


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


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


def session_get(session, url):
    response = session.get(
        url,
        timeout=45,
        headers={
            "User-Agent": USER_AGENT,
            "Accept-Language": "de-DE,de;q=0.9,en;q=0.4",
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.6",
        },
    )
    response.raise_for_status()
    return response


def canonical_list_url(url):
    parsed = urlparse(urljoin(BAFIN_BASE, url))
    if parsed.netloc not in {"www.bafin.de", "bafin.de"}:
        return ""

    path = re.sub(r";jsessionid=[^/?]+", "", parsed.path, flags=re.I)
    if not path.endswith("/SiteGlobals/Forms/Suche/Expertensuche/Servicesuche_Formular.html"):
        return ""

    return parsed._replace(path=path, fragment="").geturl()


def is_navigation_link(a):
    href = a.get("href", "")
    if not href:
        return False
    low_href = href.lower()
    if "servicesuche_formular.html" not in low_href:
        return False
    # BaFin paginiert die Trefferliste über gtp=..._list=2, =3 usw.
    # Filterlinks (Aufsichtsbereich, Zeitraum, Format usw.) dürfen NICHT verfolgt werden.
    return "gtp=" in low_href


def collect_article_links(session):
    links = []
    title_hints = {}
    seen_articles = set()
    seen_lists = set()
    queue = deque(BAFIN_LIST_SEEDS)
    list_errors = []

    while queue and len(seen_lists) < MAX_LIST_PAGES:
        raw_url = queue.popleft()
        url = canonical_list_url(raw_url)
        if not url or url in seen_lists:
            continue
        seen_lists.add(url)

        try:
            html = session_get(session, url).text
        except Exception as exc:
            msg = f"Listenquelle nicht erreichbar: {url}: {exc}"
            print(f"LISTENWARNUNG: {msg}", file=sys.stderr)
            list_errors.append(msg)
            continue

        soup = BeautifulSoup(html, "html.parser")
        new_articles = 0
        new_pages = 0

        for a in soup.find_all("a", href=True):
            href = a.get("href", "")
            if "/SharedDocs/Veroeffentlichungen/DE/Verbrauchermitteilung/" in href:
                absolute = urljoin(BAFIN_BASE, href.split("?")[0])
                title_hint = clean(a.get_text(" ", strip=True))
                if title_hint and title_hint.lower() != "mehr erfahren":
                    title_hints[absolute] = title_hint
                if absolute not in seen_articles:
                    seen_articles.add(absolute)
                    links.append(absolute)
                    new_articles += 1
                continue

            if is_navigation_link(a):
                nav = canonical_list_url(urljoin(url, href))
                if nav and nav not in seen_lists and nav not in queue:
                    queue.append(nav)
                    new_pages += 1

        print(f"BaFin Listenansicht {len(seen_lists)}: {new_articles} neue Meldungen, {new_pages} weitere Listenlinks")
        time.sleep(0.08)

    print(f"BaFin Listenansichten geprüft: {len(seen_lists)}")
    print(f"BaFin Warnmeldungs-Links gefunden: {len(links)}")
    print(f"BaFin nicht erreichbare Listenquellen: {len(list_errors)}")
    return links, title_hints, len(seen_lists), list_errors


def extract_date(text):
    for pattern in (
        r"Erscheinung:\s*(\d{2}\.\d{2}\.\d{4})",
        r"Datum:\s*(\d{2}\.\d{2}\.\d{4})",
    ):
        m = re.search(pattern, text, re.I)
        if m:
            d, mth, y = m.group(1).split(".")
            return f"{y}-{mth}-{d}"
    return ""


def normalize_masked_domains(text):
    return re.sub(r"\(\.\)", ".", text)


def extract_domains(text):
    text = normalize_masked_domains(text)
    domains = []
    pattern = re.compile(r"\b(?:www\.)?([a-z0-9](?:[a-z0-9-]{0,62}\.)+[a-z]{2,24})\b", re.I)
    blocked = {
        "bafin.de", "bund.de", "youtube.com", "linkedin.com", "instagram.com",
        "facebook.com", "x.com", "gesetze-im-internet.de"
    }
    for m in pattern.finditer(text):
        domain = m.group(1).lower().removeprefix("www.").strip(".")
        if domain in blocked or domain.endswith(".bafin.de"):
            continue
        if domain not in domains:
            domains.append(domain)
    return domains[:40]


def is_bad_title(value):
    value = clean(value).lower()
    return not value or value in {
        "hinweis zur verwendung von cookies",
        "cookies",
        "cookie-einstellungen",
    }


def extract_article_title(soup, title_hint=""):
    title_hint = clean(title_hint)
    if not is_bad_title(title_hint):
        return title_hint

    main = soup.find("main") or soup.find(id="content")
    for scope in (main, soup):
        if not scope:
            continue
        for heading in scope.find_all(["h1", "h2"]):
            candidate = clean(heading.get_text(" ", strip=True))
            if not is_bad_title(candidate):
                return candidate

    for selector in ('meta[property="og:title"]', 'meta[name="twitter:title"]'):
        node = soup.select_one(selector)
        if node:
            candidate = clean(node.get("content", ""))
            if not is_bad_title(candidate):
                return candidate

    if soup.title:
        candidate = clean(soup.title.get_text(" ", strip=True))
        if not is_bad_title(candidate):
            return candidate

    return "BaFin-Verbraucherwarnung"


def record_name(title):
    title = clean(title)
    if not title:
        return "BaFin-Verbraucherwarnung"
    parts = re.split(r"\s*:\s*", title, maxsplit=1)
    name = clean(parts[0])
    name = re.sub(r"^Identitätsmissbrauch\s*[-–—]?\s*", "", name, flags=re.I)
    if name.lower().startswith("bafin warnt") or len(name) < 3:
        return title
    return name


def first_paragraphs(main):
    parts = []
    for p in main.find_all("p") if main else []:
        txt = clean(p.get_text(" ", strip=True))
        if len(txt) < 35:
            continue
        if "Wir freuen uns über Ihr Feedback" in txt:
            break
        if txt.lower().startswith("quelle:"):
            continue
        parts.append(txt)
        if len(" ".join(parts)) >= 620 or len(parts) >= 3:
            break
    return " ".join(parts)[:900].rstrip()


def classify(text, title):
    low = (text + " " + title).lower()
    flags = []
    if "identitätsmissbrauch" in low:
        flags.append("identity_misuse")
    if "ermittelt gegen" in low or "ermittlungen" in low:
        flags.append("investigation")
    if "verkaufsprospekt" in low or "prospektpflicht" in low:
        flags.append("prospectus")
    if "marktmanipulation" in low:
        flags.append("market_manipulation")
    if "ohne erlaubnis" in low or "unerlaubt" in low:
        flags.append("unauthorized_services")
    return flags


def parse_article(session, url, title_hint=""):
    response = session_get(session, url)
    soup = BeautifulSoup(response.text, "html.parser")
    title = extract_article_title(soup, title_hint)
    main = soup.find("main") or soup.find(id="content") or soup.body
    text = clean(main.get_text(" ", strip=True) if main else soup.get_text(" ", strip=True))
    date = extract_date(text)
    domains = extract_domains(text)
    name = record_name(title)
    flags = classify(text, title)
    summary = first_paragraphs(main) or "Offizielle Verbraucherinformation der BaFin."
    rid = "bafin-warning-" + hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]
    match_terms = [name, title, *domains]
    if "orange cat" in text.lower() or "orange cat" in title.lower():
        match_terms.extend(["Orange Cat", "Orange Cat Energy", "Orange Cat Energy Technology Co. Ltd."])
    return {
        "id": rid,
        "source_id": "bafin-warnings",
        "region": "DE",
        "type": "warning",
        "status": "warning",
        "name": name,
        "aliases": [],
        "domains": domains,
        "authority": "Bundesanstalt für Finanzdienstleistungsaufsicht (BaFin)",
        "country": "DE",
        "date": date,
        "title": title,
        "summary_de": summary,
        "summary_en": "Official consumer warning or notice published by the German Federal Financial Supervisory Authority (BaFin).",
        "source_url": url,
        "flags": flags,
        "match_terms": list(dict.fromkeys([x for x in match_terms if clean(x)])),
    }


def update_sources(success_at, count):
    payload = load_json(SOURCES_FILE, {"schema_version": "1.0", "sources": []})
    for source in payload.get("sources", []):
        if source.get("id") == "bafin-warnings":
            source["mode"] = "auto"
            source["status"] = "available"
            source["last_success"] = success_at
            source["record_count"] = count
            source["note_de"] = "Automatisch aus den offiziellen BaFin-Verbraucherwarnungen aktualisiert; bereits erfasste Meldungen bleiben im lokalen Frühwarn-Archiv erhalten."
            source["note_en"] = "Automatically updated from official BaFin consumer warnings; previously captured notices remain in the local early-warning archive."
    payload["last_review"] = success_at[:10]
    write_json(SOURCES_FILE, payload)


def main():
    session = requests.Session()
    existing = load_json(RECORDS_FILE, {"schema_version": "1.0", "records": [], "source_status": {}})
    old_records = existing.get("records", []) or []
    old_bafin = [r for r in old_records if r.get("source_id") == "bafin-warnings"]
    others = [r for r in old_records if r.get("source_id") != "bafin-warnings"]
    by_url = {r.get("source_url"): r for r in old_bafin if r.get("source_url")}

    links, title_hints, list_pages_checked, list_errors = collect_article_links(session)
    if len(links) < 40:
        raise RuntimeError(f"BaFin-Validierung fehlgeschlagen: nur {len(links)} Warnmeldungs-Links gefunden")

    new_count = 0
    refreshed_count = 0
    article_errors = []
    for url in links:
        existing_record = by_url.get(url)
        if existing_record and not is_bad_title(existing_record.get("title", "")):
            continue
        try:
            record = parse_article(session, url, title_hints.get(url, ""))
            by_url[url] = record
            if existing_record:
                refreshed_count += 1
                print(f"Korrigiert {refreshed_count}: {record['date']} | {record['title'][:100]}")
            else:
                new_count += 1
                print(f"Neu {new_count}: {record['date']} | {record['title'][:100]}")
        except Exception as exc:
            article_errors.append(f"{url}: {exc}")
            print(f"WARNUNG: {url}: {exc}", file=sys.stderr)
        time.sleep(0.08)

    bafin_records = list(by_url.values())
    orange = [r for r in bafin_records if "orange cat" in " ".join(r.get("match_terms", [])).lower()]
    if not orange:
        raise RuntimeError("Abnahmetest fehlgeschlagen: Orange Cat wurde in den erfassten BaFin-Meldungen nicht gefunden.")
    if new_count == 0 and refreshed_count == 0 and not old_bafin:
        raise RuntimeError("BaFin-Import lieferte keinen Datensatz.")

    generated = now_iso()
    combined = others + bafin_records
    combined.sort(key=lambda r: (r.get("region", ""), r.get("source_id", ""), r.get("date", ""), r.get("name", "").lower()))

    source_status = existing.get("source_status", {}) or {}
    source_status["bafin-warnings"] = {
        "status": "available",
        "last_success": generated,
        "records": len(bafin_records),
        "new_records": new_count,
        "list_pages_checked": list_pages_checked,
        "dataset": BAFIN_WARNINGS,
        "list_errors": len(list_errors),
        "article_errors": len(article_errors),
    }

    payload = {
        "schema_version": "1.0",
        "generated_at": generated,
        "source_status": source_status,
        "records": combined,
    }
    write_json(RECORDS_FILE, payload)
    update_sources(generated, len(bafin_records))

    print(f"OK: {len(bafin_records)} BaFin-Meldungen im Archiv, davon {new_count} neu und {refreshed_count} mit korrigiertem Titel.")
    print(f"Orange-Cat-Abnahmetest: {len(orange)} Treffer.")
    print(f"Gesamtbestand: {len(combined)} Datensätze")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"FEHLER: {exc}", file=sys.stderr)
        sys.exit(1)
