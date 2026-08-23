import importlib.util
import sys
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "sixteen_point_people_adapter.py"
spec = importlib.util.spec_from_file_location("sixteen_point_people_adapter", MODULE)
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


def sample(with_people=True):
    data = {
        "status": "ok",
        "context": {"project_name": "KryptoSavings", "domain": "kryptosavings.com"},
        "analysis": {
            "max_yield_percentage": 23.0,
            "max_commission_percentage": 30.0,
            "detected": {
                "staking": True, "defi": True, "trading": True, "leverage": True,
                "lending": True, "lockup": True, "withdrawal": True, "kyc": True,
                "custody": True, "referral": True, "bonus": True, "guarantee": False,
            },
            "findings": [
                {"type": "yield_percentage", "value": "23%", "source_url": "https://www.kryptosavings.com/", "evidence": "Earn up to 23% APY"},
                {"type": "commission_percentage", "value": "30%", "source_url": "https://www.kryptosavings.com/affiliate", "evidence": "30% commission"},
                {"type": "custody", "value": "custody", "source_url": "https://www.kryptosavings.com/", "evidence": "institutional custody"},
                {"type": "trading", "value": "trading", "source_url": "https://www.kryptosavings.com/strategy", "evidence": "algorithmic trading"},
                {"type": "referral", "value": "referral", "source_url": "https://www.kryptosavings.com/affiliate", "evidence": "affiliate referral program"},
            ],
            "risk_signals": [{"id": "yield_level", "title": "Rendite erkannt", "explanation": "23% APY"}],
        },
        "academy_analysis": {"comparisons": [], "tensions": []},
        "operator_registry_research": {
            "profiles": [{
                "entity": "Open Delta DAO LLC",
                "project_connection_status": "not_independently_linked",
                "official_or_registry_records": [],
                "entity_owned_records": [],
                "independent_records": [],
                "authority_context_records": [],
            }]
        },
        "external_research": {"traces": [], "review_candidates": []},
    }
    if with_people:
        data["people_history_research"] = {
            "status": "ok",
            "profiles": [
                {
                    "person_name": "Konstantin Wünscher",
                    "entity": "Open Delta DAO LLC",
                    "project_connection_status": "not_independently_linked",
                    "ownership_status": "not_verified",
                    "ubo_verified": False,
                    "roles": ["CEO"],
                    "records": [{
                        "source_url": "https://blog.opendelta.com/example/",
                        "source_role": "entity_owned",
                        "evidence": "Konstantin Wünscher, CEO of OpenDelta.",
                    }],
                },
                {
                    "person_name": "Nick Schteringard",
                    "entity": "Open Delta DAO LLC",
                    "project_connection_status": "not_independently_linked",
                    "ownership_status": "not_verified",
                    "ubo_verified": False,
                    "roles": ["co-founder"],
                    "records": [{
                        "source_url": "https://blog.opendelta.com/example/",
                        "source_role": "entity_owned",
                        "evidence": "OpenDelta co-founder Nick Schteringard.",
                    }],
                },
            ],
        }
    return data


def q5(out):
    return next(q for q in out["sixteen_point_analysis"]["questions"] if q["id"] == 5)


def test_entity_people_move_q5_to_clarification_without_project_or_ubo_claim():
    out = mod.enrich(sample(True))
    item = q5(out)
    assert item["state"] == "clarification_needed"
    assert "Konstantin Wünscher" in item["finding"]
    assert "Nick Schteringard" in item["finding"]
    assert "nicht automatisch bei KryptoSavings" in item["finding"]
    assert any("KryptoSavings" in gap for gap in item["gaps"])
    assert any("UBO" in gap for gap in item["gaps"])
    assert item["traffic_light"] is None
    assert item["traffic_light_ready"] is False
    assert out["sixteen_point_analysis"]["guardrails"]["structured_people_q5_used"] is True


def test_entity_people_evidence_is_preserved_with_source():
    out = mod.enrich(sample(True))
    item = q5(out)
    assert len(item["evidence"]) == 2
    assert all(e["source_url"] == "https://blog.opendelta.com/example/" for e in item["evidence"])
    labels = " ".join(e["label"] for e in item["evidence"])
    assert "Konstantin Wünscher" in labels
    assert "Nick Schteringard" in labels


def test_without_structured_people_base_research_gap_remains():
    out = mod.enrich(sample(False))
    item = q5(out)
    assert item["state"] == "research_gap"
    assert out["sixteen_point_analysis"]["guardrails"].get("structured_people_q5_used") is None

# Produktionsintegration: triggert die Main-Workflows ohne Änderung der Fachlogik.
