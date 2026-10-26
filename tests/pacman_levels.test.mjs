/* ============================================================
   Tests voor de doolhofgenerator, de levelset en de moeilijkheids-
   graden. Elk gegenereerd doolhof moet door de keuring komen.
   ============================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const G = require("../web/pacman/generator.js");
const L = require("../web/pacman/levels.js");
const V = require("../web/pacman/validatie.js");
const M = require("../web/pacman/maze.js");
const P = require("../web/pacman/engine.js");

test("dezelfde seed geeft altijd hetzelfde doolhof", () => {
  assert.deepEqual(G.genereerRijen(7), G.genereerRijen(7));
  assert.notDeepEqual(G.genereerRijen(7), G.genereerRijen(8));
});

test("de generator levert voor elke seed een geldig doolhof", () => {
  for (let seed = 1; seed <= 40; seed += 1) {
    const rijen = G.genereerRijen(seed);
    const uitkomst = V.valideer(rijen);
    assert.equal(uitkomst.ok, true, `seed ${seed}: ${uitkomst.fouten.join(" ")}`);
    assert.ok(uitkomst.telling.punten > 150, `seed ${seed} heeft maar ${uitkomst.telling.punten} punten`);
    assert.equal(uitkomst.telling.energizers, 4, `seed ${seed} heeft geen vier energizers`);
  }
});

test("gegenereerde doolhoven hebben de klassieke vorm", () => {
  const rijen = G.genereerRijen(7);
  assert.equal(rijen.length, M.RIJEN);
  for (const rij of rijen) assert.equal(rij.length, M.KOLOMMEN);

  // de rand is dicht op de tunnelrij en op de hokdeur na
  for (let r = 0; r < M.RIJEN; r += 1) {
    if (rijen[r][0] !== "#") assert.notEqual(rijen[r][M.KOLOMMEN - 1], "#", `rij ${r} is half open`);
  }
  assert.equal(rijen[0], "#".repeat(M.KOLOMMEN));
  assert.equal(rijen[M.RIJEN - 1], "#".repeat(M.KOLOMMEN));

  // het hok is dicht, met alleen de deur open
  for (let r = M.HOK.rijen[0]; r <= M.HOK.rijen[1]; r += 1) {
    for (let c = M.HOK.kolommen[0]; c <= M.HOK.kolommen[1]; c += 1) {
      assert.notEqual(rijen[r][c], "#", `muur in het hok op ${c},${r}`);
    }
  }
  assert.equal(rijen[M.HOK.deur.r][M.HOK.deur.c], "-");
  assert.equal(rijen[M.PAC_START.r][M.PAC_START.c], " ");
});

test("een gegenereerd doolhof heeft lussen: geen enkel doodeinde zonder uitweg", () => {
  for (const seed of [1, 3, 7, 11, 21]) {
    const rijen = G.genereerRijen(seed);
    for (let r = 1; r < M.RIJEN - 1; r += 1) {
      for (let c = 1; c < M.KOLOMMEN - 1; c += 1) {
        if (rijen[r][c] === "#") continue;
        // het hok en zijn muren tellen niet mee (die zijn per definitie dicht)
        if (G.beschermd(c, r)) continue;
        const uitgangen = [[0, -1], [0, 1], [-1, 0], [1, 0]]
          .filter(([dc, dr]) => {
            const nc = ((c + dc) % M.KOLOMMEN + M.KOLOMMEN) % M.KOLOMMEN;
            const nr = r + dr;
            return nr >= 0 && nr < M.RIJEN && rijen[nr][nc] !== "#";
          });
        assert.ok(uitgangen.length >= 2,
          `dood spoor op ${c},${r} in seed ${seed} (${uitgangen.length} uitgang)`);
      }
    }
  }
});

test("de levelset: één klassiek plus vier gegenereerde doolhoven", () => {
  assert.equal(L.NIVEAUS.length, 5);
  assert.equal(L.NIVEAUS[0].rijen, M.DOOLHOF);
  assert.deepEqual(L.NIVEAUS.map((niveau) => niveau.naam),
    ["Klassiek", "Doolhof I", "Doolhof II", "Doolhof III", "Doolhof IV"]);

  for (const niveau of L.NIVEAUS) {
    const uitkomst = V.valideer(niveau.rijen);
    assert.equal(uitkomst.ok, true, `${niveau.naam}: ${uitkomst.fouten.join(" ")}`);
    assert.ok(niveau.id && niveau.emoji);
  }
  // en ze zijn echt verschillend
  const uniek = new Set(L.NIVEAUS.map((niveau) => niveau.rijen.join("|")));
  assert.equal(uniek.size, 5);
});

test("vier moeilijkheidsgraden, van chill tot munt-op", () => {
  const ids = Object.keys(L.MOEILIJKHEDEN);
  assert.deepEqual(ids, ["chill", "normaal", "arcade", "munt"]);
  const normaal = L.MOEILIJKHEDEN.normaal;
  assert.equal(normaal.spookTempo, 1);
  assert.ok(L.MOEILIJKHEDEN.chill.spookTempo < normaal.spookTempo);
  assert.ok(L.MOEILIJKHEDEN.arcade.spookTempo > normaal.spookTempo);
  assert.ok(L.MOEILIJKHEDEN.munt.spookTempo > L.MOEILIJKHEDEN.arcade.spookTempo);
  assert.equal(L.MOEILIJKHEDEN.munt.levens, 1);
  assert.equal(L.moeilijkheidOpId("onbekend").id, "normaal");
});

test("de engine speelt de levels in volgorde en kent de namen", () => {
  const niveaus = L.NIVEAUS.map((niveau) => niveau.rijen);
  const spel = new P.PacmanSpel({ niveaus, niveausMeta: L.NIVEAUS, startNiveau: 1 });
  spel.nieuwSpel();
  assert.equal(spel.niveauNaam, "Doolhof I");
  assert.deepEqual(spel.doolhof, L.NIVEAUS[1].rijen);

  spel._startLevel();                    // door naar het volgende level
  assert.equal(spel.niveauNaam, "Doolhof II");
  assert.deepEqual(spel.doolhof, L.NIVEAUS[2].rijen);

  // na het laatste level begin je weer bij het eerste
  spel._startLevel();
  spel._startLevel();
  spel._startLevel();
  assert.equal(spel.niveauNaam, "Klassiek");
  assert.deepEqual(spel.doolhof, M.DOOLHOF);
});

test("moeilijkheid verandert tempo, bangduur, levens en punten", () => {
  const meet = (moeilijkheid) => {
    const spel = new P.PacmanSpel({ moeilijkheid });
    spel.nieuwSpel();
    spel.pauzeTimer = 0;
    return spel;
  };

  const chill = meet(L.MOEILIJKHEDEN.chill);
  const arcade = meet(L.MOEILIJKHEDEN.arcade);
  const munt = meet(L.MOEILIJKHEDEN.munt);

  assert.equal(chill.levens, 3);
  assert.equal(munt.levens, 1);

  const spook = (...spel) => {
    const s = spel[0];
    const blinky = s.spoken.find((k) => k.naam === "blinky");
    return s._tempoSpook(blinky);
  };
  assert.ok(spook(chill) < spook(arcade), "arcade-spoken zijn niet sneller");

  // punten: arcade geeft 1,5×, munt-op 2×
  const puntenVoor = (spel) => {
    spel.punten = 0;
    spel._pakTegel(spel.pellets[0].c, spel.pellets[0].r);
    return spel.punten;
  };
  assert.equal(puntenVoor(meet(L.MOEILIJKHEDEN.normaal)), P.PUNTEN.punt);
  assert.equal(puntenVoor(meet(L.MOEILIJKHEDEN.arcade)), Math.round(P.PUNTEN.punt * 1.5));
  assert.equal(puntenVoor(meet(L.MOEILIJKHEDEN.munt)), P.PUNTEN.punt * 2);
});

test("de tunnelrij wordt per doolhof bepaald", () => {
  const klassiek = new P.PacmanSpel();
  klassiek.nieuwSpel();
  assert.equal(klassiek.tunnelRij(), P.TUNNEL_RIJ);

  const gegenereerd = new P.PacmanSpel({ doolhof: G.genereerRijen(7) });
  gegenereerd.nieuwSpel();
  const rij = gegenereerd.tunnelRij();
  assert.notEqual(gegenereerd.doolhof[rij][0], "#");
  assert.notEqual(gegenereerd.doolhof[rij][M.KOLOMMEN - 1], "#");
  assert.ok(gegenereerd._inTunnel({ r: rij, c: 1 }));
  assert.equal(gegenereerd._inTunnel({ r: rij, c: 14 }), false);
});

test("een gegenereerd doolhof is speelbaar: spoken komen buiten en Pac-Man eet", () => {
  for (const seed of [3, 7, 11]) {
    const spel = new P.PacmanSpel({ doolhof: G.genereerRijen(seed) });
    spel.nieuwSpel();
    spel.pauzeTimer = 0;
    spel.update(1 / 60);
    for (let i = 0; i < 60 * 8; i += 1) spel.update(1 / 60);
    for (const spook of spel.spoken) {
      assert.equal(spook.fase, "vrij", `${spook.naam} zit nog in het hok (seed ${seed})`);
    }
    // en niemand staat in een muur
    for (const actor of [spel.pac, ...spel.spoken]) {
      const p = spel.positie(actor);
      const c = ((Math.round(p.c) % M.KOLOMMEN) + M.KOLOMMEN) % M.KOLOMMEN;
      const r = Math.round(p.r);
      assert.notEqual(spel.doolhof[r][c], "#", `${actor.naam || "Pac-Man"} in een muur (seed ${seed})`);
    }
  }
});
