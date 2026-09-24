import {DEMO_LEARNING_STEPS} from './demo-guide.js';
import {safeLoadProject,updateStoragePill,escapeText} from './ui-core.js';
import {getLanguage,initI18n} from './i18n.js';

const I18N={
 navHome:{de:'Meine Zentrale',en:'My dashboard'},navProperties:{de:'Immobilien',en:'Properties'},navRental:{de:'Mietservice',en:'Tenant service'},navCosts:{de:'Kosten & Abrechnung',en:'Costs & billing'},navChecks:{de:'Sicherheit & Checks',en:'Safety & checks'},navDocs:{de:'Dokumente & Hilfe',en:'Documents & help'},
 eyebrow:{de:'Bedienungsanleitung',en:'User guide'},title:{de:'Das System Schritt für Schritt verstehen.',en:'Understand the system step by step.'},copy:{de:'Die Anleitung folgt derselben Reihenfolge wie das Demo-Haus. Du kannst jeden Abschnitt lesen oder direkt mit den vollständig fiktiven Beispieldaten ausprobieren.',en:'The guide follows the same sequence as the demo house. Read each section or try it directly with completely fictitious sample data.'},
 openDemo:{de:'Geführte Demo starten',en:'Start guided demo'},help:{de:'Zur Hilfe',en:'Back to help'},principle:{de:'Lernprinzip',en:'Learning principle'},principleTitle:{de:'Erst verstehen, dann selbst eintragen.',en:'Understand first, then enter your own data.'},principleCopy:{de:'Jeder Schritt erklärt, was Du siehst, warum es wichtig ist und wie er mit dem nächsten Bereich zusammenhängt.',en:'Each step explains what you see, why it matters and how it connects to the next area.'},steps:{de:'Lernschritte',en:'Learning steps'},
 toc:{de:'Inhalt',en:'Contents'},tocCopy:{de:'Du kannst die Anleitung von oben nach unten lesen oder direkt zu einem Thema springen.',en:'Read the guide from top to bottom or jump directly to a topic.'},what:{de:'Was passiert hier?',en:'What happens here?'},why:{de:'Warum ist das wichtig?',en:'Why does it matter?'},example:{de:'Im Demo-Haus',en:'In the demo house'},openStep:{de:'Diesen Schritt in der Demo öffnen',en:'Open this step in the demo'},extra:{de:'Zusätzliches Werkzeug öffnen',en:'Open additional tool'},
 note:{de:'Die Beispiele im Demo-Haus sind vollständig fiktiv. Sie zeigen den Bedienablauf und ersetzen keine individuelle Rechts-, Steuer- oder Versicherungsberatung.',en:'All examples in the demo house are completely fictitious. They illustrate the workflow and do not replace individual legal, tax or insurance advice.'},footer:{de:'Nebenkosten Premium · Lernen am vollständigen Musterfall.',en:'Nebenkosten Premium · Learn with a complete sample case.'}
};
initI18n(I18N);

function t(key){return I18N[key][getLanguage()];}
function render(){
 const toc=document.querySelector('[data-manual-toc]'),host=document.querySelector('[data-manual-steps]');
 document.querySelector('[data-step-count]').textContent=DEMO_LEARNING_STEPS.length;
 toc.innerHTML=DEMO_LEARNING_STEPS.map((s,i)=>'<a class="card" style="text-decoration:none;color:inherit" href="#step-'+(i+1)+'"><div class="eyebrow">'+escapeText(String(i+1).padStart(2,'0'))+'</div><h3>'+escapeText(s.short)+'</h3><p class="kicker">'+escapeText(s.title)+'</p></a>').join('');
 host.innerHTML=DEMO_LEARNING_STEPS.map((s,i)=>'<article class="card form-card" id="step-'+(i+1)+'" style="margin-bottom:18px"><div class="eyebrow">'+escapeText((i+1)+'. '+s.short)+'</div><h2>'+escapeText(s.title)+'</h2><div class="grid grid-2" style="margin-top:16px"><div><h3>'+escapeText(t('what'))+'</h3><p class="kicker">'+escapeText(s.copy)+'</p></div><div><h3>'+escapeText(t('why'))+'</h3><p class="kicker">'+escapeText(s.why)+'</p></div></div><div class="notice" style="margin-top:14px"><strong>'+escapeText(t('example'))+':</strong><ul style="margin:8px 0 0 20px">'+s.facts.map(x=>'<li>'+escapeText(x)+'</li>').join('')+'</ul></div><div class="form-actions"><a class="btn btn-primary" href="demo.html?step='+i+'">'+escapeText(t('openStep'))+'</a>'+(s.extraUrl?'<a class="btn btn-secondary" target="_blank" rel="noopener" href="'+escapeText(s.extraUrl)+'">'+escapeText(t('extra'))+'</a>':'')+'</div></article>').join('');
}
window.addEventListener('app-language-change',render);
const state=safeLoadProject();updateStoragePill(state.project,state.error);render();
