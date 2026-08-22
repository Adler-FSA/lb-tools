import importlib.util
import sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parents[1] / "engine.py"
spec = importlib.util.spec_from_file_location("research_engine", ENGINE)
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


def test_percentage_23_not_3():
    vals = mod.extract_percentages("Earn up to 23% APY on crypto assets")
    assert vals == [23.0]


def test_multiple_percentages_highest_first():
    vals = mod.extract_percentages("7% APY, 20% APY and 15.5% APR")
    assert vals == [20.0, 15.5, 7.0]


def test_referral_input_detected():
    ctx = {"input_url": "https://example.com/ref/ABC123"}
    page = mod.Page(
        url="https://example.com/",
        status=200,
        title="Example",
        text="Crypto staking with up to 20% APY.",
        links=[],
    )
    out = mod.analyze_pages([page], ctx)
    assert out["detected"]["referral"] is True
    assert any(x["type"] == "referral_input" for x in out["findings"])
    assert out["max_percentage"] == 20.0


def test_legal_entity_detection():
    ctx = {"input_url": ""}
    page = mod.Page(
        url="https://example.com/legal",
        status=200,
        title="Legal",
        text="Your contractual partner is Example Financial Services GmbH, Berlin.",
        links=[],
    )
    out = mod.analyze_pages([page], ctx)
    assert any("Example Financial Services GmbH" in x for x in out["legal_entities"])


def test_lockup_and_kyc_questions():
    ctx = {"input_url": ""}
    page = mod.Page(
        url="https://example.com/faq",
        status=200,
        title="FAQ",
        text="Fixed term 365 days. KYC identity verification is required before withdrawal.",
        links=[],
    )
    out = mod.analyze_pages([page], ctx)
    assert out["detected"]["lockup"] is True
    assert out["detected"]["kyc"] is True
    joined = " ".join(out["questions"])
    assert "ausgezahlt" in joined
    assert "KYC" in joined
