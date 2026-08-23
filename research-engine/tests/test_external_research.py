import importlib.util
import sys
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "external_research.py"
spec = importlib.util.spec_from_file_location("external_research", MODULE)
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


def core_result():
    return {
        "version": 1,
        "status": "ok",
        "context": {
            "input": "KryptoSavings",
            "input_kind": "name",
            "input_url": "",
            "project_name": "KryptoSavings",
            "domain": "kryptosavings.com",
            "resolved_url": "https://www.kryptosavings.com/",
        },
        "analysis": {"legal_entities": ["Open Delta DAO LLC"]},
    }


def test_unwrap_duckduckgo_redirect():
    target = mod.unwrap_search_url(
        "https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Freview%3Fa%3D1"
    )
    assert target == "https://example.com/review?a=1"


def test_relation_distinguishes_project_platform_and_independent():
    assert mod.relation_for("https://www.kryptosavings.com/affiliate", "kryptosavings.com") == ("project_owned", "project", "")
    assert mod.relation_for("https://www.youtube.com/watch?v=abc", "kryptosavings.com") == ("platform", "video", "youtube")
    assert mod.relation_for("https://www.reddit.com/r/crypto/x", "kryptosavings.com") == ("community", "community", "reddit")
    assert mod.relation_for("https://example-news.com/kryptosavings", "kryptosavings.com") == ("independent", "article", "")


def test_match_confidence_is_attribution_not_source_quality():
    confidence, match = mod.match_confidence("KryptoSavings", "kryptosavings.com", "A look at KryptoSavings", "Independent review", "")
    assert confidence == "high"
    assert match == "name_exact"

    confidence, match = mod.match_confidence("KryptoSavings", "kryptosavings.com", "Generic crypto project", "No exact project reference", "")
    assert confidence == "low"
    assert match == "search_context_only"


def test_hyphenated_generic_name_is_only_medium_match():
    confidence, match = mod.match_confidence(
        "KryptoSavings", "kryptosavings.com",
        "AdvCash mit neuer Funktion Krypto-Savings mit Nexo",
        "Krypto-Savings zum Geld verdienen mit Kryptowährungen", "",
    )
    assert confidence == "medium"
    assert match == "name_normalized"


def test_query_plan_covers_external_categories_and_legal_entities():
    plan = mod.query_plan("KryptoSavings", "kryptosavings.com", ["Open Delta DAO LLC"])
    categories = {category for category, _ in plan}
    assert {"article", "video", "social", "community", "operator"}.issubset(categories)
    assert any('"Open Delta DAO LLC"' in query for _, query in plan)
    assert any("site:youtube.com" in query for _, query in plan)
    assert any("site:tiktok.com" in query for _, query in plan)
    assert any("withdrawal" in query for _, query in plan)


def test_extract_published_at_from_meta():
    soup = mod.BeautifulSoup(
        '<html><head><meta property="article:published_time" content="2026-08-20T10:00:00Z"></head></html>',
        "html.parser",
    )
    assert mod.extract_published_at(soup) == "2026-08-20T10:00:00Z"


def test_bing_rss_parser(monkeypatch):
    rss = """<?xml version="1.0"?><rss><channel><item>
    <title>KryptoSavings review</title>
    <link>https://example.com/kryptosavings</link>
    <description><![CDATA[Independent <b>KryptoSavings</b> review]]></description>
    </item></channel></rss>"""

    class Response:
        ok = True
        text = rss

    monkeypatch.setattr(mod.requests, "get", lambda *args, **kwargs: Response())
    hits = mod.search_bing_rss('"KryptoSavings"')
    assert len(hits) == 1
    assert hits[0].provider == "bing-rss"
    assert hits[0].url == "https://example.com/kryptosavings"
    assert hits[0].snippet == "Independent KryptoSavings review"


def test_enrich_keeps_confirmed_trace_and_rejects_search_context_only(monkeypatch):
    good = mod.SearchHit(
        url="https://example-news.com/kryptosavings-review",
        title="KryptoSavings review",
        snippet="We reviewed KryptoSavings and its yield claims.",
        query='"KryptoSavings"', provider="test",
    )
    bad = mod.SearchHit(
        url="https://example-news.com/generic",
        title="Generic crypto article",
        snippet="A general crypto market article.",
        query='"KryptoSavings"', provider="test",
    )

    def fake_search(query, limit=6):
        blocked = ("youtube", "facebook", "instagram", "tiktok", "site:x.com", "linkedin", "t.me", "reddit", "withdrawal", "founder", "company", "Open Delta")
        if any(x in query for x in blocked):
            return [], [{"query": query, "provider": "test", "results": 0}]
        return [good, bad], [{"query": query, "provider": "test", "results": 2}]

    def fake_read(url):
        if url.endswith("/kryptosavings-review"):
            return {"ok": True, "url": url, "title": "KryptoSavings review", "text": "This independent page discusses KryptoSavings, its advertised returns and withdrawal terms.", "published_at": "2026-08-20"}
        return {"ok": True, "url": url, "title": "Generic crypto article", "text": "This page discusses Bitcoin and Ethereum but not the requested project.", "published_at": "2026-08-19"}

    monkeypatch.setattr(mod, "web_search", fake_search)
    monkeypatch.setattr(mod, "read_public_page", fake_read)
    traces = mod.enrich(core_result())["external_research"]["traces"]
    assert len(traces) == 1
    trace = traces[0]
    assert trace["source_url"] == "https://example-news.com/kryptosavings-review"
    assert trace["source_relation"] == "independent"
    assert trace["category"] == "article"
    assert trace["published_at"] == "2026-08-20"
    assert trace["attribution_confidence"] == "high"
    assert "KryptoSavings" in trace["evidence"]


def test_normalized_name_similarity_goes_to_review_candidates(monkeypatch):
    candidate = mod.SearchHit(
        url="https://example.com/old-krypto-savings",
        title="AdvCash Krypto-Savings mit Nexo",
        snippet="Krypto-Savings zum Geld verdienen mit Kryptowährungen",
        query='"KryptoSavings"', provider="test",
    )
    monkeypatch.setattr(mod, "web_search", lambda query, limit=6: ([candidate], [{"query": query, "provider": "test", "results": 1}]) if query == '"KryptoSavings"' else ([], []))
    monkeypatch.setattr(mod, "read_public_page", lambda url: {"ok": True, "url": url, "title": "AdvCash Krypto-Savings mit Nexo", "text": "AdvCash bietet eine Funktion Krypto-Savings mit Nexo an.", "published_at": "2021-10-01"})
    ext = mod.enrich(core_result())["external_research"]
    assert ext["traces"] == []
    assert len(ext["review_candidates"]) == 1
    assert ext["review_candidates"][0]["attribution_confidence"] == "medium"
    assert ext["review_candidates"][0]["project_match"] == "name_normalized"


def test_legal_entity_without_project_link_goes_to_review_candidates(monkeypatch):
    entity_hit = mod.SearchHit(
        url="https://example.com/open-delta-report",
        title="Open Delta DAO LLC asset report",
        snippet="Issuer: Open Delta DAO LLC",
        query='"Open Delta DAO LLC"', provider="test",
    )
    monkeypatch.setattr(mod, "web_search", lambda query, limit=6: ([entity_hit], [{"query": query, "provider": "test", "results": 1}]) if query == '"Open Delta DAO LLC"' else ([], []))
    monkeypatch.setattr(mod, "read_public_page", lambda url: {"ok": True, "url": url, "title": "Open Delta DAO LLC asset report", "text": "This report identifies Open Delta DAO LLC as an issuer. It contains no KryptoSavings reference.", "published_at": "2025-09-19"})
    ext = mod.enrich(core_result())["external_research"]
    assert ext["traces"] == []
    assert len(ext["review_candidates"]) == 1
    assert ext["review_candidates"][0]["project_match"] == "legal_entity_only"


def test_project_owned_hit_is_kept_as_echo_not_external_confirmation(monkeypatch):
    hit = mod.SearchHit(
        url="https://www.kryptosavings.com/blog/update",
        title="KryptoSavings update",
        snippet="Official KryptoSavings update",
        query='"KryptoSavings"', provider="test",
    )
    monkeypatch.setattr(mod, "web_search", lambda query, limit=6: ([hit], [{"query": query, "provider": "test", "results": 1}]) if query == '"KryptoSavings"' else ([], []))
    monkeypatch.setattr(mod, "read_public_page", lambda url: {"ok": True, "url": url, "title": "KryptoSavings update", "text": "KryptoSavings publishes an update about its own service.", "published_at": ""})
    ext = mod.enrich(core_result())["external_research"]
    assert ext["traces"] == []
    assert len(ext["project_owned_echoes"]) == 1
    assert ext["project_owned_echoes"][0]["source_relation"] == "project_owned"
