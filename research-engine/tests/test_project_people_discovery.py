import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("project_people_discovery_test", ROOT / "project_people_discovery.py")
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def test_extract_people_from_html_team_cards():
    html = """
    <section>
      <article><h5>Maksym Sakharov</h5><p>Board member</p><p>Group CEO</p><p>ex-CEO at Exflow</p></article>
      <article><h5>Roman Rossov</h5><p>Chief Product Officer</p><p>ex-Product Director at Wise</p></article>
      <article><h5>Reeve Collins</h5><p>Chairman</p><p>Founder and ex-CEO at Tether</p></article>
    </section>
    """
    people = mod.extract_people_from_html(html)
    names = {p["person_name"] for p in people}
    assert names == {"Maksym Sakharov", "Roman Rossov", "Reeve Collins"}
    assert all(p["extraction_mode"] == "html_heading_card" for p in people)


def test_flat_fallback_does_not_absorb_previous_employer():
    text = "ex-CEO at Exflow Roman Rossov Board member"
    people = mod.extract_people(text)
    assert all(p["person_name"] != "Exflow Roman Rossov" for p in people)


def test_team_claim_is_not_ownership_claim():
    people = mod.extract_people("Jane Example Chief Executive Officer and John Sample Chairman")
    assert people
    assert all("ubo" not in p for p in people)
    assert all("ownership" not in p for p in people)


def test_bad_heading_is_not_person():
    html = "<section><h5>Leadership Team</h5><p>Chief Executive Officer</p></section>"
    people = mod.extract_people_from_html(html)
    assert people == []
