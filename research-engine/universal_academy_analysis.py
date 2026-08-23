#!/usr/bin/env python3
"""Universelle Ausgabeschicht fuer den Akademie-Vergleich.

Die bestehende Vergleichslogik bleibt erhalten. Betreibertexte werden jedoch
immer aus dem aktuell untersuchten Projekt erzeugt. Damit kann ein frueherer
Testfall niemals als fester Projektname in einen neuen Deep-Research-Lauf
uebernommen werden.
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


base = load_module("academy_analysis_base_for_universal", "academy_analysis.py")


def project_label(data: dict) -> str:
    ctx = data.get("context") or {}
    return base.clean(
        ctx.get("project_name") or ctx.get("input") or ctx.get("domain") or "das aktuelle Projekt"
    )


def operator_explanation(assessment: str, entity: str, project: str) -> str:
    if assessment == "independently_supported":
        return (
            f"Eine externe Quelle verknuepft {entity} mit {project}; die Rechtstraegerspur "
            "ist ausserhalb der Projektwebsite nachvollziehbar."
        )
    if assessment == "context_challenged":
        return (
            f"Zu {entity} existiert eine externe Rechtstraeger-/Registerspur. Die Verbindung zu {project} "
            "ist jedoch nicht unabhaengig belegt; zusaetzlich liegt ein hoeherwertiger Behoerdenkontext vor, "
            "der die institutionelle Einordnung der verwendeten Register-/Lizenzquelle in Frage stellt."
        )
    if assessment == "partially_supported":
        return (
            f"{entity} ist ausserhalb der Projektwebsite als Rechtstraeger bzw. Organisation auffindbar. "
            f"Die behauptete Rolle oder Verbindung zu {project} wurde bisher nicht unabhaengig bestaetigt."
        )
    if assessment == "contradicted":
        return (
            f"Mindestens eine hoeherwertige externe Quelle stellt die behauptete Rolle von {entity} "
            f"bei {project} in Frage."
        )
    return (
        f"Fuer {entity} wurde bislang weder eine belastbare externe Rechtstraegerspur noch eine "
        f"unabhaengige Verbindung zu {project} festgestellt."
    )


def _rebuild_open_questions(result: dict) -> list[str]:
    questions: list[str] = []
    for q in (result.get("analysis") or {}).get("questions") or []:
        q = base.clean(q)
        if q and q not in questions:
            questions.append(q)
    for comparison in (result.get("academy_analysis") or {}).get("comparisons") or []:
        if comparison.get("assessment") == "independently_supported":
            continue
        q = base.clean(comparison.get("open_question") or "")
        if q and q not in questions:
            questions.append(q)
    return questions[:30]


def enrich(data: dict) -> dict:
    result = base.enrich(data)
    block = result.get("academy_analysis") or {}
    project = project_label(result)

    for comparison in block.get("comparisons") or []:
        if comparison.get("topic") != "operator_relation":
            continue
        entity = base.clean(comparison.get("project_value") or "der erkannte Rechtstraeger")
        assessment = base.clean(comparison.get("assessment") or "open")
        comparison["explanation"] = operator_explanation(assessment, entity, project)
        comparison["open_question"] = (
            f"Welche konkrete vertragliche oder operative Rolle hat {entity} bei {project}, und welche vom Projekt "
            "unabhaengige Quelle bestaetigt diese Verbindung?"
        )

    tensions = []
    for comparison in block.get("comparisons") or []:
        if comparison.get("assessment") not in {"context_challenged", "contradicted"}:
            continue
        tensions.append({
            "comparison_id": comparison.get("id"),
            "topic": comparison.get("topic"),
            "project_statement": comparison.get("project_statement"),
            "assessment": comparison.get("assessment"),
            "explanation": comparison.get("explanation"),
            "challenge_sources": comparison.get("external_challenges") or [],
        })
    block["tensions"] = tensions
    block.setdefault("summary", {})["tension_count"] = len(tensions)
    block["open_questions"] = _rebuild_open_questions(result)
    block["summary"]["open_question_count"] = len(block["open_questions"])
    block.setdefault("guardrails", {})["dynamic_project_label_used"] = True
    block["guardrails"]["project_name_hardcoded_in_universal_output"] = False
    result["academy_analysis"] = block
    return result
