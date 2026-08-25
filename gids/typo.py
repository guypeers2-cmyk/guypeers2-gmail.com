# -*- coding: utf-8 -*-
"""Typo-Fixer (Agent 9) — herstelt korte tikfouten met een Levenshtein-suggestie."""

import re

_LEXICON = [
    "instellingen", "abonnement", "factuur", "wachtwoord", "dashboard", "profiel",
    "betalen", "betaling", "knoppen", "menu", "gegevens", "overzicht", "annuleren",
    "verzenden", "opslaan", "downloaden", "uploaden", "account", "wachtlijst",
    "voorraad", "rapport", "document", "korting", "prijs", "kosten", "facturen",
    "help", "bedankt", "account", "gebruiker", "notificaties", "meldingen",
]

_ALLEEN_LETTERS = re.compile(r"^[a-zA-Z]{4,14}$")


def _levenshtein(a: str, b: str) -> int:
    """Klassieke afstandsberekening tussen twee woorden."""
    if len(a) < len(b):
        a, b = b, a
    vorige = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        huidige = [i]
        for j, cb in enumerate(b, start=1):
            huidige.append(min(
                vorige[j] + 1,                  # verwijderen
                huidige[j - 1] + 1,             # toevoegen
                vorige[j - 1] + (ca != cb),     # vervangen
            ))
        vorige = huidige
    return vorige[-1]


def typo_suggestie(tekst: str):
    """Detecteert een korte tikfout en geeft de beste suggestie terug.

    Alleen actief bij: één woord, 4-14 letters, géén exacte lexicontreffer,
    en een bewerkingsafstand van maximaal 2 t.o.v. een bekend woord.
    Geeft (origineel, suggestie) terug, anders None.
    """
    woord = (tekst or "").strip()
    if not _ALLEEN_LETTERS.match(woord):
        return None
    if woord.lower() in _LEXICON:
        return None
    beste, afstand = None, None
    for kandidaat in _LEXICON:
        d = _levenshtein(woord.lower(), kandidaat)
        if afstand is None or d < afstand:
            beste, afstand = kandidaat, d
    if afstand is not None and afstand <= 2:
        return woord, beste
    return None
