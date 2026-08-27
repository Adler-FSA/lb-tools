#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
ENGINE_ROOT = ROOT / "projekt-check-engine"
if str(ENGINE_ROOT) not in sys.path:
    sys.path.insert(0, str(ENGINE_ROOT))

from research.direct_registry import search_invest_dubai

TARGET_CHECKS = {9, 36}
ALLOWED_DUBAI_HOSTS = {"app.invest.dubai.ae", "invest.dubai.ae"}
GENERIC_DIRECT_TERMS = {"BETA NOTICE", "PACKAGE PRICE", "TERMS CONDITIONS", "PRIVACY POLICY"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def read(path: Path, default=None):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def unique(values, limit: int = 20):
    out=[]; seen=set()
    for raw in values:
        value=" ".join(str(raw or "").split()).strip()
        key=value.casefold()
        if value and key not in seen:
            seen.add(key); out.append(value)
        if len(out)>=limit:
            break
    return out


def host(url: str) -> str:
    value=(urlparse(str(url or "")).hostname or "").lower().strip(".")
    return value[4:] if value.startswith("www.") else value


def strong_uae_hint(official_research: dict) -> bool:
    jurisdictions=((official_research.get("candidates") or {}).get("jurisdiction_hints") or [])
    for item in jurisdictions:
        if str(item.get("jurisdiction") or "") != "AE":
            continue
        if item.get("strength") == "strong" or int(item.get("score") or 0) >= 4:
            return True
    return False


def candidate_names(official_research: dict, identity: dict) -> list[str]:
    candidates=[]
    entities=((official_research.get("candidates") or {}).get("entities") or [])
    for item in entities[:3]:
        name=str(item.get("name") or "").strip()
        if name:
            candidates.append(name)

    for term in official_research.get("distinctive_terms") or []:
        value=" ".join(str(term or "").split()).strip()
        if not value or value.upper() in GENERIC_DIRECT_TERMS:
            continue
        candidates.append(value)
        break

    label=str(identity.get("label") or "").strip()
    if label:
        candidates.append(label)
    return unique(candidates,6)


def strip_previous_direct(status: dict, evaluation: dict, previous: dict) -> None:
    old_ids={str(x.get("evidence_id") or "") for x in previous.get("items") or []}
    st_by={int(x["id"]):x for x in status.get("checks") or []}
    for check in evaluation.get("checks") or []:
        cid=int(check["id"])
        nf=check.get("neutral_finding") or {}
        refs=list(nf.get("evidence_refs") or [])
        present=[r for r in refs if r in old_ids or str(r).startswith("R")]
        if present and cid in st_by:
            st_by[cid]["evidence_count"]=max(0,int(st_by[cid].get("evidence_count") or 0)-len(set(present)))
        nf["evidence_refs"]=[r for r in refs if r not in old_ids and not str(r).startswith("R")]
        nf["confirmed_facts"]=[x for x in (nf.get("confirmed_facts") or []) if "direkte Dubai-Lizenzregistersuche" not in str(x)]
        nf["open_points"]=[x for x in (nf.get("open_points") or []) if "direkten Dubai-Lizenzregistersuche" not in str(x) and "Dubai-Lizenzregistersuche" not in str(x) and "Invest-in-Dubai" not in str(x)]
        check["neutral_finding"]=nf


def append_summary(current: str, addition: str) -> str:
    current=" ".join(str(current or "").split()).strip()
    if addition in current:
        return current
    return (current + " " + addition).strip()


def main() -> int:
    ap=argparse.ArgumentParser(description="Direkter Dubai-Firmenlizenzregister-Check")
    ap.add_argument("--case-id", required=True)
    ap.add_argument("--cases-root", type=Path, default=ROOT / "data/projekt-check/cases")
    args=ap.parse_args()

    case_id=args.case_id.strip().upper()
    case_dir=args.cases_root/case_id
    status_path=case_dir/"status.json"; evaluation_path=case_dir/"evaluation.json"
    identity_path=case_dir/"identity.json"; official_path=case_dir/"official-research.json"
    for path in (status_path,evaluation_path,identity_path,official_path):
        if not path.exists():
            raise SystemExit(f"Benötigte Datei fehlt: {path}")

    status=read(status_path); evaluation=read(evaluation_path); identity=read(identity_path); official=read(official_path)
    previous=read(case_dir/"registry-evidence.json", {"items":[]}) or {"items":[]}
    strip_previous_direct(status,evaluation,previous)
    started=now()

    if not strong_uae_hint(official):
        result={
            "schema_version":"1.0","case_id":case_id,"started_at":started,"finished_at":now(),
            "status":"skipped","reason":"no_strong_uae_jurisdiction_hint","candidates":[],"source_id":"ae_dubai_det_license","attempts":[]
        }
        write(case_dir/"direct-registry-research.json",result)
        write(case_dir/"registry-evidence.json",{"schema_version":"1.0","case_id":case_id,"capture_count":0,"items":[]})
        progress=read(case_dir/"research-progress.json",{}) or {}
        modules=dict(progress.get("modules") or {}); modules["direct_dubai_registry"]="skipped"; progress["modules"]=modules
        progress.update({"case_id":case_id,"updated_at":now(),"direct_registry_attempts":0,"direct_registry_captures":0})
        write(case_dir/"research-progress.json",progress)
        print(json.dumps({"case_id":case_id,"status":"skipped"},ensure_ascii=False))
        return 0

    names=candidate_names(official,identity)
    search=search_invest_dubai(names)
    attempts=search.get("attempts") or []
    positive=[]
    for attempt in attempts:
        if attempt.get("status")!="positive_candidate" or not attempt.get("match_visible"):
            continue
        if host(attempt.get("final_url") or attempt.get("requested_url")) not in ALLOWED_DUBAI_HOSTS:
            continue
        positive.append(attempt)

    items=[]
    for attempt in positive:
        excerpt=str(attempt.get("result_excerpt") or "")
        items.append({
            "evidence_id":f"R{len(items)+1:03d}",
            "kind":"official_registry_capture",
            "scope":"direct_registry",
            "source_id":"ae_dubai_det_license",
            "source_name":"Invest in Dubai – Search License Information",
            "source_kind":"registry",
            "jurisdiction":"AE-DU",
            "query_candidate":attempt.get("candidate") or "",
            "check_ids":[9,36],
            "requested_url":attempt.get("requested_url") or "",
            "final_url":attempt.get("final_url") or "",
            "captured_at":attempt.get("searched_at") or "",
            "http_status":attempt.get("http_status"),
            "text_excerpt":excerpt,
            "content_sha256":hashlib.sha256(excerpt.encode("utf-8")).hexdigest() if excerpt else "",
        })

    completed_attempts=[x for x in attempts if x.get("status") in {"positive_candidate","no_visible_match"}]
    blocked_attempts=[x for x in attempts if x.get("status")=="blocked_by_source"]
    technical_errors=[x for x in attempts if x.get("status") in {"error","form_not_found","http_error"}]
    module_status="completed" if completed_attempts else "partial"
    research={
        "schema_version":"1.1","case_id":case_id,"started_at":started,"finished_at":now(),"status":module_status,
        "source_id":"ae_dubai_det_license","source_name":"Invest in Dubai – Search License Information",
        "source_error":search.get("error") or "","candidates":names,"attempt_count":len(attempts),
        "completed_attempt_count":len(completed_attempts),"blocked_attempt_count":len(blocked_attempts),
        "positive_candidate_count":len(positive),"attempts":attempts,
        "note":"Die direkte Namenssuche ergänzt die amtliche Recherche. Ein nicht sichtbarer Treffer ist kein Beweis dafür, dass kein Rechtsträger oder keine Lizenz existiert; eine Registrierung kann unter einer abweichenden juristischen oder geschäftlichen Bezeichnung geführt werden. Eine 403/429-Antwort wird ausschließlich als Quellblockade dokumentiert."
    }
    evidence={"schema_version":"1.0","case_id":case_id,"started_at":started,"finished_at":now(),"capture_count":len(items),"items":items}
    write(case_dir/"direct-registry-research.json",research); write(case_dir/"registry-evidence.json",evidence)

    st_by={int(x["id"]):x for x in status.get("checks") or []}; ev_by={int(x["id"]):x for x in evaluation.get("checks") or []}; ts=now()
    refs=[x["evidence_id"] for x in items]
    searched_names=", ".join(names)
    for cid in sorted(TARGET_CHECKS):
        st=st_by[cid]; ev=ev_by[cid]; nf=ev.get("neutral_finding") or {}
        if items:
            st["evidence_count"]=int(st.get("evidence_count") or 0)+len(items)
            st["summary"]=append_summary(st.get("summary") or "",f"Direktes Dubai-Lizenzregister: {len(items)} sichtbare zuordenbare Datensatzspur(en).")
            nf["confirmed_facts"]=unique(list(nf.get("confirmed_facts") or [])+[f"Die direkte Dubai-Lizenzregistersuche zeigte {len(items)} sichtbare Datensatzspur(en) zu den öffentlich ableitbaren Bezeichnungen. Rechtsträger und Lizenzumfang müssen anhand des Datensatzinhalts weiter zugeordnet werden."],8)
            nf["evidence_refs"]=unique(list(nf.get("evidence_refs") or [])+refs,25)
        elif completed_attempts:
            st["summary"]=append_summary(st.get("summary") or "",f"Direktes Dubai-Lizenzregister mit {len(completed_attempts)} Bezeichnung(en) geprüft; kein sichtbarer exakter Datensatz erfasst.")
            nf["open_points"]=unique(list(nf.get("open_points") or [])+[f"In der direkten Dubai-Lizenzregistersuche wurde unter den öffentlich ableitbaren Bezeichnungen ({searched_names}) kein sichtbarer exakter Datensatz erfasst. Das schließt eine Registrierung unter einem abweichenden Rechtsträger- oder Handelsnamen nicht aus."],8)
        elif blocked_attempts:
            st["summary"]=append_summary(st.get("summary") or "","Direkter Invest-in-Dubai-Registerzugriff wurde von der Quelle mit HTTP 403/429 blockiert; daraus wird kein Registerbefund abgeleitet.")
            nf["open_points"]=unique(list(nf.get("open_points") or [])+["Der direkte Zugriff auf die öffentliche Invest-in-Dubai-Lizenzsuche wurde aus der automatisierten Rechercheumgebung durch die Quelle blockiert (HTTP 403/429). Daher liegt aus diesem direkten Registerweg weder ein positiver noch ein negativer Registerbefund vor."],8)
        elif technical_errors:
            nf["open_points"]=unique(list(nf.get("open_points") or [])+["Die direkte Dubai-Lizenzregistersuche konnte technisch noch nicht belastbar abgeschlossen werden."],8)
        if st.get("workflow_status")!="abgeschlossen":
            st["workflow_status"]="laeuft"; st["started_at"]=st.get("started_at") or ts
            for perspective in ("customer","company","academy"):
                st["perspectives"][perspective].update({"status":"laeuft","updated_at":ts})
        ev["neutral_finding"]=nf

    status["checks"]=[st_by[i] for i in range(1,38)]; evaluation["checks"]=[ev_by[i] for i in range(1,38)]
    status["state"]="auswertung"; status["updated_at"]=ts
    write(status_path,status); write(evaluation_path,evaluation)
    progress=read(case_dir/"research-progress.json",{}) or {}
    modules=dict(progress.get("modules") or {}); modules["direct_dubai_registry"]=module_status; progress["modules"]=modules
    progress.update({
        "schema_version":"1.3","case_id":case_id,"updated_at":ts,"direct_registry_attempts":len(attempts),
        "direct_registry_completed_attempts":len(completed_attempts),"direct_registry_blocked_attempts":len(blocked_attempts),
        "direct_registry_captures":len(items)
    })
    write(case_dir/"research-progress.json",progress)
    print(json.dumps({"case_id":case_id,"status":module_status,"attempts":len(attempts),"blocked":len(blocked_attempts),"positive":len(items)},ensure_ascii=False))
    return 0


if __name__=="__main__":
    raise SystemExit(main())
