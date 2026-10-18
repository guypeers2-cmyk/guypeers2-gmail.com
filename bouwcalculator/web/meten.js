/* Metric control measurements. Never writes project data or quotation lengths. */
(function () {
  'use strict';
  const afstand=(a,b)=>Math.hypot(...a.map((v,i)=>b[i]-v));
  window.BouwMeten={afstand};
  const host=document.querySelector('#plan');if(!host)return;
  let maat=null,contextKey='',gesture=null,suppress=0;
  const $=s=>document.querySelector(s);
  const assen={xy:[0,1],xz:[0,2],yz:[1,2]};
  const kopie=m=>m?{...m,a:[...m.a],b:[...m.b]}:null;
  function context() {
    if(!state.project)return null;
    const room=actieveRuimte();if(!room)return null;
    const limieten=[room.lengte,room.breedte,room.hoogte].map(n=>Math.max(.2,Number(n)||.2));
    const projectie=planWeergave==='isometrie'?BouwPlan.projectie(room,planCamera.hoek)
      :planWeergave==='aanzicht'?BouwPlan.aanzichtProjectie(room,planVlak):BouwPlan.planProjectie(room);
    const plane=planWeergave==='aanzicht'?projectie.plane:planWeergave==='isometrie'?$('#meet-vlak').value:'xy';
    const vast=[0,0,0];
    if(planWeergave==='aanzicht'){
      if(planVlak==='plafond')vast[2]=limieten[2];
      if(planVlak==='zuid')vast[1]=limieten[1];
      if(planVlak==='oost')vast[0]=limieten[0];
    }
    return {P:projectie.P,plane,vast,limieten,key:JSON.stringify([room.id,planWeergave,planWeergave==='aanzicht'?planVlak:'',plane,...limieten])};
  }
  function punt(e,c) {
    const svg=host.querySelector('svg'),m=svg?.getScreenCTM();if(!m)return null;
    const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
    const q=p.matrixTransform(m.inverse()),o=c.P(...c.vast);
    const d=BouwSleep.projectDelta(c.P,c.plane,q.x-o[0],q.y-o[1]);
    return d.map((v,i)=>Math.max(0,Math.min(c.limieten[i],v+c.vast[i])));
  }
  function render() {
    const c=context(),panel=$('#meet-paneel');
    if(!c){maat=null;contextKey='';panel.hidden=true;return;}
    if(c.key!==contextKey){maat=null;contextKey=c.key;}
    panel.hidden=planGereedschap!=='meet' && !maat;
    host.classList.toggle('meet-actief',planGereedschap==='meet');
    $('#meet-vlak-label').hidden=planWeergave!=='isometrie';
    $('#meet-afstand').textContent=maat?`${new Intl.NumberFormat('nl-BE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(afstand(maat.a,maat.b))} m`:'—';
    $('#meet-instructie').textContent='Tik twee punten of sleep een meetlijn. Controlemaat; geen offertehoeveelheid.';
    if(!$('#meet-form').contains(document.activeElement)){
      const a=maat?.a || c.vast,b=maat?.b || c.vast.map((n,i)=>i===assen[c.plane][0]?Math.min(1,c.limieten[i]):n);
      $('#meet-velden').innerHTML=[a,b].map((p,j)=>assen[c.plane].map(i=>`<label>${j?'Eind':'Start'} ${'XYZ'[i]} (m)<input type="number" name="${j}_${i}" min="0" max="${c.limieten[i]}" step="any" value="${Math.round(p[i]*1000)/1000}" required></label>`).join('')).join('');
    }
    const svg=host.querySelector('svg');if(!svg)return;
    svg.querySelector('.meet-overlay')?.remove();
    if(!maat)return;
    const a=c.P(...maat.a),b=c.P(...maat.b),g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class','meet-overlay');g.setAttribute('aria-label','Controlemaat '+$('#meet-afstand').textContent);
    g.innerHTML=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/><circle cx="${a[0]}" cy="${a[1]}" r="5"/><circle cx="${b[0]}" cy="${b[1]}" r="5"/><text x="${(a[0]+b[0])/2}" y="${(a[1]+b[1])/2-12}" text-anchor="middle">${$('#meet-afstand').textContent}</text>`;
    svg.append(g);
  }
  function einde(annuleer=false) {
    if(!gesture)return;
    const g=gesture;gesture=null;
    if(annuleer)maat=context()?.key===g.c.key?g.voor:null;
    else if(g.verplaatst && maat)maat.klaar=true;
    if(host.hasPointerCapture(g.id))host.releasePointerCapture(g.id);
    suppress=performance.now()+500;render();
  }
  host.addEventListener('pointerdown',e=>{
    if(planGereedschap!=='meet' || !e.isPrimary || e.button!==0 || gesture)return;
    const c=context(),p=c && punt(e,c);if(!p)return;
    e.preventDefault();e.stopImmediatePropagation();
    const voor=kopie(maat);
    if(!maat || maat.klaar)maat={a:p,b:p,klaar:false};else maat={...maat,b:p,klaar:true};
    gesture={id:e.pointerId,x:e.clientX,y:e.clientY,voor,verplaatst:false,c};
    host.setPointerCapture(e.pointerId);render();
  },true);
  host.addEventListener('pointermove',e=>{
    if(planGereedschap!=='meet' || !maat || maat.klaar)return;
    const c=context();
    if(gesture && c?.key!==gesture.c.key){einde(true);return;}
    const p=c && punt(e,c);if(!p)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(gesture && Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>4)gesture.verplaatst=true;
    maat.b=p;render();
  },true);
  host.addEventListener('pointerup',e=>{if(gesture?.id===e.pointerId){e.stopImmediatePropagation();einde();}},true);
  host.addEventListener('pointercancel',e=>{if(gesture?.id===e.pointerId)einde(true);},true);
  host.addEventListener('lostpointercapture',()=>{if(gesture)einde(true);});
  document.addEventListener('click',e=>{
    if(host.querySelector('svg') && e.target.closest?.('#plan') && (planGereedschap==='meet' || performance.now()<suppress)){e.preventDefault();e.stopImmediatePropagation();suppress=0;}
  },true);
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape' || planGereedschap!=='meet' || (!gesture && (!maat || maat.klaar)))return;
    e.preventDefault();e.stopImmediatePropagation();
    if(gesture)einde(true);else {maat=null;render();}
  },true);
  $('#meet-wis').addEventListener('click',()=>{maat=null;render();});
  $('#meet-vlak').addEventListener('change',()=>{maat=null;render();});
  $('#meet-form').addEventListener('submit',e=>{
    e.preventDefault();if(!e.target.reportValidity())return;
    const c=context();if(!c)return;
    const data=new FormData(e.target),a=[...c.vast],b=[...c.vast];
    for(const i of assen[c.plane]){a[i]=Number(data.get('0_'+i));b[i]=Number(data.get('1_'+i));}
    maat={a,b,klaar:true};render();
  });
  Object.assign(window.BouwMeten,{render,reset:()=>{maat=null;contextKey='';},status:()=>maat?{...kopie(maat),plane:context()?.plane,lengte:afstand(maat.a,maat.b)}:null});
  render();
})();
