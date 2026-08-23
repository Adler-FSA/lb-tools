#!/usr/bin/env python3
"""Maschinenlesbare 16-Punkte-Akademieprüfung.

Der Motor setzt den verbindlichen internen Analyseleitfaden auf die bereits
vorhandene Research-Pipeline. Er darf Forschungslücken nicht mit Annahmen
füllen. Eine Ampel-Gesamtbewertung wird erst freigegeben, wenn die wesentlichen
Vorfragen genügend belastbare Belege besitzen.
"""
from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent
STANDARD_PATH = ROOT / "analysis_standard_16.json"

STATES = {
    "supported",
    "partially_answered",
    "clarification_needed",
    "conflict_found",
    "research_gap",
    "overall_not_ready",
    "overall_ready",
}

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

FEE_RE = re.compile(r"\b(?:fee|fees|gebühr|gebuehr|spread|fx|gas|performance fee|exit fee|withdrawal fee|network fee)\b", re.I)
REVENUE_RE = re.compile(r"\b(?:trading|arbitrage|market making|lending|borrow|staking|defi|yield strategy|revenue|interest)\b", re.I)
UTILITY_RE = re.compile(r"\b(?:problem|utility|use case|target group|customer|service|payment|savings|save|wealth|financial freedom|access)\b", re.I)
PERSON_RE = re.compile(r"\b(?:founder|ceo|director|owner|beneficial owner|management|team|geschäftsführer|geschaeftsfuehrer|gründer|gruender)\b", re.I)


@dataclass
class Evidence:
    source_url: str
    source_role: str
    source_rank: int
    label: str
    evidence: str


@dataclass
class QuestionResult:
    id: int
    title: str
    standard: str
    state: str
    finding: str
    evidence: list[dict] = field(default_factory=list)
    counter_evidence: list[dict] = field(default_factory=list)
    gaps: list[str] = field(default_factory=list)
    next_research: list[str] = field(default_factory=list)
    traffic_light_ready: bool = False
    traffic_light: str | None = None


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def load_standard() -> dict:
    return json.loads(STANDARD_PATH.read_text(encoding="utf-8"))


def _rank(role: str) -> int:
    return SOURCE_RANK.get(clean(role), 0)


def _ev(url: str, role: str, label: str, text: str) -> dict:
    return asdict(Evidence(clean(url), clean(role) or "unknown", _rank(role), clean(label), clean(text)))


def _project_findings(data: dict, types: Iterable[str] | None = None, rx: re.Pattern | None = None) -> list[dict]:
    findings = list((data.get("analysis") or {}).get("findings") or [])
    wanted = set(types or [])
    out = []
    for f in findings:
        if wanted and f.get("type") not in wanted:
            continue
        hay = clean(" ".join([f.get("value") or "", f.get("evidence") or ""]))
        if rx and not rx.search(hay):
            continue
        out.append(_ev(f.get("source_url") or "", "project_owned", f.get("type") or "project finding", f.get("evidence") or f.get("value") or ""))
    return out


def _comparison(data: dict, topic: str) -> list[dict]:
    return [c for c in (data.get("academy_analysis") or {}).get("comparisons") or [] if c.get("topic") == topic]


def _comparison_evidence(comparisons: list[dict]) -> tuple[list[dict], list[dict]]:
    support, challenge = [], []
    for c in comparisons:
        if c.get("project_source_url") or c.get("project_evidence"):
            support.append(_ev(c.get("project_source_url") or "", "project_owned", "Projektangabe", c.get("project_evidence") or c.get("project_statement") or ""))
        for x in c.get("external_support") or []:
            support.append(_ev(x.get("source_url") or "", x.get("source_role") or "unknown", x.get("title") or "externe Stütze", x.get("evidence") or ""))
        for x in c.get("external_challenges") or []:
            challenge.append(_ev(x.get("source_url") or "", x.get("source_role") or "unknown", x.get("title") or "Gegenquelle", x.get("evidence") or ""))
    return _dedupe(support), _dedupe(challenge)


def _dedupe(items: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for item in items:
        key = (item.get("source_url"), item.get("label"), item.get("evidence"))
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    out.sort(key=lambda x: (-int(x.get("source_rank") or 0), x.get("source_url") or ""))
    return out


def _operator_records(data: dict) -> tuple[list[dict], list[dict], list[dict]]:
    op = data.get("operator_registry_research") or {}
    profiles = list(op.get("profiles") or [])
    support, challenge = [], []
    for p in profiles:
        entity = clean(p.get("entity") or "")
        for key in ("official_or_registry_records", "entity_owned_records", "independent_records"):
            for r in p.get(key) or []:
                support.append(_ev(r.get("source_url") or "", r.get("source_role") or "unknown", entity or r.get("title") or "Rechtsträgerspur", r.get("evidence") or ""))
        for r in p.get("authority_context_records") or []:
            challenge.append(_ev(r.get("source_url") or "", r.get("source_role") or "unknown", r.get("title") or "Behördenkontext", r.get("evidence") or ""))
    return profiles, _dedupe(support), _dedupe(challenge)


def _external_text_matches(data: dict, rx: re.Pattern) -> list[dict]:
    ext = data.get("external_research") or {}
    out = []
    for trace in list(ext.get("traces") or []) + list(ext.get("review_candidates") or []):
        text = clean(" ".join([trace.get("title") or "", trace.get("evidence") or ""]))
        if rx.search(text):
            role = trace.get("source_relation") or "unknown"
            out.append(_ev(trace.get("source_url") or "", role, trace.get("title") or "externe Spur", trace.get("evidence") or ""))
    return _dedupe(out)


def _q(defn: dict, state: str, finding: str, evidence=None, counter=None, gaps=None, next_research=None, ready=False) -> QuestionResult:
    assert state in STATES
    return QuestionResult(
        id=int(defn["id"]), title=defn["title"], standard=defn["standard"], state=state,
        finding=clean(finding), evidence=_dedupe(list(evidence or [])), counter_evidence=_dedupe(list(counter or [])),
        gaps=[clean(x) for x in (gaps or []) if clean(x)],
        next_research=[clean(x) for x in (next_research or []) if clean(x)],
        traffic_light_ready=bool(ready), traffic_light=None,
    )


def build_questions(data: dict, standard: dict) -> list[QuestionResult]:
    defs = {int(x["id"]): x for x in standard.get("questions") or []}
    analysis = data.get("analysis") or {}
    detected = analysis.get("detected") or {}
    risk_signals = list(analysis.get("risk_signals") or [])
    tensions = list((data.get("academy_analysis") or {}).get("tensions") or [])
    profiles, operator_support, operator_challenge = _operator_records(data)
    results: list[QuestionResult] = []

    # 1 Produkt
    product_terms = [name for name in ("staking", "defi", "trading", "leverage", "lending", "lockup", "custody") if detected.get(name)]
    yield_v = analysis.get("max_yield_percentage")
    ev1 = _project_findings(data, ["yield_percentage", "staking", "defi", "trading", "leverage", "lending", "lockup", "custody"])
    if product_terms or isinstance(yield_v, (int, float)):
        parts = []
        if isinstance(yield_v, (int, float)):
            parts.append(f"Earn-/Renditeangebot bis {float(yield_v):g}%")
        if product_terms:
            parts.append("erkannte Bausteine: " + ", ".join(product_terms))
        results.append(_q(defs[1], "partially_answered", "; ".join(parts) + ".", ev1,
                          gaps=["Vertragliche Produktstruktur und konkrete Kundenrechte sind noch nicht vollständig extrahiert."],
                          next_research=["Terms/Produktbedingungen je Produktart strukturiert extrahieren."], ready=False))
    else:
        results.append(_q(defs[1], "research_gap", "Das konkrete Produkt lässt sich aus dem aktuellen Datenstand noch nicht belastbar beschreiben.", gaps=["Produktdefinition fehlt."], next_research=["Produkt-, FAQ- und Vertragsseiten vertieft auswerten."]))

    # 2 Problem/Nutzen
    utility = _project_findings(data, rx=UTILITY_RE)
    if utility:
        results.append(_q(defs[2], "clarification_needed", "Die Projektwebsite enthält Nutzen-/Zielgruppenhinweise, aber der reale Bedarf und ein vom Rendite-/Referral-Anreiz unabhängiger Nutzen sind noch nicht belegt.", utility,
                          gaps=["Kein belastbarer Markt-/Bedarfsnachweis.", "Eigenständiger Nutzen gegenüber Rendite/Bonus/Referral noch nicht getrennt."],
                          next_research=["Use-Case, Zielgruppe und Marktbedarf unabhängig recherchieren."]))
    else:
        results.append(_q(defs[2], "research_gap", "Der aktuelle Research-Datensatz enthält noch keinen belastbaren Nachweis zum realen Problem, Zielmarkt und eigenständigen Nutzen.", gaps=["Use-Case-/Marktprüfung fehlt."], next_research=["Projekt-Nutzenversprechen und unabhängigen Marktbedarf recherchieren."]))

    # 3 Konsistenz
    cmp_all = list((data.get("academy_analysis") or {}).get("comparisons") or [])
    ev3, counter3 = _comparison_evidence(cmp_all)
    if tensions:
        results.append(_q(defs[3], "conflict_found", f"Die öffentliche Darstellung ist nicht vollständig widerspruchsfrei einordenbar: {len(tensions)} Quellen-/Behördenspannung(en) wurden erkannt.", ev3, counter3,
                          gaps=["Weitere Projektunterlagen und externe Gegenprüfung einzelner Aussagen fehlen."], next_research=["Marketing-, Terms- und Betreiberbehauptungen Aussage für Aussage spiegeln."]))
    elif cmp_all:
        results.append(_q(defs[3], "partially_answered", "Mehrere Kernaussagen wurden bereits gegen externe Quellen gespiegelt; für eine vollständige Konsistenzprüfung fehlen weitere Projekt- und Vertriebsmaterialien.", ev3, counter3, gaps=["Noch kein vollständiger Vergleich aller öffentlichen Aussagen."], next_research=["Weitere FAQ, Präsentationen, Videos und Vertriebsaussagen einbeziehen."]))
    else:
        results.append(_q(defs[3], "research_gap", "Noch keine ausreichende Gegenprüfung der öffentlichen Aussagen vorhanden.", gaps=["Vergleichsdaten fehlen."]))

    # 4 Betreiber
    entities = [clean(p.get("entity") or "") for p in profiles if clean(p.get("entity") or "")]
    if profiles:
        linked = [p for p in profiles if p.get("project_connection_status") == "externally_linked"]
        if linked and not operator_challenge:
            state = "partially_answered"
            finding = "Externe Rechtsträgerspuren sind vorhanden; mindestens eine Projektverbindung ist extern belegt. Vollständige Betreiber-, Eigentümer- und Registerdaten sind noch zu vervollständigen."
        elif operator_challenge:
            state = "conflict_found"
            finding = "Mehrere Rechtsträger sind außerhalb der Projektwebsite auffindbar, ihre konkrete Rolle bei KryptoSavings ist jedoch nicht unabhängig belegt; zusätzlich besteht Behördenkontext zur institutionellen Einordnung einzelner Registerspuren."
        else:
            state = "clarification_needed"
            finding = "Rechtsträgerspuren wurden gefunden, aber die konkrete Betreiber-/Vertragspartnerrolle bei KryptoSavings ist noch nicht unabhängig belegt."
        results.append(_q(defs[4], state, finding + (" Erkannte Namen: " + ", ".join(entities) + "." if entities else ""), operator_support, operator_challenge,
                          gaps=["Konkreter Vertragspartner je Dienstleistung.", "Firmennummer, Sitz, Anschrift, Direktoren und wirtschaftlich Berechtigte noch nicht vollständig für alle Rollen belegt."],
                          next_research=["Offizielle Register je Rechtsträger und Projektverbindung separat vertiefen."]))
    else:
        results.append(_q(defs[4], "research_gap", "Kein belastbares Betreiberprofil erzeugt.", gaps=["Betreiber-/Rechtsträgerprüfung fehlt."]))

    # 5 Kontrolle/Historie
    people = _external_text_matches(data, PERSON_RE)
    if people:
        results.append(_q(defs[5], "clarification_needed", "Es gibt Personen-/Managementspuren, aber Eigentum, Kontrolle, Qualifikation, frühere Projekte und operative Substanz sind noch nicht vollständig belegt.", people,
                          gaps=["UBO/Eigentümerstruktur unvollständig.", "Historie, Qualifikation und frühere Projekte nicht vollständig geprüft."], next_research=["Personen-, UBO-, Historien-, Insolvenz- und Warnspur-Recherche ausführen."]))
    else:
        results.append(_q(defs[5], "research_gap", "Der aktuelle Datenstand belegt noch nicht, wer das Unternehmen tatsächlich kontrolliert und welche belastbare Historie Management/Eigentümer besitzen.", gaps=["Management-/UBO-/Historienmodul fehlt."], next_research=["Personen und verbundene Gesellschaften recherchieren."]))

    # 6 Regulierung
    official_records = []
    for p in profiles:
        official_records.extend(p.get("official_or_registry_records") or [])
    ev6 = [_ev(x.get("source_url") or "", x.get("source_role") or "unknown", x.get("entity") or x.get("title") or "Register/Lizenz", x.get("evidence") or "") for x in official_records]
    if operator_challenge:
        results.append(_q(defs[6], "conflict_found", "Register-/Lizenzspuren wurden gefunden, ihre regulatorische Bedeutung ist aber nicht ausreichend geklärt und wird durch höherrangigen Behördenkontext herausgefordert.", ev6, operator_challenge,
                          gaps=["Erlaubte Dienstleistungen, Zielmarkt und Passporting sind nicht belegt.", "Die konkrete lizenzierte juristische Person muss zur angebotenen Dienstleistung passen."], next_research=["Zuständige Aufsicht und konkreten Erlaubnisumfang je Rechtsträger prüfen."]))
    elif ev6:
        results.append(_q(defs[6], "clarification_needed", "Es existieren Register-/Lizenzspuren; der konkrete regulatorische Erlaubnisumfang für die angebotenen KryptoSavings-Dienstleistungen ist noch nicht vollständig belegt.", ev6,
                          gaps=["Dienstleistungsumfang/Zielmarkt/Passporting offen."], next_research=["Primäraufsicht und Erlaubnisumfang prüfen."]))
    else:
        results.append(_q(defs[6], "research_gap", "Keine belastbare regulatorische Erlaubnis für die konkrete angebotene Dienstleistung ist im aktuellen Datenstand nachgewiesen.", gaps=["Regulatorischer Primärnachweis fehlt."], next_research=["BaFin/ESMA/EBA und zuständige internationale Aufsichten prüfen."]))

    # 7 Custody
    ev7 = _project_findings(data, ["custody", "withdrawal", "kyc"])
    if detected.get("custody"):
        results.append(_q(defs[7], "clarification_needed", "Custody/Verwahrung wird auf der Projektwebsite thematisiert; Private-Key-Kontrolle, Segregation, Insolvenzschutz, Sperrrechte und konkrete Gegenparteien sind noch nicht vollständig belegt.", ev7,
                          gaps=["Wallet-Architektur/Private-Key-Kontrolle offen.", "Segregation und Insolvenzschutz offen.", "Auszahlungsfreigabe und Banking-/Custody-Partner offen."], next_research=["Custody-, Wallet- und Gegenparteienmodul vertiefen."]))
    else:
        results.append(_q(defs[7], "research_gap", "Der aktuelle Datenstand beantwortet die Kontrolle über Kundengelder und Assets nicht ausreichend.", gaps=["Custody-/Walletnachweis fehlt."]))

    # 8 Gebühren
    ev8 = _project_findings(data, rx=FEE_RE)
    if ev8:
        results.append(_q(defs[8], "clarification_needed", "Gebühren-/Kostenhinweise sind vorhanden, aber eine vollständige effektive Kostenrechnung liegt noch nicht vor.", ev8,
                          gaps=["Vollständiges Gebührenblatt und Beispielrechnung fehlen."], next_research=["Entry-, laufende-, Spread-, FX-, Gas-, Performance-, Exit- und Withdrawal-Kosten extrahieren und rechnen."]))
    else:
        results.append(_q(defs[8], "research_gap", "Die Engine hat noch keine vollständige, belastbare Gebührenstruktur extrahiert.", gaps=["Gebühren-/Kostenmodul fehlt."], next_research=["Terms, FAQ und Gebührenseiten gezielt auf Kosten durchsuchen."]))

    # 9 Marktüblichkeit/Plausibilität
    yield_cmp = _comparison(data, "yield")
    ev9, counter9 = _comparison_evidence(yield_cmp)
    if isinstance(yield_v, (int, float)):
        results.append(_q(defs[9], "clarification_needed", f"Eine Renditeangabe bis {float(yield_v):g}% ist belegt. Marktvergleich, notwendige Bruttorendite, Drawdowns, Volatilität, Leverage-Effekt und Kosten sind noch nicht mathematisch gegengeprüft.", ev9, counter9,
                          gaps=["Marktbenchmark fehlt.", "Plausibilitäts-/Zinseszins-/Drawdownrechnung fehlt."], next_research=["Vergleichsrenditen und Risikoprofil ähnlicher Produkte ermitteln und mathematisch gegenrechnen."]))
    else:
        results.append(_q(defs[9], "research_gap", "Keine belastbare Rendite-/Preis-Plausibilitätsprüfung möglich.", gaps=["Preis-/Renditedaten oder Marktvergleich fehlen."]))

    # 10 Ertragsquelle
    ev10 = _project_findings(data, rx=REVENUE_RE)
    ext10 = _external_text_matches(data, REVENUE_RE)
    if any(detected.get(x) for x in ("trading", "lending", "staking", "defi")):
        results.append(_q(defs[10], "clarification_needed", "Die Projektwebsite nennt bzw. signalisiert Ertragsmechanismen wie Trading/Lending/Staking/DeFi. Eine unabhängige, quantitative Bestätigung der tatsächlichen Ertragsquelle fehlt bislang.", ev10 + ext10,
                          gaps=["Quantitativer Geldfluss und reale operative Erträge fehlen.", "Unabhängiger Nachweis der Ertragsquelle fehlt."], next_research=["Strategie, Gegenparteien, Performancehistorie und Geldfluss vertiefen."]))
    else:
        results.append(_q(defs[10], "research_gap", "Die tatsächliche Quelle der Kundenrenditen ist im aktuellen Datensatz nicht belastbar erklärt.", gaps=["Ertragsquellen-/Geldflussnachweis fehlt."]))

    # 11 Referral
    commission = analysis.get("max_commission_percentage")
    ev11 = _project_findings(data, ["commission_percentage", "referral", "bonus"])
    if detected.get("referral") or isinstance(commission, (int, float)):
        text = f"Ein Empfehlungs-/Affiliate-Modell ist belegt" + (f"; direkte Provisionen bis {float(commission):g}% wurden erkannt" if isinstance(commission, (int, float)) else "") + "."
        results.append(_q(defs[11], "partially_answered", text, ev11,
                          gaps=["Ebenen, Ränge, Voraussetzungen, indirekte Vergütungen und Einzahlungs-/Umsatzbezug sind noch nicht vollständig zerlegt."], next_research=["Vergütungsplan vollständig modellieren und Geldfluss pro Einzahlung berechnen."]))
    else:
        results.append(_q(defs[11], "research_gap", "Kein vollständiger Vergütungsplan im aktuellen Datensatz vorhanden.", gaps=["Referral-/Partnerplan ungeklärt."]))

    # 12 Nachhaltigkeit
    results.append(_q(defs[12], "research_gap", "Die wirtschaftliche Nachhaltigkeit ohne neue Teilnehmer kann aus dem aktuellen Datenstand noch nicht belastbar berechnet werden.",
                      gaps=["Operative Umsätze/Erträge, Kosten, Kundenverbindlichkeiten, Provisionen, Boni und Rückstellungen sind nicht als vollständiger Geldfluss verfügbar."],
                      next_research=["Szenario- und Break-even-Modell auf Basis der Ertragsquellen, Renditen, Provisionen und Betriebskosten erstellen."]))

    # 13 Auszahlungen/Boni/Garantien
    ev13 = _project_findings(data, ["withdrawal", "bonus", "guarantee", "percentage_other"])
    parts = []
    if detected.get("withdrawal"):
        parts.append("Auszahlungsbedingungen werden erwähnt")
    if detected.get("bonus"):
        parts.append("Bonus-/Incentive-Aussagen sind vorhanden")
    if detected.get("guarantee"):
        parts.append("Garantieaussage wurde erkannt")
    else:
        parts.append("keine positive Garantieaussage wurde im aktuellen Crawl bestätigt")
    results.append(_q(defs[13], "clarification_needed", "; ".join(parts) + ". Einzelne Auszahlungen oder Boni würden weder Solvenz noch Nachhaltigkeit beweisen.", ev13,
                      gaps=["Unabhängige Auszahlungshistorie fehlt.", "Finanzierungsquelle der Boni fehlt.", "Vertragliche Verpflichtete und Durchsetzbarkeit von Laufzeitversprechen sind offen."], next_research=["Nutzerberichte/Belege zu Ein- und Auszahlungen sammeln und gegen Terms sowie Geldfluss spiegeln."]))

    # 14 Konkurrenzfähigkeit/Nutzbarkeit
    results.append(_q(defs[14], "research_gap", "Ein belastbarer Marktvergleich zu Funktion, Kosten, Liquidität, Limits, Support, Nutzerrechten und Alternativen wurde noch nicht durchgeführt.", gaps=["Vergleichsprodukte und reale Nutzbarkeit fehlen."], next_research=["Geeignete Vergleichsprodukte bestimmen und Kosten/Funktion/Liquidität gegenüberstellen."]))

    # 15 Risiken/Red Flags
    ev15 = []
    for s in risk_signals:
        ev15.append(_ev("", "project_owned", s.get("title") or s.get("id") or "Risikosignal", s.get("explanation") or ""))
    _, challenge15 = _comparison_evidence([c for c in (data.get("academy_analysis") or {}).get("comparisons") or [] if c.get("assessment") in {"context_challenged", "contradicted"}])
    if risk_signals or tensions:
        results.append(_q(defs[15], "partially_answered", f"Der bisherige Research-Lauf enthält {len(risk_signals)} strukturierte Risikoindikator(en) und {len(tensions)} Quellen-/Behördenspannung(en). Das ist noch keine vollständige Red-Flag-Gesamtprüfung.", ev15, challenge15,
                          gaps=["Cyber-, Smart-Contract-, Insolvenz-, Steuer-, Token-, Governance- und Schlüsselrisiken sind noch nicht vollständig projektbezogen geprüft."], next_research=["Risikomatrix aus allen Spezialmodulen zusammenführen."]))
    else:
        results.append(_q(defs[15], "research_gap", "Noch keine ausreichende Gesamtrisikomatrix vorhanden.", gaps=["Risikomodule unvollständig."]))

    # 16 Gesamtbewertung: bewusst gesperrt, solange Kernfragen offen sind.
    blocking = [r for r in results if r.id <= 15 and r.state in {"research_gap", "clarification_needed", "conflict_found"}]
    if blocking:
        results.append(_q(defs[16], "overall_not_ready", f"Eine belastbare Akademie-Gesamtampel wird noch nicht erzeugt. {len(blocking)} der ersten 15 Prüfpunkte enthalten wesentliche Forschungslücken, Klärungsbedarf oder Quellenkonflikte.",
                          gaps=[f"Punkt {r.id}: {r.title} — {r.state}" for r in blocking], next_research=["Offene Kernmodule schließen; erst danach Ampellogik anwenden."], ready=False))
    else:
        results.append(_q(defs[16], "overall_ready", "Die fachlichen Vorfragen sind ausreichend belegt; eine separate Ampellogik darf nun auf Nachweise, offene Punkte und negative Signale angewendet werden.", ready=True))

    return results


def enrich(data: dict) -> dict:
    result = json.loads(json.dumps(data))
    standard = load_standard()
    questions = build_questions(result, standard)
    counts: dict[str, int] = {}
    for q in questions:
        counts[q.state] = counts.get(q.state, 0) + 1
    ready_count = sum(1 for q in questions[:15] if q.traffic_light_ready)
    overall = next(q for q in questions if q.id == 16)
    result["sixteen_point_analysis"] = {
        "status": "ok",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "standard_version": standard.get("version"),
        "standard_source": standard.get("source"),
        "standard_source_repo": standard.get("source_repo"),
        "standard_source_path": standard.get("source_path"),
        "principle": "Forschungslücken werden sichtbar gelassen. Keine fehlende Information wird als Tatsache ergänzt. Die Gesamtampel bleibt gesperrt, bis wesentliche Vorfragen ausreichend recherchiert sind.",
        "summary": {
            "question_count": len(questions),
            "counts_by_state": counts,
            "questions_1_to_15": 15,
            "traffic_light_ready_count": ready_count,
            "overall_assessment_ready": overall.state == "overall_ready",
        },
        "questions": [asdict(q) for q in questions],
        "guardrails": {
            "invented_answers_allowed": False,
            "missing_information_equals_fraud": False,
            "overall_traffic_light_created": False,
            "fraud_verdict_created": False,
        },
    }
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description="Akademie Research Engine · 16-Punkte-Prüfung")
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
