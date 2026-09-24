
export const HOUSE_RULES_VERSION='DE_HAUSORDNUNG_V1_2026-09-24';
export const HOUSE_RULES_SOURCE='house-rules-workshop-v1';
const clone=v=>structuredClone(v),t=(v,n=1200)=>String(v??'').trim().slice(0,n);
export function defaultHouseRulesConfig(){return{
 title:'Hausordnung',mode:'contractual_attachment',propertyLabel:'',
 quiet:{enabled:true,from:'22:00',to:'07:00',midday:false,middayFrom:'13:00',middayTo:'15:00'},
 common:{enabled:true,text:'Treppenhaus, Flure, Hauseingang und sonstige Gemeinschaftsflächen sind freizuhalten und pfleglich zu behandeln.'},
 waste:{enabled:true,text:'Abfälle sind getrennt und ausschließlich in den vorgesehenen Behältern und Sammelstellen zu entsorgen.'},
 bikes:{enabled:true,text:'Fahrräder, Kinderwagen und ähnliche Gegenstände dürfen nur an den dafür vorgesehenen Stellen abgestellt werden.'},
 laundry:{enabled:false,text:'Gemeinschaftlich genutzte Waschräume und Geräte sind nach Benutzung sauber und zugänglich zu hinterlassen.'},
 garden:{enabled:false,text:'Gemeinschaftliche Außenflächen sind rücksichtsvoll zu nutzen; Veränderungen bedürfen der vorherigen Abstimmung.'},
 grill:{enabled:false,text:'Grillen ist nur so zulässig, dass andere Bewohner nicht unzumutbar beeinträchtigt werden und örtliche Vorgaben eingehalten werden.'},
 smoking:{enabled:true,text:'In geschlossenen Gemeinschaftsflächen und Treppenhäusern ist das Rauchen zu unterlassen.'},
 safety:{enabled:true,text:'Flucht- und Rettungswege, Hauszugänge sowie technische Einrichtungen dürfen nicht zugestellt oder beeinträchtigt werden.'},
 doors:{enabled:true,text:'Haus- und Zugangstüren sind entsprechend der vorhandenen Schließ- und Sicherheitsvorgaben zu benutzen. Fluchtwege dürfen dadurch nicht beeinträchtigt werden.'},
 cleaning:{enabled:false,assigned:false,text:'Eine Reinigung gemeinschaftlicher Flächen erfolgt nach gesonderter Vereinbarung oder Organisationsregel.'},
 winter:{enabled:false,assigned:false,text:'Winterdienst erfolgt nach gesonderter Vereinbarung und unter Beachtung der örtlichen Anforderungen.'},
 noiseDevices:{enabled:true,text:'Musik, Fernsehen, Haushalts- und Freizeitgeräte sind so zu nutzen, dass vermeidbare Störungen anderer Bewohner unterbleiben.'},
 petsCommon:{enabled:false,text:'Bei Tierhaltung sind Gemeinschaftsflächen sauber zu halten und vermeidbare Beeinträchtigungen anderer Bewohner zu vermeiden.'},
 custom:[]
};}
export function normalizeHouseRulesConfig(v){const o=defaultHouseRulesConfig();v=v&&typeof v==='object'?v:{};for(const k of Object.keys(o)){if(Array.isArray(o[k]))o[k]=Array.isArray(v[k])?clone(v[k]):o[k];else if(v[k]&&typeof v[k]==='object')Object.assign(o[k],clone(v[k]));else if(typeof v[k]==='string')o[k]=t(v[k]);}o.custom=(Array.isArray(v.custom)?v.custom:[]).map(x=>({title:t(x?.title,120),text:t(x?.text,2000),enabled:x?.enabled!==false})).filter(x=>x.title||x.text);return o;}
export function validateHouseRulesConfig(input){const c=normalizeHouseRulesConfig(input),errors=[],warnings=[];const E=(code,message,path)=>errors.push({code,message,path}),W=(code,message,path)=>warnings.push({code,message,path});
 if(!t(c.title))E('TITLE_REQUIRED','Titel der Hausordnung fehlt.','title');
 if(!['information','contractual_attachment'].includes(c.mode))E('MODE_INVALID','Art der Hausordnung ist unbekannt.','mode');
 if(c.quiet.enabled&&(!/^\d{2}:\d{2}$/.test(c.quiet.from)||!/^\d{2}:\d{2}$/.test(c.quiet.to)))E('QUIET_TIME','Ruhezeiten sind unvollständig.','quiet');
 if(c.cleaning.enabled&&c.cleaning.assigned)W('CLEANING_DUTY_REVIEW','Übertragung regelmäßiger Reinigungspflichten gesondert auf vertragliche Grundlage und Zumutbarkeit prüfen.','cleaning');
 if(c.winter.enabled&&c.winter.assigned)W('WINTER_DUTY_REVIEW','Übertragung von Winterdienstpflichten gesondert auf vertragliche Grundlage, örtliche Pflichten und Organisation prüfen.','winter');
 if(c.mode==='contractual_attachment')W('CONTRACT_ATTACHMENT_REVIEW','Als Vertragsanlage muss die Hausordnung wirksam einbezogen werden; individuelle Abreden und zwingendes Recht gehen vor.','mode');
 W('LOCAL_RULES_REVIEW','Örtliche Satzungen, Immissionsschutz- und Sicherheitsvorgaben werden nicht automatisch geprüft.','quiet');
 return{config:c,errors,warnings,valid:errors.length===0};}
export function buildHouseRulesDocument(input){const q=validateHouseRulesConfig(input);if(!q.valid)throw new Error('Hausordnung ist noch nicht ausgabefähig.');const c=q.config,sections=[],P=(title,text)=>{if(t(text))sections.push({title,text:t(text,3000)});};
 if(c.quiet.enabled)P('Ruhe und Rücksichtnahme','Von '+c.quiet.from+' bis '+c.quiet.to+' Uhr ist besondere Rücksicht auf die Hausgemeinschaft zu nehmen.'+(c.quiet.midday?' Zusätzlich gilt eine Ruhezeit von '+c.quiet.middayFrom+' bis '+c.quiet.middayTo+' Uhr.':'')+' Unabhängig davon sind vermeidbare erhebliche Störungen anderer Bewohner zu unterlassen.');
 if(c.noiseDevices.enabled)P('Musik, Geräte und Freizeit',c.noiseDevices.text);
 if(c.common.enabled)P('Gemeinschaftsflächen',c.common.text);
 if(c.safety.enabled)P('Sicherheit und Rettungswege',c.safety.text);
 if(c.doors.enabled)P('Haus- und Zugangstüren',c.doors.text);
 if(c.waste.enabled)P('Müll und Entsorgung',c.waste.text);
 if(c.bikes.enabled)P('Fahrräder und abgestellte Gegenstände',c.bikes.text);
 if(c.laundry.enabled)P('Waschküche und Gemeinschaftsgeräte',c.laundry.text);
 if(c.garden.enabled)P('Garten und Außenflächen',c.garden.text);
 if(c.grill.enabled)P('Grillen und Außenaktivitäten',c.grill.text);
 if(c.smoking.enabled)P('Rauchen in Gemeinschaftsbereichen',c.smoking.text);
 if(c.petsCommon.enabled)P('Tiere in Gemeinschaftsbereichen',c.petsCommon.text);
 if(c.cleaning.enabled)P('Reinigung gemeinschaftlicher Flächen',c.cleaning.text+(c.cleaning.assigned?' Die konkrete Zuordnung ergibt sich aus einer gesonderten wirksamen Vereinbarung oder einem abgestimmten Plan.':''));
 if(c.winter.enabled)P('Winterdienst',c.winter.text+(c.winter.assigned?' Die konkrete Zuordnung ergibt sich aus einer gesonderten wirksamen Vereinbarung oder einem abgestimmten Plan.':''));
 c.custom.filter(x=>x.enabled).forEach(x=>P(x.title,x.text));
 return{version:HOUSE_RULES_VERSION,title:c.title,mode:c.mode,propertyLabel:c.propertyLabel,sections,footer:c.mode==='contractual_attachment'?'Diese Hausordnung ist als Vertragsanlage vorgesehen. Individuelle Abreden und zwingendes Recht gehen vor.':'Diese Hausordnung dient als Bewohnerinformation.',reviewWarnings:q.warnings};
}
export function renderHouseRulesHtml(doc){return '<h2 class="contract-title">'+t(doc.title)+'</h2>'+(doc.propertyLabel?'<div class="party-card"><p><strong>'+t(doc.propertyLabel)+'</strong></p></div>':'')+doc.sections.map((s,i)=>'<section class="section"><h3>'+(i+1)+'. '+t(s.title)+'</h3><p>'+t(s.text,4000)+'</p></section>').join('')+'<section class="section"><p class="small">'+t(doc.footer,2000)+'</p></section>';}
export function upsertHouseRulesDraft(project,{documentId,propertyId=null,unitId=null,config,createdOn}){const q=validateHouseRulesConfig(config),copy=clone(project);let doc=copy.documents.find(x=>x.source===HOUSE_RULES_SOURCE&&x.propertyId===propertyId&&x.unitId===unitId);const payload={id:doc?.id||documentId,kind:'workshop_draft',documentType:'house_rules',type:'house_rules',source:HOUSE_RULES_SOURCE,status:'draft',title:q.config.title,createdOn:doc?.createdOn||createdOn,updatedOn:createdOn,propertyId:propertyId||null,unitId:unitId||null,workshopVersion:HOUSE_RULES_VERSION,payload:clone(q.config),reviewWarnings:clone(q.warnings),legalApproval:false,pdfGenerated:false};if(doc)Object.assign(doc,payload);else copy.documents.push(payload);return{project:copy,documentId:payload.id,validation:q};}
