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
const SCRIPTS = ["maze.js", "validatie.js", "generator.js", "levels.js", "engine.js", "app.js"]
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

test("het startscherm laat een level en een moeilijkheidsgraad kiezen", () => {
  const dom = bouwDom();
  const tijd = { nu: 0 };
  stap(dom, 16, tijd);
  const { spel } = dom.venster.PacmanApp;
  const overlay = dom.elementen.get("overlay");
  const knoppen = dom.elementen.get("overlay-knoppen");

  // de knoppen staan er
  assert.match(knoppen.innerHTML, /data-actie="kies"/);
  assert.match(knoppen.innerHTML, /data-actie="moeilijkheid"/);

  // level kiezen → leveloverzicht
  overlay.vuur("click", { target: { closest: () => ({ dataset: { actie: "kies" } }) } });
  assert.equal(dom.elementen.get("overlay-titel").textContent, "Levels");
  assert.equal((knoppen.innerHTML.match(/data-actie="start-level"/g) || []).length,
    dom.venster.PacmanLevels.NIVEAUS.length);

  // level 3 starten
  overlay.vuur("click", {
    target: { closest: () => ({ dataset: { actie: "start-level", index: "3" } }) },
  });
  assert.equal(overlay.hidden, true);
  assert.equal(spel.niveauIndex, 3);
  assert.equal(spel.niveauNaam, "Doolhof III");
  assert.equal(dom.elementen.get("hud-niveau-naam").textContent, "Doolhof III");
  assert.equal(dom.opslag.get("pacman-niveau"), "doolhof-11");
  assert.deepEqual(spel.doolhof, dom.venster.PacmanLevels.NIVEAUS[3].rijen);

  // na de aftelling speelt het nieuwe level meteen
  for (let i = 0; i < 200; i += 1) stap(dom, 16, tijd);
  assert.equal(spel.toestand, "bezig");
  assert.ok(spel.punten > 0, "Pac-Man eet niets in het gekozen level");
  assert.equal(dom.elementen.get("hud-niveau-naam").textContent, "Doolhof III");
});

test("moeilijkheid wisselen werkt meteen en wordt onthouden", () => {
  const dom = bouwDom();
  const tijd = { nu: 0 };
  stap(dom, 16, tijd);
  const { spel } = dom.venster.PacmanApp;
  const overlay = dom.elementen.get("overlay");
  const knoppen = dom.elementen.get("overlay-knoppen");

  overlay.vuur("click", { target: { closest: () => ({ dataset: { actie: "moeilijkheid" } }) } });
  assert.equal(dom.elementen.get("overlay-titel").textContent, "Moeilijkheid");
  assert.equal((knoppen.innerHTML.match(/data-actie="start-moeilijkheid"/g) || []).length, 4);

  overlay.vuur("click", {
    target: { closest: () => ({ dataset: { actie: "start-moeilijkheid", id: "munt" } }) },
  });
  assert.equal(spel.moeilijkheid.id, "munt");
  assert.equal(dom.elementen.get("hud-moeilijkheid").textContent, "Munt-op");
  assert.equal(dom.opslag.get("pacman-moeilijkheid"), "munt");
  assert.ok(spel.levens <= 1, "munt-op hoort met één leven te spelen");
  assert.equal(dom.elementen.get("overlay").hidden, false, "je komt terug op het startscherm");
});

test("?niveau= en ?moeilijkheid= starten meteen met de juiste keuze", () => {
  const dom = bouwDom({ zoek: "?niveau=doolhof-3&moeilijkheid=arcade" });
  const { spel } = dom.venster.PacmanApp;
  assert.equal(spel.niveauNaam, "Doolhof II");
  assert.equal(spel.moeilijkheid.id, "arcade");
  assert.equal(dom.elementen.get("hud-moeilijkheid").textContent, "Arcade");
});

test("?ingebed=1 zet de console in de compacte modus", () => {
  const dom = bouwDom({ zoek: "?ingebed=1" });
  assert.equal(dom.venster.PacmanApp.ingebed, true);
  assert.equal(dom.document.body.classList.contains("ingebed"), true);
});

test("de Gids-console omlijst de arcade en laadt hem pas als je hem opent", () => {
  const dom = bouw({ html: path.join(HIER, "..", "web", "index.html"), scripts: [] });
  const paneel = dom.elementen.get("arcade-paneel");
  const frame = dom.elementen.get("arcade-frame");
  const knop = dom.elementen.get("arcade-knop");
  const sluit = dom.elementen.get("arcade-sluit");

  assert.ok(paneel && frame && knop && sluit, "de arcade-elementen ontbreken in de console");
  assert.equal(knop.getAttribute("aria-controls"), "arcade-paneel");
  assert.equal(knop.getAttribute("aria-expanded"), "false");
  assert.equal(frame.getAttribute("src"), "about:blank", "de iframe laadt al zonder dat je hem opent");
});

test("de arcade opent, laadt het spel en sluit weer", () => {
  const dom = bouw({
    html: path.join(HIER, "..", "web", "index.html"),
    scripts: [path.join(HIER, "..", "web", "app.js")],
    fetchStub: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ agenten: [] }) }),
  });
  const paneel = dom.elementen.get("arcade-paneel");
  const frame = dom.elementen.get("arcade-frame");
  const knop = dom.elementen.get("arcade-knop");

  assert.equal(paneel.hidden, true);

  knop.vuur("click");
  assert.equal(paneel.hidden, false, "het paneel gaat niet open");
  assert.equal(knop.getAttribute("aria-expanded"), "true");
  assert.equal(frame.getAttribute("src"), "/pacman/?ingebed=1", "het spel wordt niet geladen");

  // nog eens klikken sluit weer
  knop.vuur("click");
  assert.equal(paneel.hidden, true);
  assert.equal(knop.getAttribute("aria-expanded"), "false");

  // en via de chip in de gespreksbalk
  knop.vuur("click");
  dom.elementen.get("arcade-sluit").vuur("click");
  assert.equal(paneel.hidden, true);

  // de iframe-bron blijft staan, zodat het spel niet telkens herstart
  assert.equal(frame.getAttribute("src"), "/pacman/?ingebed=1");
});
