#!/usr/bin/env python3
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
ENGINE=ROOT/"projekt-check-engine"
if str(ENGINE) not in sys.path:
    sys.path.insert(0,str(ENGINE))

from research.payment_research import feature_claims, extract_payment_identifiers, analyze_payment_sources, build_payment_queries


class PaymentResearchTests(unittest.TestCase):
    def test_privacy_exclusion_is_not_a_payment_feature_claim(self):
        text="We do not collect or store payment card numbers, bank account credentials, IBAN or SWIFT details."
        self.assertEqual([],feature_claims(text))

    def test_disclaimer_is_not_a_payment_feature_claim(self):
        text="This page does not constitute financial, investment, banking, legal or tax advice."
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

    def test_swift_reviews_stays_false_even_inside_long_finance_category_text(self):
        text="Bank Of Tron Reviews Crypto News Wallets Reviews Digital Course Reviews Swift Reviews Coaching Programs"
        rows=feature_claims(text)
        terms={x for row in rows for x in row.get("terms",[])}
        self.assertNotIn("swift",terms)

    def test_real_swift_context_is_detected(self):
        rows=feature_claims("International bank transfers use an IBAN and SWIFT code.")
        terms={x for row in rows for x in row.get("terms",[])}
        self.assertIn("swift",terms)
        self.assertIn("iban",terms)

    def test_bin_requires_bin_context(self):
        self.assertEqual([],extract_payment_identifiers("Reference 12345678 was created.","E001","first_party"))
        rows=extract_payment_identifiers("Card BIN: 12345678","E001","first_party")
        self.assertEqual(1,len(rows))
        self.assertEqual("bin_iin",rows[0]["type"])

    def test_external_banking_claim_does_not_become_first_party_claim(self):
        result=analyze_payment_sources([], [{"evidence_id":"W001","final_url":"https://example.test/x","text_excerpt":"U-TOPIA is presented as the future of banking with a card."}])
        self.assertFalse(result["has_first_party_payment_claim"])
        self.assertTrue(result["has_external_payment_claim"])

    def test_duplicate_external_url_counts_as_one_source(self):
        items=[
            {"evidence_id":"W001","final_url":"https://example.test/x","text_excerpt":"The app is presented with a virtual card."},
            {"evidence_id":"P001","final_url":"https://example.test/x/","text_excerpt":"The app is presented with a virtual card."},
        ]
        result=analyze_payment_sources([],items)
        self.assertEqual(1,result["external_claim_source_count"])

    def test_payment_queries_use_project_label_as_second_anchor(self):
        rows=build_payment_queries("U-Center","u.center",["U-TOPIA","U-AI","BETA NOTICE"])
        self.assertTrue(rows)
        self.assertTrue(all('U-Center' in row for row in rows))
        self.assertTrue(all('U-AI' not in row for row in rows))

    def test_runner_is_syntactically_valid_and_uses_source_counts(self):
        path=ROOT/"projekt-check-engine/core/run_payment_depth.py"
        text=path.read_text(encoding="utf-8")
        compile(text,str(path),"exec")
        self.assertIn('payment-research.json',text)
        self.assertIn('payment-evidence.json',text)
        self.assertIn("first_party_claim_source_count",text)
        self.assertIn("external_claim_source_count",text)
        self.assertIn("Quellen mit Payment-Bezug",text)

    def test_main_workflow_runs_payment_depth(self):
        text=(ROOT/".github/workflows/projekt-check-neuer-fall.yml").read_text(encoding="utf-8")
        self.assertIn("run_payment_depth.py",text)
        self.assertIn("payment_depth",text)
        self.assertIn("Karten-/Banking-/Payment-Tiefenprüfung",text)


if __name__=="__main__":
    unittest.main()
