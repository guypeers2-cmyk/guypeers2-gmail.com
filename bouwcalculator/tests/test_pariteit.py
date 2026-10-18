# -*- coding: utf-8 -*-
"""Pariteitstest: de JS-rekenkern (Cloudflare Workers) moet exact hetzelfde
rekenen als de Python-rekenkern.

Als deze test faalt, loopt de Workers-versie uit de lijn met de lokale app.
Daarom draait hij bij elke wijziging van de rekenkern.

Draai met:  python3 -m unittest discover -s bouwcalculator/tests -v
"""

import json
import shutil
import subprocess
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # noqa: E402

from bouw import bereken_offerte  # noqa: E402

WORTEL = Path(__file__).resolve().parents[1]
RUNNER = WORTEL / "worker" / "test" / "runner.mjs"


def project(naam, maten=(4, 3, 2.5), openingen=(), regels=(), **opties):
    """Bouw een testproject."""
    ruimte = {
        "id": "r1", "naam": naam,
        "lengte": maten[0], "breedte": maten[1], "hoogte": maten[2],
        "openingen": [dict(o) for o in openingen],
    }
    return {
        "naam": naam, "klant": "Test", "ruimtes": [ruimte],
        "regels": [dict(r) for r in regels], **opties,
    }


def regel(vlak="noord", pakket="gyproc_wand_profiel", opties=None, **extra):
    regel = {"id": "g1", "ruimte_id": "r1", "oppervlak": vlak, "pakket_id": pakket}
    if opties:
        regel["opties"] = opties
    regel.update(extra)
    return regel


DEUR = {"naam": "Deur", "muur": "noord", "breedte": 0.9, "hoogte": 2.1}
RAAM = {"naam": "Raam", "muur": "oost", "breedte": 1.2, "hoogte": 1.2}

PROJECTS = [
    project("Enkele wand"),
    project("Wand met deur", openingen=[DEUR], regels=[regel()]),
    project("Twee zijden + wol", openingen=[DEUR], regels=[
        regel(opties={"zijden": "2 zijden", "isolatie": "mineralen wol 75 mm"})]),
    project("PIR en 15 mm", regels=[
        regel(opties={"zijden": "2 zijden", "isolatie": "PIR 60 mm",
                      "plaat": "15 mm", "profiel": "C100"})]),
    project("Plafond", regels=[regel(vlak="plafond", pakket="gyproc_plafond")]),
    project("Plafond met wol", regels=[regel(vlak="plafond", pakket="gyproc_plafond",
                                             opties={"isolatie": "mineralen wol 75 mm"})]),
    project("Direct op metswerk", regels=[regel(pakket="gyproc_direct")]),
    project("Voegafwerking en schilderen", regels=[
        regel(pakket="gyproc_voegafwerking"),
        regel(pakket="schilderen_gyproc")]),
    project("Raam in de oostwand", openingen=[RAAM], regels=[regel(vlak="oost")]),
    project("Hoeveelheid overschreven", regels=[regel(hoeveelheid=5.5)]),
    project("Snelle m2-prijs", regels=[regel()], prijsmodus="m2"),
    project("Eigen tarieven", regels=[regel()],
            tarieven={"plaat_gyproc_12_5": 12.0, "uur_wand_platen": 0.3}),
    project("Korting en btw", regels=[regel()], korting_pct=10.0, btw_pct=21.0, marge_pct=20.0),
    project("Uurtarief 60", regels=[regel()], uurtarief=60.0),
    project("Nette ruimte", maten=(6.2, 4.35, 2.7), openingen=[DEUR, RAAM], regels=[
        regel(opties={"zijden": "2 zijden", "isolatie": "mineralen wol 75 mm"}),
        regel(vlak="plafond", pakket="gyproc_plafond"),
    ]),
    # rommel die de browser zou kunnen sturen
    project("Onbekend pakket", regels=[regel(pakket="bestaat-niet")]),
    project("Onbekend vlak", regels=[regel(vlak="zolder")]),
]


class TestPariteit(unittest.TestCase):
    """De JS-port en de Python-kern leveren identieke offertes."""

    def test_js_en_python_komen_overeen(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("node is niet geïnstalleerd — pariteitstest overgeslagen")
        if not RUNNER.is_file():
            self.skipTest(f"runner ontbreekt: {RUNNER}")

        python_uitvoer = [bereken_offerte(p) for p in PROJECTS]
        resultaat = subprocess.run(
            [node, str(RUNNER)],
            input=json.dumps(PROJECTS, ensure_ascii=False),
            capture_output=True, text=True, timeout=120,
        )
        self.assertEqual(resultaat.returncode, 0, resultaat.stderr)
        js_uitvoer = json.loads(resultaat.stdout)

        self.assertEqual(len(python_uitvoer), len(js_uitvoer))
        for index, (py, js) in enumerate(zip(python_uitvoer, js_uitvoer)):
            with self.subTest(project=PROJECTS[index]["naam"]):
                self.assertEqual(py["totalen"], js["totalen"])
                self.assertEqual(py["regels"], js["regels"])
                self.assertEqual(py["ruimtes"], js["ruimtes"])
                self.assertEqual(py["waarschuwingen"], js["waarschuwingen"])
                self.assertEqual(py["per_ruimte"], js["per_ruimte"])


if __name__ == "__main__":
    unittest.main()
