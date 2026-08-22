(()=>{
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const unique=a=>[...new Set(a.filter(Boolean))];
let seq=0;

const style=document.createElement('style');
style.textContent=`
.academyGuide{display:none;margin:22px 0 0;border:1px solid var(--line);border-radius:20px;background:#fff;overflow:hidden;box-shadow:0 8px 25px rgba(19,34,56,.045)}
.academyGuide.show{display:block}.academyGuideHead{padding:20px 21px;border-bottom:1px solid var(--line);background:linear-gradient(135deg,#f5fcfd,#fff 55%,#fff5fa)}
.academyGuideKicker{font-size:.74rem;font-weight:950;letter-spacing:.1em;text-transform:uppercase;color:var(--magenta)}
.academyGuideHead h2{margin:4px 0 5px;color:var(--navy);font-size:1.38rem}.academyGuideHead p{margin:0;color:var(--muted);font-size:.92rem;max-width:920px}
.academyVerdict{margin:16px 18px 0;padding:16px 17px;border:1px solid #efdfbd;border-radius:16px;background:var(--amber-soft)}
.academyVerdict.good{border-color:#d4eadf;background:var(--green-soft)}.academyVerdict.alert{border-color:#efcfd5;background:var(--red-soft)}
.academyVerdict b{display:block;color:var(--navy);font-size:1.03rem}.academyVerdict p{margin:5px 0 0;color:#48545f;font-size:.9rem}
.academyGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px}
.academyCard{border:1px solid var(--line);border-radius:16px;padding:15px;background:#fff}.academyCard.wide{grid-column:1/-1}.academyCard h3{margin:0 0 8px;color:var(--navy);font-size:1rem}.academyCard p{margin:0;color:#4d5963;font-size:.9rem}.academyList{display:grid;gap:8px;margin-top:9px}.academyItem{padding:10px 11px;border-radius:12px;border:1px solid var(--line);background:var(--grey-soft);font-size:.87rem;color:#46535d}.academyItem strong{color:var(--navy)}
.academyItem.risk{background:var(--amber-soft);border-color:#efdfbd}.academyItem.red{background:var(--red-soft);border-color:#efcfd5}.academyItem.ok{background:var(--green-soft);border-color:#d4eadf}.academyItem.info{background:var(--mint-soft);border-color:#cfe9ec}
.academySource{display:inline-flex;margin-top:10px;color:var(--mint-dark);font-size:.84rem;font-weight:900;text-decoration:none}.academyLoading{padding:18px;color:var(--muted);font-size:.9rem}.academyTiny{margin:0 18px 18px;padding:12px 14px;border-radius:13px;background:var(--magenta-soft);border:1px solid #edd9e3;color:#664252;font-size:.84rem}
@media(max-width:780px){.academyGrid{grid-template-columns:1fr}.academyCard.wide{grid-column:auto}.academyGuideHead{padding:17px}.academyGrid{padding:14px}.academyVerdict{margin:14px 14px 0}.academyTiny{margin:0 14px 14px}}
`;
document.head.appendChild(style);

function ensureShell(){
 let shell=$('#academyGuide');
 if(shell)return shell;
 shell=document.createElement('section');
 shell.id='academyGuide';shell.className='academyGuide';
 shell.innerHTML=`<div class="academyGuideHead"><div class="academyGuideKicker">Akademie · erste Orientierung</div><h2>Was solltest du wissen, bevor du weitergehst?</h2><p>Der Frühwarn-Check verbindet öffentlich erreichbare Projektinformationen mit einer verständlichen Akademie-Einordnung. Er entscheidet nicht für dich – er zeigt, welche Punkte vor Geldtransfer, Registrierung oder Wallet-Verbindung geklärt werden sollten.</p></div><div id="academyGuideBody" class="academyLoading">Öffentliche Spuren werden ausgewertet …</div>`;
 const result=$('#resultShell');
 if(result&&result.parentNode)result.parentNode.insertBefore(shell,result);else document.querySelector('main')?.appendChild(shell);
 return shell;
}
function hide(){seq++;const s=$('#academyGuide');if(s)s.classList.remove('show');}
async function fetchTimeout(url,ms=14000){const ac=new AbortController();const t=setTimeout(()=>ac.abort(),ms);try{return await fetch(url,{signal:ac.signal,headers:{Accept:'text/plain'}})}finally{clearTimeout(t)}}
async function readWebsite(domain){
 if(!domain)return'';
 const hosts=[`https://r.jina.ai/https://${domain}`,`https://r.jina.ai/http://${domain}`];
 for(const u of hosts){try{const r=await fetchTimeout(u);if(r.ok){const t=await r.text();if(t&&t.length>150)return t.slice(0,180000)}}catch(_){}}
 return'';
}
function pctMatches(text){
 const out=[];const re=/(?:bis\s+zu|up\s+to|earn\s+up\s+to|rendite|apy|apr|yield|interest)?[^\n\r%]{0,35}(\d{1,3}(?:[.,]\d+)?)\s*%\s*(APY|APR|p\.?a\.?|annual|jährlich|yield|interest)?/gi;let m;
 while((m=re.exec(text))&&out.length<12){const n=parseFloat(m[1].replace(',','.'));if(n>0&&n<=500)out.push({value:n,label:(m[2]||'%').toUpperCase()})}
 return out;
}
function moneyLike(text){return /\b(deposit|einzahl|staking|stake|earn|yield|interest|zinsen|rendite|crypto assets|krypto|usdt|usdc|btc|eth|defi|lending|borrow)/i.test(text)}
function has(text,re){return re.test(text)}
function sampleTerms(text,re,limit=5){const a=[];let m;const flags=re.flags.includes('g')?re.flags:re.flags+'g';const rr=new RegExp(re.source,flags);while((m=rr.exec(text))&&a.length<limit)a.push(norm(m[0]));return unique(a)}
function analyze(text,name,domain){
 const t=text||'';const lower=t.toLowerCase();const pcts=pctMatches(t).sort((a,b)=>b.value-a.value);const maxPct=pcts[0]?.value||null;
 const signals=[];const questions=[];const promises=[];
 const product=[];
 if(/staking|stake/i.test(t))product.push('Staking');
 if(/yield|earn|interest|zinsen|rendite/i.test(t))product.push('Earn-/Renditeprodukt');
 if(/trading|trade|algorithmic|arbitrage/i.test(t))product.push('Trading-/Strategieelemente');
 if(/lending|borrow|kredit|darlehen/i.test(t))product.push('Lending/Kredit');
 if(/defi/i.test(t))product.push('DeFi');
 if(/token/i.test(t))product.push('Token');
 if(!product.length&&moneyLike(t))product.push('Krypto-/Finanzangebot');
 if(maxPct){promises.push(`Auf der öffentlich erreichbaren Website wurde eine Rendite-/Zinsangabe bis etwa ${String(maxPct).replace('.',',')} % erkannt.`);signals.push({level:maxPct>=15?'red':'risk',title:'Renditeversprechen prüfen',text:`Hohe Prozentangaben sagen noch nichts darüber aus, wie nachhaltig die Rendite erwirtschaftet wird. Entscheidend sind Strategie, Verlustrisiko, Kosten und Gegenpartei.`});questions.push('Wodurch wird die beworbene Rendite tatsächlich erwirtschaftet – und welcher Verlust ist dabei möglich?')}
 const leverage=has(t,/\b(leverage|leveraged|hebel|margin trading)\b/i);const trading=has(t,/\b(trading|algorithmic trading|arbitrage|market making)\b/i);
 if(leverage||trading){signals.push({level:leverage?'red':'risk',title:'Strategie-/Marktrisiko sichtbar',text:leverage?'Die Website erwähnt Trading bzw. Hebel/Leverage. Hebel kann Gewinne, aber ebenso Verluste deutlich verstärken.':'Die Website beschreibt aktive Trading-/Strategieelemente. Damit hängt die Rendite von Markt-, Strategie- und Ausführungsrisiken ab.'});questions.push('Wer führt die Strategie aus, wie hoch waren reale Drawdowns und wie wird das Risiko begrenzt?')}
 const referral=has(t,/\b(referral|refer a friend|affiliate|partner program|empfehlungsprogramm|provision|commission|leader|sponsor|invite friends|werbe Freunde|werber)\b/i);
 const bonus=has(t,/\b(welcome bonus|willkommensbonus|bonus|incentive|reward bonus|gutschein|prize|vip)\b/i);
 if(referral||bonus){signals.push({level:'risk',title:'Vertriebsanreize erkannt',text:`Öffentliche Inhalte enthalten Hinweise auf ${referral?'Empfehlungs-/Partnervergütung':''}${referral&&bonus?' und ':''}${bonus?'Boni/Incentives':''}. Solche Anreize können Empfehlungen wirtschaftlich beeinflussen.`});questions.push('Verdient die Person, die dir das Projekt empfiehlt, an deiner Einzahlung oder deinem Umsatz?')}
 const lock=has(t,/\b(lock[- ]?up|locked|fixed term|term deposit|laufzeit|sperrfrist|90 days|180 days|365 days|1 year|12 months)\b/i);
 if(lock){signals.push({level:'risk',title:'Kapitalbindung möglich',text:'Die Website enthält Hinweise auf feste Laufzeiten oder gebundene Produkte. Das kann die kurzfristige Verfügbarkeit des Kapitals einschränken.'});questions.push('Kannst du jederzeit vollständig auszahlen oder gibt es feste Laufzeiten, Fristen oder Abschläge?')}
 const kyc=has(t,/\b(kyc|know your customer|identity verification|identitätsprüfung|verification)\b/i);const withdraw=has(t,/\b(withdrawal|withdraw|payout|auszahlung|cash out|review team|approval)\b/i);
 if(kyc||withdraw){signals.push({level:'risk',title:'Auszahlungs-/Prüfprozess beachten',text:`Die Website beschreibt ${kyc?'Identitäts-/KYC-Schritte':''}${kyc&&withdraw?' und ':''}${withdraw?'Auszahlungsprozesse':''}. Vor einer Einzahlung sollte klar sein, welche Bedingungen erst beim Exit greifen.`});questions.push('Welche KYC-, Prüf- oder Freigabeschritte gelten bei der Auszahlung – und wer kann eine Auszahlung stoppen?')}
 const custody=has(t,/\b(custody|custodian|verwahrung|institutional custody|assets are held|self custody|self-custody|private keys?)\b/i);
 if(custody){signals.push({level:'info',title:'Verwahrung wird thematisiert',text:'Die Website macht Aussagen zur Verwahrung oder Kontrolle von Assets. Diese Angaben sollten mit dem tatsächlich benannten Verwahrer, Vertragspartner und Insolvenzschutz abgeglichen werden.'});questions.push('Wer hält nach der Einzahlung tatsächlich die Assets bzw. Private Keys und was passiert bei Insolvenz?')}
 const guarantee=has(t,/\b(guaranteed|garantiert|risk[- ]?free|risikofrei|capital protected|kapitalgarantie|100% safe|sicher garantiert)\b/i);
 if(guarantee){signals.push({level:'red',title:'Sicherheits-/Garantieaussage erkannt',text:'Aussagen wie garantiert, risikofrei oder kapitalgeschützt benötigen einen sehr belastbaren rechtlichen und wirtschaftlichen Nachweis. Marketing allein genügt dafür nicht.'});questions.push('Wer garantiert konkret was – auf welcher Vertragsgrundlage und mit welcher finanziellen Deckung?')}
 const legalEntity=sampleTerms(t,/\b[A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9& .,-]{2,80}\s(?:GmbH|AG|Aktiengesellschaft|SE|Ltd\.?|Limited|LLC|Inc\.?|S\.?A\.?|S\.?A\.?S\.?|S\.r\.l\.|B\.V\.|PLC)\b/g,4);
 const imprint=has(t,/\b(impressum|legal notice|company number|registration number|registered office|handelsregister|company registration)\b/i);
 if(!legalEntity.length&&!imprint){signals.push({level:'risk',title:'Betreiberidentität nicht sofort greifbar',text:'In der automatisch gelesenen öffentlichen Website-Spur wurde kein eindeutig benannter Rechtsträger erkannt. Ein Markenname ist noch kein Vertragspartner.'});questions.push('Welche juristische Person ist dein Vertragspartner – mit Firmennummer, Sitz und zuständiger Aufsicht?')}
 else if(legalEntity.length){signals.push({level:'ok',title:'Rechtsträger-Hinweis auf Website gefunden',text:`Die Website enthält mindestens einen juristisch wirkenden Firmennamen (${legalEntity.slice(0,2).join(' · ')}). Dieser muss anschließend mit Register und Aufsicht abgeglichen werden.`})}
 const social=unique((t.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|t\.me|telegram\.me|facebook\.com|instagram\.com|linkedin\.com|x\.com|twitter\.com|discord\.gg)[^\s)\]>"']*/gi)||[])).slice(0,8);
 if(social.length)signals.push({level:'info',title:'Öffentliche Community-/Medienwege gefunden',text:`Die Website verweist auf ${social.length} öffentliche Social-/Video-Spur${social.length===1?'':'en'}. Diese Kanäle können zusätzliche Marketing- und Communityaussagen enthalten.`});
 const refLinks=(t.match(/https?:\/\/[^\s)\]>"']*(?:\/ref\/|[?&](?:ref|affiliate|partner)=)[^\s)\]>"']*/gi)||[]).slice(0,5);
 if(refLinks.length&&!referral){signals.push({level:'risk',title:'Referral-Linkstruktur erkannt',text:'In der öffentlichen Webspur wurden Referral-/Partnerparameter erkannt. Damit ist ein vergüteter oder zuordenbarer Empfehlungsweg zumindest technisch angelegt.'});questions.push('Welche Vergütung oder sonstige Vorteile entstehen aus dem Referral-Link?')}
 if(!signals.length){signals.push({level:'info',title:'Website gefunden – noch wenige klare Risikosignale automatisch erkannt',text:'Die Website konnte gelesen werden. Aus den automatisch erkennbaren Begriffen ergibt sich noch kein starkes Einzelmerkmal. Das ersetzt keine Prüfung von Vertrag, Betreiber und Geldfluss.'})}
 return {product:unique(product),promises,signals,questions:unique(questions).slice(0,8),legalEntity,social,maxPct,refLinks};
}
function levelClass(level){return level==='red'?'red':level==='ok'?'ok':level==='info'?'info':'risk'}
function render(ctx,text,a){
 const shell=ensureShell();const body=$('#academyGuideBody');if(!body)return;
 const name=ctx.company||ctx.domain||'das Angebot';const foundWebsite=!!text;
 const red=a.signals.filter(x=>x.level==='red').length;const risk=a.signals.filter(x=>x.level==='risk').length;
 let verdictClass=red?'alert':(risk?'':'good');
 let verdictTitle=red?'Mehrere Punkte verdienen vor dem nächsten Schritt besondere Aufmerksamkeit':risk?'Vor dem nächsten Schritt sind mehrere Punkte zu klären':'Bisher wenige klare Risikosignale automatisch erkannt';
 let verdictText=foundWebsite?`Die Akademie konnte eine öffentliche Website-Spur zu „${esc(name)}“ lesen und erste Aussagen daraus einordnen. Das ist eine Frühwarn-Orientierung, keine Freigabe und kein Betrugsvorwurf.`:`Zu „${esc(name)}“ konnte in diesem Lauf noch keine eindeutig lesbare Projektwebsite automatisch ausgewertet werden. Die Behörden-/Registerprüfung läuft davon getrennt weiter.`;
 const productText=a.product.length?a.product.join(' · '):'Angebotsart aus der Website noch nicht eindeutig ableitbar.';
 const promiseItems=a.promises.length?a.promises.map(x=>`<div class="academyItem info">${esc(x)}</div>`).join(''):`<div class="academyItem">Noch keine eindeutige Rendite-/Leistungsangabe automatisch erkannt.</div>`;
 const riskItems=a.signals.map(s=>`<div class="academyItem ${levelClass(s.level)}"><strong>${esc(s.title)}</strong><br>${esc(s.text)}</div>`).join('');
 const qItems=a.questions.length?a.questions.map(q=>`<div class="academyItem"><strong>Klärfrage:</strong> ${esc(q)}</div>`).join(''):`<div class="academyItem">Betreiber, Vertragspartner, Geldfluss und Auszahlungsbedingungen vor einer finanziellen Entscheidung trotzdem selbst nachvollziehen.</div>`;
 body.className='';body.innerHTML=`<div class="academyVerdict ${verdictClass}"><b>${verdictTitle}</b><p>${verdictText}</p></div><div class="academyGrid"><div class="academyCard"><h3>1 · Was ist das?</h3><p>${esc(productText)}</p>${ctx.domain?`<a class="academySource" href="https://${esc(ctx.domain)}" target="_blank" rel="noopener">Öffentliche Website öffnen ↗</a>`:''}</div><div class="academyCard"><h3>2 · Was wird öffentlich versprochen?</h3><div class="academyList">${promiseItems}</div></div><div class="academyCard wide"><h3>3 · Wo sieht die Akademie mögliche Risiken oder Fallstricke?</h3><div class="academyList">${riskItems}</div></div><div class="academyCard wide"><h3>4 · Was solltest du klären, bevor du weitergehst?</h3><div class="academyList">${qItems}</div></div></div><div class="academyTiny"><strong>Einordnung:</strong> Öffentliche Werbung, Website-Aussagen und Communityspuren können Risiken früh sichtbar machen, lange bevor eine Behörde eine Warnung veröffentlicht. Umgekehrt beweist ein fehlender Warnhinweis weder Sicherheit noch Seriosität. Nutzerberichte und Medienaussagen müssen als solche gekennzeichnet und von amtlichen Fakten getrennt bleiben.</div>`;
 shell.classList.add('show');
}
async function run(){
 const my=++seq;const ctx=window.__fruehwarnInputContext||{};const company=norm(ctx.company||$('#companyQuery')?.value||$('#query')?.value);let domain=norm(ctx.domain||$('#domainQuery')?.value);
 const shell=ensureShell();shell.classList.add('show');const body=$('#academyGuideBody');if(body){body.className='academyLoading';body.textContent='Die Akademie liest öffentliche Projektinformationen und ordnet erkennbare Aussagen ein …'}
 let text='';if(domain)text=await readWebsite(domain);if(my!==seq)return;
 const a=analyze(text,company,domain);render({company,domain},text,a);
}
window.addEventListener('fruehwarn:search-finished',()=>setTimeout(run,160));
['input','change'].forEach(ev=>document.addEventListener(ev,e=>{if(e.target&&['query','companyQuery','domainQuery'].includes(e.target.id))hide()},true));
})();