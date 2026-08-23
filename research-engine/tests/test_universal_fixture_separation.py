import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures"


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


router = load("universal_fixture_router_test", "research_router.py")


def test_reference_project_is_explicitly_not_a_runtime_dependency():
    reference = json.loads((FIXTURES / "kryptosavings" / "reference.json").read_text(encoding="utf-8"))
    assert reference["fixture_type"] == "regression_reference"
    assert reference["runtime_dependency"] is False


def test_neutral_input_matrix_routes_without_project_specific_rules():
    matrix = json.loads((FIXTURES / "universal" / "input_matrix.json").read_text(encoding="utf-8"))
    for case in matrix["cases"]:
        info = router.classify_input(case["input"])
        assert info["input_kind"] == case["expected_input_kind"]
        assert info["route"] == case["expected_route"]
        for key in ("referral_hint", "blockchain_hint", "social_hint"):
            expected_key = f"expected_{key}"
            if expected_key in case:
                assert info[key] is case[expected_key]


def test_runtime_code_does_not_import_reference_fixture():
    runtime_files = [
        "research_router.py",
        "identity_resolver.py",
        "quick_external_research.py",
        "universal_pipeline.py",
        "universal_runtime.py",
        "universal_operator_research.py",
        "universal_people_research.py",
        "universal_academy_analysis.py",
        "universal_sixteen_analysis.py",
    ]
    hay = "\n".join((ROOT / name).read_text(encoding="utf-8") for name in runtime_files).lower()
    assert "tests/fixtures/kryptosavings" not in hay
    assert "fixtures/kryptosavings" not in hay
