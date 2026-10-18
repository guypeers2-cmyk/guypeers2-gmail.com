/* One safe insertion flow for drawing shortcuts, catalog and room form. */
(function(){
  'use strict';
  const $=s=>document.querySelector(s),dialog=$('#opening-menu');
  let context=null,opener=null,committed=false;
  const presets=()=>context?.soort==='Deur'?[[.8,2.1,0],[.9,2.1,0],[1,2.1,0]]:[[.6,.6,.9],[1.2,1.2,.9],[1.8,1.2,.9]];
  function draft(){
    const room=actieveRuimte();
    if(!dialog.open||!context||state.project!==context.project||room?.id!==context.room)throw Error('De kamer is veranderd. Sluit dit venster en kies de kamer opnieuw.');
    const fields=['#opening-breedte','#opening-hoogte','#opening-onderkant'];
    if(fields.some(id=>$(id).value==='')||[...fields,'#opening-positie'].some(id=>$(id).validity.badInput))throw Error('Vul breedte, hoogte en onderkant volledig en geldig in.');
    const wall=$('#opening-wand').value,edge=BouwVorm.edges(room).find(e=>e.id===wall);
    const width=Number($('#opening-breedte').value),height=Number($('#opening-hoogte').value),bottom=Number($('#opening-onderkant').value);
    const start=$('#opening-positie').value===''?(edge?.lengte-width)/2:Number($('#opening-positie').value);
    if(!edge||![width,height,bottom,start].every(Number.isFinite)||width<=0||height<=0||bottom<0||start<0||start+width>edge.lengte+.000001)throw Error('Deze opening past niet op de wand. Controleer breedte en positie.');
    const low=BouwVorm.height(room,edge.a.x+edge.u[0]*start,edge.a.y+edge.u[1]*start),high=BouwVorm.height(room,edge.a.x+edge.u[0]*(start+width),edge.a.y+edge.u[1]*(start+width));
    if(bottom+height>Math.min(low,high)+.000001)throw Error('De opening komt boven het plafond. Verlaag de hoogte of de onderkant.');
    if(Object.keys(room.wand_helling||{}).length){
      const a=BouwVorm.wallRange(room,wall,bottom),b=BouwVorm.wallRange(room,wall,bottom+height);
      if(start<Math.max(a[0],b[0])-.000001||start+width>Math.min(a[1],b[1])+.000001)throw Error('De opening past niet binnen deze schuine wand. Pas de positie of maten aan.');
    }
    return {room,wall,edge,width,height,bottom,start};
  }
  function info(){
    if(!context)return;
    const room=actieveRuimte(),edge=BouwVorm.edges(room).find(e=>e.id===$('#opening-wand').value);
    $('#opening-wand-info').textContent=edge?`Wandlengte ${NR.format(edge.lengte)} m. Lege positie plaatst de opening in het midden.`:'';
    $('#opening-fout').hidden=true;
    let value=null,error='';try{value=draft();}catch(e){error=e.message;}
    const status=$('#opening-preview-status');
    status.textContent=value?`Links ${NR.format(value.start)} m · rechts ${NR.format(Math.max(0,edge.lengte-value.start-value.width))} m. Schematisch wandaanzicht, geen uitvoeringsdetail.${Object.keys(room.wand_helling||{}).length?' Controleer de wandhelling in de kamertekening.':''}`:error;
    status.dataset.valid=String(!!value);
    $('#opening-presets').querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-pressed',String(presets()[i].every((n,j)=>Number($(['#opening-breedte','#opening-hoogte','#opening-onderkant'][j]).value)===n))));
    if(!edge){$('#opening-voorbeeld').innerHTML='';return;}
    const h0=BouwVorm.height(room,edge.a.x,edge.a.y),h1=BouwVorm.height(room,edge.b.x,edge.b.y),scale=Math.min(300/edge.lengte,86/Math.max(h0,h1)),x=(360-edge.lengte*scale)/2;
    const n=v=>Number(v.toFixed(3));
    const opening=value?`<rect class="opening-preview-gat" x="${n(x+value.start*scale)}" y="${n(106-(value.bottom+value.height)*scale)}" width="${n(value.width*scale)}" height="${n(value.height*scale)}"/>`:'';
    $('#opening-voorbeeld').innerHTML=`<svg viewBox="0 0 360 116" focusable="false"><polygon class="opening-preview-wand" points="${n(x)},106 ${n(x+edge.lengte*scale)},106 ${n(x+edge.lengte*scale)},${n(106-h1*scale)} ${n(x)},${n(106-h0*scale)}"/>${opening}</svg>`;
  }
  function open(soort,vlak){
    const room=actieveRuimte();if(!room)return;
    opener=document.activeElement;committed=false;
    context={project:state.project,room:room.id,soort:soort==='Raam'?'Raam':'Deur'};
    const edges=BouwVorm.edges(room),wall=edges.some(e=>e.id===vlak)?vlak:planWeergave==='aanzicht'&&edges.some(e=>e.id===planVlak)?planVlak:edges[0]?.id;
    $('#opening-titel').textContent=context.soort+' toevoegen';
    $('#opening-wand').innerHTML=ruimteWanden(room).map(w=>`<option value="${esc(w.sleutel)}">${esc(w.naam)}</option>`).join('');
    $('#opening-wand').value=wall;
    $('#opening-breedte').value=soort==='Raam'?1.2:.9;$('#opening-hoogte').value=soort==='Raam'?1.2:2.1;
    $('#opening-onderkant').value=soort==='Raam'?.9:0;$('#opening-positie').value='';
    $('#opening-presets').innerHTML=presets().map((p,i)=>`<button type="button" class="knop" data-opening-preset="${i}" aria-pressed="false">${NR.format(p[0])} × ${NR.format(p[1])} m</button>`).join('');
    if(!dialog.open)dialog.showModal();info();$('#opening-wand').focus();
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-opening-snel]');if(b)open(b.dataset.openingSnel);});
  $('#opening-sluit').addEventListener('click',()=>dialog.close());
  $('#opening-form').addEventListener('input',info);
  $('#opening-wand').addEventListener('change',info);
  $('#opening-presets').addEventListener('click',e=>{
    const button=e.target.closest('[data-opening-preset]');if(!button)return;
    const values=presets()[Number(button.dataset.openingPreset)];if(!values)return;
    ['#opening-breedte','#opening-hoogte','#opening-onderkant'].forEach((id,i)=>$(id).value=values[i]);info();
  });
  dialog.addEventListener('close',()=>{if(dialog.open)return;context=null;const target=committed?document.querySelector('#plan-inspector input'):opener?.getClientRects().length?opener:document.querySelector('[data-opening-snel]');target?.focus({preventScroll:true});});
  $('#opening-form').addEventListener('submit',e=>{
    e.preventDefault();try{
      const {room,wall,width,height,bottom,start}=draft();
      const index=room.openingen.length,opening={naam:context.soort,muur:wall,breedte:width,hoogte:height,aantal:1,positie:Math.round(start*1e6)/1e6,borstwering:bottom};
      wijzig(()=>room.openingen.push(opening));committed=true;dialog.close();selecteerPlanOpening(index);planInspectieOpen=true;renderPlanSelectie();
      if(planWeergave==='aanzicht'){planVlak=wall;renderPlan();}
      document.querySelector('#plan-inspector input')?.focus({preventScroll:true});$('#plan-selectie').scrollIntoView({block:'nearest',behavior:'instant'});
      toast(opening.naam+' toegevoegd. Sleep om te verplaatsen of pas de eigenschappen aan.');
    }catch(error){$('#opening-fout').textContent=error.message;$('#opening-fout').hidden=false;}
  });
  window.BouwOpeningen={open};
})();
