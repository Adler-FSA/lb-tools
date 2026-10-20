(function(){
const P=(c,k,t,te,l,le,n,ne,src,items)=>({ch:c,kind:k,title:[t,te],lead:[l,le],narration:[n,ne],source:src,items});
const K=(a,b,c,d)=>({name:[a,b],detail:[c,d]});
window.VOW_SCENES=(window.VOW_SCENES||[]).concat([
P(0,"hero","Eine neue Welt hinter dem Einkauf","A new world behind shopping","VOW und TLN – das gesamte Ökosystem verständlich entdecken.","VOW and TLN – explore the full ecosystem clearly.","Ich beginne nicht mit einer Investmentchance. Ich beginne mit Rabatten, Handel und der Frage, was alles dahintersteckt.","I won't begin with an investment pitch. I'll begin with discounts, commerce and how the pieces connect.","VOW Whitepaper v6.7 / Einleitung",[
K("Einkaufen","Shopping","Händler, Kunden und reale Angebote.","Merchants, consumers and genuine offers."),
K("Rabattrechte","Discount rights","Voucher Currencies sollen Nachlässe übertragbar machen.","Voucher currencies aim to make discounts transferable."),
K("Token & DeFi","Token & DeFi","VOW und TLN ergänzen technische und finanzielle Ebenen.","VOW and TLN add technical and financial layers.")]),
P(0,"cards","Was wir heute gemeinsam entdecken","What we will discover","Vom bekannten Alltag bis zu den anspruchsvolleren Mechaniken.","From everyday life to the more complex mechanisms.","Ich möchte die Idee verstehen, die Technik einordnen und offenlassen, was noch überprüft werden muss.","I want to understand the idea, assess the technology and identify what still needs checking.","Whitepaper / Projektanalyse 18.08.2026",[
K("Warum?","Why?","Welches Problem wollen die Projekte lösen?","What problem are the projects trying to solve?"),
K("Wie?","How?","Wie greifen die einzelnen Komponenten ineinander?","How do the components connect?"),
K("Wo entsteht Nutzen?","Where is the benefit?","Rabatte, Anwendungen, Gebühren und Kreditmechaniken haben unterschiedliche Quellen.","Discounts, applications, fees and lending have different origins."),
K("Welche Grenzen?","What are the limits?","Regeln, Liquidität, Nachweise und Risiken gehören dazu.","Rules, liquidity, evidence and risks all matter.")]),
P(1,"cards","Unsere Rabattwelt ist voller Inseln","Our rewards are isolated islands","Punkte, Coupons, Gutscheine und Cashback – häufig ohne Verbindung.","Points, coupons, vouchers and cashback – often disconnected.","Ich kenne Punkte beim Einkaufen. Meist kann ich sie nicht einfach in einem anderen Programm nutzen. Hier beginnt die VOW-Idee.","I know loyalty points from shopping. Usually I can't use them in a different programme. That's where the VOW idea begins.","Whitepaper · Rewards Industry Problem",[
K("Supermarkt","Supermarket","Eigenes Punkte- oder Bonussystem.","An independent points scheme."),
K("Hotel","Hotel","Ein separates Reise-Treueprogramm.","A separate hotel loyalty programme."),
K("Händler","Retailer","Eigene Gutscheine zur Kundenbindung.","Store-specific vouchers for loyalty.")]),
P(1,"flow","Die eigentliche Idee: Rabatte verbinden","The core idea: connect discounts","Übertragbare Rabattrechte statt eines weiteren abgeschlossenen Punktesystems.","Transferable discount rights rather than another closed points scheme.","Ich sehe hier kein neues Bankgeld. Ich sehe den Versuch, mögliche Rabatte digital weitergeben zu können.","I don't see new bank money. I see an attempt to make potential discounts transferable.","Whitepaper · Commercial Issuance",[
K("Händlerangebot","Merchant offer","Ein Geschäft legt mögliche Rabatte fest.","A merchant defines a potential discount."),
K("Digitaler Voucher","Digital voucher","Ein Recht auf einen vorgeschlagenen Nachlass wird dargestellt.","A proposed discount right is represented."),
K("Übertragung","Transfer","Der Voucher kann zwischen Teilnehmern zirkulieren.","The voucher may circulate among participants."),
K("Mögliche Annahme","Possible acceptance","Ein Händler entscheidet über die tatsächliche Annahme.","A merchant decides whether to accept it.")]),
P(1,"compare","Rabattrecht ist nicht Bargeld","Discount right isn't cash","v$ und v€ bezeichnen keine garantierten Fiatguthaben.","v$ and v€ are not guaranteed fiat balances.","Wenn ich v€ 100 lese, weiß ich noch nicht, wo ich es einlösen kann. Ein Bargeldanspruch entsteht dadurch nicht.","If I see v€ 100, I still don't know where it can be used. It doesn't create a claim to cash.","Whitepaper · Voucher Currencies / Legal",[
K("Voucher Currency","Voucher currency","Ein übertragbares Recht, einen Rabatt anzubieten beziehungsweise vorzulegen.","A transferable right to present a proposed discount."),
K("Kein 1:1-Euro","Not one-to-one euros","Kein Bankguthaben, keine Einlage und keine garantierte Bargeldzahlung.","Not a bank balance, a deposit or guaranteed cash redemption.")]),
P(2,"map","Die Ökosystem-Landkarte","The ecosystem map","Ein Netzwerk aus Handel, digitalen Rechten, Anwendungen und DeFi.","A network of commerce, digital rights, applications and DeFi.","Ich klicke die Teile nacheinander an. Nicht alle sind eine Firma, eine Wallet oder ein und dieselbe Anwendung.","I'll explore the components individually. They aren't all the same company, wallet or application.","Whitepaper · Ecosystem / Infrastructure",[
K("Händler & Kunden","Merchants & customers","Der reale Ausgangspunkt: Angebote und Käufe.","The real-world starting point: offers and purchases."),
K("VOW","VOW","Reserve- und Marktasset im Voucher-System.","Reserve and market asset in the voucher system."),
K("Voucher Currencies","Voucher currencies","Digitale Rabattrechte wie v$, v€ und v£.","Digital discount rights such as v$, v€ and v£."),
K("Single.id","Single.id","Zuordnung qualifizierter Transaktionen und Rewards.","Attribution of eligible transactions and rewards."),
K("Voucher Ledger","Voucher Ledger","Technik zur Verarbeitung von Voucher-Vorgängen.","Technology for handling voucher activity."),
K("VOW App / vTravel","VOW App / vTravel","Nutzeranwendungen mit eigenen Angeboten.","Consumer applications with their own offers."),
K("Börsen & LPs","Exchanges & LPs","Handel und Liquidität auf dem Tokenmarkt.","Trading and liquidity in token markets."),
K("TLN Protocol","TLN Protocol","Weitere DeFi-Funktionen mit eigenen Risiken.","Additional DeFi functions with their own risks.")]),
P(2,"cards","Verschiedene Anbieter – verschiedene Aufgaben","Different operators – different roles","Eine Verbindung ist nicht automatisch ein gemeinsamer Betreiber.","A connection doesn't necessarily mean a common operator.","Ich frage bei jedem Teil: Wer bietet das an, wer kann etwas verändern und welche Bedingungen gelten?","For every part, I ask who provides it, who can change things and which rules apply.","Whitepaper · Governance / Independence; Projektanalyse",[
K("VOW Foundation","VOW Foundation","Foundation auf Jersey mit Bezug zu Whitepaper und Governance.","Jersey foundation linked to the whitepaper and governance."),
K("Unternehmen","Companies","Single.id, Enigmatic Smile und andere Firmen agieren mit eigenen Strukturen.","Single.id, Enigmatic Smile and other businesses have their own structures."),
K("TLN Protocol","TLN Protocol","Beschreibt sich als dezentrales Smart-Contract-Protokoll.","Describes itself as a decentralised smart-contract protocol.")]),
P(2,"flow","Zwei verbundene, aber unterschiedliche Kreisläufe","Two connected but distinct cycles","Reale Rabattwelt und zusätzliche Token- und Kreditwelt.","Real-world discounts and an additional token and lending layer.","Ich verbinde die Bereiche gedanklich, aber verwechselte Händlerumsatz nicht mit Tokenemissionen.","I connect the layers, but don't confuse merchant revenue with token issuance.","Projektanalyse · Big Picture / Einnahmen",[
K("Realer Handel","Real commerce","Einkäufe, Angebote, Händlernutzen.","Purchases, offers and merchant utility."),
K("Voucher & VOW","Vouchers & VOW","Rabattrechte und die zugehörige Reserve-Mechanik.","Discount rights and the associated reserve model."),
K("DeFi & TLN","DeFi & TLN","Pools, Handel, Staking, Incentives und Kredite.","Pools, trading, staking, incentives and loans.")])
]);})();