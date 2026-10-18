# -*- coding: utf-8 -*-
"""Testbatterij voor de bouwprijscalculator.

Draai met:  python3 -m unittest discover -s bouwcalculator/tests -v
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from bouw import Opening, Project, Ruimte, Werkregel, bereken_offerte  # noqa: E402
from bouw.bereken import referentie_tarieven, ruimte_oppervlakken  # noqa: E402


def muur_van(ruimte, sleutel):
    return next(v for v in ruimte_oppervlakken(ruimte) if v["sleutel"] == sleutel)


class TestOppervlakken(unittest.TestCase):
    """Maten en openingen vertalen naar bruikbare oppervlakken."""

    def test_rechthoekige_ruimte(self):
        ruimte = Ruimte(lengte=5, breedte=4, hoogte=2.5)
        vlakken = {v["sleutel"]: v for v in ruimte_oppervlakken(ruimte)}
        self.assertAlmostEqual(vlakken["noord"]["bruto"], 12.5)
        self.assertAlmostEqual(vlakken["zuid"]["bruto"], 12.5)
        self.assertAlmostEqual(vlakken["oost"]["bruto"], 10.0)
        self.assertAlmostEqual(vlakken["west"]["bruto"], 10.0)
        self.assertAlmostEqual(vlakken["plafond"]["netto"], 20.0)
        self.assertAlmostEqual(vlakken["vloer"]["netto"], 20.0)

    def test_deur_wordt_afgetrokken(self):
        ruimte = Ruimte(lengte=5, breedte=4, hoogte=2.5, openingen=[
            Opening(naam="Deur", muur="noord", breedte=0.9, hoogte=2.1),
        ])
        noord = muur_van(ruimte, "noord")
        self.assertAlmostEqual(noord["opening"], 1.89)
        self.assertAlmostEqual(noord["netto"], 12.5 - 1.89)
        # De deur zit alleen in de noordwand.
        self.assertAlmostEqual(muur_van(ruimte, "zuid")["netto"], 12.5)


class TestMateriaalnames(unittest.TestCase):
    """De take-off: hoeveel platen, profielen, schroeven en voegband."""

    def setUp(self):
        self.project = Project(
            ruimtes=[Ruimte(naam="Kantoor", lengte=4, breedte=3, hoogte=2.5)],
            regels=[Werkregel(ruimte_id="x", oppervlak="noord", pakket_id="gyproc_wand_profiel")],
        )
        self.project.ruimtes[0].id = "x"
        self.project.regels[0].ruimte_id = "x"

    def _regel(self):
        offerte = bereken_offerte(self.project.naar_dict())
        return offerte["regels"][0]

    def test_platen_met_verspilling(self):
        regel = self._regel()
        platen = next(l for l in regel["materiaal"] if l["prijs_sleutel"] == "plaat_gyproc_12_5")
        # 10 m² wand × 1 zijde × 1,10 verspilling = 11 m² → 4 platen van 3,12 m².
        self.assertAlmostEqual(platen["aantal"], 4)
        self.assertAlmostEqual(platen["totaal"], 4 * 9.50)

    def test_cprofiel_voor_studs_en_openings(self):
        regel = self._regel()
        profiel = next(l for l in regel["materiaal"] if l["prijs_sleutel"] == "profiel_c75")
        # 4,0 m wand / 0,40 spoor = 10 + 1 stuk = 11 stuks van 2,5 m (+5%) = 28,9 m → 10 stuks.
        self.assertAlmostEqual(profiel["aantal"], 10)

    def test_twee_zijden_dubbelt_platen_niet_profielen(self):
        self.project.regels[0].opties = {"zijden": "2 zijden"}
        regel = self._regel()
        platen = next(l for l in regel["materiaal"] if l["prijs_sleutel"] == "plaat_gyproc_12_5")
        profiel = next(l for l in regel["materiaal"] if l["prijs_sleutel"] == "profiel_c75")
        self.assertAlmostEqual(platen["aantal"], 8)    # 20 m² + 10% = 22 m² → 8 platen
        self.assertAlmostEqual(profiel["aantal"], 10)  # profiel blijft hetzelfde

    def test_uren_van_de_standaard_wand(self):
        regel = self._regel()
        # 0,05 opmeten + 0,30 profielen + 0,22 platen + 0,30 voegen = 0,87 u/m².
        self.assertAlmostEqual(regel["uren"], round(0.87 * 10, 2))

    def test_isolatie_komt_er_bij(self):
        self.project.regels[0].opties = {"isolatie": "mineralen wol 75 mm"}
        regel = self._regel()
        wol = next(l for l in regel["materiaal"] if l["prijs_sleutel"] == "isolatie_wol")
        self.assertAlmostEqual(wol["aantal"], 10.5)  # 10 m² + 5%
        self.assertAlmostEqual(regel["uren"], round((0.87 + 0.10) * 10, 2))


class TestOfferte(unittest.TestCase):
    """Korting, marge en BTW op de totale offerte."""

    def setUp(self):
        self.project = Project(
            naam="Verbouwing",
            ruimtes=[Ruimte(naam="Kantoor", lengte=4, breedte=3, hoogte=2.5)],
            uurtarief=45.0,
            marge_pct=15.0,
            korting_pct=10.0,
            btw_pct=21.0,
        )
        self.project.ruimtes[0].id = "x"
        self.project.regels = [Werkregel(ruimte_id="x", oppervlak="noord",
                                         pakket_id="gyproc_wand_profiel")]

    def test_totalen(self):
        offerte = bereken_offerte(self.project.naar_dict())
        totalen = offerte["totalen"]
        regel = offerte["regels"][0]
        self.assertAlmostEqual(totalen["materiaal"], regel["materiaal_kosten"])
        self.assertAlmostEqual(totalen["arbeid"], regel["arbeidskosten"])
        self.assertAlmostEqual(totalen["subtotaal"],
                               totalen["materiaal"] + totalen["arbeid"] + totalen["marge"])
        self.assertAlmostEqual(totalen["korting"], round(totalen["subtotaal"] * 0.10, 2))
        self.assertAlmostEqual(totalen["btw"], round(totalen["netto"] * 0.21, 2))
        self.assertAlmostEqual(totalen["totaal"], totalen["netto"] + totalen["btw"])

    def test_marge_wordt_over_materiaal_berekend(self):
        offerte = bereken_offerte(self.project.naar_dict())
        regel = offerte["regels"][0]
        self.assertAlmostEqual(regel["marge"], round(regel["materiaal_kosten"] * 0.15, 2))

    def test_snelle_m2_prijs_komt_overeen_met_detail(self):
        """De referentie-m²-prijs moet kloppen met de gedetailleerde berekening."""
        referentie = referentie_tarieven()
        materiaal = referentie["m2_gyproc_wand_profiel_materiaal"]
        arbeid = referentie["m2_gyproc_wand_profiel_arbeid"]
        self.assertGreater(materiaal, 0)
        self.assertGreater(arbeid, 0)
        # Referentie: wand 4,0 × 2,5 m met één deur van 0,8 × 2,0 m → 8,4 m² netto.
        project = Project(
            ruimtes=[Ruimte(lengte=4, breedte=3, hoogte=2.5, openingen=[
                Opening(naam="Deur", muur="noord", breedte=0.8, hoogte=2.0)])],
            uurtarief=45.0)
        project.ruimtes[0].id = "x"
        project.regels = [Werkregel(ruimte_id="x", oppervlak="noord",
                                    pakket_id="gyproc_wand_profiel")]
        detail = bereken_offerte(project.naar_dict())["regels"][0]
        self.assertAlmostEqual(detail["aantal"], 8.4, places=2)
        self.assertAlmostEqual(round(materiaal * 8.4, 2), detail["materiaal_kosten"], delta=0.10)
        self.assertAlmostEqual(round(arbeid * 8.4, 2), detail["arbeidskosten"], delta=0.10)

    def test_m2_modus_maakt_van_elke_regel_een_regel(self):
        self.project.prijsmodus = "m2"
        offerte = bereken_offerte(self.project.naar_dict())
        regel = offerte["regels"][0]
        self.assertEqual(len(regel["materiaal"]), 1)
        self.assertEqual(len(regel["taken"]), 1)
        self.assertAlmostEqual(regel["uren"], round(regel["arbeidskosten"] / 45.0, 2))

    def test_hoeveelheid_overtreft_de_wand(self):
        self.project.regels[0].hoeveelheid = 5.0
        offerte = bereken_offerte(self.project.naar_dict())
        self.assertAlmostEqual(offerte["regels"][0]["aantal"], 5.0)


class TestRobuustheid(unittest.TestCase):
    """De browser is geen vertrouwenswaardige tegenstander."""

    def test_onzin_in_invoer_wordt_gegeneerd(self):
        project = Project.van_dict({
            "naam": 42, "uurtarief": "nonsense", "btw_pct": "21,5",
            "ruimtes": [{"naam": "X", "lengte": "abc", "openingen": [{"muur": "koninkrijk"}]}],
            "regels": [{"pakket_id": "bestaat-niet", "oppervlak": "noord"}],
        })
        self.assertEqual(project.uurtarief, 45.0)
        self.assertAlmostEqual(project.btw_pct, 21.5)
        self.assertAlmostEqual(project.ruimtes[0].lengte, 4.0)
        self.assertEqual(project.ruimtes[0].openingen[0].muur, "noord")
        # Onbekend werkpakket wordt overgeslagen, niet gecrasht.
        offerte = bereken_offerte(project.naar_dict())
        self.assertEqual(offerte["regels"], [])


if __name__ == "__main__":
    unittest.main()
