#!/usr/bin/env python3
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
ENGINE=ROOT/"projekt-check-engine"
if str(ENGINE) not in sys.path:
    sys.path.insert(0,str(ENGINE))

from evaluate.economic_analysis import analyze_economics, implied_claim_rate, percent_claims


class EconomicAnalysisTests(unittest.TestCase):
    def test_daily_percent_is_math_not_forecast(self):
        rows=percent_claims("The plan states a 2% daily return.","E001","first_party")
        self.assertEqual(1,len(rows))
        self.assertEqual("daily",rows[0]["period"])
        self.assertEqual(730.0,rows[0]["simple_annual_percent"])
        self.assertIn("keine Prognose",rows[0]["calculation_note"])

    def test_unrelated_percent_is_not_return(self):
        self.assertEqual([],percent_claims("Our service achieved 99% uptime last year.","E001","first_party"))

    def test_customer_claim_can_be_implied_but_stays_claim(self):
        row=implied_claim_rate("Bei 400 Euro bekomme ich täglich 8 Euro Rendite.")
        self.assertIsNotNone(row)
        self.assertEqual("customer_supplied_claim",row["source"])
        self.assertEqual(400.0,row["principal"])
        self.assertEqual(8.0,row["periodic_amount"])
        self.assertEqual(2.0,row["implied_periodic_rate_percent"])
        self.assertEqual(730.0,row["simple_annual_percent"])
        self.assertIn("kein Projektbeleg",row["note"])

    def test_dividend_language_without_rate_does_not_invent_rate(self):
        primary={"items":[{
            "evidence_id":"E002","final_url":"https://u.center/","title":"U-Center",
            "text_excerpt":"Membership packages: $25, $100, $250. Earn Dividends. Get rewarded for invites."
        }]}
        discovery={"project_hosts":["u.center"],"crawl_rounds":[]}
        result=analyze_economics(primary=primary,independent={"items":[]},discovery=discovery,intake={"claim":""})
        self.assertIn("dividends",result["return_language"])
        self.assertEqual([],result["first_party_percent_claims"])
        self.assertIn("E002",result["refs"]["returns"])

    def test_unrelated_external_primary_page_is_not_first_party(self):
        primary={"items":[
            {"evidence_id":"E001","final_url":"https://u.center/","text_excerpt":"Earn dividends."},
            {"evidence_id":"E999","final_url":"https://stripe.com/","text_excerpt":"Trading return 50% daily."},
        ]}
        discovery={"project_hosts":["u.center"],"crawl_rounds":[]}
        result=analyze_economics(primary=primary,independent={"items":[]},discovery=discovery,intake={})
        self.assertEqual(1,result["first_party_item_count"])
        self.assertEqual([],result["first_party_percent_claims"])

    def test_april_learning_and_privacy_trade_are_not_economic_signals(self):
        primary={"items":[{
            "evidence_id":"E001","final_url":"https://u.center/privacy","title":"U-Center",
            "text_excerpt":"Last updated April 2026. Learning comes first. We do not sell, rent, or trade your personal data."
        }]}
        discovery={"project_hosts":["u.center"],"crawl_rounds":[]}
        result=analyze_economics(primary=primary,independent={"items":[]},discovery=discovery,intake={})
        self.assertNotIn("apr",result["return_language"])
        self.assertNotIn("earn",result["return_language"])
        self.assertEqual([],result["trading_language"])

    def test_old_case_can_infer_project_host_from_identity_label(self):
        primary={"items":[
            {"evidence_id":"E001","final_url":"https://u.center/","title":"U-Center","text_excerpt":"Earn dividends."},
            {"evidence_id":"E002","final_url":"https://u.center/privacy","title":"U-Center","text_excerpt":"Package purchases are completed via blockchain transactions from your own wallet."},
            {"evidence_id":"E999","final_url":"https://stripe.com/privacy","title":"Privacy Policy","text_excerpt":"Stripe privacy."},
        ]}
        discovery={"identity_label":"U-Center","crawl_rounds":[]}
        result=analyze_economics(primary=primary,independent={"items":[]},discovery=discovery,intake={})
        self.assertEqual(["u.center"],result["project_hosts_used"])
        self.assertEqual(2,result["first_party_item_count"])
        self.assertTrue(result["facts"]["package_purchase_from_own_wallet_claimed"])

    def test_main_workflow_runs_economic_analysis(self):
        text=(ROOT/".github/workflows/projekt-check-neuer-fall.yml").read_text(encoding="utf-8")
        self.assertIn("run_economic_analysis.py",text)
        self.assertIn("economic_analysis",text)


if __name__=="__main__":
    unittest.main()
