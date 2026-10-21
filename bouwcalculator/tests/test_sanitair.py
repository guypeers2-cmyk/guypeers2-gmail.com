"""Sanitair: losse stuks/meters, rekent identiek in detail- en m²-modus."""
import unittest
from bouw.offerte import bereken_offerte
from bouw.bereken import referentie_tarieven
from bouw.model import Project
from bouw.tarieven import PAKKETTEN


def project(pakket="san_koudwater", hoeveelheid=10, **extra):
    return {"ruimtes": [{"id": "r", "naam": "Badkamer", "lengte": 4, "breedte": 3, "hoogte": 2.5}],
            "regels": [{"id": "s", "ruimte_id": "r", "oppervlak": "noord",
                        "pakket_id": pakket, "hoeveelheid": hoeveelheid}], **extra}


class SanitairTest(unittest.TestCase):
    def test_waterleiding_meter(self):
        r = bereken_offerte(project())["regels"][0]
        self.assertEqual((r["aantal"], r["eenheid"], r["materiaal_kosten"], r["uren"]), (10, "m", 35, 1.2))
        self.assertEqual((r["arbeidskosten"], r["marge"], r["totaal"]), (54, 5.25, 94.25))

    def test_wc_stuk_en_btw(self):
        o = bereken_offerte(project("san_wc", 1))
        self.assertEqual(o["regels"][0]["totaal"], 308.5)
        self.assertEqual(o["totalen"]["totaal"], 373.29)
        self.assertTrue(any("drinkwater" in w for w in o["waarschuwingen"]))

    def test_afvoer_decimalen(self):
        r = bereken_offerte(project("san_afvoer50", 5.5))["regels"][0]
        self.assertEqual((r["aantal"], r["materiaal_kosten"], r["uren"], r["totaal"]), (5.5, 24.75, .83, 65.81))

    def test_geen_m2_of_negatieve_aantallen(self):
        for aantal in (None, -1, 0):
            self.assertEqual(bereken_offerte(project(hoeveelheid=aantal))["regels"][0]["totaal"], 0)
        a = bereken_offerte(project())
        b = bereken_offerte(project(prijsmodus="m2"))
        self.assertEqual(a["regels"], b["regels"])
        self.assertFalse(any("san_" in k for k in referentie_tarieven()))
        self.assertEqual(bereken_offerte(project("san_wc", 1.1))["regels"][0]["aantal"], 2)

    def test_tarieven_en_roundtrip(self):
        p = project(tarieven={"san_koudwater": 5, "uur_san_koudwater": .1},
                    uurtarief=60, marge_pct=0, btw_pct=6)
        o = bereken_offerte(p)
        self.assertEqual(o["totalen"]["totaal"], 116.6)
        self.assertEqual(bereken_offerte(Project.van_dict(p).naar_dict())["totalen"], o["totalen"])

    def test_alle_sanitairpakketten(self):
        pakketten = [p for p in PAKKETTEN if p["categorie"] == "Sanitair & water"]
        self.assertEqual(len(pakketten), 15)
        for pakket in pakketten:
            with self.subTest(pakket=pakket["id"]):
                o = bereken_offerte(project(pakket["id"], 2))
                self.assertGreater(o["totalen"]["totaal"], 0)
