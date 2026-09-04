from pathlib import Path

p=Path('hoersaal-liquiditybooster/07-rechner-lebenszeit.html')
s=p.read_text(encoding='utf-8')

# add matrix styles
needle=".mini-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:11px}"
repl=needle+".mix-wrap{margin-top:4px;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#fff}.mix-head,.mix-row{display:grid;grid-template-columns:minmax(190px,1.4fr) repeat(3,minmax(105px,.7fr));align-items:center}.mix-head{background:#f4fbfb;color:var(--muted);font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.mix-head>div,.mix-row>div{padding:10px 12px}.mix-row{border-top:1px solid var(--line)}.mix-product b{display:block;color:var(--navy);font-size:14px}.mix-product small{display:block;color:var(--muted);font-size:11px;margin-top:2px}.mix-row input{width:100%;min-height:44px;border:1px solid var(--line);border-radius:12px;padding:8px 10px;background:#fff;color:var(--navy);font-weight:850;text-align:center}.mix-summary{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.mix-summary span{display:inline-flex;padding:6px 9px;border-radius:999px;background:var(--mint-soft);color:#087d83;font-size:11px;font-weight:850}"
s=s.replace(needle,repl,1)
needle="@media(max-width:720px){.wrap{width:min(100% - 20px,1460px)}"
repl="@media(max-width:720px){.mix-wrap{overflow-x:auto}.mix-head,.mix-row{min-width:620px}.wrap{width:min(100% - 20px,1460px)}"
s=s.replace(needle,repl,1)

old='''<div class="input-panel lb"><h3>LiquidityBooster · Hörsaal</h3><div class="mini-grid"><div class="field"><label>Hörsaal-Paket</label><select id="product"><option value="basis">Basis · 399 € / Monat</option><option value="plus">Plus · 649 € / Monat</option><option value="pro">Pro · 899 € / Monat</option></select></div><div class="field"><label>Eigene neue Hörsäle / Monat · E1</label><input id="n1" type="number" min="0" step="1" value="1"></div><div class="field"><label>Neue Hörsäle / Monat · E2</label><input id="n2" type="number" min="0" step="1" value="0"></div><div class="field"><label>Neue Hörsäle / Monat · E3</label><input id="n3" type="number" min="0" step="1" value="0"></div><div class="field"><label>Betriebskosten / Monat</label><input id="lbCosts" type="number" min="0" step="50" value="0"></div><div class="field"><label>Fortführung</label><input value="100 % Modellannahme" disabled></div></div></div></div>'''
new='''<div class="input-panel lb"><h3>LiquidityBooster · Hörsaal</h3><p style="margin:-4px 0 12px;color:var(--muted);font-size:13px">Dein Produktmix: Trage für jedes Paket separat ein, wie viele neue provisionsfähige Hörsäle pro Monat auf welcher Ebene entstehen.</p><div class="mix-wrap"><div class="mix-head"><div>Hörsaal</div><div>E1 · 20 %</div><div>E2 · 15 %</div><div>E3 · 10 %</div></div><div class="mix-row"><div class="mix-product"><b>Basis · 399 € / Monat</b><small>990 € Setup</small></div><div><input id="basis1" aria-label="Basis Ebene 1" type="number" min="0" step="1" value="1"></div><div><input id="basis2" aria-label="Basis Ebene 2" type="number" min="0" step="1" value="0"></div><div><input id="basis3" aria-label="Basis Ebene 3" type="number" min="0" step="1" value="0"></div></div><div class="mix-row"><div class="mix-product"><b>Plus · 649 € / Monat</b><small>1.490 € Setup</small></div><div><input id="plus1" aria-label="Plus Ebene 1" type="number" min="0" step="1" value="0"></div><div><input id="plus2" aria-label="Plus Ebene 2" type="number" min="0" step="1" value="0"></div><div><input id="plus3" aria-label="Plus Ebene 3" type="number" min="0" step="1" value="0"></div></div><div class="mix-row"><div class="mix-product"><b>Pro · 899 € / Monat</b><small>1.990 € Setup</small></div><div><input id="pro1" aria-label="Pro Ebene 1" type="number" min="0" step="1" value="0"></div><div><input id="pro2" aria-label="Pro Ebene 2" type="number" min="0" step="1" value="0"></div><div><input id="pro3" aria-label="Pro Ebene 3" type="number" min="0" step="1" value="0"></div></div></div><div class="mix-summary"><span id="mixE1">E1: 1 neuer Hörsaal / Monat</span><span id="mixE2">E2: 0</span><span id="mixE3">E3: 0</span></div><div class="mini-grid" style="margin-top:12px"><div class="field"><label>Betriebskosten / Monat</label><input id="lbCosts" type="number" min="0" step="50" value="0"></div><div class="field"><label>Fortführung</label><input value="100 % Modellannahme" disabled></div></div></div></div>'''
if old not in s: raise SystemExit('main input block not found')
s=s.replace(old,new,1)

# add separate breadth product choice
old2='''<div class="width-body"><div class="width-inputs"><div class="field"><label>Personen in Ebene 1</label><input id="b1" type="number" min="0" step="1" value="100"></div><div class="field"><label>Jede E1 bringt Personen in E2</label><input id="b2" type="number" min="0" step="1" value="50"></div><div class="field"><label>Jede E2 bringt Personen in E3</label><input id="b3" type="number" min="0" step="1" value="25"></div><div class="field"><label>Hörsäle je Person</label><input id="salesPerPerson" type="number" min="0" step="1" value="1"></div></div>'''
new2='''<div class="width-body"><div class="width-inputs"><div class="field"><label>Personen in Ebene 1</label><input id="b1" type="number" min="0" step="1" value="100"></div><div class="field"><label>Jede E1 bringt Personen in E2</label><input id="b2" type="number" min="0" step="1" value="50"></div><div class="field"><label>Jede E2 bringt Personen in E3</label><input id="b3" type="number" min="0" step="1" value="25"></div><div class="field"><label>Hörsaal-Paket im Breitenbeispiel</label><select id="breadthProduct"><option value="basis">Basis · 399 €</option><option value="plus">Plus · 649 €</option><option value="pro">Pro · 899 €</option></select></div><div class="field"><label>Hörsäle je Person</label><input id="salesPerPerson" type="number" min="0" step="1" value="1"></div></div>'''
if old2 not in s: raise SystemExit('breadth input block not found')
s=s.replace(old2,new2,1)

oldfun="function monthlyNewCommission(p,d){const r=rates();let x=val('n1')*r[1];if(d>=2)x+=val('n2')*r[2];if(d>=3)x+=val('n3')*r[3];return x*p}"
newfun="""function productMixCommission(kind,d){const r=rates();let total=0;for(const [key,p] of Object.entries(products)){let weighted=val(key+'1')*r[1];if(d>=2)weighted+=val(key+'2')*r[2];if(d>=3)weighted+=val(key+'3')*r[3];total+=weighted*p[kind]}return total}\nfunction updateMixSummary(){const sum=lvl=>Object.keys(products).reduce((a,k)=>a+val(k+lvl),0);const e1=sum(1),e2=sum(2),e3=sum(3);$('mixE1').textContent='E1: '+num(e1)+(e1===1?' neuer Hörsaal / Monat':' neue Hörsäle / Monat');$('mixE2').textContent='E2: '+num(e2);$('mixE3').textContent='E3: '+num(e3)}"""
if oldfun not in s: raise SystemExit('monthlyNewCommission not found')
s=s.replace(oldfun,newfun,1)

oldsim="const age=val('age'),end=Math.max(age+1,val('endAge')),years=Math.max(1,Math.min(60,end-age)),months=Math.round(years*12),hours=val('hours'),salary=val('salary'),raise=val('raise')/100,empCosts=val('empCosts'),lbCosts=val('lbCosts'),target=val('target'),p=products[$('product').value];\n const recurringPerCohort=monthlyNewCommission(p.monthly,depth),setupPerMonth=monthlyNewCommission(p.setup,depth);"
newsim="const age=val('age'),end=Math.max(age+1,val('endAge')),years=Math.max(1,Math.min(60,end-age)),months=Math.round(years*12),hours=val('hours'),salary=val('salary'),raise=val('raise')/100,empCosts=val('empCosts'),lbCosts=val('lbCosts'),target=val('target');\n const recurringPerCohort=productMixCommission('monthly',depth),setupPerMonth=productMixCommission('setup',depth);updateMixSummary();"
if oldsim not in s: raise SystemExit('simulate header not found')
s=s.replace(oldsim,newsim,1)

oldbread="function updateBreadth(){const e1=val('b1'),each2=val('b2'),each3=val('b3'),spp=val('salesPerPerson'),e2=e1*each2,e3=e2*each3,total=e1+e2+e3,p=products[$('product').value],weighted=e1*.20+e2*.15+e3*.10;"
newbread="function updateBreadth(){const e1=val('b1'),each2=val('b2'),each3=val('b3'),spp=val('salesPerPerson'),e2=e1*each2,e3=e2*each3,total=e1+e2+e3,p=products[$('breadthProduct').value],weighted=e1*.20+e2*.15+e3*.10;"
if oldbread not in s: raise SystemExit('breadth function not found')
s=s.replace(oldbread,newbread,1)

oldevents="['age','endAge','hours','target','salary','raise','empCosts','product','n1','n2','n3','lbCosts','b1','b2','b3','salesPerPerson'].forEach(id=>$(id).addEventListener('input',simulate));"
newevents="['age','endAge','hours','target','salary','raise','empCosts','basis1','basis2','basis3','plus1','plus2','plus3','pro1','pro2','pro3','lbCosts','breadthProduct','b1','b2','b3','salesPerPerson'].forEach(id=>$(id).addEventListener('input',simulate));"
if oldevents not in s: raise SystemExit('events line not found')
s=s.replace(oldevents,newevents,1)

p.write_text(s,encoding='utf-8')
print('patched',p)
