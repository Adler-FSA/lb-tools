import {createBackup,previewBackup,restoreBackup,saveProject} from './storage.js';
import {newId,safeLoadProject,showFlash,updateStoragePill} from './ui-core.js';
import {getLanguage,initI18n} from './i18n.js';
import {createNextAccountingPeriod} from './annual-rollover.js';

const I18N={
 navHome:{de:'Meine Zentrale',en:'My dashboard'},navProperties:{de:'Immobilien',en:'Properties'},navRental:{de:'Mietservice',en:'Tenant service'},navCosts:{de:'Kosten & Abrechnung',en:'Costs & billing'},navChecks:{de:'Sicherheit & Checks',en:'Safety & checks'},navDocs:{de:'Dokumente & Hilfe',en:'Documents & help'},
 eyebrow:{de:'Sicherung & Jahreswechsel',en:'Backup & year change'},title:{de:'Daten sichern, Wiederherstellung vorher prüfen und das Folgejahr leer starten.',en:'Back up data, preview restores first and start the next year empty.'},copy:{de:'Die Sicherung bleibt versioniert und transparent. Ein Jahreswechsel übernimmt nur Objekt und Zeitraum – keine Beträge, Rechnungen, Zahlungen oder Messwerte.',en:'The backup remains versioned and transparent. A year change carries over only property and period – no amounts, invoices, payments or readings.'},
 pdfCenter:{de:'PDF-Zentrale',en:'PDF centre'},archive:{de:'Archiv',en:'Archive'},help:{de:'Hilfe',en:'Help'},storage:{de:'Speicher',en:'Storage'},storageCopy:{de:'Lokaler Browser-Speicher dieses Geräts.',en:'Local browser storage on this device.'},schema:{de:'Sicherung',en:'Backup'},
 backupStep:{de:'Sicherung',en:'Backup'},backupTitle:{de:'JSON-Sicherung erstellen',en:'Create JSON backup'},backupCopy:{de:'Enthält Projektdaten und Dokument-Snapshots. Belegdateien und erzeugte PDF-Dateien sind nicht enthalten.',en:'Contains project data and document snapshots. Attachment files and generated PDF files are not included.'},backupNotice:{de:'Die Sicherung behauptet ausdrücklich nicht, PDF- oder Anhangsdateien mitzusichern.',en:'The backup explicitly does not claim to include PDF or attachment files.'},backupButton:{de:'Sicherung herunterladen',en:'Download backup'},
 restoreStep:{de:'Wiederherstellung',en:'Restore'},restoreTitle:{de:'Sicherung zuerst prüfen',en:'Preview backup first'},restoreCopy:{de:'Die ausgewählte Datei wird zunächst nur gelesen und validiert. Erst nach ausdrücklicher Bestätigung wird das aktuelle Projekt ersetzt.',en:'The selected file is first read and validated only. The current project is replaced only after explicit confirmation.'},fileLabel:{de:'JSON-Sicherungsdatei',en:'JSON backup file'},restoreConfirm:{de:'Ich habe die Vorschau geprüft und möchte das aktuelle Projekt ersetzen.',en:'I have reviewed the preview and want to replace the current project.'},restoreButton:{de:'Geprüfte Sicherung wiederherstellen',en:'Restore reviewed backup'},
 yearStep:{de:'Jahreswechsel',en:'Year change'},yearTitle:{de:'Neue Abrechnungsperiode anlegen',en:'Create new accounting period'},yearCopy:{de:'Das Vorjahr bleibt unverändert. Die neue Periode startet ausdrücklich unbestätigt; Rechnungen, Zahlungen, Messwerte und Mieterbestätigungen werden nicht kopiert.',en:'The previous year remains unchanged. The new period starts explicitly unconfirmed; invoices, payments, readings and tenancy confirmations are not copied.'},sourcePeriod:{de:'Ausgangsperiode',en:'Source period'},nextPeriod:{de:'Vorgeschlagenes Folgejahr',en:'Proposed next period'},yearButton:{de:'Folgeperiode leer anlegen',en:'Create empty next period'},
 privacy:{de:'Alle Funktionen arbeiten im eigenen Speicher-Namensraum von Nebenkosten Premium. Das frühere Nebenkosten-Werkzeug wird weder gelesen noch verändert.',en:'All functions use the dedicated Nebenkosten Premium storage namespace. The previous utilities tool is neither read nor changed.'},footer:{de:'Nebenkosten Premium · Lokale Speicherung · Sicherung ohne PDF-/Anhangsdateien.',en:'Nebenkosten Premium · Local storage · Backup excludes PDF/attachment files.'},
 noProject:{de:'Noch kein Projekt vorhanden.',en:'No project yet.'},backupReady:{de:'Sicherung wurde als JSON-Datei bereitgestellt. Bitte gespeicherte Datei kontrollieren.',en:'Backup provided as a JSON file. Please verify the saved file.'},previewOk:{de:'Sicherung geprüft',en:'Backup verified'},project:{de:'Projekt',en:'Project'},created:{de:'Erstellt',en:'Created'},records:{de:'Datensätze',en:'Records'},filesExcluded:{de:'PDF-/Anhangsdateien: nicht enthalten',en:'PDF/attachment files: not included'},restoreDone:{de:'Sicherung wurde wiederhergestellt. Der vorherige Rohstand wurde als Recovery-Kopie geschützt.',en:'Backup restored. The previous raw state was protected as a recovery copy.'},fileError:{de:'Sicherungsdatei konnte nicht geprüft werden.',en:'Backup file could not be verified.'},yearCreated:{de:'Neue Abrechnungsperiode wurde leer und unbestätigt angelegt.',en:'New accounting period created empty and unconfirmed.'},none:{de:'Keine abgeschlossene Periode',en:'No completed period'}
};
initI18n(I18N);

let project=null,backupText=null,backupInfo=null,sourcePeriodId=null;
function reload(){
 const s=safeLoadProject();project=s.project;updateStoragePill(project,s.error);
 if(s.error){showFlash(s.error.message,'error');return false;}
 document.querySelector('[data-project-id]').textContent=project?.projectId||'–';
 return true;
}
function safeName(value){return String(value||'projekt').replace(/[^A-Za-z0-9_-]+/g,'-').slice(0,60)||'projekt';}
function createBackupFile(){
 if(!project)return showFlash(I18N.noProject[getLanguage()],'error');
 try{
  const text=createBackup(project);
  const blob=new Blob([text],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='Nebenkosten_Premium_'+safeName(project.projectId)+'_'+new Date().toISOString().slice(0,10)+'.json';a.hidden=true;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  showFlash(I18N.backupReady[getLanguage()]);
 }catch(e){showFlash(e.message||String(e),'error');}
}
async function readBackupFile(file){
 backupText=null;backupInfo=null;
 const host=document.querySelector('[data-backup-preview]');host.classList.add('hidden');host.textContent='';
 document.querySelector('[data-restore-confirm]').checked=false;document.querySelector('[data-restore-backup]').disabled=true;
 if(!file)return;
 try{
  const text=await file.text();const info=previewBackup(text);backupText=text;backupInfo=info;
  host.innerHTML='<strong>'+I18N.previewOk[getLanguage()]+'</strong><div class="kicker" style="margin-top:7px">'+
   I18N.project[getLanguage()]+': '+String(info.projectId)+' · '+I18N.created[getLanguage()]+': '+String(info.createdAt)+' · '+
   I18N.records[getLanguage()]+': '+Object.values(info.recordCounts).reduce((a,b)=>a+b,0)+' · '+I18N.filesExcluded[getLanguage()]+'</div>';
  host.classList.remove('hidden');
 }catch(e){showFlash((e.message||I18N.fileError[getLanguage()]),'error');}
}
function restore(){
 if(!backupText||!backupInfo||!document.querySelector('[data-restore-confirm]').checked)return;
 try{
  const result=restoreBackup(backupText,{confirmation:'REPLACE_PROJECT'});
  project=JSON.parse(backupText).project;backupText=null;backupInfo=null;
  document.querySelector('[data-backup-file]').value='';document.querySelector('[data-backup-preview]').classList.add('hidden');
  document.querySelector('[data-restore-confirm]').checked=false;document.querySelector('[data-restore-backup]').disabled=true;
  updateStoragePill(project,null);document.querySelector('[data-project-id]').textContent=project.projectId;
  renderPeriods();showFlash(I18N.restoreDone[getLanguage()]+(result.recoveryKey?'':''));
 }catch(e){reload();showFlash(e.message||String(e),'error');}
}
function completedPeriods(){
 return (project?.accountingPeriods??[]).filter(x=>x.endDate).slice().sort((a,b)=>b.endDate.localeCompare(a.endDate));
}
function renderPeriods(){
 const select=document.querySelector('[data-source-period]'),items=completedPeriods();
 select.innerHTML=items.length?items.map(p=>'<option value="'+p.id+'">'+p.startDate+' – '+p.endDate+'</option>').join(''):'<option value="">'+I18N.none[getLanguage()]+'</option>';
 select.disabled=!items.length;
 sourcePeriodId=items.some(x=>x.id===sourcePeriodId)?sourcePeriodId:(items[0]?.id||'');select.value=sourcePeriodId;
 updateNext();
 document.querySelector('[data-create-next-year]').disabled=!sourcePeriodId;
}
function plusYear(date){if(!date)return'';return String(Number(date.slice(0,4))+1).padStart(4,'0')+date.slice(4);}
function updateNext(){
 const p=completedPeriods().find(x=>x.id===sourcePeriodId);
 document.querySelector('[data-next-period]').value=p?(plusYear(p.startDate)+' – '+plusYear(p.endDate)):'';
}
function createNext(){
 if(!reload()||!project||!sourcePeriodId)return;
 try{
  const result=createNextAccountingPeriod(project,{sourcePeriodId,newPeriodId:newId('period')});
  saveProject(result.project);project=result.project;showFlash(I18N.yearCreated[getLanguage()]+' '+result.startDate+' – '+result.endDate);renderPeriods();updateStoragePill(project,null);
 }catch(e){reload();showFlash(e.message||String(e),'error');renderPeriods();}
}

document.querySelector('[data-create-backup]')?.addEventListener('click',createBackupFile);
document.querySelector('[data-backup-file]')?.addEventListener('change',e=>readBackupFile(e.target.files?.[0]));
document.querySelector('[data-restore-confirm]')?.addEventListener('change',e=>{document.querySelector('[data-restore-backup]').disabled=!(e.target.checked&&backupText);});
document.querySelector('[data-restore-backup]')?.addEventListener('click',restore);
document.querySelector('[data-source-period]')?.addEventListener('change',e=>{sourcePeriodId=e.target.value;updateNext();});
document.querySelector('[data-create-next-year]')?.addEventListener('click',createNext);
window.addEventListener('app-language-change',()=>{if(project)renderPeriods();});
if(reload())renderPeriods();
