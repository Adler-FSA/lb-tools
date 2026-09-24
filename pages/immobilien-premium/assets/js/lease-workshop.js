
export const LEASE_WORKSHOP_VERSION='DE_WOHNRAUM_V1_2026-09-24';
export const LEASE_WORKSHOP_SOURCE='residential-lease-workshop-v1';
const clone=v=>structuredClone(v), cents=v=>Number.isSafeInteger(v)&&v>=0;
const esc=v=>String(v??'').replace(/[&<>\"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[ch]));
const safeClone=v=>Array.isArray(v)?v.map(safeClone):(v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,safeClone(x)])):(typeof v==='string'?esc(v):v));
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'));
const t=(v,n=800)=>String(v??'').trim().slice(0,n);
const euro=c=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format((Number(c)||0)/100);
const d=v=>{if(!day(v))return v||'—';const a=v.split('-');return a[2]+'.'+a[1]+'.'+a[0];};
export const LEASE_LEGAL_REFERENCES=Object.freeze([
 {label:'§ 551 BGB · Mietsicherheit',url:'https://www.gesetze-im-internet.de/bgb/__551.html'},
 {label:'§ 556 BGB · Betriebskosten',url:'https://www.gesetze-im-internet.de/bgb/__556.html'},
 {label:'§ 2 BetrKV · Betriebskostenarten',url:'https://www.gesetze-im-internet.de/betrkv/__2.html'},
 {label:'§ 556b BGB · Fälligkeit',url:'https://www.gesetze-im-internet.de/bgb/__556b.html'},
 {label:'§ 568 BGB · Kündigungsform',url:'https://www.gesetze-im-internet.de/bgb/__568.html'},
 {label:'§ 573c BGB · Kündigungsfristen',url:'https://www.gesetze-im-internet.de/bgb/__573c.html'},
 {label:'§ 575 BGB · Zeitmietvertrag',url:'https://www.gesetze-im-internet.de/bgb/__575.html'},
 {label:'§ 557a BGB · Staffelmiete',url:'https://www.gesetze-im-internet.de/bgb/__557a.html'},
 {label:'§ 557b BGB · Indexmiete',url:'https://www.gesetze-im-internet.de/bgb/__557b.html'},
 {label:'§ 553 BGB · Gebrauchsüberlassung',url:'https://www.gesetze-im-internet.de/bgb/__553.html'}
]);
export function defaultLeaseConfig(){return{
 landlord:{name:'',street:'',postalCity:''},tenant:{name:'',street:'',postalCity:''},
 property:{street:'',postalCity:'',unitLabel:'',floor:'',areaM2:'',rooms:'',cellar:'',parking:'',sharedFacilities:''},
 term:{kind:'unlimited',startDate:'',endDate:'',fixedReason:'',fixedReasonDetail:''},
 rent:{baseRentCents:0,operatingMode:'advance',operatingCostCents:0,iban:'',bic:'',bank:''},
 rentAdjustment:{kind:'statutory',staggeredRows:[]},deposit:{enabled:true,amountCents:0},
 occupancy:{persons:''},care:{smallRepairs:false,smallRepairSingleCents:0,smallRepairAnnualCapCents:0,cosmeticRepairs:false},
 pets:{mode:'case_by_case',details:''},houseRules:{attached:true,title:'Hausordnung'},
 handover:{protocolAttached:true,inventoryAttached:false},additional:{keys:'',fixtures:'',agreements:''},review:{notes:''}
};}
export function normalizeLeaseConfig(v){
 const o=defaultLeaseConfig();v=v&&typeof v==='object'?v:{};
 for(const k of Object.keys(o))if(v[k]&&typeof v[k]==='object'&&!Array.isArray(v[k]))Object.assign(o[k],clone(v[k]));
 o.rentAdjustment.staggeredRows=(Array.isArray(v.rentAdjustment?.staggeredRows)?v.rentAdjustment.staggeredRows:[]).map(x=>({from:t(x?.from,10),rentCents:Number(x?.rentCents)}));
 return o;
}
export function validateLeaseConfig(input){
 const c=normalizeLeaseConfig(input),errors=[],warnings=[],E=(code,message,path)=>errors.push({code,message,path}),W=(code,message,path)=>warnings.push({code,message,path});
 if(!t(c.landlord.name))E('LANDLORD_REQUIRED','Vermietername fehlt.','landlord.name');
 if(!t(c.tenant.name))E('TENANT_REQUIRED','Mietername fehlt.','tenant.name');
 if(!t(c.property.street)||!t(c.property.postalCity))E('PROPERTY_REQUIRED','Adresse der Mietwohnung ist unvollständig.','property');
 if(!day(c.term.startDate))E('START_DATE_REQUIRED','Gültiger Mietbeginn erforderlich.','term.startDate');
 if(!cents(c.rent.baseRentCents)||c.rent.baseRentCents<=0)E('BASE_RENT_REQUIRED','Nettokaltmiete muss größer als 0 sein.','rent.baseRentCents');
 if(c.term.kind==='fixed'){
  if(!day(c.term.endDate)||c.term.endDate<=c.term.startDate)E('FIXED_END_DATE','Gültiges Vertragsende erforderlich.','term.endDate');
  if(!['own_use','construction','service_person'].includes(c.term.fixedReason))E('FIXED_REASON_REQUIRED','Zulässiger Befristungsgrund erforderlich.','term.fixedReason');
  if(!t(c.term.fixedReasonDetail))E('FIXED_REASON_DETAIL','Konkreter Befristungsgrund muss beschrieben werden.','term.fixedReasonDetail');
  W('FIXED_TERM_REVIEW','Befristungsgrund vor Verwendung gesondert prüfen.','term');
 }
 if(!['none','advance','flat'].includes(c.rent.operatingMode))E('OPERATING_MODE','Betriebskostenmodell unbekannt.','rent.operatingMode');
 if(c.deposit.enabled&&!cents(c.deposit.amountCents))E('DEPOSIT_AMOUNT','Kautionsbetrag ist ungültig.','deposit.amountCents');
 if(c.deposit.enabled&&c.deposit.amountCents>c.rent.baseRentCents*3)E('DEPOSIT_TOO_HIGH','Kaution darf höchstens drei Nettokaltmieten betragen.','deposit.amountCents');
 if(c.rent.operatingMode!=='none'&&!cents(c.rent.operatingCostCents))E('OPERATING_COST_AMOUNT','Betriebskostenbetrag ist ungültig.','rent.operatingCostCents');
 if(c.rentAdjustment.kind==='staggered'){
  let prev=c.term.startDate;
  if(!c.rentAdjustment.staggeredRows.length)E('STAGGERED_ROWS','Mindestens eine Mietstaffel erforderlich.','rentAdjustment.staggeredRows');
  c.rentAdjustment.staggeredRows.forEach((r,i)=>{if(!day(r.from)||!cents(r.rentCents)||r.rentCents<=0)E('STAGGERED_ROW','Staffel '+(i+1)+' ist unvollständig.','rentAdjustment.staggeredRows');else if(prev){const m=new Date(prev+'T00:00:00Z');m.setUTCFullYear(m.getUTCFullYear()+1);if(new Date(r.from+'T00:00:00Z')<m)E('STAGGERED_INTERVAL','Zwischen den Staffeln müssen mindestens zwölf Monate liegen.','rentAdjustment.staggeredRows');prev=r.from;}});
  W('STAGGERED_REVIEW','Staffelmiete und Miethöhe separat prüfen.','rentAdjustment');
 }
 if(c.rentAdjustment.kind==='index')W('INDEX_REVIEW','Indexmiete und Ausgangsmiete separat prüfen.','rentAdjustment');
 if(c.care.smallRepairs){if(!cents(c.care.smallRepairSingleCents)||c.care.smallRepairSingleCents<=0)E('SMALL_REPAIR_SINGLE','Einzelgrenze fehlt.','care');if(!cents(c.care.smallRepairAnnualCapCents)||c.care.smallRepairAnnualCapCents<=0)E('SMALL_REPAIR_ANNUAL','Jahresgrenze fehlt.','care');W('SMALL_REPAIR_REVIEW','Kleinreparaturklausel fachlich/rechtlich prüfen.','care');}
 if(c.care.cosmeticRepairs)W('COSMETIC_REPAIRS_REVIEW','Schönheitsreparaturklausel gesondert prüfen.','care');
 W('RENT_LEVEL_REVIEW','Zulässige Miethöhe und örtliche Begrenzungen werden nicht automatisch geprüft.','rent');
 return{config:c,errors,warnings,valid:errors.length===0};
}
function S(n,title,html){return{number:n,title,html};}
export function buildLeaseDocument(input){
 const q=validateLeaseConfig(input);if(!q.valid)throw new Error('Mietvertrag ist noch nicht ausgabefähig.');const c=safeClone(q.config),s=[];
 const obj=[c.property.unitLabel?'Wohnung '+c.property.unitLabel:'',c.property.floor?'Lage: '+c.property.floor:'',c.property.areaM2?'Wohnfläche ca. '+c.property.areaM2+' m²':'',c.property.rooms?c.property.rooms+' Zimmer':''].filter(Boolean).join(' · ');
 s.push(S(1,'Mietobjekt','<p>Vermietet wird zu Wohnzwecken die Wohnung in <strong>'+t(c.property.street)+', '+t(c.property.postalCity)+'</strong>.</p><p>'+obj+'.</p>'+(c.property.cellar?'<p>Keller: '+t(c.property.cellar)+'.</p>':'')+(c.property.parking?'<p>Stellplatz/Garage: '+t(c.property.parking)+'.</p>':'')));
 if(c.term.kind==='fixed'){const L={own_use:'beabsichtigte Eigennutzung',construction:'beabsichtigte wesentliche bauliche Maßnahme',service_person:'beabsichtigte Vermietung an eine zur Dienstleistung verpflichtete Person'};s.push(S(2,'Mietzeit','<p>Beginn: <strong>'+d(c.term.startDate)+'</strong>. Ende: <strong>'+d(c.term.endDate)+'</strong>.</p><p>Befristungsgrund: <strong>'+L[c.term.fixedReason]+'</strong>. '+t(c.term.fixedReasonDetail,1500)+'</p>'));}else s.push(S(2,'Mietzeit und Kündigung','<p>Das Mietverhältnis beginnt am <strong>'+d(c.term.startDate)+'</strong> und läuft auf unbestimmte Zeit.</p><p>Für Kündigung gelten die gesetzlichen Voraussetzungen, Formen und Fristen.</p>'));
 const total=c.rent.baseRentCents+(c.rent.operatingMode==='none'?0:c.rent.operatingCostCents);
 s.push(S(3,'Miete und Zahlung','<p>Nettokaltmiete: <strong>'+euro(c.rent.baseRentCents)+'</strong>.</p>'+(c.rent.operatingMode==='advance'?'<p>Betriebskostenvorauszahlung: <strong>'+euro(c.rent.operatingCostCents)+'</strong>. Hierüber wird jährlich nach den gesetzlichen Vorschriften abgerechnet.</p>':'')+(c.rent.operatingMode==='flat'?'<p>Betriebskostenpauschale: <strong>'+euro(c.rent.operatingCostCents)+'</strong>.</p>':'')+'<p>Derzeitige monatliche Gesamtzahlung: <strong>'+euro(total)+'</strong>. Die Fälligkeit richtet sich nach den gesetzlichen Bestimmungen.</p>'+(t(c.rent.iban)?'<p>Zahlungskonto: IBAN '+t(c.rent.iban)+(t(c.rent.bic)?', BIC '+t(c.rent.bic):'')+(t(c.rent.bank)?', '+t(c.rent.bank):'')+'.</p>':'')));
 s.push(S(4,'Betriebskosten',c.rent.operatingMode==='none'?'<p>Eine gesonderte Betriebskostenumlage wird in dieser Fassung nicht vereinbart.</p>':'<p>Der Mieter trägt die wirksam vereinbarten Betriebskosten im Sinne der Betriebskostenverordnung, soweit sie tatsächlich anfallen. Verwaltungs-, Instandhaltungs- und Instandsetzungskosten werden dadurch nicht zu Betriebskosten.</p>'));
 if(c.rentAdjustment.kind==='staggered')s.push(S(5,'Staffelmiete','<p>Folgende Nettokaltmieten werden vereinbart:</p><table class="contract-table"><tr><th>ab</th><th>Nettokaltmiete</th></tr>'+c.rentAdjustment.staggeredRows.map(r=>'<tr><td>'+d(r.from)+'</td><td>'+euro(r.rentCents)+'</td></tr>').join('')+'</table><p>Im Übrigen gelten die gesetzlichen Vorschriften zur Staffelmiete.</p>'));
 else if(c.rentAdjustment.kind==='index')s.push(S(5,'Indexmiete','<p>Die Parteien vereinbaren eine Indexmiete nach den gesetzlichen Vorschriften. Maßgeblich ist der Verbraucherpreisindex für Deutschland. Änderungen werden nach den gesetzlichen Voraussetzungen geltend gemacht.</p>'));
 else s.push(S(5,'Mietanpassungen','<p>Mietanpassungen richten sich nach den gesetzlichen Vorschriften.</p>'));
 s.push(S(6,'Mietsicherheit',c.deposit.enabled?'<p>Die Kaution beträgt <strong>'+euro(c.deposit.amountCents)+'</strong>. Für Höhe, Teilzahlung, Anlage und Erträge gelten die gesetzlichen Regelungen.</p>':'<p>Eine Mietsicherheit wird nicht vereinbart.</p>'));
 s.push(S(7,'Nutzung der Mieträume','<p>Die Mieträume werden zu Wohnzwecken überlassen'+(t(c.occupancy.persons)?' und sind für '+t(c.occupancy.persons)+' Person(en) vorgesehen':'')+'.</p><p>Gebrauchsüberlassung an Dritte richtet sich nach den gesetzlichen Regelungen; gesetzliche Ansprüche des Mieters bleiben unberührt.</p>'));
 s.push(S(8,'Pflegliche Behandlung, Mängel und Veränderungen','<p>Die Mieträume und mitvermieteten Einrichtungen sind pfleglich zu behandeln. Mängel oder Schäden sollen unverzüglich angezeigt werden. Wesentliche Veränderungen bedürfen einer vorherigen Abstimmung, soweit nicht ein gesetzlicher Anspruch besteht.</p>'));
 s.push(S(9,c.care.smallRepairs?'Kleinreparaturen':'Instandhaltung',c.care.smallRepairs?'<p>Soweit wirksam vereinbar, trägt der Mieter kleine Reparaturen an Gegenständen seines häufigen unmittelbaren Zugriffs bis <strong>'+euro(c.care.smallRepairSingleCents)+'</strong> je Einzelfall und insgesamt bis <strong>'+euro(c.care.smallRepairAnnualCapCents)+'</strong> pro Vertragsjahr.</p>':'<p>Eine gesonderte Kleinreparaturkostenübernahme wird in dieser Fassung nicht vereinbart.</p>'));
 s.push(S(10,'Schönheitsreparaturen',c.care.cosmeticRepairs?'<p>Der Mieter übernimmt Schönheitsreparaturen während der Mietzeit nur, soweit sie aufgrund des tatsächlichen Zustands und des vertragsgemäßen Gebrauchs erforderlich werden. Starre Renovierungsfristen und eine unabhängig vom tatsächlichen Zustand geschuldete Endrenovierung werden nicht vereinbart.</p>':'<p>Diese Fassung enthält keine gesonderte formularmäßige Übertragung von Schönheitsreparaturen.</p>'));
 const pets=c.pets.mode==='none'?'Eine besondere Tierhaltungsregelung wird nicht getroffen.':c.pets.mode==='custom'?t(c.pets.details,1500):'Tierhaltung ist nach Art, Anzahl, Mietobjekt und Interessen der Beteiligten im Einzelfall zu beurteilen. Kleintiere im üblichen Umfang bleiben unberührt.';s.push(S(11,'Tierhaltung','<p>'+pets+'</p>'));
 s.push(S(12,'Hausordnung',c.houseRules.attached?'<p>Die als Anlage beigefügte <strong>'+t(c.houseRules.title||'Hausordnung')+'</strong> wird Bestandteil des Vertrags, soweit ihre Regelungen wirksam vereinbart werden. Individuelle Abreden und zwingendes Recht gehen vor.</p>':'<p>Eine gesonderte Hausordnung wird nicht als Anlage einbezogen.</p>'));
 s.push(S(13,'Übergabe, Schlüssel und Anlagen',(t(c.additional.keys)?'<p>Schlüssel: '+t(c.additional.keys)+'.</p>':'')+(t(c.additional.fixtures)?'<p>Mitvermietete Ausstattung: '+t(c.additional.fixtures)+'.</p>':'')+'<p>'+(c.handover.protocolAttached?'Ein Übergabeprotokoll wird als gesonderte Anlage geführt.':'Kein Übergabeprotokoll als Anlage vorgesehen.')+'</p>'));
 if(t(c.additional.agreements))s.push(S(14,'Weitere Vereinbarungen','<p>'+t(c.additional.agreements,5000).replace(/\n/g,'<br>')+'</p>'));
 s.push(S(t(c.additional.agreements)?15:14,'Schlussbestimmungen','<p>Individuelle Vereinbarungen gehen formularmäßigen Regelungen vor. Gesetzlich vorgeschriebene Formen bleiben unberührt.</p>'));
 return{version:LEASE_WORKSHOP_VERSION,title:'Wohnraum-Mietvertrag',parties:{landlord:clone(c.landlord),tenant:clone(c.tenant)},sections:s,attachments:[...(c.houseRules.attached?[c.houseRules.title||'Hausordnung']:[]),...(c.handover.protocolAttached?['Übergabeprotokoll']:[]),...(c.handover.inventoryAttached?['Inventarliste']:[])],reviewWarnings:q.warnings};
}
export function renderLeaseHtml(doc){const p=doc.parties;return '<h2 class="contract-title">Wohnraum-Mietvertrag</h2><div class="party-card"><p>zwischen</p><p><strong>'+t(p.landlord.name)+'</strong><br>'+t(p.landlord.street)+'<br>'+t(p.landlord.postalCity)+'</p><p>– Vermieter –</p><p>und</p><p><strong>'+t(p.tenant.name)+'</strong><br>'+t(p.tenant.street)+'<br>'+t(p.tenant.postalCity)+'</p><p>– Mieter –</p></div>'+doc.sections.map(s=>'<section class="section"><h3>§ '+s.number+' '+s.title+'</h3>'+s.html+'</section>').join('')+(doc.attachments.length?'<section class="section"><h3>Anlagen</h3><ul>'+doc.attachments.map(x=>'<li>'+t(x)+'</li>').join('')+'</ul></section>':'')+'<section class="section"><div class="signature-grid"><div class="signature-box"><div class="signature-line"></div><p class="small">Ort, Datum · Vermieter</p><div class="signature-line"></div><p class="small">'+t(p.landlord.name)+'</p></div><div class="signature-box"><div class="signature-line"></div><p class="small">Ort, Datum · Mieter</p><div class="signature-line"></div><p class="small">'+t(p.tenant.name)+'</p></div></div></section>';}
export function upsertLeaseWorkshopDraft(project,{documentId,propertyId=null,unitId=null,tenancyId=null,config,createdOn}){const q=validateLeaseConfig(config),copy=clone(project);let doc=copy.documents.find(x=>x.source===LEASE_WORKSHOP_SOURCE&&((tenancyId&&x.tenancyId===tenancyId)||(!tenancyId&&x.id===documentId)));const payload={id:doc?.id||documentId,kind:'workshop_draft',documentType:'lease_draft',type:'lease_draft',source:LEASE_WORKSHOP_SOURCE,status:'draft',title:'Wohnraum-Mietvertrag · '+(q.config.tenant.name||q.config.property.unitLabel||'Entwurf'),createdOn:doc?.createdOn||createdOn,updatedOn:createdOn,propertyId:propertyId||null,unitId:unitId||null,tenancyId:tenancyId||null,workshopVersion:LEASE_WORKSHOP_VERSION,payload:clone(q.config),reviewWarnings:clone(q.warnings),legalApproval:false,pdfGenerated:false};if(doc)Object.assign(doc,payload);else copy.documents.push(payload);return{project:copy,documentId:payload.id,validation:q};}
