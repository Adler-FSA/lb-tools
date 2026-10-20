(function(){
const P=(c,k,t,te,l,le,n,ne,src,items)=>({ch:c,kind:k,title:[t,te],lead:[l,le],narration:[n,ne],source:src,items});
const K=(a,b,c,d)=>({name:[a,b],detail:[c,d]});
window.VOW_SCENES=(window.VOW_SCENES||[]).concat([
P(6,"cards","Warum braucht es Liquidität?","Why does liquidity matter?","Ein Tokenkurs ist nicht gleich ein tatsächlich ausführbarer Verkauf.","A token quote isn't necessarily an executable price.","Ich möchte verstehen, wo ein handelbarer Preis entsteht und welche Rolle die Marktliquidität spielt.","I want to understand where a tradable price comes from and why market liquidity matters.","Whitepaper · Centralized vs Decentralized Exchanges",[
K("Handelsplatz","Exchange","Verbindet Käufer und Verkäufer.","Connects buyers and sellers."),
K("Liquiditätspool","Liquidity pool","Stellt Token für mögliche DEX-Tauschgeschäfte bereit.","Provides assets for potential DEX swaps."),
K("Slippage","Slippage","Ein tatsächlicher Tauschpreis kann vom Angebot abweichen.","Execution can differ from the quote.")]),
P(6,"flow","Wie ein Liquidity Provider arbeitet","How a liquidity provider works","LPs stellen Assets bereit und können Gebühren erhalten, tragen aber Risiken.","LPs supply assets and may earn fees while accepting risks.","Ich trenne mögliche Handelsgebühren von der Veränderung des Werts meiner Pool-Position.","I distinguish trading fees from changes in the value of the pool position.","Whitepaper · Liquidity Providers",[
K("Zwei Assets","Two assets","Nach Poolbedingungen einbringen.","Deposited under pool rules."),
K("LP-Position","LP position","Ein Poolanteil wird repräsentiert.","A stake in the pool is represented."),
K("DEX-Handel","DEX trading","Transaktionen können Gebühren auslösen.","Trades may generate fees."),
K("Marktrisiko","Market risk","Kursverlauf, Impermanent Loss und Smart Contracts.","Price movements, impermanent loss and smart contracts.")]),
P(6,"compare","Gebühr ist nicht Tokenemission","A fee isn't token issuance","Handelsertrag und neu geschaffene Einheiten sind wirtschaftlich verschieden.","Trading revenue and newly issued units are economically different.","Wenn ich einen Reward sehe, frage ich nach dem tatsächlichen Ursprung und nach seiner Handelbarkeit.","When I see a reward, I ask about its source and its tradability.","Projektanalyse · DApp / Einnahmequellen",[
K("Handelsgebühr","Trading fee","Kann aus tatsächlich ausgeführten Trades stammen.","May arise from executed trades."),
K("Incentive-Token","Incentive token","Entsteht nach Emissionsregeln; Menge ist noch kein Fiatgewinn.","Minted under protocol rules; token quantity isn't fiat profit.")]),
P(7,"map","Die TLN-DApp als eigene DeFi-Welt","The TLN DApp as a separate DeFi layer","Staking, Gold/Plus, Borrowing und Lending ergänzen die Voucher-Welt.","Staking, Gold/Plus, borrowing and lending extend the voucher ecosystem.","Ich erkenne: TLN ist weder die VOW App noch ein gewöhnliches Gutscheinprogramm. Es hat eigene Contract- und Marktregeln.","I see TLN isn't the VOW App or a conventional coupon scheme. It has separate contracts and market rules.","TLN Protocol DApp / Projektanalyse",[
K("Wallet","Wallet","Persönlicher Zugang, bei dem Schlüssel beim Nutzer bleiben sollen.","Personal access where keys remain with the user."),
K("LP-Staking","LP staking","Poolanteile können im Protokoll gebunden werden.","Pool shares may be locked in the protocol."),
K("TLN Gold / TLN+","TLN Gold / TLN+","Tokenbasierte Incentives und mögliche Nutzungsrechte.","Token-based incentives and possible utility."),
K("Borrowing","Borrowing","Kredit- und VOW-Booster-Varianten mit Bedingungen.","Loan and VOW booster options with conditions."),
K("Lending","Lending","Kreditpools mit Laufzeit, Kapitalbindung und Risiko.","Loan pools with terms, capital locks and risks."),
K("Referral","Referral","Kann die Berechnung bestimmter Anreiz- und Kreditkapazitäten beeinflussen.","Can affect certain incentives and borrowing capacity.")]),
P(7,"flow","Wie LP-Staking mit TLN zusammenhängt","How LP staking connects to TLN","Eine Protokollbelohnung ist nicht automatisch realisierte Rendite.","A protocol reward isn't automatically a realised return.","Ich halte LP-Anteil, Staking-Bindung, Tokenemission und einen möglichen Verkauf auseinander.","I distinguish the LP stake, lock-up, token issuance and potential sale.","TLN DApp · Staking / Projektanalyse",[
K("LP-Token","LP token","Steht für eine Poolposition.","Represents a pool position."),
K("Staking","Staking","Bindet den Anteil nach Smart-Contract-Regeln.","Locks the share under smart-contract rules."),
K("Gold / Plus","Gold / Plus","Tokenbasierte Incentives können entstehen.","Token-based incentives may be minted."),
K("Marktwert?","Market value?","Handelbarkeit und erzielbarer Preis bleiben offen.","Tradability and achievable prices remain uncertain.")]),
P(7,"cards","Was ein VOW-Booster tatsächlich macht","What a VOW booster actually does","Auch ein Smart-Contract-Kredit hat Zins, Sicherheiten und eine Frist.","Even a smart-contract loan has interest, collateral and a term.","Ich schaue mir zuerst die Vertragsmechanik an. Das Wort Booster allein erklärt mir weder Kosten noch Risiko.","I start with the contract mechanics. The word booster tells me neither the cost nor the risk.","TLN Protocol · Borrow / Gold Booster",[
K("v$-Kredit","v$ loan","Betrag und Verfügbarkeit richten sich nach Pools und Regeln.","Amount and availability depend on pools and rules."),
K("Zins","Interest","In dokumentierten Varianten etwa 18 %, teilweise im Voraus.","Around 18% in documented variants, sometimes upfront."),
K("VOW-Besicherung","VOW collateral","Gebundene Assets können bei Nichtrückzahlung verloren gehen.","Locked assets may be forfeited upon non-repayment."),
K("372 Tage","372 days","Frist bestimmter TLN-Kreditvarianten, keine universelle Regel.","Term for some TLN loan variants, not a universal rule.")]),
P(7,"lending","Stablecoin-Lending verstehen","Understanding stablecoin lending","20 % APY sind ein beworbenes Ziel, keine garantierte Auszahlung.","20% APY is an advertised target, not a guaranteed payout.","Ich kann eine Jahresrechnung zeigen. Entscheidend bleibt, wie Kapital verwendet wird, wo der Ertrag entsteht und ob er unabhängig belegt ist.","I can show an annualised calculation. What matters is where capital goes, how revenue arises and whether it's independently evidenced.","TLN Protocol · Stablecoin Lending; Projektanalyse GELB–ROT",[]),
P(8,"flow","Woher kommt ein wirtschaftlicher Ertrag?","Where does economic income come from?","Realer Handel, Gebühren, Zinsen und Tokenemissionen sind zu unterscheiden.","Real commerce, fees, interest and token issuance must be distinguished.","Ich schaue auf die Herkunft der Zahl, nicht nur auf die Höhe im Dashboard.","I look at the origin of a figure, not merely its size on a dashboard.","Projektanalyse · Geld- und Wertfluss",[
K("Commerce","Commerce","Tatsächliche Umsätze und Händleraktivität.","Actual sales and merchant activity."),
K("DEX-Gebühren","DEX fees","Gebühren aus real ausgeführten Tauschgeschäften.","Fees from actual executed swaps."),
K("Kreditzinsen","Loan interest","Zahlungen von Kreditnehmern.","Payments from borrowers."),
K("Emission","Issuance","Neugeprägte Token oder interne Mittelallokation.","Newly minted tokens or internal allocation of capital.")]),
P(8,"cards","Drei Zahlen, drei unterschiedliche Aussagen","Three numbers, three different meanings","Tokenmenge, Modellwert und realisierter Betrag dürfen nicht vermischt werden.","Token quantity, illustrative value and realised proceeds must not be confused.","Ich frage bei jeder Anzeige, ob ich Einheiten, eine Rechengröße oder tatsächlich verfügbares Geld sehe.","For each display, I ask if I see units, a calculation or actually available cash.","Projektanalyse · Auszahlungen / Plausibilität",[
K("100 Token","100 tokens","Eine digitale Menge ohne zugesagten Eurogegenwert.","A digital quantity without a guaranteed euro equivalent."),
K("Modellbewertung","Illustrative value","Eine Rechnung mit angenommenem Tokenkurs.","A calculation using an assumed token price."),
K("Realisierter Erlös","Realised proceeds","Ergebnis einer tatsächlichen Transaktion nach Kosten.","Outcome of an actual transaction after costs.")]),
P(8,"compare","Kann das Gesamtsystem langfristig tragen?","Can the whole model be sustainable?","Echte Technologie ist kein Nachweis dauerhafter Ertragsquellen.","Real technology isn't proof of durable sources of revenue.","Ich sehe nachvollziehbare Funktionen und zugleich offene Fragen zu Nachfrage, Ausfällen und unabhängigen Cashflows.","I see verifiable functionality alongside open questions about demand, defaults and independently verified cash flow.","Projektanalyse 18.08.2026 · Gesamturteil GELB–ROT",[
K("Dokumentierte Bausteine","Documented components","Contracts, DApps und einzelne Commerce-Angebote existieren.","Contracts, DApps and some commerce offers exist."),
K("Offene Belege","Evidence gaps","Nachhaltige Ertragsdeckung und Gesamtmittelverwendung nicht unabhängig umfassend belegt.","Sustainable earnings coverage and total fund allocation haven't been comprehensively verified.")])
]);})();