/* Ergänzung für die freigegebene BusinessBooster-Gesprächsseite.
 * Die abgebildeten Magazine und Marken öffnen sich über ihre eigenen Webadressen.
 * Absichtlich innerhalb der bestehenden bbMediaFigure: Der freigegebene PDF-Adapter
 * übernimmt wie bisher nur Bild und Bildunterschrift; die Linkliste verändert die PDF nicht.
 * Reihenfolge: von links nach rechts, Zeile für Zeile im Bild IMG_9853.jpeg.
 * Das DIY-Magazin ist im Bild zweimal zu sehen und wird nur einmal verlinkt.
 */
(()=>{'use strict';
const sites=[
 ['Yachtera','https://www.yachtera.de/'],
 ['QUANTUMOTOR','https://www.quantumotor.de/'],
 ['ROASTRA','https://www.roastra.de/'],
 ['FOILUP','https://www.foilup.de/'],
 ['KIALOG','https://www.das-kialog-magazin.de/'],
 ['Das Superfood Magazin','https://www.das-superfood-magazin.de/'],
 ['Zukunft Sein','https://www.zukunftsein.de/'],
 ['Das BusinessTravel Magazin','https://www.das-businesstravel-magazin.de/'],
 ['Das Event Magazin','https://www.das-event-magazin.de/'],
 ['beigeld','https://www.beigeld.de/'],
 ['ELVITY','https://www.elvity.de/'],
 ['florwerk','https://www.florwerk.de/'],
 ['LUXHORO','https://www.luxhoro.de/'],
 ['BayernFlair','https://www.bayernflair.de/'],
 ['FamilyStop','https://www.familystop.de/'],
 ['Das Tier Magazin','https://www.das-tier-magazin.de/'],
 ['Das Catering Magazin','https://www.das-catering-magazin.de/'],
 ['Das Auswanderer Magazin','https://www.das-auswanderer-magazin.de/'],
 ['Das Wohnen und Leben Magazin','https://www.das-wohnen-und-leben-magazin.de/'],
 ['herLifestyle','https://www.herlifestyle.de/'],
 ['FRINTON','https://www.frinton.de/'],
 ['Das Wohnmobil Magazin','https://www.das-wohnmobil-magazin.de/'],
 ['Das Do It Yourself Magazin','https://www.das-diy-magazin.de/'],
 ['Das BesteZeit Magazin','https://www.das-bestezeit-magazin.de/'],
 ['Das Technik Magazin','https://www.das-technik-magazin.de/'],
 ['Das Coaching Magazin','https://www.das-coaching-magazin.de/'],
 ['Das Harz Magazin','https://www.das-harz-magazin.de/'],
 ['Das Backen Magazin','https://www.das-backen-magazin.de/'],
 ['Das Wellness Magazin','https://www.das-wellness-magazin.de/'],
 ['Das Hundeurlaub Magazin','https://www.das-hundeurlaub-magazin.de/'],
 ['Das GreenTravel Magazin','https://www.das-greentravel-magazin.de/'],
 ['Das KI Magazin','https://www.das-ki-magazin.de/'],
 ['Das Heiraten Magazin','https://www.das-heiraten-magazin.de/'],
 ['Bergisch Bewegt','https://www.bergisch-bewegt.de/'],
 ['Das Immobilien Magazin','https://www.das-immobilien-magazin.de/']
];
function init(){
 const figure=document.querySelector('#bb-medien .bbMediaFigure');
 if(!figure||figure.querySelector('#bbMagazineLinks'))return;
 const style=document.createElement('style');
 style.textContent=`
 .bbMagazineLinks{margin:21px 0 0;border:1px solid #c6dfe4;background:#f4fbfc;border-radius:14px;color:#132238;overflow:hidden}
 .bbMagazineLinks summary{cursor:pointer;padding:16px 18px;font-size:16px;font-weight:800;line-height:1.45;list-style-position:inside}
 .bbMagazineLinks summary:hover,.bbMagazineLinks summary:focus-visible{background:#e5f6f7}
 .bbMagazineLinks[open] summary{border-bottom:1px solid #c6dfe4}
 .bbMagazineLinks .bbMagazineLinksIntro{margin:13px 17px 15px;color:#435768;font-size:14px;line-height:1.5}
 .bbMagazineLinksGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;padding:0 16px 18px}
 .bbMagazineLinksGrid a{display:block;min-width:0;border:1px solid #d6e5e9;background:#fff;border-radius:10px;text-decoration:none;padding:11px 12px;color:#132238;line-height:1.35}
 .bbMagazineLinksGrid a:hover,.bbMagazineLinksGrid a:focus-visible{outline:2px solid #00a7ad;outline-offset:1px;background:#effafa}
 .bbMagazineLinksGrid a strong{display:block;font-size:13px;overflow-wrap:anywhere}
 .bbMagazineLinksGrid a small{display:block;font-size:11px;color:#247d87;margin-top:5px;overflow-wrap:anywhere}
 @media(max-width:900px){.bbMagazineLinksGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
 @media(max-width:560px){.bbMagazineLinksGrid{grid-template-columns:1fr}.bbMagazineLinks summary{font-size:14px;padding:13px}.bbMagazineLinksGrid{padding:0 11px 13px}}
 `;
 document.head.appendChild(style);
 const details=document.createElement('details');details.id='bbMagazineLinks';details.className='bbMagazineLinks';
 const summary=document.createElement('summary');summary.textContent='Magazine und Websites entdecken ('+sites.length+')';
 const intro=document.createElement('p');intro.className='bbMagazineLinksIntro';intro.textContent='Wählen Sie eine abgebildete Marke oder ein Magazin aus. Die Website öffnet sich in einem neuen Tab; diese Gesprächsseite bleibt geöffnet.';
 const grid=document.createElement('div');grid.className='bbMagazineLinksGrid';
 for(const [name,url] of sites){
  const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',name+' – Website in neuem Tab öffnen');
  const label=document.createElement('strong');label.textContent=name;
  const domain=document.createElement('small');domain.textContent=new URL(url).hostname.replace(/^www\./,'')+' ↗';
  a.append(label,domain);grid.appendChild(a);
 }
 details.append(summary,intro,grid);
 const image=figure.querySelector('img');if(image)image.insertAdjacentElement('afterend',details);else figure.appendChild(details);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
