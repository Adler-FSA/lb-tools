#!/usr/bin/env python3
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENGINE = ROOT / "projekt-check-engine"
if str(ENGINE) not in sys.path:
    sys.path.insert(0, str(ENGINE))

from research.legal_candidates import extract_legal_candidates
from research.official_search import build_queries, host_matches_source, load_catalog, relation_score, select_sources


class OfficialVerificationTests(unittest.TestCase):
    def test_catalog_contains_core_official_sources(self):
        catalog = load_catalog()
        ids = {x["id"] for x in catalog["sources"]}
        self.assertGreaterEqual(len(ids), 15)
        for required in {"de_bafin", "eu_esma", "uk_fca", "uk_companies_house", "ae_vara", "ae_dfsa", "ae_sca", "ae_adgm_fsra", "us_sec"}:
            self.assertIn(required, ids)
        for source in catalog["sources"]:
            self.assertTrue(source["domains"])
            self.assertTrue(source["kind"])
            self.assertTrue(source["jurisdiction"])

    def test_extracts_entity_person_and_dubai_hint(self):
        evidence = {
            "items": [{
                "title": "U-TOPIA corporate overview",
                "text_excerpt": "Legal Entity: U-Topia Technologies FZCO. U-Topia CEO Emmanuel Quezada presented the Dubai roadmap. Kyle Kemper - Company President.",
            }]
        }
        candidates = extract_legal_candidates([evidence])
        entities = [x["name"].casefold() for x in candidates["entities"]]
        persons = [x["name"].casefold() for x in candidates["persons"]]
        jurisdictions = {x["jurisdiction"] for x in candidates["jurisdiction_hints"]}
        self.assertTrue(any("u-topia technologies fzco" in x for x in entities))
        self.assertIn("emmanuel quezada", persons)
        self.assertIn("kyle kemper", persons)
        self.assertIn("AE", jurisdictions)

    def test_dubai_context_activates_uae_regulators_and_bafin(self):
        catalog = load_catalog()
        selected = select_sources(
            catalog,
            "U-TOPIA fintech crypto virtual asset Dubai UAE",
            [{"jurisdiction":"AE","score":2,"terms":["dubai","uae"]}],
            german_customer=True,
            max_sources=12,
        )
        ids = {x["id"] for x in selected}
        self.assertIn("de_bafin", ids)
        self.assertIn("ae_vara", ids)
        self.assertIn("ae_dfsa", ids)
        self.assertIn("ae_sca", ids)
        self.assertIn("ae_adgm_fsra", ids)

    def test_official_host_matching_rejects_lookalikes(self):
        source = {"domains":["vara.ae"]}
        self.assertTrue(host_matches_source("https://www.vara.ae/en/licenses-and-register/public-register/", source))
        self.assertTrue(host_matches_source("https://sub.vara.ae/example", source))
        self.assertFalse(host_matches_source("https://vara.ae.example.com/fake", source))
        self.assertFalse(host_matches_source("https://evilvara.ae/fake", source))

    def test_registry_queries_use_exact_entity_and_official_site(self):
        source = {"domains":["find-and-update.company-information.service.gov.uk"], "kind":"registry"}
        rows = build_queries(
            source,
            label="U-Center",
            project_domains=["u.center"],
            distinctive_terms=["U-TOPIA"],
            entities=[{"name":"U-Topia Technologies Ltd"}],
            persons=[{"name":"Emmanuel Quezada"}],
        )
        queries = "\n".join(x["query"] for x in rows)
        self.assertIn('"U-Topia Technologies Ltd"', queries)
        self.assertIn("site:find-and-update.company-information.service.gov.uk", queries)

    def test_generic_project_name_alone_is_not_enough_relation(self):
        item = {"url":"https://www.vara.ae/example", "title":"U-Center", "snippet":"A different U-Center reference"}
        score, matches = relation_score(
            item,
            label="U-Center",
            project_domains=["u.center"],
            distinctive_terms=["U-TOPIA"],
            entities=[], persons=[],
        )
        self.assertLess(score, 4)
        self.assertTrue(any(x.startswith("label:") for x in matches))

    def test_distinctive_project_anchor_is_strong_relation(self):
        item = {"url":"https://www.vara.ae/example", "title":"Notice concerning U-TOPIA", "snippet":""}
        score, matches = relation_score(
            item,
            label="U-Center",
            project_domains=["u.center"],
            distinctive_terms=["U-TOPIA"],
            entities=[], persons=[],
        )
        self.assertGreaterEqual(score, 5)
        self.assertIn("anchor:U-TOPIA", matches)

    def test_main_workflow_runs_official_verification(self):
        text = (ROOT / ".github/workflows/projekt-check-neuer-fall.yml").read_text(encoding="utf-8")
        self.assertIn("run_official_verification.py", text)
        self.assertIn("official_verification", text)
        self.assertIn("Amtliche Verifikation", text)


if __name__ == "__main__":
    unittest.main()
