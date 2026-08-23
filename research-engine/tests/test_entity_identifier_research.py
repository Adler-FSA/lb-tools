import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("entity_identifier_research_test", ROOT / "entity_identifier_research.py")
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def test_extracts_msb_and_corporate_numbers_from_entity_evidence():
    analysis = {
        "legal_entities": ["Example Payments Limited"],
        "findings": [{
            "type": "legal_entity",
            "value": "Example Payments Limited",
            "source_url": "https://example.test/terms",
            "evidence": "Example Payments Limited, a registered money services business (number: M23563590) with corporate number 2025535572.",
        }],
    }
    claims = mod.extract_identifier_claims(analysis)
    ids = {c["identifier_compact"] for c in claims}
    assert "M23563590" in ids
    assert "2025535572" in ids


def test_numeric_srl_name_is_itself_identifier_anchor():
    analysis = {"legal_entities": ["3-102-939581 S.R.L."], "findings": []}
    claims = mod.extract_identifier_claims(analysis)
    assert any(c["identifier_compact"] == "3102939581" for c in claims)


def test_random_long_number_without_company_context_is_not_claim():
    analysis = {
        "legal_entities": ["Example Ltd"],
        "findings": [{
            "type": "legal_entity",
            "value": "Example Ltd",
            "source_url": "https://example.test",
            "evidence": "Example Ltd serves 123456789 customers globally.",
        }],
    }
    assert mod.extract_identifier_claims(analysis) == []


def test_identifier_comparison_ignores_formatting():
    assert mod._identifier_present("Registry number 3 102 939581", "3-102-939581")
