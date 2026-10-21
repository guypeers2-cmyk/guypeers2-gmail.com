/* Canvas-only camera gestures, independent of project data and history. */
let tekenFocusPlaceholder=null,tekenFocusScroll=0;
function sluitTekenFocus() {
  const dialoog=document.getElementById('teken-focus');
  if(dialoog.open)dialoog.close();
  if(!tekenFocusPlaceholder)return;
  tekenFocusPlaceholder.replaceWith(document.getElementById('tekening'));
  tekenFocusPlaceholder=null;
  document.body.classList.remove('teken-focus-actief');
  document.getElementById('plan-focus').setAttribute('aria-label','Tekening vergroten');
  document.getElementById('plan-focus').title='Tekening vergroten';
  window.scrollTo({top:tekenFocusScroll,behavior:'instant'});
  document.getElementById('plan-focus').focus({preventScroll:true});
}
(function () {
  const host=document.getElementById('plan'),dialoog=document.getElementById('teken-focus');
  let pan=null,suppress=0,heropenNaPrint=false;
  function openFocus() {
    if(dialoog.open)return;
    const kaart=document.getElementById('tekening');
    tekenFocusScroll=window.scrollY;
    tekenFocusPlaceholder=document.createComment('tekening op oorspronkelijke positie');
    kaart.before(tekenFocusPlaceholder);dialoog.append(kaart);
    document.body.classList.add('teken-focus-actief');
    document.getElementById('plan-focus').setAttribute('aria-label','Vergrote tekening sluiten');
    document.getElementById('plan-focus').title='Vergrote tekening sluiten';
    dialoog.showModal();document.getElementById('plan-focus').focus({preventScroll:true});
  }
  document.getElementById('plan-focus').addEventListener('click',()=>dialoog.open?sluitTekenFocus():openFocus());
  dialoog.addEventListener('close',()=>{if(!dialoog.open)sluitTekenFocus();});
  window.addEventListener('beforeprint',()=>{heropenNaPrint=dialoog.open;if(heropenNaPrint)sluitTekenFocus();});
  window.addEventListener('afterprint',()=>{if(heropenNaPrint){heropenNaPrint=false;openFocus();}});
  document.addEventListener('click',e=>{
    const knop=e.target.closest('[data-plan-gereedschap]');if(!knop)return;
    einde(true);
    planGereedschap=knop.dataset.planGereedschap;
    document.querySelectorAll('[data-plan-gereedschap]').forEach(b=>b.setAttribute('aria-pressed',String(b===knop)));
    host.classList.toggle('hand-actief',planGereedschap==='hand');
    host.classList.toggle('draai-actief',planGereedschap==='draai');
    document.getElementById('plan-sleepstatus').textContent=planGereedschap==='hand'
      ? 'Hand: sleep het beeld. Objecten blijven op hun plaats.' : planGereedschap==='draai'?'Draaien: sleep links/rechts rond het 3D-model. Scroll om te zoomen; Escape annuleert.': planGereedschap==='meet' ? 'Meten: wijs twee punten aan of sleep een meetlijn.' : 'Selecteren: sleep objecten of klik om te selecteren.';
    window.BouwMeten?.render();
  });
  const begrens=(n,max)=>Math.max(-max,Math.min(max,n));
  function einde(annuleer=false) {
    if(!pan)return;
    const p=pan;pan=null;
    if(annuleer){planCamera.panX=p.x;planCamera.panY=p.y;planCamera.hoek=p.hoek;renderPlan();}
    host.classList.remove('is-pannen');
    if(host.hasPointerCapture(p.id))host.releasePointerCapture(p.id);
    suppress=performance.now()+500;
  }
  host.addEventListener('pointerdown',e=>{
    if(pan || !e.isPrimary || !(e.button===1 || (e.button===0 && (planGereedschap==='hand'||planGereedschap==='draai'&&planWeergave==='isometrie'))))return;
    const m=host.querySelector('svg')?.getScreenCTM()?.inverse();if(!m)return;
    e.preventDefault();e.stopImmediatePropagation();
    pan={id:e.pointerId,cx:e.clientX,cy:e.clientY,x:planCamera.panX,y:planCamera.panY,hoek:planCamera.hoek,orbit:e.button===0&&planGereedschap==='draai',m};
    host.setPointerCapture(e.pointerId);host.classList.add('is-pannen');host.focus({preventScroll:true});
  },true);
  host.addEventListener('pointermove',e=>{
    if(!pan || pan.id!==e.pointerId)return;
    if(pan.orbit&&(planGereedschap!=='draai'||planWeergave!=='isometrie')){einde(true);return;}
    e.preventDefault();e.stopImmediatePropagation();
    const dx=e.clientX-pan.cx,dy=e.clientY-pan.cy;
    if(pan.orbit){planCamera.hoek=((pan.hoek+dx/180)%4+4)%4;renderPlan();return;}
    planCamera.panX=begrens(pan.x-(pan.m.a*dx+pan.m.c*dy),780);
    planCamera.panY=begrens(pan.y-(pan.m.b*dx+pan.m.d*dy),560);
    renderPlan();
  },true);
  host.addEventListener('wheel',e=>{
    if(planWeergave!=='isometrie'||e.ctrlKey||pan||host.classList.contains('is-slepen')||!host.querySelector('svg'))return;
    e.preventDefault();planCamera.zoom=Math.max(.75,Math.min(3,planCamera.zoom*Math.exp(-Math.max(-100,Math.min(100,e.deltaY))*.0015)));renderPlan();
  },{passive:false});
  host.addEventListener('pointerup',e=>{if(pan?.id===e.pointerId){e.stopImmediatePropagation();einde();}},true);
  host.addEventListener('pointercancel',e=>{if(pan?.id===e.pointerId)einde(true);},true);
  host.addEventListener('lostpointercapture',()=>{if(pan)einde(true);});
  document.addEventListener('click',e=>{
    if(host.querySelector('svg') && e.target.closest?.('#plan') && (['hand','draai'].includes(planGereedschap) || performance.now()<suppress)){
      e.preventDefault();e.stopImmediatePropagation();suppress=0;
    }
  },true);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && pan){e.preventDefault();e.stopImmediatePropagation();einde(true);return;}
    if(planGereedschap==='draai'&&planWeergave==='isometrie'&&e.target.closest?.('#plan')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
      e.preventDefault();e.stopImmediatePropagation();
      if(['ArrowLeft','ArrowRight'].includes(e.key))planCamera.hoek=((planCamera.hoek+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?1/3:1/12))%4+4)%4;
      else planCamera.zoom=Math.max(.75,Math.min(3,planCamera.zoom+(e.key==='ArrowUp'?.1:-.1)));
      renderPlan();return;
    }
    if(planGereedschap!=='hand' || !e.target.closest?.('#plan') || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();e.stopImmediatePropagation();
    const stap=(e.shiftKey?60:24)/planCamera.zoom;
    planCamera.panX=begrens(planCamera.panX+(e.key==='ArrowRight'?stap:e.key==='ArrowLeft'?-stap:0),780);
    planCamera.panY=begrens(planCamera.panY+(e.key==='ArrowDown'?stap:e.key==='ArrowUp'?-stap:0),560);
    renderPlan();host.focus({preventScroll:true});
  },true);
})();

/* Familiar drawing shortcuts only while focus is inside this drawing. */
(function(){
  const host=document.getElementById('plan');
  document.addEventListener('keydown',e=>{
    if(e.defaultPrevented||e.isComposing||e.repeat||e.ctrlKey||e.metaKey||e.altKey||!e.target.closest?.('#tekening')||e.target.closest('input,textarea,select')||e.target.isContentEditable)return;
    const key=e.key.toLowerCase(),tool={v:'select',h:'hand',m:'meet',r:'draai'}[key];
    if(!tool&&key!=='f'||tool==='draai'&&planWeergave!=='isometrie')return;
    e.preventDefault();
    const button=document.querySelector(tool?`[data-plan-gereedschap="${tool}"]`:'[data-camera="reset"]');
    button?.click();
    const selected=planGereedschap==='select'&&[...host.querySelectorAll('[data-plan-drag]')].find(el=>planSelectie?.type==='regel'?el.dataset.planRegel===planSelectie.id:planSelectie?.type==='opening'&&Number(el.dataset.openingIndex)===planSelectie.index);
    (selected||host).focus({preventScroll:true});
  });
  document.addEventListener('bouw-teken-eigenschappen',()=>{
    if(planGereedschap!=='select'||!planSelectie)return;
    if(document.getElementById('plan-inspector').hidden)document.getElementById('plan-eigenschappen').click();
    else document.querySelector('#plan-inspector input,#plan-inspector select')?.focus({preventScroll:true});
  });
})();
