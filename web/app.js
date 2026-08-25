/* ============================================================
   DE UNIVERSELE GIDS — consolelogica (presentatielaag)
   Alle routering gebeurt server-side; hier zit alleen weergave.
   ============================================================ */

const $ = (sel) => document.querySelector(sel);

const state = { laatsteAgent: null, inAfwachting: false, tellers: {}, beslissingen: 0 };
let agenten = [];

const CATEGORIE_NAMEN = {
  bestuur: "Bestuur & routering",
  frontlijn: "Frontlijn-support",
  veiligheid: "Veiligheid & kwaliteit",
  business: "Business & strategie",
};

const CHIPS = [
  { label: "⚡ Timmy-scenario", tekst: "HELP!! WAAR IS DAT??" },
  { label: "🧡 Faalangst", tekst: "Ik durf niet te klikken, ga ik iets stukmaken?" },
  { label: "🔧 Jargon", tekst: "Wat betekent error 429 eigenlijk?" },
  { label: "💶 Kosten", tekst: "Wat kost een abonnement per maand?" },
  { label: "⏱️ Tijdgebrek", tekst: "Ik heb geen tijd, wat is de kortste weg om dit af te handelen?" },
  { label: "🗺️ Navigatie", tekst: "Waar vind ik de knop voor de instellingen?" },
  { label: "👁️ Leesgemak", tekst: "Kun je de letters groter maken? Kleine tekst lees ik slecht." },
  { label: "🚀 App-idee", tekst: "Ik wil een app lanceren, is er een markt voor?" },
  { label: "🎯 Marketing", tekst: "wat is onze waardepropositie voor de doelgroep?" },
  { label: "🗂️ Data", tekst: "Kun je de actuele voorraad en prijzen voor mij opzoeken?" },
  { label: "⌨️ Tikfout", tekst: "instelingen" },
  { label: "⚠️ Privacy", tekst: "Mijn BSN is 123456789, kunnen jullie die gebruiken?" },
  { label: "🤝 Escalatie", tekst: "Dit is belachelijk, ik geef het op, ik wil een menselijke medewerker spreken." },
  { label: "✅ Ja (goedkeuren)", tekst: "ja" },
];

/* ---------------- Opstart ---------------- */

async function start() {
  laadChips();
  voegSysteemberichtToe(
    "🏛️ Ecosysteem geactiveerd. 18 agenten geladen — 15 klaar om te spreken, " +
    "3 toezichthouders op de achtergrond. Per invoer spreekt er exact één; de rest zwijgt strikt. " +
    "Tik op een scenario of typ zelf."
  );
  const res = await fetch("/api/agenten");
  const data = await res.json();
  agenten = data.agenten;
  tekenAgentenlijst();
}

/* ---------------- Agentenlijst ---------------- */

function tekenAgentenlijst() {
  const lijst = $("#agenten-lijst");
  lijst.innerHTML = "";
  const perCategorie = {};
  for (const a of agenten) {
    (perCategorie[a.categorie] = perCategorie[a.categorie] || []).push(a);
  }
  for (const [cat, groep] of Object.entries(CATEGORIE_NAMEN)) {
    if (!perCategorie[cat]) continue;
    const kop = document.createElement("div");
    kop.className = "categorie-kop";
    kop.textContent = cat;
    lijst.appendChild(kop);
    for (const a of perCategorie[cat]) {
      lijst.appendChild(maakAgentKaart(a));
    }
  }
}

function maakAgentKaart(a) {
  const kaart = document.createElement("div");
  kaart.className = "agent-kaart" + (a.spreekt ? "" : " monitor");
  kaart.id = `agent-${a.id}`;
  const status = a.spreekt ? "stil" : "toezicht";
  kaart.innerHTML = `
    <span class="emoji">${a.emoji}</span>
    <div class="info">
      <div class="naam">${a.nummer}. ${a.naam}</div>
      <div class="rol">${a.rol}</div>
    </div>
    <span class="status" data-status>${status}</span>`;
  kaart.title = a.monitoring || a.rol;
  return kaart;
}

function markeerActieveAgent(agentId) {
  document.querySelectorAll(".agent-kaart").forEach((k) => {
    k.classList.remove("actief");
    const veld = k.querySelector("[data-status]");
    veld.textContent = k.classList.contains("monitor") ? "toezicht" : "stil";
  });
  const kaart = document.getElementById(`agent-${agentId}`);
  if (kaart) {
    kaart.classList.add("actief");
    kaart.querySelector("[data-status]").textContent = "SPREEKT";
  }
}

/* ---------------- Gesprek ---------------- */

function voegSysteemberichtToe(tekst) {
  const el = document.createElement("div");
  el.className = "systeembericht";
  el.textContent = tekst;
  $("#gesprek").appendChild(el);
  scrollNaarBeneden();
}

function voegBaasBerichtToe(tekst) {
  const el = document.createElement("div");
  el.className = "bericht baas";
  el.innerHTML = `
    <div class="kop"><span class="emoji">👑</span><span class="wie">De Baas</span>
      <span class="spreekt-label">opper­wachter</span></div>
    <div class="body">${escapeHtml(tekst)}</div>`;
  $("#gesprek").appendChild(el);
  scrollNaarBeneden();
}

function voegAgentBerichtToe(resultaat) {
  const el = document.createElement("div");
  el.className = "bericht";
  el.innerHTML = `
    <div class="kop">
      <span class="emoji">${resultaat.agent_emoji}</span>
      <span class="wie">${resultaat.agent_naam}</span>
      <span class="spreekt-label">enige spreker · ${resultaat.stil_aantal} stil</span>
    </div>
    <div class="body">${opmaak(resultaat.bericht)}</div>`;
  $("#gesprek").appendChild(el);
  scrollNaarBeneden();
}

function opmaak(tekst) {
  // Mini-markdown: **vet**, *cursief*, regeleinden.
  let t = escapeHtml(tekst);
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return t.replace(/\n/g, "<br>");
}

function escapeHtml(tekst) {
  const div = document.createElement("div");
  div.textContent = tekst;
  return div.innerHTML;
}

function scrollNaarBeneden() {
  const g = $("#gesprek");
  g.scrollTop = g.scrollHeight;
}

/* ---------------- Router-log ---------------- */

function tekenLogitem(invoer, resultaat) {
  const log = $("#routerlog");
  if (log.querySelector(".leeg")) log.innerHTML = "";

  const item = document.createElement("div");
  item.className = "logitem";

  let rijen = "";
  for (const [agentId, score, labels] of (resultaat.scores || []).slice(0, 5)) {
    const a = agenten.find((x) => x.id === agentId);
    rijen += `<tr><td>${a ? a.naam : agentId}</td><td class="score">${score}</td></tr>`;
  }
  if (!rijen) rijen = `<tr><td>geen domeinsignalen</td><td class="score">0</td></tr>`;

  item.innerHTML = `
    <div class="invoer-regel">▸ ${escapeHtml(invoer)}</div>
    <div class="keuze">${resultaat.agent_emoji} ${resultaat.agent_naam}</div>
    <div class="reden">${escapeHtml(resultaat.reden)}</div>
    <table>${rijen}</table>
    <div class="zwijgregel">🔇 Alle overige agenten zwijgen strikt (protocol gehandhaafd)</div>`;
  log.prepend(item);
}

/* ---------------- Verzending ---------------- */

async function zend(tekst) {
  tekst = tekst.trim();
  if (!tekst) return;
  voegBaasBerichtToe(tekst);
  $("#invoer").value = "";

  try {
    const res = await fetch("/api/bericht", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tekst,
        state: {
          laatste_agent: state.laatsteAgent,
          in_afwachting_goedkeuring: state.inAfwachting,
          tellers: state.tellers,
          geschiedenis: [],
          beslissingen: state.beslissingen,
        },
      }),
    });
    const data = await res.json();
    if (data.fout) throw new Error(data.fout);

    const resultaat = data.resultaat;
    voegAgentBerichtToe(resultaat);
    tekenLogitem(tekst, resultaat);
    markeerActieveAgent(resultaat.agent_id);

    // Toegankelijkheidsmodus: Agent 11 schakelt zelf de weergave om.
    if (resultaat.agent_id === "agent_11_toegankelijkheid") {
      const herstel = /(terug naar normaal|oude stijl|normale stijl|uit zetten|uitzetten|terug)/i.test(tekst);
      document.body.classList.toggle("toegankelijk", !herstel);
    }

    // State bijwerken
    state.laatsteAgent = data.state.laatste_agent;
    state.inAfwachting = data.state.in_afwachting_goedkeuring;
    state.tellers = data.state.tellers;
    state.beslissingen = data.state.beslissingen;

    $("#stat-beslissingen").textContent = state.beslissingen;
    $("#stat-stil").textContent = resultaat.stil_aantal;
    $("#goedkeuringsbalk").hidden = !state.inAfwachting;
    $("#invoer").placeholder = state.inAfwachting
      ? "Antwoord met Ja / Nee, of stel een nieuwe vraag…"
      : "Typ tegen de gids… (bijv. 'HELP!! WAAR IS DAT??')";
  } catch (fout) {
    voegSysteemberichtToe(
      "🛡️ De Systeem-Guard ving een verbindingshik op — je bericht is niet verloren. Probeer het nog eens."
    );
  }
}

/* ---------------- Chips ---------------- */

function laadChips() {
  const houder = $("#chips");
  for (const chip of CHIPS) {
    const knop = document.createElement("button");
    knop.type = "button";
    knop.className = "chip";
    knop.textContent = chip.label;
    knop.addEventListener("click", () => zend(chip.tekst));
    houder.appendChild(knop);
  }
}

$("#invoerformulier").addEventListener("submit", (e) => {
  e.preventDefault();
  zend($("#invoer").value);
});

start();
