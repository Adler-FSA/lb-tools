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


roles = load("entity_role_analysis_test", "entity_role_analysis.py")


def test_role_classifier_separates_legal_entity_payment_and_custody():
    assert roles.classify_excerpt("Nordlicht Systems LLC", "Nordlicht operates as the trading name of Nordlicht Systems LLC.") == "brand_legal_entity"
    assert roles.classify_excerpt("Nordlicht Pay Limited", "Payments are facilitated by Nordlicht Pay Limited.") == "payment_facilitator"
    assert roles.classify_excerpt("Safe Vault Ltd", "Customer assets are held using custody infrastructure provided by Safe Vault Ltd.") == "custody_or_wallet_provider"


def test_service_infrastructure_operated_by_entity_is_not_project_operator():
    text = "Digital asset custody infrastructure operated by Fireblocks Ltd, a provider of secure MPC technology."
    assert roles.classify_excerpt("Fireblocks Ltd", text) == "custody_or_wallet_provider"


def test_role_classifier_does_not_infer_ownership_from_plain_mention():
    assert roles.classify_excerpt("Example GmbH", "For more information contact Example GmbH.") == "role_unclear"


def test_attach_keeps_project_claim_roles_separate_from_independent_confirmation():
    data = {
        "analysis": {
            "legal_entities": ["Nordlicht Systems LLC", "Nordlicht Pay Limited"],
            "findings": [
                {"source_url": "https://example.test/terms", "evidence": "Nordlicht operates as the trading name of Nordlicht Systems LLC."},
                {"source_url": "https://example.test/payments", "evidence": "Payments are facilitated by Nordlicht Pay Limited."},
            ],
            "pages": [],
        },
        "operator_registry_research": {
            "profiles": [
                {"entity": "Nordlicht Systems LLC"},
                {"entity": "Nordlicht Pay Limited"},
            ]
        },
    }
    out = roles.attach(data)
    profiles = {p["entity"]: p for p in out["operator_registry_research"]["profiles"]}
    assert profiles["Nordlicht Systems LLC"]["claimed_roles"][0]["role"] == "brand_legal_entity"
    assert profiles["Nordlicht Pay Limited"]["claimed_roles"][0]["role"] == "payment_facilitator"
    assert profiles["Nordlicht Pay Limited"]["claimed_roles"][0]["independently_confirmed"] is False
    assert out["operator_registry_research"]["guardrails"]["entity_role_does_not_imply_ownership_or_ubo"] is True
    assert out["operator_registry_research"]["guardrails"]["specific_service_role_precedes_generic_operator_wording"] is True
