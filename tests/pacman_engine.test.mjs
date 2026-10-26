/* ============================================================
   Tests voor de Pac-Man-spelkern (draait met `node --test`).
   Dezelfde code draait in de browser en hier — geen DOM nodig.
   ============================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const P = require("../web/pacman/engine.js");

const DT = 1 / 60;

function nieuwSpel() {
  P.PacmanSpel.hoogsteScore = 0;
  const spel = new P.PacmanSpel({ highscore: 0 });
  spel.nieuwSpel();
  spel.pauzeTimer = 0;
  spel.update(DT);
  return spel;
}

function stap(spel, seconden) {
  const stappen = Math.round(seconden / DT);
  for (let i = 0; i < stappen; i += 1) spel.update(DT);
}

function zetPac(spel, c, r, richting = "links") {
  spel.pac.c = c;
  spel.pac.r = r;
  spel.pac.naar = null;
  spel.pac.t = 0;
  spel.pac.richting = richting;
  spel.pac.gevraagd = richting;
  spel.pac.opgegeten = false;
}

/** Nagebootst 2D-canvas dat alle oproepen in een log vastlegt. */
function maakCtx(log = []) {
  const ctx = new Proxy({}, {
    get(doel, eigenschap) {
      if (typeof eigenschap === "symbol") return undefined;
      if (eigenschap in doel) return doel[eigenschap];
      return (...args) => {
        log.push([eigenschap, ...args]);
        if (eigenschap === "measureText") return { width: 10 };
        return args;
      };
    },
    set(doel, eigenschap, waarde) {
      doel[eigenschap] = waarde;
      return true;
    },
  });
  return ctx;
}

function isMuurTegel(spel, c, r) {
  const cc = ((Math.round(c) % P.KOLOMMEN) + P.KOLOMMEN) % P.KOLOMMEN;
  const rr = Math.round(r);
  if (rr < 0 || rr >= P.RIJEN) return true;
  return spel.doolhof[rr][cc] === "#";
}

/* ---------------- het doolhof ---------------- */

test("doolhof is 31 × 28 en links-rechts symmetrisch", () => {
  assert.equal(P.DOOLHOF.length, P.RIJEN);
  assert.equal(P.RIJEN, 31);
  assert.equal(P.KOLOMMEN, 28);
  for (const rij of P.DOOLHOF) {
    assert.equal(rij.length, P.KOLOMMEN);
    assert.equal(rij, [...rij].reverse().join(""), `rij is niet symmetrisch: ${rij}`);
  }
});

test("doolhof bevat 244 punten en 4 energizers", () => {
  const teken = P.DOOLHOF.join("");
  assert.equal((teken.match(/\./g) || []).length, 240);
  assert.equal((teken.match(/o/g) || []).length, 4);
  const spel = nieuwSpel();
  assert.equal(spel.pellets.length, 244);
  assert.equal(spel.pellets.filter((p) => p.groot).length, 4);
});

test("Pac-Man staat vrij en het hok is voor hem dicht", () => {
  const spel = nieuwSpel();
  assert.equal(isMuurTegel(spel, P.PAC_START.c, P.PAC_START.r), false);
  assert.equal(P.isMuur(spel.doolhof, P.HOK.deur.c, P.HOK.deur.r, false), true);
  assert.equal(P.isMuur(spel.doolhof, P.HOK.deur.c, P.HOK.deur.r, true), false);
});

test("elke tegel is bereikbaar: Pac-Man kan overal komen (behalve het hok)", () => {
  const { DOOLHOF, KOLOMMEN, RIJEN } = P;
  const gezien = new Set([`${P.PAC_START.c},${P.PAC_START.r}`]);
  const wachtrij = [[P.PAC_START.c, P.PAC_START.r]];
  while (wachtrij.length) {
    const [c, r] = wachtrij.shift();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = ((c + dc) % KOLOMMEN + KOLOMMEN) % KOLOMMEN;
      const nr = r + dr;
      if (nr < 0 || nr >= RIJEN) continue;
      if (DOOLHOF[nr][nc] === "#" || DOOLHOF[nr][nc] === "-") continue;
      const sleutel = `${nc},${nr}`;
      if (gezien.has(sleutel)) continue;
      gezien.add(sleutel);
      wachtrij.push([nc, nr]);
    }
  }
  for (let r = 0; r < RIJEN; r += 1) {
    for (let c = 0; c < KOLOMMEN; c += 1) {
      const teken = DOOLHOF[r][c];
      if (teken === "." || teken === "o") {
        assert.ok(gezien.has(`${c},${r}`), `punt op ${c},${r} is onbereikbaar`);
      }
    }
  }
  // het hok zelf blijft ontoegankelijk
  for (let r = P.HOK.rijen[0]; r <= P.HOK.rijen[1]; r += 1) {
    for (let c = P.HOK.kolommen[0]; c <= P.HOK.kolommen[1]; c += 1) {
      assert.equal(gezien.has(`${c},${r}`), false, `Pac-Man kan het hok in op ${c},${r}`);
    }
  }
});

/* ---------------- beweging ---------------- */

test("Pac-Man loopt vloeiend over de tegels en stopt voor een muur", () => {
  const spel = nieuwSpel();
  zetPac(spel, 13, 23, "links");
  spel.stuur("links");
  const posities = [];
  for (let i = 0; i < 20; i += 1) {
    spel.update(DT);
    const p = spel.positie(spel.pac);
    posities.push(p.c);
    assert.equal(isMuurTegel(spel, p.c, p.r), false, "Pac-Man zit in een muur");
  }
  assert.ok(posities[19] < posities[0], "Pac-Man gaat niet vooruit");
});

test("Pac-Man kan de tunnel in en komt er aan de andere kant uit", () => {
  const spel = nieuwSpel();
  zetPac(spel, 27, P.TUNNEL_RIJ, "links");
  spel.stuur("rechts");
  stap(spel, 0.35);
  const p = spel.positie(spel.pac);
  assert.ok(p.c < 3, `verwacht aan de linkerkant van de tunnel, kreeg ${p.c}`);
  assert.equal(spel.pac.opgegeten, false);
});

test("spoken verlaten het hok en blijven binnen de muren", () => {
  const spel = nieuwSpel();
  spel._checkBotsingen = () => {};   // alleen de muren testen, niet de levens
  stap(spel, 10);
  for (const spook of spel.spoken) {
    assert.equal(spook.fase, "vrij", `${spook.naam} zit nog in het hok`);
  }
  for (let i = 0; i < 60 * 20; i += 1) {
    spel.update(DT);
    for (const spook of spel.spoken) {
      const p = spel.positie(spook);
      assert.equal(isMuurTegel(spel, p.c, p.r), false, `${spook.naam} zit in een muur`);
    }
  }
});

/* ---------------- energizers & spoken ---------------- */

test("een energizer maakt de spoken bang en eetbaar", () => {
  const spel = nieuwSpel();
  const energizer = spel.pellets.find((p) => p.groot);
  zetPac(spel, energizer.c + 1, energizer.r, "links");
  spel.stuur("links");
  stap(spel, 0.4);

  assert.equal(spel.pellets.some((p) => p.c === energizer.c && p.r === energizer.r), false);
  assert.ok(spel.punten >= P.PUNTEN.energizer);
  assert.equal(spel.status().bang, true);
  const buiten = spel.spoken.filter((s) => s.fase === "vrij");
  assert.ok(buiten.length > 0);
  assert.ok(buiten.every((s) => s.modus === "bang"));
});

test("een bang spook opeten levert punten op en stuurt de ogen naar huis", () => {
  const spel = nieuwSpel();
  const energizer = spel.pellets.find((p) => p.groot);
  zetPac(spel, energizer.c + 1, energizer.r, "links");
  spel.stuur("links");
  stap(spel, 0.4);

  const blinky = spel.spoken.find((s) => s.naam === "blinky");
  assert.equal(blinky.modus, "bang");
  const voor = spel.punten;

  const waar = spel.positie(blinky);
  zetPac(spel, waar.c, waar.r, "links");
  spel._checkBotsingen();

  assert.equal(blinky.modus, "ogen");
  assert.equal(spel.punten - voor, P.PUNTEN.spookStart);
  assert.equal(spel.levens, 3, "Pac-Man mag hier niet doodgaan");
});

test("de ogen keren terug naar het hok en komen er weer uit", () => {
  const spel = nieuwSpel();
  const blinky = spel.spoken.find((s) => s.naam === "blinky");
  blinky.modus = "ogen";
  spel._checkBotsingen = () => {};     // Pac-Man even niet eetbaar

  let binnenGeweest = false;
  for (let i = 0; i < 60 * 25; i += 1) {
    spel.update(DT);
    if (blinky.fase === "huis") binnenGeweest = true;
    if (binnenGeweest && blinky.fase === "vrij" && blinky.modus === "jacht") break;
  }
  assert.equal(binnenGeweest, true, "de ogen zijn nooit in het hok aangekomen");
  assert.equal(blinky.fase, "vrij", "het spook is niet opnieuw naar buiten gekomen");
});

/* ---------------- punten, levels, levens ---------------- */

test("na 70 punten verschijnt de kers en die is 100 punten waard", () => {
  const spel = nieuwSpel();
  for (const pellet of spel.pellets.slice(0, P.FRUIT_NA_PUNTEN)) spel._pakTegel(pellet.c, pellet.r);
  assert.ok(spel.fruit, "de kers verschijnt niet");
  const voor = spel.punten;
  zetPac(spel, spel.fruit.c, spel.fruit.r, "links");
  spel.update(DT);
  assert.equal(spel.punten - voor, P.PUNTEN.fruit);
  assert.equal(spel.fruit, null);
  assert.deepEqual(spel.flitsen.map((f) => f.tekst), [String(P.PUNTEN.fruit)]);
});

test("alle punten op? dan gaat het niveau omhoog", () => {
  const spel = nieuwSpel();
  spel.pellets = [{ c: 12, r: 23, groot: false }];
  spel.pelletsTotaal = 1;
  spel.pelletsOp = 0;
  zetPac(spel, 13, 23, "links");
  spel.stuur("links");

  let niveauUit = false;
  for (let i = 0; i < 60 * 3 && !niveauUit; i += 1) {
    spel.update(DT);
    if (spel.toestand === "niveau") niveauUit = true;
  }
  assert.equal(niveauUit, true, "het niveau werd niet voltooid");
  stap(spel, 2.5);
  assert.equal(spel.niveau, 2);
  assert.equal(spel.pellets.length, 244);
});

test("doodgaan kost een leven, daarna is het spel voorbij", () => {
  const spel = nieuwSpel();
  const blinky = spel.spoken.find((s) => s.naam === "blinky");
  blinky.modus = "jacht";
  zetPac(spel, blinky.c, blinky.r, "links");
  spel._checkBotsingen();
  assert.equal(spel.toestand, "dood");
  assert.equal(spel.levens, 2);
  assert.equal(spel.pac.opgegeten, true);

  stap(spel, 2.2);
  assert.equal(spel.toestand, "klaar");
  assert.equal(spel.pac.opgegeten, false, "Pac-Man is niet hersteld");

  spel.levens = 1;
  const inky = spel.spoken.find((s) => s.naam === "inky");
  inky.modus = "jacht";
  inky.fase = "vrij";
  zetPac(spel, inky.c, inky.r, "links");
  spel._checkBotsingen();
  stap(spel, 2.2);
  assert.equal(spel.toestand, "over");
  assert.equal(spel.levens, 0);
  assert.ok(spel.status().highscore >= spel.punten);
});

test("status bevat alles wat de console nodig heeft", () => {
  const spel = nieuwSpel();
  const status = spel.status();
  for (const veld of ["punten", "highscore", "niveau", "levens", "toestand",
    "melding", "pellets", "pelletsTotaal", "bang", "record"]) {
    assert.ok(Object.prototype.hasOwnProperty.call(status, veld), `veld ${veld} ontbreekt`);
  }
  assert.equal(status.pelletsTotaal, 244);
  assert.equal(status.levens, 3);
  assert.equal(status.record, false);
});

test("het spel is deterministisch bij dezelfde invoer", () => {
  const invoer = ["links", "omhoog", "rechts", "omlaag", "links", "links", "omhoog"];
  const speel = () => {
    const spel = nieuwSpel();
    for (let i = 0; i < 60 * 6; i += 1) {
      if (i % 20 === 0) spel.stuur(invoer[(i / 20) % invoer.length]);
      spel.update(DT);
    }
    return {
      status: spel.status(),
      pac: spel.positie(spel.pac),
      spoken: spel.spoken.map((s) => ({ ...s })),
    };
  };
  assert.deepEqual(speel(), speel());
});

test("pauzeren en hervatten werkt", () => {
  const spel = nieuwSpel();
  stap(spel, 0.5);
  spel.pauzeer();
  assert.equal(spel.toestand, "gepauzeerd");
  const voor = spel.positie(spel.pac);
  stap(spel, 1);
  assert.deepEqual(spel.positie(spel.pac), voor);
  spel.pauzeer();
  assert.equal(spel.toestand, "bezig");
});

test("de tekening werkt op een nagebootst canvas (geen DOM nodig)", () => {
  const log = [];
  const ctx = maakCtx(log);
  const spel = nieuwSpel();
  P.tekenSpel(ctx, spel, { schaal: 2, toonRooster: true });
  assert.ok(log.length > 100, "er is bijna niets getekend");
  assert.ok(log.some(([naam]) => naam === "arc"), "Pac-Man is niet getekend");
  // zonder OffscreenCanvas tekent hij rechtstreeks, zonder kopieerstap
  assert.equal(log.some(([naam]) => naam === "drawImage"), false);
});

test("de muurlaag wordt één keer getekend en daarna als beeld gekopieerd", () => {
  const origineel = globalThis.OffscreenCanvas;
  let gemaakt = 0;
  globalThis.OffscreenCanvas = class {
    constructor(breedte, hoogte) {
      this.width = breedte;
      this.height = hoogte;
      gemaakt += 1;
    }

    getContext() {
      return maakCtx();
    }
  };
  try {
    const spel = nieuwSpel();
    const log = [];
    const ctx = maakCtx(log);

    // schaal 3 is nog niet gecacht: de laag wordt opgebouwd en gekopieerd
    P.tekenSpel(ctx, spel, { schaal: 3 });
    assert.equal(gemaakt, 1);
    assert.ok(log.some(([naam]) => naam === "drawImage"), "de muurlaag wordt niet gekopieerd");
    const aantalTekenOproepen = log.filter(([naam]) => naam === "fill" || naam === "arc").length;

    // tweede frame: dezelfde laag, dus geen nieuwe opbouw
    const log2 = [];
    P.tekenSpel(maakCtx(log2), spel, { schaal: 3 });
    assert.equal(gemaakt, 1, "de muurlaag wordt opnieuw opgebouwd");
    assert.ok(log2.some(([naam]) => naam === "drawImage"));
    assert.ok(log2.filter(([naam]) => naam === "fill").length < aantalTekenOproepen,
      "de muren worden nog steeds elke frame opnieuw getekend");

    // een gewijzigd doolhof maakt de cache ongeldig
    const eigen = [...P.DOOLHOF];
    eigen[1] = "#" + "o".repeat(26) + "#";
    P.tekenSpel(maakCtx(), new P.PacmanSpel({ doolhof: eigen }), { schaal: 3 });
    assert.equal(gemaakt, 2, "een ander doolhof gebruikt de oude cache");
  } finally {
    globalThis.OffscreenCanvas = origineel;
  }
});
