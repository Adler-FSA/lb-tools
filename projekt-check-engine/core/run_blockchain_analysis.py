#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
ENGINE_ROOT = ROOT / "projekt-check-engine"
if str(ENGINE_ROOT) not in sys.path:
    sys.path.insert(0, str(ENGINE_ROOT))

from identify.browser_probe import probe_urls
from research.blockchain_research import (
    analyze_technical_sources,
    explorer_chain,
    search_technical_traces,
    unique if False else norm,
)
from research.blockchain_research import _unique as unique

TARGET_COMPLETE = {30, 33}
TARGET_TOUCH = {12, 24, 30, 33}
BLOCKCHAIN_PREFIXES = (
    "Die Blockchain-/Krypto-Tiefenprüfung",
    "Die DeFi-Tiefenprüfung",
    "Die technischen Projektunterlagen",
    "Für die öffentlich behauptete Blockchain-",
    "Es wurde mindestens ein konkreter technischer Identifikator",
    "In den geprüften öffentlichen Quellen wurde kein konkreter technischer Identifikator",
    "Die technische Verwahrungsprüfung",
    "Als fehlender technischer Primärnachweis",
)


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def read(path: Path, default=None):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def host(url: str) -> str:
    h=(urlparse(str(url or "")).hostname or "").lower().strip(".")
    return h[4:] if h.startswith("www.") else h


def related_host(url: str, roots: set[str]) -> bool:
    h=host(url)
    return any(h==r or h.endswith("."+r) or r.endswith("."+h) for r in roots if r)


def add(values: list, text: str, limit: int = 12) -> list:
    return unique(list(values or [])+[text],limit)


def clean_previous(evaluation: dict) -> None:
    for check in evaluation.get("checks") or []:
        if int(check.get("id") or 0) not in TARGET_TOUCH:
            continue
        nf=check.get("neutral_finding") or {}
        for field in ("confirmed_facts","first_party_claims","pros","cons","open_points","contradictions"):
            nf[field]=[
                x for x in (nf.get(field) or [])
                if not any(str(x).startswith(prefix) for prefix in BLOCKCHAIN_PREFIXES)
            ]
        nf["evidence_refs"]=[x for x in (nf.get("evidence_refs") or []) if not str(x).startswith("B")]
        check["neutral_finding"]=nf


def project_items(primary: dict, discovery: dict, identity: dict) -> tuple[list[dict], set[str]]:
    roots={str(x).lower().removeprefix("www.") for x in discovery.get("project_hosts") or [] if x}
    primary_domain=str(identity.get("primary_domain") or "").lower().removeprefix("www.")
    if primary_domain:
        roots.add(primary_domain)
    if not roots:
        for item in primary.get("items") or []:
            title=" ".join([str(item.get("title") or ""),str(item.get("h1") or "")]).casefold()
            label=str(identity.get("label") or discovery.get("identity_label") or "").casefold().strip()
            if label and label in title:
                h=host(item.get("final_url") or item.get("requested_url"))
                if h: roots.add(h)
    selected=[]
    for item in primary.get("items") or []:
        url=item.get("final_url") or item.get("requested_url") or ""
        if roots and related_host(url,roots):
            selected.append(item)
    return selected,roots


def assign_b_evidence(probes: list[dict], search_rows: list[dict], start: int = 1) -> list[dict]:
    by_url={str(x.get("url") or "").split("#",1)[0].rstrip("/"):x for x in search_rows}
    out=[]
    idx=start
    for probe in probes:
        url=str(probe.get("final_url") or probe.get("requested_url") or "").split("#",1)[0].rstrip("/")
        row=by_url.get(url) or by_url.get(str(probe.get("requested_url") or "").split("#",1)[0].rstrip("/")) or {}
        out.append({
            "evidence_id":f"B{idx:03d}",
            "kind":"blockchain_web_capture",
            "scope":"technical_external",
            "provider":row.get("provider",""),
            "query":row.get("query",""),
            "search_title":row.get("title",""),
            "search_snippet":row.get("snippet",""),
            "requested_url":probe.get("requested_url",""),
            "final_url":probe.get("final_url",""),
            "captured_at":probe.get("captured_at",""),
            "http_status":probe.get("http_status"),
            "title":probe.get("title",""),
            "h1":probe.get("h1",""),
            "meta_description":probe.get("meta_description",""),
            "text_excerpt":probe.get("text_excerpt",""),
            "content_sha256":probe.get("content_sha256",""),
            "explorer_chain":explorer_chain(probe.get("final_url") or probe.get("requested_url") or ""),
            "error":probe.get("error",""),
        })
        idx+=1
    return out


def explorer_verification(items: list[dict], analysis: dict) -> list[dict]:
    out=[]
    explorer_items=[x for x in items if x.get("explorer_chain")]
    identifiers=analysis.get("identifiers") or []
    for item in explorer_items:
        text=" ".join([str(item.get("final_url") or ""),str(item.get("text_excerpt") or "")]).casefold()
        matched=[]
        for ident in identifiers:
            value=str(ident.get("value") or "")
            if value and value.casefold() in text:
                matched.append(value)
        status="reachable" if item.get("http_status")==200 and not item.get("error") else "not_verified"
        out.append({
            "evidence_ref":item.get("evidence_id"),
            "url":item.get("final_url") or item.get("requested_url"),
            "chain":item.get("explorer_chain"),
            "status":status,
            "matched_identifiers":matched,
            "note":"Ein erreichbarer Explorerbeleg bestätigt nur die technische Existenz/Anzeige eines Ziels; die Zuordnung zum Projekt und Kontrollrechte müssen separat belegt sein."
        })
    return out


def set_perspective(ev: dict, st: dict, cid: int, result: str, lang: str) -> None:
    nf=ev.get("neutral_finding") or {}
    if lang=="de":
        texts={
            30:{
                "customer":("Die Technikprüfung trennt Blockchain-Werbeaussagen von tatsächlich nachprüfbaren Chains, Adressen und Explorer-Daten.","Vor einer Entscheidung konkrete Chain, Contract-/Wallet-Adressen, Explorerlinks, Adminrechte und vorhandene Audits verlangen und selbst gegenprüfen."),
                "company":("Technische Blockchain-Aussagen sind extern erst dann gut prüfbar, wenn eindeutige Chains, Adressen, Explorerlinks und Kontrollrechte dokumentiert sind.","Technische Primärnachweise zentral veröffentlichen: Chain, Contract-/Wallet-Adressen, verifizierter Quellcode, Admin-/Proxyrechte, Mint/Pause/Vesting und Audits."),
                "academy":("Blockchain-Behauptung, Identifikator und Explorerbefund werden getrennt gewichtet; fehlende Identifikatoren sind eine Verifikationslücke, kein Negativbeweis.","Technische Existenz, Projektzuordnung, Kontrollrechte, Tokenomics, Liquidität und Auditstatus getrennt evidenzbasiert dokumentieren."),
            },
            33:{
                "customer":("DAO/DeFi-Begriffe werden nicht als funktionsfähige DeFi-Technik gewertet, solange DApp-/Contract-/Staking-/Lending-/Bridge-/Oracle-Strukturen nicht konkret nachprüfbar sind.","Bei DeFi-Funktionen konkrete Contracts, DApp-URLs, Pools, Oracles, Multisig und Governance-Mechanik vor Nutzung überprüfen."),
                "company":("DeFi- und Governance-Funktionen sollten technisch so dokumentiert sein, dass ein Außenstehender Contracts, Pools, Oracles, Multisig und Abstimmungslogik nachvollziehen kann.","Technische Architektur und öffentlich prüfbare Adressen statt nur Funktionsbegriffe veröffentlichen; nicht anwendbare DeFi-Bausteine klar kennzeichnen."),
                "academy":("DeFi-Funktionen werden je Baustein geprüft; DAO/Governance allein beweist weder Staking/Lending noch einen funktionsfähigen Smart-Contract-Stack.","DApp, LP, Staking, Lending, Bridges, Oracles, Multisig und Governance getrennt erfassen und mit On-Chain-Daten verknüpfen."),
            },
        }
    else:
        base=("Technical claims are separated from specific on-chain identifiers and independently reachable explorer evidence.","Require concrete chain, contract/wallet addresses, explorer links, control rights and audits before treating blockchain/DeFi claims as technically verified.")
        texts={30:{k:base for k in ("customer","company","academy")},33:{k:base for k in ("customer","company","academy")}}
    for kind in ("customer","company","academy"):
        summary,recommendation=texts[cid][kind]
        block=ev.get(kind) or {}
        block["summary"]=summary
        block["advantages"]=unique(block.get("advantages") or [],5)
        block["disadvantages"]=unique((block.get("disadvantages") or [])+(nf.get("open_points") or []),7)
        block["questions"]=unique(block.get("questions") or [],4)
        block["recommendations"]=[recommendation]
        ev[kind]=block
        st["perspectives"][kind].update({"status":"abgeschlossen","updated_at":now()})


def main() -> int:
    ap=argparse.ArgumentParser(description="Blockchain-, Krypto- und DeFi-Tiefenprüfung")
    ap.add_argument("--case-id",required=True)
    ap.add_argument("--cases-root",type=Path,default=ROOT/"data/projekt-check/cases")
    ap.add_argument("--max-captures",type=int,default=8)
    args=ap.parse_args()

    case_id=args.case_id.strip().upper(); case_dir=args.cases_root/case_id
    for name in ("status.json","evaluation.json","evidence.json","discovery.json","identity.json"):
        if not (case_dir/name).exists(): raise SystemExit(f"Benötigte Datei fehlt: {case_dir/name}")
    status=read(case_dir/"status.json"); evaluation=read(case_dir/"evaluation.json")
    primary=read(case_dir/"evidence.json",{"items":[]}) or {"items":[]}
    independent=read(case_dir/"independent-evidence.json",{"items":[]}) or {"items":[]}
    discovery=read(case_dir/"discovery.json",{}) or {}; identity=read(case_dir/"identity.json",{}) or {}
    indep_research=read(case_dir/"independent-research.json",{}) or {}; intake=read(case_dir/"intake.json",{}) or {}
    lang="en" if intake.get("language")=="en" else "de"
    clean_previous(evaluation)

    first_party,roots=project_items(primary,discovery,identity)
    external=[x for x in independent.get("items") or [] if not x.get("error")]
    initial=analyze_technical_sources(first_party,external)

    label=str(identity.get("label") or discovery.get("identity_label") or "")
    primary_domain=str(identity.get("primary_domain") or (sorted(roots)[0] if roots else ""))
    distinctive=[str(x) for x in indep_research.get("distinctive_terms") or []][:4]
    search=search_technical_traces(label,primary_domain,distinctive,max_results=max(1,args.max_captures))
    selected_urls=[]
    for row in search.get("results") or []:
        url=str(row.get("url") or "")
        if url and url not in selected_urls:
            selected_urls.append(url)
        if len(selected_urls)>=max(1,args.max_captures): break
    probes=probe_urls(selected_urls) if selected_urls else []
    b_items=assign_b_evidence(probes,search.get("results") or [])

    combined_external=external+b_items
    analysis=analyze_technical_sources(first_party,combined_external)
    verification=explorer_verification(b_items,analysis)
    verified=[x for x in verification if x.get("status")=="reachable" and x.get("matched_identifiers")]
    analysis.update({
        "schema_version":"1.0","case_id":case_id,"generated_at":now(),
        "project_hosts_used":sorted(roots),"identity_label":label,"primary_domain":primary_domain,
        "search_queries":search.get("queries") or [],"search_result_count":len(search.get("results") or []),
        "search_errors":search.get("errors") or [],"capture_count":len(b_items),
        "explorer_verification":verification,"verified_technical_target_count":len(verified),
        "principle":"Blockchain-/DeFi-Begriffe sind Eigenaussagen, bis konkrete technische Identifikatoren und unabhängige On-Chain-/Explorerbelege eine überprüfbare Zuordnung ermöglichen. Ein fehlender Identifikator ist eine Verifikationslücke, kein Beweis gegen die technische Existenz."
    })
    write(case_dir/"blockchain-research.json",analysis)
    write(case_dir/"blockchain-evidence.json",{"schema_version":"1.0","case_id":case_id,"items":b_items})

    st_by={int(x["id"]):x for x in status.get("checks") or []}; ev_by={int(x["id"]):x for x in evaluation.get("checks") or []}; ts=now()
    b_refs=[str(x.get("evidence_id")) for x in b_items if x.get("evidence_id")]

    # 30 Blockchain/Krypto
    st=st_by[30]; ev=ev_by[30]; nf=ev.get("neutral_finding") or {}
    if analysis.get("has_blockchain_claim"):
        nf["first_party_claims"]=add(nf.get("first_party_claims"),"Die technischen Projektunterlagen verwenden Blockchain-/On-Chain-/Ledger-Begriffe; diese werden nicht mit einer technisch bestätigten Implementierung gleichgesetzt.")
        if analysis.get("has_specific_technical_identifier"):
            nf["confirmed_facts"]=add(nf.get("confirmed_facts"),"Es wurde mindestens ein konkreter technischer Identifikator (z. B. Wallet-/Contract-/Explorer-Spur) in projektbezogenen öffentlichen Quellen gefunden; Projektzuordnung und Kontrollrechte werden separat gewichtet.")
        else:
            nf["open_points"]=add(nf.get("open_points"),"In den geprüften öffentlichen Quellen wurde kein konkreter technischer Identifikator gefunden, mit dem Chain, Contract, Wallet, Adminrechte, Tokenomics oder Auditstatus eindeutig on-chain verifiziert werden könnten.")
        result="offen"
    else:
        nf["confirmed_facts"]=add(nf.get("confirmed_facts"),"Die Blockchain-/Krypto-Tiefenprüfung wurde durchgeführt; in den geprüften Quellen wurde kein hinreichend konkreter Blockchain-/Token-/Contract-Befund für dieses Angebot erkannt.")
        result="kein_befund"
    if b_refs:
        nf["evidence_refs"]=unique((nf.get("evidence_refs") or [])+b_refs,20)
    ev["neutral_finding"]=nf; ev["result_status"]=result
    st.update({"workflow_status":"abgeschlossen","result_status":result,"summary":f"Blockchain-/Krypto-Tiefenprüfung abgeschlossen · {analysis.get('first_party_identifier_count',0)} projektseitige technische Identifikatoren · {analysis.get('verified_technical_target_count',0)} Explorer-Ziele technisch verifiziert.","finished_at":ts,"updated_at":ts})
    set_perspective(ev,st,30,result,lang)

    # 33 DeFi
    st=st_by[33]; ev=ev_by[33]; nf=ev.get("neutral_finding") or {}
    if analysis.get("has_defi_claim"):
        nf["first_party_claims"]=add(nf.get("first_party_claims"),"Die technischen Projektunterlagen verwenden DAO-/Governance- bzw. weitere DeFi-Begriffe; daraus allein folgt kein Nachweis funktionsfähiger DApp-, Staking-, Lending-, Bridge-, Oracle- oder Multisig-Strukturen.")
        nf["open_points"]=add(nf.get("open_points"),"Für die öffentlich behauptete Blockchain-/DAO-/Governance-Struktur müssen konkrete Contracts, DApp-/Explorerziele und – soweit anwendbar – LP-, Staking-, Lending-, Bridge-, Oracle- und Multisig-Nachweise technisch zuordenbar sein.")
        result="offen"
    else:
        nf["confirmed_facts"]=add(nf.get("confirmed_facts"),"Die DeFi-Tiefenprüfung wurde durchgeführt; in den geprüften Quellen wurde kein hinreichend konkreter DeFi-Funktionsbefund erkannt.")
        result="kein_befund"
    if b_refs:
        nf["evidence_refs"]=unique((nf.get("evidence_refs") or [])+b_refs,20)
    ev["neutral_finding"]=nf; ev["result_status"]=result
    st.update({"workflow_status":"abgeschlossen","result_status":result,"summary":f"DeFi-Tiefenprüfung abgeschlossen · erkannte Begriffe: {', '.join(analysis.get('defi_terms') or []) or 'keine'} · technische Nachweise separat gewichtet.","finished_at":ts,"updated_at":ts})
    set_perspective(ev,st,33,result,lang)

    # 12 technical custody subfinding stays running until legal/customer claim is reconciled.
    st=st_by[12]; ev=ev_by[12]; nf=ev.get("neutral_finding") or {}
    if analysis.get("has_blockchain_claim"):
        if analysis.get("has_specific_technical_identifier"):
            nf["first_party_claims"]=add(nf.get("first_party_claims"),"Die technische Verwahrungsprüfung hat konkrete Wallet-/Contract-/Explorer-Identifikatoren gefunden; wer darüber verfügt und welchen Rechtsanspruch der Kunde hat, bleibt separat zu verifizieren.")
        else:
            nf["open_points"]=add(nf.get("open_points"),"Die technische Verwahrungsprüfung kann die behaupteten Blockchain-Transaktionen derzeit keiner konkret benannten Chain, Wallet oder Contract-Adresse eindeutig zuordnen.")
    if b_refs:
        nf["evidence_refs"]=unique((nf.get("evidence_refs") or [])+b_refs,20)
    ev["neutral_finding"]=nf
    if st.get("workflow_status")!="abgeschlossen":
        st.update({"workflow_status":"laeuft","summary":"Wirtschaftlicher Geldfluss und Blockchain-Unterbau geprüft; technische Kontrolle, Verwahrung und Rechtsanspruch bleiben gemeinsam in Vertiefung.","updated_at":ts})
        for kind in ("customer","company","academy"):
            st["perspectives"][kind].update({"status":"laeuft","updated_at":ts})

    # 24 explicit missing primary technical evidence, without changing its final workflow state.
    ev=ev_by[24]; nf=ev.get("neutral_finding") or {}
    if analysis.get("has_blockchain_claim") and not analysis.get("has_specific_technical_identifier"):
        nf["open_points"]=add(nf.get("open_points"),"Als fehlender technischer Primärnachweis sind insbesondere konkrete Chain-/Contract-/Wallet-/Explorerangaben sowie – soweit relevant – Adminrechte, Tokenomics, Liquidität und Auditunterlagen zu klären.")
    ev["neutral_finding"]=nf

    evaluation["updated_at"]=ts; status["updated_at"]=ts; status["state"]="auswertung"
    write(case_dir/"evaluation.json",evaluation); write(case_dir/"status.json",status)
    print(json.dumps({"case_id":case_id,"check_30":st_by[30]["result_status"],"check_33":st_by[33]["result_status"],"first_party_identifiers":analysis.get("first_party_identifier_count",0),"verified_targets":len(verified)},ensure_ascii=False))
    return 0


if __name__=="__main__":
    raise SystemExit(main())
