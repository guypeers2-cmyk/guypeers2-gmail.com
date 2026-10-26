/* ============================================================
   PAC-MAN — de doolhof
   Klassieke 28 × 31 arcade-indeling, één teken per tegel:

     '#'  muur
     '.'  punt (10 punten)
     'o'  energizer (50 punten, spoken vluchten even)
     '-'  deur van het spokenhok (alleen spoken mogen erdoor)
     ' '  lege, beloopbare gang

   De indeling is links-rechts symmetrisch en wordt door
   tests/test_pacman_doolhof.py gecontroleerd.
   ============================================================ */

(function (root) {
  "use strict";

  const DOOLHOF = [
    "############################",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o####.#####.##.#####.####o#",
    "#.####.#####.##.#####.####.#",
    "#..........................#",
    "#.####.##.########.##.####.#",
    "#.####.##.########.##.####.#",
    "#......##....##....##......#",
    "######.##### ## #####.######",
    "######.##### ## #####.######",
    "######.##          ##.######",
    "######.## ###--### ##.######",
    "######.## #      # ##.######",
    "      .   #      #   .      ",
    "######.## #      # ##.######",
    "######.## ######## ##.######",
    "######.##          ##.######",
    "######.## ######## ##.######",
    "######.## ######## ##.######",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#.####.#####.##.#####.####.#",
    "#o..##.......  .......##..o#",
    "###.##.##.########.##.##.###",
    "###.##.##.########.##.##.###",
    "#......##....##....##......#",
    "#.##########.##.##########.#",
    "#.##########.##.##########.#",
    "#..........................#",
    "############################",
  ];

  const KOLOMMEN = 28;
  const RIJEN = 31;
  const TEGEL = 16;                   // logische pixels per tegel
  const BREEDTE = KOLOMMEN * TEGEL;   // 448
  const HOOGTE = RIJEN * TEGEL;       // 496

  const TUNNEL_RIJ = 14;              // hier loopt Pac-Man links/rechts de tunnel in
  const PAC_START = { c: 13, r: 23 };

  /* Het spokenhok: deur op rij 12, uitgang erboven, hart in het midden. */
  const HOK = {
    deur: { c: 13, r: 12 },
    uitgang: { c: 13, r: 11 },
    hart: { c: 13, r: 14 },
    rijen: [13, 15],          // de drie open rijen van het hok
    kolommen: [11, 16],       // de binnenruimte; kolom 10 en 17 zijn de muren
  };

  const SPOOK_START = {
    blinky: { c: 13, r: 11, inHok: false },
    pinky: { c: 13, r: 14, inHok: true },
    inky: { c: 11, r: 14, inHok: true },
    clyde: { c: 16, r: 14, inHok: true },
  };

  const Doolhof = {
    DOOLHOF, KOLOMMEN, RIJEN, TEGEL, BREEDTE, HOOGTE,
    TUNNEL_RIJ, PAC_START, HOK, SPOOK_START,
  };

  root.PacmanDoolhof = Doolhof;
  if (typeof module !== "undefined" && module.exports) module.exports = Doolhof;
}(typeof globalThis !== "undefined" ? globalThis : this));
