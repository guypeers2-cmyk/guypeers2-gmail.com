# -*- coding: utf-8 -*-
"""Testbatterij voor De Universele Gids.

Bewijst de kernwetten:
  1. Zwijg-protocol: per invoer spreekt exact ÉÉN specialist (nooit 1, 3 of 16).
  2. Elke output eindigt met de Ja/Nee-goedkeuringsvraag.
  3. Routing naar het juiste domein voor alle knelpuntscenario's.

Draai met:  python3 -m unittest discover -s tests -v
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gids import AGENTS_REGISTRY, GespreksState, execute_protocol, verwerk  # noqa: E402

ACHTERGROND = {"agent_1_supervisor", "agent_3_router", "agent_16_kwaliteit"}


def route(tekst, state=None):
    state = state or GespreksState()
    return verwerk(tekst, state), state


class TestZwijgProtocol(unittest.TestCase):
    """Kernwet: exact één agent voert het woord, de rest zwijgt."""

    GEVALLEN = [
        "Ik durf niet te klikken, ga ik iets stukmaken?",
        "Wat kost een abonnement per maand?",
        "Wat betekent error 429 eigenlijk?",
        "HELP!! WAAR IS DAT??",
        "Waar vind ik de knop voor de instellingen?",
        "Ik heb geen tijd, wat is de kortste weg om dit af te handelen?",
        "Ik wil een app lanceren, is er een markt voor?",
        "Kun je de letters groter maken? Kleine tekst lees ik slecht.",
        "Dit is belachelijk, ik geef het op, ik wil een menselijke medewerker spreken.",
        "wat is onze waardepropositie voor de doelgroep?",
        "hallo",
        "vertel eens iets over de geschiedenis van de fiets",
    ]

    def test_exact_een_agent_spreekt(self):
        for tekst in self.GEVALLEN:
            with self.subTest(tekst=tekst):
                resultaat, _ = route(tekst)
                self.assertEqual(resultaat.actief_aantal, 1)
                self.assertEqual(resultaat.stil_aantal, 17)

    def test_achtergrondagenten_zwijgen_altijd(self):
        for tekst in self.GEVALLEN:
            with self.subTest(tekst=tekst):
                resultaat, _ = route(tekst)
                self.assertNotIn(resultaat.agent_id, ACHTERGROND)

    def test_elke_output_sluit_af_met_ja_nee(self):
        for tekst in self.GEVALLEN:
            with self.subTest(tekst=tekst):
                resultaat, _ = route(tekst)
                self.assertTrue(
                    resultaat.bericht.endswith("Is dit goed? (Ja / Nee of feedback)"),
                    f"Ja/Nee-sluiting ontbreekt bij {resultaat.agent_id}",
                )

    def test_elke_agent_id_bestaat_in_register(self):
        resultaat, _ = route("help")
        self.assertIn(resultaat.agent_id, AGENTS_REGISTRY)


class TestRouting(unittest.TestCase):
    """Elk knelpuntscenario routeert naar de juiste specialist."""

    def controleer(self, tekst, verwacht_id):
        resultaat, _ = route(tekst)
        self.assertEqual(resultaat.agent_id, verwacht_id, msg=f"({resultaat.reden})")

    def test_opa_faalangst(self):
        self.controleer("Ik durf niet te klikken, ga ik iets stukmaken?", "agent_7_opa")

    def test_opa_kost_dit_geld(self):
        self.controleer("Kost dit geld? Ik weet niet of ik durf.", "agent_7_opa")

    def test_financieel_abonnement(self):
        self.controleer("Wat kost een abonnement per maand?", "agent_17_financieel")

    def test_jargon_error_429(self):
        self.controleer("Wat betekent error 429 eigenlijk?", "agent_8_jargon")

    def test_timmy_korte_uitroep(self):
        self.controleer("HELP!! WAAR IS DAT??", "agent_5_timmy")

    def test_timmy_groet(self):
        self.controleer("hallo", "agent_5_timmy")

    def test_navigatie_instellingen(self):
        self.controleer("Waar vind ik de knop voor de instellingen?", "agent_10_navigatie")

    def test_marit_tijdgebrek(self):
        self.controleer("Ik heb geen tijd, wat is de kortste weg om dit af te handelen?", "agent_6_marit")

    def test_privacy_bsn(self):
        resultaat, _ = route("Mijn BSN is 123456789, kunnen jullie dat gebruiken?")
        self.assertEqual(resultaat.agent_id, "agent_13_privacy")
        self.assertTrue(any("burgerservicenummer" in m for m in resultaat.maskers))

    def test_privacy_iban(self):
        resultaat, _ = route("Mijn rekeningnummer is NL91 ABNA 0417 1643 00")
        self.assertEqual(resultaat.agent_id, "agent_13_privacy")
        self.assertNotIn("NL91", resultaat.bericht)

    def test_opstart_marktvraag(self):
        self.controleer("Ik wil een app lanceren, is er een markt voor?", "agent_2_opstart")

    def test_toegankelijkheid_grote_letters(self):
        self.controleer("Kun je de letters groter maken? Kleine tekst lees ik slecht.", "agent_11_toegankelijkheid")

    def test_hitl_frustratie(self):
        self.controleer(
            "Dit is belachelijk, ik geef het op, ik wil een menselijke medewerker spreken.",
            "agent_15_hitl",
        )

    def test_marketing_propositie(self):
        self.controleer("wat is onze waardepropositie voor de doelgroep?", "agent_18_marketing")

    def test_data_voorraad_opzoeken(self):
        self.controleer("Kun je de actuele voorraad en prijzen voor mij opzoeken?", "agent_4_data")

    def test_systeem_guard_storing(self):
        self.controleer("de pagina laadt niet en ik krijg een time-out", "agent_14_systeem_guard")

    def test_typo_instellingen(self):
        resultaat, _ = route("instelingen")
        self.assertEqual(resultaat.agent_id, "agent_9_typo")
        self.assertIn("instellingen", resultaat.bericht)

    def test_fallback_zonder_signaal(self):
        self.controleer("vertel eens iets over de geschiedenis van de fiets", "agent_14_systeem_guard")


class TestJaNeeProtocol(unittest.TestCase):
    """Het autonome leverings- en goedkeuringsprotocol van de Baas."""

    def test_ja_na_levering_activeert_proactieve_agent(self):
        state = GespreksState()
        eerste, state = route("Ik wil een app lanceren, is er een markt voor?", state)
        self.assertEqual(eerste.agent_id, "agent_2_opstart")
        self.assertTrue(state.in_afwachting_goedkeuring)

        tweede, state = route("ja", state)
        self.assertEqual(tweede.agent_id, "agent_12_proactief")
        self.assertIn("vastgelegd", tweede.bericht.lower())

    def test_nee_start_revisie_bijzelfde_specialist(self):
        state = GespreksState()
        route("Ik wil een app lanceren, is er een markt voor?", state)
        revisie_resultaat, state = route("nee, maak het korter en doe er een sectie prijzen bij", state)
        self.assertEqual(revisie_resultaat.agent_id, "agent_2_opstart")
        self.assertIn("maak het korter", revisie_resultaat.bericht)
        self.assertIn("versie twee", revisie_resultaat.bericht.lower())

    def test_nee_bij_conversatieagent_herhaalt_stem_niet(self):
        """Gespreksagenten (zoals Navigatie) dubbelen hun oude antwoord niet."""
        state = GespreksState()
        route("Waar vind ik de knop voor de instellingen?", state)
        resultaat, _ = route("nee, te veel stappen", state)
        self.assertEqual(resultaat.agent_id, "agent_10_navigatie")
        self.assertIn("te veel stappen", resultaat.bericht)
        self.assertNotIn("Menu linksboven", resultaat.bericht)  # geen stem-dubbeling
        self.assertTrue(resultaat.bericht.endswith("Is dit goed? (Ja / Nee of feedback)"))

    def test_privacy_gaat_voor_goedkeuring(self):
        state = GespreksState()
        route("wat kost een abonnement", state)
        resultaat, _ = route("nee mijn wachtwoord is geheim123", state)
        self.assertEqual(resultaat.agent_id, "agent_13_privacy")

    def test_nieuwe_vraag_verstoort_goedkeuring_niet(self):
        """Na een openstaand voorstel routeert een nieuwe domeinvraag gewoon normaal."""
        state = GespreksState()
        route("wat kost een abonnement", state)
        resultaat, _ = route("Waar vind ik de knop voor de instellingen?", state)
        self.assertEqual(resultaat.agent_id, "agent_10_navigatie")

    def test_execute_protocol_compatibiliteit(self):
        output = execute_protocol("Ik wil een app lanceren, is er een markt voor?")
        self.assertTrue(output.startswith("[De Opstartdeskundige"))
        self.assertTrue(output.endswith("Is dit goed? (Ja / Nee of feedback)"))


class TestRegister(unittest.TestCase):
    """Het register van de Baas is compleet en consistent."""

    def test_18_agenten(self):
        self.assertEqual(len(AGENTS_REGISTRY), 18)

    def test_sprekende_agenten(self):
        from gids import sprekende_agenten
        self.assertEqual(len(sprekende_agenten()), 15)

    def test_alle_ids_gebruikelijk_formaat(self):
        for agent_id in AGENTS_REGISTRY:
            with self.subTest(agent_id=agent_id):
                self.assertRegex(agent_id, r"^agent_\d{1,2}_[a-z_]+$")


if __name__ == "__main__":
    unittest.main(verbosity=2)
