#!/usr/bin/env python3
from __future__ import annotations

from datetime import datetime, timezone

INVEST_DUBAI_SEARCH_URL = "https://app.invest.dubai.ae/search-license"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _clean(value: str) -> str:
    return " ".join(str(value or "").split()).strip()


def _unique_candidates(values: list[str], limit: int = 6) -> list[str]:
    out=[]; seen=set()
    for raw in values:
        value=_clean(raw)
        if not 2 <= len(value) <= 120:
            continue
        key=value.casefold()
        if key in seen:
            continue
        seen.add(key); out.append(value)
        if len(out)>=limit:
            break
    return out


def _body_text(page) -> str:
    try:
        return _clean(page.locator("body").inner_text(timeout=5000))
    except Exception:
        return ""


def _locate_search_input(page):
    selectors = [
        'input[placeholder*="Search by License Number"]',
        'input[placeholder*="English Business Name"]',
        'input[type="search"]',
        'input',
    ]
    for selector in selectors:
        locator=page.locator(selector)
        if locator.count():
            for index in range(min(locator.count(),8)):
                candidate=locator.nth(index)
                try:
                    if candidate.is_visible() and candidate.is_enabled():
                        return candidate
                except Exception:
                    continue
    return None


def _submit_search(page, field) -> str:
    try:
        field.press("Enter", timeout=3000)
        page.wait_for_timeout(1800)
        return "enter"
    except Exception:
        pass
    for pattern in ("Search", "SEARCH", "بحث"):
        try:
            button=page.get_by_role("button", name=pattern, exact=False)
            if button.count() and button.first.is_visible():
                button.first.click(timeout=4000)
                page.wait_for_timeout(1800)
                return "button"
        except Exception:
            continue
    return "none"


def search_invest_dubai(candidates: list[str], timeout_ms: int = 30000) -> dict:
    """Search the public Invest in Dubai licence lookup with visible project/entity names.

    A no-match result is recorded only as search coverage. A positive record candidate
    requires the searched name to appear in the rendered result text together with
    licence/register language. The caller may then store the rendered page as an
    official O-evidence item, but must still avoid interpreting no result as proof that
    no UAE entity or licence exists under another legal/trade name.
    """
    from playwright.sync_api import sync_playwright

    names=_unique_candidates(candidates)
    attempts=[]
    if not names:
        return {"source_id":"ae_dubai_det_license","search_url":INVEST_DUBAI_SEARCH_URL,"attempts":[],"error":"no_candidates"}

    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True)
        context=browser.new_context(
            locale="en-US",
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 "
                "FSA-ProjectCheck/1.0"
            ),
            viewport={"width":1365,"height":900},
        )
        context.route(
            "**/*",
            lambda route: route.abort()
            if route.request.resource_type in {"image","media","font"}
            else route.continue_(),
        )

        for name in names:
            page=context.new_page()
            attempt={
                "candidate":name,"searched_at":utc_now(),"requested_url":INVEST_DUBAI_SEARCH_URL,
                "final_url":"","http_status":None,"submit_method":"","status":"error",
                "match_visible":False,"result_excerpt":"","error":"",
            }
            try:
                response=page.goto(INVEST_DUBAI_SEARCH_URL,wait_until="domcontentloaded",timeout=timeout_ms)
                try:
                    page.wait_for_load_state("networkidle",timeout=7000)
                except Exception:
                    page.wait_for_timeout(1500)
                attempt["final_url"]=page.url
                attempt["http_status"]=response.status if response else None
                field=_locate_search_input(page)
                if field is None:
                    attempt["status"]="form_not_found"
                    attempt["result_excerpt"]=_body_text(page)[:1200]
                    attempts.append(attempt)
                    continue
                field.fill(name,timeout=5000)
                attempt["submit_method"]=_submit_search(page,field)
                try:
                    page.wait_for_load_state("networkidle",timeout=6000)
                except Exception:
                    page.wait_for_timeout(1200)
                text=_body_text(page)
                blob=text.casefold()
                exact=name.casefold() in blob
                register_language=any(term in blob for term in (
                    "license number","licence number","dubai unified license","dul number",
                    "business name","license status","licence status","expiry date","issue date",
                ))
                no_result=any(term in blob for term in (
                    "no result","no results","no record","no records","nothing found","no data found",
                ))
                attempt["match_visible"]=bool(exact and register_language and not no_result)
                attempt["status"]="positive_candidate" if attempt["match_visible"] else "no_visible_match"
                if attempt["match_visible"] or no_result:
                    attempt["result_excerpt"]=text[:5000]
                else:
                    attempt["result_excerpt"]=text[:1800]
            except Exception as exc:
                attempt["error"]=f"{type(exc).__name__}: {exc}"[:500]
            finally:
                attempts.append(attempt)
                page.close()
        browser.close()

    return {
        "source_id":"ae_dubai_det_license",
        "search_url":INVEST_DUBAI_SEARCH_URL,
        "attempts":attempts,
        "error":"",
    }
