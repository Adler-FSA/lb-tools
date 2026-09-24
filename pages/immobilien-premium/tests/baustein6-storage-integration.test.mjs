import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyProject} from '../assets/js/model.js';
import {loadProject,saveProject,createBackup,StorageError} from '../assets/js/storage.js';
import {prepareReviewDocument,releaseReviewDocument,recordDocumentDelivery,RELEASE_CONFIRMATION} from '../assets/js/document-workflow.js';

function memoryStorage(){
 const map=new Map();
 return {map,getItem:key=>map.has(key)?map.get(key):null,setItem:(key,value)=>map.set(key,String(value))};
}
function fixture(){
 const p=createEmptyProject('b6_storage');
 p.properties.push({id:'p1',label:'Haus'});
 return p;
}
function released(){
 let p=fixture();
 p=prepareReviewDocument(p,{documentId:'d1',documentType:'house_rules',title:'Hausordnung',createdOn:'2026-09-24',propertyId:'p1',snapshot:{rules:'Test'}}).project;
 return releaseReviewDocument(p,{documentId:'d1',releasedOn:'2026-09-24',confirmation:RELEASE_CONFIRMATION}).project;
}
test('Freigegebener B6-Snapshot passiert bestehendes Schema und Speicher',()=>{
 const store=memoryStorage(),p=released();saveProject(p,{storage:store});
 const read=loadProject({storage:store});assert.equal(read.documents[0].status,'released');assert.equal(read.documents[0].snapshot.rules,'Test');
});
test('Übergabevermerk kann gespeichert werden ohne freigegebenes Dokument zu verändern',()=>{
 const store=memoryStorage();let p=released();saveProject(p,{storage:store});const before=JSON.stringify(p.documents[0]);
 p=recordDocumentDelivery(p,{itemId:'delivery1',documentId:'d1',deliveredOn:'2026-09-25',channel:'email',note:'gesendet'}).project;
 saveProject(p,{storage:store});const read=loadProject({storage:store});
 assert.equal(JSON.stringify(read.documents[0]),before);assert.equal(read.checkItems[0].type,'document_delivery');
});
test('Nachträgliche Änderung eines freigegebenen B6-Snapshots bleibt durch Speicher gesperrt',()=>{
 const store=memoryStorage();const p=released();saveProject(p,{storage:store});
 const changed=loadProject({storage:store});changed.documents[0].snapshot.rules='Manipuliert';
 assert.throws(()=>saveProject(changed,{storage:store}),e=>e instanceof StorageError&&e.code==='RELEASED_IMMUTABLE');
});
test('Backup enthält Dokument-Snapshots aber behauptet keine PDF-Dateisicherung',()=>{
 const payload=JSON.parse(createBackup(released(),{now:()=>new Date('2026-09-24T10:00:00.000Z')}));
 assert.equal(payload.project.documents[0].status,'released');assert.equal(payload.containsPdfFiles,false);assert.equal(payload.containsAttachmentFiles,false);
});
