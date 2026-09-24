/**
 * Nebenkosten Premium — Baustein 6.5 Referenz-Demo.
 * Vollständig fiktive Personen, Adresse und Belege; rechnerisch konsistenter Produkt-Testfall.
 */
import {createEmptyProject,assertValidProject} from './model.js';
import {calculatePeriod} from './calculation.js';
import {createRentalDocumentDraft} from './rental-service.js';
import {upsertSafetyCheck} from './safety-checks.js';
import {createLettingProcess,advanceLettingPhase,setLettingItemState,LETTING_ITEMS} from './letting-check.js';

export const DEMO_PROJECT_ID='demo_lindenblick';
export const DEMO_VERSION='LINDENBLICK_V2_2025-09-24';

const standardCosts=['property_tax','building_insurance','waste','common_electricity','cold_water'];
const clone=v=>structuredClone(v);

function addExpense(project,{id,year,category,amountCents,providerAccountId,classification='allocatable'}){
  project.expenses.push({
    id,propertyId:'demo_house',category,classification,
    ...(classification==='allocatable'?{confirmedForAllocation:true}:{}),
    amountCents,startDate:`${year}-01-01`,endDate:`${year}-12-31`,
    invoiceReference:`DEMO-${year}-${id.toUpperCase()}`,
    invoiceLineId:`line_${id}`,
    ...(providerAccountId?{providerAccountId}:{})
  });
}
function addAreaRule(project,{id,expenseId,periodId,withUserChange=false}){
  project.allocationRules.push({
    id,expenseId,accountingPeriodId:periodId,method:'area',methodConfirmed:true,
    ...(withUserChange?{temporalMethod:'days',temporalConfirmed:true}:{})
  });
}
function addWaterRule(project,{id,expenseId,periodId,withUserChange=false}){
  project.allocationRules.push({
    id,expenseId,accountingPeriodId:periodId,method:'consumption',methodConfirmed:true,
    meterIdsByUnit:{
      demo_owner_unit:['demo_water_owner'],
      demo_rent_a:['demo_water_a'],
      demo_rent_b:['demo_water_b']
    },
    ...(withUserChange?{temporalMethod:'readings',temporalConfirmed:true}:{})
  });
}
function addProviderPayment(project,{id,year,providerAccountId,amountCents,date}){
  project.cashflows.push({
    id,kind:'provider_payment',propertyId:'demo_house',providerAccountId,
    accountingPeriodId:`demo_year_${year}`,amountCents,date
  });
}
function addTenantPayment(project,{id,year,tenancyId,amountCents,date}){
  project.cashflows.push({
    id,kind:'tenant_payment',purpose:'operating_cost_advance',tenancyId,
    accountingPeriodId:`demo_year_${year}`,amountCents,date
  });
}

function addCoreData(p){
  p.properties.push({
    id:'demo_house',label:'Demo-Haus Lindenblick',workspaceMode:'mixed',
    address:{street:'Beispielweg',houseNumber:'12',postalCode:'64295',city:'Darmstadt'},
    demo:true,demoNote:'Alle Personen, Belege und Adressdaten dieses Projekts sind frei erfunden.'
  });
  p.units.push(
    {id:'demo_owner_unit',propertyId:'demo_house',label:'Erdgeschoss · Eigennutzung',floor:'EG',
      areaHistory:[{from:'2024-01-01',to:null,hundredthsM2:9500}]},
    {id:'demo_rent_a',propertyId:'demo_house',label:'1. OG links · Wohnung A',floor:'1. OG links',
      areaHistory:[{from:'2024-01-01',to:null,hundredthsM2:7500}]},
    {id:'demo_rent_b',propertyId:'demo_house',label:'1. OG rechts · Wohnung B',floor:'1. OG rechts',
      areaHistory:[{from:'2024-01-01',to:null,hundredthsM2:6500}]}
  );
  p.tenancies.push(
    {id:'demo_lease_berger',unitId:'demo_rent_a',partyLabel:'Familie Berger · fiktiv',startDate:'2024-01-01',endDate:null},
    {id:'demo_lease_schneider',unitId:'demo_rent_b',partyLabel:'Jonas Schneider · fiktiv',startDate:'2024-01-01',endDate:'2025-06-30'},
    {id:'demo_lease_vogel',unitId:'demo_rent_b',partyLabel:'Nina Vogel · fiktiv',startDate:'2025-07-01',endDate:null}
  );
  p.usagePeriods.push(
    {id:'demo_use_owner',unitId:'demo_owner_unit',kind:'owner',startDate:'2024-01-01',endDate:null},
    {id:'demo_use_berger',unitId:'demo_rent_a',kind:'tenant',tenancyId:'demo_lease_berger',startDate:'2024-01-01',endDate:null},
    {id:'demo_use_schneider',unitId:'demo_rent_b',kind:'tenant',tenancyId:'demo_lease_schneider',startDate:'2024-01-01',endDate:'2025-06-30'},
    {id:'demo_use_vogel',unitId:'demo_rent_b',kind:'tenant',tenancyId:'demo_lease_vogel',startDate:'2025-07-01',endDate:null}
  );
  p.contractTerms.push(
    {id:'demo_terms_berger',tenancyId:'demo_lease_berger',startDate:'2024-01-01',endDate:null,
      operatingCostsModel:'advance',advanceCents:22000,allowedCostTypes:[...standardCosts]},
    {id:'demo_terms_schneider',tenancyId:'demo_lease_schneider',startDate:'2024-01-01',endDate:'2025-06-30',
      operatingCostsModel:'advance',advanceCents:18000,allowedCostTypes:[...standardCosts]},
    {id:'demo_terms_vogel',tenancyId:'demo_lease_vogel',startDate:'2025-07-01',endDate:null,
      operatingCostsModel:'advance',advanceCents:20000,allowedCostTypes:[...standardCosts]}
  );
  p.accountingPeriods.push(
    {id:'demo_year_2024',propertyId:'demo_house',startDate:'2024-01-01',endDate:'2025-12-31',
      confirmedTenancyIds:['demo_lease_berger','demo_lease_schneider']},
    {id:'demo_year_2024',propertyId:'demo_house',startDate:'2025-01-01',endDate:'2025-12-31',
      confirmedTenancyIds:['demo_lease_berger','demo_lease_schneider','demo_lease_vogel']}
  );
}

function addMeters(p){
  p.meters.push(
    {id:'demo_water_owner',propertyId:'demo_house',unitId:'demo_owner_unit',service:'cold_water',measurementUnit:'m³',installedAt:'2023-01-01',label:'Kaltwasser EG'},
    {id:'demo_water_a',propertyId:'demo_house',unitId:'demo_rent_a',service:'cold_water',measurementUnit:'m³',installedAt:'2023-01-01',label:'Kaltwasser Wohnung A'},
    {id:'demo_water_b',propertyId:'demo_house',unitId:'demo_rent_b',service:'cold_water',measurementUnit:'m³',installedAt:'2023-01-01',label:'Kaltwasser Wohnung B'}
  );
  p.readings.push(
    {id:'demo_read_owner_2401',meterId:'demo_water_owner',date:'2024-01-01',value:100},
    {id:'demo_read_owner_2412',meterId:'demo_water_owner',date:'2024-12-31',value:160},
    {id:'demo_read_owner_2501',meterId:'demo_water_owner',date:'2025-01-01',value:161},
    {id:'demo_read_owner_2512',meterId:'demo_water_owner',date:'2025-12-31',value:225},

    {id:'demo_read_a_2401',meterId:'demo_water_a',date:'2024-01-01',value:50},
    {id:'demo_read_a_2412',meterId:'demo_water_a',date:'2024-12-31',value:95},
    {id:'demo_read_a_2501',meterId:'demo_water_a',date:'2025-01-01',value:96},
    {id:'demo_read_a_2512',meterId:'demo_water_a',date:'2025-12-31',value:145},

    {id:'demo_read_b_2401',meterId:'demo_water_b',date:'2024-01-01',value:20},
    {id:'demo_read_b_2412',meterId:'demo_water_b',date:'2024-12-31',value:60},
    {id:'demo_read_b_2501',meterId:'demo_water_b',date:'2025-01-01',value:61},
    {id:'demo_read_b_2507',meterId:'demo_water_b',date:'2025-07-01',value:85},
    {id:'demo_read_b_2512',meterId:'demo_water_b',date:'2025-12-31',value:115}
  );
}

function addYear2024(p){
  const costs=[
    ['demo_tax_2024','property_tax',240000,'demo_city'],
    ['demo_insurance_2024','building_insurance',120000,'demo_insurer'],
    ['demo_waste_2024','waste',72000,'demo_waste_provider'],
    ['demo_power_2024','common_electricity',48000,'demo_power_provider'],
    ['demo_water_2024','cold_water',90000,'demo_water_provider']
  ];
  for(const [id,category,amountCents,providerAccountId] of costs){
    addExpense(p,{id,year:2024,category,amountCents,providerAccountId});
    if(category==='cold_water') addWaterRule(p,{id:`rule_${id}`,expenseId:id,periodId:'demo_year_2024'});
    else addAreaRule(p,{id:`rule_${id}`,expenseId:id,periodId:'demo_year_2024'});
    addProviderPayment(p,{id:`pay_${id}`,year:2024,providerAccountId,amountCents,date:'2024-12-20'});
  }
  addExpense(p,{id:'demo_repair_2024',year:2024,category:'repair',amountCents:180000,providerAccountId:'demo_crafts',classification:'owner'});
  addProviderPayment(p,{id:'pay_demo_repair_2024',year:2024,providerAccountId:'demo_crafts',amountCents:180000,date:'2024-11-15'});
  addTenantPayment(p,{id:'demo_paid_berger_2024',year:2024,tenancyId:'demo_lease_berger',amountCents:264000,date:'2024-12-15'});
  addTenantPayment(p,{id:'demo_paid_schneider_2024',year:2024,tenancyId:'demo_lease_schneider',amountCents:216000,date:'2024-12-15'});
}

function addYear2025(p){
  const costs=[
    ['demo_tax_2025','property_tax',252000,'demo_city'],
    ['demo_insurance_2025','building_insurance',126000,'demo_insurer'],
    ['demo_waste_2025','waste',75600,'demo_waste_provider'],
    ['demo_power_2025','common_electricity',50400,'demo_power_provider'],
    ['demo_water_2025','cold_water',96000,'demo_water_provider']
  ];
  for(const [id,category,amountCents,providerAccountId] of costs){
    addExpense(p,{id,year:2025,category,amountCents,providerAccountId});
    if(category==='cold_water') addWaterRule(p,{id:`rule_${id}`,expenseId:id,periodId:'demo_year_2024',withUserChange:true});
    else addAreaRule(p,{id:`rule_${id}`,expenseId:id,periodId:'demo_year_2024',withUserChange:true});
    addProviderPayment(p,{id:`pay_${id}`,year:2025,providerAccountId,amountCents,date:'2025-12-20'});
  }
  addExpense(p,{id:'demo_repair_2025',year:2025,category:'repair',amountCents:95000,providerAccountId:'demo_crafts',classification:'owner'});
  addProviderPayment(p,{id:'pay_demo_repair_2025',year:2025,providerAccountId:'demo_crafts',amountCents:95000,date:'2025-10-10'});
  addTenantPayment(p,{id:'demo_paid_berger_2025',year:2025,tenancyId:'demo_lease_berger',amountCents:264000,date:'2025-12-15'});
  addTenantPayment(p,{id:'demo_paid_schneider_2025',year:2025,tenancyId:'demo_lease_schneider',amountCents:108000,date:'2025-06-30'});
  addTenantPayment(p,{id:'demo_paid_vogel_2025',year:2025,tenancyId:'demo_lease_vogel',amountCents:120000,date:'2025-12-15'});
}

function addRentalDocuments(project){
  let p=project;
  p=createRentalDocumentDraft(p,{
    documentId:'demo_doc_lease_berger',type:'lease_draft',propertyId:'demo_house',unitId:'demo_rent_a',
    tenancyId:'demo_lease_berger',createdOn:'2026-09-24',title:'Mietvertragsentwurf · Familie Berger',
    fields:{tenantLabel:'Familie Berger · fiktiv',startDate:'2024-01-01',baseRentCents:98000,
      operatingCostsModel:'advance',operatingCostCents:22000,depositCents:294000,
      notes:'Demo: unbefristetes Wohnraummietverhältnis; Fach- und Rechtsprüfung erfolgt außerhalb des Dokuments.'}
  }).project;
  p=createRentalDocumentDraft(p,{
    documentId:'demo_doc_house_rules',type:'house_rules',propertyId:'demo_house',unitId:'demo_rent_a',
    createdOn:'2026-09-24',title:'Hausordnung · Demo-Haus Lindenblick',
    fields:{ruleKind:'contractual',rules:'Ruhezeiten, Gemeinschaftsflächen, Treppenhaus, Fahrräder und Müllplätze sind sachlich und nachvollziehbar geregelt.'}
  }).project;
  p=createRentalDocumentDraft(p,{
    documentId:'demo_doc_waste',type:'waste_info',propertyId:'demo_house',unitId:'demo_rent_a',
    createdOn:'2026-09-24',title:'Müll- und Entsorgungsinformation',
    fields:{locations:'Restmüll und Bio im Hof; Papier an der Einfahrt.',sorting:'Verpackungen getrennt sammeln.',schedule:'Bereitstellung gemäß örtlichem Abfuhrkalender.',localDataConfirmed:false}
  }).project;
  p=createRentalDocumentDraft(p,{
    documentId:'demo_doc_handover_vogel',type:'handover_protocol',propertyId:'demo_house',unitId:'demo_rent_b',
    tenancyId:'demo_lease_vogel',createdOn:'2025-07-01',title:'Übergabeprotokoll · Wohnung B',
    fields:{kind:'move_in',date:'2025-07-01',keys:'2 Haustürschlüssel, 2 Wohnungsschlüssel, 1 Briefkastenschlüssel',
      meters:'Kaltwasser 85 m³',defects:'Kleine Gebrauchsspur an der Wohnzimmertür; fotografisch dokumentiert.'}
  }).project;
  p=createRentalDocumentDraft(p,{
    documentId:'demo_doc_service_vogel',type:'tenant_service_sheet',propertyId:'demo_house',unitId:'demo_rent_b',
    tenancyId:'demo_lease_vogel',createdOn:'2025-07-01',title:'Mieter-Serviceblatt · Wohnung B',
    fields:{purpose:'Einzug und erste Orientierung',subject:'Willkommen im Demo-Haus Lindenblick',
      message:'Ansprechpartner, Müllplätze, Zähler und gemeinschaftlich genutzte Flächen auf einen Blick.',
      requestedInfo:'Änderungen an Kontaktdaten bitte mitteilen.',deadline:'2025-07-15'}
  }).project;
  return p;
}

function addSafetyChecks(project){
  let p=project;
  const rows=[
    ['building_insurance','contract','done','Finanzierungsunterlagen enthalten eine Versicherungsanforderung.',null],
    ['elementary_cover','recommendation','review','Deckungsumfang für den Standort separat prüfen.','2026-11-15'],
    ['property_liability','recommendation','done','Versicherungsschutz im Demo-Fall dokumentiert.',null],
    ['financing_requirements','contract','done','Darlehensvorgaben wurden im Demo-Fall geprüft.',null],
    ['owner_household_contents','recommendation','done','Eigener Hausrat ist getrennt vom Gebäude betrachtet.',null],
    ['special_systems','not_applicable','done','Keine besonderen technischen Anlagen im Demo-Grundfall.',null],
    ['energy_certificate','unresolved','review','Gültigkeit und konkrete Unterlagen vor realer Verwendung prüfen.','2026-10-31'],
    ['maintenance','recommendation','review','Wartungsübersicht als jährliche Wiedervorlage führen.','2026-12-01'],
    ['regional_obligations','unresolved','review','Landes- und örtliche Anforderungen sind objektbezogen zu prüfen.','2025-12-15']
  ];
  for(let i=0;i<rows.length;i++){
    const [checkKey,classification,status,note,dueDate]=rows[i];
    p=upsertSafetyCheck(p,{itemId:`demo_safety_${i+1}`,propertyId:'demo_house',checkKey,classification,status,note,dueDate,checkedOn:'2026-09-24'}).project;
  }
  return p;
}

function addLettingDemo(project){
  let p=createLettingProcess(project,{
    processId:'demo_letting_2025',propertyId:'demo_house',unitId:'demo_rent_b',
    createdOn:'2025-05-15',referenceLabel:'Sommer 2025 · Vorgang ohne Personendaten'
  }).project;
  for(const item of LETTING_ITEMS.filter(x=>x.phase==='A_VIEWING')){
    p=setLettingItemState(p,{processId:'demo_letting_2025',itemKey:item.key,state:item.key==='a_wbs_if_social'?'not_applicable':'done'}).project;
  }
  p=advanceLettingPhase(p,{processId:'demo_letting_2025',nextPhase:'B_INTEREST'}).project;
  for(const item of LETTING_ITEMS.filter(x=>x.phase==='B_INTEREST')){
    p=setLettingItemState(p,{processId:'demo_letting_2025',itemKey:item.key,state:['b_wbs_document','b_pets_if_relevant','b_insolvency_open','b_eviction_title_5y'].includes(item.key)?'not_applicable':'done'}).project;
  }
  p=advanceLettingPhase(p,{processId:'demo_letting_2025',nextPhase:'C_SELECTED'}).project;
  for(const item of LETTING_ITEMS.filter(x=>x.phase==='C_SELECTED')){
    p=setLettingItemState(p,{processId:'demo_letting_2025',itemKey:item.key,state:['c_public_payment_proof','c_rent_breach','c_prior_termination'].includes(item.key)?'not_applicable':'done'}).project;
  }
  return p;
}

export function buildDemoProject(){
  let p=createEmptyProject(DEMO_PROJECT_ID);
  addCoreData(p);
  addMeters(p);
  addYear2024(p);
  addYear2025(p);
  p=addRentalDocuments(p);
  p=addSafetyChecks(p);
  p=addLettingDemo(p);
  p.demoMetadata={
    demoVersion:DEMO_VERSION,
    title:'Demo-Haus Lindenblick',
    fictional:true,
    referenceYear:'2025',
    learningPurpose:'Geführter Musterfall für Eigentümer, Vermieter und Mieterwechsel.',
    resettable:true
  };
  assertValidProject(p);
  for(const periodId of ['demo_year_2024','demo_year_2024']){
    const result=calculatePeriod(p,periodId);
    if(result.status!=='calculated'||!result.report){
      throw new Error(`Demo-Referenzjahr ${periodId} ist nicht vollständig berechenbar: ${JSON.stringify(result.issues??[])}`);
    }
  }
  return clone(p);
}
