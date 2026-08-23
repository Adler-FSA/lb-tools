# Akademie Research Engine

Interner, universeller Recherche-Motor der Akademie fuer finanzielle Souveraenitaet.

Leitprinzip: **Klarheit, bevor Geld fliesst.**

Die Engine bewertet nicht automatisch, ob ein Projekt serioes oder unserioes ist. Sie sammelt, trennt und vergleicht oeffentlich auffindbare Hinweise, Quellen, Gegenquellen und Forschungsluecken.

## Ein Motor, zwei Produkte

### 1. SchnellCheck (`quick`)

Der SchnellCheck ist die spaetere einfache Nutzeranwendung. Bevorzugte Eingabe ist ein konkretes Fundstueck: Referral-/Registrierungslink, direkte Projekt-URL oder Domain. Ein Firmen-/Projektname ist nur ein Suchhinweis, wenn kein konkreter Link vorhanden ist.

Der Quick-Modus arbeitet bewusst begrenzt:

1. Ausgangsspur sichern und Projektidentitaet aufloesen.
2. Projektwebsite bestaetigen.
3. wenige relevante Projektseiten lesen.
4. Kernaussagen, Produktmerkmale, Rendite-/Provisionshinweise und Rechtstraegerhinweise erkennen.
5. wenige priorisierte externe Spuren suchen.
6. Research-Luecken benennen.
7. nur dann Deep Research empfehlen, wenn weitere Klaerung sinnvoll ist.

Der SchnellCheck startet **keine vollstaendige Personen-, Register-, Social-, Community- oder 16-Punkte-Recherche**.

### 2. Projektanalyse / Deep Research (`deep`)

Der Deep-Modus nutzt denselben Motor, erweitert ihn aber um die volle Akademie-Recherche:

- breite externe Recherche;
- Betreiber und Rechtstraeger;
- triggerbasierte Register-/Behoerdenadapter;
- Management, Personen, Historie und UBO-Trennung;
- Akademie-Vergleich Projektbehauptung ↔ externe Quelle ↔ Gegenquelle;
- vollstaendige 16-Punkte-Akademiepruefung.

Die Gesamtampel bleibt gesperrt, solange wesentliche Forschungsluecken oder Quellenkonflikte bestehen.

## Universelle Eingaben und Beweisanker

Der Request-Router in `research_router.py` unterscheidet unter anderem:

- Referral-/Affiliate-/Registrierungslink;
- Domain oder direkte Projekt-URL;
- Social-Link;
- Firmen-/Projekt-/Markenname;
- Blockchain-/Contract-Adresse.

Die Ausgangsbasis wird gewichtet:

1. `referral_or_registration_link` / `very_high` – konkretes Einstiegsfundstueck, bevorzugte Eingabe.
2. `direct_url_or_domain` / `high` – klare technische Projektspur.
3. `social_trace_url` / `medium` – konkrete Werbespur, aber nicht automatisch die Projektwebsite.
4. `company_or_project_name` / `low` – nur Suchhinweis; Identitaet muss erst bestaetigt werden.

Der Original-Link bleibt als `original_evidence_anchor` erhalten, auch wenn er weiterleitet oder spaeter auf eine andere Ziel-Domain fuehrt. Damit kann spaeter nachvollzogen werden, welches Fundstueck der Nutzer tatsaechlich erhalten hat.

Bei bloßen Namen wird die Website ueber `identity_resolver.py` gesucht und nur bei ausreichender Namens-/Domain-/Seitenuebereinstimmung automatisch bestaetigt. Bei mehreren plausiblen Kandidaten wird keine Website geraten. Wenn keine eindeutige Identitaet bestaetigt werden kann, stoppt die Pipeline mit `website_not_resolved`; der fruehere Domain-Raten-Fallback ist fuer Namenseingaben deaktiviert.

Praxisregel fuer WhatsApp, Telegram und Social-Media-Werbung: **Moeglichst den Original-, Affiliate- oder Registrierungslink verwenden, den der Nutzer wirklich bekommen hat.**

## Trigger statt Sondercode

Spezielle Research-Module werden nur zugeschaltet, wenn der aktuelle Datensatz einen passenden Hinweis liefert.

Beispiel: Ein Mwali-/MISA-Registeradapter darf nur aktiviert werden, wenn im aktuell untersuchten Projekt oder in seiner externen Recherche ein entsprechender Jurisdiktionshinweis vorkommt. Andere Projekte bekommen diesen Adapter nicht.

Dasselbe Prinzip gilt fuer Personen-, Blockchain-, Vertriebs- und spaetere Fachmodule.

## Wichtige Universal-Dateien

- `research_router.py` – klassifiziert Eingaben, gewichtet Beweisanker und plant Module
- `identity_resolver.py` – universelle Projekt-/Website-Identifikation
- `engine.py` – Website-Crawl und Kernaussagen
- `quick_external_research.py` – begrenzte Fremdrecherche fuer SchnellCheck
- `universal_operator_research.py` – generische Betreiberrecherche plus triggerbasierte Registeradapter
- `universal_people_research.py` – generische Personen-/Managementfilter ohne Testprojektwissen
- `universal_academy_analysis.py` – dynamische Akademie-Ausgabe fuer das aktuelle Projekt
- `universal_sixteen_analysis.py` – dynamische Q4/Q5/Q6-Ausgabe fuer das aktuelle Projekt
- `universal_pipeline.py` – gemeinsame Forschungs-Pipeline
- `universal_runtime.py` – produktiver Universal-Runtime

## Referenzprojekt vs. Produktcode

KryptoSavings ist **kein fest eingebautes Projekt der Engine**. Es ist ein historischer Referenz- und Regressionstestfall.

Die Referenz liegt unter:

`tests/fixtures/kryptosavings/reference.json`

Sie ist mit `runtime_dependency: false` gekennzeichnet. Produktiver Universal-Code darf diese Fixture nicht importieren oder fuer Entscheidungen verwenden.

Neutrale Routing-/Universaltests liegen unter:

`tests/fixtures/universal/`

Dadurch koennen neue Projekte gegen denselben Motor getestet werden, ohne fuer jedes Projekt Sondercode zu schreiben.

## 16-Punkte-Standard

Der verbindliche Akademie-Standard liegt maschinenlesbar in:

`analysis_standard_16.json`

Jeder Punkt arbeitet mit:

- Feststellung;
- Nachweis;
- Gegenpruefung;
- Bewertung des Recherche-Stands;
- Begruendung;
- offenen Forschungsluecken;
- naechstem Recherche-Schritt.

Fehlende Informationen sind **kein Betrugsbeweis**. Ein Registereintrag beweist **nicht automatisch** eine Projektverbindung. Founder/CEO bedeutet **nicht automatisch** Eigentümer oder UBO.

## Datenprinzip

Jede belastbare Feststellung soll moeglichst enthalten:

- `type` – Art des Hinweises
- `value` – erkannter Wert
- `source_url` – Fundstelle
- `evidence` – kurze belegende Textstelle
- `confidence` – Zuordnungssicherheit

Projektquelle, unabhaengige Quelle, Plattform-/Communityspur, Registerspur und Behoerdenkontext werden getrennt gehalten.

## Produktregel

**Im Hintergrund so tief wie noetig. Im SchnellCheck nur so viel wie fuer erste Klarheit erforderlich.**
