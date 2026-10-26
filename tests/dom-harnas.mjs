/* ============================================================
   Een piepklein DOM-harnas.
   Genoeg om de console (app.js) en de editor (editor.js) zonder
   browser te draaien: elementen, events, canvas, localStorage en
   requestAnimationFrame. Geen dependencies.
   ============================================================ */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

export class Element {
  constructor(id = "") {
    this.id = id;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.className = "";
    this.textContent = "";
    this.innerHTML = "";
    this.attributes = {};
    this.luisteraars = {};
    this.classList = {
      _set: new Set(),
      toggle: (naam, aan) => {
        const waarde = aan === undefined ? !this.classList._set.has(naam) : Boolean(aan);
        if (waarde) this.classList._set.add(naam);
        else this.classList._set.delete(naam);
        return waarde;
      },
      add: (naam) => this.classList._set.add(naam),
      remove: (naam) => this.classList._set.delete(naam),
      contains: (naam) => this.classList._set.has(naam),
    };
  }

  addEventListener(soort, fn) {
    (this.luisteraars[soort] ||= []).push(fn);
  }

  vuur(soort, gebeurtenis = {}) {
    for (const fn of this.luisteraars[soort] || []) {
      fn({ preventDefault() {}, stopPropagation() {}, ...gebeurtenis });
    }
  }

  setAttribute(naam, waarde) {
    this.attributes[naam] = String(waarde);
  }

  getAttribute(naam) {
    return this.attributes[naam];
  }

  appendChild(kind) {
    this.children.push(kind);
    return kind;
  }

  closest() {
    return null;
  }

  setPointerCapture() {}

  select() {}

  focus() {}

  blur() {}

  releasePointerCapture() {}

  getBoundingClientRect() {
    return { left: 0, top: 0, width: this.width || 448, height: this.height || 496 };
  }
}

/** Genoeg van OffscreenCanvas om de muurlaag te cachen. */
class OffscreenCanvas {
  constructor(breedte, hoogte) {
    this.width = breedte;
    this.height = hoogte;
  }

  getContext() {
    return new OffscreenCanvas.Ctx();
  }
}
OffscreenCanvas.Ctx = class {
  constructor() {
    return new Proxy({}, {
      get(doel, eigenschap) {
        if (typeof eigenschap === "symbol") return undefined;
        if (eigenschap in doel) return doel[eigenschap];
        return (...args) => (eigenschap === "measureText" ? { width: 10 } : args);
      },
      set(doel, eigenschap, waarde) {
        doel[eigenschap] = waarde;
        return true;
      },
    });
  }
};

export function maakCtx(log = []) {
  return new Proxy({}, {
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
}

export class Canvas extends Element {
  constructor(id, breedte = 896, hoogte = 992, log = []) {
    super(id);
    this.width = breedte;
    this.height = hoogte;
    this.log = log;
  }

  getContext() {
    if (!this._ctx) this._ctx = maakCtx(this.log);
    return this._ctx;
  }
}

const DOEK_IDS = new Set(["doek", "editor-doek"]);

/**
 * Bouwt een DOM na, laadt de opgegeven scripts in één context en
 * geeft alles terug wat een test nodig heeft.
 */
export function bouwDom({
  html,
  scripts,
  opslagVooraf = {},
  zoek = "",
  fetchStub = null,
  gereedschap = ["muur", "punt", "energizer", "leeg", "deur"],
  richtingen = ["omhoog", "links", "omlaag", "rechts"],
  canvasMaat = {},
} = {}) {
  const bron = fs.readFileSync(html, "utf8");
  const oproepen = [];
  const elementen = new Map();

  // elke tag met een id krijgt zijn echte attributen uit de HTML
  for (const tag of bron.match(/<[a-zA-Z][^>]*>/g) || []) {
    const id = (tag.match(/\sid="([^"]+)"/) || [])[1];
    if (!id || elementen.has(id)) continue;
    const maat = canvasMaat[id] || [];
    const element = DOEK_IDS.has(id) ? new Canvas(id, ...maat, oproepen) : new Element(id);
    for (const [, naam, waarde] of tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      if (naam === "id") continue;
      element.setAttribute(naam, waarde);
    }
    // attributen zonder waarde (zoals hidden) hebben geen ="…"
    if (/\shidden[\s>/]/.test(tag) || element.getAttribute("hidden") !== undefined) {
      element.hidden = true;
    }
    if (element.dataset) {
      for (const [, naam, waarde] of tag.matchAll(/data-([a-zA-Z-]+)="([^"]*)"/g)) {
        element.dataset[naam] = waarde;
      }
    }
    elementen.set(id, element);
  }
  // elementen die alleen via JS worden gemaakt (id in de tekst) alsnog aanmaken
  for (const [, id] of bron.matchAll(/id="([^"]+)"/g)) {
    if (elementen.has(id)) continue;
    const maat = canvasMaat[id] || [];
    elementen.set(id, DOEK_IDS.has(id) ? new Canvas(id, ...maat, oproepen) : new Element(id));
  }

  const knop = (sleutel, waarde) => {
    const el = new Element();
    el.dataset[sleutel] = waarde;
    return el;
  };
  const dpad = richtingen.map((richting) => knop("richting", richting));
  const gereedschapsknoppen = gereedschap.map((naam) => knop("gereedschap", naam));

  const opslag = new Map(Object.entries(opslagVooraf));
  const wachtenden = [];

  const document = {
    body: new Element("body"),
    documentElement: new Element("html"),
    getElementById: (id) => elementen.get(id) || null,
    querySelector(sel) {
      if (!sel.startsWith("#")) return null;
      return elementen.get(sel.slice(1)) || null;
    },
    querySelectorAll(sel) {
      if (sel === ".dpad button") return dpad;
      if (sel === "[data-gereedschap]") return gereedschapsknoppen;
      return [];
    },
    createElement: () => new Element(),
    addEventListener() {},
  };

  const globaal = {
    document,
    localStorage: {
      getItem: (sleutel) => (opslag.has(sleutel) ? opslag.get(sleutel) : null),
      setItem: (sleutel, waarde) => opslag.set(sleutel, String(waarde)),
      removeItem: (sleutel) => opslag.delete(sleutel),
    },
    location: { search: zoek, href: "http://test/index.html" },
    requestAnimationFrame: (fn) => { wachtenden.push(fn); return wachtenden.length; },
    addEventListener(soort, fn) { (this.luisteraars[soort] ||= []).push(fn); },
    luisteraars: {},
    setTimeout: () => 0,
    clearTimeout: () => {},
    navigator: {},
    URLSearchParams,
    OffscreenCanvas,
    fetch: fetchStub || (() => Promise.resolve({ ok: true, json: () => Promise.resolve({ agenten: [] }) })),
    crypto: { randomUUID: () => "test-sessie" },
    console,
  };
  globaal.window = globaal;

  const context = vm.createContext(globaal);
  for (const script of scripts) {
    vm.runInContext(fs.readFileSync(script, "utf8"), context, { filename: path.basename(script) });
  }

  return {
    context, venster: globaal, document, elementen, opslag, wachtenden, dpad,
    gereedschapsknoppen, oproepen,
  };
}

/** Laat de animatielus precies één beeldje opschieten. */
export function stap(dom, ms = 16, tijd = { nu: 0 }) {
  tijd.nu += ms;
  const fn = dom.wachtenden.pop();
  dom.wachtenden.length = 0;
  assert.ok(fn, "de animatielus is gestopt");
  fn(tijd.nu);
  return tijd;
}

/** Simpele tekstcontrole op de keuringslijst van de editor. */
export function lijstTekst(dom, id = "controle-lijst") {
  return (dom.elementen.get(id).children || []).map((kind) => kind.textContent);
}
