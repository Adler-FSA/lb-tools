(function(){
'use strict';
const $=id=>document.getElementById(id);
const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
const STORAGE='lbHotelGesamtausgabeV2';
const steps=$$('.flowStep');
const panels=$$('.flowPanel');
let current=0;

const euro=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0);
const num=v=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(Number(v)||0);
const pct=v=>num(v)+' %';
const val=id=>{const e=$(id);if(!e)return 0;const s=String(e.value||'').trim().replace(/\s/g,'');if(s.includes(',')&&s.includes('.'))return Number(s.replace(/\./g,'').replace(',','.'))||0;if(s.includes(','))return Number(s.replace(',','.'))||0;return Number(s)||0};
const esc=s=>String(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

function showStep(i,scroll=true){
  current=Math.max(0,Math.min(panels.length-1,i));
  panels.forEach((p,n)=>p.classList.toggle('active',n===current));
  steps.forEach((b,n)=>{b.classList.toggle('active',n===current);b.setAttribute('aria-current',n===current?'step':'false')});
  $('flowPrev').disabled=current===0;
  $('flowNext').style.display=current===panels.length-1?'none':'inline-flex';
  $('flowPrev').style.visibility=current===0?'hidden':'visible';
  $('progressText').textContent=`Schritt ${current+1} von ${panels.length}`;
  $('progressBar').style.width=((current+1)/panels.length*100)+'%';
  if(current===panels.length-1) renderSummary();
  if(scroll) $('flowShell').scrollIntoView({behavior:'smooth',block:'start'});
}
steps.forEach((b,i)=>b.addEventListener('click',()=>showStep(i)));
$('flowPrev').addEventListener('click',()=>showStep(current-1));
$('flowNext').addEventListener('click',()=>showStep(current+1));

function stateObject(){
  const o={};
  $$('[data-store]').forEach(e=>{o[e.id]=e.type==='checkbox'?e.checked:e.value});
  return o;
}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(stateObject()))}catch(e){}}
function load(){
  try{const o=JSON.parse(localStorage.getItem(STORAGE)||'{}');Object.entries(o).forEach(([id,v])=>{const e=$(id);if(!e)return;if(e.type==='checkbox')e.checked=!!v;else e.value=v})}catch(e){}
  if(!$('meetingDateFinal').value)$('meetingDateFinal').value=new Date().toISOString().slice(0,10);
}
$$('[data-store]').forEach(e=>{e.addEventListener('input',()=>{recalc();save()});e.addEventListener('change',()=>{recalc();save()})});

function recalcHotel(){
  const booking=val('h_booking'),vp=val('h_voucherPct')/100,rp=val('h_reservePct')/100,op=val('h_otaPct')/100;
  const voucher=booking*vp,reserve=voucher*rp,ota=booking*op,liq=Math.max(0,booking-reserve);
  $('h_outBooking').textContent=euro(booking);$('h_outVoucher').textContent=euro(voucher);$('h_outReserve').textContent=euro(reserve);$('h_outOta').textContent=euro(ota);$('h_outLiquidity').textContent=euro(liq);
  const price=val('h_offerPrice'),cost=val('h_offerCost'),use=Math.min(val('h_offerVoucher'),price),pay=Math.max(0,price-use),remain=pay-cost;
  $('h_offerPayOut').textContent=euro(pay);$('h_offerBenefitOut').textContent=euro(use);$('h_offerRemainOut').textContent=euro(remain);
  let sales=0,vouchers=0,cash=0,margin=0;
  $$('.serviceRow').forEach(r=>{const p=Number(r.querySelector('[data-s-price]').value)||0,c=Number(r.querySelector('[data-s-cost]').value)||0,v=Math.min(Number(r.querySelector('[data-s-voucher]').value)||0,p),py=Math.max(0,p-v),m=py-c;sales+=p;vouchers+=v;cash+=py;margin+=m;r.querySelector('[data-s-pay]').textContent=euro(py);r.querySelector('[data-s-margin]').textContent=euro(m)});
  $('h_servicesSales').textContent=euro(sales);$('h_servicesVoucher').textContent=euro(vouchers);$('h_servicesCash').textContent=euro(cash);$('h_servicesMargin').textContent=euro(margin);
}
function recalcBusiness(){
  const rev=val('b_otaRevenue'),ota=val('b_otaPct')/100,avg=val('b_avgBooking'),shift=val('b_shiftPct')/100,plan=Number($('b_plan').value)||499;
  const otaMonth=rev*ota,commission=avg*ota,shiftCost=rev*shift*ota;
  $('b_otaMonthOut').textContent=euro(otaMonth);$('b_otaYearOut').textContent=euro(otaMonth*12);$('b_planMonthOut').textContent=euro(plan);$('b_firstYearOut').textContent=euro(plan*13);$('b_commissionOut').textContent=euro(commission);$('b_equivOut').textContent=commission>0?num(plan/commission)+' Buchungen':'—';$('b_shiftOut').textContent=euro(shiftCost);
}
function recalcDirect(){
  const total=val('d_totalRevenue');
  const now=[val('d_bookNow'),val('d_otaNow'),val('d_directNow'),val('d_otherNow')],tar=[val('d_bookTarget'),val('d_otaTarget'),val('d_directTarget'),val('d_otherTarget')],cost=[val('d_bookCost'),val('d_otaCost'),val('d_directCost'),val('d_otherCost')].map(x=>x/100);
  const sn=now.reduce((a,b)=>a+b,0),st=tar.reduce((a,b)=>a+b,0);
  $('d_sumNow').textContent=pct(sn);$('d_sumTarget').textContent=pct(st);$('d_mixHint').className='mixHint '+(Math.abs(sn-100)<.01&&Math.abs(st-100)<.01?'ok':'bad');
  const cNow=now.reduce((s,x,i)=>s+total*(x/100)*cost[i],0),cTar=tar.reduce((s,x,i)=>s+total*(x/100)*cost[i],0),delta=cNow-cTar;
  $('d_costNowOut').textContent=euro(cNow);$('d_costTargetOut').textContent=euro(cTar);$('d_deltaOut').textContent=euro(delta*12);$('d_directNowOut').textContent=pct(now[2]);$('d_directTargetOut').textContent=pct(tar[2]);
  const guest=val('d_guestAccesses'),pr=val('d_partnerRate')/100,e2r=val('d_e2Rate')/100,e2a=val('d_e2Avg'),e3r=val('d_e3Rate')/100,e3a=val('d_e3Avg');
  const e1=Math.round(guest*pr),e2=Math.round(e1*e2r*e2a),e3=Math.round(e2*e3r*e3a);const i1=e1*99*.20,i2=e2*99*.15,i3=e3*99*.10,logic=i1+i2+i3;
  $('d_e1Out').textContent=`${num(e1)} · ${euro(i1)}`;$('d_e2Out').textContent=`${num(e2)} · ${euro(i2)}`;$('d_e3Out').textContent=`${num(e3)} · ${euro(i3)}`;$('d_logicOut').textContent=euro(logic);
  const offer=val('d_offerValue'),benefitPct=val('d_benefitPct')/100,benefit=offer*benefitPct,bookings=val('d_marketBookings'),dc=offer*(val('d_directCostPct')/100),pay=Math.max(0,offer-benefit),remain=pay-dc,market=remain*bookings;
  $('d_guestBenefitOut').textContent=euro(benefit);$('d_guestNetOut').textContent=euro(benefit-99);$('d_marketRemainOut').textContent=euro(remain);$('d_marketYearOut').textContent=euro(market);$('d_totalLeverOut').textContent=euro(delta*12+logic+market);
}
function recalcTech(){
  const amount=val('v_voucherAmount'),alloc=val('v_allocation')/100,removed=Math.min(val('v_removed'),amount),vow=val('v_vowPrice');
  const reserveUsd=amount*alloc,reserveVow=vow>0?reserveUsd/vow:0,remain=Math.max(0,amount-removed);
  $('v_reserveUsdOut').textContent=euro(reserveUsd);$('v_reserveVowOut').textContent=vow>0?num(reserveVow)+' VOW':'Live-/Marktpreis erforderlich';$('v_remainingOut').textContent=num(remain)+' v$';
  const eur=val('t_eurInput'),usdtEur=val('t_usdtEur'),vUsdt=val('t_vUsdt'),usdEur=val('t_usdEur');
  const usdt=usdtEur>0?eur/usdtEur:0,v= vUsdt>0?usdt/vUsdt:0,useUsd=v, useEur=usdEur>0?useUsd*usdEur:0;
  $('t_usdtOut').textContent=usdtEur>0?num(usdt)+' USDT':'Kurs erforderlich';$('t_vOut').textContent=vUsdt>0?num(v)+' v$':'Kurs erforderlich';$('t_useOut').textContent=(vUsdt>0&&usdEur>0)?euro(useEur):'Kurse erforderlich';$('t_multipleOut').textContent=(eur>0&&useEur>0)?num(useEur/eur)+'×':'—';
}
function recalc(){recalcHotel();recalcBusiness();recalcDirect();recalcTech();if(current===panels.length-1)renderSummary()}

function renderSummary(){
  const hotel=$('hotelNameFinal').value.trim()||'Ihr Hotel';
  $('sumHotelName').textContent=hotel;
  $('sumBooking').textContent=euro(val('h_booking'));
  $('sumVoucher').textContent=euro(val('h_booking')*val('h_voucherPct')/100);
  $('sumBB').textContent=euro(Number($('b_plan').value)||499)+' / Monat';
  $('sumDirect').textContent=pct(val('d_directNow'))+' → '+pct(val('d_directTarget'));
  $('sumLogic').textContent=$('d_logicOut').textContent;
  $('sumMarket').textContent=$('d_marketYearOut').textContent;
  $('sumVoucherTech').textContent=$('v_reserveUsdOut').textContent;
  $('sumVTravel').textContent=$('t_useOut').textContent;
}

function frameDoc(id){try{return $(id)?.contentDocument||null}catch(e){return null}}
function setValue(doc,id,value){const e=doc?.getElementById(id);if(!e)return;e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}
function syncServices(doc){const rows=$$('.serviceRow');const targets=$$('[data-service]',doc);rows.forEach((r,i)=>{const t=targets[i];if(!t)return;const map=[['[data-s-price]','[data-price]'],['[data-s-cost]','[data-cost]'],['[data-s-voucher]','[data-voucher]']];map.forEach(([a,b])=>{const src=r.querySelector(a),dst=t.querySelector(b);if(dst&&src){dst.value=src.value;dst.dispatchEvent(new Event('input',{bubbles:true}));dst.dispatchEvent(new Event('change',{bubbles:true}))}})})}
function syncHotel(){const d=frameDoc('hotelMainFrame');if(!d)return;setValue(d,'hotelName',$('hotelNameFinal').value);[['booking','h_booking'],['voucherPct','h_voucherPct'],['reservePct','h_reservePct'],['otaPct','h_otaPct'],['offerPrice','h_offerPrice'],['offerCost','h_offerCost'],['offerVoucher','h_offerVoucher']].forEach(([to,from])=>setValue(d,to,$(from).value));syncServices(d)}
function syncBusiness(){const d=frameDoc('businessFrame');if(!d)return;[['otaRevenue','b_otaRevenue'],['otaPct','b_otaPct'],['avgBooking','b_avgBooking'],['shiftPct','b_shiftPct']].forEach(([to,from])=>setValue(d,to,$(from).value));const plan=$('b_plan').value;const btn=d.querySelector(`.planBtn[data-plan="${plan}"]`);if(btn)btn.click()}
function syncDirect(){const d=frameDoc('thirdFrame');if(!d)return;const map={totalRevenue:'d_totalRevenue',bookNow:'d_bookNow',otaNow:'d_otaNow',directNow:'d_directNow',otherNow:'d_otherNow',bookTarget:'d_bookTarget',otaTarget:'d_otaTarget',directTarget:'d_directTarget',otherTarget:'d_otherTarget',bookCost:'d_bookCost',otaCost:'d_otaCost',directCost:'d_directCost',otherCost:'d_otherCost',guestAccesses:'d_guestAccesses',partnerRate:'d_partnerRate',e2Rate:'d_e2Rate',e2Avg:'d_e2Avg',e3Rate:'d_e3Rate',e3Avg:'d_e3Avg',offerValue:'d_offerValue',benefitPct:'d_benefitPct',marketBookings:'d_marketBookings',directCostPct:'d_directCostPct'};Object.entries(map).forEach(([to,from])=>setValue(d,to,$(from).value))}
function syncVoucher(){const d=frameDoc('voucherFrame');if(!d)return;[['voucherAmount','v_voucherAmount'],['allocation','v_allocation'],['removed','v_removed'],['vowPrice','v_vowPrice']].forEach(([to,from])=>setValue(d,to,$(from).value))}
function syncTravel(){const d=frameDoc('vtravelFrame');if(!d)return;[['eurInput','t_eurInput'],['usdtEur','t_usdtEur'],['vUsdt','t_vUsdt'],['usdEur','t_usdEur']].forEach(([to,from])=>{if($(from).value!=='')setValue(d,to,$(from).value)})}
function syncAll(){syncHotel();syncBusiness();syncDirect();syncVoucher();syncTravel()}

const frameIds=['hotelMainFrame','businessFrame','thirdFrame','voucherFrame','vtravelFrame','hotelPdfFrame'];
const loaded=new Set();
frameIds.forEach(id=>{const f=$(id);if(!f)return;f.addEventListener('load',()=>{loaded.add(id);syncAll();updateEngineStatus()})});
function updateEngineStatus(){const ready=frameIds.every(id=>loaded.has(id));$('engineStatus').textContent=ready?'PDF-Engine bereit':'PDF-Engine wird vorbereitet …';$('engineStatus').className='engineStatus '+(ready?'ready':'')}

function finalState(kind,html){const s=$('finalState');s.className='state show '+(kind||'');s.innerHTML=html}
$('createFinalPdf').addEventListener('click',async()=>{
  const name=$('hotelNameFinal').value.trim(),person=$('contactNameFinal').value.trim(),role=$('contactRoleFinal').value.trim();
  if(!name||!person||!role){showStep(0);finalState('error','<strong>Bitte vervollständigen Sie zuerst Hotelname, Ansprechpartner und Funktion.</strong>');return}
  const b=$('createFinalPdf'),old=b.textContent;b.disabled=true;b.textContent='Gesamtausgabe wird erstellt …';
  finalState('','<strong>Die persönliche Gesamtausgabe wird erstellt.</strong><div class="hint">Alle Bereiche werden mit den eingetragenen Werten zusammengeführt.</div>');
  try{
    syncAll();await new Promise(r=>setTimeout(r,350));
    if(!window.HotelFinalGesamtausgabePdf?.build)throw new Error('Die PDF-Engine ist noch nicht vollständig geladen.');
    const r=await window.HotelFinalGesamtausgabePdf.build(document);const blob=new Blob([r.u8],{type:'application/pdf'});
    if(!window.FSAPdfNamedPreview?.prepare)throw new Error('Die benannte PDF-Vorschau ist nicht verfügbar.');
    const prepared=await window.FSAPdfNamedPreview.prepare({blob,filename:r.filename});
    finalState('success','<strong>Ihre persönliche Gesamtausgabe ist fertig.</strong><div class="filename">'+esc(r.filename)+'</div><a class="openPdf" href="'+prepared.url+'" target="_blank" rel="noopener">PDF ansehen / speichern</a><div class="hint">Die PDF wird mit dem oben gezeigten Dateinamen an die Vorschau und an „In Dateien sichern“ übergeben.</div>');
  }catch(e){console.error(e);finalState('error','<strong>Die Gesamtausgabe konnte nicht erstellt werden.</strong><div class="hint">'+esc(e?.message||e)+'</div>')}
  finally{b.disabled=false;b.textContent=old}
});

$('resetSuite').addEventListener('click',()=>{if(!confirm('Alle Eingaben dieser Hotel-Auswertung zurücksetzen?'))return;try{localStorage.removeItem(STORAGE)}catch(e){}location.reload()});
load();recalc();showStep(0,false);updateEngineStatus();
})();