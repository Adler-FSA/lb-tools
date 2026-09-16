/* LiquidityBooster · Speicherbruecke fuer hotel-direktmix-gastzugang.html */
(function(){
  'use strict';

  const IDS=[
    'totalRevenue','bookNow','otaNow','directNow','otherNow',
    'bookTarget','otaTarget','directTarget','otherTarget',
    'bookCost','otaCost','directCost','otherCost',
    'guestAccesses','partnerRate','e2Rate','e2Avg','e3Rate','e3Avg',
    'offerValue','benefitPct','marketBookings','directCostPct'
  ];

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

  function init(store){
    if(!store)return;
    const current=store.getSection('directMix');
    const seed={};

    IDS.forEach(function(id){
      const el=document.getElementById(id);
      if(!el)return;
      if(Object.prototype.hasOwnProperty.call(current,id) && current[id]!=='' && current[id]!==null && current[id]!==undefined){
        el.value=String(current[id]);
      }else{
        seed[id]=el.value;
      }
      const save=function(){
        const patch={};
        patch[id]=el.value;
        store.updateSection('directMix',patch);
      };
      el.addEventListener('input',save);
      el.addEventListener('change',save);
    });

    if(Object.keys(seed).length)store.updateSection('directMix',seed);

    /* Bestehende Rechnerlogik mit den wiederhergestellten Werten neu ausloesen. */
    const first=document.getElementById('totalRevenue');
    if(first)first.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function loadStandalonePdf(){
    if(window.HotelDirectMixStandalonePdf)return;
    if(document.querySelector('script[data-lb-directmix-standalone-pdf]'))return;
    const s=document.createElement('script');
    s.src='./hotel-direktmix-pdf.js?v=1';
    s.async=false;
    s.dataset.lbDirectmixStandalonePdf='1';
    document.head.appendChild(s);
  }

  loadCore().then(init).catch(function(err){
    console.warn('[HotelStorage] Direktmix-Seite konnte nicht verbunden werden:',err);
  });
  loadStandalonePdf();
})();
