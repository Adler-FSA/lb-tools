#!/usr/bin/env python3
from pathlib import Path

# 1) Control Panel: laufende Fälle automatisch nachladen und sichtbaren Zwischenstand zeigen.
p = Path('pages/projekt-check/control-panel.html')
s = p.read_text(encoding='utf-8')

old = "  let lang='de',archiveItems=[];\n"
new = "  let lang='de',archiveItems=[],liveRefreshTimer=null;\n"
assert old in s
s = s.replace(old, new, 1)

old = "  async function loadCase(){const id=document.getElementById('caseId').value.trim();if(!id){msg.className='message error';msg.textContent=lang==='de'?'Bitte zuerst eine Case ID eingeben.':'Enter a case ID first.';return}msg.className='message';msg.textContent=lang==='de'?'Lade Fall …':'Loading case …';try{const data=await getCaseData(id),byId=new Map((Array.isArray(data.checks)?data.checks:[]).map(c=>[Number(c.id),c]));checks=defs.map(d=>Object.assign({id:d[0],workflow_status:'wartet',result_status:null,evidence_count:0,summary:'',perspectives:{customer:{status:'wartet'},company:{status:'wartet'},academy:{status:'wartet'}}},byId.get(d[0])||{}));document.getElementById('metaCase').textContent=data.case_id||id;document.getElementById('metaState').textContent=data.state||'—';document.getElementById('metaIdentity').textContent=(data.identity&&data.identity.label)||((data.identity&&data.identity.status)||'—');document.getElementById('metaTraffic').textContent=data.overall_rating||data.traffic_light||'—';document.getElementById('metaDelivery').textContent=outputLabel(data.delivery_document);renderDocuments(data.documents||{});msg.className='message ok';msg.textContent=lang==='de'?'Analysefall geladen.':'Analysis case loaded.';render()}catch{msg.className='message error';msg.textContent=lang==='de'?'Der Analysefall ist noch nicht angelegt oder GitHub verarbeitet den Commit noch.':'The analysis case has not been created yet or GitHub is still processing the commit.'}}"
new = "  function scheduleLiveRefresh(state){if(liveRefreshTimer){clearTimeout(liveRefreshTimer);liveRefreshTimer=null}if(['angenommen','identifizierung','recherche','auswertung','pdf_erstellung'].includes(String(state||''))){liveRefreshTimer=setTimeout(()=>loadCase(true),5000)}}\n  async function loadCase(silent=false){const id=document.getElementById('caseId').value.trim();if(!id){msg.className='message error';msg.textContent=lang==='de'?'Bitte zuerst eine Case ID eingeben.':'Enter a case ID first.';return}if(!silent){msg.className='message';msg.textContent=lang==='de'?'Lade Fall …':'Loading case …'}try{const data=await getCaseData(id),byId=new Map((Array.isArray(data.checks)?data.checks:[]).map(c=>[Number(c.id),c]));checks=defs.map(d=>Object.assign({id:d[0],workflow_status:'wartet',result_status:null,evidence_count:0,summary:'',perspectives:{customer:{status:'wartet'},company:{status:'wartet'},academy:{status:'wartet'}}},byId.get(d[0])||{}));document.getElementById('metaCase').textContent=data.case_id||id;document.getElementById('metaState').textContent=data.state||'—';document.getElementById('metaIdentity').textContent=(data.identity&&data.identity.label)||((data.identity&&data.identity.status)||'—');document.getElementById('metaTraffic').textContent=data.overall_rating||data.traffic_light||'—';document.getElementById('metaDelivery').textContent=outputLabel(data.delivery_document);renderDocuments(data.documents||{});const ev=Math.max(0,...checks.map(c=>Number(c.evidence_count)||0));msg.className='message ok';if(data.state==='angenommen')msg.textContent=lang==='de'?'Fall angelegt – GitHub startet Identifizierung und Recherche …':'Case created – GitHub is starting identification and research …';else if(data.state==='identifizierung')msg.textContent=lang==='de'?'Identifizierung läuft – öffentliche Spuren werden geöffnet …':'Identification running – opening public traces …';else if(data.state==='recherche')msg.textContent=lang==='de'?`Recherche-Zwischenstand geladen – ${ev} Belege erfasst.`:`Research progress loaded – ${ev} evidence items captured.`;else msg.textContent=lang==='de'?'Analysefall geladen.':'Analysis case loaded.';render();scheduleLiveRefresh(data.state)}catch{msg.className='message error';msg.textContent=lang==='de'?'Der Analysefall ist noch nicht angelegt oder GitHub verarbeitet den Commit noch.':'The analysis case has not been created yet or GitHub is still processing the commit.';if(liveRefreshTimer){clearTimeout(liveRefreshTimer);liveRefreshTimer=null}}}"
assert old in s
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# 2) Browser-Probe: Projekt-Hosts einfrieren; externe Einmalquellen dürfen keine eigenen Unterseiten nachziehen.
p = Path('projekt-check-engine/identify/browser_probe.py')
s = p.read_text(encoding='utf-8')
old = "def choose_priority_links(probes: list[dict], limit: int = 14) -> list[str]:\n"
new = "def choose_priority_links(probes: list[dict], limit: int = 14, project_hosts: set[str] | None = None) -> list[str]:\n"
assert old in s
s = s.replace(old, new, 1)
old = "    primary_hosts = {host_of(p.get(\"final_url\") or p.get(\"requested_url\") or \"\") for p in probes}\n    primary_hosts.discard(\"\")\n\n    candidates: dict[str, tuple[int, int, str]] = {}\n"
new = "    primary_hosts = set(project_hosts or {host_of(p.get(\"final_url\") or p.get(\"requested_url\") or \"\") for p in probes})\n    primary_hosts.discard(\"\")\n\n    candidates: dict[str, tuple[int, int, str]] = {}\n\n    def probe_is_project_source(probe: dict) -> bool:\n        if probe.get(\"source_type\") != \"website\":\n            return False\n        host = host_of(probe.get(\"final_url\") or probe.get(\"requested_url\") or \"\")\n        return _hosts_related(host, primary_hosts)\n"
assert old in s
s = s.replace(old, new, 1)
s = s.replace("        if probe.get(\"source_type\") != \"website\":\n            continue\n        for link in probe.get(\"navigation_links\") or []:\n", "        if not probe_is_project_source(probe):\n            continue\n        for link in probe.get(\"navigation_links\") or []:\n", 1)
s = s.replace("        if probe.get(\"source_type\") != \"website\":\n            continue\n        for action in probe.get(\"link_actions\") or []:\n", "        if not probe_is_project_source(probe):\n            continue\n        for action in probe.get(\"link_actions\") or []:\n", 1)
s = s.replace("        if probe.get(\"source_type\") != \"website\":\n            continue\n        for link in probe.get(\"links\") or []:\n", "        if not probe_is_project_source(probe):\n            continue\n        for link in probe.get(\"links\") or []:\n", 1)
p.write_text(s, encoding='utf-8')

# 3) Discovery: Projekt-Hosts aus dem ursprünglichen Projekt einfrieren und an den Link-Chooser geben.
p = Path('projekt-check-engine/core/run_discovery.py')
s = p.read_text(encoding='utf-8')
old = "from identify.browser_probe import choose_priority_links, probe_urls\n"
new = "from identify.browser_probe import choose_priority_links, host_of, probe_urls\n"
assert old in s
s = s.replace(old, new, 1)
old = "        initial_probes = probe_urls(traces)\n        probes = list(initial_probes)\n        seen_urls: set[str] = set()\n"
new = "        initial_probes = probe_urls(traces)\n        probes = list(initial_probes)\n        project_hosts = {host_of(p.get('final_url') or p.get('requested_url') or '') for p in initial_probes if p.get('source_type') == 'website'}\n        project_hosts.discard('')\n        # Sichere sichtbare Home-Navigation darf eine offizielle Projekt-Domain ergänzen.\n        for p in initial_probes:\n            for action in p.get('link_actions') or []:\n                label = ' '.join(str(action.get('label') or '').lower().split())\n                url = canonical_url(action.get('url') or '')\n                if url and any(x in label for x in ('back to home','homepage','startseite')):\n                    h = host_of(url)\n                    if h:\n                        project_hosts.add(h)\n        seen_urls: set[str] = set()\n"
assert old in s
s = s.replace(old, new, 1)
old = "            candidates = choose_priority_links(probes, limit=min(max(remaining * 2, remaining), 40))\n"
new = "            candidates = choose_priority_links(probes, limit=min(max(remaining * 2, remaining), 40), project_hosts=project_hosts)\n"
assert old in s
s = s.replace(old, new, 1)
old = "        discovery[\"expanded_trace_count\"] = len(expanded_urls)\n"
new = "        discovery[\"expanded_trace_count\"] = len(expanded_urls)\n        discovery[\"project_hosts\"] = sorted(project_hosts)\n"
assert old in s
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# 4) Contract-Test: Scope-Fix und Live-Refresh dauerhaft absichern.
p = Path('projekt-check-engine/tests/test_discovery_contract.py')
s = p.read_text(encoding='utf-8')
insert = '''\n    def test_external_one_hop_sources_do_not_become_new_project_trees(self):\n        module = load_module(BROWSER_PROBE, "pc_browser_probe_scope")\n        probes = [\n            {\n                "requested_url": "https://project.example/",\n                "final_url": "https://project.example/",\n                "source_type": "website",\n                "navigation_links": [],\n                "link_actions": [{"label": "Whitepaper", "url": "https://docs.example/view/abc"}],\n                "links": ["https://project.example/terms"],\n            },\n            {\n                "requested_url": "https://docs.example/view/abc",\n                "final_url": "https://docs.example/view/abc",\n                "source_type": "website",\n                "navigation_links": [],\n                "link_actions": [],\n                "links": ["https://stripe.com/privacy", "https://docs.example/legal"],\n            },\n        ]\n        links = module.choose_priority_links(probes, limit=20, project_hosts={"project.example"})\n        self.assertIn("https://project.example/terms", links)\n        self.assertIn("https://docs.example/view/abc", links)\n        self.assertNotIn("https://stripe.com/privacy", links)\n        self.assertNotIn("https://docs.example/legal", links)\n'''
marker = "    def test_discovery_is_multistage_and_bounded(self):\n"
assert marker in s
s = s.replace(marker, insert + "\n" + marker, 1)
p.write_text(s, encoding='utf-8')
