/* BusinessBooster: inhaltliche Ergaenzung ausschliesslich auf der separaten Testseite.
   Quelle: LQB-Infobroschuere Hotel, Seiten 6 bis 11 (Stand der vorgelegten Broschuere).
   Hotel-Master und produktive Business-Seite bleiben unberuehrt. */
(()=>{'use strict';
const init=()=>{
  const sections=[...document.querySelectorAll('section.card.section')];
  const fullservice=sections.find(s=>s.querySelector('.kicker')?.textContent.includes('Fullservice statt Einzelmaßnahme'));
  const combined=sections.find(s=>s.querySelector('.kicker')?.textContent.includes('Zusammengedacht'));
  if(!fullservice||!combined||document.getElementById('businessBrochureExtras'))return;
  const style=document.createElement('style');
  style.textContent=`
    /* Alle neuen Grafiken sind lokale HTML-/CSS-Bausteine ohne Bilder von Dritten. */
    .bbExtras{margin-top:28px;display:grid;gap:28px}.bbExtra{border:1px solid var(--line);border-radius:20px;padding:clamp(18px,3vw,30px);background:#fff;overflow:hidden}.bbExtra:nth-child(even){background:linear-gradient(145deg,#fff 65%,#ecf9f9)}
    .bbExtra .bbKicker{font-size:11px;font-weight:950;letter-spacing:.1em;text-transform:uppercase;color:var(--mint);margin:0 0 7px}.bbExtra h3{font-size:clamp(23px,3.5vw,32px);line-height:1.16;margin:0 0 9px}.bbExtra .bbIntro{color:#a82565;font-size:clamp(15px,2vw,18px);margin:0 0 22px}.bbExtra p{line-height:1.55}
    .bbMonths{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px;align-items:end;margin:18px 0 24px}.bbMonth{min-width:0;min-height:74px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;border-radius:12px;background:#eaf6f8;color:#16829b;font-size:12px;font-weight:900}.bbMonth:nth-child(even){background:#fff0f7;color:#ae2869;transform:translateY(13px)}.bbMonth:before{content:'';display:block;width:21px;height:21px;border-radius:7px;background:#fff;box-shadow:inset 0 0 0 6px currentColor;opacity:.78}
    .bbTriplet{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.bbMini{border:1px solid var(--line);border-top:6px solid var(--mint);background:#fff;border-radius:16px;padding:19px 16px;min-width:0}.bbMini:nth-child(even){border-top-color:var(--mag)}.bbMini h4{color:var(--navy);font-size:17px;margin:0 0 11px}.bbMini p{margin:0;color:#455669;font-size:14px}
    .bbNetwork{display:grid;grid-template-columns:1fr 1.1fr 1fr;gap:12px;align-items:stretch;margin:19px 0}.bbNode{border:1px solid #bcdce1;border-radius:17px;background:#fff;padding:16px;color:var(--navy);font-weight:850;text-align:center;display:grid;place-items:center}.bbNetwork .bbHub{background:var(--mint);color:#fff;font-size:21px}.bbOpt{border-radius:17px;padding:20px;background:#f2fafb;margin-top:18px}.bbOpt h4{font-size:19px;color:var(--navy);margin:0 0 10px}.bbOpt ul{display:grid;grid-template-columns:1fr 1fr;gap:7px 24px;margin:0;padding-left:19px}
    .bbOfferGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:19px 0}.bbOffer{border:1px solid var(--line);border-radius:17px;overflow:hidden;background:#fff}.bbOfferTop{min-height:100px;padding:17px;background:linear-gradient(130deg,#dff5f4,#e7eff5);display:grid;place-content:center;text-align:center;color:var(--navy)}.bbOffer:nth-child(2) .bbOfferTop{background:linear-gradient(130deg,#f9e6f1,#f8efe8)}.bbOffer:nth-child(3) .bbOfferTop{background:linear-gradient(130deg,#e3eef8,#dff5f4)}.bbOfferTop span{font-size:28px;line-height:1.15}.bbOfferTop strong{font-size:18px}.bbOfferText{padding:15px}.bbOfferText p{font-size:13px;margin:6px 0 0}.bbExample{display:inline-block;border-radius:999px;background:var(--mag);color:#fff;font-size:12px;padding:5px 10px;margin-top:10px;font-weight:800}
    .bbModel{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:20px 0}.bbModel .bbMini{text-align:center;border-top:5px solid var(--mint)}.bbModel .bbMini:nth-child(even){border-top-color:var(--mag)}.bbModel strong{display:block;font-size:clamp(19px,3vw,29px);color:var(--navy);line-height:1.2;margin:8px 0}.bbModel p{font-size:12px;color:var(--muted)}.bbSums{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.bbSum{padding:18px;border-radius:17px;background:#eaf9f9;color:var(--navy)}.bbSum.mag{background:#fff1f7}.bbSum strong{display:block;font-size:clamp(24px,3vw,33px);margin-bottom:4px}.bbFine{font-size:12px;color:var(--muted);margin:15px 0 0}
    .bbRegionCenter{margin:16px auto 0;width:min(100%,370px);background:#2a9db2;color:#fff;border-radius:33px;padding:23px 15px;text-align:center;font-size:21px;font-weight:850}.bbRegionCenter small{display:block;font-size:15px;font-weight:500;margin-top:5px}.bbRegion{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:12px auto;max-width:960px}.bbRegion>div{min-height:82px;display:grid;place-items:center;text-align:center;padding:13px;border:1.6px solid #49a8bd;border-radius:30px;background:#fff;color:#2b91a7;font-weight:850}.bbRegionLine{text-align:center;color:#4ca6b6;font-size:26px;line-height:1}
    .bbNotice{margin-top:15px;background:#f2fafb;border-left:5px solid var(--mint);padding:15px 17px;border-radius:0 13px 13px 0;font-size:14px}
    #bbStandalonePdfPanel{display:none!important}
    @media(max-width:800px){.bbMonths{grid-template-columns:repeat(6,1fr);gap:9px}.bbMonth:nth-child(even){transform:none}.bbTriplet,.bbOfferGrid,.bbModel{grid-template-columns:1fr 1fr}.bbNetwork{grid-template-columns:1fr 1fr}.bbNetwork .bbHub{grid-column:1/-1;grid-row:1}.bbRegion{grid-template-columns:1fr 1fr}}
    @media(max-width:510px){.bbTriplet,.bbOfferGrid,.bbModel,.bbSums,.bbOpt ul{grid-template-columns:1fr}.bbNetwork .bbHub{font-size:19px}.bbRegion{grid-template-columns:1fr 1fr}.bbRegion>div{font-size:13px;padding:10px;min-height:73px}}
  `;
  document.head.appendChild(style);
  const block=document.createElement('div');block.id='businessBrochureExtras';block.className='bbExtras';
  block.innerHTML=`
    <article class="bbExtra" id="bb-impulsmarketing">
      <div class="bbKicker">BusinessBooster 1 · Impulsmarketing</div>
      <h3>Monat für Monat sichtbar bleiben</h3>
      <p class="bbIntro">Nicht einmal werben – sondern wiederholt im richtigen Moment präsent sein.</p>
      <div class="bbMonths" role="img" aria-label="Impulsmarketing von Januar bis Dezember: zwölf wiederkehrende Monatsimpulse">${['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'].map(m=>`<div class="bbMonth">${m}</div>`).join('')}</div>
      <h4 style="text-align:center;font-size:20px;color:var(--navy);margin:10px 0 6px">Wiederholen. Veröffentlichen. Wirken.</h4>
      <p style="text-align:center;margin:0 0 20px">Monat für Monat neue Anlässe für Sichtbarkeit, Vertrauen und Buchungen.</p>
      <div class="bbTriplet"><div class="bbMini"><h4>Aufmerksamkeit</h4><p>Jeder Impuls schafft einen neuen Anlass, Ihr Hotel wahrzunehmen.</p></div><div class="bbMini"><h4>Wiederholung</h4><p>Regelmäßige Präsenz stärkt Erinnerung und Markenwirkung.</p></div><div class="bbMini"><h4>Zielgruppenrelevanz</h4><p>Angebote können saisonal und thematisch auf passende Gäste ausgerichtet werden.</p></div></div>
    </article>
    <article class="bbExtra" id="bb-medien">
      <div class="bbKicker">BusinessBooster 2 · Medien-Ökosystem</div>
      <h3>Sichtbarkeit über den einzelnen Werbeklick hinaus</h3>
      <p class="bbIntro">Advertorials und redaktionell aufbereitete Hotelgeschichten in passenden Themen-Magazinen.</p>
      <div class="bbNetwork" role="group" aria-label="Schaubild zur Verteilung von Hotel-Inhalten in einem thematischen Mediennetzwerk"><div class="bbNode">Reisen &amp; Ausflüge</div><div class="bbHub">Ihr Hotel<br><small>Geschichten &amp; Angebote</small></div><div class="bbNode">Wellness &amp; Genuss</div><div class="bbNode">Region &amp; Kultur</div><div class="bbNode">Online-Magazine</div><div class="bbNode">Veranstaltungen &amp; Erlebnisse</div></div>
      <p>Die Broschüre beschreibt Veröffentlichungen in einem Mediennetzwerk, die auch nach dem ersten Erscheinen auffindbar bleiben sollen. Anders als eine kurz laufende Anzeige entsteht damit ein zusätzlicher Kontaktpunkt für Interessierte. Die tatsächliche Auffindbarkeit und Reichweite hängen vom jeweiligen Medium und Suchdienst ab.</p>
      <div class="bbOpt"><h4>Optional: ein eigenes Online-Magazin</h4><ul><li>Reichweite längerfristig aufbauen</li><li>Hotel, Region und Partner sichtbar machen</li><li>Geschichten statt austauschbarer Werbung erzählen</li><li>Markenwert und eigene Kontaktpunkte stärken</li></ul></div>
    </article>
    <article class="bbExtra" id="bb-marktplatz">
      <div class="bbKicker">BusinessBooster 3 · Club-Marktplatz</div>
      <h3>Besondere Angebote statt austauschbarer Zimmerpreise</h3>
      <p class="bbIntro">Ihr Hotel verkauft nicht nur Übernachtungen. Es schafft Anlässe, wiederzukommen und weiterzuempfehlen.</p>
      <div class="bbOfferGrid">
        <div class="bbOffer"><div class="bbOfferTop"><span aria-hidden="true">✦</span><strong>Wellness-Woche</strong></div><div class="bbOfferText"><b>Erholung als Erlebnis</b><p>Beispiel: fünf Übernachtungen mit Wellness und Verpflegung.</p><span class="bbExample">Cashback als Angebotsbeispiel</span></div></div>
        <div class="bbOffer"><div class="bbOfferTop"><span aria-hidden="true">♡</span><strong>Romantik-Auszeit</strong></div><div class="bbOfferText"><b>Gemeinsame Zeit</b><p>Beispiel: Candle-Light-Dinner und zwei Übernachtungen für zwei.</p><span class="bbExample">Cashback als Angebotsbeispiel</span></div></div>
        <div class="bbOffer"><div class="bbOfferTop"><span aria-hidden="true">◈</span><strong>Event-Special</strong></div><div class="bbOfferText"><b>Tagung oder Feier</b><p>Beispiel: ein Veranstaltungsangebot mit Übernachtungspaket.</p><span class="bbExample">Cashback als Angebotsbeispiel</span></div></div>
      </div>
      <div class="bbTriplet"><div class="bbMini"><h4>Besondere Erlebnisse</h4><p>Wellness, Romantik, Genuss, Events und eigene Arrangements erhalten eine Bühne.</p></div><div class="bbMini"><h4>Neue Buchungsanlässe</h4><p>Zusätzliche Gründe für Buchungen, auch in nachfrageschwächeren Zeiten.</p></div><div class="bbMini"><h4>Weiterempfehlung</h4><p>Clubmitglieder können Angebote entdecken und als Empfehlungsgeber auftreten.</p></div></div>
      <p class="bbFine">Die dargestellten Arrangements sind Beispiele aus der Broschüre, keine automatisch enthaltenen oder garantierten Hotelangebote. Cashback hängt vom konkreten Angebot ab.</p>
    </article>
    <article class="bbExtra" id="bb-rechenbeispiel">
      <div class="bbKicker">Rechenbeispiel · ehemalige Gästekontakte</div>
      <h3>Wenn Marketing beginnt, sich selbst zu tragen</h3>
      <p class="bbIntro">Modellrechnung aus der Broschüre – keine Prognose oder Erfolgsgarantie.</p>
      <div class="bbModel"><div class="bbMini"><strong>10.000</strong><p>vorhandene Gästekontakte im Beispiel</p></div><div class="bbMini"><strong>5 %</strong><p>werden im Modell Clubmitglied</p></div><div class="bbMini"><strong>500</strong><p>Clubmitgliedschaften à 99 €</p></div><div class="bbMini"><strong>9.900 €</strong><p>20 % Provision auf 500 × 99 €</p></div></div>
      <p>Wenn diese 500 Clubmitglieder jeweils eine weitere Clubmitgliedschaft vermitteln, entstehen im Beispiel 500 zusätzliche Abschlüsse. Bei 15 % Provision auf diese zweite Stufe ergibt sich ein weiterer rechnerischer Betrag von 7.425 €. Die empfehlenden Mitglieder erhalten im beschriebenen Modell die Provision der ersten Stufe.</p>
      <div class="bbSums"><div class="bbSum"><strong>+ 7.425 €</strong>Weitere Provision der zweiten Stufe im Beispiel</div><div class="bbSum mag"><strong>17.325 €</strong>Summe aus erster und zweiter Stufe im Beispiel</div></div>
      <div class="bbNotice"><strong>Zusätzlicher Direktbuchungsumsatz – separates Szenario:</strong> 1,5 Mio. € ergeben sich rechnerisch bei 1.000 Buchungen à 1.500 €. Dafür müssen tatsächlich 1.000 Buchungen zustande kommen; aus 500 Mitgliedschaften allein folgt diese Summe nicht.</div>
      <p class="bbFine">Beispielwerte aus der ursprünglichen Broschüre. Tatsächliche Abschlüsse, Provisionsberechtigung, Buchungsumsätze und Kosten sind vom Einzelfall und den geltenden Bedingungen abhängig.</p>
    </article>
  `;
  fullservice.querySelector('.body').appendChild(block);
  const region=document.createElement('section');region.className='card section';region.id='bb-region';
  region.innerHTML=`<div class="head"><div class="kicker">Regionale Wirkung</div><h2>Ihr Hotel als Wachstumsmotor einer ganzen Wirtschaftsregion</h2><p>Mehr Gäste bedeuten nicht nur mehr Hotelumsatz, sondern können zusätzliche Nachfrage rund um Ihr Haus schaffen.</p></div><div class="body"><div class="bbRegion"><div>Regionale Attraktionen</div><div>Firmen &amp; Mitarbeitende</div><div>Dienstleister</div></div><div class="bbRegionLine" aria-hidden="true">↓</div><div class="bbRegionCenter">IHR HOTEL<small>Mehr Gäste = mehr Wirkung</small></div><div class="bbRegionLine" aria-hidden="true">↓</div><div class="bbRegion"><div>Freizeit &amp; Ausflüge</div><div>Einzelhandel</div><div>Kunst, Kur &amp; Kultur</div></div><div class="bbNotice">Der handelbare Wertgutschein ist im Konzept als verbindendes Element gedacht: Zusätzliche Kaufkraft kann bei teilnehmenden Partnern in der Region Wirkung entfalten. Welche Partner tatsächlich mitmachen und welche Effekte entstehen, ist vor Ort zu klären.</div></div>`;
  combined.insertAdjacentElement('afterend',region);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
