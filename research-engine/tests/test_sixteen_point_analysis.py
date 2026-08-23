import importlib.util
import sys
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "sixteen_point_analysis.py"
spec = importlib.util.spec_from_file_location("sixteen_point_analysis", MODULE)
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


def sample():
    return {
        "status": "ok",
        "context": {"project_name": "KryptoSavings", "domain": "kryptosavings.com"},
        "analysis": {
            "max_yield_percentage": 23.0,
            "max_commission_percentage": 30.0,
            "detected": {
                "staking": True, "defi": True, "trading": True, "leverage": True,
                "lending": True, "lockup": True, "withdrawal": True,
                "kyc": True, "custody": True, "referral": True, "bonus": True,
                "guarantee": False,
            },
            "findings": [
                {"type": "yield_percentage", "value": "23%", "source_url": "https://www.kryptosavings.com/", "evidence": "Earn up to 23% APY", "confidence": "high"},
                {"type": "commission_percentage", "value": "30%", "source_url": "https://www.kryptosavings.com/affiliate", "evidence": "30% commission", "confidence": "high"},
                {"type": "custody", "value": "custody", "source_url": "https://www.kryptosavings.com/", "evidence": "institutional custody", "confidence": "medium"},
                {"type": "trading", "value": "trading", "source_url": "https://www.kryptosavings.com/strategy", "evidence": "algorithmic trading", "confidence": "medium"},
                {"type": "referral", "value": "referral", "source_url": "https://www.kryptosavings.com/affiliate", "evidence": "affiliate referral program", "confidence": "medium"},
            ],
            "risk_signals": [
                {"id": "yield_level", "title": "Rendite erkannt", "explanation": "23% APY"},
                {"id": "distribution_incentive", "title": "Vertrieb erkannt", "explanation": "Affiliate"},
            ],
        },
        "academy_analysis": {
            "comparisons": [
                {
                    "topic": "yield", "assessment": "not_independently_verified",
                    "project_source_url": "https://www.kryptosavings.com/", "project_evidence": "23% APY",
                    "external_support": [], "external_challenges": []
                },
                {
                    "topic": "operator_relation", "assessment": "context_challenged",
                    "project_source_url": "https://www.kryptosavings.com/terms-of-service", "project_evidence": "Delta West Credit Bank Ltd",
                    "external_support": [],
                    "external_challenges": [{
                        "source_url": "https://banque-comores.km/warning", "source_role": "regulator",
                        "title": "Central bank notice", "evidence": "offshore banking warning"
                    }]
                }
            ],
            "tensions": [{"topic": "operator_relation", "assessment": "context_challenged"}],
        },
        "operator_registry_research": {
            "profiles": [
                {
                    "entity": "Delta West Credit Bank Ltd",
                    "project_connection_status": "not_independently_linked",
                    "existence_status": "registry_or_authority_trace",
                    "official_or_registry_records": [{
                        "entity": "Delta West Credit Bank Ltd",
                        "source_url": "https://mwaliregistrar.info/list_of_entities.html",
                        "source_role": "claimed_regulator_or_registry",
                        "evidence": "Delta West Credit Bank Ltd B20110086 Active"
                    }],
                    "entity_owned_records": [], "independent_records": [],
                    "authority_context_records": [{
                        "source_url": "https://banque-comores.km/warning",
                        "source_role": "regulator", "title": "Banque Centrale des Comores",
                        "evidence": "offshore banking warning"
                    }]
                }
            ]
        },
        "external_research": {"traces": [], "review_candidates": []},
    }


def q(out, n):
    return next(x for x in out["sixteen_point_analysis"]["questions"] if x["id"] == n)


def test_standard_has_exactly_sixteen_questions():
    standard = mod.load_standard()
    assert len(standard["questions"]) == 16
    assert standard["questions"][0]["title"] == "Was ist das konkrete Produkt?"
    assert standard["questions"][-1]["title"] == "Akademie-Gesamtbewertung"


def test_engine_always_outputs_all_sixteen_questions():
    out = mod.enrich(sample())
    assert out["sixteen_point_analysis"]["summary"]["question_count"] == 16
    assert [x["id"] for x in out["sixteen_point_analysis"]["questions"]] == list(range(1, 17))


def test_company_existence_does_not_become_confirmed_operator_role():
    out = mod.enrich(sample())
    item = q(out, 4)
    assert item["state"] in {"clarification_needed", "conflict_found"}
    assert item["state"] != "supported"
    assert any("Vertragspartner" in gap or "Betreiber" in item["finding"] for gap in item["gaps"])


def test_regulator_context_creates_regulatory_conflict():
    out = mod.enrich(sample())
    item = q(out, 6)
    assert item["state"] == "conflict_found"
    assert any(x["source_role"] == "regulator" for x in item["counter_evidence"])


def test_known_yield_without_market_benchmark_is_not_declared_plausible():
    out = mod.enrich(sample())
    item = q(out, 9)
    assert item["state"] == "clarification_needed"
    assert "23%" in item["finding"]
    assert any("Marktbenchmark" in gap for gap in item["gaps"])


def test_referral_is_detected_but_full_plan_remains_open():
    out = mod.enrich(sample())
    item = q(out, 11)
    assert item["state"] == "partially_answered"
    assert "30%" in item["finding"]
    assert item["gaps"]


def test_sustainability_is_never_invented_from_yield_and_commission_only():
    out = mod.enrich(sample())
    item = q(out, 12)
    assert item["state"] == "research_gap"
    assert "Break-even" in " ".join(item["next_research"])


def test_overall_traffic_light_stays_locked_with_material_gaps():
    out = mod.enrich(sample())
    item = q(out, 16)
    assert item["state"] == "overall_not_ready"
    assert item["traffic_light"] is None
    assert item["traffic_light_ready"] is False
    assert out["sixteen_point_analysis"]["summary"]["overall_assessment_ready"] is False
    assert out["sixteen_point_analysis"]["guardrails"]["overall_traffic_light_created"] is False


def test_missing_information_is_not_fraud_verdict():
    out = mod.enrich(sample())
    guards = out["sixteen_point_analysis"]["guardrails"]
    assert guards["missing_information_equals_fraud"] is False
    assert guards["fraud_verdict_created"] is False
