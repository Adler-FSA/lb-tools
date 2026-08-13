(function(){
  'use strict';
  const status=document.getElementById('offlineStatus');
  const start=document.getElementById('startApp');
  const setStatus=(title,text,ok)=>{
    if(!status) return;
    status.innerHTML='<strong>'+title+'</strong><span>'+text+'</span>';
    status.className='status '+(ok?'ok':'wait');
  };
  if(!('serviceWorker' in navigator)){
    setStatus('Offline-Installation nicht verfügbar','Dieser Browser unterstützt hier keinen Service Worker.',false);
    return;
  }
  setStatus('Offline-Grundlage wird eingerichtet','Die benötigten Programmdateien werden lokal vorbereitet.',false);
  navigator.serviceWorker.register('./sw.js',{scope:'./'})
    .then(()=>navigator.serviceWorker.ready)
    .then(registration=>{
      window.NOTFALLAKTE_OFFLINE={supported:true,registered:true,scope:registration.scope};
      setStatus('Offline-Grundlage bereit ✓','Die Notfallakte kann jetzt aus diesem Geräte-Browser auch ohne Internet gestartet werden.',true);
      if(start) start.hidden=false;
      const params=new URLSearchParams(location.search);
      if(params.get('launch')==='1' && window.matchMedia('(display-mode: standalone)').matches){location.replace('./index.html');}
    })
    .catch(error=>{
      window.NOTFALLAKTE_OFFLINE={supported:true,registered:false,error:String(error&&error.message?error.message:error)};
      setStatus('Offline-Grundlage konnte nicht eingerichtet werden',String(error&&error.message?error.message:error),false);
    });
})();
