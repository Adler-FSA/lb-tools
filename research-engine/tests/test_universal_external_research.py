import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "universal_external_research.py"
spec = importlib.util.spec_from_file_location("universal_external_research_test", MODULE)
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


def test_short_project_name_is_not_high_confidence_by_name_only():
    confidence, match = mod.match_confidence(
        "WeFi",
        "wefi.co",
        "WeFi Technology Group - AI Powered Working Capital Solutions",
        "About WeFi and our leadership",
        "",
    )
    assert confidence == "medium"
    assert match == "short_name_exact"


def test_short_project_name_is_high_when_domain_is_present():
    confidence, match = mod.match_confidence(
        "WeFi",
        "wefi.co",
        "Independent WeFi review",
        "Review of the project at wefi.co",
        "",
    )
    assert confidence == "high"
    assert match == "domain_exact"


def test_wefi_fixture_marks_same_name_domains_as_not_confirmed():
    fixture = json.loads((ROOT / "tests" / "fixtures" / "wefi" / "reference.json").read_text(encoding="utf-8"))
    assert fixture["runtime_dependency"] is False
    assert fixture["identity"]["official_domain"] == "wefi.co"
    assert {"wefi.com", "wefitec.com", "dashboard.wechain.ai"}.issubset(set(fixture["must_not_confirm_by_name_only"]))


def test_short_name_plus_known_legal_entity_can_be_promoted():
    data = {
        "analysis": {"legal_entities": ["AppAtlas Technologies LLC"]}
    }
    block = {
        "status": "no_confirmed_external_traces",
        "traces": [],
        "review_candidates": [
            {
                "category": "article",
                "source_relation": "independent",
                "source_url": "https://example.org/wefi",
                "title": "WeFi update",
                "evidence": "WeFi operates as the trading name of AppAtlas Technologies LLC.",
                "attribution_confidence": "medium",
                "project_match": "short_name_exact"
            }
        ],
        "counts_by_category": {},
        "counts_by_relation": {},
    }
    mod._promote_short_name_with_entity(data, block)
    assert block["review_candidates"] == []
    assert len(block["traces"]) == 1
    assert block["traces"][0]["attribution_confidence"] == "high"
    assert block["traces"][0]["project_match"] == "short_name_plus_legal_entity"
