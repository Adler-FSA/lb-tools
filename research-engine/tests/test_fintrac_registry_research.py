import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("fintrac_registry_research_test", ROOT / "fintrac_registry_research.py")
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def test_lookup_keys_uses_identifier_claims():
    data = {
        "operator_registry_research": {
            "identifier_research": {
                "claims": [
                    {"identifier": "M23563590"},
                    {"identifier": "2025535572"},
                ]
            }
        }
    }
    assert mod.lookup_keys(data) == ["M23563590", "2025535572"]


def test_search_rows_matches_msb_or_incorporation_number():
    rows = [{
        "Organization Names (Legal and Operating)": "Example Current Ltd",
        "Business Address": "1 Example Street",
        "Website": "https://example.test",
        "MSB Registration Status": "Registered",
        "MSB Registration Number": "M23563590",
        "Jurisdiction of Incorporation": "Alberta",
        "Incorporation Number": "2025535572",
    }]
    matches = mod.search_rows(rows, ["M23563590", "2025535572"])
    assert len(matches) == 1
    assert matches[0]["organization_names"] == "Example Current Ltd"
    assert matches[0]["registration_status"] == "Registered"
    assert set(matches[0]["matched_identifiers"]) == {"M23563590", "2025535572"}


def test_scope_principle_never_calls_registration_a_license():
    # Die Fachregel ist absichtlich im Adaptertext festgehalten.
    assert "Lizenz" in mod.__doc__
    assert "Empfehlung" in mod.__doc__
