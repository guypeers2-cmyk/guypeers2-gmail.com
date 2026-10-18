// ==========================================================
// REKENKERN — JavaScript-port van bouw/bereken.py
//
// Deze port draait op Cloudflare Workers (geen Python daar).
// De Python-kern blijft de referentie; een pariteitstest
// (bouwcalculator/tests/test_pariteit.py) vergelijkt beide
// uitkomsten regel voor regel.
//
// Wijzig bij voorkeur de Python-versie en werk deze file
// daarna bij — de prijsboek wordt gegenereerd (prijsboek.js).
// ==========================================================

import { Vorm } from "./vorm.js";
import { TARIEVEN, PAKKETTEN, PAKKET_OP_ID } from "./prijsboek.js";

/* ---------------- normen uit de praktijk ---------------- */
export const SPOORAFSTAND = 0.40;
export const HANGERAFSTAND = 0.80;
export const PLAAT_VERSPILLING = 0.10;
export const PROFIEL_VERSPILLING = 0.05;
export const SCHROEVEN_PER_M2 = 20;
export const TAPE_M_PER_M2 = 1.4;
export const COMPOUND_KG_PER_M2 = 0.5;
export const LIJM_KG_PER_M2 = 0.4;
export const PROFIEL_LENGTE = 3.0;

const MUURZIJDEN = ["noord", "zuid", "oost", "west"];
const ZIJDE_NAMEN = {
  noord: "Wand noord", zuid: "Wand zuid", oost: "Wand oost",
  west: "Wand west", plafond: "Plafond", vloer: "Vloer",
};
const PLAAT_KEYS = {
  "12,5 mm": "plaat_gyproc_12_5",
  "15 mm": "plaat_gyproc_15",
  "GGL 30 mm": "plaat_ggl_30",
};
const ISOLATIE_KEYS = {
  "mineralen wol 75 mm": "isolatie_wol",
  "PIR 60 mm": "isolatie_pir",
};

/* ---------------- hulpmiddelen ---------------- */
export function money(waarde, decimalen = 2) {
  const factor = 10 ** decimalen;
  const afgerond = Math.floor(Math.abs(waarde) * factor + 0.5) / factor;
  return waarde < 0 ? -afgerond : afgerond;
}

const ceil = (x) => Math.ceil(x - 1e-9);

function getal(waarde, standaard = 0) {
  const n = parseFloat(String(waarde ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : standaard;
}

function tekst(waarde, standaard = "") {
  if (waarde === null || waarde === undefined) return standaard;
  return String(waarde);
}

/* ---------------- model (spiegel van bouw/model.py) ---------------- */
function openingVanDict(d = {}) {
  let muur = tekst(d.muur, "noord").toLowerCase();
  if (!Vorm.idOK(muur)) muur = "noord";
  const aantal = Math.trunc(getal(d.aantal, 1)) || 1;
  return {
    naam: tekst(d.naam, "Deur") || "Deur",
    muur,
    breedte: getal(d.breedte, 0.9),
    hoogte: getal(d.hoogte, 2.1),
    aantal,
    positie: d.positie == null || d.positie === "" ? null : Math.max(0, getal(d.positie)),
    borstwering: Math.max(0, getal(d.borstwering)),
  };
}

function ruimteVanDict(d = {}) {
  const contour=Vorm.contour(d.contour),dak=Vorm.roof(d.dak);
  const hoogte=dak?Math.max(dak.start,dak.eind):contour.length?Vorm.number(d.hoogte ?? 2.5):getal(d.hoogte,2.5);
  if(dak && !contour.length && [Vorm.number(d.lengte ?? 4),Vorm.number(d.breedte ?? 3)].some(n=>!Number.isFinite(n)||n<.05||n>1000))throw Error('Gebruik een lengte en breedte tussen 0,05 en 1000 meter.');
  if((contour.length||dak) && (!Number.isFinite(hoogte)||hoogte<.1||hoogte>100))throw Error('Plafondhoogten moeten tussen 0,10 en 100 meter liggen.');
  return {
    contour,dak,
    id: tekst(d.id) || Math.random().toString(36).slice(2, 10),
    naam: tekst(d.naam, "Ruimte") || "Ruimte",
    lengte: contour.length?Math.max(...contour.map(p=>p.x)):getal(d.lengte,4.0),
    breedte: contour.length?Math.max(...contour.map(p=>p.y)):getal(d.breedte,3.0),
    hoogte,
    openingen: (d.openingen || []).map(openingVanDict),
  };
}

function regelVanDict(d = {}) {
  let hoeveelheid = d.hoeveelheid;
  if (hoeveelheid === null || hoeveelheid === undefined || hoeveelheid === "") {
    hoeveelheid = null;
  } else {
    const n = parseFloat(String(hoeveelheid).replace(",", "."));
    hoeveelheid = Number.isFinite(n) ? n : null;
  }
  const opties = {};
  for (const [k, v] of Object.entries(d.opties || {})) opties[String(k)] = String(v);
  return {
    id: tekst(d.id) || Math.random().toString(36).slice(2, 10),
    ruimte_id: tekst(d.ruimte_id),
    oppervlak: tekst(d.oppervlak, "noord"),
    pakket_id: tekst(d.pakket_id, "gyproc_wand_profiel"),
    opties,
    hoeveelheid,
    notitie: tekst(d.notitie),
    visualisatie: Object.fromEntries(Object.entries(d.visualisatie && typeof d.visualisatie === "object" ? d.visualisatie : {})
      .filter(([k,v]) => ["x","y","z","x2","y2","z2"].includes(k) && v != null && v !== "" && Number.isFinite(parseFloat(String(v).replace(",", "."))))
      .map(([k,v]) => [k, Math.max(0, parseFloat(String(v).replace(",", ".")))])),
  };
}

function projectVanDict(d = {}) {
  const project = {
    naam: tekst(d.naam, "Nieuwe offerte") || "Nieuwe offerte",
    klant: tekst(d.klant),
    adres: tekst(d.adres),
    datum: tekst(d.datum),
    offerte_nummer: tekst(d.offerte_nummer),
    ruimtes: (d.ruimtes || []).map(ruimteVanDict),
    regels: (d.regels || []).map(regelVanDict),
    uurtarief: getal(d.uurtarief, 45.0),
    marge_pct: getal(d.marge_pct, 15.0),
    korting_pct: getal(d.korting_pct, 0.0),
    btw_pct: getal(d.btw_pct, 21.0),
    prijsmodus: tekst(d.prijsmodus) === "m2" ? "m2" : "detail",
    tarieven: {},
    aannemer: tekst(d.aannemer),
    opmerking: tekst(d.opmerking),
  };
  for (const [k, v] of Object.entries(d.tarieven || {})) project.tarieven[String(k)] = getal(v);
  if (project.ruimtes.length && !project.regels.some((r) => r.ruimte_id)) {
    for (const regel of project.regels) regel.ruimte_id = project.ruimtes[0].id;
  }
  return project;
}

/* ---------------- tarieven ---------------- */
class Tarieven {
  constructor(overrides = {}, referentie = {}) {
    this.standaard = {};
    for (const [sleutel, meta] of Object.entries(TARIEVEN)) this.standaard[sleutel] = meta.prijs;
    Object.assign(this.standaard, referentie || {});
    this.waarden = { ...this.standaard };
    for (const [sleutel, waarde] of Object.entries(overrides || {})) {
      if (!(sleutel in this.waarden)) continue;
      const n = parseFloat(String(waarde).replace(",", "."));
      if (Number.isFinite(n)) this.waarden[sleutel] = n;
    }
  }
  prijs(sleutel) { return this.waarden[sleutel] ?? 0.0; }
  meta(sleutel) { return TARIEVEN[sleutel] || {}; }
  naam(sleutel) { return this.meta(sleutel).naam ?? sleutel; }
  eenheid(sleutel) { return this.meta(sleutel).eenheid ?? ""; }
  perEenheid(sleutel) { return this.meta(sleutel).per_eenheid ?? null; }
  overzicht() {
    return Object.entries(TARIEVEN).map(([sleutel, meta]) => ({
      sleutel,
      naam: meta.naam,
      eenheid: meta.eenheid,
      prijs: this.prijs(sleutel),
      standaard: meta.prijs,
      soort: meta.soort ?? "materiaal",
    }));
  }
}

/* ---------------- oppervlakken ---------------- */
export function ruimteOppervlakken(ruimte) {
  if(ruimte.contour?.length || ruimte.dak)return Vorm.surfaces(ruimte);
  const { lengte, breedte, hoogte } = ruimte;
  const perMuur = { noord: { opening: 0, aantal: 0 }, zuid: { opening: 0, aantal: 0 },
                    oost: { opening: 0, aantal: 0 }, west: { opening: 0, aantal: 0 } };
  for (const opening of ruimte.openingen) {
    if (perMuur[opening.muur]) {
      perMuur[opening.muur].opening += opening.breedte * opening.hoogte * Math.max(1, opening.aantal);
      perMuur[opening.muur].aantal += Math.max(1, opening.aantal);
    }
  }
  const vlakken = [];
  const muur = (sleutel, muurlengte) => {
    const bruto = muurlengte * hoogte;
    const opening = perMuur[sleutel].opening;
    vlakken.push({
      sleutel, naam: ZIJDE_NAMEN[sleutel], soort: "muur",
      bruto, opening, netto: Math.max(0, bruto - opening),
      lengte: muurlengte, hoogte, openingen: perMuur[sleutel].aantal,
    });
  };
  muur("noord", lengte); muur("zuid", lengte);
  muur("oost", breedte); muur("west", breedte);
  vlakken.push({
    sleutel: "plafond", naam: ZIJDE_NAMEN.plafond, soort: "plafond",
    bruto: lengte * breedte, opening: 0, netto: lengte * breedte,
    lengte, breedte, hoogte, openingen: 0,
  });
  vlakken.push({
    sleutel: "vloer", naam: ZIJDE_NAMEN.vloer, soort: "vloer",
    bruto: lengte * breedte, opening: 0, netto: lengte * breedte,
    lengte, breedte, hoogte, openingen: 0,
  });
  return vlakken;
}

/* ---------------- materiaal- en taakregels ---------------- */
function materiaal(omschrijving, aantal, sleutel, tarieven, eenheid = null, decimaal = 2) {
  const a = money(Number(aantal), decimaal);
  const eenheidsprijs = tarieven.prijs(sleutel);
  return {
    omschrijving,
    aantal: a,
    eenheid: eenheid || tarieven.eenheid(sleutel),
    prijs_sleutel: sleutel,
    eenheidsprijs,
    totaal: money(a * eenheidsprijs),
    soort: "materiaal",
  };
}

function taak(sleutel, hoeveelheid, tarieven, uurtarief) {
  const urenPerM2 = tarieven.prijs(sleutel);
  const uren = money(urenPerM2 * hoeveelheid);
  return {
    omschrijving: tarieven.naam(sleutel),
    uren_per_m2: urenPerM2,
    uren,
    tarief: uurtarief,
    totaal: money(uren * uurtarief),
    soort: "taak",
  };
}

function platen(ctx, m2, plaatKey) {
  const plaatOpp = ctx.tarieven.perEenheid(plaatKey) || 3.12;
  const stuks = m2 > 0 ? ceil(m2 / plaatOpp) : 0;
  const naam = ctx.tarieven.naam(plaatKey);
  return materiaal(`${naam} · ${m2.toFixed(1)} m²`, stuks, plaatKey, ctx.tarieven, null, 0);
}

function afwerking(ctx, m2Plaat) {
  return [
    materiaal("Schroeven (20/m²)", ceil(m2Plaat * SCHROEVEN_PER_M2 / 1000), "schroef", ctx.tarieven, null, 0),
    materiaal(`Voegband (${TAPE_M_PER_M2} m/m²)`, ceil(m2Plaat * TAPE_M_PER_M2 / 50), "tape", ctx.tarieven, null, 0),
    materiaal(`Voegmiddel (${COMPOUND_KG_PER_M2} kg/m²)`, ceil(m2Plaat * COMPOUND_KG_PER_M2 / 25), "compound", ctx.tarieven, null, 0),
  ];
}

/* ---------------- berekening per werkpakket ---------------- */
function gyprocWandProfiel(ctx) {
  const vlak = ctx.oppervlak, opt = ctx.opties, tar = ctx.tarieven, opp = ctx.aantal;
  if (opp <= 0) return { materiaal: [], taken: [] };
  const zijden = opt.zijden === "2 zijden" ? 2 : 1;
  const plaatKey = PLAAT_KEYS[opt.plaat] || "plaat_gyproc_12_5";
  const profielKey = opt.profiel === "C100" ? "profiel_c100" : "profiel_c75";
  const isolatieKey = ISOLATIE_KEYS[opt.isolatie];
  const muurlengte = vlak.lengte || 0;
  const muurhoogte = vlak.hoogte || 0;
  const aantalOpeningen = vlak.openingen || 0;

  const materiaalRegels = [], taken = [];
  const m2Plaat = opp * zijden * (1 + PLAAT_VERSPILLING);
  materiaalRegels.push(platen(ctx, m2Plaat, plaatKey));

  if (muurlengte > 0 && muurhoogte > 0) {
    const nStuks = ceil(muurlengte / SPOORAFSTAND) + 1 + 2 * aantalOpeningen;
    const profielM = nStuks * muurhoogte * (1 + PROFIEL_VERSPILLING);
    materiaalRegels.push(materiaal(`C-profiel ${opt.profiel || "C75"} · ${nStuks} stuks`,
      ceil(profielM / PROFIEL_LENGTE), profielKey, tar, null, 0));
    materiaalRegels.push(materiaal("U-profiel (vloer)",
      ceil(muurlengte / PROFIEL_LENGTE), "profiel_u25", tar, null, 0));
    materiaalRegels.push(materiaal("Vlakke band (plafond)",
      ceil(muurlengte / PROFIEL_LENGTE), "profiel_vlakband", tar, null, 0));
  }
  if (isolatieKey) {
    materiaalRegels.push(materiaal(`Isolatie · ${opt.isolatie}`,
      opp * (1 + PROFIEL_VERSPILLING), isolatieKey, tar, "m2", 1));
  }
  materiaalRegels.push(...afwerking(ctx, m2Plaat));

  taken.push(taak("uur_wand_opmeten", opp, tar, ctx.uurtarief));
  taken.push(taak("uur_wand_profielen", opp, tar, ctx.uurtarief));
  if (isolatieKey) taken.push(taak("uur_wand_isolatie", opp, tar, ctx.uurtarief));
  taken.push(taak("uur_wand_platen", opp * zijden, tar, ctx.uurtarief));
  taken.push(taak("uur_wand_voegen", opp * zijden, tar, ctx.uurtarief));
  return { materiaal: materiaalRegels, taken };
}

function gyprocPlafond(ctx) {
  const vlak = ctx.oppervlak, opt = ctx.opties, tar = ctx.tarieven, opp = ctx.aantal;
  if (opp <= 0) return { materiaal: [], taken: [] };
  const plaatKey = PLAAT_KEYS[opt.plaat] || "plaat_gyproc_12_5";
  const profielKey = opt.profiel === "C100" ? "profiel_c100" : "profiel_c75";
  const isolatieKey = ISOLATIE_KEYS[opt.isolatie];
  const lengte = vlak.lengte || 0;
  const breedte = vlak.breedte || 0;

  const materiaalRegels = [], taken = [];
  const m2Plaat = opp * (1 + PLAAT_VERSPILLING);
  materiaalRegels.push(platen(ctx, m2Plaat, plaatKey));

  if (lengte > 0 && breedte > 0) {
    const nProfielen = ceil(lengte / SPOORAFSTAND);
    const profielM = nProfielen * breedte * (1 + PROFIEL_VERSPILLING);
    materiaalRegels.push(materiaal(`C-profiel ${opt.profiel || "C75"} · ${nProfielen} profielen`,
      ceil(profielM / PROFIEL_LENGTE), profielKey, tar, null, 0));
    materiaalRegels.push(materiaal("Vlakke band (rondom)",
      ceil(2 * (lengte + breedte) / PROFIEL_LENGTE), "profiel_vlakband", tar, null, 0));
    materiaalRegels.push(materiaal("Veerhangers",
      nProfielen * ceil(breedte / HANGERAFSTAND), "hanghaak", tar, null, 0));
  }
  if (isolatieKey) {
    materiaalRegels.push(materiaal(`Isolatie · ${opt.isolatie}`,
      opp * (1 + PROFIEL_VERSPILLING), isolatieKey, tar, "m2", 1));
  }
  materiaalRegels.push(...afwerking(ctx, m2Plaat));

  taken.push(taak("uur_plafond_ophangen", opp, tar, ctx.uurtarief));
  if (isolatieKey) taken.push(taak("uur_plafond_isolatie", opp, tar, ctx.uurtarief));
  taken.push(taak("uur_plafond_platen", opp, tar, ctx.uurtarief));
  taken.push(taak("uur_plafond_voegen", opp, tar, ctx.uurtarief));
  return { materiaal: materiaalRegels, taken };
}

function gyprocDirect(ctx) {
  const opt = ctx.opties, tar = ctx.tarieven, opp = ctx.aantal;
  if (opp <= 0) return { materiaal: [], taken: [] };
  const plaatKey = PLAAT_KEYS[opt.plaat] || "plaat_ggl_30";
  const m2Plaat = opp * (1 + PLAAT_VERSPILLING);
  const materiaalRegels = [
    platen(ctx, m2Plaat, plaatKey),
    materiaal(`Gipslijm (${LIJM_KG_PER_M2} kg/m²)`, ceil(opp * LIJM_KG_PER_M2 / 25), "lijm", tar, null, 0),
  ];
  materiaalRegels.push(...afwerking(ctx, m2Plaat));
  const taken = [
    taak("uur_direct_platen", opp, tar, ctx.uurtarief),
    taak("uur_direct_voegen", opp, tar, ctx.uurtarief),
  ];
  return { materiaal: materiaalRegels, taken };
}

function gyprocVoegafwerking(ctx) {
  const tar = ctx.tarieven, opp = ctx.aantal;
  if (opp <= 0) return { materiaal: [], taken: [] };
  const materiaalRegels = [
    materiaal(`Voegband (${TAPE_M_PER_M2} m/m²)`, ceil(opp * TAPE_M_PER_M2 / 50), "tape", tar, null, 0),
    materiaal(`Voegmiddel (${COMPOUND_KG_PER_M2} kg/m²)`, ceil(opp * COMPOUND_KG_PER_M2 / 25), "compound", tar, null, 0),
  ];
  return { materiaal: materiaalRegels, taken: [taak("uur_voegafwerking", opp, tar, ctx.uurtarief)] };
}

function schilderenGyproc(ctx) {
  const tar = ctx.tarieven, opp = ctx.aantal;
  if (opp <= 0) return { materiaal: [], taken: [] };
  const materiaalRegels = [
    materiaal("Primer gipsplaten", ceil(opp / 120), "primer", tar, null, 0),
    materiaal("Muurverf · 2 lagen", ceil(2 * opp / 120), "verf", tar, null, 0),
  ];
  return { materiaal: materiaalRegels, taken: [taak("uur_schilderen", opp, tar, ctx.uurtarief)] };
}

const BEREKENERS = {
  gyproc_wand_profiel: gyprocWandProfiel,
  gyproc_plafond: gyprocPlafond,
  gyproc_direct: gyprocDirect,
  gyproc_voegafwerking: gyprocVoegafwerking,
  schilderen_gyproc: schilderenGyproc,
};

for (const pakket of PAKKETTEN) {
  if (!pakket.recept) continue;
  BEREKENERS[pakket.id] = ctx => {
    if (ctx.aantal <= 0) return {materiaal: [], taken: []};
    const key = pakket.recept.materiaal;
    return {
      materiaal: key ? [materiaal(ctx.tarieven.naam(key), ctx.aantal, key, ctx.tarieven)] : [],
      taken: [taak(pakket.recept.arbeid, ctx.aantal, ctx.tarieven, ctx.uurtarief)],
    };
  };
}

/* ---------------- één werkregel ---------------- */
export function standaardOpties(pakketId) {
  const pakket = PAKKET_OP_ID[pakketId] || {};
  const opties = {};
  for (const o of pakket.opties || []) opties[o.id] = o.standaard;
  return opties;
}

function optieLabel(pakket, optieId) {
  for (const optie of pakket.opties || []) if (optie.id === optieId) return optie.label;
  return optieId;
}

export function berekenRegel(regel, vlak, project, tarieven) {
  const pakket = PAKKET_OP_ID[regel.pakket_id];
  if (!pakket) throw new Error(`Onbekend werkpakket: ${regel.pakket_id}`);
  const berekenaar = BEREKENERS[regel.pakket_id];
  if (!berekenaar) throw new Error(`Geen berekening voor werkpakket: ${regel.pakket_id}`);

  const opties = standaardOpties(regel.pakket_id);
  for (const [k, v] of Object.entries(regel.opties || {})) if (v) opties[k] = v;

  let aantal = regel.hoeveelheid !== null && regel.hoeveelheid !== undefined
    ? regel.hoeveelheid : (pakket.eenheid === "m2" ? vlak.netto : 0);
  if (["st", "m"].includes(pakket.eenheid)) {
    aantal = Math.max(0, aantal);
    if (pakket.eenheid === "st") aantal = Math.ceil(aantal);
  }
  const ctx = { oppervlak: vlak, opties, tarieven, aantal, uurtarief: project.uurtarief };
  const { materiaal: materiaalRegels, taken } = berekenaar(ctx);

  const materiaalKosten = money(materiaalRegels.reduce((s, l) => s + l.totaal, 0));
  const uren = money(taken.reduce((s, t) => s + t.uren, 0));
  const arbeidskosten = money(taken.reduce((s, t) => s + t.totaal, 0));
  const marge = money(materiaalKosten * project.marge_pct / 100.0);

  let omschrijving = pakket.naam;
  if (vlak.naam) omschrijving = `${pakket.naam} — ${vlak.naam}`;
  const optieTekst = Object.entries(opties)
    .filter(([, waarde]) => waarde && waarde !== "geen" && waarde !== "1 zijde")
    .map(([id, waarde]) => `${optieLabel(pakket, id)}: ${waarde}`)
    .join(", ");
  if (optieTekst) omschrijving += ` (${optieTekst})`;

  return {
    regel_id: regel.id,
    pakket_id: regel.pakket_id,
    pakket,
    ruimte_id: regel.ruimte_id,
    oppervlak: vlak.sleutel,
    oppervlak_naam: vlak.naam,
    omschrijving,
    opties,
    aantal: money(aantal),
    eenheid: pakket.eenheid || "m2",
    materiaal: materiaalRegels,
    taken,
    uren,
    materiaal_kosten: materiaalKosten,
    arbeidskosten,
    marge,
    totaal: money(materiaalKosten + arbeidskosten + marge),
    notitie: regel.notitie,
  };
}

function berekenM2(regel, vlak, project, tarieven) {
  const pakket = PAKKET_OP_ID[regel.pakket_id];
  const aantal = regel.hoeveelheid !== null && regel.hoeveelheid !== undefined
    ? regel.hoeveelheid : vlak.netto;
  const sleutelM = `m2_${regel.pakket_id}_materiaal`;
  const sleutelA = `m2_${regel.pakket_id}_arbeid`;
  const prijsM = tarieven.prijs(sleutelM);
  const prijsA = tarieven.prijs(sleutelA);

  const materiaalKosten = money(aantal * prijsM);
  const arbeidskosten = money(aantal * prijsA);
  const uren = project.uurtarief ? money(arbeidskosten / project.uurtarief) : 0.0;
  const marge = money(materiaalKosten * project.marge_pct / 100.0);

  return {
    regel_id: regel.id,
    pakket_id: regel.pakket_id,
    pakket,
    ruimte_id: regel.ruimte_id,
    oppervlak: vlak.sleutel,
    oppervlak_naam: vlak.naam,
    omschrijving: `${pakket.naam} — ${vlak.naam} (snelle m²-prijs)`,
    opties: { ...regel.opties },
    aantal: money(aantal),
    eenheid: pakket.eenheid || "m2",
    materiaal: [{
      omschrijving: `Materiaal — ${prijsM.toFixed(2)} €/m²`,
      aantal: money(aantal),
      eenheid: "m2",
      prijs_sleutel: sleutelM,
      eenheidsprijs: prijsM,
      totaal: materiaalKosten,
      soort: "materiaal",
    }],
    taken: [{
      omschrijving: `Arbeid — ${prijsA.toFixed(2)} €/m²`,
      uren_per_m2: project.uurtarief ? money(prijsA / project.uurtarief, 3) : 0.0,
      uren,
      tarief: project.uurtarief,
      totaal: arbeidskosten,
      soort: "taak",
    }],
    uren,
    materiaal_kosten: materiaalKosten,
    arbeidskosten,
    marge,
    totaal: money(materiaalKosten + arbeidskosten + marge),
    notitie: regel.notitie,
  };
}

/* ---------------- referentie (snelle m²-prijzen) ---------------- */
const REFERENTIE_MUUR = {
  sleutel: "noord", naam: ZIJDE_NAMEN.noord, soort: "muur",
  bruto: 10.0, opening: 1.6, netto: 8.4, lengte: 4.0, hoogte: 2.5, openingen: 1,
};
const REFERENTIE_PLAFOND = {
  sleutel: "plafond", naam: ZIJDE_NAMEN.plafond, soort: "plafond",
  bruto: 12.0, opening: 0.0, netto: 12.0, lengte: 4.0, breedte: 3.0, hoogte: 2.5, openingen: 0,
};

export function referentieTarieven() {
  const tarieven = new Tarieven();
  const referentie = {};
  for (const pakketId of Object.keys(BEREKENERS)) {
    if (PAKKET_OP_ID[pakketId].eenheid !== "m2") continue;
    const vlak = pakketId === "gyproc_plafond" ? REFERENTIE_PLAFOND : REFERENTIE_MUUR;
    const ctx = {
      oppervlak: vlak,
      opties: standaardOpties(pakketId),
      tarieven,
      aantal: vlak.netto,
      uurtarief: 45.0,
    };
    const { materiaal, taken } = BEREKENERS[pakketId](ctx);
    const materiaalKosten = materiaal.reduce((s, l) => s + l.totaal, 0);
    const arbeidskosten = taken.reduce((s, t) => s + t.totaal, 0);
    referentie[`m2_${pakketId}_materiaal`] = money(materiaalKosten / vlak.netto);
    referentie[`m2_${pakketId}_arbeid`] = money(arbeidskosten / vlak.netto);
  }
  return referentie;
}

/* ---------------- de offerte ---------------- */
function tarievenOverzicht(tarieven, referentie) {
  const overzicht = tarieven.overzicht();
  for (const [pakketId, pakket] of Object.entries(PAKKET_OP_ID)) {
    if (pakket.eenheid !== "m2") continue;
    const sleutelM = `m2_${pakketId}_materiaal`;
    const sleutelA = `m2_${pakketId}_arbeid`;
    overzicht.push({
      sleutel: sleutelM,
      naam: `Snel ${pakket.naam} · materiaal`,
      eenheid: "€/m2",
      prijs: tarieven.prijs(sleutelM),
      standaard: referentie[sleutelM] ?? 0.0,
      soort: "m2",
    });
    overzicht.push({
      sleutel: sleutelA,
      naam: `Snel ${pakket.naam} · arbeid`,
      eenheid: "€/m2",
      prijs: tarieven.prijs(sleutelA),
      standaard: referentie[sleutelA] ?? 0.0,
      soort: "m2",
    });
  }
  return overzicht;
}

export function berekenOfferte(projectData = {}) {
  const project = projectVanDict(projectData);
  const referentie = referentieTarieven();
  const tarieven = new Tarieven(project.tarieven, referentie);

  const ruimtes = [];
  const vlakkenPerRuimte = {};
  for (const ruimte of project.ruimtes) {
    const vlakken = ruimteOppervlakken(ruimte);
    vlakkenPerRuimte[ruimte.id] = vlakken;
    ruimtes.push({
      id: ruimte.id,
      naam: ruimte.naam,
      lengte: ruimte.lengte,
      breedte: ruimte.breedte,
      hoogte: ruimte.hoogte,
      openingen: ruimte.openingen.map((o) => ({ ...o })),
      vlakken,
      wandoppervlak: money(vlakken.filter((v) => v.soort === "muur")
        .reduce((s, v) => s + v.netto, 0)),
    });
  }

  const regels = [];
  const waarschuwingen = [];
  for (const regel of project.regels) {
    const ruimte = project.ruimtes.find((r) => r.id === regel.ruimte_id);
    if (!ruimte) {
      waarschuwingen.push(`Werkregel '${regel.id}' hoort bij een onbekende ruimte en is overgeslagen.`);
      continue;
    }
    const vlak = (vlakkenPerRuimte[ruimte.id] || []).find((v) => v.sleutel === regel.oppervlak);
    if (!vlak) {
      waarschuwingen.push(`Werkregel '${regel.id}' hoort bij een onbekend vlak (${regel.oppervlak}) en is overgeslagen.`);
      continue;
    }
    if (!PAKKET_OP_ID[regel.pakket_id] || !BEREKENERS[regel.pakket_id]) {
      waarschuwingen.push(`Werkpakket '${regel.pakket_id}' bestaat niet meer en is overgeslagen.`);
      continue;
    }
    regels.push(project.prijsmodus === "m2" && PAKKET_OP_ID[regel.pakket_id].eenheid === "m2"
      ? berekenM2(regel, vlak, project, tarieven)
      : berekenRegel(regel, vlak, project, tarieven));
  }

  if(project.ruimtes.some(r=>r.contour.length||r.dak))waarschuwingen.push('Ruimtevorm: binnenmaten; oppervlakken volgen de contour en plafondhelling. Profielen en snijverlies blijven ramingsnormen, geen zaag- of uitvoeringsplan. Controleer objectplaatsing en openingen.');
  for(const ruimte of project.ruimtes)for(const opening of ruimte.openingen){if(!vlakkenPerRuimte[ruimte.id].some(v=>v.sleutel===opening.muur))waarschuwingen.push(`Opening '${opening.naam}' hoort bij een onbekende wand en is niet afgetrokken.`);}
  if (regels.some(r => r.pakket.categorie === "Elektriciteit")) {
    waarschuwingen.push("Elektriciteit: indicatieve raming. Kabel, sleuf en aansluitpunten apart tellen. Zonder verdeelkast, keuring, schema’s of conformiteitscontrole; laat ontwerp en uitvoering door een vakbekwaam elektricien beoordelen.");
  }
  if (regels.some(r => r.pakket.categorie === "Sanitair & water")) {
    waarschuwingen.push('Sanitair & water: indicatieve raming. Leidingen, hulpstukken en toestellen apart tellen. Zonder breekwerk, waterdichting, rioleringsaansluiting of officiële keuring. Geen dimensionerings- of drinkwaterconformiteitscontrole; laat ontwerp en uitvoering door een vakbekwaam installateur beoordelen.');
  }
  const materiaal = money(regels.reduce((s, r) => s + r.materiaal_kosten, 0));
  const arbeid = money(regels.reduce((s, r) => s + r.arbeidskosten, 0));
  const uren = money(regels.reduce((s, r) => s + r.uren, 0));
  const marge = money(regels.reduce((s, r) => s + r.marge, 0));
  const subtotaal = money(materiaal + arbeid + marge);
  const korting = money(subtotaal * project.korting_pct / 100.0);
  const netto = money(subtotaal - korting);
  const btw = money(netto * project.btw_pct / 100.0);
  const totaal = money(netto + btw);

  const perRuimte = {};
  for (const regel of regels) {
    const rij = perRuimte[regel.ruimte_id] || (perRuimte[regel.ruimte_id] = {
      materiaal: 0, arbeid: 0, uren: 0, marge: 0, totaal: 0,
    });
    rij.materiaal += regel.materiaal_kosten;
    rij.arbeid += regel.arbeidskosten;
    rij.uren += regel.uren;
    rij.marge += regel.marge;
    rij.totaal += regel.totaal;
  }
  for (const rij of Object.values(perRuimte)) {
    for (const sleutel of Object.keys(rij)) rij[sleutel] = money(rij[sleutel]);
  }

  return {
    project: {
      naam: project.naam, klant: project.klant, adres: project.adres,
      datum: project.datum, offerte_nummer: project.offerte_nummer,
      ruimtes: project.ruimtes.map((r) => ({
        id: r.id, naam: r.naam, lengte: r.lengte, breedte: r.breedte, hoogte: r.hoogte,
        contour:r.contour.map(p=>({...p})),dak:r.dak?{...r.dak}:null,
        openingen: r.openingen.map((o) => ({
          naam: o.naam, muur: o.muur, breedte: o.breedte, hoogte: o.hoogte, aantal: o.aantal,
          positie: o.positie, borstwering: o.borstwering,
        })),
      })),
      regels: project.regels.map((r) => ({
        id: r.id, ruimte_id: r.ruimte_id, oppervlak: r.oppervlak, pakket_id: r.pakket_id,
        opties: { ...r.opties }, hoeveelheid: r.hoeveelheid, notitie: r.notitie, visualisatie: {...r.visualisatie},
      })),
      uurtarief: project.uurtarief, marge_pct: project.marge_pct,
      korting_pct: project.korting_pct, btw_pct: project.btw_pct,
      prijsmodus: project.prijsmodus, tarieven: { ...project.tarieven },
      aannemer: project.aannemer, opmerking: project.opmerking,
    },
    ruimtes,
    regels,
    totalen: {
      materiaal, arbeid, uren, marge, subtotaal,
      korting_pct: project.korting_pct, korting, btw_pct: project.btw_pct, btw, netto, totaal,
    },
    per_ruimte: perRuimte,
    waarschuwingen,
    tarieven: tarievenOverzicht(tarieven, referentie),
    pakketten: PAKKETTEN,
  };
}

export function prijsboek() {
  const referentie = referentieTarieven();
  return {
    tarieven: new Tarieven({}, referentie).overzicht(),
    pakketten: PAKKETTEN,
    referentie,
    versie: "1.0.0",
  };
}

// In de browser ook beschikbaar als window.BouwEngine, zodat de app kan
// terugvallen op de lokale rekenkern als er geen API bereikbaar is.
if (typeof window !== "undefined") {
  window.BouwEngine = { berekenOfferte, berekenRegel, prijsboek, referentieTarieven, money };
}
