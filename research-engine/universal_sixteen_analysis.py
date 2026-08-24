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


def _identifier_conflicts(data: dict) -> list[tuple[str, list[str]]]:
    operator = data.get("operator_registry_research") or {}
    out: list[tuple[str, list[str]]] = []
    for profile in operator.get("profiles") or []:
        entity = base.base.clean(profile.get("entity") or "")
        names = [base.base.clean(x) for x in profile.get("identifier_name_conflicts") or [] if base.base.clean(x)]
        if entity and names:
            out.append((entity, names))
    return out


def _rewrite_q4(q: dict, data: dict, project: str) -> None:
    conflicts = _identifier_conflicts(data)
    if conflicts:
        q["state"] = "conflict_found"
        details = "; ".join(f"{entity} ↔ {', '.join(names[:3])}" for entity, names in conflicts[:4])
        q["finding"] = (
            f"Zu mindestens einer von {project} genannten Firmen-/Registernummer wurde ausserhalb der Projektwebsite "
            "ein abweichender Rechtstraegername gefunden. Das ist ein Identitaets-/Aktualitaetskonflikt und kein "
            f"Betrugsnachweis. Gefundene Zuordnungen: {details}."
        )
        gaps = list(q.get("gaps") or [])
        gap = "Aktuellen offiziellen Registerstand der betroffenen Firmennummer und die heutige Projektrolle verifizieren."
        if gap not in gaps:
            gaps.insert(0, gap)
        q["gaps"] = gaps
        next_research = list(q.get("next_research") or [])
        step = "Firmennummer direkt im zuständigen offiziellen Register prüfen und Namenshistorie dokumentieren."
        if step not in next_research:
            next_research.insert(0, step)
        q["next_research"] = next_research
        q["traffic_light_ready"] = False
        q["traffic_light"] = None
        return

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

    relevant = [p for p in profiles if base._control_relevant(p)]
    project_linked = [p for p in relevant if p.get("project_connection_status") == "externally_linked"]
    project_claimed = [p for p in relevant if p.get("project_connection_status") == "project_claim_only"]
    verified_ubos = [p for p in relevant if p.get("ubo_verified") is True]
    names = ", ".join(_profile_text(p) for p in relevant[:8])

    if project_linked and verified_ubos:
        q["state"] = "partially_answered"
        finding = (
            f"Kontrollrelevante Personen- und Eigentümerspuren zu {project} liegen vor. Mindestens eine kontrollrelevante "
            "Person ist extern mit dem Projekt verknuepft und mindestens ein UBO-Nachweis ist vorhanden. Historie, "
            "Qualifikation, fruehere Projekte und die vollstaendige Kontrollstruktur bleiben dennoch weiter zu pruefen."
        )
    elif project_linked:
        q["state"] = "clarification_needed"
        finding = (
            f"Kontrollrelevante Managementspuren liegen vor und mindestens eine entsprechende Person ist extern mit {project} "
            "verknuepft. Eigentümer/UBO und die tatsaechliche Kontrollstruktur sind jedoch nicht belastbar bestaetigt."
        )
    elif project_claimed:
        q["state"] = "clarification_needed"
        finding = (
            f"Die Projektwebsite von {project} nennt Personen in Governance-/Kontrollrollen. Diese Rollen sind damit als "
            "Projektangabe belegt, aber bislang nicht unabhaengig bestaetigt. Andere Teamrollen werden fuer diese Kontrollfrage "
            "bewusst ausgeblendet. Auch eine Board-/Founder-/CEO-Rolle belegt weder Eigentum noch UBO- oder Kontrollstatus."
        )
    else:
        q["state"] = "clarification_needed"
        finding = (
            f"Aus den gefundenen Personenprofilen zu {project} ist bislang keine unabhaengig bestaetigte Eigentums- oder "
            "Kontrollinstanz ableitbar. Team- und Managementrollen werden nicht mit Eigentum oder UBO gleichgesetzt."
        )

    if names:
        finding += " Kontrollrelevante Rollen: " + names + "."
    else:
        finding += " Aus der bisherigen Teamdarstellung wurde noch keine belastbar kontrollrelevante Rolle abgeleitet."
    q["finding"] = finding
    q["evidence"] = base._people_evidence(data, relevant)
    q["counter_evidence"] = []

    gaps = []
    if not project_linked:
        gaps.append(f"Direkte, unabhaengige Personen-/Kontrollverbindung zu {project} fehlt.")
    if not verified_ubos:
        gaps.append(f"Eigentümer-/UBO-Struktur von {project} ist nicht verifiziert.")
    gaps.extend([
        "Historie, Qualifikation und fruehere Projekte der kontrollrelevanten Personen sind noch nicht vollstaendig geprueft.",
        "Verbundene Gesellschaften, fruehere Firmen, Insolvenz- und Behoerden-/Warnspuren sind noch zu vertiefen.",
    ])
    q["gaps"] = gaps
    q["next_research"] = [
        "Projektverbindung jeder kontrollrelevanten Person separat recherchieren.",
        "Offizielle Eigentümer-/UBO-Quellen und verbundene Gesellschaften pruefen.",
        "Berufshistorie, fruehere Projekte, Insolvenzen, Sanktionen und Behoerdenwarnungen personengenau recherchieren.",
    ]
    q["traffic_light_ready"] = False
    q["traffic_light"] = None

    guardrails = (data.get("sixteen_point_analysis") or {}).setdefault("guardrails", {})
    guardrails["control_relevant_people_only"] = True
    guardrails["omitted_non_control_team_profiles"] = max(0, len(profiles) - len(relevant))


def _rewrite_q6(q: dict, project: str) -> None:
    if q.get("state") == "clarification_needed":
        q["finding"] = (
            f"Es existieren Register-/Lizenzspuren; der konkrete regulatorische Erlaubnisumfang fuer die von {project} "
            "angebotenen Dienstleistungen ist noch nicht vollstaendig belegt."
        )


def _refresh_q16(questions: list[dict]) -> None:
    q16 = next((q for q in questions if q.get("id") == 16), None)
    if not q16:
        return
    first15 = [q for q in questions if isinstance(q.get("id"), int) and 1 <= q.get("id") <= 15]
    blocker_states = {"clarification_needed", "conflict_found", "research_gap"}
    blockers = [q for q in first15 if q.get("state") in blocker_states]

    q16["state"] = "overall_not_ready"
    q16["finding"] = (
        "Eine belastbare Akademie-Gesamtampel wird noch nicht erzeugt. "
        f"{len(blockers)} der ersten 15 Prüfpunkte enthalten wesentliche Forschungslücken, Klärungsbedarf oder Quellenkonflikte."
    )
    q16["gaps"] = [
        f"Punkt {q.get('id')}: {q.get('title')} — {q.get('state')}"
        for q in blockers[:12]
    ]
    q16["next_research"] = ["Offene Kernmodule schließen; erst danach Ampellogik anwenden."]
    q16["evidence"] = []
    q16["counter_evidence"] = []
    q16["traffic_light_ready"] = False
    q16["traffic_light"] = None


def enrich(data: dict) -> dict:
    result = base.enrich(data)
    project = project_label(result)
    block = result.get("sixteen_point_analysis") or {}
    questions = list(block.get("questions") or [])

    for q in questions:
        if q.get("id") == 4:
            _rewrite_q4(q, result, project)
        elif q.get("id") == 5:
            _rewrite_q5(q, result, project)
        elif q.get("id") == 6:
            _rewrite_q6(q, project)

    _refresh_q16(questions)

    counts: dict[str, int] = {}
    for q in questions:
        state = q.get("state") or "unknown"
        counts[state] = counts.get(state, 0) + 1
    summary = block.setdefault("summary", {})
    summary["counts_by_state"] = counts
    summary["question_count"] = len(questions)
    summary["questions_1_to_15"] = len([q for q in questions if isinstance(q.get("id"), int) and 1 <= q.get("id") <= 15])
    summary["traffic_light_ready_count"] = sum(1 for q in questions if q.get("traffic_light_ready"))
    summary["overall_assessment_ready"] = bool(next((q.get("traffic_light_ready") for q in questions if q.get("id") == 16), False))

    block.setdefault("guardrails", {})["dynamic_project_label_used"] = True
    block["guardrails"]["project_name_hardcoded_in_universal_output"] = False
    block["guardrails"]["identifier_name_conflict_is_not_fraud_verdict"] = True
    block["guardrails"]["q16_refreshed_after_universal_rewrites"] = True
    block["guardrails"]["control_relevant_people_only"] = True
    block["guardrails"]["omitted_non_control_team_profiles"] = max(0, len((result.get("people_history_research") or {}).get("profiles") or []) - len([p for p in (result.get("people_history_research") or {}).get("profiles") or [] if base._control_relevant(p)]))
    result["sixteen_point_analysis"] = block
    return result
