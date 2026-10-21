/* One decision at a time. No inferred circuits, cable types or cable lengths. */
(function(){
'use strict';
window.BouwStroomWizard={create(root,api){
 const roomId=actieveRuimte()?.id;
 const tasks=[{id:'elek_stopcontact',title:'Hoeveel stopcontacten wil je toevoegen?',hint:'Denk aan de plaatsen voor tv, bureau, stofzuiger en toestellen. Tel enkel de nieuwe aansluitingen. Dit is geen voorgeschreven minimum.'},{id:'elek_schakelaar',title:'Hoeveel schakelaars wil je toevoegen?',hint:'Denk aan de deuren waar je het licht wilt bedienen.'},{id:'elek_lichtpunt',title:'Hoeveel lichtpunten wil je toevoegen?',hint:'Een lichtpunt is een aansluiting voor een lamp. De lamp zelf is niet inbegrepen.'}];
 let stage='intro',index=0,quantity='',surface='',prepared=null,warning='',lastTrench=null,lastAdded=null,disposed=false,visual=null,batchTotal=0,batchPlaced=0;
 const $=s=>root.querySelector(s),room=()=>actieveRuimte(),pkg=id=>state.prijsboek.pakketten.find(p=>p.id===id),rows=id=>state.project.regels.filter(w=>w.ruimte_id===roomId&&(!api.wall||w.oppervlak===api.wall)&&w.pakket_id===id);
 const currentId=()=>index<3?tasks[index].id:index===3?'elek_sleuf':'elek_sleuf_dichten';
 const number=s=>{if(!/^[0-9]+([.,][0-9]+)?$/.test(s.trim()))throw Error('Vul een getal in, bijvoorbeeld 5 of 5,5.');return Number(s.replace(',','.'));};
 function controls(next,disabled=false){api.controls(next,disabled);}
 function render(){
  if(disposed||room()?.id!==roomId)return;
  prepared=null;let title='',html='';
  const buttons=(yes,no,unknown=false)=>`<div class="wizard-choices"><button type="button" class="knop primair" data-stroom="yes">${yes}</button><button type="button" class="knop" data-stroom="no">${no}</button>${unknown?'<button type="button" class="knop" data-stroom="unknown">Dat weet ik nog niet</button>':''}</div>`;
  if(stage==='intro'){title='Wil je elektriciteit toevoegen?';html='<p>We helpen je eerst met stopcontacten, schakelaars en lichtpunten. Daarna bekijken we of er sleuven in de muur nodig zijn.</p>'+buttons('Ja, help me kiezen','Nee, verder zonder extra elektriciteit');controls('Maak hierboven je keuze',true);}
  if(stage==='count'){
   const t=tasks[index],existing=rows(t.id).reduce((s,w)=>s+Number(w.hoeveelheid||0),0);title=api.wall&&index===2?'Hoeveel lichtpunten komen op deze wand?':t.title;
   html=`<p>${t.hint}</p>${existing?`<p class="hint">Er staan al ${NRL.format(existing)} stuks op deze wand. Vul alleen het extra aantal in.</p>`:''}<form id="stroom-count"><label>Aantal nieuwe aansluitingen<input id="stroom-number" type="text" inputmode="numeric" pattern="[0-9]+" value="${esc(quantity)}" placeholder="Bijvoorbeeld 2" required></label></form><button type="button" class="knop" data-stroom="none">Geen extra nodig</button>`;controls('Aantal bevestigen');
  }
  if(stage==='trench'){title='Moeten de leidingen in de muur worden weggewerkt?';html='<p>Voor leidingen in een bestaande gemetselde muur kunnen sleuven nodig zijn. Bij bestaande bruikbare buizen of een holle voorzetwand hoeft frezen niet altijd.</p><p class="hint">Ons sleuftarief is alleen een raming voor metselwerk, niet voor beton of dragende delen. Laat de vakman bepalen of en hoe er gefreesd mag worden.</p>'+buttons('Ja, een sleuf begroten','Nee, geen extra sleuf',true);controls('Maak hierboven je keuze',true);}
  if(stage==='length'){title='Hoeveel meter sleuf is er nodig?';html='<p>Meet de geplande route over de muur, met de bochten erbij. We leiden de lengte niet af uit het aantal stopcontacten.</p><form id="stroom-length"><label>Totale lengte voor deze muur (meter)<input id="stroom-number" type="text" inputmode="decimal" pattern="[0-9]+([,.][0-9]+)?" value="${esc(quantity)}" placeholder="Bijvoorbeeld 5,5" required></label></form><button type="button" class="knop" data-stroom="unknown">De lengte moet nog gemeten worden</button>';controls('Lengte bevestigen');}
  if(stage==='wall'){
   title=index===2?'Waar komt dit lichtpunt?':'Op welke muur komt dit?';const r=room(),surfaces=index===2?ruimteVlakken(r).filter(v=>v.sleutel==='plafond'):ruimteWanden(r);
   html=`<p>${NRL.format(Number(quantity))} ${index<3?'stuks':'meter'} · ${esc(pkg(currentId())?.naam||'')}</p><p class="hint">Kies de naam die je op de tekening ziet. Voor meerdere muren doen we dit één muur tegelijk.</p><form id="stroom-wall"><label>${index===2?'Plaats':'Muur'}<select id="stroom-wall-value"><option value="">Kies een plaats…</option>${surfaces.map(v=>`<option value="${esc(v.sleutel)}" ${v.sleutel===surface?'selected':''}>${esc(v.naam)}</option>`).join('')}</select></label></form>`;controls('Prijs bekijken');
  }
  if(stage==='position'){
   title=index<3?`Waar komt punt ${batchPlaced+1} van ${batchTotal} op deze wand?`:'Waar loopt de sleuf op deze wand?';
   html=`<p>We plaatsen ${NRL.format(Number(quantity))} ${index<3?'stuks':'meter'} op de huidige wand. De afstand meet je vanaf het begin van de wand in het vooraanzicht.</p>${index<3?'<p class="hint">We plaatsen ieder punt apart. Zo krijgt elk punt zijn eigen plaats op de tekening.</p>':''}<form id="stroom-position"><label>${index<3?'Afstand':'Begin van de lijn'} vanaf het begin van de wand (m)<input id="stroom-offset" type="text" inputmode="decimal" required></label><label>Hoogte boven de vloer (m)<input id="stroom-height" type="text" inputmode="decimal" required></label>${index===3?'<label>Einde van de lijn vanaf het begin van de wand (m)<input id="stroom-end" type="text" inputmode="decimal" required></label><p class="hint">De getekende lijn is schematisch. De ingevulde gemeten sleuflengte bepaalt de prijs, niet deze rechte lijn.</p>':''}</form>${index<3&&batchPlaced>0?'<button type="button" class="knop" data-stroom="stop-placement">Overige punten nog niet toevoegen</button>':''}`;controls('Plaatsing en prijs bekijken');
  }
  if(stage==='confirm'){
   title='Klopt dit zo?';try{
    const id=currentId(),p=pkg(id);if(!p)throw Error('Dit onderdeel is niet beschikbaar in het prijsboek.');
    const project=JSON.parse(JSON.stringify(state.project)),r=project.ruimtes.find(r=>r.id===roomId);if(!r)throw Error('De kamer is veranderd.');
    project.regels.push({id:uid(),ruimte_id:r.id,pakket_id:id,oppervlak:surface,hoeveelheid:Number(quantity),opties:{},notitie:'',...(visual?{visualisatie:visual}:{})});
    const total=BouwEngine.berekenOfferte(project).totalen.totaal,before=BouwEngine.berekenOfferte(state.project).totalen.totaal;
    prepared={project,reference:state.project,snapshot:JSON.stringify(state.project)};
    const name=ruimteVlakken(room()).find(v=>v.sleutel===surface)?.naam||surface;
    html=`<p><strong>${esc(p.naam)}</strong></p><p>${NRL.format(Number(quantity))} ${index<3?'stuks':'meter'} op ${esc(name)}.</p><p>Je volledige offerte wordt <strong>${eur(total)} inclusief btw</strong>. Dat is ${eur(total-before)} erbij.</p><p class="hint">${esc(p.beschrijving)} Er verandert pas iets als je hieronder bevestigt.</p>`;controls('Bevestigen en toevoegen');
   }catch(e){html=`<p role="alert">${esc(e.message)}</p>`;controls('Controleer je invoer',true);}
  }
  if(stage==='again'){title=api.wall?'Nog iets van dit type op deze wand toevoegen?':index<3?'Nog op een andere muur toevoegen?':'Nog een sleuf op een andere muur?';html='<p>Het onderdeel is toegevoegd. Je kunt nog een muur doen, of verdergaan.</p>'+buttons(api.wall?'Ja, nog op deze wand':'Ja, nog een muur','Nee, dit is voldoende')+'<button type="button" class="knop" data-stroom="undo">Vergissing? Laatste toevoeging weghalen</button>';controls('Maak hierboven je keuze',true);}
  if(stage==='close'){title='Moet de sleuf ook worden dichtgezet?';html=`<p>De laatst toegevoegde sleuf is ${NRL.format(lastTrench?.quantity||0)} meter. Dichtzetten is een aparte werkpost, zonder eindplamuur of schilderwerk.</p>`+buttons('Ja, deze sleuf ook dichtzetten','Nee, nu niet');controls('Maak hierboven je keuze',true);}
  if(stage==='review'){
   title='Elektriciteit: controleer wat is opgenomen';const lines=state.project.regels.filter(w=>w.ruimte_id===roomId&&(!api.wall||w.oppervlak===api.wall)&&w.pakket_id.startsWith('elek_'));
   html=`${warning?`<p class="wizard-pending"><strong>Nog te bepalen:</strong> ${esc(warning)}</p>`:''}<ul>${lines.map(w=>`<li>${esc(pkg(w.pakket_id)?.naam||w.pakket_id)} · ${NRL.format(w.hoeveelheid)} ${pkg(w.pakket_id)?.eenheid==='m'?'meter':'stuks'} · ${esc(ruimteVlakken(room()).find(v=>v.sleutel===w.oppervlak)?.naam||w.oppervlak)}</li>`).join('')||'<li>Geen extra elektriciteitswerken toegevoegd.</li>'}</ul><p class="wizard-pending"><strong>Laat de vakman nog controleren:</strong> kabeltype, kabellengtes, beveiliging en geschiktheid van de bestaande installatie. Kabels worden hier niet automatisch toegevoegd. De onderstaande posten zijn geen volledige elektrische installatie.</p>`;controls(api.wall?'Deze wand: verder naar sanitair':'Verder naar sanitair');
  }
  api.title(title);root.innerHTML=html+'<p id="stroom-error" role="alert"></p>';
 }
 function advance(){quantity='';surface='';if(index<2){index++;stage='count';}else{index=3;stage='trench';}render();}
 function next(){try{
  if(room()?.id!==roomId)throw Error('Je bent van kamer veranderd. Begin opnieuw bij deze kamer.');
  if(stage==='count'||stage==='length'){
   const input=$('#stroom-number');if(!input.reportValidity())return;const n=number(input.value);if(!Number.isFinite(n)||n<0||n>1000000||stage==='count'&&!Number.isInteger(n))throw Error('Vul een geldig aantal in.');
   if(n===0&&stage==='count'){advance();return;}if(n<=0)throw Error('Vul een lengte groter dan nul in.');if(api.wall&&stage==='count'){if(n>100)throw Error('Voeg maximaal 100 punten per keer toe.');batchTotal=n;batchPlaced=0;}quantity=String(api.wall&&stage==='count'?1:n);surface=api.wall||'';stage=api.wall?'position':'wall';visual=null;render();return;
  }
  if(stage==='position'){const f=$('#stroom-position');if(!f.reportValidity())return;const a=api.place(room(),api.wall,number($('#stroom-offset').value),number($('#stroom-height').value));visual={x:a[0],y:a[1],z:a[2]};if(index===3){const b=api.place(room(),api.wall,number($('#stroom-end').value),number($('#stroom-height').value));if(Math.hypot(a[0]-b[0],a[1]-b[1])<.001)throw Error('Kies verschillende begin- en eindpunten voor de sleuf.');Object.assign(visual,{x2:b[0],y2:b[1],z2:b[2]});}stage='confirm';render();return;}
  if(stage==='wall'){const value=$('#stroom-wall-value').value;if(!value)throw Error('Kies eerst de muur of het plafond.');surface=value;stage='confirm';render();return;}
  if(stage==='confirm'){
   if(!prepared)return;if(state.project!==prepared.reference||JSON.stringify(state.project)!==prepared.snapshot){render();$('#stroom-error').textContent='De offerte is veranderd. Controleer de nieuwe prijs en bevestig opnieuw.';return;}
   const p=prepared.project;lastAdded={id:p.regels.at(-1).id,previousTrench:lastTrench};if(index===3)lastTrench={surface,quantity:Number(quantity),visual};if(api.wall&&index<3)batchPlaced++;stage=index===4?'review':api.wall&&index<3&&batchPlaced<batchTotal?'position':'again';prepared=null;wijzig(()=>state.project=p);render();return;
  }
  if(stage==='review')api.done();
 }catch(e){$('#stroom-error').textContent=e.message;}}
 function back(){if(stage==='intro'){api.back();return;}if(stage==='count'){if(index===0)stage='intro';else index--;quantity='';}else if(stage==='position')stage=index<3?'count':'length';else if(stage==='wall')stage=index<3?'count':'length';else if(stage==='confirm'){if(index===4)stage='close';else stage=api.wall?'position':'wall';}else if(stage==='length')stage='trench';else if(stage==='again')stage=index<3?'count':'length';else if(stage==='close')stage='trench';else if(stage==='trench'){index=2;stage='count';}else stage='trench';render();}
 function click(e){const b=e.target.closest('[data-stroom]');if(!b)return;const action=b.dataset.stroom;
  if(action==='stop-placement'&&stage==='position'&&index<3){warning=`${batchTotal-batchPlaced} gekozen punt(en) zijn nog niet geplaatst of begroot.`;stage='again';render();return;}
  if(action==='undo'&&stage==='again'&&lastAdded){const id=lastAdded.id;if(state.project.regels.some(w=>w.id===id&&w.ruimte_id===roomId)){wijzig(()=>state.project.regels=state.project.regels.filter(w=>w.id!==id));lastTrench=lastAdded.previousTrench;}lastAdded=null;stage=index<3?'count':'length';render();return;}
  if(action==='none'){advance();return;}
  if(action==='unknown'){warning=stage==='length'?'De sleuflengte moet nog gemeten worden. Er is daarvoor niets toegevoegd.':'Of er sleuven nodig zijn moet nog bevestigd worden. Er zijn geen extra sleuven toegevoegd.';stage='review';render();return;}
  if(stage==='intro'){if(action==='yes'){stage='count';index=0;quantity='';render();}else api.done();return;}
  if(stage==='trench'){if(action==='yes'){index=3;quantity='';stage='length';}else stage=lastTrench?'close':'review';render();return;}
  if(stage==='again'){if(action==='yes'){quantity='';surface='';stage=index<3?'count':'length';render();}else if(index===3){stage='close';render();}else advance();return;}
  if(stage==='close'){if(action==='yes'&&lastTrench){index=4;surface=lastTrench.surface;visual=lastTrench.visual;quantity=String(lastTrench.quantity);stage='confirm';}else stage='review';render();}
 }
 function submit(e){if(e.target.matches('#stroom-count,#stroom-length,#stroom-wall,#stroom-position')){e.preventDefault();next();}}
 root.addEventListener('click',click);root.addEventListener('submit',submit);
 render();return {next,back,destroy(){disposed=true;root.removeEventListener('click',click);root.removeEventListener('submit',submit);}};
}};
})();
