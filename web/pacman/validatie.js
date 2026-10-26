/* ============================================================
   PAC-MAN — keuring van een doolhof
   Eén bron van waarheid voor de regels: de editor gebruikt hem om
   te waarschuwen, de console om een opgeslagen level te weigeren
   en de tests om de klassieke indeling te bewijzen.
   ============================================================ */

(function (root) {
  "use strict";

  const mazen = typeof module !== "undefined" && module.exports
    ? require("./maze.js")
    : root.PacmanDoolhof;

  const { KOLOMMEN, RIJEN, PAC_START, HOK } = mazen;
  const TOEGESTANE_TEKENS = new Set(["#", ".", "o", " ", "-"]);

  function valideerVorm(rijen) {
    if (!Array.isArray(rijen) || rijen.length !== RIJEN) {
      return {
        ok: false,
        fout: `Het doolhof moet precies ${RIJEN} rijen hebben (nu ${rijen ? rijen.length : 0}).`,
      };
    }
    for (let r = 0; r < RIJEN; r += 1) {
      const rij = rijen[r];
      if (typeof rij !== "string" || rij.length !== KOLOMMEN) {
        return { ok: false, fout: `Rij ${r + 1} moet precies ${KOLOMMEN} tekens hebben.` };
      }
      for (const teken of rij) {
        if (!TOEGESTANE_TEKENS.has(teken)) {
          return { ok: false, fout: `Onbekend teken "${teken}" in rij ${r + 1}.` };
        }
      }
    }
    return { ok: true };
  }

  function tel(rijen) {
    let punten = 0;
    let energizers = 0;
    let muren = 0;
    for (let r = 0; r < RIJEN; r += 1) {
      for (let c = 0; c < KOLOMMEN; c += 1) {
        const teken = rijen[r][c];
        if (teken === ".") punten += 1;
        else if (teken === "o") { punten += 1; energizers += 1; } else if (teken === "#") muren += 1;
      }
    }
    return { punten, energizers, muren };
  }

  /** Alles wat Pac-Man (of een spook) kan bereiken, met tunnelsprong. */
  function bereikbaar(rijen, van, deurOpen = false) {
    const gezien = new Set([`${van.c},${van.r}`]);
    const wachtrij = [[van.c, van.r]];
    const vrij = (c, r) => {
      if (r < 0 || r >= RIJEN) return false;
      const teken = rijen[r][((c % KOLOMMEN) + KOLOMMEN) % KOLOMMEN];
      if (teken === "#") return false;
      if (teken === "-") return deurOpen;
      return true;
    };
    while (wachtrij.length) {
      const [c, r] = wachtrij.shift();
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = ((c + dc) % KOLOMMEN + KOLOMMEN) % KOLOMMEN;
        const nr = r + dr;
        if (!vrij(nc, nr)) continue;
        const sleutel = `${nc},${nr}`;
        if (gezien.has(sleutel)) continue;
        gezien.add(sleutel);
        wachtrij.push([nc, nr]);
      }
    }
    return gezien;
  }

  function valideer(rijen) {
    const fouten = [];
    const waarschuwingen = [];

    const vorm = valideerVorm(rijen);
    if (!vorm.ok) return { ok: false, fouten: [vorm.fout], waarschuwingen, telling: null };

    if (rijen[PAC_START.r][PAC_START.c] === "#" || rijen[PAC_START.r][PAC_START.c] === "-") {
      fouten.push(`Pac-Man start op rij ${PAC_START.r + 1}, kolom ${PAC_START.c + 1} — daar staat een muur of deur.`);
    }

    if (rijen[HOK.deur.r][HOK.deur.c] !== "-") {
      fouten.push(`De hokdeur moet op rij ${HOK.deur.r + 1}, kolom ${HOK.deur.c + 1} staan.`);
    }
    if (rijen[HOK.uitgang.r][HOK.uitgang.c] === "#") {
      fouten.push("De uitgang boven de hokdeur is dichtgemetseld.");
    }

    let hokDicht = false;
    let puntInHok = false;
    for (let r = HOK.rijen[0]; r <= HOK.rijen[1]; r += 1) {
      for (let c = HOK.kolommen[0]; c <= HOK.kolommen[1]; c += 1) {
        const teken = rijen[r][c];
        if (teken === "#") hokDicht = true;
        if (teken === "." || teken === "o") puntInHok = true;
      }
    }
    if (hokDicht) fouten.push("Er staat een muur in het spokenhok.");
    if (puntInHok) fouten.push("Punten in het spokenhok kan Pac-Man nooit opeten.");

    const bereikPac = bereikbaar(rijen, PAC_START, false);
    const bereikSpook = bereikbaar(rijen, HOK.uitgang, true);

    let onbereikbaar = 0;
    for (let r = 0; r < RIJEN; r += 1) {
      for (let c = 0; c < KOLOMMEN; c += 1) {
        if (rijen[r][c] !== "." && rijen[r][c] !== "o") continue;
        if (!bereikPac.has(`${c},${r}`)) onbereikbaar += 1;
      }
    }
    if (onbereikbaar > 0) {
      fouten.push(`${onbereikbaar} punt(en) zijn onbereikbaar vanaf de startpositie.`);
    }

    if (!bereikSpook.has(`${PAC_START.c},${PAC_START.r}`)) {
      fouten.push("De spoken kunnen het hok niet uit naar het speelveld.");
    }

    const telling = tel(rijen);
    if (telling.punten < 40) {
      waarschuwingen.push(`Er liggen maar ${telling.punten} punten — een potje is zo voorbij.`);
    }
    if (telling.energizers === 0) {
      waarschuwingen.push("Geen energizers: de spoken blijven altijd jagen.");
    }

    return { ok: fouten.length === 0, fouten, waarschuwingen, telling };
  }

  const Validatie = { valideer, valideerVorm, bereikbaar, tel, TOEGESTANE_TEKENS };

  root.PacmanValidatie = Validatie;
  if (typeof module !== "undefined" && module.exports) module.exports = Validatie;
}(typeof globalThis !== "undefined" ? globalThis : this));
