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


people = load("universal_people_test", "universal_people_research.py")


def test_generic_filters_contain_no_test_project_names():
    hay = " ".join(sorted(people.GENERIC_ORG_STOP | people.GENERIC_BAD_WORDS | people.CRAWLER_BAD_WORDS)).lower()
    for forbidden in (
        "kryptosavings",
        "open delta",
        "opendelta",
        "delta west",
        "coriolis",
        "mwali",
        "misa",
        "marshall islands",
    ):
        assert forbidden not in hay


def test_generic_person_filter_accepts_unrelated_realistic_names():
    assert people.generic_crawler_name_ok("Mara Feldmann") is True
    assert people.generic_crawler_name_ok("Jonas Winterberg") is True
    assert people.generic_crawler_name_ok("Chief Executive Officer") is False
    assert people.generic_crawler_name_ok("Leadership Team") is False


def test_project_people_filter_rejects_slogans_but_keeps_names():
    assert people.generic_project_name_ok("Maksym Sakharov") is True
    assert people.generic_project_name_ok("Reeve Collins") is True
    assert people.generic_project_name_ok("Core Values") is False
    assert people.generic_project_name_ok("Stay Relentless") is False
    assert people.generic_project_name_ok("Own It End-to-End") is False


def test_entity_aliases_are_derived_from_current_entity_only():
    aliases = people.pipeline.base.entity_brand_aliases("Nordlicht Energie GmbH")
    assert aliases == ["Nordlicht Energie", "NordlichtEnergie"]


def test_wrapper_uses_generic_filters_and_restores_base(monkeypatch):
    original_org_stop = people.pipeline.base.ORG_STOP
    original_bad_words = people.pipeline.base.BAD_WORDS
    original_name_ok = people.pipeline.crawler._name_ok
    original_project_name_ok = people.project_people._name_ok
    seen = {}

    def fake_enrich(data):
        seen["org_stop"] = set(people.pipeline.base.ORG_STOP)
        seen["bad_words"] = set(people.pipeline.base.BAD_WORDS)
        seen["mara_ok"] = people.pipeline.crawler._name_ok("Mara Feldmann")
        return {"people_history_research": {"status": "no_people_confirmed"}}

    monkeypatch.setattr(people.pipeline, "enrich", fake_enrich)
    monkeypatch.setattr(people.project_people, "discover_claims", lambda data: {"claims": []})
    out = people.enrich({"context": {"project_name": "Nordlicht Energie"}})

    assert seen["org_stop"] == people.GENERIC_ORG_STOP
    assert seen["bad_words"] == people.GENERIC_BAD_WORDS
    assert seen["mara_ok"] is True
    assert out["people_history_research"]["universal_routing"]["project_specific_filters_used"] is False
    assert people.pipeline.base.ORG_STOP is original_org_stop
    assert people.pipeline.base.BAD_WORDS is original_bad_words
    assert people.pipeline.crawler._name_ok is original_name_ok
    assert people.project_people._name_ok is original_project_name_ok
