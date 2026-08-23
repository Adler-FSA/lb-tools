import importlib.util
import sys
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "academy_16_questions.py"
spec = importlib.util.spec_from_file_location("academy_16_questions", MODULE)
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


def sample_data():
    return {
        "status": "ok",
        "context": {"project_name": "KryptoSavings", "domain": "kryptosavings.com"},
        "analysis": {
            "max_yield_percentage": 23.0,
            "max_commission_percentage": 30.0,
            "detected": {
                "staking": True, "yield_or_interest": True, "defi": True,
                "trading": True, "leverage": True, "lending": True,
                "lockup": True, "withdrawal": True, "kyc": True,
                "custody": True, "referral": True, "bonus": True,
                "guarantee": False,
            },
            "findings": [
                {"type": "yield_percentage", "value": "23%", "source_url": "https://www.kryptosavings.com/", "evidence": "Earn up to 23% APY", "confidence": "high"},
                {"type": "commission_percentage", "value": "30%", "source_url": "https://www.kryptosavings.com/affiliate", "evidence": "30% commission", "confidence": "high"},
                {"type": "custody", "value": "custody", "source_url": "https://www.kryptosavings.com/", "evidence": "Custody information", "confidence": "medium"},
                {"type": "trading", "value": "trading", "source_url": "https://www.kryptosavings.com/strategy", "evidence": "trading strategy", "confidence": "medium"},
                {"type": "leverage", "value": "leverage", "source_url": "https://www.kryptosavings.com/strategy", "evidence": "leverage", "confidence": "medium"},
                {"type": "referral", "value": "referral", "source_url": "https://www.kryptosavings.com/affiliate", "evidence": "referral program", "confidence": "medium"},
            ],
            "risk_signals": [
                {"id": "yield_level", "severity": "high", "title": "Rendite"},
                {"id": "leverage", "severity": "high", "title": "Hebel"},
            ],
        },
        "external_research": {"traces": [], "review_candidates": []},
        "operator_registry_research": {
            "profiles": [
                {
                    "entity": "Delta West Credit Bank Ltd",
                    "project_connection_status": "not_independently_linked",
                    "existence_status": "registry_or_authority_trace",
                    "official_or_registry_records": [{
                        "source_url": "https://mwaliregistrar.info/list_of_entities.html",
                        "title": "Mwali register",
                        "evidence": "Delta West Credit Bank Ltd B20110086 Active",
                        "source_role": "claimed_regulator_or_registry",
                        "project_connection": "not_shown",
                    }],
                    "entity_owned_records": [], "independent_records": [],
                    "authority_context_records": [{
                        "source_url": "https://banque-comores.km/warning",
                        "title": "Banque Centrale des Comores",
                        "evidence": "Mwali authority context",
                        "source_role": "regulator",
                    }],
                },
                {
                    "entity": "Open Delta DAO LLC",
                    "project_connection_status": "not_independently_linked",
                    "existence_status": "entity_self_trace",
                    "official_or_registry_records": [],
                    "entity_owned_records": [{
                        "source_url": "https://www.opendelta.com/terms-of-use",
                        "title": "OpenDelta Terms",
                        "evidence": "Open Delta DAO LLC",
                        "source_role": "entity_owned",
                    }],
                    "independent_records": [], "authority_context_records": [],
                },
            ],
            "authority_context_records": [{
                "source_url": "https://banque-comores.km/warning",
                "title": "Banque Centrale des Comores",
                "evidence": "Mwali authority context",
                "source_role": "regulator",
            }],
        },
        "academy_analysis": {
            "comparisons": [
                {"topic": "yield", "project_value": "23%", "assessment": "not_independently_verified"},
                {"topic": "affiliate_commission", "project_value": "30%", "assessment": "not_independently_verified"},
            ],
            "tensions": [{"topic": "operator_relation", "assessment": "context_challenged"}],
        },
    }


def test_canonical_16_questions_are_complete_and_unchanged():
    titles = [q[1] for q in mod.QUESTIONS]
    assert len(titles) == 16
    assert titles[0] == "Was ist das konkrete Produkt?"
    assert titles[3] == "Wer ist der Betreiber?"
    assert titles[5] == "Welche regulatorische Erlaubnis liegt vor?"
    assert titles[10] == "Gibt es Empfehlungs-, Partner- oder Mehrstufenvergütung?"
    assert titles[15] == "Akademie-Gesamtbewertung"


def test_enrich_creates_exactly_16_results_and_provisional_overall():
    out = mod.enrich(sample_data())["academy_16_questions"]
    assert out["status"] == "ok"
    assert out["summary"]["question_count"] == 16
    assert len(out["questions"]) == 16
    assert out["questions"][-1]["number"] == 16
    assert out["questions"][-1]["provisional"] is True
    assert out["summary"]["overall_is_provisional"] is True
    assert out["guardrails"]["fraud_verdict_created"] is False
    assert out["guardrails"]["investment_recommendation_created"] is False


def test_registry_existence_does_not_turn_operator_question_green():
    out = mod.enrich(sample_data())["academy_16_questions"]
    q4 = next(q for q in out["questions"] if q["number"] == 4)
    assert q4["traffic_light"] == "red"
    assert "nicht" in q4["finding"].lower()
    assert any(x["source_role"] == "regulator" for x in q4["evidence"])


def test_claimed_registry_plus_higher_authority_context_makes_regulation_red():
    out = mod.enrich(sample_data())["academy_16_questions"]
    q6 = next(q for q in out["questions"] if q["number"] == 6)
    assert q6["traffic_light"] == "red"
    assert any(x["source_role"] == "regulator" for x in q6["evidence"])
    assert any("zuständige" in x.lower() or "lizenz" in x.lower() for x in q6["missing_evidence"])


def test_management_history_is_not_invented_when_external_person_trace_missing():
    out = mod.enrich(sample_data())["academy_16_questions"]
    q5 = next(q for q in out["questions"] if q["number"] == 5)
    assert q5["traffic_light"] == "yellow-red"
    assert "keine ausreichend bestätigten" in q5["finding"].lower()
    assert "Management" in q5["missing_evidence"]


def test_referral_claim_is_visible_but_not_treated_as_complete_plan():
    out = mod.enrich(sample_data())["academy_16_questions"]
    q11 = next(q for q in out["questions"] if q["number"] == 11)
    assert q11["traffic_light"] == "yellow"
    assert "30%" in q11["finding"]
    assert "vollständiger Vergütungsplan" in q11["missing_evidence"]


def test_overall_does_not_hide_central_red_questions():
    out = mod.enrich(sample_data())["academy_16_questions"]
    q16 = out["questions"][-1]
    assert q16["traffic_light"] in {"yellow-red", "red"}
    assert "vorläufig" in q16["finding"].lower()
