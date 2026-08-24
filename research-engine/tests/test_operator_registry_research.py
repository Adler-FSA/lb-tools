import importlib.util
import sys
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "operator_registry_research.py"
spec = importlib.util.spec_from_file_location("operator_registry_research", MODULE)
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


def base_result():
    return {
        "status": "ok",
        "context": {
            "input": "KryptoSavings",
            "project_name": "KryptoSavings",
            "domain": "kryptosavings.com",
        },
        "analysis": {"legal_entities": ["Delta West Credit Bank Ltd", "Open Delta DAO LLC"]},
    }


def test_mwali_is_claimed_registry_not_high_authority():
    role, confidence = mod.source_role(
        "https://mwaliregistrar.info/list_of_entities.html",
        "Delta West Credit Bank Ltd",
        "Mwali International Services Authority",
        "Delta West Credit Bank Ltd License No B20110086 Status Active",
    )
    assert role == "claimed_regulator_or_registry"
    assert confidence == "medium"


def test_known_regulator_is_high_authority():
    role, confidence = mod.source_role(
        "https://www.fca.org.uk/news/warnings/example", "Example Ltd", "FCA warning", "Example Ltd is not authorised."
    )
    assert role == "regulator"
    assert confidence == "high"


def test_comoros_central_bank_is_high_authority():
    role, confidence = mod.source_role(
        "https://banque-comores.km/page/show/textes-reglementaires",
        "Delta West Credit Bank Ltd",
        "Banque Centrale des Comores",
        "Communiqué relatif aux activités bancaires offshore illégales.",
    )
    assert role == "regulator"
    assert confidence == "high"


def test_entity_owned_page_is_not_independent():
    role, confidence = mod.source_role(
        "https://opendelta.example/terms",
        "Open Delta DAO LLC",
        "Terms of Use",
        "These terms are provided by Open Delta DAO LLC.",
    )
    assert role in {"entity_owned", "independent"}
    assert confidence in {"medium", "low"}


def test_license_and_status_are_extracted():
    text = "Delta West Credit Bank Ltd. License No. B20110086 Status Active"
    assert mod.extract_license_number(text) == "B20110086"
    assert mod.extract_status(text) == "Active"


def test_bare_bank_license_number_is_extracted():
    text = "Delta West Credit Bank Ltd banking licence B20110086 is listed as active."
    assert mod.extract_license_number(text) == "B20110086"


def test_normalize_entity_candidate_rejects_descriptive_sentence():
    assert mod.normalize_entity_candidate("services provided by Fireblocks Ltd") == "Fireblocks Ltd"
    assert mod.normalize_entity_candidate("These services are provided by Example Ltd with company number 123") == ""


def test_derived_bancorp_entity_is_detected():
    analysis = {
        "findings": [
            {
                "evidence": "Banking services are facilitated through GBH Coriolis Bancorp under the described arrangement."
            }
        ]
    }
    assert "GBH Coriolis Bancorp" in mod.derived_entities_from_evidence(analysis)


def test_project_connection_requires_high_or_medium_match():
    high = mod.project_connection(
        "KryptoSavings", "kryptosavings.com", "Partner notice", "KryptoSavings works with Example Ltd", ""
    )
    assert high[0] == "externally_linked"

    low = mod.project_connection(
        "KryptoSavings", "kryptosavings.com", "Company registry", "Example Ltd is registered", ""
    )
    assert low[0] == "not_shown"


def test_exact_entity_present_rejects_explicit_negation():
    assert mod.exact_entity_present(
        "Open Delta DAO LLC",
        "Other company",
        "",
        "No Open Delta DAO LLC reference is present in this record.",
    ) is False
    assert mod.exact_entity_present(
        "Open Delta DAO LLC",
        "Company record",
        "",
        "Open Delta DAO LLC is listed in this record.",
    ) is True


def test_authority_context_is_separate_from_entity_connection(monkeypatch):
    claimed = mod.EntityRecord(
        entity="Delta West Credit Bank Ltd",
        source_role="claimed_regulator_or_registry",
        source_url="https://mwaliregistrar.info/list_of_entities.html",
        title="Mwali International Services Authority",
        evidence="Delta West Credit Bank Ltd License No B20110086 Status Active",
        published_at="",
        record_type="registry_or_license_record",
        status_text="Active",
        license_number="B20110086",
        project_connection="not_shown",
        project_match="",
        authority_confidence="medium",
        fetched=True,
        found_via="test",
    )

    def fake_read(url):
        if "banque-comores.km" in url:
            return {
                "ok": True,
                "url": url,
                "title": "Banque Centrale des Comores",
                "text": "Mwali International Services Authority is identified in an offshore banking warning.",
                "published_at": "2023-05-22",
            }
        return {"ok": False, "url": url, "title": "", "text": "", "published_at": ""}

    monkeypatch.setattr(mod.ext, "read_public_page", fake_read)
    contexts = mod.collect_authority_context([claimed])
    assert contexts
    assert all(c.source_role == "regulator" for c in contexts)
    assert all(c.authority_confidence == "high" for c in contexts)
    assert any(c.context_type == "authority_warning" for c in contexts)
    assert all(c.claimed_authority == "Mwali International Services Authority" for c in contexts)


def test_entity_existence_does_not_imply_project_link(monkeypatch):
    hit = mod.ext.SearchHit(
        url="https://mwaliregistrar.info/list_of_entities.html",
        title="Mwali International Services Authority",
        snippet="Delta West Credit Bank Ltd. License No. B20110086 Status Active",
        query='"Delta West Credit Bank Ltd"',
        provider="test",
    )

    def fake_search(query, limit=8):
        if query == '"Delta West Credit Bank Ltd"':
            return [hit], [{"query": query, "provider": "test", "results": 1}]
        return [], [{"query": query, "provider": "test", "results": 0}]

    def fake_read(url):
        if "banque-comores.km" in url:
            return {
                "ok": True,
                "url": url,
                "title": "Banque Centrale des Comores",
                "text": "Mwali International Services Authority is identified in an offshore banking warning.",
                "published_at": "2023-05-22",
            }
        if "mwaliregistrar.info" in url:
            return {
                "ok": True,
                "url": url,
                "title": "Mwali International Services Authority",
                "text": "Delta West Credit Bank Ltd. License No. B20110086 Status Active",
                "published_at": "",
            }
        return {"ok": False, "url": url, "title": "", "text": "", "published_at": ""}

    monkeypatch.setattr(mod.ext, "web_search", fake_search)
    monkeypatch.setattr(mod.ext, "read_public_page", fake_read)
    out = mod.enrich(base_result())["operator_registry_research"]
    profile = next(p for p in out["profiles"] if p["entity"] == "Delta West Credit Bank Ltd")

    assert profile["existence_status"] == "official_or_registry_trace_found"
    assert profile["project_connection_status"] == "project_claim_only_or_not_shown"
    assert len(profile["official_or_registry_records"]) == 1
    assert profile["official_or_registry_records"][0]["license_number"] == "B20110086"
    assert out["authority_context_records"]
    assert all(x["source_role"] == "regulator" for x in out["authority_context_records"])


def test_external_entity_page_can_confirm_project_connection(monkeypatch):
    hit = mod.ext.SearchHit(
        url="https://www.opendelta.com/partners/kryptosavings",
        title="OpenDelta partnership",
        snippet="Open Delta DAO LLC works with KryptoSavings.",
        query='"Open Delta DAO LLC" "KryptoSavings"',
        provider="test",
    )

    def fake_search(query, limit=8):
        if '"KryptoSavings"' in query and "Open Delta DAO LLC" in query:
            return [hit], [{"query": query, "provider": "test", "results": 1}]
        return [], [{"query": query, "provider": "test", "results": 0}]

    def fake_read(url):
        if "mwaliregistrar.info" in url:
            return {"ok": False, "url": url, "title": "", "text": "", "published_at": ""}
        return {
            "ok": True,
            "url": url,
            "title": "OpenDelta partnership",
            "text": "Open Delta DAO LLC confirms a service relationship with KryptoSavings.",
            "published_at": "2026-01-10",
        }

    monkeypatch.setattr(mod.ext, "web_search", fake_search)
    monkeypatch.setattr(mod.ext, "read_public_page", fake_read)
    monkeypatch.setattr(mod, "DIRECT_REGISTRY_PROBES", ())
    out = mod.enrich(base_result())["operator_registry_research"]
    profile = next(p for p in out["profiles"] if p["entity"] == "Open Delta DAO LLC")

    assert profile["project_connection_status"] == "externally_linked"
    assert any(x["project_connection"] == "externally_linked" for x in profile["all_records"])


def test_unrelated_name_hit_is_not_accepted(monkeypatch):
    hit = mod.ext.SearchHit(
        url="https://example.com/unrelated",
        title="Other company",
        snippet="A different business is registered here.",
        query='"Open Delta DAO LLC"',
        provider="test",
    )

    monkeypatch.setattr(
        mod.ext,
        "web_search",
        lambda query, limit=8: ([hit], [{"query": query, "provider": "test", "results": 1}]),
    )
    monkeypatch.setattr(
        mod.ext,
        "read_public_page",
        lambda url: {"ok": True, "url": url, "title": "Other company", "text": "No Open Delta DAO LLC reference.", "published_at": ""},
    )
    monkeypatch.setattr(mod, "DIRECT_REGISTRY_PROBES", ())
    monkeypatch.setattr(mod, "collect_entity_owned_records", lambda entities, project_name, project_domain: [])
    out = mod.enrich(base_result())["operator_registry_research"]
    profile = next(p for p in out["profiles"] if p["entity"] == "Open Delta DAO LLC")
    assert not profile["all_records"]


def test_authority_warning_is_context_not_entity_warning(monkeypatch):
    hit = mod.ext.SearchHit(
        url="https://mwaliregistrar.info/list_of_entities.html",
        title="Mwali International Services Authority",
        snippet="Delta West Credit Bank Ltd License No B20110086 Status Active",
        query='"Delta West Credit Bank Ltd"',
        provider="test",
    )

    def fake_search(query, limit=8):
        return ([hit], [{"query": query, "provider": "test", "results": 1}]) if query == '"Delta West Credit Bank Ltd"' else ([], [])

    def fake_read(url):
        if "banque-comores.km" in url:
            return {
                "ok": True,
                "url": url,
                "title": "Banque Centrale des Comores",
                "text": "Warning about offshore banking and Mwali International Services Authority.",
                "published_at": "2023-05-22",
            }
        if "mwaliregistrar.info" in url:
            return {
                "ok": True,
                "url": url,
                "title": "Mwali International Services Authority",
                "text": "Delta West Credit Bank Ltd License No B20110086 Status Active",
                "published_at": "",
            }
        return {"ok": False, "url": url, "title": "", "text": "", "published_at": ""}

    monkeypatch.setattr(mod.ext, "web_search", fake_search)
    monkeypatch.setattr(mod.ext, "read_public_page", fake_read)
    out = mod.enrich(base_result())["operator_registry_research"]
    profile = next(p for p in out["profiles"] if p["entity"] == "Delta West Credit Bank Ltd")
    assert not profile["warning_or_adverse_records"]
    assert any(x["context_type"] == "authority_warning" for x in out["authority_context_records"])
