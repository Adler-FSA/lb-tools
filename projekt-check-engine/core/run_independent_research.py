#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
ENGINE_ROOT = ROOT / "projekt-check-engine"
if str(ENGINE_ROOT) not in sys.path:
    sys.path.insert(0, str(ENGINE_ROOT))

from identify.browser_probe import probe_urls
from research.web_search import search_project

THEME_CHECKS = {
    "identity": [9,10,36], "regulation": [11,21,36], "people": [10,36],
    "social": [20,35,37], "user": [20,21,37], "crypto": [30,33], "press": [20,36],
}
CATEGORY_CHECKS = {
    "authority": [9,11,21,36], "telegram": [20,35,37], "facebook": [20,35,37],
    "instagram": [20,35,37], "tiktok": [20,35,37], "youtube": [20,35,37],
    "x": [20,35], "linkedin": [10,20,36], "reddit": [20,37],
}
GENERIC_BRAND_WORDS = {
    "CENTER","CENTRE","HOME","TERMS","PRIVACY","POLICY","CONDITIONS","SIGN","OPEN","THE","LEARNING",
    "COMMUNITY","PLATFORM","PACKAGE","STARTER","BRONZE","SILVER","GOLD","PLATINUM","DIAMOND","LEGAL",
}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def read(path: Path, default=None):
    if not path.exists(): return default
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def host(url: str) -> str:
    h = (urlparse(str(url or "")).hostname or "").lower().strip(".")
    return h[4:] if h.startswith("www.") else h


def related(h: str, roots: set[str]) -> bool:
    h = h.lower().removeprefix("www.")
    return any(h == r or h.endswith("." + r) or r.endswith("." + h) for r in roots if r)


def unique(values):
    out=[]; seen=set()
    for v in values:
        v=str(v or "").strip()
        if v and v not in seen:
            seen.add(v); out.append(v)
    return out


def extract_distinctive_terms(primary_evidence: dict, label: str) -> list[str]:
    text = "\n".join(" ".join([
        str(x.get("title") or ""), str(x.get("h1") or ""), str(x.get("meta_description") or ""), str(x.get("text_excerpt") or "")
    ]) for x in (primary_evidence.get("items") or [])[:8])
    candidates = Counter()
    for raw in re.findall(r"\b[A-Z][A-Z0-9]{0,20}(?:[- ][A-Z][A-Z0-9]{1,20})+\b", text):
        term = " ".join(raw.split()).strip(" -")
        words = set(re.split(r"[- ]+", term))
        if len(term) < 4 or words <= GENERIC_BRAND_WORDS:
            continue
        if label and term.lower() == label.lower():
            continue
        score = 3 if "-" in term else 1
        candidates[term] += score
    return [term for term,_ in candidates.most_common(3)]


def checks_for_result(item: dict) -> list[int]:
    ids = list(THEME_CHECKS.get(item.get("theme"), [])) + list(CATEGORY_CHECKS.get(item.get("category"), []))
    return sorted(set(ids))


def strip_previous_independent(evaluation: dict) -> None:
    for check in evaluation.get("checks") or []:
        nf = check.get("neutral_finding") or {}
        nf["evidence_refs"] = [r for r in (nf.get("evidence_refs") or []) if not str(r).startswith("W")]
        nf["confirmed_facts"] = [x for x in (nf.get("confirmed_facts") or []) if "unabhängige Web-Recherche" not in str(x) and "thematische unabhängige Websuchen" not in str(x)]


def main() -> int:
    ap = argparse.ArgumentParser(description="Unabhängige öffentliche Web-Recherche für den Projekt-Check")
    ap.add_argument("--case-id", required=True)
    ap.add_argument("--cases-root", type=Path, default=ROOT / "data/projekt-check/cases")
    ap.add_argument("--max-captures", type=int, default=8)
    args = ap.parse_args()

    case_id = args.case_id.strip().upper()
    case_dir = args.cases_root / case_id
    status_path=case_dir/"status.json"; evaluation_path=case_dir/"evaluation.json"; identity_path=case_dir/"identity.json"; discovery_path=case_dir/"discovery.json"
    for p in (status_path,evaluation_path,identity_path,discovery_path):
        if not p.exists(): raise SystemExit(f"Benötigte Datei fehlt: {p}")

    status=read(status_path); evaluation=read(evaluation_path); identity=read(identity_path); discovery=read(discovery_path)
    primary_evidence=read(case_dir/"evidence.json", {"items":[]}) or {"items":[]}
    previous=read(case_dir/"independent-evidence.json", {"items":[]}) or {"items":[]}
    strip_previous_independent(evaluation)

    label=str(identity.get("label") or "").strip()
    domains=unique(list(discovery.get("project_hosts") or []))
    if not domains and identity.get("primary_domain"):
        domains=[str(identity.get("primary_domain"))]
    project_hosts={d.lower().removeprefix("www.") for d in domains if d}
    distinctive_terms=extract_distinctive_terms(primary_evidence,label)

    started=now(); status["state"]="recherche"; status["updated_at"]=started; write(status_path,status)
    search=search_project(label,domains,distinctive_terms=distinctive_terms,max_per_query=5,max_total=28)
    results=search.get("results") or []; rejected=search.get("rejected_results") or []

    external=[r for r in results if not related(host(r.get("url")),project_hosts)]
    priority={"authority":0,"telegram":1,"youtube":1,"facebook":1,"instagram":1,"tiktok":1,"x":1,"linkedin":1,"reddit":2,"web":3}
    external.sort(key=lambda r:(priority.get(r.get("category"),4),r.get("theme",""),r.get("url","")))
    selected=external[:max(0,min(args.max_captures,12))]
    probes=probe_urls([x["url"] for x in selected],timeout_ms=22000) if selected else []
    by_url={x["url"].split("#",1)[0]:x for x in selected}

    items=[]
    for n,probe in enumerate(probes,start=1):
        requested=str(probe.get("requested_url") or "").split("#",1)[0]; lead=by_url.get(requested,{})
        items.append({
            "evidence_id":f"W{n:03d}","kind":"independent_web_capture","scope":"independent_web",
            "theme":lead.get("theme",""),"category":lead.get("category","web"),"provider":lead.get("provider",""),
            "search_title":lead.get("title",""),"search_snippet":lead.get("snippet",""),"relevance_score":lead.get("relevance_score",0),
            "check_ids":checks_for_result(lead),"requested_url":probe.get("requested_url") or "","final_url":probe.get("final_url") or "",
            "captured_at":probe.get("captured_at") or "","http_status":probe.get("http_status"),"title":probe.get("title") or "",
            "h1":probe.get("h1") or "","meta_description":probe.get("meta_description") or "","text_excerpt":probe.get("text_excerpt") or "",
            "content_sha256":probe.get("content_sha256") or "","error":probe.get("error") or "",
        })

    independent={"schema_version":"1.1","case_id":case_id,"started_at":started,"finished_at":now(),"search_query_count":len(search.get("queries") or []),
        "search_result_count":len(results),"rejected_result_count":len(rejected),"external_result_count":len(external),"capture_count":len(items),
        "search_errors":search.get("errors") or [],"items":items}
    research={"schema_version":"1.1","case_id":case_id,"identity_label":label,"project_hosts":sorted(project_hosts),"distinctive_terms":distinctive_terms,
        "queries":search.get("queries") or [],"results":results,"rejected_results":rejected[:40],"selected_urls":[x.get("url") for x in selected],
        "errors":search.get("errors") or [],"finished_at":now(),"note":"Suchtreffer werden nur übernommen, wenn Domain oder ein markantes Projektmerkmal die Zuordnung stützt. Suchtreffer sind Recherchehinweise; Belege sind separat geöffnete Zielseiten."}
    write(case_dir/"independent-research.json",research); write(case_dir/"independent-evidence.json",independent)

    old_counts=Counter(); new_counts=Counter(); refs_by_check={}
    for item in previous.get("items") or []:
        for cid in item.get("check_ids") or []: old_counts[int(cid)]+=1
    for item in items:
        if item.get("error"): continue
        for cid in item.get("check_ids") or []:
            cid=int(cid); new_counts[cid]+=1; refs_by_check.setdefault(cid,[]).append(item["evidence_id"])

    st_by={int(x["id"]):x for x in status.get("checks",[])}; ev_by={int(x["id"]):x for x in evaluation.get("checks",[])}; ts=now()
    for cid in set(old_counts)|set(new_counts):
        st=st_by.get(cid); ev=ev_by.get(cid)
        if not st or not ev: continue
        st["evidence_count"]=max(0,int(st.get("evidence_count") or 0)-old_counts.get(cid,0))+new_counts.get(cid,0)
        if new_counts.get(cid,0) and cid!=20 and st.get("workflow_status")!="abgeschlossen":
            st["workflow_status"]="laeuft"; st["started_at"]=st.get("started_at") or ts
            st["summary"]=f"{st['evidence_count']} Belege zugeordnet; unabhängige Web-Recherche liefert identitätsgebundene externe Spuren."
            for p in ("customer","company","academy"): st["perspectives"][p].update({"status":"laeuft","updated_at":ts})
        nf=ev.get("neutral_finding") or {}
        nf["evidence_refs"]=unique(list(nf.get("evidence_refs") or [])+refs_by_check.get(cid,[]))[:20]
        if new_counts.get(cid,0):
            nf["confirmed_facts"]=unique(list(nf.get("confirmed_facts") or [])+[f"Die identitätsgebundene unabhängige Web-Recherche hat {new_counts[cid]} externe öffentlich erreichbare Quelle(n) zu diesem Prüfbereich erfasst."])[:8]
        ev["neutral_finding"]=nf

    st20=st_by[20]; ev20=ev_by[20]; usable=[x for x in items if not x.get("error")]
    search_executed=bool(results or rejected) or not search.get("errors")
    if search_executed:
        st20["workflow_status"]="abgeschlossen"; st20["result_status"]="bestaetigt" if usable else "kein_befund"; st20["finished_at"]=ts; st20["started_at"]=st20.get("started_at") or ts
        st20["summary"]=f"Unabhängige Web-Recherche abgeschlossen · {len(results)} zugeordnete Suchhinweise · {len(rejected)} verworfene Namens-/Kontexttreffer · {len(usable)} externe Zielseiten belegt."
        for p in ("customer","company","academy"): st20["perspectives"][p].update({"status":"abgeschlossen","updated_at":ts})
        ev20["result_status"]=st20["result_status"]; nf=ev20["neutral_finding"]
        nf["confirmed_facts"]=unique(list(nf.get("confirmed_facts") or [])+[f"Es wurden {len(search.get('queries') or [])} thematische unabhängige Websuchen mit Identitätsfilter durchgeführt; {len(rejected)} gleichnamige oder unzureichend zuordenbare Treffer wurden verworfen."])[:8]
        nf["evidence_refs"]=unique(list(nf.get("evidence_refs") or [])+[x["evidence_id"] for x in usable])[:20]
    else:
        st20["workflow_status"]="laeuft"; st20["summary"]="Unabhängige Web-Recherche konnte über die verfügbaren Suchwege noch nicht belastbar abgeschlossen werden."

    status["checks"]=[st_by[i] for i in range(1,38)]; evaluation["checks"]=[ev_by[i] for i in range(1,38)]; status["state"]="auswertung"; status["updated_at"]=ts
    write(status_path,status); write(evaluation_path,evaluation)
    write(case_dir/"research-progress.json",{"schema_version":"1.1","case_id":case_id,"updated_at":ts,"modules":{"primary_discovery":"completed","primary_evaluation":"completed","independent_web":"completed" if search_executed else "partial"},"independent_search_results":len(results),"independent_rejected_results":len(rejected),"independent_captures":len(usable)})
    print(json.dumps({"case_id":case_id,"results":len(results),"rejected":len(rejected),"captures":len(usable),"check20":st20["workflow_status"]},ensure_ascii=False))
    return 0


if __name__=="__main__": raise SystemExit(main())
