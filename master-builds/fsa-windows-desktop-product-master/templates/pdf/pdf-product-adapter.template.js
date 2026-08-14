(()=>{
'use strict';
/* FSA PDF PRODUCT ADAPTER TEMPLATE
   Alle fachlichen/produktbezogenen Werte werden hier zentral definiert. */
window.FsaPdfProductAdapter=Object.freeze({
  version:'FSA_PDF_PRODUCT_ADAPTER_V1',
  productName:'{{PRODUCT_NAME}}',
  filePrefix:'{{PDF_FILE_PREFIX}}',
  defaultOwner:'{{DEFAULT_OWNER_SLUG}}',
  buttonSelector:'{{PDF_BUTTON_SELECTOR}}',
  buttonLabel:'{{PDF_BUTTON_LABEL}}',
  sheetSelector:'#printSheet',
  pageSelector:'.pPage',
  owner:()=>typeof window.getPdfOwner==='function'?window.getPdfOwner():'',
  demo:()=>typeof window.isPdfDemo==='function'?!!window.isPdfDemo():false,
  footerLeft:'{{PDF_FOOTER_LEFT}}',
  headerEyebrow:'{{PDF_HEADER_EYEBROW}}',
  colors:{
    navy:[.075,.133,.22],
    black:[.11,.15,.2],
    gray:[.4,.45,.51],
    accent:[0,.58,.60],
    accentDark:[0,.43,.46],
    white:[1,1,1],
    light:[.95,.975,.976],
    line:[.82,.86,.87]
  },
  // Produktspezifischer Renderer-Vertrag:
  // renderPage({page,index,total,date,writer,config}) muss Uint8Array liefern.
  renderPage:null
});
})();
