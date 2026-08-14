(()=>{
'use strict';
/* FSA DATA MIGRATION ENGINE TEMPLATE
   Migrationen laufen schrittweise auf einer Kopie. Erst nach vollständigem Erfolg
   darf der Produktadapter den neuen Zustand persistent speichern. */
const VERSION='FSA_DATA_MIGRATION_ENGINE_V1';
const clone=o=>JSON.parse(JSON.stringify(o));
const migrations=new Map();
function register(from,to,migrate,validate=()=>true){if(!from||!to||typeof migrate!=='function')throw new Error('Ungültige Migration.');migrations.set(from,{to,migrate,validate})}
function path(from,target){const out=[];let cur=from,guard=0;while(cur!==target){if(++guard>100)throw new Error('Migrationskette ist zyklisch oder zu lang.');const step=migrations.get(cur);if(!step)throw new Error(`Kein Migrationspfad von ${cur} nach ${target}.`);out.push({from:cur,...step});cur=step.to}return out}
async function migrate({data,fromSchema,toSchema,validateFinal=()=>true}){if(!data)throw new Error('Keine Daten zur Migration.');const original=clone(data),work=clone(data),steps=path(fromSchema,toSchema),log=[];let current=work;try{for(const step of steps){const next=await step.migrate(clone(current));if(!next||!step.validate(next))throw new Error(`Validierung ${step.from} → ${step.to} fehlgeschlagen.`);current=clone(next);log.push({from:step.from,to:step.to,status:'ok'})}if(!validateFinal(current))throw new Error('Abschlussvalidierung fehlgeschlagen.');return{ok:true,data:current,fromSchema,toSchema,steps:log,original}}catch(error){return{ok:false,data:null,fromSchema,toSchema,steps:log,original,error:String(error?.message||error)}}}
window.FsaDataMigrationEngine=Object.freeze({version:VERSION,register,path,migrate});
})();
