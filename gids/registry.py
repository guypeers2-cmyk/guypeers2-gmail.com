# -*- coding: utf-8 -*-
"""
DE UNIVERSELE GIDS — MULTI-AGENT REGISTER
=========================================
Bronregister zoals aangeleverd door de Opperwachter (de Baas).
Dit bestand is de SINGLE SOURCE OF TRUTH voor alle 18 agenten.

AGENTS_REGISTRY  = het register van de Baas (onaangeroerd, 1-op-1 overgenomen)
AGENT_UITBREIDING = uitvoeringslaag: signalen, gewichten, heuristieken en
                    presentatie-metadata waarmee de Hoofdrouter (gids/router.py)
                    exact één sprekende agent per invoer kiest.

Governance (onveranderlijk):
  * Per invoer spreekt exact ÉÉN agent; alle overige zwijgen strikt.
  * Agent 1 (Supervisor), 3 (Router) en 16 (Kwaliteit) spreken nooit in de
    chat: zij bewaken op de achtergrond. Vandaar `spreekt: False`.
"""

import re

# ============================================================
# HET REGISTER VAN DE BAAS (verbatim)
# ============================================================
AGENTS_REGISTRY = {
    "agent_1_supervisor": {
        "name": "De Hoofdsupervisor & Eindinspecteur",
        "role": "Centrale kwaliteitswachter achter de schermen.",
        "silent_by_default": True,
        "trigger": "internal_quality_check"
    },
    "agent_2_opstart": {
        "name": "De Opstartdeskundige & Marktonderzoeker",
        "role": "Marktanalyse, app-trends en GTM-strategie.",
        "silent_by_default": True,
        "trigger": ["idee", "markt", "app", "starten", "verkenning"]
    },
    "agent_3_router": {
        "name": "De Hoofdrouter & State-Orchestrator",
        "role": "Analyseert input en kiest exact één actieve agent.",
        "silent_by_default": False,
        "trigger": "always_first"
    },
    "agent_4_data": {
        "name": "De Dataspecialist",
        "role": "RAG, databases en feitelijke data-opvraging.",
        "silent_by_default": True,
        "trigger": ["data", "prijs", "voorraad", "feit", "database"]
    },
    "agent_5_timmy": {
        "name": "Agent Timmy",
        "role": "Snelle actie, ongeduld en jonge doelgroep.",
        "silent_by_default": True,
        "trigger": ["help", "waar", "nu", "snel", "!"]
    },
    "agent_6_marit": {
        "name": "Agent Marit",
        "role": "Efficiëntie, shortcuts en multitasking.",
        "silent_by_default": True,
        "trigger": ["kort", "snelste", "shortcut", "tijd"]
    },
    "agent_7_opa": {
        "name": "Agent Opa Foutje-Bedankt",
        "role": "Geruststelling en faalangstreductie.",
        "silent_by_default": True,
        "trigger": ["durf niet", "stukmaken", "geld", "fout", "angst"]
    },
    "agent_8_jargon": {
        "name": "De Jargon-Buster",
        "role": "Vertaalt technische fouten naar mensentaal.",
        "silent_by_default": True,
        "trigger": ["error", "api", "code", "systeemmelding"]
    },
    "agent_9_typo": {
        "name": "De Typo-Fixer",
        "role": "Herstelt spelfouten en milde miskliks.",
        "silent_by_default": True,
        "trigger": "input_typo_detected"
    },
    "agent_10_navigatie": {
        "name": "De Navigatie-Expert",
        "role": "Wegwijzer voor elementen en menus.",
        "silent_by_default": True,
        "trigger": ["waar vind ik", "menu", "knop", "pagina"]
    },
    "agent_11_toegankelijkheid": {
        "name": "Toegankelijkheids-Specialist",
        "role": "Leesbaarheid, contrast en visueel gemak.",
        "silent_by_default": True,
        "trigger": ["klein", "lezen", "contrast", "blind", "slecht zicht"]
    },
    "agent_12_proactief": {
        "name": "Proactieve Conversatie-Ontwerper",
        "role": "Biedt de volgende logische stap aan.",
        "silent_by_default": True,
        "trigger": "step_completed"
    },
    "agent_13_privacy": {
        "name": "Privacy- & Compliance-Agent",
        "role": "Schermt gevoelige persoonsgegevens af.",
        "silent_by_default": True,
        "trigger": ["wachtwoord", "bsn", "creditcard", "prive"]
    },
    "agent_14_systeem_guard": {
        "name": "Systeem-Guard",
        "role": "Vangt time-outs en serverfouten op.",
        "silent_by_default": True,
        "trigger": "system_failure"
    },
    "agent_15_hitl": {
        "name": "Human-in-the-Loop Escalatie",
        "role": "Escaleert naar echte medewerker bij frustratie.",
        "silent_by_default": True,
        "trigger": "extreme_frustration"
    },
    "agent_16_kwaliteit": {
        "name": "Kwaliteits- & Feedback-Agent",
        "role": "Continu leren en achtergrond-logging.",
        "silent_by_default": True,
        "trigger": "session_end"
    },
    "agent_17_financieel": {
        "name": "Financieel Specialist",
        "role": "Kosten, prijzen, abonnementsmodellen en marges.",
        "silent_by_default": True,
        "trigger": ["kosten", "prijs", "abonnement", "betalen", "marge"]
    },
    "agent_18_marketing": {
        "name": "Marketing Specialist",
        "role": "Waardepropositie, conversie en boodschap.",
        "silent_by_default": True,
        "trigger": ["marketing", "doelgroep", "conversie", "propositie"]
    },
}

# ============================================================
# UITVOERINGSLAAG — per agent: wie spreekt, welke signalen tellen
# ============================================================
# signaal: (regex, gewicht, leesbaar label) — hoofdletterongevoelig.
# heuristiek: naam van extra contextregel in gids/router.py.
# spreekt: False = permanente achtergrondwachter (zwijgt altijd in de chat).


def _jargon_signalen():
    """De Jargon-Buster krijgt zijn signalen automatisch uit het woordenboek."""
    from gids.analyse import JARGONWOORDENBOEK
    return [
        (re.escape(term), 2, f'term "{term}"')
        for term in sorted(JARGONWOORDENBOEK, key=len, reverse=True)
    ]


AGENT_UITBREIDING = {
    "agent_1_supervisor": {
        "spreekt": False,
        "categorie": "bestuur",
        "emoji": "🛡️",
        "monitoring": "Eindinspectie vóór elke levering aan de Baas.",
        "signalen": [],
    },
    "agent_2_opstart": {
        "spreekt": True,
        "categorie": "business",
        "emoji": "🚀",
        "signalen": [
            (r"\b(app|appje|applicatie)\b", 3, '"app"'),
            (r"\b(idee|concept)\b", 2, '"idee"'),
            (r"\bmarkt(onderzoek)?\b", 3, '"markt"'),
            (r"\bconcurrent\w*\b", 2, '"concurrent"'),
            (r"\b(trend\w*|trending)\b", 2, '"trend"'),
            (r"\bgtm\b|\bgo.?to.?market\b", 4, "go-to-market"),
            (r"\b(lancer\w+|launch\w*)\b", 3, '"lanceren"'),
            (r"\b(startup|scale-?up)\b", 3, '"startup"'),
            (r"\bvalideer\w*\b", 3, '"valideren"'),
            (r"\bprospect\w*\b", 2, '"prospectie"'),
            (r"\b(blauwdruk|blueprint)\b", 2, '"blauwdruk"'),
            (r"\b(onontgonnen|kansen?)\b", 2, '"kans"'),
        ],
    },
    "agent_3_router": {
        "spreekt": False,
        "categorie": "bestuur",
        "emoji": "🧭",
        "monitoring": "Rangschikt elke invoer en trekt zich daarna terug.",
        "signalen": [],
    },
    "agent_4_data": {
        "spreekt": True,
        "categorie": "business",
        "emoji": "🗂️",
        "signalen": [
            (r"\bdata\b", 3, '"data"'),
            (r"\bdatabases?\b", 3, '"database"'),
            (r"\b(ophalen|opzoeken|opvragen)\b", 3, "data-ophalen"),
            (r"\bvoorraad\w*\b", 3, '"voorraad"'),
            (r"\bstatistie\w+\b", 3, '"statistiek"'),
            (r"\bfeit\w*\b", 2, '"feit"'),
            (r"\brapport\w*\b", 2, '"rapport"'),
            (r"\bdocument\w*\b", 2, '"document"'),
            (r"\bvectorstore\b|\brag\b", 4, "RAG/vectorstore"),
            (r"\bprijzen\b", 1, '"prijzen ophalen"'),
        ],
    },
    "agent_5_timmy": {
        "spreekt": True,
        "categorie": "frontlijn",
        "emoji": "⚡",
        "heuristiek": "korte_uitroep",
        "signalen": [
            (r"\bhelp\b", 3, '"help"'),
            (r"\bnu\b", 2, '"nu"'),
            (r"^(hoi|hallo|hey|yo|goeiemorgen|goeiemiddag|goedenavond)\b", 3, "groet"),
        ],
    },
    "agent_6_marit": {
        "spreekt": True,
        "categorie": "frontlijn",
        "emoji": "⏱️",
        "signalen": [
            (r"\b(geen tijd|tijdgebrek|haast)\b", 4, "tijdgebrek"),
            (r"\b(te )?langzaam\b|\btraag\b", 3, '"traag"'),
            (r"\bkortste (weg|route)\b|\bsnelste (weg|route)\b|\bshortcut\b", 4, "kortste weg"),
            (r"\beven snel\b|\btussendoor\b|\bdruk\b", 3, '"druk"'),
            (r"\bmultitask\w*\b", 4, '"multitasken"'),
        ],
    },
    "agent_7_opa": {
        "spreekt": True,
        "categorie": "frontlijn",
        "emoji": "🧡",
        "signalen": [
            (r"\bbang\b|\bangst\w*\b|\bbezorgd\b", 4, "angstsignaal"),
            (r"\bdurf niet\b|\bof ik durf\b|\bdurf ik\b", 5, '"durf niet"'),
            (r"\bstuk\w*\b|\bkapot\b", 3, '"stukmaken"'),
            (r"\bfout\b", 2, '"fout"'),
            (r"\bgeruststell\w*\b", 3, "geruststelling gevraagd"),
            (r"\bkwijt\b", 2, '"kwijt"'),
            (r"\bveilig\b", 4, '"veilig?"'),
            (r"\bkost (dit|dat) geld\b", 7, '"kost dit geld?" (kostenangst)'),
        ],
    },
    "agent_8_jargon": {
        "spreekt": True,
        "categorie": "frontlijn",
        "emoji": "🔧",
        "heuristiek": "jargon_vraag",
        "signalen": [],  # wordt automatisch gevuld uit JARGONWOORDENBOEK
    },
    "agent_9_typo": {
        "spreekt": True,
        "categorie": "frontlijn",
        "emoji": "⌨️",
        "signalen": [],  # uitsluitend heuristisch (input_typo_detected)
    },
    "agent_10_navigatie": {
        "spreekt": True,
        "categorie": "frontlijn",
        "emoji": "🗺️",
        "heuristiek": "vraag_zin",
        "signalen": [
            (r"\bwaar vind ik\b", 5, '"waar vind ik"'),
            (r"\bhoe kom ik\b", 5, '"hoe kom ik"'),
            (r"\bwaar staat\b", 4, '"waar staat"'),
            (r"\bwaar is\b", 2, '"waar is"'),
            (r"\bmenu\b", 3, '"menu"'),
            (r"\bknop\b", 3, '"knop"'),
            (r"\binstelling\w*\b", 2, '"instellingen"'),
            (r"\btab(blad)?\b", 2, '"tab"'),
            (r"\bdashboard\b", 2, '"dashboard"'),
            (r"\bprofiel\b", 2, '"profiel"'),
            (r"\bpagina\b", 1, '"pagina"'),
        ],
    },
    "agent_11_toegankelijkheid": {
        "spreekt": True,
        "categorie": "frontlijn",
        "emoji": "👁️",
        "signalen": [
            (r"\bcontrast\b", 5, '"contrast"'),
            (r"\bkleine(n)? (letter\w*|tekst)\b", 5, '"kleine letters"'),
            (r"\bgrote(re)? letter\w*\b|\bletter\w* groter\b", 5, '"grotere letters"'),
            (r"\bleesbaar\w*\b|\blees ik slecht\b|\bslecht lees\w*\b", 4, "leesprobleem"),
            (r"\btoegankelijk\w*\b", 4, '"toegankelijkheid"'),
            (r"\bschermlezer\b", 5, '"schermlezer"'),
            (r"\bkleurenblind\w*\b|\bblind\b", 5, "visuele beperking"),
            (r"\b(donker|dark|lichte|light) ?modus\b", 4, "weergavemodus"),
            (r"\bzoom\w*\b", 3, '"zoomen"'),
            (r"\blettertype\b|\blettergrootte\b", 5, "lettergrootte"),
            (r"\bslecht zicht\b|\bzienderzwak\w*\b", 5, '"slecht zicht"'),
        ],
    },
    "agent_12_proactief": {
        "spreekt": True,
        "categorie": "frontlijn",
        "emoji": "✅",
        "signalen": [
            (r"\b(wat nu|volgende stap|en dan)\b", 4, '"volgende stap"'),
            (r"\b(gelukt|klaar|afgerond|afgehandeld)\b", 4, "stap voltooid"),
            (r"\b(dank|dankjewel|dank u|bedankt)\b", 3, "dankwoord"),
            (r"\b(top|perfect|geweldig)\b", 2, "positieve afsluiting"),
        ],
    },
    "agent_13_privacy": {
        "spreekt": True,
        "categorie": "veiligheid",
        "emoji": "⚠️",
        "harde_trigger": True,  # zie gids/privacy.py — grijpt altijd direct in
        "signalen": [],
    },
    "agent_14_systeem_guard": {
        "spreekt": True,
        "categorie": "veiligheid",
        "emoji": "🛡️",
        "is_fallback": True,
        "signalen": [
            (r"time-?out", 4, '"time-out"'),
            (r"\bwerkt niet\b", 4, '"werkt niet"'),
            (r"\b(crash\w*|vastgelopen|bevroren|freez\w*)\b", 4, "systeemfout"),
            (r"\bfoutmelding\b", 3, '"foutmelding"'),
            (r"\blaadt niet\b", 4, '"laadt niet"'),
            (r"\bstoring\b", 4, '"storing"'),
            (r"\bopnieuw\b|\brefresh\b|\bherlaad\w*\b", 2, '"opnieuw proberen"'),
            (r"\b500\b", 3, "foutcode 500"),
        ],
    },
    "agent_15_hitl": {
        "spreekt": True,
        "categorie": "veiligheid",
        "emoji": "🤝",
        "heuristiek": "herhaalde_frustratie",
        "signalen": [
            (r"\b(belachelijk|onacceptabel|zinloos|ergernis\w*|frustrer\w*|kut|klote)\b", 4, "frustratie"),
            (r"\bgeef het op\b", 6, '"ik geef het op"'),
            (r"\bmenselijke medewerker\b|\becht iemand\b|\been echte mens\b", 6, "mens gevraagd"),
            (r"\b(bellen|telefoon\w*)\b.*\b(iemand|mens)\b", 4, "bellen gevraagd"),
        ],
    },
    "agent_16_kwaliteit": {
        "spreekt": False,
        "categorie": "veiligheid",
        "emoji": "📈",
        "monitoring": "Logt elke routing-afloop voor continue optimalisatie.",
        "signalen": [],
    },
    "agent_17_financieel": {
        "spreekt": True,
        "categorie": "business",
        "emoji": "💶",
        "signalen": [
            (r"\b(kosten|kost)\b", 4, '"kosten"'),
            (r"\bprijs\w*\b", 4, '"prijs"'),
            (r"\babonnement\w*\b", 4, '"abonnement"'),
            (r"\bbtw\b", 4, '"btw"'),
            (r"\bfactuur\w*\b", 4, '"factuur"'),
            (r"\bmarge\b", 4, '"marge"'),
            (r"\bkorting\w*\b", 3, '"korting"'),
            (r"\bgratis\b", 3, '"gratis"'),
            (r"\bbetaal\w*\b|\bbetaling\w*\b", 3, '"betalen"'),
            (r"\btransactie\w*\b", 3, '"transactie"'),
            (r"\buitbetaal\w*\b", 3, '"uitbetaling"'),
            (r"\bduur\b", 2, '"duur"'),
            (r"\bgeld\b", 2, '"geld"'),
        ],
    },
    "agent_18_marketing": {
        "spreekt": True,
        "categorie": "business",
        "emoji": "🎯",
        "signalen": [
            (r"\bmarketing\b", 5, '"marketing"'),
            (r"\b(waardepropositie|propositie)\b", 5, '"waardepropositie"'),
            (r"\bdoelgroep\w*\b", 4, '"doelgroep"'),
            (r"\bconversie\w*\b", 5, '"conversie"'),
            (r"\bboodschap\b", 3, '"boodschap"'),
            (r"\bmerk\b", 3, '"merk"'),
            (r"\bpositionering\b", 5, '"positionering"'),
            (r"\badvertentie\w*\b", 3, '"advertentie"'),
            (r"\bseo\b", 3, '"SEO"'),
            (r"\blandingspagina\b", 4, '"landingspagina"'),
        ],
    },
}

# Jargon-signalen injecteren (na import van het woordenboek)
AGENT_UITBREIDING["agent_8_jargon"]["signalen"] = _jargon_signalen()


def agent_metadata(agent_id: str) -> dict:
    """Registreergegevens + uitbreiding van één agent samengevoegd."""
    basis = AGENTS_REGISTRY[agent_id]
    extra = AGENT_UITBREIDING.get(agent_id, {})
    info = dict(basis)
    info.update(extra)
    info["id"] = agent_id
    info["nummer"] = int(agent_id.split("_")[1])
    return info


def alle_agenten() -> list:
    """Volledige gecombineerde registerlijst, gesorteerd op nummer."""
    return [agent_metadata(aid) for aid in AGENTS_REGISTRY]


def sprekende_agenten() -> list:
    """Alleen de agenten die in de chat mogen antwoorden (15 van de 18)."""
    return [a for a in alle_agenten() if a.get("spreekt")]
