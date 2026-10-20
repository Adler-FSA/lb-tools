(()=>{
"use strict";
const story=window.VOW_STORY||[],background=window.VOW_SCENES||[];
const phases=[["Welt 1 · Alltag & Nutzen","World 1 · Everyday benefits"],["Welt 1 · VOW verstehen","World 1 · Understanding VOW"],["Welt 2 · TLN entdecken","World 2 · Discovering TLN"],["Gemeinsam weiter","Continuing together"]];
const oldChapters=[["Ankommen","Welcome"],["Die Rabattidee","The discount idea"],["Das Ökosystem","The ecosystem"],["Voucher-Rechte","Voucher rights"],["VOW & Reserve","VOW & reserve"],["Alltag & Anwendungen","Everyday applications"],["Liquidität","Liquidity"],["TLN-DApp","TLN DApp"],["Wirtschaft","Economics"],["Wallet & Praxis","Wallet & practical use"],["Geschichte","History"],["Das Gesamtbild","The big picture"]];
const sourceLinks=[
["VOW Whitepaper · März 2026","https://vowwhitepaper.com/"],
["VOW · Voucher Currencies","https://vowwhitepaper.com/economics/voucher-currencies"],
["VOW · Minting Vouchers","https://vowwhitepaper.com/economics/minting-vouchers"],
["VOW · Single.id","https://vowwhitepaper.com/infrastructure/singleid"],
["VOW · Voucher Ledger","https://vowwhitepaper.com/infrastructure/voucher-ledger"],
["vTravel · Phase-1-Angebot","https://vtravel.info/"],
["TLN Protocol · Lending","https://tlnprotocol.com/app/lockandlend"],
["TLN Protocol · Borrowing","https://tlnprotocol.com/app/borrow/tlngold-booster"],
["TLN Community · offizieller Kalender","https://kalender.digital/tln-allgemein"],
["TLN Community · Termine","https://kalender.digital/tln-allgemein"]
];
const w={
de:{menu:"Inhalt",speaker:"Vortragendenansicht",guest:"Gastansicht",sources:"Quellen",start:"Entdeckungsreise starten",back:"Zurück",next:"Weiter",again:"Von vorne",library:"Hintergrundwissen",toStory:"Zur Hauptgeschichte",story:"Die gemeinsame Entdeckungsreise",knowledge:"Vertiefendes Fachwissen",coach:"Begleittext für die Präsentation",tip:"Zum Entdecken anklicken",insight:"Was wir mitnehmen",step:"Schritt",sourceLabel:"Fachliche Grundlage",modelInput:"Beispielbuchung verändern",modelBase:"Buchungswert (USDT/USDC)",modelOut:"Beworbene v$-Rückvergütung (20 %)",modelNote:"Modell nach der vTravel-Anbieterbeschreibung. Kein Bargeld-Cashback; spätere Nutzung hängt von aktuellen Angebots-, Buchungs- und Annahmebedingungen ab.",sourceInfo:"Die Hauptgeschichte erklärt Nutzen, Motivation und das Zusammenspiel. Grundlage: VOW Whitepaper v6.7 (März 2026), öffentliches vTravel-Phase-1-Angebot, TLN-DApp-Beschreibungen und Projektanalyse der Akademie vom 18.08.2026 (Gesamtbewertung GELB–ROT). Die Fachbibliothek vertieft einzelne Mechaniken. Die sechs TLN-Hörsaal-Seiten wurden als redaktionelle Quellen verwendet, jedoch nicht verlinkt.",legal:"Bildungspräsentation: keine Anlage-, Rechts- oder Steuerberatung. Aus Anbieterangaben folgen weder Garantien noch unabhängige Ertragsnachweise. Konkrete Angebote, deren Verfügbarkeit, Akzeptanz, Gebühren, Vergütungsinteressen und Risiken stets prüfen. Keine Wallet oder Anmeldung erforderlich.",keys:"Pfeiltasten: weiter und zurück · M: Inhaltsübersicht · T: Vortragendenansicht · L: Vertiefungen · auf Mobilgeräten wischen.",calendar:"TLN Community-Termine ansehen",original:"Original-Whitepaper lesen",knowledgeBtn:"Technische Details vertiefen",example:"Anschauliches Beispiel · keine Zusage",listen:"Gemeinsam entdecken",why:"Warum ist das interessant?",not:"Wichtig zu unterscheiden"},
en:{menu:"Contents",speaker:"Presenter view",guest:"Audience view",sources:"Sources",start:"Start the discovery",back:"Back",next:"Next",again:"Start again",library:"Background knowledge",toStory:"Back to the main story",story:"Our shared discovery",knowledge:"Detailed background knowledge",coach:"Presentation speaker notes",tip:"Select to explore",insight:"What we take away",step:"Step",sourceLabel:"Evidence basis",modelInput:"Adjust sample booking",modelBase:"Booking amount (USDT/USDC)",modelOut:"Advertised v$ reward (20%)",modelNote:"Illustration from the vTravel provider's offer. Not cash back: future use depends on current offer, booking and acceptance terms.",sourceInfo:"The main story explains purpose, potential value and connections. Sources: VOW Whitepaper v6.7 (March 2026), public vTravel Phase 1 offer, TLN DApp descriptions and the academy's 18 Aug 2026 assessment (overall AMBER–RED). The optional library contains technical depth. Six source lecture pages informed the editorial work but are not linked.",legal:"Educational presentation, not investment, legal or tax advice. Provider statements aren't guarantees or independent proof of revenue. Verify live availability, acceptance, costs, incentives and risks. No wallet or sign-up required.",keys:"Arrow keys: next/back · M: menu · T: speaker view · L: detail library · swipe on mobile.",calendar:"See official TLN community calls",original:"Read the original whitepaper",knowledgeBtn:"Explore technical background",example:"Illustration · not a guarantee",listen:"Explore together",why:"Why does it matter?",not:"A useful distinction"}};
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let lang="de",mode="story",idx=0,storyReturnIdx=0,speaker=false,selections={},examples={travel:500,powerFirst:500,powerNext:600,powerAccepted:true},menuTab="story";
function T(pair){return Array.isArray(pair)?pair[lang==="de"?0:1]:(pair??"");}
const fmt=x=>Number(x).toLocaleString(lang==="de"?"de-DE":"en-US",{maximumFractionDigits:2});
function deck(){return mode==="story"?story:background;}
function thisScene(){return deck()[idx];}
function open(id){const el=$(id);if(el&&!el.open)el.showModal();}
function toDeck(m,num=0){if(mode==="story"&&m==="library")storyReturnIdx=idx;mode=m;idx=Math.max(0,Math.min(num,deck().length-1));renderNav();draw();}
function go(num){idx=Math.max(0,Math.min(num,deck().length-1));draw();}
function rowCards(scene,options={}){
const current=selections[mode+idx]??0;
const cards=scene.items||[];
const count=cards.length;
const klass=options.klass||(count===2?"two":count===4?"four":"");
const list='<div class="experience-grid '+klass+'">'+cards.map((x,i)=>
'<button type="button" class="experience-card" data-choice="'+i+'" aria-pressed="'+String(current===i)+'" style="--card-index:'+i+'"><span class="experience-mark">'+String(i+1).padStart(2,"0")+'</span><strong>'+esc(T(x.name))+'</strong><span class="experience-more" aria-hidden="true">↗</span></button>').join("")+'</div>';
if(options.cardsOnly)return list;
const active=cards[current]||cards[0];
return list+'<div class="experience-detail" id="choiceFocus" aria-live="polite"><span class="experience-eye">'+esc(w[lang].why)+'</span><p>'+esc(T(active?.detail))+'</p></div>';
}
function action(type,label,kind=""){return '<button type="button" class="journey-action '+kind+'" data-action="'+type+'">'+esc(label)+' <span aria-hidden="true">↗</span></button>';}
function anchor(url,text){return '<a class="journey-action" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(text)+' <span aria-hidden="true">↗</span></a>';}
function specialVisual(s){
switch(s.kind){
 case "hero":
 return '<div class="hero-experience"><div class="hero-left"><p class="giant-words">'+(lang==="de"?"Aus dem Alltag.":"From everyday life.")+'<span>'+(lang==="de"?"In neue Möglichkeiten.":"Into new possibilities.")+'</span></p><div class="hero-actions">'+action("next",w[lang].start,"primary")+'</div><div class="hero-pills"><span>VOW</span><span>+</span><span>TLN</span></div></div><div class="hero-world" aria-hidden="true"><div class="world-ring outer"></div><div class="world-ring inner"></div><span class="world-dot dot-a">◎</span><span class="world-dot dot-b">✦</span><span class="world-dot dot-c">↗</span><div class="world-center"><small>'+(lang==="de"?"GEMEINSAM":"TOGETHER")+'</small><b>WIR</b></div></div></div>';
 case "islands":
 return '<div class="islands-demo"><div class="island-top"><span>'+(lang==="de"?"EINZELNE VORTEILE":"SEPARATE REWARDS")+'</span><span>'+(lang==="de"?"VOW-IDEE":"VOW CONCEPT")+'</span></div><div class="islands-split"><div class="isolated"><i>★</i><i>✈</i><i>◈</i></div><div class="connection-icon">→</div><div class="connected"><i>★</i><i>✈</i><i>◈</i><span>◎</span></div></div>'+rowCards(s)+'</div>';
 case "journey":
 return '<div class="journey-steps">'+s.items.map((q,i)=>'<button class="journey-step" type="button" data-choice="'+i+'" aria-pressed="'+String((selections[mode+idx]||0)===i)+'"><span class="step-number">'+(i+1)+'</span><strong>'+esc(T(q.name))+'</strong><span class="step-arrow">→</span></button>').join("")+'</div><div class="experience-detail" id="choiceFocus" aria-live="polite"><span class="experience-eye">'+w[lang].why+'</span><p>'+esc(T(s.items[selections[mode+idx]||0].detail))+'</p></div>';
 case "travel":{
 const n=examples.travel;
 return '<div class="booking-showcase"><div class="booking-drawing"><div class="boarding-pass"><div class="boarding-head"><span>vTravel · '+(lang==="de"?"Beispielreise":"Example trip")+'</span><span>✈</span></div><div class="boarding-route"><b>START</b><span>──────── ✦ ────────</span><b>'+(lang==="de"?"ZIEL":"DESTINATION")+'</b></div><div class="boarding-bottom"><span>'+(lang==="de"?"Geplante Reise":"Planned journey")+'</span><strong>'+fmt(n)+' USDT/USDC</strong></div></div></div><div class="booking-controls"><label for="bookingRange">'+esc(w[lang].modelInput)+'</label><input id="bookingRange" type="range" min="100" max="3000" step="50" value="'+n+'"><div class="booking-metrics"><div><small>'+w[lang].modelBase+'</small><strong id="bookingBase">'+fmt(n)+'</strong></div><div><small>'+w[lang].modelOut+'</small><strong id="bookingReward">'+fmt(n*.2)+' v$</strong></div></div><p class="booking-warning">'+esc(w[lang].modelNote)+'</p></div></div>';
 }
 case "power":{
 const a=examples.powerFirst,b=examples.powerNext,amount=Math.round(a*.2),saved=examples.powerAccepted?Math.min(amount,b):0,due=b-saved;
 const de=lang==="de";
 return '<div class="power-demo"><div class="power-inputs"><label><span>'+(de?"Erste Reise · Beispielbetrag":"First trip · example amount")+'</span><strong id="powerFirstValue">'+fmt(a)+' USDT</strong><input id="powerFirst" type="range" min="100" max="2500" step="50" value="'+a+'"></label><label><span>'+(de?"Spätere Reise · Beispielbetrag":"Later trip · example amount")+'</span><strong id="powerNextValue">'+fmt(b)+' USDT</strong><input id="powerNext" type="range" min="100" max="3000" step="50" value="'+b+'"></label><button class="power-accept" type="button" data-action="acceptToggle" aria-pressed="'+examples.powerAccepted+'"><span class="power-switch">✓</span><span>'+(de?(examples.powerAccepted?"Annahme im Beispiel: Ja":"Annahme im Beispiel: Nein"):(examples.powerAccepted?"Accepted in scenario: Yes":"Accepted in scenario: No"))+'</span></button></div><div class="power-results"><div class="power-stage"><small>'+(de?"Möglicher Reward aus erster Reise":"Potential reward from first trip")+'</small><strong id="powerVoucher">'+fmt(amount)+' v$</strong><small>'+(de?"Beispielquote 20 %":"Illustrative rate 20%")+'</small></div><div class="power-bars"><div><span>'+(de?"Folgereise ohne Nachlass":"Later booking without discount")+'</span><b id="powerFull">'+fmt(b)+' USDT</b><i style="--bar:100%;background:#dde7ee"></i></div><div><span>'+(de?"Folgereise mit angenommener Einlösung":"Later booking if redemption accepted")+'</span><b id="powerDue">'+fmt(due)+' USDT</b><i id="powerBar" style="--bar:'+(due/b*100)+'%"></i></div></div><div class="power-benefit"><span>'+(de?"Möglicher Kaufkraftvorteil":"Potential buying power benefit")+'</span><strong id="powerSaved">'+fmt(saved)+' USDT</strong></div></div><p class="power-notice" id="powerExplanation" aria-live="polite">'+(de?"Reines Rechenbeispiel: Nur bei tatsächlich verfügbarer und akzeptierter Einlösung verringert sich die Zahlung. v$ sind kein Bargeld.":"Illustration only: payment is reduced only where the v$ is genuinely accepted under an available offer. v$ is not cash.")+'</p></div>';
 }
 case "network":
 return '<div class="ecosystem-map"><div class="map-ring" aria-hidden="true"><span class="map-orb" style="--orb:0">◉</span><span class="map-orb" style="--orb:1">◎</span><span class="map-orb" style="--orb:2">✦</span></div><div class="map-selects">'+rowCards(s,{cardsOnly:true})+'</div><div class="map-insight" id="choiceFocus"><small>'+esc(w[lang].why)+'</small><h3 id="choiceName">'+esc(T(s.items[selections[mode+idx]||0].name))+'</h3><p>'+esc(T(s.items[selections[mode+idx]||0].detail))+'</p></div></div>';
 case "transition":
 return '<div class="second-world"><div class="world-panel commerce"><small>'+(lang==="de"?"BISHER ENTDECKT":"WHAT WE KNOW")+'</small><span>♧</span><h3>'+esc(T(s.items[0].name))+'</h3><p>'+esc(T(s.items[0].detail))+'</p></div><div class="world-join" aria-hidden="true">➜</div><div class="world-panel defi"><small>'+(lang==="de"?"JETZT KOMMT HINZU":"NOW WE EXPLORE")+'</small><span>◈</span><h3>'+esc(T(s.items[2].name))+'</h3><p>'+esc(T(s.items[2].detail))+'</p></div></div>';
 case "liquidity":
 return '<div class="liquidity-visual"><div class="market-person"><span>↗</span><strong>'+(lang==="de"?"Tauschen":"Swap")+'</strong></div><div class="market-link"></div><div class="market-pool"><div class="pool-waves" aria-hidden="true"></div><strong>'+(lang==="de"?"Liquiditätspool":"Liquidity pool")+'</strong><span>VOW + '+(lang==="de"?"Partnerwert":"paired asset")+'</span></div><div class="market-link"></div><div class="market-person"><span>↔</span><strong>'+(lang==="de"?"Handeln":"Trade")+'</strong></div></div>'+rowCards(s);
 case "community":
 return '<div class="community-art"><div class="community-center"><span>◎</span><b>TLN COMMUNITY</b></div><span class="comm-node n1">?</span><span class="comm-node n2">✦</span><span class="comm-node n3">↗</span><span class="comm-node n4">○</span></div>'+rowCards(s);
 case "closing":
 return '<div class="ending-actions"><div class="ending-statement"><span>VOW <i>+</i> TLN</span><strong>'+(lang==="de"?"Jetzt kennen wir den Weg. Gemeinsam geht es weiter.":"Now we know the path. We can keep exploring together.")+'</strong></div><div class="ending-links">'+anchor("https://kalender.digital/tln-allgemein",w[lang].calendar)+anchor("https://vowwhitepaper.com/",w[lang].original)+action("library",w[lang].knowledgeBtn)+'</div></div>';
 default:return rowCards(s);
}}
function mainScene(s){
 const visual=specialVisual(s);
 return '<section class="scene active story-scene"><div class="scene-body"><div class="scene-head story-heading"><div class="chapter-label"><span class="phase-mark">'+esc(T(phases[s.phase]))+'</span><b>'+String(idx+1).padStart(2,"0")+' / '+story.length+'</b></div><h'+(idx===0?"1":"2")+'>'+esc(T(s.title))+'</h'+(idx===0?"1":"2")+'><p class="lead">'+esc(T(s.lead))+'</p><p class="story-explain">'+esc(T(s.body))+'</p></div><div class="story-visual">'+visual+'</div><div class="insight-bar"><strong>'+esc(w[lang].insight)+'</strong><span>'+esc(T(s.insight))+'</span></div><div class="story-tail">'+w[lang].sourceLabel+': '+esc(s.source)+' <button type="button" data-action="context" class="detail-access">'+esc(w[lang].knowledgeBtn)+' ↗</button></div></div></section>';
}
function libraryScene(s){
 const selected=s.items?.[selections["library"+idx]||0]||s.items?.[0];
 const title=esc(T(s.title)), lead=esc(T(s.lead));let v="";
 if(["voucher","travel","lending"].includes(s.kind)){
  const isTravel=s.kind==="travel",isVoucher=s.kind==="voucher",v0=isVoucher?1000:isTravel?500:10000;
  v='<div class="model"><div class="model-head"><span>'+w[lang].example+'</span><strong>'+fmt(v0)+' '+(isVoucher?"v$":"USDT")+'</strong></div><div class="model-results"><div class="model-result"><strong>'+fmt(v0)+'</strong><span>'+(isVoucher?"v$": "USDT / USDC")+'</span></div><div class="model-result"><strong>'+fmt(v0*.2)+'</strong><span>'+(isVoucher?"USD VOW":isTravel?"v$ Reward":"USDT Ziel-APY")+'</span></div></div><p class="model-note">'+(isTravel?w[lang].modelNote:isVoucher?(lang==="de"?"Nur die Whitepaper-Modellquote; keine Bargelddeckung.":"Whitepaper example only; not cash backing."):(lang==="de"?"Beworbenes APY-Ziel, nicht garantiert; 367 Tage und eigene Risiken.":"Advertised APY target, not guaranteed; 367 days and separate risks."))+'</p></div>';
 }else if(s.kind==="hero"){v='<div class="hero-layout"><div class="hero-voice">'+esc(T(s.narration))+'</div><div class="orbit"><div class="orbit-center">VOW + TLN</div></div></div>';}
 else {const grid=s.kind==="flow"?"flow":s.kind==="compare"?"compare":s.kind==="stack"?"stack":s.kind==="timeline"?"timeline":"grid"+(s.items.length===2?" two":s.items.length===4?" four":"");
 const buttons=s.items.map((item,i)=>'<button type="button" data-choice="'+i+'" class="tile" aria-pressed="'+String((selections["library"+idx]||0)===i)+'" style="--i:'+i+'"><small>'+String(i+1).padStart(2,"0")+'</small><strong>'+esc(T(item.name))+'</strong><span class="arrow">↗</span></button>').join("");
 v=s.kind==="map"?'<div class="map"><div class="map-grid">'+buttons+'</div><div class="map-focus"><div class="map-glyph">◎</div><h3 id="choiceName">'+esc(T(selected.name))+'</h3><p id="choiceFocus">'+esc(T(selected.detail))+'</p></div></div>':'<div class="'+grid+'">'+buttons+'</div><div class="detail" id="choiceFocus">'+esc(T(selected?.detail))+'</div>';
 }
 return '<section class="scene active"><div class="scene-body"><div class="scene-head"><div class="chapter-label">'+esc(T(oldChapters[s.ch]))+' <b>'+(idx+1)+' / '+background.length+'</b></div><h2>'+title+'</h2><p class="lead">'+lead+'</p></div>'+v+'<p class="source">'+esc(w[lang].sourceLabel)+': '+esc(s.source)+'</p></div></section>';
}
function renderNav(){
 const groups=mode==="story"?phases:oldChapters;
 $("chapters").innerHTML=groups.map((pair,i)=>'<button type="button" class="chapter" data-chapter="'+i+'" aria-current="false">'+esc(T(pair))+'</button>').join("");
 $("menuGrid").innerHTML=(menuTab==="story"?story:background).map((s,i)=>'<button type="button" data-menu-scene="'+i+'"><small>'+String(i+1).padStart(2,"0")+'</small>'+esc(T(s.title))+'</button>').join("");
 $("menuTitle").textContent=menuTab==="story"?w[lang].story:w[lang].knowledge;
 $("libraryBtn").textContent=mode==="story"?"◈ "+w[lang].library:"← "+w[lang].toStory;
}
function draw(){
 const s=thisScene();if(!s)return;
 $("stage").innerHTML=mode==="story"?mainScene(s):libraryScene(s);
 scheduleFit();
 $("back").disabled=idx===0;
 $("forwardLabel").textContent=idx===deck().length-1?w[lang].again:w[lang].next;
 $("trackFill").style.width=(100*(idx+1)/deck().length)+"%";
 $("counter").textContent=(idx+1)+" / "+deck().length;
 $("speakerLabel").textContent=w[lang].coach+" · "+(mode==="story"?T(phases[s.phase]):T(oldChapters[s.ch]));
 $("speakerText").textContent=T(mode==="story"?s.voice:s.narration);
 $("speakerPanel").hidden=!speaker;
 $("speakerToggle").setAttribute("aria-pressed",String(speaker));
 $("speakerToggle").textContent=speaker?w[lang].speaker:w[lang].guest;
 $("libraryBtn").textContent=mode==="story"?"◈ "+w[lang].library:"← "+w[lang].toStory;
 document.querySelectorAll("[data-chapter]").forEach(el=>el.setAttribute("aria-current",String(Number(el.dataset.chapter)===(mode==="story"?s.phase:s.ch))));
 document.querySelectorAll("[data-menu-scene]").forEach(el=>el.setAttribute("aria-current",String(mode===menuTab&&Number(el.dataset.menuScene)===idx)));
 document.title=T(s.title)+" · VOW & TLN";
}
let fitHandle=0;
function scheduleFit(){
 if(fitHandle)cancelAnimationFrame(fitHandle);
 fitHandle=requestAnimationFrame(()=>{
  fitHandle=0;const stage=$("stage"),body=stage?.querySelector(".scene-body");
  if(!body)return;
  body.style.zoom="1";body.classList.remove("allow-scene-scroll");
  const available=stage.clientHeight-8,needed=body.scrollHeight;
  if(needed>available){
    const ratio=Math.min(1,Math.max(.76,available/needed));
    body.style.zoom=String(ratio);
    if(needed*ratio>available+5)body.classList.add("allow-scene-scroll");
  }
 });
}
window.addEventListener("resize",scheduleFit,{passive:true});
function switchLang(value){
 if(!["de","en"].includes(value))return;lang=value;
 document.documentElement.lang=lang;
 $("menuBtn").textContent="☷ "+w[lang].menu;$("sourceBtn").textContent="ⓘ "+w[lang].sources;
 $("backLabel").textContent=w[lang].back;$("sourceTitle").textContent=w[lang].sources;
 $("sourceInfo").textContent=w[lang].sourceInfo;$("legal").textContent=w[lang].legal;$("menuKeys").textContent=w[lang].keys;
 $("showStory").textContent=w[lang].story;$("showLibrary").textContent=w[lang].knowledge;
 document.querySelectorAll("[data-lang]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.lang===lang)));
 renderNav();draw();
}
function choice(i){
 const s=thisScene(),active=s.items?.[i];if(!active)return;
 selections[mode+idx]=i;
 $("stage").querySelectorAll("[data-choice]").forEach(b=>b.setAttribute("aria-pressed",String(Number(b.dataset.choice)===i)));
 const d=$("choiceFocus"),name=$("choiceName");
 if(d){if(mode==="story"&&d.classList.contains("map-insight")){const p=d.querySelector("p");if(p)p.textContent=T(active.detail);}else {const p=d.querySelector("p");if(p)p.textContent=T(active.detail);else d.textContent=T(active.detail);}}
 if(name)name.textContent=T(active.name);
}
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.choice!==undefined){choice(Number(b.dataset.choice));return;}
 if(b.dataset.chapter!==undefined){let set=mode==="story"?story:background,phase=Number(b.dataset.chapter);go(Math.max(0,set.findIndex(s=>(mode==="story"?s.phase:s.ch)===phase)));return;}
 if(b.dataset.menuScene!==undefined){toDeck(menuTab,Number(b.dataset.menuScene));$("sceneMenu").close();return;}
 if(b.dataset.lang){switchLang(b.dataset.lang);return;}
 switch(b.dataset.action){
 case "next":go(idx===deck().length-1?0:idx+1);break;
 case "back":go(idx-1);break;
 case "menu":menuTab=mode;renderNav();open("sceneMenu");break;
 case "acceptToggle":examples.powerAccepted=!examples.powerAccepted;draw();break;
 case "library":if(mode==="story")toDeck("library",0);else toDeck("story",storyReturnIdx);break;
 case "context":if(mode==="story")toDeck("library",Math.max(0,Number(thisScene().detail?.[0]??0)));break;
 case "showStory":menuTab="story";renderNav();break;
 case "showLibrary":menuTab="library";renderNav();break;
 case "sources":open("sourceMenu");break;
 case "speaker":speaker=!speaker;draw();break;
 case "fullscreen":if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});break;
 case "closeScenes":$("sceneMenu").close();break;
 case "closeSources":$("sourceMenu").close();break;
 }
});
document.addEventListener("input",e=>{
 if(e.target.id==="powerFirst"||e.target.id==="powerNext"){
   examples[e.target.id==="powerFirst"?"powerFirst":"powerNext"]=Number(e.target.value);
   const a=examples.powerFirst,b=examples.powerNext,v=Math.round(a*.2),discount=examples.powerAccepted?Math.min(v,b):0,due=b-discount;
   $("powerFirstValue").textContent=fmt(a)+" USDT";$("powerNextValue").textContent=fmt(b)+" USDT";
   $("powerVoucher").textContent=fmt(v)+" v$";$("powerFull").textContent=fmt(b)+" USDT";
   $("powerDue").textContent=fmt(due)+" USDT";$("powerSaved").textContent=fmt(discount)+" USDT";
   $("powerBar").style.setProperty("--bar",(due/b*100)+"%");
   return;
 }
 if(e.target.id!=="bookingRange")return;
 const value=Number(e.target.value);examples.travel=value;
 $("bookingBase").textContent=fmt(value);
 $("bookingReward").textContent=fmt(value*.2)+" v$";
 const pass=$("stage").querySelector(".boarding-bottom strong");if(pass)pass.textContent=fmt(value)+" USDT/USDC";
});
document.addEventListener("keydown",e=>{
 if(e.target.closest("input,textarea,select")||$("sceneMenu").open||$("sourceMenu").open||e.altKey||e.ctrlKey||e.metaKey)return;
 if(["ArrowRight","PageDown"].includes(e.key)){e.preventDefault();go(idx+1);}
 else if(["ArrowLeft","PageUp"].includes(e.key)){e.preventDefault();go(idx-1);}
 else if(e.key==="Home")go(0);else if(e.key==="End")go(deck().length-1);
 else if(e.key.toLowerCase()==="m"){menuTab=mode;renderNav();open("sceneMenu");}
 else if(e.key.toLowerCase()==="t"){speaker=!speaker;draw();}
 else if(e.key.toLowerCase()==="l"){if(mode==="story")toDeck("library",0);else toDeck("story",storyReturnIdx);}
});
let touch=null;
$("stage").addEventListener("touchstart",e=>{if(e.target.closest("button,input")){touch=null;return}touch=[e.touches[0].clientX,e.touches[0].clientY]},{passive:true});
$("stage").addEventListener("touchend",e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch[0],dy=e.changedTouches[0].clientY-touch[1];if(Math.abs(dx)>92&&Math.abs(dx)>Math.abs(dy)*1.5)go(idx+(dx<0?1:-1));touch=null;},{passive:true});
$("sourceLinks").innerHTML=sourceLinks.map(([title,url])=>'<div><a target="_blank" rel="noopener noreferrer" href="'+esc(url)+'">'+esc(title)+' ↗</a></div>').join("");
if(story.length<12||background.length<30)throw Error("Presentation data incomplete");
switchLang("de");
})();