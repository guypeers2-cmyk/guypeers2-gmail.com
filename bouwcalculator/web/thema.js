/* Appearance is a browser preference, never project data or undo history.
 * Loaded before CSS to avoid flashing the wrong palette on startup. */
(function () {
  'use strict';
  const key='bouwcalculator.thema', root=document.documentElement;
  const system=window.matchMedia('(prefers-color-scheme: dark)');
  const valid=value=>['light','dark','auto'].includes(value);
  function read(){try{const value=localStorage.getItem(key);return valid(value)?value:'light';}catch{return 'light';}}
  let preference=read(), storageFailed=false;
  function apply(){
    const dark=preference==='dark'||(preference==='auto'&&system.matches);
    root.dataset.theme=dark?'dark':'light';
    root.dataset.themePreference=preference;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#141b26':'#ffffff');
    const select=document.getElementById('thema-keuze');
    if(select)select.value=preference;
    const status=document.getElementById('thema-status');
    if(status)status.textContent=storageFailed?'Keuze actief, maar bewaren lukt niet in deze browser.':preference==='auto'?`Volgt je apparaat: ${dark?'donker':'licht'}.`:'Je keuze wordt op dit apparaat bewaard.';
  }
  apply();
  system.addEventListener('change',()=>{if(preference==='auto')apply();});
  window.addEventListener('storage',event=>{
    if(event.key!==key&&event.key!==null)return;
    preference=read();storageFailed=false;apply();
  });
  document.addEventListener('DOMContentLoaded',()=>{
    const select=document.getElementById('thema-keuze');
    if(!select)return;
    apply();
    select.addEventListener('change',()=>{
      if(!valid(select.value))return;
      preference=select.value;
      try{localStorage.setItem(key,preference);storageFailed=false;}catch{storageFailed=true;}
      apply();
    });
  },{once:true});
})();
