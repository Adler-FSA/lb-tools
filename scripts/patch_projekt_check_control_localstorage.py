#!/usr/bin/env python3
from pathlib import Path

path = Path('pages/projekt-check/control-panel.html')
text = path.read_text(encoding='utf-8')

old = "const REPO='Adler-FSA/lb-tools',TOKEN_KEY='projektCheckControlGithubToken',MISSION_TOKEN_KEY='md_control_github_token',START_DIR='data/projekt-check/start-requests';"
new = "const REPO='Adler-FSA/lb-tools',TOKEN_KEY='projektCheckControlGithubToken',MISSION_TOKEN_KEY='md_control_github_token',DRAFT_KEY='projektCheckControlDraftV1',START_DIR='data/projekt-check/start-requests';"
assert old in text, 'Konstantenblock nicht gefunden'
text = text.replace(old, new, 1)

anchor = "  function token(){return localStorage.getItem(TOKEN_KEY)||localStorage.getItem(MISSION_TOKEN_KEY)||''}\n"
insert = """  function token(){return localStorage.getItem(TOKEN_KEY)||localStorage.getItem(MISSION_TOKEN_KEY)||''}\n  function saveDraft(){try{localStorage.setItem(DRAFT_KEY,JSON.stringify({traces:document.getElementById('traceInput').value,claim:document.getElementById('claimInput').value,caseId:document.getElementById('caseId').value.trim(),savedAt:new Date().toISOString()}))}catch{}}\n  function restoreDraft(){try{const raw=localStorage.getItem(DRAFT_KEY);if(!raw)return;const d=JSON.parse(raw);if(typeof d.traces==='string')document.getElementById('traceInput').value=d.traces;if(typeof d.claim==='string')document.getElementById('claimInput').value=d.claim;if(typeof d.caseId==='string')document.getElementById('caseId').value=d.caseId}catch{}}\n"""
assert anchor in text, 'token()-Anker nicht gefunden'
text = text.replace(anchor, insert, 1)

old_start = "document.getElementById('caseId').value=caseId;state.className='start-state ok';"
new_start = "document.getElementById('caseId').value=caseId;saveDraft();state.className='start-state ok';"
assert old_start in text, 'Start-Fall-ID-Anker nicht gefunden'
text = text.replace(old_start, new_start, 1)

old_archive = "document.getElementById('caseId').value=b.dataset.case||'';loadCase();"
new_archive = "document.getElementById('caseId').value=b.dataset.case||'';saveDraft();loadCase();"
assert old_archive in text, 'Archiv-Fall-ID-Anker nicht gefunden'
text = text.replace(old_archive, new_archive, 1)

old_listeners = "  document.getElementById('startDirectBtn').addEventListener('click',startDirect);document.getElementById('loadBtn').addEventListener('click',loadCase);document.getElementById('refreshBtn').addEventListener('click',loadCase);document.getElementById('archiveRefreshBtn').addEventListener('click',loadArchive);document.getElementById('archiveSearch').addEventListener('input',renderArchive);document.getElementById('deBtn').addEventListener('click',()=>setLang('de'));document.getElementById('enBtn').addEventListener('click',()=>setLang('en'));\n  const qp=new URLSearchParams(location.search).get('case');if(qp){document.getElementById('caseId').value=qp;loadCase()}else{render();renderDocuments({})}loadArchive();"
new_listeners = "  document.getElementById('startDirectBtn').addEventListener('click',startDirect);document.getElementById('loadBtn').addEventListener('click',()=>{saveDraft();loadCase()});document.getElementById('refreshBtn').addEventListener('click',()=>{saveDraft();loadCase()});document.getElementById('archiveRefreshBtn').addEventListener('click',loadArchive);document.getElementById('archiveSearch').addEventListener('input',renderArchive);document.getElementById('deBtn').addEventListener('click',()=>setLang('de'));document.getElementById('enBtn').addEventListener('click',()=>setLang('en'));\n  ['traceInput','claimInput','caseId'].forEach(id=>document.getElementById(id).addEventListener('input',saveDraft));window.addEventListener('pagehide',saveDraft);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveDraft()});\n  restoreDraft();const qp=new URLSearchParams(location.search).get('case');if(qp){document.getElementById('caseId').value=qp;saveDraft();loadCase()}else if(document.getElementById('caseId').value.trim()){render();renderDocuments({});loadCase()}else{render();renderDocuments({})}loadArchive();"
assert old_listeners in text, 'Listener-/Init-Anker nicht gefunden'
text = text.replace(old_listeners, new_listeners, 1)

path.write_text(text, encoding='utf-8')
print('LocalStorage-Patch angewendet:', path)
