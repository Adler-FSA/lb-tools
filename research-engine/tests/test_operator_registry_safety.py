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


operator = load("operator_registry_safety_test", "operator_registry_research.py")


def test_descriptive_sentence_is_not_used_as_entity_or_domain():
    bad = "Trademarks WeFi operates as the trading name of AppAtlas Technologies LLC with corporate number 3644 LLC"
    assert operator.normalize_entity_candidate(bad) == ""
    assert operator.candidate_entity_domains(bad) == []


def test_facilitated_by_clause_reduces_to_real_entity():
    value = "These operations are facilitated by Wefi Payments Limited"
    assert operator.normalize_entity_candidate(value) == "Wefi Payments Limited"
    domains = operator.candidate_entity_domains(value)
    assert all(len(label) <= 63 for domain in domains for label in domain.split('.'))


def test_normal_entity_still_gets_safe_domain_candidates():
    domains = operator.candidate_entity_domains("AppAtlas Technologies LLC")
    assert domains
    assert all(len(domain) <= 253 for domain in domains)
    assert all(len(label) <= 63 for domain in domains for label in domain.split('.'))
