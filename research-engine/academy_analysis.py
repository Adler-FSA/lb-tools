#!/usr/bin/env python3
"""Akademie-Vergleichsmotor.

Verdichtet die bereits gesammelte Rohrecherche zu einer nachvollziehbaren
Gegenueberstellung:

    Was sagt die Projektwebsite?
    Was laesst sich ausserhalb der Projektwebsite feststellen?
    Was bleibt unbestaetigt, nur teilweise bestaetigt oder wird durch
    hoeherwertige Quellen institutionell in Frage gestellt?

Dieser Baustein vergibt bewusst KEINEN Risiko-Score und kein
"serioes/unserioes"-Urteil. Er erzeugt die belegbare Grundlage dafuer.
"""
from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


SOURCE_RANK = {
    "regulator": 6,
    "government": 6,
    "independent": 5,
    "entity_owned": 4,
    "claimed_regulator_or_registry": 3,
    "community": 2,
    "platform": 2,
    "project_owned": 1,
    "unknown": 0,
}

ASSESSMENTS = {
    "independently_supported",
    "partially_supported",
    "not_independently_verified",
    "context_challenged",
    "contradicted",
    "open",
}

YIELD_WORDS = re.compile(r"\b(?:apy|apr|yield|interest|return|rendite|zins|zinsen|earn)\b", re.I)
COMMISSION_WORDS = re.compile(r"\b(?:affiliate|referral|commission|provision|partner|empfehlung)\b", re.I)
CHALLENGE_WORDS = re.compile(
    r"\b(?:false|misleading|unverified|not verified|cannot verify|no evidence|unauthori[sz]ed|"
    r"unlicensed|illegal|fictitious|warning|warned|revoked|suspended|"
    r"unbestaetigt|nicht bestaetigt|nicht verifiziert|keine belege|warnung|unerlaubt)\b",
    re.I,
)


@dataclass
class Comparison:
    id: str
    topic: str
    project_statement: str
    project_value: str
    project_source_url: str
    project_evidence: str
    assessment: str
    explanation: str
    external_support: list[dict]
    external_challenges: list[dict]
    open_question: str


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def number_from_value(value: str) -> float | None:
    m = re.search(r"(?<!\d)(\d{1,3}(?:[.,]\d+)?)\s*%", clean(value))
    return float(m.group(1).replace(",", ".")) if m else None


def _source_role(trace: dict) -> str:
    relation = clean(trace.get("source_relation") or "")
    if relation in SOURCE_RANK:
        return relation
    role = clean(trace.get("source_role") or "")
    return role if role in SOURCE_RANK else "unknown"


def source_rank(record: dict) -> int:
    return SOURCE_RANK.get(_source_role(record), 0)


def source_view(record: dict) -> dict:
    return {
        "source_url": clean(record.get("source_url") or ""),
        "title": clean(record.get("title") or ""),
        "evidence": clean(record.get("evidence") or ""),
        "published_at": clean(record.get("published_at") or ""),
        "source_role": _source_role(record),
        "source_rank": source_rank(record),
    }


def _trace_text(trace: dict) -> str:
    return clean(" ".join([
        trace.get("title") or "",
        trace.get("evidence") or "",
    ]))


def _topic_matches(trace: dict, topic: str, value: float | None) -> bool:
    text = _trace_text(trace)
    if not text:
        return False
    if value is not None:
        forms = {f"{value:g}%", f"{value:g} %"}
        if not any(form.lower() in text.lower() for form in forms):
            return False
    if topic == "yield":
        return bool(YIELD_WORDS.search(text))
    if topic == "affiliate_commission":
        return bool(COMMISSION_WORDS.search(text))
    return False


def _external_for_topic(data: dict, topic: str, value: float | None) -> tuple[list[dict], list[dict]]:
    ext = data.get("external_research") or {}
    traces = list(ext.get("traces") or [])
    review = list(ext.get("review_candidates") or [])
    matching = [t for t in traces + review if _topic_matches(t, topic, value)]

    support: list[dict] = []
    challenges: list[dict] = []
    for trace in matching:
        text = _trace_text(trace)
        view = source_view(trace)
        if CHALLENGE_WORDS.search(text):
            challenges.append(view)
        else:
            support.append(view)
    support.sort(key=lambda x: (-x["source_rank"], x["source_url"]))
    challenges.sort(key=lambda x: (-x["source_rank"], x["source_url"]))
    return support, challenges


def _best_project_finding(analysis: dict, finding_type: str, value: float | None = None) -> dict:
    candidates = [f for f in analysis.get("findings") or [] if f.get("type") == finding_type]
    if value is not None:
        matching = [f for f in candidates if number_from_value(f.get("value") or "") == value]
        if matching:
            candidates = matching
    rank = {"high": 2, "medium": 1, "low": 0}
    candidates.sort(key=lambda f: -rank.get(f.get("confidence") or "", 0))
    return candidates[0] if candidates else {}


def _numeric_comparison(data: dict, topic: str, value: float, finding_type: str, statement: str, question: str) -> Comparison:
    analysis = data.get("analysis") or {}
    finding = _best_project_finding(analysis, finding_type, value)
    support, challenges = _external_for_topic(data, topic, value)

    high_support = [s for s in support if s["source_rank"] >= SOURCE_RANK["independent"]]
    high_challenges = [s for s in challenges if s["source_rank"] >= SOURCE_RANK["independent"]]

    if high_challenges:
        assessment = "contradicted"
        explanation = "Mindestens eine unabhaengige oder hoeherrangige externe Quelle stellt diese konkrete Projektaussage in Frage."
    elif high_support:
        assessment = "independently_supported"
        explanation = "Mindestens eine vom Projekt getrennte, unabhaengige Quelle nennt dieselbe konkrete Angabe."
    elif support:
        assessment = "partially_supported"
        explanation = "Es gibt passende externe Spuren, diese erreichen aber nicht die Stufe einer unabhaengigen Bestaetigung."
    else:
        assessment = "not_independently_verified"
        explanation = "In der bisherigen externen Recherche wurde fuer diese konkrete Angabe keine unabhaengige Bestaetigung gefunden."

    return Comparison(
        id=topic,
        topic=topic,
        project_statement=statement,
        project_value=f"{value:g}%",
        project_source_url=clean(finding.get("source_url") or ""),
        project_evidence=clean(finding.get("evidence") or ""),
        assessment=assessment,
        explanation=explanation,
        external_support=support[:8],
        external_challenges=challenges[:8],
        open_question=question,
    )


def _profile_for_entity(data: dict, entity: str) -> dict:
    op = data.get("operator_registry_research") or {}
    for profile in op.get("profiles") or []:
        if clean(profile.get("entity") or "").lower() == clean(entity).lower():
            return profile
    return {}


def _operator_comparison(data: dict, entity: str, index: int) -> Comparison:
    profile = _profile_for_entity(data, entity)
    official = list(profile.get("official_or_registry_records") or [])
    owned = list(profile.get("entity_owned_records") or [])
    independent = list(profile.get("independent_records") or [])
    contexts = list(profile.get("authority_context_records") or [])
    connection = clean(profile.get("project_connection_status") or "")
    existence = clean(profile.get("existence_status") or "not_verified")

    support_records = independent + owned + official
    support = [source_view(x) for x in support_records]
    support.sort(key=lambda x: (-x["source_rank"], x["source_url"]))
    challenges = [source_view(x) for x in contexts]
    challenges.sort(key=lambda x: (-x["source_rank"], x["source_url"]))

    if connection == "externally_linked" and not challenges:
        assessment = "independently_supported"
        explanation = f"Eine externe Quelle verknuepft {entity} mit dem Projekt; die Rechtstraegerspur ist ausserhalb der Projektwebsite nachvollziehbar."
    elif challenges:
        assessment = "context_challenged"
        explanation = (
            f"Zu {entity} existiert eine externe Rechtstraeger-/Registerspur. Die Verbindung zu KryptoSavings ist jedoch nicht unabhaengig belegt; "
            "zusaetzlich liegt ein hoeherrangiger Behoerdenkontext vor, der die institutionelle Einordnung der verwendeten Register-/Lizenzquelle in Frage stellt."
        )
    elif existence != "not_verified":
        assessment = "partially_supported"
        explanation = (
            f"{entity} ist ausserhalb der Projektwebsite als Rechtstraeger bzw. Organisation auffindbar. "
            "Die behauptete Rolle oder Verbindung zu KryptoSavings wurde bisher nicht unabhaengig bestaetigt."
        )
    else:
        assessment = "not_independently_verified"
        explanation = f"Fuer {entity} wurde bislang weder eine belastbare externe Rechtstraegerspur noch eine unabhaengige Verbindung zu KryptoSavings festgestellt."

    project_evidence = ""
    project_url = ""
    for finding in (data.get("analysis") or {}).get("findings") or []:
        if finding.get("type") == "legal_entity" and clean(finding.get("value") or "").lower() == entity.lower():
            project_evidence = clean(finding.get("evidence") or "")
            project_url = clean(finding.get("source_url") or "")
            break

    return Comparison(
        id=f"operator_{index}",
        topic="operator_relation",
        project_statement=f"Auf der Projektwebsite erscheint {entity} als Rechtstraeger-/Betreiberhinweis.",
        project_value=entity,
        project_source_url=project_url,
        project_evidence=project_evidence,
        assessment=assessment,
        explanation=explanation,
        external_support=support[:10],
        external_challenges=challenges[:10],
        open_question=f"Welche konkrete vertragliche oder operative Rolle hat {entity} bei KryptoSavings, und welche vom Projekt unabhaengige Quelle bestaetigt diese Verbindung?",
    )


def build_open_questions(data: dict, comparisons: Iterable[Comparison]) -> list[str]:
    questions: list[str] = []
    for q in (data.get("analysis") or {}).get("questions") or []:
        q = clean(q)
        if q and q not in questions:
            questions.append(q)
    for comparison in comparisons:
        if comparison.assessment != "independently_supported":
            q = clean(comparison.open_question)
            if q and q not in questions:
                questions.append(q)
    return questions[:30]


def enrich(data: dict) -> dict:
    result = json.loads(json.dumps(data))
    analysis = result.get("analysis") or {}
    operator = result.get("operator_registry_research") or {}
    comparisons: list[Comparison] = []

    max_yield = analysis.get("max_yield_percentage")
    if isinstance(max_yield, (int, float)):
        comparisons.append(_numeric_comparison(
            result,
            "yield",
            float(max_yield),
            "yield_percentage",
            f"Das Projekt bewirbt eine Rendite-/Zinsangabe bis {float(max_yield):g}%.",
            "Welche vom Projekt unabhaengige Quelle belegt die konkrete Renditeangabe und den Mechanismus, aus dem sie erwirtschaftet wird?",
        ))

    max_commission = analysis.get("max_commission_percentage")
    if isinstance(max_commission, (int, float)):
        comparisons.append(_numeric_comparison(
            result,
            "affiliate_commission",
            float(max_commission),
            "commission_percentage",
            f"Das Projekt bewirbt eine Affiliate-/Empfehlungsprovision bis {float(max_commission):g}%.",
            "Wie genau entsteht die maximale Provision, wer finanziert sie und welche Bedingungen gelten fuer jede Ebene bzw. Verguetungsart?",
        ))

    entities = [clean(x) for x in operator.get("entities_from_project_website") or analysis.get("legal_entities") or [] if clean(x)]
    for idx, entity in enumerate(dict.fromkeys(entities), start=1):
        comparisons.append(_operator_comparison(result, entity, idx))

    counts = {assessment: 0 for assessment in ASSESSMENTS}
    for comparison in comparisons:
        counts[comparison.assessment] = counts.get(comparison.assessment, 0) + 1

    tensions = []
    for comparison in comparisons:
        if comparison.assessment in {"context_challenged", "contradicted"}:
            tensions.append({
                "comparison_id": comparison.id,
                "topic": comparison.topic,
                "project_statement": comparison.project_statement,
                "assessment": comparison.assessment,
                "explanation": comparison.explanation,
                "challenge_sources": comparison.external_challenges,
            })

    result["academy_analysis"] = {
        "status": "ok" if comparisons else "no_comparable_claims",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "principle": (
            "Projektangaben, externe Spuren und Behoerdenkontext werden getrennt gehalten. "
            "Nicht gefunden bedeutet nicht automatisch falsch; ein Registereintrag bestaetigt nicht automatisch die Projektverbindung."
        ),
        "source_hierarchy": [
            {"source_role": role, "rank": rank}
            for role, rank in sorted(SOURCE_RANK.items(), key=lambda x: (-x[1], x[0]))
        ],
        "summary": {
            "comparison_count": len(comparisons),
            "counts_by_assessment": counts,
            "open_question_count": 0,
            "tension_count": len(tensions),
        },
        "comparisons": [asdict(c) for c in comparisons],
        "tensions": tensions,
        "open_questions": [],
        "guardrails": {
            "risk_score_created": False,
            "fraud_verdict_created": False,
            "seriousness_verdict_created": False,
        },
    }
    questions = build_open_questions(result, comparisons)
    result["academy_analysis"]["open_questions"] = questions
    result["academy_analysis"]["summary"]["open_question_count"] = len(questions)
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description="Akademie Research Engine · Vergleichsmotor")
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
