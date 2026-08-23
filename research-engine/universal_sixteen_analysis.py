#!/usr/bin/env python3
"""Universelle 16-Punkte-Ausgabeschicht fuer Deep Research.

Die bestehende 16-Punkte-Logik und der strukturierte Q5-Personenadapter bleiben
erhalten. Q4, Q5 und Q6 werden fuer Universal-Laeufe jedoch immer mit dem
aktuell untersuchten Projektnamen formuliert.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load_module(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


base = load_module("sixteen_people_adapter_for_universal", "sixteen_point_people_adapter.py")


def project_label(data: dict) -> str:
    ctx = data.get("context") or {}
    return base.base.clean(
        ctx.get("project_name") or ctx.get("input") or ctx.get("domain") or "das aktuelle Projekt"
    )


def _profile_text(profile: dict) -> str:
    person = base.base.clean(profile.get("person_name") or "")
    entity = base.base.clean(profile.get("entity") or "")
    roles = [base.base.clean(x) for x in profile.get("roles") or [] if base.base.clean(x)]
    role = "/".join(roles) if roles else "Rolle belegt"
    return f"{person} ({role}, {entity})" if entity else f"{person} ({role})"


def _rewrite_q4(q: dict, project: str) -> None:
    state = q.get("state")
    if state == "partially_answered":
        q["finding"] = (
            f"Externe Rechtstraegerspuren sind vorhanden; mindestens eine Verbindung zu {project} ist extern belegt. "
            "Vollstaendige Betreiber-, Eigentümer- und Registerdaten sind noch zu vervollstaendigen."
        )
    elif state == "conflict_found":
        q["finding"] = (
            f"Mehrere Rechtstraeger sind ausserhalb der Projektwebsite auffindbar, ihre konkrete Rolle bei {project} "
            "ist jedoch nicht unabhaengig belegt; zusaetzlich besteht Behoerdenkontext zur institutionellen Einordnung "
            "einzelner Registerspuren."
        )
    elif state == "clarification_needed":
        q["finding"] = (
            f"Rechtstraegerspuren wurden gefunden, aber die konkrete Betreiber-/Vertragspartnerrolle bei {project} "
            "ist noch nicht unabhaengig belegt."
        )


def _rewrite_q5(q: dict, data: dict, project: str) -> None:
    people = data.get("people_history_research") or {}
    profiles = list(people.get("profiles") or [])
    if not profiles:
        return

    project_linked = [p for p in profiles if p.get("project_connection_status") == "externally_linked"]
    project_claimed = [p for p in profiles if p.get("project_connection_status") == "project_claim_only"]
    verified_ubos = [p for p in profiles if p.get("ubo_verified") is True]
    names = ", ".join(_profile_text(p) for p in profiles[:8])

    if project_linked and verified_ubos:
        q["state"] = "partially_answered"
        finding = (
            f"Strukturierte Personen- und Eigentümerspuren zu {project} liegen vor. Mindestens eine Person ist extern "
            "mit dem Projekt verknuepft und mindestens ein UBO-Nachweis ist vorhanden. Historie, Qualifikation, "
            "fruehere Projekte und die vollstaendige Kontrollstruktur bleiben dennoch weiter zu pruefen."
        )
    elif project_linked:
        q["state"] = "clarification_needed"
        finding = (
            f"Strukturierte Personen-/Managementspuren liegen vor und mindestens eine Person ist extern mit {project} "
            "verknuepft. Eigentümer/UBO und die tatsaechliche Kontrollstruktur sind jedoch nicht belastbar bestaetigt."
        )
    elif project_claimed:
        q["state"] = "clarification_needed"
        finding = (
            f"Die Projektwebsite von {project} nennt konkrete Team-/Managementpersonen. Diese Rollen sind damit als "
            "Projektangabe belegt, aber bislang nicht unabhaengig bestaetigt. Eine Projektrolle belegt weder Eigentum "
            "noch UBO- oder Kontrollstatus."
        )
    else:
        q["state"] = "clarification_needed"
        finding = (
            "Zu bereits erkannten Rechtstraegern wurden strukturierte Managementspuren gefunden, aber keine dieser "
            f"Personen ist bislang unabhaengig als Person, Eigentümer oder Kontrollinstanz von {project} bestaetigt. "
            f"Die Funde belegen Rollen beim jeweiligen Rechtstraeger, nicht automatisch bei {project}."
        )

    if names:
        finding += " Gefundene Rollen: " + names + "."
    q["finding"] = finding
    q["evidence"] = base._people_evidence(data)
    q["counter_evidence"] = []

    gaps = []
    if not project_linked:
        gaps.append(f"Direkte, unabhaengige Personen-/Kontrollverbindung zu {project} fehlt.")
    if not verified_ubos:
        gaps.append(f"Eigentümer-/UBO-Struktur von {project} ist nicht verifiziert.")
    gaps.extend([
        "Historie, Qualifikation und fruehere Projekte der relevanten Personen sind noch nicht vollstaendig geprueft.",
        "Verbundene Gesellschaften, fruehere Firmen, Insolvenz- und Behoerden-/Warnspuren sind noch zu vertiefen.",
    ])
    q["gaps"] = gaps
    q["next_research"] = [
        "Projektverbindung jeder Person separat recherchieren.",
        "Offizielle Eigentümer-/UBO-Quellen und verbundene Gesellschaften pruefen.",
        "Berufshistorie, fruehere Projekte, Insolvenzen, Sanktionen und Behoerdenwarnungen personengenau recherchieren.",
    ]
    q["traffic_light_ready"] = False
    q["traffic_light"] = None


def _rewrite_q6(q: dict, project: str) -> None:
    if q.get("state") == "clarification_needed":
        q["finding"] = (
            f"Es existieren Register-/Lizenzspuren; der konkrete regulatorische Erlaubnisumfang fuer die von {project} "
            "angebotenen Dienstleistungen ist noch nicht vollstaendig belegt."
        )


def enrich(data: dict) -> dict:
    result = base.enrich(data)
    project = project_label(result)
    block = result.get("sixteen_point_analysis") or {}
    questions = list(block.get("questions") or [])

    for q in questions:
        if q.get("id") == 4:
            _rewrite_q4(q, project)
        elif q.get("id") == 5:
            _rewrite_q5(q, result, project)
        elif q.get("id") == 6:
            _rewrite_q6(q, project)

    counts: dict[str, int] = {}
    for q in questions:
        state = q.get("state") or "unknown"
        counts[state] = counts.get(state, 0) + 1
    block.setdefault("summary", {})["counts_by_state"] = counts
    block.setdefault("guardrails", {})["dynamic_project_label_used"] = True
    block["guardrails"]["project_name_hardcoded_in_universal_output"] = False
    result["sixteen_point_analysis"] = block
    return result
