/* ============================================================
   PAC-MAN — doolhofgenerator
   Nieuwe, speelbare doolhoven in de klassieke vorm: gangen van één
   tegel breed, muren van twee tegels dik, een spokenhok in het midden
   en een tunnel links/rechts.

   Pijplijn (alles deterministisch via één seed):
     1. gangen graven tussen knopen op een raster met stap 3;
     2. doodeindes opruimen — vlechten waar het kan, anders vullen;
     3. het spokenhok uitkerven en met een korte gang aansluiten;
     4. de tunnel openen;
     5. punten strooien en vier energizers zetten.

   Zonder stap 2 zit je als Pac-Man constant klem in doodlopende
   gangen; daarom is "geen doodeindes" een harde eis en een test.
   ============================================================ */

(function (root) {
  "use strict";

  const mazen = typeof module !== "undefined" && module.exports
    ? require("./maze.js")
    : root.PacmanDoolhof;

  const { KOLOMMEN, RIJEN, PAC_START, HOK } = mazen;
  const STAP = 3;                  // afstand tussen twee gangen
  const LAATSTE_RIJ = RIJEN - 2;   // rij 29: daar mogen nog gangen liggen
  const MIDDEN = 14;

  /* ---------------- toeval met een seed ---------------- */

  function mulberry32(seed) {
    let a = (seed >>> 0) || 1;
    return function volgende() {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------------- hulpjes ---------------- */

  const inHok = (c, r) => r >= HOK.rijen[0] && r <= HOK.rijen[1]
    && c >= HOK.kolommen[0] && c <= HOK.kolommen[1];

  /**
   * Het hok zelf plus zijn muren zijn beschermd terrein: daar breekt de
   * generator niets open en gooit hij niets dicht. De gang erboven (rij 11)
   * doet gewoon mee, zodat daar geen dood spoor ontstaat.
   */
  const beschermd = (c, r) => r >= HOK.rijen[0] - 1 && r <= HOK.rijen[1] + 1
    && c >= HOK.kolommen[0] - 1 && c <= HOK.kolommen[1] + 1;

  const binnen = (c, r) => c >= 1 && c <= KOLOMMEN - 2 && r >= 1 && r <= LAATSTE_RIJ;

  const open = (grid, c, r) => r >= 0 && r < RIJEN && c >= 0 && c < KOLOMMEN
    && grid[r][c] !== "#";

  const RICHTINGEN = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  const uitgangen = (grid, c, r) => RICHTINGEN.filter(([dc, dr]) => open(grid, c + dc, r + dr)).length;

  function knoopVrij(c, r) {
    return binnen(c, r) && !inHok(c, r);
  }

  function knopen() {
    const lijst = [];
    for (let r = 1; r <= LAATSTE_RIJ; r += STAP) {
      for (let c = 1; c <= KOLOMMEN - 2; c += STAP) {
        if (knoopVrij(c, r)) lijst.push({ c, r });
      }
    }
    return lijst;
  }

  function buren(c, r) {
    return [[c + STAP, r], [c - STAP, r], [c, r + STAP], [c, r - STAP]]
      .filter(([nc, nr]) => knoopVrij(nc, nr))
      .map(([nc, nr]) => ({ c: nc, r: nr }));
  }

  /* ---------------- het doolhof ---------------- */

  function genereerRijen(seed = 1) {
    const toevallig = mulberry32(seed);
    const grid = Array.from({ length: RIJEN }, () => Array.from({ length: KOLOMMEN }, () => "#"));

    graaf(grid, toevallig);
    ruimDodeEindenOp(grid, toevallig);
    kerfHokUit(grid, toevallig);
    ruimDodeEindenOp(grid, toevallig);
    openTunnel(grid);
    maakStartVrij(grid);
    strooiPunten(grid);

    return grid.map((rij) => rij.join(""));
  }

  /** 1. Diepte-eerst gangen graven tussen de knopen. */
  function graaf(grid, toevallig) {
    const start = { c: 1, r: 1 };
    const gezien = new Set([`${start.c},${start.r}`]);
    const stapel = [start];
    grid[start.r][start.c] = " ";

    while (stapel.length) {
      const huidig = stapel[stapel.length - 1];
      const opties = buren(huidig.c, huidig.r).filter((k) => !gezien.has(`${k.c},${k.r}`));
      if (opties.length === 0) {
        stapel.pop();
        continue;
      }
      const volgende = opties[Math.floor(toevallig() * opties.length)];
      const dc = Math.sign(volgende.c - huidig.c);
      const dr = Math.sign(volgende.r - huidig.r);
      let c = huidig.c + dc;
      let r = huidig.r + dr;
      for (;;) {
        grid[r][c] = " ";
        if (c === volgende.c && r === volgende.r) break;
        c += dc;
        r += dr;
      }
      gezien.add(`${volgende.c},${volgende.r}`);
      stapel.push(volgende);
    }
  }

  /**
   * 2. Doodlopende gangen wegwerken: eerst vlechten (een muur naast de dood
   *    lopen openen naar een gang twee tegels verder), en lukt dat niet, dan
   *    een kort kanaal graven naar de dichtstbijzijnde gang. Nooit vullen —
   *    dan vreet je het halve doolhof op.
   */
  function ruimDodeEindenOp(grid, toevallig) {
    for (let poging = 0; poging < 300; poging += 1) {
      const dood = zoekDoodEinde(grid);
      if (!dood) return;

      const kandidaten = RICHTINGEN.filter(([dc, dr]) => {
        const mc = dood.c + dc;
        const mr = dood.r + dr;
        if (grid[mr][mc] !== "#" || beschermd(mc, mr)) return false;
        return open(grid, dood.c + dc * 2, dood.r + dr * 2)
          && !inHok(dood.c + dc * 2, dood.r + dr * 2);
      });

      if (kandidaten.length) {
        const [dc, dr] = kandidaten[Math.floor(toevallig() * kandidaten.length)];
        grid[dood.r + dr][dood.c + dc] = " ";
        continue;
      }

      const kanaal = zoekKanaal(grid, dood);
      if (!kanaal) return;
      for (const tegel of kanaal) grid[tegel.r][tegel.c] = " ";
    }
  }

  function zoekDoodEinde(grid) {
    for (let r = 1; r <= LAATSTE_RIJ; r += 1) {
      for (let c = 1; c <= KOLOMMEN - 2; c += 1) {
        if (grid[r][c] === "#" || beschermd(c, r)) continue;
        if (uitgangen(grid, c, r) <= 1) return { c, r };
      }
    }
    return null;
  }

  /** Kortste kanaal door de muren heen naar een bestaande gang. */
  function zoekKanaal(grid, dood) {
    const gezien = new Set([`${dood.c},${dood.r}`]);
    const wachtrij = [{ ...dood, pad: [] }];
    while (wachtrij.length) {
      const nu = wachtrij.shift();
      for (const [dc, dr] of RICHTINGEN) {
        const c = nu.c + dc;
        const r = nu.r + dr;
        const sleutel = `${c},${r}`;
        if (gezien.has(sleutel) || !binnen(c, r) || beschermd(c, r)) continue;
        if (grid[r][c] === "-") continue;
        gezien.add(sleutel);
        const pad = [...nu.pad, { c, r }];
        if (grid[r][c] !== "#") {
          if (pad.length < 2) continue;              // dat was de eigen gang
          return pad;
        }
        wachtrij.push({ c, r, pad });
      }
    }
    return null;
  }

  /** 3. Het spokenhok: binnenin open, rondom dicht, deur op rij 12. */
  function kerfHokUit(grid, toevallig) {
    for (let r = HOK.rijen[0]; r <= HOK.rijen[1]; r += 1) {
      for (let c = HOK.kolommen[0]; c <= HOK.kolommen[1]; c += 1) grid[r][c] = " ";
    }
    grid[HOK.deur.r][HOK.deur.c] = "-";
    // de gang boven de deur, waar de spoken uitkomen
    grid[HOK.uitgang.r][HOK.uitgang.c] = " ";
    grid[HOK.uitgang.r][HOK.deur.c - 1] = " ";
    grid[HOK.uitgang.r][HOK.deur.c + 1] = " ";

    // en die gang moet aan het doolhof vastzitten
    const doel = sluitAan(grid);
    if (!doel) {
      // noodoplossing: een rechte gang omhoog
      for (let r = HOK.uitgang.r - 1; r >= 1; r -= 1) {
        grid[r][HOK.deur.c] = " ";
        if (grid[r][HOK.deur.c - 1] !== "#") break;
      }
    }
    void toevallig;
  }

  /**
   * Zoekt de kortste weg van de hokgang naar een bestaande gang en graaft
   * die uit. Geeft de gevonden tegel terug (of null).
   */
  function sluitAan(grid) {
    const startpunten = [
      { c: HOK.deur.c - 1, r: HOK.uitgang.r },
      { c: HOK.deur.c + 1, r: HOK.uitgang.r },
    ];
    const gezien = new Set();
    const wachtrij = [];
    for (const start of startpunten) {
      gezien.add(`${start.c},${start.r}`);
      wachtrij.push({ ...start, pad: [] });
    }

    while (wachtrij.length) {
      const nu = wachtrij.shift();
      for (const [dc, dr] of RICHTINGEN) {
        const c = nu.c + dc;
        const r = nu.r + dr;
        const sleutel = `${c},${r}`;
        if (gezien.has(sleutel)) continue;
        if (!binnen(c, r)) continue;
        if (beschermd(c, r)) continue;          // nooit door het hok zelf
        if (grid[r][c] === "-") continue;
        gezien.add(sleutel);

        const pad = [...nu.pad, { c, r }];
        if (grid[r][c] !== "#") {
          // gevonden: alles op het pad openmaken
          for (const tegel of pad) grid[tegel.r][tegel.c] = " ";
          return { c, r };
        }
        wachtrij.push({ c, r, pad });
      }
    }
    return null;
  }

  /** 4. Een tunnel op de rij het dichtst bij het midden. */
  function openTunnel(grid) {
    const kandidaten = [];
    for (let r = 1; r <= LAATSTE_RIJ; r += STAP) {
      if (grid[r][1] === " ") kandidaten.push(r);
    }
    if (!kandidaten.length) return false;
    kandidaten.sort((a, b) => Math.abs(a - MIDDEN) - Math.abs(b - MIDDEN));
    const rij = kandidaten[0];
    grid[rij][0] = " ";
    grid[rij][KOLOMMEN - 1] = " ";
    return true;
  }

  /**
   * Pac-Man start altijd op (13,23). Ligt daar een muur of een dood stuk,
   * dan graven we een kanaal naar de dichtstbijzijnde gang — anders begint
   * hij in een hokje van één tegel.
   */
  function maakStartVrij(grid) {
    const start = { c: PAC_START.c, r: PAC_START.r };
    if (open(grid, start.c, start.r) && uitgangen(grid, start.c, start.r) >= 2) return;
    grid[start.r][start.c] = " ";
    const kanaal = zoekKanaal(grid, start);
    if (!kanaal) return;
    for (const tegel of kanaal) grid[tegel.r][tegel.c] = " ";
  }

  /** 5. Punten op elke open tegel, vier energizers bij de hoeken. */
  function strooiPunten(grid) {
    for (let r = 0; r < RIJEN; r += 1) {
      for (let c = 0; c < KOLOMMEN; c += 1) {
        if (grid[r][c] === " " && !inHok(c, r)) grid[r][c] = ".";
      }
    }

    const hoeken = [
      { c: 1, r: 1 }, { c: KOLOMMEN - 2, r: 1 },
      { c: 1, r: LAATSTE_RIJ }, { c: KOLOMMEN - 2, r: LAATSTE_RIJ },
    ];
    for (const hoek of hoeken) {
      const doel = dichtstbijzijndePunt(grid, hoek);
      if (doel) grid[doel.r][doel.c] = "o";
    }

    // de starttegel van Pac-Man blijft leeg, zoals in het origineel
    grid[PAC_START.r][PAC_START.c] = " ";
  }

  function dichtstbijzijndePunt(grid, hoek) {
    for (let afstand = 0; afstand < 9; afstand += 1) {
      for (let dr = -afstand; dr <= afstand; dr += 1) {
        for (let dc = -afstand; dc <= afstand; dc += 1) {
          const c = hoek.c + dc;
          const r = hoek.r + dr;
          if (c < 0 || c >= KOLOMMEN || r < 0 || r >= RIJEN) continue;
          if (grid[r][c] === ".") return { c, r };
        }
      }
    }
    return null;
  }

  const Generator = { genereerRijen, mulberry32, knopen, STAP, beschermd };

  root.PacmanGenerator = Generator;
  if (typeof module !== "undefined" && module.exports) module.exports = Generator;
}(typeof globalThis !== "undefined" ? globalThis : this));
