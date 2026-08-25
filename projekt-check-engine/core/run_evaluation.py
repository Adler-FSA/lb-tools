#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CHECKS = ROOT / "projekt-check-engine/checks/checks-37.json"
DEFAULT_ROUTING = ROOT / "projekt-check-engine/evaluate/check-routing.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def norm(value: str) -> str:
    return " ".join(str(value or "").lower().split())


def item_text(item: dict) -> str:
    return norm(" ".join([
        item.get("title", ""), item.get("h1", ""), item.get("meta_description", ""),
        item.get("text_excerpt", ""), item.get("final_url", ""), item.get("requested_url", "")
    ]))


def host(url: str) -> str:
    value = (urlparse(str(url or "")).hostname or "").lower().strip(".")
    return value[4:] if value.startswith("www.") else value


def related_host(value: str, project_hosts: set[str]) -> bool:
    value = host(value) if "://" in str(value or "") else str(value or "").lower().removeprefix("www.")
    return any(value == p or value.endswith("." + p) or p.endswith("." + value) for p in project_hosts if p)


def score_item(item: dict, signals: list[str]) -> tuple[int, list[str]]:
    text = item_text(item)
    hits = []
    for signal in signals:
        needle = norm(signal)
        if needle and needle in text:
            hits.append(signal)
    return len(hits), hits


def unique(values: list[str], limit: int = 8) -> list[str]:
    out = []
    seen = set()
    for value in values:
        value = " ".join(str(value or "").split()).strip()
        key = value.lower()
        if value and key not in seen:
            seen.add(key)
            out.append(value)
        if len(out) >= limit:
            break
    return out


def signal_label(signal: str, lang: str) -> str:
    de = {
        "price":"Preis", "pricing":"Preisstruktur", "package":"Pakete", "fee":"Gebühren", "fees":"Gebühren",
        "return":"Rendite", "returns":"Rendite", "yield":"Ertrag", "dividend":"Dividenden", "dividends":"Dividenden",
        "reward":"Belohnungen", "rewards":"Belohnungen", "referral":"Referral", "affiliate":"Affiliate-Vertrieb",
        "ambassador":"Ambassador-Programm", "commission":"Provisionen", "network":"Netzwerkvergütung", "dao":"DAO",
        "governance":"Governance", "blockchain":"Blockchain", "wallet":"Wallet", "custody":"Verwahrung",
        "legal entity":"Rechtsträger", "jurisdiction":"Jurisdiktion", "license":"Lizenz", "licence":"Lizenz",
        "beta":"Beta-Status", "pre-launch":"Pre-Launch", "placeholder":"Platzhalterangabe", "may change":"Änderungsvorbehalt",
        "membership":"Mitgliedschaft", "academy":"Akademie", "community":"Community", "treasury":"Treasury",
        "payment":"Zahlungsweg", "register":"Register", "audit":"Audit", "company":"Unternehmen"
    }
    if lang == "de":
        return de.get(signal, signal)
    return signal


def open_point_for(check_id: int, title: str, lang: str) -> str:
    de = {
        9:"Rechtsträger, Registerdaten, Sitz und eindeutige Zuordnung zum Angebot müssen noch über unabhängige Primärquellen verifiziert werden.",
        10:"Verantwortliche Personen, Rollen, Eigentums- und Kontrollbeziehungen sind noch unabhängig zu verifizieren.",
        11:"Regulatorischer Status, konkrete Erlaubnisse und deren Geltungsbereich sind noch über Behörden-/Registerquellen zu prüfen.",
        12:"Geldfluss, Verwahrung, Kontoinhaber bzw. Wallet-Kontrolle und rechtlicher Kundenanspruch sind noch vollständig nachzuweisen.",
        15:"Die tatsächliche wirtschaftliche Einnahme- bzw. Ertragsquelle ist noch unabhängig und quantitativ nachzuweisen.",
        17:"Die Tragfähigkeit ohne fortlaufend neue Teilnehmer oder neues Kapital ist noch in Szenarien zu prüfen.",
        18:"Auszahlungs-, Bonus-, Garantie- und Rückzahlungsmechanismen sind noch vertraglich und technisch zu verifizieren.",
        19:"Ein belastbarer Markt- und Alternativenvergleich steht noch aus.",
        20:"Unabhängige Social-, Community- und Nutzer-Spuren außerhalb der Projektwebsite sind noch zu recherchieren.",
        21:"Die Hauptrisiken können erst nach Abschluss der unabhängigen und technischen Tiefenprüfungen final gewichtet werden.",
        22:"Aussagen aus Website, Rechtstexten, Registern, Technik und öffentlicher Kommunikation müssen noch vollständig gegeneinander geprüft werden.",
        23:"Stressszenarien zu Nachfrage, Liquidität, Auszahlungen, Technik und Ausfällen stehen noch aus.",
        24:"Die Liste fehlender Primärnachweise wird nach Abschluss aller Recherchemodule finalisiert.",
        30:"Contracts, Wallets, Explorer-Daten, Tokenomics, Liquidität, Adminrechte und Audits sind noch technisch zu prüfen.",
        31:"Track Record, Performance, Drawdown, Hebel, Handelsplätze und notwendige Bruttorenditen sind noch tief zu prüfen.",
        32:"Issuer, BIN-Sponsor, Kartennetzwerk, PSP/Banking-Partner und regulatorische Berechtigungen sind noch zu prüfen.",
        33:"DApp, Staking/Lending, Bridges, Oracles, Multisig und Governance sind noch technisch zu prüfen.",
        34:"Ebenen, Provisionen, Ranglogik und wirtschaftliche Bemessungsgrundlage des Vertriebs sind noch vollständig zu rekonstruieren.",
        35:"Öffentliche Werbung, Social-Media-Verlauf, FOMO-/Vertriebsaussagen und historische Kommunikation sind noch zu prüfen.",
        36:"Register, Jahresabschlüsse, Kapital, verbundene Unternehmen und verantwortliche Personen sind noch unabhängig zu prüfen.",
        37:"Unabhängige Nutzerberichte zu Auszahlungen, Support, Sperren und Programmänderungen sind noch zu recherchieren."
    }
    if lang == "de":
        return de.get(check_id, f"Für „{title}“ steht die unabhängige bzw. vertiefende Verifikation noch aus.")
    return f"Independent or deeper verification for “{title}” is still pending."


def detect_contradictions(items: list[dict], lang: str) -> list[dict]:
    full = "\n".join(item_text(x) for x in items)
    out = []
    refs = lambda terms: unique([x.get("evidence_id", "") for x in items if any(t in item_text(x) for t in terms)], 6)
    if "legal entity" in full and "placeholder" in full and ("final legal entity" in full or "to be confirmed" in full):
        text = ("Öffentliche Projektunterlagen nennen einen Rechtsträger, enthalten zugleich aber einen Hinweis, dass der finale Rechtsträgername noch zu bestätigen bzw. als Platzhalter geführt wird." if lang == "de" else "Public project materials name a legal entity while also indicating that the final legal-entity name is still to be confirmed or is a placeholder.")
        out.append({"checks":[5,9,21,22],"text":text,"refs":refs(["legal entity","placeholder","final legal entity","to be confirmed"])})
    if "guaranteed" in full and "not guaranteed" in full:
        text = ("In den erfassten Quellen treten sowohl Garantieaussagen als auch ein ausdrücklicher Ausschluss einer Garantie auf; Kontext und Geltungsbereich müssen gegeneinander abgegrenzt werden." if lang == "de" else "Captured sources contain both guarantee language and an explicit no-guarantee statement; context and scope require reconciliation.")
        out.append({"checks":[5,14,18,21,22,31],"text":text,"refs":refs(["guaranteed","not guaranteed"])})
    if ("no risk" in full or "risk-free" in full) and ("risk of loss" in full or "total loss" in full):
        text = ("Risikofreie Darstellung und Verlusthinweise stehen in den erfassten Quellen nebeneinander und müssen sachlich aufgelöst werden." if lang == "de" else "Risk-free language and loss warnings coexist in the captured sources and require factual reconciliation.")
        out.append({"checks":[5,21,22],"text":text,"refs":refs(["no risk","risk-free","risk of loss","total loss"])})
    return out


def build_perspective(kind: str, title: str, result: str, pros: list[str], cons: list[str], opens: list[str], contradictions: list[str], refs: list[str], lang: str) -> dict:
    n = len(refs)
    if lang == "de":
        if kind == "customer":
            summary = f"Zu „{title}“ liegen aktuell {n} zugeordnete Belege vor. Der Befund ist als {result} eingeordnet."
            questions = [f"Welche Primär- oder unabhängigen Nachweise gibt es zu „{title}“?"] if result in {"offen","eigenaussage","widerspruch"} else []
            rec = {
                "bestaetigt":"Den bestätigten Punkt im Zusammenhang mit der Gesamtanalyse betrachten; daraus allein keine Sicherheit ableiten.",
                "eigenaussage":"Die Eigenaussage vor einer Entscheidung nicht mit einem unabhängigen Nachweis gleichsetzen.",
                "offen":"Den offenen Punkt vor einer Entscheidung anhand belastbarer Unterlagen klären.",
                "widerspruch":"Den Widerspruch vor einer Entscheidung anhand der zugrunde liegenden Primärquellen auflösen lassen.",
                "kein_befund":"Aus dem fehlenden öffentlichen Befund weder eine positive noch eine negative Schlussfolgerung ableiten."
            }.get(result,"Weitere Prüfung abwarten.")
        elif kind == "company":
            summary = f"Die Außenprüfung zu „{title}“ stützt sich aktuell auf {n} Belege; Einordnung: {result}."
            questions = [f"Welche belastbaren Primärnachweise kann das Unternehmen zu „{title}“ öffentlich und eindeutig verknüpfen?"] if result in {"offen","eigenaussage","widerspruch"} else []
            rec = "Öffentliche Angaben mit eindeutig zuordenbaren Primärnachweisen ergänzen und Widersprüche bzw. offene Punkte transparent auflösen."
        else:
            summary = f"Beleggewicht für „{title}“: {n} Quellenreferenzen; aktueller Status {result}."
            questions = [f"Welche zusätzliche Primär- oder unabhängige Quelle ist erforderlich, um „{title}“ belastbar abzuschließen?"] if result in {"offen","eigenaussage","widerspruch"} else []
            rec = "Befund entsprechend der Quellenqualität gewichten; Eigenaussagen, technische Fakten und unabhängige Nachweise getrennt halten."
    else:
        summary = f"“{title}” currently has {n} mapped evidence references; classification: {result}."
        questions = [f"Which primary or independent evidence is still required for “{title}”?"] if result in {"offen","eigenaussage","widerspruch"} else []
        rec = "Keep first-party claims, technical facts and independent evidence clearly separated and weight the finding by source quality."
    return {
        "summary": summary,
        "advantages": unique(pros, 5),
        "disadvantages": unique(cons + contradictions + opens, 7),
        "questions": unique(questions, 4),
        "recommendations": [rec]
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="Projekt-Check Primärquellen-Auswertung für 37 feste Prüfbereiche")
    ap.add_argument("--case-id", required=True)
    ap.add_argument("--cases-root", type=Path, default=ROOT / "data/projekt-check/cases")
    ap.add_argument("--checks", type=Path, default=DEFAULT_CHECKS)
    ap.add_argument("--routing", type=Path, default=DEFAULT_ROUTING)
    args = ap.parse_args()

    case_id = args.case_id.strip().upper()
    case_dir = args.cases_root / case_id
    status_path = case_dir / "status.json"
    evaluation_path = case_dir / "evaluation.json"
    evidence_path = case_dir / "evidence.json"
    discovery_path = case_dir / "discovery.json"
    intake_path = case_dir / "intake.json"
    for path in (status_path, evaluation_path, evidence_path, discovery_path):
        if not path.exists():
            raise SystemExit(f"Benötigte Datei fehlt: {path}")

    status = read_json(status_path)
    evaluation = read_json(evaluation_path)
    evidence = read_json(evidence_path)
    discovery = read_json(discovery_path)
    intake = read_json(intake_path) if intake_path.exists() else {}
    checks_def = read_json(args.checks)["checks"]
    routing = {int(x["id"]): x for x in read_json(args.routing)["checks"]}
    if len(checks_def) != 37 or len(routing) != 37:
        raise SystemExit("37-Punkte-Vertrag verletzt")

    lang = "en" if intake.get("language") == "en" else "de"
    items = [x for x in evidence.get("items", []) if not x.get("error")]
    project_hosts = {str(x).lower().removeprefix("www.") for x in discovery.get("project_hosts", []) if x}
    if not project_hosts:
        project_hosts = {host(x.get("final_url") or x.get("requested_url")) for x in items[:2] if host(x.get("final_url") or x.get("requested_url"))}
    contradictions_all = detect_contradictions(items, lang)

    eval_by_id = {int(x["id"]): x for x in evaluation.get("checks", [])}
    status_by_id = {int(x["id"]): x for x in status.get("checks", [])}
    completed_ids, running_ids, waiting_ids = [], [], []
    now = utc_now()

    for definition in checks_def:
        cid = int(definition["id"])
        title = definition["title_en"] if lang == "en" else definition["title_de"]
        route = routing[cid]
        signals = [str(x).lower() for x in route.get("signals", [])]

        scored = []
        matched_signals = []
        if signals:
            for item in items:
                score, hits = score_item(item, signals)
                if score:
                    scored.append((score, item, hits))
                    matched_signals.extend(hits)
            scored.sort(key=lambda x: (-x[0], x[1].get("evidence_id", "")))
            selected = [x[1] for x in scored[:6]]
        elif cid in {6,28,29}:
            selected = items[:8]
        else:
            selected = []

        refs = unique([x.get("evidence_id", "") for x in selected], 8)
        project_selected = [x for x in selected if related_host(x.get("final_url") or x.get("requested_url", ""), project_hosts)]
        external_selected = [x for x in selected if x not in project_selected]
        contradictions = [c for c in contradictions_all if cid in c["checks"]]
        contradiction_texts = unique([c["text"] for c in contradictions], 5)
        refs = unique(refs + [r for c in contradictions for r in c["refs"]], 10)

        confirmed = []
        first_party = []
        pros = []
        cons = []
        opens = []

        if cid == 6:
            confirmed.append(("Die Auswertung trennt öffentlich beobachtbare Tatsachen, Eigenaussagen, offene Punkte und belegte Widersprüche." if lang == "de" else "The evaluation separates publicly observable facts, first-party claims, open points and evidenced contradictions."))
            pros.append(("Quellenreferenzen bleiben je Prüfbereich nachvollziehbar erhalten." if lang == "de" else "Evidence references remain traceable for each review area."))
        elif cid == 28:
            confirmed.append((f"Für den aktuellen Fall wurden {evidence.get('evidence_count',0)} öffentliche Belege mit URL, Erfassungszeitpunkt und Inhalts-Hash gespeichert." if lang == "de" else f"The current case stores {evidence.get('evidence_count',0)} public evidence items with URL, capture time and content hash."))
            refs = unique([x.get("evidence_id", "") for x in items], 20)
            pros.append(("Die Belegstruktur ist reproduzierbar und quellenbezogen." if lang == "de" else "The evidence structure is reproducible and source-linked."))
        elif cid == 29:
            confirmed.append(("Der aktuelle Auswertungsstand beruht auf öffentlich erreichbaren Projektseiten und direkt daraus erschlossenen Quellen; unabhängige Tiefenrecherchen sind noch nicht vollständig abgeschlossen." if lang == "de" else "The current evaluation is based on publicly reachable project pages and directly discovered sources; independent deep research is not yet complete."))
            opens.append(("Register-, Behörden-, Markt-, Social-, technische und Nutzerrecherche folgen in separaten Prüfmodulen." if lang == "de" else "Registry, authority, market, social, technical and user research follows in separate modules."))
            refs = unique([x.get("evidence_id", "") for x in items], 12)
        elif selected:
            confirmed.append((f"Zu „{title}“ wurden {len(refs)} öffentlich erreichbare Quellenbezüge erfasst." if lang == "de" else f"{len(refs)} publicly reachable evidence references were captured for “{title}”."))
            labels = unique([signal_label(x, lang) for x in matched_signals], 6)
            if project_selected:
                first_party.append(("Die Projekt-/Anbieterseiten enthalten hierzu Angaben" + (": " + ", ".join(labels) if labels else "") + "." if lang == "de" else "Project/provider pages contain statements on this topic" + (": " + ", ".join(labels) if labels else "") + "."))
                pros.append(("Die Angaben sind auf öffentlich erreichbaren Projektseiten auffindbar und mit konkreten Belegreferenzen dokumentiert." if lang == "de" else "The statements are publicly accessible on project pages and documented with concrete evidence references."))
            if external_selected:
                confirmed.append((f"Zusätzlich wurden {len(external_selected)} externe öffentlich erreichbare Quellen erfasst; ihre inhaltliche Unabhängigkeit wird separat gewichtet." if lang == "de" else f"Additionally, {len(external_selected)} external public sources were captured; their independence is weighted separately."))
            if project_selected and not external_selected:
                cons.append(("Der inhaltliche Befund stützt sich in dieser Phase überwiegend auf Eigenaussagen des Projekts bzw. Anbieters." if lang == "de" else "At this stage, the substantive finding relies mainly on first-party project/provider statements."))
        else:
            opens.append(("In den bisher erfassten Primärquellen liegt für diesen Prüfbereich noch kein ausreichender konkreter Befund vor." if lang == "de" else "The primary sources captured so far do not yet provide a sufficient concrete finding for this review area."))

        if cid not in {6,28,29} and not route.get("primary_complete", False):
            opens.append(open_point_for(cid, title, lang))
        if any("beta" in item_text(x) or "pre-launch" in item_text(x) for x in selected):
            opens.append(("Die erfassten Angaben stammen teilweise aus einer Beta-/Pre-Launch-Phase; Änderungen sind deshalb ausdrücklich möglich." if lang == "de" else "Some captured statements are from a beta/pre-launch phase and are explicitly subject to change."))
        if any("placeholder" in item_text(x) for x in selected):
            opens.append(("Mindestens eine erfasste Unterlage enthält eine Platzhalter- bzw. noch zu bestätigende Angabe." if lang == "de" else "At least one captured document contains a placeholder or still-to-be-confirmed statement."))

        if contradiction_texts:
            result = "widerspruch"
        elif cid in {6,28}:
            result = "bestaetigt"
        elif cid == 29:
            result = "offen"
        elif project_selected:
            result = "eigenaussage"
        elif refs:
            result = "offen"
        else:
            result = "offen"

        primary_complete = bool(route.get("primary_complete")) and (cid in {6,28,29} or bool(refs))
        if primary_complete:
            workflow = "abgeschlossen"
            completed_ids.append(cid)
        elif refs or contradiction_texts:
            workflow = "laeuft"
            running_ids.append(cid)
        else:
            workflow = "wartet"
            waiting_ids.append(cid)

        finding = {
            "confirmed_facts": unique(confirmed, 7),
            "first_party_claims": unique(first_party, 6),
            "pros": unique(pros, 5),
            "cons": unique(cons, 5),
            "open_points": unique(opens, 7),
            "contradictions": contradiction_texts,
            "evidence_refs": refs,
        }

        ev = eval_by_id[cid]
        ev["result_status"] = result
        ev["neutral_finding"] = finding
        for perspective in ("customer", "company", "academy"):
            if workflow != "wartet":
                ev[perspective] = build_perspective(perspective, title, result, finding["pros"], finding["cons"], finding["open_points"], finding["contradictions"], refs, lang)

        st = status_by_id[cid]
        st["workflow_status"] = workflow
        st["result_status"] = result if workflow != "wartet" else None
        st["evidence_count"] = len(refs)
        if workflow == "abgeschlossen":
            st["summary"] = (f"Primärquellen-Auswertung abgeschlossen · {len(refs)} Belege · {result}." if lang == "de" else f"Primary-source evaluation complete · {len(refs)} evidence refs · {result}.")
            st["finished_at"] = now
            if not st.get("started_at"):
                st["started_at"] = now
        elif workflow == "laeuft":
            st["summary"] = (f"{len(refs)} Belege zugeordnet; unabhängige/vertiefende Prüfung steht noch aus." if lang == "de" else f"{len(refs)} evidence refs mapped; independent/deeper verification is still pending.")
            st["started_at"] = st.get("started_at") or now
            st["finished_at"] = None
        else:
            st["summary"] = ("Weiterer Recherchebaustein erforderlich." if lang == "de" else "Further research module required.")
        for perspective in ("customer", "company", "academy"):
            st["perspectives"][perspective]["status"] = "abgeschlossen" if workflow == "abgeschlossen" else ("laeuft" if workflow == "laeuft" else "wartet")
            st["perspectives"][perspective]["updated_at"] = now if workflow != "wartet" else None

    status["state"] = "auswertung"
    status["updated_at"] = now
    evaluation["checks"] = [eval_by_id[i] for i in range(1,38)]
    status["checks"] = [status_by_id[i] for i in range(1,38)]
    write_json(evaluation_path, evaluation)
    write_json(status_path, status)
    progress = {
        "schema_version":"1.0",
        "case_id":case_id,
        "phase":"primary_source_evaluation",
        "updated_at":now,
        "evidence_count":evidence.get("evidence_count",0),
        "completed_ids":completed_ids,
        "running_ids":running_ids,
        "waiting_ids":waiting_ids,
        "completed_count":len(completed_ids),
        "running_count":len(running_ids),
        "waiting_count":len(waiting_ids),
        "note":"Abgeschlossen bedeutet hier: Der Prüfbereich kann aus öffentlich erfassten Primärquellen sachlich beschrieben werden. Unabhängige Tiefenprüfungen bleiben eigene Module."
    }
    write_json(case_dir / "evaluation-progress.json", progress)
    print(json.dumps({"case_id":case_id,"completed":len(completed_ids),"running":len(running_ids),"waiting":len(waiting_ids)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
