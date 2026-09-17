/* Ausschließlich für die separate Business-Inhaltstestseite. Keine Änderung an Hauptseite/PDF. */
(()=>{'use strict';
function start(){
  const extras=document.getElementById('businessBrochureExtras');
  if(!extras||document.getElementById('bbFullserviceDetailsV2'))return;
  const fullservice=extras.closest('section.card.section');
  const media=document.getElementById('bb-medien');
  if(!fullservice||!media)return;

  const style=document.createElement('style');
  style.textContent=`
    .bbFullserviceDetails{margin:22px 0 10px;border:1px solid #dbe5e9;border-radius:20px;padding:clamp(18px,2.5vw,28px);background:#f5fbfc;color:#132238}
    .bbFullserviceDetails>h3{margin:0 0 8px;font-size:clamp(23px,3vw,30px)}
    .bbFullserviceDetails>p{margin:0 0 18px;line-height:1.55;color:#455669}
    .bbDetailsGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .bbDetail{border:1px solid #dbe5e9;border-radius:15px;background:white;padding:17px;min-width:0}
    .bbDetail strong{display:block;color:#132238;font-size:16px;margin-bottom:7px}
    .bbDetail p{margin:0;color:#455669;font-size:14px;line-height:1.5}
    .bbDetail em{font-style:normal;font-weight:850;color:#a82465}
    .bbDetail--wide{grid-column:1/-1}
    .bbPackagesMatrix{width:100%;border-collapse:collapse;margin-top:11px;font-size:14px}
    .bbPackagesMatrix th,.bbPackagesMatrix td{border-bottom:1px solid #dbe5e9;padding:10px 8px;text-align:center}
    .bbPackagesMatrix th:first-child,.bbPackagesMatrix td:first-child{text-align:left}
    .bbPackagesMatrix th{color:#132238;background:#eaf9f9}
    .bbMediaFigure{margin:20px 0 23px;padding:clamp(12px,2vw,22px);border:1px solid #dbe5e9;border-radius:18px;background:white;overflow:hidden}
    .bbMediaFigure figcaption{font-size:clamp(16px,2vw,19px);font-weight:800;line-height:1.45;color:#132238;margin-bottom:16px}
    .bbMediaFigure img{display:block;width:100%;height:auto;object-fit:contain}
    .bbMediaFigure .bbImageError{display:none;color:#a82465;font-size:14px;margin-top:10px}
    .bbMediaFigure.is-error .bbImageError{display:block}
    @media(max-width:700px){.bbDetailsGrid{grid-template-columns:1fr}.bbDetail--wide{grid-column:auto}.bbPackagesMatrix{font-size:12px}.bbPackagesMatrix th,.bbPackagesMatrix td{padding:9px 4px}}
  `;
  document.head.appendChild(style);

  const detail=document.createElement('section');
  detail.id='bbFullserviceDetailsV2';
  detail.className='bbFullserviceDetails';
  detail.innerHTML=`
    <h3>Fullservice: alle Leistungen im Zusammenhang</h3>
    <p>Ein fortlaufender Aufbau aus Impulsmarketing, Medienpräsenz und Club-Marktplatz – ergänzt durch Unternehmensprofil, CRM, Schulung und die Vorbereitung der technischen Anbindung.</p>
    <div class="bbDetailsGrid">
      <div class="bbDetail"><strong>Unternehmensvorstellung</strong><p>ClubLeader-Mitgliedschaft mit Unternehmensprofil, Video und Link zur Hotel-Homepage.</p></div>
      <div class="bbDetail"><strong>BusinessBooster 1 · Impulsmarketing</strong><p><em>12 Monate</em> Impulsmarketing inklusive CRM-System und Newsletter mit personengenauer Auswertung.</p></div>
      <div class="bbDetail"><strong>BusinessBooster 2 · Medienpräsenz</strong><p><em>Ein Pressebericht pro Monat</em> in passenden Themen-Magazinen. Die Zahl der Magazine richtet sich nach dem gewählten Paket.</p></div>
      <div class="bbDetail"><strong>BusinessBooster 3 · Club-Marktplatz</strong><p>Veröffentlichung besonderer Hotelangebote. Die Anzahl der gleichzeitig vorgesehenen Angebote richtet sich nach dem Paket.</p></div>
      <div class="bbDetail"><strong>Cashback-Ökosystem</strong><p>Registrierung zur Teilnahme am weltweit einzigartigen Cashback-Ökosystem; Livegang <em>erst nach Freigabe der Schnittstelle</em>.</p></div>
      <div class="bbDetail"><strong>ClubPartner-Mitgliedschaften</strong><p>Monatliche Gratis-Mitgliedschaften für Mitarbeitende, Kunden oder andere vorgesehene Empfänger – je nach Paket.</p></div>
      <div class="bbDetail"><strong>Einführung und Betreuung</strong><p>Schulung eines Mitarbeitenden als Administrator für das Unternehmensprofil. Der vierstufige Ablauf von Interview bis Livegang steht weiter unten.</p></div>
      <div class="bbDetail"><strong>Empfehlung und Belohnung</strong><p>Teilnahme am dreistufigen Belohnungssystem gemäß den jeweils geltenden Bedingungen.</p></div>
      <div class="bbDetail bbDetail--wide"><strong>Leistungen nach Paket auf einen Blick</strong>
        <div style="overflow-x:auto"><table class="bbPackagesMatrix"><thead><tr><th>Leistung</th><th>Small</th><th>Premium</th><th>Enterprise</th></tr></thead><tbody>
        <tr><td>Themen-Magazine pro Pressebericht</td><td>1</td><td>3</td><td>5</td></tr>
        <tr><td>Club-Marktplatz-Angebote (bis zu)</td><td>3</td><td>5</td><td>8</td></tr>
        <tr><td>Gratis-ClubPartner pro Monat</td><td>2</td><td>4</td><td>8</td></tr>
        </tbody></table></div>
      </div>
    </div>`;
  extras.before(detail);

  /* Die hochgeladene Bilddatei liegt direkt neben dieser Testseite. Keine Data-URL. */
  const network=media.querySelector('.bbNetwork, .bbMagazinePortfolio');
  if(network){
    const figure=document.createElement('figure');figure.className='bbMediaFigure';
    figure.innerHTML='<figcaption>Das Medien-Ökosystem wächst kontinuierlich in unterschiedlichen Themenwelten. Eine Auswahl der Magazine:</figcaption><img src="./IMG_9853.jpeg" alt="Auswahl der Themen-Magazine im Medien-Ökosystem" loading="lazy" decoding="async"><p class="bbImageError">Die Magazinübersicht konnte nicht geladen werden.</p>';
    const image=figure.querySelector('img');image.addEventListener('error',()=>figure.classList.add('is-error'),{once:true});
    network.replaceWith(figure);
  }

  /* Kundenseitige Aussagen: kein interner Verweis auf die Arbeitsvorlage. */
  const description=media.querySelector('.bbMediaFigure+p');
  if(description)description.textContent='Advertorials und Hotelgeschichten werden in passenden Themen-Magazinen veröffentlicht. So entstehen über die erste Veröffentlichung hinaus zusätzliche Kontaktpunkte. Wie gut Inhalte auffindbar sind und welche Reichweite sie erzielen, hängt vom jeweiligen Medium und Suchdienst ab.';
  const offer=document.getElementById('bb-marktplatz')?.querySelector('.bbFine');
  if(offer)offer.textContent='Die dargestellten Arrangements zeigen mögliche Hotelangebote. Welche Angebote tatsächlich eingestellt werden und welche Cashback-Vorteile gelten, wird individuell festgelegt.';
  const example=document.getElementById('bb-rechenbeispiel');
  if(example){
    const heading=example.querySelector('.bbIntro');
    if(heading)heading.textContent='Reines Rechenbeispiel zur Veranschaulichung – keine Prognose oder Erfolgsgarantie.';
    const fine=example.querySelector('.bbFine');
    if(fine)fine.textContent='Beispielwerte zur Veranschaulichung. Tatsächliche Abschlüsse, Provisionsberechtigung, Buchungsumsätze und Kosten hängen vom Einzelfall und den geltenden Bedingungen ab.';
  }
  const note=fullservice.querySelector('.body > .note');
  if(note)note.innerHTML='<strong>Gemeinsame Grundlage der drei Pakete:</strong> Unternehmensprofil mit Video und Homepage-Link, CRM und Newsletter-Auswertung, Admin-Schulung sowie die Vorbereitung der Teilnahme am Cashback-Ökosystem. Der Livegang hängt von der Freigabe der Schnittstelle ab.';
  console.info('[Business-Inhaltstest] Fullservice und lokale Magazinübersicht eingebunden.');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
