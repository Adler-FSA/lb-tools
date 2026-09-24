import test from 'node:test';
import assert from 'node:assert/strict';
import {generateAkademiePdf,PDF_MASTER_SOURCE_SHA,PDF_MASTER_VERSION,safePdfFilePart} from '../assets/js/pdf-master-core.js';

test('PDF-Master stammt aus dokumentierter Hotel-Referenz',()=>{
  assert.equal(PDF_MASTER_SOURCE_SHA,'1c809c4225be063fd54455171567be2738a96675');
  assert.equal(PDF_MASTER_VERSION,'AKADEMIE_PDF_MASTER_HOTEL_DERIVED_V1');
});
test('PDF-Master erzeugt echte lokale PDF-Bytes ohne feste Seitenzahl',async()=>{
  const out=await generateAkademiePdf({
    filename:'Test_Dokument.pdf',title:'Testdokument',subtitle:'Snapshot',
    sections:[{heading:'Abschnitt',blocks:[
      {type:'key_values',items:[{label:'Objekt',value:'Musterhaus'},{label:'Betrag',value:'123,45 €'}]},
      {type:'paragraph',text:'Ein längerer Absatz für die technische Satzprüfung.'},
      {type:'table',headers:['A','B'],rows:[['1','2'],['3','4']]},
      {type:'callout',text:'Prüfhinweis'}
    ]}]
  });
  assert.equal(out.filename,'Test_Dokument.pdf');
  assert.ok(out.pages>=1);
  assert.ok(out.bytes>100);
  const bytes=new Uint8Array(await out.blob.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0,8)).startsWith('%PDF-1.4'),true);
  assert.equal(new TextDecoder().decode(bytes.slice(-32)).includes('%%EOF'),true);
});
test('Dateinamensbaustein entfernt problematische Zeichen',()=>{
  assert.equal(safePdfFilePart('Haus / Müller: 2026'),'Haus-Muller-2026');
});
