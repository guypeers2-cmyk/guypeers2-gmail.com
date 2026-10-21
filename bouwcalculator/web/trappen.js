/* Schematic stairs: measured drawing objects, never quotation work packages. */
(function(){
  'use strict';
  const $=s=>document.querySelector(s),dialog=$('#trap-menu'),host=$('#plan');
  const fields=['naam','richting','breedte','lengte','hoogte','treden','x','y'];
  let context=null,opener=null,drag=null,suppress=0;
  function check(t,room){
    if(t.x<0||t.y<0)throw Error('De trap valt buiten de kamer. Pas X/Y aan of draai terug.');
    if(!t.naam.trim()||t.naam.length>100)throw Error('Geef een trapnaam van 1 tot 100 tekens.');
    if(['x','y','breedte','lengte','hoogte','richting','treden'].some(k=>!Number.isFinite(t[k]))||t.x<0||t.y<0||['breedte','lengte','hoogte'].some(k=>t[k]<.05||t[k]>100)||![0,90,180,270].includes(t.richting)||!Number.isInteger(t.treden)||t.treden<2||t.treden>40)throw Error('Controleer de trapmaten, richting en het aantal treden.');
    const ps=BouwPlan.trapGeometrie(t).voet.map(a=>({x:a[0],y:a[1]}));
    if(!ps.every(p=>BouwVorm.inside(room,p))||!ps.every((p,i)=>BouwVorm.segmentInside(room,p,ps[(i+1)%ps.length])))throw Error('De trap past niet binnen de kamer. Pas de positie, richting of maten aan.');
    if(ps.some(p=>t.hoogte>BouwVorm.height(room,p.x,p.y)+.000001))throw Error('De trap komt boven het plafond. Controleer de hoogte en plaatsing.');
  }
  function draft(){
    const t={id:context.id};
    fields.forEach(k=>t[k]=k==='naam'?$('#trap-'+k).value.trim():$('#trap-'+k).value===''?NaN:Number($('#trap-'+k).value));
    return t;
  }
  function preview(){
    if(!context)return;
    const status=$('#trap-draai-status'),target=$('#trap-voorbeeld');
    try{
      const room=current(),t=draft();
      if(['x','y','breedte','lengte','hoogte','richting','treden'].some(k=>!Number.isFinite(t[k]))||t.breedte<=0||t.lengte<=0||t.hoogte<=0||!Number.isInteger(t.treden)||t.treden<2||t.treden>40){target.innerHTML='';throw Error('Vul geldige trapmaten en 2 tot 40 treden in voor het voorbeeld.');}
      const P=BouwPlan.planProjectie(room).P,points=BouwVorm.points(room).map(p=>P(p.x,p.y).join(',')).join(' ');
      target.innerHTML=`<svg viewBox="0 0 780 540" role="img" aria-label="Traprichting op het kamerplan; noord is boven"><polygon class="trap-preview-kamer" points="${points}"/>${BouwPlan.trapOverlay({...room,trappen:[t]},P,false,false)}</svg>`;
      check(t,room);$('#trap-fout').hidden=true;
      status.textContent=`Stijgrichting: ${$('#trap-richting').selectedOptions[0].textContent}. Past binnen de kamer. Nog niet bewaard.`;
    }catch(error){status.textContent=error.message;$('#trap-fout').textContent=error.message;$('#trap-fout').hidden=false;}
  }
  $('#trap-form').addEventListener('input',preview);
  $('#trap-form').addEventListener('change',preview);
  dialog.querySelectorAll('[data-trap-draai]').forEach(button=>button.addEventListener('click',()=>{
    try{current();const t=draft();if(![t.x,t.y,t.breedte,t.lengte].every(Number.isFinite)||t.breedte<=0||t.lengte<=0)throw Error('Vul eerst geldige maten en een positie in.');
      const next=BouwPlan.draaiTrap(t,Number(button.dataset.trapDraai));
      ['x','y','richting'].forEach(k=>$('#trap-'+k).value=next[k]);preview();
    }catch(error){$('#trap-fout').textContent=error.message;$('#trap-fout').hidden=false;}
  }));
  function open(id){
    const room=actieveRuimte();if(!room)return;
    const existing=(room.trappen||[]).find(t=>t.id===id);
    if(!existing&&(room.trappen||[]).length>=100){toast('Gebruik maximaal 100 trappen per kamer.');return;}
    const t=existing||{id:uid(),naam:'Trap',richting:0,breedte:.9,lengte:Math.min(2.4,room.breedte),hoogte:room.hoogte,treden:14,x:Math.max(0,(room.lengte-.9)/2),y:Math.max(0,(room.breedte-Math.min(2.4,room.breedte))/2)};
    opener=document.activeElement;context={project:state.project,room:room.id,id:t.id,existing:!!existing};
    fields.forEach(k=>$('#trap-'+k).value=t[k]);$('#trap-fout').hidden=true;$('#trap-verwijder').hidden=!existing;
    $('#trap-titel').textContent=existing?'Trap bewerken':'Trap toevoegen';preview();if(!dialog.open)dialog.showModal();$('#trap-naam').focus();
  }
  function current(){const r=actieveRuimte();if(!context||context.project!==state.project||context.room!==r?.id)throw Error('De kamer is veranderd. Sluit het venster en probeer opnieuw.');return r;}
  $('#trap-form').addEventListener('submit',e=>{
    e.preventDefault();try{const r=current(),t=draft();check(t,r);
      const index=(r.trappen||[]).findIndex(t=>t.id===context.id);if(context.existing&&index<0)throw Error('Deze trap bestaat niet meer.');
      wijzig(()=>{r.trappen ||= [];if(index<0)r.trappen.push(t);else r.trappen[index]=t;});dialog.close();toast('Trap bewaard. Alleen de tekening is gewijzigd; geen offertepost toegevoegd.');
    }catch(error){$('#trap-fout').textContent=error.message;$('#trap-fout').hidden=false;}
  });
  $('#trap-sluit').addEventListener('click',()=>dialog.close());
  $('#trap-verwijder').addEventListener('click',()=>{try{const r=current(),id=context.id;if(!confirm('Deze trap uit de tekening verwijderen?'))return;wijzig(()=>r.trappen=r.trappen.filter(t=>t.id!==id));dialog.close();}catch(error){$('#trap-fout').textContent=error.message;$('#trap-fout').hidden=false;}});
  dialog.addEventListener('close',()=>{if(dialog.open)return;const id=context?.id;context=null;const target=[...host.querySelectorAll('[data-trap-id]')].find(e=>e.dataset.trapId===id)||opener;if(target?.isConnected&&target.getClientRects().length)target.focus({preventScroll:true});else $('[data-trap-toevoegen]')?.focus({preventScroll:true});});
  document.addEventListener('click',e=>{const del=e.target.closest('[data-trap-verwijder]');if(del){const room=actieveRuimte(),id=del.dataset.trapVerwijder,t=room?.trappen?.find(t=>t.id===id);if(t&&confirm(`“${t.naam}” uit de tekening verwijderen?`)){wijzig(()=>room.trappen=room.trappen.filter(t=>t.id!==id));toast('Trap verwijderd.');}return;}if(e.target.closest('[data-trap-toevoegen]'))open();const b=e.target.closest('[data-trap-edit]');if(b)open(b.dataset.trapEdit);});
  function projection(){return planWeergave==='isometrie'?BouwPlan.projectie(actieveRuimte(),planCamera.hoek).P:planWeergave==='aanzicht'?BouwPlan.aanzichtProjectie(actieveRuimte(),planVlak).P:BouwPlan.planProjectie(actieveRuimte()).P;}
  function redraw(t){
    const node=[...host.querySelectorAll('[data-trap-id]')].find(e=>e.dataset.trapId===t.id);if(node)node.outerHTML=BouwPlan.trapOverlay({...actieveRuimte(),trappen:[t]},projection(),planWeergave==='isometrie');
  }
  function end(cancel=false){
    if(!drag)return;const d=drag;drag=null;host.classList.remove('is-slepen');suppress=performance.now()+500;
    if(host.hasPointerCapture?.(d.pointer))host.releasePointerCapture(d.pointer);
    if(state.project!==d.project||actieveRuimte()?.id!==d.room){renderPlan();return;}
    if(!d.moved){if(!cancel)open(d.id);return;}
    if(cancel){renderPlan();return;}
    try{check(d.draft,actieveRuimte());const t=actieveRuimte().trappen.find(t=>t.id===d.id);if(!t)throw Error('Trap niet gevonden.');wijzig(()=>Object.assign(t,{x:d.draft.x,y:d.draft.y}));}catch(error){renderPlan();toast(error.message);}
  }
  host.addEventListener('pointerdown',e=>{
    const node=e.target.closest('[data-trap-id]');if(!node||!e.isPrimary||e.button!==0||planGereedschap!=='select')return;
    // Wall elevations remain editable with the form; dragging uses the floor plane.
    if(planWeergave==='aanzicht'&&!['vloer','plafond'].includes(planVlak))return;
    const r=actieveRuimte(),t=r.trappen.find(t=>t.id===node.dataset.trapId),P=projection(),a=P(0,0,0),b=P(1,0,0),c=P(0,1,0),u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-a[0],c[1]-a[1]],det=u[0]*v[1]-u[1]*v[0];if(Math.abs(det)<1e-8)return;
    e.preventDefault();e.stopImmediatePropagation();drag={pointer:e.pointerId,project:state.project,room:r.id,id:t.id,draft:{...t},before:{...t},sx:e.clientX,sy:e.clientY,u,v,det,inverse:host.querySelector('svg').getScreenCTM().inverse(),moved:false};host.setPointerCapture(e.pointerId);host.focus({preventScroll:true});
  },true);
  host.addEventListener('pointermove',e=>{
    const d=drag;if(!d||d.pointer!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
    if(state.project!==d.project||actieveRuimte()?.id!==d.room){end(true);return;}
    if(Math.hypot(e.clientX-d.sx,e.clientY-d.sy)<4&&!d.moved)return;d.moved=true;host.classList.add('is-slepen');
    const dx=d.inverse.a*(e.clientX-d.sx)+d.inverse.c*(e.clientY-d.sy),dy=d.inverse.b*(e.clientX-d.sx)+d.inverse.d*(e.clientY-d.sy);
    d.draft.x=Math.round(Math.max(0,d.before.x+(dx*d.v[1]-dy*d.v[0])/d.det)*20)/20;
    d.draft.y=Math.round(Math.max(0,d.before.y+(d.u[0]*dy-d.u[1]*dx)/d.det)*20)/20;redraw(d.draft);
  },{capture:true,passive:false});
  host.addEventListener('pointerup',e=>{if(drag?.pointer===e.pointerId){e.stopImmediatePropagation();end();}},true);
  host.addEventListener('pointercancel',e=>{if(drag?.pointer===e.pointerId)end(true);},true);
  host.addEventListener('lostpointercapture',()=>{if(drag)end(true);});
  host.addEventListener('click',e=>{if(performance.now()<suppress){e.preventDefault();e.stopImmediatePropagation();return;}const t=e.target.closest('[data-trap-id]');if(t){e.preventDefault();e.stopImmediatePropagation();open(t.dataset.trapId);}},true);
  window.BouwTrappen={check};
  host.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag){e.preventDefault();end(true);return;}const t=e.target.closest('[data-trap-id]');if(t&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();open(t.dataset.trapId);}});
})();
