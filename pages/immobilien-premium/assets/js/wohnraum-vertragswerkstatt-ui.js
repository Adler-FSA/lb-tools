import {isDemoMode,loadProject} from './storage.js';
import {safeLoadProject,updateStoragePill,showFlash} from './ui-core.js';
import {getLanguage,initI18n} from './i18n.js';

const I18N={
 navHome:{de:'Meine Zentrale',en:'My dashboard'},navProperties:{de:'Immobilien',en:'Properties'},navRental:{de:'Mietservice',en:'Tenant service'},navCosts:{de:'Kosten & Abrechnung',en:'Costs & billing'},navChecks:{de:'Sicherheit & Checks',en:'Safety & checks'},navDocs:{de:'Dokumente & Hilfe',en:'Documents & help'},
 eyebrow:{de:'Wohnraum-Vertragswerkstatt',en:'Residential lease workshop'},title:{de:'Mietvertrag und Hausordnung selbst konfigurieren.',en:'Configure your lease and house rules.'},copy:{de:'Du gibst die Eckdaten ein und erhältst zwei bearbeitbare Dokumente. Die Vertragsdokumente bleiben frei von internen Prüfhinweisen; diese stehen ausschließlich im separaten Prüfbereich.',en:'Enter the key data and receive two editable documents. The contract documents remain free of internal review notes; those appear only in the separate review area.'},
 back:{de:'← Mietservice',en:'← Tenant service'},build:{de:'Dokumente aus Angaben neu aufbauen',en:'Rebuild documents from details'},status:{de:'Dokumentstatus',en:'Document status'},draft:{de:'Bearbeitbarer Arbeitsentwurf',en:'Editable working draft'},statusCopy:{de:'Diese Version richtet sich an Wohnraummietverhältnisse in Deutschland. Besondere Vertragsmodelle brauchen eine gesonderte Prüfung.',en:'This version targets residential tenancies in Germany. Special contract models require separate review.'},pdf:{de:'PDF',en:'PDF'},local:{de:'lokal erzeugt',en:'created locally'},
 details:{de:'Vertragsdaten',en:'Contract data'},detailsTitle:{de:'Eckdaten eintragen',en:'Enter key details'},landlord:{de:'Vermieter',en:'Landlord'},landlordAddress:{de:'Anschrift Vermieter',en:'Landlord address'},tenant:{de:'Mieter',en:'Tenant'},tenantAddress:{de:'Bisherige Anschrift Mieter',en:'Tenant previous address'},propertyAddress:{de:'Adresse des Mietobjekts',en:'Rental property address'},unit:{de:'Wohnung / Lage',en:'Unit / location'},area:{de:'Wohnfläche ca. m²',en:'Approx. living area m²'},rooms:{de:'Zimmer',en:'Rooms'},extras:{de:'Mitvermietete Bereiche / Ausstattung',en:'Included areas / equipment'},startDate:{de:'Mietbeginn',en:'Tenancy start'},baseRent:{de:'Nettokaltmiete €',en:'Net base rent €'},advance:{de:'Betriebskostenvorauszahlung €',en:'Operating-cost advance €'},deposit:{de:'Kaution €',en:'Deposit €'},iban:{de:'Zahlungskonto / IBAN – optional',en:'Payment account / IBAN – optional'},annex:{de:'Hausordnung als Anlage zum Vertrag bezeichnen',en:'Identify house rules as an annex to the lease'},
 editorHintTitle:{de:'Danach frei bearbeiten',en:'Edit freely afterwards'},editorHint:{de:'Du kannst direkt in Vertrag und Hausordnung klicken und Text ändern. „Neu aufbauen“ setzt den Dokumenttext wieder aus den Formularangaben zusammen.',en:'You can click directly into the lease and house rules and edit the text. “Rebuild” recreates the document text from the form details.'},
 pdfLease:{de:'PDF Mietvertrag',en:'Lease PDF'},pdfRules:{de:'PDF Hausordnung',en:'House rules PDF'},leaseTab:{de:'Mietvertrag',en:'Lease'},rulesTab:{de:'Hausordnung',en:'House rules'},reviewTab:{de:'Separater Prüfbereich',en:'Separate review area'},reviewOnly:{de:'Nicht Bestandteil der Vertrags-PDFs',en:'Not part of the contract PDFs'},reviewTitle:{de:'Prüf- und Praxisblatt',en:'Review and practice sheet'},reviewCopy:{de:'Dieser Bereich unterstützt Deine Prüfung vor Verwendung. Er wird weder in den Mietvertrag noch in die Hausordnung übernommen.',en:'This area supports your review before use. It is not included in either the lease or the house rules.'},
 excludedTitle:{de:'Bewusst nicht automatisch eingebaut',en:'Deliberately not added automatically'},excludedCopy:{de:'Befristung, Staffel- oder Indexmiete, Kleinreparaturklauseln, Schönheitsreparaturen und weitere besondere Klauseln. Dafür sollte eine passende Fachfassung gewählt und vor Verwendung geprüft werden.',en:'Fixed terms, stepped or index-linked rent, minor-repair clauses, cosmetic-repair clauses and other special clauses. Use an appropriate specialist version and review it before use.'},lawBasis:{de:'Gesetzliche Orientierung dieser Werkstatt: §§ 551, 556, 556b und 573c BGB sowie Betriebskostenverordnung; Rechtsstand für die Werkstatt: 24.09.2026. Keine individuelle Rechtsberatung.',en:'Legal orientation for this workshop: sections 551, 556, 556b and 573c BGB and the Operating Costs Ordinance; legal status for this workshop: 24 September 2026. No individual legal advice.'},
 footer:{de:'Nebenkosten Premium · Wohnraum-Vertragswerkstatt · Vertragsdokument und Prüfhinweise technisch getrennt.',en:'Nebenkosten Premium · Residential lease workshop · Contract document and review notes technically separated.'},
 reviewDepositOk:{de:'Kaution liegt innerhalb von drei Nettokaltmieten.',en:'Deposit is within three net base rents.'},reviewDepositBad:{de:'Kaution überschreitet drei Nettokaltmieten. PDF-Ausgabe bleibt gesperrt, bis der Betrag korrigiert ist.',en:'Deposit exceeds three net base rents. PDF output remains blocked until corrected.'},reviewCosts:{de:'Betriebskosten sind als Vorauszahlung angelegt; die jährliche Abrechnung ist im Entwurf vorgesehen.',en:'Operating costs are set as an advance payment; annual billing is included in the draft.'},reviewRent:{de:'Miethöhe und örtliche mietpreisrechtliche Grenzen werden von dieser Werkstatt nicht automatisch geprüft.',en:'Rent level and local rent-price restrictions are not automatically reviewed by this workshop.'},reviewRules:{de:'Wenn die Hausordnung Vertragsanlage wird, sollten ihre konkreten Regeln vor Verwendung ebenfalls geprüft werden.',en:'If the house rules become a contract annex, their specific rules should also be reviewed before use.'},reviewHandover:{de:'Für den Einzug empfiehlt sich ein separates Übergabeprotokoll mit Schlüsseln, Zustand und Zählerständen.',en:'For move-in, use a separate handover record covering keys, condition and meter readings.'},reviewSpecial:{de:'Besondere Klauseln wurden bewusst nicht automatisch ergänzt. Fach- und Rechtsprüfung erfolgt außerhalb des Vertragsdokuments.',en:'Special clauses were deliberately not added automatically. Professional and legal review takes place outside the contract document.'},reviewLawyer:{de:'Vor rechtsverbindlicher Verwendung können Mietvertrag und Hausordnung separat an einen Rechtsanwalt zur Sach- und Rechtsprüfung gegeben werden. Dieser Hinweis bleibt außerhalb der Dokumente.',en:'Before legally binding use, the lease and house rules can be sent separately to a lawyer for factual and legal review. This note remains outside the documents.'},
 rebuilt:{de:'Mietvertrag und Hausordnung wurden aus den aktuellen Angaben neu aufgebaut.',en:'Lease and house rules were rebuilt from the current details.'},pdfReady:{de:'PDF wurde erstellt und an die Akademie-PDF-Zentrale übergeben.',en:'PDF was created and handed to the Academy PDF centre.'},invalid:{de:'Bitte die Pflichtfelder und die Kaution prüfen.',en:'Please review the required fields and deposit.'},engineMissing:{de:'Die Vertrags-PDF-Engine ist nicht verfügbar.',en:'The contract PDF engine is unavailable.'},demoStored:{de:'Demo-Vertragswerkstatt',en:'Demo contract workshop'}
};
initI18n(I18N);

const form=document.querySelector('[data-contract-form]');
const leaseEditor=document.getElementById('leaseEditor');
const rulesEditor=document.getElementById('rulesEditor');
const reviewHost=document.querySelector('[data-review-list]');
const pdfLease=document.querySelector('[data-pdf-lease]');
const pdfRules=document.querySelector('[data-pdf-rules]');
const liveKey='akademie:nebenskosten-premium:v1:wohnraum-vertragswerkstatt:v1';

const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
const euro=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v||0));
const deDate=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return String(v||'');const [y,m,d]=v.split('-');return d+'.'+m+'.'+y;};
const number=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)&&n>=0?n:0;};
const val=name=>form.elements[name]?.type==='checkbox'?form.elements[name].checked:String(form.elements[name]?.value??'').trim();

function state(){
 return {
  landlordName:val('landlordName'),landlordAddress:val('landlordAddress'),tenantName:val('tenantName'),tenantAddress:val('tenantAddress'),
  propertyAddress:val('propertyAddress'),unitDescription:val('unitDescription'),areaM2:number(val('areaM2')),rooms:number(val('rooms')),
  extras:val('extras'),startDate:val('startDate'),baseRentEuro:number(val('baseRentEuro')),operatingAdvanceEuro:number(val('operatingAdvanceEuro')),
  depositEuro:number(val('depositEuro')),iban:val('iban'),houseRulesAnnex:val('houseRulesAnnex')
 };
}
function validate(s){
 const required=s.landlordName&&s.landlordAddress&&s.tenantName&&s.propertyAddress&&s.unitDescription&&s.startDate&&s.areaM2>0&&s.baseRentEuro>0;
 return {required:!!required,depositOk:s.depositEuro<=s.baseRentEuro*3};
}
function leaseHtml(s){
 const total=s.baseRentEuro+s.operatingAdvanceEuro;
 const tenantAddress=s.tenantAddress?'<br>'+esc(s.tenantAddress):'';
 const extras=s.extras?'<p>Mitvermietet werden: '+esc(s.extras)+'.</p>':'';
 const iban=s.iban?'<p>Die laufenden Zahlungen erfolgen auf folgendes vom Vermieter benanntes Konto: '+esc(s.iban)+'.</p>':'';
 const rules=s.houseRulesAnnex
  ?'<p>Die als Anlage beigefügte Hausordnung ist Bestandteil dieses Vertrags. Individuelle Vereinbarungen und zwingende gesetzliche Vorschriften gehen vor.</p>'
  :'<p>Eine Hausordnung wird nicht automatisch als Vertragsanlage einbezogen.</p>';
 return `<h1>Wohnraum-Mietvertrag</h1>
 <div class="party"><p>zwischen</p><p><strong>${esc(s.landlordName)}</strong><br>${esc(s.landlordAddress)}<br>– nachfolgend „Vermieter“ –</p><p>und</p><p><strong>${esc(s.tenantName)}</strong>${tenantAddress}<br>– nachfolgend „Mieter“ –</p></div>
 <h2>§ 1 Mietobjekt</h2><p>Der Vermieter vermietet dem Mieter zu Wohnzwecken die Wohnung ${esc(s.unitDescription)} im Haus ${esc(s.propertyAddress)}.</p><p>Die Wohnfläche beträgt ca. ${esc(new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(s.areaM2))} m². Die Wohnung umfasst ${esc(s.rooms||'–')} Zimmer.</p>${extras}
 <h2>§ 2 Mietzeit und Kündigung</h2><p>Das Mietverhältnis beginnt am ${esc(deDate(s.startDate))} und wird auf unbestimmte Zeit geschlossen.</p><p>Für die ordentliche und außerordentliche Kündigung gelten die gesetzlichen Vorschriften.</p>
 <h2>§ 3 Miete und Betriebskosten</h2><p>Die monatliche Nettokaltmiete beträgt ${esc(euro(s.baseRentEuro))}.</p><p>Zusätzlich trägt der Mieter Betriebskosten im Sinne der Betriebskostenverordnung, soweit diese wirksam vereinbart und auf das Mietobjekt anwendbar sind. Hierauf wird eine monatliche Vorauszahlung von ${esc(euro(s.operatingAdvanceEuro))} vereinbart. Über die Vorauszahlungen wird jährlich nach den gesetzlichen Vorgaben abgerechnet.</p>
 <h2>§ 4 Zahlung</h2><p>Die monatliche Gesamtzahlung aus Nettokaltmiete und Betriebskostenvorauszahlung beträgt derzeit ${esc(euro(total))}. Für die Fälligkeit gelten die gesetzlichen Vorschriften.</p>${iban}
 <h2>§ 5 Mietsicherheit</h2><p>Der Mieter leistet eine Mietsicherheit in Höhe von ${esc(euro(s.depositEuro))}. Bei einer als Geldsumme geleisteten Sicherheit bleiben die gesetzlichen Rechte zur Ratenzahlung sowie die gesetzlichen Anforderungen an die getrennte Anlage der Sicherheit unberührt.</p>
 <h2>§ 6 Übergabe und Zustand</h2><p>Der Zustand der Mieträume, übergebene Schlüssel und vorhandene Zählerstände können bei Übergabe in einem gesonderten Übergabeprotokoll dokumentiert werden. Das Übergabeprotokoll wird von beiden Vertragsparteien gesondert geprüft.</p>
 <h2>§ 7 Nutzung und Hausordnung</h2><p>Die Mieträume werden zu Wohnzwecken überlassen. Gemeinschaftsflächen und mitvermietete Einrichtungen dürfen im vereinbarten und bestimmungsgemäßen Umfang genutzt werden.</p>${rules}
 <h2>§ 8 Schlussbestimmungen</h2><p>Individuelle Vereinbarungen der Vertragsparteien und zwingende gesetzliche Vorschriften bleiben unberührt. Änderungen oder Ergänzungen sollen nachvollziehbar dokumentiert werden.</p>
 <div class="signature-row"><div class="signature-line">Ort, Datum · Vermieter</div><div class="signature-line">Ort, Datum · Mieter</div></div>`;
}
function rulesHtml(s){
 const annex=s.houseRulesAnnex?'<p><strong>Anlage zum Wohnraum-Mietvertrag</strong></p>':'';
 return `<h1>Hausordnung</h1>${annex}<p>für ${esc(s.propertyAddress)}</p>
 <h2>1. Rücksichtnahme</h2><p>Alle Bewohner und Besucher nehmen aufeinander Rücksicht. Vermeidbare Beeinträchtigungen anderer Bewohner und der Nachbarschaft sollen unterbleiben.</p>
 <h2>2. Ruhe und Lärm</h2><p>Gesetzliche und örtlich geltende Ruhezeiten sowie berechtigte Ruheinteressen der Hausgemeinschaft sind zu beachten. Unnötiger Lärm in Wohnung, Treppenhaus und Gemeinschaftsflächen ist zu vermeiden.</p>
 <h2>3. Treppenhaus, Flure und Rettungswege</h2><p>Gemeinschaftsflächen sowie Flucht- und Rettungswege sind freizuhalten. Gegenstände dürfen dort nur abgestellt werden, soweit dies zulässig ist und Sicherheit sowie Nutzung durch andere nicht beeinträchtigt werden.</p>
 <h2>4. Müll und Entsorgung</h2><p>Abfälle sind entsprechend den für das Objekt geltenden örtlichen Trenn- und Entsorgungsregeln in den vorgesehenen Behältern oder Sammelstellen zu entsorgen.</p>
 <h2>5. Sauberkeit und Schäden</h2><p>Gemeinschaftlich genutzte Bereiche sind pfleglich zu behandeln. Erkennbare Schäden oder sicherheitsrelevante Störungen am Gebäude sollen dem Vermieter oder der benannten Ansprechstelle zeitnah mitgeteilt werden.</p>
 <h2>6. Fahrräder, Kinderwagen und sonstige Gegenstände</h2><p>Für Fahrräder, Kinderwagen und sonstige Gegenstände sollen die dafür vorgesehenen Flächen genutzt werden. Flucht- und Rettungswege dürfen nicht beeinträchtigt werden.</p>
 <h2>7. Verhältnis zum Mietvertrag</h2><p>Individuelle Vereinbarungen im Mietvertrag sowie zwingende gesetzliche Vorschriften gehen dieser Hausordnung vor.</p>
 <div class="signature-row"><div class="signature-line">Ort, Datum · Vermieter</div><div class="signature-line">Ort, Datum · Mieter / Erhalt bestätigt</div></div>`;
}
function review(s){
 const v=validate(s),items=[];
 items.push({ok:v.depositOk,title:v.depositOk?I18N.reviewDepositOk[getLanguage()]:I18N.reviewDepositBad[getLanguage()]});
 items.push({ok:true,title:I18N.reviewCosts[getLanguage()]});
 items.push({ok:false,title:I18N.reviewRent[getLanguage()]});
 items.push({ok:!s.houseRulesAnnex,title:I18N.reviewRules[getLanguage()]});
 items.push({ok:true,title:I18N.reviewHandover[getLanguage()]});
 items.push({ok:false,title:I18N.reviewSpecial[getLanguage()]});
 items.push({ok:true,title:I18N.reviewLawyer[getLanguage()]});
 reviewHost.innerHTML=items.map(x=>'<div class="review-item '+(x.ok?'ok':'warn')+'"><strong>'+(x.ok?'✓ ':'! ')+esc(x.title)+'</strong></div>').join('');
 pdfLease.disabled=pdfRules.disabled=!(v.required&&v.depositOk);
}
function build({flash=true}={}){
 const s=state(),v=validate(s);
 if(!v.required){if(flash)showFlash(I18N.invalid[getLanguage()],'error');review(s);return false;}
 leaseEditor.innerHTML=leaseHtml(s);rulesEditor.innerHTML=rulesHtml(s);review(s);saveDraft();
 if(flash)showFlash(I18N.rebuilt[getLanguage()]);
 return true;
}
function storageKey(){return liveKey+(isDemoMode()?':demo':'');}
function sanitize(html){
 const doc=new DOMParser().parseFromString('<div id="root">'+String(html||'')+'</div>','text/html'),root=doc.getElementById('root'),out=document.createElement('div');
 const allowed=new Set(['H1','H2','H3','P','DIV','OL','UL','LI','STRONG','EM','BR']);
 function copy(node,parent){
  if(node.nodeType===Node.TEXT_NODE){parent.appendChild(document.createTextNode(node.textContent||''));return;}
  if(node.nodeType!==Node.ELEMENT_NODE)return;
  if(!allowed.has(node.tagName)){[...node.childNodes].forEach(x=>copy(x,parent));return;}
  const el=document.createElement(node.tagName.toLowerCase());
  if(node.classList.contains('party'))el.className='party';
  if(node.classList.contains('signature-row'))el.className='signature-row';
  if(node.classList.contains('signature-line'))el.className='signature-line';
  [...node.childNodes].forEach(x=>copy(x,el));parent.appendChild(el);
 }
 [...root.childNodes].forEach(x=>copy(x,out));return out.innerHTML;
}
function saveDraft(){
 if(isDemoMode())return;
 try{
  const values=Object.fromEntries(new FormData(form).entries());values.houseRulesAnnex=form.elements.houseRulesAnnex.checked;
  localStorage.setItem(storageKey(),JSON.stringify({version:1,values,lease:sanitize(leaseEditor.innerHTML),rules:sanitize(rulesEditor.innerHTML)}));
 }catch{}
}
function restoreDraft(){
 if(isDemoMode())return false;
 try{
  const raw=localStorage.getItem(storageKey());if(!raw)return false;const d=JSON.parse(raw);if(d.version!==1)return false;
  for(const [k,v] of Object.entries(d.values||{})){const el=form.elements[k];if(!el)continue;if(el.type==='checkbox')el.checked=!!v;else el.value=v;}
  if(d.lease)leaseEditor.innerHTML=sanitize(d.lease);if(d.rules)rulesEditor.innerHTML=sanitize(d.rules);review(state());return true;
 }catch{return false;}
}
function address(property){
 const a=property?.address||{};return [[a.street,a.houseNumber].filter(Boolean).join(' '),[a.postalCode,a.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}
function prefillDemo(){
 if(!isDemoMode())return false;
 try{
  const p=loadProject({mode:'demo'});if(!p)return false;
  const property=p.properties.find(x=>x.id==='demo_house'),unit=p.units.find(x=>x.id==='demo_rent_a'),tenancy=p.tenancies.find(x=>x.id==='demo_lease_berger');
  const draft=p.documents.find(x=>x.id==='demo_doc_lease_berger'),meta=p.demoMetadata||{};
  const values={
   landlordName:meta.ownerLabel||'Eva Linden · fiktiv',landlordAddress:meta.ownerAddress||address(property),
   tenantName:tenancy?.partyLabel||'Familie Berger · fiktiv',tenantAddress:'Musterstraße 7, 64283 Darmstadt · fiktiv',
   propertyAddress:address(property),unitDescription:unit?.label||'1. OG links',areaM2:(unit?.areaHistory?.[0]?.hundredthsM2||0)/100,
   rooms:3,extras:'Kellerraum und Balkon',startDate:tenancy?.startDate||'2024-01-01',
   baseRentEuro:(draft?.payload?.baseRentCents||98000)/100,operatingAdvanceEuro:(draft?.payload?.operatingCostCents||22000)/100,
   depositEuro:(draft?.payload?.depositCents||294000)/100,iban:'DE00 0000 0000 0000 0000 00',houseRulesAnnex:true
  };
  for(const [k,v] of Object.entries(values)){const el=form.elements[k];if(!el)continue;if(el.type==='checkbox')el.checked=!!v;else el.value=v;}
  return true;
 }catch{return false;}
}
function plainPaste(editor){
 editor.addEventListener('paste',event=>{
  event.preventDefault();const text=event.clipboardData?.getData('text/plain')||'';
  document.execCommand('insertText',false,text);
 });
 editor.addEventListener('input',()=>saveDraft());
}
function datePart(){return new Date().toISOString().slice(0,10);}
async function makePdf(kind){
 const s=state(),v=validate(s);if(!v.required||!v.depositOk)return showFlash(I18N.invalid[getLanguage()],'error');
 if(!window.FSAContractPdfEngine?.generate||!window.AkademiePdfUebergabe?.setDocument)return showFlash(I18N.engineMissing[getLanguage()],'error');
 const editor=kind==='lease'?leaseEditor:rulesEditor;
 const filename=(kind==='lease'?'Wohnraum-Mietvertrag':'Hausordnung')+'-'+String(s.tenantName||'Entwurf').replace(/[^A-Za-z0-9ÄÖÜäöüß_-]+/g,'-').slice(0,45)+'-'+datePart()+'.pdf';
 const title=kind==='lease'?'WOHNRAUM-MIETVERTRAG':'HAUSORDNUNG';
 try{
  const out=await window.FSAContractPdfEngine.generate({root:editor,contentRoot:editor,fieldsRoot:document.getElementById('contractPdfFields'),titleText:title,subtitleText:s.propertyAddress,footerText:title,filename,autoDownload:false});
  window.AkademiePdfUebergabe.setDocument({blob:out.blob,filename:out.filename,pages:out.pages,origin:'Nebenkosten Premium · Wohnraum-Vertragswerkstatt'});
  showFlash(I18N.pdfReady[getLanguage()]);
 }catch(error){showFlash(error?.message||String(error),'error');}
}

form.addEventListener('submit',event=>{event.preventDefault();build();});
form.addEventListener('input',()=>{review(state());saveDraft();});
document.querySelector('[data-build]').addEventListener('click',()=>build());
document.querySelector('[data-pdf-lease]').addEventListener('click',()=>makePdf('lease'));
document.querySelector('[data-pdf-rules]').addEventListener('click',()=>makePdf('rules'));
document.querySelectorAll('[data-show-paper]').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('[data-show-paper]').forEach(x=>x.classList.toggle('active',x===button));
 document.querySelectorAll('[data-paper]').forEach(x=>x.hidden=x.dataset.paper!==button.dataset.showPaper);
}));
plainPaste(leaseEditor);plainPaste(rulesEditor);
window.addEventListener('app-language-change',()=>review(state()));

const loaded=safeLoadProject();updateStoragePill(loaded.project,loaded.error);
if(isDemoMode()){const text=document.querySelector('[data-storage-text]');if(text)text.textContent=I18N.demoStored[getLanguage()];}
if(!prefillDemo()&&!restoreDraft()){
 form.elements.startDate.value=new Date().toISOString().slice(0,10);
 form.elements.houseRulesAnnex.checked=true;
}
build({flash:false});
