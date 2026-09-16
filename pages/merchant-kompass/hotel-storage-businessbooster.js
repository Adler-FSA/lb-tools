/* LiquidityBooster · Speicherbrücke nur für hotel-businessbooster.html */
(function(){
  'use strict';

  function loadCore(){
    if(window.LBHotelStorage)return Promise.resolve(window.LBHotelStorage);
    return new Promise(function(resolve,reject){
      const existing=document.querySelector('script[data-lb-hotel-storage-core]');
      if(existing){
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

  function hasValue(v){return v!==undefined&&v!==null&&v!==''}
  function setValue(el,value){if(el&&hasValue(value))el.value=String(value)}

  function init(store){
    if(!store)return;

    const current=store.getSection('businessBooster');
    const direct=store.getSection('directBooking');
    const map={
      otaRevenue:'otaRevenue',
      otaPct:'otaPercent',
      avgBooking:'averageBooking',
      shiftPct:'targetDirectShiftPercent'
    };
    const seed={};

    Object.keys(map).forEach(function(id){
      const el=document.getElementById(id),key=map[id];
      if(!el)return;

      let saved=current[key];
      if(!hasValue(saved)&&id==='otaPct'&&hasValue(direct.otaPercent))saved=direct.otaPercent;

      if(hasValue(saved)){
        setValue(el,saved);
      }else{
        seed[key]=el.value;
      }

      const save=function(){
        const patch={};
        patch[key]=el.value;
        store.updateSection('businessBooster',patch);
      };
      el.addEventListener('input',save);
      el.addEventListener('change',save);
    });

    if(Object.keys(seed).length)store.updateSection('businessBooster',seed);

    const planButtons=[...document.querySelectorAll('.planBtn[data-plan]')];
    let selectedPlan=hasValue(current.selectedPlan)?String(current.selectedPlan):'';
    const storedButton=selectedPlan?planButtons.find(function(btn){return btn.dataset.plan===selectedPlan}):null;
    if(storedButton){
      storedButton.click();
    }else{
      const active=planButtons.find(function(btn){return btn.classList.contains('active')})||planButtons[0];
      if(active)store.updateSection('businessBooster',{selectedPlan:active.dataset.plan});
    }

    planButtons.forEach(function(btn){
      btn.addEventListener('click',function(){
        store.updateSection('businessBooster',{selectedPlan:btn.dataset.plan});
      });
    });

    Object.keys(map).forEach(function(id){
      const el=document.getElementById(id);
      if(el)el.dispatchEvent(new Event('input',{bubbles:true}));
    });
  }

  function loadStandalonePdf(){
    if(window.HotelBusinessBoosterStandalonePdf)return;
    if(document.querySelector('script[data-lb-bb-standalone-pdf]'))return;
    const s=document.createElement('script');
    s.src='./hotel-businessbooster-pdf.js?v=1';
    s.async=false;
    s.dataset.lbBbStandalonePdf='1';
    document.head.appendChild(s);
  }

  loadCore().then(init).catch(function(err){
    console.warn('[HotelStorage] BusinessBooster-Seite konnte nicht verbunden werden:',err);
  });
  loadStandalonePdf();
})();
