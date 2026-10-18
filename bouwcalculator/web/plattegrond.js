/* ==========================================================
   PLATTEGROND — visuele weergave van een ruimte.

   Twee weergaven, beide als zuiver SVG (scherp op elk scherm,
   printbaar en klikbaar):
     • plattegrond() — bovenaanzicht met maten, deuren en ramen
     • isometrie()   — aaxonometrische 3D-weergave van de ruimte

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

  /* Openingen per muur verzamelen. */
  function openingenPerMuur(ruimte) {
    const per = { noord: [], zuid: [], oost: [], west: [] };
    (ruimte.openingen || []).forEach((o) => {
      if (per[o.muur]) per[o.muur].push(o);
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

  /* ==================================================================
     2D — bovenaanzicht
     ================================================================== */
  function plattegrond(ruimte, vlakken, werk) {
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
      });

      /* naam + oppervlakte binnen de ruimte */
      const cx = m.p0[0] + m.d[0] * m.len / 2 + m.n[0] * 26;
      const cy = m.p0[1] + m.d[1] * m.len / 2 + m.n[1] * 26;
      const draai = (zijde === "west" || zijde === "oost");
      const labelTekst = m.label;
      const opp = label ? `${F(label.netto)} m²` : "";
      const werkInfo = (werk || {})[zijde];
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
    const dy = ry + h + 46;
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
    svg += `<text class="plan-hoogte" x="${R(rx + w)}" y="${R(ry + h + 70)}" text-anchor="end">hoogte ${F(H)} m</text>`;

    return `<svg class="plan" viewBox="0 0 ${W} ${HP}" role="img" aria-label="Plattegrond van ${esc(ruimte.naam || "ruimte")}">${svg}</svg>`;
  }

  /* ==================================================================
     3D — aaxonometrische weergave
     ================================================================== */
  function isometrie(ruimte, vlakken, werk = {}, opties = {}) {
    const maat = v => Math.max(0.2, Number.parseFloat(v) || 0.2);
    const L = maat(ruimte.lengte), B = maat(ruimte.breedte), H = maat(ruimte.hoogte);
    const hoek = ((Math.trunc(opties.hoek || 0) % 4) + 4) % 4;
    const zoom = Math.max(0.75, Math.min(1.6, Number(opties.zoom) || 1));
    const maten = opties.maten !== false;
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
        svg += poly(ps, `iso-opening ${deur ? 'iso-deurblad' : 'iso-glas'}`);
        if (!deur) {
          const mid = o.start + o.tekenBreedte / 2;
          svg += lijn(p(mid,onder), p(mid,boven), 'iso-kozijn');
          svg += lijn(p(o.start,(onder+boven)/2), p(o.start+o.tekenBreedte,(onder+boven)/2), 'iso-kozijn');
        } else {
          const hand = p(o.start + o.tekenBreedte * 0.8, onder + (boven-onder)*0.48);
          svg += `<circle class="iso-klink" cx="${R(hand[0])}" cy="${R(hand[1])}" r="2.5"/>`;
        }
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
    const vw = W/zoom, vh = HP/zoom;
    return `<svg class="plan iso" viewBox="${R((W-vw)/2)} ${R((HP-vh)/2)} ${R(vw)} ${R(vh)}" role="group" aria-label="3D-ruimte ${esc(ruimte.naam || '')}. Klik op een wand om werk toe te voegen.">${svg}</svg>`;
  }

  window.BouwPlan = { plattegrond, isometrie };
})();
