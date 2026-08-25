#!/usr/bin/env python3
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ROUTING = ROOT / "projekt-check-engine/evaluate/check-routing.json"
NEW_CASE = ROOT / "projekt-check-engine/core/new_case.py"
EVALUATE = ROOT / "projekt-check-engine/core/run_evaluation.py"
CHECKS = ROOT / "projekt-check-engine/checks/checks-37.json"


class EvaluationTests(unittest.TestCase):
    def test_routing_has_exactly_37_checks(self):
        data = json.loads(ROUTING.read_text(encoding="utf-8"))
        checks = data["checks"]
        self.assertEqual(37, len(checks))
        self.assertEqual(list(range(1, 38)), [x["id"] for x in checks])
        self.assertTrue(all("signals" in x and "primary_complete" in x for x in checks))

    def test_primary_pass_completes_only_supported_areas(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            cases = tmp / "cases"
            intake = tmp / "intake.json"
            case_id = "PCA-20260825-EVAL1234"
            intake.write_text(json.dumps({
                "contract_version":"1.0",
                "language":"de",
                "traces":["https://example.org/ref/abc"],
                "requested_output":"customer_check"
            }), encoding="utf-8")
            subprocess.run([
                "python", str(NEW_CASE), "--intake", str(intake), "--checks", str(CHECKS),
                "--cases-root", str(cases), "--case-id", case_id, "--initial-state", "angenommen"
            ], check=True, cwd=ROOT, capture_output=True, text=True)
            case = cases / case_id
            (case / "discovery.json").write_text(json.dumps({
                "schema_version":"1.1","case_id":case_id,"project_hosts":["example.org"],"evidence_count":3
            }), encoding="utf-8")
            (case / "evidence.json").write_text(json.dumps({
                "case_id":case_id,"schema_version":"1.0","evidence_count":3,"reachable_count":3,
                "source_type_counts":{"website":3},
                "items":[
                    {"evidence_id":"E001","source_type":"website","final_url":"https://example.org/","http_status":200,"title":"Example","h1":"Membership","meta_description":"Membership packages and affiliate rewards","text_excerpt":"Membership package price $100. Earn dividends. Affiliate referral commissions. DAO governance and blockchain education.","error":""},
                    {"evidence_id":"E002","source_type":"website","final_url":"https://example.org/terms","http_status":200,"title":"Terms","h1":"Terms","meta_description":"","text_excerpt":"Legal Entity: Example. Jurisdiction UAE. Beta platform; terms may change.","error":""},
                    {"evidence_id":"E003","source_type":"website","final_url":"https://example.org/privacy","http_status":200,"title":"Privacy","h1":"Privacy","meta_description":"","text_excerpt":"Legal entity placeholder - final legal entity name to be confirmed.","error":""}
                ]
            }), encoding="utf-8")
            subprocess.run([
                "python", str(EVALUATE), "--case-id", case_id, "--cases-root", str(cases)
            ], check=True, cwd=ROOT, capture_output=True, text=True)

            status = json.loads((case / "status.json").read_text(encoding="utf-8"))
            evaluation = json.loads((case / "evaluation.json").read_text(encoding="utf-8"))
            progress = json.loads((case / "evaluation-progress.json").read_text(encoding="utf-8"))
            self.assertEqual("auswertung", status["state"])
            self.assertEqual(37, len(status["checks"]))
            self.assertEqual(37, len(evaluation["checks"]))
            self.assertEqual({6,7,13,14,16,28,29}, set(progress["completed_ids"]))
            self.assertGreater(progress["running_count"], 0)
            self.assertGreater(progress["waiting_count"], 0)
            self.assertIsNone(status["overall_rating"])
            self.assertEqual("widerspruch", evaluation["checks"][8]["result_status"])
            self.assertEqual("laeuft", status["checks"][8]["workflow_status"])
            self.assertTrue(evaluation["checks"][8]["neutral_finding"]["contradictions"])
            for cid in progress["completed_ids"]:
                row = status["checks"][cid-1]
                self.assertEqual("abgeschlossen", row["workflow_status"])
                self.assertTrue(all(x["status"] == "abgeschlossen" for x in row["perspectives"].values()))
            for cid in progress["waiting_ids"]:
                row = status["checks"][cid-1]
                self.assertEqual("wartet", row["workflow_status"])
                self.assertIsNone(row["result_status"])


if __name__ == "__main__":
    unittest.main()
