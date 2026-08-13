/* Daniel-Muster Belastungstest – ausschließlich Demo-Daten. */
(function(){
  if(typeof demo==='undefined') return;
  const fillTo=(arr,total,factory)=>{for(let n=arr.length+1;n<=total;n++)arr.push(factory(n));};
  const p=n=>String(n).padStart(2,'0');
  const p3=n=>String(n).padStart(3,'0');

  fillTo(demo.projects,10,n=>({name:`Muster Projekt ${p(n)} GmbH`,website:`https://projekt-${p(n)}.demo-beispiel.de`,supportEmail:`support${p(n)}@demo-beispiel.de`,supportPhone:`+49 69 20${p(n)}${p(n)}${p(n)}`,responsible:`Verantwortliche Person ${p(n)}`,contact:`Projektkontakt ${p(n)}`,income:`Laufende Einnahmen aus dem Demo-Projekt ${p(n)}. Im Notfall zuerst den Ansprechpartner informieren, offene Abrechnungen prüfen und keine vorschnelle Kündigung oder Übertragung veranlassen.`}));

  fillTo(demo.projectAccess,15,n=>({project:`Muster Projekt ${p(((n-1)%10)+1)} GmbH`,login:`daniel.muster.${p(n)}`,email:`projekt${p(n)}@muster.de`,passwordLocation:`Passwortmanager – Eintrag „Demo Projektzugang ${p(n)}“`,transactionLocation:`Zusätzliche Freigaben im versiegelten Umschlag „Projektzugang ${p(n)}“ im privaten Tresor`}));

  fillTo(demo.devices,8,n=>({label:`Demo-Gerät ${p(n)}`,mobile:`+49 170 88${p(n)}${p(n)}${p(n)}`,sim:`Demo Mobilfunk ${p(n)}`,pinLocation:`Tresor – Mappe Geräte ${p(n)}`,cloud:`geraet${p(n)}@muster.de`,auth:`Authenticator Profil ${p(n)}`,backupCodes:`Versiegelter Notfallumschlag – Gerätebereich ${p(n)}`}));

  fillTo(demo.banks,10,n=>({label:`Demo-Konto ${p(n)}`,bank:`Demo Bank ${p(n)}`,iban:`DE${p(n)} ${p(n)}${p(n)} ${p(n)}${p(n)} ${p(n)}${p(n)} ${p(n)}${p(n)} ${p(n)}`,bic:`DEMO${p(n)}XXX`,access:`Zugang im Passwortmanager – Demo Bank ${p(n)}; TAN-Freigabe über registriertes Hauptgerät`,instruction:`Zahlungsverkehr dieses Demo-Kontos zunächst prüfen. Daueraufträge und Lastschriften dokumentieren und erst danach über Änderungen entscheiden.`}));

  fillTo(demo.wallets,20,n=>({label:`Demo-Wallet ${p(n)}`,network:n%3===0?'Ethereum / Arbitrum / BNB Chain':n%2===0?'Bitcoin / Lightning':'Ethereum / Polygon',address:`DEMO-WALLET-${p(n)}-PUBLIC-ADDRESS`,recovery:`Seed-Sicherungsmappe – Demo-Fach ${p(n)}; keine Seed-Wörter in dieser Notfallakte`,hardware:n%2===0?`Hardware-Wallet Demo ${p(n)} – getrennt verwahrt`:`Wallet auf registriertem Demo-Gerät ${p(n)}`,instruction:`Vor jeder Bewegung Netzwerk, Wallet-Typ und vorhandene Unterlagen prüfen. Keine übereilte Übertragung durchführen.`}));

  fillTo(demo.digital,100,n=>({service:`Demo-Dienst / Webseite ${p3(n)}`,website:`https://dienst-${p3(n)}.demo-beispiel.de`,username:`daniel.demo.${p3(n)}`,email:`dienst${p3(n)}@muster.de`,passwordLocation:`Passwortmanager – Eintrag „Demo Dienst ${p3(n)}“`,twoFactor:n%4===0?'Authenticator + Backup-Code':n%3===0?'SMS an hinterlegte Demo-Nummer':'Authenticator',instruction:`Demo-Anweisung ${p3(n)}: Inhalte und laufende Verpflichtungen zuerst prüfen. Zugang nicht vorschnell löschen. Falls der Dienst kostenpflichtig ist, Abrechnung dokumentieren und anschließend entscheiden, ob er weitergeführt, übertragen oder beendet werden soll.`}));

  fillTo(demo.contacts,20,n=>({name:`Demo Ansprechpartner ${p(n)}`,role:n%3===0?'Geschäftlicher Kontakt':n%2===0?'Technischer Ansprechpartner':'Vertrauensperson / Unterstützer',phone:`+49 69 77${p(n)}${p(n)}${p(n)}`,email:`kontakt${p(n)}@demo-beispiel.de`,note:`Kennt den Demo-Sachverhalt ${p(n)} und kann bei Rückfragen zu Unterlagen, Zugang oder Zuständigkeit unterstützen.`}));

  fillTo(demo.contracts,30,n=>({type:n%4===0?'Versicherung':n%3===0?'Software-Abonnement':n%2===0?'Dienstleistungsvertrag':'Laufender Vertrag',provider:`Demo Anbieter ${p(n)} GmbH`,number:`DEMO-VERTRAG-${p3(n)}`,contact:`Kundenservice Demo Anbieter ${p(n)} · +49 69 55${p(n)}${p(n)}`,term:n%3===0?'jährlich kündbar':'laufend; Vertragsunterlagen prüfen',payment:n%2===0?'Lastschrift vom Demo-Konto':'jährliche Zahlung laut Rechnung',documents:`Ordner Verträge – Register ${p(n)}`,benefit:n%5===0?'Ja – möglichen Leistungsanspruch prüfen':'Nein / zunächst Vertragslage prüfen',instruction:`Vertrag ${p(n)} nicht ungeprüft kündigen. Originalunterlagen, Zahlungsstatus und mögliche Ansprüche zuerst vollständig prüfen und dokumentieren.`}));

  fillTo(demo.openTopics,12,n=>({priority:n%3===0?'low':n%2===0?'mid':'high',title:`Demo-Erklärungsbedarf ${p(n)}`,description:`Zu diesem Demo-Thema ${p(n)} bestehen zusätzliche Zusammenhänge. Die Unterlagen enthalten mehrere Schritte und sollten in der angegebenen Reihenfolge gelesen werden, bevor Entscheidungen getroffen werden.`,contact:`Demo Ansprechpartner ${p(((n-1)%20)+1)}`,documents:`Privater Demo-Ordner – Bereich ${p(n)}`,instruction:`Zuerst Unterlagen vollständig ansehen, anschließend Ansprechpartner kontaktieren und erst danach über weitere Schritte entscheiden.`}));

  demo.ownWords += '\n\nZusätzlicher Demo-Langtext für den Belastungstest: Diese Notfallakte enthält absichtlich sehr viele Datensätze. Damit wird geprüft, ob lange persönliche Texte, viele Zugänge, Verträge, Wallets und Ansprechpartner in Sicherung, Excel-Übersicht und PDF vollständig und in richtiger Reihenfolge verarbeitet werden. Auch bei einem sehr großen Datenbestand darf kein Eintrag abgeschnitten, ausgelassen oder still überschrieben werden.';
})();

/* Die PDF-Reparatur gilt sowohl für die Demo als auch für die persönliche Notfallakte. */
(function(){
  if(document.querySelector('script[data-pdf-pagination-v08]')) return;
  const s=document.createElement('script');
  s.src='./pdf-pagination-v08.js';
  s.dataset.pdfPaginationV08='1';
  document.head.appendChild(s);
})();
