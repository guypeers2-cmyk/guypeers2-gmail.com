/* ============================================================
   PAC-MAN — levels en moeilijkheidsgraden
   Eén klassiek doolhof plus vier gegenereerde, elk met een vaste
   seed (dus altijd hetzelfde en altijd gekeurd door de tests).
   De moeilijkheidsgraad schaalt tempo en bangduur, niet de regels.
   ============================================================ */

(function (root) {
  "use strict";

  const mazen = typeof module !== "undefined" && module.exports
    ? require("./maze.js")
    : root.PacmanDoolhof;

  const generator = typeof module !== "undefined" && module.exports
    ? require("./generator.js")
    : root.PacmanGenerator;

  const { DOOLHOF } = mazen;

  const ZADEN = [7, 3, 11, 21];

  const NIVEAUS = [
    { id: "klassiek", naam: "Klassiek", emoji: "🏛️", rijen: DOOLHOF },
    ...ZADEN.map((seed, index) => ({
      id: `doolhof-${seed}`,
      naam: `Doolhof ${["I", "II", "III", "IV"][index]}`,
      emoji: ["🌀", "🧩", "🔀", "🎲"][index],
      seed,
      rijen: generator.genereerRijen(seed),
    })),
  ];

  const MOEILIJKHEDEN = {
    chill: {
      id: "chill",
      naam: "Chill",
      emoji: "🌱",
      uitleg: "Trage spoken, lang bang",
      spookTempo: 0.78,
      pacTempo: 1.02,
      bangFactor: 1.4,
      puntFactor: 1,
    },
    normaal: {
      id: "normaal",
      naam: "Normaal",
      emoji: "⚖️",
      uitleg: "Zoals de arcade het bedoelde",
      spookTempo: 1,
      pacTempo: 1,
      bangFactor: 1,
      puntFactor: 1,
    },
    arcade: {
      id: "arcade",
      naam: "Arcade",
      emoji: "🔥",
      uitleg: "Snelle spoken, kort bang",
      spookTempo: 1.2,
      pacTempo: 0.99,
      bangFactor: 0.7,
      puntFactor: 1.5,
    },
    munt: {
      id: "munt",
      naam: "Munt-op",
      emoji: "💀",
      uitleg: "Eén leven, geen genade",
      spookTempo: 1.32,
      pacTempo: 0.98,
      bangFactor: 0.5,
      puntFactor: 2,
      levens: 1,
    },
  };

  const STANDAARD_MOEILIJKHEID = "normaal";

  function niveauOpId(id) {
    return NIVEAUS.findIndex((niveau) => niveau.id === id);
  }

  function moeilijkheidOpId(id) {
    return MOEILIJKHEDEN[id] ? MOEILIJKHEDEN[id] : MOEILIJKHEDEN[STANDAARD_MOEILIJKHEID];
  }

  const Levels = {
    NIVEAUS, MOEILIJKHEDEN, STANDAARD_MOEILIJKHEID, ZADEN,
    niveauOpId, moeilijkheidOpId,
    alleRijen: () => NIVEAUS.map((niveau) => niveau.rijen),
    namen: () => NIVEAUS.map((niveau) => niveau.naam),
  };

  root.PacmanLevels = Levels;
  if (typeof module !== "undefined" && module.exports) module.exports = Levels;
}(typeof globalThis !== "undefined" ? globalThis : this));
