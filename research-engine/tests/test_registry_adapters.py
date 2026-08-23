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


adapters = load("registry_adapters_test", "registry_adapters.py")
wrapper = load("universal_operator_wrapper_test", "universal_operator_research.py")


def test_unrelated_project_selects_no_special_registry():
    data = {
        "context": {"project_name": "Nordlicht Energie", "domain": "nordlicht.example"},
        "analysis": {"legal_entities": ["Nordlicht Energie GmbH"]},
    }
    assert adapters.select_adapter_ids(data) == []
    assert adapters.probe_urls([]) == []


def test_short_misa_trigger_does_not_match_inside_unrelated_word():
    data = {
        "context": {"project_name": "Misaligned Ventures", "domain": "misaligned.example"},
        "analysis": {"legal_entities": ["Misaligned Ventures Ltd"]},
    }
    assert adapters.select_adapter_ids(data) == []


def test_explicit_misa_term_selects_adapter():
    data = {
        "analysis": {
            "findings": [{"type": "regulator", "evidence": "Registered with MISA for the stated entity."}]
        }
    }
    assert adapters.select_adapter_ids(data) == ["mwali_misa"]


def test_mwali_hint_selects_only_mwali_adapter():
    data = {
        "external_research": {
            "traces": [{"source_url": "https://mwaliregistrar.info/list_of_entities.html"}]
        }
    }
    assert adapters.select_adapter_ids(data) == ["mwali_misa"]
    assert adapters.probe_urls(["mwali_misa"]) == ["https://mwaliregistrar.info/list_of_entities.html"]


def test_wrapper_keeps_special_probes_disabled_for_unrelated_project(monkeypatch):
    calls = []

    def fake_enrich(data):
        calls.append(tuple(wrapper.base.DIRECT_REGISTRY_PROBES))
        return {**data, "operator_registry_research": {"status": "ok", "records": []}}

    monkeypatch.setattr(wrapper.base, "enrich", fake_enrich)
    data = {
        "context": {"project_name": "Nordlicht Energie", "domain": "nordlicht.example"},
        "analysis": {"legal_entities": ["Nordlicht Energie GmbH"]},
    }
    out = wrapper.enrich(data)
    assert calls == [()]
    routing = out["operator_registry_research"]["registry_routing"]
    assert routing["mode"] == "generic_only"
    assert routing["selected_adapters"] == []
    assert routing["special_registry_probe_count"] == 0


def test_wrapper_can_activate_adapter_after_generic_discovery(monkeypatch):
    calls = []

    def fake_enrich(data):
        probes = tuple(wrapper.base.DIRECT_REGISTRY_PROBES)
        calls.append(probes)
        records = []
        if not probes:
            records.append({"source_url": "https://mwaliregistrar.info/list_of_entities.html"})
        return {**data, "operator_registry_research": {"status": "ok", "records": records}}

    monkeypatch.setattr(wrapper.base, "enrich", fake_enrich)
    data = {
        "context": {"project_name": "Example Finance", "domain": "finance.example"},
        "analysis": {"legal_entities": ["Example Finance Ltd"]},
    }
    out = wrapper.enrich(data)
    assert calls[0] == ()
    assert calls[1] == ("https://mwaliregistrar.info/list_of_entities.html",)
    routing = out["operator_registry_research"]["registry_routing"]
    assert routing["mode"] == "selected_after_generic_research"
    assert routing["special_registry_probe_count"] == 1
