#!/usr/bin/env python3
"""16-Punkte-Akademieprüfung.

Setzt den verbindlichen internen 16-Punkte-Leitfaden auf die bereits erzeugte
Research-Pipeline. Die Ampelfarbe beschreibt ausschließlich die Beleg- und
Klärungslage des jeweiligen Prüffeldes. Sie ist kein Betrugs-, Anlage- oder
Seriositätsurteil.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

QUESTIONS = [
    (1, "Was ist das konkrete Produkt?", "Produkt technisch und wirtschaftlich erklären: Was kauft, überträgt oder erhält der Kunde tatsächlich? Token, Karte, Earn-Produkt, Beteiligung, Lizenz, Service, Mining, Staking, Trading, Reiseprodukt oder Mischmodell sauber trennen."),
    (2, "Welches reale Problem soll gelöst werden?", "Problem, Zielgruppe und Nutzen prüfen. Gibt es dafür einen realen Markt? Ist der Nutzen eigenständig oder entsteht Attraktivität hauptsächlich durch Rendite, Bonus oder Empfehlungssystem?"),
    (3, "Ist die öffentliche Beschreibung sachlich und konsistent?", "Website, FAQ, Whitepaper, Präsentationen, Calls und Vertriebsaussagen vergleichen. Begriffe wie garantiert, dezentral, Bank, Kreditkarte, risikofrei, institutionell, Self-Custody oder lebenslang separat prüfen."),
    (4, "Wer ist der Betreiber?", "Vollständiger Rechtsträger, Firmennummer, Sitz, Geschäftsanschrift, Gründungsdatum, Registerstatus, wirtschaftlich Berechtigte, Direktoren und verbundene Gesellschaften recherchieren."),
    (5, "Wer kontrolliert das Unternehmen und welche Historie besteht?", "Management, Eigentümer, frühere Firmen, berufliche Historie, Qualifikation, frühere Projekte, Insolvenz- oder Warnsignale und tatsächliche operative Substanz prüfen. Identitätsverifikation ist kein Leistungsnachweis."),
    (6, "Welche regulatorische Erlaubnis liegt vor?", "Zuständige Behörde, Lizenznummer, konkrete juristische Person, erlaubte Dienstleistungen, Zielmarkt, Passporting, Status und mögliche Widerrufe dokumentieren."),
    (7, "Wo befinden sich Kundengelder und wer kontrolliert sie?", "Custody, Wallet-Architektur, Private-Key-Kontrolle, Sammelwallets, Segregation, Insolvenzschutz, Sperrrechte, Auszahlungsfreigaben, Banking-Partner und Gegenparteien nachvollziehen."),
    (8, "Wie transparent und vollständig sind Gebühren?", "Einstieg, laufende Gebühren, Spreads, FX, Gas, Performance Fee, Exit, Withdrawal, Netzwerk-, Karten-, Dritt- und versteckte Kosten erfassen. Effektive Kosten mit Beispielen berechnen."),
    (9, "Ist Preis oder Rendite marktüblich und plausibel?", "Marktvergleich durchführen. Bei Renditen Zinseszins, notwendige Bruttorendite, Verlustphasen, Drawdowns, Leverage, Volatilität und Kosten mathematisch gegenrechnen."),
    (10, "Woher entstehen Einnahmen und Erträge tatsächlich?", "Operative Umsätze, Trading, Gebühren, Token-Emission, Neu-Kapital, Subventionen, Affiliate, Revenue Share oder andere Quellen trennen. Ertragsquelle braucht unabhängige Nachweise, nicht nur Dashboard-Zahlen."),
    (11, "Gibt es Empfehlungs-, Partner- oder Mehrstufenvergütung?", "Vergütungsplan vollständig zerlegen: Ebenen, Ränge, Voraussetzungen, direkte/indirekte Provision, Umsatzbezug, Einzahlungsbezug, laufende Beteiligung und wirtschaftliche Bedeutung des Neukundenzuflusses."),
    (12, "Ist das Modell ohne neue Teilnehmer nachhaltig?", "Prüfen, ob externe operative Erträge die Kundenrenditen, Boni, Provisionen, Betrieb, Compliance und Rückstellungen tragen können. Wenn möglich Szenarien und Break-even-Rechnung erstellen."),
    (13, "Was beweisen Auszahlungen, Boni und Garantien wirklich?", "Einzelne Auszahlungen sind kein Solvenznachweis. Boni brauchen Finanzierungsquelle. Garantien, Laufzeitversprechen und lebenslang-Aussagen benötigen belastbare Vertragsgrundlage und tragfähigen Verpflichteten."),
    (14, "Ist das Produkt konkurrenzfähig und praktisch nutzbar?", "Funktion, Gebühren, Liquidität, Verfügbarkeit, Limits, Nutzerrechte, Support, Ein-/Auszahlung und Alternativen vergleichen. Nicht nur Features, sondern reale Nutzbarkeit bewerten."),
    (15, "Welche Hauptrisiken und Red Flags bestehen?", "Markt-, Liquiditäts-, Gegenpartei-, Verwahr-, Cyber-, Smart-Contract-, Insolvenz-, Rechts-, Steuer-, Vertriebs-, Token-, Governance-, Schlüssel- und Auszahlungsrisiken zusammenführen. Wechselwirkungen ausdrücklich benennen."),
    (16, "Akademie-Gesamtbewertung", "Das Gesamturteil muss positive Nachweise, offene Punkte und negative Signale gemeinsam gewichten. Kein einzelner grüner Punkt darf mehrere zentrale rote Kernrisiken überdecken. Ergebnis mit klarer Ampel und Begründung."),
]

ALLOWED_LIGHTS = {"green", "green-yellow", "yellow", "yellow-red", "red"}
LIGHT_SCORE = {"green": 0, "green-yellow": 1, "yellow": 2, "yellow-red": 3, "red": 4}


def clean(value) -> str:
    return " ".join(str(value or "").split())


def source_item(url="", evidence="", role="project_owned", title="") -> dict:
    return {"source_url": clean(url), "evidence": clean(evidence), "source_role": clean(role), "title": clean(title)}


def project_findings(data: dict, *types: str) -> list[dict]:
    wanted = set(types)
    return [f for f in (data.get("analysis") or {}).get("findings") or [] if f.get("type") in wanted]


def findings_sources(data: dict, *types: str, limit: int = 8) -> list[dict]:
    out = []
    for f in project_findings(data, *types):
        out.append(source_item(f.get("source_url"), f.get("evidence"), "project_owned", f.get("value")))
    return out[:limit]


def profiles(data: dict) -> list[dict]:
    return list((data.get("operator_registry_research") or {}).get("profiles") or [])


def operator_sources(data: dict) -> list[dict]:
    out = []
    for p in profiles(data):
        for key in ("official_or_registry_records", "entity_owned_records", "independent_records"):
            for r in p.get(key) or []:
                out.append(source_item(r.get("source_url"), r.get("evidence"), r.get("source_role"), r.get("title")))
    return out


def authority_sources(data: dict) -> list[dict]:
    out = []
    for r in (data.get("operator_registry_research") or {}).get("authority_context_records") or []:
        out.append(source_item(r.get("source_url"), r.get("evidence"), r.get("source_role"), r.get("title")))
    return out


def external_traces(data: dict, categories: set[str] | None = None) -> list[dict]:
    traces = list((data.get("external_research") or {}).get("traces") or [])
    if categories:
        traces = [t for t in traces if t.get("category") in categories]
    return [source_item(t.get("source_url"), t.get("evidence"), t.get("source_relation"), t.get("title")) for t in traces]


def comparison(data: dict, topic: str, project_value: str = "") -> dict:
    for c in (data.get("academy_analysis") or {}).get("comparisons") or []:
        if c.get("topic") != topic:
            continue
        if project_value and clean(c.get("project_value")).lower() != clean(project_value).lower():
            continue
        return c
    return {}


def result(number: int, light: str, finding: str, reasoning: str, evidence=None, missing=None, confidence="medium", provisional=False) -> dict:
    assert light in ALLOWED_LIGHTS
    q = QUESTIONS[number - 1]
    return {
        "number": number,
        "question": q[1],
        "guide_requirement": q[2],
        "traffic_light": light,
        "finding": clean(finding),
        "reasoning": clean(reasoning),
        "evidence": list(evidence or []),
        "missing_evidence": [clean(x) for x in (missing or []) if clean(x)],
        "confidence": confidence,
        "provisional": bool(provisional),
    }


def evaluate_1(data: dict) -> dict:
    a = data.get("analysis") or {}
    d = a.get("detected") or {}
    features = [name for name, flag in d.items() if flag and name in {"staking", "yield_or_interest", "defi", "trading", "leverage", "lending", "lockup", "custody"}]
    if features:
        return result(1, "yellow", f"Die Projektwebsite beschreibt ein Earn-/Krypto-Modell mit erkannten Komponenten: {', '.join(features)}.", "Das Produkt ist in wesentlichen Funktionsmerkmalen erkennbar, die vollständige rechtliche und wirtschaftliche Produktklassifikation ist aber noch nicht unabhängig geklärt.", findings_sources(data, "yield_percentage", "staking", "defi", "trading", "lending", "custody"), ["Verbindliche Produkt-/Vertragsklassifikation", "vollständiger Geldfluss je Produktvariante"])
    return result(1, "yellow-red", "Das konkrete Produkt konnte aus den bisherigen Quellen nicht hinreichend bestimmt werden.", "Für eine belastbare Prüfung muss zuerst eindeutig feststehen, was der Kunde rechtlich und wirtschaftlich erhält.", [], ["Produktvertrag", "Leistungsbeschreibung", "Geldfluss"])


def evaluate_2(data: dict) -> dict:
    a = data.get("analysis") or {}
    d = a.get("detected") or {}
    if d.get("yield_or_interest") or d.get("bonus") or d.get("referral"):
        return result(2, "yellow", "Rendite-, Bonus- und/oder Empfehlungsmerkmale sind öffentlich erkennbar; ein davon unabhängiger Kundennutzen ist noch nicht ausreichend belegt.", "Ein reales Problem kann vorhanden sein, darf aber nicht allein aus der Attraktivität von Rendite oder Vertriebsanreizen abgeleitet werden.", findings_sources(data, "yield_percentage", "commission_percentage", "bonus", "referral"), ["klarer Nutzennachweis außerhalb der Rendite", "Zielgruppe und Marktbedarf"])
    return result(2, "yellow", "Der reale Problemlösungsnutzen ist mit den bisherigen Research-Daten noch offen.", "Für diesen Punkt fehlen strukturierte Markt- und Nutzennachweise.", [], ["Zielgruppe", "Marktproblem", "Nutzennachweis"])


def evaluate_3(data: dict) -> dict:
    aa = data.get("academy_analysis") or {}
    tensions = aa.get("tensions") or []
    ext_count = len((data.get("external_research") or {}).get("traces") or [])
    if tensions:
        return result(3, "yellow-red", f"Die Projektbeschreibung enthält Aussagen, die im externen Quellenkontext nicht vollständig deckungsgleich abgesichert sind; {len(tensions)} Quellen-/Behördenspannung(en) wurden erkannt.", "Die Projektwebsite ist als Primärquelle dokumentiert, zentrale Betreiber-/Regulierungsbezüge benötigen jedoch Gegenprüfung und präzise Zuordnung.", authority_sources(data) + operator_sources(data)[:6], ["Abgleich weiterer Präsentationen/Calls/Whitepaper", "präzise Zuordnung regulatorischer Aussagen"])
    return result(3, "yellow", "Die öffentliche Beschreibung ist teilweise erfasst; für einen vollständigen Konsistenzcheck fehlen weitere externe Kommunikationsquellen.", "Website-Aussagen allein reichen für eine Konsistenzprüfung über alle Vertriebskanäle nicht aus.", external_traces(data), ["Präsentationen", "Vertriebsmaterial", "weitere öffentliche Aussagen"])


def evaluate_4(data: dict) -> dict:
    ps = profiles(data)
    if not ps:
        return result(4, "red", "Ein eindeutiger Betreiber konnte nicht belastbar festgestellt werden.", "Der Vertragspartner ist ein zentraler Sicherheits- und Rechtsnachweis.", [], ["eindeutiger Vertragspartner", "Registerdaten", "Geschäftsanschrift", "Verantwortliche"])
    names = [clean(p.get("entity")) for p in ps if clean(p.get("entity"))]
    linked = [p for p in ps if p.get("project_connection_status") == "externally_linked"]
    challenged = [p for p in ps if p.get("authority_context_records")]
    if not linked and challenged:
        return result(4, "red", f"Es wurden {len(names)} Rechtsträgerhinweise erkannt ({', '.join(names)}), aber keiner ist bislang unabhängig als konkreter KryptoSavings-Vertragspartner bestätigt; bei {len(challenged)} Profil(en) besteht zusätzlicher Behördenkontext.", "Die Existenz eines Rechtsträgers oder Registereintrags beweist nicht seine operative oder vertragliche Rolle beim Projekt.", operator_sources(data)[:10] + authority_sources(data)[:6], ["exakter Vertragspartner", "unabhängiger Beleg der Projektverbindung", "Sitz/Adresse und Verantwortliche"])
    if linked:
        return result(4, "yellow", f"Mindestens ein Rechtsträger ist extern mit dem Projekt verknüpft; insgesamt wurden {len(names)} Rechtsträgerhinweise erkannt.", "Weitere Pflichtangaben wie wirtschaftlich Berechtigte, Direktoren und verbundene Gesellschaften müssen vollständig geprüft werden.", operator_sources(data)[:12], ["wirtschaftlich Berechtigte", "Direktoren", "verbundene Gesellschaften"])
    return result(4, "yellow-red", f"Rechtsträgerspuren sind vorhanden ({', '.join(names)}), die konkrete Projektrolle ist aber nicht unabhängig bestätigt.", "Ein Registerfund ist nur ein Teil der Betreiberprüfung.", operator_sources(data)[:12], ["unabhängige Projektverbindung", "vollständige Betreiberstruktur"])


def evaluate_5(data: dict) -> dict:
    operator_ext = [t for t in (data.get("external_research") or {}).get("traces") or [] if t.get("category") == "operator"]
    if operator_ext:
        return result(5, "yellow", "Es existieren externe Betreiber-/Personenspuren, die Management- und Historienprüfung ist jedoch noch nicht vollständig.", "Identität allein ist kein Leistungsnachweis; Historie und operative Substanz müssen separat belegt werden.", external_traces(data, {"operator"}), ["Eigentümer/UBO", "Direktoren", "frühere Projekte", "berufliche Historie"])
    return result(5, "yellow-red", "Für kontrollierende Personen, Eigentümer und deren belastbare Historie liegen bislang keine ausreichend bestätigten externen Spuren vor.", "Dieser Pflichtpunkt bleibt wesentlich offen, obwohl die allgemeine externe Recherche bereits Betreiber-/Founder-Suchrichtungen ausgeführt hat.", [], ["Management", "Eigentümer/UBO", "Direktoren", "frühere Projekte", "operative Substanz"])


def evaluate_6(data: dict) -> dict:
    ps = profiles(data)
    contexts = authority_sources(data)
    official = [r for p in ps for r in (p.get("official_or_registry_records") or [])]
    linked_official = [r for r in official if r.get("project_connection") == "externally_linked" and r.get("source_role") in {"regulator", "government"}]
    if contexts and not linked_official:
        return result(6, "red", "Register-/Lizenzspuren wurden gefunden, ihre institutionelle Einordnung wird jedoch durch höherwertigen Behördenkontext herausgefordert; eine zuständige Behörde bestätigt die konkrete KryptoSavings-Erlaubnis bislang nicht.", "Eine Lizenznummer in einem Register ersetzt nicht den Nachweis, dass genau der KryptoSavings-Vertragspartner für genau die angebotene Dienstleistung im Zielmarkt zugelassen ist.", operator_sources(data)[:10] + contexts[:8], ["zuständige Aufsicht", "Lizenz des exakten Vertragspartners", "erlaubte Dienstleistungen", "Zielmarkt/Passporting"])
    if linked_official:
        return result(6, "green-yellow", "Eine offizielle Quelle verknüpft eine regulatorische Erlaubnis mit dem Projekt bzw. seinem konkreten Rechtsträger; Leistungsumfang und Zielmarkt bleiben vollständig abzugleichen.", "Der Kernnachweis ist stärker, aber die konkrete Deckung des angebotenen Produkts muss geprüft werden.", [source_item(r.get("source_url"), r.get("evidence"), r.get("source_role"), r.get("title")) for r in linked_official], ["erlaubte Dienstleistungen", "Zielmarkt/Passporting"])
    return result(6, "yellow-red", "Es liegt bislang keine belastbare offizielle Bestätigung der konkreten regulatorischen Erlaubnis für KryptoSavings vor.", "Regulierungsbehauptungen müssen Rechtsträger, Behörde, Lizenz und angebotene Dienstleistung eindeutig zusammenführen.", operator_sources(data)[:8], ["zuständige Behörde", "Lizenznummer", "Leistungsumfang", "Zielmarkt"])


def evaluate_7(data: dict) -> dict:
    d = (data.get("analysis") or {}).get("detected") or {}
    ev = findings_sources(data, "custody", "withdrawal")
    if d.get("custody"):
        return result(7, "yellow-red", "Custody/Verwahrung wird auf der Projektwebsite thematisiert, aber die tatsächliche Schlüssel-/Assetkontrolle, Segregation und Insolvenzbehandlung sind noch nicht unabhängig nachvollzogen.", "Die Aussage 'Custody' benennt noch nicht, wer Assets kontrolliert und welche Rechte Kunden im Ausfall haben.", ev, ["Custodian/Wallet-Architektur", "Private-Key-Kontrolle", "Segregation", "Insolvenzschutz", "Auszahlungsfreigabe"])
    return result(7, "red", "Die Kontrolle und Verwahrung von Kundengeldern ist aus den bisherigen Daten nicht belastbar geklärt.", "Bei einem Earn-/Krypto-Produkt ist dies ein zentraler Sicherheitsnachweis.", ev, ["Custody-Modell", "Private Keys", "Segregation", "Insolvenzschutz"])


def evaluate_8(data: dict) -> dict:
    return result(8, "yellow", "Die Research Engine hat bislang noch keinen vollständigen Gebührenkatalog mit Beispielrechnungen nachgewiesen.", "Einzelne Produktangaben reichen nicht; alle direkten und indirekten Kosten müssen für typische Beträge zusammengeführt werden.", findings_sources(data, "percentage_other"), ["vollständiges Gebührenblatt", "Spread/FX/Gas", "Exit/Withdrawal", "Drittkosten", "Beispielrechnungen"])


def evaluate_9(data: dict) -> dict:
    a = data.get("analysis") or {}
    y = a.get("max_yield_percentage")
    d = a.get("detected") or {}
    comp = comparison(data, "yield")
    if isinstance(y, (int, float)) and (d.get("leverage") or d.get("trading")) and comp.get("assessment") != "independently_supported":
        return result(9, "yellow-red", f"Bis zu {y:g}% Rendite werden beworben; zugleich sind Trading/Leverage-Elemente erkannt. Unabhängige Performance-, Drawdown- und Marktvergleichsdaten fehlen bislang.", "Die Höhe allein beweist weder Plausibilität noch Unplausibilität. Für die Einordnung müssen notwendige Bruttorendite, Verluste, Volatilität und Kosten gegengerechnet werden.", findings_sources(data, "yield_percentage", "trading", "leverage"), ["unabhängige Performance-Historie", "Drawdowns", "Marktvergleich", "Kostenbereinigung", "Bruttorendite-Rechnung"])
    if isinstance(y, (int, float)):
        return result(9, "yellow", f"Eine Rendite bis {y:g}% ist dokumentiert, die Marktüblichkeit und wirtschaftliche Plausibilität sind noch nicht vollständig gegengerechnet.", "Für eine grüne Bewertung reicht die Anbieterangabe nicht.", findings_sources(data, "yield_percentage"), ["Marktvergleich", "Performance-Historie", "Drawdowns", "Kosten"])
    return result(9, "yellow-red", "Eine belastbare Rendite-/Preisplausibilitätsprüfung ist noch nicht möglich.", "Vergleichs- und Rechendaten fehlen.", [], ["Preis-/Renditeangabe", "Marktvergleich", "Rechenmodell"])


def evaluate_10(data: dict) -> dict:
    d = (data.get("analysis") or {}).get("detected") or {}
    mechanisms = [x for x in ("staking", "trading", "leverage", "lending", "defi") if d.get(x)]
    if mechanisms:
        return result(10, "yellow-red", f"Die Projektwebsite nennt bzw. zeigt als mögliche Ertragsmechanismen: {', '.join(mechanisms)}. Für die tatsächlich erzielten Erträge liegen bislang keine unabhängigen Leistungsnachweise vor.", "Eine erklärte Strategie ist noch kein Nachweis, dass die versprochenen Kundenerträge nachhaltig erwirtschaftet werden.", findings_sources(data, "staking", "trading", "leverage", "lending", "defi", "yield_percentage"), ["unabhängige Ertragsnachweise", "reale Geldflüsse", "Nettoergebnis nach Kosten/Verlusten"])
    return result(10, "red", "Die tatsächliche Ertragsquelle konnte nicht belastbar nachvollzogen werden.", "Ohne nachvollziehbare Einnahmequelle ist die wirtschaftliche Tragfähigkeit nicht prüfbar.", [], ["operative Einnahmen", "Ertragsnachweise", "Geldfluss"])


def evaluate_11(data: dict) -> dict:
    a = data.get("analysis") or {}
    c = a.get("max_commission_percentage")
    if isinstance(c, (int, float)):
        return result(11, "yellow", f"Ein Referral-/Affiliate-Modell ist erkannt; die Projektwebsite bewirbt Provisionen bis {c:g}%.", "Der wirtschaftliche Empfehlungsanreiz ist damit belegt. Für eine vollständige Prüfung fehlen Ebenen, Bedingungen, Einzahlungsbezug und laufende Vergütungen im Gesamtplan.", findings_sources(data, "commission_percentage", "referral"), ["vollständiger Vergütungsplan", "Ebenen/Ränge", "Einzahlungs-/Umsatzbezug", "laufende Beteiligungen"])
    return result(11, "yellow", "Referral-/Partnerhinweise sind vorhanden, die vollständige Vergütungsstruktur ist noch nicht quantifiziert.", "Vertriebsanreize müssen vollständig zerlegt werden.", findings_sources(data, "referral"), ["Vergütungsplan", "Provisionen", "Ebenen"])


def evaluate_12(data: dict) -> dict:
    a = data.get("analysis") or {}
    y = a.get("max_yield_percentage")
    c = a.get("max_commission_percentage")
    ext = (data.get("external_research") or {}).get("traces") or []
    if isinstance(y, (int, float)) and isinstance(c, (int, float)) and not ext:
        return result(12, "yellow-red", f"Das Modell kombiniert öffentlich bis zu {y:g}% Rendite und bis zu {c:g}% Affiliate-Provision; ein unabhängiger Nachweis, dass operative Erträge diese Verpflichtungen ohne neuen Teilnehmerzufluss tragen, wurde bislang nicht gefunden.", "Das ist noch kein Beweis für mangelnde Nachhaltigkeit. Es ist ein zentraler offener wirtschaftlicher Nachweis, der per Szenario/Break-even geprüft werden muss.", findings_sources(data, "yield_percentage", "commission_percentage"), ["operative Ertragszahlen", "Kostenbasis", "Rückstellungen", "Break-even", "Szenario ohne Neukunden"])
    return result(12, "yellow", "Die Nachhaltigkeit ohne neue Teilnehmer ist mit den bisherigen Daten noch nicht abschließend prüfbar.", "Dafür werden belastbare operative Zahlen benötigt.", [], ["Umsätze", "Kosten", "Rückstellungen", "Break-even"])


def evaluate_13(data: dict) -> dict:
    d = (data.get("analysis") or {}).get("detected") or {}
    community = [t for t in (data.get("external_research") or {}).get("traces") or [] if t.get("category") == "community"]
    text = []
    if d.get("bonus"):
        text.append("Bonus")
    if d.get("withdrawal"):
        text.append("Auszahlung")
    if d.get("guarantee"):
        text.append("Garantie")
    else:
        text.append("keine positive Garantie-Aussage erkannt")
    return result(13, "yellow", f"Erkannt wurden: {', '.join(text)}. Belastbare unabhängige Auszahlungs-/Solvenznachweise sind bislang {'vorhanden' if community else 'nicht vorhanden'}.", "Einzelne Nutzerberichte oder Auszahlungen wären selbst bei Fund kein Solvenznachweis; Bonus und Verpflichtungen brauchen eine Finanzierungsquelle.", findings_sources(data, "bonus", "withdrawal", "guarantee") + external_traces(data, {"community"})[:6], ["Bonusfinanzierung", "Vertragsgrundlage für Verpflichtungen", "Solvenz-/Reservebelege"])


def evaluate_14(data: dict) -> dict:
    return result(14, "yellow", "Ein belastbarer Marktvergleich zu Gebühren, Liquidität, Limits, Support, Nutzerrechten und Alternativen ist in der aktuellen Pipeline noch nicht vollständig enthalten.", "Praktische Nutzbarkeit kann nicht allein aus den eigenen Produktfeatures abgeleitet werden.", findings_sources(data, "withdrawal", "lockup", "custody"), ["Marktvergleich", "Liquidität", "Limits", "Supportqualität", "reale Ein-/Auszahlungspraxis"])


def evaluate_15(data: dict) -> dict:
    a = data.get("analysis") or {}
    risks = list(a.get("risk_signals") or [])
    tensions = list((data.get("academy_analysis") or {}).get("tensions") or [])
    high = [r for r in risks if r.get("severity") == "high"]
    if high or tensions:
        return result(15, "red" if (high and tensions) else "yellow-red", f"Die Rohresearch-Schicht enthält {len(risks)} Risikosignal(e), davon {len(high)} hoch eingestuft; zusätzlich bestehen {len(tensions)} Quellen-/Behördenspannung(en).", "Die Ampel beschreibt die vorhandene Risikodichte und offene Nachweise, nicht einen Betrugsvorwurf. Markt-, Strategie-, Verwahr-, Rechts- und Vertriebsrisiken müssen gemeinsam gelesen werden.", authority_sources(data)[:6] + findings_sources(data, "leverage", "trading", "custody", "referral", "yield_percentage")[:8], ["vollständige Wechselwirkungsanalyse", "Cyber/Smart-Contract", "Insolvenz", "Steuer", "Token/Governance soweit relevant"])
    return result(15, "yellow", f"Es wurden {len(risks)} Risikosignal(e) erfasst, aber noch nicht alle Pflicht-Risikokategorien vollständig geprüft.", "Die Risikoübersicht ist noch nicht vollständig genug für eine abschließende Bewertung.", findings_sources(data, "yield_percentage", "custody", "referral"), ["vollständige Risikomatrix"])


def overall_light(results: list[dict]) -> str:
    core = results[:15]
    critical = {4, 6, 7, 9, 10, 12, 15}
    critical_red = [r for r in core if r["number"] in critical and r["traffic_light"] == "red"]
    critical_yellow_red = [r for r in core if r["number"] in critical and r["traffic_light"] == "yellow-red"]
    if len(critical_red) >= 2:
        return "red"
    if critical_red or len(critical_yellow_red) >= 3:
        return "yellow-red"
    score = sum(LIGHT_SCORE[r["traffic_light"]] for r in core) / max(1, len(core))
    if score < 0.8:
        return "green-yellow"
    if score < 2.0:
        return "yellow"
    return "yellow-red"


def evaluate_16(data: dict, first_15: list[dict]) -> dict:
    light = overall_light(first_15)
    counts = {k: 0 for k in ALLOWED_LIGHTS}
    for r in first_15:
        counts[r["traffic_light"]] += 1
    unresolved = sum(1 for r in first_15 if r.get("missing_evidence"))
    return result(16, light, f"Vorläufige Gesamtampel aus 15 Prüffeldern: {light.upper()}. Verteilung: " + ", ".join(f"{k}={v}" for k, v in counts.items() if v) + f". In {unresolved} Prüffeldern bestehen noch offene Nachweise.", "Die Gesamtampel gewichtet zentrale rote bzw. gelb-rote Kernfragen stärker. Sie ist ausdrücklich vorläufig, bis alle Pflicht-Zusatzmodule, Rechenprüfungen und fehlenden Primärnachweise abgeschlossen sind; sie ist kein Betrugs- oder Anlageurteil.", authority_sources(data)[:4] + operator_sources(data)[:4], ["alle offenen Nachweise der Fragen 1–15", "Pflicht-Zusatzmodule", "Rechen-/Plausibilitätsprüfung"], confidence="medium", provisional=True)


def enrich(data: dict) -> dict:
    out = json.loads(json.dumps(data))
    evaluators = [evaluate_1, evaluate_2, evaluate_3, evaluate_4, evaluate_5, evaluate_6, evaluate_7, evaluate_8, evaluate_9, evaluate_10, evaluate_11, evaluate_12, evaluate_13, evaluate_14, evaluate_15]
    results = [fn(out) for fn in evaluators]
    results.append(evaluate_16(out, results))
    counts = {k: 0 for k in ALLOWED_LIGHTS}
    for r in results:
        counts[r["traffic_light"]] += 1
    missing = []
    for r in results[:15]:
        for item in r.get("missing_evidence") or []:
            if item not in missing:
                missing.append(item)
    out["academy_16_questions"] = {
        "status": "ok",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "reference": "Interner Analyseleitfaden · Vollständige 16-Punkte-Akademieprüfung",
        "principle": "Jeder Punkt erhält Feststellung, Nachweis, Gegenprüfung, Ampel und Begründung. Fehlende Informationen sind kein Betrugsbeweis. Die Ampel beschreibt Beleg-, Plausibilitäts- und Klärungslage.",
        "traffic_light_meaning": {
            "green": "Belastbar nachgewiesen, plausibel und transparent.",
            "yellow": "Teilweise nachgewiesen oder mit weiterem Klärungsbedarf.",
            "red": "Wesentlicher Nachweis fehlt, Primärquelle widerspricht oder ein zentraler Rechts-/Risikopunkt ist besonders problematisch.",
            "mixed": "Mischbewertungen bilden Zwischenlagen ab; die Begründung ist wichtiger als die Farbe.",
        },
        "summary": {
            "question_count": 16,
            "counts_by_traffic_light": counts,
            "overall_traffic_light": results[-1]["traffic_light"],
            "overall_is_provisional": True,
            "missing_evidence_count": len(missing),
        },
        "questions": results,
        "consolidated_missing_evidence": missing,
        "guardrails": {
            "fraud_verdict_created": False,
            "investment_recommendation_created": False,
            "overall_is_provisional": True,
        },
    }
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="Akademie Research Engine · 16-Punkte-Prüfung")
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()
    source = json.loads(Path(args.input).read_text(encoding="utf-8"))
    result_data = enrich(source)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(target)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
