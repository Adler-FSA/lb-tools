import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyProject} from '../assets/js/model.js';
import {buildDemoProject} from '../assets/js/demo-project.js';
import {PROJECT_KEY,DEMO_PROJECT_KEY,loadProject,saveProject,resetDemoProject,StorageError} from '../assets/js/storage.js';

function memoryStorage(){
 const map=new Map();
 return {map,getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
}
test('Live- und Demo-Projekt liegen unter getrennten Schlüsseln',()=>{
 const storage=memoryStorage(),live=createEmptyProject('live_project'),demo=buildDemoProject();
 saveProject(live,{storage,mode:'live'});
 saveProject(demo,{storage,mode:'demo'});
 assert.notEqual(PROJECT_KEY,DEMO_PROJECT_KEY);
 assert.equal(loadProject({storage,mode:'live'}).projectId,'live_project');
 assert.equal(loadProject({storage,mode:'demo'}).projectId,'demo_lindenblick');
});
test('Demo-Reset ersetzt ausschließlich den Demo-Schlüssel',()=>{
 const storage=memoryStorage(),live=createEmptyProject('live_project');
 saveProject(live,{storage,mode:'live'});
 let demo=buildDemoProject();demo.properties[0].label='Veränderte Demo';saveProject(demo,{storage,mode:'demo'});
 const liveBefore=storage.getItem(PROJECT_KEY);
 resetDemoProject(buildDemoProject(),{storage,confirmation:'RESET_DEMO_PROJECT'});
 assert.equal(storage.getItem(PROJECT_KEY),liveBefore);
 assert.equal(loadProject({storage,mode:'live'}).projectId,'live_project');
 assert.equal(loadProject({storage,mode:'demo'}).properties[0].label,'Demo-Haus Lindenblick');
});
test('Demo-Reset braucht ausdrückliche Bestätigung',()=>{
 const storage=memoryStorage();
 assert.throws(()=>resetDemoProject(buildDemoProject(),{storage}),e=>e instanceof StorageError&&e.code==='CONFIRMATION_REQUIRED');
});
