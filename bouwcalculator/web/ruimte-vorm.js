/* Transactional room sketch editor: local draft until validated and confirmed. */
(function(){
  'use strict';
  const $=s=>document.querySelector(s),dialog=$('#ruimte-vorm'),canvas=$('#vorm-canvas');
  let punten=[],gesloten=true,stappen=[],drag=null,roomId=null,koppelingen=Object.create(null),hellingen={},huisTarget=null,actiefPunt=0,snapInfo=null;
  const coordFormat=new Intl.NumberFormat('nl-BE',{minimumFractionDigits:2,maximumFractionDigits:3});
  const clone=v=>JSON.parse(JSON.stringify(v));
  const remember=()=>{stappen.push({punten:clone(punten),gesloten});if(stappen.length>60)stappen.shift();};
  const fail=s=>$('#vorm-fout').textContent=s;
  const size=()=>[Math.max(.2,Number($('#vorm-bereik-x').value)||4),Math.max(.2,Number($('#vorm-bereik-y').value)||3)];
  const project=()=>{const [L,B]=size(),s=Math.min(680/L,380/B);return {s,x:(800-L*s)/2,y:(500-B*s)/2};};
  const newId=()=>{let id;do{id='wand_'+uid();}while(punten.some(p=>p.id===id));return id;};
  // Pixel-sized tolerance stays equally usable at every zoom and on touch.
  function snapPoint(p,points,index,tolerance,bounds,closed=false){
    const anchors=index==null?(points.length?[points.at(-1),...(!closed&&points.length>2?[points[0]]:[])]:[]):[...(index>0?[points[index-1]]:closed&&points.length>1?[points.at(-1)]:[]),...(index<points.length-1?[points[index+1]]:closed&&points.length>1?[points[0]]:[])];
    const candidates=[],valid=q=>q.x>=0&&q.y>=0&&q.x<=bounds[0]&&q.y<=bounds[1]&&anchors.every(a=>Math.hypot(q.x-a.x,q.y-a.y)>1e-6);
    const add=(q,text,anchor,priority=2)=>{const distance=Math.hypot(q.x-p.x,q.y-p.y);if(distance<=tolerance&&valid(q))candidates.push({...q,text,anchor,distance,priority});};
    for(const a of anchors){add({x:a.x,y:p.y},'Zelfde X als een aangrenzende hoek',a);add({x:p.x,y:a.y},'Zelfde Y als een aangrenzende hoek',a);}
    for(const a of anchors)for(const b of anchors)if(a!==b&&Math.abs(a.x-p.x)<=tolerance&&Math.abs(b.y-p.y)<=tolerance)add({x:a.x,y:b.y},'Uitgelijnd met beide aangrenzende hoeken',a,0);
    if(index==null&&points.length>=2){const a=points.at(-1),b=points.at(-2),dx=a.x-b.x,dy=a.y-b.y,len=dx*dx+dy*dy;if(len>1e-12){const t=((p.x-a.x)*(-dy)+(p.y-a.y)*dx)/len;add({x:a.x-t*dy,y:a.y+t*dx},'Rechte hoek · 90°',a,1);}}
    candidates.sort((a,b)=>a.priority-b.priority||a.distance-b.distance);return candidates[0]||{...p,text:'',anchor:null};
  }
  function readout(p,index,text=''){
    if(!p)return;$('#vorm-coord-status').innerHTML=`<strong>${index==null?'Nieuwe hoek':`Hoek ${index+1}`}</strong><span>X <b>${coordFormat.format(p.x)} m</b></span><span>Y <b>${coordFormat.format(p.y)} m</b></span><small>${esc(text||'X = naar rechts · Y = naar beneden')}</small>`;
  }
  function roof(){return $('#vorm-dak').value==='vlak'?null:BouwVorm.roof({as:$('#vorm-dak').value,start:$('#vorm-start').value,eind:$('#vorm-eind').value});}
  function model(){
    if(!gesloten)throw Error('Sluit de contour met de knop of tik opnieuw op de eerste hoek.');
    const contour=BouwVorm.contour(punten),dak=roof(),hoogte=dak?Math.max(dak.start,dak.eind):Number($('#vorm-hoogte').value);
    if(!Number.isFinite(hoogte)||hoogte<.1||hoogte>100)throw Error('Gebruik een hoogte tussen 0,10 en 100 meter.');
    const ids=new Set(contour.map(p=>p.id)),wand_helling={};
    if(!huisTarget)for(const [id,v] of Object.entries(hellingen)){const key=ids.has(id)?id:koppelingen[id];if(key&&ids.has(key)&&v){if(wand_helling[key]!=null&&wand_helling[key]!==v)throw Error('Gekoppelde schuine wanden hebben verschillende insprongen.');wand_helling[key]=v;}}
    const m={wand_helling,contour,dak,hoogte,lengte:Math.max(...contour.map(p=>p.x)),breedte:Math.max(...contour.map(p=>p.y)),openingen:[]};
    BouwVorm.top(m);return m;
  }
  function render(){
    const q=project(),[L,B]=size(),P=p=>[q.x+p.x*q.s,q.y+p.y*q.s];
    const flat=$('#vorm-dak').value==='vlak';
    $('#vorm-hoogte-label').hidden=!flat;$('#vorm-hoogte').disabled=!flat;
    $('#vorm-helling').hidden=flat;$('#vorm-start').disabled=$('#vorm-eind').disabled=flat;
    let error='',stats='';
    try{const r=model(),v=BouwVorm.surfaces(r);stats=`${punten.length} wanden · vloer ${NR.format(v.find(v=>v.sleutel==='vloer').netto)} m² · plafond ${NR.format(v.find(v=>v.sleutel==='plafond').netto)} m² · omtrek ${NR.format(v.filter(v=>v.soort==='muur').reduce((s,v)=>s+v.lengte,0))} m`;if(r.dak){const as=r.dak.as,span=as==='x'?r.lengte:r.breedte;stats+=` · helling ${NRL.format(Math.atan((r.dak.eind-r.dak.start)/span)*180/Math.PI)}°`;$('#vorm-start').parentElement.firstChild.textContent=`Hoogte bij ${as.toUpperCase()} = 0 (m)`;$('#vorm-eind').parentElement.firstChild.textContent=`Hoogte bij ${as.toUpperCase()} = ${NRL.format(span)} m`;}}catch(e){error=e.message;}
    $('#vorm-samenvatting').textContent=stats;fail(error);
    const r=huisTarget?null:actieveRuimte(),ids=new Set(punten.map(p=>p.id));
    const used=r?[...state.project.regels.filter(x=>x.ruimte_id===r.id).map(x=>x.oppervlak),...(r.openingen||[]).map(o=>o.muur),...Object.keys(hellingen).filter(id=>hellingen[id])]:[];
    const missing=[...new Set(used.filter(id=>!['vloer','plafond'].includes(id)&&!ids.has(id)))];
    $('#vorm-koppelingen').hidden=!gesloten||!missing.length;
    if(!$('#vorm-koppeling-velden').contains(document.activeElement))$('#vorm-koppeling-velden').innerHTML=missing.map(id=>`<label>${esc(ruimteWanden(r).find(v=>v.sleutel===id)?.naam || id)} →<select data-wand-oud="${esc(id)}"><option value="">Kies een nieuwe wand…</option>${punten.map((p,i)=>`<option value="${esc(p.id)}" ${koppelingen[id]===p.id?'selected':''}>Wand ${i+1}</option>`).join('')}</select></label>`).join('');
    $('#vorm-wandhellingen').hidden=!!huisTarget;
    if(!$('#vorm-wandhelling-velden').contains(document.activeElement))$('#vorm-wandhelling-velden').innerHTML=punten.map((p,i)=>`<label>Wand ${i+1} · insprong bovenaan (m)<input data-wand-insprong="${esc(p.id)}" type="number" min="0" max="100" step="any" value="${hellingen[p.id]||0}"></label>`).join('');
    $('#vorm-wand-add').disabled=gesloten||punten.length>=64;
    $('#vorm-wand-lengte').disabled=$('#vorm-wand-richting').disabled=gesloten;
    $('#vorm-punt').disabled=punten.length>=64;
    $('#vorm-toepassen').disabled=!!error;$('#vorm-sluit').disabled=gesloten||punten.length<3;$('#vorm-terug').disabled=!stappen.length;
    $('#vorm-instructie').textContent=gesloten?'Sleep de hoeken. Gebruik de coördinaten voor exacte maten. Enter op een hoek opent de invoer; pijltjes verplaatsen 5 cm.':'Tik de hoeken in volgorde. Bijna recht? De lijn klikt vast. Tik de eerste hoek om te sluiten. Zet rechte hoeken uit voor vrij tekenen; Alt schakelt het tijdelijk uit.';
    canvas.style.setProperty('--vorm-font',Math.max(16,14*800/(canvas.getBoundingClientRect().width||800))+'px');
    let svg='';const step=Math.max(.5,Math.ceil(Math.max(L,B)/24));
    for(let x=0;x<=L+1e-8;x+=step){const a=P({x,y:0}),b=P({x,y:B});svg+=`<line class="vorm-grid" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;}
    for(let y=0;y<=B+1e-8;y+=step){const a=P({x:0,y}),b=P({x:L,y});svg+=`<line class="vorm-grid" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;}
    svg+=`<text class="vorm-maat" x="60" y="28">X → · Y ↓ · raster ${NRL.format(step)} m</text>`;
    const coords=punten.map(p=>P(p).join(',')).join(' ');
    svg+=`<${gesloten?'polygon':'polyline'} class="vorm-schets ${error&&gesloten?'ongeldig':''}" points="${coords}"/>`;
    const touchR=22*800/(canvas.getBoundingClientRect().width||800),aSign=Math.sign(BouwVorm.area(punten))||1;
    punten.forEach((p,i)=>{
      const a=P(p),next=punten[(i+1)%punten.length],b=next&&P(next);
      if(b&&(gesloten||i<punten.length-1)){const len=Math.hypot(next.x-p.x,next.y-p.y);svg+=`<text class="vorm-maat" text-anchor="middle" x="${(a[0]+b[0])/2}" y="${(a[1]+b[1])/2-12}">${NR.format(len)} m</text>`;}
      let hoek='';if(gesloten&&punten.length>=3){const prev=punten[(i+punten.length-1)%punten.length],u=[p.x-prev.x,p.y-prev.y],v=[next.x-p.x,next.y-p.y];hoek=' · '+NRL.format(180-aSign*Math.atan2(u[0]*v[1]-u[1]*v[0],u[0]*v[0]+u[1]*v[1])*180/Math.PI)+'°';}
      svg+=`<g data-hoek="${i}" tabindex="0" role="button" aria-label="Hoek ${i+1}${hoek}; pijltjes verplaatsen, Enter voor coördinaten"><circle class="vorm-hoek-hit" cx="${a[0]}" cy="${a[1]}" r="${touchR}"/><circle class="vorm-hoek" cx="${a[0]}" cy="${a[1]}" r="7"/><text class="vorm-hoek-label" text-anchor="${a[0]>400?'end':'start'}" x="${a[0]+(a[0]>400?-12:12)}" y="${a[1]+(a[1]>400?-14:23)}">${i+1}${hoek}</text></g>`;
    });
    if(snapInfo?.anchor){const a=P(snapInfo.anchor),b=P(snapInfo);svg+=`<line class="vorm-snaplijn" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;}
    if(!huisTarget&&r)svg+=BouwContext.svg(r,(x,y,z)=>P({x,y}));
    canvas.innerHTML=svg;
    if(punten[actiefPunt])readout(punten[actiefPunt],actiefPunt,snapInfo?.text);else if(!punten.length)$('#vorm-coord-status').textContent='Tik op de tekening voor de eerste hoek. X is naar rechts, Y naar beneden.';

    if(!$('#vorm-punten').contains(document.activeElement)||!document.activeElement.matches('[data-vorm-coord]'))$('#vorm-punten').innerHTML=punten.map((p,i)=>`<div class="vorm-punt-rij"><strong>${i+1}</strong><label>X (m)<input data-vorm-coord="x" data-index="${i}" type="number" min="0" max="1000" step="any" value="${p.x}" required></label><label>Y (m)<input data-vorm-coord="y" data-index="${i}" type="number" min="0" max="1000" step="any" value="${p.y}" required></label><button type="button" class="knop klein" data-hoek-split="${i}" aria-label="Wand na hoek ${i+1} splitsen">+</button><button type="button" class="knop klein" data-hoek-weg="${i}" aria-label="Hoek ${i+1} verwijderen">−</button></div>`).join('');
  }
  function open(target=null){
    huisTarget=target;const r=target?.model||actieveRuimte();if(!r){toast('Voeg eerst een ruimte toe.');return;}
    $('#vorm-titel').textContent=target?'Teken het hele huis':'Teken je ruimte';$('#vorm-toepassen').textContent=target?'Huiscontour toepassen':'Ruimtevorm toepassen';
    hellingen=clone(r.wand_helling||{});roomId=r.id;koppelingen=Object.create(null);punten=clone(BouwVorm.points(r));gesloten=true;stappen=[];drag=null;actiefPunt=0;snapInfo=null;
    $('#vorm-bereik-x').value=Math.max(.2,Number(r.lengte)||4);$('#vorm-bereik-y').value=Math.max(.2,Number(r.breedte)||3);
    $('#vorm-dak').value=r.dak?.as||'vlak';$('#vorm-hoogte').value=r.hoogte;
    $('#vorm-start').value=r.dak?.start ?? r.hoogte;$('#vorm-eind').value=r.dak?.eind ?? r.hoogte;
    dialog.showModal();render();
  }
  window.BouwRuimteVorm={snapPoint,openHouse:(model,apply)=>open({model,apply})};
  function preset(type){
    remember();snapInfo=null;actiefPunt=0;koppelingen=Object.create(null);const [L,B]=size();
    const shapes={rechthoek:[[0,0],[L,0],[L,B],[0,B]],l:[[0,0],[L,0],[L,B/2],[L/2,B/2],[L/2,B],[0,B]],t:[[0,0],[L,0],[L,B*.35],[L*.65,B*.35],[L*.65,B],[L*.35,B],[L*.35,B*.35],[0,B*.35]],u:[[0,0],[L,0],[L,B],[L*.65,B],[L*.65,B*.4],[L*.35,B*.4],[L*.35,B],[0,B]],trapezium:[[0,0],[L,0],[L*.8,B],[L*.2,B]],afgeschuind:[[0,0],[L*.8,0],[L,B*.2],[L,B],[0,B]],achthoek:[[L*.2,0],[L*.8,0],[L,B*.2],[L,B*.8],[L*.8,B],[L*.2,B],[0,B*.8],[0,B*.2]],driehoek:[[0,0],[L,0],[L/2,B]],vrij:[]};
    punten=shapes[type].map(([x,y],i)=>({id:['noord','oost','zuid','west'][i]||'wand_'+(i+1),x:Math.round(x*1000)/1000,y:Math.round(y*1000)/1000}));gesloten=type!=='vrij';render();canvas.focus();
  }
  document.addEventListener('click',e=>{if(e.target.closest('[data-ruimte-tekenen]'))open();});
  dialog.addEventListener('click',e=>{
    const presetButton=e.target.closest('[data-vorm]');if(presetButton){preset(presetButton.dataset.vorm);return;}
    if(e.target.closest('#vorm-annuleer,#vorm-cancel')){dialog.close();return;}
    if(e.target.closest('#vorm-wand-add')){
      const leng=$('#vorm-wand-lengte'),hoek=$('#vorm-wand-richting');
      if(!leng.reportValidity()||!hoek.reportValidity()||!leng.value||!hoek.value)return;
      const a=punten.at(-1)||{x:0,y:0},r=Number(hoek.value)*Math.PI/180,[L,B]=size();
      const x=Math.round((a.x+Number(leng.value)*Math.cos(r))*1000000)/1000000,y=Math.round((a.y+Number(leng.value)*Math.sin(r))*1000000)/1000000;
      if(x<0||x>L||y<0||y>B){fail('De nieuwe hoek valt buiten het tekenbereik. Vergroot het bereik of kies een andere richting.');return;}
      remember();if(punten.length>=3&&Math.hypot(x-punten[0].x,y-punten[0].y)<1e-6){gesloten=true;render();return;}
      if(!punten.length)punten.push({id:newId(),x:0,y:0});punten.push({id:newId(),x,y});render();return;
    }
    if(e.target.closest('#vorm-terug')){const prev=stappen.pop();if(prev){punten=prev.punten;gesloten=prev.gesloten;render();}return;}
    if(e.target.closest('#vorm-sluit')){remember();gesloten=true;render();return;}
    if(e.target.closest('#vorm-punt')){remember();const [L,B]=size(),p=punten.at(-1)||{x:0,y:0};punten.push({id:newId(),x:Math.min(L,p.x+.5),y:Math.min(B,p.y+.5)});render();return;}
    const split=e.target.closest('[data-hoek-split]'),weg=e.target.closest('[data-hoek-weg]');
    if(split||weg){remember();const i=Number((split||weg).dataset[split?'hoekSplit':'hoekWeg']);if(weg)punten.splice(i,1);else{const a=punten[i],b=punten[(i+1)%punten.length];punten.splice(i+1,0,{id:newId(),x:(a.x+b.x)/2,y:(a.y+b.y)/2});}if(punten.length<3)gesloten=false;render();}
  });
  dialog.addEventListener('change',e=>{
    if(e.target.dataset.wandInsprong){if(!e.target.reportValidity())return;hellingen[e.target.dataset.wandInsprong]=Number(e.target.value);}
    if(e.target.dataset.wandOud)koppelingen[e.target.dataset.wandOud]=e.target.value;
    snapInfo=null;
    if(e.target.dataset.vormCoord){if(!e.target.reportValidity())return;actiefPunt=Number(e.target.dataset.index);remember();punten[Number(e.target.dataset.index)][e.target.dataset.vormCoord]=Number(e.target.value);}
    render();
  });
  function eventPoint(e,index=null){
    const p=canvas.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(canvas.getScreenCTM().inverse()),g=project(),[L,B]=size(),grid=$('#vorm-snap').checked?.05:0;
    const coord=(v,max)=>Math.round(Math.max(0,Math.min(max,grid?Math.round(v/grid)*grid:v))*1000)/1000;
    const raw={x:coord((q.x-g.x)/g.s,L),y:coord((q.y-g.y)/g.s,B)},cssScale=(canvas.getScreenCTM()?.a||1)*g.s;
    snapInfo=$('#vorm-haaks').checked&&!e.altKey?snapPoint(raw,punten,index,12/Math.max(cssScale,.001),[L,B],gesloten):null;
    const result=snapInfo?{x:snapInfo.x,y:snapInfo.y}:raw;readout(result,index,snapInfo?.text);return result;
  }
  new ResizeObserver(()=>{const width=canvas.getBoundingClientRect().width;if(width<=0)return;canvas.style.setProperty('--vorm-font',Math.max(16,14*800/width)+'px');canvas.querySelectorAll('.vorm-hoek-hit').forEach(c=>c.setAttribute('r',22*800/width));}).observe(canvas);
  canvas.addEventListener('focusin',e=>{const hit=e.target.closest('[data-hoek]');if(hit){actiefPunt=Number(hit.dataset.hoek);readout(punten[actiefPunt],actiefPunt);}});
  canvas.addEventListener('pointerdown',e=>{
    if(!e.isPrimary||e.button!==0||drag)return;
    const hit=e.target.closest('[data-hoek]');if(!hit&&gesloten)return;
    e.preventDefault();
    if(document.activeElement.matches('[data-vorm-coord]')&&!document.activeElement.reportValidity())return;
    actiefPunt=hit?Number(hit.dataset.hoek):null;if(hit)readout(punten[actiefPunt],actiefPunt);
    canvas.focus({preventScroll:true});drag={id:e.pointerId,index:hit?Number(hit.dataset.hoek):null,voor:clone(punten),x:e.clientX,y:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag){const hit=e.target.closest('[data-hoek]');if(hit){actiefPunt=Number(hit.dataset.hoek);readout(punten[actiefPunt],actiefPunt);}else if(!gesloten)eventPoint(e);return;}
    if(drag.id!==e.pointerId||drag.index==null)return;e.preventDefault();
    if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>3)drag.moved=true;
    if(drag.moved){Object.assign(punten[drag.index],eventPoint(e,drag.index));render();}
  });
  function finish(e,cancel=false){
    if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;
    if(cancel){punten=d.voor;snapInfo=null;actiefPunt=d.index??0;}
    else if(d.index==null&&punten.length<64){remember();punten.push({id:newId(),...eventPoint(e)});actiefPunt=punten.length-1;}
    else if(d.moved){stappen.push({punten:d.voor,gesloten});}
    else if(!gesloten&&d.index===0&&punten.length>=3){remember();gesloten=true;}
    if(canvas.hasPointerCapture(d.id))canvas.releasePointerCapture(d.id);render();
  }
  canvas.addEventListener('pointerup',e=>finish(e));canvas.addEventListener('pointercancel',e=>finish(e,true));canvas.addEventListener('lostpointercapture',e=>{if(drag)finish(e,true);});
  canvas.addEventListener('keydown',e=>{
    const hit=e.target.closest('[data-hoek]');if(!hit)return;const i=Number(hit.dataset.hoek);actiefPunt=i;snapInfo=null;
    if(e.key==='Enter'){e.preventDefault();$('.vorm-coordinaten').open=true;$('#vorm-punten').querySelector(`[data-index="${i}"]`)?.focus();return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();remember();const [L,B]=size(),step=e.altKey ? .01 : e.shiftKey ? .25 : .05,p=punten[i];
    if(e.key==='ArrowLeft')p.x=Math.max(0,p.x-step);if(e.key==='ArrowRight')p.x=Math.min(L,p.x+step);if(e.key==='ArrowUp')p.y=Math.max(0,p.y-step);if(e.key==='ArrowDown')p.y=Math.min(B,p.y+step);
    p.x=Math.round(p.x*1000)/1000;p.y=Math.round(p.y*1000)/1000;render();canvas.querySelector(`[data-hoek="${i}"]`)?.focus();
  });
  dialog.addEventListener('cancel',e=>{if(drag){e.preventDefault();finish({pointerId:drag.id},true);}});
  $('#vorm-form').addEventListener('submit',e=>{
    e.preventDefault();if(!e.target.reportValidity())return;
    try{
      if(huisTarget){huisTarget.apply(model());dialog.close();return;}
      const r=actieveRuimte();if(!r||r.id!==roomId)throw Error('De actieve ruimte is gewijzigd. Open de editor opnieuw.');
      const m=model(),ids=new Set(m.contour.map(p=>p.id)),regels=state.project.regels.filter(x=>x.ruimte_id===r.id);
      const gebruikt=[...regels.map(x=>x.oppervlak),...(r.openingen||[]).map(o=>o.muur),...Object.keys(hellingen).filter(id=>hellingen[id])].filter(id=>!['vloer','plafond'].includes(id));
      if(gebruikt.some(id=>!ids.has(id)&&!ids.has(koppelingen[id])))throw Error('Een verwijderde wand wordt nog gebruikt. Kies bij Bestaande wanden koppelen een nieuwe wand voor de werkregels/openingen, of annuleer en verwijder ze eerst. Er wordt niets stilzwijgend weggegooid.');
      BouwVorm.layout({...state.project,ruimtes:state.project.ruimtes.map(x=>x.id===r.id?{...x,...m}:x)});
      if((regels.length||(r.openingen||[]).length)&&!confirm('Ruimtevorm en/of plafond wijzigen? Dit herberekent oppervlakken en offerteprijzen. Bestaande objecten worden niet automatisch opnieuw geplaatst. Controleer wandtoewijzing, tracés en openingen.'))return;
      // Retain the classic rectangle path (and its legacy opening directions).
      const rect=m.contour.length===4 && m.contour.every((p,i)=>p.id===['noord','oost','zuid','west'][i] && p.x===[0,m.lengte,m.lengte,0][i] && p.y===[0,0,m.breedte,m.breedte][i]);
      wijzig(()=>{
        regels.forEach(regel=>{if(!ids.has(regel.oppervlak)&&koppelingen[regel.oppervlak])regel.oppervlak=koppelingen[regel.oppervlak];});
        (r.openingen||[]).forEach(o=>{if(!ids.has(o.muur)&&koppelingen[o.muur])o.muur=koppelingen[o.muur];});
        Object.assign(r,{wand_helling:m.wand_helling,contour:rect?[]:m.contour,dak:m.dak,hoogte:m.hoogte,lengte:m.lengte,breedte:m.breedte});
      });
      planCamera.zoom=1;planCamera.panX=0;planCamera.panY=0;planSelectie=null;planInspectieOpen=false;
      window.BouwMeten?.reset();renderPlan();dialog.close();$('#ruimte-tekenen').focus();toast('Ruimtevorm opgeslagen. Controleer de meetstaat en objectplaatsingen.');
    }catch(error){fail(error.message);}
  });
})();
