
/**
 * Demo-only showcase prefill for the iframe presentation.
 * It never writes to storage. Actual demo records live in demo-project.js.
 */
const txt=v=>String(v??'');
function byName(doc,name){return [...doc.querySelectorAll('[name="'+CSS.escape(name)+'"]')];}
function setEl(el,value,{force=true,change=false}={}){
  if(!el)return;
  if(el.type==='checkbox'){el.checked=!!value;}
  else if(el.tagName==='SELECT'){
    const wanted=txt(value), option=[...el.options].find(o=>o.value===wanted);
    if(option)el.value=wanted;
    else if(!el.value&&el.options.length)el.selectedIndex=Math.max(0,[...el.options].findIndex(o=>o.value));
  }else if(force||!el.value)el.value=txt(value);
  if(change){el.dispatchEvent(new Event('change',{bubbles:true}));}
}
function setName(doc,name,value,options){for(const el of byName(doc,name))setEl(el,value,options);}
function setSelector(doc,selector,value,options){setEl(doc.querySelector(selector),value,options);}
function fillForm(form,values){
  if(!form)return;
  for(const [name,value] of Object.entries(values)){
    const els=[...form.querySelectorAll('[name="'+CSS.escape(name)+'"]')];
    els.forEach(el=>setEl(el,value));
  }
}
function markForm(form,label='Ausgefülltes Demo-Beispiel'){
  if(!form||form.dataset.demoShowcaseMarked)return;
  form.dataset.demoShowcaseMarked='1';
  const note=form.ownerDocument.createElement('div');
  note.className='notice';
  note.dataset.demoShowcaseNote='1';
  note.style.marginBottom='12px';
  note.innerHTML='<strong>'+label+'</strong><br><span>Alle angezeigten Werte sind fiktiv und gehören ausschließlich zum Demo-Haus.</span>';
  form.prepend(note);
}
function replaceFileInput(doc){
  const input=doc.querySelector('[data-backup-file]');
  if(!input||input.dataset.demoReplaced)return;
  input.dataset.demoReplaced='1';input.style.display='none';
  const fake=doc.createElement('div');fake.className='doc-field';fake.style.marginTop='8px';
  fake.innerHTML='<span>Demo-Sicherungsdatei</span><strong>Nebenkosten_Premium_Demo-Haus-Lindenblick_2025.json</strong>';
  input.insertAdjacentElement('afterend',fake);
}
function hideNotApplicable(form,title,copy){
  if(!form||form.dataset.demoNotApplicable)return;
  form.dataset.demoNotApplicable='1';
  form.style.display='none';
  const n=form.ownerDocument.createElement('div');n.className='notice';n.dataset.demoNotApplicableNote='1';
  n.innerHTML='<strong>'+title+'</strong><br>'+copy;
  form.insertAdjacentElement('beforebegin',n);
}

function propertyData(project){
  const p=project?.properties?.find(x=>x.id==='demo_house')||project?.properties?.[0];
  const a=p?.address||{};
  return {p,a};
}
export function applyDemoShowcase(doc,page,project){
  if(!doc||!project?.demoMetadata?.fictional)return;
  const {p,a}=propertyData(project);
  doc.body?.classList.add('demo-showcase-view');

  if(page==='immobilien.html'){
    const pf=doc.querySelector('[data-property-form]');
    fillForm(pf,{label:p?.label||'Demo-Haus Lindenblick',workspaceMode:'mixed',buildingType:'multi_family',street:a.street||'Beispielweg',houseNumber:a.houseNumber||'12',postalCode:a.postalCode||'64295',city:a.city||'Darmstadt'});
    markForm(pf);
    const uf=doc.querySelector('[data-unit-form]');
    fillForm(uf,{unitLabel:'1. OG links · Wohnung A',floor:'1. OG links',areaM2:'75',usageKind:'tenant',usageStart:'2024-01-01',tenantName:'Familie Berger · fiktiv'});
    setName(doc,'usageKind','tenant',{change:true});markForm(uf);
    const af=doc.querySelector('[data-area-history-form]');
    fillForm(af,{areaHistoryUnit:'demo_rent_b',areaEffectiveFrom:'2024-01-01',areaNewM2:'65'});markForm(af,'Gespeichertes Historienbeispiel');
    const hf=doc.querySelector('[data-usage-history-form]');
    fillForm(hf,{usageHistoryUnit:'demo_rent_b',usageEffectiveFrom:'2025-07-01',usageHistoryKind:'tenant',usageHistoryTenantName:'Nina Vogel · fiktiv'});
    setName(doc,'usageHistoryKind','tenant',{change:true});markForm(hf,'Gespeicherter Nutzerwechsel 2025');
    return;
  }

  if(page==='kosten.html'){
    const sf=doc.querySelector('[data-supply-form]');
    fillForm(sf,{supplyProviderLabel:'Stadtwerke Musterstadt · fiktiv',supplyAccountId:'demo_water_provider_2025',supplyService:'water',supplyHolder:'owner',supplyIncludePrice:true,supplyValidFrom:'2025-01-01',supplyValidTo:'2025-12-31',supplyReference:'DEMO-TARIF-WASSER-2025',supplyBaseEuro:'0.00',supplyPlannedUnits:'167',supplyWorkPrice:'574.8503',supplyUnit:'m3'});
    markForm(sf,'Vollständig ausgefüllter Versorgervertrag 2025');
    const price=doc.querySelector('[data-price-version-form]');
    hideNotApplicable(price,'Tarifstand 2025 vollständig dokumentiert','Für den bestätigten Wasservertrag liegt im Demo-Modell bereits ein vollständiger Preisstand für 2025 vor.');
    const ef=doc.querySelector('[data-expense-form]');
    fillForm(ef,{category:'cold_water',classification:'allocatable',amountEuro:'960.00',invoiceReference:'DEMO-2025-DEMO_WATER_2025',expenseSupplyRecord:'demo_supply_water_2025',expenseStart:'2025-01-01',expenseEnd:'2025-12-31',note:'Jahresrechnung Kaltwasser 2025 · fiktiver Beleg'});
    markForm(ef,'Originalkosten-Beispiel aus dem Demo-Jahr 2025');
    const pf=doc.querySelector('[data-provider-form]');
    fillForm(pf,{paymentSupplyRecord:'demo_supply_water_2025',providerLabel:'Stadtwerke Musterstadt · fiktiv',paymentKind:'provider_payment',paymentEuro:'960.00',paymentDate:'2025-12-20'});
    markForm(pf,'Zahlungsbeispiel aus dem Demo-Jahr 2025');
    return;
  }

  if(page==='verbrauch.html'){
    const mf=doc.querySelector('[data-meter-form]');
    fillForm(mf,{meterUnit:'demo_rent_b',meterService:'cold_water',meterLabel:'Kaltwasser Wohnung B',installedAt:'2023-01-01'});markForm(mf,'Gespeicherter Zähler aus dem Demo-Haus');
    const rf=doc.querySelector('[data-reading-form]');
    fillForm(rf,{readingMeter:'demo_water_b',readingDate:'2025-07-01',readingValue:'85'});markForm(rf,'Gespeicherte Zwischenablesung beim Mieterwechsel');
    const wf=doc.querySelector('[data-meter-replace-form]');
    fillForm(wf,{replaceOldMeter:'demo_water_b',swapDate:'2026-10-01',oldFinalValue:'116',newInitialValue:'0',replaceNewLabel:'Kaltwasser Wohnung B · Ersatz Z-2026-02'});
    markForm(wf,'Vollständig ausgefülltes Beispiel für einen späteren Zählerwechsel');
    return;
  }

  if(page==='abrechnung-vermieter.html'){
    const payment=doc.querySelector('[data-payment-form]');
    fillForm(payment,{paymentTenancy:'demo_lease_berger',entryType:'payment',paymentPurpose:'operating_cost_advance',paymentEuro:'220.00',paymentDate:'2025-12-15'});
    markForm(payment,'Ausgefülltes Zahlungsbeispiel');
    hideNotApplicable(doc.querySelector('[data-thermal-form]'),'Wärme-Sonderpfad im Demo-Jahr nicht erforderlich','Das Referenzjahr 2025 enthält bewusst keine Heiz- oder Warmwasserkosten. Deshalb werden hier keine fachlichen Wärmedaten erfunden.');
    hideNotApplicable(doc.querySelector('[data-linked-form]'),'Verbundene Heiz-/Warmwasseranlage nicht Teil dieses Musterfalls','Der Demo-Referenzfall arbeitet nur mit den Kostenarten, die tatsächlich im Modell vorhanden sind.');
    hideNotApplicable(doc.querySelector('[data-co2-form]'),'CO₂-Sonderpfad im Demo-Jahr nicht erforderlich','Im Demo-Modell 2025 ist keine CO₂-Kostenposition hinterlegt. Der Spezialpfad bleibt daher bewusst nicht anwendbar.');
    return;
  }

  if(page==='mietservice.html'){
    const lease=doc.querySelector('[data-doc-form="lease_draft"]');
    fillForm(lease,{tenancyId:'demo_lease_berger',tenantLabel:'Familie Berger · fiktiv',startDate:'2024-01-01',baseRentCents:'980.00',operatingCostsModel:'advance',operatingCostCents:'220.00',depositCents:'2940.00',notes:'Kellerraum A1 und Stellplatz 2 sind der Wohnung zugeordnet.'});markForm(lease);
    const rules=doc.querySelector('[data-doc-form="house_rules"]');
    fillForm(rules,{ruleKind:'contractual',rules:'Ruhezeiten, Gemeinschaftsflächen, Treppenhaus, Fahrräder, Waschküche und Müllplätze sind im Demo-Haus bereits geregelt.'});markForm(rules);
    const waste=doc.querySelector('[data-doc-form="waste_info"]');
    fillForm(waste,{locations:'Restmüll und Bio im Hof; Papier an der Einfahrt.',sorting:'Verpackungen getrennt sammeln; Glas zu den öffentlichen Sammelcontainern.',schedule:'Bereitstellung gemäß fiktivem Abfuhrkalender jeweils am Vorabend.',localDataConfirmed:true});markForm(waste);
    const hand=doc.querySelector('[data-doc-form="handover_protocol"]');
    fillForm(hand,{tenancyId:'demo_lease_vogel',kind:'move_in',date:'2025-07-01',keys:'2 Haustürschlüssel, 2 Wohnungsschlüssel, 1 Briefkastenschlüssel',meters:'Kaltwasser Wohnung B: 85 m³',defects:'Kleine Gebrauchsspur an der Wohnzimmertür; fotografisch dokumentiert.'});markForm(hand);
    const service=doc.querySelector('[data-doc-form="tenant_service_sheet"]');
    fillForm(service,{tenancyId:'demo_lease_vogel',purpose:'Einzug und erste Orientierung',subject:'Willkommen im Demo-Haus Lindenblick',message:'Ansprechpartner, Müllplätze, Zähler und gemeinschaftlich genutzte Flächen auf einen Blick.',requestedInfo:'Änderungen an Kontaktdaten bitte mitteilen.',deadline:'2025-07-15'});markForm(service);
    return;
  }

  if(page==='vermietungscheck.html'){
    const input=doc.querySelector('input[placeholder="referencePlaceholder"], input[type="text"], input:not([type])');
    if(input&&!input.value)input.value='Sommer 2025 · Vorgang ohne Personendaten';
    return;
  }

  if(page==='einstellungen.html'){
    replaceFileInput(doc);
    return;
  }
}
