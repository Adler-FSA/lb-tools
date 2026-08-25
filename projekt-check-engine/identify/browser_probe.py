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

PRIORITY_PATH_WORDS = {
    "about", "company", "team", "contact", "legal", "imprint", "impressum",
    "terms", "privacy", "policy", "faq", "docs", "documentation", "whitepaper",
    "token", "staking", "lending", "borrow", "card", "bank", "payment", "pricing",
    "fees", "rewards", "compensation", "referral", "affiliate", "ambassador",
    "license", "licence", "regulation", "compliance", "security", "audit",
    "product", "products", "service", "services", "platform", "ecosystem",
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


def _is_priority_link(url: str, primary_hosts: set[str], *, trusted_navigation: bool = False) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return False
    host = _normalize_host(parsed.hostname or "")
    if classify_url(url) != "website":
        return True
    if trusted_navigation:
        return True
    if not _hosts_related(host, primary_hosts):
        return False
    if parsed.path in {"", "/"} and not parsed.query:
        return True
    haystack = (parsed.path + "?" + parsed.query).lower()
    return any(word in haystack for word in PRIORITY_PATH_WORDS)


def choose_priority_links(probes: list[dict], limit: int = 14) -> list[str]:
    primary_hosts = {host_of(p.get("final_url") or p.get("requested_url") or "") for p in probes}
    primary_hosts.discard("")
    seen: set[str] = set()
    out: list[str] = []

    def add(url: str, trusted_navigation: bool = False) -> bool:
        canonical = _canonical_url(url)
        if not canonical or canonical in seen:
            return False
        if not _is_priority_link(canonical, primary_hosts, trusted_navigation=trusted_navigation):
            return False
        seen.add(canonical)
        out.append(canonical)
        return len(out) >= limit

    for probe in probes:
        if probe.get("source_type") != "website":
            continue
        for link in probe.get("navigation_links") or []:
            if add(link, trusted_navigation=True):
                return out

    for probe in probes:
        if probe.get("source_type") != "website":
            continue
        for link in probe.get("links") or []:
            if add(link):
                return out
    return out


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
            if after and after != before:
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
                      const links = [...document.querySelectorAll('a[href]')]
                        .map(a => a.href).filter(Boolean);
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
                        links,
                        clickables
                      }};
                    }}"""
                )
                text = " ".join(str(data.get("text") or "").split())
                links: list[str] = []
                for link in data.get("links") or []:
                    canonical = _canonical_url(link)
                    parsed = urlparse(canonical)
                    if parsed.scheme in {"http", "https"} and parsed.netloc and canonical not in links:
                        links.append(canonical)
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
