#!/usr/bin/env python3
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHECKS = ROOT / "projekt-check-engine/checks/checks-37.json"
GUIDANCE = ROOT / "projekt-check-auswertung/guidance/checks-37-guidance.json"
NEW_CASE = ROOT / "projekt-check-engine/core/new_case.py"
START_WORKFLOW = ROOT / ".github/workflows/projekt-check-neuer-fall.yml"
CONTROL_PANEL = ROOT / "pages/projekt-check/control-panel.html"


class ProjectCheckContractTests(unittest.TestCase):
    def test_exactly_37_unique_checks(self):
        data = json.loads(CHECKS.read_text(encoding="utf-8"))
        checks = data["checks"]
        self.assertEqual(37, len(checks))
        self.assertEqual(list(range(1, 38)), [x["id"] for x in checks])
        self.assertEqual(37, len({x["key"] for x in checks}))

    def test_guidance_exists_for_all_37_checks(self):
        data = json.loads(GUIDANCE.read_text(encoding="utf-8"))
        checks = data["checks"]
        self.assertEqual(37, len(checks))
        self.assertEqual(list(range(1, 38)), [x["id"] for x in checks])
        for item in checks:
            self.assertTrue(item["neutral_focus"].strip())
            self.assertTrue(item["customer"].strip())
            self.assertTrue(item["company"].strip())
            self.assertTrue(item["academy"].strip())

    def test_analysis_start_is_internal_workflow_dispatch_only(self):
        text = START_WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("workflow_dispatch:", text)
        self.assertNotIn("repository_dispatch:", text)
        self.assertNotIn("research-engine/", text)
        self.assertNotIn("poststelle_base", text)
        self.assertNotIn("start_ticket", text)
        self.assertIn("traces_json:", text)
        self.assertIn("claim:", text)
        self.assertIn("--initial-state angenommen", text)

    def test_control_panel_collects_only_analysis_inputs_for_start(self):
        text = CONTROL_PANEL.read_text(encoding="utf-8")
        self.assertIn('id="traceInput"', text)
        self.assertIn('id="claimInput"', text)
        self.assertIn('id="startDirectBtn"', text)
        self.assertIn("traces_json", text)
        self.assertNotIn('id="reqOrder"', text)
        self.assertNotIn('id="inboxBody"', text)
        self.assertNotIn("poststelle", text.lower())

    def test_new_case_initializes_all_checks_perspectives_and_neutral_findings(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            intake = tmp / "intake.json"
            cases = tmp / "cases"
            intake.write_text(json.dumps({
                "contract_version": "1.0",
                "submitted_at": "2026-08-25T06:00:00Z",
                "language": "de",
                "traces": ["https://example.org/ref/abc"],
                "claim": "",
                "source": "projekt-check-control-panel",
                "requested_output": "customer_check"
            }), encoding="utf-8")
            case_id = "PCA-20260825-ABC12345"
            subprocess.run([
                "python", str(NEW_CASE),
                "--intake", str(intake),
                "--checks", str(CHECKS),
                "--cases-root", str(cases),
                "--case-id", case_id
            ], check=True, cwd=ROOT, capture_output=True, text=True)

            status = json.loads((cases / case_id / "status.json").read_text(encoding="utf-8"))
            self.assertEqual("1.1", status["contract_version"])
            self.assertEqual(case_id, status["case_id"])
            self.assertEqual("wartet_auf_start", status["state"])
            self.assertEqual("customer_check", status["delivery_document"])
            self.assertEqual(37, len(status["checks"]))
            self.assertTrue(all(x["workflow_status"] == "wartet" for x in status["checks"]))
            self.assertTrue(all(x["result_status"] is None for x in status["checks"]))
            for check in status["checks"]:
                self.assertEqual({"customer", "company", "academy"}, set(check["perspectives"]))
                self.assertTrue(all(v["status"] == "wartet" for v in check["perspectives"].values()))
            self.assertEqual({"customer_check", "company_check", "academy_full_analysis"}, set(status["documents"]))
            self.assertTrue(all(v["status"] == "wartet" for v in status["documents"].values()))

            evaluation = json.loads((cases / case_id / "evaluation.json").read_text(encoding="utf-8"))
            self.assertEqual(case_id, evaluation["case_id"])
            self.assertEqual(37, len(evaluation["checks"]))
            for check in evaluation["checks"]:
                self.assertIsNone(check["result_status"])
                self.assertEqual([], check["neutral_finding"]["pros"])
                self.assertEqual([], check["neutral_finding"]["cons"])
                self.assertEqual([], check["neutral_finding"]["open_points"])
                self.assertEqual([], check["neutral_finding"]["contradictions"])
                for perspective in ("customer", "company", "academy"):
                    self.assertEqual("", check[perspective]["summary"])
                    self.assertEqual([], check[perspective]["advantages"])
                    self.assertEqual([], check[perspective]["disadvantages"])
                    self.assertEqual([], check[perspective]["questions"])
                    self.assertEqual([], check[perspective]["recommendations"])

    def test_new_case_internal_start_sets_accepted_state(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            intake = tmp / "intake.json"
            cases = tmp / "cases"
            intake.write_text(json.dumps({
                "contract_version": "1.0",
                "traces": ["https://example.org/start"],
                "requested_output": "customer_check"
            }), encoding="utf-8")
            case_id = "PCA-20260825-DEF67890"
            subprocess.run([
                "python", str(NEW_CASE),
                "--intake", str(intake),
                "--checks", str(CHECKS),
                "--cases-root", str(cases),
                "--case-id", case_id,
                "--initial-state", "angenommen"
            ], check=True, cwd=ROOT, capture_output=True, text=True)
            status = json.loads((cases / case_id / "status.json").read_text(encoding="utf-8"))
            self.assertEqual("angenommen", status["state"])
            self.assertEqual("customer_check", status["delivery_document"])


if __name__ == "__main__":
    unittest.main()
