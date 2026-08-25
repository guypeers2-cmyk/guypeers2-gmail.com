# -*- coding: utf-8 -*-
"""State-Orchestratie voor De Universele Gids.

De GespreksState bewaakt het JA/NEE-protocol: na elke autonome levering
wacht de gids op goedkeuring van de Opperwachter (de Baas).
De state is serialiseerbaar zodat de webconsole hem per sessie kan bewaren.
"""

from dataclasses import dataclass, field


@dataclass
class GespreksState:
    laatste_agent: str = None          # id van de laatst sprekende specialist
    in_afwachting_goedkeuring: bool = False
    tellers: dict = field(default_factory=dict)      # agent_id -> aantal reacties
    geschiedenis: list = field(default_factory=list)  # [{"tekst", "agent"}]
    beslissingen: int = 0              # aantal routeringsbeslissingen

    def noteer(self, tekst: str, agent_id: str) -> None:
        """Registreert een afgeronde cyclus: agent sprak, wacht op Ja/Nee."""
        self.laatste_agent = agent_id
        self.in_afwachting_goedkeuring = True
        self.tellers[agent_id] = self.tellers.get(agent_id, 0) + 1
        self.geschiedenis.append({"tekst": tekst, "agent": agent_id})
        self.beslissingen += 1

    def naar_dict(self) -> dict:
        return {
            "laatste_agent": self.laatste_agent,
            "in_afwachting_goedkeuring": self.in_afwachting_goedkeuring,
            "tellers": self.tellers,
            "geschiedenis": self.geschiedenis,
            "beslissingen": self.beslissingen,
        }

    @classmethod
    def van_dict(cls, data: dict) -> "GespreksState":
        data = data or {}
        return cls(
            laatste_agent=data.get("laatste_agent"),
            in_afwachting_goedkeuring=bool(data.get("in_afwachting_goedkeuring", False)),
            tellers=dict(data.get("tellers") or {}),
            geschiedenis=list(data.get("geschiedenis") or []),
            beslissingen=int(data.get("beslissingen", 0)),
        )
