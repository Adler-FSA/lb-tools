import importlib.util
import sys
from types import SimpleNamespace
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


runtime = load("runtime_challenge_filter_test", "universal_runtime.py")


def page(title, text):
    return SimpleNamespace(title=title, text=text)


def test_cloudflare_just_a_moment_is_not_project_content():
    p = page("Just a moment...", "Checking your browser. Enable JavaScript and cookies to continue. Cloudflare Ray ID")
    assert runtime._looks_like_challenge(p) is True


def test_verify_human_page_is_challenge():
    p = page("Security verification", "Verify you are human before continuing")
    assert runtime._looks_like_challenge(p) is True


def test_normal_project_page_is_not_challenge():
    p = page("Example Finance", "Lending, payments, fees, company information and customer support.")
    assert runtime._looks_like_challenge(p) is False
