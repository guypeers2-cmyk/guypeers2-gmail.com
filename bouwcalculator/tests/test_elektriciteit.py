"""Elektriciteit is een meetstaat per stuk/meter, onafhankelijk van geometrie."""
import unittest
from bouw.offerte import bereken_offerte
from bouw.bereken import referentie_tarieven


def project(pakket="elek_stopcontact", hoeveelheid=2, **extra):
    return {"ruimtes": [{"id": "r", "naam": "Keuken", "lengte": 4, "breedte": 3, "hoogte": 2.5}],
            "regels": [{"id": "e", "ruimte_id": "r", "oppervlak": "noord",
                        "pakket_id": pakket, "hoeveelheid": hoeveelheid}], **extra}


class ElektriciteitTest(unittest.TestCase):
    def test_stopcontacten(self):
        o = bereken_offerte(project())
        r = o["regels"][0]
        self.assertEqual((r["aantal"], r["eenheid"]), (2, "st"))
        self.assertEqual(r["materiaal_kosten"], 25)
        self.assertEqual(r["uren"], .7)
        self.assertEqual(r["arbeidskosten"], 31.5)
        self.assertEqual(r["marge"], 3.75)
        self.assertEqual(r["totaal"], 60.25)
        self.assertEqual(o["totalen"]["totaal"], 72.9)
        self.assertTrue(any("keuring" in w for w in o["waarschuwingen"]))

    def test_meterprijzen(self):
        r = bereken_offerte(project("elek_sleuf", 10))["regels"][0]
        self.assertEqual((r["eenheid"], r["uren"], r["materiaal_kosten"], r["totaal"]), ("m", 1.8, 0, 81))
        r = bereken_offerte(project("elek_kabel_3g25", 10))["regels"][0]
        self.assertEqual((r["materiaal_kosten"], r["arbeidskosten"], r["totaal"]), (16.5, 27, 45.98))

    def test_geen_automatisch_oppervlak(self):
        for aantal in (None, 0, -3):
            r = bereken_offerte(project(hoeveelheid=aantal))["regels"][0]
            self.assertEqual(r["aantal"], 0)
            self.assertEqual(r["totaal"], 0)
        self.assertEqual(bereken_offerte(project(hoeveelheid=1.2))["regels"][0]["aantal"], 2)

    def test_m2_modus_blijft_stuk_meter(self):
        a = bereken_offerte(project())
        b = bereken_offerte(project(prijsmodus="m2"))
        self.assertEqual(a["regels"], b["regels"])
        self.assertFalse(any("elek_" in k for k in referentie_tarieven()))
        self.assertFalse(any(t["soort"] == "m2" and "elek_" in t["sleutel"] for t in a["tarieven"]))

    def test_eigen_prijzen_korting_btw(self):
        o = bereken_offerte(project(tarieven={"elek_stopcontact": 20, "uur_elek_stopcontact": .5},
                                   uurtarief=60, marge_pct=0, korting_pct=10, btw_pct=6))
        self.assertEqual(o["totalen"]["materiaal"], 40)
        self.assertEqual(o["totalen"]["arbeid"], 60)
        self.assertEqual(o["totalen"]["totaal"], 95.4)

    def test_alle_pakketten(self):
        for key in ("stopcontact", "stopcontact_dubbel", "stopcontact_opbouw", "stopcontact_dubbel_opbouw", "schakelaar_opbouw", "schakelaar", "lichtpunt", "kabel_3g25", "kabel_3g15", "sleuf", "sleuf_dichten"):
            o = bereken_offerte(project("elek_" + key, 3))
            self.assertGreater(o["regels"][0]["totaal"], 0)
