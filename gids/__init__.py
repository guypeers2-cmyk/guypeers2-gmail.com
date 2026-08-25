# -*- coding: utf-8 -*-
"""De Universele Gids — autonoom multi-agent ecosysteem (18 agenten).

Publieke ingang:
    from gids import verwerk, GespreksState, execute_protocol
"""

from gids.registry import AGENTS_REGISTRY, AGENT_UITBREIDING, alle_agenten, sprekende_agenten
from gids.router import Resultaat, verwerk, execute_protocol, GOEDKEURING_SLUITING
from gids.state import GespreksState
from gids.kwaliteit import KwaliteitsAgent

__version__ = "1.1.0"
__all__ = [
    "AGENTS_REGISTRY", "AGENT_UITBREIDING", "alle_agenten", "sprekende_agenten",
    "verwerk", "execute_protocol", "GespreksState", "Resultaat", "GOEDKEURING_SLUITING",
    "KwaliteitsAgent",
]
