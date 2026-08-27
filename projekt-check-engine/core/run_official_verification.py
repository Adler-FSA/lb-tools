#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENGINE_ROOT = ROOT / "projekt-check-engine"
if str(ENGINE_ROOT) not in sys.path:
    sys.path.insert(0, str(ENGINE_ROOT))

from identify.browser_probe import probe_urls
from research.legal_candidates import extract_legal_candidates
from research.official_search import host_matches_source, relation_score, search_official_sources

TARGET_CHECKS = {9, 10, 11, 36}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def read(path: Path, default=None):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def unique(values, limit: int = 30):
    out=[]; seen=set()
    for value in values:
        value=str(value or "").strip()
        if value and value not in seen:
            seen.add(value); out.append(value)
        if len(out)>=limit: break
    return out


def evidence_text(evidence_sets: list[dict]) -> str:
    chunks=[]
    for evidence in evidence_sets:
        for item in evidence.get("items") or []:
            chunks.append(" ".join([
                str(item.get("title") or ""), str(item.get("h1") or ""),
                str(item.get("meta_description") or ""), str(item.get("text_excerpt") or ""),
                str(item.get("search_title") or ""), str(item.get("search_snippet") or ""),
            ]))
    return "\n".join(chunks)


def source_checks(source_kind: str, relation_matches: list[str]) -> list[int]:
    ids=set()
    if "registry" in source_kind:
        ids.update({9,10,36})
    if "regulator" in source_kind:
        ids.update({11,36})
    if any(str(x).startswith("person:") for x in relation_matches):
        ids.add(10)
    if any(str(x).startswith("entity:") for x in relation_matches):
        ids.update({9,36})
    return sorted(ids & TARGET_CHECKS)


def content_flags(text: str) -> list[str]:
    blob=" ".join(str(text or "").casefold().split())
    groups={
        "warning_language": ["warning", "investor alert", "consumer alert", "warnung", "achtung", "unauthorised", "unauthorized", "not authorised", "not authorized", "not licensed", "nicht zugelassen", "nicht autorisiert", "enforcement"],
        "licence_or_register_language": ["licensed", "licence", "license", "authorised", "authorized", "registered", "registration", "public register", "register entry", "zugelassen", "erlaubnis", "registriert"],
        "corporate_record_language": ["company number", "registered office", "incorporated", "director", "officer", "company status", "registergericht", "handelsregister", "geschäftsführer"],
    }
    return [flag for flag,terms in groups.items() if any(term in blob for term in terms)]


def strip_previous_official(status: dict, evaluation: dict, previous: dict) -> None:
    old_ids={str(x.get("evidence_id") or "") for x in previous.get("items") or []}
    st_by={int(x["id"]):x for x in status.get("checks") or []}
    for check in evaluation.get("checks") or []:
        cid=int(check["id"])
        nf=check.get("neutral_finding") or {}
        refs=list(nf.get("evidence_refs") or [])
        present=[r for r in refs if r in old_ids or str(r).startswith("O")]
        if present and cid in st_by:
            st_by[cid]["evidence_count"]=max(0,int(st_by[cid].get("evidence_count") or 0)-len(set(present)))
        nf["evidence_refs"]=[r for r in refs if r not in old_ids and not str(r).startswith("O")]
        nf["confirmed_facts"]=[x for x in (nf.get("confirmed_facts") or []) if "amtliche Verifikation" not in str(x) and "amtlichen Quellen" not in str(x)]
        nf["open_points"]=[x for x in (nf.get("open_points") or []) if "amtlichen Quellen" not in str(x)]
        check["neutral_finding"]=nf


def main() -> int:
    ap=argparse.ArgumentParser(description="Amtliche Betreiber-, Register- und Regulator-Verifikation")
    ap.add_argument("--case-id", required=True)
    ap.add_argument("--cases-root", type=Path, default=ROOT / "data/projekt-check/cases")
    ap.add_argument("--max-captures", type=int, default=10)
    args=ap.parse_args()

    case_id=args.case_id.strip().upper()
    case_dir=args.cases_root/case_id
    status_path=case_dir/"status.json"; evaluation_path=case_dir/"evaluation.json"; identity_path=case_dir/"identity.json"; discovery_path=case_dir/"discovery.json"
    for path in (status_path,evaluation_path,identity_path,discovery_path):
        if not path.exists(): raise SystemExit(f"Benötigte Datei fehlt: {path}")

    status=read(status_path); evaluation=read(evaluation_path); identity=read(identity_path); discovery=read(discovery_path)
    primary=read(case_dir/"evidence.json", {"items":[]}) or {"items":[]}
    independent=read(case_dir/"independent-evidence.json", {"items":[]}) or {"items":[]}
    independent_research=read(case_dir/"independent-research.json", {}) or {}
    previous=read(case_dir/"official-evidence.json", {"items":[]}) or {"items":[]}
    strip_previous_official(status,evaluation,previous)

    evidence_sets=[primary,independent]
    candidates=extract_legal_candidates(evidence_sets)
    context=evidence_text(evidence_sets)
    label=str(identity.get("label") or "").strip()
    project_domains=unique(list(discovery.get("project_hosts") or []),20)
    if not project_domains and identity.get("primary_domain"):
        project_domains=[str(identity.get("primary_domain"))]
    distinctive_terms=unique(list(independent_research.get("distinctive_terms") or []),5)

    started=now(); status["state"]="recherche"; status["updated_at"]=started; write(status_path,status)
    search=search_official_sources(
        label=label, project_domains=project_domains, distinctive_terms=distinctive_terms,
        entities=candidates["entities"], persons=candidates["persons"], jurisdictions=candidates["jurisdiction_hints"],
        context_text=context, max_sources=12, per_query=5, max_results=30,
    )

    source_by_id={x["id"]:x for x in search.get("selected_sources") or []}
    leads=search.get("results") or []
    priority={"registry":0,"regulator_registry":0,"regulator":1,"registry_directory":2}
    leads.sort(key=lambda x:(priority.get(x.get("source_kind"),3),-int(x.get("relation_score") or 0),x.get("url","")))
    selected=leads[:max(0,min(args.max_captures,15))]
    probes=probe_urls([x["url"] for x in selected], timeout_ms=25000) if selected else []
    lead_by_url={x["url"].split("#",1)[0]:x for x in selected}

    items=[]; rejected_after_capture=[]
    for probe in probes:
        requested=str(probe.get("requested_url") or "").split("#",1)[0]
        lead=lead_by_url.get(requested,{})
        source=source_by_id.get(lead.get("source_id"),{})
        if not source or not host_matches_source(probe.get("final_url") or requested,source):
            rejected_after_capture.append({"url":requested,"reason":"redirected_outside_official_source"}); continue
        capture_shape={
            "url":probe.get("final_url") or requested,
            "title":probe.get("title") or "",
            "snippet":" ".join([str(probe.get("h1") or ""),str(probe.get("meta_description") or ""),str(probe.get("text_excerpt") or "")]),
        }
        score,matches=relation_score(capture_shape,label=label,project_domains=project_domains,distinctive_terms=distinctive_terms,entities=candidates["entities"],persons=candidates["persons"])
        # Suchtreffer und geöffnete amtliche Zielseite müssen beide identitätsgebunden sein.
        if score<4:
            rejected_after_capture.append({"url":requested,"reason":"capture_lacks_identity_relation","capture_relation_score":score}); continue
        text=" ".join([capture_shape["title"],capture_shape["snippet"]])
        items.append({
            "evidence_id":f"O{len(items)+1:03d}", "kind":"official_public_capture", "scope":"official_verification",
            "source_id":source.get("id",""), "source_name":source.get("name",""), "source_kind":source.get("kind",""), "jurisdiction":source.get("jurisdiction",""),
            "purpose":lead.get("purpose",""), "candidate":lead.get("candidate",""),
            "relation_score":score, "relation_matches":matches, "content_flags":content_flags(text),
            "check_ids":source_checks(str(source.get("kind") or ""),matches),
            "requested_url":probe.get("requested_url") or "", "final_url":probe.get("final_url") or "", "captured_at":probe.get("captured_at") or "",
            "http_status":probe.get("http_status"), "title":probe.get("title") or "", "h1":probe.get("h1") or "", "meta_description":probe.get("meta_description") or "",
            "text_excerpt":probe.get("text_excerpt") or "", "content_sha256":probe.get("content_sha256") or "", "error":probe.get("error") or "",
        })

    official_research={
        "schema_version":"1.0","case_id":case_id,"started_at":started,"finished_at":now(),"identity_label":label,"project_domains":project_domains,
        "distinctive_terms":distinctive_terms,"candidates":candidates,
        "selected_sources":[{"id":x["id"],"name":x["name"],"jurisdiction":x["jurisdiction"],"kind":x["kind"],"domains":x["domains"],"selection_score":x.get("selection_score",0),"activation_hits":x.get("activation_hits",[])} for x in search.get("selected_sources") or []],
        "queries":search.get("queries") or [],"results":leads,"rejected_results":search.get("rejected_results") or [],"rejected_after_capture":rejected_after_capture,
        "errors":search.get("errors") or [],"note":"Kein Suchtreffer ist für sich ein amtlicher Nachweis. Als O-Beleg gilt nur eine geöffnete Zielseite auf einer katalogisierten amtlichen Domain mit ausreichender Identitätsbindung. Ein fehlender O-Beleg beweist keine fehlende Registrierung oder Erlaubnis."
    }
    official_evidence={"schema_version":"1.0","case_id":case_id,"started_at":started,"finished_at":now(),"capture_count":len(items),"items":items}
    write(case_dir/"official-research.json",official_research); write(case_dir/"official-evidence.json",official_evidence)

    st_by={int(x["id"]):x for x in status.get("checks") or []}; ev_by={int(x["id"]):x for x in evaluation.get("checks") or []}
    refs_by=Counter(); ref_lists={}
    for item in items:
        if item.get("error"): continue
        for cid in item.get("check_ids") or []:
            cid=int(cid); refs_by[cid]+=1; ref_lists.setdefault(cid,[]).append(item["evidence_id"])
    ts=now()
    source_count=len(search.get("selected_sources") or [])
    for cid in sorted(TARGET_CHECKS):
        st=st_by[cid]; ev=ev_by[cid]; nf=ev.get("neutral_finding") or {}
        count=refs_by.get(cid,0)
        if count:
            st["evidence_count"]=int(st.get("evidence_count") or 0)+count
            st["workflow_status"]="laeuft" if st.get("workflow_status")!="abgeschlossen" else st["workflow_status"]
            st["started_at"]=st.get("started_at") or ts
            st["summary"]=f"{st['evidence_count']} Belege zugeordnet; davon {count} identitätsgebundene amtliche Quelle(n). Weitere fachliche Zuordnung läuft."
            nf["confirmed_facts"]=unique(list(nf.get("confirmed_facts") or [])+[f"Die amtliche Verifikation hat {count} eindeutig zuordenbare Behörden-/Registerquelle(n) für diesen Prüfbereich geöffnet und gesichert."],8)
            nf["evidence_refs"]=unique(list(nf.get("evidence_refs") or [])+ref_lists.get(cid,[]),25)
        else:
            st["workflow_status"]="laeuft" if st.get("workflow_status")!="abgeschlossen" else st["workflow_status"]
            st["started_at"]=st.get("started_at") or ts
            st["summary"]=f"Amtliche Verifikation über {source_count} ausgewählte Register-/Aufsichtsquellen durchgeführt; noch kein eindeutig zuordenbarer amtlicher Zielseitenbeleg für diesen Prüfbereich."
            nf["open_points"]=unique(list(nf.get("open_points") or [])+["Über die aktuell ausgewählten amtlichen Quellen wurde noch kein eindeutig zuordenbarer Zielseitenbeleg gefunden. Das ist kein Beweis für fehlende Registrierung, Erlaubnis oder Aufsicht."],8)
        for perspective in ("customer","company","academy"):
            if st.get("workflow_status")!="abgeschlossen":
                st["perspectives"][perspective].update({"status":"laeuft","updated_at":ts})
        ev["neutral_finding"]=nf

    status["checks"]=[st_by[i] for i in range(1,38)]; evaluation["checks"]=[ev_by[i] for i in range(1,38)]
    status["state"]="auswertung"; status["updated_at"]=ts
    write(status_path,status); write(evaluation_path,evaluation)
    progress=read(case_dir/"research-progress.json",{}) or {}
    progress.update({"schema_version":"1.2","case_id":case_id,"updated_at":ts})
    modules=dict(progress.get("modules") or {}); modules["official_verification"]="completed"; progress["modules"]=modules
    progress["official_sources_selected"]=source_count; progress["official_search_results"]=len(leads); progress["official_captures"]=len([x for x in items if not x.get("error")])
    write(case_dir/"research-progress.json",progress)
    print(json.dumps({"case_id":case_id,"sources":source_count,"search_results":len(leads),"official_captures":len(items)},ensure_ascii=False))
    return 0


if __name__=="__main__":
    raise SystemExit(main())
