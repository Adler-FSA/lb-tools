#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[2]
ENGINE=ROOT/"projekt-check-engine"
if str(ENGINE) not in sys.path:
    sys.path.insert(0,str(ENGINE))

from identify.browser_probe import probe_urls
from research.blockchain_research import analyze_technical_sources, explorer_chain, search_technical_traces, _unique as unique

PREFIXES=(
    "Die Blockchain-/Krypto-Tiefenprüfung", "Die DeFi-Tiefenprüfung", "Die technischen Projektunterlagen",
    "Für die öffentlich behauptete Blockchain-", "Es wurde mindestens ein konkreter technischer Identifikator",
    "In den geprüften öffentlichen Quellen wurde kein konkreter technischer Identifikator",
    "Die technische Verwahrungsprüfung", "Als fehlender technischer Primärnachweis",
)


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00","Z")


def read(path, default=None):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def write(path, data):
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")


def host(url):
    h=(urlparse(str(url or "")).hostname or "").lower().strip(".")
    return h[4:] if h.startswith("www.") else h


def related(url, roots):
    h=host(url)
    return any(h==r or h.endswith("."+r) or r.endswith("."+h) for r in roots if r)


def add(values, text, limit=12):
    return unique(list(values or [])+[text],limit)


def clean(evaluation):
    for check in evaluation.get("checks") or []:
        if int(check.get("id") or 0) not in {12,24,30,33}:
            continue
        nf=check.get("neutral_finding") or {}
        for field in ("confirmed_facts","first_party_claims","pros","cons","open_points","contradictions"):
            nf[field]=[x for x in (nf.get(field) or []) if not any(str(x).startswith(p) for p in PREFIXES)]
        nf["evidence_refs"]=[x for x in (nf.get("evidence_refs") or []) if not str(x).startswith("B")]
        check["neutral_finding"]=nf


def select_project_items(primary, discovery, identity):
    roots={str(x).lower().removeprefix("www.") for x in discovery.get("project_hosts") or [] if x}
    pd=str(identity.get("primary_domain") or "").lower().removeprefix("www.")
    if pd: roots.add(pd)
    label=str(identity.get("label") or discovery.get("identity_label") or "").casefold().strip()
    if not roots and label:
        for item in primary.get("items") or []:
            header=" ".join([str(item.get("title") or ""),str(item.get("h1") or "")]).casefold()
            if label in header:
                h=host(item.get("final_url") or item.get("requested_url"))
                if h: roots.add(h)
    return [x for x in (primary.get("items") or []) if roots and related(x.get("final_url") or x.get("requested_url"),roots)],roots


def make_b_items(probes, search_rows):
    by_url={str(x.get("url") or "").split("#",1)[0].rstrip("/"):x for x in search_rows}
    out=[]
    for i,p in enumerate(probes,1):
        requested=str(p.get("requested_url") or "")
        final=str(p.get("final_url") or requested)
        row=by_url.get(final.split("#",1)[0].rstrip("/")) or by_url.get(requested.split("#",1)[0].rstrip("/")) or {}
        out.append({
            "evidence_id":f"B{i:03d}","kind":"blockchain_web_capture","scope":"technical_external",
            "provider":row.get("provider",""),"query":row.get("query",""),"search_title":row.get("title",""),
            "search_snippet":row.get("snippet",""),"requested_url":requested,"final_url":final,
            "captured_at":p.get("captured_at",""),"http_status":p.get("http_status"),"title":p.get("title",""),
            "h1":p.get("h1",""),"meta_description":p.get("meta_description",""),"text_excerpt":p.get("text_excerpt",""),
            "content_sha256":p.get("content_sha256",""),"explorer_chain":explorer_chain(final),"error":p.get("error","")
        })
    return out


def set_completed(st, ev, cid, result, summary, lang):
    ts=now(); st.update({"workflow_status":"abgeschlossen","result_status":result,"summary":summary,"finished_at":ts,"updated_at":ts})
    ev["result_status"]=result
    if lang=="de":
        if cid==30:
            texts={
                "customer":("Blockchain-Begriffe werden von konkret nachprüfbaren Chains, Adressen und Explorer-Daten getrennt.","Vor einer Entscheidung konkrete Chain, Contract-/Wallet-Adressen, Explorerlinks, Adminrechte und Audits gegenprüfen."),
                "company":("Technische Blockchain-Aussagen sind extern erst mit eindeutigen Chains, Adressen, Explorerlinks und Kontrollrechten belastbar prüfbar.","Chain, Contract-/Wallet-Adressen, Quellcode, Admin-/Proxyrechte, Mint/Pause/Vesting und Audits zentral dokumentieren."),
                "academy":("Blockchain-Behauptung, Identifikator und Explorerbefund werden getrennt gewichtet; fehlende Identifikatoren sind eine Verifikationslücke, kein Negativbeweis.","Technische Existenz, Projektzuordnung, Kontrollrechte, Tokenomics, Liquidität und Auditstatus getrennt dokumentieren."),
            }
        else:
            texts={
                "customer":("DAO/DeFi-Begriffe gelten nicht als funktionsfähige DeFi-Technik, solange konkrete DApp-/Contract-/Pool-/Oracle-Strukturen fehlen.","Bei DeFi-Funktionen Contracts, DApp-URLs, Pools, Oracles, Multisig und Governance-Mechanik prüfen."),
                "company":("DeFi- und Governance-Funktionen sollten so dokumentiert sein, dass Contracts, Pools, Oracles, Multisig und Abstimmungslogik extern nachvollziehbar sind.","Technische Architektur und öffentliche Adressen statt nur Funktionsbegriffe veröffentlichen."),
                "academy":("DAO/Governance allein beweist weder Staking/Lending noch einen funktionsfähigen Smart-Contract-Stack.","DApp, LP, Staking, Lending, Bridges, Oracles, Multisig und Governance getrennt erfassen und mit On-Chain-Daten verknüpfen."),
            }
    else:
        base=("Technical claims are separated from specific on-chain identifiers and reachable explorer evidence.","Require concrete chain, contract/wallet addresses, explorer links, control rights and audits before treating claims as technically verified.")
        texts={k:base for k in ("customer","company","academy")}
    nf=ev.get("neutral_finding") or {}
    for kind in ("customer","company","academy"):
        s,r=texts[kind]; block=ev.get(kind) or {}
        block["summary"]=s; block["advantages"]=unique(block.get("advantages") or [],5)
        block["disadvantages"]=unique((block.get("disadvantages") or [])+(nf.get("open_points") or []),7)
        block["questions"]=unique(block.get("questions") or [],4); block["recommendations"]=[r]; ev[kind]=block
        st["perspectives"][kind].update({"status":"abgeschlossen","updated_at":ts})


def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--case-id",required=True); ap.add_argument("--cases-root",type=Path,default=ROOT/"data/projekt-check/cases"); ap.add_argument("--max-captures",type=int,default=8)
    args=ap.parse_args(); case_id=args.case_id.strip().upper(); case_dir=args.cases_root/case_id
    for name in ("status.json","evaluation.json","evidence.json","discovery.json","identity.json"):
        if not (case_dir/name).exists(): raise SystemExit(f"Benötigte Datei fehlt: {case_dir/name}")
    status=read(case_dir/"status.json"); evaluation=read(case_dir/"evaluation.json"); primary=read(case_dir/"evidence.json",{"items":[]}) or {"items":[]}
    independent=read(case_dir/"independent-evidence.json",{"items":[]}) or {"items":[]}; discovery=read(case_dir/"discovery.json",{}) or {}; identity=read(case_dir/"identity.json",{}) or {}
    indep_research=read(case_dir/"independent-research.json",{}) or {}; intake=read(case_dir/"intake.json",{}) or {}; lang="en" if intake.get("language")=="en" else "de"
    clean(evaluation)

    first_party,roots=select_project_items(primary,discovery,identity); external=[x for x in (independent.get("items") or []) if not x.get("error")]
    label=str(identity.get("label") or discovery.get("identity_label") or ""); domain=str(identity.get("primary_domain") or (sorted(roots)[0] if roots else "")); distinctive=[str(x) for x in indep_research.get("distinctive_terms") or []][:4]
    search=search_technical_traces(label,domain,distinctive,max_results=max(1,args.max_captures)); urls=[]
    for row in search.get("results") or []:
        u=str(row.get("url") or "")
        if u and u not in urls: urls.append(u)
        if len(urls)>=max(1,args.max_captures): break
    probes=probe_urls(urls) if urls else []; b_items=make_b_items(probes,search.get("results") or [])
    analysis=analyze_technical_sources(first_party,external+b_items)
    verified=[]
    for item in b_items:
        if not item.get("explorer_chain") or item.get("http_status")!=200 or item.get("error"): continue
        blob=" ".join([str(item.get("final_url") or ""),str(item.get("text_excerpt") or "")]).casefold(); matches=[]
        for ident in analysis.get("identifiers") or []:
            value=str(ident.get("value") or "")
            if value and value.casefold() in blob: matches.append(value)
        if matches: verified.append({"evidence_ref":item.get("evidence_id"),"url":item.get("final_url"),"chain":item.get("explorer_chain"),"matched_identifiers":matches})
    analysis.update({"schema_version":"1.0","case_id":case_id,"generated_at":now(),"project_hosts_used":sorted(roots),"identity_label":label,"primary_domain":domain,
        "search_queries":search.get("queries") or [],"search_result_count":len(search.get("results") or []),"search_errors":search.get("errors") or [],"capture_count":len(b_items),
        "verified_technical_targets":verified,"verified_technical_target_count":len(verified),
        "principle":"Blockchain-/DeFi-Begriffe sind Eigenaussagen, bis konkrete technische Identifikatoren und unabhängige On-Chain-/Explorerbelege eine überprüfbare Zuordnung ermöglichen. Ein fehlender Identifikator ist eine Verifikationslücke, kein Beweis gegen die technische Existenz."})
    write(case_dir/"blockchain-research.json",analysis); write(case_dir/"blockchain-evidence.json",{"schema_version":"1.0","case_id":case_id,"items":b_items})

    st_by={int(x["id"]):x for x in status.get("checks") or []}; ev_by={int(x["id"]):x for x in evaluation.get("checks") or []}; b_refs=[x.get("evidence_id") for x in b_items if x.get("evidence_id")]

    st=st_by[30]; ev=ev_by[30]; nf=ev.get("neutral_finding") or {}
    if analysis.get("has_blockchain_claim"):
        nf["first_party_claims"]=add(nf.get("first_party_claims"),"Die technischen Projektunterlagen verwenden Blockchain-/On-Chain-/Ledger-Begriffe; diese werden nicht mit einer technisch bestätigten Implementierung gleichgesetzt.")
        if analysis.get("has_specific_technical_identifier"):
            nf["confirmed_facts"]=add(nf.get("confirmed_facts"),"Es wurde mindestens ein konkreter technischer Identifikator in projektbezogenen öffentlichen Quellen gefunden; Projektzuordnung und Kontrollrechte werden separat gewichtet.")
        else:
            nf["open_points"]=add(nf.get("open_points"),"In den geprüften öffentlichen Quellen wurde kein konkreter technischer Identifikator gefunden, mit dem Chain, Contract, Wallet, Adminrechte, Tokenomics oder Auditstatus eindeutig on-chain verifiziert werden könnten.")
        result30="offen"
    else:
        nf["confirmed_facts"]=add(nf.get("confirmed_facts"),"Die Blockchain-/Krypto-Tiefenprüfung wurde durchgeführt; in den geprüften Quellen wurde kein hinreichend konkreter Blockchain-/Token-/Contract-Befund erkannt."); result30="kein_befund"
    nf["evidence_refs"]=unique((nf.get("evidence_refs") or [])+b_refs,20); ev["neutral_finding"]=nf
    set_completed(st,ev,30,result30,f"Blockchain-/Krypto-Tiefenprüfung abgeschlossen · {analysis.get('first_party_identifier_count',0)} projektseitige technische Identifikatoren · {len(verified)} Explorer-Ziele technisch verifiziert.",lang)

    st=st_by[33]; ev=ev_by[33]; nf=ev.get("neutral_finding") or {}
    if analysis.get("has_defi_claim"):
        nf["first_party_claims"]=add(nf.get("first_party_claims"),"Die technischen Projektunterlagen verwenden DAO-/Governance- bzw. weitere DeFi-Begriffe; daraus allein folgt kein Nachweis funktionsfähiger DApp-, Staking-, Lending-, Bridge-, Oracle- oder Multisig-Strukturen.")
        nf["open_points"]=add(nf.get("open_points"),"Für die öffentlich behauptete Blockchain-/DAO-/Governance-Struktur müssen konkrete Contracts, DApp-/Explorerziele und – soweit anwendbar – LP-, Staking-, Lending-, Bridge-, Oracle- und Multisig-Nachweise technisch zuordenbar sein."); result33="offen"
    else:
        nf["confirmed_facts"]=add(nf.get("confirmed_facts"),"Die DeFi-Tiefenprüfung wurde durchgeführt; in den geprüften Quellen wurde kein hinreichend konkreter DeFi-Funktionsbefund erkannt."); result33="kein_befund"
    nf["evidence_refs"]=unique((nf.get("evidence_refs") or [])+b_refs,20); ev["neutral_finding"]=nf
    set_completed(st,ev,33,result33,f"DeFi-Tiefenprüfung abgeschlossen · erkannte Begriffe: {', '.join(analysis.get('defi_terms') or []) or 'keine'} · technische Nachweise separat gewichtet.",lang)

    st=st_by[12]; ev=ev_by[12]; nf=ev.get("neutral_finding") or {}
    if analysis.get("has_blockchain_claim"):
        if analysis.get("has_specific_technical_identifier"):
            nf["first_party_claims"]=add(nf.get("first_party_claims"),"Die technische Verwahrungsprüfung hat konkrete Wallet-/Contract-/Explorer-Identifikatoren gefunden; wer darüber verfügt und welchen Rechtsanspruch der Kunde hat, bleibt separat zu verifizieren.")
        else:
            nf["open_points"]=add(nf.get("open_points"),"Die technische Verwahrungsprüfung kann die behaupteten Blockchain-Transaktionen derzeit keiner konkret benannten Chain, Wallet oder Contract-Adresse eindeutig zuordnen.")
    nf["evidence_refs"]=unique((nf.get("evidence_refs") or [])+b_refs,20); ev["neutral_finding"]=nf
    if st.get("workflow_status")!="abgeschlossen":
        ts=now(); st.update({"workflow_status":"laeuft","summary":"Wirtschaftlicher Geldfluss und Blockchain-Unterbau geprüft; technische Kontrolle, Verwahrung und Rechtsanspruch bleiben gemeinsam in Vertiefung.","updated_at":ts})
        for kind in ("customer","company","academy"): st["perspectives"][kind].update({"status":"laeuft","updated_at":ts})

    ev=ev_by[24]; nf=ev.get("neutral_finding") or {}
    if analysis.get("has_blockchain_claim") and not analysis.get("has_specific_technical_identifier"):
        nf["open_points"]=add(nf.get("open_points"),"Als fehlender technischer Primärnachweis sind insbesondere konkrete Chain-/Contract-/Wallet-/Explorerangaben sowie – soweit relevant – Adminrechte, Tokenomics, Liquidität und Auditunterlagen zu klären.")
    ev["neutral_finding"]=nf

    ts=now(); evaluation["updated_at"]=ts; status["updated_at"]=ts; status["state"]="auswertung"
    write(case_dir/"evaluation.json",evaluation); write(case_dir/"status.json",status)
    print(json.dumps({"case_id":case_id,"check_30":result30,"check_33":result33,"first_party_identifiers":analysis.get("first_party_identifier_count",0),"verified_targets":len(verified)},ensure_ascii=False))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
