/* LiquidityBooster · Speicherbrücke für voucher-currency.html und seinen bestehenden iframe */
(function(){
  'use strict';

  function loadCore(){
    if(window.LBHotelStorage)return Promise.resolve(window.LBHotelStorage);
    return new Promise(function(resolve,reject){
      const existing=document.querySelector('script[data-lb-hotel-storage-core]');
      if(existing){
        if(window.LBHotelStorage){resolve(window.LBHotelStorage);return;}
        existing.addEventListener('load',function(){resolve(window.LBHotelStorage)},{once:true});
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

  const frame=document.getElementById('contentFrame');
  if(!frame)return;
  let wiredDocument=null;

  function connect(store){
    try{
      const d=frame.contentDocument;
      if(!d||!d.body||wiredDocument===d)return;
      wiredDocument=d;

      const map={
        voucherAmount:'voucherAmount',
        allocation:'allocationPercent',
        vowPrice:'vowPriceUsd',
        removed:'removedAmount'
      };
      const current=store.getSection('voucher');
      const seed={};

      Object.keys(map).forEach(function(id){
        const el=d.getElementById(id),key=map[id];
        if(!el)return;
        const saved=Object.prototype.hasOwnProperty.call(current,key)?current[key]:undefined;

        if(id==='vowPrice'){
          if(!el.value&&saved!==undefined&&saved!==null&&saved!=='')el.value=String(saved);
          else if(el.value)seed[key]=el.value;
        }else if(saved!==undefined&&saved!==null&&saved!==''){
          el.value=String(saved);
        }else{
          seed[key]=el.value;
        }

        const save=function(){const patch={};patch[key]=el.value;store.updateSection('voucher',patch)};
        el.addEventListener('input',save);
        el.addEventListener('change',save);
      });

      if(Object.keys(seed).length)store.updateSection('voucher',seed);

      function saveAll(){
        const patch={};
        Object.keys(map).forEach(function(id){const el=d.getElementById(id);if(el)patch[map[id]]=el.value});
        store.updateSection('voucher',patch);
      }

      Object.keys(map).forEach(function(id){const el=d.getElementById(id);if(el)el.dispatchEvent(new Event('input',{bubbles:true}))});
      setTimeout(saveAll,1500);
      setTimeout(saveAll,4000);
      window.addEventListener('pagehide',saveAll,{once:true});
    }catch(err){
      console.warn('[HotelStorage] Voucher-Seite konnte nicht verbunden werden:',err);
    }
  }

  loadCore().then(function(store){
    const wire=function(){setTimeout(function(){connect(store)},0)};
    frame.addEventListener('load',wire);
    wire();
  }).catch(function(err){console.warn('[HotelStorage] Voucher-Speicher konnte nicht geladen werden:',err)});
})();
