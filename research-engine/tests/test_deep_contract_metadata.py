import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


router = load("deep_contract_router_test", "research_router.py")
builder = load("deep_contract_builder_test", "build_control_center_result.py")


def core_sample():
    return {
        "status": "ok",
        "context": {
            "input": "https://example.test/register?ref=abc",
            "input_kind": "url",
            "project_name": "Example",
            "domain": "example.test",
            "resolved_url": "https://example.test/",
            "original_evidence_anchor": "https://example.test/register?ref=abc",
            "anchor_type": "referral_or_registration_link",
            "anchor_strength": "very_high",
        },
        "analysis": {
            "legal_entities": ["Example Services GmbH"],
            "detected": {"referral": True},
            "pages": [],
            "findings": [],
        },
    }


def test_deep_plan_marks_website_and_external_as_deep():
    req = router.build_request("https://example.test/register?ref=abc", "deep")
    plan = {item.module: item for item in router.module_plan(req, core_sample())}
    assert plan["website_research"].run is True
    assert plan["website_research"].depth == "deep"
    assert plan["external_research"].run is True
    assert plan["external_research"].depth == "deep"
    assert plan["operator_registry"].depth == "deep"
    assert plan["people_history"].depth == "deep"
    assert plan["academy_analysis"].depth == "deep"
    assert plan["project_analysis_16"].depth == "deep"


def test_quick_plan_keeps_website_and_external_quick():
    req = router.build_request("https://example.test/register?ref=abc", "quick")
    plan = {item.module: item for item in router.module_plan(req, core_sample())}
    assert plan["website_research"].depth == "quick"
    assert plan["external_research"].depth == "quick"
    assert plan["operator_registry"].run is False
    assert plan["people_history"].run is False
    assert plan["academy_analysis"].run is False
    assert plan["project_analysis_16"].run is False


def test_control_center_preserves_deep_external_contract():
    data = core_sample()
    req = router.build_request(data["context"]["input"], "deep")
    data["product"] = "projektanalyse"
    data["research_orchestration"] = router.request_payload(req, data)
    data["research_orchestration"]["core_max_pages"] = 14
    data["research_orchestration"]["external_depth"] = "deep"
    data["external_research"] = {
        "status": "no_confirmed_external_traces",
        "research_depth": "deep",
        "query_budget": 14,
        "page_fetch_budget": 24,
        "traces": [],
        "review_candidates": [],
        "project_owned_echoes": [],
    }
    data["operator_registry_research"] = {"status": "ok", "profiles": [], "summary": {}}
    data["people_history_research"] = {"status": "ok", "profiles": [], "summary": {}}
    data["academy_analysis"] = {"status": "ok", "summary": {}}
    data["sixteen_point_analysis"] = {"status": "ok", "questions": [], "summary": {}}

    out = builder.build(data, "deep-contract-test", data["context"]["input"], "deep", 0)
    assert out["mode"] == "deep"
    assert out["orchestration"]["external_depth"] == "deep"
    assert out["external_research"]["research_depth"] == "deep"
    assert out["external_research"]["query_budget"] == 14
    assert out["external_research"]["page_fetch_budget"] == 24
