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
from research.payment_research import analyze_payment_sources, search_payment_traces, _unique as unique

PREFIXES=(
    "Die Karten-/Banking-/Payment-Tiefenprüfung",
    "Die projektseitigen öffentlichen Unterlagen enthalten",
    "Externe projektbezogene Spuren enthalten",
    "Für eine belastbare Banking-/Payment-Zuordnung",
    "Als fehlender Payment-Primärnachweis",
    "Die Payment-/Banking-Recherche hat",
)


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00","Z")


def read(path,default=None):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def write(path,data):
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")


def host(url):
    h=(urlparse(str(url or "")).hostname or "").lower().strip(".")
    return h[4:] if h.startswith("www.") else h


def related(url,roots):
    h=host(url)
    return any(h==r or h.endswith("."+r) or r.endswith("."+h) for r in roots if r)


def add(values,text,limit=12):
    return unique(list(values or [])+[text],limit)


def select_project_items(primary,discovery,identity):
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


def clean_previous(status,evaluation):
    st_by={int(x["id"]):x for x in status.get("checks") or []}
    for check in evaluation.get("checks") or []:
        cid=int(check.get("id") or 0)
        if cid not in {11,12,24,32}: continue
        nf=check.get("neutral_finding") or {}
        refs=list(nf.get("evidence_refs") or [])
        old=[r for r in refs if str(r).startswith("P")]
        if old and cid in st_by:
            st_by[cid]["evidence_count"]=max(0,int(st_by[cid].get("evidence_count") or 0)-len(set(old)))
        nf["evidence_refs"]=[r for r in refs if not str(r).startswith("P")]
        for field in ("confirmed_facts","first_party_claims","pros","cons","open_points","contradictions"):
            nf[field]=[x for x in (nf.get(field) or []) if not any(str(x).startswith(p) for p in PREFIXES)]
        check["neutral_finding"]=nf


def make_p_items(probes,search_rows):
    by_url={str(x.get("url") or "").split("#",1)[0].rstrip("/"):x for x in search_rows}
    out=[]
    for i,p in enumerate(probes,1):
        requested=str(p.get("requested_url") or ""); final=str(p.get("final_url") or requested)
        row=by_url.get(final.split("#",1)[0].rstrip("/")) or by_url.get(requested.split("#",1)[0].rstrip("/")) or {}
        out.append({
            "evidence_id":f"P{i:03d}","kind":"payment_web_capture","scope":"payment_external",
            "provider":row.get("provider",""),"category":row.get("category",""),"query":row.get("query",""),
            "search_title":row.get("title",""),"search_snippet":row.get("snippet",""),
            "requested_url":requested,"final_url":final,"captured_at":p.get("captured_at",""),
            "http_status":p.get("http_status"),"title":p.get("title",""),"h1":p.get("h1",""),
            "meta_description":p.get("meta_description",""),"text_excerpt":p.get("text_excerpt",""),
            "content_sha256":p.get("content_sha256",""),"error":p.get("error","")
        })
    return out


def relation_blob(item):
    return " ".join([str(item.get("title") or ""),str(item.get("h1") or ""),str(item.get("meta_description") or ""),str(item.get("text_excerpt") or "")]).casefold()


def set_completed(st,ev,result,summary,lang):
    ts=now(); st.update({"workflow_status":"abgeschlossen","result_status":result,"summary":summary,"finished_at":ts,"updated_at":ts}); ev["result_status"]=result
    nf=ev.get("neutral_finding") or {}
    if lang=="de":
        texts={
            "customer":("Banking-, Karten- und Zahlungsversprechen werden von der tatsächlich belegten Infrastruktur getrennt.","Vor einer Nutzung Issuer/Bank/EMI, Karten-Netzwerk, Kontoinhaber, IBAN-/SEPA-Weg, Gebühren und regulatorischen Umfang konkret prüfen."),
            "company":("Eine belastbare Außendarstellung braucht klare Angaben zu Issuer, Bank/EMI/PI, BIN-Sponsor, Karten-Netzwerk, PSP, IBAN-/SEPA-Infrastruktur und jeweiligem Lizenzumfang.","Alle Banking-/Payment-Partner mit Rechtsträger, Rolle, Zielmarkt und Primärquelle zentral dokumentieren."),
            "academy":("Banking-/Payment-Sprache, konkrete Infrastrukturidentifikatoren und amtlich/partnerseitig bestätigte Beziehungen werden getrennt gewichtet.","Issuer, BIN-Sponsor, Scheme, PSP, Bank/EMI/PI, IBAN-/Kontoinhaber, Passporting und Kundenanspruch separat verifizieren."),
        }
    else:
        base=("Banking, card and payment claims are separated from specifically verified infrastructure.","Verify issuer/bank/EMI, card network, account holder, IBAN/SEPA path, fees and regulatory scope before relying on the service.")
        texts={k:base for k in ("customer","company","academy")}
    for kind,(s,r) in texts.items():
        block=ev.get(kind) or {}; block["summary"]=s; block["advantages"]=unique(block.get("advantages") or [],5)
        block["disadvantages"]=unique((block.get("disadvantages") or [])+(nf.get("open_points") or []),7)
        block["questions"]=unique(block.get("questions") or [],5); block["recommendations"]=[r]; ev[kind]=block
        st["perspectives"][kind].update({"status":"abgeschlossen","updated_at":ts})


def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--case-id",required=True); ap.add_argument("--cases-root",type=Path,default=ROOT/"data/projekt-check/cases"); ap.add_argument("--max-captures",type=int,default=8)
    args=ap.parse_args(); case_id=args.case_id.strip().upper(); case_dir=args.cases_root/case_id
    for name in ("status.json","evaluation.json","evidence.json","discovery.json","identity.json"):
        if not (case_dir/name).exists(): raise SystemExit(f"Benötigte Datei fehlt: {case_dir/name}")
    status=read(case_dir/"status.json"); evaluation=read(case_dir/"evaluation.json"); primary=read(case_dir/"evidence.json",{"items":[]}) or {"items":[]}
    independent=read(case_dir/"independent-evidence.json",{"items":[]}) or {"items":[]}; discovery=read(case_dir/"discovery.json",{}) or {}; identity=read(case_dir/"identity.json",{}) or {}
    indep_research=read(case_dir/"independent-research.json",{}) or {}; intake=read(case_dir/"intake.json",{}) or {}; lang="en" if intake.get("language")=="en" else "de"
    clean_previous(status,evaluation)

    first_party,roots=select_project_items(primary,discovery,identity)
    external=[x for x in (independent.get("items") or []) if not x.get("error")]
    label=str(identity.get("label") or discovery.get("identity_label") or "")
    domain=str(identity.get("primary_domain") or (sorted(roots)[0] if roots else ""))
    distinctive=[str(x) for x in indep_research.get("distinctive_terms") or []][:4]
    search=search_payment_traces(label,domain,distinctive,max_results=max(1,args.max_captures))
    urls=[]
    for row in search.get("results") or []:
        u=str(row.get("url") or "")
        if u and u not in urls: urls.append(u)
        if len(urls)>=max(1,args.max_captures): break
    probes=probe_urls(urls) if urls else []
    p_items=make_p_items(probes,search.get("results") or [])
    analysis=analyze_payment_sources(first_party,external+p_items)

    anchors=[x.casefold() for x in [label,domain]+distinctive if x]
    verified=[]
    for item in p_items:
        if item.get("http_status")!=200 or item.get("error"): continue
        blob=relation_blob(item)
        if not any(a in blob for a in anchors if len(a)>=4): continue
        # Only an authority hit with project relation counts as an independently verified infrastructure relation here.
        if str(item.get("category") or "")!="authority": continue
        if not any(term in blob for term in ("issuer","payment institution","electronic money","licensed","authorised","authorized","registered")): continue
        verified.append({"evidence_ref":item.get("evidence_id"),"url":item.get("final_url"),"basis":"authority_project_relation"})

    analysis.update({
        "schema_version":"1.0","case_id":case_id,"generated_at":now(),"identity_label":label,"primary_domain":domain,
        "project_hosts_used":sorted(roots),"search_queries":search.get("queries") or [],"search_result_count":len(search.get("results") or []),
        "search_errors":search.get("errors") or [],"capture_count":len(p_items),"verified_infrastructure_targets":verified,
        "verified_infrastructure_target_count":len(verified),
        "principle":"Banking-, Karten- und Payment-Begriffe sind Eigenaussagen oder externe Spuren, bis Issuer/Bank/EMI/PI, Karten-Netzwerk, Konten-/IBAN-Infrastruktur und regulatorische Rolle eindeutig zugeordnet und über Primärquellen verifiziert sind. Datenschutzhinweise über nicht erhobene Karten-/Bankdaten gelten nicht als Produktfunktion."
    })
    write(case_dir/"payment-research.json",analysis); write(case_dir/"payment-evidence.json",{"schema_version":"1.0","case_id":case_id,"items":p_items})

    st_by={int(x["id"]):x for x in status.get("checks") or []}; ev_by={int(x["id"]):x for x in evaluation.get("checks") or []}
    p_refs=[x.get("evidence_id") for x in p_items if x.get("evidence_id") and not x.get("error")]

    st=st_by[32]; ev=ev_by[32]; nf=ev.get("neutral_finding") or {}
    if analysis.get("has_first_party_payment_claim"):
        nf["first_party_claims"]=add(nf.get("first_party_claims"),"Die projektseitigen öffentlichen Unterlagen enthalten Banking-/Karten-/Payment-Funktionsaussagen; diese werden nicht mit einer bestätigten Bank-, Issuer- oder Zahlungsinfrastruktur gleichgesetzt.")
        result="offen"
    elif analysis.get("has_external_payment_claim"):
        nf["open_points"]=add(nf.get("open_points"),"Externe projektbezogene Spuren enthalten Banking-/Karten-/Payment-Aussagen, während in den geprüften projektseitigen Primärseiten bislang keine entsprechend konkrete Infrastrukturzuordnung erkannt wurde.")
        result="offen"
    else:
        nf["confirmed_facts"]=add(nf.get("confirmed_facts"),"Die Karten-/Banking-/Payment-Tiefenprüfung wurde durchgeführt; in den geprüften projektbezogenen Quellen wurde kein hinreichend konkreter Banking-/Karten-/Payment-Funktionsbefund erkannt.")
        result="kein_befund"
    if analysis.get("verified_infrastructure_target_count",0)>0:
        nf["confirmed_facts"]=add(nf.get("confirmed_facts"),f"Die Payment-/Banking-Recherche hat {analysis['verified_infrastructure_target_count']} amtlich erreichbare, identitätsgebundene Infrastrukturbeziehung(en) gefunden; deren Leistungsumfang bleibt separat zu prüfen.")
    elif result=="offen":
        nf["open_points"]=add(nf.get("open_points"),"Für eine belastbare Banking-/Payment-Zuordnung fehlen bislang öffentlich eindeutig verknüpfte Angaben zu Issuer/Bank/EMI/PI, BIN-Sponsor, Karten-Netzwerk, PSP, IBAN-/SEPA-Infrastruktur und jeweiligem regulatorischem Leistungsumfang.")
    nf["evidence_refs"]=unique((nf.get("evidence_refs") or [])+p_refs,24); ev["neutral_finding"]=nf
    st["evidence_count"]=int(st.get("evidence_count") or 0)+len(set(p_refs))
    set_completed(st,ev,result,f"Karten-/Banking-/Payment-Tiefenprüfung abgeschlossen · {analysis.get('first_party_claim_count',0)} projektseitige Funktionsaussagen · {analysis.get('external_claim_count',0)} externe Payment-Spuren · {analysis.get('verified_infrastructure_target_count',0)} amtlich verifizierte Infrastrukturbeziehungen.",lang)

    if analysis.get("has_first_party_payment_claim") or analysis.get("has_external_payment_claim"):
        for cid in (11,12,24):
            st=st_by[cid]; ev=ev_by[cid]; nf=ev.get("neutral_finding") or {}
            if cid==11 and not analysis.get("verified_infrastructure_target_count"):
                nf["open_points"]=add(nf.get("open_points"),"Für eine belastbare Banking-/Payment-Zuordnung ist der konkrete regulierte Leistungserbringer einschließlich Rechtsträger, Lizenztyp, Zielmarkt und Leistungsumfang noch offen.")
            elif cid==12 and analysis.get("has_first_party_payment_claim"):
                nf["open_points"]=add(nf.get("open_points"),"Für Banking-/Payment-Funktionen müssen Kontoinhaber, Verwahrer, Issuer/Bank/EMI/PSP, Zahlungsweg und rechtlicher Kundenanspruch eindeutig zusammengeführt werden.")
            elif cid==24:
                nf["open_points"]=add(nf.get("open_points"),"Als fehlender Payment-Primärnachweis sind – soweit entsprechende Funktionen angeboten werden – Issuer-/Bank-/EMI-/PI-Nachweis, Karten-Netzwerk/BIN-Sponsor, PSP sowie IBAN-/SEPA-/Kontoinhaber-Dokumentation prioritär.")
            ev["neutral_finding"]=nf
            if st.get("workflow_status")!="abgeschlossen":
                st["workflow_status"]="laeuft"; st["result_status"]=st.get("result_status") or "offen"; st["started_at"]=st.get("started_at") or now(); st["updated_at"]=now()
                for kind in ("customer","company","academy"):
                    if st["perspectives"][kind].get("status")!="abgeschlossen": st["perspectives"][kind].update({"status":"laeuft","updated_at":now()})

    status["state"]="auswertung"; status["updated_at"]=now(); evaluation["updated_at"]=now()
    write(case_dir/"evaluation.json",evaluation); write(case_dir/"status.json",status)
    print(json.dumps({"case_id":case_id,"first_party_claims":analysis.get("first_party_claim_count",0),"external_claims":analysis.get("external_claim_count",0),"verified_infrastructure":len(verified),"status32":st_by[32]["result_status"]},ensure_ascii=False))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
