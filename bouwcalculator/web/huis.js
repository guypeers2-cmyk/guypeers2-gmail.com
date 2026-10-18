/* House layout is geometry only: work and prices remain attached to rooms. */
(function(){
  'use strict';
  const $=s=>document.querySelector(s),clone=v=>JSON.parse(JSON.stringify(v));
  let niveau='ruimte',view='2d',snede=null,gekozen=null,zoom=1;
  const V=()=>window.BouwVorm;
  const selected=()=>state.project?.ruimtes.find(r=>r.id===gekozen&&r.huis_positie);
  const empty=r=>!(r.openingen||[]).length&&!state.project.regels.some(x=>x.ruimte_id===r.id)&&!Object.keys(r.wand_helling||{}).length;
  const message=s=>$('#huis-melding').textContent=s;
  function svg(project,mode='2d',selection=null,magnify=1){
    const h=project.huis;if(!h)return '<p class="huis-leeg">Begin met <strong>Huiscontour tekenen</strong>. Je bestaande kamers en werkposten blijven bewaard.</p>';
    const rooms=project.ruimtes.filter(r=>r.huis_positie),L=h.lengte,B=h.breedte,H=Math.max(h.hoogte,...rooms.map(r=>Number(r.hoogte))),iso=mode==='3d';
    const raw=(x,y,z=0)=>iso?[(x-y)*.866,(x+y)*.5-z]:[x,y];
    const bounds=V().points(h).flatMap(a=>[raw(a.x,a.y),raw(a.x,a.y,H)]),xs=bounds.map(p=>p[0]),ys=bounds.map(p=>p[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=iso?Math.min(...ys):0,maxY=iso?Math.max(...ys):B,s=Math.min(680/Math.max(.1,maxX-minX),400/Math.max(.1,maxY-minY));
    const P=(x,y,z=0)=>{const a=raw(x,y,z);return [(800-(maxX-minX)*s)/2+(a[0]-minX)*s,50+(400-(maxY-minY)*s)/2+(a[1]-minY)*s];};
    const polygon=(ps,cls,attrs='')=>`<polygon class="${cls}" points="${ps.map(a=>P(a.x,a.y,a.z||0).map(v=>v.toFixed(2)).join(',')).join(' ')}" ${attrs}/>`;
    const text=(a,t,cls='huis-label')=>{const q=P(a.x,a.y,a.z||0);return `<text class="${cls}" text-anchor="middle" x="${q[0]}" y="${q[1]}">${esc(t)}</text>`;};
    let out=polygon(V().points(h),'huis-buiten');
    const ordered=[...rooms].sort((a,b)=>(a.huis_positie.x+a.huis_positie.y)-(b.huis_positie.x+b.huis_positie.y));
    for(const r of ordered){
      const o=r.huis_positie,ps=V().points(r),world=p=>({...p,x:p.x+o.x,y:p.y+o.y}),cls=r.id===selection?' geselecteerd':'';
      out+=`<g class="huis-kamer${cls}" data-huis-ruimte="${esc(r.id)}" tabindex="0" role="button" aria-label="Selecteer ${esc(r.naam)}">`;
      out+=polygon(ps.map(world),'huis-vloer');
      if(iso){const ts=V().top(r);for(let i=0;i<ps.length;i++)out+=polygon([ps[i],ps[(i+1)%ps.length],ts[(i+1)%ps.length],ts[i]].map(world),'huis-wand');out+=polygon(ts.map(world),'huis-dak');}
      if(window.BouwPlan){
        (r.openingen||[]).forEach((o,i)=>{const g=BouwPlan.openingGeometrie(r,i);if(!g)return;const ps=(iso?[g.a,g.b,g.c,g.d]:[g.a,g.b]).map(a=>world({x:a[0],y:a[1],z:iso?a[2]:0}));out+=`<g class="huis-opening"><title>${esc(o.naam)} · ${esc(r.naam)}</title>`+(iso?polygon(ps,'huis-opening-vlak'):`<polyline points="${ps.map(a=>P(a.x,a.y).join(',')).join(' ')}"/>`)+'</g>';});
        project.regels.filter(w=>w.ruimte_id===r.id).forEach((w,i)=>{const pakket=state.prijsboek?.pakketten.find(p=>p.id===w.pakket_id);if(!pakket)return;const g=BouwPlan.werkGeometrie({...w,pakket,nummer:i+1},r),a=P(g.a[0]+o.x,g.a[1]+o.y,iso?g.a[2]:0),b=P(g.b[0]+o.x,g.b[1]+o.y,iso?g.b[2]:0);out+=`<g class="huis-object"><title>${esc(pakket.naam)} · ${esc(r.naam)} · open de kamer om te bewerken</title>${pakket.eenheid==='m'?`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`:''}<circle cx="${a[0]}" cy="${a[1]}" r="6"/></g>`;});
      }
      const a=world(V().interior(r));out+=text(a,r.naam)+text({...a,y:a.y+(iso?.28:.35)},NR.format(Math.abs(V().area(ps)))+' m²','huis-oppervlak');out+='</g>';
    }
    const top=V().points(h);top.forEach((a,i)=>{const b=top[(i+1)%top.length];out+=text({x:(a.x+b.x)/2,y:(a.y+b.y)/2-.15},NR.format(Math.hypot(a.x-b.x,a.y-b.y))+' m','huis-maat');});
    if(snede?.room===selection&&!iso){for(const a of snede.punten){const q=P(a.x+selected().huis_positie.x,a.y+selected().huis_positie.y);out+=`<circle class="huis-snede-punt" cx="${q[0]}" cy="${q[1]}" r="7"/>`;}if(snede.punten.length===2){const [a,b]=snede.punten.map(a=>P(a.x+selected().huis_positie.x,a.y+selected().huis_positie.y));out+=`<line class="huis-snede-lijn" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;}}
    const focus=rooms.find(r=>r.id===selection),anchor=focus?V().interior(focus):{x:L/2,y:B/2},center=focus?P(anchor.x+focus.huis_positie.x,anchor.y+focus.huis_positie.y):[400,250],cx=Math.max(400/magnify,Math.min(800-400/magnify,center[0])),cy=Math.max(250/magnify,Math.min(500-250/magnify,center[1]));
    return `<svg viewBox="${cx-400/magnify} ${cy-250/magnify} ${800/magnify} ${500/magnify}" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="${iso?'3D':'2D'} huisplan" data-huis-schaal="${s}" data-huis-x="${P(0,0)[0]}" data-huis-y="${P(0,0)[1]}">${out}</svg>`;
  }
  function render(){
    if(!state.project||!V())return;
    if(!selected()){gekozen=state.project.ruimtes.find(r=>r.huis_positie)?.id||null;snede=null;}
    document.body.classList.toggle('huisstand-actief',niveau==='huis');
    $('#werkvlak').classList.toggle('huisstand',niveau==='huis');$('#huis-paneel').hidden=niveau!=='huis';
    document.querySelectorAll('[data-ontwerpniveau]').forEach(b=>{const on=b.dataset.ontwerpniveau===niveau;b.setAttribute('aria-pressed',on);b.classList.toggle('actief',on);});
    document.querySelectorAll('[data-huis-view]').forEach(b=>{const on=b.dataset.huisView===view;b.setAttribute('aria-pressed',on);b.classList.toggle('actief',on);});
    $('#huis-undo').disabled=!projectHistorie.kanUndo();$('#huis-redo').disabled=!projectHistorie.kanRedo();
    $('#huis-plan').innerHTML=svg(state.project,view,gekozen,zoom);
    const h=state.project.huis,rs=state.project.ruimtes.filter(r=>r.huis_positie),total=rs.reduce((s,r)=>s+Math.abs(V().area(V().points(r))),0),apart=state.project.ruimtes.length-rs.length;
    $('#huis-statistiek').textContent=h?`${NR.format(Math.abs(V().area(V().points(h))))} m² woning · ${rs.length} kamers op plan · ${NR.format(Math.max(0,Math.abs(V().area(V().points(h)))-total))} m² nog niet ingedeeld${apart?` · ${apart} bestaande kamer(s) buiten huisplan, wel in offerte`:''}`:'Eén verdieping · binnenmaten · 2D & 3D';
    $('#huis-open').disabled=$('#huis-splits').disabled=!selected();
    if(!$('#huis-kamerlijst').contains(document.activeElement))$('#huis-kamerlijst').innerHTML=state.project.ruimtes.map(r=>`<button type="button" class="knop" data-huis-kies="${esc(r.id)}">${esc(r.naam)} · ${r.huis_positie?`X ${NRL.format(r.huis_positie.x)}, Y ${NRL.format(r.huis_positie.y)}`:'buiten huisplan'}</button>`).join('');
    const el=$('#huis-plaats-ruimte'),old=el.value;el.innerHTML=state.project.ruimtes.map(r=>`<option value="${esc(r.id)}">${esc(r.naam)}</option>`).join('');if(state.project.ruimtes.some(r=>r.id===old))el.value=old;
  }
  function setLevel(n){
    const changed=niveau!==n;
    if(changed&&n==='huis'&&actieveRuimte()?.huis_positie)gekozen=state.actieveRuimteId;
    if(changed&&n==='ruimte'&&selected()){
      state.actieveRuimteId=selected().id;planSelectie=null;planInspectieOpen=false;
      Object.assign(planCamera,{zoom:1,panX:0,panY:0});window.BouwMeten?.reset();
    }
    niveau=n;snede=null;if(changed)window.render();else render();
  }
  function choose(id){const r=state.project.ruimtes.find(r=>r.id===id);if(!r)return;gekozen=r.huis_positie?id:gekozen;$('#huis-plaats-ruimte').value=id;$('#huis-plaats-x').value=r.huis_positie?.x||0;$('#huis-plaats-y').value=r.huis_positie?.y||0;snede=null;render();message(`${r.naam} geselecteerd${r.huis_positie?'':'; nog niet op het huisplan'}.`);}
  function splitRoom(){const r=selected();if(!r)throw Error('Selecteer eerst een kamer op het huisplan.');if(!empty(r))throw Error('Splits eerst de indeling vóór je werken, openingen of schuine wanden toevoegt. Deze kamer bevat die al; er wordt niets verwijderd.');return r;}
  function startCut(){try{const r=splitRoom();view='2d';snede={room:r.id,punten:[]};$('#huis-split-as').value='vrij';$('#huis-split-waarde').disabled=true;$('#huis-splits-invoer').open=true;render();message('Tik op twee punten van de geselecteerde kamergrens. De punten klikken op de dichtstbijzijnde wand. Druk daarna op Splitsen toepassen.');}catch(e){message(e.message);}}
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
    const level=e.target.closest('[data-ontwerpniveau]');if(level)setLevel(level.dataset.ontwerpniveau);
    const vw=e.target.closest('[data-huis-view]');if(vw){view=vw.dataset.huisView;snede=null;render();}
    const zm=e.target.closest('[data-huis-zoom]');if(zm){zoom=zm.dataset.huisZoom==='reset'?1:Math.max(1,Math.min(3,zoom+(zm.dataset.huisZoom==='in' ? .25 : -.25)));render();}
    const room=e.target.closest('[data-huis-kies]');if(room)choose(room.dataset.huisKies);
    if(e.target.closest('[data-actie="ruimte-kiezen"]'))setLevel('ruimte');
  });
  $('#huis-plan').addEventListener('click',e=>{
    if(snede){
      const svgEl=$('#huis-plan svg'),r=selected(),point=svgEl.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const q=point.matrixTransform(svgEl.getScreenCTM().inverse()),s=Number(svgEl.dataset.huisSchaal),o=r.huis_positie;
      const p={x:(q.x-Number(svgEl.dataset.huisX))/s-o.x,y:(q.y-Number(svgEl.dataset.huisY))/s-o.y};
      let best=null,dist=Infinity;for(const ed of V().edges(r)){const raw=(p.x-ed.a.x)*ed.u[0]+(p.y-ed.a.y)*ed.u[1],t=Math.max(0,Math.min(ed.lengte,Math.round(raw/.05)*.05)),a={x:ed.a.x+ed.u[0]*t,y:ed.a.y+ed.u[1]*t},d=Math.hypot(a.x-p.x,a.y-p.y);if(d<dist){best=a;dist=d;}}
      if(snede.punten.length===2)snede.punten=[];snede.punten.push(best);render();message(snede.punten.length===2?'Twee grenspunten gekozen. Controleer de snede en kies Splitsen toepassen.':'Eerste punt gekozen. Kies het tweede grenspunt.');return;
    }
    const g=e.target.closest('[data-huis-ruimte]');if(g)choose(g.dataset.huisRuimte);
  });
  $('#huis-plan').addEventListener('keydown',e=>{if(e.key==='Escape'){snede=null;render();message('Snede geannuleerd.');}if(['Enter',' '].includes(e.key)){const g=e.target.closest('[data-huis-ruimte]');if(g){e.preventDefault();choose(g.dataset.huisRuimte);$('#huis-open').focus();}}});
  $('#huis-open').addEventListener('click',()=>{const r=selected();if(!r)return;state.actieveRuimteId=r.id;planSelectie=null;window.BouwMeten?.reset();setLevel('ruimte');$('#tekening').scrollIntoView({block:'start',behavior:'instant'});$('#ruimte-tekenen').focus();});
  $('#huis-splits').addEventListener('click',()=>{try{const r=splitRoom();$('#huis-splits-invoer').open=true;$('#huis-split-waarde').value=Math.round(r.lengte/2*1000)/1000;$('#huis-split-as').value='x';$('#huis-split-waarde').disabled=false;snede=null;message(`Verdeel ${r.naam}. Geef de positie op of kies twee grenspunten.`);$('#huis-split-as').focus();}catch(e){message(e.message);}});
  $('#huis-snede-start').addEventListener('click',startCut);
  $('#huis-snede-stop').addEventListener('click',()=>{snede=null;$('#huis-splits-invoer').open=false;render();message('Splitsen geannuleerd.');});
  $('#huis-split-as').addEventListener('change',()=>{const free=$('#huis-split-as').value==='vrij';$('#huis-split-waarde').disabled=free;if(!free)snede=null;render();});
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
  $('#huis-plaats-form').addEventListener('submit',e=>{e.preventDefault();try{if(!state.project.huis)throw Error('Teken eerst de huiscontour.');const id=$('#huis-plaats-ruimte').value,p=V().position({x:$('#huis-plaats-x').value,y:$('#huis-plaats-y').value}),candidate=clone(state.project),r=candidate.ruimtes.find(r=>r.id===id);r.huis_positie=p;V().layout(candidate);gekozen=id;wijzig(()=>{state.project=candidate;});message('Ruimte geplaatst. Werken en openingen zijn behouden.');}catch(error){message(error.message);}});
  $('#huis-losmaken').addEventListener('click',()=>{const r=state.project.ruimtes.find(r=>r.id===$('#huis-plaats-ruimte').value);if(!r?.huis_positie)return;if(!confirm(`${r.naam} alleen van het huisplan halen? De kamer en alle werkposten blijven behouden in de offerte.`))return;wijzig(()=>{r.huis_positie=null;});message('Ruimte staat nu buiten het huisplan; de offerte is behouden.');});
  $('#huis-undo').addEventListener('click',()=>historieStap('undo'));$('#huis-redo').addEventListener('click',()=>historieStap('redo'));
  window.BouwHuis={render,svg,setLevel,getLevel:()=>niveau};render();
})();
