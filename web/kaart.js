/* ============================================================
   BEDRIJVENKAART BELGIË — kaartlogica
   Vanilla JS + Leaflet. Geen build-stap, geen dependencies.
   ============================================================ */
(function () {
  "use strict";

  const BELGIE = L.latLngBounds([49.45, 2.50], [51.53, 6.42]);
  const MAX_BOUNDS = L.latLngBounds([49.20, 2.20], [51.80, 6.75]);
  const KLEUR_ACCENT = "#4f46e5";
  const NL = new Intl.NumberFormat("nl-BE");

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ---------------- State ---------------- */
  const staat = {
    zoek: "",
    // Uitsluitingsfilters: leeg = alles zichtbaar. Zo werkt één klik op een
    // provincie of sector altijd hetzelfde: die zet je aan of uit.
    provinciesUit: new Set(),
    sectorenUit: new Set(),
    statussenUit: new Set(),
    minWerknemers: 0,
    laag: "markers",
    weergave: "bedrijven",
    selectie: null,          // bedrijfsnaam
    vestiging: null,         // rij-id
  };

  let DATA = null;
  let kaart = null;
  let markerLaag = null;
  let clusterLaag = null;
  let heatLaag = null;
  let tegels = {};
  let alleProvincies = [];
  let alleStatussen = [];

  /* ---------------- Hulpjes ---------------- */
  const ontsnap = (tekst) =>
    String(tekst ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  const sectorKleur = (naam) => {
    const s = DATA.sectoren.find((x) => x.naam === naam);
    return s ? s.kleur : "#64748b";
  };

  const statusSlug = (status) => ontsnap(String(status || "onbekend").toLowerCase().replace(/\s+/g, "-"));

  const puntStraal = (werknemers) => Math.max(3.2, Math.min(13, 2.6 + Math.sqrt(werknemers || 1) * 0.55));

  const bedrijfsgroep = (rijen) => {
    const groepen = new Map();
    for (const rij of rijen) {
      if (!groepen.has(rij.naam)) {
        groepen.set(rij.naam, { naam: rij.naam, sector: rij.sector, rijen: [], werknemers: 0, steden: new Set() });
      }
      const groep = groepen.get(rij.naam);
      groep.rijen.push(rij);
      groep.werknemers += rij.werknemers;
      if (rij.stad) groep.steden.add(rij.stad);
      // Hoofdvestiging wint als "hoofdrij"
      if (rij.type === "Hoofdvestiging" || !groep.hoofdrij) groep.hoofdrij = rij;
    }
    return Array.from(groepen.values());
  };

  /* ---------------- Kaart opzetten ---------------- */
  function bouwKaart() {
    kaart = L.map("kaart", {
      center: [50.64, 4.55],
      zoom: 8,
      minZoom: 7,
      maxZoom: 19,
      maxBounds: MAX_BOUNDS,
      maxBoundsViscosity: 0.85,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    });

    tegels.licht = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-bijdragers &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      }
    );
    tegels.standaard = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-bijdragers',
    });
    tegels.voyager = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-bijdragers &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      }
    );
    tegels.licht.addTo(kaart);

    L.control.zoom({ position: "topright" }).addTo(kaart);

    markerLaag = L.layerGroup().addTo(kaart);
    clusterLaag = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 15,
      maxClusterRadius: 46,
      iconCreateFunction: (cluster) => {
        const aantal = cluster.getChildCount();
        const grote = aantal >= 100 ? " groot" : aantal >= 20 ? " middel" : "";
        const maat = grote === " groot" ? 54 : grote === " middel" ? 46 : 38;
        return L.divIcon({
          html: `<div class="markercluster-cluster${grote}" style="width:${maat}px;height:${maat}px"><span>${aantal}</span></div>`,
          className: "",
          iconSize: L.point(maat, maat),
        });
      },
    });
    heatLaag = L.heatLayer([], {
      radius: 26,
      blur: 22,
      maxZoom: 12,
      minOpacity: 0.25,
      gradient: { 0.15: "#c7d2fe", 0.45: "#818cf8", 0.7: "#6366f1", 1: "#312e81" },
    });

    kaart.on("click", () => sluitDetail());
    kaart.fitBounds(BELGIE, { padding: [10, 10] });
  }

  /* ---------------- Filteren ---------------- */
  function gefilterd() {
    const q = staat.zoek.trim().toLowerCase();
    return DATA.bedrijven.filter((rij) => {
      if (staat.provinciesUit.has(rij.provincie)) return false;
      if (staat.sectorenUit.has(rij.sector)) return false;
      if (staat.statussenUit.has(rij.status)) return false;
      if (staat.minWerknemers && rij.werknemers < staat.minWerknemers) return false;
      if (!q) return true;
      const hooi = [rij.naam, rij.stad, rij.postcode, rij.btw, rij.sector, rij.provincie, rij.straat]
        .join(" ").toLowerCase();
      return hooi.includes(q);
    });
  }

  /* ---------------- Markers tekenen ---------------- */
  function tekenVestigingen(rijen) {
    markerLaag.clearLayers();
    clusterLaag.clearLayers();

    for (const rij of rijen) {
      const kleur = sectorKleur(rij.sector);
      const geselecteerd = staat.selectie === rij.naam;

      const bol = L.circleMarker([rij.lat, rij.lon], {
        radius: puntStraal(rij.werknemers) + (geselecteerd ? 2.5 : 0),
        color: geselecteerd ? KLEUR_ACCENT : "#ffffff",
        weight: geselecteerd ? 3 : 1.6,
        fillColor: kleur,
        fillOpacity: geselecteerd ? 1 : 0.88,
        bubblingMouseEvents: false,
      });
      bol.bindTooltip(
        `<strong>${ontsnap(rij.naam)}</strong><br>${ontsnap(rij.stad)} · ${NL.format(rij.werknemers)} werknemers`,
        { direction: "top", offset: [0, -4], opacity: 1, className: "bedrijf-tooltip" }
      );
      bol.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        kiesBedrijf(rij.naam, rij.id);
      });
      bol.addTo(markerLaag);

      const icoon = L.divIcon({
        className: "",
        html: `<div class="bedrijfsmarker${geselecteerd ? " actief" : ""}" style="width:${puntStraal(rij.werknemers) * 2}px;height:${puntStraal(rij.werknemers) * 2}px;background:${kleur}"></div>`,
        iconSize: L.point(puntStraal(rij.werknemers) * 2, puntStraal(rij.werknemers) * 2),
        iconAnchor: [puntStraal(rij.werknemers), puntStraal(rij.werknemers)],
      });
      const stip = L.marker([rij.lat, rij.lon], { icon: icoon, riseOnHover: true });
      stip.bindTooltip(
        `<strong>${ontsnap(rij.naam)}</strong><br>${ontsnap(rij.stad)} · ${NL.format(rij.werknemers)} werknemers`,
        { direction: "top", offset: [0, -6], opacity: 1, className: "bedrijf-tooltip" }
      );
      stip.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        kiesBedrijf(rij.naam, rij.id);
      });
      clusterLaag.addLayer(stip);
    }

    heatLaag.setLatLngs(
      rijen.map((rij) => [rij.lat, rij.lon, Math.min(1, 0.25 + Math.log10((rij.werknemers || 1) + 1) / 3)])
    );
  }

  function zetLaag() {
    [markerLaag, clusterLaag, heatLaag].forEach((laag) => {
      if (kaart.hasLayer(laag)) kaart.removeLayer(laag);
    });
    if (staat.laag === "markers") markerLaag.addTo(kaart);
    if (staat.laag === "clusters") clusterLaag.addTo(kaart);
    if (staat.laag === "heat") heatLaag.addTo(kaart);
    $$("[data-laag]").forEach((b) => b.classList.toggle("actief", b.dataset.laag === staat.laag));
    $("#legendaKaart").hidden = staat.laag === "heat";
  }

  /* ---------------- UI: filters ---------------- */
  function bouwProvincies() {
    const telling = new Map();
    for (const rij of DATA.bedrijven) {
      telling.set(rij.provincie, (telling.get(rij.provincie) || 0) + 1);
    }
    alleProvincies = Array.from(telling.keys()).sort((a, b) => a.localeCompare(b, "nl"));
    const houder = $("#provincies");
    houder.innerHTML = "";
    for (const provincie of alleProvincies) {
      const knop = document.createElement("button");
      knop.className = "provincie";
      knop.dataset.provincie = provincie;
      knop.innerHTML = `${ontsnap(provincie)} <span class="aantal">${telling.get(provincie)}</span>`;
      knop.title = `Provincie ${provincie} aan/uitzetten`;
      knop.addEventListener("click", () => {
        if (staat.provinciesUit.has(provincie)) staat.provinciesUit.delete(provincie);
        else staat.provinciesUit.add(provincie);
        // Alle provincies uit? Dan is er niets meer te tonen — zet ze terug aan.
        if (staat.provinciesUit.size === alleProvincies.length) staat.provinciesUit.clear();
        pasToe({ inzoomen: true });
      });
      houder.appendChild(knop);
    }
  }

  function bouwSectoren() {
    const houder = $("#sectoren");
    const legendaHouder = $("#legendaLijst");
    houder.innerHTML = "";
    legendaHouder.innerHTML = "";

    for (const sector of DATA.sectoren) {
      const rij = document.createElement("button");
      rij.className = "sectorrij aan";
      rij.dataset.sector = sector.naam;
      rij.innerHTML = `
        <span class="stip" style="background:${sector.kleur}"></span>
        <span class="naam">${ontsnap(sector.naam)}</span>
        <span class="aantal">${sector.aantal}</span>
        <span class="vinkje" aria-hidden="true"></span>`;
      rij.setAttribute("aria-pressed", "true");
      rij.addEventListener("click", () => {
        if (staat.sectorenUit.has(sector.naam)) staat.sectorenUit.delete(sector.naam);
        else staat.sectorenUit.add(sector.naam);
        // Alles uit = geen filter (en dus weer alles zichtbaar).
        if (staat.sectorenUit.size === DATA.sectoren.length) staat.sectorenUit.clear();
        pasToe({ inzoomen: false });
      });
      houder.appendChild(rij);

      const li = document.createElement("li");
      li.dataset.sector = sector.naam;
      li.innerHTML = `<span class="stip" style="background:${sector.kleur}"></span>${ontsnap(sector.naam)}`;
      legendaHouder.appendChild(li);
    }
  }

  function bouwStatussen() {
    const houder = $("#statussen");
    houder.innerHTML = "";
    for (const status of alleStatussen) {
      const chip = document.createElement("button");
      chip.className = "chip aan";
      chip.dataset.status = status;
      chip.textContent = status;
      chip.setAttribute("aria-pressed", "true");
      chip.addEventListener("click", () => {
        if (staat.statussenUit.has(status)) staat.statussenUit.delete(status);
        else staat.statussenUit.add(status);
        if (staat.statussenUit.size === alleStatussen.length) staat.statussenUit.clear();
        pasToe({ inzoomen: false });
      });
      houder.appendChild(chip);
    }
  }

  function werkFilterUI() {
    $$(".provincie").forEach((k) => {
      const aan = !staat.provinciesUit.has(k.dataset.provincie);
      k.classList.toggle("aan", aan);
      k.setAttribute("aria-pressed", String(aan));
    });
    $$(".sectorrij").forEach((k) => {
      const aan = !staat.sectorenUit.has(k.dataset.sector);
      k.classList.toggle("aan", aan);
      k.classList.toggle("uit", !aan);
      k.setAttribute("aria-pressed", String(aan));
    });
    $$("[data-sector]", $("#legendaLijst")).forEach((li) => {
      li.classList.toggle("uit", staat.sectorenUit.has(li.dataset.sector));
    });
    $$(".chip[data-status]").forEach((k) => {
      const aan = !staat.statussenUit.has(k.dataset.status);
      k.classList.toggle("aan", aan);
      k.setAttribute("aria-pressed", String(aan));
    });

    const actief = (staat.provinciesUit.size ? 1 : 0) + (staat.sectorenUit.size ? 1 : 0) +
      (staat.statussenUit.size ? 1 : 0) + (staat.minWerknemers ? 1 : 0) + (staat.zoek.trim() ? 1 : 0);
    const badge = $("#filterBadge");
    badge.hidden = actief === 0;
    badge.textContent = actief;
  }

  /* ---------------- Resultatenlijst ---------------- */
  function tekenResultaten(rijen) {
    const houder = $("#resultaten");
    houder.innerHTML = "";

    if (!rijen.length) {
      houder.innerHTML = `<li class="leegmelding">Geen vestigingen gevonden met deze filters. <button class="tekstknop" id="wisAlles">Filters wissen</button></li>`;
      const wis = $("#wisAlles");
      if (wis) wis.addEventListener("click", () => wisFilters());
      $("#resultatenTeller").textContent = "0";
      return;
    }

    let items;
    if (staat.weergave === "vestigingen") {
      items = rijen
        .slice()
        .sort((a, b) => b.werknemers - a.werknemers)
        .slice(0, 120)
        .map((rij) => ({ titel: rij.naam, onder: `${rij.stad} · ${rij.straat}`, kleur: sectorKleur(rij.sector), id: rij.id, naam: rij.naam, werknemers: rij.werknemers }));
    } else {
      items = bedrijfsgroep(rijen)
        .sort((a, b) => b.werknemers - a.werknemers)
        .slice(0, 120)
        .map((groep) => ({
          titel: groep.naam,
          onder: `${Array.from(groep.steden).slice(0, 2).join(", ")}${groep.rijen.length > 1 ? ` · ${groep.rijen.length} vestigingen` : ""}`,
          kleur: sectorKleur(groep.sector),
          id: groep.rijen[0].id,
          naam: groep.naam,
          werknemers: groep.werknemers,
        }));
    }

    const fragment = document.createDocumentFragment();
    for (const item of items) {
      const li = document.createElement("li");
      const knop = document.createElement("button");
      knop.className = "resultaat" + (staat.selectie === item.naam ? " geselecteerd" : "");
      knop.innerHTML = `
        <span class="stip" style="background:${item.kleur}"></span>
        <span><span class="titel">${ontsnap(item.titel)}</span><span class="onder">${ontsnap(item.onder)}</span></span>
        <span class="pers">${NL.format(item.werknemers)}</span>`;
      knop.addEventListener("click", () => kiesBedrijf(item.naam, item.id, { vlieg: true }));
      li.appendChild(knop);
      fragment.appendChild(li);
    }
    houder.appendChild(fragment);

    const bedrijven = new Set(rijen.map((r) => r.naam)).size;
    $("#resultatenTeller").textContent = staat.weergave === "vestigingen" ? rijen.length : bedrijven;
  }

  function tekenStatistieken(rijen) {
    const bedrijven = new Set(rijen.map((r) => r.naam)).size;
    const werknemers = rijen.reduce((som, r) => som + r.werknemers, 0);
    const perSector = new Map();
    for (const r of rijen) perSector.set(r.sector, (perSector.get(r.sector) || 0) + 1);
    const top = Array.from(perSector.entries()).sort((a, b) => b[1] - a[1])[0];

    $("#statBedrijven").textContent = NL.format(bedrijven);
    $("#statVestigingen").textContent = NL.format(rijen.length);
    $("#statWerknemers").textContent = NL.format(werknemers);
    $("#statSector").textContent = top ? top[0] : "–";
    $("#statSector").title = top ? `${top[0]} · ${top[1]} vestigingen` : "";
  }

  /* ---------------- Detailpaneel ---------------- */
  function kiesBedrijf(naam, rijId, opties = {}) {
    staat.selectie = naam;
    staat.vestiging = rijId || null;
    toonDetail(naam, rijId);
    tekenResultaten(gefilterd());

    const rijen = DATA.bedrijven.filter((r) => r.naam === naam);
    const doel = rijen.find((r) => r.id === rijId) || rijen.find((r) => r.type === "Hoofdvestiging") || rijen[0];
    if (opties.vlieg && doel) {
      kaart.flyTo([doel.lat, doel.lon], Math.max(kaart.getZoom(), 13), { duration: 0.7 });
    }
    if (opties.inzoomenOpBedrijf && rijen.length) {
      const grenzen = L.latLngBounds(rijen.map((r) => [r.lat, r.lon]));
      kaart.flyToBounds(grenzen, { padding: [70, 70], maxZoom: 14, duration: 0.7 });
    }
    tekenVestigingen(gefilterd());
    zetLaag();
  }

  function toonDetail(naam, rijId) {
    const rijen = DATA.bedrijven.filter((r) => r.naam === naam);
    if (!rijen.length) return;
    const hoofd = rijen.find((r) => r.id === rijId) || rijen.find((r) => r.type === "Hoofdvestiging") || rijen[0];
    const totaalWerknemers = rijen.reduce((s, r) => s + r.werknemers, 0);
    const kleur = sectorKleur(hoofd.sector);
    const adres = [hoofd.straat, `${hoofd.postcode} ${hoofd.stad}`.trim()].filter(Boolean).join(", ");
    const website = hoofd.website ? hoofd.website.replace(/^https?:\/\//, "") : "";

    const andereVestigingen = rijen
      .filter((r) => r.id !== hoofd.id)
      .slice(0, 12)
      .map((r) => `<li><button data-vestiging="${r.id}">${ontsnap(r.straat)} <small>· ${ontsnap(r.postcode)} ${ontsnap(r.stad)} · ${NL.format(r.werknemers)}</small></button></li>`)
      .join("");

    $("#detailInhoud").innerHTML = `
      <div class="detail-kop">
        <span class="sectorpil" style="background:${kleur}1f;color:${kleur}">
          <span style="width:7px;height:7px;border-radius:50%;background:${kleur};display:inline-block"></span>
          ${ontsnap(hoofd.sector)}
        </span>
        <h2>${ontsnap(hoofd.naam)}</h2>
        <p class="plaats">${ontsnap(hoofd.stad)}, ${ontsnap(hoofd.provincie)} · ${rijen.length} ${rijen.length === 1 ? "vestiging" : "vestigingen"}</p>
      </div>
      <div class="detail-lijf">
        <div class="detail-rijen">
          <div class="detail-rij"><span class="k">Status</span><span class="v"><span class="statuspil status-${ontsnap(statusSlug(hoofd.status))}">${ontsnap(hoofd.status)}</span></span></div>
          <div class="detail-rij"><span class="k">Sinds</span><span class="v">${ontsnap(hoofd.opgericht) || "–"}</span></div>
          <div class="detail-rij"><span class="k">Werknemers (totaal)</span><span class="v">${NL.format(totaalWerknemers)}</span></div>
          <div class="detail-rij"><span class="k">Omzet</span><span class="v">${ontsnap(hoofd.omzet) || "–"}</span></div>
          <div class="detail-rij volledig"><span class="k">BTW-nummer</span><span class="v">${ontsnap(hoofd.btw) || "–"}</span></div>
          <div class="detail-rij volledig"><span class="k">Adres hoofdkantoor</span><span class="v" style="font-weight:500">${ontsnap(adres) || "–"}</span></div>
        </div>

        <ul class="contactlijst">
          ${website ? `<li><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18"/></svg><a href="https://${ontsnap(website)}" target="_blank" rel="noopener">${ontsnap(website)}</a></li>` : ""}
          ${hoofd.telefoon ? `<li><svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z"/></svg>${ontsnap(hoofd.telefoon)}</li>` : ""}
          <li><svg viewBox="0 0 24 24"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>${ontsnap(adres)}</li>
        </ul>

        <div class="detail-acties">
          <button class="primair" data-actie="toon-bedrijf">Alle ${rijen.length} vestigingen tonen</button>
          <button data-actie="route">Route</button>
        </div>

        ${andereVestigingen ? `<p class="sectiekop">Vestigingen</p><ul class="groepslijst">${andereVestigingen}</ul>` : ""}
      </div>`;

    $("#detailpaneel").hidden = false;
    document.body.classList.toggle("detail-open", true);
    $("#statistieken").classList.toggle("verborgen", true);

    $("#detailInhoud").querySelectorAll("[data-vestiging]").forEach((knop) => {
      knop.addEventListener("click", () => {
        const id = Number(knop.dataset.vestiging);
        const rij = DATA.bedrijven.find((r) => r.id === id);
        if (!rij) return;
        staat.vestiging = id;
        kaart.flyTo([rij.lat, rij.lon], Math.max(kaart.getZoom(), 15), { duration: 0.6 });
        toonDetail(naam, id);
        tekenVestigingen(gefilterd());
        zetLaag();
      });
    });

    const actieToon = $("#detailInhoud [data-actie='toon-bedrijf']");
    if (actieToon) actieToon.addEventListener("click", () => kiesBedrijf(naam, rijId, { inzoomenOpBedrijf: true }));
    const actieRoute = $("#detailInhoud [data-actie='route']");
    if (actieRoute) {
      actieRoute.addEventListener("click", () => {
        const url = `https://www.openstreetmap.org/directions?to=${hoofd.lat}%2C${hoofd.lon}#map=16/${hoofd.lat}/${hoofd.lon}`;
        window.open(url, "_blank", "noopener");
      });
    }
  }

  function sluitDetail() {
    $("#detailpaneel").hidden = true;
    staat.selectie = null;
    staat.vestiging = null;
    document.body.classList.remove("detail-open");
    $("#statistieken").classList.remove("verborgen");
    tekenResultaten(gefilterd());
    tekenVestigingen(gefilterd());
    zetLaag();
  }

  /* ---------------- Toepassen ---------------- */
  function pasToe(opties = {}) {
    const rijen = gefilterd();
    tekenVestigingen(rijen);
    zetLaag();
    tekenResultaten(rijen);
    tekenStatistieken(rijen);
    werkFilterUI();

    if (opties.inzoomen && rijen.length) {
      const grenzen = L.latLngBounds(rijen.map((r) => [r.lat, r.lon]));
      kaart.flyToBounds(grenzen, { padding: [50, 50], maxZoom: 13, duration: 0.6 });
    } else if (opties.inzoomen && !rijen.length) {
      kaart.flyToBounds(BELGIE);
    }
  }

  function wisFilters() {
    staat.zoek = "";
    staat.provinciesUit.clear();
    staat.sectorenUit.clear();
    staat.statussenUit.clear();
    staat.minWerknemers = 0;
    $("#zoek").value = "";
    $("#zoekKaart").value = "";
    $("#werknemers").value = 0;
    werkSlider();
    pasToe();
    kaart.flyToBounds(BELGIE, { duration: 0.6 });
  }

  /* ---------------- Zoeken ---------------- */
  function bouwSuggesties(query) {
    const houder = $("#suggesties");
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      houder.hidden = true;
      houder.innerHTML = "";
      return;
    }

    const bedrijven = bedrijfsgroep(DATA.bedrijven)
      .filter((g) => g.naam.toLowerCase().includes(q) || Array.from(g.steden).some((s) => s.toLowerCase().includes(q)))
      .sort((a, b) => {
        const aStart = a.naam.toLowerCase().startsWith(q) ? 0 : 1;
        const bStart = b.naam.toLowerCase().startsWith(q) ? 0 : 1;
        return aStart - bStart || b.werknemers - a.werknemers;
      })
      .slice(0, 7);

    const steden = Array.from(new Set(DATA.bedrijven.map((r) => r.stad)))
      .filter((s) => s.toLowerCase().includes(q))
      .slice(0, 3);

    if (!bedrijven.length && !steden.length) {
      houder.innerHTML = `<li style="cursor:default;color:var(--tekst-dim)">Niets gevonden voor “${ontsnap(query)}”.</li>`;
      houder.hidden = false;
      return;
    }

    houder.innerHTML = "";
    for (const groep of bedrijven) {
      const li = document.createElement("li");
      const eerste = groep.hoofdrij || groep.rijen[0];
      li.innerHTML = `
        <span class="stip" style="background:${sectorKleur(groep.sector)}"></span>
        <span>${ontsnap(groep.naam)}</span>
        <span class="onder">${ontsnap(eerste.stad)}</span>`;
      li.addEventListener("click", () => {
        houder.hidden = true;
        $("#zoekKaart").value = groep.naam;
        kiesBedrijf(groep.naam, eerste.id, { vlieg: true });
      });
      houder.appendChild(li);
    }
    for (const stad of steden) {
      const li = document.createElement("li");
      const inwoners = DATA.bedrijven.filter((r) => r.stad === stad).length;
      li.innerHTML = `
        <span class="stip" style="background:var(--tekst-zacht)"></span>
        <span>${ontsnap(stad)}</span>
        <span class="onder">${inwoners} vestigingen</span>`;
      li.addEventListener("click", () => {
        houder.hidden = true;
        staat.zoek = stad;
        $("#zoek").value = stad;
        $("#zoekKaart").value = stad;
        pasToe({ inzoomen: true });
      });
      houder.appendChild(li);
    }
    houder.hidden = false;
  }

  /* ---------------- Slider ---------------- */
  function werkSlider() {
    const slider = $("#werknemers");
    const waarde = Number(slider.value);
    const max = Number(slider.max);
    const procent = max ? (waarde / max) * 100 : 0;
    slider.style.setProperty("--vulling", `${procent}%`);
    $("#werknemersWaarde").textContent = waarde ? `min. ${NL.format(waarde)}` : "alle";
  }

  /* ---------------- Opstarten ---------------- */
  async function start() {
    try {
      const antwoord = await fetch("/data/bedrijven.json", { cache: "no-cache" });
      if (!antwoord.ok) throw new Error(`HTTP ${antwoord.status}`);
      DATA = await antwoord.json();
    } catch (fout) {
      $("#kaart").innerHTML = `
        <div style="display:grid;place-items:center;height:100%;padding:2rem;text-align:center;color:#66748a;font-family:inherit">
          <div>
            <h2 style="color:#16202e">Kaartdata niet gevonden</h2>
            <p style="margin-top:.4rem;max-width:420px">Voer <code>python3 scripts/bouw_data.py</code> uit om
            <code>web/data/bedrijven.json</code> te maken, en herlaad deze pagina.</p>
            <p style="margin-top:.6rem;font-size:.8rem">${ontsnap(fout.message)}</p>
          </div>
        </div>`;
      return;
    }

    alleStatussen = Array.from(new Set(DATA.bedrijven.map((r) => r.status))).sort();
    const maxWerknemers = Math.max(...DATA.bedrijven.map((r) => r.werknemers), 10);
    $("#werknemers").max = Math.ceil(maxWerknemers / 10) * 10;

    bouwKaart();
    bouwProvincies();
    bouwSectoren();
    bouwStatussen();
    werkSlider();
    pasToe();

    document.querySelector(".zijbalk .merk p").textContent =
      `${NL.format(DATA.meta.bedrijven ?? new Set(DATA.bedrijven.map((r) => r.naam)).size)} bedrijven · ` +
      `${NL.format(DATA.bedrijven.length)} vestigingen op de kaart`;

    // Zoeken (zijbalk)
    let zoekTimer;
    $("#zoek").addEventListener("input", (e) => {
      staat.zoek = e.target.value;
      clearTimeout(zoekTimer);
      zoekTimer = setTimeout(() => pasToe(), 180);
    });

    // Zoeken (op de kaart)
    let suggestieTimer;
    $("#zoekKaart").addEventListener("input", (e) => {
      clearTimeout(suggestieTimer);
      const waarde = e.target.value;
      suggestieTimer = setTimeout(() => bouwSuggesties(waarde), 120);
    });
    $("#zoekKaart").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const eerste = $("#suggesties li");
        if (eerste && !$("#suggesties").hidden) eerste.click();
      }
      if (e.key === "Escape") $("#suggesties").hidden = true;
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".zoekkaart")) $("#suggesties").hidden = true;
    });

    // Filters wissen
    $("#wisProvincies").addEventListener("click", () => {
      staat.provinciesUit.clear();
      pasToe({ inzoomen: true });
    });
    $("#wisSectoren").addEventListener("click", () => {
      staat.sectorenUit.clear();
      pasToe();
    });

    // Slider
    $("#werknemers").addEventListener("input", (e) => {
      staat.minWerknemers = Number(e.target.value);
      werkSlider();
    });
    $("#werknemers").addEventListener("change", () => pasToe());

    // Kaartlagen
    $$("[data-laag]").forEach((knop) => {
      knop.addEventListener("click", () => {
        staat.laag = knop.dataset.laag;
        zetLaag();
      });
    });

    // Weergave resultaten
    $$("[data-weergave]").forEach((knop) => {
      knop.addEventListener("click", () => {
        staat.weergave = knop.dataset.weergave;
        $$("[data-weergave]").forEach((k) => k.classList.toggle("actief", k === knop));
        tekenResultaten(gefilterd());
      });
    });

    // Kaartstijl
    const stijl = $("#kaartstijl");
    if (stijl) {
      stijl.addEventListener("change", () => {
        const gekozen = stijl.value;
        Object.entries(tegels).forEach(([naam, laag]) => {
          if (naam === gekozen) laag.addTo(kaart);
          else if (kaart.hasLayer(laag)) kaart.removeLayer(laag);
        });
      });
    }

    // Reset
    $("#resetKnop").addEventListener("click", () => {
      kaart.flyToBounds(BELGIE, { duration: 0.6 });
    });

    // Detail sluiten
    $("#sluitDetail").addEventListener("click", sluitDetail);

    // Mobiele filters
    const zetFilters = (open) => {
      document.body.classList.toggle("filters-open", open);
      $("#filtersKnop").setAttribute("aria-expanded", String(open));
    };
    $("#filtersKnop").addEventListener("click", () => zetFilters(!document.body.classList.contains("filters-open")));
    $("#sluitZijbalk").addEventListener("click", () => zetFilters(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        zetFilters(false);
        $("#suggesties").hidden = true;
        if (document.body.classList.contains("detail-open")) sluitDetail();
      }
      const inVeld = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName);
      if (e.key === "/" && !inVeld) {
        e.preventDefault();
        $("#zoekKaart").focus();
      }
    });

    // Over-dialoog
    $("#overData").addEventListener("click", (e) => {
      e.preventDefault();
      const dialoog = $("#overDialoog");
      if (typeof dialoog.showModal === "function") dialoog.showModal();
      else dialoog.setAttribute("open", "");
    });

    // Hulpklasse voor tooltips
    const stijlElement = document.createElement("style");
    stijlElement.textContent = `
      .bedrijf-tooltip {
        background: rgba(22, 32, 46, .94);
        color: #fff;
        border: 0;
        border-radius: 8px;
        box-shadow: 0 6px 18px rgba(16, 32, 56, .28);
        font-size: 11.5px;
        line-height: 1.4;
        padding: 6px 8px;
      }
      .bedrijf-tooltip::before { display: none; }
      .bedrijf-tooltip strong { font-weight: 650; }
      .bedrijf-tooltip::after { border-top-color: rgba(22, 32, 46, .94) !important; }`;
    document.head.appendChild(stijlElement);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
