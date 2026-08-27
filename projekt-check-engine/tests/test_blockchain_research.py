#!/usr/bin/env python3
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
ENGINE=ROOT/"projekt-check-engine"
if str(ENGINE) not in sys.path:
    sys.path.insert(0,str(ENGINE))

from research.blockchain_research import analyze_technical_sources, extract_identifiers, matching_terms, DEFI_TERMS


class BlockchainResearchTests(unittest.TestCase):
    def test_evm_address_is_detected_as_specific_identifier(self):
        address="0x1234567890abcdef1234567890abcdef12345678"
        rows=extract_identifiers(f"Smart contract address: {address}","E001","first_party")
        self.assertEqual(1,len(rows))
        self.assertEqual("evm_address",rows[0]["type"])
        self.assertEqual("contract_candidate",rows[0]["role"])

    def test_transaction_hash_is_not_partially_detected_as_address(self):
        tx="0x"+("ab"*32)
        rows=extract_identifiers(f"Transaction hash: {tx}","E001","first_party")
        self.assertEqual(1,len(rows))
        self.assertEqual("evm_tx_hash",rows[0]["type"])

    def test_stakeholder_is_not_staking(self):
        self.assertNotIn("staking",matching_terms("stakeholder capitalism and shared ownership",DEFI_TERMS))

    def test_public_blockchain_claim_without_address_is_not_technical_identifier(self):
        primary=[{"evidence_id":"E001","final_url":"https://example.test/","text_excerpt":"Every transaction lives on a public blockchain. DAO governance is transparent."}]
        result=analyze_technical_sources(primary,[])
        self.assertTrue(result["has_blockchain_claim"])
        self.assertTrue(result["has_defi_claim"])
        self.assertFalse(result["has_specific_technical_identifier"])
        self.assertEqual(0,result["first_party_identifier_count"])

    def test_external_address_does_not_become_first_party_identifier(self):
        address="0x1234567890abcdef1234567890abcdef12345678"
        result=analyze_technical_sources([], [{"evidence_id":"W001","text_excerpt":f"Possible contract {address}"}])
        self.assertEqual(0,result["first_party_identifier_count"])
        self.assertFalse(result["has_specific_technical_identifier"])

    def test_runner_is_syntactically_valid_and_writes_technical_files(self):
        path=ROOT/"projekt-check-engine/core/run_blockchain_depth.py"
        text=path.read_text(encoding="utf-8")
        compile(text,str(path),"exec")
        self.assertIn("blockchain-research.json",text)
        self.assertIn("blockchain-evidence.json",text)

    def test_main_workflow_runs_blockchain_depth(self):
        text=(ROOT/".github/workflows/projekt-check-neuer-fall.yml").read_text(encoding="utf-8")
        self.assertIn("run_blockchain_depth.py",text)
        self.assertIn("blockchain_depth",text)


if __name__=="__main__":
    unittest.main()
