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
      const open = openingen[zijde] || [];
      /* posities van de openingen (gelijk verdeeld, want de positie
         langs de muur is niet vastgelegd) */
      const stukken = [];
      let vorig = 0;
      open.forEach((o, i) => {
        const bw = Math.min(parseFloat(o.breedte) || 0.9, m.len * 0.6) * schaal;
        const mid = m.len * ((i + 0.5) / open.length);
        const s0 = Math.max(0, mid - bw / 2);
        const s1 = Math.min(m.len, mid + bw / 2);
        if (s0 > vorig) stukken.push([vorig, s0]);
        stukken.push([s0, s1]);
        vorig = s1;
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
        const bw = Math.min(parseFloat(o.breedte) || 0.9, m.len * 0.6) * schaal;
        const mid = m.len * ((i + 0.5) / open.length);
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
  function isometrie(ruimte, vlakken, werk) {
    const L = Math.max(0.2, parseFloat(ruimte.lengte) || 0.2);
    const B = Math.max(0.2, parseFloat(ruimte.breedte) || 0.2);
    const H = Math.max(0.2, parseFloat(ruimte.hoogte) || 0.2);

    const W = 780, HP = 560;
    const K = Math.cos(Math.PI / 6);
    const S = Math.sin(Math.PI / 6);

    /* Projectie: x' = ox + (x - y) * K * kx,  y' = oy + (x + y) * S * kx - z * kz
       De benodigde breedte is (L + B) * K * kx en de hoogte
       H * kz + (L + B) * S * kx. Beide moeten binnen het beeld passen. */
    const marge = 54;
    const kzFactor = 0.9;
    const kx = Math.min(
      (W - 2 * marge) / ((L + B) * K),
      (HP - 2 * marge) / (H * kzFactor + (L + B) * S),
    );
    const kz = kx * kzFactor;
    const spanX = (L + B) * K * kx;
    const spanY = H * kz + (L + B) * S * kx;
    const ox = (W - spanX) / 2 + B * K * kx;
    const oy = (HP - spanY) / 2 + H * kz;

    const P = (x, y, z) => [ox + (x - y) * K * kx, oy + (x + y) * S * kx - z * kz];

    const vlakkenMap = vlakMap(vlakken);
    const openingen = openingenPerMuur(ruimte);

    const gid = uniq();
    let svg = `<defs>
      <linearGradient id="${gid}-vloer" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" class="iso-stop-a"/><stop offset="1" class="iso-stop-b"/>
      </linearGradient>
      <linearGradient id="${gid}-muur" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" class="iso-stop-m"/><stop offset="1" class="iso-stop-b"/>
      </linearGradient>
    </defs>`;

    /* Vloer */
    const vA = P(0, 0, 0), vB = P(L, 0, 0), vC = P(L, B, 0), vD = P(0, B, 0);
    svg += `<polygon class="iso-vloer" style="fill:url(#${gid}-vloer)" points="${punten([vA, vB, vC, vD])}"/>`;

    /* Plafond vervangen door een nette bovenrand (koffer uitsnede) */
    const pA = P(0, 0, H), pB = P(L, 0, H), pC = P(L, B, H), pD = P(0, B, H);
    void pA; void pB; void pC; void pD;

    /* Muur noord (y = 0) en muur west (x = 0) */
    const muren = [
      { zijde: "noord", a: [0, 0], b: [L, 0], as: "x" },
      { zijde: "west", a: [0, 0], b: [0, B], as: "y" },
    ];

    muren.forEach((m) => {
      const open = openingen[m.zijde] || [];
      const a0 = P(m.a[0], m.a[1], 0), b0 = P(m.b[0], m.b[1], 0);
      const a1 = P(m.a[0], m.a[1], H), b1 = P(m.b[0], m.b[1], H);
      svg += `<polygon class="iso-muur" data-zijde="${m.zijde}" style="fill:url(#${gid}-muur)" points="${punten([a0, b0, b1, a1])}"/>`;
      /* bovenrand van de muur */
      svg += `<line class="iso-bovenrand" x1="${R(a1[0])}" y1="${R(a1[1])}" x2="${R(b1[0])}" y2="${R(b1[1])}"/>`;

      /* Openingen als 'gat' in de muur */
      const muurLengte = m.as === "x" ? L : B;
      open.forEach((o, i) => {
        const bw = Math.min(parseFloat(o.breedte) || 0.9, muurLengte * 0.6);
        const mid = muurLengte * ((i + 0.5) / open.length);
        const s0 = mid - bw / 2, s1 = mid + bw / 2;
        const oh = Math.min(parseFloat(o.hoogte) || 2.1, H);
        const isDeur = String(o.naam || "").toLowerCase().indexOf("deur") === 0;
        const punt = (t, z) => (m.as === "x" ? P(t, 0, z) : P(0, t, z));
        const gat = [punt(s0, 0), punt(s1, 0), punt(s1, oh), punt(s0, oh)];
        svg += `<polygon class="iso-opening" points="${punten(gat)}"/>`;
        if (isDeur) {
          const deurTip = punt(s0, 0);
          const zwaai = punt(s0 + bw * 0.9, 0);
          svg += `<line class="iso-deur" x1="${R(deurTip[0])}" y1="${R(deurTip[1])}" x2="${R(zwaai[0])}" y2="${R(zwaai[1])}"/>`;
        }
      });

      /* naam + oppervlakte */
      const label = vlakkenMap[m.zijde];
      if (label) {
        const mid = [m.as === "x" ? L / 2 : 0, m.as === "x" ? 0 : B / 2];
        const lp = P(mid[0], mid[1], H * 0.45);
        const werkInfo = (werk || {})[m.zijde];
        svg += `<text class="iso-label" x="${R(lp[0])}" y="${R(lp[1])}" text-anchor="middle">${esc(label.naam)}</text>`;
        svg += `<text class="iso-opp" x="${R(lp[0])}" y="${R(lp[1] + 16)}" text-anchor="middle">${F(label.netto)} m²${werkInfo ? " · " + esc(werkInfo) : ""}</text>`;
      }
    });

    /* Maten langs de vloerranden */
    const m1 = P(L / 2, 0, 0), m2 = P(L / 2, B, 0);
    svg += `<text class="iso-maat" x="${R(m1[0] + 8)}" y="${R(m1[1] + 16)}" text-anchor="middle">${F(L)} m</text>`;
    svg += `<text class="iso-maat" x="${R(m2[0] - 8)}" y="${R(m2[1] + 16)}" text-anchor="middle">${F(B)} m</text>`;
    const hp = P(0, 0, H);
    svg += `<text class="iso-maat" x="${R(hp[0] - 26)}" y="${R(hp[1] + 4)}" text-anchor="middle" transform="rotate(-90 ${R(hp[0] - 26)} ${R(hp[1] + 4)})">${F(H)} m</text>`;

    return `<svg class="plan iso" viewBox="0 0 ${W} ${HP}" role="img" aria-label="Ruimte ${esc(ruimte.naam || "")} in 3D">${svg}</svg>`;
  }

  window.BouwPlan = { plattegrond, isometrie };
})();
