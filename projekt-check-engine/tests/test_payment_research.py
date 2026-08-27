#!/usr/bin/env python3
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
ENGINE=ROOT/"projekt-check-engine"
if str(ENGINE) not in sys.path:
    sys.path.insert(0,str(ENGINE))

from research.payment_research import feature_claims, extract_payment_identifiers, analyze_payment_sources


class PaymentResearchTests(unittest.TestCase):
    def test_privacy_exclusion_is_not_a_payment_feature_claim(self):
        text="We do not collect or store payment card numbers, bank account credentials, IBAN or SWIFT details."
        self.assertEqual([],feature_claims(text))

    def test_concrete_card_and_iban_feature_is_detected(self):
        rows=feature_claims("Members will receive a virtual debit card and a personal IBAN for payments.")
        self.assertTrue(rows)
        terms={x for row in rows for x in row.get("terms",[])}
        self.assertIn("debit card",terms)
        self.assertIn("iban",terms)

    def test_dividend_payments_are_not_payment_infrastructure(self):
        self.assertEqual([],feature_claims("Dividend payments are expected to begin in October 2026."))

    def test_isolated_swift_word_is_not_swift_payment_infrastructure(self):
        self.assertEqual([],feature_claims("Our category list includes Swift Reviews and other topics."))

    def test_bin_requires_bin_context(self):
        self.assertEqual([],extract_payment_identifiers("Reference 12345678 was created.","E001","first_party"))
        rows=extract_payment_identifiers("Card BIN: 12345678","E001","first_party")
        self.assertEqual(1,len(rows))
        self.assertEqual("bin_iin",rows[0]["type"])

    def test_external_banking_claim_does_not_become_first_party_claim(self):
        result=analyze_payment_sources([], [{"evidence_id":"W001","text_excerpt":"U-TOPIA is presented as the future of banking with a card."}])
        self.assertFalse(result["has_first_party_payment_claim"])
        self.assertTrue(result["has_external_payment_claim"])

    def test_runner_is_syntactically_valid(self):
        path=ROOT/"projekt-check-engine/core/run_payment_depth.py"
        text=path.read_text(encoding="utf-8")
        compile(text,str(path),"exec")
        self.assertIn('payment-research.json',text)
        self.assertIn('payment-evidence.json',text)

    def test_main_workflow_runs_payment_depth(self):
        text=(ROOT/".github/workflows/projekt-check-neuer-fall.yml").read_text(encoding="utf-8")
        self.assertIn("run_payment_depth.py",text)
        self.assertIn("payment_depth",text)
        self.assertIn("Karten-/Banking-/Payment-Tiefenprüfung",text)


if __name__=="__main__":
    unittest.main()
