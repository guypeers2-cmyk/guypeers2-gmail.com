/* ============================================================
   Tests voor de doolhofkeuring (validatie.js).
   De editor waarschuwt ermee, de console weigert ermee en de
   klassieke indeling wordt ermee bewezen.
   ============================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const V = require("../web/pacman/validatie.js");
const M = require("../web/pacman/maze.js");

const kopie = () => [...M.DOOLHOF];

function zet(rijen, c, r, teken) {
  const rij = [...rijen[r]];
  rij[c] = teken;
  rijen[r] = rij.join("");
  return rijen;
}

test("het klassieke doolhof is geldig", () => {
  const uitkomst = V.valideer(M.DOOLHOF);
  assert.equal(uitkomst.ok, true);
  assert.deepEqual(uitkomst.fouten, []);
  assert.deepEqual(uitkomst.waarschuwingen, []);
  assert.deepEqual(uitkomst.telling, { punten: 244, energizers: 4, muren: 548 });
});

test("vormfouten worden geweigerd", () => {
  assert.equal(V.valideerVorm(null).ok, false);
  assert.equal(V.valideerVorm([]).ok, false);
  assert.match(V.valideerVorm(M.DOOLHOF.slice(1)).fout, /31 rijen/);

  const teKort = kopie();
  teKort[3] = teKort[3].slice(1);
  assert.match(V.valideerVorm(teKort).fout, /28 tekens/);

  const raarTeken = kopie();
  zet(raarTeken, 3, 3, "X");
  assert.match(V.valideerVorm(raarTeken).fout, /Onbekend teken "X"/);

  // valideer() geeft bij een vormfout meteen één duidelijke melding
  const uitkomst = V.valideer(teKort);
  assert.equal(uitkomst.ok, false);
  assert.equal(uitkomst.fouten.length, 1);
});

test("de hokdeur is verplicht en de uitgang mag niet dicht", () => {
  const zonderDeur = kopie();
  zet(zonderDeur, M.HOK.deur.c, M.HOK.deur.r, " ");
  const uitkomst = V.valideer(zonderDeur);
  assert.equal(uitkomst.ok, false);
  assert.ok(uitkomst.fouten.some((f) => /hokdeur/.test(f)));

  const dichteUitgang = kopie();
  zet(dichteUitgang, M.HOK.uitgang.c, M.HOK.uitgang.r, "#");
  assert.equal(V.valideer(dichteUitgang).ok, false);
});

test("een muur of een punt in het hok is een fout", () => {
  const muurInHok = kopie();
  zet(muurInHok, 13, 14, "#");
  const uitkomst = V.valideer(muurInHok);
  assert.equal(uitkomst.ok, false);
  assert.ok(uitkomst.fouten.some((f) => /muur in het spokenhok/.test(f)));

  const puntInHok = kopie();
  zet(puntInHok, 13, 14, ".");
  assert.ok(V.valideer(puntInHok).fouten.some((f) => /hok/.test(f)));
});

test("een muur op de starttegel is een fout", () => {
  const rijen = kopie();
  zet(rijen, M.PAC_START.c, M.PAC_START.r, "#");
  assert.ok(V.valideer(rijen).fouten.some((f) => /Pac-Man start/.test(f)));
});

test("punten die Pac-Man nooit kan bereiken zijn een fout", () => {
  const rijen = kopie();
  // metsel een punt in: (1,1) is alleen via (2,1) en (1,2) te bereiken
  zet(rijen, 1, 2, "#");
  zet(rijen, 2, 1, "#");
  const uitkomst = V.valideer(rijen);
  assert.equal(uitkomst.ok, false);
  assert.ok(uitkomst.fouten.some((f) => /onbereikbaar/.test(f)));
});

test("deurgedrag: Pac-Man niet, spoken wel", () => {
  const deur = { c: M.HOK.deur.c, r: M.HOK.deur.r };
  const voorPac = V.bereikbaar(M.DOOLHOF, M.PAC_START, false);
  const voorSpook = V.bereikbaar(M.DOOLHOF, M.PAC_START, true);
  assert.equal(voorPac.has(`${deur.c},${deur.r}`), false);
  assert.equal(voorSpook.has(`${deur.c},${deur.r}`), true);
});

test("waarschuwingen voor een saai level blokkeren niet", () => {
  const rijen = kopie();
  for (let r = 1; r < M.RIJEN - 1; r += 1) {
    for (let c = 1; c < M.KOLOMMEN - 1; c += 1) {
      if (rijen[r][c] === "." || rijen[r][c] === "o") zet(rijen, c, r, " ");
    }
  }
  const uitkomst = V.valideer(rijen);
  assert.equal(uitkomst.ok, true, uitkomst.fouten.join(" "));
  assert.ok(uitkomst.waarschuwingen.some((w) => /punten/.test(w)));
  assert.ok(uitkomst.waarschuwingen.some((w) => /energizers/.test(w)));
});

test("tellen klopt", () => {
  const telling = V.tel(M.DOOLHOF);
  assert.equal(telling.punten, 244);
  assert.equal(telling.energizers, 4);
  assert.ok(telling.muren > 500);
});
