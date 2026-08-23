import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("project_people_discovery_test", ROOT / "project_people_discovery.py")
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def test_extract_people_from_flattened_team_page():
    text = (
        "Team Maksym Sakharov Group CEO ex-CEO at Example. "
        "Roman Rossov Chief Product Officer ex-Product Director at Example. "
        "Reeve Collins Board member Chairman Founder and ex-CEO at Example."
    )
    people = mod.extract_people(text)
    names = {p["person_name"] for p in people}
    assert "Maksym Sakharov" in names
    assert "Roman Rossov" in names
    assert "Reeve Collins" in names


def test_team_claim_is_not_ownership_claim():
    people = mod.extract_people("Jane Example Chief Executive Officer and John Sample Chairman")
    assert people
    assert all("ubo" not in p for p in people)
    assert all("ownership" not in p for p in people)


def test_bad_heading_is_not_person():
    people = mod.extract_people("Leadership Team Chief Executive Officer Company Project")
    assert people == []
