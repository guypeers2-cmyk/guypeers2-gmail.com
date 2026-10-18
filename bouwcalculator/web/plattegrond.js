/* ==========================================================
   PLATTEGROND — visuele weergave van een ruimte.

   Drie weergaven, alle als zuiver SVG (scherp op elk scherm,
   printbaar en klikbaar):
     • plattegrond() — bovenaanzicht met maten, deuren en ramen
     • isometrie()   — axonometrische 3D-weergave van de ruimte
     • aanzicht()    — orthografisch aanzicht van een gekozen vlak

   De wanden zijn klikbaar: klikken op een wand voegt werk toe
   (precies als de knop '+ werk' in de oppervlaktabel).

   De module gebruikt geen browser-API's die niet in jsdom bestaan
   (geen getBBox), zodat de tests er draaibaar blijven.
   ========================================================== */
(function () {
  "use strict";

  const NRL = new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 2 });
  const ZIJDEN = ["noord", "zuid", "oost", "west"];

  const KAP = 30;      // breedte van het klikbare bandje langs een wand
  const R = (n) => Math.round(n * 100) / 100;
  const F = (n) => NRL.format(n);

  let teller = 0;
  const uniq = () => `bp${(teller += 1)}`;

  function esc(tekst) {
    return String(tekst == null ? "" : tekst)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function punten(lijst) {
    return lijst.map((p) => `${R(p[0])},${R(p[1])}`).join(" ");
  }

  function zoomBox(W,H,opties) {
    const zoom=Math.max(.75,Math.min(3,Number(opties.zoom)||1));
    return `${R((W-W/zoom)/2+get(opties.panX))} ${R((H-H/zoom)/2+get(opties.panY))} ${R(W/zoom)} ${R(H/zoom)}`;
  }

  /* Openingen per muur verzamelen. */
  function openingenPerMuur(ruimte) {
    const per = { noord: [], zuid: [], oost: [], west: [] };
    (ruimte.openingen || []).forEach((o, index) => {
      if (per[o.muur]) per[o.muur].push({...o, _index:index});
    });
    return per;
  }

  /* Eén geometrie voor beide aanzichten. Begrens alleen de tekening;
     de opgegeven maten blijven ongewijzigd voor de calculatie. */
  function openingLayout(open, lengte) {
    return open.map((o, i) => {
      const breedte = Math.min(lengte, Math.max(0, parseFloat(o.breedte) || 0));
      const auto = lengte * ((i + 0.5) / open.length) - breedte / 2;
      const start = o.positie == null || o.positie === "" ? auto : parseFloat(o.positie);
      return { ...o, start: Math.max(0, Math.min(lengte - breedte, Number.isFinite(start) ? start : auto)), tekenBreedte: breedte };
    }).sort((a, b) => a.start - b.start);
  }

  /* Oppervlakte per vlak-sleutel. */
  function vlakMap(vlakken) {
    const map = {};
    (vlakken || []).forEach((v) => { map[v.sleutel] = v; });
    return map;
  }

  /* Werkregels zijn schematische objecten; plaatsing verandert nooit de calculatie. */
  function laag(regel) {
    return regel.pakket_id.startsWith('elek_') ? 'elektriciteit'
      : regel.pakket_id.startsWith('san_') ? 'sanitair' : 'afwerking';
  }
  const get = (v, fallback = 0) => {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : fallback;
  };
  const begrens = (v, max) => Math.max(0, Math.min(max, v));
  function werkGeometrie(r, ruimte) {
    if(complex(ruimte))return vormWerk(r,ruimte);
    const L = Math.max(.2, get(ruimte.lengte, .2)), B = Math.max(.2, get(ruimte.breedte, .2)), H = Math.max(.2, get(ruimte.hoogte, .2));
    const fractie = .18 + ((r.nummer || 1) * .173 % .64);
    const zijde = r.oppervlak;
    let x = L * fractie, y = B * fractie;
    if (zijde === 'noord') y = .12;
    if (zijde === 'zuid') y = Math.max(0, B - .12);
    if (zijde === 'west') x = .12;
    if (zijde === 'oost') x = Math.max(0, L - .12);
    if (r.pakket?.eenheid === 'm2') {
      if (zijde === 'noord') y = Math.min(.6,B*.2);
      if (zijde === 'zuid') y = B-Math.min(.6,B*.2);
      if (zijde === 'west') x = Math.min(.6,L*.2);
      if (zijde === 'oost') x = L-Math.min(.6,L*.2);
    }
    const standaardZ = zijde === 'plafond' ? H : zijde === 'vloer' ? 0
      : r.pakket?.eenheid === 'm2' ? H*.65 : /schakelaar/.test(r.pakket_id) ? 1.1 : /stopcontact/.test(r.pakket_id) ? .3 : .6;
    const v = r.visualisatie || {};
    const a = [begrens(get(v.x,x),L), begrens(get(v.y,y),B), begrens(get(v.z,standaardZ),H)];
    const b = [begrens(get(v.x2, zijde === 'west' || zijde === 'oost' ? a[0] : L * .82), L),
      begrens(get(v.y2, zijde === 'west' || zijde === 'oost' ? B * .82 : a[1]), B),
      begrens(get(v.z2,a[2]),H)];
    return {a,b,L,B,H};
  }
  function traceLengte(r,ruimte) {
    if(r?.pakket?.eenheid!=='m')return null;
    const {a,b}=werkGeometrie(r,ruimte);
    return Math.hypot(...a.map((v,i)=>b[i]-v));
  }
  function icon(r) {
    const id = r.pakket_id;
    if (/stopcontact/.test(id)) return '<circle r="8"/><circle cx="-3" r="1"/><circle cx="3" r="1"/><path d="M-3 -7v2M3 -7v2"/>';
    if (/schakelaar/.test(id)) return '<rect x="-8" y="-8" width="16" height="16" rx="2"/><path d="M-4 4L4 -4"/>';
    if (/lichtpunt/.test(id)) return '<circle r="8"/><path d="M-6 -6L6 6M-6 6L6 -6"/>';
    if (/san_wc/.test(id)) return '<rect x="-7" y="-11" width="14" height="7" rx="1"/><ellipse cy="3" rx="7" ry="9"/><ellipse cy="3" rx="4" ry="6"/>';
    if (/lavabo/.test(id)) return '<rect x="-11" y="-8" width="22" height="16" rx="3"/><ellipse cy="1" rx="7" ry="4"/><path d="M0 -8v6"/>';
    if (/collector/.test(id)) return '<path d="M-11 0H11M-7 0v7M-2 0v7M3 0v7M8 0v7"/>';
    if (/kraan|koppeling|afvoerstuk/.test(id)) return '<path d="M-9 6V-2H7V4M-4 -7H4M0 -7V-2"/><circle cx="7" cy="7" r="1"/>';
    if (/wasmachine/.test(id)) return '<rect x="-9" y="-10" width="18" height="20" rx="2"/><circle cy="2" r="6"/><path d="M-6 -6H5"/>';
    if (/druktest/.test(id)) return '<circle r="9"/><path d="M0 0L5 -5M-3 5H3"/>';
    return '<path d="M-8 0H8M0 -8V8"/><circle r="5"/>';
  }
  function tint(r) {
    return /warmwater/.test(r.pakket_id) ? 'warmwater' : /koudwater/.test(r.pakket_id) ? 'koudwater'
      : /afvoer/.test(r.pakket_id) ? 'afvoer' : /sleuf/.test(r.pakket_id) ? 'sleuf' : laag(r);
  }
  function werkOverlay(ruimte, opties, projecteer, iso = false) {
    const regels = (opties.regels || []).filter(r => r.pakket && r.aantal > 0 && opties.lagen?.[laag(r)] !== false);
    let svg = '';
    // Objecten eerst op diepte sorteren voor een consistente 3D-tekening.
    const objecten = regels.filter(r => r.pakket.eenheid !== 'm2').map(r => ({r,g:werkGeometrie(r,ruimte)}));
    objecten.sort((a,b) => (a.r.pakket.eenheid === 'm' ? 0 : 1) - (b.r.pakket.eenheid === 'm' ? 0 : 1)
      || (iso ? projecteer(...a.g.a)[1] - projecteer(...b.g.a)[1] : 0));
    for (const {r,g} of objecten) {
      const a = projecteer(...g.a), b = projecteer(...g.b);
      const naam = `${r.nummer}. ${r.pakket.naam} · ${F(r.aantal)} ${r.pakket.eenheid}`;
      svg += `<g class="werk-object tint-${tint(r)}" data-fokus="plan_${esc(r.id)}" data-plan-drag="regel" data-plan-regel="${esc(r.id)}" role="button" tabindex="0" aria-label="${esc(naam)} — werkregel bewerken"><title>${esc(naam)}; schematisch, niet op schaal</title>`;
      if (r.pakket.eenheid === 'm') {
        svg += `<line class="werk-trace-hit" x1="${R(a[0])}" y1="${R(a[1])}" x2="${R(b[0])}" y2="${R(b[1])}"/>`;
        svg += `<line class="werk-trace" x1="${R(a[0])}" y1="${R(a[1])}" x2="${R(b[0])}" y2="${R(b[1])}"/>`;
        for (const [i,p] of [a,b].entries()) svg += `<circle class="sleep-hit" data-fokus="plan_${esc(r.id)}_eind_${i}" data-plan-end="${i ? 'b' : 'a'}" tabindex="0" role="button" aria-label="${i ? 'Eindpunt' : 'Startpunt'} van tracé ${r.nummer} verplaatsen" cx="${R(p[0])}" cy="${R(p[1])}" r="6"/><circle class="werk-eind" cx="${R(p[0])}" cy="${R(p[1])}" r="6" style="pointer-events:none"/>`;
        const fractie = .18 + .65 * (((r.nummer || 1) * .31) % 1);
        svg += `<text class="werk-route-label" x="${R(a[0]+(b[0]-a[0])*fractie)}" y="${R(a[1]+(b[1]-a[1])*fractie-9)}" text-anchor="middle">${r.nummer} · ${F(r.aantal)} m</text>`;
      } else {
        // Indicatieve sanitaire volumes, geen productmaten of BIM-geometrie.
        if (iso && /san_(wc|lavabo|wasmachine|collector)$/.test(r.pakket_id)) {
          const [x,y,z] = g.a;
          const w = Math.min(.45, g.L), d = Math.min(.48, g.B), h = Math.min(.55,g.H-z);
          const x0 = Math.min(x,g.L-w), y0 = Math.min(y,g.B-d);
          const P = (dx,dy,dz) => projecteer(x0+dx,y0+dy,z+dz);
          svg += `<polygon class="werk-volume zij" points="${punten([P(0,d,0),P(w,d,0),P(w,d,h),P(0,d,h)])}"/>`;
          svg += `<polygon class="werk-volume voor" points="${punten([P(w,0,0),P(w,d,0),P(w,d,h),P(w,0,h)])}"/>`;
          svg += `<polygon class="werk-volume boven" points="${punten([P(0,0,h),P(w,0,h),P(w,d,h),P(0,d,h)])}"/>`;
        }
        svg += `<g class="werk-symbool" transform="translate(${R(a[0])} ${R(a[1])})"><circle class="sleep-hit" r="17"/><circle class="werk-achtergrond" r="17"/>${icon(r)}<text class="werk-nummer" x="17" y="-13">${r.nummer}</text>`;
        if (r.aantal !== 1) svg += `<text class="werk-aantal" x="0" y="29" text-anchor="middle">× ${F(r.aantal)}</text>`;
        svg += '</g>';
      }
      svg += '</g>';
    }
    return svg;
  }

  function vlakMarkeringen(ruimte, opties, projecteer, zichtbaar = null) {
    let svg = '';
    const L = Math.max(.2,get(ruimte.lengte,.2)), B = Math.max(.2,get(ruimte.breedte,.2)), H = Math.max(.2,get(ruimte.hoogte,.2));
    const vlakken = {
      noord:[[0,0,0],[L,0,0],[L,0,H],[0,0,H]], zuid:[[0,B,0],[L,B,0],[L,B,H],[0,B,H]],
      west:[[0,0,0],[0,B,0],[0,B,H],[0,0,H]], oost:[[L,0,0],[L,B,0],[L,B,H],[L,0,H]],
      vloer:[[0,0,0],[L,0,0],[L,B,0],[0,B,0]], plafond:[[0,0,H],[L,0,H],[L,B,H],[0,B,H]],
    };
    for (const r of opties.regels || []) {
      if (r.pakket?.eenheid !== 'm2' || r.aantal <= 0 || opties.lagen?.afwerking === false) continue;
      if (zichtbaar && !zichtbaar.includes(r.oppervlak) && !['vloer','plafond'].includes(r.oppervlak)) continue;
      const vlak = vlakken[r.oppervlak];
      if (!vlak) continue;
      const punten2d = vlak.map(p => projecteer(...p));
      const anker = werkGeometrie(r,ruimte).a;
      const [x,y] = projecteer(...anker);
      svg += `<g class="werk-vlak" data-fokus="plan_${esc(r.id)}" data-plan-drag="marker" data-plan-regel="${esc(r.id)}" tabindex="0" role="button" aria-label="${esc(r.pakket.naam)} — werkregel bewerken"><title>${esc(r.pakket.naam)} · ${F(r.aantal)} m²; vlakmarkering, geen exacte dekking</title>`;
      svg += `<polygon class="werk-vlak-markering" points="${punten(punten2d)}"/>`;
      svg += `<circle class="sleep-hit" cx="${R(x)}" cy="${R(y)}" r="11"/><circle class="werk-vlak-badge" cx="${R(x)}" cy="${R(y)}" r="11"/><text class="werk-vlak-nummer" x="${R(x)}" y="${R(y+4)}" text-anchor="middle">${r.nummer}</text></g>`;
    }
    return svg;
  }

  const complex = r=>!!(r.contour?.length || r.dak);
  function vormWerk(r,ruimte) {
    const V=window.BouwVorm,edge=V.edges(ruimte).find(e=>e.id===r.oppervlak),v=r.visualisatie||{};
    const t=.18+((r.nummer||1)*.173%.64),L=Number(ruimte.lengte),B=Number(ruimte.breedte),H=Number(ruimte.hoogte);
    const binnen=V.interior(ruimte),base=edge?[edge.a.x+edge.u[0]*edge.lengte*t,edge.a.y+edge.u[1]*edge.lengte*t]:[binnen.x,binnen.y];
    const xy=[begrens(get(v.x,base[0]),L),begrens(get(v.y,base[1]),B)];
    const z=r.oppervlak==='plafond'?V.height(ruimte,...xy):r.oppervlak==='vloer'?0:/stopcontact/.test(r.pakket_id)?.3:/schakelaar/.test(r.pakket_id)?1.1:Math.min(.6,H);
    const a=[...xy,begrens(get(v.z,z),H)];
    const end=edge?[edge.a.x+edge.u[0]*edge.lengte*.82,edge.a.y+edge.u[1]*edge.lengte*.82]:[L*.82,B/2];
    const endXY=[begrens(get(v.x2,end[0]),L),begrens(get(v.y2,end[1]),B)];
    const b=[...endXY,begrens(get(v.z2,r.oppervlak==='plafond'?V.height(ruimte,...endXY):a[2]),H)];
    return {a,b,L,B,H};
  }
  function vormOpening(ruimte,index) {
    const bron=ruimte.openingen?.[index];if(!bron)return null;
    const e=window.BouwVorm.edges(ruimte).find(e=>e.id===bron.muur);if(!e)return null;
    const per=(ruimte.openingen||[]).map((o,i)=>({...o,_index:i})).filter(o=>o.muur===e.id);
    const o=openingLayout(per,e.lengte).find(o=>o._index===index),V=window.BouwVorm;
    const start=o.start,breedte=o.tekenBreedte,p=s=>[e.a.x+e.u[0]*s,e.a.y+e.u[1]*s];
    const left=p(start),right=p(start+breedte),cap=Math.max(0,Math.min(V.height(ruimte,...left),V.height(ruimte,...right)));
    const hoogte=Math.min(cap,Math.max(0,get(bron.hoogte))),onder=begrens(get(bron.borstwering),Math.max(0,cap-hoogte));
    return {a:[...left,onder],b:[...right,onder],c:[...right,onder+hoogte],d:[...left,onder+hoogte],u:e.u,start,zijde:e.id,lengte:e.lengte,breedte,hoogte,L:Number(ruimte.lengte),B:Number(ruimte.breedte),H:Number(ruimte.hoogte)};
  }
  function vormAanzicht(ruimte,vlak) {
    const e=window.BouwVorm.edges(ruimte).find(e=>e.id===vlak);
    if(!e)return {...planProjectie(ruimte),vlak,plane:'xy',teken:1};
    const H=Math.max(e.h0,e.h1),schaal=Math.min(600/e.lengte,350/H),links=(780-e.lengte*schaal)/2,boven=104+(350-H*schaal)/2;
    const P=(x,y,z=0)=>[links+((x-e.a.x)*e.u[0]+(y-e.a.y)*e.u[1])*schaal,boven+(H-z)*schaal];
    P.basis=[e.u,[0,0,1]];
    return {P,vlak,plane:'wand',teken:1,wand:e,breedte:e.lengte,hoogte:H,schaal,links,boven};
  }
  function vormTekening(ruimte,vlakken,werk,opties,mode) {
    const V=window.BouwVorm,p=V.points(ruimte),edges=V.edges(ruimte),vm=vlakMap(vlakken),front=mode==='aanzicht',iso=mode==='isometrie';
    const g=front?vormAanzicht(ruimte,opties.vlak):iso?projectie(ruimte,opties.hoek):planProjectie(ruimte),P=g.P;
    const roof=p.map(a=>[a.x,a.y,V.height(ruimte,a.x,a.y)]),floor=p.map(a=>[a.x,a.y,0]);
    const wall=e=>[[e.a.x,e.a.y,0],[e.b.x,e.b.y,0],[e.b.x,e.b.y,e.h1],[e.a.x,e.a.y,e.h0]];
    const shape=ps=>punten(ps.map(a=>P(...a)));
    const poly=(ps,cls,attrs='')=>`<polygon class="${cls}" points="${shape(ps)}" ${attrs}/>`;
    const text=(pt,s,cls='vorm-maat')=>{const q=P(...pt);return `<text class="${cls}" x="${R(q[0])}" y="${R(q[1])}" text-anchor="middle">${esc(s)}</text>`;};
    const attr=(id,soort)=>`data-vlak="${esc(id)}" data-soort="${soort}" tabindex="0" role="button" aria-label="${esc(vm[id]?.naam || id)} — object toevoegen"`;
    let svg='';
    if(!front || !g.wand)svg+=poly(front&&opties.vlak==='plafond'?roof:floor,'vorm-vloer plan-open',attr(front?opties.vlak:'vloer',front?opties.vlak:'vloer'));
    if(!front || !g.wand){
      const cid=uniq(),step=Math.max(.5,Math.ceil(Math.max(ruimte.lengte,ruimte.breedte)/24));
      svg+=`<defs><clipPath id="${cid}"><polygon points="${shape(floor)}"/></clipPath></defs><g clip-path="url(#${cid})" pointer-events="none">`;
      for(let x=step;x<ruimte.lengte;x+=step){const a=P(x,0),b=P(x,ruimte.breedte);svg+=`<line class="vorm-grid" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;}
      for(let y=step;y<ruimte.breedte;y+=step){const a=P(0,y),b=P(ruimte.lengte,y);svg+=`<line class="vorm-grid" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;}
      svg+='</g>';
    }
    const visible=front&&g.wand?edges.filter(e=>e.id===opties.vlak):front?[]:edges;
    const sorted=[...visible].sort((a,b)=>P(a.a.x+a.u[0]*a.lengte/2,a.a.y+a.u[1]*a.lengte/2)[1]-P(b.a.x+b.u[0]*b.lengte/2,b.a.y+b.u[1]*b.lengte/2)[1]);
    for(const e of sorted){
      const a=P(e.a.x,e.a.y,0),b=P(e.b.x,e.b.y,0);
      svg+=`<g class="plan-wand" ${attr(e.id,'muur')}>`;
      if(iso||g.wand)svg+=poly(wall(e),'vorm-wand');
      else svg+=`<line class="vorm-wand-hit" x1="${R(a[0])}" y1="${R(a[1])}" x2="${R(b[0])}" y2="${R(b[1])}"/><line class="vorm-rand" x1="${R(a[0])}" y1="${R(a[1])}" x2="${R(b[0])}" y2="${R(b[1])}"/>`;
      if(opties.maten!==false){
        const x=(e.a.x+e.b.x)/2,y=(e.a.y+e.b.y)/2,q=P(x,y,iso||g.wand?(e.h0+e.h1)/2:0);
        const n=[-e.u[1],e.u[0]],sign=V.inside(ruimte,{x:x+n[0]*.01,y:y+n[1]*.01})?-1:1;
        const away=P(x+n[0]*sign*.2,y+n[1]*sign*.2),at=P(x,y),dx=away[0]-at[0],dy=away[1]-at[1],len=Math.hypot(dx,dy)||1;
        svg+=`<text class="vorm-maat" x="${R(q[0]+(iso||g.wand?0:dx/len*25))}" y="${R(q[1]+(iso||g.wand?-17:dy/len*25))}" text-anchor="middle">${esc(e.naam)} · ${F(e.lengte)} m</text>`;
      }
      svg+='</g>';
    }
    if(iso)svg+=poly(roof,'vorm-dak');
    (ruimte.openingen||[]).forEach((o,i)=>{
      if(front && (!g.wand || o.muur!==opties.vlak))return;
      const a=vormOpening(ruimte,i);if(!a)return;
      svg+=`<g data-fokus="opening_sleep_${i}" data-plan-drag="opening" data-opening-index="${i}" tabindex="0" role="button" aria-label="${esc(o.naam)} verplaatsen">`;
      if(iso||g.wand)svg+=poly([a.a,a.b,a.c,a.d],'vorm-opening');
      else{const x=P(...a.a),y=P(...a.b);svg+=`<line class="vorm-opening-lijn" x1="${R(x[0])}" y1="${R(x[1])}" x2="${R(y[0])}" y2="${R(y[1])}"/>`;}
      svg+=`<title>${esc(o.naam)} · ${F(o.breedte)} × ${F(o.hoogte)} m</title></g>`;
    });
    const gekozen={...opties,regels:(opties.regels||[]).filter(r=>!front||r.oppervlak===opties.vlak)};
    for(const r of gekozen.regels){
      if(r.pakket?.eenheid!=='m2'||r.aantal<=0||opties.lagen?.afwerking===false)continue;
      const e=edges.find(e=>e.id===r.oppervlak),ps=e?wall(e):r.oppervlak==='plafond'?roof:floor;
      const pos=P(...werkGeometrie(r,ruimte).a);
      svg+=`<g class="werk-vlak" data-fokus="plan_${esc(r.id)}" data-plan-drag="marker" data-plan-regel="${esc(r.id)}" tabindex="0" role="button" aria-label="${esc(r.pakket.naam)} bewerken">${poly(ps,'werk-vlak-markering')}<circle class="sleep-hit" cx="${R(pos[0])}" cy="${R(pos[1])}" r="15"/><circle class="werk-vlak-badge" cx="${R(pos[0])}" cy="${R(pos[1])}" r="11"/><text class="werk-vlak-nummer" x="${R(pos[0])}" y="${R(pos[1]+4)}" text-anchor="middle">${r.nummer}</text></g>`;
    }
    svg+=werkOverlay(ruimte,gekozen,P,iso);
    const title=front?(vm[opties.vlak]?.naam || opties.vlak)+(g.wand?' · binnenaanzicht vanaf startpunt':' · bovenprojectie'):iso?'3D · contour en plafondhelling':'Bovenaanzicht · binnencontour';
    svg+=`<text class="vorm-titel" x="390" y="30" text-anchor="middle">${esc(title)}</text>`;
    if(opties.maten!==false)svg+=`<text class="vorm-maat" x="390" y="520" text-anchor="middle">Vloer ${F(Math.abs(V.area(p)))} m² · ${edges.length} wanden${ruimte.dak?' · hellend plafond':''}</text>`;
    return `<svg class="plan ${iso?'iso':''} vorm-plan" viewBox="${zoomBox(780,560,opties)}" role="group" aria-label="${esc(title+' van '+ruimte.naam)}">${svg}</svg>`;
  }

  function projectie(ruimte, hoek = 0) {
    const L = Math.max(.2,get(ruimte.lengte,.2)), B = Math.max(.2,get(ruimte.breedte,.2)), H = Math.max(.2,get(ruimte.hoogte,.2));
    hoek = ((Math.trunc(hoek) % 4) + 4) % 4;
    const W = 780, HP = 560, K = Math.cos(Math.PI / 6), S = 0.5;
    const LX = hoek % 2 ? B : L, BY = hoek % 2 ? L : B;
    const schaal = Math.min(620 / ((LX + BY) * K), 390 / (H * 0.9 + (LX + BY) * S));
    const ox = (W - (LX + BY) * K * schaal) / 2 + BY * K * schaal;
    const oy = (HP - (H * 0.9 + (LX + BY) * S) * schaal) / 2 + H * 0.9 * schaal;
    // Rotatie in modelcoördinaten; afstanden van openingen blijven aan hun eigen wand gekoppeld.
    const draai = (x, y) => [[x, y], [y, L - x], [L - x, B - y], [B - y, x]][hoek];
    const P = (x, y, z = 0) => {
      const [u, v] = draai(x, y);
      return [ox + (u - v) * K * schaal, oy + (u + v) * S * schaal - z * 0.9 * schaal];
    };
    if(complex(ruimte)){
      const v=window.BouwVorm,ps=v.points(ruimte).flatMap(p=>[P(p.x,p.y,0),P(p.x,p.y,v.height(ruimte,p.x,p.y))]);
      const xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
      const factor=Math.min(620/Math.max(1,maxX-minX),390/Math.max(1,maxY-minY));
      return {P:(x,y,z=0)=>{const q=P(x,y,z);return [(q[0]-(minX+maxX)/2)*factor+390,(q[1]-(minY+maxY)/2)*factor+280];},W,HP};
    }
    return {P,W,HP};
  }
  function planProjectie(ruimte) {
    const L = Math.max(.2,get(ruimte.lengte,.2)), B = Math.max(.2,get(ruimte.breedte,.2));
    const schaal = Math.min(572/L,396/B);
    const rx = 104+(572-L*schaal)/2, ry=58+(396-B*schaal)/2;
    return {P:(x,y,z=0)=>[rx+x*schaal,ry+y*schaal]};
  }
  function openingGeometrie(ruimte,index) {
    if(complex(ruimte))return vormOpening(ruimte,index);
    const bron = ruimte.openingen?.[index];
    if (!bron || !ZIJDEN.includes(bron.muur)) return null;
    const L=Math.max(.2,get(ruimte.lengte,.2)), B=Math.max(.2,get(ruimte.breedte,.2)), H=Math.max(.2,get(ruimte.hoogte,.2));
    const lengte = ['noord','zuid'].includes(bron.muur) ? L : B;
    const o = openingLayout(openingenPerMuur(ruimte)[bron.muur],lengte).find(o=>o._index===index);
    const onder = begrens(get(bron.borstwering), Math.max(0,H-Math.max(0,get(bron.hoogte))));
    const a = {noord:[o.start,0,onder],zuid:[o.start,B,onder],west:[0,o.start,onder],oost:[L,o.start,onder]}[bron.muur];
    return {a,zijde:bron.muur,lengte,breedte:o.tekenBreedte,hoogte:Math.max(0,get(bron.hoogte)),L,B,H};
  }

  /* ==================================================================
     2D — bovenaanzicht
     ================================================================== */
  function plattegrond(ruimte, vlakken, werk, opties = {}) {
    if(complex(ruimte))return vormTekening(ruimte,vlakken,werk,opties,'plattegrond');
    const L = Math.max(0.2, parseFloat(ruimte.lengte) || 0.2);
    const B = Math.max(0.2, parseFloat(ruimte.breedte) || 0.2);
    const H = Math.max(0.2, parseFloat(ruimte.hoogte) || 0.2);

    const W = 780, HP = 540;
    const margeL = 104, margeR = 104, margeB = 86, margeT = 58;
    const binW = W - margeL - margeR;
    const binH = HP - margeT - margeB;
    const schaal = Math.min(binW / L, binH / B);
    const rx = margeL + (binW - L * schaal) / 2;
    const ry = margeT + (binH - B * schaal) / 2;
    const w = L * schaal, h = B * schaal;

    const vlakkenMap = vlakMap(vlakken);
    const openingen = openingenPerMuur(ruimte);

    /* Muurgegevens: startpunt, richting, binnenwaarts, lengte in px. */
    const muren = {
      noord: { p0: [rx, ry], d: [1, 0], n: [0, 1], len: w, label: "Wand noord" },
      zuid: { p0: [rx, ry + h], d: [1, 0], n: [0, -1], len: w, label: "Wand zuid" },
      west: { p0: [rx, ry], d: [0, 1], n: [1, 0], len: h, label: "Wand west" },
      oost: { p0: [rx + w, ry], d: [0, 1], n: [-1, 0], len: h, label: "Wand oost" },
    };

    let svg = "";

    /* Vloer */
    svg += `<rect class="plan-vloer" x="${R(rx)}" y="${R(ry)}" width="${R(w)}" height="${R(h)}" rx="2"/>`;

    /* Gridlijnen elke meter (subtiel) */
    const stap = L >= 8 ? 1 : (L >= 4 ? 0.5 : 0.25);
    for (let x = stap; x < L - 0.001; x += stap) {
      svg += `<line class="plan-raster" x1="${R(rx + x * schaal)}" y1="${R(ry)}" x2="${R(rx + x * schaal)}" y2="${R(ry + h)}"/>`;
    }
    for (let y = stap; y < B - 0.001; y += stap) {
      svg += `<line class="plan-raster" x1="${R(rx)}" y1="${R(ry + y * schaal)}" x2="${R(rx + w)}" y2="${R(ry + y * schaal)}"/>`;
    }

    /* Wanden met openingen */
    ZIJDEN.forEach((zijde) => {
      const m = muren[zijde];
      const open = openingLayout(openingen[zijde] || [], m.len / schaal);
      /* posities van de openingen (gelijk verdeeld, want de positie
         langs de muur is niet vastgelegd) */
      const stukken = [];
      let vorig = 0;
      open.forEach((o, i) => {
        const bw = o.tekenBreedte * schaal;
        const mid = (o.start + o.tekenBreedte / 2) * schaal;
        const s0 = Math.max(0, mid - bw / 2);
        const s1 = Math.min(m.len, mid + bw / 2);
        if (s0 > vorig) stukken.push([vorig, s0]);
        vorig = Math.max(vorig, s1);
      });
      if (vorig < m.len) stukken.push([vorig, m.len]);

      const label = vlakkenMap[zijde];
      const groep = [];
      const openingGroep = [];

      stukken.forEach(([a, b]) => {
        if (b - a < 0.5) return;
        const x1 = m.p0[0] + m.d[0] * a, y1 = m.p0[1] + m.d[1] * a;
        const x2 = m.p0[0] + m.d[0] * b, y2 = m.p0[1] + m.d[1] * b;
        groep.push(`<line class="plan-muur" x1="${R(x1)}" y1="${R(y1)}" x2="${R(x2)}" y2="${R(y2)}"/>`);
      });

      /* Openingen: deur (kraan + slag) of raam (kozijn) */
      open.forEach((o, i) => {
        const isDeur = String(o.naam || "").toLowerCase().indexOf("deur") === 0;
        const bw = o.tekenBreedte * schaal;
        const mid = (o.start + o.tekenBreedte / 2) * schaal;
        const s0 = mid - bw / 2, s1 = mid + bw / 2;
        const a = [m.p0[0] + m.d[0] * s0, m.p0[1] + m.d[1] * s0];
        const b = [m.p0[0] + m.d[0] * s1, m.p0[1] + m.d[1] * s1];

        openingGroep.push(`<g data-fokus="opening_sleep_${o._index}" data-plan-drag="opening" data-opening-index="${o._index}" tabindex="0" role="button" aria-label="${esc(o.naam)} verplaatsen"><line class="sleep-opening-hit" x1="${R(a[0])}" y1="${R(a[1])}" x2="${R(b[0])}" y2="${R(b[1])}"/>`);
        if (isDeur) {
          const tip = [a[0] + m.n[0] * bw, a[1] + m.n[1] * bw];
          const aN = Math.atan2(m.n[1], m.n[0]);
          const aD = Math.atan2(m.d[1], m.d[0]);
          let diff = aD - aN;
          while (diff <= 0) diff += Math.PI * 2;
          const sweep = diff < Math.PI ? 1 : 0;
          openingGroep.push(`<path class="plan-deur" d="M ${R(a[0])} ${R(a[1])} L ${R(tip[0])} ${R(tip[1])}"/>`);
          openingGroep.push(`<path class="plan-slag" d="M ${R(tip[0])} ${R(tip[1])} A ${R(bw)} ${R(bw)} 0 0 ${sweep} ${R(b[0])} ${R(b[1])}"/>`);
        } else {
          openingGroep.push(`<line class="plan-raam" x1="${R(a[0])}" y1="${R(a[1])}" x2="${R(b[0])}" y2="${R(b[1])}"/>`);
          const nx = m.n[0] * 5, ny = m.n[1] * 5;
          openingGroep.push(`<line class="plan-raam" x1="${R(a[0] + nx)}" y1="${R(a[1] + ny)}" x2="${R(b[0] + nx)}" y2="${R(b[1] + ny)}"/>`);
        }
        openingGroep.push('</g>');
      });

      /* naam + oppervlakte binnen de ruimte */
      const buitenLabel = (opties.regels || []).length > 0;
      const labelAfstand = buitenLabel ? -28 : 26;
      const cx = m.p0[0] + m.d[0] * m.len / 2 + m.n[0] * labelAfstand;
      const cy = m.p0[1] + m.d[1] * m.len / 2 + m.n[1] * labelAfstand;
      const draai = (zijde === "west" || zijde === "oost");
      const labelTekst = m.label;
      const opp = label ? `${F(label.netto)} m²` : "";
      const werkInfo = buitenLabel ? "" : (werk || {})[zijde];
      /* bij gedraaide labels verschuift de tweede regel in de gedraaide richting */
      const x2 = draai ? cx + 14 : cx;
      const y2 = draai ? cy : cy + 15;
      groep.push(`<text class="plan-label" x="${R(cx)}" y="${R(cy)}"${draai ? ` transform="rotate(-90 ${R(cx)} ${R(cy)})"` : ""} text-anchor="middle">${esc(labelTekst)}</text>`);
      groep.push(`<text class="plan-opp" x="${R(x2)}" y="${R(y2)}"${draai ? ` transform="rotate(-90 ${R(x2)} ${R(y2)})"` : ""} text-anchor="middle">${esc(opp)}${werkInfo ? " · " + esc(werkInfo) : ""}</text>`);

      /* klikbaar bandje langs de wand (groot genoeg om aan te tikken) */
      const band = (zijde === "noord" || zijde === "zuid")
        ? { x: Math.min(rx, rx + w), y: zijde === "noord" ? ry : ry + h - KAP, w: w, h: KAP }
        : { x: zijde === "west" ? rx : rx + w - KAP, y: ry, w: KAP, h: h };

      /* klikbare groep */
      svg += `<g class="plan-wand" data-vlak="${zijde}" data-soort="muur" tabindex="0" role="button"
                   aria-label="${esc(m.label)}${opp ? ", " + opp : ""} — klik om werk toe te voegen">
                <rect class="plan-hit" x="${R(band.x)}" y="${R(band.y)}" width="${R(band.w)}" height="${R(band.h)}" rx="3"/>
                ${groep.join("")}
              </g>`;
      /* openingen staan buiten de wandgroep, maar tellen wel mee bij de muur */
      if (openingGroep.length) {
        svg += `<g class="plan-open" data-vlak="${zijde}" data-soort="muur" tabindex="0" role="button"
                     aria-label="Opening in ${esc(m.label)} — klik om werk toe te voegen">${openingGroep.join("")}</g>`;
      }
    });

    /* Maatvoering: lengte onder, breedte links */
    const dy = ry + h + ((opties.regels || []).length ? 70 : 46);
    svg += `<g class="plan-maat">
      <line x1="${R(rx)}" y1="${R(dy)}" x2="${R(rx + w)}" y2="${R(dy)}"/>
      <line x1="${R(rx)}" y1="${R(dy - 6)}" x2="${R(rx)}" y2="${R(dy + 6)}"/>
      <line x1="${R(rx + w)}" y1="${R(dy - 6)}" x2="${R(rx + w)}" y2="${R(dy + 6)}"/>
      <text x="${R(rx + w / 2)}" y="${R(dy - 10)}" text-anchor="middle">${F(L)} m</text>
    </g>`;
    const dx = rx - 46;
    svg += `<g class="plan-maat">
      <line x1="${R(dx)}" y1="${R(ry)}" x2="${R(dx)}" y2="${R(ry + h)}"/>
      <line x1="${R(dx - 6)}" y1="${R(ry)}" x2="${R(dx + 6)}" y2="${R(ry)}"/>
      <line x1="${R(dx - 6)}" y1="${R(ry + h)}" x2="${R(dx + 6)}" y2="${R(ry + h)}"/>
      <text x="${R(dx - 8)}" y="${R(ry + h / 2)}" text-anchor="middle" transform="rotate(-90 ${R(dx - 8)} ${R(ry + h / 2)})">${F(B)} m</text>
    </g>`;

    /* Hoogte in de hoek */
    svg += `<text class="plan-hoogte" x="${R(rx + w)}" y="${R(ry + h + ((opties.regels || []).length ? 83 : 70))}" text-anchor="end">hoogte ${F(H)} m</text>`;

    const projecteer = (x,y,z) => [rx+x*schaal, ry+y*schaal];
    svg += werkOverlay(ruimte, opties, projecteer);
    svg += vlakMarkeringen(ruimte, opties, projecteer);
    return `<svg class="plan" viewBox="${zoomBox(W,HP,opties)}" role="group" aria-label="Plattegrond van ${esc(ruimte.naam || "ruimte")}">${svg}</svg>`;
  }

  /* ==================================================================
     3D — aaxonometrische weergave
     ================================================================== */
  function isometrie(ruimte, vlakken, werk = {}, opties = {}) {
    if(complex(ruimte))return vormTekening(ruimte,vlakken,werk,opties,'isometrie');
    const maat = v => Math.max(0.2, Number.parseFloat(v) || 0.2);
    const L = maat(ruimte.lengte), B = maat(ruimte.breedte), H = maat(ruimte.hoogte);
    const hoek = ((Math.trunc(opties.hoek || 0) % 4) + 4) % 4;
    const maten = opties.maten !== false;
    const {P,W,HP} = projectie(ruimte, hoek);
    const lijn = (a, b, cls) => `<line class="${cls}" x1="${R(a[0])}" y1="${R(a[1])}" x2="${R(b[0])}" y2="${R(b[1])}"/>`;
    const poly = (ps, cls) => `<polygon class="${cls}" points="${punten(ps)}"/>`;
    const tekst = (p, inhoud, cls) => `<text class="${cls}" x="${R(p[0])}" y="${R(p[1])}" text-anchor="middle">${esc(inhoud)}</text>`;
    const vm = vlakMap(vlakken), per = openingenPerMuur(ruimte);
    const gid = uniq();
    let svg = `<defs><linearGradient id="${gid}-vloer" x2="0" y2="1"><stop class="iso-stop-a"/><stop offset="1" class="iso-stop-b"/></linearGradient></defs>`;
    svg += `<polygon class="iso-vloer" style="fill:url(#${gid}-vloer)" points="${punten([P(0,0), P(L,0), P(L,B), P(0,B)])}"/>`;
    // Rustig meterraster; limiet voorkomt duizenden lijnen bij grote projecten.
    const stap = Math.max(0.5, Math.ceil(Math.max(L, B) / 24));
    for (let x = stap; x < L; x += stap) svg += lijn(P(x,0), P(x,B), 'iso-raster');
    for (let y = stap; y < B; y += stap) svg += lijn(P(0,y), P(L,y), 'iso-raster');
    const zichtbaar = [['noord', 'west'], ['noord', 'oost'], ['zuid', 'oost'], ['zuid', 'west']][hoek];
    const muren = {
      noord: {len: L, p: (t,z) => P(t,0,z)}, zuid: {len: L, p: (t,z) => P(t,B,z)},
      west: {len: B, p: (t,z) => P(0,t,z)}, oost: {len: B, p: (t,z) => P(L,t,z)},
    };
    zichtbaar.forEach((zijde, idx) => {
      const m = muren[zijde], p = m.p;
      const open = openingLayout(per[zijde], m.len).filter(o => o.tekenBreedte > 0);
      const naam = vm[zijde]?.naam || `Wand ${zijde}`;
      const opp = vm[zijde] ? `${F(vm[zijde].netto)} m²` : '';
      const buiten = [p(0,0), p(m.len,0), p(m.len,H), p(0,H)];
      // Echte uitsparingen met SVG-masker, ook als openingen elkaar overlappen.
      const gaten = open.map(o => {
        const onder = Math.min(H, Math.max(0, parseFloat(o.borstwering) || 0));
        const boven = Math.min(H, onder + Math.max(0, parseFloat(o.hoogte) || 0));
        return {o, onder, boven, ps: [p(o.start,onder), p(o.start+o.tekenBreedte,onder), p(o.start+o.tekenBreedte,boven), p(o.start,boven)]};
      });
      svg += `<defs><mask id="${gid}-${zijde}" maskUnits="userSpaceOnUse" x="0" y="0" width="780" height="560"><rect width="780" height="560" fill="white"/>${gaten.map(g => `<polygon fill="black" points="${punten(g.ps)}"/>`).join('')}</mask></defs>`;
      svg += `<g data-fokus="iso_${zijde}" class="iso-wand plan-wand${werk[zijde] ? ' heeft-werk' : ''}" data-vlak="${zijde}" data-soort="muur" role="button" tabindex="0" aria-label="${esc(naam)} ${esc(opp)} — werk toevoegen">`;
      svg += `<title>${esc(naam)} · ${esc(opp)}${werk[zijde] ? ' · ' + esc(werk[zijde]) : ''}</title>`;
      svg += `<polygon class="iso-muur iso-tint-${idx}" mask="url(#${gid}-${zijde})" points="${punten(buiten)}"/>`;
      svg += lijn(p(0,H), p(m.len,H), 'iso-bovenrand');
      gaten.forEach(({o, onder, boven, ps}) => {
        const deur = /^deur/i.test(o.naam || '');
        svg += `<g data-fokus="opening_sleep_${o._index}" data-plan-drag="opening" data-opening-index="${o._index}" tabindex="0" role="button" aria-label="${esc(o.naam)} verplaatsen">`;
        svg += poly(ps, `iso-opening ${deur ? 'iso-deurblad' : 'iso-glas'}`);
        if (!deur) {
          const mid = o.start + o.tekenBreedte / 2;
          svg += lijn(p(mid,onder), p(mid,boven), 'iso-kozijn');
          svg += lijn(p(o.start,(onder+boven)/2), p(o.start+o.tekenBreedte,(onder+boven)/2), 'iso-kozijn');
        } else {
          const hand = p(o.start + o.tekenBreedte * 0.8, onder + (boven-onder)*0.48);
          svg += `<circle class="iso-klink" cx="${R(hand[0])}" cy="${R(hand[1])}" r="2.5"/>`;
        }
        svg += '</g>';
      });
      // Los label boven de bovenrand blijft leesbaar bij grote ramen/deuren.
      const lp = p(m.len / 2, H);
      svg += tekst([lp[0], lp[1]-29], naam, 'iso-label');
      svg += tekst([lp[0], lp[1]-13], opp + (werk[zijde] ? ' · ' + werk[zijde] : ''), 'iso-opp');
      svg += '</g>';
    });
    // Voorste vloerranden dragen de maten, dus geen maatlabels onder een muur.
    if (maten) {
      const xVoor = [B,B,0,0][hoek], yVoor = [L,0,0,L][hoek];
      const a = P(0,xVoor), b = P(L,xVoor), c = P(yVoor,0), d = P(yVoor,B);
      svg += lijn(a,b,'iso-maatlijn') + lijn(c,d,'iso-maatlijn');
      svg += tekst([(a[0]+b[0])/2,(a[1]+b[1])/2+23], `${F(L)} m`, 'iso-maat');
      svg += tekst([(c[0]+d[0])/2,(c[1]+d[1])/2+23], `${F(B)} m`, 'iso-maat');
      svg += tekst([W/2, HP-17], `Hoogte ${F(H)} m · Vloer ${F(L*B)} m² · Volume ${F(L*B*H)} m³`, 'iso-samenvatting');
    }
    svg += werkOverlay(ruimte, opties, P, true);
    svg += vlakMarkeringen(ruimte, opties, P, zichtbaar);
    return `<svg class="plan iso" viewBox="${zoomBox(W,HP,opties)}" role="group" aria-label="3D-ruimte ${esc(ruimte.naam || '')}. Klik op een wand om werk toe te voegen.">${svg}</svg>`;
  }

  /* Orthographic interior elevations share their exact projection with dragging. */
  function aanzichtProjectie(ruimte, vlak = 'noord') {
    if(complex(ruimte))return vormAanzicht(ruimte,vlak);
    if (![...ZIJDEN,'vloer','plafond'].includes(vlak)) vlak='noord';
    const L=Math.max(.2,get(ruimte.lengte,.2)), B=Math.max(.2,get(ruimte.breedte,.2)), H=Math.max(.2,get(ruimte.hoogte,.2));
    const horizontaal=['vloer','plafond'].includes(vlak);
    const breedte=['west','oost'].includes(vlak) ? B : L, hoogte=horizontaal ? B : H;
    const schaal=Math.min(600/breedte,350/hoogte), links=(780-breedte*schaal)/2, boven=104+(350-hoogte*schaal)/2;
    const teken = ['zuid','west'].includes(vlak) ? -1 : 1;
    const P=(x,y,z=0)=>{
      const u=['west','oost'].includes(vlak) ? y : x;
      return [links+(teken<0 ? breedte-u : u)*schaal,boven+(horizontaal ? y : hoogte-z)*schaal];
    };
    return {P,vlak,breedte,hoogte,schaal,links,boven,teken,plane:horizontaal ? 'xy' : ['west','oost'].includes(vlak) ? 'yz' : 'xz'};
  }
  function aanzicht(ruimte, vlakken, werk, opties={}) {
    if(complex(ruimte))return vormTekening(ruimte,vlakken,werk,opties,'aanzicht');
    const g=aanzichtProjectie(ruimte,opties.vlak), {P,vlak,breedte,hoogte,schaal,links,boven}=g;
    const naam={noord:'Wand noord',oost:'Wand oost',zuid:'Wand zuid',west:'Wand west',vloer:'Vloer',plafond:'Plafond'}[vlak];
    const gekozen={...opties,regels:(opties.regels || []).filter(r=>r.oppervlak===vlak)};
    const w=breedte*schaal,h=hoogte*schaal;
    const horizontaal=['vloer','plafond'].includes(vlak);
    let svg=`<text x="390" y="32" class="aanzicht-titel" text-anchor="middle">${naam}</text><text x="390" y="55" class="aanzicht-sub" text-anchor="middle">${horizontaal ? 'Vlakke projectie · noord boven' : 'Recht van binnenuit bekeken'} · ${F(breedte)} × ${F(hoogte)} m</text>`;
    svg+=`<rect class="aanzicht-papier" x="${R(links)}" y="${R(boven)}" width="${R(w)}" height="${R(h)}"/>`;
    // Bounded density: even very large rooms never generate an unbounded grid.
    const stap=Math.max(.5,Math.ceil(Math.max(breedte,hoogte)/20*2)/2);
    for(let u=stap;u<breedte;u+=stap) svg+=`<path class="aanzicht-raster" d="M${R(links+u*schaal)} ${R(boven)}v${R(h)}"/>`;
    for(let v=stap;v<hoogte;v+=stap) svg+=`<path class="aanzicht-raster" d="M${R(links)} ${R(boven+v*schaal)}h${R(w)}"/>`;
    if(!horizontaal) (ruimte.openingen || []).forEach((o,index)=>{
      if(o.muur!==vlak)return;
      const a=openingGeometrie(ruimte,index),b=[...a.a];
      if(['west','oost'].includes(vlak))b[1]+=a.breedte;else b[0]+=a.breedte;
      const onder=Math.min(a.H,Math.max(0,get(o.borstwering))),top=Math.min(a.H,onder+a.hoogte);
      const puntenOpening=[P(a.a[0],a.a[1],onder),P(b[0],b[1],onder),P(b[0],b[1],top),P(a.a[0],a.a[1],top)];
      svg+=`<g data-fokus="opening_sleep_${index}" data-plan-drag="opening" data-opening-index="${index}" tabindex="0" role="button" aria-label="${esc(o.naam)} verplaatsen"><polygon class="aanzicht-opening ${/^deur/i.test(o.naam || '') ? 'deur' : 'raam'}" points="${punten(puntenOpening)}"/><title>${esc(o.naam)} · ${F(a.breedte)} × ${F(a.hoogte)} m</title></g>`;
    });
    svg+=`<path class="aanzicht-kader" d="M${R(links)} ${R(boven)}h${R(w)}v${R(h)}h${R(-w)}Z"/>`;
    svg+=werkOverlay(ruimte,gekozen,P)+vlakMarkeringen(ruimte,gekozen,P);
    svg+=`<path class="aanzicht-maatlijn" d="M${R(links)} ${R(boven+h+16)}v12m0 -6h${R(w)}m0 -6v12M${R(links-16)} ${R(boven)}h-12m6 0v${R(h)}m-6 0h12"/><text class="aanzicht-maat" text-anchor="middle" x="390" y="${R(boven+h+46)}">${F(breedte)} m</text><text class="aanzicht-maat" text-anchor="middle" transform="translate(${R(links-37)} ${R(boven+h/2)}) rotate(-90)">${F(hoogte)} m</text>`;
    const richtingen={noord:['West','Oost'],zuid:['Oost','West'],west:['Zuid','Noord'],oost:['Noord','Zuid'],vloer:['West','Oost'],plafond:['West','Oost']}[vlak];
    svg+=`<text class="aanzicht-sub" x="${R(links)}" y="${R(boven-14)}">${richtingen[0]}</text><text class="aanzicht-sub" text-anchor="end" x="${R(links+w)}" y="${R(boven-14)}">${richtingen[1]}</text><text class="aanzicht-sub" x="390" y="530" text-anchor="middle">Raster ${F(stap)} m · ${horizontaal ? 'X / Y' : 'hoogte vanaf vloer'} · alleen werken op dit vlak</text>`;
    return `<svg class="plan aanzicht" viewBox="${zoomBox(780,550,opties)}" role="group" aria-label="${naam}, vlakaanzicht van ${esc(ruimte.naam)}">${svg}</svg>`;
  }

  window.BouwPlan = { traceLengte, plattegrond, isometrie, laag, werkGeometrie, tint, projectie, planProjectie, openingGeometrie, aanzichtProjectie, aanzicht };
})();
