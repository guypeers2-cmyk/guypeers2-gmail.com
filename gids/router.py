# -*- coding: utf-8 -*-
"""De Hoofdrouter & State-Orchestrator (Agent 3).

Verwerking per binnenkomende invoer — vaste volgorde, geen uitzonderingen:

  1. PRIVACY-SCAN (harde trigger)     → gevoelige gegevens? Agent 13 grijpt direct in.
  2. GOEDKEURINGSSTATUS (Ja/Nee)      → 'ja' bevestigt (Agent 12), 'nee...' herstart revisie.
  3. SIGNAALSCORING (15 agenten)      → gewogen regex-signalen + contextheuristieken.
  4. TYPO-DETECTIE                    → laag signaal + tikfout? Agent 9 herstelt.
  5. UITVAL (fallback)                → geen signaal? Agent 14 vangt op, nooit een kale fout.
  6. LEVERING                         → exact ÉÉN agent spreekt; alle 17 anderen zwijgen.
                                        Elke output sluit af met het Ja/Nee-protocol.

De router zelf zwijgt in de chat: hij kiest en trekt zich terug (governance-regel).
"""

import re
from dataclasses import dataclass, field

from gids.analyse import (
    caps_verhouding, is_jargon_vraag, onderwerp_uit, vind_jargon_term, woorden,
)
from gids.privacy import scan_gevoelig
from gids.registry import agent_metadata, sprekende_agenten
from gids.state import GespreksState
from gids.templates import STEMMEN, revisie

GOEDKEURING_SLUITING = "\n\nIs dit goed? (Ja / Nee of feedback)"

_PUUR_JA = re.compile(r"^\s*(ja|jazeker|yes|akkoord|prima|top|ok|oke|oké|goed gekeurd)\s*[.!]?\s*$", re.IGNORECASE)
_NEE_PREFIX = re.compile(r"^\s*(nee|neej|no|niet goed|anders)\b", re.IGNORECASE)
_HERSTEL_TOEGANKELIJKHEID = re.compile(r"\b(terug naar normaal|oude stijl|normale stijl|uit zetten|uitzetten|terug)\b", re.IGNORECASE)


@dataclass
class Resultaat:
    """Eén complete routeringscyclus: wie spreekt, wat zegt hij, en waarom."""
    agent_id: str
    agent_naam: str
    bericht: str
    reden: str                       # menselijke uitleg van de routeringskeuze
    scores: list = field(default_factory=list)   # [(agent_id, score, [labels])] — alleen score > 0
    maskers: list = field(default_factory=list)  # afgeschermde gegevenstypes
    actief_aantal: int = 1           # protocolgarantie: altijd exact 1
    stil_aantal: int = 17            # alle overige agenten zwijgen

    @property
    def agent_emoji(self) -> str:
        return agent_metadata(self.agent_id).get("emoji", "🏛️")

    def naar_dict(self) -> dict:
        return {
            "agent_id": self.agent_id,
            "agent_naam": self.agent_naam,
            "agent_emoji": self.agent_emoji,
            "bericht": self.bericht,
            "reden": self.reden,
            "scores": self.scores,
            "maskers": self.maskers,
            "actief_aantal": self.actief_aantal,
            "stil_aantal": self.stil_aantal,
        }


# ---------------------------------------------------------------
# Heuristieken (contextregels bovenop de gewogen signalen)
# ---------------------------------------------------------------

def _heur_korte_uitroep(tekst: str, _) -> int:
    """Timmy: korte, luide uitroepen ('HELP!!', 'WAAR IS DAT')."""
    w = woorden(tekst)
    if len(w) <= 4:
        bonus = 0
        if caps_verhouding(tekst) > 0.5:
            bonus += 5
        if "!!" in tekst:
            bonus += 3
        return bonus
    return 0


def _heur_vraag_zin(tekst: str, _) -> int:
    """Navigatie: 'waar/hoe'-vragen in een volledige zin."""
    if re.search(r"\b(waar|hoe)\b", tekst, re.IGNORECASE) and len(woorden(tekst)) >= 5:
        return 2
    return 0


def _heur_jargon_vraag(tekst: str, _) -> int:
    """Jargon-Buster: actief om uitleg van een technische term vragen."""
    if vind_jargon_term(tekst) and is_jargon_vraag(tekst):
        return 4
    return 0


def _heur_herhaalde_frustratie(tekst: str, labels) -> int:
    """HITL: meerdere frustratiesignalen tegelijk = escaleren."""
    if len(labels) >= 2:
        return 3
    return 0


HEURISTIEKEN = {
    "korte_uitroep": _heur_korte_uitroep,
    "vraag_zin": _heur_vraag_zin,
    "jargon_vraag": _heur_jargon_vraag,
    "herhaalde_frustratie": _heur_herhaalde_frustratie,
}


# ---------------------------------------------------------------
# Signaalscoring
# ---------------------------------------------------------------

def _score_agent(agent: dict, tekst: str) -> tuple:
    """Geeft (totale score, [gebruikte labels]) terug voor één agent."""
    labels, totaal = [], 0
    for patroon, gewicht, label in agent.get("signalen", []):
        if re.search(patroon, tekst, re.IGNORECASE):
            totaal += gewicht
            labels.append(label)
    heuristiek = HEURISTIEKEN.get(agent.get("heuristiek"))
    if heuristiek:
        bonus = heuristiek(tekst, labels)
        if bonus:
            totaal += bonus
            labels.append(f"contextheuristiek +{bonus}")
    return totaal, labels


def _score_alle(tekst: str) -> list:
    """Scoret alle 15 sprekende agenten; gesorteerd van hoog naar laag."""
    resultaten = []
    for agent in sprekende_agenten():
        totaal, labels = _score_agent(agent, tekst)
        if totaal > 0:
            resultaten.append((agent["id"], totaal, labels))
    resultaten.sort(key=lambda r: r[1], reverse=True)
    return resultaten


# ---------------------------------------------------------------
# De hoofdroute
# ---------------------------------------------------------------

def _lever(agent_id: str, ctx: dict, reden: str, scores=None, maskers=None, state=None, tekst: str = "") -> Resultaat:
    """Laat exact één agent spreken en sluit af met het Ja/Nee-protocol."""
    meta = agent_metadata(agent_id)
    stem = STEMMEN[agent_id]
    bericht = stem(ctx) + GOEDKEURING_SLUITING
    if state is not None:
        state.noteer(tekst, agent_id)
    return Resultaat(
        agent_id=agent_id,
        agent_naam=meta["name"],
        bericht=bericht,
        reden=reden,
        scores=scores or [],
        maskers=maskers or [],
    )


def verwerk(tekst: str, state: GespreksState = None) -> Resultaat:
    """Verwerkt één invoer volgens het vaste routeringsprotocol."""
    tekst = str(tekst or "").strip()
    state = state if state is not None else GespreksState()

    # --- 1. Privacy-scan: harde trigger gaat altijd vóór alles ---
    scan = scan_gevoelig(tekst)
    if scan["hits"]:
        return _lever(
            "agent_13_privacy",
            {"hits": scan["hits"], "gemaskeerd": scan["gemaskeerd"], "onderwerp": "privacy"},
            "Harde trigger: gevoelige gegevens gedetecteerd — de Privacy-agent grijpt direct in.",
            scores=[("agent_13_privacy", 99, ["harde trigger"])],
            maskers=scan["hits"], state=state, tekst=tekst,
        )

    ctx = {
        "tekst": tekst,
        "onderwerp": onderwerp_uit(tekst),
    }

    # --- 2. Goedkeuringsstatus: het Ja/Nee-protocol van de Baas ---
    if _PUUR_JA.match(tekst):
        ctx["mode"] = "bevestiging" if state.in_afwachting_goedkeuring else "spontaan"
        return _lever(
            "agent_12_proactief", ctx,
            "Goedkeuring ontvangen → Proactieve Conversatie-Ontwerper legt de volgende stap klaar.",
            state=state, tekst=tekst,
        )
    if _NEE_PREFIX.match(tekst) and state.laatste_agent and state.laatste_agent in STEMMEN:
        herzien_agent = state.laatste_agent
        ctx.update({"mode": "revisie", "feedback": tekst})
        # De stem van de herziene specialist + revisie-aankondiging in één bericht.
        meta = agent_metadata(herzien_agent)
        originele_stem = STEMMEN[herzien_agent]
        bericht = revisie(ctx) + "\n\n" + originele_stem(ctx) + GOEDKEURING_SLUITING
        state.noteer(tekst, herzien_agent)
        return Resultaat(
            agent_id=herzien_agent,
            agent_naam=meta["name"],
            bericht=bericht,
            reden=f"Feedback op het vorige voorstel → {meta['name']} herziet naar versie twee.",
        )

    # --- 3. Signaalscoring over alle sprekende agenten ---
    scores = _score_alle(tekst)

    # --- 4. Typo-detectie bij laag domeinsignaal ---
    from gids.typo import typo_suggestie
    if (not scores or scores[0][1] < 3):
        suggestie = typo_suggestie(tekst)
        if suggestie:
            ctx.update({"origineel": suggestie[0], "suggestie": suggestie[1]})
            return _lever(
                "agent_9_typo", ctx,
                f"Laag domeinsignaal + tikfoutpatroon → Typo-Fixer stelt '{suggestie[1]}' voor.",
                scores=scores, state=state, tekst=tekst,
            )

    # --- 5. Uitval: geen enkel signaal → Systeem-Guard vangt op ---
    if not scores:
        ctx["mode"] = "fallback"
        return _lever(
            "agent_14_systeem_guard", ctx,
            "Geen domeinsignaal gedetecteerd → Systeem-Guard vangt op (gebruiker ziet nooit een kale foutmelding).",
            scores=scores, state=state, tekst=tekst,
        )

    # --- 6. Levering: de hoogst scorende specialist spreekt ---
    winnaar, topscore, labels = scores[0]
    jargon_gevonden = vind_jargon_term(tekst)
    if jargon_gevonden:
        ctx.update({"term": jargon_gevonden[0], "uitleg": jargon_gevonden[1]})
    if winnaar == "agent_11_toegankelijkheid" and _HERSTEL_TOEGANKELIJKHEID.search(tekst):
        ctx["mode"] = "herstel"
    if winnaar == "agent_14_systeem_guard":
        ctx["mode"] = "fout"
    if winnaar == "agent_15_hitl":
        import random
        ctx["ticket"] = str(random.randint(1000, 9999))
    return _lever(
        winnaar, ctx,
        f"Hoogste signaalscore ({topscore}): {', '.join(labels)} — alle overige agenten zwijgen strikt.",
        scores=scores, state=state, tekst=tekst,
    )


def execute_protocol(user_input: str, state: GespreksState = None) -> str:
    """Compatibiliteitsingang zoals aangeleverd door de Baas.

    Geeft de volledige chat-output terug: [Naam specialist] + bericht,
    altijd afgesloten met de verplichte Ja/Nee-goedkeuringsvraag.
    """
    state = state if state is not None else GespreksState()
    resultaat = verwerk(user_input, state)
    return f"[{resultaat.agent_naam}] {resultaat.bericht}"
