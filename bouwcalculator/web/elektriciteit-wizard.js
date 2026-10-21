/* Trench-first guidance. Each trench and its connections are one explicit batch. */
(function(){
'use strict';
window.BouwStroomWizard={create(root,api){
 const roomId=actieveRuimte()?.id,wall=api.wall;
 const types=[['elek_stopcontact','Stopcontact'],['elek_stopcontact_dubbel','Dubbel stopcontact'],['elek_schakelaar','Schakelaar'],['elek_lichtpunt','Lichtpunt op deze wand']];
 let stage='number',total=0,routeIndex=0,route=null,selectedType=null,queue=[],queueIndex=0,prepared=null,committed=[],saved=false,disposed=false;
 const $=s=>root.querySelector(s),room=()=>actieveRuimte(),pkg=id=>state.prijsboek.pakketten.find(p=>p.id===id),copy=v=>JSON.parse(JSON.stringify(v));
 function number(s,integer=false){const text=String(s).trim();if(!(integer?/^[0-9]+$/:/^[0-9]+([.,][0-9]+)?$/).test(text))throw Error(integer?'Vul een heel aantal in.':'Vul een getal in, bijvoorbeeld 5,5.');const n=Number(text.replace(',','.'));if(!Number.isFinite(n))throw Error('Dit getal is te groot.');return n;}
 const controls=(text,disabled=false)=>api.controls(text,disabled);
 const label=()=>total?`Sleuf ${routeIndex+1} van ${total}`:'Bestaande leiding';
 function newRoute(){const count=state.project.regels.filter(w=>w.ruimte_id===roomId&&w.oppervlak===wall&&w.pakket_id==='elek_sleuf').length;route={name:total?`Sleuf ${count+1}`:'Aansluitingen op bestaande leiding',length:null,visual:null,points:[],close:false,proposal:null};queue=[];queueIndex=0;prepared=null;committed=[];saved=false;}
 const actions=items=>`<div class="wizard-choices">${items.map(([id,text])=>`<button type="button" class="knop" data-route="${id}">${text}</button>`).join('')}</div>`;
 function lines(){const result=[];if(total)result.push({pakket_id:'elek_sleuf',hoeveelheid:route.length,visualisatie:route.visual});result.push(...route.points.map(p=>({pakket_id:p.type,hoeveelheid:1,visualisatie:p.visual})));if(total&&route.close)result.push({pakket_id:'elek_sleuf_dichten',hoeveelheid:route.length,visualisatie:route.visual});return result;}
 function build(){if(room()?.id!==roomId||!BouwVorm.wallFrame(room(),wall))throw Error('De kamer of wand is gewijzigd. Begin opnieuw.');const project=copy(state.project),ids=new Set(project.regels.map(w=>w.id)),added=[];for(const data of lines()){let id;do{id=uid();}while(ids.has(id));ids.add(id);if(!pkg(data.pakket_id))throw Error('Een onderdeel ontbreekt in het prijsboek.');project.regels.push({...copy(data),id,ruimte_id:roomId,oppervlak:wall,opties:{},notitie:route.name});added.push(id);}if(!added.length)throw Error('Voeg een aansluiting toe of ga terug en sla deze wand over.');if(added.length>100)throw Error('Gebruik maximaal 100 onderdelen per sleuf.');return {project,added};}
 function render(){
  if(disposed||room()?.id!==roomId)return;prepared=null;let title='',html='';
  if(stage==='number'){
   title='Hoeveel sleuven zijn nodig op deze wand?';const existing=state.project.regels.filter(w=>w.ruimte_id===roomId&&w.oppervlak===wall&&w.pakket_id==='elek_sleuf').length;html=(existing?`<p class="hint">Er staan al ${existing} sleuven voor deze wand in de offerte. Vul hieronder alleen het extra aantal in.</p>`:'')+'<p>We nemen straks elke sleuf apart door: de lengte en plaats, en daarna de aansluitingen op die sleuf.</p><form id="route-form"><label>Aantal nieuwe sleuven<input id="route-number" type="text" inputmode="numeric" pattern="[0-9]+" placeholder="Bijvoorbeeld 2" required></label></form><p class="hint">Vul 0 in voor aansluitingen op bestaande leidingen. Sleuven frezen is alleen geraamd voor geschikt metselwerk; laat de vakman bepalen of het mag.</p>'+actions([['skip','Geen extra elektriciteit op deze wand'],['uncertain','Aantal sleuven nog niet bekend']]);controls('Aantal bevestigen');
  }else if(stage==='length'){
   title=`${label()}: hoe lang is deze sleuf?`;
   const recipes=window.BouwCombinaties?.sleuven()||[];
   html=`<form id="route-form"><label>Gemeten lengte (meter)<input id="route-number" type="text" inputmode="decimal" pattern="[0-9]+([,.][0-9]+)?" value="${route.length??''}" placeholder="Bijvoorbeeld 3,5" required></label></form><p class="hint">Meet de hele route, inclusief bochten. Het aantal aansluitingen bepaalt deze lengte niet.</p>${recipes.length?`<details><summary>Een eerder bewaarde sleuf gebruiken</summary><label>Kies een bewaarde set<select id="route-recipe"><option value="">Kies een set…</option>${recipes.map(r=>`<option value="${esc(r.id)}">${esc(r.naam)}</option>`).join('')}</select></label><button type="button" class="knop" data-route="reuse">Deze keuzes als voorstel gebruiken</button><p class="hint">Je bevestigt de lengte en plaatst alle aansluitingen opnieuw op deze wand.</p></details>`:''}${route.proposal?`<p class="hint">Voorstel uit ‘${esc(route.proposal)}’ geladen. Controleer de lengte.</p>`:''}${actions([['defer','Deze en overige sleuven later bepalen']])}`;controls('Lengte bevestigen');
  }else if(stage==='trench-position'){
   title=`${label()}: waar loopt de sleuf?`;html='<p>De lijn op de tekening is schematisch. De gemeten lengte blijft de prijs bepalen.</p><form id="route-form"><label>Begin: afstand vanaf het begin van de wand (m)<input id="route-start" inputmode="decimal" required></label><label>Einde: afstand vanaf het begin van de wand (m)<input id="route-end" inputmode="decimal" required></label><label>Hoogte boven de vloer (m)<input id="route-height" inputmode="decimal" required></label></form>';controls('Plaats bevestigen');
  }else if(stage==='types'){
   title=`${label()}: welke aansluitingen zijn nodig?`;html=`<p>Kies een aansluiting voor <strong>alleen deze ${total?'sleuf':'bestaande leiding'}</strong>. Daarna vragen we het aantal en de plaats per punt.</p>${actions(types.map(([id,name])=>[id,name]))}<ul>${types.map(([id,name])=>{const n=route.points.filter(p=>p.type===id).length;return n?`<li>${n} × ${name}</li>`:'';}).join('')||'<li>Nog geen aansluitingen gekozen.</li>'}</ul><p class="hint">Een dubbel stopcontact telt als één dubbel punt. Kabeltypes en kabellengtes worden niet automatisch gekozen of begroot.</p>`;controls('Aansluitingen klaar');
  }else if(stage==='quantity'){
   title=`${label()}: hoeveel ${types.find(t=>t[0]===selectedType)?.[1].toLowerCase()}?`;html='<form id="route-form"><label>Aantal op deze sleuf<input id="route-number" type="text" inputmode="numeric" pattern="[0-9]+" placeholder="Bijvoorbeeld 2" required></label></form>';controls('Aantal bevestigen');
  }else if(stage==='point-position'){
   title=`${label()}: plaats punt ${queueIndex+1} van ${queue.length}`;html=`<p><strong>${esc(pkg(queue[queueIndex].type).naam)}</strong>. Elk punt krijgt een eigen plaats op de huidige wand.</p><form id="route-form"><label>Afstand vanaf het begin van deze wand (m)<input id="route-start" inputmode="decimal" required></label><label>Hoogte boven de vloer (m)<input id="route-height" inputmode="decimal" required></label></form>`;controls('Dit punt plaatsen');
  }else if(stage==='closing'){
   title=`${label()}: ook dichtzetten?`;html=`<p>Deze sleuf is ${NRL.format(route.length)} meter. Dichtzetten is een aparte post, zonder eindplamuur of schilderwerk.</p>${route.proposal?`<p>Het bewaarde voorstel ${route.close?'bevat':'bevat geen'} dichtzetten. Maak hieronder je keuze voor deze kamer.</p>`:''}`+actions([['close-yes','Ja, deze sleuf ook dichtzetten'],['close-no','Nee, nu niet']]);controls('Maak hierboven je keuze',true);
  }else if(stage==='preview'){
   title=`${label()}: controleer de hele combinatie`;
   try{const b=build(),after=BouwEngine.berekenOfferte(b.project).totalen.totaal,before=BouwEngine.berekenOfferte(state.project).totalen.totaal;prepared={...b,reference:state.project,snapshot:JSON.stringify(state.project)};
    html=`<ul>${lines().map(w=>`<li>${esc(pkg(w.pakket_id).naam)} · ${NRL.format(w.hoeveelheid)} ${pkg(w.pakket_id).eenheid==='m'?'meter':'stuk'}</li>`).join('')}</ul><p>Je volledige offerte wordt <strong>${eur(after)} inclusief btw</strong> (${eur(after-before)} erbij).</p><p class="hint">Er verandert pas iets na bevestigen. Dit zijn gekoppelde offerteposten, geen technisch ontworpen stroomkring. Laat kabels, beveiliging en geschiktheid controleren.</p>`;controls('Deze combinatie toevoegen');
   }catch(e){html=`<p role="alert">${esc(e.message)}</p>`;controls('Controleer de keuzes',true);}
  }else if(stage==='saved'){
   title=`${label()}: toegevoegd. Deze keuzes bewaren?`;html=`<p>Deze combinatie is toegevoegd aan de offerte. Je kunt haar onder een naam bewaren om later bij een andere sleuf opnieuw te gebruiken.</p>${total?`<form id="route-save"><label>Naam van deze combinatie<input id="route-name" maxlength="80" ${saved?'readonly':''} value="${esc(route.name+' met aansluitingen')}" required></label><button type="submit" class="knop" ${saved?'disabled':''}>${saved?'Bewaard':'Bewaar deze sleuf met aansluitingen'}</button></form><p class="hint">Alleen in deze browser. Lengte, aansluitingen, posities en dichtzetten worden bewaard; geen klantvelden of tarieven. Bij hergebruik bevestig je plaatsing en actuele prijs opnieuw.</p>`:'<p class="hint">Sets zonder nieuwe sleuf kun je later via Object → Combinaties bewaren.</p>'}`;controls(routeIndex+1<total?'Volgende sleuf':'Deze wand: verder naar sanitair');
  }else if(stage==='unknown'){
   title='Sleuven en aansluitingen nog te bepalen';html='<p>Voor de nog onbesliste onderdelen zijn geen kosten toegevoegd. Bestaande posten blijven behouden. Laat de resterende sleuven en aansluitingen eerst opnemen. Controleer dit vóór je de offerte definitief maakt.</p>';controls('Verder zonder extra elektriciteit');
  }
  api.title(title);root.innerHTML=html+'<p id="route-error" role="alert"></p><p id="route-status" role="status" aria-live="polite"></p>';
 }
 function next(){try{
  if(room()?.id!==roomId)throw Error('De actieve kamer is veranderd.');
  const form=$('#route-form');if(form&&!form.reportValidity())return;
  if(stage==='number'){total=number($('#route-number').value,true);if(total>30)throw Error('Plan maximaal 30 sleuven per keer.');routeIndex=0;newRoute();stage=total?'length':'types';}
  else if(stage==='length'){const n=number($('#route-number').value);if(n<=0||n>1000000)throw Error('Vul een geldige lengte groter dan nul in.');route.length=n;stage='trench-position';}
  else if(stage==='trench-position'){
   const z=number($('#route-height').value),a=api.place(room(),wall,number($('#route-start').value),z),b=api.place(room(),wall,number($('#route-end').value),z);if(Math.hypot(a[0]-b[0],a[1]-b[1])<.001)throw Error('Kies verschillende begin- en eindpunten.');route.visual={x:a[0],y:a[1],z:a[2],x2:b[0],y2:b[1],z2:b[2]};stage=queue.length?'point-position':'types';
  }else if(stage==='quantity'){const n=number($('#route-number').value,true);if(n<1||n>98||route.points.length+n>98)throw Error('Kies 1 tot 98 punten per sleuf in totaal.');queue=Array.from({length:n},()=>({type:selectedType,visual:null}));queueIndex=0;stage='point-position';}
  else if(stage==='point-position'){const a=api.place(room(),wall,number($('#route-start').value),number($('#route-height').value));queue[queueIndex].visual={x:a[0],y:a[1],z:a[2]};queueIndex++;if(queueIndex===queue.length){route.points.push(...queue);queue=[];queueIndex=0;stage='types';}}
  else if(stage==='types'){if(!total&&!route.points.length)throw Error('Kies een aansluiting of ga terug en sla elektriciteit over.');stage=total?'closing':'preview';}
  else if(stage==='preview'){
   if(!prepared)return;if(state.project!==prepared.reference||JSON.stringify(state.project)!==prepared.snapshot){render();$('#route-error').textContent='De offerte is veranderd. Controleer de nieuwe prijs en bevestig opnieuw.';return;}
   const p=prepared;committed=p.added;stage='saved';prepared=null;wijzig(()=>state.project=p.project);
  }else if(stage==='saved'){if(committed.length&&committed.every(id=>!state.project.regels.some(w=>w.id===id))){stage='preview';render();$('#route-error').textContent='Deze toevoeging is ongedaan gemaakt. Controleer het voorbeeld voordat je opnieuw toevoegt.';return;}if(routeIndex+1<total){routeIndex++;newRoute();stage='length';}else{api.done();return;}}
  else if(stage==='unknown'){api.done();return;}
  render();
 }catch(e){$('#route-error').textContent=e.message;}}
 function back(){
  if(stage==='number'){api.back();return;}
  if(stage==='saved'){ $('#route-error').textContent='Deze combinatie staat al in de offerte. Bestaande objecten kun je direct verslepen; je hoeft ze niet opnieuw toe te voegen.';return;}
  if(stage==='length'){if(routeIndex>0){$('#route-error').textContent='Eerdere sleuven zijn al toegevoegd. Werk deze sleuf af of ga later terug via de wandcontrole.';return;}stage='number';}
  else if(stage==='trench-position')stage='length';else if(stage==='point-position'){queue=[];queueIndex=0;stage='types';}else if(stage==='quantity')stage='types';else if(stage==='types')stage=total?'trench-position':'number';else if(stage==='closing')stage='types';else if(stage==='preview')stage=total?'closing':'types';else stage='number';render();
 }
 function click(e){const b=e.target.closest('[data-route]');if(!b)return;try{const action=b.dataset.route;
  if(action==='defer'){stage='unknown';render();return;}
  if(action==='skip'){api.done();return;}if(action==='uncertain'){stage='unknown';render();return;}
  if(types.some(([id])=>id===action)){selectedType=action;stage='quantity';render();return;}
  if(action==='close-yes'||action==='close-no'){route.close=action==='close-yes';stage='preview';render();return;}
  if(action==='reuse'){
   const c=BouwCombinaties.sleuven().find(c=>c.id===$('#route-recipe').value);if(!c)throw Error('Kies eerst een bewaarde sleuf.');
   const trench=c.items.find(i=>i.data.pakket_id==='elek_sleuf');route.proposal=c.naam;route.length=Number(trench.data.hoeveelheid);route.close=c.items.some(i=>i.data.pakket_id==='elek_sleuf_dichten');route.points=[];queue=[];
   for(const i of c.items.filter(i=>types.some(([id])=>id===i.data.pakket_id))){const n=Number(i.data.hoeveelheid);if(!Number.isInteger(n)||n<1||queue.length+n>98)throw Error('Deze set bevat een ongeldig aantal aansluitingen.');queue.push(...Array.from({length:n},()=>({type:i.data.pakket_id,visual:null})));}queueIndex=0;render();
  }
 }catch(error){$('#route-error').textContent=error.message;}}
 function submit(e){if(e.target.id==='route-form'){e.preventDefault();next();}else if(e.target.id==='route-save'){e.preventDefault();try{if(saved)return;BouwCombinaties.bewaarRegels($('#route-name').value,committed,roomId);saved=true;render();$('#route-status').textContent='Bewaard. Bij een volgende sleuf kun je deze set als voorstel kiezen.';}catch(error){$('#route-error').textContent=error.message;}}}
 root.addEventListener('click',click);root.addEventListener('submit',submit);render();return {next,back,destroy(){disposed=true;root.removeEventListener('click',click);root.removeEventListener('submit',submit);}};
}};
})();
