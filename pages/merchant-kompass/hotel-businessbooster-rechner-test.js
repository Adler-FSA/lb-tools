/* BusinessBooster: zusätzlicher Gesprächsrechner NUR für die Inhalts-Testseite.
 * Ursprüngliche Business-Seite, Hotel-Master, Fullservice-Texte und Bilder bleiben erhalten.
 * Drei unabhängige Betrachtungen: OTA-Budget, Mitgliedschaften, Buchungsvolumen.
 */
(()=>{'use strict';
function init(){
  const example=document.getElementById('bb-rechenbeispiel');
  const first=document.getElementById('otaRevenue');
  if(!example||!first||document.getElementById('bbScenarioForm'))return;
  const style=document.createElement('style');
  style.textContent=`
   .bbScenarioForm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:18px 0}
   .bbScenarioField{display:block;border:1px solid #dbe5e9;border-radius:13px;padding:12px;background:#fff;font-size:13px;font-weight:800;color:#132238}
   .bbScenarioField input{display:block;width:100%;margin-top:7px;border:1.5px solid #ccd8de;border-radius:9px;padding:10px;color:#132238;font:inherit;background:#fff}
   .bbScenarioField small{display:block;color:#667587;font-weight:400;margin-top:5px}
   .bbScenarioHeading{margin:21px 0 7px;font-size:19px;color:#132238}
   .bbScenarioResult{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin:13px 0}
   .bbScenarioResult>div{border:1px solid #dbe5e9;border-radius:13px;padding:16px;background:#eaf9f9;min-width:0}
   .bbScenarioResult>div:nth-child(even){background:#fff1f7}
   .bbScenarioResult span{display:block;font-size:13px;color:#455669}
   .bbScenarioResult strong{display:block;font-size:clamp(19px,3vw,29px);overflow-wrap:anywhere;line-height:1.2;margin:6px 0;color:#132238}
   .bbScenarioResult small{display:block;font-size:12px;color:#536778}
   .bbScenarioNote{border-left:5px solid #00a7ad;background:#effafa;padding:13px 15px;margin:12px 0;line-height:1.5}
   .bbScenarioError{color:#9a2256;font-weight:750;margin:8px 0}
   @media(max-width:620px){.bbScenarioForm,.bbScenarioResult{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
  const title=example.querySelector('h3');if(title)title.textContent='Mit eigenen Zahlen rechnen: Gästekontakte, Empfehlungen und Buchungen';
  const intro=example.querySelector('.bbIntro');if(intro)intro.textContent='Die früher fest eingetragenen Broschürenzahlen sind jetzt veränderbare Szenarioannahmen.';
  const oldModel=example.querySelector('.bbModel');if(oldModel)oldModel.remove();
  const oldSums=example.querySelector('.bbSums');if(oldSums)oldSums.remove();
  const oldNotice=example.querySelector('.bbNotice');if(oldNotice)oldNotice.remove();
  [...example.querySelectorAll(':scope > p:not(.bbIntro):not(.bbFine)')].forEach(p=>p.remove());
  const fine=example.querySelector('.bbFine');if(fine)fine.textContent='Szenarien, keine Prognosen: Mitgliedschaften und Buchungen treten nur bei tatsächlichen Abschlüssen ein. Die Vergütung setzt eine gültige Zuordnung und die jeweils geltenden Bedingungen voraus. Bruttobuchungsumsatz ist kein Gewinn.';
  const panel=document.createElement('div');panel.id='bbScenarioForm';
  panel.innerHTML=`
   <h4 class="bbScenarioHeading">A · Gästekontakte und Mitgliedschaften</h4>
   <div class="bbScenarioForm">
    <label class="bbScenarioField" for="bbContacts">Erreichbare Gästekontakte<input id="bbContacts" type="number" min="0" max="100000000" step="1" value="10000"><small>Kontakte, die tatsächlich angesprochen werden können; keine automatische Einwilligung.</small></label>
    <label class="bbScenarioField" for="bbConversion">Anteil mit Club-Partner-Abschluss in %<input id="bbConversion" type="number" min="0" max="100" step="0.1" value="5"><small>Frei gewählte Annahme, keine prognostizierte Quote.</small></label>
    <label class="bbScenarioField" for="bbE2PerE1">Weitere Abschlüsse je E1-Partner<input id="bbE2PerE1" type="number" min="0" max="100" step="0.1" value="1"><small>Nur bei tatsächlicher Empfehlung und gültiger Zuordnung.</small></label>
   </div>
   <div class="bbScenarioResult" aria-live="polite">
     <div><span>Direkt zugeordnete Mitgliedschaften (E1)</span><strong id="bbOutE1">—</strong><small>Kontakte × angenommene Abschlussquote</small></div>
     <div><span>Rechnerische E1-Provision (20 %)</span><strong id="bbOutE1Fee">—</strong><small>Abschlüsse × 99 € × 20 %</small></div>
     <div><span>Weitere Mitgliedschaften über E1 (E2)</span><strong id="bbOutE2">—</strong><small>E1 × weitere Abschlüsse je E1</small></div>
     <div><span>Rechnerische E2-Provision (15 %)</span><strong id="bbOutE2Fee">—</strong><small>Abschlüsse × 99 € × 15 %</small></div>
     <div><span>Summe rechnerischer Provisionen E1 + E2</span><strong id="bbOutTotal">—</strong><small>Keine garantierte Budgetdeckung oder Auszahlung.</small></div>
   </div>
   <div class="bbScenarioNote">Die Vergütungsbeispiele zeigen ausschließlich mögliche Provisionen aus tatsächlich entstehenden, provisionsberechtigten Club-Partnerschaften. Sie dürfen nicht als automatischer Ertrag aus vorhandenen Hotelkontakten verstanden werden.</div>
   <h4 class="bbScenarioHeading">B · Eigenständiges Buchungsszenario</h4>
   <div class="bbScenarioForm">
    <label class="bbScenarioField" for="bbBookings">Tatsächlich angenommene zusätzliche Buchungen<input id="bbBookings" type="number" min="0" max="100000000" step="1" value="1000"><small>Unabhängige Annahme – nicht aus E1 oder E2 abgeleitet.</small></label>
    <label class="bbScenarioField" for="bbBookingValue">Durchschnittlicher Buchungswert in €<input id="bbBookingValue" type="number" min="0" max="100000000" step="1" value="1500"><small>Gesamter Buchungswert vor Kosten.</small></label>
   </div>
   <div class="bbScenarioResult"><div><span>Rechnerischer zusätzlicher Bruttobuchungsumsatz</span><strong id="bbOutRevenue">—</strong><small>Buchungen × Buchungswert; weder Gewinn noch Provision.</small></div></div>
   <p class="bbScenarioError" id="bbScenarioError" hidden>Bitte nur gültige, nichtnegative Zahlen innerhalb der Eingabegrenzen verwenden.</p>
  `;
  example.insertBefore(panel,fine||null);
  const ids=['bbContacts','bbConversion','bbE2PerE1','bbBookings','bbBookingValue'];
  const euro=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(v);
  const count=v=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:0}).format(v);
  const get=id=>document.getElementById(id);
  function calculate(){
    const values=ids.map(id=>Number(get(id).value));
    const valid=ids.every(id=>get(id).value.trim()!==''&&get(id).validity.valid)&&values.every(Number.isFinite);
    get('bbScenarioError').hidden=valid;
    if(!valid){['bbOutE1','bbOutE1Fee','bbOutE2','bbOutE2Fee','bbOutTotal','bbOutRevenue'].forEach(id=>get(id).textContent='—');window.HotelBusinessScenario=null;return;}
    const [contacts,rate,e2per,bookings,value]=values;
    const e1=Math.round(contacts*rate/100),e2=Math.round(e1*e2per),e1Fee=e1*99*.20,e2Fee=e2*99*.15,revenue=bookings*value;
    const results={bbOutE1:count(e1),bbOutE1Fee:euro(e1Fee),bbOutE2:count(e2),bbOutE2Fee:euro(e2Fee),bbOutTotal:euro(e1Fee+e2Fee),bbOutRevenue:euro(revenue)};
    Object.keys(results).forEach(id=>get(id).textContent=results[id]);
    window.HotelBusinessScenario={contacts,conversionPercent:rate,e2PerE1:e2per,bookings,bookingValue:value,e1,e2,e1Fee,e2Fee,commissionTotal:e1Fee+e2Fee,bookingRevenue:revenue};
  }
  ids.forEach(id=>{get(id).addEventListener('input',calculate);get(id).addEventListener('change',calculate)});
  calculate();
  /* Ergänzende Felder ausschließlich im vorhandenen lokalen Suite-Datensatz sichern. */
  let attempts=0;
  const connect=()=>{
    const store=window.LBHotelStorage;
    if(!store){if(++attempts<70)setTimeout(connect,100);return;}
    const previous=store.getSection('businessBooster'),seed={};
    ids.forEach(id=>{
      if(Object.prototype.hasOwnProperty.call(previous,id)&&previous[id]!==''&&previous[id]!==null&&previous[id]!==undefined)get(id).value=String(previous[id]);
      else seed[id]=get(id).value;
      const save=()=>store.updateSection('businessBooster',{[id]:get(id).value});
      get(id).addEventListener('input',save);get(id).addEventListener('change',save);
    });
    if(Object.keys(seed).length)store.updateSection('businessBooster',seed);
    calculate();
  };
  connect();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();