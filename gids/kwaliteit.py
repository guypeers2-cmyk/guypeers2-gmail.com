# -*- coding: utf-8 -*-
"""De Kwaliteits- & Feedback-Agent (Agent 16) — continu leren, op de achtergrond.

Elke routeringsbeslissing wordt privacyveilig gelogd (de invoer wordt eerst
gemaskeerd — Agent 13's regel geldt ook voor de leerlaag) en geaggregeerd
tot statistiek. Dat is de basis voor de continue optimalisatie van de
signaalgewichten: het ecosysteem meet zijn eigen effectiviteit.
"""

import json
import threading
import time
from pathlib import Path

from gids.privacy import mask

DATAMAP = Path(__file__).resolve().parent.parent / "data"
LOGBESTAND = DATAMAP / "kwaliteitslog.json"


class KwaliteitsAgent:
    """Achtergrondwachter: logt en aggregeert elke routing-afloop."""

    def __init__(self, logbestand: Path = None):
        self.logbestand = Path(logbestand) if logbestand else LOGBESTAND
        self.logbestand.parent.mkdir(parents=True, exist_ok=True)
        self._slot = threading.Lock()
        self._beslissingen = self._laad()

    # ---------------- laden & bewaren ----------------

    def _laad(self) -> list:
        if self.logbestand.exists():
            try:
                return json.loads(self.logbestand.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                # Een beschadigd logbestand mag de gids nooit om zeep helpen.
                return []
        return []

    def _bewaar(self) -> None:
        self.logbestand.write_text(
            json.dumps(self._beslissingen, ensure_ascii=False, indent=1),
            encoding="utf-8",
        )

    # ---------------- registratie ----------------

    def noteer(self, tekst: str, resultaat, sessie_id: str = "anoniem") -> None:
        """Registreert één routing-afloop — invoer eerst gemaskeerd, nooit rauw."""
        invoer = {
            "tijdstip": time.strftime("%Y-%m-%d %H:%M:%S"),
            "sessie": str(sessie_id)[:64],
            "invoer": mask(tekst)[:200],
            "agent": resultaat.agent_id,
            "reden": resultaat.reden,
            "maskers": resultaat.maskers,
            "actief": resultaat.actief_aantal,   # protocolgarantie: altijd 1
            "stil": resultaat.stil_aantal,
        }
        with self._slot:
            self._beslissingen.append(invoer)
            self._bewaar()

    # ---------------- statistiek ----------------

    def statistieken(self) -> dict:
        """Aggregeert de log tot inzicht voor de Supervisor en de Baas."""
        with self._slot:
            beslissingen = list(self._beslissingen)

        per_agent = {}
        for b in beslissingen:
            per_agent[b["agent"]] = per_agent.get(b["agent"], 0) + 1

        return {
            "totaal": len(beslissingen),
            "per_agent": sorted(per_agent.items(), key=lambda x: x[1], reverse=True),
            "protocol_schendingen": sum(1 for b in beslissingen if b.get("actief") != 1),
            "laatste": list(reversed(beslissingen[-10:])),
        }

    def wissen(self) -> None:
        """Wist de leerlog (bijvoorbeeld voor een verse start van de gids)."""
        with self._slot:
            self._beslissingen = []
            self._bewaar()
