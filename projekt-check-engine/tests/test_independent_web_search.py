#!/usr/bin/env python3
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MOD = ROOT / "projekt-check-engine/research/web_search.py"
spec = importlib.util.spec_from_file_location("web_search", MOD)
web_search = importlib.util.module_from_spec(spec)
spec.loader.exec_module(web_search)


class IndependentWebSearchTests(unittest.TestCase):
    def test_builds_seven_distinct_research_themes(self):
        q = web_search.build_queries("U-Center", ["u.center"])
        self.assertEqual(7, len(q))
        self.assertEqual({"identity","regulation","people","social","user","crypto","press"}, {x["theme"] for x in q})
        self.assertTrue(all("U-Center" in x["query"] for x in q))

    def test_parses_duckduckgo_redirect_without_treating_search_page_as_evidence(self):
        doc = '''<div class="result results_links"><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org%2Freport">Example Report</a><a class="result__snippet">Independent report about the project.</a></div>'''
        rows = web_search._parse_ddg(doc, "test")
        self.assertEqual(1, len(rows))
        self.assertEqual("https://example.org/report", rows[0]["url"])
        self.assertEqual("Example Report", rows[0]["title"])

    def test_classifies_authority_and_social_hosts(self):
        self.assertEqual("authority", web_search.classify_result("https://www.sec.gov/example"))
        self.assertEqual("authority", web_search.classify_result("https://www.bafin.de/example"))
        self.assertEqual("telegram", web_search.classify_result("https://t.me/example"))
        self.assertEqual("youtube", web_search.classify_result("https://www.youtube.com/watch?v=abc"))
        self.assertEqual("reddit", web_search.classify_result("https://www.reddit.com/r/test/"))


if __name__ == "__main__":
    unittest.main()
