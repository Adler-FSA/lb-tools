(function(){
'use strict';
const $=id=>document.getElementById(id);
const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
const euro=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0);
const usd=v=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0)+' USD';
const num=(v,d=1)=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:0,maximumFractionDigits:d}).format(Number(v)||0);
const pct=v=>num(v,1)+' %';
function value(id){const e=$(id);if(!e)return 0;let s=String(e.value??'').trim().replace(/\s/g,'');if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0}
function fire(el){if(!el)return;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
function put(id,text){const e=$(id);if(e)e.textContent=text}
function setState(kind,html){const s=$('finalState');if(!s)return;s.className='state show '+(kind||'');s.innerHTML=html}

function recalcHotel(){
  const booking=value('h_booking'),vp=value('h_voucherPct')/100,rp=value('h_reservePct')/100,op=value('h_otaPct')/100;
  const voucher=booking*vp,reserve=voucher*rp,ota=booking*op,liq=Math.max(0,booking-reserve);
  put('h_outBooking',euro(booking));put('h_outVoucher',euro(voucher));put('h_outReserve',euro(reserve));put('h_outOta',euro(ota));put('h_outLiquidity',euro(liq));
  const price=value('h_offerPrice'),cost=value('h_offerCost'),use=Math.min(value('h_offerVoucher'),price),pay=Math.max(0,price-use),remain=pay-cost;
  put('h_offerPayOut',euro(pay));put('h_offerBenefitOut',euro(use));put('h_offerRemainOut',euro(remain));
  let sales=0,vouchers=0,cash=0,margin=0;
  $$('.serviceRow').forEach(r=>{const p=Number(r.querySelector('[data-s-price]')?.value)||0,c=Number(r.querySelector('[data-s-cost]')?.value)||0,v=Math.min(Number(r.querySelector('[data-s-voucher]')?.value)||0,p),py=Math.max(0,p-v),m=py-c;sales+=p;vouchers+=v;cash+=py;margin+=m;const a=r.querySelector('[data-s-pay]'),b=r.querySelector('[data-s-margin]');if(a)a.textContent=euro(py);if(b)b.textContent=euro(m)});
  put('h_servicesSales',euro(sales));put('h_servicesVoucher',euro(vouchers));put('h_servicesCash',euro(cash));put('h_servicesMargin',euro(margin));
}
function recalcBusiness(){
  const rev=value('b_otaRevenue'),ota=value('b_otaPct')/100,avg=value('b_avgBooking'),shift=value('b_shiftPct')/100,plan=Number($('b_plan')?.value)||499;
  const otaMonth=rev*ota,commission=avg*ota,shiftCost=rev*shift*ota;
  put('b_otaMonthOut',euro(otaMonth));put('b_otaYearOut',euro(otaMonth*12));put('b_planMonthOut',euro(plan));put('b_firstYearOut',euro(plan*13));put('b_commissionOut',euro(commission));put('b_equivOut',commission>0?num(plan/commission,1)+' Buchungen':'—');put('b_shiftOut',euro(shiftCost));
}
function recalcDirect(){
  const total=value('d_totalRevenue');
  const now=[value('d_bookNow'),value('d_otaNow'),value('d_directNow'),value('d_otherNow')],tar=[value('d_bookTarget'),value('d_otaTarget'),value('d_directTarget'),value('d_otherTarget')],cost=[value('d_bookCost'),value('d_otaCost'),value('d_directCost'),value('d_otherCost')].map(x=>x/100);
  const sn=now.reduce((a,b)=>a+b,0),st=tar.reduce((a,b)=>a+b,0),hint=$('d_mixHint');
  put('d_sumNow',pct(sn));put('d_sumTarget',pct(st));if(hint)hint.className='mixHint '+(Math.abs(sn-100)<.01&&Math.abs(st-100)<.01?'ok':'bad');
  const cNow=now.reduce((s,x,i)=>s+total*(x/100)*cost[i],0),cTar=tar.reduce((s,x,i)=>s+total*(x/100)*cost[i],0),delta=cNow-cTar;
  put('d_costNowOut',euro(cNow));put('d_costTargetOut',euro(cTar));put('d_deltaOut',euro(delta*12));put('d_directNowOut',pct(now[2]));put('d_directTargetOut',pct(tar[2]));
  const guest=value('d_guestAccesses'),e1=Math.round(guest*value('d_partnerRate')/100),e2=Math.round(e1*value('d_e2Rate')/100*value('d_e2Avg')),e3=Math.round(e2*value('d_e3Rate')/100*value('d_e3Avg'));
  const i1=e1*99*.20,i2=e2*99*.15,i3=e3*99*.10,logic=i1+i2+i3;
  put('d_e1Out',num(e1,0)+' · '+euro(i1));put('d_e2Out',num(e2,0)+' · '+euro(i2));put('d_e3Out',num(e3,0)+' · '+euro(i3));put('d_logicOut',euro(logic));
  const offer=value('d_offerValue'),benefit=offer*value('d_benefitPct')/100,bookings=value('d_marketBookings'),directCost=offer*value('d_directCostPct')/100,pay=Math.max(0,offer-benefit),remain=pay-directCost,market=remain*bookings;
  put('d_guestBenefitOut',euro(benefit));put('d_guestNetOut',euro(benefit-99));put('d_marketRemainOut',euro(remain));put('d_marketYearOut',euro(market));put('d_totalLeverOut',euro(delta*12+logic+market));
}
function recalcTech(){
  const amount=value('v_voucherAmount'),alloc=value('v_allocation')/100,removed=Math.min(value('v_removed'),amount),vow=value('v_vowPrice');
  const reserveUsd=amount*alloc,reserveVow=vow>0?reserveUsd/vow:0,remain=Math.max(0,amount-removed);
  put('v_reserveUsdOut',usd(reserveUsd));put('v_reserveVowOut',vow>0?num(reserveVow,2)+' VOW':'Live-/Marktpreis erforderlich');put('v_remainingOut',num(remain,1)+' v$');
  const eur=value('t_eurInput'),usdtEur=value('t_usdtEur'),vUsdt=value('t_vUsdt'),usdEur=value('t_usdEur');
  const usdt=usdtEur>0?eur/usdtEur:0,v=vUsdt>0?usdt/vUsdt:0,useEur=usdEur>0?v*usdEur:0;
  put('t_usdtOut',usdtEur>0?num(usdt,2)+' USDT':'Kurs erforderlich');put('t_vOut',vUsdt>0?num(v,2)+' v$':'Kurs erforderlich');put('t_useOut',(vUsdt>0&&usdEur>0)?euro(useEur):'Kurse erforderlich');put('t_multipleOut',(eur>0&&useEur>0)?num(useEur/eur,2)+'×':'—');
}
function recalcSummary(){
  put('sumHotelName',($('hotelNameFinal')?.value||'').trim()||'Ihr Hotel');
  put('sumBooking',euro(value('h_booking')));put('sumVoucher',euro(value('h_booking')*value('h_voucherPct')/100));put('sumBB',euro(Number($('b_plan')?.value)||499)+' / Monat');put('sumDirect',pct(value('d_directNow'))+' → '+pct(value('d_directTarget')));put('sumLogic',$('d_logicOut')?.textContent||'—');put('sumMarket',$('d_marketYearOut')?.textContent||'—');put('sumVoucherTech',$('v_reserveUsdOut')?.textContent||'—');put('sumVTravel',$('t_useOut')?.textContent||'—');
}
function recalcAll(){recalcHotel();recalcBusiness();recalcDirect();recalcTech();recalcSummary()}
const STORAGE='lbHotelZahlenV1';
const steps=()=>$$('.flowStep');
const panels=()=>$$('.flowPanel');
let currentStep=0;
function showStep(i,scroll=true){const ps=panels(),ss=steps();currentStep=Math.max(0,Math.min(ps.length-1,i));ps.forEach((p,n)=>p.classList.toggle('active',n===currentStep));ss.forEach((b,n)=>{b.classList.toggle('active',n===currentStep);b.setAttribute('aria-current',n===currentStep?'step':'false')});const prev=$('flowPrev'),next=$('flowNext');if(prev){prev.disabled=currentStep===0;prev.style.visibility=currentStep===0?'hidden':'visible'}if(next)next.style.display=currentStep===ps.length-1?'none':'inline-flex';put('progressText','Schritt '+(currentStep+1)+' von '+ps.length);const bar=$('progressBar');if(bar)bar.style.width=((currentStep+1)/ps.length*100)+'%';if(currentStep===ps.length-1)recalcSummary();if(scroll)$('flowShell')?.scrollIntoView({behavior:'smooth',block:'start'})}
function stateObject(){const o={};$$('[data-store]').forEach(e=>{o[e.id]=e.type==='checkbox'?e.checked:e.value});return o}
function saveState(){try{localStorage.setItem(STORAGE,JSON.stringify(stateObject()))}catch(e){}}
function loadState(){try{const o=JSON.parse(localStorage.getItem(STORAGE)||'{}');Object.entries(o).forEach(([id,v])=>{const e=$(id);if(!e)return;if(e.type==='checkbox')e.checked=!!v;else e.value=v})}catch(e){}if($('meetingDateFinal')&&!$('meetingDateFinal').value)$('meetingDateFinal').value=new Date().toISOString().slice(0,10)}
function installFlow(){steps().forEach((b,i)=>b.addEventListener('click',()=>showStep(i)));$('flowPrev')?.addEventListener('click',()=>showStep(currentStep-1));$('flowNext')?.addEventListener('click',()=>showStep(currentStep+1));$('resetSuite')?.addEventListener('click',()=>{if(!confirm('Alle Eingaben dieser Rechen- und Entscheidungsstrecke zurücksetzen?'))return;try{localStorage.removeItem(STORAGE)}catch(e){}location.reload()});$$('[data-store]').forEach(e=>{e.addEventListener('input',()=>{recalcAll();saveState()});e.addEventListener('change',()=>{recalcAll();saveState()})});loadState();recalcAll();showStep(0,false)}

function installStyles(){if($('hotelLivePatchStyle'))return;const s=document.createElement('style');s.id='hotelLivePatchStyle';s.textContent='.livebar-hotel{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 13px;margin:0 0 14px;border:1px solid var(--line);border-radius:12px;background:#fff}.livebar-hotel strong{display:block;color:var(--navy)}.livebar-hotel small{display:block;color:var(--muted)}.live-hotel-status{display:inline-flex;align-items:center;gap:7px;font-weight:850;color:var(--muted);font-size:12px}.live-hotel-dot{width:9px;height:9px;border-radius:50%;background:#aab4c0}.live-hotel-status.ok{color:#17755d}.live-hotel-status.ok .live-hotel-dot{background:#17755d}.live-hotel-status.err{color:var(--mag)}.live-hotel-status.err .live-hotel-dot{background:var(--mag)}.live-hotel-refresh{border:1px solid var(--line);background:#fff;color:var(--navy);border-radius:9px;padding:8px 10px;font-weight:900;cursor:pointer}@media(max-width:700px){.livebar-hotel{align-items:flex-start;flex-direction:column}}';document.head.appendChild(s)}
function liveBar(id,title,source,buttonId){const d=document.createElement('div');d.className='livebar-hotel';d.innerHTML='<div><strong>'+title+'</strong><small>'+source+'</small></div><div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap"><span class="live-hotel-status" id="'+id+'"><span class="live-hotel-dot"></span><span data-live-text>Marktdaten werden geladen …</span></span><button type="button" class="live-hotel-refresh" id="'+buttonId+'">Aktualisieren</button></div>';return d}
function injectLiveUI(){installStyles();const vow=$('v_vowPrice')?.closest('.tech'),travel=$('t_usdtEur')?.closest('.tech');if(vow&&!$('hotelVowLive'))vow.insertBefore(liveBar('hotelVowLive','VOW-Live-Referenz','VOW/USDT-Pool auf BNB Chain','hotelVowRefresh'),vow.querySelector('.field'));if(travel&&!$('hotelTravelLive'))travel.insertBefore(liveBar('hotelTravelLive','VTravel Live-Marktdaten','v$ DEX-Marktpreis · USDT-Marktpreis · USD/EUR-Referenzkurs','hotelTravelRefresh'),travel.querySelector('.field'))}
function setLiveStatus(id,kind,text){const s=$(id);if(!s)return;s.className='live-hotel-status '+(kind||'');const t=s.querySelector('[data-live-text]');if(t)t.textContent=text}
async function fetchJson(url,timeout=12000){const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);try{const headers={accept:'application/json'};if(url.includes('geckoterminal.com'))headers.accept='application/json;version=20230203';const r=await fetch(url,{cache:'no-store',headers,signal:c.signal});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(timer)}}
const VOWPOOL='https://api.geckoterminal.com/api/v2/networks/bsc/pools/0xC6585bc17b53792f281a9739579DD60535c1F9FB';
const VPOOL='https://api.geckoterminal.com/api/v2/networks/bsc/pools/0x4cE91C45c140486A3a9d52b16015DD58254115B9';
const USDT_TOKEN='https://api.geckoterminal.com/api/v2/networks/bsc/tokens/0x55d398326f99059ff775485246999027b3197955';
const FX_URL='https://api.frankfurter.dev/v2/rate/usd/eur';
function vowPriceFromPool(a){const name=(a?.name||'').toLowerCase().replace(/\s+/g,'');if(name.startsWith('vow/'))return +a.base_token_price_usd;if(name.includes('/vow'))return +a.quote_token_price_usd;const bp=+a?.base_token_price_usd,qp=+a?.quote_token_price_usd;if(bp>0&&bp<1)return bp;if(qp>0&&qp<1)return qp;return NaN}
function vPriceFromPool(a){const name=(a?.name||'').toLowerCase().replace(/\s+/g,'');if(name.startsWith('usdc/v$'))return +a.quote_token_price_usd;if(name.startsWith('v$/usdc'))return +a.base_token_price_usd;const bp=+a?.base_token_price_usd,qp=+a?.quote_token_price_usd;if(bp>0&&bp<.95)return bp;if(qp>0&&qp<.95)return qp;return NaN}
function clock(){return new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(new Date())}
async function loadVowLive(){setLiveStatus('hotelVowLive','','VOW-Kurs wird geladen …');try{const d=await fetchJson(VOWPOOL),a=d?.data?.attributes,p=vowPriceFromPool(a);if(!(p>0))throw new Error('Kein Kurs');const e=$('v_vowPrice');e.value=p.toFixed(8);fire(e);recalcAll();setLiveStatus('hotelVowLive','ok','Live · 1 VOW ≈ $'+num(p,6)+' · '+clock())}catch(err){console.warn('VOW live rate',err);setLiveStatus('hotelVowLive','err','Live-Abruf nicht möglich · manueller Kurs bleibt nutzbar')}}
async function loadTravelLive(){setLiveStatus('hotelTravelLive','','VTravel-Kurse werden geladen …');try{const [vd,ud,fd]=await Promise.all([fetchJson(VPOOL),fetchJson(USDT_TOKEN),fetchJson(FX_URL)]);const va=vd?.data?.attributes,ua=ud?.data?.attributes,vUsd=vPriceFromPool(va),usdtUsd=+ua?.price_usd,fx=+fd?.rate;if(!(vUsd>0&&usdtUsd>0&&fx>0))throw new Error('Unvollständige Kurse');const usdtEur=usdtUsd*fx,vUsdt=vUsd/usdtUsd;const a=$('t_usdtEur'),b=$('t_vUsdt'),c=$('t_usdEur');a.value=usdtEur.toFixed(6);b.value=vUsdt.toFixed(6);c.value=fx.toFixed(6);[a,b,c].forEach(fire);recalcAll();setLiveStatus('hotelTravelLive','ok','Live · 1 v$ ≈ '+num(vUsdt,6)+' USDT · 1 USDT ≈ '+num(usdtEur,4)+' € · '+clock())}catch(err){console.warn('VTravel live rates',err);setLiveStatus('hotelTravelLive','err','Live-Abruf nicht möglich · sichtbare Kurse bleiben manuell editierbar')}}

let pdfBusy=false;
function keepPdfEnabled(){const b=$('createFinalPdf'),status=$('engineStatus');if(!b)return;const enable=()=>{if(pdfBusy)return;if(b.disabled)b.disabled=false;b.removeAttribute('disabled');b.textContent='Persönliche Rechen-PDF erstellen';if(status){status.textContent='PDF-Engine bereit';status.className='engineStatus ready'}};enable();new MutationObserver(enable).observe(b,{attributes:true,attributeFilter:['disabled']});setTimeout(enable,500);setTimeout(enable,2000)}
async function createPdf(e){e.preventDefault();e.stopImmediatePropagation();if(pdfBusy)return;const b=$('createFinalPdf');const name=($('hotelNameFinal')?.value||'').trim(),person=($('contactNameFinal')?.value||'').trim(),role=($('contactRoleFinal')?.value||'').trim();if(!name||!person||!role){setState('error','<strong>Bitte Hotelname, Ansprechpartner und Funktion vervollständigen.</strong>');return}if(!window.HotelEntscheidungPdf?.build){setState('error','<strong>Die Rechen-PDF-Engine ist nicht geladen.</strong><div class="hint">Bitte die Seite einmal vollständig neu laden.</div>');return}if(!window.FSAPdfNamedPreview?.prepare){setState('error','<strong>Die benannte PDF-Vorschau ist nicht verfügbar.</strong><div class="hint">Bitte die Seite einmal vollständig neu laden.</div>');return}const old=b.textContent;pdfBusy=true;b.disabled=true;b.textContent='PDF wird erstellt …';setState('','<strong>Ihre Rechen- und Entscheidungsunterlage wird erstellt.</strong>');try{recalcAll();const r=window.HotelEntscheidungPdf.build(document);if(!(r?.u8 instanceof Uint8Array)||r.u8.length<64)throw new Error('PDF bytes fehlen');const sig=new TextDecoder('latin1').decode(r.u8.slice(0,5));if(sig!=='%PDF-')throw new Error('Ungültiger PDF-Header');const blob=new Blob([r.u8],{type:'application/pdf'});const prepared=await window.FSAPdfNamedPreview.prepare({blob,filename:r.filename});setState('success','<strong>Ihre Rechen- und Entscheidungsunterlage ist fertig.</strong><div class="filename">'+prepared.filename+'</div><a class="openPdf" href="'+prepared.url+'" target="_blank" rel="noopener">PDF ansehen / speichern</a>')}catch(err){console.error('Hotel Rechen-PDF',err);setState('error','<strong>Die Rechen-PDF konnte nicht erstellt werden.</strong><div class="hint">'+String(err?.message||err)+'</div>')}finally{pdfBusy=false;b.disabled=false;b.textContent=old||'Persönliche Rechen-PDF erstellen'}}

function installPdfHandler(){const b=$('createFinalPdf');if(!b)return;keepPdfEnabled();b.addEventListener('click',createPdf,true)}
function audit(){const required=['flowPrev','flowNext','resetSuite','hotelNameFinal','h_booking','b_otaRevenue','d_totalRevenue','v_vowPrice','t_usdtEur','createFinalPdf','finalState'];const missing=required.filter(id=>!$(id));const result={ok:missing.length===0,missing,pdfEngine:!!window.HotelEntscheidungPdf?.build,namedPreview:!!window.FSAPdfNamedPreview?.prepare,liveRates:true,checkedAt:new Date().toISOString()};window.__HOTEL_ZAHLEN_DIAGNOSTIC__=result;if(missing.length)console.error('Hotel-Zahlen Funktionsprüfung: fehlende Elemente',missing);else console.info('Hotel-Zahlen Funktionsprüfung: Grundfunktionen vorhanden',result)}
function init(){installFlow();injectLiveUI();installPdfHandler();$('hotelVowRefresh')?.addEventListener('click',loadVowLive);$('hotelTravelRefresh')?.addEventListener('click',loadTravelLive);audit();loadVowLive();loadTravelLive()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();