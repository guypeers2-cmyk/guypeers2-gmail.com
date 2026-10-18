/* ==========================================================
   BOUWPRIJSCALCULATOR — consolelogica (presentatielaag)
   De rekenkern draait server-side (Python). De browser stuurt
   het project mee en tekent de uitkomst.

   Vuistregel: een veld dat je aan het typen bent, wordt nooit
   opnieuw opgebouwd. Daarom zijn het overzicht (ruimtekaart)
   en de tabellen (oppervlakken, regels) apart te renderen.
   ========================================================== */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const OPSLAG_SLEUTEL = "bouwcalculator-project-v1";
const OPSLAG_LIJST = "bouwcalculator-projecten-v1";
const NR = new Intl.NumberFormat("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NRL = new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 2 });

/* ---------------- iconen (SVG, niet emoji: rendert overal hetzelfde) ---------------- */
const ico = (pad, extra = "") =>
  `<svg class="ico-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${pad}</svg>`;

const ICO = {
  plus: ico('<path d="M12 5v14M5 12h14"/>'),
  deur: ico('<path d="M5 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><path d="M13 12h.01"/>'),
  raam: ico('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M12 4v16M4 12h16"/>'),
  prullenbak: ico('<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4h6v3"/>'),
  document: ico('<path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h4"/>'),
  kruis: ico('<path d="M6 6l12 12M18 6L6 18"/>'),
};

function datumTekst(datum) {
  const d = String(datum || "").trim();
  const p = d.split("-");
  return p.length === 3 && p.every((x) => x !== "") ? `${p[2]}-${p[1]}-${p[0]}` : d;
}

const state = {
  project: null,
  projectId: null,
  offerte: null,
  prijsboek: null,
  actieveRuimteId: null,
  berekenTimer: null,
  opslag: "server",   // "server" (Python-server) of "lokaal" (Worker: alleen browser)
  engine: null,       // lokale rekenkern (fallback als er geen API is)
};

/* ---------------- hulpmiddelen ---------------- */
const esc = (tekst) => String(tekst ?? "").replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));
/* echte niet-afbreekbare spatie: werkt zowel in HTML als in SVG-tekst */
const eur = (bedrag) => `€ ${NR.format(Number(bedrag) || 0)}`;
const getal = (waarde, standaard = 0) => {
  const n = parseFloat(String(waarde ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : standaard;
};
const datumNu = () => new Date().toISOString().slice(0, 10);
const geldInvoer = (waarde) => getal(waarde).toFixed(2);
const uid = () => Math.random().toString(36).slice(2, 10);

function bewaarFocus() {
  const el = document.activeElement;
  if (!el || !el.dataset || !el.dataset.fokus) return null;
  return { key: el.dataset.fokus, start: el.selectionStart, end: el.selectionEnd };
}
function herstelFocus(focus) {
  if (!focus) return;
  const el = $$("[data-fokus]").find(el => el.dataset.fokus === focus.key);
  if (!el) return;
  el.focus();
  try { el.setSelectionRange(focus.start, focus.end); } catch (_) { /* getalvelden */ }
}
function toast(bericht) {
  const el = $("#toast");
  el.textContent = bericht;
  el.hidden = false;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.hidden = true; }, 2600);
}
function status(bericht) { $("#status").textContent = bericht; }

/* ---------------- project ---------------- */
function nieuwProject() {
  const ruimteId = uid();
  return {
    naam: "Nieuwe offerte",
    klant: "",
    adres: "",
    datum: datumNu(),
    offerte_nummer: `O-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
    aannemer: "",
    opmerking: "Prijsberekening op basis van de opgegeven maten. Werkzaamheden conform de gangbare normen.",
    ruimtes: [{
      id: ruimteId, naam: "Ruimte 1", lengte: 4, breedte: 3, hoogte: 2.5, openingen: [],
    }],
    regels: [],
    uurtarief: 45,
    marge_pct: 15,
    korting_pct: 0,
    btw_pct: 21,
    prijsmodus: "detail",
    tarieven: {},
  };
}

function laadProject(project, id = null) {
  state.project = project;
  state.projectId = id;
  state.actieveRuimteId = project.ruimtes.length ? project.ruimtes[0].id : null;
  syncSidebar();
  render();
  bereken();
}

function bewaarLokaal() {
  try {
    localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify({ project: state.project, id: state.projectId }));
  } catch (_) { /* opslag vol of niet beschikbaar */ }
}

function wijzig(actie) {
  actie();
  bewaarLokaal();
  render();
  bereken();
}

function planBerekening() {
  clearTimeout(state.berekenTimer);
  state.berekenTimer = setTimeout(bereken, 220);
}

async function bereken() {
  clearTimeout(state.berekenTimer);
  if (!state.project) return;
  status("Berekenen…");
  try {
    if (state.engine) {
      // Geen API bereikbaar: reken in de browser met de JS-rekenkern.
      state.offerte = state.engine.berekenOfferte(state.project);
    } else {
      const antwoord = await fetch("/api/offerte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: state.project }),
      });
      if (!antwoord.ok) throw new Error("serverfout");
      state.offerte = await antwoord.json();
    }
    const focus = bewaarFocus();
    renderOfferte();
    renderOppervlakken();
    renderRegelPrijzen();
    renderTarieven();
    renderPlan();
    herstelFocus(focus);
    const waarschuwingen = state.offerte.waarschuwingen || [];
    status(waarschuwingen.length ? "⚠ " + waarschuwingen[0] : "Offerte bijgewerkt");
  } catch (fout) {
    status("Berekening mislukt — is de server gestart?");
    console.error(fout);
  }
}

/* ---------------- zijbalk ---------------- */
function syncSidebar() {
  const project = state.project;
  $$("[data-project]").forEach((el) => {
    const waarde = project[el.dataset.project];
    if (waarde !== undefined && document.activeElement !== el) el.value = el.dataset.project === "uurtarief" ? geldInvoer(waarde) : waarde ?? "";
  });
  const radio = document.querySelector(`input[name="prijsmodus"][value="${project.prijsmodus}"]`);
  if (radio) radio.checked = true;
}

/* ---------------- tarievenpaneel ---------------- */
let tarievenSignatuur = "";

function tarievenEntries() {
  const entries = (state.prijsboek?.tarieven || []).slice();
  const bekend = new Set(entries.map((t) => t.sleutel));
  (state.offerte?.tarieven || []).forEach((t) => { if (!bekend.has(t.sleutel)) entries.push(t); });
  return entries;
}

function renderTarieven() {
  const lijst = $("#tarieven-lijst");
  if (!lijst) return;
  const entries = tarievenEntries();
  const signatuur = entries.map((t) => t.sleutel).join("|");
  if (signatuur === tarievenSignatuur) { renderTarievenWaarden(); return; }
  tarievenSignatuur = signatuur;

  const groepen = [
    { soort: "materiaal", titel: "Materiaal", klasse: "" },
    { soort: "taak", titel: "Arbeidsnormen (uren per eenheid)", klasse: "is-taak" },
    { soort: "m2", titel: "Snelle m²-prijzen", klasse: "is-m2" },
  ];

  lijst.innerHTML = groepen.map((groep) => {
    const regels = entries.filter((t) => t.soort === groep.soort);
    if (!regels.length) return "";
    return `<section class="tarief-sectie"><h3 class="tarief-groep">${groep.titel}</h3>` + regels.map((t) => `
      <div class="tarief ${groep.klasse}" data-tarief-soort="${esc(t.soort)}" title="${esc(t.naam)}">
        <label class="naam" for="tarief_${esc(t.sleutel)}">${esc(t.naam)}<span class="tarief-markering" hidden>Eigen tarief</span></label>
        <input type="number" step="0.01" min="0" id="tarief_${esc(t.sleutel)}" data-tarief="${esc(t.sleutel)}"
               data-fokus="t_${esc(t.sleutel)}" value="${t.soort === "taak" ? getal(state.project.tarieven[t.sleutel] ?? t.prijs) : geldInvoer(state.project.tarieven[t.sleutel] ?? t.prijs)}">
        <span class="eenheid">${t.soort === "taak" || String(t.eenheid).includes("€") ? "" : "€ / "}${esc(t.eenheid)}</span>
        <button type="button" class="knop klein tarief-herstel" data-herstel-tarief="${esc(t.sleutel)}" aria-label="Herstel ${esc(t.naam)}">Herstel</button>
      </div>`).join("") + '</section>';
  }).join("") || '<p class="hint">Geen tarieven ontvangen.</p>';
  filterTarieven();
}

function renderTarievenWaarden() {
  const project = state.project;
  $$("[data-tarief]").forEach((el) => {
    if (document.activeElement === el) return;
    const sleutel = el.dataset.tarief;
    const tarief = tarievenEntries().find((t) => t.sleutel === sleutel);
    const waarde = project.tarieven[sleutel] ?? tarief?.prijs ?? 0;
    el.value = tarief?.soort === "taak" ? getal(waarde) : geldInvoer(waarde);
  });
  filterTarieven();
}

/* Filter zonder de invoervelden opnieuw op te bouwen: focus en caret blijven intact. */
function filterTarieven() {
  const zoek = ($("#tarief-zoeken")?.value || "").trim().toLocaleLowerCase("nl");
  const categorie = $("#tarief-categorie")?.value || "alle";
  const alleenEigen = $("#tarief-eigen")?.checked || false;
  let zichtbaar = 0, aangepast = 0;
  const rijen = $$("#tarieven-lijst .tarief");
  rijen.forEach(rij => {
    const sleutel = rij.querySelector("[data-tarief]").dataset.tarief;
    const eigen = Object.prototype.hasOwnProperty.call(state.project.tarieven, sleutel);
    aangepast += eigen ? 1 : 0;
    rij.classList.toggle("is-aangepast", eigen);
    rij.querySelector(".tarief-markering").hidden = !eigen;
    rij.querySelector("[data-herstel-tarief]").disabled = !eigen;
    rij.hidden = !(rij.title.toLocaleLowerCase("nl").includes(zoek)
      && (categorie === "alle" || rij.dataset.tariefSoort === categorie || (categorie === "elektriciteit" && rij.title.startsWith("Elektriciteit:")) || (categorie === "sanitair" && rij.title.startsWith("Sanitair & water:")))
      && (!alleenEigen || eigen));
    if (!rij.hidden) zichtbaar++;
  });
  $$(".tarief-sectie").forEach(groep => {
    groep.hidden = !Array.from(groep.querySelectorAll(".tarief")).some(r => !r.hidden);
  });
  const resultaat = $("#tarief-resultaat");
  if (resultaat) resultaat.textContent = `${zichtbaar} van ${rijen.length} tarieven · ${aangepast} aangepast`;
  const leeg = $("#tarief-geen-resultaten");
  if (leeg) leeg.hidden = zichtbaar !== 0;
  const herstel = $("#tarieven-herstellen");
  if (herstel) herstel.disabled = Object.keys(state.project.tarieven).length === 0;
}

/* ---------------- ruimtes ---------------- */
function actieveRuimte() {
  return state.project.ruimtes.find((r) => r.id === state.actieveRuimteId) || state.project.ruimtes[0];
}

function vlakkenVoor(ruimte) {
  return state.offerte?.ruimtes.find((r) => r.id === ruimte.id)?.vlakken || [];
}

function renderRuimteChips() {
  const container = $("#ruimtechips");
  container.innerHTML = state.project.ruimtes.map((r) => `
    <button type="button" class="ruimtechip ${r.id === state.actieveRuimteId ? "actief" : ""}"
            data-actie="ruimte-kiezen" data-id="${esc(r.id)}"
            data-fokus="chip_${esc(r.id)}">${esc(r.naam || "Ruimte")}</button>
  `).join("") + `<button type="button" class="ruimtechip" data-actie="ruimte-toevoegen">${ICO.plus} Ruimte</button>`;
}

function renderRuimtekaart(ruimte) {
  const openingen = ruimte.openingen.map((o, i) => `
    <tr>
      <td><input type="text" value="${esc(o.naam)}" aria-label="Naam opening ${i + 1}" data-opening="${i}" data-opening-veld="naam"
                 data-fokus="o_${ruimte.id}_${i}_naam"></td>
      <td><select aria-label="Wand opening ${i + 1}" data-opening="${i}" data-opening-veld="muur" data-fokus="o_${ruimte.id}_${i}_muur">
        ${["noord", "zuid", "oost", "west"].map((z) => `<option value="${z}" ${o.muur === z ? "selected" : ""}>${z}</option>`).join("")}
      </select></td>
      <td><input type="number" step="0.05" min="0" value="${esc(o.breedte)}" aria-label="Breedte opening ${i + 1} in meter" data-opening="${i}"
                 data-opening-veld="breedte" data-fokus="o_${ruimte.id}_${i}_b" style="width:74px"></td>
      <td><input type="number" step="0.05" min="0" value="${esc(o.hoogte)}" aria-label="Hoogte opening ${i + 1} in meter" data-opening="${i}"
                 data-opening-veld="hoogte" data-fokus="o_${ruimte.id}_${i}_h" style="width:74px"></td>
      <td><input type="number" step="0.05" min="0" value="${esc(o.positie ?? "")}" placeholder="Auto"
          aria-label="Afstand vanaf begin wand in meter" data-opening="${i}" data-opening-veld="positie" data-fokus="o_${ruimte.id}_${i}_positie"></td>
      <td><input type="number" step="0.05" min="0" value="${esc(o.borstwering ?? 0)}"
          aria-label="Onderkant boven vloer in meter" data-opening="${i}" data-opening-veld="borstwering" data-fokus="o_${ruimte.id}_${i}_borstwering"></td>
      <td><button type="button" class="verwijder" data-actie="opening-verwijderen" data-index="${i}"
                  title="Verwijderen" aria-label="Verwijderen">${ICO.kruis}</button></td>
    </tr>`).join("");

  return `
    <header>
      <h3><input type="text" value="${esc(ruimte.naam)}" aria-label="Naam ruimte" data-ruimte="naam"
                 data-fokus="r_${ruimte.id}_naam"
                 style="font-weight:700;font-size:1rem;border:0;background:transparent;padding:2px 0;width:220px"></h3>
      <span class="klein-muted">lengte × breedte × hoogte (m)</span>
      <button type="button" class="knop klein gevaar" data-actie="ruimte-verwijderen">${ICO.prullenbak} Ruimte weg</button>
    </header>
    <div class="maten">
      <label class="veld"><span>Lengte</span>
        <input type="number" step="0.01" min="0" value="${esc(ruimte.lengte)}" data-ruimte="lengte"
               data-fokus="r_${ruimte.id}_l"></label>
      <label class="veld"><span>Breedte</span>
        <input type="number" step="0.01" min="0" value="${esc(ruimte.breedte)}" data-ruimte="breedte"
               data-fokus="r_${ruimte.id}_b"></label>
      <label class="veld"><span>Hoogte</span>
        <input type="number" step="0.01" min="0" value="${esc(ruimte.hoogte)}" data-ruimte="hoogte"
               data-fokus="r_${ruimte.id}_h"></label>
    </div>
    <div class="openings">
      <h3 style="font-size:.9rem;margin-bottom:6px">Openingen (deuren &amp; ramen)</h3>
      ${openingen ? `<table>
        <thead><tr><th>Naam</th><th>Muur</th><th>Breedte</th><th>Hoogte</th><th>Vanaf start</th><th>Boven vloer</th><th></th></tr></thead>
        <tbody>${openingen}</tbody></table>`
        : '<p class="klein-muted">Geen openingen. Klik hieronder om een deur of raam toe te voegen.</p>'}
      <p class="hint">Maten in meter. Vanaf start: noord/zuid vanaf west, oost/west vanaf noord. Leeg = automatisch. Openingen worden binnen de wand getekend.</p>
      <div class="openings-acties">
        <button type="button" class="knop klein" data-actie="opening-toevoegen" data-soort="Deur">${ICO.deur} Deur</button>
        <button type="button" class="knop klein" data-actie="opening-toevoegen" data-soort="Raam">${ICO.raam} Raam</button>
      </div>
    </div>`;
}

function renderOppervlakken() {
  const container = $("#oppervlakken");
  if (!container) return;
  const ruimte = actieveRuimte();
  if (!ruimte) { container.innerHTML = ""; return; }
  const vlakken = vlakkenVoor(ruimte);
  container.innerHTML = `
    <h3>Oppervlakken van deze ruimte</h3>
    <table class="opp">
      <thead><tr><th>Vlak</th><th class="num">Bruto m²</th><th class="num">Opening</th>
        <th class="num">Netto</th><th></th></tr></thead>
      <tbody>${vlakken.map((v) => `
        <tr class="vlak-${v.soort}">
          <td>${esc(v.naam)}${v.openingen ? ` <span class="klein-muted">(${v.openingen} opening${v.openingen > 1 ? "en" : ""})</span>` : ""}</td>
          <td class="num">${NRL.format(v.bruto)}</td>
          <td class="num">${v.opening ? "−" + NRL.format(v.opening) : "—"}</td>
          <td class="num"><b>${NRL.format(v.netto)}</b> m²</td>
          <td class="num"><button type="button" class="knop klein" data-actie="regel-toevoegen"
                    data-vlak="${esc(v.sleutel)}" data-soort="${esc(v.soort)}">+ werk</button></td>
        </tr>`).join("")}</tbody>
    </table>`;
}

let installatieKeuze = "elektriciteit";
const INSTALLATIES = {
  elektriciteit: {categorie: "Elektriciteit", locatie: "elek-vlak",
    uitleg: "Aansluitpunten, kabels, sleuven en dichtzetten zijn aparte posten: tel ze niet dubbel.",
    waarschuwing: "Indicatieve startprijzen, exclusief verdeelkast, keuring en schema’s. Geen installatieontwerp of AREI-conformiteitscontrole. Laat ontwerp en uitvoering door een vakbekwaam elektricien beoordelen."},
  sanitair: {categorie: "Sanitair & water", locatie: "san-vlak",
    uitleg: "Leidingen, isolatie, hulpstukken en toestellen zijn aparte posten. Voeg bijvoorbeeld 8 m koud water, 8 m warm water en de benodigde koppelingen toe.",
    waarschuwing: "Indicatieve startprijzen. Zonder breekwerk, waterdichting, rioleringsaansluiting of officiële keuring. Leidingdiameters zijn ramingskeuzes, geen installatieadvies. Laat ontwerp, drinkwaterveiligheid en uitvoering door een vakbekwaam installateur beoordelen."},
};

function renderInstallaties() {
  for (const [soort, info] of Object.entries(INSTALLATIES)) {
    const houder = $("#" + soort);
    if (!houder) continue;
    const ruimte = actieveRuimte();
    if (!ruimte) { houder.innerHTML = ""; continue; }
    const pakketten = (state.prijsboek?.pakketten || []).filter(p => p.categorie === info.categorie);
    const locatie = $("#" + info.locatie)?.value || "noord";
    houder.hidden = installatieKeuze !== soort;
    houder.innerHTML = `
      <header class="elektriciteit-kop"><div><p class="tarieven-label">WERK TOEVOEGEN</p><h3>${info.categorie}</h3></div>
        <label>Locatie in ${esc(ruimte.naam)}<select id="${info.locatie}" aria-label="Locatie ${info.categorie}">
          ${["noord", "zuid", "oost", "west", "plafond", "vloer"].map(v => `<option value="${v}" ${locatie === v ? "selected" : ""}>${v === "plafond" ? "Plafond" : v === "vloer" ? "Vloer" : "Wand " + v}</option>`).join("")}
        </select></label></header>
      <div class="elektriciteit-keuze">${pakketten.map(p => `<button type="button" class="elek-knop" ${soort === "elektriciteit" ? 'data-elek-pakket' : 'data-installatie-pakket'}="${esc(p.id)}" data-installatie-soort="${soort}" title="${esc(p.beschrijving)}"><span>+ ${esc(p.naam)}</span><small>${p.eenheid === "st" ? "Per stuk" : "Per lopende meter"}</small></button>`).join("")}</div>
      <p class="hint">Voeg een werkregel toe en vul hieronder het aantal of de lengte in. ${info.uitleg}</p>
      <p class="elek-opmerking">${info.waarschuwing}</p>`;
  }
}

function standaardPakket(soort) {
  if (soort === "plafond") return "gyproc_plafond";
  if (soort === "vloer") return "schilderen_gyproc";
  return "gyproc_wand_profiel";
}

function renderRegelkaart(regel, vlakken) {
  const pakketten = state.prijsboek?.pakketten || [];
  const pakket = pakketten.find((p) => p.id === regel.pakket_id) || pakketten[0];
  if (!pakket) return "";
  const vlak = vlakken.find((v) => v.sleutel === regel.oppervlak);
  const opties = {};
  (pakket.opties || []).forEach((o) => { opties[o.id] = regel.opties[o.id] ?? o.standaard; });

  const optieVelden = (pakket.opties || []).map((o) => `
    <label>${esc(o.label)}
      <select data-optie="${esc(o.id)}" data-fokus="r_${regel.id}_${esc(o.id)}">
        ${o.keuzes.map((k) => `<option value="${esc(k)}" ${opties[o.id] === k ? "selected" : ""}>${esc(k)}</option>`).join("")}
      </select>
    </label>`).join("");

  const oppervlaktePakket = (pakket.eenheid || "m2") === "m2";
  const auto = oppervlaktePakket && (regel.hoeveelheid === null || regel.hoeveelheid === undefined);
  const hoeveelheid = auto ? (vlak ? vlak.netto : 0) : (regel.hoeveelheid ?? 0);

  return `
  <div class="regelkaart" data-regel="${esc(regel.id)}">
    <header>
      <div class="titel">${esc(vlak ? vlak.naam : regel.oppervlak)}
        <span class="klein-muted">· ${esc(pakket.categorie)}</span></div>
      <select aria-label="Werkpakket" data-pakket data-fokus="r_${regel.id}_pakket">
        ${[...new Set(pakketten.map(p => p.categorie))].map(categorie => `<optgroup label="${esc(categorie)}">${pakketten.filter(p => p.categorie === categorie).map(p => `<option value="${esc(p.id)}" ${p.id === regel.pakket_id ? "selected" : ""}>${esc(p.naam)}</option>`).join("")}</optgroup>`).join("")}
      </select>
      <button type="button" class="knop klein gevaar ico-only" data-actie="regel-verwijderen"
              data-id="${esc(regel.id)}" aria-label="Regel verwijderen">${ICO.prullenbak}</button>
    </header>
    <div class="regelopties">
      ${!oppervlaktePakket ? `<label>Locatie<select data-regel-vlak data-fokus="r_${regel.id}_vlak">${vlakken.map(v => `<option value="${esc(v.sleutel)}" ${v.sleutel === regel.oppervlak ? "selected" : ""}>${esc(v.naam)}</option>`).join("")}</select></label>` : ""}
      ${optieVelden}
      <label>${pakket.eenheid === "st" ? "Aantal" : pakket.eenheid === "m" ? "Lengte" : "Hoeveelheid"} (${esc(pakket.eenheid || "m2")})
        <input type="number" step="${pakket.eenheid === "st" ? "1" : "0.01"}" min="0" value="${hoeveelheid}" data-hoeveelheid
               data-fokus="r_${regel.id}_aantal" style="width:92px">
      </label>
      ${auto ? '<span class="klein-muted">= oppervlak van de wand</span>'
             : oppervlaktePakket ? '<button type="button" class="knop klein" data-actie="hoeveelheid-auto">opnieuw automatisch</button>' : '<span class="klein-muted">Handmatig gemeten · niet afgeleid van m²</span>'}
    </div>
    ${!oppervlaktePakket ? `<p class="hint elek-regel-uitleg">${esc(pakket.beschrijving)}</p>` : ""}
    ${!oppervlaktePakket ? `<details class="plaatsing"><summary>Plaatsing in 2D &amp; 3D</summary>
      <p class="hint">Meters vanaf west (X), noord (Y) en vloer (Z). Leeg = automatisch. Eén symbool per werkregel; splits de regel voor afzonderlijke posities. Posities worden in de tekening begrensd tot de ruimte.</p>
      <div class="plaatsing-velden">${(pakket.eenheid === "m" ? ["x","y","z","x2","y2","z2"] : ["x","y","z"]).map(k => `<label>${({x:"Start X",y:"Start Y",z:"Hoogte Z",x2:"Eind X",y2:"Eind Y",z2:"Eind Z"})[k]} (m)<input type="number" min="0" step="0.05" placeholder="Auto" value="${esc(regel.visualisatie?.[k] ?? "")}" data-plaatsing="${k}" data-fokus="r_${regel.id}_plaats_${k}"></label>`).join("")}</div>
      ${pakket.eenheid === "m" ? '<p class="hint">De lijn is een schematisch recht tracé. Gebruik de handmatig gemeten lengte voor de offerte; bochten en leidinglengte worden hier niet automatisch berekend.</p>' : ""}
    </details>` : ""}
    <div class="regelprijs" data-prijzen="${esc(regel.id)}"></div>
    <details class="details">
      <summary>Materialen &amp; uren</summary>
      <div data-details="${esc(regel.id)}"></div>
    </details>
  </div>`;
}

function renderRegels() {
  const container = $("#regels");
  if (!container) return;
  const ruimte = actieveRuimte();
  if (!ruimte) { container.innerHTML = ""; return; }
  const vlakken = vlakkenVoor(ruimte);
  const regels = state.project.regels.filter((r) => r.ruimte_id === ruimte.id);
  // Opengeklapte detailvensters blijven open staan na een herbouw.
  const open = new Set(Array.from(container.querySelectorAll("details.details[open]"))
    .map((d) => d.querySelector("[data-details]")?.dataset.details)
    .filter(Boolean));

  container.innerHTML = `<h3>Werk in deze ruimte</h3>` + (
    regels.length
      ? regels.map((r) => renderRegelkaart(r, vlakken)).join("")
      : '<p class="hint">Nog geen werk gekozen. Klik bij een oppervlak op <b>+ werk</b>.</p>');

  container.querySelectorAll("details.details").forEach((d) => {
    const id = d.querySelector("[data-details]")?.dataset.details;
    if (id && open.has(id)) d.open = true;
  });
}

/* ---------------- prijzen per regel ---------------- */
function renderRegelPrijzen() {
  const regels = state.offerte?.regels || [];
  for (const regel of regels) {
    const doel = document.querySelector(`[data-prijzen="${regel.regel_id}"]`);
    if (doel) {
      doel.innerHTML = `
        <span class="deel">Materiaal <b>${eur(regel.materiaal_kosten)}</b></span>
        <span class="deel">Arbeid <b>${NRL.format(regel.uren)} u</b> · <b>${eur(regel.arbeidskosten)}</b></span>
        <span class="deel">Marge <b>${eur(regel.marge)}</b></span>
        <span class="totaal">${eur(regel.totaal)}</span>`;
    }
    const detail = document.querySelector(`[data-details="${regel.regel_id}"]`);
    if (detail) detail.innerHTML = renderDetails(regel);
  }
}

function renderDetails(regel) {
  if (!regel.materiaal.length && !regel.taken.length) {
    return '<p class="klein-muted" style="padding:8px 13px">Geen details beschikbaar.</p>';
  }
  const materiaal = regel.materiaal.map((l) => `
    <tr><td>${esc(l.omschrijving)}</td>
        <td class="eenheid">${esc(l.eenheid)}</td>
        <td class="num">${NRL.format(l.aantal)}</td>
        <td class="num">${eur(l.eenheidsprijs)}</td>
        <td class="num">${eur(l.totaal)}</td></tr>`).join("");
  const taken = regel.taken.map((t) => `
    <tr><td>${esc(t.omschrijving)}</td>
        <td class="eenheid">uur</td>
        <td class="num">${NRL.format(t.uren)}</td>
        <td class="num">${eur(t.tarief)}</td>
        <td class="num">${eur(t.totaal)}</td></tr>`).join("");
  return `<table>
    <tbody>
      <tr class="sectie"><td colspan="5">Materiaal</td></tr>
      ${materiaal}
      <tr class="sectie"><td colspan="5">Arbeid</td></tr>
      ${taken}
      <tr class="totaal"><td colspan="4">Totaal</td><td class="num">${eur(regel.totaal)}</td></tr>
    </tbody></table>`;
}

/* ---------------- offerte (document) ---------------- */
/* Plattegronden voor het gedrukte offerte-document (alleen zichtbaar bij printen). */
function offertePlannen(offerte) {
  if (!window.BouwPlan || !offerte?.ruimtes?.length) return "";
  const plannen = offerte.ruimtes.map((r) => {
    const ruimte = state.project.ruimtes.find((x) => x.id === r.id);
    if (!ruimte) return "";
    return `<div class="offerte-plan">
      <h4>${esc(r.naam)} · ${NRL.format(r.lengte)} × ${NRL.format(r.breedte)} × ${NRL.format(r.hoogte)} m</h4>
      ${window.BouwPlan.plattegrond(ruimte, r.vlakken || [], {}, {regels: planRegels(ruimte)})}
      <div class="plan-legenda print-plan-legenda">${planLegenda(planRegels(ruimte), true)}</div>
    </div>`;
  }).join("");
  if (!plannen) return "";
  return `<section class="offerte-plannen"><h3>Plattegronden</h3>${plannen}</section>`;
}

function renderOfferte() {
  const container = $("#offerte");
  const offerte = state.offerte;
  if (!container) return;
  if (!offerte) { container.innerHTML = ""; return; }
  const project = state.project;
  const totalen = offerte.totalen;

  if (!offerte.regels.length) {
    container.innerHTML = `
      <div class="offerte-kop"><h2>Offerte</h2>
        <div class="meta"><span>${esc(project.offerte_nummer || "—")}</span><span>${esc(datumTekst(project.datum))}</span></div></div>
      <div class="leeg-melding">
        <span class="groot-emoji">${ICO.document}</span>
        Nog geen werk gekozen.<br>
        Voeg een ruimte toe, klik bij een oppervlak op <b>+ werk</b> en de offerte
        vult zichzelf aan.
      </div>`;
    return;
  }

  const perRuimte = new Map();
  for (const regel of offerte.regels) {
    if (!perRuimte.has(regel.ruimte_id)) perRuimte.set(regel.ruimte_id, []);
    perRuimte.get(regel.ruimte_id).push(regel);
  }

  const rijen = [];
  for (const ruimte of offerte.ruimtes) {
    const regels = perRuimte.get(ruimte.id) || [];
    if (!regels.length) continue;
    rijen.push(`<tr class="ruimte-kop">
        <td colspan="4">${esc(ruimte.naam)}
          <span class="klein-muted">· ${NRL.format(ruimte.lengte)} × ${NRL.format(ruimte.breedte)} × ${NRL.format(ruimte.hoogte)} m</span>
        </td></tr>`);
    for (const regel of regels) {
      // Opties die al in de omschrijving staan (zoals bij de detailschuif)
      // herhalen we niet — anders staat elke optie twee keer in de offerte.
      const opties = Object.entries(regel.opties || {})
        .filter(([, waarde]) => waarde && waarde !== "geen" && waarde !== "1 zijde")
        .filter(([, waarde]) => !regel.omschrijving.includes(waarde))
        .map(([id, waarde]) => `${id}: ${waarde}`).join(" · ");
      rijen.push(`<tr>
        <td><span class="klein-muted">${NRL.format(regel.aantal)} ${esc(regel.eenheid)}</span>
          ${esc(regel.omschrijving)}
          ${opties ? `<br><span class="klein-muted">${esc(opties)}</span>` : ""}
          ${regel.notitie ? `<br><span class="klein-muted">${esc(regel.notitie)}</span>` : ""}</td>
        <td class="num">${eur(regel.materiaal_kosten)}</td>
        <td class="num">${eur(regel.arbeidskosten)}</td>
        <td class="num"><b>${eur(regel.totaal)}</b></td></tr>`);
    }
  }

  container.innerHTML = `
    <div class="offerte-kop">
      <div>
        <h2>Offerte</h2>
        ${project.naam ? `<p class="offerte-project">${esc(project.naam)}</p>` : ""}
      </div>
      <div class="meta">
        <span>${esc(project.offerte_nummer || "—")}</span>
        <span>${esc(datumTekst(project.datum))}</span>
      </div>
    </div>
    <div class="offerte-partijen">
      <div>
        <h4>Aanbieder</h4>
        <p><b>${esc(project.aannemer || "—")}</b></p>
      </div>
      <div>
        <h4>Klant</h4>
        <p><b>${esc(project.klant || "—")}</b></p>
        ${project.adres ? `<p>${esc(project.adres)}</p>` : ""}
      </div>
    </div>
    <table class="offerte-tabel">
      <thead><tr>
        <th>Omschrijving</th>
        <th class="num">Materiaal</th><th class="num">Arbeid</th><th class="num">Totaal</th>
      </tr></thead>
      <tbody>${rijen.join("")}</tbody>
    </table>
    <div class="offerte-totaal">
      <div><span>Materiaal</span><span>${eur(totalen.materiaal)}</span></div>
      <div><span>Arbeid (${NRL.format(totalen.uren)} u)</span><span>${eur(totalen.arbeid)}</span></div>
      <div><span>Marge materiaal</span><span>${eur(totalen.marge)}</span></div>
      <div class="groot"><span>Subtotaal</span><span>${eur(totalen.subtotaal)}</span></div>
      ${totalen.korting ? `<div><span>Korting (${NRL.format(totalen.korting_pct)}%)</span><span>−${eur(totalen.korting)}</span></div>` : ""}
      <div><span>BTW ${NRL.format(totalen.btw_pct)}%</span><span>${eur(totalen.btw)}</span></div>
      <div class="eind"><span>Totaal</span><span>${eur(totalen.totaal)}</span></div>
    </div>
    ${(offerte.waarschuwingen || []).length ? `<div class="offerte-waarschuwingen">${offerte.waarschuwingen.map(w => `<p>${esc(w)}</p>`).join("")}</div>` : ""}
    ${offertePlannen(offerte)}
    ${project.opmerking ? `<p class="offerte-noot">${esc(project.opmerking)}</p>` : ""}
    <p class="offerte-voet">
      ${esc(project.aannemer || "Aannemer")} · ${esc(project.naam || "Project")} ·
      ${esc(project.offerte_nummer || "Offerte")} · ${esc(datumTekst(project.datum))}
    </p>`;
}

/* ---------------- render ---------------- */
/* ---------------- plattegrond ---------------- */
let planWeergave = "plattegrond";
let planVlak = "noord";
const planCamera = { hoek: 0, zoom: 1, maten: true };
const planLagen = {afwerking: true, elektriciteit: true, sanitair: true};

function planRegels(ruimte) {
  const vlakken = vlakkenVoor(ruimte);
  return state.project.regels.filter(r => r.ruimte_id === ruimte.id).map((r, i) => {
    const pakket = state.prijsboek?.pakketten.find(p => p.id === r.pakket_id);
    const berekend = state.offerte?.regels.find(o => o.regel_id === r.id);
    return {...r, pakket, nummer: i + 1,
      aantal: berekend?.aantal ?? (r.hoeveelheid ?? (pakket?.eenheid === "m2" ? vlakken.find(v => v.sleutel === r.oppervlak)?.netto : 0))};
  }).filter(r => r.pakket);
}

function planLegenda(regels, print = false) {
  return regels.filter(r => r.aantal > 0).map(r => {
    const laag = window.BouwPlan.laag(r);
    if (!print && !planLagen[laag]) return "";
    const inhoud = `<b>${r.nummer}</b><span>${esc(r.pakket.naam)} · ${NRL.format(r.aantal)} ${esc(r.pakket.eenheid)}<small>${esc(r.oppervlak)} · ${Object.keys(r.visualisatie || {}).length ? "Plaatsing geheel/deels ingesteld" : "Automatische schemapositie"}</small></span>`;
    return print ? `<div class="plan-legenda-item laag-${laag} tint-${window.BouwPlan.tint(r)}">${inhoud}</div>`
      : `<button type="button" class="plan-legenda-item laag-${laag} tint-${window.BouwPlan.tint(r)}" data-plan-regel="${esc(r.id)}">${inhoud}</button>`;
  }).join("");
}

function werkPerVlak(ruimte) {
  const uit = {};
  /* aantal regels komt direct uit het project (altijd actueel) */
  state.project.regels
    .filter((r) => r.ruimte_id === ruimte.id)
    .forEach((r) => {
      const v = uit[r.oppervlak] || (uit[r.oppervlak] = { aantal: 0, totaal: 0 });
      v.aantal += 1;
    });
  /* bedragen komen uit de laatste berekening */
  (state.offerte?.regels || [])
    .filter((r) => r.ruimte_id === ruimte.id)
    .forEach((r) => {
      const v = uit[r.oppervlak];
      if (v) v.totaal += r.totaal || 0;
    });
  return uit;
}

function renderPlan() {
  const houder = $("#plan");
  if (!houder) return;
  const ruimte = actieveRuimte();
  if (!ruimte || !window.BouwPlan) { houder.innerHTML = ""; return; }

  const werk = {};
  Object.entries(werkPerVlak(ruimte)).forEach(([sleutel, info]) => {
    const aantal = `${info.aantal} regel${info.aantal > 1 ? "s" : ""}`;
    werk[sleutel] = info.totaal > 0 ? `${aantal} · ${eur(info.totaal)}` : aantal;
  });

  const vlakken = vlakkenVoor(ruimte);
  const tekenaar = planWeergave === "aanzicht" ? window.BouwPlan.aanzicht : planWeergave === "isometrie" ? window.BouwPlan.isometrie : window.BouwPlan.plattegrond;
  const regels = planRegels(ruimte);
  houder.innerHTML = tekenaar(ruimte, vlakken, werk, {...planCamera, regels, lagen: planLagen, vlak: planVlak});
  const legenda = $("#plan-legenda");
  if (legenda) legenda.innerHTML = planLegenda(planWeergave === "aanzicht" ? regels.filter(r=>r.oppervlak===planVlak) : regels) || '<p class="vlak-leeg">Nog geen zichtbare werken op dit vlak. Voeg hieronder een werkregel toe of schakel een laag in.</p>';
  $("#vlak-bediening").hidden = planWeergave !== "aanzicht";
  $("#sleepvlak-keuze").hidden = planWeergave !== "isometrie";
  $$("[data-aanzicht-vlak]").forEach(b=>{
    const v=vlakken.find(v=>v.sleutel===b.dataset.aanzichtVlak);
    b.setAttribute("aria-pressed",String(b.dataset.aanzichtVlak===planVlak));
    b.querySelector("small").textContent=v ? `${NRL.format(v.netto)} m² netto` : "";
  });
  const bediening = $("#iso-bediening");
  if (bediening) bediening.hidden = planWeergave !== "isometrie";
  const tip = $(".plantip");
  if (tip) tip.textContent = planWeergave === "aanzicht"
    ? "Sleep werken naar hun positie op dit vlak. Kies de locatie van een werkregel om die aan een ander vlak toe te wijzen."
    : "Klik op een wand om werk toe te voegen. In 3D kun je draaien om alle wanden te bekijken.";
  const richting = $("#iso-richting");
  if (richting) richting.textContent = ["Noord / west", "Noord / oost", "Zuid / oost", "Zuid / west"][planCamera.hoek] + ` · ${Math.round(planCamera.zoom * 100)}%`;
  const matenKnop = $('[data-camera="maten"]');
  if (matenKnop) matenKnop.setAttribute("aria-pressed", String(planCamera.maten));
  const minKnop = $('[data-camera="uit"]'), maxKnop = $('[data-camera="in"]');
  if (minKnop) minKnop.disabled = planCamera.zoom <= 0.75;
  if (maxKnop) maxKnop.disabled = planCamera.zoom >= 1.6;
}

function render() {
  const focus = bewaarFocus();
  renderRuimteChips();
  const ruimte = actieveRuimte();
  const kaart = $("#ruimtekaart");
  if (kaart) kaart.innerHTML = ruimte ? renderRuimtekaart(ruimte) : "";
  renderPlan();
  renderInstallaties();
  renderOppervlakken();
  renderRegels();
  renderOfferte();
  renderRegelPrijzen();
  herstelFocus(focus);
}

/* ---------------- acties ---------------- */
function regelToevoegen(oppervlak, soort) {
  const ruimte = actieveRuimte();
  if (!ruimte) return;
  state.project.regels.push({
    id: uid(),
    ruimte_id: ruimte.id,
    oppervlak,
    pakket_id: standaardPakket(soort),
    opties: {},
    hoeveelheid: null,
    notitie: "",
  });
}

/* --- opslag: op de server (Python) of alleen in de browser (Worker) --- */
function lokaleProjecten() {
  try { return JSON.parse(localStorage.getItem(OPSLAG_LIJST) || "[]"); } catch (_) { return []; }
}

function lokaalOpslaan(project, id) {
  const lijst = lokaleProjecten();
  const projectId = id || `${(project.naam || "offerte").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
  const entry = {
    id: projectId, naam: project.naam, klant: project.klant, datum: project.datum,
    ruimtes: (project.ruimtes || []).length, regels: (project.regels || []).length,
    gewijzigd: new Date().toISOString().slice(0, 16).replace("T", " "),
    project,
  };
  const overig = lijst.filter((p) => p.id !== projectId);
  try {
    localStorage.setItem(OPSLAG_LIJST, JSON.stringify([entry, ...overig].slice(0, 50)));
  } catch (_) {
    // Geen opslag beschikbaar (privacymodus, iframe, gekopieerd bestand).
    status("Opslaan kan hier niet — deze browser blokkeert de opslag.");
    return null;
  }
  return projectId;
}

function lokaalVerwijderen(id) {
  try {
    localStorage.setItem(OPSLAG_LIJST, JSON.stringify(lokaleProjecten().filter((p) => p.id !== id)));
  } catch (_) { /* opslag niet beschikbaar */ }
}

async function opslaan() {
  if (!state.project) return;
  status("Opslaan…");
  if (state.opslag === "lokaal") {
    const nieuwId = lokaalOpslaan(state.project, state.projectId);
    if (!nieuwId) {
      toast("Kon niet opslaan — deze browser blokkeert de opslag");
      return;
    }
    state.projectId = nieuwId;
    bewaarLokaal();
    status("Opgeslagen in deze browser");
    toast("Offerte opgeslagen in deze browser");
    return;
  }
  try {
    const antwoord = await fetch("/api/projecten/opslaan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: state.project, id: state.projectId }),
    });
    const data = await antwoord.json();
    if (data.fout) throw new Error(data.fout);
    state.projectId = data.id;
    bewaarLokaal();
    status("Opgeslagen");
    toast(`Offerte opgeslagen (${data.id})`);
  } catch (fout) {
    status("Opslaan mislukt");
    toast("Opslaan mislukt — is de server gestart?");
  }
}

async function openenDialog() {
  const inhoud = $("#modal-inhoud");
  inhoud.innerHTML = "<p class='hint'>Bezig met laden…</p>";
  $("#modal-achtergrond").hidden = false;

  let projecten = [];
  if (state.opslag === "lokaal") {
    projecten = lokaleProjecten();
  } else {
    try {
      const antwoord = await fetch("/api/projecten");
      const data = await antwoord.json();
      projecten = data.projecten || [];
    } catch (fout) {
      inhoud.innerHTML = "<p class='hint'>Laden mislukt — is de server gestart?</p>";
      return;
    }
  }

  inhoud.innerHTML = projecten.length
    ? `<div class="projectlijst">${projecten.map((p) => `
        <div class="projectregel">
          <span class="naam">${esc(p.naam)}<br><span class="meta">${esc(p.klant || "—")} · ${esc(p.ruimtes)} ruimte(s) · ${esc(p.gewijzigd || "")}</span></span>
          <button type="button" class="knop klein" data-actie="project-laden" data-id="${esc(p.id)}">Openen</button>
          <button type="button" class="knop klein gevaar ico-only" data-actie="project-verwijderen" data-id="${esc(p.id)}" aria-label="Offerte verwijderen">${ICO.prullenbak}</button>
        </div>`).join("")}</div>`
    : `<p class="hint">Nog geen opgeslagen offertes. Sla je huidige offerte op met de knop <b>Opslaan</b>.</p>`;
}

function exporteerJson() {
  const blob = new Blob([JSON.stringify(state.project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(state.project.naam || "offerte").replace(/[^\w-]+/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importeerJson(tekst) {
  try {
    const project = JSON.parse(tekst);
    laadProject(project, null);
    toast("Offerte geïmporteerd");
  } catch (_) {
    toast("Dit bestand is geen geldige offerte");
  }
}

/* ---------------- events ---------------- */
function selecteerPlanRegel(id) {
  const regel = state.project.regels.find(r => r.id === id);
  if (!regel) return;
  const veld = $$("[data-hoeveelheid]").find(el => el.closest("[data-regel]")?.dataset.regel === regel.id);
  const kaart = veld?.closest(".regelkaart");
  if (kaart) {
    kaart.scrollIntoView({block: "center", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth"});
    veld.focus({preventScroll:true});
  }
}

document.addEventListener("click", (e) => {
  const planRegel = e.target.closest("[data-plan-regel]");
  if (planRegel) { selecteerPlanRegel(planRegel.dataset.planRegel); return; }

  const discipline = e.target.closest("[data-installatie]");
  if (discipline) {
    installatieKeuze = discipline.dataset.installatie;
    $$("[data-installatie]").forEach(b => b.setAttribute("aria-pressed", String(b === discipline)));
    for (const soort of Object.keys(INSTALLATIES)) $("#" + soort).hidden = soort !== installatieKeuze;
    return;
  }
  const elek = e.target.closest("[data-elek-pakket], [data-installatie-pakket]");
  if (elek) {
    const ruimte = actieveRuimte();
    if (!ruimte) return;
    const info = INSTALLATIES[elek.dataset.installatieSoort || "elektriciteit"];
    const locatie = $("#" + info.locatie)?.value || "noord";
    const id = uid();
    wijzig(() => state.project.regels.push({id, ruimte_id: ruimte.id, oppervlak: locatie,
      pakket_id: elek.dataset.elekPakket || elek.dataset.installatiePakket, opties: {}, hoeveelheid: 1, notitie: ""}));
    const veld = document.querySelector(`[data-fokus="r_${id}_aantal"]`);
    if (veld) { veld.focus(); veld.select(); }
    return;
  }
  const herstelTarief = e.target.closest("[data-herstel-tarief]");
  if (herstelTarief) {
    wijzig(() => { delete state.project.tarieven[herstelTarief.dataset.herstelTarief]; });
    renderTarievenWaarden();
    return;
  }
  if (e.target.closest("#tarieven-herstellen")) {
    if (!confirm("Alle eigen tarieven van deze offerte herstellen naar de standaardwaarden?")) return;
    wijzig(() => { state.project.tarieven = {}; });
    renderTarievenWaarden();
    return;
  }
  const vlakKnop = e.target.closest("[data-aanzicht-vlak]");
  if (vlakKnop) {planVlak=vlakKnop.dataset.aanzichtVlak;renderPlan();return;}
  const cameraKnop = e.target.closest("[data-camera]");
  if (cameraKnop) {
    const actie = cameraKnop.dataset.camera;
    if (actie === "links") planCamera.hoek = (planCamera.hoek + 3) % 4;
    if (actie === "rechts") planCamera.hoek = (planCamera.hoek + 1) % 4;
    if (actie === "in") planCamera.zoom = Math.min(1.6, +(planCamera.zoom + 0.15).toFixed(2));
    if (actie === "uit") planCamera.zoom = Math.max(0.75, +(planCamera.zoom - 0.15).toFixed(2));
    if (actie === "maten") planCamera.maten = !planCamera.maten;
    if (actie === "reset") Object.assign(planCamera, {hoek: 0, zoom: 1, maten: true});
    renderPlan();
    return;
  }

  /* Weergave wisselen: bovenaanzicht <-> 3D */
  const weergave = e.target.closest("[data-plan]");
  if (weergave) {
    planWeergave = weergave.dataset.plan;
    $$("[data-plan]").forEach((b) => {
      const actief = b === weergave;
      b.classList.toggle("actief", actief);
      b.setAttribute("aria-pressed", actief ? "true" : "false");
    });
    renderPlan();
    return;
  }

  /* Klik op een wand (of een opening daarin) in de plattegrond = werk toevoegen op dat vlak */
  const wand = e.target.closest(".plan-wand, .plan-open");
  if (wand) {
    wijzig(() => regelToevoegen(wand.dataset.vlak, wand.dataset.soort || "muur"));
    return;
  }

  const knop = e.target.closest("[data-actie]");
  if (knop) {
    const actie = knop.dataset.actie;
    if (actie === "ruimte-toevoegen") {
      const id = uid();
      wijzig(() => {
        state.project.ruimtes.push({
          id, naam: `Ruimte ${state.project.ruimtes.length + 1}`,
          lengte: 4, breedte: 3, hoogte: 2.5, openingen: [],
        });
        state.actieveRuimteId = id;
      });
    } else if (actie === "ruimte-kiezen") {
      state.actieveRuimteId = knop.dataset.id;
      render();
    } else if (actie === "ruimte-verwijderen") {
      const ruimte = actieveRuimte();
      if (!ruimte) return;
      if (!confirm(`Ruimte "${ruimte.naam}" en al haar werk verwijderen?`)) return;
      wijzig(() => {
        state.project.ruimtes = state.project.ruimtes.filter((r) => r.id !== ruimte.id);
        state.project.regels = state.project.regels.filter((r) => r.ruimte_id !== ruimte.id);
        state.actieveRuimteId = state.project.ruimtes.length ? state.project.ruimtes[0].id : null;
      });
    } else if (actie === "opening-toevoegen") {
      const ruimte = actieveRuimte();
      wijzig(() => {
        ruimte.openingen.push({
          naam: knop.dataset.soort || "Deur",
          muur: "noord",
          breedte: knop.dataset.soort === "Raam" ? 1.2 : 0.9,
          hoogte: knop.dataset.soort === "Raam" ? 1.2 : 2.1,
          aantal: 1,
          positie: null,
          borstwering: knop.dataset.soort === "Raam" ? 0.9 : 0,
        });
      });
    } else if (actie === "opening-verwijderen") {
      const ruimte = actieveRuimte();
      const index = Number(knop.dataset.index);
      wijzig(() => { ruimte.openingen.splice(index, 1); });
    } else if (actie === "regel-toevoegen") {
      wijzig(() => regelToevoegen(knop.dataset.vlak, knop.dataset.soort));
    } else if (actie === "regel-verwijderen") {
      wijzig(() => {
        state.project.regels = state.project.regels.filter((r) => r.id !== knop.dataset.id);
      });
    } else if (actie === "hoeveelheid-auto") {
      wijzig(() => {
        const regel = state.project.regels.find((r) => r.id === knop.closest("[data-regel]")?.dataset.regel);
        if (regel) regel.hoeveelheid = null;
      });
    } else if (actie === "project-laden") {
      if (state.opslag === "lokaal") {
        const gevonden = lokaleProjecten().find((p) => p.id === knop.dataset.id);
        if (gevonden?.project) {
          laadProject(gevonden.project, gevonden.id);
          $("#modal-achtergrond").hidden = true;
          toast("Offerte geopend");
        }
      } else {
        fetch(`/api/projecten/${knop.dataset.id}`).then((r) => r.json()).then((data) => {
          if (data.project) {
            laadProject(data.project, knop.dataset.id);
            $("#modal-achtergrond").hidden = true;
            toast("Offerte geopend");
          }
        });
      }
    } else if (actie === "project-verwijderen") {
      if (!confirm("Deze offerte definitief verwijderen?")) return;
      if (state.opslag === "lokaal") {
        lokaalVerwijderen(knop.dataset.id);
        openenDialog();
        toast("Offerte verwijderd");
      } else {
        fetch("/api/projecten/verwijder", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: knop.dataset.id }),
        }).then(() => { openenDialog(); toast("Offerte verwijderd"); });
      }
    }
    return;
  }

  if (e.target.id === "btn-nieuw") {
    if (!confirm("Een nieuwe offerte starten? Het huidige werk gaat verloren (tenzij je het opgeslagen hebt).")) return;
    laadProject(nieuwProject(), null);
    toast("Nieuwe offerte");
  } else if (e.target.id === "btn-opslaan") {
    opslaan();
  } else if (e.target.id === "btn-openen") {
    openenDialog();
  } else if (e.target.id === "btn-print") {
    window.print();
  } else if (e.target.id === "modal-sluiten" || e.target.id === "modal-achtergrond") {
    $("#modal-achtergrond").hidden = true;
  } else if (e.target.id === "btn-export") {
    exporteerJson();
  } else if (e.target.id === "btn-import") {
    $("#import-bestand").click();
  }
});

/* Toetsenbord: Enter of spatie op een wand voegt werk toe. */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const symbool = e.target.closest?.("[data-plan-regel]");
  if (symbool && symbool.tagName.toLowerCase() === "g") {
    e.preventDefault(); selecteerPlanRegel(symbool.dataset.planRegel); return;
  }
  const wand = e.target.closest && e.target.closest(".plan-wand, .plan-open");
  if (!wand) return;
  e.preventDefault();
  wijzig(() => regelToevoegen(wand.dataset.vlak, wand.dataset.soort || "muur"));
});

/* Tijdens het typen: het model bijwerken, maar het veld zelf niet opnieuw bouwen. */
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset.plaatsing) {
    const regel = state.project.regels.find(r => r.id === el.closest("[data-regel]")?.dataset.regel);
    if (!regel) return;
    regel.visualisatie ||= {};
    if (el.value === "") delete regel.visualisatie[el.dataset.plaatsing];
    else regel.visualisatie[el.dataset.plaatsing] = Math.max(0, getal(el.value));
    bewaarLokaal(); renderPlan(); renderOfferte(); return;
  }

  if (el.id === "tarief-zoeken") { filterTarieven(); return; }

  if (el.dataset.project) {
    const veld = el.dataset.project;
    state.project[veld] = ["uurtarief", "marge_pct", "korting_pct", "btw_pct"].includes(veld)
      ? getal(el.value) : el.value;
    bewaarLokaal();
    renderOfferte();
    planBerekening();
    return;
  }

  if (el.dataset.ruimte) {
    const ruimte = actieveRuimte();
    if (!ruimte) return;
    const veld = el.dataset.ruimte;
    ruimte[veld] = el.value;                       // ruwe tekst; normaliseren bij 'change'
    bewaarLokaal();
    if (veld === "naam") {
      const chip = document.querySelector(`[data-actie="ruimte-kiezen"][data-id="${ruimte.id}"]`);
      if (chip) chip.textContent = el.value || "Ruimte";
    } else {
      renderOppervlakken();
    }
    renderOfferte();
    planBerekening();
    return;
  }

  if (el.dataset.opening !== undefined) {
    const ruimte = actieveRuimte();
    const opening = ruimte?.openingen[Number(el.dataset.opening)];
    if (!opening) return;
    const veld = el.dataset.openingVeld;
    opening[veld] = veld === "positie" && el.value === "" ? null : el.value;
    bewaarLokaal();
    renderOppervlakken();
    renderOfferte();
    planBerekening();
    return;
  }

  if (el.dataset.tarief) {
    state.project.tarieven[el.dataset.tarief] = getal(el.value);
    filterTarieven();
    bewaarLokaal();
    planBerekening();
    return;
  }

  if (el.dataset.hoeveelheid !== undefined) {
    const id = el.closest("[data-regel]")?.dataset.regel;
    const regel = state.project.regels.find((r) => r.id === id);
    if (!regel) return;
    regel.hoeveelheid = getal(el.value);
    bewaarLokaal();
    planBerekening();
  }
});

/* Bij het verlaten van een veld: normaliseren en de kaart opnieuw opbouwen. */
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.planLaag) { planLagen[el.dataset.planLaag] = el.checked; renderPlan(); return; }
  if (el.dataset.plaatsing) { el.dispatchEvent(new Event("input", {bubbles:true})); return; }

  if (["tarief-categorie", "tarief-eigen", "tarief-zoeken"].includes(el.id)) {
    filterTarieven(); return;
  }


  if (el.dataset.tarief) {
    const t = tarievenEntries().find(t => t.sleutel === el.dataset.tarief);
    state.project.tarieven[el.dataset.tarief] = getal(el.value);
    if (t?.soort !== "taak") el.value = geldInvoer(el.value);
    bewaarLokaal();
    bereken();
    return;
  }
  if (el.dataset.project === "uurtarief") {
    state.project.uurtarief = getal(el.value);
    el.value = geldInvoer(el.value);
    bewaarLokaal();
    bereken();
    return;
  }

  if (el.name === "prijsmodus") {
    wijzig(() => { state.project.prijsmodus = el.value; });
    return;
  }

  if (el.dataset.regelVlak !== undefined) {
    const id = el.closest("[data-regel]")?.dataset.regel;
    wijzig(() => {
      const regel = state.project.regels.find(r => r.id === id);
      if (regel && vlakkenVoor(actieveRuimte()).some(v => v.sleutel === el.value)) regel.oppervlak = el.value;
    });
    return;
  }

  if (el.dataset.pakket !== undefined) {
    const id = el.closest("[data-regel]")?.dataset.regel;
    wijzig(() => {
      const regel = state.project.regels.find((r) => r.id === id);
      if (regel) {
        const pakketten = state.prijsboek?.pakketten || [];
        const oud = pakketten.find(p => p.id === regel.pakket_id)?.eenheid || "m2";
        const nieuw = pakketten.find(p => p.id === el.value)?.eenheid || "m2";
        regel.pakket_id = el.value; regel.opties = {};
        if (oud !== nieuw) regel.hoeveelheid = nieuw === "m2" ? null : 1;
      }
    });
    return;
  }

  if (el.dataset.optie) {
    const id = el.closest("[data-regel]")?.dataset.regel;
    wijzig(() => {
      const regel = state.project.regels.find((r) => r.id === id);
      if (regel) regel.opties[el.dataset.optie] = el.value;
    });
    return;
  }

  if (el.dataset.ruimte) {
    const ruimte = actieveRuimte();
    const veld = el.dataset.ruimte;
    if (ruimte) ruimte[veld] = veld === "naam" ? el.value : getal(el.value, ruimte[veld]);
    bewaarLokaal();
    render();
    bereken();
    return;
  }

  if (el.dataset.opening !== undefined) {
    const ruimte = actieveRuimte();
    const opening = ruimte?.openingen[Number(el.dataset.opening)];
    const veld = el.dataset.openingVeld;
    if (opening) {
      opening[veld] = (veld === "naam" || veld === "muur") ? el.value
        : veld === "positie" && el.value === "" ? null : getal(el.value, opening[veld]);
    }
    bewaarLokaal();
    render();
    bereken();
    return;
  }

  if (el.dataset.hoeveelheid !== undefined) {
    const id = el.closest("[data-regel]")?.dataset.regel;
    const regel = state.project.regels.find((r) => r.id === id);
    if (regel) {
      const pakket = state.prijsboek?.pakketten.find(p => p.id === regel.pakket_id);
      regel.hoeveelheid = Math.max(0, getal(el.value));
      if (pakket?.eenheid === "st") regel.hoeveelheid = Math.ceil(regel.hoeveelheid);
      el.value = regel.hoeveelheid;
    }
    bewaarLokaal();
    render();
    bereken();
    return;
  }

  if (el.id === "import-bestand" && el.files && el.files[0]) {
    const bestand = el.files[0];
    const lezer = new FileReader();
    lezer.onload = () => importeerJson(String(lezer.result || ""));
    lezer.readAsText(bestand);
  }
});

/* ---------------- opstart ---------------- */
async function laadLokaleEngine() {
  // De engine wordt als module geladen (window.BouwEngine). Wacht daar even op.
  for (let i = 0; i < 60; i++) {
    if (window.BouwEngine) return window.BouwEngine;
    await new Promise((r) => setTimeout(r, 50));
  }
  // Nóg een poging: dynamisch importeren.
  try {
    const module = await import("./engine.js");
    return module;
  } catch (_) {
    return null;
  }
}

async function init() {
  function kiesHoofdtab(naam) {
    const tarieven = naam === "tarieven";
    $("#calculator-paneel").hidden = tarieven;
    $("#paneel-tarieven").hidden = !tarieven;
    $("#paneel-tarieven").classList.toggle("actief", tarieven);
    $$("[data-hoofdtab]").forEach(tab => {
      const actief = tab.dataset.hoofdtab === naam;
      tab.classList.toggle("actief", actief);
      tab.setAttribute("aria-selected", String(actief));
      tab.tabIndex = actief ? 0 : -1;
    });
  }
  $$("[data-hoofdtab]").forEach(tab => {
    tab.addEventListener("click", () => kiesHoofdtab(tab.dataset.hoofdtab));
    tab.addEventListener("keydown", e => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const tabs = $$("[data-hoofdtab]");
      const volgende = e.key === "Home" ? tabs[0] : e.key === "End" ? tabs[1] : tabs.find(t => t !== tab);
      kiesHoofdtab(volgende.dataset.hoofdtab);
      volgende.focus();
    });
  });
  $$("#zijde .tab").forEach((tab) => tab.addEventListener("click", () => {
    kiesHoofdtab("calculator");
    $$("#zijde .tab").forEach((t) => {
      const actief = t === tab;
      t.classList.toggle("actief", actief);
      t.setAttribute("aria-selected", actief ? "true" : "false");
    });
    $$("#zijde .tabpaneel").forEach((p) => {
      const actief = p.dataset.paneel === tab.dataset.tab;
      p.classList.toggle("actief", actief);
      p.hidden = !actief;
    });
  }));

  try {
    // Lokaal geopend bestand (file://) kent geen API — dan direct de
    // ingesloten rekenkern gebruiken, zonder storende fetch-fouten.
    if (!/^https?:$/.test(location.protocol)) {
      throw new Error("lokaal bestand");
    }
    const antwoord = await fetch("/api/prijsboek");
    state.prijsboek = await antwoord.json();
    state.opslag = state.prijsboek.opslag || "server";
  } catch (fout) {
    // Geen API? Dan rekenen we gewoon in de browser met de JS-rekenkern.
    status("Geen server bereikbaar — reken lokaal in de browser.");
    const engine = await laadLokaleEngine();
    if (engine) {
      state.engine = engine;
      state.prijsboek = engine.prijsboek();
      state.opslag = "lokaal";
    } else {
      status("Kan de rekenkern niet laden.");
      state.prijsboek = { tarieven: [], pakketten: [] };
    }
  }

  let opgeslagen = null;
  try { opgeslagen = JSON.parse(localStorage.getItem(OPSLAG_SLEUTEL) || "null"); } catch (_) { opgeslagen = null; }
  laadProject(opgeslagen?.project || nieuwProject(), opgeslagen?.id || null);
  renderTarieven();
}

init();
