import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


resolver = load("identity_resolver_test", "identity_resolver.py")
pipeline = load("identity_pipeline_test", "universal_pipeline.py")


def hit(url, title, snippet="", provider="mock"):
    return resolver.ext.SearchHit(url=url, title=title, snippet=snippet, query='"Aurora Capital"', provider=provider)


def page(url, title, text):
    return {"ok": True, "url": url, "title": title, "text": text, "published_at": "", "mode": "mock"}


def disable_real_search(monkeypatch, hits_by_provider):
    monkeypatch.setattr(resolver.ext, "search_duckduckgo", lambda q, limit: hits_by_provider.get("duckduckgo", []))
    monkeypatch.setattr(resolver.ext, "search_bing", lambda q, limit: hits_by_provider.get("bing", []))
    monkeypatch.setattr(resolver.ext, "search_bing_rss", lambda q, limit: hits_by_provider.get("bing-rss", []))


def test_official_candidate_wins_from_name_and_domain_match(monkeypatch):
    official = hit("https://auroracapital.example/about", "Aurora Capital | Official")
    noise = hit("https://random-news.example/aurora-capital", "Aurora Capital review")
    disable_real_search(monkeypatch, {"duckduckgo": [official, noise]})

    def read(url):
        if "auroracapital.example" in url:
            return page(url, "Aurora Capital", "Aurora Capital provides investment technology and client services.")
        return page(url, "News", "Article mentioning Aurora Capital and several other companies.")

    monkeypatch.setattr(resolver.ext, "read_public_page", read)
    out = resolver.resolve("Aurora Capital")
    assert out["status"] == "resolved"
    assert out["domain"] == "auroracapital.example"
    assert out["selected"]["domain_name_match"] is True


def test_social_and_directory_hosts_cannot_become_official_site(monkeypatch):
    hits = [
        hit("https://www.linkedin.com/company/aurora-capital", "Aurora Capital"),
        hit("https://www.crunchbase.com/organization/aurora-capital", "Aurora Capital"),
    ]
    disable_real_search(monkeypatch, {"bing": hits})
    monkeypatch.setattr(resolver.ext, "read_public_page", lambda url: page(url, "Aurora Capital", "Aurora Capital"))
    out = resolver.resolve("Aurora Capital")
    assert out["status"] == "not_resolved"
    assert out["candidates"] == []


def test_two_similarly_strong_domains_remain_ambiguous(monkeypatch):
    hits = [
        hit("https://auroracapital.com/", "Aurora Capital"),
        hit("https://aurora-capital.com/", "Aurora Capital"),
    ]
    disable_real_search(monkeypatch, {"duckduckgo": hits})
    monkeypatch.setattr(
        resolver.ext,
        "read_public_page",
        lambda url: page(url, "Aurora Capital", "Aurora Capital official company website and services."),
    )
    out = resolver.resolve("Aurora Capital")
    assert out["status"] == "ambiguous"
    assert out["selected"] is None
    assert len(out["candidates"]) == 2


def test_root_and_subdomain_same_family_are_not_competing_projects(monkeypatch):
    hits = [
        hit("https://auroracapital.com/", "Aurora Capital"),
        hit("https://platform.auroracapital.com/", "Aurora Capital Platform"),
    ]
    disable_real_search(monkeypatch, {"bing-rss": hits})
    monkeypatch.setattr(
        resolver.ext,
        "read_public_page",
        lambda url: page(url, "Aurora Capital", "Aurora Capital official company platform and services."),
    )
    out = resolver.resolve("Aurora Capital")
    assert out["status"] == "resolved"
    assert out["domain"] == "auroracapital.com"
    assert out["domain_family"] == "auroracapital.com"
    assert len(out["candidates"]) == 1


def test_weak_search_context_alone_does_not_confirm_identity(monkeypatch):
    hits = [hit("https://unrelated.example/story", "Market roundup", "Aurora Capital was mentioned once.")]
    disable_real_search(monkeypatch, {"bing-rss": hits})
    monkeypatch.setattr(resolver.ext, "read_public_page", lambda url: page(url, "Market roundup", "Many companies are discussed here, including Aurora Capital."))
    out = resolver.resolve("Aurora Capital")
    assert out["status"] in {"ambiguous", "not_resolved"}
    assert out["selected"] is None


def test_pipeline_uses_resolved_url_before_domain_guessing(monkeypatch):
    req = pipeline.router.build_request("Aurora Capital", "quick")
    monkeypatch.setattr(pipeline.identity, "resolve", lambda name: {
        "status": "resolved",
        "project_name": name,
        "resolved_url": "https://verified.example/",
        "domain": "verified.example",
        "selected": {"domain": "verified.example", "score": 103},
        "candidates": [],
        "search_attempts": [],
    })
    calls = []

    def fake_core(query, max_pages):
        calls.append(query)
        return {
            "version": 2,
            "status": "ok",
            "context": {"input": query, "input_kind": "url", "input_url": query, "project_name": "", "domain": "verified.example", "resolved_url": query},
            "analysis": {"detected": {}, "legal_entities": [], "findings": [], "pages": [], "risk_signals": [], "questions": [], "social_and_video_links": []},
        }

    monkeypatch.setattr(pipeline, "run_core", fake_core)
    out = pipeline.resolve_and_run_core(req, 8)
    assert calls == ["https://verified.example/"]
    assert out["context"]["project_name"] == "Aurora Capital"
    assert out["identity_resolution"]["fallback_used"] is False


def test_pipeline_does_not_guess_when_identity_is_ambiguous(monkeypatch):
    req = pipeline.router.build_request("Aurora Capital", "quick")
    monkeypatch.setattr(pipeline.identity, "resolve", lambda name: {
        "status": "ambiguous",
        "project_name": name,
        "resolved_url": "",
        "domain": "",
        "selected": None,
        "candidates": [{"domain": "a.example"}, {"domain": "b.example"}],
        "search_attempts": [],
    })
    monkeypatch.setattr(pipeline, "run_core", lambda *a, **k: (_ for _ in ()).throw(AssertionError("must not guess")))
    out = pipeline.resolve_and_run_core(req, 8)
    assert out["status"] == "identity_ambiguous"
    assert out["context"]["domain"] == ""
