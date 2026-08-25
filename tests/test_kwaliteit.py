# -*- coding: utf-8 -*-
"""Testbatterij voor de Kwaliteits- & Feedback-Agent (Agent 16).

Bewijst:
  1. Elke routing-afloop wordt exact eenmaal gelogd en correct geaggregeerd.
  2. Gevoelige gegevens komen NOOIT in de leerlog terecht (maskering vóór opslag).
  3. Het zwijg-protocol wordt in de log geverifieerd (actief is altijd 1).
  4. Een beschadigd logbestand breekt de gids niet.

Draai met:  python3 -m unittest discover -s tests -v
"""

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gids import GespreksState, verwerk  # noqa: E402
from gids.kwaliteit import KwaliteitsAgent  # noqa: E402


class TestKwaliteitsAgent(unittest.TestCase):

    def setUp(self):
        self.tijdelijk = tempfile.TemporaryDirectory()
        self.agent = KwaliteitsAgent(Path(self.tijdelijk.name) / "log.json")

    def tearDown(self):
        self.tijdelijk.cleanup()

    def _noteer(self, teksten, sessie="sessie-1"):
        state = GespreksState()
        for tekst in teksten:
            resultaat = verwerk(tekst, state)
            self.agent.noteer(tekst, resultaat, sessie)

    def test_elke_afloop_precies_eenmaal_gelogd(self):
        self._noteer(["wat kost een abonnement", "HELP!! WAAR IS DAT??", "wat kost een factuur"])
        stats = self.agent.statistieken()
        self.assertEqual(stats["totaal"], 3)
        per_agent = dict(stats["per_agent"])
        self.assertEqual(per_agent["agent_17_financieel"], 2)
        self.assertEqual(per_agent["agent_5_timmy"], 1)

    def test_zwijg_protocol_in_log_geverifieerd(self):
        self._noteer(["Ik durf niet te klikken, ga ik iets stukmaken?", "hallo", "instelingen"])
        stats = self.agent.statistieken()
        self.assertEqual(stats["protocol_schendingen"], 0)
        with open(self.agent.logbestand, encoding="utf-8") as bestand:
            invoeren = bestand.read()
        self.assertIn('"actief": 1', invoeren)
        self.assertIn('"stil": 17', invoeren)

    def test_privacy_nooit_in_de_leerlog(self):
        self._noteer(["Mijn BSN is 123456789, gebruiken jullie dat?"])
        inhoud = self.agent.logbestand.read_text(encoding="utf-8")
        self.assertNotIn("123456789", inhoud)
        self.assertNotIn("1234567", inhoud)
        self.assertIn("•", inhoud)  # wel gemaskeerd aanwezig

    def test_wachtwoord_nooit_in_de_leerlog(self):
        self._noteer(["mijn wachtwoord is supergeheim99"])
        inhoud = self.agent.logbestand.read_text(encoding="utf-8")
        self.assertNotIn("supergeheim99", inhoud)

    def test_wissen_start_op_nieuw(self):
        self._noteer(["hallo"])
        self.agent.wissen()
        self.assertEqual(self.agent.statistieken()["totaal"], 0)

    def test_beschadigd_logbestand_breekt_de_gids_niet(self):
        self.agent.logbestand.write_text("{kapot json", encoding="utf-8")
        verse_agent = KwaliteitsAgent(self.agent.logbestand)
        self.assertEqual(verse_agent.statistieken()["totaal"], 0)

    def test_statistieken_overleven_herstart(self):
        self._noteer(["wat kost een abonnement", "hallo"])
        herstarte_agent = KwaliteitsAgent(self.agent.logbestand)
        self.assertEqual(herstarte_agent.statistieken()["totaal"], 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
