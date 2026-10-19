# -*- coding: utf-8 -*-
"""Testbatterij voor het opslaan en laden van offertes.

Draai met:  python3 -m unittest discover -s bouwcalculator/tests -v
"""

import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from bouw import opslag  # noqa: E402


class TestOpslag(unittest.TestCase):
    """Offertes bewaren als JSON-bestand, terugvinden en verwijderen."""

    def setUp(self):
        self.map = opslag.DATA_MAP
        self.tmp = Path(tempfile.mkdtemp())
        opslag.DATA_MAP = self.tmp
        self.project = {
            "naam": "Verbouwing Janssen",
            "klant": "Janssens",
            "ruimtes": [{"id": "r1", "naam": "Kantoor", "lengte": 4, "breedte": 3, "hoogte": 2.5}],
            "regels": [{"id": "g1", "ruimte_id": "r1", "oppervlak": "noord",
                        "pakket_id": "gyproc_wand_profiel"}],
        }

    def tearDown(self):
        opslag.DATA_MAP = self.map
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_opslaan_en_laden(self):
        resultaat = opslag.opslaan(self.project)
        self.assertTrue(resultaat["id"])
        self.assertEqual(resultaat["naam"], "Verbouwing Janssen")
        terug = opslag.laad(resultaat["id"])
        self.assertIsNotNone(terug)
        self.assertEqual(terug["klant"], "Janssens")
        self.assertEqual(len(terug["regels"]), 1)

    def test_lijst_toont_opgeslagen_projecten(self):
        opslag.opslaan(self.project)
        projecten = opslag.lijst()
        self.assertEqual(len(projecten), 1)
        self.assertEqual(projecten[0]["naam"], "Verbouwing Janssen")
        self.assertEqual(projecten[0]["ruimtes"], 1)

    def test_opslaan_met_vaste_id_overschrijft(self):
        eerste = opslag.opslaan(self.project, "vaste-id")
        tweede = opslag.opslaan(self.project, "vaste-id")
        self.assertEqual(tweede["id"], "vaste-id")
        self.assertEqual(len(opslag.lijst()), 1)
        self.assertEqual(opslag.laad("vaste-id")["naam"], eerste["naam"])

    def test_verwijderen(self):
        resultaat = opslag.opslaan(self.project)
        self.assertTrue(opslag.verwijder(resultaat["id"]))
        self.assertIsNone(opslag.laad(resultaat["id"]))
        self.assertFalse(opslag.verwijder(resultaat["id"]))

    def test_ongeldig_bestand_wordt_geoordend(self):
        opslag.DATA_MAP.mkdir(parents=True, exist_ok=True)
        (opslag.DATA_MAP / "kapot.json").write_text("{ geen json", encoding="utf-8")
        self.assertEqual(opslag.lijst(), [])


if __name__ == "__main__":
    unittest.main()
