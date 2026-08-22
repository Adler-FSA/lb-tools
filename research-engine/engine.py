#!/usr/bin/env python3
"""Akademie Research Engine V1.

Sammelt öffentliche Projektspuren. Keine Anlagebewertung und kein
Seriös-/Unseriös-Urteil.
"""
from __future__ import annotations

import argparse
import json
import re
import socket
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse, urldefrag

import requests
from bs4 import BeautifulSoup

UA = "Akademie-Research-Engine/1.0 (+https://www.liquiditybooster.de/)"
TIMEOUT = 12
MAX_PAGES = 14

PRIORITY_WORDS = (
    "about", "uber-uns", "ueber-uns", "faq", "help", "how", "earn", "staking",
    "stake", "yield", "interest", "rates", "terms", "legal", "imprint", "impressum",
    "privacy", "withdraw", "withdrawal", "payout", "fees", "referral", "affiliate",
    "partner", "bonus", "security", "custody", "risk", "strategy", "trading",
)

COMMON_PATHS = (
    "/", "/about", "/about-us", "/faq", "/how-it-works", "/earn", "/staking",
    "/rates", "/terms", "/legal", "/imprint", "/impressum", "/privacy",
    "/security", "/custody", "/withdrawal", "/fees", "/referral", "/affiliate",
    "/partner", "/risk", "/strategy",
)

SOCIAL_HOSTS = {
    "youtube.com": "youtube", "youtu.be": "youtube", "t.me": "telegram",
    "telegram.me": "telegram", "facebook.com": "facebook", "instagram.com": "instagram",
    "linkedin.com": "linkedin", "x.com": "x", "twitter.com": "x", "discord.gg": "discord",
}

LEGAL_FORMS = re.compile(
    r"\b([A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9&.,'’\- ]{1,90}\s(?:GmbH|AG|Aktiengesellschaft|SE|"
    r"Ltd\.?|Limited|LLC|Inc\.?|PLC|S\.?A\.?|S\.p\.A\.|B\.V\.|Sarl|S\.à\s*r\.l\.?))\b"
)

PERCENT_RE = re.compile(
    r"(?<!\d)(\d{1,3}(?:[.,]\d+)?)\s*%\s*(APY|APR|p\.?a\.?|annual(?:ly)?|jährlich|yield|interest)?",
    re.I,
)


@dataclass
class Page:
    url: str
    status: int
    title: str
    text: str
    links: list[str]
    fetch_mode: str = "direct"


@dataclass
class Finding:
    type: str
    value: str
    source_url: str
    evidence: str
    confidence: str = "high"


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def compact(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", clean_text(value).lower())


def normalize_url(value: str) -> str:
    value = clean_text(value)
    if not value:
        return ""
    if not re.match(r"^https?://", value, re.I):
        value = "https://" + value
    p = urlparse(value)
    host = (p.hostname or "").lower()
    scheme = p.scheme or "https"
    path = p.path or "/"
    result = f"{scheme}://{host}{path}"
    if p.query:
        result += "?" + p.query
    return result


def parse_input(value: str) -> dict:
    raw = clean_text(value)
    is_url = bool(re.match(r"^(?:https?://|www\.)", raw, re.I) or re.match(r"^[a-z0-9.-]+\.[a-z]{2,}(?:/|$)", raw, re.I))
    if is_url:
        url = normalize_url(raw)
        fetch_host = (urlparse(url).hostname or "").lower()
        domain = fetch_host.removeprefix("www.")
        return {"raw": raw, "kind": "url", "url": url, "domain": domain, "fetch_host": fetch_host, "name": ""}
    return {"raw": raw, "kind": "name", "url": "", "domain": "", "name": raw}


def host_exists(host: str) -> bool:
    try:
        socket.getaddrinfo(host, 443)
        return True
    except OSError:
        return False


def candidate_domains(name: str) -> list[str]:
    stem = re.sub(r"[^a-z0-9]+", "", name.lower())
    hyphen = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    stems = [s for s in dict.fromkeys([stem, hyphen]) if len(s) >= 4]
    tlds = ["com", "de", "io", "net", "org", "finance", "app", "co"]
    return [f"{s}.{t}" for s in stems for t in tlds]


def _soup_to_page(url: str, response: requests.Response, mode: str) -> Page:
    content_type = response.headers.get("content-type", "")
    html = response.text if ("html" in content_type or "text" in content_type or not content_type) else ""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()
    title = clean_text(soup.title.get_text(" ") if soup.title else "")
    text = clean_text(soup.get_text(" "))
    links: list[str] = []
    for a in soup.find_all("a", href=True):
        href = a.get("href", "").strip()
        if href.startswith(("mailto:", "tel:", "javascript:", "#")):
            continue
        absolute = urldefrag(urljoin(url, href))[0]
        if absolute.startswith(("http://", "https://")):
            links.append(absolute)
    return Page(url=response.url or url, status=response.status_code, title=title, text=text, links=list(dict.fromkeys(links)), fetch_mode=mode)


def reader_error(text: str) -> bool:
    low = (text or "").lower()
    markers = (
        "404: not_found", "404: not found", "target url returned error 404",
        "403: forbidden", "target url returned error 403",
        "410: gone", "target url returned error 410",
    )
    return any(marker in low for marker in markers)


def reader_links(text: str) -> list[str]:
    links = []
    for u in re.findall(r"https?://[^\s)\]>\"']+", text or "", re.I):
        u = u.rstrip(".,;:")
        if u not in links:
            links.append(u)
    return links[:120]


_BROWSER_USES = 0
_BROWSER_MAX = 5

def browser_fetch_page(url: str) -> Page | None:
    """Rendert eine öffentliche JS-Seite mit Chromium. Kein Login/CAPTCHA-Bypass."""
    global _BROWSER_USES
    if _BROWSER_USES >= _BROWSER_MAX:
        return None
    _BROWSER_USES += 1
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        return None
    browser = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--disable-dev-shm-usage", "--no-sandbox"])
            context = browser.new_context(user_agent=UA, locale="de-DE")
            page = context.new_page()
            response = page.goto(url, wait_until="domcontentloaded", timeout=22000)
            if response is not None and response.status >= 400:
                browser.close()
                return None
            try:
                page.wait_for_load_state("networkidle", timeout=6000)
            except Exception:
                pass
            page.wait_for_timeout(1800)
            title = clean_text(page.title())
            try:
                text = clean_text(page.locator("body").inner_text(timeout=6000))
            except Exception:
                text = ""
            try:
                links = page.eval_on_selector_all("a[href]", "els => els.map(e => e.href).filter(Boolean)")
            except Exception:
                links = []
            final_url = page.url or url
            browser.close()
            if len(text) < 350 or reader_error(text):
                return None
            return Page(url=final_url, status=200, title=title, text=text, links=list(dict.fromkeys(links))[:160], fetch_mode="browser")
    except Exception:
        try:
            if browser:
                browser.close()
        except Exception:
            pass
        return None


def fetch_page(url: str) -> Page | None:
    headers = {"User-Agent": UA, "Accept": "text/html,application/xhtml+xml"}
    try:
        r = requests.get(url, headers=headers, timeout=TIMEOUT, allow_redirects=True)
        if r.ok:
            page = _soup_to_page(url, r, "direct")
            if len(page.text) >= 350:
                return page
    except requests.RequestException:
        pass

    # Lesefallback für JS-lastige öffentliche Seiten. Erst die echte HTTPS/HTTP-URL lesen.
    parsed = urlparse(url)
    canonical = f"{parsed.scheme or 'https'}://{parsed.netloc}{parsed.path or '/'}"
    if parsed.query:
        canonical += "?" + parsed.query
    fallbacks = ["https://r.jina.ai/" + canonical]
    if canonical.startswith("https://"):
        fallbacks.append("https://r.jina.ai/http://" + canonical[len("https://"):])

    for fallback in fallbacks:
        try:
            r = requests.get(fallback, headers={"User-Agent": UA, "Accept": "text/plain"}, timeout=TIMEOUT)
            raw = r.text if r.ok else ""
            if not raw or len(raw) < 350 or reader_error(raw):
                continue
            title_match = re.search(r"(?:^|\n)Title:\s*(.+)", raw, re.I)
            title = clean_text(title_match.group(1)) if title_match else ""
            # Jina liefert technische Kopfzeilen (Title/URL Source/Published Time/Warning).
            # Für die Analyse zählt nur der eigentliche Markdown-Inhalt plus Seitentitel.
            body = raw.split("Markdown Content:", 1)[1] if "Markdown Content:" in raw else raw
            body = clean_text(body)
            # Ein Seitentitel allein ist kein belastbarer Seitenfund. Solche Reader-Shells
            # entstehen u. a. bei erfundenen Routerpfaden wie /withdrawal.
            if len(body) < 120:
                continue
            analysis_text = clean_text((title + " " + body).strip())
            return Page(
                url=url, status=200, title=title, text=analysis_text,
                links=reader_links(body), fetch_mode="reader-fallback"
            )
        except requests.RequestException:
            continue

    # Letzte Stufe: echter Headless-Browser für JS-lastige öffentliche Seiten.
    browser_page = browser_fetch_page(url)
    if browser_page:
        return browser_page
    return None


def verifies_brand(page: Page, name: str, domain: str) -> bool:
    if not name:
        return True
    brand = compact(name)
    if len(brand) < 4:
        return False
    hay = compact((page.title + " " + page.text[:30000]))
    stem = compact(domain.split(".")[0])
    return brand in hay or (stem == brand and stem in hay)


def discover_project(name: str) -> tuple[str, Page | None, list[dict]]:
    attempts: list[dict] = []
    for domain in candidate_domains(name):
        hosts = [h for h in ("www." + domain, domain) if host_exists(h)]
        if not hosts:
            continue
        for host in hosts:
            for scheme in ("https", "http"):
                url = f"{scheme}://{host}/"
                page = fetch_page(url)
                attempts.append({"domain": domain, "url": url, "readable": bool(page)})
                if page and verifies_brand(page, name, domain):
                    final_host = (urlparse(page.url).hostname or domain).removeprefix("www.")
                    return final_host, page, attempts
    return "", None, attempts


def same_domain(url: str, domain: str) -> bool:
    host = (urlparse(url).hostname or "").removeprefix("www.")
    return host == domain or host.endswith("." + domain)


def sitemap_urls(domain: str) -> list[str]:
    """Liest öffentliche Sitemap-Hinweise ohne von ihnen abhängig zu sein."""
    headers = {"User-Agent": UA, "Accept": "text/plain,application/xml,text/xml"}
    sitemap_targets = [f"https://{domain}/sitemap.xml"]
    found: list[str] = []
    try:
        r = requests.get(f"https://{domain}/robots.txt", headers=headers, timeout=TIMEOUT)
        if r.ok:
            for line in r.text.splitlines():
                if line.lower().startswith("sitemap:"):
                    u = line.split(":", 1)[1].strip()
                    if u.startswith(("http://", "https://")):
                        sitemap_targets.append(u)
    except requests.RequestException:
        pass

    for target in list(dict.fromkeys(sitemap_targets))[:5]:
        try:
            r = requests.get(target, headers=headers, timeout=TIMEOUT)
            if not r.ok:
                continue
            for u in re.findall(r"<loc>\s*(https?://[^<]+?)\s*</loc>", r.text, re.I):
                u = clean_text(u.replace("&amp;", "&"))
                if same_domain(u, domain) and u not in found:
                    found.append(u)
                if len(found) >= 100:
                    return found
        except requests.RequestException:
            continue
    return found


def link_priority(url: str) -> int:
    low = url.lower()
    score = sum(4 for word in PRIORITY_WORDS if word in low)
    depth = max(0, urlparse(url).path.count("/") - 1)
    return score - depth


def crawl(seed: Page, domain: str, input_url: str = "", max_pages: int = MAX_PAGES) -> list[Page]:
    pages = [seed]
    seen = {urldefrag(seed.url)[0]}
    fingerprints = {compact(seed.title + " " + seed.text[:4000])}
    seed_host = (urlparse(seed.url).hostname or domain).lower()
    root = f"https://{seed_host}/"
    queue: list[str] = []

    # Ein Referral-/Deep-Link darf nie die einzige gelesene Seite bleiben.
    if input_url and same_domain(input_url, domain):
        queue.append(input_url)
    queue.append(root)

    # Öffentliche Sitemap zuerst; danach typische Informationsseiten als robuste Reserve.
    queue.extend(sitemap_urls(seed_host))
    queue.extend(urljoin(root, path) for path in COMMON_PATHS)
    queue.extend(u for u in seed.links if same_domain(u, domain))
    queue = list(dict.fromkeys(queue))

    while queue and len(pages) < max_pages:
        queue.sort(key=link_priority, reverse=True)
        url = queue.pop(0)
        canonical = urldefrag(url)[0]
        if canonical in seen:
            continue
        seen.add(canonical)
        page = fetch_page(canonical)
        if not page:
            continue
        fp = compact(page.title + " " + page.text[:4000])
        if fp and fp in fingerprints:
            # Soft-404s und identische Router-Seiten nicht mehrfach analysieren.
            continue
        if fp:
            fingerprints.add(fp)
        pages.append(page)
        for link in page.links:
            c = urldefrag(link)[0]
            if same_domain(c, domain) and c not in seen and len(queue) < 120:
                queue.append(c)
        time.sleep(0.15)
    return pages


def snippet(text: str, match: re.Match | None = None, width: int = 180) -> str:
    text = clean_text(text)
    if not text:
        return ""
    if match is None:
        return text[:width]
    start = max(0, match.start() - width // 2)
    end = min(len(text), match.end() + width // 2)
    return clean_text(text[start:end])[:width]


def extract_percentages(text: str) -> list[float]:
    values: list[float] = []
    for m in PERCENT_RE.finditer(text or ""):
        n = float(m.group(1).replace(",", "."))
        if 0 < n <= 500:
            values.append(n)
    return sorted(set(values), reverse=True)


def percentage_kind(text: str, match: re.Match) -> str:
    """Ordnet einen Prozentwert nur nach seinem engen, belegbaren Kontext ein."""
    suffix = (match.group(2) or "").lower()
    before = clean_text(text[max(0, match.start()-70):match.start()]).lower()
    after = clean_text(text[match.end():min(len(text), match.end()+55)]).lower()
    ctx = clean_text(text[max(0, match.start()-85):min(len(text), match.end()+85)]).lower()

    # Eine direkt am Wert stehende Renditeeinheit ist der stärkste Beleg.
    if suffix:
        return "yield"

    # Direkte Provisionsaussage: "30% commission" / "20% provision".
    if re.match(r"^(?:\s|[:|–—-])*(?:commission|provision)\b", after, re.I):
        return "commission"

    # Verlust-, Bonus-, Rabatt- und ähnliche Werte sind keine Rendite.
    if re.search(
        r"\b(lose|loss|lost|verlust|price swing|drawdown|welcome bonus|bonus|discount|"
        r"save|saving|subscription|donation|cashback|fee|attack|safe|ownership|share)\b",
        ctx, re.I
    ):
        return "other"

    # Rendite ohne explizites Suffix nur bei enger sprachlicher Bindung an den Wert.
    if re.search(
        r"\b(apy|apr|yield|interest|rendite|zinsen?|earn(?:ing)?|return)"
        r"(?:\s+(?:rate|of|up to|as high as))?[^.%]{0,28}$",
        before, re.I
    ):
        return "yield"

    # Affiliate-/Vergleichstabellen als Provisionskontext dokumentieren.
    if re.search(r"\b(commission|provision|affiliate|referral|partner commission)\b", ctx, re.I):
        return "commission"
    return "other"


def direct_commission_claim(text: str, match: re.Match) -> bool:
    """Nur eine unmittelbar am Prozentwert stehende eigene Provisionsaussage zählt."""
    after = clean_text(text[match.end():min(len(text), match.end()+32)]).lower()
    return bool(re.match(r"^(?:\s|[:|–—-])*(?:commission|provision)\b", after, re.I))


def find_regex(pages: Iterable[Page], pattern: str, flags=re.I) -> list[tuple[Page, re.Match]]:
    rx = re.compile(pattern, flags)
    out: list[tuple[Page, re.Match]] = []
    for page in pages:
        m = rx.search(page.text)
        if m:
            out.append((page, m))
    return out


def find_non_negated_regex(pages: Iterable[Page], pattern: str, flags=re.I) -> list[tuple[Page, re.Match]]:
    """Treffer nur werten, wenn direkt davor keine klare Verneinung steht."""
    rx = re.compile(pattern, flags)
    out: list[tuple[Page, re.Match]] = []
    for page in pages:
        for m in rx.finditer(page.text):
            prefix = clean_text(page.text[max(0, m.start()-32):m.start()]).lower()
            if re.search(r"\b(no|not|never|without|nicht|kein|keine|keinen|keiner|niemals)\b", prefix, re.I):
                continue
            out.append((page, m))
            break
    return out


def source_label(url: str) -> str:
    host = (urlparse(url).hostname or "").removeprefix("www.")
    return host or url


def analyze_pages(pages: list[Page], ctx: dict) -> dict:
    findings: list[Finding] = []
    page_summaries = []

    for page in pages:
        page_summaries.append({
            "url": page.url,
            "title": page.title,
            "fetch_mode": page.fetch_mode,
            "text_chars": len(page.text),
        })

    # Prozentangaben fachlich trennen: Projektrendite ist nicht Affiliate-Provision.
    max_yield_percent = None
    max_commission_percent = None
    for page in pages:
        for m in PERCENT_RE.finditer(page.text):
            n = float(m.group(1).replace(",", "."))
            if not (0 < n <= 500):
                continue
            kind = percentage_kind(page.text, m)
            if kind == "yield":
                max_yield_percent = n if max_yield_percent is None else max(max_yield_percent, n)
                findings.append(Finding("yield_percentage", f"{n:g}%", page.url, snippet(page.text, m), "high"))
            elif kind == "commission":
                findings.append(Finding("commission_percentage", f"{n:g}%", page.url, snippet(page.text, m), "high"))
                if direct_commission_claim(page.text, m):
                    max_commission_percent = n if max_commission_percent is None else max(max_commission_percent, n)
            else:
                findings.append(Finding("percentage_other", f"{n:g}%", page.url, snippet(page.text, m), "medium"))

    keyword_groups = {
        "staking": r"\bstak(?:e|ing|ed)\b",
        "yield_or_interest": r"\b(yield|interest|earn|rendite|zinsen?)\b",
        "defi": r"\bdefi\b",
        "trading": r"\b(trading|algorithmic trading|arbitrage|market making)\b",
        "leverage": r"\b(leverage|leveraged|hebel|margin trading)\b",
        "lending": r"\b(lending|borrow|loan|darlehen|kredit)\b",
        "lockup": r"\b(lock[- ]?up|locked|fixed term|laufzeit|sperrfrist|30 days|60 days|90 days|180 days|365 days|1 year|12 months)\b",
        "withdrawal": r"\b(withdraw|withdrawal|payout|auszahl(?:ung|en)|abheben)\b",
        "kyc": r"\b(kyc|know your customer|identity verification|identitätsprüfung|verifizierung)\b",
        "custody": r"\b(custody|custodian|verwahrung|institutional custody|private keys?|self[- ]custody)\b",
        "referral": r"\b(referral|refer a friend|affiliate|partner program|empfehlungsprogramm|commission|provision|invite friends|leader|sponsor)\b",
        "bonus": r"\b(welcome bonus|willkommensbonus|bonus|incentive|reward|gutschein|prize|vip)\b",
        "guarantee": r"\b(guaranteed|garantiert|risk[- ]?free|risikofrei|capital protected|kapitalgarantie|100% safe)\b",
    }

    detected = {}
    for kind, pattern in keyword_groups.items():
        hits = find_non_negated_regex(pages, pattern) if kind == "guarantee" else find_regex(pages, pattern)
        detected[kind] = bool(hits)
        for page, m in hits[:3]:
            findings.append(Finding(kind, m.group(0), page.url, snippet(page.text, m), "medium"))

    # Rechtsträgerhinweise. Kommaübergreifende Treffer aus flachgezogenem Adress-/Seitentext
    # werden konservativ verworfen, statt einen falschen Rechtsträger zu behaupten.
    legal_entities = []
    for page in pages:
        for m in LEGAL_FORMS.finditer(page.text):
            value = clean_text(m.group(1))
            if "," in value:
                continue
            if value and value not in legal_entities:
                legal_entities.append(value)
                findings.append(Finding("legal_entity", value, page.url, snippet(page.text, m), "medium"))
            if len(legal_entities) >= 8:
                break

    # Öffentliche Social-/Video-Links.
    social = []
    for page in pages:
        for link in page.links:
            host = (urlparse(link).hostname or "").lower().removeprefix("www.")
            platform = next((name for h, name in SOCIAL_HOSTS.items() if host == h or host.endswith("." + h)), None)
            if platform:
                item = {"platform": platform, "url": link, "source_url": page.url}
                if item not in social:
                    social.append(item)

    # Referral aus der vom Nutzer gelieferten URL ist ein besonders starker Hinweis.
    input_url = ctx.get("input_url", "")
    referral_input = bool(input_url and re.search(r"/ref/|[?&](?:ref|affiliate|partner)=", input_url, re.I))
    if referral_input:
        findings.append(Finding(
            "referral_input", "personal_referral_parameter", input_url,
            "Der eingegebene Link enthält eine Referral-/Affiliate-/Partnerkennung.", "high"
        ))
        detected["referral"] = True

    risk_signals = []
    if max_yield_percent is not None:
        severity = "high" if max_yield_percent >= 15 else "medium" if max_yield_percent >= 8 else "info"
        risk_signals.append({
            "id": "yield_level", "severity": severity,
            "title": "Rendite-/Zinsangabe erkannt",
            "explanation": f"Öffentlich wurde eine Rendite-/Zinsangabe bis {max_yield_percent:g}% erkannt. Entscheidend ist, wodurch diese Rendite entsteht und welches Verlustrisiko dafür übernommen wird."
        })
    if max_commission_percent is not None:
        risk_signals.append({
            "id": "affiliate_commission", "severity": "medium",
            "title": "Affiliate-Provision erkannt",
            "explanation": f"Im eigenen Vertriebs-/Affiliate-Bereich wird eine Provision bis {max_commission_percent:g}% beworben. Das ist ein wirtschaftlicher Anreiz für Empfehlungen und keine Projektrendite."
        })
    if detected.get("leverage"):
        risk_signals.append({"id": "leverage", "severity": "high", "title": "Hebel/Leverage erwähnt", "explanation": "Hebel kann Gewinne und Verluste verstärken. Die tatsächliche Risikobegrenzung muss nachvollziehbar sein."})
    if detected.get("trading"):
        risk_signals.append({"id": "active_strategy", "severity": "medium", "title": "Aktive Trading-/Strategieelemente", "explanation": "Die Rendite hängt damit von Markt-, Ausführungs- und Strategierisiken ab."})
    if detected.get("lockup"):
        risk_signals.append({"id": "capital_binding", "severity": "medium", "title": "Hinweise auf Kapitalbindung/Laufzeiten", "explanation": "Vor einer Einzahlung sollte klar sein, wann und unter welchen Bedingungen Kapital wieder verfügbar ist."})
    if detected.get("referral") or detected.get("bonus"):
        risk_signals.append({"id": "distribution_incentive", "severity": "medium", "title": "Vertriebs-/Empfehlungsanreize erkannt", "explanation": "Empfehlungen können wirtschaftlich beeinflusst sein. Provisionen, Boni und Volumenanreize sollten transparent verstanden werden."})
    if not legal_entities:
        risk_signals.append({"id": "operator_identity", "severity": "medium", "title": "Rechtsträger nicht eindeutig erkannt", "explanation": "Ein Projekt- oder Markenname ist noch kein Vertragspartner. Betreiber, Sitz und juristische Person müssen eindeutig geklärt werden."})

    questions = []
    if max_yield_percent is not None:
        questions.append("Wodurch wird die beworbene Rendite tatsächlich erwirtschaftet und welcher maximale Verlust ist möglich?")
    if detected.get("referral") or detected.get("bonus"):
        questions.append("Welche Provision, Bonus- oder sonstige Vergütung erhält die empfehlende Person oder deren Upline?")
    if detected.get("lockup") or detected.get("withdrawal"):
        questions.append("Wann und unter welchen Bedingungen kann vollständig ausgezahlt werden?")
    if detected.get("kyc"):
        questions.append("Zu welchem Zeitpunkt wird KYC/Identitätsprüfung verlangt und kann sie eine Auszahlung verzögern oder verhindern?")
    if detected.get("custody"):
        questions.append("Wer hält die Assets bzw. Private Keys nach der Einzahlung und was passiert bei Insolvenz dieses Verwahrers?")
    if detected.get("trading") or detected.get("leverage"):
        questions.append("Wer führt die Strategie aus, welche realen Drawdowns gab es und wie wird das Risiko begrenzt?")
    if not legal_entities:
        questions.append("Welche juristische Person ist der Vertragspartner – mit Registernummer, Sitz und Verantwortlichen?")

    return {
        "pages": page_summaries,
        "max_percentage": max_yield_percent,
        "max_yield_percentage": max_yield_percent,
        "max_commission_percentage": max_commission_percent,
        "detected": detected,
        "legal_entities": legal_entities,
        "social_and_video_links": social[:30],
        "findings": [asdict(f) for f in findings[:150]],
        "risk_signals": risk_signals,
        "questions": list(dict.fromkeys(questions))[:12],
    }


def run(query: str) -> dict:
    parsed = parse_input(query)
    if not parsed["raw"]:
        raise ValueError("Leere Eingabe")

    ctx = {
        "input": parsed["raw"],
        "input_kind": parsed["kind"],
        "input_url": parsed["url"],
        "project_name": parsed["name"],
        "domain": parsed["domain"],
        "resolved_url": parsed["url"],
    }
    discovery_attempts = []

    if parsed["kind"] == "url":
        seed = fetch_page(parsed["url"])
        if not seed:
            # Fallback auf Domain-Startseite, falls ein Referral-Pfad geschützt ist.
            seed = fetch_page(f"https://{parsed.get('fetch_host') or parsed['domain']}/")
        if not seed:
            return {"version": 1, "status": "no_readable_website", "context": ctx, "discovery_attempts": []}
        ctx["domain"] = (urlparse(seed.url).hostname or parsed["domain"]).removeprefix("www.")
        ctx["resolved_url"] = seed.url
    else:
        domain, seed, discovery_attempts = discover_project(parsed["name"])
        if not domain or not seed:
            return {
                "version": 1,
                "status": "website_not_resolved",
                "context": ctx,
                "discovery_attempts": discovery_attempts,
                "note": "Keine eindeutige Projektwebsite über die konservative Domainauflösung bestätigt.",
            }
        ctx["domain"] = domain
        ctx["resolved_url"] = seed.url

    pages = crawl(seed, ctx["domain"], parsed["url"])
    analysis = analyze_pages(pages, ctx)
    return {
        "version": 1,
        "status": "ok",
        "context": ctx,
        "discovery_attempts": discovery_attempts,
        "analysis": analysis,
        "principle": "Öffentliche Hinweise und Risikoindikatoren; kein Betrugs- oder Seriositätsurteil.",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="Akademie Research Engine V1")
    ap.add_argument("query", help="Projektname, Domain oder Referral-/Affiliate-Link")
    ap.add_argument("--output", default="", help="JSON-Datei für Ergebnis")
    args = ap.parse_args()
    result = run(args.query)
    payload = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        path = Path(args.output)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(payload + "\n", encoding="utf-8")
        print(path)
    else:
        print(payload)
    return 0 if result.get("status") == "ok" else 2


if __name__ == "__main__":
    sys.exit(main())