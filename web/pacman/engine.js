/* ============================================================
   PAC-MAN — de spelkern
   Deterministisch, zonder DOM en zonder dependencies: de module
   rekent én tekent (op een 2D-canvascontext). Daardoor draait
   exact dezelfde code in de browser en in de Node-tests.

   Bewegingsmodel: tegel-tot-tegel. Een acteur gaat van tegelmidden
   naar tegelmidden (van → naar, voortgang t in 0..1). Daardoor
   blijven muren hard, worden bochten nooit afgesneden en is de
   simulatie frame-rate-onafhankelijk.
   ============================================================ */

(function (root) {
  "use strict";

  const mazen = typeof module !== "undefined" && module.exports
    ? require("./maze.js")
    : root.PacmanDoolhof;

  const {
    DOOLHOF, KOLOMMEN, RIJEN, TEGEL, BREEDTE, HOOGTE,
    TUNNEL_RIJ, PAC_START, HOK, SPOOK_START,
  } = mazen;

  const TAU = Math.PI * 2;

  /* ---------------- instellingen ---------------- */

  const TEMPO = {
    pac: 6.0,            // tegels per seconde
    spook: 5.4,
    spookBang: 3.1,
    spookOgen: 11,
    spookTunnel: 3.0,
    huis: 3.4,
  };

  const MODUS_DUUR = [7, 20, 7, 20, 5, 20, 5, Infinity];   // jacht/vlucht-cyclus
  const BANG_DUUR = [7, 6.5, 6, 5.5, 4.5];                 // per niveau korter
  const START_LEVENS = 3;
  const MAX_LEVENS = 5;

  const PUNTEN = { punt: 10, energizer: 50, spookStart: 200, fruit: 100 };
  const FRUIT_NA_PUNTEN = 70;
  const FRUIT_DUUR = 11;

  const RICHTINGEN = {
    omhoog: { dc: 0, dr: -1, hoek: -Math.PI / 2 },
    omlaag: { dc: 0, dr: 1, hoek: Math.PI / 2 },
    links: { dc: -1, dr: 0, hoek: Math.PI },
    rechts: { dc: 1, dr: 0, hoek: 0 },
  };
  const RICHTING_NAMEN = Object.keys(RICHTINGEN);

  const SPOOK_KLEUREN = {
    blinky: "#ff2f3c",
    pinky: "#ffb8de",
    inky: "#3cf2ff",
    clyde: "#ffb347",
  };

  const KLEUREN = {
    achtergrond: "#05060f",
    muur: "#2b6cff",
    muurGloed: "rgba(43, 108, 255, .55)",
    punt: "#ffe8b0",
    pac: "#ffe600",
    deur: "#ffb3c7",
    oog: "#ffffff",
    pupil: "#1b1b3a",
  };

  /* ---------------- kleine hulpjes ---------------- */

  const wrap = (c) => ((c % KOLOMMEN) + KOLOMMEN) % KOLOMMEN;
  const klem = (v, min, max) => Math.min(Math.max(v, min), max);
  const omgekeerd = (richting) => ({
    omhoog: "omlaag", omlaag: "omhoog", links: "rechts", rechts: "links",
  }[richting]);

  /** Kortste horizontale afstand tussen twee kolommen (tunnelbewust). */
  function deltaKolom(van, naar) {
    let d = naar - van;
    if (d > 1) d -= KOLOMMEN;
    if (d < -1) d += KOLOMMEN;
    return d;
  }

  function isMuur(doolhof, c, r, deurOpen = false) {
    if (r < 0 || r >= RIJEN) return true;
    const teken = doolhof[r][wrap(Math.round(c))];
    if (teken === "#") return true;
    if (teken === "-") return !deurOpen;
    return false;
  }

  function inHok(c, r) {
    return r >= HOK.rijen[0] && r <= HOK.rijen[1]
      && c >= HOK.kolommen[0] && c <= HOK.kolommen[1];
  }

  function buur(c, r, richting) {
    const d = RICHTINGEN[richting];
    return { c: wrap(c + d.dc), r: r + d.dr };
  }

  /* ---------------- acteurs ---------------- */

  function maakPacMan() {
    return {
      c: PAC_START.c,
      r: PAC_START.r,
      naar: null,
      t: 0,
      richting: "links",
      gevraagd: "links",
      lopend: false,
      mond: 0.4,
      opgegeten: false,
    };
  }

  function maakSpook(naam) {
    const start = SPOOK_START[naam];
    return {
      naam,
      c: start.c,
      r: start.r,
      naar: null,
      t: 0,
      richting: naam === "blinky" ? "links" : "omhoog",
      modus: start.inHok ? "hok" : "jacht",   // jacht | bang | ogen | hok
      fase: start.inHok ? "huis" : "vrij",    // huis | vrij
      wacht: start.inHok ? 0.6 + (naam === "pinky" ? 0 : naam === "inky" ? 1.6 : 3.2) : 0,
      bangTimer: 0,
      pad: [],
    };
  }

  /* ---------------- de wereld ---------------- */

  class PacmanSpel {
    constructor(opties = {}) {
      this.doolhof = opties.doolhof || DOOLHOF;
      this.highscore = Number(opties.highscore) || 0;
      this.startHighscore = this.highscore;
      this.reset();
    }

    /* ---- levenscyclus ---- */

    reset() {
      this.punten = 0;
      this.levens = START_LEVENS;
      this.niveau = 0;
      this.toestand = "klaar";       // klaar | bezig | gepauzeerd | dood | niveau | over
      this.tijd = 0;
      this.pauzeTimer = Infinity;    // wacht op de eerste invoer van de Baas
      this.melding = "Klaar?";
      this.geluid = ["start"];
      this.spookReeks = 0;
      this.startHighscore = Math.max(this.highscore, PacmanSpel.hoogsteScore || 0);
      this._startLevel();
    }

    _startLevel() {
      this.niveau += 1;
      this.pellets = [];
      for (let r = 0; r < RIJEN; r += 1) {
        for (let c = 0; c < KOLOMMEN; c += 1) {
          const teken = this.doolhof[r][c];
          if (teken === "." || teken === "o") {
            this.pellets.push({ c, r, groot: teken === "o" });
          }
        }
      }
      this.pelletsTotaal = this.pellets.length;
      this.pelletsOp = 0;
      this.fruit = null;
      this.fruitTimer = 0;
      this._plaatsActoren();
    }

    _plaatsActoren() {
      this.pac = maakPacMan();
      this.spoken = ["blinky", "pinky", "inky", "clyde"].map(maakSpook);
      this.modusIndex = 0;
      this.modus = "jacht";
      this.modusTimer = MODUS_DUUR[0];
      this.spookReeks = 0;
      this.pacTimer = 0;
      this.flitsen = [];
      this._pakTegel(this.pac.c, this.pac.r);
    }

    nieuwSpel() {
      this.reset();
      this.pauzeTimer = 1.8;
    }

    hervat() {
      if (this.toestand === "klaar" || this.toestand === "gepauzeerd") {
        this.toestand = "bezig";
        this.melding = "";
      }
    }

    pauzeer() {
      if (this.toestand === "bezig") {
        this.toestand = "gepauzeerd";
        this.melding = "Pauze";
      } else if (this.toestand === "gepauzeerd") {
        this.hervat();
      }
    }

    /* ---- invoer ---- */

    stuur(richting) {
      if (!RICHTINGEN[richting] || this.toestand === "over") return;
      const pac = this.pac;
      pac.gevraagd = richting;
      if (this.toestand !== "bezig") this.hervat();

      if (pac.naar && richting === omgekeerd(pac.richting)) {
        // halverwege de gang omkeren: huidige tegel en doel wisselen
        const oud = { c: pac.c, r: pac.r };
        pac.c = pac.naar.c;
        pac.r = pac.naar.r;
        pac.naar = oud;
        pac.t = 1 - pac.t;
        pac.richting = richting;
        return;
      }
      if (!pac.naar && !this._vrijVoor(pac, richting)) return;
      if (pac.naar) return;
      this._startStap(pac, richting);
    }

    /* ---- simulatie ---- */

    update(dt) {
      dt = klem(Number(dt) || 0, 0, 0.05);   // tab-wissel of trage pc: nooit inhakken
      this.tijd += dt;

      if (this.toestand === "klaar") {
        this.pauzeTimer -= dt;
        if (this.pauzeTimer <= 0) {
          this.toestand = "bezig";
          this.melding = "";
        }
        return;
      }
      if (this.toestand === "gepauzeerd" || this.toestand === "over") return;

      if (this.toestand === "dood") {
        this.pauzeTimer -= dt;
        if (this.pauzeTimer <= 0) this._naDood();
        return;
      }
      if (this.toestand === "niveau") {
        this.pauzeTimer -= dt;
        if (this.pauzeTimer <= 0) {
          this.toestand = "klaar";
          this.pauzeTimer = 1.4;
          this.melding = "Klaar?";
          this._startLevel();
        }
        return;
      }

      this._updatePac(dt);
      this._updateFlitsen(dt);
      this._updateModus(dt);
      for (const spook of this.spoken) this._updateSpook(spook, dt);
      this._updateFruit(dt);
      this._checkBotsingen();

      if (this.pelletsOp >= this.pelletsTotaal) {
        this.toestand = "niveau";
        this.pauzeTimer = 2.2;
        this.melding = "Niveau uit!";
        this.geluid.push("niveau");
      }
    }

    /* ---- beweging over tegels ---- */

    positie(actor) {
      if (!actor.naar) return { c: actor.c, r: actor.r };
      const dc = deltaKolom(actor.c, actor.naar.c);
      return {
        c: actor.c + dc * actor.t,
        r: actor.r + (actor.naar.r - actor.r) * actor.t,
      };
    }

    _startStap(actor, richting) {
      actor.richting = richting;
      actor.naar = buur(actor.c, actor.r, richting);
      actor.t = 0;
    }

    /** Laat een acteur over zijn pad lopen; geeft true terug bij aankomst. */
    _stap(actor, dt, tempo, bijAankomst, magDoorDeur) {
      if (!actor.naar) return false;
      actor.t += tempo * dt;
      if (actor.t < 1) return false;

      const rest = actor.t - 1;
      actor.c = actor.naar.c;
      actor.r = actor.naar.r;
      actor.naar = null;
      actor.t = 0;

      bijAankomst(actor);
      if (actor.naar) actor.t = Math.min(rest, 0.999);
      return true;
    }

    _vrijVoor(actor, richting, deurOpen = false) {
      const doel = buur(actor.c, actor.r, richting);
      return !isMuur(this.doolhof, doel.c, doel.r, deurOpen);
    }

    _opties(actor, magDoorDeur, magOmkeren) {
      const terug = omgekeerd(actor.richting);
      return RICHTING_NAMEN.filter((naam) => {
        if (naam === terug && !magOmkeren) return false;
        const b = buur(actor.c, actor.r, naam);
        if (isMuur(this.doolhof, b.c, b.r, magDoorDeur)) return false;
        return true;
      });
    }

    /* ---- Pac-Man ---- */

    _updatePac(dt) {
      const pac = this.pac;
      const tempo = TEMPO.pac * (1 + Math.min(this.niveau - 1, 5) * 0.035);

      const bijAankomst = () => {
        this._pakTegel(pac.c, pac.r);
        // 1) de gevraagde richting, 2) anders rechtdoor, 3) anders stoppen
        if (pac.gevraagd && this._vrijVoor(pac, pac.gevraagd)) {
          this._startStap(pac, pac.gevraagd);
        } else if (this._vrijVoor(pac, pac.richting)) {
          this._startStap(pac, pac.richting);
        } else {
          pac.lopend = false;
        }
      };

      if (!pac.naar) {
        // stilstaan: kijken of de gevraagde richting nu kan
        if (pac.gevraagd && this._vrijVoor(pac, pac.gevraagd)) {
          this._startStap(pac, pac.gevraagd);
        } else if (this._vrijVoor(pac, pac.richting)) {
          this._startStap(pac, pac.richting);
        }
      }

      const gelopen = this._stap(pac, dt, tempo, bijAankomst);
      pac.lopend = Boolean(pac.naar);
      if (gelopen || pac.lopend) this.pacTimer += dt;
      pac.mond = pac.lopend ? (Math.sin(this.pacTimer * 22) + 1) / 2 : 0.35;
    }

    _pakTegel(c, r) {
      const index = this.pellets.findIndex((p) => p.c === wrap(c) && p.r === r);
      if (index === -1) return;
      const pellet = this.pellets[index];
      this.pellets.splice(index, 1);
      this.pelletsOp += 1;
      this.punten += pellet.groot ? PUNTEN.energizer : PUNTEN.punt;
      this.geluid.push(pellet.groot ? "energizer" : "punt");

      if (pellet.groot) {
        this.spookReeks = 0;
        const duur = BANG_DUUR[Math.min(this.niveau - 1, BANG_DUUR.length - 1)];
        for (const spook of this.spoken) {
          if (spook.modus === "ogen" || spook.fase === "huis") continue;
          spook.modus = "bang";
          spook.bangTimer = duur;
          this._keerOm(spook);
        }
      }

      if (!this.fruit && this.pelletsOp >= FRUIT_NA_PUNTEN) {
        this.fruit = { c: 13, r: 17 };
        this.fruitTimer = FRUIT_DUUR;
      }
    }

    /** Korte tekstjes die omhoog zweven: "200", "400", "100" … */
    _flits(tegel, tekst, kleur) {
      this.flitsen.push({ c: tegel.c, r: tegel.r, tekst: String(tekst), kleur, tijd: 1.1 });
    }

    _updateFlitsen(dt) {
      if (!this.flitsen.length) return;
      for (const flits of this.flitsen) flits.tijd -= dt;
      this.flitsen = this.flitsen.filter((flits) => flits.tijd > 0);
    }

    /* ---- moduscyclus ---- */

    _bang() {
      return this.spoken.some((s) => s.modus === "bang");
    }

    _updateModus(dt) {
      if (this._bang()) return;
      if (this.modusIndex >= MODUS_DUUR.length - 1) return;
      this.modusTimer -= dt;
      if (this.modusTimer > 0) return;

      this.modusIndex += 1;
      this.modus = this.modusIndex % 2 === 1 ? "vlucht" : "jacht";
      this.modusTimer = MODUS_DUUR[this.modusIndex];
      for (const spook of this.spoken) {
        if (spook.modus === "jacht" && spook.fase === "vrij") this._keerOm(spook);
      }
    }

    _keerOm(spook) {
      if (!spook.naar) {
        spook.richting = omgekeerd(spook.richting);
        return;
      }
      const oud = { c: spook.c, r: spook.r };
      spook.c = spook.naar.c;
      spook.r = spook.naar.r;
      spook.naar = oud;
      spook.t = 1 - spook.t;
      spook.richting = omgekeerd(spook.richting);
    }

    /* ---- spoken ---- */

    _updateSpook(spook, dt) {
      if (spook.modus === "bang") {
        spook.bangTimer -= dt;
        if (spook.bangTimer <= 0) {
          spook.modus = "jacht";
          this.spookReeks = 0;
        }
      }

      if (spook.fase === "huis") {
        this._updateHuis(spook, dt);
        return;
      }

      if (spook.modus === "ogen") {
        // de ogen zoeken de hokdeur op
        if (spook.c === HOK.deur.c && spook.r === HOK.deur.r && !spook.naar) {
          this._naarBinnen(spook);
          return;
        }
      }

      const tempo = this._tempoSpook(spook);
      const bijAankomst = () => {
        if (spook.modus === "ogen" && spook.c === HOK.deur.c && spook.r === HOK.deur.r) {
          this._naarBinnen(spook);
          return;
        }
        this._kiesSpookStap(spook);
      };

      if (!spook.naar) this._kiesSpookStap(spook);
      if (spook.fase === "vrij") this._stap(spook, dt, tempo, bijAankomst, true);
    }

    _tempoSpook(spook) {
      const niveauBonus = Math.min(this.niveau - 1, 6) * 0.12;
      if (spook.modus === "ogen") return TEMPO.spookOgen;
      if (spook.modus === "bang") return TEMPO.spookBang + niveauBonus * 0.3;
      const inTunnel = spook.r === TUNNEL_RIJ && (spook.c < 6 || spook.c > 21);
      if (inTunnel) return TEMPO.spookTunnel;
      return TEMPO.spook + niveauBonus + (spook.naam === "blinky" ? 0.35 : 0);
    }

    _kiesSpookStap(spook) {
      const magDoorDeur = spook.modus === "ogen";
      let opties = this._opties(spook, magDoorDeur, false);
      if (opties.length === 0) opties = [omgekeerd(spook.richting)];

      let gekozen;
      if (spook.modus === "bang") {
        // vluchten: zo ver mogelijk bij Pac-Man vandaan
        gekozen = opties.reduce((best, naam) => {
          return this._afstandTot(spook, naam, this.pac) > this._afstandTot(spook, best, this.pac)
            ? naam : best;
        });
      } else {
        const doel = this._doelVoor(spook);
        gekozen = opties.reduce((best, naam) => {
          return this._afstandTot(spook, naam, doel) < this._afstandTot(spook, best, doel)
            ? naam : best;
        });
      }
      this._startStap(spook, gekozen);
    }

    _afstandTot(actor, richting, doel) {
      const b = buur(actor.c, actor.r, richting);
      const dr = b.r - doel.r;
      let dc = doel.c - b.c;
      if (dc > KOLOMMEN / 2) dc -= KOLOMMEN;
      if (dc < -KOLOMMEN / 2) dc += KOLOMMEN;
      return Math.hypot(dc, dr);
    }

    _doelVoor(spook) {
      const pac = this.pac;
      if (spook.modus === "ogen") return HOK.deur;

      const p = this.positie(pac);
      const d = RICHTINGEN[pac.richting];

      if (spook.naam === "blinky") return { c: p.c, r: p.r };
      if (spook.naam === "pinky") return { c: p.c + d.dc * 4, r: p.r + d.dr * 4 };
      if (spook.naam === "inky") {
        const blinky = this.spoken.find((s) => s.naam === "blinky");
        const bp = this.positie(blinky);
        const voor = { c: p.c + d.dc * 2, r: p.r + d.dr * 2 };
        return { c: voor.c * 2 - bp.c, r: voor.r * 2 - bp.r };
      }
      // Clyde: dichtbij vlucht hij naar zijn eigen hoek
      const afstand = Math.hypot(p.c - spook.c, p.r - spook.r);
      return afstand > 8 ? { c: p.c, r: p.r } : { c: 1, r: 29 };
    }

    _naarBinnen(spook) {
      spook.fase = "huis";
      spook.modus = "hok";
      spook.naar = null;
      spook.t = 0;
      spook.wacht = 0.5;
      spook.pad = [
        { c: 13, r: 13 },
        { c: 13, r: 14 },
      ];
    }

    _updateHuis(spook, dt) {
      if (spook.wacht > 0) {
        spook.wacht -= dt;
        return;
      }
      if (spook.pad.length === 0) {
        // klaar met binnenkomen: weer naar buiten via de deur
        if (inHok(spook.c, spook.r) || spook.r > HOK.uitgang.r) {
          spook.pad = this._padNaarBuiten(spook);
        } else {
          spook.fase = "vrij";
          spook.modus = "jacht";
          spook.richting = "links";
          return;
        }
      }
      if (spook.pad.length === 0) {
        spook.fase = "vrij";
        spook.modus = "jacht";
        return;
      }

      const doel = spook.pad[0];
      if (!spook.naar) this._startStap(spook, this._richtingNaar(spook, doel));
      this._stap(spook, dt, TEMPO.huis, () => {
        spook.pad.shift();
        if (spook.pad.length) {
          this._startStap(spook, this._richtingNaar(spook, spook.pad[0]));
        } else if (spook.r <= HOK.uitgang.r) {
          spook.fase = "vrij";
          spook.modus = "jacht";
        } else {
          spook.pad = this._padNaarBuiten(spook);
        }
      }, true);
    }

    _richtingNaar(actor, doel) {
      if (doel.c > actor.c) return deltaKolom(actor.c, doel.c) > 0 ? "rechts" : "links";
      if (doel.c < actor.c) return deltaKolom(actor.c, doel.c) < 0 ? "links" : "rechts";
      return doel.r < actor.r ? "omhoog" : "omlaag";
    }

    _padNaarBuiten(spook) {
      const pad = [];
      let c = spook.c;
      let r = spook.r;
      while (c !== HOK.hart.c) {
        c += Math.sign(HOK.hart.c - c);
        pad.push({ c, r });
      }
      while (r > HOK.uitgang.r) {
        r -= 1;
        pad.push({ c, r });
      }
      return pad;
    }

    /* ---- fruit ---- */

    _updateFruit(dt) {
      if (!this.fruit) return;
      this.fruitTimer -= dt;
      if (this.fruitTimer <= 0) {
        this.fruit = null;
        return;
      }
      const p = this.positie(this.pac);
      if (Math.abs(p.c - this.fruit.c) < 0.5 && Math.abs(p.r - this.fruit.r) < 0.5) {
        this.punten += PUNTEN.fruit;
        this._flits(this.fruit, PUNTEN.fruit, "#ff6b8b");
        this.fruit = null;
        this.geluid.push("fruit");
      }
    }

    /* ---- botsingen ---- */

    _checkBotsingen() {
      const p = this.positie(this.pac);
      for (const spook of this.spoken) {
        if (spook.modus === "ogen" || spook.fase === "huis") continue;
        const s = this.positie(spook);
        let dc = Math.abs(p.c - s.c);
        dc = Math.min(dc, KOLOMMEN - dc);
        if (Math.hypot(dc, p.r - s.r) > 0.6) continue;

        if (spook.modus === "bang") {
          this.spookReeks += 1;
          const waarde = PUNTEN.spookStart * 2 ** (Math.min(this.spookReeks, 4) - 1);
          this.punten += waarde;
          this._flits(s, waarde, "#8ff7ff");
          spook.modus = "ogen";
          spook.pad = [];
          this.geluid.push("spook");
        } else {
          this._dood();
          return;
        }
      }
    }

    _dood() {
      this.toestand = "dood";
      this.levens -= 1;
      this.pac.opgegeten = true;
      this.pac.naar = null;
      this.pauzeTimer = 1.9;
      this.melding = "Au!";
      this.geluid.push("dood");
    }

    _naDood() {
      if (this.levens <= 0) {
        this.toestand = "over";
        this.melding = "Spel voorbij";
        this.geluid.push("over");
        this._bewaarHighscore();
        return;
      }
      this._plaatsActoren();
      this.toestand = "klaar";
      this.pauzeTimer = 1.5;
      this.melding = "Klaar?";
      this.geluid.push("start");
    }

    _bewaarHighscore() {
      if (this.punten > this.highscore) this.highscore = this.punten;
      if (this.highscore > (PacmanSpel.hoogsteScore || 0)) {
        PacmanSpel.hoogsteScore = this.highscore;
      }
    }

    /* ---- status voor de buitenwereld ---- */

    status() {
      return {
        punten: this.punten,
        highscore: Math.max(this.highscore, this.punten, PacmanSpel.hoogsteScore || 0),
        record: this.punten > this.startHighscore && this.punten > 0,
        niveau: this.niveau,
        levens: this.levens,
        toestand: this.toestand,
        melding: this.melding,
        pellets: this.pellets.length,
        pelletsTotaal: this.pelletsTotaal,
        bang: this._bang(),
        fruit: Boolean(this.fruit),
        flitsen: this.flitsen.length,
      };
    }

    neemGeluid() {
      const geluiden = this.geluid;
      this.geluid = [];
      return geluiden;
    }
  }

  /* ---------------- tekenen ---------------- */

  function metDoek(ctx, schaal, teken) {
    ctx.save();
    ctx.setTransform(schaal, 0, 0, schaal, 0, 0);
    ctx.clearRect(0, 0, BREEDTE, HOOGTE);
    teken();
    ctx.restore();
  }

  /** Rechthoek met per hoek een eigen radius (0 = scherp). */
  function padMetHoeken(ctx, x0, y0, x1, y1, r) {
    const [tl, tr, br, bl] = r;
    if (typeof ctx.arcTo !== "function") {
      ctx.rect(x0, y0, x1 - x0, y1 - y0);
      return;
    }
    ctx.moveTo(x0 + tl, y0);
    ctx.lineTo(x1 - tr, y0);
    if (tr) ctx.arcTo(x1, y0, x1, y0 + tr, tr);
    ctx.lineTo(x1, y1 - br);
    if (br) ctx.arcTo(x1, y1, x1 - br, y1, br);
    ctx.lineTo(x0 + bl, y1);
    if (bl) ctx.arcTo(x0, y1, x0, y1 - bl, bl);
    ctx.lineTo(x0, y0 + tl);
    if (tl) ctx.arcTo(x0, y0, x0 + tl, y0, tl);
    ctx.closePath();
  }

  function tekenDoolhof(ctx, spel) {
    ctx.fillStyle = KLEUREN.achtergrond;
    ctx.fillRect(0, 0, BREEDTE, HOOGTE);

    ctx.fillStyle = KLEUREN.muur;
    ctx.shadowColor = KLEUREN.muurGloed;
    ctx.shadowBlur = 7;
    const straal = TEGEL * 0.3;
    const marge = TEGEL * 0.14;

    for (let r = 0; r < RIJEN; r += 1) {
      for (let c = 0; c < KOLOMMEN; c += 1) {
        if (spel.doolhof[r][c] !== "#") continue;
        const x = c * TEGEL;
        const y = r * TEGEL;
        const boven = r > 0 && spel.doolhof[r - 1][c] === "#";
        const onder = r < RIJEN - 1 && spel.doolhof[r + 1][c] === "#";
        const links = c > 0 && spel.doolhof[r][c - 1] === "#";
        const rechts = c < KOLOMMEN - 1 && spel.doolhof[r][c + 1] === "#";

        const x0 = x + (links ? 0 : marge);
        const x1 = x + TEGEL - (rechts ? 0 : marge);
        const y0 = y + (boven ? 0 : marge);
        const y1 = y + TEGEL - (onder ? 0 : marge);

        // alleen blootliggende hoeken afronden: zo smelten muren samen
        // tot één vorm in plaats van losse afgeronde blokjes
        ctx.beginPath();
        padMetHoeken(ctx, x0, y0, Math.max(x1, x0 + 1), Math.max(y1, y0 + 1), [
          boven && links ? 0 : straal,
          boven && rechts ? 0 : straal,
          onder && rechts ? 0 : straal,
          onder && links ? 0 : straal,
        ]);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;

    // hokdeur
    ctx.fillStyle = KLEUREN.deur;
    ctx.fillRect(HOK.deur.c * TEGEL, HOK.deur.r * TEGEL + TEGEL * 0.42, TEGEL, TEGEL * 0.16);
  }

  function tekenPellets(ctx, spel) {
    for (const pellet of spel.pellets) {
      const x = pellet.c * TEGEL + TEGEL / 2;
      const y = pellet.r * TEGEL + TEGEL / 2;
      ctx.fillStyle = KLEUREN.punt;
      if (pellet.groot) {
        const adem = 0.55 + 0.45 * Math.sin(spel.tijd * 7);
        ctx.globalAlpha = adem;
        ctx.beginPath();
        ctx.arc(x, y, TEGEL * 0.3, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    }
  }

  function tekenFruit(ctx, x, y, straal) {
    ctx.fillStyle = "#ff2e4d";
    ctx.beginPath();
    ctx.arc(x - straal * 0.26, y + straal * 0.2, straal * 0.6, 0, TAU);
    ctx.arc(x + straal * 0.28, y + straal * 0.24, straal * 0.52, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#38d17a";
    ctx.lineWidth = Math.max(1.4, straal * 0.18);
    ctx.beginPath();
    ctx.moveTo(x - straal * 0.05, y - straal * 0.1);
    ctx.quadraticCurveTo(x + straal * 0.25, y - straal, x + straal * 0.85, y - straal * 0.75);
    ctx.stroke();
  }

  function tekenSpook(ctx, x, y, straal, kleur, modus, richting, knipper) {
    const bang = modus === "bang";
    const alleenOgen = modus === "ogen";
    const lijf = bang ? (knipper ? "#f4f6ff" : "#2a54ff") : kleur;

    if (!alleenOgen) {
      ctx.fillStyle = lijf;
      ctx.beginPath();
      ctx.arc(x, y - straal * 0.14, straal * 0.94, Math.PI, 0);
      ctx.lineTo(x + straal * 0.94, y + straal * 0.7);
      const tanden = 4;
      const breedte = (straal * 1.88) / tanden;
      for (let i = 0; i < tanden; i += 1) {
        const rand = x + straal * 0.94 - i * breedte;
        const diep = i % 2 === 0 ? 0.3 : 0.7;
        ctx.lineTo(rand - breedte / 2, y + straal * diep);
        ctx.lineTo(rand - breedte, y + straal * 0.7);
      }
      ctx.closePath();
      ctx.fill();
    }

    if (bang) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x - straal * 0.33, y - straal * 0.2, straal * 0.16, 0, TAU);
      ctx.arc(x + straal * 0.33, y - straal * 0.2, straal * 0.16, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#2a54ff";
      ctx.lineWidth = Math.max(1.2, straal * 0.14);
      ctx.beginPath();
      for (let i = 0; i < 3; i += 1) {
        const dx = -straal * 0.5 + i * (straal * 0.5);
        ctx.moveTo(x + dx, y + straal * 0.42);
        ctx.lineTo(x + dx + straal * 0.16, y + straal * 0.16);
        ctx.lineTo(x + dx + straal * 0.32, y + straal * 0.42);
      }
      ctx.stroke();
      return;
    }

    const kijk = richting ? RICHTINGEN[richting] : { dc: 0, dr: 0 };
    for (const kant of [-1, 1]) {
      const ox = x + kant * straal * 0.35;
      const oy = y - straal * 0.16;
      ctx.fillStyle = KLEUREN.oog;
      ctx.beginPath();
      ctx.ellipse(ox, oy, straal * 0.29, straal * 0.35, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = KLEUREN.pupil;
      ctx.beginPath();
      ctx.arc(ox + kijk.dc * straal * 0.13, oy + kijk.dr * straal * 0.15, straal * 0.15, 0, TAU);
      ctx.fill();
    }
  }

  function tekenPacMan(ctx, x, y, straal, richting, mond) {
    const hoek = (RICHTINGEN[richting] || RICHTINGEN.links).hoek;
    const open = (0.06 + mond * 0.3) * Math.PI;
    ctx.fillStyle = KLEUREN.pac;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, straal, hoek + open, hoek + TAU - open);
    ctx.closePath();
    ctx.fill();
  }

  function tekenActoren(ctx, spel) {
    // fruit
    if (spel.fruit && (spel.fruitTimer > 3 || Math.floor(spel.tijd * 6) % 2 === 0)) {
      tekenFruit(ctx, spel.fruit.c * TEGEL + TEGEL / 2, spel.fruit.r * TEGEL + TEGEL / 2, TEGEL * 0.42);
    }

    // spoken
    for (const spook of spel.spoken) {
      const p = spel.positie(spook);
      const x = p.c * TEGEL + TEGEL / 2;
      const y = p.r * TEGEL + TEGEL / 2;
      const kleur = SPOOK_KLEUREN[spook.naam];
      if (spook.modus === "ogen") {
        tekenSpook(ctx, x, y, TEGEL * 0.6, kleur, "ogen", spook.richting, false);
        continue;
      }
      const bang = spook.modus === "bang";
      const knipper = bang && spook.bangTimer < 2.2 && Math.floor(spook.bangTimer * 6) % 2 === 0;
      tekenSpook(ctx, x, y, TEGEL * 0.6, kleur, bang ? "bang" : "jacht", spook.richting, knipper);
      // bijna uit het hok: klein uitroepteken
      if (spook.fase === "huis" && spook.wacht <= 0) {
        ctx.fillStyle = KLEUREN.punt;
        ctx.beginPath();
        ctx.arc(x, y - TEGEL * 0.85, 1.6, 0, TAU);
        ctx.fill();
      }
    }

    // zwevende puntentekstjes
    for (const flits of spel.flitsen) {
      const p = Math.max(0, Math.min(1, flits.tijd / 1.1));
      ctx.globalAlpha = p;
      ctx.fillStyle = flits.kleur;
      ctx.font = `bold ${Math.round(TEGEL * 0.55)}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(flits.tekst, flits.c * TEGEL + TEGEL / 2,
        flits.r * TEGEL + TEGEL / 2 - (1 - p) * TEGEL * 1.6);
      ctx.globalAlpha = 1;
    }

    // Pac-Man (met tunnel-dubbeltekening)
    if (!spel.pac.opgegeten) {
      const p = spel.positie(spel.pac);
      const teken = (x) => tekenPacMan(ctx, x, p.r * TEGEL + TEGEL / 2, TEGEL * 0.6,
        spel.pac.richting, spel.pac.mond);
      let x = p.c * TEGEL + TEGEL / 2;
      if (x < 0) x += BREEDTE;
      teken(x);
      if (x > BREEDTE - TEGEL) teken(x - BREEDTE);
      if (x < TEGEL) teken(x + BREEDTE);
    }
  }

  /** Maakt een extra canvas voor de gecachte muurlaag (browser of Node-stub). */
  function maakDoek(breedte, hoogte) {
    try {
      if (typeof OffscreenCanvas === "function") {
        return new OffscreenCanvas(breedte, hoogte);
      }
      if (typeof document !== "undefined" && typeof document.createElement === "function") {
        const doek = document.createElement("canvas");
        if (doek && typeof doek.getContext === "function") {
          doek.width = breedte;
          doek.height = hoogte;
          return doek;
        }
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  function vingerafdruk(doolhof) {
    let som = 7;
    for (let r = 0; r < doolhof.length; r += 1) {
      for (let i = 0; i < doolhof[r].length; i += 1) {
        som = (som * 31 + doolhof[r].charCodeAt(i)) % 2147483647;
      }
    }
    return som;
  }

  const laagCache = { sleutel: null, doek: null, ctx: null };

  /**
   * De muren (en het raster) veranderen nooit tijdens een potje, maar meten
   * 548 afgeronde blokken met gloed. Daarom tekenen we ze één keer op een
   * eigen canvas en kopiëren we dat beeld elke frame in één keer over.
   */
  function haalMuurlaag(spel, schaal, toonRooster) {
    const sleutel = [schaal, toonRooster, vingerafdruk(spel.doolhof)].join("|");
    if (laagCache.sleutel === sleutel) return laagCache.doek;

    const doek = maakDoek(Math.round(BREEDTE * schaal), Math.round(HOOGTE * schaal));
    if (!doek) return null;
    const laagCtx = doek.getContext("2d");
    if (!laagCtx) return null;

    metDoek(laagCtx, schaal, () => {
      tekenDoolhof(laagCtx, spel);
      if (toonRooster) tekenRooster(laagCtx);
    });

    laagCache.sleutel = sleutel;
    laagCache.doek = doek;
    laagCache.ctx = laagCtx;
    return doek;
  }

  function tekenRooster(ctx) {
    ctx.strokeStyle = "rgba(255,255,255,.09)";
    ctx.lineWidth = 1;
    for (let c = 0; c <= KOLOMMEN; c += 1) {
      ctx.beginPath();
      ctx.moveTo(c * TEGEL, 0);
      ctx.lineTo(c * TEGEL, HOOGTE);
      ctx.stroke();
    }
    for (let r = 0; r <= RIJEN; r += 1) {
      ctx.beginPath();
      ctx.moveTo(0, r * TEGEL);
      ctx.lineTo(BREEDTE, r * TEGEL);
      ctx.stroke();
    }
  }

  function tekenSpel(ctx, spel, opties = {}) {
    const schaal = opties.schaal || 1;
    const laag = haalMuurlaag(spel, schaal, Boolean(opties.toonRooster));

    if (laag) {
      // de gecachte laag dekt het hele scherm, dus een clear is niet nodig
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(laag, 0, 0);
      ctx.restore();
    } else {
      // geen extra canvas beschikbaar (bijv. in de tests): gewoon tekenen
      metDoek(ctx, schaal, () => {
        tekenDoolhof(ctx, spel);
        if (opties.toonRooster) tekenRooster(ctx);
      });
    }

    metDoek(ctx, schaal, () => {
      tekenPellets(ctx, spel);
      tekenActoren(ctx, spel);
    });
  }

  /* ---------------- export ---------------- */

  const Pacman = {
    PacmanSpel, tekenSpel, tekenSpook, tekenPacMan, tekenFruit, padMetHoeken,
    haalMuurlaag, maakDoek, vingerafdruk,
    isMuur, inHok, wrap, deltaKolom, buur,
    TEMPO, MODUS_DUUR, BANG_DUUR, RICHTINGEN, SPOOK_KLEUREN, KLEUREN,
    PUNTEN, FRUIT_NA_PUNTEN, START_LEVENS, MAX_LEVENS,
    BREEDTE, HOOGTE, TEGEL, KOLOMMEN, RIJEN, TUNNEL_RIJ,
    DOOLHOF, PAC_START, HOK, SPOOK_START,
  };

  root.Pacman = Pacman;
  if (typeof module !== "undefined" && module.exports) module.exports = Pacman;
}(typeof globalThis !== "undefined" ? globalThis : this));
