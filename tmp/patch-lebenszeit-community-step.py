from pathlib import Path
p=Path('hoersaal-liquiditybooster/07-rechner-lebenszeit.html')
s=p.read_text(encoding='utf-8')
old='<div class="eco-step"><b>4 · weitere Produkte</b><span>provisionsfähige Umsätze</span></div>'
new='<div class="eco-step"><b>4 · Community-Angebote</b><span>20 % Cashback für Club Partner & Club Leader</span></div>'
if old not in s: raise SystemExit('community step not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('patched')
