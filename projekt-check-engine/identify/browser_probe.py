#!/usr/bin/env python3
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from urllib.parse import urlparse

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
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _normalize_host(host: str) -> str:
    host = str(host or "").lower().strip(".")
    return host[4:] if host.startswith("www.") else host


def host_of(url: str) -> str:
    return _normalize_host(urlparse(url).hostname or "")


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


def _is_priority_link(url: str, primary_hosts: set[str]) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return False
    host = _normalize_host(parsed.hostname or "")
    if classify_url(url) != "website":
        return True
    if host not in primary_hosts:
        return False
    haystack = (parsed.path + "?" + parsed.query).lower()
    return any(word in haystack for word in PRIORITY_PATH_WORDS)


def choose_priority_links(probes: list[dict], limit: int = 14) -> list[str]:
    primary_hosts = {host_of(p.get("final_url") or p.get("requested_url") or "") for p in probes}
    primary_hosts.discard("")
    seen: set[str] = set()
    out: list[str] = []
    for probe in probes:
        for link in probe.get("links") or []:
            if link in seen or not _is_priority_link(link, primary_hosts):
                continue
            seen.add(link)
            out.append(link)
            if len(out) >= limit:
                return out
    return out


def probe_urls(urls: list[str], timeout_ms: int = 35000) -> list[dict]:
    """Open public traces in a real headless Chromium browser.

    The probe is intentionally neutral: it records what is served, redirects,
    page metadata and public links. It does not classify a project as good/bad.
    """
    from playwright.sync_api import sync_playwright

    clean_urls: list[str] = []
    for raw in urls:
        value = str(raw or "").strip()
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
                "content_sha256": "",
                "error": "",
            }
            try:
                response = page.goto(requested_url, wait_until="domcontentloaded", timeout=timeout_ms)
                try:
                    page.wait_for_load_state("networkidle", timeout=7000)
                except Exception:
                    page.wait_for_timeout(1800)

                record["final_url"] = page.url
                record["source_type"] = classify_url(page.url)
                record["http_status"] = response.status if response else None
                data = page.evaluate(
                    """() => {
                      const meta = (sel) => document.querySelector(sel)?.content?.trim() || '';
                      const h1 = document.querySelector('h1')?.innerText?.trim() || '';
                      const links = [...document.querySelectorAll('a[href]')]
                        .map(a => a.href).filter(Boolean);
                      return {
                        title: document.title || '',
                        h1,
                        description: meta('meta[name="description"]'),
                        siteName: meta('meta[property="og:site_name"]'),
                        text: document.body?.innerText || '',
                        links
                      };
                    }"""
                )
                text = " ".join(str(data.get("text") or "").split())
                links: list[str] = []
                for link in data.get("links") or []:
                    parsed = urlparse(str(link))
                    if parsed.scheme in {"http", "https"} and parsed.netloc and link not in links:
                        links.append(link)
                    if len(links) >= 300:
                        break

                record["title"] = " ".join(str(data.get("title") or "").split())[:300]
                record["h1"] = " ".join(str(data.get("h1") or "").split())[:300]
                record["meta_description"] = " ".join(str(data.get("description") or "").split())[:1000]
                record["og_site_name"] = " ".join(str(data.get("siteName") or "").split())[:200]
                record["text_excerpt"] = text[:16000]
                record["links"] = links
                digest_source = "\n".join(
                    [record["final_url"], record["title"], record["h1"], record["text_excerpt"]]
                )
                record["content_sha256"] = hashlib.sha256(digest_source.encode("utf-8")).hexdigest()
            except Exception as exc:
                record["final_url"] = page.url or requested_url
                record["error"] = f"{type(exc).__name__}: {exc}"[:1000]
            finally:
                results.append(record)
                page.close()
        context.close()
        browser.close()
    return results
