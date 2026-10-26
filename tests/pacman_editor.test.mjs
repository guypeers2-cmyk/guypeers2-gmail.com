/* ============================================================
   Tests voor de doolhof-editor, inclusief schilderen met de muis,
   symmetrie, keuring, opslaan en JSON-import/export.
   ============================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bouwDom as bouw, lijstTekst } from "./dom-harnas.mjs";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HIER, "..", "web", "pacman");
const SCRIPTS = ["maze.js", "validatie.js", "engine.js", "editor.js"]
  .map((naam) => path.join(WEB, naam));
const CEL = 24;

function bouwEditor(opties = {}) {
  return bouw({
    html: path.join(WEB, "editor.html"),
    scripts: SCRIPTS,
    canvasMaat: { "editor-doek": [28 * CEL, 31 * CEL] },
    ...opties,
  });
}

function schilder(dom, c, r, vanC = null, vanR = null) {
  const doek = dom.elementen.get("editor-doek");
  doek.vuur("pointerdown", {
    clientX: (vanC ?? c) * CEL + CEL / 2,
    clientY: (vanR ?? r) * CEL + CEL / 2,
    pointerId: 1,
  });
  if (vanC !== null) {
    doek.vuur("pointermove", { clientX: c * CEL + CEL / 2, clientY: r * CEL + CEL / 2 });
  }
  doek.vuur("pointerup", { clientX: c * CEL + CEL / 2, clientY: r * CEL + CEL / 2 });
}

function kiesGereedschap(dom, naam) {
  const knop = dom.gereedschapsknoppen.find((k) => k.dataset.gereedschap === naam);
  assert.ok(knop, `gereedschap ${naam} ontbreekt`);
  knop.vuur("click");
  return knop;
}

function exportRijen(dom) {
  dom.elementen.get("knop-export").vuur("click");
  const veld = dom.elementen.get("json-veld");
  return JSON.parse(veld.value).rijen;
}

test("de editor opent met het klassieke level en keurt dat goed", () => {
  const dom = bouwEditor();
  const teksten = lijstTekst(dom);
  assert.ok(teksten.some((t) => /Alles in orde/.test(t)), teksten.join(" | "));
  assert.equal(dom.elementen.get("editor-status").textContent, "geldig");
  assert.equal(dom.elementen.get("aantal-punten").textContent, 244);
  assert.equal(dom.elementen.get("aantal-energizers").textContent, 4);

  // de startposities staan klaar in de editor
  assert.ok(dom.elementen.get("editor-doek"));
  assert.equal(dom.gereedschapsknoppen.length, 5);
});

test("schilderen werkt en de spiegel zet de andere kant mee", () => {
  const dom = bouwEditor();
  kiesGereedschap(dom, "muur");

  // muur op (2,5) → spiegel zet ook (25,5) dicht
  schilder(dom, 2, 5);
  const rijen = exportRijen(dom);
  assert.equal(rijen[5][2], "#");
  assert.equal(rijen[5][25], "#");

  // spiegel uitzetten: alleen de linkerkant
  const spiegel = dom.elementen.get("knop-symmetrie");
  spiegel.vuur("click");
  assert.equal(spiegel.getAttribute("aria-pressed"), "false");
  schilder(dom, 3, 5);
  const na = exportRijen(dom);
  assert.equal(na[5][3], "#");
  assert.equal(na[5][24], ".");
});

test("de hokdeur dichtmetselen wordt meteen afgekeurd", () => {
  const dom = bouwEditor();
  kiesGereedschap(dom, "muur");
  schilder(dom, 13, 12);           // de hokdeur

  const teksten = lijstTekst(dom);
  assert.ok(teksten.some((t) => /hokdeur/.test(t)), teksten.join(" | "));
  assert.match(dom.elementen.get("editor-status").textContent, /fout/);
});

test("opslaan met een fout navigeert niet, opslaan met een goed level wel", () => {
  const dom = bouwEditor();
  const locatie = dom.venster.location;

  kiesGereedschap(dom, "muur");
  schilder(dom, 13, 12);
  dom.elementen.get("knop-opslaan").vuur("click");
  assert.equal(locatie.href, "http://test/index.html", "er werd genavigeerd met een kapot level");
  assert.match(dom.elementen.get("editor-melding").textContent, /fout/i);

  dom.elementen.get("knop-standaard").vuur("click");
  assert.equal(dom.elementen.get("editor-status").textContent, "geldig");
  dom.elementen.get("knop-opslaan").vuur("click");
  assert.equal(locatie.href, "index.html?doolhof=eigen");

  const bewaard = JSON.parse(dom.opslag.get("pacman-doolhof"));
  assert.equal(bewaard.rijen.length, 31);
  assert.equal(bewaard.rijen[12][13], "-");
});

test("leegmaken en vullen leveren een speelbaar maar saai level op", () => {
  const dom = bouwEditor();
  dom.elementen.get("knop-wissen").vuur("click");
  assert.equal(dom.elementen.get("aantal-punten").textContent, 0);
  assert.match(dom.elementen.get("editor-status").textContent, /geldig|fout/);

  dom.elementen.get("knop-vullen").vuur("click");
  const rijen = exportRijen(dom);
  const punten = rijen.join("").split(".").length - 1;
  assert.ok(punten > 40, `te weinig punten: ${punten}`);
  assert.equal(rijen[14][13], " ", "er ligt een punt in het hok");
  const teksten = lijstTekst(dom);
  assert.ok(teksten.some((t) => /energizers/.test(t)), "geen waarschuwing over energizers");
  assert.equal(dom.elementen.get("editor-status").textContent, "geldig");
});

test("JSON importeren en exporteren", () => {
  const dom = bouwEditor();
  const rijen = exportRijen(dom);
  const aangepast = JSON.parse(JSON.stringify(rijen));
  aangepast[1] = "#" + "o".repeat(26) + "#";

  const veld = dom.elementen.get("json-veld");
  veld.value = JSON.stringify({ rijen: aangepast });
  dom.elementen.get("knop-import").vuur("click");
  assert.match(dom.elementen.get("editor-melding").textContent, /geïmporteerd/);
  assert.equal(exportRijen(dom)[1], aangepast[1]);

  // kapotte JSON geeft een melding, geen crash
  veld.value = "{ dit is geen json";
  dom.elementen.get("knop-import").vuur("click");
  assert.match(dom.elementen.get("editor-melding").textContent, /Geen geldige JSON/);

  // verkeerde vorm wordt ook geweigerd
  veld.value = JSON.stringify({ rijen: ["#".repeat(28)] });
  dom.elementen.get("knop-import").vuur("click");
  assert.match(dom.elementen.get("editor-melding").textContent, /31 rijen/);
});

test("het concept wordt bewaard en bij herladen teruggezet", () => {
  const dom = bouwEditor();
  kiesGereedschap(dom, "punt");
  schilder(dom, 5, 5);
  const concept = dom.opslag.get("pacman-doolhof-concept");
  assert.ok(concept, "er is geen concept opgeslagen");

  const opnieuw = bouwEditor({ opslagVooraf: { "pacman-doolhof-concept": concept } });
  const rijen = exportRijen(opnieuw);
  assert.deepEqual(rijen, JSON.parse(concept));
});
