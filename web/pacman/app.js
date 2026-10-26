/* ============================================================
   PAC-MAN — presentatielaag
   De spellogica zit in engine.js; hier alleen invoer, geluid,
   scorebord en de overlays.
   ============================================================ */

(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const SLEUTELS = { SCORE: "pacman-highscore", DOOLHOF: "pacman-doolhof", GELUID: "pacman-geluid" };

  const doek = $("#doek");
  const ctx = doek.getContext("2d");

  /* ---------------- geluid (WebAudio, geen bestanden) ---------------- */

  const Geluid = {
    ctx: null,
    aan: localStorage.getItem(SLEUTELS.GELUID) !== "uit",
    laatstePunt: 0,
    puntTeller: 0,

    start() {
      if (!this.ctx) {
        const Fabriek = window.AudioContext || window.webkitAudioContext;
        if (!Fabriek) return;
        this.ctx = new Fabriek();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
    },

    toon(frequentie, duur, opties = {}) {
      if (!this.aan || !this.ctx) return;
      const { type = "square", volume = 0.05, naar = null } = opties;
      const nu = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const versterker = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequentie, nu);
      if (naar) osc.frequency.exponentialRampToValueAtTime(naar, nu + duur);
      versterker.gain.setValueAtTime(0.0001, nu);
      versterker.gain.exponentialRampToValueAtTime(volume, nu + 0.008);
      versterker.gain.exponentialRampToValueAtTime(0.0001, nu + duur);
      osc.connect(versterker).connect(this.ctx.destination);
      osc.start(nu);
      osc.stop(nu + duur + 0.03);
    },

    speel(naam) {
      if (!this.aan) return;
      this.start();
      switch (naam) {
        case "punt":
          this.puntTeller += 1;
          // waka-waka: twee afwisselende tonen, niet bij elk puntje opnieuw
          this.toon(this.puntTeller % 2 ? 440 : 620, 0.045, { volume: 0.028 });
          break;
        case "energizer":
          this.toon(180, 0.16, { type: "sawtooth", volume: 0.05, naar: 520 });
          break;
        case "spook":
          this.toon(300, 0.12, { volume: 0.06, naar: 900 });
          this.toon(900, 0.16, { volume: 0.05, naar: 1400 });
          break;
        case "fruit":
          this.toon(880, 0.09, { volume: 0.05 });
          this.toon(1320, 0.12, { volume: 0.045 });
          break;
        case "start":
          [523, 659, 784, 1047].forEach((f, i) => {
            setTimeout(() => this.toon(f, 0.11, { volume: 0.045 }), i * 95);
          });
          break;
        case "niveau":
          [784, 988, 1175, 1568].forEach((f, i) => {
            setTimeout(() => this.toon(f, 0.12, { volume: 0.05 }), i * 100);
          });
          break;
        case "dood":
          this.toon(520, 0.35, { type: "triangle", volume: 0.06, naar: 90 });
          break;
        case "over":
          [440, 392, 330, 262, 196].forEach((f, i) => {
            setTimeout(() => this.toon(f, 0.22, { type: "triangle", volume: 0.055 }), i * 150);
          });
          break;
        default:
          break;
      }
    },
  };

  /* ---------------- eigen doolhof ---------------- */

  function leesEigenDoolhof() {
    const vraag = new URLSearchParams(location.search).get("doolhof");
    if (vraag !== "eigen") return null;
    try {
      const opgeslagen = JSON.parse(localStorage.getItem(SLEUTELS.DOOLHOF) || "null");
      if (!opgeslagen || !Array.isArray(opgeslagen.rijen)) return null;
      const keuring = PacmanValidatie.valideer(opgeslagen.rijen);
      if (!keuring.ok) {
        console.warn("Opgeslagen doolhof afgekeurd:", keuring.fouten);
        return null;
      }
      return opgeslagen;
    } catch (_) {
      return null;
    }
  }

  const eigen = leesEigenDoolhof();
  const doolhof = eigen ? eigen.rijen : Pacman.DOOLHOF;
  let opgeslagenHighscore = Number(localStorage.getItem(SLEUTELS.SCORE) || 0) || 0;
  const highscore = opgeslagenHighscore;

  Pacman.PacmanSpel.hoogsteScore = highscore;
  const spel = new Pacman.PacmanSpel({ doolhof, highscore });

  /* ---------------- toestand van de console ---------------- */

  const scherm = {
    schaal: doek.width / Pacman.BREEDTE,
    rooster: false,
    laatste: null,
    vorigeStatus: "",
  };

  /* ---------------- invoer ---------------- */

  const TOETSEN = {
    ArrowUp: "omhoog", ArrowDown: "omlaag", ArrowLeft: "links", ArrowRight: "rechts",
    w: "omhoog", s: "omlaag", a: "links", d: "rechts",
    W: "omhoog", S: "omlaag", A: "links", D: "rechts",
  };

  function stuur(richting) {
    Geluid.start();
    spel.stuur(richting);
    if (spel.toestand === "over") return;
    verbergOverlay();
  }

  window.addEventListener("keydown", (gebeurtenis) => {
    const richting = TOETSEN[gebeurtenis.key];
    if (richting) {
      gebeurtenis.preventDefault();
      stuur(richting);
      return;
    }
    const toets = gebeurtenis.key.toLowerCase();
    if (toets === "p" || gebeurtenis.code === "Space") {
      gebeurtenis.preventDefault();
      spel.pauzeer();
      if (spel.toestand === "gepauzeerd") toonOverlay("pauze");
      else verbergOverlay();
    } else if (toets === "enter") {
      nieuwSpel();
    } else if (toets === "m") {
      wisselGeluid();
    }
  }, { passive: false });

  // vegen over het veld
  let veegStart = null;
  doek.addEventListener("pointerdown", (e) => {
    Geluid.start();
    veegStart = { x: e.clientX, y: e.clientY };
    doek.setPointerCapture(e.pointerId);
  });
  doek.addEventListener("pointerup", (e) => {
    if (!veegStart) return;
    const dx = e.clientX - veegStart.x;
    const dy = e.clientY - veegStart.y;
    veegStart = null;
    if (Math.hypot(dx, dy) < 18) {
      // tik: spel starten of hervatten
      if (spel.toestand === "over") nieuwSpel();
      else {
        spel.hervat();
        verbergOverlay();
      }
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) stuur(dx > 0 ? "rechts" : "links");
    else stuur(dy > 0 ? "omlaag" : "omhoog");
  });

  for (const knop of document.querySelectorAll(".dpad button")) {
    knop.addEventListener("click", () => stuur(knop.dataset.richting));
  }

  $("#knop-nieuw").addEventListener("click", nieuwSpel);
  $("#knop-pauze").addEventListener("click", () => {
    spel.pauzeer();
    if (spel.toestand === "gepauzeerd") toonOverlay("pauze");
    else verbergOverlay();
  });
  $("#knop-geluid").addEventListener("click", wisselGeluid);
  $("#knop-rooster").addEventListener("click", () => {
    scherm.rooster = !scherm.rooster;
    $("#knop-rooster").setAttribute("aria-pressed", String(scherm.rooster));
  });

  function wisselGeluid() {
    Geluid.aan = !Geluid.aan;
    localStorage.setItem(SLEUTELS.GELUID, Geluid.aan ? "aan" : "uit");
    $("#knop-geluid").textContent = Geluid.aan ? "🔊 Geluid" : "🔇 Geluid";
    $("#knop-geluid").setAttribute("aria-pressed", String(Geluid.aan));
    if (Geluid.aan) Geluid.start();
  }

  function nieuwSpel() {
    Geluid.start();
    spel.nieuwSpel();
    verbergOverlay();
    $("#knop-pauze").textContent = "Pauze";
  }

  /* ---------------- overlays ---------------- */

  const overlay = $("#overlay");
  const overlayTitel = $("#overlay-titel");
  const overlayTekst = $("#overlay-tekst");
  const overlayKlein = $("#overlay-klein");
  const overlayKnoppen = $("#overlay-knoppen");

  function verbergOverlay() {
    overlay.hidden = true;
  }

  function toonOverlay(soort) {
    overlay.hidden = false;

    if (soort === "klaar") {
      overlayKlein.textContent = eigen ? "Eigen doolhof" : "De Gids Arcade";
      overlayTitel.textContent = spel.niveau > 1 ? `Niveau ${spel.niveau}` : "Klaar?";
      overlayTekst.textContent = "Eet alle punten, ontwijk de spoken.";
      overlayKnoppen.innerHTML = '<button type="button" class="knop primair" data-actie="start">Start spel</button>';
      return;
    }

    if (soort === "pauze") {
      overlayKlein.textContent = "Gepauzeerd";
      overlayTitel.textContent = "Pauze";
      overlayTekst.textContent = "Druk op P of tik om verder te spelen.";
      overlayKnoppen.innerHTML = '<button type="button" class="knop primair" data-actie="start">Verder spelen</button>';
      return;
    }

    if (soort === "over") {
      const record = spel.status().record;
      overlayKlein.textContent = record ? "Nieuw record!" : "Spel voorbij";
      overlayTitel.textContent = `${spel.punten} punten`;
      overlayTekst.textContent = record
        ? `Niveau ${spel.niveau} · highscore verbeterd.`
        : `Niveau ${spel.niveau} · highscore ${spel.highscore}.`;
      overlayKnoppen.innerHTML = `
        <button type="button" class="knop primair" data-actie="nieuw">Opnieuw</button>
        <a class="knop" href="editor.html">Doolhof maken</a>`;
      return;
    }

    if (soort === "niveau") {
      overlayKlein.textContent = "Level gehaald";
      overlayTitel.textContent = `Niveau ${spel.niveau} uit!`;
      overlayTekst.textContent = "De spoken worden iets sneller. Klaar voor de volgende ronde?";
      overlayKnoppen.innerHTML = "";
    }
  }

  overlay.addEventListener("click", (e) => {
    const knop = e.target.closest("[data-actie]");
    if (!knop) return;
    if (knop.dataset.actie === "start") {
      Geluid.start();
      spel.hervat();
      verbergOverlay();
    } else if (knop.dataset.actie === "nieuw") {
      nieuwSpel();
    }
  });

  /* ---------------- scorebord ---------------- */

  const hud = {
    score: $("#hud-score"),
    highscore: $("#hud-highscore"),
    niveau: $("#hud-niveau"),
    levens: $("#hud-levens"),
    status: $("#statusregel"),
  };

  function tekenLevens(aantal) {
    if (hud.levens.dataset.aantal === String(aantal)) return;
    hud.levens.dataset.aantal = String(aantal);
    hud.levens.innerHTML = Array.from({ length: Math.max(aantal, 0) }, () => "<i></i>").join("");
    hud.levens.setAttribute("aria-label", `${aantal} levens`);
  }

  function werkHudBij(status) {
    hud.score.textContent = status.punten.toLocaleString("nl-BE");
    hud.highscore.textContent = status.highscore.toLocaleString("nl-BE");
    hud.niveau.textContent = status.niveau;
    tekenLevens(status.levens);

    const sleutel = [status.toestand, status.pellets, status.levens, status.bang, status.niveau].join("|");
    if (sleutel === scherm.vorigeStatus) return;
    scherm.vorigeStatus = sleutel;

    hud.status.classList.toggle("bang", status.bang);
    if (status.toestand === "over") {
      hud.status.textContent = `Spel voorbij · ${status.punten} punten · niveau ${status.niveau}`;
    } else if (status.bang) {
      hud.status.textContent = "Energizer! De spoken zijn eetbaar — jaag ze achterna.";
    } else if (status.toestand === "gepauzeerd") {
      hud.status.textContent = "Pauze · druk op P om verder te spelen";
    } else {
      hud.status.textContent = `${status.pellets} van ${status.pelletsTotaal} punten over · ${status.levens} levens · niveau ${status.niveau}`;
    }
  }

  /* ---------------- highscore bewaren ---------------- */

  function bewaarHighscore(status) {
    if (status.highscore <= opgeslagenHighscore) return;
    opgeslagenHighscore = status.highscore;
    localStorage.setItem(SLEUTELS.SCORE, String(opgeslagenHighscore));
  }

  /* ---------------- de lus ---------------- */

  let vorigeTijd = 0;
  let laatsteOverlaySoort = null;

  function overlayVoorToestand(status) {
    if (status.toestand === "over") return "over";
    if (status.toestand === "gepauzeerd") return "pauze";
    if (status.toestand === "niveau") return "niveau";
    if (status.toestand === "klaar") return "klaar";
    return null;
  }

  function lus(nu) {
    if (!vorigeTijd) vorigeTijd = nu;
    const dt = Math.min((nu - vorigeTijd) / 1000, 0.1);
    vorigeTijd = nu;

    spel.update(dt);

    for (const geluid of spel.neemGeluid()) Geluid.speel(geluid);

    Pacman.tekenSpel(ctx, spel, { schaal: scherm.schaal, toonRooster: scherm.rooster });

    const status = spel.status();
    werkHudBij(status);
    bewaarHighscore(status);

    const soort = overlayVoorToestand(status);
    if (soort !== laatsteOverlaySoort) {
      laatsteOverlaySoort = soort;
      if (soort) toonOverlay(soort);
      else verbergOverlay();
    }

    requestAnimationFrame(lus);
  }

  /* ---------------- opstarten ---------------- */

  $("#knop-geluid").textContent = Geluid.aan ? "🔊 Geluid" : "🔇 Geluid";
  $("#knop-geluid").setAttribute("aria-pressed", String(Geluid.aan));
  toonOverlay("klaar");

  requestAnimationFrame(lus);

  // voor de testbaarheid en de console
  window.PacmanApp = { spel, Geluid, scherm };
}());
