/* ============================================================
   PAC-MAN — doolhof-editor
   Tekent een 28 × 31 doolhof, controleert of het speelbaar is en
   bewaart het level in localStorage voor index.html?doolhof=eigen
   ============================================================ */

(function () {
  "use strict";

  const { DOOLHOF, KOLOMMEN, RIJEN, PAC_START, HOK, SPOOK_START } = window.PacmanDoolhof;
  const { valideerVorm, valideer: keur, tel: telRijen } = window.PacmanValidatie;
  const SLEUTEL = "pacman-doolhof";
  const CONCEPT = "pacman-doolhof-concept";
  const CEL = 24;

  const doek = document.getElementById("editor-doek");
  const ctx = doek.getContext("2d");
  doek.width = KOLOMMEN * CEL;
  doek.height = RIJEN * CEL;

  const GEREEDSCHAP = {
    muur: "#",
    punt: ".",
    energizer: "o",
    leeg: " ",
    deur: "-",
  };

  const staat = {
    rijen: laadConcept(),
    gereedschap: "muur",
    spiegel: true,
    tekenen: false,
    laatste: null,
  };

  /* ---------------- laden & bewaren ---------------- */

  function laadConcept() {
    try {
      const opgeslagen = JSON.parse(localStorage.getItem(CONCEPT) || "null");
      if (opgeslagen && valideerVorm(opgeslagen).ok) {
        return opgeslagen.map((rij) => rij.split(""));
      }
    } catch (_) { /* niets opgeslagen: standaardniveau */ }
    return DOOLHOF.map((rij) => rij.split(""));
  }

  function alsRijen() {
    return staat.rijen.map((rij) => rij.join(""));
  }

  /* ---------------- tekenen ---------------- */

  function celKleur(teken) {
    if (teken === "#") return "#1d2c66";
    if (teken === "-") return "#ffb3c7";
    return "#05060f";
  }

  function teken() {
    ctx.fillStyle = "#05060f";
    ctx.fillRect(0, 0, doek.width, doek.height);

    for (let r = 0; r < RIJEN; r += 1) {
      for (let c = 0; c < KOLOMMEN; c += 1) {
        const teken = staat.rijen[r][c];
        const x = c * CEL;
        const y = r * CEL;

        if (teken === "#") {
          ctx.fillStyle = "#2b6cff";
          ctx.globalAlpha = 0.85;
          ctx.fillRect(x + 1, y + 1, CEL - 2, CEL - 2);
          ctx.globalAlpha = 1;
        } else if (teken === "-") {
          ctx.fillStyle = "#ffb3c7";
          ctx.fillRect(x, y + CEL * 0.42, CEL, CEL * 0.16);
        } else if (teken === ".") {
          ctx.fillStyle = "#ffe8b0";
          ctx.fillRect(x + CEL / 2 - 2, y + CEL / 2 - 2, 4, 4);
        } else if (teken === "o") {
          ctx.fillStyle = "#ffe8b0";
          ctx.beginPath();
          ctx.arc(x + CEL / 2, y + CEL / 2, CEL * 0.24, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // raster
    ctx.strokeStyle = "rgba(120, 150, 255, .12)";
    ctx.lineWidth = 1;
    for (let c = 0; c <= KOLOMMEN; c += 1) {
      ctx.beginPath();
      ctx.moveTo(c * CEL, 0);
      ctx.lineTo(c * CEL, doek.height);
      ctx.stroke();
    }
    for (let r = 0; r <= RIJEN; r += 1) {
      ctx.beginPath();
      ctx.moveTo(0, r * CEL);
      ctx.lineTo(doek.width, r * CEL);
      ctx.stroke();
    }

    // hulplijnen: hok en startposities
    ctx.strokeStyle = "rgba(255, 184, 222, .45)";
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(HOK.kolommen[0] * CEL, HOK.rijen[0] * CEL,
      (HOK.kolommen[1] - HOK.kolommen[0] + 1) * CEL, (HOK.rijen[1] - HOK.rijen[0] + 1) * CEL);
    ctx.setLineDash([]);

    markeer(PAC_START, "#ffe600", "P");
    for (const naam of Object.keys(SPOOK_START)) {
      markeer(SPOOK_START[naam], "#3cf2ff", naam[0].toUpperCase());
    }
  }

  function markeer(tegel, kleur, letter) {
    const x = tegel.c * CEL + CEL / 2;
    const y = tegel.r * CEL + CEL / 2;
    ctx.fillStyle = kleur;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(x, y, CEL * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#05060f";
    ctx.font = `bold ${Math.round(CEL * 0.5)}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, x, y + 1);
  }

  /* ---------------- schilderen ---------------- */

  function zet(c, r) {
    if (c < 0 || c >= KOLOMMEN || r < 0 || r >= RIJEN) return;
    const teken = GEREEDSCHAP[staat.gereedschap];
    staat.rijen[r][c] = teken;
    if (staat.spiegel) staat.rijen[r][KOLOMMEN - 1 - c] = teken;
  }

  function naarTegel(gebeurtenis) {
    const rect = doek.getBoundingClientRect();
    const schaalX = doek.width / rect.width;
    const schaalY = doek.height / rect.height;
    return {
      c: Math.floor((gebeurtenis.clientX - rect.left) * schaalX / CEL),
      r: Math.floor((gebeurtenis.clientY - rect.top) * schaalY / CEL),
    };
  }

  function schilder(gebeurtenis) {
    const { c, r } = naarTegel(gebeurtenis);
    if (c < 0 || c >= KOLOMMEN || r < 0 || r >= RIJEN) return;
    const sleutel = `${c},${r}`;
    if (sleutel === staat.laatste) return;
    staat.laatste = sleutel;
    zet(c, r);
    teken();
    telEnControleer();
  }

  doek.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    staat.tekenen = true;
    staat.laatste = null;
    doek.setPointerCapture(e.pointerId);
    schilder(e);
  });
  doek.addEventListener("pointermove", (e) => {
    if (!staat.tekenen) return;
    e.preventDefault();
    schilder(e);
  });
  doek.addEventListener("pointerup", () => {
    staat.tekenen = false;
    staat.laatste = null;
    bewaarConcept();
  });
  doek.addEventListener("pointercancel", () => {
    staat.tekenen = false;
    staat.laatste = null;
    bewaarConcept();
  });

  /* ---------------- gereedschap & knoppen ---------------- */

  for (const knop of document.querySelectorAll("[data-gereedschap]")) {
    knop.addEventListener("click", () => {
      staat.gereedschap = knop.dataset.gereedschap;
      for (const andere of document.querySelectorAll("[data-gereedschap]")) {
        const actief = andere === knop;
        andere.classList.toggle("actief", actief);
        andere.setAttribute("aria-pressed", String(actief));
      }
    });
  }

  const knopSpiegel = document.getElementById("knop-symmetrie");
  knopSpiegel.addEventListener("click", () => {
    staat.spiegel = !staat.spiegel;
    knopSpiegel.setAttribute("aria-pressed", String(staat.spiegel));
    knopSpiegel.classList.toggle("actief", staat.spiegel);
  });
  knopSpiegel.classList.toggle("actief", staat.spiegel);

  document.getElementById("knop-vullen").addEventListener("click", () => {
    for (let r = 1; r < RIJEN - 1; r += 1) {
      for (let c = 1; c < KOLOMMEN - 1; c += 1) {
        // nooit punten in het spokenhok: die kan Pac-Man niet opeten
        if (r >= HOK.rijen[0] && r <= HOK.rijen[1]
          && c >= HOK.kolommen[0] && c <= HOK.kolommen[1]) continue;
        if (staat.rijen[r][c] === " ") staat.rijen[r][c] = ".";
      }
    }
    teken();
    telEnControleer();
    bewaarConcept();
  });

  document.getElementById("knop-standaard").addEventListener("click", () => {
    staat.rijen = DOOLHOF.map((rij) => rij.split(""));
    teken();
    telEnControleer();
    bewaarConcept();
    meld("Standaard level hersteld.");
  });

  document.getElementById("knop-wissen").addEventListener("click", () => {
    staat.rijen = Array.from({ length: RIJEN }, (_, r) => {
      return Array.from({ length: KOLOMMEN }, (_, c) => {
        if (r === 0 || r === RIJEN - 1 || c === 0 || c === KOLOMMEN - 1) return "#";
        return " ";
      });
    });
    // hok en deur klaarzetten, anders is er niets om te spelen
    for (let r = HOK.rijen[0]; r <= HOK.rijen[1]; r += 1) {
      for (let c = HOK.kolommen[0]; c <= HOK.kolommen[1]; c += 1) staat.rijen[r][c] = " ";
    }
    staat.rijen[HOK.deur.r][HOK.deur.c] = "-";
    staat.rijen[HOK.uitgang.r][HOK.uitgang.c] = " ";
    staat.rijen[HOK.rijen[1] + 1][HOK.deur.c] = " ";   // gang onder het hok
    staat.rijen[PAC_START.r][PAC_START.c] = " ";
    teken();
    telEnControleer();
    bewaarConcept();
    meld("Leeg canvas — teken je eigen doolhof.");
  });

  document.getElementById("knop-opslaan").addEventListener("click", () => {
    const uitkomst = keur(alsRijen());
    if (!uitkomst.ok) {
      meld(`Nog ${uitkomst.fouten.length} fout(en): los ze eerst op.`, true);
      return;
    }
    localStorage.setItem(SLEUTEL, JSON.stringify({
      rijen: alsRijen(),
      naam: "Eigen doolhof",
      datum: new Date().toISOString(),
    }));
    meld("Opgeslagen — je level wordt nu geladen…");
    window.location.href = "index.html?doolhof=eigen";
  });

  document.getElementById("knop-export").addEventListener("click", () => {
    const veld = document.getElementById("json-veld");
    veld.value = JSON.stringify({ rijen: alsRijen() }, null, 2);
    veld.select();
    if (navigator.clipboard) navigator.clipboard.writeText(veld.value).catch(() => {});
    meld("JSON geëxporteerd (en naar het klembord gekopieerd).");
  });

  document.getElementById("knop-import").addEventListener("click", () => {
    const veld = document.getElementById("json-veld");
    try {
      const data = JSON.parse(veld.value);
      const rijen = Array.isArray(data) ? data : data.rijen;
      const vorm = valideerVorm(rijen);
      if (!vorm.ok) {
        meld(vorm.fout, true);
        return;
      }
      staat.rijen = rijen.map((rij) => rij.split(""));
      teken();
      telEnControleer();
      bewaarConcept();
      meld("Doolhof geïmporteerd.");
    } catch (fout) {
      meld(`Geen geldige JSON: ${fout.message}`, true);
    }
  });

  /* ---------------- tellen & controleren ---------------- */

  function tel() {
    return telRijen(alsRijen());
  }

  const controleLijst = document.getElementById("controle-lijst");
  const editorStatus = document.getElementById("editor-status");

  function telEnControleer() {
    const telling = tel();
    document.getElementById("aantal-punten").textContent = telling.punten;
    document.getElementById("aantal-energizers").textContent = telling.energizers;
    document.getElementById("aantal-muren").textContent = telling.muren;

    const uitkomst = keur(alsRijen());
    editorStatus.textContent = uitkomst.ok ? "geldig" : `${uitkomst.fouten.length} fout`;
    editorStatus.style.color = uitkomst.ok ? "var(--groen)" : "var(--rood)";

    controleLijst.innerHTML = "";
    if (uitkomst.ok) {
      const li = document.createElement("li");
      li.className = "ok";
      li.textContent = "Alles in orde: speelbaar doolhof.";
      controleLijst.appendChild(li);
    }
    for (const fout of uitkomst.fouten) {
      const li = document.createElement("li");
      li.className = "fout";
      li.textContent = fout;
      controleLijst.appendChild(li);
    }
    for (const waarschuwing of uitkomst.waarschuwingen) {
      const li = document.createElement("li");
      li.className = "let-op";
      li.textContent = waarschuwing;
      controleLijst.appendChild(li);
    }
  }

  let meldingTimer = null;
  function meld(tekst, isFout = false) {
    const regel = document.getElementById("editor-melding");
    regel.textContent = tekst;
    regel.style.color = isFout ? "var(--rood)" : "var(--tekst)";
    clearTimeout(meldingTimer);
    meldingTimer = setTimeout(() => {
      regel.style.color = "";
      regel.textContent = "Teken met de muis of met je vinger. Het hok (rij 12–15) moet dicht blijven.";
    }, 5000);
  }

  function bewaarConcept() {
    try {
      localStorage.setItem(CONCEPT, JSON.stringify(alsRijen()));
    } catch (_) { /* opslag vol of geblokkeerd: geen ramp */ }
  }

  /* ---------------- start ---------------- */

  teken();
  telEnControleer();
}());
