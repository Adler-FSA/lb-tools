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


academy = load("universal_academy_output_test", "universal_academy_analysis.py")
sixteen = load("universal_sixteen_output_test", "universal_sixteen_analysis.py")
runtime = load("universal_runtime_test", "universal_runtime.py")


def test_universal_academy_operator_text_uses_current_project(monkeypatch):
    source = {
        "context": {"project_name": "Nordlicht Energie"},
        "analysis": {"questions": []},
    }

    def fake_enrich(data):
        return {
            **data,
            "academy_analysis": {
                "comparisons": [{
                    "id": "operator_1",
                    "topic": "operator_relation",
                    "project_value": "Nordlicht Holding GmbH",
                    "assessment": "partially_supported",
                    "project_statement": "Rechtstraegerhinweis",
                    "explanation": "stale project text",
                    "open_question": "stale project question",
                    "external_challenges": [],
                }],
                "tensions": [],
                "open_questions": [],
                "summary": {},
                "guardrails": {},
            },
        }

    monkeypatch.setattr(academy.base, "enrich", fake_enrich)
    out = academy.enrich(source)
    comparison = out["academy_analysis"]["comparisons"][0]
    assert "Nordlicht Energie" in comparison["explanation"]
    assert "Nordlicht Energie" in comparison["open_question"]
    assert "stale project" not in comparison["explanation"]
    assert out["academy_analysis"]["guardrails"]["dynamic_project_label_used"] is True


def test_universal_sixteen_q4_q5_q6_use_current_project(monkeypatch):
    source = {
        "context": {"project_name": "Nordlicht Energie"},
        "people_history_research": {
            "profiles": [{
                "person_name": "Mara Feldmann",
                "entity": "Nordlicht Holding GmbH",
                "roles": ["CEO"],
                "project_connection_status": "not_independently_linked",
                "ubo_verified": False,
                "records": [],
            }]
        },
    }

    def fake_enrich(data):
        return {
            **data,
            "sixteen_point_analysis": {
                "questions": [
                    {"id": 4, "state": "conflict_found", "finding": "stale q4"},
                    {"id": 5, "state": "clarification_needed", "finding": "stale q5"},
                    {"id": 6, "state": "clarification_needed", "finding": "stale q6"},
                ],
                "summary": {},
                "guardrails": {},
            },
        }

    monkeypatch.setattr(sixteen.base, "enrich", fake_enrich)
    out = sixteen.enrich(source)
    qs = {q["id"]: q for q in out["sixteen_point_analysis"]["questions"]}
    assert "Nordlicht Energie" in qs[4]["finding"]
    assert "Nordlicht Energie" in qs[5]["finding"]
    assert "Nordlicht Energie" in qs[6]["finding"]
    assert "Nordlicht Energie" in " ".join(qs[5]["gaps"])
    assert out["sixteen_point_analysis"]["guardrails"]["dynamic_project_label_used"] is True


def test_universal_runtime_uses_universal_deep_output_layers():
    assert runtime.pipeline.academy is runtime.academy
    assert runtime.pipeline.sixteen is runtime.sixteen


def test_universal_runtime_files_contain_no_test_project_names():
    files = [
        "universal_people_research.py",
        "universal_academy_analysis.py",
        "universal_sixteen_analysis.py",
        "universal_runtime.py",
    ]
    hay = "\n".join((ROOT / name).read_text(encoding="utf-8") for name in files).lower()
    forbidden = (
        "kryptosavings",
        "open delta",
        "opendelta",
        "delta west",
        "coriolis",
        "mwali",
        "misa",
    )
    for token in forbidden:
        assert token not in hay
