/* Navigation is presentation state, never part of measured/project history. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const rail = $('.studio-nav');
  const sections = ['ruimte-invoer','werk-invoer','installatie-invoer','zijde','offertepaneel'];
  const labels = {tekening:'Tekening','ruimte-invoer':'Maten','werk-invoer':'Werken','zijde':'Project','offertepaneel':'Offerte'};
  let active = 'tekening', pending = null, frame = 0;
  const visible = el => !!el && !el.hidden && el.getClientRects().length > 0;
  const target = id => $(id === 'tekening' && window.BouwHuis?.getLevel() === 'huis' ? '#huis-paneel' : '#'+id);

  function mark(id) {
    active = id;
    rail.querySelectorAll('[data-studio-doel]').forEach(b => {
      const on = b.dataset.studioDoel === id;
      b.classList.toggle('studio-nav-actief',on);
      if(on)b.setAttribute('aria-current','location');else b.removeAttribute('aria-current');
    });
    const drawing = rail.querySelector('[data-studio-doel="tekening"]');
    drawing.setAttribute('aria-controls',target('tekening').id);
    const name=window.BouwHuis?.getLevel()==='huis'?'Huisplan':'Tekening';
    drawing.title=name;drawing.setAttribute('aria-label',name);
  }

  function context() {
    if(!state.project)return;
    const house = window.BouwHuis?.getLevel() === 'huis';
    $('#studio-plaats').textContent = house ? 'Huisplan' : (actieveRuimte()?.naam || 'Geen ruimte');
    $('#studio-plaats').title = $('#studio-plaats').textContent+' — andere kamer kiezen';
    const roomButton=$('.studio-room-open'),roomLabel='Huis en kamers kiezen: '+$('#studio-plaats').textContent;
    roomButton.setAttribute('aria-label',roomLabel);roomButton.title=roomLabel;
    $('#studio-stap').textContent = house && active === 'tekening' ? 'Indeling' : labels[active];
    document.body.classList.toggle('studio-huis',house);
    const room=actieveRuimte(), summary=$('#studio-room-summary');
    const floor=room&&vlakkenVoor(room).find(v=>v.sleutel==='vloer');
    const count=room?state.project.regels.filter(w=>w.ruimte_id===room.id).length:0;
    const ready=calculationReady(), unavailable=/mislukt|kan de rekenkern niet laden/i.test($('#status').textContent);
    summary.hidden=house||!room;
    summary.textContent=room?`${ready&&floor?NRL.format(floor.bruto)+' m² vloer':unavailable?'Oppervlakte niet beschikbaar':'Oppervlakte wordt berekend'} · ${count} ${count===1?'werkpost':'werkposten'}`:'';
  }

  // A native modal provides focus containment and Escape without a custom trap.
  const roomDialog=$('#studio-rooms'), roomQuery=$('#studio-room-query');
  let roomOpener=null, restoreRoomFocus=true;
  const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('nl-BE');
  function calculationReady() {return !!state.offerte&&!/Berekenen|mislukt|kan de rekenkern niet laden/i.test($('#status').textContent);}
  function renderRooms() {
    const rooms=state.project?.ruimtes||[], query=normalize(roomQuery.value.trim());
    const counts=new Map(), amounts=new Map();
    state.project?.regels.forEach(w=>counts.set(w.ruimte_id,(counts.get(w.ruimte_id)||0)+1));
    state.offerte?.regels.forEach(w=>amounts.set(w.ruimte_id,(amounts.get(w.ruimte_id)||0)+w.totaal));
    const filter=$('#studio-room-filter').value;
    const matches=rooms.filter(r=>normalize(r.naam||'Ruimte').includes(query)&&
      (filter==='all'||(filter==='work'?(counts.get(r.id)||0)>0:!(counts.get(r.id)||0))));
    if($('#studio-room-sort').value==='name')matches.sort((a,b)=>(a.naam||'Ruimte').localeCompare(b.naam||'Ruimte','nl-BE',{numeric:true,sensitivity:'base'}));
    $('#studio-room-count').textContent=`${matches.length} van ${rooms.length} kamers`;
    $('#studio-room-results').innerHTML=matches.length?matches.map(r=>{
      const current=r.id===state.actieveRuimteId&&window.BouwHuis?.getLevel()!=='huis';
      const count=counts.get(r.id)||0;
      return `<button type="button" class="studio-room-choice" data-room-id="${esc(r.id)}" ${current?'aria-current="location"':''}><span><strong>${esc(r.naam||'Ruimte')}${current?' · huidig':''}</strong><small>${esc(ruimteMaatTekst(r))}</small></span><span class="studio-room-figures"><span class="studio-room-price">${calculationReady()?esc(eur(amounts.get(r.id)||0)):'—'}</span><span class="studio-room-work">${count} ${count===1?'werkpost':'werkposten'}</span></span></button>`;
    }).join(''):`<p class="studio-room-empty">${rooms.length?'Geen kamers gevonden. Pas je zoekterm of filter aan.':'Nog geen kamers. Open het huisplan om te beginnen.'}</p>`;
    $('#studio-room-results').scrollTop=0;
  }
  function showRooms(opener) {
    if(!state.project||$('dialog[open]'))return;
    closeMenus();roomOpener=opener;restoreRoomFocus=true;roomQuery.value='';$('#studio-room-filter').value='all';renderRooms();
    document.querySelectorAll('[data-room-picker]').forEach(b=>b.setAttribute('aria-expanded','true'));
    roomDialog.showModal();roomQuery.focus({preventScroll:true});
  }
  function chooseRoom(id) {
    if(!state.project.ruimtes.some(r=>r.id===id))return;
    const destination=['ruimte-invoer','werk-invoer'].includes(active)?active:'tekening';
    restoreRoomFocus=false;roomDialog.close();
    // Leave house selection first: its level switch may restore a different room.
    window.BouwHuis?.setLevel('ruimte');state.actieveRuimteId=id;
    planSelectie=null;planInspectieOpen=false;Object.assign(planCamera,{zoom:1,panX:0,panY:0});
    window.BouwMeten?.reset();render();open(destination,{exclusive:true});
  }
  roomQuery.addEventListener('input',renderRooms);
  $('#studio-room-filter').addEventListener('change',renderRooms);
  $('#studio-room-sort').addEventListener('change',renderRooms);
  roomQuery.addEventListener('keydown',e=>{
    const buttons=[...roomDialog.querySelectorAll('[data-room-id]')];
    if(e.key==='ArrowDown'&&buttons.length){e.preventDefault();buttons[0].focus();}
    if(e.key==='Enter'){e.preventDefault();if(buttons.length===1)chooseRoom(buttons[0].dataset.roomId);else buttons[0]?.focus();}
  });
  $('#studio-room-results').addEventListener('keydown',e=>{
    const buttons=[...roomDialog.querySelectorAll('[data-room-id]')],index=buttons.indexOf(e.target);
    if(index<0||!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;
    e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+(e.key==='ArrowDown'?1:-1)));
    buttons[next].focus();
  });
  $('#studio-room-results').addEventListener('click',e=>{const b=e.target.closest('[data-room-id]');if(b)chooseRoom(b.dataset.roomId);});
  // Search inputs otherwise consume Escape by only clearing their value.
  roomDialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();roomDialog.close();}});
  $('#studio-rooms-close').addEventListener('click',()=>roomDialog.close());
  $('#studio-room-house').addEventListener('click',()=>{restoreRoomFocus=false;roomDialog.close();window.BouwHuis?.setLevel('huis');open('tekening');});
  roomDialog.addEventListener('close',()=>{
    if(roomDialog.open)return; // Ignore a queued close from a previous opening.
    document.querySelectorAll('[data-room-picker]').forEach(b=>b.setAttribute('aria-expanded','false'));
    if(restoreRoomFocus&&visible(roomOpener))roomOpener.focus({preventScroll:true});sync();
  });
  document.querySelectorAll('[data-room-picker]').forEach(b=>b.addEventListener('click',()=>showRooms(b)));

  function shortcuts() {
    const hidden = $('#calculator-paneel').hidden || window.BouwHuis?.getLevel() === 'huis' || !!$('dialog[open]');
    const drawing = $('#tekening'), rect = drawing.getBoundingClientRect();
    const top = $('.topbar').getBoundingClientRect().height + rail.getBoundingClientRect().height;
    const inView = visible(drawing) && rect.bottom > top+60 && rect.top < innerHeight-60;
    const add = $('#tekening [data-object-menu]'), a = add.getBoundingClientRect();
    const addVisible = visible(add) && a.top >= top && a.bottom <= innerHeight;
    $('.tekening-snelknop').hidden = hidden || inView;
    $('.object-snelknop').hidden = hidden || addVisible;
  }

  function scan() {
    frame = 0;
    if($('#calculator-paneel').hidden)return;
    if(pending && performance.now() < pending.until){mark(pending.id);context();shortcuts();return;}
    pending = null;
    const anchor = $('.topbar').getBoundingClientRect().height + rail.getBoundingClientRect().height + Math.min(120,innerHeight*.15);
    const candidates = [{id:'tekening',el:target('tekening')},...sections.map(id=>({id:id==='installatie-invoer'?'werk-invoer':id,el:target(id)}))]
      .filter(v=>visible(v.el)).map(v=>({...v,top:v.el.getBoundingClientRect().top})).sort((a,b)=>a.top-b.top);
    const above = candidates.filter(v=>v.top <= anchor);
    mark((above.at(-1)||candidates[0]||{id:'tekening'}).id);
    context();shortcuts();
  }
  function sync() {if(!frame)frame=requestAnimationFrame(scan);}

  function closeMenus() {['bestand-menu','huis-hulp','plan-acties'].forEach(id=>{const el=$('#'+id);if(el)el.open=false;});}
  function open(id, {exclusive=false}={}) {
    if(!(id in labels) && id !== 'installatie-invoer')return;
    if($('#calculator-paneel').hidden)$('[data-hoofdtab="calculator"]').click();
    if(['ruimte-invoer','werk-invoer','installatie-invoer'].includes(id))window.BouwHuis?.setLevel('ruimte');
    const el=target(id);if(!el)return;
    if($('#teken-focus').open && !$('#tekening').contains(el) && el.id!=='tekening')sluitTekenFocus();
    closeMenus();
    // Explicit navigation folds siblings; inline editing keeps its source reachable.
    // Never discard layer settings or nested input drafts.
    if(id==='tekening'||exclusive)sections.forEach(key=>{const d=$('#'+key);if(d!==el)d.open=false;});
    for(let p=el;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
    const key=id==='installatie-invoer'?'werk-invoer':id;
    pending={id:key,until:performance.now()+1100};mark(key);context();
    el.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    (el.tagName==='DETAILS'?el.querySelector('summary'):el)?.focus({preventScroll:true});
    shortcuts();sync();
  }

  [['ruimte-invoer','werk-invoer','Verder naar werken'],['werk-invoer','offertepaneel','Offerte bekijken']].forEach(([from,to,text])=>{
    const footer=document.createElement('div');footer.className='studio-next';
    const back=document.createElement('button');back.type='button';back.className='knop';back.textContent='Terug naar tekening';
    back.addEventListener('click',()=>open('tekening',{exclusive:true}));
    const next=document.createElement('button');next.type='button';next.className='knop primair';next.textContent=text+' →';
    next.addEventListener('click',()=>open(to,{exclusive:true}));footer.append(back,next);
    $('#'+from+' > .studio-vouw-inhoud').append(footer);
  });

  function measure() {
    document.documentElement.style.setProperty('--studio-header',Math.ceil($('.topbar').getBoundingClientRect().height)+'px');
    document.documentElement.style.setProperty('--studio-rail',Math.ceil(rail.getBoundingClientRect().height)+'px');
    sync();
  }
  rail.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    const buttons=[...rail.querySelectorAll('button')],index=buttons.indexOf(e.target);if(index<0)return;
    e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    buttons[next].focus();
  });
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-ontwerpniveau]')){open('tekening');return;}
    if(e.target.closest('[data-actie="ruimte-kiezen"]')){pending={id:'tekening',until:performance.now()+350};sync();}
    if(e.target.closest('[data-hoofdtab]')){pending={id:active,until:performance.now()+350};sync();}
  });
  document.addEventListener('toggle',e=>{if(sections.includes(e.target.id)||e.target.tagName==='DIALOG')sync();},true);
  window.addEventListener('scroll',sync,{passive:true});
  window.addEventListener('resize',measure,{passive:true});
  window.addEventListener('wheel',()=>{pending=null;sync();},{passive:true});
  window.addEventListener('touchstart',()=>{pending=null;sync();},{passive:true});
  new MutationObserver(()=>{
    const text=$('#status').textContent,failed=/mislukt|kan de rekenkern niet laden/i.test(text);
    $('#studio-feedback').hidden=!failed;$('#studio-feedback').textContent=failed?text:'';
    context();
    if(roomDialog.open){
      const focused=document.activeElement?.closest('[data-room-id]')?.dataset.roomId;
      const top=$('#studio-room-results').scrollTop;renderRooms();
      if(focused)[...roomDialog.querySelectorAll('[data-room-id]')].find(b=>b.dataset.roomId===focused)?.focus({preventScroll:true});
      $('#studio-room-results').scrollTop=top;
    }
  }).observe($('#status'),{childList:true,subtree:true,characterData:true});
  if(typeof ResizeObserver!=='undefined'){
    const observer=new ResizeObserver(measure);observer.observe($('.topbar'));observer.observe(rail);
  }
  const dialogs=new MutationObserver(sync);
  document.querySelectorAll('dialog').forEach(d=>dialogs.observe(d,{attributes:true,attributeFilter:['open']}));
  window.BouwStudio={open,sync};measure();
})();
