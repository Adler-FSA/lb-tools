import importlib.util
import sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parents[1] / "engine.py"
spec = importlib.util.spec_from_file_location("research_engine_www", ENGINE)
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


def test_referral_url_preserves_www_for_fetching():
    parsed = mod.parse_input("https://www.kryptosavings.com/ref/ABC123")
    assert parsed["url"].startswith("https://www.kryptosavings.com/")
    assert parsed["fetch_host"] == "www.kryptosavings.com"
    assert parsed["domain"] == "kryptosavings.com"


def test_plain_domain_stays_plain_for_fetching():
    parsed = mod.parse_input("kryptosavings.com")
    assert parsed["fetch_host"] == "kryptosavings.com"
    assert parsed["domain"] == "kryptosavings.com"
