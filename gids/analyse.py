# -*- coding: utf-8 -*-
"""Tekstanalyse voor De Universele Gids: onderwerp-extractie en jargon-detectie."""

import re

STOPWOORDEN = {
    "de", "het", "een", "ik", "je", "jij", "u", "wij", "we", "jullie", "mijn", "jouw",
    "is", "zijn", "was", "word", "wordt", "hebben", "heb", "heeft", "kan", "kun", "kunnen",
    "wat", "waar", "hoe", "waarom", "wie", "welke", "wanneer", "dat", "die", "deze",
    "voor", "van", "met", "op", "in", "aan", "bij", "om", "te", "en", "of", "maar",
    "niet", "geen", "wel", "dat", "dit", "er", "nog", "even", "alsjeblieft", "graag",
    "vind", "vindt", "kom", "kome", "doen", "doe", "maak", "maakt", "willen", "wil",
    "zou", "kun", "eigenlijk", "alleen", "ook", "heel", "erg", "welke", "wat",
}

# Jargon-Buster woordenboek: technisch woord -> warme mensentaal.
JARGONWOORDENBOEK = {
    "error": "een foutmelding — het systeem zegt: 'hier ging iets mis, maar het is meestal op te lossen'",
    "foutcode": "een getal dat vertelt wélke fout het was — een soort kenteken van het probleem",
    "404": "de pagina die je zocht bestaat (niet meer) op dit adres — jij bent niet verdwaald, de pagina is het",
    "429": "je hebt iets te vaak achter elkaar gevraagd — even een minuutje wachten en opnieuw proberen",
    "500": "de server heeft zelf een hap lucht nodig — niet jouw fout, gewoon later opnieuw proberen",
    "ssl": "het slotje op de deur — het zorgt dat je verbinding afgeschermd reist",
    "cache": "het geheugen van je browser, zodat pagina's de volgende keer sneller laden",
    "cookie": "een klein briefje waarmee een website dingen over je onthoudt, zoals je login",
    "bug": "een tic in de software — geen insect, gewoon een klein programmeerfoutje",
    "stack trace": "het kruimelspoor dat een fout achterlaat — zo vinden techneuten de oorzaak terug",
    "kpi": "een meetlat waarop een bedrijf afleest of het goed gaat",
    "synergie": "bedrijfspraat voor 1+1=3 — samen meer bereiken dan apart",
    "oauth": "binnenkomen met het sleuteltje van een andere dienst, zoals Google of Apple",
    "sso": "één sleutel voor alle deuren — één keer inloggen en overal binnen",
    "webhook": "een deurbel waarmee het ene systeem het andere belt als er iets gebeurt",
    "endpoint": "een specifiek adres waar je een verzoek heen stuurt",
    "json": "een notitieblokje-vorm waarin programma's gegevens netjes bijhouden",
    "api": "het bestellingssysteem waarmee programma's met elkaar praten",
    "sql": "de vraagtaal waarmee je een database om informatie vraagt",
    "uptime": "hoeveel procent van de tijd het systeem wakker en beschikbaar is",
    "rate limit": "de maximumsnelheid die een server toelaat — erboven krijg je een 429",
    "time-out": "een zandloper die leeg is: het systeem duurde te lang en geeft het wachten op",
    "systeemmelding": "een briefje van het systeem zelf — meestal minder eng dan het klinkt",
}

_JARGON_PATROON = re.compile(
    r"\b(" + "|".join(re.escape(t) for t in sorted(JARGONWOORDENBOEK, key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)

_JARGON_CONTEXT = re.compile(
    r"\b(wat betekent|wat is|wat zijn|leg uit|leg uit|uitleg\w*|vertaal\w*|jargon|mensentaal|snap niet|begrijp niet)\b",
    re.IGNORECASE,
)


def woorden(tekst: str) -> list:
    return re.findall(r"[\w'-]+", tekst or "")


def vind_jargon_term(tekst: str):
    """Geeft (term, uitleg) terug voor de eerste jargonterm in de tekst, anders None."""
    match = _JARGON_PATROON.search(tekst or "")
    if not match:
        return None
    term = match.group(1).lower()
    return term, JARGONWOORDENBOEK[term]


def is_jargon_vraag(tekst: str) -> bool:
    """Vraagt de gebruiker actief om uitleg van een technische term?"""
    return bool(_JARGON_CONTEXT.search(tekst or ""))


def caps_verhouding(tekst: str) -> float:
    letters = [c for c in (tekst or "") if c.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for c in letters if c.isupper()) / len(letters)


def onderwerp_uit(tekst: str) -> str:
    """Haalt het meest betekenisvolle woord uit de tekst als onderwerp-label."""
    kandidaten = [w for w in woorden(tekst) if w.lower() not in STOPWOORDEN and len(w) >= 3]
    if not kandidaten:
        return "je vraag"
    return max(kandidaten, key=len)
