# -*- coding: utf-8 -*-
"""Datamodellen van de bouwprijscalculator.

De hele app is één JSON-structuur: ``Project``. De Python-kern en de browser
delen exact hetzelfde formaat, zodat er niets dubbel bijgehouden wordt.

    Project
      ├── ruimtes[]   Ruimte  (maten + openingen)
      ├── regels[]    Werkregel (werkpakket op een oppervlak)
      └── tarieven{}  prijsboek-overrides (sleutel → prijs)
"""

import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from uuid import uuid4

MUURZIJDEN = ("noord", "zuid", "oost", "west")
PLAFOND = "plafond"
VLOER = "vloer"

ZIJDE_NAMEN = {
    "noord": "Wand noord",
    "zuid": "Wand zuid",
    "oost": "Wand oost",
    "west": "Wand west",
    "plafond": "Plafond",
    "vloer": "Vloer",
}


def nieuw_id() -> str:
    return uuid4().hex[:8]


def _getal(waarde: Any, standaard: float = 0.0) -> float:
    """Robuuste getal-conversie (komt uit de browser, dus niet te vertrouwen)."""
    try:
        return float(str(waarde).replace(",", "."))
    except (TypeError, ValueError):
        return standaard


def _tekst(waarde: Any, standaard: str = "") -> str:
    if waarde is None:
        return standaard
    return str(waarde)


@dataclass
class Opening:
    """Een deur of raum in een muur."""
    naam: str = "Deur"
    muur: str = "noord"          # noord | zuid | oost | west
    breedte: float = 0.90        # m
    hoogte: float = 2.10         # m
    aantal: int = 1
    positie: Optional[float] = None  # afstand vanaf begin wand (m); None = automatisch
    borstwering: float = 0.0         # onderkant opening boven vloer (m)

    def oppervlakte(self) -> float:
        return self.breedte * self.hoogte * max(1, self.aantal)

    @staticmethod
    def van_dict(d: Dict[str, Any]) -> "Opening":
        d = d or {}
        muur = _tekst(d.get("muur"), "noord").lower()
        if muur not in MUURZIJDEN:
            muur = "noord"
        return Opening(
            naam=_tekst(d.get("naam"), "Deur") or "Deur",
            muur=muur,
            breedte=_getal(d.get("breedte"), 0.9),
            hoogte=_getal(d.get("hoogte"), 2.1),
            aantal=int(_getal(d.get("aantal"), 1)) or 1,
            positie=None if d.get("positie") in (None, "") else max(0, _getal(d["positie"])),
            borstwering=max(0, _getal(d.get("borstwering"))),
        )

    def naar_dict(self) -> Dict[str, Any]:
        return {
            "naam": self.naam, "muur": self.muur, "breedte": self.breedte,
            "hoogte": self.hoogte, "aantal": self.aantal,
            "positie": self.positie, "borstwering": self.borstwering,
        }


@dataclass
class Ruimte:
    """Een rechthoekige ruimte met eventuele openingen."""
    id: str = field(default_factory=nieuw_id)
    naam: str = "Ruimte"
    lengte: float = 4.0          # m
    breedte: float = 3.0         # m
    hoogte: float = 2.50         # m
    openingen: List[Opening] = field(default_factory=list)

    @staticmethod
    def van_dict(d: Dict[str, Any]) -> "Ruimte":
        d = d or {}
        return Ruimte(
            id=_tekst(d.get("id")) or nieuw_id(),
            naam=_tekst(d.get("naam"), "Ruimte") or "Ruimte",
            lengte=_getal(d.get("lengte"), 4.0),
            breedte=_getal(d.get("breedte"), 3.0),
            hoogte=_getal(d.get("hoogte"), 2.5),
            openingen=[Opening.van_dict(o) for o in (d.get("openingen") or [])],
        )

    def naar_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id, "naam": self.naam, "lengte": self.lengte,
            "breedte": self.breedte, "hoogte": self.hoogte,
            "openingen": [o.naar_dict() for o in self.openingen],
        }


@dataclass
class Werkregel:
    """Eén werkpakket op één oppervlak van een ruimte."""
    id: str = field(default_factory=nieuw_id)
    ruimte_id: str = ""
    oppervlak: str = "noord"      # noord | zuid | oost | west | plafond | vloer
    pakket_id: str = "gyproc_wand_profiel"
    opties: Dict[str, str] = field(default_factory=dict)
    hoeveelheid: Optional[float] = None   # m², stuks of meters; None = oppervlak bij m², anders 0
    notitie: str = ""
    visualisatie: Dict[str, float] = field(default_factory=dict)

    @staticmethod
    def van_dict(d: Dict[str, Any]) -> "Werkregel":
        d = d or {}
        hoeveelheid = d.get("hoeveelheid")
        try:
            hoeveelheid = None if hoeveelheid in (None, "") else float(str(hoeveelheid).replace(",", "."))
        except (TypeError, ValueError):
            hoeveelheid = None
        return Werkregel(
            id=_tekst(d.get("id")) or nieuw_id(),
            ruimte_id=_tekst(d.get("ruimte_id")),
            oppervlak=_tekst(d.get("oppervlak"), "noord"),
            pakket_id=_tekst(d.get("pakket_id"), "gyproc_wand_profiel"),
            opties={str(k): str(v) for k, v in (d.get("opties") or {}).items()},
            hoeveelheid=hoeveelheid,
            notitie=_tekst(d.get("notitie")),
            visualisatie={k: max(0.0, _getal(v)) for k, v in
                          (d.get("visualisatie") if isinstance(d.get("visualisatie"), dict) else {}).items()
                          if k in ("x", "y", "z", "x2", "y2", "z2") and v not in (None, "")
                          and math.isfinite(_getal(v, float("nan")))},
        )

    def naar_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id, "ruimte_id": self.ruimte_id, "oppervlak": self.oppervlak,
            "pakket_id": self.pakket_id, "opties": dict(self.opties),
            "hoeveelheid": self.hoeveelheid, "notitie": self.notitie,
            "visualisatie": dict(self.visualisatie),
        }


@dataclass
class Project:
    """De offerte zoals de klant hem te zien krijgt (plus de werkvoorbereiding)."""
    naam: str = "Nieuwe offerte"
    klant: str = ""
    adres: str = ""
    datum: str = ""
    offerte_nummer: str = ""
    ruimtes: List[Ruimte] = field(default_factory=list)
    regels: List[Werkregel] = field(default_factory=list)
    uurtarief: float = 45.00
    marge_pct: float = 15.0       # marge op materiaal
    korting_pct: float = 0.0
    btw_pct: float = 21.0
    prijsmodus: str = "detail"    # detail | m2
    tarieven: Dict[str, float] = field(default_factory=dict)
    aannemer: str = ""
    opmerking: str = ""

    # -- serialisatie -------------------------------------------------------
    @staticmethod
    def van_dict(d: Dict[str, Any]) -> "Project":
        d = d or {}
        project = Project(
            naam=_tekst(d.get("naam"), "Nieuwe offerte") or "Nieuwe offerte",
            klant=_tekst(d.get("klant")),
            adres=_tekst(d.get("adres")),
            datum=_tekst(d.get("datum")),
            offerte_nummer=_tekst(d.get("offerte_nummer")),
            ruimtes=[Ruimte.van_dict(r) for r in (d.get("ruimtes") or [])],
            regels=[Werkregel.van_dict(r) for r in (d.get("regels") or [])],
            uurtarief=_getal(d.get("uurtarief"), 45.0),
            marge_pct=_getal(d.get("marge_pct"), 15.0),
            korting_pct=_getal(d.get("korting_pct"), 0.0),
            btw_pct=_getal(d.get("btw_pct"), 21.0),
            prijsmodus="m2" if _tekst(d.get("prijsmodus")) == "m2" else "detail",
            tarieven={str(k): _getal(v) for k, v in (d.get("tarieven") or {}).items()},
            aannemer=_tekst(d.get("aannemer")),
            opmerking=_tekst(d.get("opmerking")),
        )
        # Regels zonder ruimte krijgen de eerste ruimte (of blijven zonder).
        if project.ruimtes and not any(r.ruimte_id for r in project.regels):
            for regel in project.regels:
                regel.ruimte_id = project.ruimtes[0].id
        return project

    def naar_dict(self) -> Dict[str, Any]:
        return {
            "naam": self.naam, "klant": self.klant, "adres": self.adres,
            "datum": self.datum, "offerte_nummer": self.offerte_nummer,
            "ruimtes": [r.naar_dict() for r in self.ruimtes],
            "regels": [r.naar_dict() for r in self.regels],
            "uurtarief": self.uurtarief, "marge_pct": self.marge_pct,
            "korting_pct": self.korting_pct, "btw_pct": self.btw_pct,
            "prijsmodus": self.prijsmodus, "tarieven": dict(self.tarieven),
            "aannemer": self.aannemer, "opmerking": self.opmerking,
        }

    # -- hulp ---------------------------------------------------------------
    def ruimte(self, ruimte_id: str) -> Optional[Ruimte]:
        return next((r for r in self.ruimtes if r.id == ruimte_id), None)
