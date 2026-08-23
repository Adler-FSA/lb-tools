import importlib.util
import sys
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "build_16_monitor.py"
spec = importlib.util.spec_from_file_location("build_16_monitor", MODULE)
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


def test_monitor_export_preserves_research_state_and_sources():
    data = {
        "context": {"project_name": "Testprojekt"},
        "sixteen_point_analysis": {
            "status": "ok",
            "generated_at": "2026-08-23T09:00:00+00:00",
            "principle": "Keine Scheinsicherheit.",
            "summary": {"overall_assessment_ready": False},
            "guardrails": {"fraud_verdict_created": False},
            "questions": [{
                "id": 4,
                "title": "Wer ist der Betreiber?",
                "state": "conflict_found",
                "finding": "Verbindung offen.",
                "gaps": ["Vertragspartner"],
                "next_research": ["Register vertiefen"],
                "evidence": [{"source_url": "https://example.com/register", "source_role": "claimed_regulator_or_registry", "label": "Register", "evidence": "lang"}],
                "counter_evidence": [{"source_url": "https://example.gov/warning", "source_role": "regulator", "label": "Behörde", "evidence": "lang"}],
            }],
        },
    }
    out = mod.build(data)
    assert out["status"] == "ok"
    assert out["summary"]["overall_assessment_ready"] is False
    assert out["questions"][0]["state"] == "conflict_found"
    assert out["questions"][0]["sources"][0]["source_role"] == "claimed_regulator_or_registry"
    assert out["questions"][0]["counter_sources"][0]["source_role"] == "regulator"
    assert "evidence" not in out["questions"][0]["sources"][0]
