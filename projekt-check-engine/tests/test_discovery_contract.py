#!/usr/bin/env python3
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github/workflows/projekt-check-neuer-fall.yml"
BROWSER_PROBE = ROOT / "projekt-check-engine/identify/browser_probe.py"
IDENTITY_RESOLVER = ROOT / "projekt-check-engine/identify/resolve_identity.py"
DISCOVERY = ROOT / "projekt-check-engine/core/run_discovery.py"
EVIDENCE = ROOT / "projekt-check-engine/evidence/evidence_store.py"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class ProjectCheckDiscoveryContractTests(unittest.TestCase):
    def test_new_discovery_files_exist_and_do_not_reference_old_engine(self):
        for path in (BROWSER_PROBE, IDENTITY_RESOLVER, DISCOVERY, EVIDENCE):
            self.assertTrue(path.exists(), path)
            text = path.read_text(encoding="utf-8")
            self.assertNotIn("research-engine/", text)
            self.assertNotIn("FBI", text)

    def test_browser_probe_uses_real_chromium_and_neutral_capture(self):
        text = BROWSER_PROBE.read_text(encoding="utf-8")
        self.assertIn("sync_playwright", text)
        self.assertIn("pw.chromium.launch", text)
        self.assertIn("requested_url", text)
        self.assertIn("final_url", text)
        self.assertIn("content_sha256", text)
        self.assertIn("choose_priority_links", text)
        self.assertNotIn("scam", text.lower())
        self.assertNotIn("betrug", text.lower())

    def test_identity_resolver_keeps_project_label_separate_from_legal_identity(self):
        module = load_module(IDENTITY_RESOLVER, "pc_identity_resolver")
        probes = [
            {
                "requested_url": "https://example.test/ref/1",
                "final_url": "https://example.test/home",
                "og_site_name": "Example Project",
                "title": "Example Project | Home",
                "h1": "Welcome",
            },
            {
                "requested_url": "https://example.test/about",
                "final_url": "https://example.test/about",
                "og_site_name": "Example Project",
                "title": "About Example Project",
                "h1": "About",
            },
        ]
        result = module.resolve_identity(probes)
        self.assertEqual("resolved", result["status"])
        self.assertEqual("Example Project", result["label"])
        self.assertIn(result["confidence"], {"medium", "high"})
        self.assertIn("kein Nachweis", result["note"])

    def test_workflow_runs_discovery_after_case_creation(self):
        text = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("export PROJECT_CHECK_REQUEST_PATH", text)
        self.assertIn("playwright install --with-deps chromium", text)
        self.assertIn("run_discovery.py", text)
        self.assertIn("Analysefall sofort für das Control Panel veröffentlichen", text)
        self.assertIn("Discovery-Zwischenstand speichern", text)


if __name__ == "__main__":
    unittest.main()
