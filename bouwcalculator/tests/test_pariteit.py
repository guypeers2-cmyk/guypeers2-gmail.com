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


# Elektriciteit: alle eenheden, nul/ontbrekend, overrides en gemengde prijsmodi.
for _pakket in ("stopcontact", "stopcontact_dubbel", "schakelaar", "lichtpunt", "kabel_3g25", "kabel_3g15", "sleuf", "sleuf_dichten"):
    for _aantal in (None, 0, -1, 1.2, 12.5):
        PROJECTS.append(project("Elektriciteit " + _pakket, regels=[
            regel(pakket="elek_" + _pakket, hoeveelheid=_aantal)], prijsmodus="m2"))
PROJECTS.append(project("Gemengd Gyproc elektriciteit", regels=[
    regel(), regel(pakket="elek_stopcontact", hoeveelheid=3, id="e"),
    regel(pakket="elek_sleuf", hoeveelheid=12.5, id="s")], prijsmodus="m2",
    tarieven={"elek_stopcontact": 18.75, "uur_elek_stopcontact": .4},
    uurtarief=60, korting_pct=10, btw_pct=6))

from bouw.tarieven import PAKKETTEN
for _pakket in (p for p in PAKKETTEN if p["categorie"] == "Sanitair & water"):
    for _aantal in (None, -1, 0, 1.1, 5.5):
        PROJECTS.append(project("Sanitair " + _pakket["id"], regels=[
            regel(pakket=_pakket["id"], hoeveelheid=_aantal)], prijsmodus="m2"))
PROJECTS.append(project("Badkamer gemengd", regels=[
    regel(), regel(pakket="san_lavabo", hoeveelheid=1, id="s"),
    regel(pakket="san_koudwater", hoeveelheid=8.5, id="w"),
    regel(pakket="elek_stopcontact", hoeveelheid=2, id="e")],
    tarieven={"san_koudwater": 5.5, "uur_san_koudwater": .2},
    uurtarief=60, marge_pct=20, korting_pct=5, btw_pct=6))

PROJECTS.append(project("Plaatsingen behouden", regels=[regel(
    pakket="san_koudwater", hoeveelheid=5, visualisatie={"x":"1,25", "y":0, "z":.3,"x2":4,"y2":0,"z2":.3})]))


# Free contours, angled walls and true sloped ceiling areas in both price modes.
for coords in [((0,0),(4,0),(4,1.5),(2,1.5),(2,3),(0,3)),
               ((0,0),(4,0),(3,3),(1,3)), ((0,0),(4,0),(2,3)),
               ((0,0),(4,0),(4,3),(3,3),(3,1),(1,1),(1,3),(0,3))]:
    for dak in (None, {'as':'x','start':1,'eind':3}, {'as':'y','start':3.2,'eind':.8}):
        for modus in ('detail','m2'):
            p=project('Vrije contour', regels=[regel(vlak='plafond',pakket='gyproc_plafond'),regel(vlak='noord',id='wand')], prijsmodus=modus)
            p['ruimtes'][0].update(contour=[{'x':x,'y':y} for x,y in coords],dak=dak)
            PROJECTS.append(p)
PROJECTS.append({**project('Extra wand',openingen=[dict(RAAM,muur='wand_5')],regels=[regel(vlak='wand_5')]),
    'ruimtes':[{'id':'r1','contour':[{'x':x,'y':y} for x,y in [(0,0),(4,0),(4,1.5),(2,1.5),(2,3),(0,3)]],
                'openingen':[dict(RAAM,muur='wand_5')]}]})

trap_project = project('Trap bewaard zonder vloer- of prijswijziging', regels=[regel()])
trap_project['ruimtes'][0]['trappen'] = [
    dict(id='t1', naam='Trap & <bordes>', x=.2, y=.3, breedte=.9,
         lengte=2.4, hoogte=2.5, richting=90, treden=14),
    dict(naam='Tweede trap', richting=270),
]
PROJECTS.append(trap_project)


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
                self.assertEqual(py["project"], js["project"])
                self.assertEqual(py["totalen"], js["totalen"])
                self.assertEqual(py["regels"], js["regels"])
                self.assertEqual(py["ruimtes"], js["ruimtes"])
                self.assertEqual(py["waarschuwingen"], js["waarschuwingen"])
                self.assertEqual(py["per_ruimte"], js["per_ruimte"])


if __name__ == "__main__":
    unittest.main()
