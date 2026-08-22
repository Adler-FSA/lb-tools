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


def test_percentage_kind_separates_yield_and_commission():
    yield_text = "Earn up to 23% APY on your crypto assets."
    yield_match = mod.PERCENT_RE.search(yield_text)
    assert mod.percentage_kind(yield_text, yield_match) == "yield"

    commission_text = "Earn up to 30% commission with no fixed time limit."
    commission_match = mod.PERCENT_RE.search(commission_text)
    assert mod.percentage_kind(commission_text, commission_match) == "commission"

    other_text = "Save 50% on the annual subscription price."
    other_match = mod.PERCENT_RE.search(other_text)
    assert mod.percentage_kind(other_text, other_match) == "other"


def test_reader_404_is_rejected():
    assert mod.reader_error("Title: 404: NOT_FOUND Warning: Target URL returned error 404: Not Found") is True
    assert mod.reader_error("Title: KryptoSavings Earn up to 23% APY") is False


def test_candidate_domain_contains_exact_brand_com():
    cands = mod.candidate_domains("KryptoSavings")
    assert "kryptosavings.com" in cands
    assert cands.index("kryptosavings.com") == 0


def test_parse_referral_url_preserves_domain():
    parsed = mod.parse_input("https://www.kryptosavings.com/ref/ABC123")
    assert parsed["kind"] == "url"
    assert parsed["domain"] == "kryptosavings.com"
    assert "/ref/ABC123" in parsed["url"]


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
    assert out["max_yield_percentage"] == 20.0


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


def test_loss_percentage_is_not_yield():
    text = "In a worst-case scenario, you may lose 100% of your deposited assets. Yield Generation & Performance Risk follows."
    match = mod.PERCENT_RE.search(text)
    assert mod.percentage_kind(text, match) == "other"


def test_welcome_bonus_is_not_yield_even_near_apy_title():
    text = "KryptoSavings — Earn up to 23% APY on Crypto Get 15% Welcome Bonus on your first deposit."
    matches = list(mod.PERCENT_RE.finditer(text))
    assert mod.percentage_kind(text, matches[0]) == "yield"
    assert mod.percentage_kind(text, matches[1]) == "other"


def test_competitor_table_does_not_raise_project_commission():
    ctx = {"input_url": ""}
    page = mod.Page(
        url="https://example.com/affiliate",
        status=200,
        title="Affiliate",
        text=(
            "Earn up to 30% commission with no fixed time limit. "
            "Max commission rate | 30% | 10% | 5% | 50% | Duration | Lifetime"
        ),
        links=[],
    )
    out = mod.analyze_pages([page], ctx)
    assert out["max_commission_percentage"] == 30.0


# Bewusster Trigger für den Klaus-Live-Lauf mit ausschließlich dem Projektnamen.
