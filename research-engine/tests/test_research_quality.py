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


quality = load("research_quality_test", "research_quality.py")


def test_derive_project_name_from_matching_page_title():
    ctx = {"project_name": "https://app.alpha-example.co/register?ref=1", "domain": "alpha-example.co"}
    analysis = {"pages": [{"title": "Alpha Example | Digital Finance", "url": "https://alpha-example.co/"}]}
    assert quality.derive_project_name(ctx, analysis) == "Alpha Example"


def test_derive_project_name_falls_back_to_domain_stem():
    ctx = {"project_name": "https://app.nordlicht.io/register", "domain": "nordlicht.io"}
    assert quality.derive_project_name(ctx, {"pages": []}) == "Nordlicht"


def test_entity_filter_keeps_names_and_drops_sentence_fragments():
    raw = [
        "Wefi Payments Limited",
        "AppAtlas Technologies LLC",
        "Fireblocks Ltd",
        "These operations are facilitated by Wefi Payments Limited",
        "St. Vincent and the Grenadines with corporate number 3644 LLC",
    ]
    cleaned = quality.clean_legal_entities(raw)
    assert "Wefi Payments Limited" in cleaned
    assert "AppAtlas Technologies LLC" in cleaned
    assert "Fireblocks Ltd" in cleaned
    assert all("facilitated by" not in x.lower() for x in cleaned)
    assert all("corporate number" not in x.lower() for x in cleaned)


def test_entity_filter_strips_year_and_deduplicates_same_company():
    cleaned = quality.clean_legal_entities([
        "AppAtlas Technologies LLC",
        "2026 AppAtlas Technologies LLC",
        "© 2026 AppAtlas Technologies LLC",
    ])
    assert cleaned == ["AppAtlas Technologies LLC"]


def test_evidence_highlights_keep_source_and_quote():
    analysis = {"findings": [
        {"type": "guarantee", "value": "guaranteed", "source_url": "https://example.test/terms", "evidence": "Returns are guaranteed in this example.", "confidence": "medium"},
        {"type": "percentage_other", "value": "10%", "source_url": "https://example.test/", "evidence": "10% discount", "confidence": "medium"},
    ]}
    out = quality.evidence_highlights(analysis)
    assert len(out) == 1
    assert out[0]["type"] == "guarantee"
    assert out[0]["source_url"] == "https://example.test/terms"


def test_postprocess_updates_quick_project_and_entities():
    data = {
        "context": {"project_name": "https://app.example.test/register", "domain": "example.test"},
        "analysis": {
            "pages": [{"title": "Example | Home"}],
            "legal_entities": ["Example Payments Limited", "2026 Example Payments Limited", "These operations are facilitated by Example Payments Limited"],
            "findings": [],
        },
        "quick_check": {"project_name": "https://app.example.test/register", "legal_entities_claimed": []},
    }
    out = quality.postprocess(data)
    assert out["context"]["project_name"] == "Example"
    assert out["quick_check"]["project_name"] == "Example"
    assert out["analysis"]["legal_entities"] == ["Example Payments Limited"]
