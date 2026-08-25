#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from urllib.parse import urldefrag, urljoin, urlparse

SOCIAL_HOSTS = {
    "t.me": "telegram",
    "telegram.me": "telegram",
    "facebook.com": "facebook",
    "www.facebook.com": "facebook",
    "instagram.com": "instagram",
    "www.instagram.com": "instagram",
    "tiktok.com": "tiktok",
    "www.tiktok.com": "tiktok",
    "youtube.com": "youtube",
    "www.youtube.com": "youtube",
    "youtu.be": "youtube",
    "x.com": "x",
    "twitter.com": "x",
    "linkedin.com": "linkedin",
    "www.linkedin.com": "linkedin",
}

# Diese Begriffe bestimmen nur noch die Reihenfolge der Recherche.
# Sie entscheiden NICHT mehr darüber, ob eine sichere interne Seite untersucht wird.
PRIORITY_PATH_WORDS = {
    "about", "company", "team", "contact", "legal", "imprint", "impressum",
    "terms", "privacy", "policy", "faq", "docs", "documentation", "whitepaper",
    "token", "staking", "lending", "borrow", "card", "bank", "payment", "pricing",
    "fees", "rewards", "compensation", "referral", "affiliate", "ambassador",
    "license", "licence", "regulation", "compliance", "security", "audit",
    "product", "products", "service", "services", "platform", "ecosystem",
    "governance", "dao", "treasury", "academy", "career", "membership", "packages",
}

SAFE_NAV_WORDS = PRIORITY_PATH_WORDS | {
    "home", "back to home", "homepage", "start", "startseite", "learn more",
    "read more", "discover", "explore", "overview", "mehr erfahren", "weiterlesen",
}

BLOCKED_ACTION_WORDS = {
    "buy", "purchase", "checkout", "deposit", "withdraw", "send", "transfer",
    "confirm", "create account", "sign up", "signup", "register", "connect wallet",
    "pay", "order", "subscribe", "submit", "login", "log in", "sign in",
}

# Öffentliche Informationsseiten werden verfolgt. Interaktive Konto-/Transaktionswege nicht.
BLOCKED_PATH_SEGMENTS = {
    "auth", "login", "signin", "sign-in", "signup", "sign-up", "register",
    "registration", "account", "dashboard", "checkout", "cart", "deposit",
    "withdraw", "logout", "create-account", "connect-wallet", "wallet-connect",
}

CLICKABLE_SELECTOR = "button,[role='button'],[onclick],input[type='button'],a:not([href])"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _normalize_host(host: str) -> str:
    host = str(host or "").lower().strip(".")
    return host[4:] if host.startswith("www.") else host


def host_of(url: str) -> str:
    return _normalize_host(urlparse(url).hostname or "")


def _canonical_url(url: str) -> str:
    return urldefrag(str(url or "").strip())[0]


def classify_url(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    if host in SOCIAL_HOSTS:
        return SOCIAL_HOSTS[host]
    if host.endswith(".youtube.com"):
        return "youtube"
    if host.endswith(".facebook.com"):
        return "facebook"
    if host.endswith(".instagram.com"):
        return "instagram"
    if host.endswith(".tiktok.com"):
        return "tiktok"
    return "website"


def _hosts_related(host: str, primary_hosts: set[str]) -> bool:
    host = _normalize_host(host)
    for primary in primary_hosts:
        primary = _normalize_host(primary)
        if host == primary or host.endswith("." + primary) or primary.endswith("." + host):
            return True
    return False


def _blocked_path(url: str) -> bool:
    parsed = urlparse(url)
    segments = {
        segment.strip().lower()
        for segment in parsed.path.split("/")
        if segment.strip()
    }
    return bool(segments & BLOCKED_PATH_SEGMENTS)


def _is_safe_project_link(url: str, primary_hosts: set[str], *, trusted_navigation: bool = False) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return False

    source_type = classify_url(url)
    if source_type != "website":
        return True

    if _blocked_path(url):
        return False

    host = _normalize_host(parsed.hostname or "")
    if _hosts_related(host, primary_hosts):
        return True

    # Ein sicherer sichtbarer Navigationsweg darf einmal auf die offizielle Projekt-Domain
    # überleiten (z. B. Referral-/Landingpage -> offizielle Startseite).
    return trusted_navigation


def _priority_rank(url: str, primary_hosts: set[str], *, trusted_navigation: bool = False) -> tuple[int, int, str]:
    parsed = urlparse(url)
    source_type = classify_url(url)
    host = _normalize_host(parsed.hostname or "")

    if source_type != "website":
        return (4, len(parsed.path), url)
    if trusted_navigation and not _hosts_related(host, primary_hosts):
        return (0, len(parsed.path), url)
    if parsed.path in {"", "/"} and not parsed.query:
        return (0, 0, url)

    haystack = (parsed.path + "?" + parsed.query).lower()
    if any(word in haystack for word in PRIORITY_PATH_WORDS):
        return (1, len(parsed.path), url)
    return (2, len(parsed.path), url)


def choose_priority_links(probes: list[dict], limit: int = 14, project_hosts: set[str] | None = None) -> list[str]:
    """Choose the next safe public pages to probe.

    The crawler follows the public internal structure of the identified project.
    Priority keywords only influence order; safe same-domain pages are not discarded.
    """
    primary_hosts = set(project_hosts or {host_of(p.get("final_url") or p.get("requested_url") or "") for p in probes})
    primary_hosts.discard("")

    candidates: dict[str, tuple[int, int, str]] = {}

    def probe_is_project_source(probe: dict) -> bool:
        if probe.get("source_type") != "website":
            return False
        host = host_of(probe.get("final_url") or probe.get("requested_url") or "")
        return _hosts_related(host, primary_hosts)

    def add(url: str, trusted_navigation: bool = False) -> None:
        canonical = _canonical_url(url)
        if not canonical:
            return
        if not _is_safe_project_link(canonical, primary_hosts, trusted_navigation=trusted_navigation):
            return
        rank = _priority_rank(canonical, primary_hosts, trusted_navigation=trusted_navigation)
        old = candidates.get(canonical)
        if old is None or rank < old:
            candidates[canonical] = rank

    # Sichere Buttons/Router-Wege zuerst.
    for probe in probes:
        if not probe_is_project_source(probe):
            continue
        for link in probe.get("navigation_links") or []:
            add(link, trusted_navigation=True)

    # Sichtbare Anchor-Navigation mit Label kann ebenfalls eine offizielle Startseite überbrücken.
    for probe in probes:
        if not probe_is_project_source(probe):
            continue
        for action in probe.get("link_actions") or []:
            label = str(action.get("label") or "")
            if _safe_navigation_label(label):
                add(str(action.get("url") or ""), trusted_navigation=True)

    # Danach ALLE sicheren internen Links; Keywords beeinflussen nur die Sortierung.
    for probe in probes:
        if not probe_is_project_source(probe):
            continue
        for link in probe.get("links") or []:
            add(link)

    ordered = sorted(candidates, key=lambda url: candidates[url])
    return ordered[: max(0, limit)]


def _safe_navigation_label(label: str) -> bool:
    value = " ".join(str(label or "").lower().split())
    if not value or len(value) > 100:
        return False
    if any(word in value for word in BLOCKED_ACTION_WORDS):
        return False
    return any(word in value for word in SAFE_NAV_WORDS)


def _extract_static_navigation_targets(base_url: str, candidates: list[dict]) -> list[dict]:
    results: list[dict] = []
    seen: set[str] = set()
    for candidate in candidates:
        label = str(candidate.get("label") or "").strip()
        if not _safe_navigation_label(label):
            continue
        raw = str(candidate.get("target") or "").strip()
        if not raw:
            onclick = str(candidate.get("onclick") or "")
            match = re.search(r"(?:location(?:\.href)?\s*=|location\.assign\(|window\.open\()\s*['\"]([^'\"]+)", onclick)
            raw = match.group(1) if match else ""
        if not raw:
            continue
        target = _canonical_url(urljoin(base_url, raw))
        parsed = urlparse(target)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc or target in seen:
            continue
        if _blocked_path(target):
            continue
        seen.add(target)
        results.append({"label": label[:120], "url": target, "basis": "attribute_or_onclick"})
    return results


def _discover_click_navigation(context, page_url: str, candidates: list[dict], *, timeout_ms: int, max_clicks: int = 8) -> list[dict]:
    results: list[dict] = []
    seen: set[str] = set()
    safe_candidates = [c for c in candidates if _safe_navigation_label(c.get("label") or "")]
    for candidate in safe_candidates[:max_clicks]:
        page = context.new_page()
        try:
            page.goto(page_url, wait_until="domcontentloaded", timeout=timeout_ms)
            try:
                page.wait_for_load_state("networkidle", timeout=5000)
            except Exception:
                page.wait_for_timeout(1200)
            locator = page.locator(CLICKABLE_SELECTOR).nth(int(candidate.get("index", -1)))
            if locator.count() < 1 or not locator.is_visible():
                continue
            before = _canonical_url(page.url)
            try:
                locator.click(timeout=5000)
            except Exception:
                continue
            page.wait_for_timeout(1400)
            after = _canonical_url(page.url)
            if after and after != before and not _blocked_path(after):
                parsed = urlparse(after)
                if parsed.scheme in {"http", "https"} and parsed.netloc and after not in seen:
                    seen.add(after)
                    results.append(
                        {
                            "label": str(candidate.get("label") or "")[:120],
                            "url": after,
                            "basis": "safe_button_click",
                        }
                    )
        finally:
            page.close()
    return results


def probe_urls(urls: list[str], timeout_ms: int = 35000) -> list[dict]:
    """Open public traces in a real headless Chromium browser.

    The probe records rendered content, redirects, classic links and safe
    navigation targets exposed through buttons or client-side routers. It never
    clicks transactional/account actions and does not classify a project as good/bad.
    """
    from playwright.sync_api import sync_playwright

    clean_urls: list[str] = []
    for raw in urls:
        value = _canonical_url(raw)
        parsed = urlparse(value)
        if parsed.scheme in {"http", "https"} and parsed.netloc and value not in clean_urls:
            clean_urls.append(value)

    results: list[dict] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            locale="de-DE",
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 "
                "FSA-ProjectCheck/1.0"
            ),
            viewport={"width": 1365, "height": 900},
        )
        context.route(
            "**/*",
            lambda route: route.abort()
            if route.request.resource_type in {"image", "media", "font"}
            else route.continue_(),
        )

        for requested_url in clean_urls:
            page = context.new_page()
            captured_at = utc_now()
            record = {
                "requested_url": requested_url,
                "final_url": requested_url,
                "source_type": classify_url(requested_url),
                "captured_at": captured_at,
                "http_status": None,
                "title": "",
                "h1": "",
                "meta_description": "",
                "og_site_name": "",
                "text_excerpt": "",
                "links": [],
                "link_actions": [],
                "navigation_links": [],
                "navigation_actions": [],
                "content_sha256": "",
                "error": "",
            }
            try:
                response = page.goto(requested_url, wait_until="domcontentloaded", timeout=timeout_ms)
                try:
                    page.wait_for_load_state("networkidle", timeout=7000)
                except Exception:
                    page.wait_for_timeout(1800)

                record["final_url"] = _canonical_url(page.url)
                record["source_type"] = classify_url(page.url)
                record["http_status"] = response.status if response else None
                data = page.evaluate(
                    f"""() => {{
                      const meta = (sel) => document.querySelector(sel)?.content?.trim() || '';
                      const h1 = document.querySelector('h1')?.innerText?.trim() || '';
                      const anchors = [...document.querySelectorAll('a[href]')]
                        .map(a => ({{
                          url: a.href,
                          label: (a.innerText || a.getAttribute('aria-label') || a.getAttribute('title') || '').trim()
                        }})).filter(item => item.url);
                      const clickables = [...document.querySelectorAll({CLICKABLE_SELECTOR!r})]
                        .map((el, index) => {{
                          const style = window.getComputedStyle(el);
                          const rect = el.getBoundingClientRect();
                          const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
                          const label = (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
                          const target = el.getAttribute('data-href') || el.getAttribute('data-url') || el.getAttribute('formaction') || '';
                          return {{ index, visible, label, target, onclick: el.getAttribute('onclick') || '' }};
                        }}).filter(item => item.visible && item.label);
                      return {{
                        title: document.title || '',
                        h1,
                        description: meta('meta[name="description"]'),
                        siteName: meta('meta[property="og:site_name"]'),
                        text: document.body?.innerText || '',
                        anchors,
                        clickables
                      }};
                    }}"""
                )
                text = " ".join(str(data.get("text") or "").split())
                links: list[str] = []
                link_actions: list[dict] = []
                for anchor in data.get("anchors") or []:
                    canonical = _canonical_url(anchor.get("url") or "")
                    parsed = urlparse(canonical)
                    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                        continue
                    if canonical not in links:
                        links.append(canonical)
                    link_actions.append(
                        {
                            "label": " ".join(str(anchor.get("label") or "").split())[:160],
                            "url": canonical,
                        }
                    )
                    if len(links) >= 300:
                        break

                candidates = data.get("clickables") or []
                static_actions = _extract_static_navigation_targets(record["final_url"], candidates)
                clicked_actions = _discover_click_navigation(
                    context,
                    record["final_url"],
                    candidates,
                    timeout_ms=timeout_ms,
                )
                navigation_actions: list[dict] = []
                navigation_links: list[str] = []
                for action in static_actions + clicked_actions:
                    url = _canonical_url(action.get("url") or "")
                    if not url or url in navigation_links:
                        continue
                    navigation_links.append(url)
                    navigation_actions.append(action)

                record["title"] = " ".join(str(data.get("title") or "").split())[:300]
                record["h1"] = " ".join(str(data.get("h1") or "").split())[:300]
                record["meta_description"] = " ".join(str(data.get("description") or "").split())[:1000]
                record["og_site_name"] = " ".join(str(data.get("siteName") or "").split())[:200]
                record["text_excerpt"] = text[:16000]
                record["links"] = links
                record["link_actions"] = link_actions[:300]
                record["navigation_links"] = navigation_links[:40]
                record["navigation_actions"] = navigation_actions[:40]
                digest_source = "\n".join(
                    [record["final_url"], record["title"], record["h1"], record["text_excerpt"]]
                )
                record["content_sha256"] = hashlib.sha256(digest_source.encode("utf-8")).hexdigest()
            except Exception as exc:
                record["final_url"] = _canonical_url(page.url or requested_url)
                record["error"] = f"{type(exc).__name__}: {exc}"[:1000]
            finally:
                results.append(record)
                page.close()
        context.close()
        browser.close()
    return results
