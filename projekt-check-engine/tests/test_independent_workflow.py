#!/usr/bin/env python3
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github/workflows/projekt-check-neuer-fall.yml"


class IndependentWorkflowTests(unittest.TestCase):
    def test_independent_web_research_runs_after_primary_evaluation(self):
        text = WORKFLOW.read_text(encoding="utf-8")
        primary = text.index("run_evaluation.py")
        independent = text.index("run_independent_research.py")
        self.assertLess(primary, independent)
        self.assertIn("--max-captures 8", text)
        self.assertIn("Unabhängigen Recherche-Zwischenstand veröffentlichen", text)
        self.assertNotIn("research-engine/", text)


if __name__ == "__main__":
    unittest.main()
