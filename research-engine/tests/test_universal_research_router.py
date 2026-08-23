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


router = load("research_router_test", "research_router.py")
pipeline = load("universal_pipeline_test", "universal_pipeline.py")


def core_sample():
    return {
        "version": 2,
        "status": "ok",
        "context": {
            "input": "Example Yield",
            "project_name": "Example Yield",
            "domain": "example-yield.test",
            "resolved_url": "https://example-yield.test/",
        },
        "analysis": {
            "max_yield_percentage": 12.0,
            "max_commission_percentage": 5.0,
            "legal_entities": ["Example Yield Services GmbH"],
            "detected": {
                "staking": False,
                "defi": False,
                "trading": False,
                "leverage": False,
                "lending": False,
                "lockup": True,
                "withdrawal": True,
                "kyc": True,
                "custody": False,
                "referral": True,
                "bonus": False,
                "guarantee": False,
            },
            "social_and_video_links": [],
            "findings": [],
            "risk_signals": [],
            "questions": [],
            "pages": [],
        },
    }


def test_plain_company_name_routes_to_web_identity():
    req = router.build_request("Nordlicht Energie GmbH", "quick")
    assert req.input_kind == "name"
    assert req.route == "web_identity"
    assert req.product == "schnellcheck"
    assert req.blockchain_hint is False


def test_arbitrary_referral_url_is_detected_without_project_specific_code():
    req = router.build_request("https://alpha-example.net/join?ref=HELLO123", "quick")
    assert req.input_kind == "url"
    assert req.domain_hint == "alpha-example.net"
    assert req.referral_hint is True
    assert req.route == "web_identity"


def test_social_url_is_recognized_as_social_hint():
    req = router.build_request("https://www.youtube.com/@exampleproject", "quick")
    assert req.social_hint is True
    assert req.route == "web_identity"


def test_evm_address_never_gets_sent_to_domain_guessing():
    address = "0x1234567890abcdef1234567890abcdef12345678"
    req = router.build_request(address, "quick")
    assert req.route == "blockchain_identity"
    plan = router.module_plan(req)
    run = {x.module: x.run for x in plan}
    assert run["blockchain_identity"] is True
    assert run["website_research"] is False
    assert run["external_research"] is False


def test_quick_mode_stops_before_deep_operator_people_and_16():
    req = router.build_request("Example Yield", "quick")
    plan = router.module_plan(req, core_sample())
    run = {x.module: x.run for x in plan}
    assert run["website_research"] is True
    assert run["external_research"] is True
    assert run["operator_registry"] is False
    assert run["people_history"] is False
    assert run["academy_analysis"] is False
    assert run["project_analysis_16"] is False


def test_deep_mode_unlocks_deep_modules_only_when_relevant():
    req = router.build_request("Example Yield", "deep")
    plan = router.module_plan(req, core_sample())
    run = {x.module: x.run for x in plan}
    assert run["operator_registry"] is True
    assert run["people_history"] is True
    assert run["academy_analysis"] is True
    assert run["project_analysis_16"] is True


def test_quick_pipeline_builds_small_product_view_and_skips_deep_modules(monkeypatch):
    monkeypatch.setattr(pipeline, "run_core", lambda query, max_pages: core_sample())

    def enrich_external(data):
        out = dict(data)
        out["external_research"] = {
            "status": "no_confirmed_external_traces",
            "traces": [],
            "review_candidates": [],
        }
        return out

    monkeypatch.setattr(pipeline.external, "enrich", enrich_external)
    monkeypatch.setattr(pipeline.operator, "enrich", lambda data: (_ for _ in ()).throw(AssertionError("operator must not run")))
    monkeypatch.setattr(pipeline.people, "enrich", lambda data: (_ for _ in ()).throw(AssertionError("people must not run")))
    out = pipeline.run("Example Yield", "quick")
    assert out["product"] == "schnellcheck"
    assert out["quick_check"]["max_yield_percentage"] == 12.0
    assert out["quick_check"]["deep_research_recommended"] is True
    assert "sixteen_point_analysis" not in out


def test_deep_pipeline_runs_existing_deep_engine_in_order(monkeypatch):
    monkeypatch.setattr(pipeline, "run_core", lambda query, max_pages: core_sample())
    calls = []

    def external_enrich(data):
        calls.append("external")
        data["external_research"] = {"status": "ok", "traces": [], "review_candidates": []}
        return data

    def stage(name, key):
        def inner(data):
            calls.append(name)
            data[key] = {"status": "ok"}
            return data
        return inner

    monkeypatch.setattr(pipeline.external, "enrich", external_enrich)
    monkeypatch.setattr(pipeline.operator, "enrich", stage("operator", "operator_registry_research"))
    monkeypatch.setattr(pipeline.people, "enrich", stage("people", "people_history_research"))
    monkeypatch.setattr(pipeline.academy, "enrich", stage("academy", "academy_analysis"))
    monkeypatch.setattr(pipeline.sixteen, "enrich", stage("sixteen", "sixteen_point_analysis"))

    out = pipeline.run("Example Yield", "deep")
    assert out["product"] == "projektanalyse"
    assert calls == ["external", "operator", "people", "academy", "sixteen"]


def test_universal_router_and_pipeline_contain_no_fixture_project_names():
    source = (ROOT / "research_router.py").read_text(encoding="utf-8") + (ROOT / "universal_pipeline.py").read_text(encoding="utf-8")
    for forbidden in ("KryptoSavings", "OpenDelta", "Open Delta DAO", "Mwali", "Delta West", "GBH Coriolis"):
        assert forbidden not in source
