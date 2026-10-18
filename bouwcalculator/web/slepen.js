/* Pointer Events: mouse, pen and touch. Capture stays on the stable #plan host,
 * never on an SVG child replaced during live rendering. Pure geometry helpers
 * are also exported for regression tests; app state is accessed only on input.
 */
(function () {
  'use strict';
  function projectDelta(P, plane, dx, dy) {
    const axes = {xy:[0,1],xz:[0,2],yz:[1,2]}[plane];
    const origin = P(0,0,0);
    const vectors = axes.map(axis => {
      const v = [0,0,0]; v[axis] = 1;
      const q = P(...v); return [q[0]-origin[0],q[1]-origin[1]];
    });
    const [a,b] = vectors;
    const determinant = a[0]*b[1]-b[0]*a[1];
    if (Math.abs(determinant) < 1e-8) return [0,0,0];
    const out = [0,0,0];
    out[axes[0]] = (dx*b[1]-dy*b[0])/determinant;
    out[axes[1]] = (dy*a[0]-dx*a[1])/determinant;
    return out;
  }
  function boundedDelta(a,b,delta,limits,step=0) {
    return delta.map((d,i) => {
      if (step && Math.abs(d)>1e-9) d = Math.round((a[i]+d)/step)*step-a[i];
      return Math.max(-Math.min(a[i],b[i]), Math.min(limits[i]-Math.max(a[i],b[i]), d));
    });
  }
  window.BouwSleep = {projectDelta,boundedDelta};
  const host = document.querySelector('#plan');
  if (!host) return;
  let drag = null, suppressClickUntil = 0;
  const copy = v => JSON.parse(JSON.stringify(v));
  const coord = n => Math.round(n*1000)/1000;
  const note = text => {const el=document.querySelector('#plan-sleepstatus'); if(el) el.textContent=text;};
  function planeFor(surface,isOpening=false) {
    if (planWeergave === 'aanzicht') return window.BouwPlan.aanzichtProjectie(actieveRuimte(),planVlak).plane;
    if (planWeergave !== 'isometrie') return 'xy';
    const requested = document.querySelector('#plan-sleepvlak')?.value;
    if (!isOpening && ['xy','xz','yz'].includes(requested)) return requested;
    return ['noord','zuid'].includes(surface) ? 'xz' : ['west','oost'].includes(surface) ? 'yz' : 'xy';
  }
  function svgPoint(e) {
    const svg = host.querySelector('svg');
    const matrix = svg?.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint(); point.x=e.clientX; point.y=e.clientY;
    return point.matrixTransform(matrix.inverse());
  }
  function prepare(target) {
    const group = target.closest?.('[data-plan-drag]');
    const room = actieveRuimte();
    if (!group || !host.contains(group) || !room) return null;
    const isOpening = group.dataset.planDrag === 'opening';
    const r = isOpening ? null : planRegels(room).find(r=>r.id===group.dataset.planRegel);
    const index = Number(group.dataset.openingIndex);
    const geom = isOpening ? window.BouwPlan.openingGeometrie(room,index) : r && window.BouwPlan.werkGeometrie(r,room);
    if (!geom) return null;
    const model = isOpening ? room.openingen[index] : state.project.regels.find(v=>v.id===r.id);
    const endpoint = target.closest?.('[data-plan-end]')?.dataset.planEnd || null;
    const route = r?.pakket.eenheid === 'm';
    return {room,model,r,index,isOpening,geom,endpoint,route,
      original:copy(model), plane:planeFor(isOpening ? geom.zijde : r.oppervlak,isOpening),
      P:(planWeergave==='aanzicht' ? window.BouwPlan.aanzichtProjectie(room,planVlak) : planWeergave==='isometrie' ? window.BouwPlan.projectie(room,planCamera.hoek) : window.BouwPlan.planProjectie(room)).P};
  }
  function apply(d,delta,step) {
    const {geom:g,model:m} = d, limits=[g.L,g.B,g.H];
    if (d.isOpening) {
      const axis = ['noord','zuid'].includes(g.zijde) ? 0 : 1;
      const value = (n,change,max) => coord(Math.max(0,Math.min(max,step && Math.abs(change)>1e-9 ? Math.round((n+change)/step)*step : n+change)));
      m.positie=value(g.a[axis],delta[axis],Math.max(0,g.lengte-g.breedte));
      if (planWeergave!=='plattegrond' && !/^deur/i.test(m.naam || '')) {
        m.borstwering=value(g.a[2],delta[2],Math.max(0,g.H-g.hoogte));
      }
      note(`Opening: ${m.positie.toFixed(2)} m langs de wand · onderkant ${Number(m.borstwering || 0).toFixed(2)} m.`);
    } else {
      const a=g.a, b=d.route ? g.b : g.a;
      let da,db;
      if (d.endpoint==='a') {da=boundedDelta(a,a,delta,limits,step);db=[0,0,0];}
      else if (d.endpoint==='b') {da=[0,0,0];db=boundedDelta(b,b,delta,limits,step);}
      else da=db=boundedDelta(a,b,delta,limits,step);
      const nextA=a.map((n,i)=>coord(n+da[i])),nextB=b.map((n,i)=>coord(n+db[i]));
      m.visualisatie={...(d.original.visualisatie || {}),x:nextA[0],y:nextA[1],z:nextA[2]};
      if (d.route) Object.assign(m.visualisatie,{x2:nextB[0],y2:nextB[1],z2:nextB[2]});
      const active=d.endpoint==='b' ? nextB : nextA;
      note(`Positie X ${active[0].toFixed(2)} · Y ${active[1].toFixed(2)} · Z ${active[2].toFixed(2)} m.`);
    }
    renderPlan();
  }
  function restore(d) {
    Object.keys(d.model).forEach(k=>delete d.model[k]);
    Object.assign(d.model,d.original);
    renderPlan();
  }
  function commit(d) {
    bewaarLokaal();
    if (d.isOpening) {
      const kaart=document.querySelector('#ruimtekaart');
      if (kaart) kaart.innerHTML=renderRuimtekaart(d.room);
    } else {
      // Sync placement fields without closing expanded details or moving focus.
      document.querySelectorAll('[data-plaatsing]').forEach(el=>{
        if(el.closest('[data-regel]')?.dataset.regel===d.model.id) el.value=d.model.visualisatie?.[el.dataset.plaatsing] ?? '';
      });
    }
    renderOfferte();
    bereken();
    note('Positie opgeslagen. Offertehoeveelheden blijven ongewijzigd.');
  }
  function finish(cancel=false) {
    if (!drag) return;
    const d=drag; drag=null;
    if (host.hasPointerCapture?.(d.pointerId)) host.releasePointerCapture(d.pointerId);
    host.classList.remove('is-slepen');
    if (!d.moved) {
      suppressClickUntil=performance.now()+500;
      if (cancel) {note('Verplaatsing geannuleerd.');return;}
      if (d.isOpening) {
        selecteerPlanOpening(d.index);
      } else selecteerPlanRegel(d.model.id);
      return;
    }
    suppressClickUntil=performance.now()+500;
    if (cancel) {restore(d);note('Verplaatsing geannuleerd.');}
    else commit(d);
  }
  host.addEventListener('pointerdown',e=>{
    if (drag || !e.isPrimary || e.button!==0) return;
    const d=prepare(e.target),point=svgPoint(e);
    if (!d || !point) return;
    drag={...d,point,startX:e.clientX,startY:e.clientY,pointerId:e.pointerId,moved:false};
    host.setPointerCapture(e.pointerId);
  });
  host.addEventListener('pointermove',e=>{
    if (!drag || drag.pointerId!==e.pointerId) return;
    if (!drag.moved && Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<4) return;
    const point=svgPoint(e); if(!point) return;
    e.preventDefault(); drag.moved=true;host.classList.add('is-slepen');
    const dx=point.x-drag.point.x,dy=point.y-drag.point.y;
    let delta=projectDelta(drag.P,drag.plane,dx,dy);
    if(drag.isOpening && planWeergave==='plattegrond') {
      // Only the distance along the chosen wall changes in a top view.
      if(['noord','zuid'].includes(drag.geom.zijde)) delta[1]=0;else delta[0]=0;
    }
    const step=document.querySelector('#plan-snap')?.checked && !e.altKey ? .05 : 0;
    apply(drag,delta,step);
  },{passive:false});
  host.addEventListener('pointerup',e=>{if(drag?.pointerId===e.pointerId) finish();});
  host.addEventListener('pointercancel',e=>{if(drag?.pointerId===e.pointerId) finish(true);});
  host.addEventListener('lostpointercapture',()=>{if(drag) finish(true);});
  document.addEventListener('click',e=>{
    if(performance.now()<suppressClickUntil && e.target.closest?.('#plan')) {
      e.preventDefault();e.stopImmediatePropagation();suppressClickUntil=0;
    }
  },true);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && drag){e.preventDefault();finish(true);return;}
    if(planGereedschap==='hand' || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key) || drag) return;
    const d=prepare(e.target);if(!d)return;
    e.preventDefault();e.stopImmediatePropagation();
    const step=e.altKey ? .01 : e.shiftKey ? .25 : .05;
    const axes={xy:[0,1],xz:[0,2],yz:[1,2]}[d.plane],delta=[0,0,0];
    if(e.key==='ArrowRight')delta[axes[0]]=step;
    if(e.key==='ArrowLeft')delta[axes[0]]=-step;
    if(e.key==='ArrowUp')delta[axes[1]]=axes[1]===2 ? step : -step;
    if(e.key==='ArrowDown')delta[axes[1]]=axes[1]===2 ? -step : step;
    if(planWeergave==='aanzicht')delta[axes[0]]*=window.BouwPlan.aanzichtProjectie(d.room,planVlak).teken;
    if(d.isOpening && planWeergave==='plattegrond') {
      if(['noord','zuid'].includes(d.geom.zijde))delta[1]=0;else delta[0]=0;
    }
    apply(d,delta,0);commit(d);
    // Rendering replaced the focused SVG element; restore keyboard navigation.
    const next=[...host.querySelectorAll('[data-plan-drag]')].find(el=>d.isOpening
      ? Number(el.dataset.openingIndex)===d.index : el.dataset.planRegel===d.model.id);
    const focus=d.endpoint ? next?.querySelector(`[data-plan-end="${d.endpoint}"]`) : next;
    focus?.focus({preventScroll:true});
  },true);
})();
