/** Minimaler DE/EN-Layer für neue Nebenkosten-Premium-Seiten. */
const KEY='akademie:nebenskosten-premium:v1:language';
let lang='de';
function read(){try{const v=localStorage.getItem(KEY);return v==='en'?'en':'de';}catch{return 'de';}}
function write(v){try{localStorage.setItem(KEY,v);}catch{}}
export function getLanguage(){return lang;}
export function initI18n(dictionary){
  lang=read();
  const apply=()=>{
    document.documentElement.lang=lang;
    document.querySelectorAll('[data-i18n]').forEach(node=>{
      const key=node.dataset.i18n, text=dictionary?.[key]?.[lang];
      if(typeof text==='string') node.textContent=text;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(node=>{
      const key=node.dataset.i18nPlaceholder, text=dictionary?.[key]?.[lang];
      if(typeof text==='string') node.setAttribute('placeholder',text);
    });
    document.querySelectorAll('[data-lang]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.lang===lang)));
    window.dispatchEvent(new CustomEvent('app-language-change',{detail:{lang}}));
  };
  document.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>{
    const next=btn.dataset.lang==='en'?'en':'de';
    if(next===lang)return; lang=next; write(lang); apply();
  }));
  apply();
  return {apply,get language(){return lang;}};
}
