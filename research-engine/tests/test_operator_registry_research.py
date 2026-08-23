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
        "analysis": {
            "legal_entities": ["Delta West Credit Bank Ltd", "Open Delta DAO LLC"]
        },
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
        "https://www.fca.org.uk/news/warnings/example",
        "Example Ltd",
        "FCA warning",
        "Example Ltd is not authorised.",
    )
    assert role == "regulator"
    assert confidence == "high"


def test_comoros_central_bank_is_high_authority():
    role, confidence = mod.source_role(
        "https://banque-comores.km/page/show/textes-reglementaires",
        "",
        "Banque Centrale des Comores",
        "Les établissements bancaires ne peuvent exercer sans agrément préalable de la Banque Centrale des Comores.",
    )
    assert role == "regulator"
    assert confidence == "high"


def test_entity_owned_source_is_not_regulator():
    role, confidence = mod.source_role(
        "https://www.opendelta.com/terms-of-use",
        "Open Delta DAO LLC",
        "Terms of Use · OpenDelta",
        "Open Delta DAO LLC is registered under the laws of the Republic of Marshall Islands.",
    )
    assert role == "entity_owned"
    assert confidence == "medium"


def test_bancorp_is_derived_from_saved_website_evidence():
    analysis = {
        "findings": [
            {
                "type": "legal_entity",
                "evidence": "Responsible entities include GBH Coriolis Bancorp and Open Delta DAO LLC."
            }
        ]
    }
    assert mod.derived_entities_from_evidence(analysis) == ["GBH Coriolis Bancorp"]


def test_exact_entity_required():
    assert mod.exact_entity_present(
        "Open Delta DAO LLC", "OpenDelta", "crypto protocol", "Open Delta DAO LLC operates the platform"
    ) is True
    assert mod.exact_entity_present(
        "Open Delta DAO LLC", "OpenDelta", "crypto protocol", "Open Delta project information"
    ) is False


def test_project_connection_requires_project_evidence():
    conn, match = mod.project_connection(
        "KryptoSavings", "kryptosavings.com", "Open Delta DAO LLC", "Issuer information", "No project reference here"
    )
    assert conn == "not_shown"
    assert match == ""

    conn, match = mod.project_connection(
        "KryptoSavings", "kryptosavings.com", "Partner notice", "KryptoSavings works with Open Delta DAO LLC", ""
    )
    assert conn == "externally_linked"
    assert match == "name_exact"


def test_negated_project_connection_is_not_confirmed():
    conn, match = mod.project_connection(
        "KryptoSavings",
        "kryptosavings.com",
        "Open Delta DAO LLC report",
        "Open Delta DAO LLC",
        "This document has no KryptoSavings connection or association.",
    )
    assert conn == "not_shown"
    assert match == ""


def test_extract_license_and_status():
    text = "Delta West Credit Bank Ltd. License No. B20110086 Date of Issue 02/09/2011 Status Active"
    assert mod.extract_license_number(text) == "B20110086"
    assert mod.extract_status(text).lower() == "active"


def test_authority_context_can_challenge_claimed_registry_without_naming_entity(monkeypatch):
    claimed = mod.EntityRecord(
        entity="Delta West Credit Bank Ltd",
        source_role="claimed_regulator_or_registry",
        source_url="https://mwaliregistrar.info/list_of_entities.html",
        title="Mwali International Services Authority",
        evidence="Delta West Credit Bank Ltd Status Active",
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
        return {
            "ok": True,
            "url": url,
            "title": "Banque Centrale des Comores – activités bancaires offshores",
            "text": (
                "La Banque Centrale des Comores signale Mwali International Services Authority comme une prétendue autorité. "
                "Les activités bancaires offshores exercées sous ces agréments sont illégales."
            ),
            "published_at": "2023-05-22",
        }

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
        return {
            "ok": True,
            "url": url,
            "title": "Mwali International Services Authority",
            "text": "Delta West Credit Bank Ltd. License No. B20110086 Status Active",
            "published_at": "",
        }

    monkeypatch.setattr(mod.ext, "web_search", fake_search)
    monkeypatch.setattr(mod.ext, "read_public_page", fake_read)
    out = mod.enrich(base_result())["operator_registry_research"]
    profile = next(p for p in out["profiles"] if p["entity"] == "Delta West Credit Bank Ltd")

    assert profile["existence_status"] == "registry_or_authority_trace"
    assert profile["project_connection_status"] == "not_independently_linked"
    assert len(profile["official_or_registry_records"]) == 1
    assert profile["official_or_registry_records"][0]["license_number"] == "B20110086"
    assert profile["authority_context_records"]
    assert all(x["source_role"] == "regulator" for x in profile["authority_context_records"])


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
        return {
            "ok": True,
            "url": url,
            "title": "OpenDelta partnership",
            "text": "Open Delta DAO LLC confirms a service relationship with KryptoSavings.",
            "published_at": "2026-08-20",
        }

    monkeypatch.setattr(mod.ext, "web_search", fake_search)
    monkeypatch.setattr(mod.ext, "read_public_page", fake_read)
    out = mod.enrich(base_result())["operator_registry_research"]
    profile = next(p for p in out["profiles"] if p["entity"] == "Open Delta DAO LLC")

    assert profile["project_connection_status"] == "externally_linked"
    assert any(r["project_connection"] == "externally_linked" for r in profile["entity_owned_records"])
