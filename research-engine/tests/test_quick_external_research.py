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


quick = load("quick_external_test", "quick_external_research.py")


def sample(finance=False, referral=False):
    return {
        "status": "ok",
        "context": {
            "input": "Nordlicht Energie",
            "project_name": "Nordlicht Energie",
            "domain": "nordlicht.example",
        },
        "analysis": {
            "max_yield_percentage": 9.0 if finance else None,
            "max_commission_percentage": 12.0 if referral else None,
            "detected": {
                "staking": finance,
                "defi": False,
                "trading": False,
                "leverage": False,
                "lending": False,
                "custody": False,
                "referral": referral,
            },
            "legal_entities": [],
        },
    }


def test_generic_quick_plan_is_small_and_has_no_platform_sweep():
    plan = quick.quick_query_plan(sample())
    assert len(plan) == 3
    joined = " ".join(q for _, q in plan).lower()
    assert "nordlicht energie" in joined
    assert "nordlicht.example" in joined
    assert "review" in joined
    for forbidden in ("youtube", "tiktok", "reddit", "telegram", "founder", "ceo", "linkedin"):
        assert forbidden not in joined


def test_finance_and_distribution_add_only_targeted_quick_queries():
    plan = quick.quick_query_plan(sample(finance=True, referral=True))
    assert len(plan) == 4
    categories = [category for category, _ in plan]
    joined = " ".join(q for _, q in plan).lower()
    assert "warning" in joined
    assert "regulator" in joined
    assert "erfahrung" in joined
    assert "community" in categories


def test_quick_enrich_caps_query_and_fetch_budget_and_restores_globals(monkeypatch):
    original_plan = quick.ext.query_plan
    original_max = quick.ext.MAX_FETCHED_PAGES
    observed = {}

    def fake_enrich(data):
        observed["plan"] = quick.ext.query_plan("ignored", "ignored", [])
        observed["max"] = quick.ext.MAX_FETCHED_PAGES
        out = dict(data)
        out["external_research"] = {"status": "ok", "traces": [], "review_candidates": []}
        return out

    monkeypatch.setattr(quick.ext, "enrich", fake_enrich)
    out = quick.enrich(sample(finance=True, referral=True))
    assert len(observed["plan"]) == 4
    assert observed["max"] == quick.QUICK_MAX_FETCHED_PAGES == 8
    assert out["external_research"]["research_depth"] == "quick"
    assert out["external_research"]["query_budget"] == 4
    assert out["external_research"]["page_fetch_budget"] == 8
    assert quick.ext.query_plan is original_plan
    assert quick.ext.MAX_FETCHED_PAGES == original_max
