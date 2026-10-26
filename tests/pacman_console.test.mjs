/* ============================================================
   Tests voor de Pac-Man-console (app.js) zónder browser.
   maze.js + validatie.js + engine.js + app.js draaien in een
   nagebootste DOM; we spelen met toetsen, klikken en vegen.
   ============================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bouwDom as bouw, stap } from "./dom-harnas.mjs";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HIER, "..", "web", "pacman");
const SCRIPTS = ["maze.js", "validatie.js", "engine.js", "app.js"]
  .map((naam) => path.join(WEB, naam));

function bouwDom(opties = {}) {
  return bouw({
    html: path.join(WEB, "index.html"),
    scripts: SCRIPTS,
    canvasMaat: { doek: [896, 992] },
    ...opties,
  });
}

function toets(dom, naam) {
  for (const fn of dom.venster.luisteraars.keydown || []) fn({ key: naam, preventDefault() {} });
}

test("de console laadt, tekent en speelt zonder fouten", () => {
  const dom = bouwDom();
  assert.ok(dom.venster.PacmanApp, "app.js heeft zich niet opgestart");
  const { spel } = dom.venster.PacmanApp;
  assert.equal(dom.venster.Pacman.PacmanSpel.hoogsteScore, 0);

  const tijd = { nu: 0 };
  stap(dom, 16, tijd);
  assert.equal(dom.elementen.get("overlay").hidden, false, "het startscherm staat niet open");

  // op start klikken
  dom.elementen.get("overlay").vuur("click", {
    target: { closest: () => ({ dataset: { actie: "start" } }) },
  });
  assert.equal(dom.elementen.get("overlay").hidden, true);

  for (let i = 0; i < 60; i += 1) stap(dom, 16, tijd);
  assert.ok(spel.punten > 0, "Pac-Man eet niets");
  assert.equal(dom.elementen.get("hud-score").textContent, spel.punten.toLocaleString("nl-BE"));
  assert.ok(dom.elementen.get("statusregel").textContent.includes("punten over"));

  // sturen met het toetsenbord
  for (const naam of ["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight", "w"]) {
    toets(dom, naam);
    for (let i = 0; i < 6; i += 1) stap(dom, 16, tijd);
  }
  assert.ok(spel.pac.richting, "Pac-Man heeft geen richting");

  // vegen over het veld
  const doek = dom.elementen.get("doek");
  doek.vuur("pointerdown", { clientX: 200, clientY: 300, pointerId: 1 });
  doek.vuur("pointerup", { clientX: 320, clientY: 300, pointerId: 1 });
  assert.equal(spel.pac.gevraagd, "rechts");

  // pauzeren via de knop
  dom.elementen.get("knop-pauze").vuur("click");
  stap(dom, 16, tijd);
  assert.equal(spel.toestand, "gepauzeerd");
  assert.equal(dom.elementen.get("overlay").hidden, false, "het pauzescherm verschijnt niet");
  dom.elementen.get("knop-pauze").vuur("click");
  stap(dom, 16, tijd);
  assert.equal(spel.toestand, "bezig");

  // geluid aan/uit
  const geluidKnop = dom.elementen.get("knop-geluid");
  geluidKnop.vuur("click");
  assert.equal(dom.opslag.get("pacman-geluid"), "uit");
  assert.equal(geluidKnop.getAttribute("aria-pressed"), "false");
  geluidKnop.vuur("click");
  assert.equal(dom.opslag.get("pacman-geluid"), "aan");

  // rooster aan/uit
  const roosterKnop = dom.elementen.get("knop-rooster");
  roosterKnop.vuur("click");
  assert.equal(dom.venster.PacmanApp.scherm.rooster, true);
  stap(dom, 16, tijd);
  roosterKnop.vuur("click");
  assert.equal(dom.venster.PacmanApp.scherm.rooster, false);

  // levens en niveau worden getoond
  assert.equal(dom.elementen.get("hud-levens").innerHTML.split("<i></i>").length - 1, spel.levens);
  assert.equal(String(dom.elementen.get("hud-niveau").textContent), String(spel.niveau));

  // de muurlaag wordt gecacht: één keer opbouwen, daarna kopiëren
  const kopieen = dom.oproepen.filter(([naam]) => naam === "drawImage").length;
  assert.ok(kopieen >= 60, `de muurlaag wordt niet gecacht (${kopieen} kopieën)`);

  // nieuw spel via de toets Enter
  spel.punten = 999;
  toets(dom, "Enter");
  stap(dom, 16, tijd);
  assert.equal(spel.punten, 0);
});

test("spel voorbij toont de eindscore en slaat de highscore op", () => {
  const dom = bouwDom();
  const tijd = { nu: 0 };
  stap(dom, 16, tijd);
  const { spel } = dom.venster.PacmanApp;

  spel.punten = 4321;
  spel.levens = 0;
  spel._naDood();
  stap(dom, 16, tijd);

  assert.equal(spel.toestand, "over");
  assert.equal(dom.elementen.get("overlay").hidden, false);
  assert.match(String(dom.elementen.get("overlay-titel").textContent), /4321/);
  assert.equal(dom.opslag.get("pacman-highscore"), "4321");
  assert.match(dom.elementen.get("overlay-klein").textContent, /record/i);

  // opnieuw spelen
  dom.elementen.get("overlay").vuur("click", {
    target: { closest: () => ({ dataset: { actie: "nieuw" } }) },
  });
  stap(dom, 16, tijd);
  assert.equal(spel.punten, 0);
  assert.equal(spel.levens, 3);
  assert.equal(dom.elementen.get("overlay").hidden, false, "het klaar-scherm hoort even te verschijnen");
  assert.equal(dom.elementen.get("overlay-titel").textContent, "Klaar?");

  for (let i = 0; i < 130; i += 1) stap(dom, 16, tijd);
  assert.equal(dom.elementen.get("overlay").hidden, true);
  assert.equal(spel.toestand, "bezig");
});

test("?doolhof=eigen laadt een goedgekeurd level uit localStorage", () => {
  const basis = bouwDom();
  const rijen = JSON.parse(JSON.stringify(basis.venster.Pacman.DOOLHOF));
  rijen[1] = "#" + "o".repeat(26) + "#";

  const dom = bouwDom({
    opslagVooraf: { "pacman-doolhof": JSON.stringify({ rijen }) },
    zoek: "?doolhof=eigen",
  });
  const { spel } = dom.venster.PacmanApp;
  assert.deepEqual([...spel.doolhof[1]], [...rijen[1]]);
  assert.notDeepEqual([...spel.doolhof[1]], [...dom.venster.Pacman.DOOLHOF[1]]);
});

test("een ongeldig opgeslagen level wordt geweigerd", () => {
  const basis = bouwDom();
  const rijen = JSON.parse(JSON.stringify(basis.venster.Pacman.DOOLHOF));
  rijen[12] = rijen[12].replace("-", "#");     // hokdeur dichtgemetseld
  rijen[1] = "#" + "o".repeat(26) + "#";

  const dom = bouwDom({
    opslagVooraf: { "pacman-doolhof": JSON.stringify({ rijen }) },
    zoek: "?doolhof=eigen",
  });
  const { spel } = dom.venster.PacmanApp;
  assert.deepEqual([...spel.doolhof[12]], [...dom.venster.Pacman.DOOLHOF[12]]);
});

test("zonder ?doolhof=eigen speel je het klassieke level", () => {
  const dom = bouwDom();
  const { spel } = dom.venster.PacmanApp;
  assert.deepEqual([...spel.doolhof[1]], [...dom.venster.Pacman.DOOLHOF[1]]);
});

test("op mobiel sturen de richtingknoppen en een tik", () => {
  const dom = bouwDom();
  const tijd = { nu: 0 };
  stap(dom, 16, tijd);
  const { spel } = dom.venster.PacmanApp;

  dom.dpad[0].vuur("click");
  assert.equal(spel.pac.gevraagd, "omhoog");
  dom.dpad[2].vuur("click");
  assert.equal(spel.pac.gevraagd, "omlaag");

  // een tik op het scherm start of hervat het spel
  spel.pauzeer();
  const doek = dom.elementen.get("doek");
  doek.vuur("pointerdown", { clientX: 100, clientY: 100, pointerId: 2 });
  doek.vuur("pointerup", { clientX: 103, clientY: 101, pointerId: 2 });
  assert.equal(spel.toestand, "bezig");
});
