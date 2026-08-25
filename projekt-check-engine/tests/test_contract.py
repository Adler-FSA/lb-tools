#!/usr/bin/env python3
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHECKS = ROOT / "projekt-check-engine/checks/checks-37.json"
NEW_CASE = ROOT / "projekt-check-engine/core/new_case.py"


class ProjectCheckContractTests(unittest.TestCase):
    def test_exactly_37_unique_checks(self):
        data = json.loads(CHECKS.read_text(encoding="utf-8"))
        checks = data["checks"]
        self.assertEqual(37, len(checks))
        self.assertEqual(list(range(1, 38)), [x["id"] for x in checks])
        self.assertEqual(37, len({x["key"] for x in checks}))

    def test_new_case_initializes_all_checks(self):
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
                "source": "projekt-check-web"
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
            self.assertEqual(case_id, status["case_id"])
            self.assertEqual("angenommen", status["state"])
            self.assertEqual(37, len(status["checks"]))
            self.assertTrue(all(x["status"] == "wartet" for x in status["checks"]))
            self.assertEqual("wartet", status["documents"]["user_check"]["status"])
            self.assertEqual("wartet", status["documents"]["full_analysis"]["status"])


if __name__ == "__main__":
    unittest.main()
