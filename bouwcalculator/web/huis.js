/* House layout is geometry only: work and prices remain attached to rooms. */
(function(){
  'use strict';
  const $=s=>document.querySelector(s),clone=v=>JSON.parse(JSON.stringify(v));
  let niveau='ruimte',view='2d',snede=null,gekozen=null,gereedschap='select',pan=null,suppress=0;
  const camera=BouwHuisCamera.maak(),host=$('#huis-plan');
  const V=()=>window.BouwVorm;
  const selected=()=>state.project?.ruimtes.find(r=>r.id===gekozen);
  let placementRoom=null,placementDirty=false,placementProject=null;
  const empty=r=>!(r.openingen||[]).length&&!state.project.regels.some(x=>x.ruimte_id===r.id)&&!Object.keys(r.wand_helling||{}).length;
  const message=s=>$('#huis-melding').textContent=s;
  function splitPreview(r){
    if(!r||!empty(r)||!$('#huis-splits-invoer').open||$('#huis-splits-invoer').hidden)return {parts:null,error:''};
    const axis=$('#huis-split-as').value,value=Number($('#huis-split-waarde').value);
    try{
      let parts;
      if(axis==='vrij'){
        if(snede?.room!==r.id||snede.punten.length!==2)return {parts:null,error:snede?.punten.length?'Kies het tweede grenspunt.':'Kies het eerste grenspunt op een kamerwand.'};
        parts=V().split(r,...snede.punten);
      }else{
        if(!['x','y'].includes(axis)||!$('#huis-split-waarde').value)return {parts:null,error:'Geef een positie binnen de kamer.'};
        parts=V().cutAt(r,axis,value);
      }
      return {parts:parts.sort((a,b)=>Math.min(...a.map(p=>p.x))-Math.min(...b.map(p=>p.x))||Math.min(...a.map(p=>p.y))-Math.min(...b.map(p=>p.y))),error:''};
    }catch(error){return {parts:null,error:error.message};}
  }
  function preview(r){return splitPreview(r).parts;}
  function cutFeedback(){
    const r=selected(),{parts,error}=splitPreview(r),free=$('#huis-split-as').value==='vrij';
    $('#huis-split-schuif').disabled=free;
    $('#huis-split-schuif-label').hidden=free;$('#huis-split-positie-label').hidden=free;
    let text=parts?parts.map((ps,i)=>(free?'Deel '+(i+1):$('#huis-split-as').value==='x'?(i?'Rechts':'Links'):(i?'Onder':'Boven'))+' '+NR.format(Math.abs(V().area(ps)))+' m²').join(' · '):error||'Kies een positie binnen de kamer voor een voorbeeld.';
    if(free&&parts){const [a,b]=snede.punten;text+=' · Wand '+NR.format(Math.hypot(a.x-b.x,a.y-b.y))+' m';}
    $('#huis-split-preview').textContent=text;
    $('#huis-split-preview').dataset.valid=String(!!parts);
    $('#huis-split-schuif').setAttribute('aria-valuetext',free?text:NR.format(Number($('#huis-split-waarde').value))+' meter; '+text);
    $('#huis-snede-terug').hidden=!free||!snede?.punten.length;
    $('#huis-splits-form [type="submit"]').disabled=!parts;
    document.querySelectorAll('[data-indeling-as]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.indelingAs===$('#huis-split-as').value)));
  }
  function undoCutPoint(){
    if(!snede?.punten.length)return;
    snede.punten.pop();render();cutFeedback();message('Laatste grenspunt teruggenomen. '+(snede.punten.length?'Kies het tweede grenspunt.':'Kies het eerste grenspunt.'));host.focus({preventScroll:true});
  }
  function quickCut(axis){try{
    const r=splitRoom();eindePan(true);gereedschap='select';view='2d';snede=null;camera.passend();
    $('#huis-splits-invoer').open=true;$('#huis-split-as').value=axis;$('#huis-split-waarde').disabled=false;
    $('#huis-split-waarde').value=Math.round((axis==='x'?r.lengte:r.breedte)*500)/1000;$('#huis-split-schuif').value=50;
    render();cutFeedback();message('Verschuif de scheidingswand. Het gekleurde voorbeeld is nog niet opgeslagen. Bevestig met Splitsen toepassen.');
    $('#huis-split-schuif').scrollIntoView({block:'nearest',behavior:'instant'});$('#huis-split-schuif').focus({preventScroll:true});
  }catch(error){message(error.message);}}
  function svg(project,mode='2d',selection=null,magnify=1,options={}){
    const h=project.huis;if(!h)return '<div class="huis-leeg"><h4>Begin met je huisplan</h4><p>Teken de binnencontour en deel die daarna in kamers in.</p><button type="button" class="knop primair" data-huis-start>Huiscontour tekenen</button><small>Je bestaande kamers en werkposten blijven bewaard.</small></div>';
    const rooms=project.ruimtes.filter(r=>r.huis_positie),L=h.lengte,B=h.breedte,H=Math.max(h.hoogte,...rooms.map(r=>Number(r.hoogte))),iso=mode==='3d';
    const raw=(x,y,z=0)=>{const [u,v]=iso?BouwHuisCamera.draai(x,y,L,B,options.hoek||0):[x,y];return iso?[(u-v)*.866,(u+v)*.5-z]:[x,y];};
    const bounds=V().points(h).flatMap(a=>[raw(a.x,a.y),raw(a.x,a.y,H)]),xs=bounds.map(p=>p[0]),ys=bounds.map(p=>p[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=iso?Math.min(...ys):0,maxY=iso?Math.max(...ys):B,s=Math.min(680/Math.max(.1,maxX-minX),400/Math.max(.1,maxY-minY));
    const P=(x,y,z=0)=>{const a=raw(x,y,z);return [(800-(maxX-minX)*s)/2+(a[0]-minX)*s,50+(400-(maxY-minY)*s)/2+(a[1]-minY)*s];};
    const polygon=(ps,cls,attrs='')=>`<polygon class="${cls}" points="${ps.map(a=>P(a.x,a.y,a.z||0).map(v=>v.toFixed(2)).join(',')).join(' ')}" ${attrs}/>`;
    const text=(a,t,cls='huis-label',dy=0)=>{const q=P(a.x,a.y,a.z||0);return `<text class="${cls}" text-anchor="middle" x="${q[0]}" y="${q[1]+dy}">${esc(t)}</text>`;};
    let out=polygon(V().points(h),'huis-buiten');
    const depth=r=>raw(r.huis_positie.x+r.lengte/2,r.huis_positie.y+r.breedte/2)[1];
    const ordered=[...rooms].sort((a,b)=>depth(a)-depth(b));
    for(const r of ordered){
      const o=r.huis_positie,ps=V().points(r),world=p=>({...p,x:p.x+o.x,y:p.y+o.y}),cls=r.id===selection?' geselecteerd':'';
      out+=`<g class="huis-kamer${cls}" data-huis-ruimte="${esc(r.id)}" tabindex="0" role="button" aria-pressed="${r.id===selection}" aria-label="Selecteer ${esc(r.naam)}">`;
      out+=polygon(ps.map(world),'huis-vloer');
      if(iso){const ts=V().top(r);for(let i=0;i<ps.length;i++)out+=polygon([ps[i],ps[(i+1)%ps.length],ts[(i+1)%ps.length],ts[i]].map(world),'huis-wand');out+=polygon(ts.map(world),'huis-dak');}
      if(window.BouwPlan){
        (r.openingen||[]).forEach((o,i)=>{const g=BouwPlan.openingGeometrie(r,i);if(!g)return;const ps=(iso?[g.a,g.b,g.c,g.d]:[g.a,g.b]).map(a=>world({x:a[0],y:a[1],z:iso?a[2]:0}));out+=`<g class="huis-opening"><title>${esc(o.naam)} · ${esc(r.naam)}</title>`+(iso?polygon(ps,'huis-opening-vlak'):`<polyline points="${ps.map(a=>P(a.x,a.y).join(',')).join(' ')}"/>`)+'</g>';});
        project.regels.filter(w=>w.ruimte_id===r.id).forEach((w,i)=>{const pakket=state.prijsboek?.pakketten.find(p=>p.id===w.pakket_id);if(!pakket)return;const g=BouwPlan.werkGeometrie({...w,pakket,nummer:i+1},r),a=P(g.a[0]+o.x,g.a[1]+o.y,iso?g.a[2]:0),b=P(g.b[0]+o.x,g.b[1]+o.y,iso?g.b[2]:0);out+=`<g class="huis-object"><title>${esc(pakket.naam)} · ${esc(r.naam)} · open de kamer om te bewerken</title>${pakket.eenheid==='m'?`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`:''}<circle cx="${a[0]}" cy="${a[1]}" r="6"/></g>`;});
      }
      const a=world(V().interior(r));out+=text(a,r.naam,'huis-label',-4)+text(a,NR.format(Math.abs(V().area(ps)))+' m²','huis-oppervlak',16);out+='</g>';
    }
    const top=V().points(h);top.forEach((a,i)=>{const b=top[(i+1)%top.length];out+=text({x:(a.x+b.x)/2,y:(a.y+b.y)/2-.15},NR.format(Math.hypot(a.x-b.x,a.y-b.y))+' m','huis-maat');});
    const pieces=preview(selected());
    if(pieces&&!iso&&selection===selected()?.id){const o=selected().huis_positie;pieces.forEach((ps,i)=>{out+=polygon(ps.map(p=>({x:p.x+o.x,y:p.y+o.y})),`indeling-preview indeling-deel-${i}`);});}
    if(snede?.room===selection&&!iso){for(const a of snede.punten){const q=P(a.x+selected().huis_positie.x,a.y+selected().huis_positie.y);out+=`<circle class="huis-snede-punt" cx="${q[0]}" cy="${q[1]}" r="7"/>`;}if(snede.punten.length===2){const [a,b]=snede.punten.map(a=>P(a.x+selected().huis_positie.x,a.y+selected().huis_positie.y));out+=`<line class="huis-snede-lijn" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;}}
    const focus=rooms.find(r=>r.id===selection),anchor=focus?V().interior(focus):{x:L/2,y:B/2},center=focus?P(anchor.x+focus.huis_positie.x,anchor.y+focus.huis_positie.y):[400,250],box=BouwHuisCamera.viewBox(center,magnify,options.x||0,options.y||0);
    return `<svg viewBox="${box.join(' ')}" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="${iso?'3D':'2D'} huisplan" data-huis-schaal="${s}" data-huis-x="${P(0,0)[0]}" data-huis-y="${P(0,0)[1]}">${out}</svg>`;
  }
  function render(redraw=true){
    if(!state.project||!V())return;
    if(!selected()){gekozen=(state.project.ruimtes.find(r=>r.huis_positie)||(state.project.huis?state.project.ruimtes[0]:null))?.id||null;snede=null;redraw=true;}
    if(snede&&(!selected()?.huis_positie||snede.room!==gekozen))snede=null;
    document.body.classList.toggle('huisstand-actief',niveau==='huis');
    $('#werkvlak').classList.toggle('huisstand',niveau==='huis');$('#huis-paneel').hidden=niveau!=='huis';
    document.querySelectorAll('[data-ontwerpniveau]').forEach(b=>{const on=b.dataset.ontwerpniveau===niveau;b.setAttribute('aria-pressed',on);b.classList.toggle('actief',on);});
    document.querySelectorAll('[data-huis-view]').forEach(b=>{const on=b.dataset.huisView===view;b.setAttribute('aria-pressed',on);b.classList.toggle('actief',on);});
    $('#huis-undo').disabled=!projectHistorie.kanUndo();$('#huis-redo').disabled=!projectHistorie.kanRedo();
    if(redraw)renderCanvas();
    renderSelectie();
    const cam=camera.lees();
    $('#huis-draaien').hidden=view!=='3d';
    $('#huis-camera-status').textContent=`${Math.round(cam.zoom*100)}%${view==='3d'?` · ${cam.hoek*90}°`:''}`;
    document.querySelectorAll('[data-huis-zoom]').forEach(b=>{b.disabled=b.dataset.huisZoom==='in'?cam.zoom>=3:b.dataset.huisZoom==='uit'?cam.zoom<=1:false;});
    document.querySelectorAll('[data-huis-tool]').forEach(b=>{const on=b.dataset.huisTool===gereedschap;b.setAttribute('aria-pressed',String(on));b.classList.toggle('actief',on);});
    host.classList.toggle('huis-hand',gereedschap==='hand');
    $('#huis-camera-hulp').textContent=gereedschap==='hand'?'Hand: sleep het beeld, niet de kamers. Pijltjes verschuiven; Escape annuleert de beweging.':'Selecteer een kamer met klikken of Tab/Enter. Dubbelklik opent de kamer. Kies Hand om het beeld te verschuiven.';
    const h=state.project.huis,rs=state.project.ruimtes.filter(r=>r.huis_positie),total=rs.reduce((s,r)=>s+Math.abs(V().area(V().points(r))),0),apart=state.project.ruimtes.length-rs.length;
    // Progressive disclosure: camera/placement controls need an actual contour.
    $('#huis-paneel').querySelectorAll('[data-huis-ready]').forEach(el=>el.hidden=!h);
    $('#huis-draaien').hidden=!h||view!=='3d';
    $('#huis-kamers').hidden=!h;
    $('.huis-acties').hidden=!h||!selected();
    $('#huis-splits-invoer').hidden=!h||!selected()?.huis_positie||!empty(selected());
    if($('#huis-splits-invoer').hidden){$('#huis-splits-invoer').open=false;snede=null;}
    cutFeedback();
    const history=projectHistorie.kanUndo()||projectHistorie.kanRedo();
    $('#huis-undo').hidden=$('#huis-redo').hidden=!h&&!history;
    const stage=!h?1:(rs.length>1||(selected()&&!empty(selected()))?3:2);
    document.querySelectorAll('[data-huis-stap]').forEach(el=>{
      const step=Number(el.dataset.huisStap);el.classList.toggle('afgerond',step<stage);
      if(step===stage)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
    });
    const chip=(value,label)=>`<span title="${esc(label)}" aria-label="${esc(label)}">${esc(value)}</span>`;
    const area=h?Math.abs(V().area(V().points(h))):0;
    $('#huis-statistiek').innerHTML=h?chip(`${NR.format(area)} m²`,'Woningoppervlakte')+chip(`▱ ${rs.length}`,'Kamers op het huisplan')+chip(`${NR.format(Math.max(0,area-total))} m²`,'Nog niet ingedeelde oppervlakte')+(apart?`<button type="button" data-huis-buiten title="Kamers buiten het huisplan bekijken en plaatsen">⚠ ${apart} buiten plan</button>`:''):'⌂ Eén verdieping · m';
    $('#huis-open').disabled=!selected();$('#huis-splits').disabled=!selected()?.huis_positie;
    if(!$('#huis-kamerlijst').contains(document.activeElement))$('#huis-kamerlijst').innerHTML=state.project.ruimtes.map(r=>`<button type="button" class="knop" data-huis-kies="${esc(r.id)}" aria-pressed="${r.id===gekozen}">${esc(r.naam)} · ${r.huis_positie?`X ${NRL.format(r.huis_positie.x)}, Y ${NRL.format(r.huis_positie.y)}`:'buiten huisplan'}</button>`).join('');
    $('#huis-kamerlijst').querySelectorAll('[data-huis-kies]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.huisKies===gekozen)));
    window.BouwStudio?.sync();
    syncPlacement();
  }
  function syncPlacement(){
    if(placementProject!==state.project){placementDirty=false;placementRoom=null;placementProject=state.project;}
    const r=selected(),el=$('#huis-plaats-ruimte');
    const html=state.project.ruimtes.map(r=>`<option value="${esc(r.id)}">${esc(r.naam)}</option>`).join('');
    if(el.innerHTML!==html)el.innerHTML=html;
    if(r)el.value=r.id;
    if(placementRoom!==r?.id||!placementDirty){
      placementRoom=r?.id||null;placementDirty=false;
      $('#huis-plaats-x').value=r?.huis_positie?.x??0;$('#huis-plaats-y').value=r?.huis_positie?.y??0;
    }
    $('#huis-losmaken').disabled=!r?.huis_positie;
    $('#huis-plaats-status').textContent=placementDirty?'Nog niet toegepast. Kies Plaats / verplaats ruimte om te bevestigen.':r?.huis_positie?'Positie vanaf de linkerbovenhoek van het huisplan, in meter.':'Deze kamer staat buiten het huisplan. Werken blijven meetellen in de offerte.';
  }
  ['#huis-plaats-x','#huis-plaats-y'].forEach(id=>$(id).addEventListener('input',()=>{placementDirty=true;syncPlacement();}));
  function renderCanvas(){
    if(!state.project||!V())return;
    const cam=camera.lees();host.innerHTML=svg(state.project,view,gekozen,cam.zoom,cam);
  }
  let renameRoom=null,renameProject=null,renameOriginal='',renameDirty=false;
  function syncName(r){
    const form=$('#huis-naam-form'),input=$('#huis-kamer-naam');
    form.hidden=!r||!state.project.huis;
    if(!r)return;
    if(renameRoom!==r.id||renameProject!==state.project||renameOriginal!==r.naam||!renameDirty){
      if(renameRoom!==r.id||renameProject!==state.project)$('#huis-naam-status').textContent='';
      renameRoom=r.id;renameProject=state.project;renameOriginal=r.naam;renameDirty=false;
      input.value=r.naam;input.setCustomValidity('');
    }
    $('#huis-naam-annuleer').disabled=!renameDirty;
  }
  $('#huis-kamer-naam').addEventListener('input',()=>{renameDirty=true;$('#huis-kamer-naam').setCustomValidity('');$('#huis-naam-status').textContent='';$('#huis-naam-annuleer').disabled=false;});
  function cancelName(){renameDirty=false;syncName(selected());$('#huis-naam-status').textContent='Naamswijziging geannuleerd.';$('#huis-kamer-naam').focus({preventScroll:true});}
  $('#huis-naam-annuleer').addEventListener('click',cancelName);
  $('#huis-naam-form').addEventListener('keydown',e=>{if(e.key==='Escape'&&renameDirty){e.preventDefault();e.stopPropagation();cancelName();}});
  $('#huis-naam-form').addEventListener('submit',e=>{
    e.preventDefault();const r=selected(),input=$('#huis-kamer-naam'),name=input.value.trim();
    if(!r||renameRoom!==r.id||renameProject!==state.project||renameOriginal!==r.naam){syncName(r);$('#huis-naam-status').textContent='De kamer is veranderd. Controleer de naam en probeer opnieuw.';return;}
    if(!name||name.length>100){input.setCustomValidity('Geef een kamernaam van 1 tot 100 tekens.');input.reportValidity();return;}
    if(name===r.naam){renameDirty=false;syncName(r);$('#huis-naam-status').textContent='Naam ongewijzigd.';return;}
    renameDirty=false;wijzig(()=>r.naam=name);$('#huis-naam-status').textContent='Kamernaam bewaard.';message(`${name} geselecteerd.`);input.focus({preventScroll:true});
  });
  function renderSelectie(){
    const r=selected(),panel=$('#huis-selectie-info');syncName(r);panel.hidden=!r||!state.project.huis;
    if(!r){panel.innerHTML='';return;}
    const vs=V().surfaces(r),opp=id=>NR.format(vs.find(v=>v.sleutel===id).netto),count=state.project.regels.filter(w=>w.ruimte_id===r.id).length;
    panel.innerHTML=`<strong>${esc(r.naam)}</strong>${r.huis_positie?'':'<p class="huis-buiten-info">Buiten huisplan · open de kamer om werken te bewerken, of plaats ze hieronder.</p>'}<dl><div><dt title="Vloeroppervlakte"><span aria-hidden="true">▱</span><span class="compact-sr">Vloer</span></dt><dd>${opp('vloer')} m²</dd></div><div><dt title="Plafondoppervlakte"><span aria-hidden="true">▱↑</span><span class="compact-sr">Plafond</span></dt><dd>${opp('plafond')} m²</dd></div><div><dt title="Netto wandoppervlakte"><span aria-hidden="true">▥</span><span class="compact-sr">Netto wanden</span></dt><dd>${NR.format(vs.filter(v=>v.soort==='muur').reduce((n,v)=>n+v.netto,0))} m²</dd></div><div><dt title="Aantal werkposten"><span aria-hidden="true">☷</span><span class="compact-sr">Werkposten</span></dt><dd>${count}</dd></div></dl>${empty(r)?'':'<p class="hint">Indeling beschermd: werken, openingen of wandhelling.</p>'}`;
  }
  function openSelected(){
    const r=selected();if(!r)return;
    eindePan(true);state.actieveRuimteId=r.id;planSelectie=null;window.BouwMeten?.reset();setLevel('ruimte');
    $('#tekening').scrollIntoView({block:'start',behavior:'instant'});$('#ruimte-tekenen').focus();
  }
  function setLevel(n){
    eindePan(true);suppress=0;const changed=niveau!==n;
    if(changed&&n==='huis'&&actieveRuimte())gekozen=state.actieveRuimteId;
    if(changed&&n==='ruimte'&&selected()){
      state.actieveRuimteId=selected().id;planSelectie=null;planInspectieOpen=false;
      Object.assign(planCamera,{zoom:1,panX:0,panY:0});window.BouwMeten?.reset();
    }
    niveau=n;snede=null;if(changed)window.render();else render();
  }
  function choose(id){
    const r=state.project.ruimtes.find(r=>r.id===id);if(!r)return;
    const unchanged=gekozen===id&&!!r.huis_positie&&!snede;
    gekozen=id;placementDirty=false;
    $('#huis-plaats-ruimte').value=id;$('#huis-plaats-x').value=r.huis_positie?.x||0;$('#huis-plaats-y').value=r.huis_positie?.y||0;
    snede=null;render(!unchanged);message(`${r.naam} geselecteerd${r.huis_positie?'':'; nog niet op het huisplan'}.`);
  }
  function splitRoom(){const r=selected();if(!r?.huis_positie)throw Error('Selecteer eerst een kamer op het huisplan.');if(!empty(r))throw Error('Splits eerst de indeling vóór je werken, openingen of schuine wanden toevoegt. Deze kamer bevat die al; er wordt niets verwijderd.');return r;}
  function startCut(){try{const r=splitRoom();eindePan(true);gereedschap='select';view='2d';snede={room:r.id,punten:[]};$('#huis-split-as').value='vrij';$('#huis-split-waarde').disabled=true;$('#huis-splits-invoer').open=true;$('#huis-indeling-precies').open=true;render();cutFeedback();message('Tik op twee punten van de geselecteerde kamergrens. De punten klikken op de dichtstbijzijnde wand. Druk daarna op Splitsen toepassen.');host.scrollIntoView({block:'center',behavior:'instant'});host.focus({preventScroll:true});}catch(e){message(e.message);}}
  $('#huis-tekenen').addEventListener('click',()=>{
    if(!V())return;const old=state.project.huis;
    BouwRuimteVorm.openHouse(old||{id:'huis',lengte:10,breedte:8,hoogte:2.5,contour:[],dak:null},m=>{
      const candidate=clone(state.project),model={contour:m.contour,dak:m.dak,hoogte:m.hoogte,lengte:m.lengte,breedte:m.breedte};candidate.huis=model;
      if(!old){
        const reuse=candidate.ruimtes.length===1&&empty(candidate.ruimtes[0]);
        if(!confirm(reuse?'De lege startruimte wordt de onverdeelde woning. Daarna kun je die in kamers splitsen. Doorgaan?':'Een onverdeelde woning toevoegen? Bestaande kamers en werkposten blijven buiten het huisplan bewaard en blijven meetellen in de offerte.'))throw Error('Huis tekenen geannuleerd. Er is niets veranderd.');
        const r={...model,id:reuse?candidate.ruimtes[0].id:uid(),naam:'Onverdeelde woning',openingen:[],wand_helling:{},huis_positie:{x:0,y:0}};
        if(reuse)candidate.ruimtes=[r];else candidate.ruimtes.push(r);gekozen=r.id;
      }
      V().layout(candidate);wijzig(()=>{state.project=candidate;});niveau='huis';render();message('Huiscontour opgeslagen. Selecteer een kamer en kies Kamer splitsen.');
    });
  });
  document.addEventListener('click',e=>{
    if(!e.target.closest('#huis-hulp'))$('#huis-hulp').open=false;
    const level=e.target.closest('[data-ontwerpniveau]');if(level)setLevel(level.dataset.ontwerpniveau);
    const vw=e.target.closest('[data-huis-view]');if(vw){eindePan(true);view=vw.dataset.huisView;snede=null;camera.verschuif(0,0);render();}
    const zm=e.target.closest('[data-huis-zoom]');if(zm){eindePan(true);if(zm.dataset.huisZoom==='reset')camera.passend();else camera.zoom(camera.lees().zoom+(zm.dataset.huisZoom==='in'?.25:-.25));render();}
    const turn=e.target.closest('[data-huis-draai]');if(turn){eindePan(true);camera.draai(Number(turn.dataset.huisDraai));render();}
    const tool=e.target.closest('[data-huis-tool]');if(tool){eindePan(true);suppress=0;gereedschap=tool.dataset.huisTool;snede=null;render();}
    if(e.target.closest('[data-huis-buiten]')){const r=state.project.ruimtes.find(r=>!r.huis_positie);if(r){choose(r.id);$('#huis-kamers').open=true;$('#huis-kamers').scrollIntoView({block:'nearest',behavior:'instant'});$('#huis-kamers summary').focus({preventScroll:true});}}
    const room=e.target.closest('[data-huis-kies]');if(room)choose(room.dataset.huisKies);
    if(e.target.closest('[data-actie="ruimte-kiezen"]'))setLevel('ruimte');
  });
  $('#huis-plan').addEventListener('click',e=>{
    if(e.target.closest('[data-huis-start]')){$('#huis-tekenen').click();return;}
    if(performance.now()<suppress){suppress=0;e.preventDefault();return;}
    if(gereedschap==='hand')return;
    if(snede){
      if(snede.punten.length===2){message('Snede klaar. Kies Splitsen toepassen of neem het laatste punt terug.');return;}
      const svgEl=$('#huis-plan svg'),r=selected(),point=svgEl.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const q=point.matrixTransform(svgEl.getScreenCTM().inverse()),s=Number(svgEl.dataset.huisSchaal),o=r.huis_positie;
      const p={x:(q.x-Number(svgEl.dataset.huisX))/s-o.x,y:(q.y-Number(svgEl.dataset.huisY))/s-o.y};
      let best=null,dist=Infinity;for(const ed of V().edges(r)){const raw=(p.x-ed.a.x)*ed.u[0]+(p.y-ed.a.y)*ed.u[1],t=Math.max(0,Math.min(ed.lengte,Math.round(raw/.05)*.05)),a={x:ed.a.x+ed.u[0]*t,y:ed.a.y+ed.u[1]*t},d=Math.hypot(a.x-p.x,a.y-p.y);if(d<dist){best=a;dist=d;}}
      const snap=svgEl.createSVGPoint();snap.x=Number(svgEl.dataset.huisX)+(best.x+o.x)*s;snap.y=Number(svgEl.dataset.huisY)+(best.y+o.y)*s;
      const screen=snap.matrixTransform(svgEl.getScreenCTM());
      if(Math.hypot(screen.x-e.clientX,screen.y-e.clientY)>26){message('Tik dichter bij een wand van de geselecteerde kamer.');return;}
      if(snede.punten.some(a=>Math.hypot(a.x-best.x,a.y-best.y)<.001)){message('Dit grenspunt is al gekozen. Kies een ander punt.');return;}
      snede.punten.push(best);render();cutFeedback();message(snede.punten.length===2?'Twee grenspunten gekozen. Controleer de snede en kies Splitsen toepassen.':'Eerste punt gekozen. Kies het tweede grenspunt.');return;
    }
    const g=e.target.closest('[data-huis-ruimte]');if(g)choose(g.dataset.huisRuimte);
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!e.defaultPrevented&&$('#huis-hulp').open){
      e.preventDefault();$('#huis-hulp').open=false;$('#huis-hulp summary').focus();
    }
  });
  host.addEventListener('dblclick',e=>{
    if(gereedschap!=='select'||snede||performance.now()<suppress)return;
    const g=e.target.closest('[data-huis-ruimte]');if(g){e.preventDefault();choose(g.dataset.huisRuimte);openSelected();}
  });
  host.addEventListener('keydown',e=>{
    if(e.key==='Backspace'&&snede){e.preventDefault();undoCutPoint();return;}
    if(e.key==='Escape'){
      if(pan){e.preventDefault();eindePan(true);return;}
      if(snede){e.preventDefault();snede=null;$('#huis-splits-invoer').open=false;render();cutFeedback();message('Snede geannuleerd.');}return;
    }
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&(gereedschap==='hand'||e.target===host)){
      e.preventDefault();const cam=camera.lees(),step=(e.shiftKey?100:35)/cam.zoom;
      camera.verschuif(cam.x+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0),cam.y+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0));renderCanvas();return;
    }
    if(['Enter',' '].includes(e.key)&&gereedschap==='select'){
      const g=e.target.closest('[data-huis-ruimte]');if(g){e.preventDefault();choose(g.dataset.huisRuimte);$('#huis-open').focus();}
    }
  });
  function eindePan(cancel=false){
    if(!pan)return;
    const p=pan;pan=null;
    if(cancel){camera.verschuif(p.voor.x,p.voor.y);renderCanvas();}
    host.classList.remove('huis-pannen');
    if(host.hasPointerCapture(p.id))host.releasePointerCapture(p.id);
    if(p.moved)suppress=performance.now()+500;
  }
  host.addEventListener('pointerdown',e=>{
    if(pan||snede||!e.isPrimary||!(e.button===1||(e.button===0&&gereedschap==='hand')))return;
    const matrix=host.querySelector('svg')?.getScreenCTM()?.inverse();if(!matrix)return;
    e.preventDefault();host.focus({preventScroll:true});
    pan={id:e.pointerId,cx:e.clientX,cy:e.clientY,voor:camera.lees(),matrix,moved:false};
    host.setPointerCapture(e.pointerId);host.classList.add('huis-pannen');
  });
  host.addEventListener('pointermove',e=>{
    if(pan?.id!==e.pointerId)return;e.preventDefault();
    const dx=e.clientX-pan.cx,dy=e.clientY-pan.cy;
    if(Math.hypot(dx,dy)<4&&!pan.moved)return;pan.moved=true;
    camera.verschuif(pan.voor.x-pan.matrix.a*dx-pan.matrix.c*dy,pan.voor.y-pan.matrix.b*dx-pan.matrix.d*dy);renderCanvas();
  },{passive:false});
  host.addEventListener('pointerup',e=>{if(pan?.id===e.pointerId)eindePan();});
  host.addEventListener('pointercancel',e=>{if(pan?.id===e.pointerId)eindePan(true);});
  host.addEventListener('lostpointercapture',()=>{if(pan)eindePan(true);});
  $('#huis-open').addEventListener('click',openSelected);
  $('#huis-splits').addEventListener('click',()=>quickCut('x'));
  document.querySelectorAll('[data-indeling-as]').forEach(b=>b.addEventListener('click',()=>quickCut(b.dataset.indelingAs)));
  $('#huis-split-schuif').addEventListener('input',()=>{const r=selected();if(!r)return;const axis=$('#huis-split-as').value;if(!['x','y'].includes(axis))return;$('#huis-split-waarde').value=Math.round((axis==='x'?r.lengte:r.breedte)*Number($('#huis-split-schuif').value)*10)/1000;renderCanvas();cutFeedback();});
  $('#huis-split-waarde').addEventListener('input',()=>{const r=selected();if(r)$('#huis-split-schuif').value=Number($('#huis-split-waarde').value)/( $('#huis-split-as').value==='x'?r.lengte:r.breedte)*100;renderCanvas();cutFeedback();});
  $('#huis-splits-invoer').addEventListener('toggle',()=>{renderCanvas();cutFeedback();});
  $('#huis-snede-start').addEventListener('click',startCut);
  $('#huis-snede-terug').addEventListener('click',undoCutPoint);
  $('#huis-snede-stop').addEventListener('click',()=>{snede=null;$('#huis-splits-invoer').open=false;render();message('Splitsen geannuleerd.');});
  $('#huis-split-as').addEventListener('change',()=>{const free=$('#huis-split-as').value==='vrij';$('#huis-split-waarde').disabled=free;if(!free)snede=null;render();cutFeedback();});
  $('#huis-splits-form').addEventListener('submit',e=>{
    e.preventDefault();try{
      const r=splitRoom(),as=$('#huis-split-as').value;let halves;
      if(as==='vrij'){if(snede?.room!==r.id||snede.punten.length!==2)throw Error('Kies eerst twee grenspunten op de tekening.');halves=V().split(r,...snede.punten);}
      else halves=V().cutAt(r,as,Number($('#huis-split-waarde').value));
      halves.sort((a,b)=>Math.min(...a.map(p=>p.x))-Math.min(...b.map(p=>p.x))||Math.min(...a.map(p=>p.y))-Math.min(...b.map(p=>p.y)));
      const candidate=clone(state.project),children=halves.map((ps,i)=>{
        const mx=Math.min(...ps.map(a=>a.x)),my=Math.min(...ps.map(a=>a.y)),contour=V().contour(ps),lengte=Math.max(...contour.map(a=>a.x)),breedte=Math.max(...contour.map(a=>a.y));
        let dak=null;if(r.dak){const d=r.dak;dak={as:d.as,start:V().height(r,mx,my),eind:V().height(r,mx+(d.as==='x'?lengte:0),my+(d.as==='y'?breedte:0))};}
        return {...r,id:i?uid():r.id,naam:$('#huis-naam-'+(i?'b':'a')).value.trim()||r.naam+(i?' B':' A'),contour,lengte,breedte,dak,hoogte:dak?Math.max(dak.start,dak.eind):r.hoogte,huis_positie:{x:Math.round((r.huis_positie.x+mx)*1e6)/1e6,y:Math.round((r.huis_positie.y+my)*1e6)/1e6}};
      });
      candidate.ruimtes.splice(candidate.ruimtes.findIndex(x=>x.id===r.id),1,...children);V().layout(candidate);
      wijzig(()=>{state.project=candidate;});gekozen=children[0].id;snede=null;$('#huis-splits-invoer').open=false;$('#huis-naam-a').value=$('#huis-naam-b').value='';render();message('Twee kamers gemaakt. Selecteer een kamer en open die om werken en objecten toe te voegen.');
    }catch(error){message(error.message);}
  });
  $('#huis-plaats-ruimte').addEventListener('change',()=>choose($('#huis-plaats-ruimte').value));
  $('#huis-plaats-form').addEventListener('submit',e=>{e.preventDefault();try{if(!state.project.huis)throw Error('Teken eerst de huiscontour.');const id=$('#huis-plaats-ruimte').value,p=V().position({x:$('#huis-plaats-x').value,y:$('#huis-plaats-y').value}),candidate=clone(state.project),r=candidate.ruimtes.find(r=>r.id===id);r.huis_positie=p;V().layout(candidate);gekozen=id;placementDirty=false;wijzig(()=>{state.project=candidate;});message('Ruimte geplaatst. Werken en openingen zijn behouden.');}catch(error){message(error.message);}});
  $('#huis-losmaken').addEventListener('click',()=>{const r=state.project.ruimtes.find(r=>r.id===$('#huis-plaats-ruimte').value);if(!r?.huis_positie)return;if(!confirm(`${r.naam} alleen van het huisplan halen? De kamer en alle werkposten blijven behouden in de offerte.`))return;placementDirty=false;wijzig(()=>{r.huis_positie=null;});message('Ruimte staat nu buiten het huisplan; de offerte is behouden.');});
  $('#huis-undo').addEventListener('click',()=>historieStap('undo'));$('#huis-redo').addEventListener('click',()=>historieStap('redo'));
  window.BouwHuis={render,svg,setLevel,renderSelectie,getLevel:()=>niveau};render();
})();
