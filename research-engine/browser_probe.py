#!/usr/bin/env python3
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URLS = [
    "https://www.kryptosavings.com/ref/DCEWQSVZ",
    "https://www.kryptosavings.com/",
    "https://kryptosavings.com/",
]


def clean(value):
    return " ".join((value or "").split())


def probe(url):
    result = {"requested_url": url}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--disable-dev-shm-usage", "--no-sandbox"])
            context = browser.new_context(
                locale="de-DE",
                user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/128 Safari/537.36",
            )
            page = context.new_page()
            response = page.goto(url, wait_until="domcontentloaded", timeout=25000)
            result["response_status"] = response.status if response else None
            try:
                page.wait_for_load_state("networkidle", timeout=7000)
            except Exception:
                result["networkidle_timeout"] = True
            page.wait_for_timeout(2000)
            result["final_url"] = page.url
            result["title"] = clean(page.title())
            try:
                body = clean(page.locator("body").inner_text(timeout=6000))
            except Exception as exc:
                body = ""
                result["body_error"] = type(exc).__name__
            result["body_chars"] = len(body)
            result["body_sample"] = body[:1800]
            try:
                links = page.eval_on_selector_all("a[href]", "els => els.map(e => e.href).filter(Boolean)")
            except Exception:
                links = []
            result["links"] = list(dict.fromkeys(links))[:40]
            browser.close()
    except Exception as exc:
        result["error_type"] = type(exc).__name__
        result["error"] = str(exc)[:1200]
    return result


def main():
    output = Path(sys.argv[1] if len(sys.argv) > 1 else "research-engine/output/browser-probe.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    data = {"probes": [probe(url) for url in URLS]}
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
