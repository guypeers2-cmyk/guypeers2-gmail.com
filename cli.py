#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""De Universele Gids — interactieve console in de terminal.

Gebruik:
    python3 cli.py            # interactieve sessie met de Router
    python3 cli.py --demo     # script met alle knelpuntscenario's achter elkaar
"""

import sys

from gids import AGENTS_REGISTRY, GespreksState, sprekende_agenten, verwerk

CYAAN, GROEN, GEEL, MAGENTA, DIM, RESET = (
    "\033[96m", "\033[92m", "\033[93m", "\033[95m", "\033[2m", "\033[0m",
)

DEMOSCENARIO = [
    "HELP!! WAAR IS DAT??",
    "Ik durf niet te klikken, ga ik iets stukmaken?",
    "Wat betekent error 429 eigenlijk?",
    "Wat kost een abonnement per maand?",
    "Ik heb geen tijd, wat is de kortste weg om dit af te handelen?",
    "Waar vind ik de knop voor de instellingen?",
    "Kun je de letters groter maken? Kleine tekst lees ik slecht.",
    "Ik wil een app lanceren, is er een markt voor?",
    "wat is onze waardepropositie voor de doelgroep?",
    "Kun je de actuele voorraad en prijzen voor mij opzoeken?",
    "instelingen",
    "Mijn BSN is 123456789, kunnen jullie dat gebruiken?",
    "Dit is belachelijk, ik geef het op, ik wil een menselijke medewerker spreken.",
    "ja",
    "nee, maak het korter",
]


def toon(resultaat, invoer=""):
    kop = f"{resultaat.agent_emoji} {resultaat.agent_naam}"
    print()
    print(f"{CYAAN}{kop}{RESET}")
    print(f"{DIM}Router: {resultaat.reden}{RESET}")
    print("─" * 62)
    if resultaat.scores:
        for agent_id, score, labels in resultaat.scores[:4]:
            naam = AGENTS_REGISTRY[agent_id]["name"]
            print(f"{DIM}  · {naam}: {score} ({', '.join(labels)}){RESET}")
        print(f"{DIM}  → precies één agent spreekt · {resultaat.stil_aantal} zwijgen strikt{RESET}")
        print("─" * 62)
    print(resultaat.bericht)


def demo():
    state = GespreksState()
    print(f"{MAGENTA}═══ DE UNIVERSELE GIDS — DEMOSCENARIO ═══{RESET}")
    for invoer in DEMOSCENARIO:
        print(f"\n{GEEL}BAAS ▸ {invoer}{RESET}")
        toon(verwerk(invoer, state))
    print(f"\n{MAGENTA}═══ EINDE DEMO — 18 agenten geladen, protocol gehandhaafd ═══{RESET}")


def interactief():
    state = GespreksState()
    print(f"{MAGENTA}🏛️  DE UNIVERSELE GIDS — AUTONOOM MULTI-AGENT ECOSYSTEEM{RESET}")
    print(f"18 agenten geladen · {len(sprekende_agenten())} sprekend · 3 toezichthouders op de achtergrond")
    print(f"Typ je bericht ('stop' om te beëindigen). Elke levering sluit af met het Ja/Nee-protocol.\n")
    while True:
        try:
            invoer = input(f"{GEEL}BAAS ▸ {RESET}").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nSessie beëindigd. De Kwaliteitsagent logt de afloop achter de schermen.")
            break
        if not invoer:
            continue
        if invoer.lower() in {"stop", "exit", "quit"}:
            print("Sessie beëindigd. De Kwaliteitsagent logt de afloop achter de schermen.")
            break
        toon(verwerk(invoer, state))


if __name__ == "__main__":
    if "--demo" in sys.argv:
        demo()
    else:
        interactief()
