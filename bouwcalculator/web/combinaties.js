/* Reusable object recipes are browser-local, not project/customer or price data.
 * Preview uses the existing calculation engine; application is one undoable edit. */
(function(){
  'use strict';
  const $=s=>document.querySelector(s),key='bouwcalculator.combinaties.v1',copy=v=>JSON.parse(JSON.stringify(v));
  const menu=$('#object-menu');let library=[],source=null,prepared=null,storageError='';
  const say=s=>$('#combi-status').textContent=s;
  function validateLibrary(value){
    if(!Array.isArray(value)||value.length>30)throw Error('Ongeldige combinatiebibliotheek. De bestaande opslag blijft onaangeroerd.');
    const ids=new Set();for(const c of value){
      if(!c||c.version!==1||typeof c.id!=='string'||!c.id||c.id.length>100||ids.has(c.id)||typeof c.naam!=='string'||!c.naam.trim()||c.naam.length>80||!Array.isArray(c.items)||!c.items.length||c.items.length>100)throw Error('Ongeldige combinatiebibliotheek. De bestaande opslag blijft onaangeroerd.');
      ids.add(c.id);for(const i of c.items)if(!i||!['regel','opening','trap'].includes(i.type)||!i.data||typeof i.data!=='object'||Array.isArray(i.data))throw Error('Ongeldige objectgegevens in de combinatie.');
    }return value;
  }
  function read(){
    storageError='';try{const raw=localStorage.getItem(key);if(raw&&raw.length>1000000)throw Error('De combinatiebibliotheek is te groot.');library=validateLibrary(raw?JSON.parse(raw):[]);}
    catch(error){library=[];storageError='Combinaties niet beschikbaar: '+error.message;}
  }
  function write(next){
    if(storageError)throw Error(storageError);
    validateLibrary(next);const json=JSON.stringify(next);if(json.length>1000000)throw Error('De combinatiebibliotheek is vol. Wis eerst een combinatie.');
    try{localStorage.setItem(key,json);}catch{throw Error('Niet bewaard: browseropslag is vol of geblokkeerd. Er is niets overschreven.');}library=next;
  }
  function choices(id=''){
    $('#combi-keuze').innerHTML=library.length?library.map(c=>`<option value="${esc(c.id)}">${esc(c.naam)} · ${c.items.length} objecten</option>`).join(''):'<option value="">Nog geen combinaties</option>';
    if(library.some(c=>c.id===id))$('#combi-keuze').value=id;
    $('#combi-voorbeeld').disabled=$('#combi-verwijder').disabled=!library.length||!!storageError;
  }
  function invalidate(){prepared=null;$('#combi-preview').hidden=true;}
  function roomSnapshot(room){return JSON.stringify({room,regels:state.project.regels.filter(r=>r.ruimte_id===room.id)});}
  function label(item){
    if(item.type==='regel'){const p=state.prijsboek.pakketten.find(p=>p.id===item.data.pakket_id);return `${p?.naam||item.data.pakket_id} · ${item.data.oppervlak} · ${p?.eenheid==='m2'?'m² opnieuw gemeten':(item.data.hoeveelheid??0)+' '+(p?.eenheid||'')}`;}
    return `${item.data.naam|| (item.type==='trap'?'Trap':'Opening')} · ${item.type==='trap'?'trap':item.data.muur}`;
  }
  function sourceItems(room){
    const normal=BouwEngine.berekenOfferte(state.project).project,r=normal.ruimtes.find(r=>r.id===room.id);
    return [
      ...normal.regels.filter(w=>w.ruimte_id===r.id).map(w=>{const {id,ruimte_id,notitie,...data}=w;return {type:'regel',data};}),
      ...r.openingen.map(data=>({type:'opening',data})),
      ...(r.trappen||[]).map(t=>{const {id,...data}=t;return {type:'trap',data};})
    ];
  }
  function refreshSource(){
    const room=actieveRuimte();if(!room||!window.BouwEngine)return;
    source={project:state.project,room:room.id,snapshot:roomSnapshot(room),items:sourceItems(room)};
    $('#combi-bron').innerHTML=source.items.map((i,n)=>`<label class="combi-bron-item"><input type="checkbox" data-combi-bron="${n}"><span>${esc(label(i))}</span></label>`).join('')||'<p class="hint">Voeg eerst objecten of werkposten toe aan deze kamer.</p>';
  }
  function settings(){return JSON.stringify({id:$('#combi-keuze').value,mode:$('#combi-vlakmodus').value,vlak:$('#object-vlak').value,posities:$('#combi-posities').checked});}
  function checkOpening(room,index){
    const o=room.openingen[index],f=BouwVorm.wallFrame(room,o.muur),g=BouwPlan.openingGeometrie(room,index);
    if(!f||!g||!(o.breedte>0)||!(o.hoogte>0)||g.breedte+1e-5<o.breedte||g.hoogte+1e-5<o.hoogte)throw Error('Een deur of raam past niet op de gekozen wand.');
    const along=g.start??((g.a[0]-f.a.x)*f.u[0]+(g.a[1]-f.a.y)*f.u[1]),under=g.onder??g.a[2];
    if(o.positie!=null&&Math.abs(o.positie-along)>1e-4||Math.abs((o.borstwering||0)-under)>1e-4)throw Error('Een opening valt buiten de wand. Schakel posities overnemen uit of kies een andere wand.');
    if(!f.inset&&g.a[2]+o.hoogte>Math.min(BouwVorm.height(room,g.a[0],g.a[1]),BouwVorm.height(room,g.b[0],g.b[1]))+1e-5)throw Error('Een opening komt boven het plafond.');
  }
  function build(combo){
    const project=copy(state.project),room=project.ruimtes.find(r=>r.id===actieveRuimte()?.id);if(!room)throw Error('Kies eerst een kamer.');
    const walls=new Set(BouwVorm.edges(room).map(e=>e.id)),valid=new Set([...walls,'vloer','plafond']);
    const target=$('#object-vlak').value,map=$('#combi-vlakmodus').value==='wand',positions=$('#combi-posities').checked;
    const newRules=[],newStairs=[],summary=[];
    const ids=new Set([...project.regels.map(w=>w.id),...project.ruimtes.flatMap(r=>(r.trappen||[]).map(t=>t.id))]);
    const fresh=()=>{let id;do{id=uid();}while(ids.has(id));ids.add(id);return id;};
    room.openingen ||= [];room.trappen ||= [];
    for(const item of combo.items){
      const d=copy(item.data);
      if(item.type==='regel'){
        const p=state.prijsboek.pakketten.find(p=>p.id===d.pakket_id);if(!p)throw Error('Een werkpakket uit deze combinatie is niet meer beschikbaar.');
        const old=d.oppervlak,isWall=!['vloer','plafond'].includes(old),surface=map&&isWall?target:old;
        if(!valid.has(surface)||isWall&&!walls.has(surface))throw Error('Kies een geldige wand voor de wandobjecten van deze combinatie.');
        const w={id:fresh(),ruimte_id:room.id,pakket_id:p.id,oppervlak:surface,opties:d.opties||{},hoeveelheid:p.eenheid==='m2'?null:d.hoeveelheid,notitie:'',visualisatie:positions&&old===surface?d.visualisatie||{}:{}};
        if(p.eenheid!=='m2'&&(!(Number(w.hoeveelheid)>0)||!Number.isFinite(Number(w.hoeveelheid))))throw Error('Een werkpost heeft geen geldige hoeveelheid. Pas de bronobjecten aan en bewaar de combinatie opnieuw.');
        project.regels.push(w);newRules.push({w,p});summary.push({type:'regel',data:w});
      }else if(item.type==='opening'){
        const wall=map?target:d.muur;if(!walls.has(wall))throw Error('Kies een geldige wand voor deuren en ramen.');
        const o={naam:d.naam,muur:wall,breedte:d.breedte,hoogte:d.hoogte,aantal:d.aantal,borstwering:d.borstwering,positie:positions?d.positie:null};
        room.openingen.push(o);summary.push({type:'opening',data:o});
      }else{
        const t={...d,id:fresh()};
        if(!positions){const c=BouwVorm.interior(room),side=t.richting===90||t.richting===270;t.x=Math.max(0,c.x-(side?t.lengte:t.breedte)/2);t.y=Math.max(0,c.y-(side?t.breedte:t.lengte)/2);}
        room.trappen.push(t);newStairs.push(t);summary.push({type:'trap',data:t});
      }
    }
    if(room.trappen.length>100)throw Error('Gebruik maximaal 100 trappen per kamer.');
    const calculation=BouwEngine.berekenOfferte(project),normalized=calculation.project.ruimtes.find(r=>r.id===room.id);
    // Check every opening: adding an automatically centered one may also move existing auto openings.
    normalized.openingen.forEach((o,i)=>checkOpening(normalized,i));
    newStairs.forEach(t=>BouwTrappen.check(t,normalized));
    for(const {w,p} of newRules){
      const norm=calculation.project.regels.find(r=>r.id===w.id),g=BouwPlan.werkGeometrie({...norm,pakket:p,nummer:calculation.project.regels.filter(r=>r.ruimte_id===room.id).findIndex(r=>r.id===w.id)+1},normalized);
      const ps=p.eenheid==='m'?[g.a,g.b]:[g.a];
      if(ps.some(a=>!BouwVorm.inside(normalized,{x:a[0],y:a[1]})||a[2]>BouwVorm.height(normalized,a[0],a[1])+1e-5)||ps.length===2&&!BouwVorm.segmentInside(normalized,{x:ps[0][0],y:ps[0][1]},{x:ps[1][0],y:ps[1][1]}))throw Error('Een objectpositie of tracé past niet in deze kamer. Probeer zonder posities overnemen, of kies een ander vlak.');
    }
    const delta=calculation.totalen.totaal-BouwEngine.berekenOfferte(state.project).totalen.totaal;
    return {project,delta,items:summary};
  }
  $('#combi-maker').addEventListener('toggle',()=>{if($('#combi-maker').open){try{refreshSource();}catch(e){say(e.message);}}});
  $('#combinaties').addEventListener('toggle',()=>{if($('#combinaties').open){invalidate();read();choices();say(storageError||'Kies een bewaarde combinatie of bewaar een nieuwe set uit deze kamer.');}});
  $('#combi-alles').addEventListener('click',()=>$('#combi-bron').querySelectorAll('input').forEach(e=>e.checked=true));
  $('#combi-bewaar-form').addEventListener('submit',e=>{
    e.preventDefault();try{
      const room=actieveRuimte(),name=$('#combi-naam').value.trim();if(!source||source.project!==state.project||source.room!==room?.id||source.snapshot!==roomSnapshot(room)){refreshSource();throw Error('De kamer of objecten zijn gewijzigd. Kies de objecten opnieuw.');}
      if(!name||name.length>80)throw Error('Geef een naam van 1 tot 80 tekens.');
      const selected=[...$('#combi-bron').querySelectorAll('input:checked')].map(e=>source.items[Number(e.dataset.combiBron)]);
      if(!selected.length||selected.length>100)throw Error('Kies 1 tot 100 objecten voor de combinatie.');
      const c={version:1,id:uid(),naam:name,items:copy(selected)};read();if(library.length>=30)throw Error('Maximaal 30 combinaties. Wis eerst een oude combinatie.');
      write([...library,c]);choices(c.id);invalidate();say(`“${name}” bewaard met ${selected.length} objecten, op deze browser.`);
    }catch(error){say(error.message);}
  });
  $('#combi-voorbeeld').addEventListener('click',()=>{
    invalidate();try{
      read();if(storageError)throw Error(storageError);const c=library.find(c=>c.id===$('#combi-keuze').value);if(!c)throw Error('Kies eerst een bewaarde combinatie.');
      const result=build(c);prepared={...result,reference:state.project,snapshot:JSON.stringify(state.project),room:actieveRuimte().id,settings:settings(),recipe:JSON.stringify(c)};
      $('#combi-preview-items').innerHTML=result.items.map(i=>`<li>${esc(label(i))}</li>`).join('');
      $('#combi-preview-prijs').textContent=`Voor ${actieveRuimte().naam}: ${result.items.length} nieuwe objecten. Verandering totaal incl. btw: ${eur(result.delta)}. Huidige tarieven; m² opnieuw gemeten, inclusief effect van openingen.`;
      $('#combi-preview').hidden=false;say('Dit is een voorbeeld. Er is nog niets toegevoegd.');
    }catch(error){say(error.message);}
  });
  $('#combi-toevoegen').addEventListener('click',()=>{
    try{const p=prepared;if(!p)throw Error('Bekijk eerst het voorbeeld.');read();const c=library.find(c=>c.id===$('#combi-keuze').value);
      if(storageError||state.project!==p.reference||JSON.stringify(state.project)!==p.snapshot||actieveRuimte()?.id!==p.room||settings()!==p.settings||JSON.stringify(c)!==p.recipe){invalidate();throw Error('Het project of de combinatie is veranderd. Bekijk het voorbeeld opnieuw.');}
      invalidate();wijzig(()=>state.project=p.project);refreshSource();say(`${p.items.length} objecten toegevoegd. Je kunt dit met één keer Ongedaan maken herstellen.`);
    }catch(error){say(error.message);}
  });
  $('#combi-verwijder').addEventListener('click',()=>{
    try{read();const c=library.find(c=>c.id===$('#combi-keuze').value);if(!c)return;if(!confirm(`Bewaarde combinatie “${c.naam}” wissen? Objecten in offertes blijven behouden.`))return;
      write(library.filter(x=>x.id!==c.id));invalidate();choices();say('Bewaarde combinatie gewist; bestaande projecten zijn niet gewijzigd.');
    }catch(error){say(error.message);}
  });
  // Trench guidance shares the same validated local library, not a second store.
  window.BouwCombinaties={
    aansluitpunten(){
      read();if(storageError)return [];
      const points=new Set(['elek_stopcontact','elek_stopcontact_dubbel','elek_schakelaar','elek_lichtpunt','elek_stopcontact_opbouw','elek_stopcontact_dubbel_opbouw','elek_schakelaar_opbouw']);
      const allowed=new Set([...points,'elek_sleuf','elek_sleuf_dichten','elek_kabel_3g15','elek_kabel_3g25']);
      return copy(library.filter(c=>c.items.every(i=>i.type==='regel'&&allowed.has(i.data.pakket_id))&&c.items.filter(i=>points.has(i.data.pakket_id)).length===1&&c.items.filter(i=>points.has(i.data.pakket_id)).every(i=>Number(i.data.hoeveelheid)===1)&&['elek_sleuf','elek_sleuf_dichten'].every(id=>c.items.filter(i=>i.data.pakket_id===id).length<=1)&&c.items.filter(i=>i.data.pakket_id.startsWith('elek_kabel_')).length<=1));
    },
    sleuven(){read();if(storageError)return [];const allowed=new Set(['elek_sleuf','elek_sleuf_dichten','elek_stopcontact','elek_stopcontact_dubbel','elek_schakelaar','elek_lichtpunt']);return copy(library.filter(c=>c.items.every(i=>i.type==='regel'&&allowed.has(i.data.pakket_id))&&c.items.filter(i=>i.data.pakket_id==='elek_sleuf').length===1));},
    bewaarRegels(name,ids,roomId){
      const naam=String(name).trim();if(!naam||naam.length>80)throw Error('Geef de combinatie een naam van 1 tot 80 tekens.');
      if(!Array.isArray(ids)||!ids.length||ids.length>100||new Set(ids).size!==ids.length)throw Error('Deze sleuf bevat geen geldige set onderdelen.');
      const normal=BouwEngine.berekenOfferte(state.project).project;
      const rules=ids.map(id=>normal.regels.find(w=>w.id===id&&w.ruimte_id===roomId));if(rules.some(w=>!w))throw Error('Een onderdeel van deze sleuf is veranderd of verwijderd. Bewaar de set opnieuw via het objectmenu.');
      const c={version:1,id:uid(),naam,items:rules.map(w=>{const {id,ruimte_id,notitie,...data}=w;return {type:'regel',data};})};
      read();if(library.length>=30)throw Error('De bibliotheek bevat al 30 combinaties. Wis eerst een oude combinatie.');write([...library,c]);choices(c.id);return c.id;
    }
  };
  ['#combi-keuze','#combi-vlakmodus','#combi-posities','#object-vlak'].forEach(id=>$(id).addEventListener('change',invalidate));
  menu.addEventListener('close',()=>{if(!menu.open){invalidate();source=null;}});
  new MutationObserver(()=>{if(menu.open){invalidate();read();choices();if($('#combi-maker').open){try{refreshSource();}catch(e){say(e.message);}}if(storageError)say(storageError);}}).observe(menu,{attributes:true,attributeFilter:['open']});
})();
