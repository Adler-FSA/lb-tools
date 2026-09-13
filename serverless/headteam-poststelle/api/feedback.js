const crypto = require('crypto');

const ALLOWED_ORIGINS = new Set([
  'https://tools.liquiditybooster.de',
  'https://adler-fsa.github.io'
]);
const SENDERS = new Set(['alexander','oliver','peter','daniel','mike']);
const TYPES = new Set(['aenderungswunsch','frage','fehler','freigabe']);

function cors(req,res){
  const origin=req.headers.origin||'';
  if(ALLOWED_ORIGINS.has(origin))res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS,GET');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
}
function decodeBase64Utf8(value){return Buffer.from(String(value||'').replace(/\n/g,''),'base64').toString('utf8')}
function encodeBase64Utf8(value){return Buffer.from(value,'utf8').toString('base64')}
function safeSlug(value){return String(value||'feedback').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,32)||'feedback'}

module.exports = async function handler(req,res){
  cors(req,res);
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method==='GET')return res.status(200).json({ok:true,service:'headteam-poststelle',version:1});
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});

  const token=process.env.GITHUB_TOKEN;
  const repo=process.env.GITHUB_REPO||'Adler-FSA/lb-tools';
  const branch=process.env.GITHUB_BRANCH||'main';
  if(!token)return res.status(500).json({ok:false,error:'Poststelle is not configured'});

  let body=req.body;
  if(typeof body==='string'){try{body=JSON.parse(body)}catch(e){body={}}}
  body=body||{};
  const projectId=String(body.projectId||'').trim();
  const sender=String(body.sender||'').trim();
  const type=String(body.type||'').trim();
  const message=String(body.message||'').trim();
  if(!projectId)return res.status(400).json({ok:false,error:'Project id missing'});
  if(!SENDERS.has(sender))return res.status(400).json({ok:false,error:'Unknown sender'});
  if(!TYPES.has(type))return res.status(400).json({ok:false,error:'Unknown feedback type'});
  if(message.length<1||message.length>2500)return res.status(400).json({ok:false,error:'Message length invalid'});

  const ghHeaders={
    'Accept':'application/vnd.github+json',
    'Authorization':'Bearer '+token,
    'X-GitHub-Api-Version':'2022-11-28',
    'User-Agent':'LiquidityBooster-Headteam-Poststelle'
  };

  try{
    const dataUrl=`https://api.github.com/repos/${repo}/contents/data/headteam-vorlauf.json?ref=${encodeURIComponent(branch)}`;
    const dataResp=await fetch(dataUrl,{headers:ghHeaders});
    if(!dataResp.ok)throw new Error('Project data unavailable');
    const dataFile=await dataResp.json();
    const data=JSON.parse(decodeBase64Utf8(dataFile.content));
    const all=[...(Array.isArray(data.projects)?data.projects:[]),...(Array.isArray(data.archive)?data.archive:[])];
    const project=all.find(p=>String(p.id||'')===projectId);
    if(!project)return res.status(400).json({ok:false,error:'Project is not known'});

    const now=new Date().toISOString();
    const feedback={
      version:1,
      id:crypto.randomUUID(),
      status:'open',
      projectId:project.id||projectId,
      projectTitle:project.title||'',
      projectCategory:project.category||'',
      projectUrl:project.url||'',
      sender,
      type,
      message,
      createdAt:now,
      source:'headteam-3'
    };
    const stamp=now.replace(/[-:.TZ]/g,'').slice(0,14);
    const filename=`${stamp}-${safeSlug(sender)}-${feedback.id.slice(0,8)}.json`;
    const path=`data/headteam-poststelle/inbox/${filename}`;
    const putUrl=`https://api.github.com/repos/${repo}/contents/${path}`;
    const putResp=await fetch(putUrl,{method:'PUT',headers:{...ghHeaders,'Content-Type':'application/json'},body:JSON.stringify({message:`Headteam feedback: ${sender} · ${project.title||projectId}`,content:encodeBase64Utf8(JSON.stringify(feedback,null,2)),branch})});
    if(!putResp.ok){const t=await putResp.text();console.error('GitHub write failed',putResp.status,t);throw new Error('Mailbox write failed')}
    return res.status(201).json({ok:true,id:feedback.id,receivedAt:now});
  }catch(e){console.error(e);return res.status(500).json({ok:false,error:'Poststelle could not accept the message'})}
};
