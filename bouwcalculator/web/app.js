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
  rekenStatus: "pending",
  opslag: "server",   // "server" (Python-server) of "lokaal" (Worker: alleen browser)
  engine: null,       // lokale rekenkern (fallback als er geen API is)
};

let projectReferentieJSON='';
let projectGeneratie=0; // UI document identity survives geometry clones and undo.

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

const projectHistorie = window.BouwHistorie.maak();
function laadProject(project, id = null) {
  if(window.BouwEngine){
    const normaal=window.BouwEngine.berekenOfferte(project).project;
    project={...project,huis:project.huis?{...project.huis,...normaal.huis}:normaal.huis,ruimtes:project.ruimtes.map((r,i)=>{
      const n=normaal.ruimtes[i];
      return {...r,contour:n.contour,dak:n.dak,wand_helling:n.wand_helling,huis_positie:n.huis_positie,...(n.contour.length||n.dak||Object.keys(n.wand_helling||{}).length?{lengte:n.lengte,breedte:n.breedte,hoogte:n.hoogte}:{})};
    })};
  }
  window.BouwMeten?.reset();
  planSelectie=null;planInspectieOpen=false;
  projectHistorie.reset(project);
  renderHistorie();
  projectGeneratie++;
  state.project = project;
  projectReferentieJSON=JSON.stringify(project);
  state.offerte = null;
  rekenStatus("pending");
  state.projectId = id;
  state.actieveRuimteId = project.ruimtes.length ? project.ruimtes[0].id : null;
  syncSidebar();
  render();
  bereken();
}

function renderHistorie() {
  if($('#plan-undo'))$('#plan-undo').disabled=!projectHistorie.kanUndo();
  if($('#plan-redo'))$('#plan-redo').disabled=!projectHistorie.kanRedo();
}
function historieStap(richting) {
  if(document.querySelector('#plan.is-slepen,#plan.is-pannen'))return;
  const project=richting==='undo'?projectHistorie.undo():projectHistorie.redo();
  if(!project)return;
  state.project=project;
  if(!project.ruimtes.some(r=>r.id===state.actieveRuimteId))state.actieveRuimteId=project.ruimtes[0]?.id || null;
  syncSidebar();bewaarLokaal(false);render();bereken();
  $('#plan-sleepstatus').textContent=richting==='undo'?'Wijziging ongedaan gemaakt.':'Wijziging opnieuw uitgevoerd.';
}
const opslagProblemen=new Set();
function opslagProbleem(soort,mislukt){
  if(mislukt)opslagProblemen.add(soort);else opslagProblemen.delete(soort);
  const banner=$('#opslag-waarschuwing');if(!banner)return;
  banner.hidden=opslagProblemen.size===0;
  document.body.classList.toggle('opslag-probleem',!banner.hidden);
  const text=opslagProblemen.has('archief')
    ?'Opslaan in deze browser is mislukt. Download een JSON-back-up voordat je deze pagina sluit.'
    :'Automatisch bewaren in deze browser is mislukt. Download een JSON-back-up voordat je deze pagina sluit.';
  if($('#opslag-waarschuwing-tekst').textContent!==text)$('#opslag-waarschuwing-tekst').textContent=text;
}
function bewaarLokaal(record=true) {
  if(record && state.project) {
    const el=document.activeElement;
    const sleutel=el?.matches('input:not([type="checkbox"]):not([type="radio"]),textarea') ? (el.dataset.fokus || el.id || '') : '';
    projectHistorie.record(state.project,sleutel);
  }
  renderHistorie();
  try {
    localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify({ project: state.project, id: state.projectId }));
    opslagProbleem('concept',false);
    return true;
  } catch (_) { opslagProbleem('concept',true);return false; }
}

function wijzig(actie) {
  actie();
  bewaarLokaal();
  render();
  bereken();
}

function rekenStatus(fase){
  state.rekenStatus=fase;
  const ready=fase==='ready',error=fase==='error';
  document.body.classList.toggle('reken-onzeker',!ready);
  $('#bereken-melding').hidden=ready;
  $('#bereken-melding-tekst').textContent=error?'Berekening mislukt. Getoonde bedragen zijn niet actueel; verstuur deze offerte nog niet.':'Berekening wordt bijgewerkt. Eerdere bedragen zijn nog niet actueel.';
  $('#bereken-opnieuw').hidden=!error;
  $('#offerte').setAttribute('aria-busy',String(fase==='pending'));
  if(!ready)$('#studio-totaal').textContent=error?'—':'…';
  $('#studio-totaal').title=ready?'Totaal inclusief btw':error?'Bedrag niet actueel: bereken opnieuw':'Bedrag wordt bijgewerkt';
  document.dispatchEvent(new Event('bouw-rekenstatus'));
}
$('#bereken-opnieuw').addEventListener('click',()=>bereken());
function planBerekening() {
  ++berekenVolgnummer; // Invalidate an older response immediately, not after debounce.
  rekenStatus('pending');
  clearTimeout(state.berekenTimer);
  state.berekenTimer = setTimeout(bereken, 220);
}

let berekenVolgnummer=0;
async function bereken() {
  const volgnummer=++berekenVolgnummer;
  clearTimeout(state.berekenTimer);
  if (!state.project) return;
  rekenStatus("pending");
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
      const resultaat = await antwoord.json();
      if(volgnummer!==berekenVolgnummer)return;
      state.offerte = resultaat;
    }
    rekenStatus("ready");
    const focus = bewaarFocus();
    renderOfferte();
    renderOppervlakken();
    renderRegelPrijzen();
    renderTarieven();
    renderPlan();
    window.BouwHuis?.renderSelectie();
    herstelFocus(focus);
    const waarschuwingen = state.offerte.waarschuwingen || [];
    status(waarschuwingen.length ? "⚠ " + waarschuwingen[0] : "Offerte bijgewerkt");
  } catch (fout) {
    if(volgnummer!==berekenVolgnummer)return;
    rekenStatus("error");
    status("Berekening mislukt — controleer de verbinding en probeer opnieuw.");
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

function ruimteWanden(room=actieveRuimte()) {
  if(!room)return [];
  if(room.contour?.length)return BouwVorm.edges(room).map(e=>({sleutel:e.id,naam:e.naam}));
  return ['noord','oost','zuid','west'].map(sleutel=>({sleutel,naam:'Wand '+sleutel}));
}
function ruimteVlakken(room=actieveRuimte()) {
  return [...ruimteWanden(room),{sleutel:'vloer',naam:'Vloer'},{sleutel:'plafond',naam:'Plafond'}];
}
function ruimteMaatTekst(r) {
  const basis=`${NRL.format(r.lengte)} × ${NRL.format(r.breedte)}`;
  if(!r.contour?.length&&!r.dak&&!Object.keys(r.wand_helling||{}).length)return `${basis} × ${NRL.format(r.hoogte)} m`;
  return `${Object.keys(r.wand_helling||{}).length?'schuine wanden · ':''}${r.contour?.length || 4} wanden · omhullend ${basis} m · ${r.dak?`plafond ${NRL.format(r.dak.start)}–${NRL.format(r.dak.eind)} m`:`hoogte ${NRL.format(r.hoogte)} m`}`;
}
function vlakOpties(room,keuze,alle=true) {
  return (alle?ruimteVlakken(room):ruimteWanden(room)).map(v=>`<option value="${esc(v.sleutel)}" ${v.sleutel===keuze?'selected':''}>${esc(v.naam)}</option>`).join('');
}
function vlakkenVoor(ruimte) {
  return state.offerte?.ruimtes.find((r) => r.id === ruimte.id)?.vlakken || [];
}

function renderRuimteChips() {
  const container = $("#ruimtechips");
  container.innerHTML = state.project.ruimtes.map((r) => `
    <button type="button" class="ruimtechip ${r.id === state.actieveRuimteId ? "actief" : ""}"
            data-actie="ruimte-kiezen" data-id="${esc(r.id)}"
            data-fokus="chip_${esc(r.id)}" aria-pressed="${r.id === state.actieveRuimteId}">${esc(r.naam || "Ruimte")}</button>
  `).join("") + `<button type="button" class="ruimtechip" data-actie="ruimte-toevoegen">${ICO.plus} Ruimte</button>`;
}

function renderRuimtekaart(ruimte) {
  const openingen = ruimte.openingen.map((o, i) => `
    <tr>
      <td><input type="text" value="${esc(o.naam)}" aria-label="Naam opening ${i + 1}" data-opening="${i}" data-opening-veld="naam"
                 data-fokus="o_${ruimte.id}_${i}_naam"></td>
      <td><select aria-label="Wand opening ${i + 1}" data-opening="${i}" data-opening-veld="muur" data-fokus="o_${ruimte.id}_${i}_muur">
        ${vlakOpties(ruimte,o.muur,false)}
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
        <input type="number" step="0.01" min="0" value="${esc(ruimte.lengte)}" data-ruimte="lengte" ${ruimte.contour?.length || ruimte.dak || ruimte.huis_positie || Object.keys(ruimte.wand_helling||{}).length ? 'disabled title="Wijzig via Ruimte tekenen"' : ''}
               data-fokus="r_${ruimte.id}_l"></label>
      <label class="veld"><span>Breedte</span>
        <input type="number" step="0.01" min="0" value="${esc(ruimte.breedte)}" data-ruimte="breedte" ${ruimte.contour?.length || ruimte.dak || ruimte.huis_positie || Object.keys(ruimte.wand_helling||{}).length ? 'disabled title="Wijzig via Ruimte tekenen"' : ''}
               data-fokus="r_${ruimte.id}_b"></label>
      <label class="veld"><span>Hoogte</span>
        <input type="number" step="0.01" min="0" value="${esc(ruimte.hoogte)}" data-ruimte="hoogte" ${ruimte.contour?.length || ruimte.dak || ruimte.huis_positie || Object.keys(ruimte.wand_helling||{}).length ? 'disabled title="Wijzig via Ruimte tekenen"' : ''}
               data-fokus="r_${ruimte.id}_h"></label>
    </div>
    <p class="hint">${ruimte.contour?.length?"Binnencontour met "+ruimte.contour.length+" wanden. Lengte/breedte zijn het omhullende bereik. ":""}${ruimte.dak?"Hoogte is de maximale plafondhoogte. ":""}<button type="button" class="knop klein" data-ruimte-tekenen>Ruimte tekenen / vorm wijzigen</button></p><div class="openings">
      <h3 style="font-size:.9rem;margin-bottom:6px">Openingen (deuren &amp; ramen)</h3>
      ${openingen ? `<table>
        <thead><tr><th>Naam</th><th>Muur</th><th>Breedte</th><th>Hoogte</th><th>Vanaf start</th><th>Boven vloer</th><th></th></tr></thead>
        <tbody>${openingen}</tbody></table>`
        : '<p class="klein-muted">Geen openingen. Klik hieronder om een deur of raam toe te voegen.</p>'}
      <p class="hint">Maten in meter. Vanaf start: noord/zuid vanaf west, oost/west vanaf noord. Bij vrije contour: vanaf het beginpunt van de genummerde wand. Leeg = automatisch. Openingen worden binnen de wand getekend.</p>
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
          ${vlakOpties(ruimte,locatie)}
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
      <h4>${esc(r.naam)} · ${esc(ruimteMaatTekst(ruimte))}</h4>
      ${window.BouwPlan.plattegrond(ruimte, r.vlakken || [], {}, {regels: planRegels(ruimte)})}
      <div class="plan-legenda print-plan-legenda">${planLegenda(planRegels(ruimte), true)}</div>
    </div>`;
  }).join("");
  if (!plannen) return "";
  return `<section class="offerte-plannen"><h3>Plattegronden</h3>${state.project.huis&&window.BouwHuis?`<div class="offerte-plan"><h4>Huisplan · één verdieping</h4>${window.BouwHuis.svg(state.project,'2d',null)}<p>Gedeelde wanden: afwerking per kamerzijde. Binnenmaten, zonder wanddikte.</p></div>`:''}${plannen}</section>`;
}

function renderOfferte() {
  const container = $("#offerte");
  const offerte = state.offerte;
  if (!container) return;
  if (!offerte) { container.innerHTML = ""; return; }
  const project = state.project;
  const totalen = offerte.totalen;
  if ($("#studio-totaal")) $("#studio-totaal").textContent = state.rekenStatus==='ready'?eur(totalen.totaal):state.rekenStatus==='error'?'—':'…';

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
          <span class="klein-muted">· ${esc(ruimteMaatTekst(project.ruimtes.find(r=>r.id===ruimte.id)||ruimte))}</span>
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
    <div class="offerte-tabel-scroll" role="region" aria-label="Offerteposten; horizontaal verschuifbaar op kleine schermen" tabindex="0"><table class="offerte-tabel">
      <thead><tr>
        <th>Omschrijving</th>
        <th class="num">Materiaal</th><th class="num">Arbeid</th><th class="num">Totaal</th>
      </tr></thead>
      <tbody>${rijen.join("")}</tbody>
    </table></div>
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
let planSelectie = null;
let planInspectieOpen = false;
const planCamera = { hoek: 0, zoom: 1, maten: true, panX: 0, panY: 0 };
let planGereedschap = "select";
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

const vuilbakIcoon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
function planLegenda(regels, print = false) {
  return regels.filter(r => r.aantal > 0).map(r => {
    const laag = window.BouwPlan.laag(r);
    if (!print && !planLagen[laag]) return "";
    const inhoud = `<b>${r.nummer}</b><span>${esc(r.pakket.naam)} · ${NRL.format(r.aantal)} ${esc(r.pakket.eenheid)}<small>${esc(r.oppervlak)} · ${Object.keys(r.visualisatie || {}).length ? "Plaatsing geheel/deels ingesteld" : "Automatische schemapositie"}</small></span>`;
    return print ? `<div class="plan-legenda-item laag-${laag} tint-${window.BouwPlan.tint(r)}">${inhoud}</div>`
      : `<div class="plan-legenda-rij"><button type="button" class="plan-legenda-item laag-${laag} tint-${window.BouwPlan.tint(r)}" data-plan-regel="${esc(r.id)}">${inhoud}</button><button type="button" class="plan-vuilbak" data-plan-verwijder="${esc(r.id)}" aria-label="${esc(r.pakket.naam)} verwijderen" title="Object en offertepost verwijderen">${vuilbakIcoon}</button></div>`;
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
  if (!ruimte || !window.BouwPlan) {
    planSelectie=null;planInspectieOpen=false;
    houder.innerHTML='<div class="plan-leeg"><strong>Start met een ruimte</strong><p>Voeg een ruimte toe om te tekenen en objecten te plaatsen.</p><button type="button" class="knop primair" data-actie="ruimte-toevoegen">+ Ruimte toevoegen</button></div>';
    $('#plan-selectie').hidden=true;$('#plan-inspector').hidden=true;
    $('#plan-legenda').innerHTML='';$('#plan-openingen').innerHTML='';
    $('#plan-objecten-aantal').textContent='Geen actieve ruimte';
    window.BouwMeten?.render();
    return;
  }

  const werk = {};
  Object.entries(werkPerVlak(ruimte)).forEach(([sleutel, info]) => {
    const aantal = `${info.aantal} regel${info.aantal > 1 ? "s" : ""}`;
    werk[sleutel] = info.totaal > 0 ? `${aantal} · ${eur(info.totaal)}` : aantal;
  });

  const keuzes=ruimteVlakken(ruimte);
  if(!keuzes.some(v=>v.sleutel===planVlak))planVlak=keuzes[0].sleutel;
  $('.vlak-keuze').innerHTML=keuzes.map(v=>`<button type="button" data-aanzicht-vlak="${esc(v.sleutel)}" data-fokus="vlak_${esc(v.sleutel)}" aria-pressed="false"><span>${esc(v.naam)}</span><small></small></button>`).join('');
  const vlakken = vlakkenVoor(ruimte);
  const tekenaar = planWeergave === "aanzicht" ? window.BouwPlan.aanzicht : planWeergave === "isometrie" ? window.BouwPlan.isometrie : window.BouwPlan.plattegrond;
  const regels = planRegels(ruimte);
  houder.innerHTML = tekenaar(ruimte, vlakken, werk, {...planCamera, regels, lagen: planLagen, vlak: planVlak});
  const legenda = $("#plan-legenda");
  if (legenda) legenda.innerHTML = planLegenda(planWeergave === "aanzicht" ? regels.filter(r=>r.oppervlak===planVlak) : regels) || '<p class="vlak-leeg">Nog geen zichtbare werken op dit vlak. Voeg hieronder een werkregel toe of schakel een laag in.</p>';
  $("#plan-openingen").innerHTML = (ruimte.openingen || []).map((o,index)=> {
    if(planWeergave === "aanzicht" && o.muur !== planVlak) return "";
    return `<div class="plan-opening-rij"><button type="button" class="plan-opening-select" data-plan-opening-select="${index}" aria-pressed="false"><strong>${esc(o.naam)}</strong><small>Opening · wand ${esc(o.muur)}</small></button><button type="button" class="plan-vuilbak" data-plan-opening-verwijder="${index}" aria-label="${esc(o.naam)} op wand ${esc(o.muur)} verwijderen" title="Opening verwijderen">${vuilbakIcoon}</button></div>`;
  }).join("");
  $("#plan-openingen").innerHTML += (ruimte.trappen||[]).map(t=>`<div class="plan-opening-rij"><button type="button" class="plan-opening-select" data-trap-edit="${esc(t.id)}"><strong>${esc(t.naam)}</strong><small>Trap · ${NR.format(t.breedte)} × ${NR.format(t.lengte)} m · bewerken/verwijderen</small></button></div>`).join('');
  $("#vlak-bediening").hidden = planWeergave !== "aanzicht";
  $("#sleepvlak-keuze").hidden = planWeergave !== "isometrie";
  $$("[data-aanzicht-vlak]").forEach(b=>{
    const v=vlakken.find(v=>v.sleutel===b.dataset.aanzichtVlak);
    b.setAttribute("aria-pressed",String(b.dataset.aanzichtVlak===planVlak));
    b.querySelector("small").textContent=v ? `${NRL.format(v.netto)} m² netto` : "";
  });
  $("#plan-objecten-aantal").textContent = `${regels.filter(r=>r.aantal>0).length} werkregels · ${(ruimte.openingen || []).length} openingen · ${(ruimte.trappen||[]).length} trappen in deze ruimte`;
  renderPlanSelectie();
  const bediening = $("#iso-bediening");
  if (bediening) bediening.hidden = false;
  $$('[data-camera="links"],[data-camera="rechts"],[data-camera="maten"]').forEach(b=>b.hidden=planWeergave!=="isometrie");
  const tip = $(".plantip");
  if (tip) tip.textContent = planWeergave === "aanzicht"
    ? "Sleep werken naar hun positie op dit vlak. Kies de locatie van een werkregel om die aan een ander vlak toe te wijzen."
    : "Klik op een wand om het objectmenu te openen. In 3D kun je draaien om alle wanden te bekijken.";
  const richting = $("#iso-richting");
  if (richting) richting.textContent = (planWeergave === "isometrie" ? ["Noord / west", "Noord / oost", "Zuid / oost", "Zuid / west"][planCamera.hoek] + " · " : "") + `${Math.round(planCamera.zoom * 100)}%`;
  const matenKnop = $('[data-camera="maten"]');
  if (matenKnop) matenKnop.setAttribute("aria-pressed", String(planCamera.maten));
  const minKnop = $('[data-camera="uit"]'), maxKnop = $('[data-camera="in"]');
  if (minKnop) minKnop.disabled = planCamera.zoom <= 0.75;
  if (maxKnop) maxKnop.disabled = planCamera.zoom >= 3;
  window.BouwMeten?.render();
}

function render() {
  const focus = bewaarFocus();
  renderRuimteChips();
  window.BouwHuis?.render();
  const ruimte = actieveRuimte();
  const kaart = $("#ruimtekaart");
  if (kaart) kaart.innerHTML = ruimte ? renderRuimtekaart(ruimte) : "";
  renderPlan();
  renderInstallaties();
  renderOppervlakken();
  renderRegels();
  renderOfferte();
  renderRegelPrijzen();
  window.BouwStudio?.sync();
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
function lokaleProjecten(strict=false) {
  try {
    const raw=localStorage.getItem(OPSLAG_LIJST),list=raw===null?[]:JSON.parse(raw);
    if(!Array.isArray(list)||!list.every(p=>p&&typeof p==='object'&&!Array.isArray(p)&&p.id!==undefined))throw Error('Ongeldig offertearchief');
    return list;
  } catch (fout) {
    opslagProbleem('archief',true);
    if(strict)throw fout;
    return [];
  }
}

function lokaalOpslaan(project, id) {
  const projectId = id || `${(project.naam || "offerte").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
  const entry = {
    id: projectId, naam: project.naam, klant: project.klant, datum: project.datum,
    ruimtes: (project.ruimtes || []).length, regels: (project.regels || []).length,
    gewijzigd: new Date().toISOString().slice(0, 16).replace("T", " "),
    project,
  };
  try {
    const overig=lokaleProjecten(true).filter(p=>p.id!==projectId);
    localStorage.setItem(OPSLAG_LIJST, JSON.stringify([entry, ...overig].slice(0, 50)));
  } catch (_) {
    // Geen opslag beschikbaar (privacymodus, iframe, gekopieerd bestand).
    opslagProbleem('archief',true);
    status("Opslaan kan hier niet — opslag vol of niet beschikbaar.");
    return null;
  }
  opslagProbleem('archief',false);
  return projectId;
}

function lokaalVerwijderen(id) {
  try {
    localStorage.setItem(OPSLAG_LIJST, JSON.stringify(lokaleProjecten(true).filter((p) => String(p.id) !== String(id))));
    return true;
  } catch (_) { return false; }
}

let opslaanBezig=false;
async function opslaan() {
  if (!state.project||opslaanBezig) return;
  opslaanBezig=true;
  const button=$('#btn-opslaan');button.disabled=true;button.setAttribute('aria-busy','true');
  const origineel=projectGeneratie,id=state.projectId,snapshot=JSON.parse(JSON.stringify(state.project));
  const dezelfdeOfferte=()=>projectGeneratie===origineel&&state.projectId===id;
  status("Opslaan…");
  try {
    let nieuwId;
    if (state.opslag === "lokaal") {
      nieuwId=lokaalOpslaan(snapshot,id);
      if(!nieuwId){toast("Kon niet opslaan — download een JSON-back-up");return;}
    } else {
      const antwoord=await fetch("/api/projecten/opslaan",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({project:snapshot,id}),
      });
      if(!antwoord.ok)throw Error('serverfout');
      const data=await antwoord.json();
      if(data.fout||!data.id)throw Error(data.fout||'Geen opslag-ID');
      nieuwId=data.id;
    }
    // A late response must never attach the old document's ID to a new project.
    if(!dezelfdeOfferte()){toast("Vorige offerte opgeslagen; je huidige offerte is niet gewijzigd");return;}
    const gewijzigd=JSON.stringify(state.project)!==JSON.stringify(snapshot);
    state.projectId=nieuwId;projectReferentieJSON=JSON.stringify(snapshot);bewaarLokaal(false);
    if(gewijzigd){status("Versie opgeslagen; nieuwere wijzigingen nog niet opgeslagen");toast("Versie opgeslagen — sla je nieuwere wijzigingen ook op");}
    else {status(state.opslag==='lokaal'?"Opgeslagen in deze browser":"Opgeslagen");toast(state.opslag==='lokaal'?"Offerte opgeslagen in deze browser":"Offerte opgeslagen");}
  } catch (_) {
    if(dezelfdeOfferte()){status("Opslaan mislukt");toast("Opslaan mislukt — controleer de verbinding en probeer opnieuw");}
    else toast("Vorige offerte kon niet worden opgeslagen");
  } finally {opslaanBezig=false;button.disabled=false;button.removeAttribute('aria-busy');}
}
$('#opslag-backup').addEventListener('click',exporteerJson);
$('#opslag-opnieuw').addEventListener('click',()=>{
  if(!state.project)return;
  if(opslagProblemen.has('archief')){
    const id=lokaalOpslaan(state.project,state.projectId);if(id){state.projectId=id;projectReferentieJSON=JSON.stringify(state.project);}
  }
  bewaarLokaal(false);
  if(!opslagProblemen.size){status('Bewaren in deze browser werkt weer');toast('Bewaren in deze browser werkt weer');}
});

let archiefProjecten=[],archiefRequest=0,archiefOpenRequest=0,archiefOpener=null,archiefRestoreFocus=true;
const archiefNorm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('nl-BE');
function archiefFout(tekst){$('#archief-feedback').textContent=tekst;$('#archief-feedback').hidden=!tekst;}
function sluitOpenenDialog(restore=true){
  archiefRestoreFocus=restore;
  ++archiefRequest;++archiefOpenRequest;
  $('#modal-achtergrond').close();$('#modal-achtergrond').hidden=true;
}
function renderArchief(){
  const query=archiefNorm($('#archief-zoeken').value.trim());
  const lijst=archiefProjecten.filter(p=>archiefNorm(`${p.naam||''} ${p.klant||''}`).includes(query));
  if($('#archief-sorteren').value==='naam')lijst.sort((a,b)=>String(a.naam||'').localeCompare(String(b.naam||''),'nl-BE',{numeric:true,sensitivity:'base'}));
  else lijst.sort((a,b)=>String(b.gewijzigd||'').localeCompare(String(a.gewijzigd||'')));
  const focused=document.activeElement?.closest('[data-actie]'),focusId=focused?.dataset.id,focusAction=focused?.dataset.actie;
  $('#archief-aantal').textContent=`${lijst.length} van ${archiefProjecten.length} offertes`;
  $('#modal-inhoud').innerHTML=lijst.length?`<div class="projectlijst">${lijst.map(p=>`<div class="projectregel"><span class="naam">${esc(p.naam||'Naamloze offerte')}<br><span class="meta">${esc(p.klant||'Geen klant')} · ${esc(p.ruimtes??0)} ruimte(s) · ${esc(String(p.gewijzigd||'').replace('T',' '))}</span></span><button type="button" class="knop klein" data-actie="project-laden" data-id="${esc(p.id)}" aria-label="Open ${esc(p.naam||'offerte')}">Openen</button><button type="button" class="knop klein gevaar ico-only" data-actie="project-verwijderen" data-id="${esc(p.id)}" aria-label="Verwijder ${esc(p.naam||'offerte')}">${ICO.prullenbak}</button></div>`).join('')}</div>`:`<p class="hint">${query?'Geen offertes gevonden. Pas je zoekterm aan.':'Nog geen opgeslagen offertes. Bewaar eerst je huidige offerte met Opslaan.'}</p>`;
  if(focusId&&$('#modal-achtergrond').open){
    const next=[...$('#modal-inhoud').querySelectorAll('[data-actie]')].find(b=>b.dataset.id===focusId&&b.dataset.actie===focusAction);
    (next||$('#archief-zoeken')).focus({preventScroll:true});
  }
}
async function openenDialog(){
  const modal=$('#modal-achtergrond'),ticket=++archiefRequest;
  if(!modal.open){
    archiefOpener=document.activeElement?.closest('#bestand-menu')?$('#bestand-menu summary'):document.activeElement;
    archiefRestoreFocus=true;archiefProjecten=[];$('#modal-inhoud').textContent='';
    $('#archief-zoeken').value='';modal.hidden=false;modal.showModal();$('#archief-zoeken').focus();
  }
  archiefFout('');$('#archief-opnieuw').hidden=true;$('#archief-aantal').textContent='Offertes laden…';
  $('#modal-opslag').textContent=state.opslag==='lokaal'?'Bewaard in deze browser. Niet automatisch beschikbaar op andere apparaten.':'Bewaard op je server.';
  $('#modal-inhoud').setAttribute('aria-busy','true');
  try{
    let projecten;
    if(state.opslag==='lokaal')projecten=lokaleProjecten(true);
    else{
      const antwoord=await fetch('/api/projecten');if(!antwoord.ok)throw Error('serverfout');
      const data=await antwoord.json();if(data.fout||!Array.isArray(data.projecten))throw Error('Ongeldige projectlijst');projecten=data.projecten;
    }
    if(ticket!==archiefRequest||!modal.open)return;
    archiefProjecten=projecten;renderArchief();
  }catch(_){
    if(ticket!==archiefRequest||!modal.open)return;
    archiefProjecten=[];$('#modal-inhoud').textContent='';$('#archief-aantal').textContent='';
    archiefFout('Opgeslagen offertes konden niet worden geladen. Probeer opnieuw; je huidige offerte blijft behouden.');$('#archief-opnieuw').hidden=false;
  }finally{if(ticket===archiefRequest)$('#modal-inhoud').setAttribute('aria-busy','false');}
}
async function openArchiefProject(id){
  if(JSON.stringify(state.project)!==projectReferentieJSON&&!confirm('Je huidige offerte heeft wijzigingen sinds openen of opslaan. Toch vervangen? Sla op of download eerst een JSON-back-up als je deze wijzigingen wilt bewaren.'))return;
  const ticket=++archiefOpenRequest,generatie=projectGeneratie;
  archiefFout('');
  try{
    let project,projectId=id;
    if(state.opslag==='lokaal'){
      const entry=lokaleProjecten(true).find(p=>String(p.id)===id);if(!entry?.project)throw Error('Niet gevonden');
      project=entry.project;projectId=entry.id;
    }else{
      const response=await fetch(`/api/projecten/${encodeURIComponent(id)}`);if(!response.ok)throw Error('serverfout');
      const data=await response.json();if(data.fout||!data.project)throw Error('Niet gevonden');project=data.project;
    }
    if(ticket!==archiefOpenRequest||!$('#modal-achtergrond').open||generatie!==projectGeneratie)return;
    laadProject(project,projectId);sluitOpenenDialog(false);window.BouwHuis?.setLevel(project.huis?'huis':'ruimte');studioOpen('tekening');toast('Offerte geopend');
  }catch(_){if(ticket===archiefOpenRequest&&$('#modal-achtergrond').open)archiefFout('Deze offerte kon niet worden geopend. Je huidige offerte is niet gewijzigd.');}
}
$('#archief-zoeken').addEventListener('input',renderArchief);
$('#archief-sorteren').addEventListener('change',renderArchief);
$('#archief-opnieuw').addEventListener('click',openenDialog);
$('#modal-achtergrond').addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();sluitOpenenDialog();}
  else if(e.key==='ArrowDown'&&e.target.id==='archief-zoeken'){e.preventDefault();$('#modal-inhoud [data-actie="project-laden"]')?.focus();}
});
$('#modal-achtergrond').addEventListener('close',()=>{
  if($('#modal-achtergrond').open)return;
  $('#modal-achtergrond').hidden=true;++archiefRequest;++archiefOpenRequest;
  if(archiefRestoreFocus&&archiefOpener?.isConnected&&archiefOpener.getClientRects().length)archiefOpener.focus({preventScroll:true});
});

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
  $("#plan-acties").open=false;
  if(planSelectie?.type!=='regel'||planSelectie.id!==id)planInspectieOpen=false;
  planSelectie = {type:'regel',id};
  renderPlanSelectie();
}
function selecteerPlanOpening(index) {
  $("#plan-acties").open=false;
  if(planSelectie?.type!=='opening'||planSelectie.index!==index||planSelectie.ruimteId!==actieveRuimte()?.id)planInspectieOpen=false;
  planSelectie = {type:'opening',index,ruimteId:actieveRuimte()?.id};
  renderPlanSelectie();
}
function renderPlanSelectie() {
  const room=actieveRuimte(),bar=$("#plan-selectie");
  if(!bar)return;
  const regel=planSelectie?.type==='regel' && state.project.regels.find(r=>r.id===planSelectie.id && r.ruimte_id===room?.id);
  const opening=planSelectie?.type==='opening' && planSelectie.ruimteId===room?.id && room?.openingen[planSelectie.index];
  if(!regel && !opening)planSelectie=null;
  bar.hidden=!planSelectie;
  if(!planSelectie)$("#plan-acties").open=false;
  const traceregel=regel && planRegels(room).find(r=>r.id===regel.id);
  const lengte=traceregel?BouwPlan.traceLengte(traceregel,room):null;
  const overnemen=$('#plan-tracelengte'),info=$('#plan-trace-info');
  overnemen.hidden=info.hidden=lengte==null;
  if(lengte!=null){
    const aantal=Math.round((lengte+Number.EPSILON)*100)/100;
    overnemen.disabled=aantal<=0;
    overnemen.textContent=`Tracélengte overnemen (${NR.format(aantal)} m)…`;
    info.textContent=`Rechte 3D-lengte: ${NR.format(aantal)} m · Offerte: ${NR.format(regel.hoeveelheid ?? traceregel.aantal)} m. Geen bochten of reserve.`;
  }
  const melding=$('#plan-vorm-melding');melding.hidden=true;
  if((room?.contour?.length || room?.dak || Object.keys(room?.wand_helling||{}).length) && (regel||opening)){
    let buiten=false;
    if(traceregel){
      const g=BouwPlan.werkGeometrie(traceregel,room),a={x:g.a[0],y:g.a[1]},b={x:g.b[0],y:g.b[1]};
      buiten=!BouwVorm.inside(room,a)||g.a[2]>BouwVorm.height(room,a.x,a.y)+.001;
      if(traceregel.pakket.eenheid==='m')buiten ||= !BouwVorm.segmentInside(room,a,b)||g.b[2]>BouwVorm.height(room,b.x,b.y)+.001;
    }else if(opening){
      const edge=BouwVorm.edges(room).find(e=>e.id===opening.muur),g=BouwPlan.openingGeometrie(room,planSelectie.index);
      if(!edge||!g)buiten=true;
      else if(Object.keys(room.wand_helling||{}).length){const f=BouwVorm.wallFrame(room,opening.muur),start=Number(opening.positie??g.start),onder=Number(opening.borstwering||0),h=Number(opening.hoogte),width=Number(opening.breedte),low=BouwVorm.wallRange(room,opening.muur,onder),high=BouwVorm.wallRange(room,opening.muur,onder+h);buiten=onder+h>f.height+.001||width>g.breedte+.001||start<Math.max(low[0],high[0])-.001||start+width>Math.min(low[1],high[1])+.001;}
      else{const start=opening.positie ?? g.start,end=Number(start)+Number(opening.breedte),h=Math.min(BouwVorm.height(room,edge.a.x+edge.u[0]*start,edge.a.y+edge.u[1]*start),BouwVorm.height(room,edge.a.x+edge.u[0]*end,edge.a.y+edge.u[1]*end));buiten=Number(start)<0||end>edge.lengte+.001||Number(opening.borstwering||0)+Number(opening.hoogte)>h+.001;}
    }
    melding.hidden=!buiten;melding.textContent='⚠ Buiten de contour of boven het plafond, of de opening past niet. Controleer de plaatsing. De tekening kan maten begrenzen; de meetstaat gebruikt de opgegeven maten.';
  }
  renderPlanInspector(regel,opening);
  $('#plan-eigenschappen').setAttribute('aria-expanded',String(!$('#plan-inspector').hidden));
  const geometry=traceregel?BouwPlan.werkGeometrie(traceregel,room):opening?BouwPlan.openingGeometrie(room,planSelectie.index):null;
  $('#plan-selectie-positie').textContent=geometry?`X ${NR.format(geometry.a[0])} · Y ${NR.format(geometry.a[1])} · Z ${NR.format(geometry.a[2])} m`:'';
  $$('#plan-openingen [data-plan-opening-select]').forEach(b=>b.setAttribute('aria-pressed',String(!!opening&&Number(b.dataset.planOpeningSelect)===planSelectie.index)));
  $$('#plan-legenda [data-plan-regel]').forEach(b=>b.setAttribute('aria-pressed',String(!!regel&&b.dataset.planRegel===regel.id)));
  $$('#plan [data-opening-index]').forEach(el=>el.classList.toggle('plan-geselecteerd',!!opening && Number(el.dataset.openingIndex)===planSelectie.index));
  $$('#plan [data-plan-regel]').forEach(el=>el.classList.toggle('plan-geselecteerd',!!regel && el.dataset.planRegel===regel.id));
  const verwijder=$("#plan-selectie-verwijder");
  verwijder.innerHTML=vuilbakIcoon;
  delete verwijder.dataset.planVerwijder;delete verwijder.dataset.planOpeningVerwijder;
  if(regel) {
    $("#plan-selectie-naam").textContent=state.prijsboek.pakketten.find(p=>p.id===regel.pakket_id)?.naam || 'Werkregel';
    verwijder.dataset.planVerwijder=regel.id;
  }
  if(opening) {
    $("#plan-selectie-naam").textContent=`${opening.naam} · wand ${opening.muur}`;
    verwijder.dataset.planOpeningVerwijder=String(planSelectie.index);
  }
}
function studioOpen(id, opties) {
  if(window.BouwStudio)return window.BouwStudio.open(id, opties);
  if(['ruimte-invoer','werk-invoer','installatie-invoer'].includes(id))window.BouwHuis?.setLevel('ruimte');
  const doel=document.getElementById(id==='tekening'&&window.BouwHuis?.getLevel()==='huis'?'huis-paneel':id);if(!doel)return;
  if(document.querySelector('#teken-focus[open]') && !$('#tekening').contains(doel) && doel.id!=='tekening')sluitTekenFocus();
  if(id==='tekening')document.querySelectorAll('#calculator-paneel details[open]').forEach(d=>d.open=false);
  for(let el=doel;el;el=el.parentElement)if(el.tagName==='DETAILS')el.open=true;
  document.querySelectorAll('[data-studio-doel]').forEach(b=>{b.classList.toggle('studio-nav-actief',b.dataset.studioDoel===id);b.setAttribute('aria-current',b.dataset.studioDoel===id?'location':'false');});
  doel.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  if(doel.tagName==='DETAILS')doel.querySelector('summary')?.focus({preventScroll:true});
  else doel.focus({preventScroll:true});
}

document.addEventListener("click", (e) => {
  const nav=e.target.closest('[data-studio-doel]');
  if(nav){studioOpen(nav.dataset.studioDoel, {exclusive:true});return;}
  const openingKeuze=e.target.closest('[data-plan-opening-select]');
  if(openingKeuze){selecteerPlanOpening(Number(openingKeuze.dataset.planOpeningSelect));return;}
  if(e.target.closest('#plan-deselecteer')){planSelectie=null;renderPlanSelectie();return;}
  if(e.target.closest('#plan-undo')){historieStap('undo');return;}
  if(e.target.closest('#plan-redo')){historieStap('redo');return;}
  if(e.target.closest('#plan-eigenschappen')){
    planInspectieOpen=!planInspectieOpen;renderPlanSelectie();
    if(planInspectieOpen)$('#plan-inspector input')?.focus({preventScroll:true});
    return;
  }
  if(e.target.closest('#plan-volledige-regel')){

    if(planSelectie?.type==='regel'){
      studioOpen('werk-invoer');
      const veld=$$('[data-hoeveelheid]').find(el=>el.closest('[data-regel]')?.dataset.regel===planSelectie.id);
      veld?.scrollIntoView({block:'center'});veld?.focus({preventScroll:true});
    } else if(planSelectie?.type==='opening'){
      studioOpen('ruimte-invoer');
      document.querySelector(`[data-opening="${planSelectie.index}"][data-opening-veld="positie"]`)?.focus({preventScroll:true});
    }
    return;
  }
  const verwijder=e.target.closest('[data-plan-verwijder]');
  if(verwijder) {
    const regel=state.project.regels.find(r=>r.id===verwijder.dataset.planVerwijder);
    if(!regel)return;
    const naam=state.prijsboek.pakketten.find(p=>p.id===regel.pakket_id)?.naam || 'Object';
    if(confirm(`“${naam}” verwijderen uit de tekening én de offerte?`)) {
      wijzig(()=>{state.project.regels=state.project.regels.filter(r=>r.id!==regel.id);});
      toast('Object en offertepost verwijderd.');
    }
    return;
  }
  const openingKnop=e.target.closest('[data-plan-opening-verwijder]');
  if(openingKnop) {
    const ruimte=actieveRuimte(),index=Number(openingKnop.dataset.planOpeningVerwijder),o=ruimte?.openingen[index];
    if(o && confirm(`“${o.naam}” op wand ${o.muur} verwijderen? De netto-oppervlakte en offerte worden opnieuw berekend.`)) {
      planSelectie=null;wijzig(()=>{ruimte.openingen.splice(index,1);});toast('Opening verwijderd.');
    }
    return;
  }
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
    if (veld) { studioOpen('werk-invoer'); veld.focus(); veld.select(); }
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
  if (vlakKnop) {planCamera.panX=planCamera.panY=0;planVlak=vlakKnop.dataset.aanzichtVlak;renderPlan();return;}
  const cameraKnop = e.target.closest("[data-camera]");
  if (cameraKnop) {
    const actie = cameraKnop.dataset.camera;
    if (actie === "links") planCamera.hoek = (planCamera.hoek + 3) % 4;
    if (actie === "rechts") planCamera.hoek = (planCamera.hoek + 1) % 4;
    if (actie === "in") planCamera.zoom = Math.min(3, +(planCamera.zoom + 0.25).toFixed(2));
    if (actie === "uit") planCamera.zoom = Math.max(0.75, +(planCamera.zoom - 0.25).toFixed(2));
    if (actie === "maten") planCamera.maten = !planCamera.maten;
    if (actie === "reset") Object.assign(planCamera, {hoek: 0, zoom: 1, maten: true, panX: 0, panY: 0});
    renderPlan();
    return;
  }

  /* Weergave wisselen: bovenaanzicht <-> 3D */
  const weergave = e.target.closest("[data-plan]");
  if (weergave) {
    planCamera.panX=planCamera.panY=0;
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
    document.dispatchEvent(new CustomEvent('bouw-object-menu',{detail:{vlak:wand.dataset.vlak}}));
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
        Object.assign(planCamera,{panX:0,panY:0,zoom:1});
        state.actieveRuimteId = id;
      });
    } else if (actie === "ruimte-kiezen") {
      Object.assign(planCamera,{panX:0,panY:0,zoom:1});
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
      window.BouwOpeningen.open(knop.dataset.soort || 'Deur');
    } else if (actie === "opening-verwijderen") {
      const ruimte = actieveRuimte();
      const index = Number(knop.dataset.index);
      planSelectie=null;wijzig(() => { ruimte.openingen.splice(index, 1); });
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
      openArchiefProject(knop.dataset.id);
    } else if (actie === "project-verwijderen") {
      if (!confirm("Deze offerte definitief verwijderen?")) return;
      const request=archiefRequest;
      const afgerond=()=>{if($('#modal-achtergrond').open&&request===archiefRequest){openenDialog();toast('Offerte verwijderd');}};
      if(state.opslag==='lokaal'){
        if(lokaalVerwijderen(knop.dataset.id))afgerond();
        else {archiefFout('Verwijderen mislukt — de offerte is behouden');toast('Verwijderen mislukt — de offerte is behouden');}
      }else{
        fetch('/api/projecten/verwijder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:knop.dataset.id})})
          .then(async r=>{if(!r.ok)throw Error('serverfout');const d=await r.json();if(d.fout||!d.verwijderd)throw Error('Niet verwijderd');afgerond();})
          .catch(()=>{if($('#modal-achtergrond').open&&request===archiefRequest)archiefFout('Verwijderen mislukt — probeer opnieuw.');});
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
    if(state.rekenStatus!=='ready'){toast('Bereken de offerte eerst opnieuw voordat je print');studioOpen('offertepaneel');return;}
    window.print();
  } else if (e.target.id === "modal-sluiten" || e.target.id === "modal-achtergrond") {
    sluitOpenenDialog();
  } else if (e.target.id === "btn-export") {
    exporteerJson();
  } else if (e.target.id === "btn-import") {
    $("#import-bestand").click();
  }
});

/* Toetsenbord: Enter of spatie op een wand voegt werk toe. */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const opening=e.target.closest?.('[data-plan-drag="opening"]');
  if(opening){e.preventDefault();selecteerPlanOpening(Number(opening.dataset.openingIndex));return;}
  const symbool = e.target.closest?.("[data-plan-regel]");
  if (symbool && symbool.tagName.toLowerCase() === "g") {
    e.preventDefault(); selecteerPlanRegel(symbool.dataset.planRegel); return;
  }
  const wand = e.target.closest && e.target.closest(".plan-wand, .plan-open");
  if (!wand) return;
  e.preventDefault();
  document.dispatchEvent(new CustomEvent('bouw-object-menu',{detail:{vlak:wand.dataset.vlak}}));
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
  await laadLokaleEngine();
  const tabScroll={calculator:0,tarieven:0};
  let hoofdtab='calculator';
  function kiesHoofdtab(naam) {
    const changed=naam!==hoofdtab;
    if(changed){tabScroll[hoofdtab]=window.scrollY;hoofdtab=naam;}
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
    if(changed)window.scrollTo({top:tabScroll[naam]||0,behavior:'instant'});
    window.BouwStudio?.sync();
  }
  $$("[data-hoofdtab]").forEach(tab => {
    tab.addEventListener("click", () => kiesHoofdtab(tab.dataset.hoofdtab));
    tab.addEventListener("keydown", e => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const tabs = $$("[data-hoofdtab]");
      const volgende = e.key === "Home" ? tabs[0] : e.key === "End" ? tabs[1] : tabs.find(t => t !== tab);
      kiesHoofdtab(volgende.dataset.hoofdtab);
      volgende.focus({preventScroll:true});
    });
  });
  $$("#zijde .tab").forEach((tab) => tab.addEventListener("click", () => {
    kiesHoofdtab("calculator");
    $$("#zijde .tab").forEach((t) => {
      const actief = t === tab;
      t.classList.toggle("actief", actief);
      t.setAttribute("aria-selected", actief ? "true" : "false");
      t.tabIndex = actief ? 0 : -1;
    });
    $$("#zijde .tabpaneel").forEach((p) => {
      const actief = p.dataset.paneel === tab.dataset.tab;
      p.classList.toggle("actief", actief);
      p.hidden = !actief;
    });
  }));
  $$("#zijde .tab").forEach(tab=>tab.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();const tabs=$$('#zijde .tab');
    const next=e.key==='Home'?tabs[0]:e.key==='End'?tabs.at(-1):tabs.find(t=>t!==tab);
    next.click();next.focus();
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
      rekenStatus("error");
      status("Kan de rekenkern niet laden.");
      state.prijsboek = { tarieven: [], pakketten: [] };
    }
  }

  let opgeslagen = null;
  try { opgeslagen = JSON.parse(localStorage.getItem(OPSLAG_SLEUTEL) || "null"); } catch (_) { opgeslagen = null; }
  try {laadProject(opgeslagen?.project || nieuwProject(), opgeslagen?.id || null);}
  catch(fout){laadProject(nieuwProject());toast('Opgeslagen offerte heeft een ongeldige ruimtevorm. Herstel de JSON; de oude opslag is nog niet overschreven.');}
  renderTarieven();
}

init();

/* One accessible catalog for the current room, available without scrolling
   through the separate installation sections. Native dialog traps focus. */
(function objectCatalogus() {
  const menu = document.querySelector('#object-menu');
  let categorie = 'alle';
  const normalize = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const groep = p => p.id.startsWith('elek_') ? 'elektriciteit' : p.id.startsWith('san_') ? 'sanitair' : 'afwerking';
  function catalogus() {
    return [...(state.prijsboek?.pakketten || []).map(p=>({...p,groep:groep(p)})),
      {id:'opening-deur',naam:'Deur',beschrijving:'Deuropening in een wand',eenheid:'opening',groep:'openingen'},
      {id:'opening-raam',naam:'Raam',beschrijving:'Raamopening met instelbare borstwering',eenheid:'opening',groep:'openingen'}];
  }
  function resultaten() {
    const zoek=normalize($('#object-zoek').value).trim();
    const lijst=catalogus().filter(p=>(categorie==='alle' || p.groep===categorie)
      && normalize(`${p.naam} ${p.beschrijving} ${p.groep}`).includes(zoek));
    $('#object-resultaten').innerHTML=lijst.map(p=>`<button type="button" class="object-item" data-object-toevoegen="${esc(p.id)}"><span class="object-item-plus" aria-hidden="true">+</span><span><strong>${esc(p.naam)}</strong><small>${esc(p.groep)} · ${p.eenheid==='m2' ? 'Automatisch gemeten m²' : p.eenheid==='m' ? 'Per lopende meter' : p.eenheid==='st' ? 'Per stuk' : 'Wandopening'}</small></span></button>`).join('') || '<p class="object-geen">Geen objecten gevonden. Probeer een andere zoekterm of categorie.</p>';
  }
  function openMenu(vlak) {
    const room=actieveRuimte();
    if(!room || !state.prijsboek) {toast('Voeg eerst een ruimte toe.');return;}
    $('#object-menu-ruimte').textContent=`Voor ${room.naam} · selecteer het vlak en voeg direct toe`;
    $('#object-vlak').innerHTML=vlakOpties(room,vlak || (planWeergave==='aanzicht' ? planVlak : ruimteWanden(room)[0].sleutel));
    $('#object-menu-status').textContent='Kies een object. Het menu blijft open om meerdere toe te voegen.';
    resultaten();if(!menu.open)menu.showModal();$('#object-zoek').focus();
  }
  document.addEventListener('bouw-object-menu',e=>openMenu(e.detail?.vlak));
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-object-menu]')) {openMenu();return;}
    const cat=e.target.closest('[data-object-categorie]');
    if(cat){categorie=cat.dataset.objectCategorie;$$('[data-object-categorie]').forEach(b=>b.setAttribute('aria-pressed',String(b===cat)));resultaten();return;}
    const add=e.target.closest('[data-object-toevoegen]');
    if(!add)return;
    const room=actieveRuimte(),item=catalogus().find(p=>p.id===add.dataset.objectToevoegen);
    if(!room || !item)return;
    const vlak=$('#object-vlak').value;
    const opening=item.groep==='openingen';
    if(opening && ['vloer','plafond'].includes(vlak)){$('#object-menu-status').textContent='Kies een wand voor deze deur of dit raam.';$('#object-vlak').focus();return;}
    if(opening){menu.close();window.BouwOpeningen.open(item.naam,vlak);return;}
    if(!opening && item.eenheid!=='m2' && !$('#object-aantal').reportValidity())return;
    const aantal=Number($('#object-aantal').value),id=uid();
    wijzig(()=>{
      state.project.regels.push({id,ruimte_id:room.id,oppervlak:vlak,pakket_id:item.id,opties:{},hoeveelheid:item.eenheid==='m2'?null:aantal,notitie:''});
    });
    $('#object-menu-status').textContent=`${item.naam} toegevoegd op ${$('#object-vlak').selectedOptions[0].textContent.toLowerCase()}. Je kunt nog een object kiezen of het menu sluiten.`;
  });
  $('#object-zoek').addEventListener('input',resultaten);
  $('#object-menu-sluit').addEventListener('click',()=>menu.close());
  menu.addEventListener('click',e=>{
    const b=menu.getBoundingClientRect();
    if(e.target===menu && (e.clientX<b.left || e.clientX>b.right || e.clientY<b.top || e.clientY>b.bottom))menu.close();
  });
})();

/* Print the full quote even while its disclosure is closed. Restore UI afterward. */
(function studioPrint() {
  let gesloten=[],printActief=false;
  window.addEventListener('beforeprint',()=>{
    if(printActief)return;printActief=true;
    gesloten=[...document.querySelectorAll('#calculator-paneel details:not([open])')];
    gesloten.forEach(d=>d.open=true);
  });
  window.addEventListener('afterprint',()=>{gesloten.forEach(d=>d.open=false);gesloten=[];printActief=false;});
})();

(function bestandNavigatie() {
  const bestand=document.getElementById('bestand-menu');
  document.addEventListener('click',e=>{
    if(!bestand.contains(e.target) || e.target.closest('#bestand-menu button'))bestand.open=false;
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && bestand.open){bestand.open=false;bestand.querySelector('summary').focus();}
  });
})();

/* Leave native text-field undo intact; project shortcuts apply on the canvas. */
document.addEventListener('keydown',e=>{
  if(!(e.ctrlKey || e.metaKey) || e.altKey || e.defaultPrevented)return;
  if(e.target.closest?.('input,textarea,select,[contenteditable="true"]') || document.querySelector('dialog[open]:not(#teken-focus),#modal-achtergrond:not([hidden])'))return;
  const toets=e.key.toLowerCase();
  if(toets!=='z' && toets!=='y')return;
  e.preventDefault();historieStap(toets==='y' || e.shiftKey?'redo':'undo');
});

/* Small, explicit-submit editor beside the drawing; draft input survives redraws. */
function renderPlanInspector(regel,opening) {
  const panel=$('#plan-inspector');
  if(!panel)return;
  panel.hidden=!planInspectieOpen || (!regel && !opening);
  if(panel.hidden)return;
  const key=regel?`r_${regel.id}`:`o_${actieveRuimte().id}_${planSelectie.index}`;
  if(panel.dataset.selectie===key && panel.contains(document.activeElement))return;
  panel.dataset.selectie=key;
  const room=actieveRuimte(),L=Math.max(.2,Number(room.lengte)||.2),B=Math.max(.2,Number(room.breedte)||.2),H=Math.max(.2,Number(room.hoogte)||.2);
  const vlakken=(opening?ruimteWanden(room):ruimteVlakken(room));
  const vlak=opening?opening.muur:regel.oppervlak;
  const veld=(naam,label,value,max,min=0,step='any')=>`<label>${label}<input type="number" name="${naam}" min="${min}" ${max!=null?`max="${max}"`:''} step="${step}" value="${esc(value)}" required data-fokus="ins_${key}_${naam}"></label>`;
  let inhoud=`<label>Vlak<select name="vlak" data-fokus="ins_${key}_vlak">${vlakken.map(v=>`<option value="${esc(v.sleutel)}" ${v.sleutel===vlak?'selected':''}>${esc(v.naam)}</option>`).join('')}</select></label>`;
  if(regel){
    const r=planRegels(room).find(r=>r.id===regel.id),g=window.BouwPlan.werkGeometrie(r,room);
    const coord=(arr,eind=false)=>arr.map((value,i)=>veld(['x','y','z'][i]+(eind?'2':''),`${eind?'Eind ':''}${['X vanaf west','Y vanaf noord','Z boven vloer'][i]} (m)`,value,[L,B,H][i])).join('');
    inhoud+=coord(g.a);
    if(r.pakket.eenheid==='m')inhoud+=coord(g.b,true);
    if(r.pakket.eenheid!=='m2')inhoud+=veld('aantal',r.pakket.eenheid==='m'?'Gemeten lengte (m)':'Aantal',regel.hoeveelheid ?? r.aantal,null,.01,'any');
  }else{
    const g=window.BouwPlan.openingGeometrie(room,planSelectie.index);
    inhoud+=veld('positie','Vanaf start wand (m)',g.start ?? g.a[['noord','zuid'].includes(vlak)?0:1],null);
    inhoud+=veld('borstwering','Onderkant boven vloer (m)',opening.borstwering || 0,H);
    inhoud+=veld('breedte','Breedte (m)',opening.breedte,null,.01);
    inhoud+=veld('hoogte','Hoogte (m)',opening.hoogte,H,.01);
    inhoud+=veld('aantal','Aantal openingen',opening.aantal ?? 1,null,1,1);
  }
  panel.innerHTML=`<form id="plan-inspector-form"><header><strong>Eigenschappen bij de tekening</strong><span>Wijzig velden en bevestig met Toepassen.</span></header><div class="plan-inspector-velden">${inhoud}</div><p class="hint">${opening?'Openingmaten en aantallen wijzigen ook de netto-oppervlakte en offerte.':regel.pakket_id && state.prijsboek.pakketten.find(p=>p.id===regel.pakket_id)?.eenheid==='m2'?'Deze positie verplaatst alleen het m²-label; het gemeten vlak blijft gelijk.':'Posities wijzigen geen prijs. Aantal of gemeten lengte wijzigen de offerte wel.'}</p><p id="plan-inspector-fout" role="alert"></p><footer><button class="knop primair" type="submit">Toepassen</button><button class="knop" type="button" id="plan-volledige-regel">Alle instellingen</button></footer></form>`;
}
document.addEventListener('submit',e=>{
  if(e.target.id!=='plan-inspector-form')return;
  e.preventDefault();
  if(!e.target.reportValidity())return;
  $('#plan-inspector-fout').textContent='';
  const data=new FormData(e.target),room=actieveRuimte();
  if(!room)return;
  const waarde=k=>Number(data.get(k)),vlak=data.get('vlak');
  const opening=planSelectie?.type==='opening' && room.openingen[planSelectie.index];
  if(opening){
    const edge=BouwVorm.edges(room).find(e=>e.id===vlak);
    if(!edge)return;
    const lengte=edge.lengte;
    const hoogte=Math.min(BouwVorm.height(room,edge.a.x+edge.u[0]*waarde('positie'),edge.a.y+edge.u[1]*waarde('positie')),BouwVorm.height(room,edge.a.x+edge.u[0]*(waarde('positie')+waarde('breedte')),edge.a.y+edge.u[1]*(waarde('positie')+waarde('breedte'))));
    if(waarde('positie')+waarde('breedte')>lengte+1e-8 || waarde('borstwering')+waarde('hoogte')>hoogte+1e-8){
      $('#plan-inspector-fout').textContent='De opening past niet binnen deze wand. Controleer positie, breedte en hoogte.';return;
    }
    wijzig(()=>Object.assign(opening,{muur:vlak,positie:waarde('positie'),borstwering:waarde('borstwering'),breedte:waarde('breedte'),hoogte:waarde('hoogte'),aantal:waarde('aantal')}));
  }else{
    const regel=state.project.regels.find(r=>r.id===planSelectie?.id);
    if(!regel)return;
    wijzig(()=>{
      regel.oppervlak=vlak;regel.visualisatie={...(regel.visualisatie || {})};
      for(const k of ['x','y','z','x2','y2','z2'])if(data.has(k))regel.visualisatie[k]=waarde(k);
      if(data.has('aantal'))regel.hoeveelheid=waarde('aantal');
    });
  }
  $('#plan-sleepstatus').textContent='Eigenschappen opgeslagen. Je kunt verder tekenen.';
});

/* Repeated placement and alignment operate on full work rules, never just SVG. */
(function objectActies() {
  const menu=$('#plan-acties');
  document.addEventListener('click',e=>{
    if(!menu.contains(e.target))menu.open=false;
    const kopie=e.target.closest('#plan-dupliceer'),centreer=e.target.closest('#plan-centreer'),lengteActie=e.target.closest('#plan-tracelengte');
    if(!kopie && !centreer && !lengteActie)return;
    menu.open=false;
    if(document.querySelector('#plan.is-slepen,#plan.is-pannen'))return;
    const room=actieveRuimte();if(!room || !planSelectie)return;
    const regel=planSelectie.type==='regel' && planRegels(room).find(r=>r.id===planSelectie.id);
    const opening=planSelectie.type==='opening' && room.openingen[planSelectie.index];
    if(!regel && !opening)return;
    if(lengteActie){
      const lengte=regel?BouwPlan.traceLengte(regel,room):null;
      if(lengte==null)return;
      const aantal=Math.round((lengte+Number.EPSILON)*100)/100;
      if(aantal<=0)return;
      if(!confirm(`Offertehoeveelheid voor “${regel.pakket.naam}” vervangen door ${NR.format(aantal)} m? Dit is alleen de rechte 3D-afstand tussen toegepaste eindpunten, zonder bochten, reserve of bijkomende tracés. Niet-toegepaste velden worden niet gebruikt. De offerteprijs kan veranderen.`))return;
      const model=state.project.regels.find(r=>r.id===regel.id),{a,b}=BouwPlan.werkGeometrie(regel,room);
      wijzig(()=>{
        model.hoeveelheid=aantal;
        // Freeze the exact displayed geometry instead of retaining example positions.
        model.visualisatie={...(model.visualisatie || {}),x:a[0],y:a[1],z:a[2],x2:b[0],y2:b[1],z2:b[2]};
      });
      $('#plan-sleepstatus').textContent=`Offertehoeveelheid vervangen door ${NR.format(aantal)} m rechte tracélengte. Controleer bochten en reserve zelf.`;
      return;
    }
    if(kopie){
      const naam=regel?regel.pakket.naam:opening.naam;
      const aantal=regel?`${NRL.format(regel.hoeveelheid ?? regel.aantal)} ${regel.pakket.eenheid}`:`${opening.aantal ?? 1} opening(en)`;
      const gevolg=regel?'De kopie telt EXTRA mee als werkregel in de offerte.':'Dit wijzigt de aftrek van openingen, netto-oppervlakte en offerte.';
      if(!confirm(`“${naam}” dupliceren, inclusief ${aantal}? ${gevolg} Controleer daarna positie en aantallen.`))return;
    }
    if(opening){
      const g=BouwPlan.openingGeometrie(room,planSelectie.index),axis=['noord','zuid'].includes(g.zijde)?0:1;
      const max=Math.max(0,g.lengte-g.breedte),start=g.start ?? g.a[axis];
      const positie=centreer?max/2:Math.max(0,Math.min(max,start+(start+.25<=max ? .25 : -.25)));
      const nieuw=JSON.parse(JSON.stringify(opening));nieuw.positie=positie;
      if(planWeergave==='aanzicht')planVlak=opening.muur;
      wijzig(()=>{
        if(kopie){
          // Freeze automatic positions before the list length changes.
          room.openingen.map((o,i)=>({o,g:o.muur===opening.muur && (o.positie==null || o.positie==='')?BouwPlan.openingGeometrie(room,i):null}))
            .forEach(({o,g})=>{if(g)o.positie=g.start ?? g.a[axis];});
          room.openingen.push(nieuw);planSelectie={type:'opening',index:room.openingen.length-1,ruimteId:room.id};planInspectieOpen=false;
        }else opening.positie=positie;
      });
    }else{
      const model=state.project.regels.find(r=>r.id===regel.id),g=BouwPlan.werkGeometrie(regel,room);
      const axes=['noord','zuid'].includes(regel.oppervlak)?[0,2]:['west','oost'].includes(regel.oppervlak)?[1,2]:[0,1];
      const route=regel.pakket.eenheid==='m',b=route?g.b:g.a;
      let delta=BouwSleep.positieActie(g.a,b,[g.L,g.B,g.H],axes,centreer?'centreer':'kopie');
      if(room.contour?.length || room.dak || Object.keys(room.wand_helling||{}).length){
        const edge=BouwVorm.edges(room).find(e=>e.id===regel.oppervlak);
        if(!edge && centreer){const c=BouwVorm.interior(room);delta=BouwSleep.boundedDelta(g.a,b,[c.x-(g.a[0]+b[0])/2,c.y-(g.a[1]+b[1])/2,0],[g.L,g.B,g.H]);}
        if(edge){
          const sa=(g.a[0]-edge.a.x)*edge.u[0]+(g.a[1]-edge.a.y)*edge.u[1],sb=(b[0]-edge.a.x)*edge.u[0]+(b[1]-edge.a.y)*edge.u[1];
          const local=BouwSleep.positieActie([sa,0,g.a[2]],[sb,0,b[2]],[edge.lengte,0,g.H],[0,2],centreer?'centreer':'kopie');
          delta=BouwSleep.boundedDelta(g.a,b,[local[0]*edge.u[0],local[0]*edge.u[1],local[2]],[g.L,g.B,g.H]);
        }
      }
      const nieuw=kopie?JSON.parse(JSON.stringify(model)):model;
      const coord=(v,i)=>Math.round((v+delta[i])*1000)/1000;
      const a=g.a.map(coord),eind=b.map(coord);
      if(kopie){do{nieuw.id=uid();}while(state.project.regels.some(r=>r.id===nieuw.id));}
      if(planWeergave==='aanzicht')planVlak=regel.oppervlak;
      wijzig(()=>{
        nieuw.visualisatie={...(nieuw.visualisatie || {}),x:a[0],y:a[1],z:a[2]};
        if(route)Object.assign(nieuw.visualisatie,{x2:eind[0],y2:eind[1],z2:eind[2]});
        if(kopie){state.project.regels.push(nieuw);planSelectie={type:'regel',id:nieuw.id};planInspectieOpen=false;}
      });
    }
    $('#plan-sleepstatus').textContent=kopie?'Kopie toegevoegd; controleer positie en aantallen.':'Gecentreerd op het toegewezen vlak. Hoeveelheden blijven gelijk.';
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && menu.open){e.preventDefault();menu.open=false;menu.querySelector('summary').focus();}
  });
})();
