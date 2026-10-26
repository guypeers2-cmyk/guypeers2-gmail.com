# -*- coding: utf-8 -*-
"""Tests voor de Pac-Man-arcade.

Drie lagen:
  1. Het doolhof in web/pacman/maze.js — vorm, symmetrie en bereikbaarheid.
  2. De console — bestanden, laadvolgorde en de route op de webserver.
  3. De spelkern — de Node-tests in tests/pacman_engine.test.mjs.

Draai met:  python3 -m unittest discover -s tests -v
"""

import json
import re
import shutil
import subprocess
import threading
import unittest
import urllib.request
from collections import deque
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path

import serve

WORTEL = Path(__file__).resolve().parents[1]
PACMAN = WORTEL / "web" / "pacman"
KOLOMMEN, RIJEN = 28, 31
PAC_START = (13, 23)
HOK = {"deur": (13, 12), "uitgang": (13, 11), "rijen": (13, 15), "kolommen": (11, 16)}


def lees_doolhof():
    """Haalt de doolhofregels uit maze.js (één bron van waarheid)."""
    tekst = (PACMAN / "maze.js").read_text(encoding="utf-8")
    blok = tekst.split("const DOOLHOF = [", 1)[1].split("];", 1)[0]
    return re.findall(r'"([^"]*)"', blok)


def vrij(rijen, c, r, deur_open=False):
    if r < 0 or r >= RIJEN:
        return False
    teken = rijen[r][c % KOLOMMEN]
    if teken == "#":
        return False
    if teken == "-":
        return deur_open
    return True


def bereikbaar(rijen, start, deur_open=False):
    gezien = {start}
    wachtrij = deque([start])
    while wachtrij:
        c, r = wachtrij.popleft()
        for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nc, nr = (c + dc) % KOLOMMEN, r + dr
            if (nc, nr) in gezien or not vrij(rijen, nc, nr, deur_open):
                continue
            gezien.add((nc, nr))
            wachtrij.append((nc, nr))
    return gezien


class TestDoolhof(unittest.TestCase):
    """Het doolhof moet kloppen vóór er iets te spelen valt."""

    @classmethod
    def setUpClass(cls):
        cls.rijen = lees_doolhof()
        cls.plat = "".join(cls.rijen)

    def test_afmetingen(self):
        self.assertEqual(len(self.rijen), RIJEN)
        for nummer, rij in enumerate(self.rijen, start=1):
            self.assertEqual(len(rij), KOLOMMEN, f"rij {nummer} heeft {len(rij)} tekens")

    def test_alleen_bekende_tekens(self):
        self.assertLessEqual(set(self.plat), set("#.o- "))

    def test_links_rechts_symmetrisch(self):
        for nummer, rij in enumerate(self.rijen, start=1):
            self.assertEqual(rij, rij[::-1], f"rij {nummer} is niet symmetrisch")

    def test_244_punten_en_4_energizers(self):
        self.assertEqual(self.plat.count("."), 240)
        self.assertEqual(self.plat.count("o"), 4)

    def test_pacman_start_vrij(self):
        c, r = PAC_START
        self.assertTrue(vrij(self.rijen, c, r))
        self.assertNotIn(self.rijen[r][c], "#-")

    def test_alle_punten_bereikbaar(self):
        gezien = bereikbaar(self.rijen, PAC_START)
        onbereikbaar = [
            (c, r)
            for r in range(RIJEN)
            for c in range(KOLOMMEN)
            if self.rijen[r][c] in ".o" and (c, r) not in gezien
        ]
        self.assertEqual(onbereikbaar, [])

    def test_hok_is_dicht_voor_pacman_en_open_voor_spoken(self):
        dicht = bereikbaar(self.rijen, PAC_START)
        open_ = bereikbaar(self.rijen, PAC_START, deur_open=True)
        deur_c, deur_r = HOK["deur"]
        self.assertEqual(self.rijen[deur_r][deur_c], "-")
        self.assertNotIn((deur_c, deur_r), dicht)
        self.assertIn((deur_c, deur_r), open_)
        for r in range(HOK["rijen"][0], HOK["rijen"][1] + 1):
            for c in range(HOK["kolommen"][0], HOK["kolommen"][1] + 1):
                self.assertNotIn((c, r), dicht, f"Pac-Man kan het hok in op {c},{r}")

    def test_geen_punten_in_het_hok(self):
        for r in range(HOK["rijen"][0], HOK["rijen"][1] + 1):
            for c in range(HOK["kolommen"][0], HOK["kolommen"][1] + 1):
                self.assertNotIn(self.rijen[r][c], ".o")

    def test_spoken_kunnen_naar_buiten(self):
        spoken = bereikbaar(self.rijen, HOK["uitgang"], deur_open=True)
        self.assertIn(PAC_START, spoken)
        self.assertIn((1, 1), spoken)

    def test_tunnel_rij_is_open(self):
        r = 14
        for c in (0, 27):
            self.assertNotEqual(self.rijen[r][c], "#")


class TestConsoleBestanden(unittest.TestCase):
    def test_bestanden_bestaan(self):
        for naam in ("index.html", "pacman.css", "app.js", "maze.js", "validatie.js",
                     "engine.js", "editor.html", "editor.js"):
            self.assertTrue((PACMAN / naam).is_file(), f"{naam} ontbreekt")

    def test_laadvolgorde_van_scripts(self):
        html = (PACMAN / "index.html").read_text(encoding="utf-8")
        volgorde = [html.index(f'src="{naam}"') for naam in
                    ("maze.js", "validatie.js", "engine.js", "app.js")]
        self.assertEqual(volgorde, sorted(volgorde),
                         "maze.js → validatie.js → engine.js → app.js")
        self.assertIn('href="pacman.css"', html)
        self.assertIn('id="doek"', html)

    def test_editor_laadt_dezelfde_doolhofmodule(self):
        html = (PACMAN / "editor.html").read_text(encoding="utf-8")
        self.assertIn('src="maze.js"', html)
        self.assertIn('src="validatie.js"', html)
        self.assertIn('src="editor.js"', html)

    def test_console_linkt_naar_de_arcade(self):
        html = (WORTEL / "web" / "index.html").read_text(encoding="utf-8")
        self.assertIn('href="/pacman/"', html)


class StilleHandler(serve.GidsHandler):
    def log_message(self, formaat, *args):
        pass


class TestWebserver(unittest.TestCase):
    """De arcade moet via de bestaande stdlib-server te bereiken zijn."""

    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), StilleHandler)
        cls.poort = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)

    def verzoek(self, pad, methode="GET", data=None):
        verbinding = HTTPConnection("127.0.0.1", self.poort, timeout=5)
        try:
            verbinding.request(methode, pad, body=data,
                               headers={"Content-Type": "application/json"} if data else {})
            antwoord = verbinding.getresponse()
            return antwoord.status, dict(antwoord.getheaders()), antwoord.read()
        finally:
            verbinding.close()

    def test_pacman_zonder_slash_verwijst_door(self):
        status, koppen, _ = self.verzoek("/pacman")
        self.assertEqual(status, 301)
        self.assertEqual(koppen.get("Location"), "/pacman/")

    def test_pacman_console(self):
        status, koppen, body = self.verzoek("/pacman/")
        self.assertEqual(status, 200)
        self.assertIn("text/html", koppen["Content-Type"])
        self.assertIn(b"PAC", body)
        self.assertIn("utf-8", koppen["Content-Type"].lower())

    def test_static_bestanden_van_de_arcade(self):
        for pad, mime in (("/pacman/app.js", "javascript"),
                          ("/pacman/engine.js", "javascript"),
                          ("/pacman/maze.js", "javascript"),
                          ("/pacman/validatie.js", "javascript"),
                          ("/pacman/pacman.css", "text/css"),
                          ("/pacman/editor.html", "text/html")):
            status, koppen, body = self.verzoek(pad)
            self.assertEqual(status, 200, f"{pad} gaf {status}")
            self.assertIn(mime, koppen["Content-Type"])
            self.assertGreater(len(body), 100)

    def test_gids_api_blijft_werken(self):
        status, _, body = self.verzoek("/api/agenten")
        self.assertEqual(status, 200)
        self.assertEqual(len(json.loads(body)["agenten"]), 18)

        c, r = PAC_START
        payload = json.dumps({"tekst": "Wat kost een abonnement per maand?",
                              "sessie": "test-pacman"}).encode("utf-8")
        status, _, body = self.verzoek("/api/bericht", "POST", payload)
        self.assertEqual(status, 200)
        resultaat = json.loads(body)["resultaat"]
        self.assertIn("Is dit goed? (Ja / Nee of feedback)", resultaat["bericht"])
        self.assertEqual(resultaat["stil_aantal"], 17)

    def test_padverkenning_buiten_de_webmap(self):
        status, _, _ = self.verzoek("/../serve.py")
        self.assertIn(status, (400, 404))


class TestJavascriptInNode(unittest.TestCase):
    """Alle JS-tests (engine, console, editor, keuring) via Node."""

    def test_node_tests(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("Node is niet geïnstalleerd")
        bestanden = sorted(str(pad) for pad in (WORTEL / "tests").glob("pacman_*.test.mjs"))
        self.assertGreaterEqual(len(bestanden), 4, "niet alle JS-tests gevonden")
        uitkomst = subprocess.run(
            [node, "--test", *bestanden],
            capture_output=True, text=True, timeout=300,
            cwd=str(WORTEL),
        )
        self.assertEqual(uitkomst.returncode, 0,
                         uitkomst.stdout[-4000:] + uitkomst.stderr[-4000:])
        self.assertIn("# fail 0", uitkomst.stdout)


if __name__ == "__main__":
    unittest.main()
