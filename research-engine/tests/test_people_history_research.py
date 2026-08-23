import importlib.util
import sys
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "people_history_research.py"
spec = importlib.util.spec_from_file_location("people_history_research", MODULE)
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


def base_result():
    return {
        "status": "ok",
        "context": {"input": "KryptoSavings", "project_name": "KryptoSavings", "domain": "kryptosavings.com"},
        "analysis": {"legal_entities": ["Open Delta DAO LLC"]},
        "operator_registry_research": {
            "status": "ok",
            "profiles": [{"entity": "Open Delta DAO LLC"}],
        },
    }


def test_extracts_person_only_near_role_context():
    text = "Open Delta DAO LLC. Key People: Konstantin Wünscher, Co-Founder and Chief Executive Officer."
    assert "Konstantin Wünscher" in mod.extract_person_candidates(text)
    assert mod.extract_person_candidates("Open Delta DAO LLC operates a crypto protocol in the Marshall Islands.") == []


def test_ceo_does_not_imply_ubo():
    page = {
        "ok": True,
        "url": "https://example.com/opendelta",
        "title": "OpenDelta profile",
        "text": "Open Delta DAO LLC. Konstantin Wünscher is Co-Founder and Chief Executive Officer.",
        "published_at": "2026-08-20",
    }
    rec = mod._record(
        "Konstantin Wünscher", "Open Delta DAO LLC", page, "", "test", "KryptoSavings", "kryptosavings.com"
    )
    assert rec.entity_connection == "shown"
    assert rec.project_connection == "not_shown"
    assert rec.ownership_claim is False


def test_person_at_entity_does_not_imply_project_connection():
    page = {
        "ok": True,
        "url": "https://www.crunchbase.com/organization/opendelta",
        "title": "OpenDelta company profile",
        "text": "Open Delta DAO LLC. Konstantin Wünscher: Co-Founder and Chief Executive Officer.",
        "published_at": "",
    }
    rec = mod._record(
        "Konstantin Wünscher", "Open Delta DAO LLC", page, "", "test", "KryptoSavings", "kryptosavings.com"
    )
    assert rec.project_connection == "not_shown"
    assert rec.project_match == ""


def test_external_page_can_link_person_to_project():
    page = {
        "ok": True,
        "url": "https://example.org/interview",
        "title": "KryptoSavings interview",
        "text": "Konstantin Wünscher discusses KryptoSavings and Open Delta DAO LLC.",
        "published_at": "2026-08-20",
    }
    rec = mod._record(
        "Konstantin Wünscher", "Open Delta DAO LLC", page, "", "test", "KryptoSavings", "kryptosavings.com"
    )
    assert rec.project_connection == "externally_linked"
    assert rec.project_match == "name_exact"


def test_owner_word_is_only_claim_not_verified_ubo(monkeypatch):
    entity_hit = mod.ext.SearchHit(
        url="https://example.com/profile",
        title="OpenDelta profile",
        snippet="Open Delta DAO LLC founder Konstantin Wünscher",
        query='"Open Delta DAO LLC" founder CEO director owner management',
        provider="test",
    )
    owner_hit = mod.ext.SearchHit(
        url="https://example.org/company-record",
        title="Company record",
        snippet="Konstantin Wünscher is owner of Open Delta DAO LLC.",
        query='"Konstantin Wünscher" "Open Delta DAO LLC"',
        provider="test",
    )

    def fake_search(query, limit=7):
        if query.startswith('"Open Delta DAO LLC" founder'):
            return [entity_hit], [{"query": query, "provider": "test", "results": 1}]
        if query == '"Konstantin Wünscher" "Open Delta DAO LLC"':
            return [owner_hit], [{"query": query, "provider": "test", "results": 1}]
        return [], [{"query": query, "provider": "test", "results": 0}]

    def fake_read(url):
        if "company-record" in url:
            return {"ok": True, "url": url, "title": "Company record", "text": "Konstantin Wünscher is owner of Open Delta DAO LLC.", "published_at": ""}
        return {"ok": True, "url": url, "title": "OpenDelta profile", "text": "Open Delta DAO LLC founder Konstantin Wünscher, Chief Executive Officer.", "published_at": ""}

    monkeypatch.setattr(mod.ext, "web_search", fake_search)
    monkeypatch.setattr(mod.ext, "read_public_page", fake_read)
    out = mod.enrich(base_result())["people_history_research"]
    profile = next(p for p in out["profiles"] if p["person_name"] == "Konstantin Wünscher")
    assert profile["entity_connection_status"] == "externally_shown"
    assert profile["project_connection_status"] == "not_independently_linked"
    assert profile["ownership_status"] == "ownership_claim_found"
    assert profile["ubo_verified"] is False
    assert out["summary"]["verified_ubo_count"] == 0
    assert out["guardrails"]["founder_or_ceo_implies_ubo"] is False


def test_project_link_requires_project_name_or_domain(monkeypatch):
    hit = mod.ext.SearchHit(
        url="https://example.com/opendelta",
        title="OpenDelta profile",
        snippet="Open Delta DAO LLC founder Konstantin Wünscher",
        query='"Open Delta DAO LLC" founder CEO director owner management',
        provider="test",
    )

    def fake_search(query, limit=7):
        if query.startswith('"Open Delta DAO LLC" founder'):
            return [hit], [{"query": query, "provider": "test", "results": 1}]
        return [], [{"query": query, "provider": "test", "results": 0}]

    def fake_read(url):
        return {"ok": True, "url": url, "title": "OpenDelta profile", "text": "Open Delta DAO LLC founder Konstantin Wünscher, CEO.", "published_at": ""}

    monkeypatch.setattr(mod.ext, "web_search", fake_search)
    monkeypatch.setattr(mod.ext, "read_public_page", fake_read)
    out = mod.enrich(base_result())["people_history_research"]
    assert out["summary"]["person_profile_count"] >= 1
    assert out["summary"]["project_linked_person_count"] == 0
