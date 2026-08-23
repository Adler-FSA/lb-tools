#!/usr/bin/env python3
"""Q5-Adapter für die 16-Punkte-Akademieprüfung.

Der bestehende 16-Punkte-Motor bleibt unverändert. Dieser Adapter übernimmt
sein Ergebnis und präzisiert ausschließlich Frage 5 anhand des strukturierten
people_history_research-Blocks.

Wichtig:
- Person bei einem Rechtsträger != Person bei KryptoSavings.
- Founder/CEO/Director != Eigentümer/UBO.
- Fehlender UBO-Nachweis != Betrugsnachweis.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODULE = ROOT / "sixteen_point_analysis.py"
spec = importlib.util.spec_from_file_location("sixteen_point_analysis_base", MODULE)
base = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = base
spec.loader.exec_module(base)


def _people_evidence(data: dict) -> list[dict]:
    block = data.get("people_history_research") or {}
    out: list[dict] = []
    for profile in block.get("profiles") or []:
        person = base.clean(profile.get("person_name") or "")
        entity = base.clean(profile.get("entity") or "")
        roles = [base.clean(x) for x in profile.get("roles") or [] if base.clean(x)]
        label = " · ".join(x for x in [person, "/".join(roles), entity] if x)
        for record in profile.get("records") or []:
            out.append(base._ev(
                record.get("source_url") or "",
                record.get("source_role") or "unknown",
                label or "Personenspur",
                record.get("evidence") or "",
            ))
    return base._dedupe(out)


def _profile_text(profile: dict) -> str:
    person = base.clean(profile.get("person_name") or "")
    entity = base.clean(profile.get("entity") or "")
    roles = [base.clean(x) for x in profile.get("roles") or [] if base.clean(x)]
    role = "/".join(roles) if roles else "Rolle belegt"
    return f"{person} ({role}, {entity})" if entity else f"{person} ({role})"


def apply_q5(data: dict, result: dict) -> dict:
    people = data.get("people_history_research") or {}
    profiles = list(people.get("profiles") or [])
    if not profiles:
        return result

    block = result.get("sixteen_point_analysis") or {}
    questions = list(block.get("questions") or [])
    q5 = next((q for q in questions if q.get("id") == 5), None)
    if not q5:
        return result

    project_linked = [p for p in profiles if p.get("project_connection_status") == "externally_linked"]
    verified_ubos = [p for p in profiles if p.get("ubo_verified") is True]
    names = ", ".join(_profile_text(p) for p in profiles[:8])

    if project_linked and verified_ubos:
        state = "partially_answered"
        finding = (
            "Strukturierte Personen- und Eigentümerspuren liegen vor. Mindestens eine Person ist extern mit dem Projekt "
            "verknüpft und mindestens ein UBO-Nachweis ist vorhanden. Historie, Qualifikation, frühere Projekte und die "
            "vollständige Kontrollstruktur bleiben dennoch weiter zu prüfen."
        )
    elif project_linked:
        state = "clarification_needed"
        finding = (
            "Strukturierte Personen-/Managementspuren liegen vor und mindestens eine Person ist extern mit KryptoSavings "
            "verknüpft. Eigentümer/UBO und die tatsächliche Kontrollstruktur sind jedoch nicht belastbar bestätigt."
        )
    else:
        state = "clarification_needed"
        finding = (
            "Zu bereits erkannten Rechtsträgern wurden strukturierte Managementspuren gefunden, aber keine dieser Personen "
            "ist bislang unabhängig als Person, Eigentümer oder Kontrollinstanz von KryptoSavings bestätigt. "
            "Die Funde belegen Rollen beim jeweiligen Rechtsträger, nicht automatisch bei KryptoSavings."
        )

    if names:
        finding += " Gefundene Rollen: " + names + "."

    gaps = []
    if not project_linked:
        gaps.append("Direkte, unabhängige Personen-/Kontrollverbindung zu KryptoSavings fehlt.")
    if not verified_ubos:
        gaps.append("Eigentümer-/UBO-Struktur von KryptoSavings ist nicht verifiziert.")
    gaps.extend([
        "Historie, Qualifikation und frühere Projekte der relevanten Personen sind noch nicht vollständig geprüft.",
        "Verbundene Gesellschaften, frühere Firmen, Insolvenz- und Behörden-/Warnspuren sind noch zu vertiefen.",
    ])

    q5["state"] = state
    q5["finding"] = finding
    q5["evidence"] = _people_evidence(data)
    q5["counter_evidence"] = []
    q5["gaps"] = gaps
    q5["next_research"] = [
        "Projektverbindung jeder Person separat recherchieren.",
        "Offizielle Eigentümer-/UBO-Quellen und verbundene Gesellschaften prüfen.",
        "Berufshistorie, frühere Projekte, Insolvenzen, Sanktionen und Behördenwarnungen personengenau recherchieren.",
    ]
    q5["traffic_light_ready"] = False
    q5["traffic_light"] = None

    counts: dict[str, int] = {}
    for q in questions:
        state_name = q.get("state") or "unknown"
        counts[state_name] = counts.get(state_name, 0) + 1
    block.setdefault("summary", {})["counts_by_state"] = counts
    block.setdefault("guardrails", {})["structured_people_q5_used"] = True
    result["sixteen_point_analysis"] = block
    return result


def enrich(data: dict) -> dict:
    result = base.enrich(data)
    return apply_q5(data, result)


def main() -> int:
    ap = argparse.ArgumentParser(description="Akademie Research Engine · 16 Punkte mit strukturierter Q5-Personenschicht")
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()
    source = json.loads(Path(args.input).read_text(encoding="utf-8"))
    out = enrich(source)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(target)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
