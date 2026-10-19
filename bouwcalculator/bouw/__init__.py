# -*- coding: utf-8 -*-
"""Bouwprijscalculator — rekenkern (Python-stdlib, geen dependencies).

Publieke ingang:
    from bouw import bereken_offerte, Project, PAKKETTEN
"""

from .model import Opening, Project, Ruimte, Werkregel, ZIJDE_NAMEN
from .tarieven import PAKKETTEN, PAKKET_OP_ID, TARIEVEN, Tarieven
from .bereken import bereken_regel, referentie_tarieven, ruimte_oppervlakken
from .offerte import bereken_offerte

__version__ = "1.0.0"
__all__ = [
    "Project", "Ruimte", "Opening", "Werkregel", "ZIJDE_NAMEN",
    "TARIEVEN", "PAKKETTEN", "PAKKET_OP_ID", "Tarieven",
    "bereken_offerte", "bereken_regel", "ruimte_oppervlakken", "referentie_tarieven",
]
