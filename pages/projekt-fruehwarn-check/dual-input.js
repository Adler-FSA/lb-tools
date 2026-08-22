(()=>{
const $=s=>document.querySelector(s);
const engineInput=$('#query');
const engineBtn=$('#searchBtn');
const oldRow=document.querySelector('.searchRow');
const panel=document.querySelector('.searchPanel');
if(!engineInput||!engineBtn||!oldRow||!panel||document.querySelector('.dualSearch'))return;

const style=document.createElement('style');
style.textContent=`
.dualSearch{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr) auto;gap:10px;align-items:end}
.dualField label{display:block;margin:0 0 6px;font-size:.79rem;font-weight:900;color:var(--navy)}
.dualInputWrap{position:relative}.dualInputWrap svg{position:absolute;left:15px;top:50%;transform:translateY(-50%);width:21px;height:21px;stroke:#6c7781;fill:none;stroke-width:2;pointer-events:none}
.dualInput{width:100%;min-height:56px;border:1px solid #cfd9df;border-radius:15px;padding:13px 15px 13px 47px;color:var(--navy);background:#fff;outline:none;font-size:1rem}
.dualInput:focus{border-color:var(--mint);box-shadow:0 0 0 4px rgba(32,169,183,.11)}
.dualInput.invalid{border-color:#d99567;box-shadow:0 0 0 3px rgba(185,117,15,.08)}
.dualHelp{display:block;margin-top:5px;color:var(--muted);font-size:.76rem;line-height:1.35}
.dualValidation{display:none;margin:9px 2px 0;padding:8px 10px;border-radius:10px;background:var(--amber-soft);border:1px solid #efdfbd;color:#76571e;font-size:.8rem;font-weight:750}
.dualValidation.show{display:block}
.dualSearchBtn{min-height:56px;border:0;border-radius:15px;padding:12px 20px;background:linear-gradient(135deg,var(--mint),var(--mint-dark));color:#fff;font-weight:950;box-shadow:0 7px 18px rgba(19,136,149,.19);white-space:nowrap}
.dualSearchBtn:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
.domainResultKey{display:inline-block;margin-left:8px;color:var(--muted);font-size:.86rem;font-weight:650}
@media(max-width:900px){.dualSearch{grid-template-columns:1fr 1fr}.dualSearchBtn{grid-column:1/-1;width:100%}}
@media(max-width:580px){.dualSearch{grid-template-columns:1fr}.dualSearchBtn{grid-column:auto}.dualField label{font-size:.82rem}}
`;
document.head.appendChild(style);

oldRow.style.display='none';
const topLabel=panel.querySelector('.searchLabel');
const oldHint=panel.querySelector('.searchHint');

const dual=document.createElement('div');
dual.className='dualSearch';
dual.innerHTML=`
  <div class="dualField">
    <label for="companyQuery" data-dual-de="Firmen-, Projekt- oder Markenname" data-dual-en="Company, project or brand name">Firmen-, Projekt- oder Markenname</label>
    <div class="dualInputWrap">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h2m2 0h2m-6 4h2m2 0h2m-6 4h6"/></svg>
      <input id="companyQuery" class="dualInput" autocomplete="organization" placeholder="z. B. KryptoSavings oder Deutsche Bank AG">
    </div>
    <span class="dualHelp" data-dual-de="Wenn nur der Name aus einer Werbung bekannt ist, genügt dieser. Ein exakter Rechtsträgername verbessert die Zuordnung." data-dual-en="If you only know the name from an advert, that is enough. An exact legal entity name improves matching.">Wenn nur der Name aus einer Werbung bekannt ist, genügt dieser. Ein exakter Rechtsträgername verbessert die Zuordnung.</span>
  </div>
  <div class="dualField">
    <label for="domainQuery" data-dual-de="Website / Domain" data-dual-en="Website / domain">Website / Domain</label>
    <div class="dualInputWrap">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>
      <input id="domainQuery" class="dualInput" inputmode="url" autocapitalize="none" autocomplete="url" placeholder="z. B. db.com">
    </div>
    <span class="dualHelp" data-dual-de="Nur die Domain genügt; Unterseiten sind nicht notwendig." data-dual-en="The domain is enough; no subpage is required.">Nur die Domain genügt; Unterseiten sind nicht notwendig.</span>
  </div>
  <button type="button" class="dualSearchBtn" id="dualSearchBtn" disabled>FRÜHWARN-CHECK STARTEN</button>`;
oldRow.parentNode.insertBefore(dual,oldRow);
const validation=document.createElement('div');
validation.className='dualValidation';
validation.id='dualValidation';
oldRow.parentNode.insertBefore(validation,oldRow.nextSibling);

const company=$('#companyQuery');
const domain=$('#domainQuery');
const btn=$('#dualSearchBtn');
const feedback=$('#searchFeedback');

function normalizeDomain(v){
 let s=String(v||'').trim().toLowerCase();
 s=s.replace(/^https?:\/\//,'').replace(/^\/\//,'').split('/')[0].split('?')[0].split('#')[0].replace(/^www\./,'').replace(/\.$/,'');
 return s;
}
function validDomain(v){
 const s=normalizeDomain(v);
 if(!s||s.length>253||!s.includes('.'))return false;
 const parts=s.split('.');
 if(parts.length<2||parts.some(p=>!p||p.length>63||!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(p)))return false;
 return /^[a-z]{2,63}$/.test(parts.at(-1))||/^xn--[a-z0-9-]+$/.test(parts.at(-1));
}
function validCompany(v){
 const s=String(v||'').trim();
 if(!s)return false;
 if(/^https?:\/\//i.test(s))return false;
 return (s.match(/[\p{L}\p{N}]/gu)||[]).length>=3;
}
function current(){
 const c=company.value.trim();
 const d=normalizeDomain(domain.value);
 return {company:c,domain:d};
}
function contextLabel(ctx){return [ctx.company,ctx.domain].filter(Boolean).join(' · ')}
function updateContext(){window.__fruehwarnInputContext=current();return window.__fruehwarnInputContext;}
function validity(){
 const ctx=current();
 const companyOK=!ctx.company||validCompany(ctx.company);
 const domainRaw=domain.value.trim();
 const domainOK=!domainRaw||validDomain(domainRaw);
 return {ctx,companyOK,domainOK,ok:!!(ctx.company||domainRaw)&&companyOK&&domainOK};
}
function applyLanguage(){
 const en=document.documentElement.lang==='en';
 document.querySelectorAll('[data-dual-de]').forEach(el=>{el.textContent=en?el.dataset.dualEn:el.dataset.dualDe});
 btn.textContent=en?'START EARLY WARNING CHECK':'FRÜHWARN-CHECK STARTEN';
 if(topLabel)topLabel.textContent=en?'Enter the name or identity you know':'Bekannten Namen oder Identität eingeben';
 if(oldHint)oldHint.textContent=en?'Enter the company, project or brand name and/or website domain. A name from an advert is enough to start; if both are known, both are checked together.':'Firmen-, Projekt- oder Markennamen und/oder die Website-Domain eingeben. Auch ein Name aus einer Werbung genügt zum Start; sind beide Angaben bekannt, werden sie gemeinsam geprüft.';
 validate(false);
}
function invalidateOldResult(){
 const ctx=updateContext();
 const shell=$('#resultShell');
 if(shell)shell.classList.remove('show');
 const queryOut=$('#queryOut');if(queryOut)queryOut.textContent='';document.querySelectorAll('.domainResultKey').forEach(el=>el.remove());
 document.querySelectorAll('.layers,.sourceStatus').forEach(el=>el.style.display='none');
 document.querySelectorAll('.sourceStatus details').forEach(d=>d.open=false);
 engineInput.value=ctx.company||ctx.domain||'';
 engineInput.dispatchEvent(new Event('input',{bubbles:true}));
 history.replaceState(null,'',location.pathname);
}
function validate(showMessage=true){
 const v=validity();
 company.classList.toggle('invalid',!!v.ctx.company&&!v.companyOK);
 domain.classList.toggle('invalid',!!domain.value.trim()&&!v.domainOK);
 btn.disabled=!v.ok;
 if(showMessage&&(!v.companyOK||!v.domainOK)){
   const en=document.documentElement.lang==='en';
   validation.textContent=!v.companyOK?(en?'Please enter a plausible company/legal entity name.':'Bitte einen plausiblen Firmen-/Rechtsträgernamen eingeben.'):(en?'Please enter a valid domain, e.g. example.com.':'Bitte eine gültige Domain eingeben, z. B. example.com.');
   validation.classList.add('show');
 }else validation.classList.remove('show');
 return v;
}
function onEdit(){invalidateOldResult();validate(true);}
company.addEventListener('input',onEdit);
domain.addEventListener('input',onEdit);
domain.addEventListener('blur',()=>{if(validDomain(domain.value)){domain.value=normalizeDomain(domain.value);updateContext();}});
company.addEventListener('keydown',e=>{if(e.key==='Enter'&&!btn.disabled)start()});
domain.addEventListener('keydown',e=>{if(e.key==='Enter'&&!btn.disabled)start()});

function start(){
 const v=validate(true);if(!v.ok)return;
 const ctx=updateContext();
 engineInput.value=ctx.company||ctx.domain;
 btn.disabled=true;
 btn.textContent=document.documentElement.lang==='en'?'CHECKING …':'PRÜFUNG LÄUFT …';
 engineBtn.click();
 setTimeout(()=>{
   const p=new URLSearchParams();
   p.set('q',ctx.company||ctx.domain);
   if(ctx.company)p.set('company',ctx.company);
   if(ctx.domain)p.set('domain',ctx.domain);
   history.replaceState(null,'','?'+p.toString());
   if(feedback&&feedback.classList.contains('checking'))feedback.textContent=(document.documentElement.lang==='en'?'Check started for: ':'Prüfung gestartet für: ')+contextLabel(ctx);
 },0);
}
btn.addEventListener('click',start);

window.addEventListener('fruehwarn:search-finished',()=>{
 const ctx=updateContext();
 const shown=$('#queryOut')?.textContent.trim()||'';
 const primary=ctx.company||ctx.domain;
 if(!primary||shown!==primary)return;
 const en=document.documentElement.lang==='en';
 btn.textContent=en?'CHECK COMPLETED ✓':'PRÜFUNG ABGESCHLOSSEN ✓';
 if(feedback){feedback.className='searchFeedback show done';feedback.textContent='✓ '+(en?'Check completed for: ':'Prüfung abgeschlossen für: ')+contextLabel(ctx);}
 const line=document.querySelector('.queryLine');
 if(line)line.querySelectorAll('.domainResultKey').forEach(el=>el.remove());
 if(line&&ctx.domain){
   const span=document.createElement('span');span.className='domainResultKey';span.textContent=(en?'Domain: ':'Domain: ')+ctx.domain;line.appendChild(span);
 }
 setTimeout(()=>{validate(false);},900);
});

document.addEventListener('click',e=>{if(e.target&&e.target.id==='langBtn')setTimeout(applyLanguage,20)});

const params=new URLSearchParams(location.search);
const savedCompany=params.get('company')||'';
const savedDomain=params.get('domain')||'';
const legacy=params.get('q')||'';
if(savedCompany||savedDomain){company.value=savedCompany;domain.value=savedDomain;}
else if(legacy){if(validDomain(legacy))domain.value=normalizeDomain(legacy);else company.value=legacy;}
updateContext();
applyLanguage();
})();
