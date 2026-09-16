/* LiquidityBooster · Speicherbrücke nur für hotel.html */
(function(){
  'use strict';

  function loadCore(){
    if(window.LBHotelStorage)return Promise.resolve(window.LBHotelStorage);
    return new Promise(function(resolve,reject){
      const existing=document.querySelector('script[data-lb-hotel-storage-core]');
      if(existing){
        existing.addEventListener('load',function(){resolve(window.LBHotelStorage)} ,{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      const s=document.createElement('script');
      s.src='./hotel-storage.js?v=1';
      s.async=false;
      s.dataset.lbHotelStorageCore='1';
      s.onload=function(){resolve(window.LBHotelStorage)};
      s.onerror=reject;
      document.head.appendChild(s);
    });
  }

  function readValue(el){return el?el.value:''}
  function setValue(el,value){if(el&&value!==undefined&&value!==null&&value!=='')el.value=String(value)}

  function init(store){
    if(!store)return;

    const hotelName=document.getElementById('hotelName');
    const hotel=store.getSection('hotel');
    if(hotel.name)setValue(hotelName,hotel.name);
    if(hotelName){
      if(!hotel.name&&hotelName.value.trim())store.updateSection('hotel',{name:hotelName.value.trim()});
      const saveHotel=function(){store.updateSection('hotel',{name:hotelName.value.trim()})};
      hotelName.addEventListener('input',saveHotel);
      hotelName.addEventListener('change',saveHotel);
    }

    const map={
      booking:'bookingValue',
      voucherPct:'voucherPercent',
      reservePct:'reservePercent',
      otaPct:'otaPercent',
      offerPrice:'offerPrice',
      offerCost:'offerCost',
      offerVoucher:'offerVoucher'
    };
    const current=store.getSection('directBooking');
    const seed={};
    Object.keys(map).forEach(function(id){
      const el=document.getElementById(id),key=map[id];
      if(!el)return;
      if(Object.prototype.hasOwnProperty.call(current,key)&&current[key]!==''&&current[key]!==null&&current[key]!==undefined){
        setValue(el,current[key]);
      }else{
        seed[key]=readValue(el);
      }
      const save=function(){const patch={};patch[key]=readValue(el);store.updateSection('directBooking',patch)};
      el.addEventListener('input',save);
      el.addEventListener('change',save);
    });
    if(Object.keys(seed).length)store.updateSection('directBooking',seed);

    const rows=[...document.querySelectorAll('[data-service]')];
    const savedServices=Array.isArray(current.services)?current.services:[];
    rows.forEach(function(row,index){
      const saved=savedServices[index];
      if(!saved)return;
      setValue(row.querySelector('[data-price]'),saved.price);
      setValue(row.querySelector('[data-cost]'),saved.cost);
      setValue(row.querySelector('[data-voucher]'),saved.voucher);
    });

    function saveServices(){
      const services=rows.map(function(row){
        return {
          name:(row.querySelector('.serviceName')?.textContent||'').trim(),
          price:readValue(row.querySelector('[data-price]')),
          cost:readValue(row.querySelector('[data-cost]')),
          voucher:readValue(row.querySelector('[data-voucher]'))
        };
      });
      store.updateSection('directBooking',{services:services});
    }
    if(!savedServices.length&&rows.length)saveServices();
    rows.forEach(function(row){
      row.querySelectorAll('input').forEach(function(input){
        input.addEventListener('input',saveServices);
        input.addEventListener('change',saveServices);
      });
    });

    ['booking','voucherPct','reservePct','otaPct','offerPrice','offerCost','offerVoucher'].forEach(function(id){
      const el=document.getElementById(id);if(el)el.dispatchEvent(new Event('input',{bubbles:true}));
    });
    rows.forEach(function(row){const el=row.querySelector('input');if(el)el.dispatchEvent(new Event('input',{bubbles:true}))});
  }

  loadCore().then(init).catch(function(err){console.warn('[HotelStorage] Hotel-Seite konnte nicht verbunden werden:',err)});

  /* Ausschliesslich die produktive Hotel-Seite: die V6-Broschuere nutzt ihren
     unveraenderten PDF-Testgenerator. In dessen iframe keinen Adapter laden. */
  if(!new URLSearchParams(location.search).has('pdf-design-test')&&!document.querySelector('script[data-lb-hotel-pdf-v6-live]')){
    const pdfScript=document.createElement('script');
    pdfScript.src='./hotel-pdf-v6-live.js?v=1';
    pdfScript.async=false;
    pdfScript.dataset.lbHotelPdfV6Live='1';
    document.head.appendChild(pdfScript);
  }
})();
