(()=>{
"use strict";
const deck=window.VOW_SCENES||[];
const chapters=[["Ankommen","Welcome"],["Die Rabattidee","The discount idea"],["Das Ökosystem","The ecosystem"],["Voucher-Rechte","Voucher rights"],["VOW & Reserve","VOW & reserve"],["Alltag & Anwendungen","Everyday applications"],["Liquidität","Liquidity"],["TLN-DApp","TLN DApp"],["Wirtschaft","Economics"],["Sicherheit & MiCA","Safety & MiCA"],["Geschichte","History"],["Das Gesamtbild","The big picture"]];
const refs=[
["VOW Whitepaper v6.7","https://vowwhitepaper.com/"],
["Voucher Currencies","https://vowwhitepaper.com/economics/voucher-currencies"],
["Minting Vouchers","https://vowwhitepaper.com/economics/minting-vouchers"],
["Single.id","https://vowwhitepaper.com/infrastructure/singleid"],
["Voucher Ledger","https://vowwhitepaper.com/infrastructure/voucher-ledger"],
["TLN Borrow / Booster","https://tlnprotocol.com/app/borrow/tlngold-booster"],
["TLN Stablecoin Lending","https://tlnprotocol.com/app/lockandlend"],
["vTravel","https://vtravel.info/"],
["MiCA – EU-Verordnung 2023/1114","https://eur-lex.europa.eu/eli/reg/2023/1114/oj"]
];
const words={
de:{menu:"Szenen",speaker:"Vortragendenansicht",guest:"Gastansicht",sources:"Quellen",full:"Vollbild",start:"Entdeckungsreise starten",back:"Zurück",next:"Weiter",again:"Von vorne",label:"Begleittext für unsere Entdeckungsreise",tip:"Klicke auf die Bausteine, um ihre Funktion zu verstehen.",sourceLabel:"Quelle / Stand",modelInput:"Beispielbetrag",voucherBase:"Rabattrechte (Nennbetrag)",voucherResult:"Zugeordneter VOW-Marktwert bei 20%-Modellquote",travelBase:"Beispiel-Reisebuchung",travelResult:"Beworbene v$-Reward-Einheiten (20%)",lendBase:"Beispiel-Einzahlung",lendResult:"APY-Rechengröße bei 20%",voucherNote:"Eine illustrative Whitepaper-Rechnung. 20% sind kein dauerhafter Deckungsgrad und Voucher sind kein Bargeld.",travelNote:"Anbieterangabe zur Phase 1. v$ sind mögliche spätere Rabatte nach Bedingungen – kein auszahlbares Geld.",lendNote:"Nominale Hochrechnung des beworbenen Ziels, keine Auszahlungsgarantie und kein unabhängiger Ertragsnachweis.",sourceInfo:"Whitepaper v6.7 (März 2026), öffentliche TLN-DApp-Unterlagen, die ursprünglichen sechs Hörsaal-Quelltexte und Akademie-Projektanalyse vom 18.08.2026. Gesamturteil der damaligen Prüfung: GELB–ROT. Zu den Hörsaal-Seiten wird nicht verlinkt.",legal:"Bildungspräsentation, keine individuelle Anlage-, Rechts- oder Steuerberatung. Quellen und Bedingungen vor Nutzung erneut prüfen. Die gemeinsame Erzählperspektive ersetzt keine erforderliche Erlaubnis. Keine Wallet-Transaktionen in dieser Präsentation.",keys:"Tastatur: Pfeile für Szenen, M für Menü, T für Sprecheransicht. Auf Mobilgeräten nach links/rechts wischen."},
en:{menu:"Scenes",speaker:"Presenter view",guest:"Audience view",sources:"Sources",full:"Fullscreen",start:"Start the discovery",back:"Back",next:"Next",again:"Restart",label:"Shared discovery narration",tip:"Click the components to explore their purpose.",sourceLabel:"Source / date",modelInput:"Illustrative amount",voucherBase:"Voucher face denomination",voucherResult:"VOW market value allocated at 20% example ratio",travelBase:"Illustrative travel booking",travelResult:"Advertised v$ reward units (20%)",lendBase:"Illustrative deposit",lendResult:"20% APY calculation",voucherNote:"Whitepaper illustration. 20% isn't permanent cash backing and vouchers aren't cash.",travelNote:"Provider's Phase 1 description. v$ represents possible future discounts subject to terms, not cash.",lendNote:"Annualised illustration of the advertised target, not guaranteed payment or independently verified revenue.",sourceInfo:"Sources: whitepaper v6.7 (March 2026), public TLN DApp documents, six original source lecture texts and the Academy's 18 Aug 2026 assessment. At that date, overall evaluation: AMBER–RED. There are no links to the lecture hall.",legal:"Educational presentation, not personalised investment, legal or tax advice. Recheck sources and terms. Shared wording doesn't replace required authorisation. This presentation involves no wallet transactions.",keys:"Keyboard: arrows to change scenes, M for menu, T for presenter view. Swipe left/right on mobile."}
};
const $=id=>document.getElementById(id);
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let n=0,lang="de",speaker=false,choices={},models={voucher:1000,travel:500,lending:10000};
const tr=v=>Array.isArray(v)?v[lang==="de"?0:1]:(v??"");
function tile(item,i){
return '<button type="button" class="tile" data-choice="'+i+'" aria-pressed="'+String((choices[n]||0)===i)+'" style="--i:'+i+'"><small>'+String(i+1).padStart(2,"0")+'</small><strong>'+safe(tr(item.name))+'</strong><span class="arrow" aria-hidden="true">↗</span></button>';
}
function displayCards(s){
const count=s.items.length;
const selected=s.items[Math.min(choices[n]||0,count-1)]||s.items[0];
const gridClass=s.kind==="flow"?"flow":s.kind==="compare"?"compare":s.kind==="stack"?"stack":s.kind==="timeline"?"timeline":"grid"+(count===2?" two":count===4?" four":"");
const style=s.kind==="flow"?' style="--cols:'+Math.min(4,count)+'"':"";
const buttons=s.items.map(tile).join("");
if(s.kind==="map")return '<div class="map"><div class="map-grid">'+buttons+'</div><div class="map-focus"><div class="map-glyph" aria-hidden="true">◎</div><h3 id="focusTitle">'+safe(tr(selected.name))+'</h3><p id="focusDetail">'+safe(tr(selected.detail))+'</p></div></div>';
return '<div class="'+gridClass+'"'+style+'>'+buttons+'</div><div class="detail" id="focusDetail" aria-live="polite">'+safe(tr(selected.detail))+'</div>';
}
function displayHero(s){
return '<div class="hero-layout"><div><div class="hero-voice">'+safe(tr(s.narration))+'</div><div class="hero-actions"><button type="button" class="primary" data-action="next">'+words[lang].start+' →</button><button type="button" data-action="menu">'+words[lang].menu+' ☷</button></div></div><div class="orbit" aria-hidden="true"><div class="orbit-center">VOW + TLN</div></div></div>';
}
function displayModel(s){
const spec={
voucher:{min:100,max:5000,step:100,base:"v$",result:"USD",head:"voucherBase",out:"voucherResult",note:"voucherNote"},
travel:{min:100,max:3000,step:100,base:"USDT",result:"v$",head:"travelBase",out:"travelResult",note:"travelNote"},
lending:{min:10000,max:50000,step:1000,base:"USDT",result:"USDT",head:"lendBase",out:"lendResult",note:"lendNote"}
}[s.kind];
const amt=models[s.kind],fmt=v=>Number(v).toLocaleString(lang==="de"?"de-DE":"en-US");
return '<div class="model"><div class="model-head"><span>'+words[lang].modelInput+'</span><strong id="modelAmount">'+fmt(amt)+' '+spec.base+'</strong></div><input id="modelSlider" type="range" min="'+spec.min+'" max="'+spec.max+'" step="'+spec.step+'" value="'+amt+'" aria-label="'+words[lang].modelInput+'"><div class="model-results"><div class="model-result"><strong id="modelBase">'+fmt(amt)+' '+spec.base+'</strong><span>'+words[lang][spec.head]+'</span></div><div class="model-result"><strong id="modelResult">'+fmt(amt*.2)+' '+spec.result+'</strong><span>'+words[lang][spec.out]+'</span></div></div><p class="model-note">'+words[lang][spec.note]+'</p></div>';
}
function draw(){
const s=deck[n];if(!s)return;
const stage=$("stage"),title=safe(tr(s.title)),lead=safe(tr(s.lead));
let middle=s.kind==="hero"?displayHero(s):["voucher","travel","lending"].includes(s.kind)?displayModel(s):displayCards(s);
stage.innerHTML='<section class="scene active"><div class="scene-body"><div class="scene-head"><div class="chapter-label">'+String(s.ch+1).padStart(2,"0")+' / '+chapters.length+' · '+safe(tr(chapters[s.ch]))+' <b>'+String(n+1).padStart(2,"0")+' / '+deck.length+'</b></div><'+(n===0?"h1":"h2")+'>'+title+'</'+(n===0?"h1":"h2")+'><p class="lead">'+lead+'</p></div>'+middle+'<p class="source">'+words[lang].sourceLabel+': '+safe(s.source)+'</p></div></section>';
$("back").disabled=n===0;$("forwardLabel").textContent=n===deck.length-1?words[lang].again:words[lang].next;
$("trackFill").style.width=100*(n+1)/deck.length+"%";$("counter").textContent=(n+1)+" / "+deck.length;
$("speakerLabel").textContent=words[lang].label+" · "+tr(chapters[s.ch]);
$("speakerText").textContent=tr(s.narration);
$("speakerPanel").hidden=!speaker;$("speakerToggle").setAttribute("aria-pressed",String(speaker));
$("speakerToggle").textContent=speaker?words[lang].speaker:words[lang].guest;
document.querySelectorAll("[data-chapter]").forEach(b=>b.setAttribute("aria-current",String(Number(b.dataset.chapter)===s.ch)));
document.querySelectorAll("[data-slide]").forEach(b=>b.setAttribute("aria-current",String(Number(b.dataset.slide)===n)));
document.title=tr(s.title)+" · VOW & TLN";
}
function go(i){n=Math.min(Math.max(0,i),deck.length-1);draw();}
function selectTile(i){
const item=deck[n].items[i];if(!item)return;
choices[n]=i;document.querySelectorAll("[data-choice]").forEach(b=>b.setAttribute("aria-pressed",String(Number(b.dataset.choice)===i)));
$("focusDetail").textContent=tr(item.detail);if($("focusTitle"))$("focusTitle").textContent=tr(item.name);
}
function nav(){
$("chapters").innerHTML=chapters.map((c,i)=>'<button type="button" class="chapter" data-chapter="'+i+'">'+String(i+1).padStart(2,"0")+' · '+safe(tr(c))+'</button>').join("");
$("menuGrid").innerHTML=deck.map((s,i)=>'<button type="button" data-slide="'+i+'"><small>'+String(i+1).padStart(2,"0")+'</small>'+safe(tr(s.title))+'</button>').join("");
}
function renderWords(){
$("menuBtn").textContent="☷ "+words[lang].menu;$("sourceBtn").textContent="ⓘ "+words[lang].sources;
$("backLabel").textContent=words[lang].back;$("menuTitle").textContent=words[lang].menu;
$("sourceTitle").textContent=words[lang].sources;$("sourceInfo").textContent=words[lang].sourceInfo;
$("legal").textContent=words[lang].legal;$("menuKeys").textContent=words[lang].keys;
document.querySelectorAll("[data-lang]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.lang===lang)));
}
function language(value){if(!["de","en"].includes(value))return;lang=value;document.documentElement.lang=value;nav();renderWords();draw();}
function open(id){if(!$(id).open)$(id).showModal();}
document.addEventListener("click",e=>{
const b=e.target.closest("button");if(!b)return;
if(b.dataset.choice!==undefined){selectTile(Number(b.dataset.choice));return;}
if(b.dataset.chapter!==undefined){go(deck.findIndex(s=>s.ch===Number(b.dataset.chapter)));return;}
if(b.dataset.slide!==undefined){go(Number(b.dataset.slide));$("sceneMenu").close();return;}
if(b.dataset.lang){language(b.dataset.lang);return;}
switch(b.dataset.action){
case "next":go(n===deck.length-1?0:n+1);break;
case "back":go(n-1);break;
case "menu":open("sceneMenu");break;
case "sources":open("sourceMenu");break;
case "speaker":speaker=!speaker;draw();break;
case "fullscreen":if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});break;
case "closeScenes":$("sceneMenu").close();break;
case "closeSources":$("sourceMenu").close();break;
}});
document.addEventListener("input",e=>{
if(e.target.id!=="modelSlider")return;
const type=deck[n].kind;models[type]=Number(e.target.value);const base=type==="voucher"?"v$":"USDT",other=type==="travel"?"v$":type==="voucher"?"USD":"USDT",fmt=v=>Number(v).toLocaleString(lang==="de"?"de-DE":"en-US");
$("modelAmount").textContent=fmt(models[type])+" "+base;$("modelBase").textContent=$("modelAmount").textContent;
$("modelResult").textContent=fmt(models[type]*.2)+" "+other;
});
document.addEventListener("keydown",e=>{
if(e.target.closest("input,textarea,select")||$("sceneMenu").open||$("sourceMenu").open||e.altKey||e.ctrlKey||e.metaKey)return;
if(["ArrowRight","PageDown"].includes(e.key)){e.preventDefault();go(n+1)}
else if(["ArrowLeft","PageUp"].includes(e.key)){e.preventDefault();go(n-1)}
else if(e.key==="Home")go(0);else if(e.key==="End")go(deck.length-1);
else if(e.key.toLowerCase()==="m")open("sceneMenu");
else if(e.key.toLowerCase()==="t"){speaker=!speaker;draw();}
});
let touch=null;
$("stage").addEventListener("touchstart",e=>{if(e.target.closest("button,input")){touch=null;return;}touch=[e.touches[0].clientX,e.touches[0].clientY]},{passive:true});
$("stage").addEventListener("touchend",e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch[0],dy=e.changedTouches[0].clientY-touch[1];if(Math.abs(dx)>90&&Math.abs(dx)>Math.abs(dy)*1.5)go(n+(dx<0?1:-1));touch=null;},{passive:true});
$("sourceLinks").innerHTML=refs.map(([label,url])=>'<div><a href="'+safe(url)+'" target="_blank" rel="noopener noreferrer">'+safe(label)+' ↗</a></div>').join("");
if(deck.length<30||deck.some(s=>!chapters[s.ch]||!s.title||!s.narration))throw Error("Presentation scene data is incomplete");
language("de");
})();
