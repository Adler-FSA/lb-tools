#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENGINE_ROOT = ROOT / "projekt-check-engine"
if str(ENGINE_ROOT) not in sys.path:
    sys.path.insert(0, str(ENGINE_ROOT))

from evaluate.economic_analysis import analyze_economics, unique

TARGET_CHECKS = {12, 14, 15, 17, 18, 23, 31}
ECONOMIC_PHRASES = (
    "Die wirtschaftliche Tiefenprüfung",
    "Die Renditemathematik",
    "Der wirtschaftliche Stresstest",
    "Für die Finanzierung der dargestellten",
    "Eine quantifizierte Rendite-/Dividendenrate",
    "Die öffentlich beschriebenen Geldflussangaben",
    "Die Auszahlungs-/Verteilungsmechanik",
    "Die Tragfähigkeit ohne",
    "Trading-/Performance-Nachweise",
)


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def read(path: Path, default=None):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def clean_previous(evaluation: dict) -> None:
    for check in evaluation.get("checks") or []:
        if int(check.get("id") or 0) not in TARGET_CHECKS:
            continue
        nf=check.get("neutral_finding") or {}
        for field in ("confirmed_facts","first_party_claims","pros","cons","open_points","contradictions"):
            nf[field]=[
                x for x in (nf.get(field) or [])
                if not any(str(x).startswith(prefix) for prefix in ECONOMIC_PHRASES)
            ]
        check["neutral_finding"]=nf


def add(values: list, text: str, limit: int = 10) -> list:
    return unique(list(values or [])+[text],limit)


def set_perspectives(st: dict, ev: dict, *, cid: int, result: str, lang: str, facts: dict) -> None:
    if lang == "de":
        customer={
            12:("Der bisher nachvollziehbare Geldweg wird beschrieben, aber Verwahrung, Zielwallet/-konto und rechtlicher Anspruch müssen vollständig belegbar sein.",
                "Vor einer Entscheidung klären, wohin eine Zahlung technisch und rechtlich fließt und wer über die Mittel verfügen kann."),
            14:("Ein wirtschaftliches Leistungsversprechen wird nur in dem Umfang berücksichtigt, wie es öffentlich tatsächlich formuliert ist.",
                "Keine Rendite oder Dividende aus Werbeworten hochrechnen, wenn Rate, Bemessungsgrundlage oder Zeitraum nicht eindeutig genannt sind."),
            15:("Entscheidend ist nicht nur, dass eine Dividende oder Belohnung genannt wird, sondern aus welchen nachweisbaren Einnahmen sie finanziert werden soll.",
                "Vor einer Entscheidung eine nachvollziehbare und möglichst unabhängige Erklärung der tatsächlichen Einnahmequelle verlangen."),
            17:("Die Tragfähigkeit hängt davon ab, ob Leistungen auch ohne dauerhaftes Wachstum neuer Mitglieder oder neues Kapital finanzierbar bleiben.",
                "Referral-Wachstum und echte externe Einnahmen getrennt betrachten; fehlende Zahlen nicht durch Annahmen ersetzen."),
            18:("Auszahlungs- und Verteilungsversprechen sind erst belastbar, wenn Anspruch, Berechnung, Zeitpunkt, Liquidität und technischer Ablauf nachvollziehbar sind.",
                "Vor einer Entscheidung Auszahlungsregeln, Sperrfristen, Bedingungen und tatsächlichen Zahlungsweg klären."),
            23:("Der Stresstest zeigt vor allem, welche Angaben fehlen, wenn Nachfrage, Wachstum oder Liquidität schlechter ausfallen als geplant.",
                "Eine Entscheidung nicht nur am Best-Case ausrichten; auch Nullwachstum, geringere Einnahmen und erhöhte Auszahlungen gedanklich prüfen."),
            31:("Bei Rendite-/Tradingaussagen zählen nachvollziehbare Performance, Verluste, Drawdowns und erforderliche Bruttorendite – nicht nur ein Ergebnisversprechen.",
                "Ohne quantifizierte Rate oder belastbaren Track Record keine eigene Renditeerwartung ableiten."),
        }
        company={
            12:("Aus externer Sicht sollte der Geldfluss vom Kunden bis zur endgültigen Verwahrung bzw. Verwendung eindeutig dokumentiert sein.",
                "Zahlungsweg, Wallet-/Kontoinhaber, Verwahrung und Kundenanspruch öffentlich konsistent dokumentieren."),
            14:("Leistungs- und Renditeformulierungen sollten Rate, Zeitraum, Bemessungsgrundlage und Bedingungen eindeutig voneinander trennen.",
                "Nicht quantifizierte Begriffe wie Dividende oder Reward mit einer klaren Berechnungs- und Anspruchsbeschreibung ergänzen."),
            15:("Eine nachvollziehbare Einnahmequelle stärkt die externe Prüfbarkeit des wirtschaftlichen Modells.",
                "Einnahmequellen, Kosten, Reserven und Verteilungslogik quantitativ und mit überprüfbaren Nachweisen darstellen."),
            17:("Für Außenstehende sollte erkennbar sein, ob das Modell auch ohne fortlaufend neue Teilnehmer wirtschaftlich funktioniert.",
                "Referral-Umsätze, operative Fremderlöse und Kapitalzuflüsse getrennt ausweisen und Belastungsszenarien dokumentieren."),
            18:("Auszahlungsregeln sollten als überprüfbarer Prozess statt nur als Leistungsbegriff dargestellt werden.",
                "Berechnungsformel, Fälligkeit, Sperren, Reserven und technische Ausführung eindeutig veröffentlichen."),
            23:("Ein belastbares Modell zeigt auch, wie es auf schwächere Nachfrage, geringere Erlöse und höhere Auszahlungsanforderungen reagiert.",
                "Sensitivitäts- und Liquiditätsszenarien mit nachvollziehbaren Annahmen veröffentlichen."),
            31:("Quantitative Rendite- oder Tradingdarstellungen benötigen belastbare historische Daten einschließlich negativer Perioden.",
                "Track Record, Drawdown, Handelsplätze, Hebel und notwendige Bruttorenditen nachvollziehbar belegen oder klar als nicht anwendbar kennzeichnen."),
        }
        academy={
            12:("Geldflussbefund nach Quelle, technischer Route, Kontrolle/Verwahrung und Rechtsanspruch getrennt gewichten.",
                "Technische Wallet-/Blockchainprüfung mit dem rechtlichen Anspruch des Teilnehmers abgleichen."),
            14:("Leistungsversprechen nur exakt in der belegten Form erfassen; implizite Renditeannahmen vermeiden.",
                "Rate, Zeitraum, Basis, Brutto/Netto und Anspruchscharakter getrennt dokumentieren."),
            15:("Ertragsquelle als eigene Evidenzfrage behandeln und nicht aus Treasury-, Umsatz- oder Wachstumsbegriffen ableiten.",
                "Operative Einnahmen, Kapitalzuflüsse und Teilnehmerzahlungen quantitativ trennen und gegen Verteilungsverpflichtungen stellen."),
            17:("Tragfähigkeit anhand von Nullwachstum, sinkenden Erlösen und steigender Verteilungslast testen.",
                "Abhängigkeit von Teilnehmerwachstum nur dann feststellen, wenn Geldflussdaten sie tatsächlich belegen."),
            18:("Auszahlungsmechanik nach Anspruch, Fälligkeit, Liquidität und technischer Ausführung bewerten.",
                "Behauptete Distributionen später mit On-Chain-/Zahlungsbelegen abgleichen."),
            23:("Stressszenarien dienen der Robustheitsprüfung, nicht der Vorhersage.",
                "Unbekannte Variablen als Sensitivitätslücken dokumentieren und keine Punktwerte vortäuschen."),
            31:("Renditemathematik und Track Record strikt trennen: Mathematik kann eine Behauptung hochrechnen, aber nicht deren Erzielbarkeit belegen.",
                "Bei quantifizierten Raten einfache und zusammengesetzte Jahreswirkung ausweisen; bei fehlender Rate Rechenbarkeit ausdrücklich verneinen."),
        }
    else:
        base=("Economic claims are evaluated only to the extent supported by public evidence; missing variables remain open.",
              "Do not infer performance, funding sources or payout reliability from marketing terms alone.")
        customer={cid:base for cid in TARGET_CHECKS}; company={cid:base for cid in TARGET_CHECKS}; academy={cid:base for cid in TARGET_CHECKS}

    for kind, mapping in (("customer",customer),("company",company),("academy",academy)):
        summary,recommendation=mapping[cid]
        block=ev.get(kind) or {}
        block["summary"]=summary
        block["advantages"]=unique(block.get("advantages") or [],5)
        block["disadvantages"]=unique((block.get("disadvantages") or [])+(ev.get("neutral_finding",{}).get("open_points") or []),7)
        block["questions"]=unique(block.get("questions") or [],4)
        block["recommendations"]=[recommendation]
        ev[kind]=block
        st["perspectives"][kind].update({"status":"abgeschlossen" if st["workflow_status"]=="abgeschlossen" else "laeuft","updated_at":now()})


def scenarios(data: dict, lang: str) -> list[dict]:
    facts=data.get("facts") or {}
    out=[]
    if lang == "de":
        out.append({
            "scenario":"Nullwachstum / keine neuen Referrals",
            "question":"Welche wirtschaftlichen Leistungen bleiben finanzierbar, wenn keine neuen Mitglieder oder Referral-Umsätze hinzukommen?",
            "finding":"Aus den bislang erfassten Quellen lässt sich eine belastbare Antwort nur ableiten, wenn externe Einnahmequellen und Verteilungsverpflichtungen quantitativ belegt sind.",
            "status":"offen" if data.get("growth_language") else "kein_befund",
        })
        out.append({
            "scenario":"Geringere operative Einnahmen",
            "question":"Wie verändert sich die Fähigkeit zu Dividenden/Rewards, wenn operative Einnahmen deutlich unter Plan liegen?",
            "finding":"Ohne quantifizierte und überprüfbare Einnahmequelle kann die Belastbarkeit dieses Szenarios nicht berechnet werden.",
            "status":"offen" if data.get("return_language") else "kein_befund",
        })
        out.append({
            "scenario":"Erhöhte Auszahlungs-/Verteilungsanforderungen",
            "question":"Welche Liquidität oder Reserve steht zur Verfügung, wenn viele Berechtigte gleichzeitig eine Auszahlung bzw. Distribution erwarten?",
            "finding":"Reserve-, Liquiditäts- und Fälligkeitsdaten sind in den bislang ausgewerteten Quellen nicht allein aus Leistungsbegriffen ableitbar.",
            "status":"offen" if data.get("payout_language") else "kein_befund",
        })
    else:
        out=[
            {"scenario":"Zero growth / no new referrals","question":"What remains fundable without new members or referral revenue?","finding":"A robust answer requires quantified external revenue and distribution obligations.","status":"open"},
            {"scenario":"Lower operating revenue","question":"How do returns/rewards behave if operating revenue is below plan?","finding":"The scenario cannot be quantified without a verified revenue source.","status":"open"},
            {"scenario":"Higher payout demand","question":"What liquidity is available if many participants expect distributions at the same time?","finding":"Reserve and liquidity data are required.","status":"open"},
        ]
    return out


def main() -> int:
    ap=argparse.ArgumentParser(description="Wirtschafts-, Geldfluss-, Rendite- und Stresstest für den Projekt-Check")
    ap.add_argument("--case-id",required=True)
    ap.add_argument("--cases-root",type=Path,default=ROOT/"data/projekt-check/cases")
    args=ap.parse_args()

    case_id=args.case_id.strip().upper(); case_dir=args.cases_root/case_id
    required=["status.json","evaluation.json","evidence.json","discovery.json"]
    for name in required:
        if not (case_dir/name).exists(): raise SystemExit(f"Benötigte Datei fehlt: {case_dir/name}")
    status=read(case_dir/"status.json"); evaluation=read(case_dir/"evaluation.json")
    primary=read(case_dir/"evidence.json",{"items":[]}) or {"items":[]}
    independent=read(case_dir/"independent-evidence.json",{"items":[]}) or {"items":[]}
    discovery=read(case_dir/"discovery.json",{}) or {}; intake=read(case_dir/"intake.json",{}) or {}
    lang="en" if intake.get("language")=="en" else "de"
    clean_previous(evaluation)

    data=analyze_economics(primary=primary,independent=independent,discovery=discovery,intake=intake)
    stress=scenarios(data,lang)
    data.update({"schema_version":"1.0","case_id":case_id,"generated_at":now(),"stress_scenarios":stress,
        "principle":"Mathematische Hochrechnungen ordnen Aussagen ein; sie sind weder Prognose noch Nachweis der Erzielbarkeit. Eigenaussagen, externe Spuren und unabhängig bestätigte Tatsachen bleiben getrennt."})
    write(case_dir/"economic-analysis.json",data)

    st_by={int(x["id"]):x for x in status.get("checks") or []}; ev_by={int(x["id"]):x for x in evaluation.get("checks") or []}; ts=now()
    refs=data.get("refs") or {}; rates=data.get("first_party_percent_claims") or []; claim_math=data.get("customer_claim_math")

    # 12 Geldfluss / Verwahrung / Kundenanspruch: wirtschaftliche Route kann erfasst sein,
    # technische Kontrolle und Rechtsanspruch bleiben bewusst für die Technik-/Rechtsprüfung offen.
    st=st_by[12]; ev=ev_by[12]; nf=ev.get("neutral_finding") or {}
    if refs.get("money_flow"):
        nf["first_party_claims"]=add(nf.get("first_party_claims"),"Die öffentlich beschriebenen Geldflussangaben nennen Wallet-/Blockchain-/Zahlungs- oder Treasury-Bezüge; daraus allein folgt noch kein Nachweis der tatsächlichen Verwahrung oder Kontrolle.")
    if data.get("facts",{}).get("package_purchase_from_own_wallet_claimed"):
        nf["first_party_claims"]=add(nf.get("first_party_claims"),"Die öffentlich beschriebenen Geldflussangaben behaupten, dass Paketkäufe per Blockchain-Transaktion aus dem eigenen Wallet erfolgen.")
    nf["open_points"]=add(nf.get("open_points"),"Die öffentlich beschriebenen Geldflussangaben belegen noch nicht vollständig Zielwallet/-konto, wirtschaftlich Berechtigten, Verfügungskontrolle, Verwahrung und rechtlichen Kundenanspruch.")
    nf["evidence_refs"]=unique(list(nf.get("evidence_refs") or [])+list(refs.get("money_flow") or []),25)
    ev["neutral_finding"]=nf; st["workflow_status"]="laeuft"; st["result_status"]="eigenaussage" if refs.get("money_flow") else "offen"; st["started_at"]=st.get("started_at") or ts
    st["summary"]="Wirtschaftlicher Geldfluss aus öffentlichen Angaben rekonstruiert; technische Kontrolle, Verwahrung und Rechtsanspruch bleiben in Vertiefung."
    set_perspectives(st,ev,cid=12,result=st["result_status"],lang=lang,facts=data)

    # 14 Leistungsversprechen: nach vollständigem Scan der erfassten öffentlichen Aussagen abschließbar.
    st=st_by[14]; ev=ev_by[14]; nf=ev.get("neutral_finding") or {}
    if data.get("return_language"):
        nf["first_party_claims"]=add(nf.get("first_party_claims"),"Die wirtschaftliche Tiefenprüfung bestätigt, dass die erfassten Projektquellen wirtschaftliche Leistungsbegriffe wie Rendite/Dividende/Yield/Reward verwenden; die konkrete Aussage wird nicht über ihren Wortlaut hinaus erweitert.")
        if rates:
            nf["confirmed_facts"]=add(nf.get("confirmed_facts"),f"Die Renditemathematik konnte {len(rates)} öffentlich formulierte Prozentangabe(n) mit Renditekontext erfassen und – soweit ein Zeitraum genannt ist – rein mathematisch annualisieren.")
        else:
            nf["open_points"]=add(nf.get("open_points"),"Eine quantifizierte Rendite-/Dividendenrate mit eindeutigem Zeitraum und Bemessungsgrundlage wurde in den ausgewerteten Projektquellen nicht erkannt; aus dem Leistungsbegriff allein wird keine Rate abgeleitet.")
        result="eigenaussage"
    else:
        nf["confirmed_facts"]=add(nf.get("confirmed_facts"),"Die wirtschaftliche Tiefenprüfung hat in den ausgewerteten Projektquellen kein konkretes Rendite-/Dividenden-/Yield-Versprechen erkannt.")
        result="kein_befund"
    if claim_math:
        nf["open_points"]=add(nf.get("open_points"),"Die Renditemathematik hat zusätzlich eine vom Auftraggeber übermittelte Behauptung rechnerisch eingeordnet. Diese Behauptung bleibt strikt getrennt von den Projektbelegen.")
    nf["evidence_refs"]=unique(list(nf.get("evidence_refs") or [])+list(refs.get("returns") or []),25)
    ev["neutral_finding"]=nf; st["workflow_status"]="abgeschlossen"; st["result_status"]=result; st["finished_at"]=ts; st["started_at"]=st.get("started_at") or ts
    st["summary"]=(f"Leistungsversprechen wirtschaftlich geprüft · {len(rates)} quantifizierte Prozentangabe(n) mit Renditekontext." if rates else "Leistungsversprechen wirtschaftlich geprüft · keine belastbar quantifizierbare Rate aus dem Wortlaut abgeleitet.")
    set_perspectives(st,ev,cid=14,result=result,lang=lang,facts=data)

    # 15 tatsächliche Einnahmequelle
    st=st_by[15]; ev=ev_by[15]; nf=ev.get("neutral_finding") or {}
    if data.get("revenue_source_language"):
        nf["first_party_claims"]=add(nf.get("first_party_claims"),"Für die Finanzierung der dargestellten Leistungen finden sich Begriffe zu Einnahmen/Geschäftsmodell/Treasury; diese Begriffe sind noch kein unabhängiger quantitativer Nachweis der tatsächlichen Ertragsquelle.")
    else:
        nf["open_points"]=add(nf.get("open_points"),"Für die Finanzierung der dargestellten wirtschaftlichen Leistungen wurde in den ausgewerteten Projektquellen keine eindeutig quantifizierte und unabhängig nachvollziehbare Einnahmequelle identifiziert.")
    nf["evidence_refs"]=unique(list(nf.get("evidence_refs") or [])+list(refs.get("revenue_source") or []),25)
    ev["neutral_finding"]=nf; st["workflow_status"]="abgeschlossen"; st["result_status"]="offen"; st["started_at"]=st.get("started_at") or ts; st["finished_at"]=ts
    st["summary"]="Tatsächliche Einnahmequelle geprüft; vorhandene Beschreibungen reichen noch nicht für einen unabhängigen quantitativen Finanzierungsnachweis."
    set_perspectives(st,ev,cid=15,result="offen",lang=lang,facts=data)

    # 17 Tragfähigkeit
    st=st_by[17]; ev=ev_by[17]; nf=ev.get("neutral_finding") or {}
    if data.get("growth_language"):
        nf["confirmed_facts"]=add(nf.get("confirmed_facts"),"Die Tragfähigkeit ohne dauerhaftes Teilnehmerwachstum wurde als eigenes Szenario geprüft, weil in den öffentlichen Quellen Referral-/Invite-/Netzwerk- oder Wachstumselemente vorkommen.")
    nf["open_points"]=add(nf.get("open_points"),"Die Tragfähigkeit ohne fortlaufend neue Teilnehmer oder neues Kapital kann nur belastbar quantifiziert werden, wenn externe Einnahmen, laufende Kosten und Verteilungsverpflichtungen nachvollziehbar beziffert sind.")
    nf["evidence_refs"]=unique(list(nf.get("evidence_refs") or [])+list(refs.get("growth") or []),25)
    ev["neutral_finding"]=nf; st["workflow_status"]="abgeschlossen"; st["result_status"]="offen"; st["started_at"]=st.get("started_at") or ts; st["finished_at"]=ts
    st["summary"]="Nullwachstums- und Finanzierungsabhängigkeit geprüft; quantitative Tragfähigkeit bleibt mangels vollständiger Einnahmen-/Verpflichtungsdaten offen."
    set_perspectives(st,ev,cid=17,result="offen",lang=lang,facts=data)

    # 18 Auszahlung / Verteilung
    st=st_by[18]; ev=ev_by[18]; nf=ev.get("neutral_finding") or {}
    if data.get("payout_language"):
        nf["first_party_claims"]=add(nf.get("first_party_claims"),"Die Auszahlungs-/Verteilungsmechanik wird in den Projektquellen durch Begriffe wie Distribution, Dividende, Bonus, Withdrawal oder vergleichbare Leistungen berührt.")
        result="offen"
        nf["open_points"]=add(nf.get("open_points"),"Die Auszahlungs-/Verteilungsmechanik ist erst vollständig verifizierbar, wenn Anspruch, Berechnung, Fälligkeit, Sperren, Liquidität und tatsächliche technische Ausführung belegt sind.")
    else:
        result="kein_befund"
        nf["confirmed_facts"]=add(nf.get("confirmed_facts"),"Die wirtschaftliche Tiefenprüfung hat in den ausgewerteten Projektquellen keinen konkreten Auszahlungs-/Rückzahlungsmechanismus erkannt.")
    nf["evidence_refs"]=unique(list(nf.get("evidence_refs") or [])+list(refs.get("payout") or []),25)
    ev["neutral_finding"]=nf; st["workflow_status"]="abgeschlossen"; st["result_status"]=result; st["started_at"]=st.get("started_at") or ts; st["finished_at"]=ts
    st["summary"]="Auszahlungs-, Verteilungs- und Rückzahlungsmechanismen wirtschaftlich geprüft; nicht belegte technische Ausführung wird nicht unterstellt."
    set_perspectives(st,ev,cid=18,result=result,lang=lang,facts=data)

    # 23 Stressszenario
    st=st_by[23]; ev=ev_by[23]; nf=ev.get("neutral_finding") or {}
    nf["confirmed_facts"]=add(nf.get("confirmed_facts"),f"Der wirtschaftliche Stresstest hat {len(stress)} Szenarien zu Nullwachstum, schwächeren Einnahmen und erhöhter Verteilungslast strukturiert geprüft.")
    nf["open_points"]=add(nf.get("open_points"),"Der wirtschaftliche Stresstest kann ohne belastbare Angaben zu Einnahmen, Reserven, Fälligkeiten und Verteilungssätzen keine scheinpräzisen Verlust- oder Ausfallwahrscheinlichkeiten berechnen.")
    nf["evidence_refs"]=unique(list(nf.get("evidence_refs") or [])+list(refs.get("growth") or [])+list(refs.get("payout") or [])+list(refs.get("returns") or []),25)
    ev["neutral_finding"]=nf; st["workflow_status"]="abgeschlossen"; st["result_status"]="offen"; st["started_at"]=st.get("started_at") or ts; st["finished_at"]=ts
    st["summary"]=f"Wirtschaftlicher Stresstest abgeschlossen · {len(stress)} Szenarien · fehlende Variablen ausdrücklich als offen dokumentiert."
    set_perspectives(st,ev,cid=23,result="offen",lang=lang,facts=data)

    # 31 Trading-/Rendite-Tiefenprüfung
    st=st_by[31]; ev=ev_by[31]; nf=ev.get("neutral_finding") or {}
    if data.get("trading_language"):
        nf["first_party_claims"]=add(nf.get("first_party_claims"),"Trading-/Performance-Nachweise sind für die öffentlich beschriebenen Handels-/Performanceelemente erforderlich; ein belastbarer Track Record wurde nicht aus bloßen Leistungsbegriffen abgeleitet.")
        result="offen"
    elif data.get("return_language"):
        nf["open_points"]=add(nf.get("open_points"),"Trading-/Performance-Nachweise wurden nicht als Grundlage des wirtschaftlichen Leistungsversprechens erkannt. Für die vorhandenen Rendite-/Dividendenbegriffe fehlt dennoch eine quantifizierte, unabhängig verifizierte Performancebasis.")
        result="offen"
    else:
        nf["confirmed_facts"]=add(nf.get("confirmed_facts"),"Trading-/Performance-Nachweise sind nach den bislang ausgewerteten Projektquellen für kein erkanntes Trading-/Renditemodell anwendbar.")
        result="kein_befund"
    if rates:
        nf["confirmed_facts"]=add(nf.get("confirmed_facts"),"Die Renditemathematik annualisiert erkannte Periodenraten rein rechnerisch und trennt diese Hochrechnung ausdrücklich von Erzielbarkeit, Track Record und Auszahlung.")
    elif data.get("return_language"):
        nf["open_points"]=add(nf.get("open_points"),"Eine quantifizierte Rendite-/Dividendenrate mit Zeitraum wurde nicht erkannt; deshalb wäre eine Jahresrenditeberechnung spekulativ und wird nicht vorgenommen.")
    nf["evidence_refs"]=unique(list(nf.get("evidence_refs") or [])+list(refs.get("trading") or [])+list(refs.get("returns") or []),25)
    ev["neutral_finding"]=nf; st["workflow_status"]="abgeschlossen"; st["result_status"]=result; st["started_at"]=st.get("started_at") or ts; st["finished_at"]=ts
    st["summary"]=("Trading-/Rendite-Tiefenprüfung abgeschlossen · quantifizierte Renditemathematik vorhanden." if rates else "Trading-/Rendite-Tiefenprüfung abgeschlossen · keine unbelegte Renditehochrechnung erzeugt.")
    set_perspectives(st,ev,cid=31,result=result,lang=lang,facts=data)

    status["checks"]=[st_by[i] for i in range(1,38)]; evaluation["checks"]=[ev_by[i] for i in range(1,38)]
    status["state"]="auswertung"; status["updated_at"]=ts
    write(case_dir/"status.json",status); write(case_dir/"evaluation.json",evaluation)
    progress=read(case_dir/"research-progress.json",{}) or {}; modules=dict(progress.get("modules") or {})
    modules["economic_analysis"]="completed"; progress.update({"schema_version":"1.4","case_id":case_id,"updated_at":ts,"modules":modules,
        "economic_first_party_rate_claims":len(rates),"economic_stress_scenarios":len(stress),"economic_customer_claim_math":bool(claim_math)})
    write(case_dir/"research-progress.json",progress)
    print(json.dumps({"case_id":case_id,"rates":len(rates),"stress_scenarios":len(stress),"checks_completed":[14,15,17,18,23,31],"check12":"laeuft"},ensure_ascii=False))
    return 0


if __name__=="__main__":
    raise SystemExit(main())
