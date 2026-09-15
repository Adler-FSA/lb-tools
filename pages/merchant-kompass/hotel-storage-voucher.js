/* LiquidityBooster · Speicherbrücke nur für Voucher Currency */
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

  function value(id){const el=document.getElementById(id);return el?el.value:''}
  function setValue(id,v){const el=document.getElementById(id);if(el&&v!==undefined&&v!==null&&v!=='')el.value=String(v)}

  function init(store){
    if(!store)return;

    const map={
      voucherAmount:'voucherAmount',
      allocation:'allocationPercent',
      vowPrice:'vowPriceUsd',
      removed:'removedAmount'
    };
    const current=store.getSection('voucher');
    const seed={};

    Object.keys(map).forEach(function(id){
      const el=document.getElementById(id),key=map[id];
      if(!el)return;

      const saved=Object.prototype.hasOwnProperty.call(current,key)?current[key]:undefined;
      if(id==='vowPrice'){
        /* Ein bereits live geladener Kurs hat Vorrang; gespeicherter Kurs dient als Fallback. */
        if(!el.value&&saved!==undefined&&saved!==null&&saved!=='')setValue(id,saved);
        else if(el.value)seed[key]=el.value;
      }else if(saved!==undefined&&saved!==null&&saved!==''){
        setValue(id,saved);
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
      Object.keys(map).forEach(function(id){
        const el=document.getElementById(id);
        if(el)patch[map[id]]=el.value;
      });
      store.updateSection('voucher',patch);
    }

    ['voucherAmount','allocation','vowPrice','removed'].forEach(function(id){
      const el=document.getElementById(id);if(el)el.dispatchEvent(new Event('input',{bubbles:true}));
    });

    /* Der VOW-Kurs wird auf der bestehenden Seite programmatisch live gesetzt. */
    setTimeout(saveAll,1500);
    setTimeout(saveAll,4000);
    window.addEventListener('pagehide',saveAll);
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')saveAll()});
  }

  loadCore().then(init).catch(function(err){console.warn('[HotelStorage] Voucher-Seite konnte nicht verbunden werden:',err)});
})();
