var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// bouwcalculator/web/prijsboek.js
var TARIEVEN = {
  "plaat_gyproc_12_5": {
    "naam": "Gyproc gipsplaat 12,5 mm \xB7 1200\xD72600",
    "eenheid": "st",
    "prijs": 9.5,
    "soort": "materiaal",
    "per_eenheid": 3.12,
    "per_eenheid_eenheid": "m2"
  },
  "plaat_gyproc_15": {
    "naam": "Gyproc gipsplaat 15 mm \xB7 1200\xD72600",
    "eenheid": "st",
    "prijs": 12,
    "soort": "materiaal",
    "per_eenheid": 3.12,
    "per_eenheid_eenheid": "m2"
  },
  "plaat_ggl_30": {
    "naam": "Gyproc GGL 30 mm (ge\xEFsoleerd) \xB7 1200\xD72400",
    "eenheid": "st",
    "prijs": 24,
    "soort": "materiaal",
    "per_eenheid": 2.88,
    "per_eenheid_eenheid": "m2"
  },
  "profiel_c75": {
    "naam": "C-profiel 75 mm \xB7 3 m",
    "eenheid": "st",
    "prijs": 3.6,
    "soort": "materiaal",
    "per_eenheid": 3,
    "per_eenheid_eenheid": "m"
  },
  "profiel_c100": {
    "naam": "C-profiel 100 mm \xB7 3 m",
    "eenheid": "st",
    "prijs": 4.8,
    "soort": "materiaal",
    "per_eenheid": 3,
    "per_eenheid_eenheid": "m"
  },
  "profiel_u25": {
    "naam": "U-profiel 25 mm (vloerprofiel) \xB7 3 m",
    "eenheid": "st",
    "prijs": 1.9,
    "soort": "materiaal",
    "per_eenheid": 3,
    "per_eenheid_eenheid": "m"
  },
  "profiel_vlakband": {
    "naam": "Vlakke band 27 mm \xB7 3 m",
    "eenheid": "st",
    "prijs": 2.2,
    "soort": "materiaal",
    "per_eenheid": 3,
    "per_eenheid_eenheid": "m"
  },
  "hanghaak": {
    "naam": "Veerhanger / plafondhanger",
    "eenheid": "st",
    "prijs": 1.4,
    "soort": "materiaal"
  },
  "schroef": {
    "naam": "Gyproc schroef 3,5\xD725 mm \xB7 doos 1000",
    "eenheid": "doos",
    "prijs": 11,
    "soort": "materiaal",
    "per_eenheid": 1e3,
    "per_eenheid_eenheid": "st"
  },
  "tape": {
    "naam": "Voegband \xB7 rol 50 m",
    "eenheid": "rol",
    "prijs": 8.5,
    "soort": "materiaal",
    "per_eenheid": 50,
    "per_eenheid_eenheid": "m"
  },
  "compound": {
    "naam": "Voegmiddel (Ready-mix) \xB7 emmer 25 kg",
    "eenheid": "emmer",
    "prijs": 26,
    "soort": "materiaal",
    "per_eenheid": 25,
    "per_eenheid_eenheid": "kg"
  },
  "lijm": {
    "naam": "Gipslijm \xB7 zak 25 kg",
    "eenheid": "zak",
    "prijs": 18,
    "soort": "materiaal",
    "per_eenheid": 25,
    "per_eenheid_eenheid": "kg"
  },
  "isolatie_wol": {
    "naam": "Mineralen wol 75 mm",
    "eenheid": "m2",
    "prijs": 12.5,
    "soort": "materiaal"
  },
  "isolatie_pir": {
    "naam": "PIR-isolatieplaat 60 mm",
    "eenheid": "m2",
    "prijs": 21,
    "soort": "materiaal"
  },
  "primer": {
    "naam": "Primer voor gipsplaten \xB7 10 L",
    "eenheid": "emmer",
    "prijs": 42,
    "soort": "materiaal",
    "per_eenheid": 120,
    "per_eenheid_eenheid": "m2"
  },
  "verf": {
    "naam": "Muurverf \xB7 10 L",
    "eenheid": "emmer",
    "prijs": 55,
    "soort": "materiaal",
    "per_eenheid": 120,
    "per_eenheid_eenheid": "m2"
  },
  "uur_wand_opmeten": {
    "naam": "Wand: opmeten en uitsetten",
    "eenheid": "uur/m2",
    "prijs": 0.05,
    "soort": "taak"
  },
  "uur_wand_profielen": {
    "naam": "Wand: profielen plaatsen",
    "eenheid": "uur/m2",
    "prijs": 0.3,
    "soort": "taak"
  },
  "uur_wand_isolatie": {
    "naam": "Wand: isolatie plaatsen",
    "eenheid": "uur/m2",
    "prijs": 0.1,
    "soort": "taak"
  },
  "uur_wand_platen": {
    "naam": "Wand: platen bevestigen",
    "eenheid": "uur/m2",
    "prijs": 0.22,
    "soort": "taak"
  },
  "uur_wand_voegen": {
    "naam": "Wand: voegen en afwerken",
    "eenheid": "uur/m2",
    "prijs": 0.3,
    "soort": "taak"
  },
  "uur_plafond_ophangen": {
    "naam": "Plafond: profielen ophangen",
    "eenheid": "uur/m2",
    "prijs": 0.35,
    "soort": "taak"
  },
  "uur_plafond_isolatie": {
    "naam": "Plafond: isolatie plaatsen",
    "eenheid": "uur/m2",
    "prijs": 0.08,
    "soort": "taak"
  },
  "uur_plafond_platen": {
    "naam": "Plafond: platen bevestigen",
    "eenheid": "uur/m2",
    "prijs": 0.25,
    "soort": "taak"
  },
  "uur_plafond_voegen": {
    "naam": "Plafond: voegen en afwerken",
    "eenheid": "uur/m2",
    "prijs": 0.3,
    "soort": "taak"
  },
  "uur_direct_platen": {
    "naam": "Direct: platen verlijmen",
    "eenheid": "uur/m2",
    "prijs": 0.3,
    "soort": "taak"
  },
  "uur_direct_voegen": {
    "naam": "Direct: voegen en afwerken",
    "eenheid": "uur/m2",
    "prijs": 0.3,
    "soort": "taak"
  },
  "uur_voegafwerking": {
    "naam": "Alleen voegen en afwerken",
    "eenheid": "uur/m2",
    "prijs": 0.45,
    "soort": "taak"
  },
  "uur_schilderen": {
    "naam": "Schilderen: primer + 2 lagen",
    "eenheid": "uur/m2",
    "prijs": 0.35,
    "soort": "taak"
  }
};
var PAKKETTEN = [
  {
    "id": "gyproc_wand_profiel",
    "naam": "Gyproc wand op metaalprofiel",
    "categorie": "Gyproc wanden",
    "eenheid": "m2",
    "beschrijving": "C-profiel, optioneel isolatie, gipsplaten, voegafwerking.",
    "opties": [
      {
        "id": "zijden",
        "label": "Beplanking",
        "keuzes": [
          "1 zijde",
          "2 zijden"
        ],
        "standaard": "1 zijde"
      },
      {
        "id": "plaat",
        "label": "Gipsplaat",
        "keuzes": [
          "12,5 mm",
          "15 mm",
          "GGL 30 mm"
        ],
        "standaard": "12,5 mm"
      },
      {
        "id": "profiel",
        "label": "Profiel",
        "keuzes": [
          "C75",
          "C100"
        ],
        "standaard": "C75"
      },
      {
        "id": "isolatie",
        "label": "Isolatie",
        "keuzes": [
          "geen",
          "mineralen wol 75 mm",
          "PIR 60 mm"
        ],
        "standaard": "geen"
      }
    ]
  },
  {
    "id": "gyproc_plafond",
    "naam": "Gyproc plafond op profielen",
    "categorie": "Gyproc plafonds",
    "eenheid": "m2",
    "beschrijving": "Ophangen profielen met veerhangers, isolatie, gipsplaten, voegafwerking.",
    "opties": [
      {
        "id": "plaat",
        "label": "Gipsplaat",
        "keuzes": [
          "12,5 mm",
          "15 mm"
        ],
        "standaard": "12,5 mm"
      },
      {
        "id": "profiel",
        "label": "Profiel",
        "keuzes": [
          "C75",
          "C100"
        ],
        "standaard": "C75"
      },
      {
        "id": "isolatie",
        "label": "Isolatie",
        "keuzes": [
          "geen",
          "mineralen wol 75 mm"
        ],
        "standaard": "geen"
      }
    ]
  },
  {
    "id": "gyproc_direct",
    "naam": "Gyproc direct op metswerk (verlijmd)",
    "categorie": "Gyproc wanden",
    "eenheid": "m2",
    "beschrijving": "Gipsplaten met gipslijm op bestaand metswerk, voegafwerking.",
    "opties": [
      {
        "id": "plaat",
        "label": "Gipsplaat",
        "keuzes": [
          "GGL 30 mm",
          "12,5 mm"
        ],
        "standaard": "GGL 30 mm"
      }
    ]
  },
  {
    "id": "gyproc_voegafwerking",
    "naam": "Alleen voegen & afwerken Gyproc",
    "categorie": "Gyproc afwerking",
    "eenheid": "m2",
    "beschrijving": "Voegband, voegmiddel en schuren op bestaande gipsplaten.",
    "opties": []
  },
  {
    "id": "schilderen_gyproc",
    "naam": "Schilderen op gipsplaat",
    "categorie": "Afwerking",
    "eenheid": "m2",
    "beschrijving": "Primer plus twee lagen muurverf.",
    "opties": []
  }
];
var PAKKET_OP_ID = Object.fromEntries(PAKKETTEN.map((p) => [p.id, p]));

// bouwcalculator/web/engine.js
var SPOORAFSTAND = 0.4;
var HANGERAFSTAND = 0.8;
var PLAAT_VERSPILLING = 0.1;
var PROFIEL_VERSPILLING = 0.05;
var SCHROEVEN_PER_M2 = 20;
var TAPE_M_PER_M2 = 1.4;
var COMPOUND_KG_PER_M2 = 0.5;
var LIJM_KG_PER_M2 = 0.4;
var PROFIEL_LENGTE = 3;
var MUURZIJDEN = ["noord", "zuid", "oost", "west"];
var ZIJDE_NAMEN = {
  noord: "Wand noord",
  zuid: "Wand zuid",
  oost: "Wand oost",
  west: "Wand west",
  plafond: "Plafond",
  vloer: "Vloer"
};
var PLAAT_KEYS = {
  "12,5 mm": "plaat_gyproc_12_5",
  "15 mm": "plaat_gyproc_15",
  "GGL 30 mm": "plaat_ggl_30"
};
var ISOLATIE_KEYS = {
  "mineralen wol 75 mm": "isolatie_wol",
  "PIR 60 mm": "isolatie_pir"
};
function money(waarde, decimalen = 2) {
  const factor = 10 ** decimalen;
  const afgerond = Math.floor(Math.abs(waarde) * factor + 0.5) / factor;
  return waarde < 0 ? -afgerond : afgerond;
}
__name(money, "money");
var ceil = /* @__PURE__ */ __name((x) => Math.ceil(x - 1e-9), "ceil");
function getal(waarde, standaard = 0) {
  const n = parseFloat(String(waarde ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : standaard;
}
__name(getal, "getal");
function tekst(waarde, standaard = "") {
  if (waarde === null || waarde === void 0) return standaard;
  return String(waarde);
}
__name(tekst, "tekst");
function openingVanDict(d = {}) {
  let muur = tekst(d.muur, "noord").toLowerCase();
  if (!MUURZIJDEN.includes(muur)) muur = "noord";
  const aantal = Math.trunc(getal(d.aantal, 1)) || 1;
  return {
    naam: tekst(d.naam, "Deur") || "Deur",
    muur,
    breedte: getal(d.breedte, 0.9),
    hoogte: getal(d.hoogte, 2.1),
    aantal
  };
}
__name(openingVanDict, "openingVanDict");
function ruimteVanDict(d = {}) {
  return {
    id: tekst(d.id) || Math.random().toString(36).slice(2, 10),
    naam: tekst(d.naam, "Ruimte") || "Ruimte",
    lengte: getal(d.lengte, 4),
    breedte: getal(d.breedte, 3),
    hoogte: getal(d.hoogte, 2.5),
    openingen: (d.openingen || []).map(openingVanDict)
  };
}
__name(ruimteVanDict, "ruimteVanDict");
function regelVanDict(d = {}) {
  let hoeveelheid = d.hoeveelheid;
  if (hoeveelheid === null || hoeveelheid === void 0 || hoeveelheid === "") {
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
    notitie: tekst(d.notitie)
  };
}
__name(regelVanDict, "regelVanDict");
function projectVanDict(d = {}) {
  const project = {
    naam: tekst(d.naam, "Nieuwe offerte") || "Nieuwe offerte",
    klant: tekst(d.klant),
    adres: tekst(d.adres),
    datum: tekst(d.datum),
    offerte_nummer: tekst(d.offerte_nummer),
    ruimtes: (d.ruimtes || []).map(ruimteVanDict),
    regels: (d.regels || []).map(regelVanDict),
    uurtarief: getal(d.uurtarief, 45),
    marge_pct: getal(d.marge_pct, 15),
    korting_pct: getal(d.korting_pct, 0),
    btw_pct: getal(d.btw_pct, 21),
    prijsmodus: tekst(d.prijsmodus) === "m2" ? "m2" : "detail",
    tarieven: {},
    aannemer: tekst(d.aannemer),
    opmerking: tekst(d.opmerking)
  };
  for (const [k, v] of Object.entries(d.tarieven || {})) project.tarieven[String(k)] = getal(v);
  if (project.ruimtes.length && !project.regels.some((r) => r.ruimte_id)) {
    for (const regel of project.regels) regel.ruimte_id = project.ruimtes[0].id;
  }
  return project;
}
__name(projectVanDict, "projectVanDict");
var Tarieven = class {
  static {
    __name(this, "Tarieven");
  }
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
  prijs(sleutel) {
    return this.waarden[sleutel] ?? 0;
  }
  meta(sleutel) {
    return TARIEVEN[sleutel] || {};
  }
  naam(sleutel) {
    return this.meta(sleutel).naam ?? sleutel;
  }
  eenheid(sleutel) {
    return this.meta(sleutel).eenheid ?? "";
  }
  perEenheid(sleutel) {
    return this.meta(sleutel).per_eenheid ?? null;
  }
  overzicht() {
    return Object.entries(TARIEVEN).map(([sleutel, meta]) => ({
      sleutel,
      naam: meta.naam,
      eenheid: meta.eenheid,
      prijs: this.prijs(sleutel),
      standaard: meta.prijs,
      soort: meta.soort ?? "materiaal"
    }));
  }
};
function ruimteOppervlakken(ruimte) {
  const { lengte, breedte, hoogte } = ruimte;
  const perMuur = {
    noord: { opening: 0, aantal: 0 },
    zuid: { opening: 0, aantal: 0 },
    oost: { opening: 0, aantal: 0 },
    west: { opening: 0, aantal: 0 }
  };
  for (const opening of ruimte.openingen) {
    if (perMuur[opening.muur]) {
      perMuur[opening.muur].opening += opening.breedte * opening.hoogte * Math.max(1, opening.aantal);
      perMuur[opening.muur].aantal += Math.max(1, opening.aantal);
    }
  }
  const vlakken = [];
  const muur = /* @__PURE__ */ __name((sleutel, muurlengte) => {
    const bruto = muurlengte * hoogte;
    const opening = perMuur[sleutel].opening;
    vlakken.push({
      sleutel,
      naam: ZIJDE_NAMEN[sleutel],
      soort: "muur",
      bruto,
      opening,
      netto: Math.max(0, bruto - opening),
      lengte: muurlengte,
      hoogte,
      openingen: perMuur[sleutel].aantal
    });
  }, "muur");
  muur("noord", lengte);
  muur("zuid", lengte);
  muur("oost", breedte);
  muur("west", breedte);
  vlakken.push({
    sleutel: "plafond",
    naam: ZIJDE_NAMEN.plafond,
    soort: "plafond",
    bruto: lengte * breedte,
    opening: 0,
    netto: lengte * breedte,
    lengte,
    breedte,
    hoogte,
    openingen: 0
  });
  vlakken.push({
    sleutel: "vloer",
    naam: ZIJDE_NAMEN.vloer,
    soort: "vloer",
    bruto: lengte * breedte,
    opening: 0,
    netto: lengte * breedte,
    lengte,
    breedte,
    hoogte,
    openingen: 0
  });
  return vlakken;
}
__name(ruimteOppervlakken, "ruimteOppervlakken");
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
    soort: "materiaal"
  };
}
__name(materiaal, "materiaal");
function taak(sleutel, hoeveelheid, tarieven, uurtarief) {
  const urenPerM2 = tarieven.prijs(sleutel);
  const uren = money(urenPerM2 * hoeveelheid);
  return {
    omschrijving: tarieven.naam(sleutel),
    uren_per_m2: urenPerM2,
    uren,
    tarief: uurtarief,
    totaal: money(uren * uurtarief),
    soort: "taak"
  };
}
__name(taak, "taak");
function platen(ctx, m2, plaatKey) {
  const plaatOpp = ctx.tarieven.perEenheid(plaatKey) || 3.12;
  const stuks = m2 > 0 ? ceil(m2 / plaatOpp) : 0;
  const naam = ctx.tarieven.naam(plaatKey);
  return materiaal(`${naam} \xB7 ${m2.toFixed(1)} m\xB2`, stuks, plaatKey, ctx.tarieven, null, 0);
}
__name(platen, "platen");
function afwerking(ctx, m2Plaat) {
  return [
    materiaal("Schroeven (20/m\xB2)", ceil(m2Plaat * SCHROEVEN_PER_M2 / 1e3), "schroef", ctx.tarieven, null, 0),
    materiaal(`Voegband (${TAPE_M_PER_M2} m/m\xB2)`, ceil(m2Plaat * TAPE_M_PER_M2 / 50), "tape", ctx.tarieven, null, 0),
    materiaal(`Voegmiddel (${COMPOUND_KG_PER_M2} kg/m\xB2)`, ceil(m2Plaat * COMPOUND_KG_PER_M2 / 25), "compound", ctx.tarieven, null, 0)
  ];
}
__name(afwerking, "afwerking");
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
    materiaalRegels.push(materiaal(
      `C-profiel ${opt.profiel || "C75"} \xB7 ${nStuks} stuks`,
      ceil(profielM / PROFIEL_LENGTE),
      profielKey,
      tar,
      null,
      0
    ));
    materiaalRegels.push(materiaal(
      "U-profiel (vloer)",
      ceil(muurlengte / PROFIEL_LENGTE),
      "profiel_u25",
      tar,
      null,
      0
    ));
    materiaalRegels.push(materiaal(
      "Vlakke band (plafond)",
      ceil(muurlengte / PROFIEL_LENGTE),
      "profiel_vlakband",
      tar,
      null,
      0
    ));
  }
  if (isolatieKey) {
    materiaalRegels.push(materiaal(
      `Isolatie \xB7 ${opt.isolatie}`,
      opp * (1 + PROFIEL_VERSPILLING),
      isolatieKey,
      tar,
      "m2",
      1
    ));
  }
  materiaalRegels.push(...afwerking(ctx, m2Plaat));
  taken.push(taak("uur_wand_opmeten", opp, tar, ctx.uurtarief));
  taken.push(taak("uur_wand_profielen", opp, tar, ctx.uurtarief));
  if (isolatieKey) taken.push(taak("uur_wand_isolatie", opp, tar, ctx.uurtarief));
  taken.push(taak("uur_wand_platen", opp * zijden, tar, ctx.uurtarief));
  taken.push(taak("uur_wand_voegen", opp * zijden, tar, ctx.uurtarief));
  return { materiaal: materiaalRegels, taken };
}
__name(gyprocWandProfiel, "gyprocWandProfiel");
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
    materiaalRegels.push(materiaal(
      `C-profiel ${opt.profiel || "C75"} \xB7 ${nProfielen} profielen`,
      ceil(profielM / PROFIEL_LENGTE),
      profielKey,
      tar,
      null,
      0
    ));
    materiaalRegels.push(materiaal(
      "Vlakke band (rondom)",
      ceil(2 * (lengte + breedte) / PROFIEL_LENGTE),
      "profiel_vlakband",
      tar,
      null,
      0
    ));
    materiaalRegels.push(materiaal(
      "Veerhangers",
      nProfielen * ceil(breedte / HANGERAFSTAND),
      "hanghaak",
      tar,
      null,
      0
    ));
  }
  if (isolatieKey) {
    materiaalRegels.push(materiaal(
      `Isolatie \xB7 ${opt.isolatie}`,
      opp * (1 + PROFIEL_VERSPILLING),
      isolatieKey,
      tar,
      "m2",
      1
    ));
  }
  materiaalRegels.push(...afwerking(ctx, m2Plaat));
  taken.push(taak("uur_plafond_ophangen", opp, tar, ctx.uurtarief));
  if (isolatieKey) taken.push(taak("uur_plafond_isolatie", opp, tar, ctx.uurtarief));
  taken.push(taak("uur_plafond_platen", opp, tar, ctx.uurtarief));
  taken.push(taak("uur_plafond_voegen", opp, tar, ctx.uurtarief));
  return { materiaal: materiaalRegels, taken };
}
__name(gyprocPlafond, "gyprocPlafond");
function gyprocDirect(ctx) {
  const opt = ctx.opties, tar = ctx.tarieven, opp = ctx.aantal;
  if (opp <= 0) return { materiaal: [], taken: [] };
  const plaatKey = PLAAT_KEYS[opt.plaat] || "plaat_ggl_30";
  const m2Plaat = opp * (1 + PLAAT_VERSPILLING);
  const materiaalRegels = [
    platen(ctx, m2Plaat, plaatKey),
    materiaal(`Gipslijm (${LIJM_KG_PER_M2} kg/m\xB2)`, ceil(opp * LIJM_KG_PER_M2 / 25), "lijm", tar, null, 0)
  ];
  materiaalRegels.push(...afwerking(ctx, m2Plaat));
  const taken = [
    taak("uur_direct_platen", opp, tar, ctx.uurtarief),
    taak("uur_direct_voegen", opp, tar, ctx.uurtarief)
  ];
  return { materiaal: materiaalRegels, taken };
}
__name(gyprocDirect, "gyprocDirect");
function gyprocVoegafwerking(ctx) {
  const tar = ctx.tarieven, opp = ctx.aantal;
  if (opp <= 0) return { materiaal: [], taken: [] };
  const materiaalRegels = [
    materiaal(`Voegband (${TAPE_M_PER_M2} m/m\xB2)`, ceil(opp * TAPE_M_PER_M2 / 50), "tape", tar, null, 0),
    materiaal(`Voegmiddel (${COMPOUND_KG_PER_M2} kg/m\xB2)`, ceil(opp * COMPOUND_KG_PER_M2 / 25), "compound", tar, null, 0)
  ];
  return { materiaal: materiaalRegels, taken: [taak("uur_voegafwerking", opp, tar, ctx.uurtarief)] };
}
__name(gyprocVoegafwerking, "gyprocVoegafwerking");
function schilderenGyproc(ctx) {
  const tar = ctx.tarieven, opp = ctx.aantal;
  if (opp <= 0) return { materiaal: [], taken: [] };
  const materiaalRegels = [
    materiaal("Primer gipsplaten", ceil(opp / 120), "primer", tar, null, 0),
    materiaal("Muurverf \xB7 2 lagen", ceil(2 * opp / 120), "verf", tar, null, 0)
  ];
  return { materiaal: materiaalRegels, taken: [taak("uur_schilderen", opp, tar, ctx.uurtarief)] };
}
__name(schilderenGyproc, "schilderenGyproc");
var BEREKENERS = {
  gyproc_wand_profiel: gyprocWandProfiel,
  gyproc_plafond: gyprocPlafond,
  gyproc_direct: gyprocDirect,
  gyproc_voegafwerking: gyprocVoegafwerking,
  schilderen_gyproc: schilderenGyproc
};
function standaardOpties(pakketId) {
  const pakket = PAKKET_OP_ID[pakketId] || {};
  const opties = {};
  for (const o of pakket.opties || []) opties[o.id] = o.standaard;
  return opties;
}
__name(standaardOpties, "standaardOpties");
function optieLabel(pakket, optieId) {
  for (const optie of pakket.opties || []) if (optie.id === optieId) return optie.label;
  return optieId;
}
__name(optieLabel, "optieLabel");
function berekenRegel(regel, vlak, project, tarieven) {
  const pakket = PAKKET_OP_ID[regel.pakket_id];
  if (!pakket) throw new Error(`Onbekend werkpakket: ${regel.pakket_id}`);
  const berekenaar = BEREKENERS[regel.pakket_id];
  if (!berekenaar) throw new Error(`Geen berekening voor werkpakket: ${regel.pakket_id}`);
  const opties = standaardOpties(regel.pakket_id);
  for (const [k, v] of Object.entries(regel.opties || {})) if (v) opties[k] = v;
  const aantal = regel.hoeveelheid !== null && regel.hoeveelheid !== void 0 ? regel.hoeveelheid : vlak.netto;
  const ctx = { oppervlak: vlak, opties, tarieven, aantal, uurtarief: project.uurtarief };
  const { materiaal: materiaalRegels, taken } = berekenaar(ctx);
  const materiaalKosten = money(materiaalRegels.reduce((s, l) => s + l.totaal, 0));
  const uren = money(taken.reduce((s, t) => s + t.uren, 0));
  const arbeidskosten = money(taken.reduce((s, t) => s + t.totaal, 0));
  const marge = money(materiaalKosten * project.marge_pct / 100);
  let omschrijving = pakket.naam;
  if (vlak.naam) omschrijving = `${pakket.naam} \u2014 ${vlak.naam}`;
  const optieTekst = Object.entries(opties).filter(([, waarde]) => waarde && waarde !== "geen" && waarde !== "1 zijde").map(([id, waarde]) => `${optieLabel(pakket, id)}: ${waarde}`).join(", ");
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
    notitie: regel.notitie
  };
}
__name(berekenRegel, "berekenRegel");
function berekenM2(regel, vlak, project, tarieven) {
  const pakket = PAKKET_OP_ID[regel.pakket_id];
  const aantal = regel.hoeveelheid !== null && regel.hoeveelheid !== void 0 ? regel.hoeveelheid : vlak.netto;
  const sleutelM = `m2_${regel.pakket_id}_materiaal`;
  const sleutelA = `m2_${regel.pakket_id}_arbeid`;
  const prijsM = tarieven.prijs(sleutelM);
  const prijsA = tarieven.prijs(sleutelA);
  const materiaalKosten = money(aantal * prijsM);
  const arbeidskosten = money(aantal * prijsA);
  const uren = project.uurtarief ? money(arbeidskosten / project.uurtarief) : 0;
  const marge = money(materiaalKosten * project.marge_pct / 100);
  return {
    regel_id: regel.id,
    pakket_id: regel.pakket_id,
    pakket,
    ruimte_id: regel.ruimte_id,
    oppervlak: vlak.sleutel,
    oppervlak_naam: vlak.naam,
    omschrijving: `${pakket.naam} \u2014 ${vlak.naam} (snelle m\xB2-prijs)`,
    opties: { ...regel.opties },
    aantal: money(aantal),
    eenheid: pakket.eenheid || "m2",
    materiaal: [{
      omschrijving: `Materiaal \u2014 ${prijsM.toFixed(2)} \u20AC/m\xB2`,
      aantal: money(aantal),
      eenheid: "m2",
      prijs_sleutel: sleutelM,
      eenheidsprijs: prijsM,
      totaal: materiaalKosten,
      soort: "materiaal"
    }],
    taken: [{
      omschrijving: `Arbeid \u2014 ${prijsA.toFixed(2)} \u20AC/m\xB2`,
      uren_per_m2: project.uurtarief ? money(prijsA / project.uurtarief, 3) : 0,
      uren,
      tarief: project.uurtarief,
      totaal: arbeidskosten,
      soort: "taak"
    }],
    uren,
    materiaal_kosten: materiaalKosten,
    arbeidskosten,
    marge,
    totaal: money(materiaalKosten + arbeidskosten + marge),
    notitie: regel.notitie
  };
}
__name(berekenM2, "berekenM2");
var REFERENTIE_MUUR = {
  sleutel: "noord",
  naam: ZIJDE_NAMEN.noord,
  soort: "muur",
  bruto: 10,
  opening: 1.6,
  netto: 8.4,
  lengte: 4,
  hoogte: 2.5,
  openingen: 1
};
var REFERENTIE_PLAFOND = {
  sleutel: "plafond",
  naam: ZIJDE_NAMEN.plafond,
  soort: "plafond",
  bruto: 12,
  opening: 0,
  netto: 12,
  lengte: 4,
  breedte: 3,
  hoogte: 2.5,
  openingen: 0
};
function referentieTarieven() {
  const tarieven = new Tarieven();
  const referentie = {};
  for (const pakketId of Object.keys(BEREKENERS)) {
    const vlak = pakketId === "gyproc_plafond" ? REFERENTIE_PLAFOND : REFERENTIE_MUUR;
    const ctx = {
      oppervlak: vlak,
      opties: standaardOpties(pakketId),
      tarieven,
      aantal: vlak.netto,
      uurtarief: 45
    };
    const { materiaal: materiaal2, taken } = BEREKENERS[pakketId](ctx);
    const materiaalKosten = materiaal2.reduce((s, l) => s + l.totaal, 0);
    const arbeidskosten = taken.reduce((s, t) => s + t.totaal, 0);
    referentie[`m2_${pakketId}_materiaal`] = money(materiaalKosten / vlak.netto);
    referentie[`m2_${pakketId}_arbeid`] = money(arbeidskosten / vlak.netto);
  }
  return referentie;
}
__name(referentieTarieven, "referentieTarieven");
function tarievenOverzicht(tarieven, referentie) {
  const overzicht = tarieven.overzicht();
  for (const [pakketId, pakket] of Object.entries(PAKKET_OP_ID)) {
    const sleutelM = `m2_${pakketId}_materiaal`;
    const sleutelA = `m2_${pakketId}_arbeid`;
    overzicht.push({
      sleutel: sleutelM,
      naam: `Snel ${pakket.naam} \xB7 materiaal`,
      eenheid: "\u20AC/m2",
      prijs: tarieven.prijs(sleutelM),
      standaard: referentie[sleutelM] ?? 0,
      soort: "m2"
    });
    overzicht.push({
      sleutel: sleutelA,
      naam: `Snel ${pakket.naam} \xB7 arbeid`,
      eenheid: "\u20AC/m2",
      prijs: tarieven.prijs(sleutelA),
      standaard: referentie[sleutelA] ?? 0,
      soort: "m2"
    });
  }
  return overzicht;
}
__name(tarievenOverzicht, "tarievenOverzicht");
function berekenOfferte(projectData = {}) {
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
      wandoppervlak: money(vlakken.filter((v) => v.soort === "muur").reduce((s, v) => s + v.netto, 0))
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
    regels.push(project.prijsmodus === "m2" ? berekenM2(regel, vlak, project, tarieven) : berekenRegel(regel, vlak, project, tarieven));
  }
  const materiaal2 = money(regels.reduce((s, r) => s + r.materiaal_kosten, 0));
  const arbeid = money(regels.reduce((s, r) => s + r.arbeidskosten, 0));
  const uren = money(regels.reduce((s, r) => s + r.uren, 0));
  const marge = money(regels.reduce((s, r) => s + r.marge, 0));
  const subtotaal = money(materiaal2 + arbeid + marge);
  const korting = money(subtotaal * project.korting_pct / 100);
  const netto = money(subtotaal - korting);
  const btw = money(netto * project.btw_pct / 100);
  const totaal = money(netto + btw);
  const perRuimte = {};
  for (const regel of regels) {
    const rij = perRuimte[regel.ruimte_id] || (perRuimte[regel.ruimte_id] = {
      materiaal: 0,
      arbeid: 0,
      uren: 0,
      marge: 0,
      totaal: 0
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
      naam: project.naam,
      klant: project.klant,
      adres: project.adres,
      datum: project.datum,
      offerte_nummer: project.offerte_nummer,
      ruimtes: project.ruimtes.map((r) => ({
        id: r.id,
        naam: r.naam,
        lengte: r.lengte,
        breedte: r.breedte,
        hoogte: r.hoogte,
        openingen: r.openingen.map((o) => ({
          naam: o.naam,
          muur: o.muur,
          breedte: o.breedte,
          hoogte: o.hoogte,
          aantal: o.aantal
        }))
      })),
      regels: project.regels.map((r) => ({
        id: r.id,
        ruimte_id: r.ruimte_id,
        oppervlak: r.oppervlak,
        pakket_id: r.pakket_id,
        opties: { ...r.opties },
        hoeveelheid: r.hoeveelheid,
        notitie: r.notitie
      })),
      uurtarief: project.uurtarief,
      marge_pct: project.marge_pct,
      korting_pct: project.korting_pct,
      btw_pct: project.btw_pct,
      prijsmodus: project.prijsmodus,
      tarieven: { ...project.tarieven },
      aannemer: project.aannemer,
      opmerking: project.opmerking
    },
    ruimtes,
    regels,
    totalen: {
      materiaal: materiaal2,
      arbeid,
      uren,
      marge,
      subtotaal,
      korting_pct: project.korting_pct,
      korting,
      btw_pct: project.btw_pct,
      btw,
      netto,
      totaal
    },
    per_ruimte: perRuimte,
    waarschuwingen,
    tarieven: tarievenOverzicht(tarieven, referentie),
    pakketten: PAKKETTEN
  };
}
__name(berekenOfferte, "berekenOfferte");
function prijsboek() {
  const referentie = referentieTarieven();
  return {
    tarieven: new Tarieven({}, referentie).overzicht(),
    pakketten: PAKKETTEN,
    referentie,
    versie: "1.0.0"
  };
}
__name(prijsboek, "prijsboek");
if (typeof window !== "undefined") {
  window.BouwEngine = { berekenOfferte, berekenRegel, prijsboek, referentieTarieven, money };
}

// bouwcalculator/worker/src/worker.js
var JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*"
};
function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}
__name(json, "json");
async function leesJson(request) {
  try {
    return await request.json();
  } catch (_) {
    return {};
  }
}
__name(leesJson, "leesJson");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pad = url.pathname.replace(/\/+$/, "") || "/";
    if (pad === "/api/prijsboek") {
      return json({ ...prijsboek(), opslag: "lokaal" });
    }
    if (pad === "/api/offerte" && request.method === "POST") {
      try {
        const body = await leesJson(request);
        return json(berekenOfferte(body.project || {}));
      } catch (fout) {
        return json({ fout: `Kon de offerte niet berekenen: ${fout.message}` }, 400);
      }
    }
    if (pad.startsWith("/api/projecten")) {
      return json({
        fout: "Opslaan gebeurt in de browser op deze Worker.",
        projecten: []
      }, 501);
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ fout: "Onbekende aanroep." }, 405);
    }
    return env.ASSETS.fetch(request);
  }
};

// ../.npm/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../.npm/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-wJNVKi/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../.npm/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-wJNVKi/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
