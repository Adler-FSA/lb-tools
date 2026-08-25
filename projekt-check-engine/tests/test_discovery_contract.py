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
        self.assertIn("navigation_links", text)
        self.assertIn("link_actions", text)
        self.assertIn("safe_button_click", text)
        self.assertIn("BLOCKED_PATH_SEGMENTS", text)
        self.assertNotIn("scam", text.lower())
        self.assertNotIn("betrug", text.lower())

    def test_button_navigation_can_bridge_to_official_homepage_and_subpages(self):
        module = load_module(BROWSER_PROBE, "pc_browser_probe")
        probes = [
            {
                "requested_url": "https://ref.example/auth?id=1",
                "final_url": "https://ref.example/auth?id=1",
                "source_type": "website",
                "navigation_links": ["https://official.example/"],
                "link_actions": [],
                "links": [],
            },
            {
                "requested_url": "https://official.example/",
                "final_url": "https://official.example/",
                "source_type": "website",
                "navigation_links": [],
                "link_actions": [],
                "links": [
                    "https://official.example/about",
                    "https://official.example/terms",
                    "https://official.example/privacy",
                ],
            },
        ]
        links = module.choose_priority_links(probes, limit=10)
        self.assertIn("https://official.example/", links)
        self.assertIn("https://official.example/about", links)
        self.assertIn("https://official.example/terms", links)
        self.assertIn("https://official.example/privacy", links)

    def test_safe_internal_structure_is_followed_without_keyword_gate(self):
        module = load_module(BROWSER_PROBE, "pc_browser_probe_internal")
        probes = [
            {
                "requested_url": "https://u.example/",
                "final_url": "https://u.example/",
                "source_type": "website",
                "navigation_links": [],
                "link_actions": [],
                "links": [
                    "https://u.example/governance",
                    "https://u.example/treasury",
                    "https://u.example/something-new",
                    "https://u.example/auth",
                    "https://u.example/signup",
                ],
            }
        ]
        links = module.choose_priority_links(probes, limit=20)
        self.assertIn("https://u.example/governance", links)
        self.assertIn("https://u.example/treasury", links)
        self.assertIn("https://u.example/something-new", links)
        self.assertNotIn("https://u.example/auth", links)
        self.assertNotIn("https://u.example/signup", links)

    def test_visible_back_home_anchor_can_bridge_domains(self):
        module = load_module(BROWSER_PROBE, "pc_browser_probe_anchor")
        probes = [
            {
                "requested_url": "https://invite.example/ref/1",
                "final_url": "https://invite.example/ref/1",
                "source_type": "website",
                "navigation_links": [],
                "link_actions": [
                    {"label": "Back to Home", "url": "https://official.example/"}
                ],
                "links": ["https://official.example/"],
            }
        ]
        links = module.choose_priority_links(probes, limit=10)
        self.assertIn("https://official.example/", links)


    def test_external_one_hop_sources_do_not_become_new_project_trees(self):
        module = load_module(BROWSER_PROBE, "pc_browser_probe_scope")
        probes = [
            {
                "requested_url": "https://project.example/",
                "final_url": "https://project.example/",
                "source_type": "website",
                "navigation_links": [],
                "link_actions": [{"label": "Whitepaper", "url": "https://docs.example/view/abc"}],
                "links": ["https://project.example/terms"],
            },
            {
                "requested_url": "https://docs.example/view/abc",
                "final_url": "https://docs.example/view/abc",
                "source_type": "website",
                "navigation_links": [],
                "link_actions": [],
                "links": ["https://stripe.com/privacy", "https://docs.example/legal"],
            },
        ]
        links = module.choose_priority_links(probes, limit=20, project_hosts={"project.example"})
        self.assertIn("https://project.example/terms", links)
        self.assertIn("https://docs.example/view/abc", links)
        self.assertNotIn("https://stripe.com/privacy", links)
        self.assertNotIn("https://docs.example/legal", links)

    def test_discovery_is_multistage_and_bounded(self):
        text = DISCOVERY.read_text(encoding="utf-8")
        self.assertIn("--max-depth", text)
        self.assertIn("crawl_rounds", text)
        self.assertIn("for depth in range", text)
        self.assertIn("expanded_urls", text)
        self.assertIn("navigation_target_count", text)
        self.assertIn("min(args.max_depth, 4)", text)

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
