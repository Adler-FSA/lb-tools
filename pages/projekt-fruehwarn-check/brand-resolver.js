(()=>{
const $=s=>document.querySelector(s);
const company=$('#companyQuery');
const domain=$('#domainQuery');
const searchBtn=$('#dualSearchBtn');
if(!company||!domain||!searchBtn)return;

const style=document.createElement('style');
style.textContent=`
.brandResolverNote{display:block;margin-top:8px;padding:9px 10px;border-radius:10px;border:1px solid #cfe9ec;background:var(--mint-soft);color:#35616a;font-size:.78rem;line-height:1.45}
.brandResolverNote strong{display:block;color:var(--navy);margin-bottom:2px}
.brandResolverNote a{color:var(--mint-dark);font-weight:900;text-decoration:none}
.brandResolverKey{display:inline-block;margin-left:8px;color:var(--mint-dark);font-size:.86rem;font-weight:800}
`;
document.head.appendChild(style);

let seq=0;
let lastDiscovery=null;
let resolvingKey='';
const tlds=['com','de','io','net','org','finance','app','co'];

function normText(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function compact(v){return normText(v).replace(/[^a-z0-9]/g,'');}
function looksLikeLegalEntity(v){return /\b(gmbh|ag|aktiengesellschaft|gesellschaft mit beschrankter haftung|ug|se|kg|ohg|gbr|ltd\.?|limited|llc|inc\.?|corp\.?|s\.?a\.?|s\.?p\.?a\.?|sarl|plc|bv|nv|s\.?r\.?o\.?)\b/i.test(String(v||''));}
function brandVariants(v){
 const n=normText(v);if(!n)return[];
 const words=n.split(' ').filter(Boolean);
 const joined=words.join('');
 const hyphen=words.join('-');
 return [...new Set([joined,hyphen].filter(x=>x.length>=4&&x.length<=50))];
}
function candidates(v){
 const stems=brandVariants(v);const out=[];
 for(const stem of stems)for(const tld of tlds)out.push(`${stem}.${tld}`);
 return [...new Set(out)].slice(0,16);
}
async function fetchTimeout(url,options={},ms=9000){
 const ac=new AbortController();const id=setTimeout(()=>ac.abort(),ms);
 try{return await fetch(url,{...options,signal:ac.signal});}finally{clearTimeout(id);}
}
async function dnsExists(host){
 try{
  const u='https://dns.google/resolve?name='+encodeURIComponent(host)+'&type=A';
  const r=await fetchTimeout(u,{headers:{Accept:'application/dns-json'}},5500);
  if(!r.ok)return false;const j=await r.json();
  return Number(j.Status)===0&&Array.isArray(j.Answer)&&j.Answer.some(a=>[1,5].includes(Number(a.type)));
 }catch(_){return false;}
}
async function readWebsite(host){
 const urls=['https://r.jina.ai/https://'+host,'https://r.jina.ai/http://'+host];
 for(const url of urls){
  try{
   const r=await fetchTimeout(url,{headers:{Accept:'text/plain'}},12000);
   if(!r.ok)continue;const text=await r.text();if(text&&text.length>120)return text.slice(0,120000);
  }catch(_){ }
 }
 return '';
}
function verifyWebsite(text,brand,host){
 if(!text)return null;
 const b=compact(brand);if(b.length<4)return null;
 const textKey=compact(text.slice(0,80000));
 const headKey=compact(text.slice(0,1800));
 const stem=compact(host.split('.')[0]);
 const brandSeen=textKey.includes(b);
 if(!brandSeen)return null;
 let score=0;
 if(stem===b)score+=60;
 if(headKey.includes(b))score+=35;
 const occurrences=(textKey.match(new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
 if(occurrences>=2)score+=15;
 const finance=/(apy|staking|yield|rendite|deposit|einzahlung|crypto|krypto|earn|interest|zinsen)/i.test(text);
 if(finance)score+=5;
 const apyMatch=text.match(/(?:bis\s+zu|up\s+to)?\s*(\d{1,2}(?:[.,]\d+)?)\s*%\s*APY/i);
 return {domain:host,score,text,finance,apy:apyMatch?apyMatch[1].replace(',','.'):''};
}
function cleanupNotes(){
 document.querySelectorAll('.brandResolverNote,.brandResolverKey').forEach(el=>el.remove());
}
function addResultKey(d){
 const line=document.querySelector('.queryLine');if(!line)return;
 line.querySelectorAll('.brandResolverKey').forEach(el=>el.remove());
 const s=document.createElement('span');s.className='brandResolverKey';s.textContent='Webspur: '+d;line.appendChild(s);
}
function appendIdentityNote(discovery){
 const box=$('#layerStatus-identity');if(!box)return;
 box.querySelectorAll('.brandResolverNote').forEach(el=>el.remove());
 const n=document.createElement('span');n.className='brandResolverNote';
 n.innerHTML='<strong>Öffentliche Webspur automatisch gefunden.</strong>Die Domain <b>'+escapeHtml(discovery.domain)+'</b> wurde technisch aufgelöst und der eingegebene Name wurde auf der öffentlich abrufbaren Website bestätigt. Diese Zuordnung ist eine Webspur, noch kein Register- oder Betreiberbeweis.<br><a href="https://'+escapeHtml(discovery.domain)+'" target="_blank" rel="noopener">Website öffnen ↗</a>';
 box.appendChild(n);
}
function appendAdsNote(discovery){
 const box=$('#layerStatus-ads');if(!box)return;
 box.className='layerStatus partial';
 let claim='Öffentliche Website-/Werbespur gefunden: <b>'+escapeHtml(discovery.domain)+'</b> bestätigt den eingegebenen Namen.';
 if(discovery.apy)claim+=' Auf der Website wurde eine APY-Angabe von <b>'+escapeHtml(discovery.apy)+' %</b> erkannt.';
 claim+=' Werbung bzw. Renditeangaben sind für sich allein kein Betrugsnachweis.';
 box.innerHTML='<strong>Öffentliche Webspur automatisch geprüft.</strong><br>'+claim+'<br><a href="https://'+escapeHtml(discovery.domain)+'" target="_blank" rel="noopener">Website öffnen ↗</a>';
}
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function applyDiscovery(discovery){
 if(!discovery)return;
 addResultKey(discovery.domain);
 appendIdentityNote(discovery);
 appendAdsNote(discovery);
}
function showSearching(){
 const box=$('#layerStatus-identity');if(!box)return;
 if(box.querySelector('.brandResolverNote'))return;
 const n=document.createElement('span');n.className='brandResolverNote';n.innerHTML='<strong>Öffentliche Webspur wird automatisch gesucht …</strong>Der bekannte Name wird gegen technisch erreichbare, exakt passende Domainvarianten geprüft.';box.appendChild(n);
}
function showNoVerifiedDomain(){
 const box=$('#layerStatus-identity');if(!box)return;
 box.querySelectorAll('.brandResolverNote').forEach(el=>el.remove());
 const n=document.createElement('span');n.className='brandResolverNote';n.innerHTML='<strong>Keine Webspur automatisch bestätigt.</strong>Unter den geprüften exakten Domainvarianten konnte keine Website sicher dem eingegebenen Namen zugeordnet werden. Es wird deshalb keine Domain automatisch ergänzt.';box.appendChild(n);
}
async function resolveBrand(brand,mySeq){
 const key=compact(brand);if(!key||key.length<4)return null;
 const list=candidates(brand);
 const dns=await Promise.all(list.map(async d=>({domain:d,ok:await dnsExists(d)})));
 if(mySeq!==seq)return null;
 const live=dns.filter(x=>x.ok).map(x=>x.domain).slice(0,5);
 if(!live.length)return null;
 const verified=[];
 for(const host of live){
  if(mySeq!==seq)return null;
  const text=await readWebsite(host);
  const v=verifyWebsite(text,brand,host);if(v)verified.push(v);
 }
 if(!verified.length)return null;
 verified.sort((a,b)=>b.score-a.score);
 if(verified.length>1&&verified[0].score<verified[1].score+20)return {ambiguous:true,candidates:verified.slice(0,3)};
 return verified[0];
}
function rerunWithDomain(discovery){
 const d=discovery.domain;if(!d||domain.value.trim())return;
 lastDiscovery=discovery;
 domain.value=d;
 domain.dispatchEvent(new Event('input',{bubbles:true}));
 setTimeout(()=>{if(!searchBtn.disabled)searchBtn.click();},80);
}
async function onFinished(){
 const ctx=window.__fruehwarnInputContext||{};
 const brand=String(ctx.company||'').trim();
 const d=String(ctx.domain||'').trim();
 if(lastDiscovery&&d===lastDiscovery.domain){setTimeout(()=>applyDiscovery(lastDiscovery),80);return;}
 if(!brand||d||looksLikeLegalEntity(brand))return;
 const key=compact(brand);if(!key||resolvingKey===key)return;
 resolvingKey=key;const mySeq=++seq;showSearching();
 try{
  const result=await resolveBrand(brand,mySeq);
  if(mySeq!==seq)return;
  if(result&&!result.ambiguous&&result.domain){rerunWithDomain(result);return;}
  showNoVerifiedDomain();
 }finally{if(resolvingKey===key)resolvingKey='';}
}
function invalidate(){seq++;resolvingKey='';lastDiscovery=null;cleanupNotes();}
company.addEventListener('input',invalidate);
domain.addEventListener('input',()=>{if(lastDiscovery&&domain.value.trim()!==lastDiscovery.domain)lastDiscovery=null;cleanupNotes();});
window.addEventListener('fruehwarn:search-finished',()=>setTimeout(onFinished,120));
})();
