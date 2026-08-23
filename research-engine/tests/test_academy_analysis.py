import importlib.util
import sys
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "academy_analysis.py"
spec = importlib.util.spec_from_file_location("academy_analysis", MODULE)
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


def base_result():
    return {
        "status": "ok",
        "context": {
            "project_name": "KryptoSavings",
            "domain": "kryptosavings.com",
        },
        "analysis": {
            "max_yield_percentage": 23.0,
            "max_commission_percentage": 30.0,
            "legal_entities": ["Delta West Credit Bank Ltd", "Open Delta DAO LLC"],
            "findings": [
                {
                    "type": "yield_percentage",
                    "value": "23%",
                    "source_url": "https://www.kryptosavings.com/",
                    "evidence": "Earn up to 23% APY on Crypto",
                    "confidence": "high",
                },
                {
                    "type": "commission_percentage",
                    "value": "30%",
                    "source_url": "https://www.kryptosavings.com/affiliate",
                    "evidence": "30% commission",
                    "confidence": "high",
                },
                {
                    "type": "legal_entity",
                    "value": "Delta West Credit Bank Ltd",
                    "source_url": "https://www.kryptosavings.com/terms-of-service",
                    "evidence": "Delta West Credit Bank Ltd",
                    "confidence": "medium",
                },
            ],
            "questions": [
                "Wodurch wird die beworbene Rendite tatsächlich erwirtschaftet?"
            ],
        },
        "external_research": {
            "status": "ok",
            "traces": [],
            "review_candidates": [],
        },
        "operator_registry_research": {
            "status": "ok",
            "entities_from_project_website": [
                "Delta West Credit Bank Ltd",
                "Open Delta DAO LLC",
                "GBH Coriolis Bancorp",
            ],
            "profiles": [],
        },
    }


def test_source_hierarchy_prefers_authority_over_independent_and_community():
    assert mod.SOURCE_RANK["regulator"] > mod.SOURCE_RANK["independent"]
    assert mod.SOURCE_RANK["independent"] > mod.SOURCE_RANK["community"]
    assert mod.SOURCE_RANK["community"] > mod.SOURCE_RANK["project_owned"]


def test_yield_without_external_confirmation_stays_unverified():
    out = mod.enrich(base_result())["academy_analysis"]
    yield_cmp = next(c for c in out["comparisons"] if c["topic"] == "yield")
    assert yield_cmp["project_value"] == "23%"
    assert yield_cmp["assessment"] == "not_independently_verified"
    assert yield_cmp["external_support"] == []


def test_independent_same_yield_can_support_claim():
    data = base_result()
    data["external_research"]["traces"] = [
        {
            "source_relation": "independent",
            "source_url": "https://example.org/review",
            "title": "KryptoSavings review",
            "evidence": "The service advertises up to 23% APY.",
            "published_at": "2026-08-20",
        }
    ]
    out = mod.enrich(data)["academy_analysis"]
    yield_cmp = next(c for c in out["comparisons"] if c["topic"] == "yield")
    assert yield_cmp["assessment"] == "independently_supported"
    assert yield_cmp["external_support"][0]["source_role"] == "independent"


def test_community_same_yield_is_only_partial_support():
    data = base_result()
    data["external_research"]["traces"] = [
        {
            "source_relation": "community",
            "source_url": "https://reddit.com/r/example/post",
            "title": "KryptoSavings experience",
            "evidence": "My dashboard shows 23% APY.",
            "published_at": "2026-08-20",
        }
    ]
    out = mod.enrich(data)["academy_analysis"]
    yield_cmp = next(c for c in out["comparisons"] if c["topic"] == "yield")
    assert yield_cmp["assessment"] == "partially_supported"


def test_operator_registry_trace_does_not_confirm_project_connection():
    data = base_result()
    data["operator_registry_research"]["profiles"] = [
        {
            "entity": "Delta West Credit Bank Ltd",
            "existence_status": "registry_or_authority_trace",
            "project_connection_status": "not_independently_linked",
            "official_or_registry_records": [
                {
                    "source_role": "claimed_regulator_or_registry",
                    "source_url": "https://mwaliregistrar.info/list_of_entities.html",
                    "title": "Mwali register",
                    "evidence": "Delta West Credit Bank Ltd B20110086 Active",
                    "published_at": "",
                }
            ],
            "entity_owned_records": [],
            "independent_records": [],
            "authority_context_records": [],
        }
    ]
    out = mod.enrich(data)["academy_analysis"]
    cmp = next(c for c in out["comparisons"] if c["project_value"] == "Delta West Credit Bank Ltd")
    assert cmp["assessment"] == "partially_supported"
    assert "nicht unabhaengig bestaetigt" in cmp["explanation"]


def test_higher_authority_context_marks_operator_relation_challenged():
    data = base_result()
    data["operator_registry_research"]["profiles"] = [
        {
            "entity": "Delta West Credit Bank Ltd",
            "existence_status": "registry_or_authority_trace",
            "project_connection_status": "not_independently_linked",
            "official_or_registry_records": [
                {
                    "source_role": "claimed_regulator_or_registry",
                    "source_url": "https://mwaliregistrar.info/list_of_entities.html",
                    "title": "Mwali register",
                    "evidence": "Delta West Credit Bank Ltd B20110086 Active",
                    "published_at": "",
                }
            ],
            "entity_owned_records": [],
            "independent_records": [],
            "authority_context_records": [
                {
                    "source_role": "regulator",
                    "source_url": "https://banque-comores.km/warning",
                    "title": "Banque Centrale des Comores",
                    "evidence": "Warning concerning offshore banking authorities in Mwali.",
                    "published_at": "2023-05-22",
                }
            ],
        }
    ]
    out = mod.enrich(data)["academy_analysis"]
    cmp = next(c for c in out["comparisons"] if c["project_value"] == "Delta West Credit Bank Ltd")
    assert cmp["assessment"] == "context_challenged"
    assert cmp["external_challenges"][0]["source_role"] == "regulator"
    assert out["summary"]["tension_count"] >= 1


def test_open_delta_self_trace_is_not_project_confirmation():
    data = base_result()
    data["operator_registry_research"]["profiles"] = [
        {
            "entity": "Open Delta DAO LLC",
            "existence_status": "entity_self_trace",
            "project_connection_status": "not_independently_linked",
            "official_or_registry_records": [],
            "entity_owned_records": [
                {
                    "source_role": "entity_owned",
                    "source_url": "https://www.opendelta.com/terms-of-use",
                    "title": "OpenDelta Terms",
                    "evidence": "Open Delta DAO LLC",
                    "published_at": "",
                }
            ],
            "independent_records": [],
            "authority_context_records": [],
        }
    ]
    out = mod.enrich(data)["academy_analysis"]
    cmp = next(c for c in out["comparisons"] if c["project_value"] == "Open Delta DAO LLC")
    assert cmp["assessment"] == "partially_supported"
    assert cmp["external_support"][0]["source_role"] == "entity_owned"


def test_guardrails_explicitly_prevent_verdict_generation():
    out = mod.enrich(base_result())["academy_analysis"]
    assert out["guardrails"] == {
        "risk_score_created": False,
        "fraud_verdict_created": False,
        "seriousness_verdict_created": False,
    }
    assert out["open_questions"]
    assert out["summary"]["open_question_count"] == len(out["open_questions"])
