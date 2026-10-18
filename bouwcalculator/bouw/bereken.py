# -*- coding: utf-8 -*-
"""Rekenkern van de bouwprijscalculator.

Alles wat een offerte bevat wordt hier berekend: de oppervlakken van een
ruimte, de materiaalnames (een "take-off"), de gewerkte uren en de prijs.

De kern is bewust dom gehouden: geen database, geen externe diensten, geen
afhankelijkheden. Elke berekening is een pure functie van de invoer, zodat
de resultaten te testen en na te rekenen zijn.

De normen hieronder (spoorafstand, verspilling, ...) staan er bewust
bovenaan: een vakman kan ze in één oogopslag aanpassen.
"""

import math
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Tuple

from .model import MUURZIJDEN, PLAFOND, VLOER, ZIJDE_NAMEN, Project, Ruimte, Werkregel
from .tarieven import PAKKET_OP_ID, Tarieven

# ---------------------------------------------------------------------------
# Normen uit de praktijk
# ---------------------------------------------------------------------------
SPOORAFSTAND = 0.40        # m tussen de C-profielen
HANGERAFSTAND = 0.80       # m tussen de veerhangers (plafond)
PLAAT_VERSPILLING = 0.10   # 10% verspilling op gipsplaten
PROFIEL_VERSPILLING = 0.05 # 5% op profielen
SCHROEVEN_PER_M2 = 20      # schroeven per m² gipsplaat
TAPE_M_PER_M2 = 1.4        # meter voegband per m²
COMPOUND_KG_PER_M2 = 0.5   # kg voegmiddel per m²
LIJM_KG_PER_M2 = 0.4       # kg gipslijm per m²
PROFIEL_LENGTE = 3.0       # m per stuk profiel (C75, C100, U, vlakke band)

PLAAT_KEYS = {
    "12,5 mm": "plaat_gyproc_12_5",
    "15 mm": "plaat_gyproc_15",
    "GGL 30 mm": "plaat_ggl_30",
}
ISOLATIE_KEYS = {
    "mineralen wol 75 mm": "isolatie_wol",
    "PIR 60 mm": "isolatie_pir",
}


# ---------------------------------------------------------------------------
# Oppervlakken van een ruimte
# ---------------------------------------------------------------------------

def ruimte_oppervlakken(ruimte: Ruimte) -> List[Dict[str, Any]]:
    """Bruto, opening en netto oppervlak per vlak van de ruimte."""
    if ruimte.contour or ruimte.dak:
        from .vorm import surfaces
        return surfaces(ruimte)
    lengte, breedte, hoogte = ruimte.lengte, ruimte.breedte, ruimte.hoogte

    per_muur: Dict[str, Dict[str, float]] = {
        z: {"opening": 0.0, "aantal": 0.0} for z in MUURZIJDEN
    }
    for opening in ruimte.openingen:
        if opening.muur in per_muur:
            per_muur[opening.muur]["opening"] += opening.oppervlakte()
            per_muur[opening.muur]["aantal"] += max(1, opening.aantal)

    vlakken: List[Dict[str, Any]] = []

    def muur(sleutel: str, muurlengte: float) -> None:
        bruto = muurlengte * hoogte
        opening = per_muur[sleutel]["opening"]
        vlakken.append({
            "sleutel": sleutel,
            "naam": ZIJDE_NAMEN[sleutel],
            "soort": "muur",
            "bruto": bruto,
            "opening": opening,
            "netto": max(0.0, bruto - opening),
            "lengte": muurlengte,
            "hoogte": hoogte,
            "openingen": int(per_muur[sleutel]["aantal"]),
        })

    muur("noord", lengte)
    muur("zuid", lengte)
    muur("oost", breedte)
    muur("west", breedte)

    vlakken.append({
        "sleutel": PLAFOND, "naam": ZIJDE_NAMEN[PLAFOND], "soort": "plafond",
        "bruto": lengte * breedte, "opening": 0.0, "netto": lengte * breedte,
        "lengte": lengte, "breedte": breedte, "hoogte": hoogte, "openingen": 0,
    })
    vlakken.append({
        "sleutel": VLOER, "naam": ZIJDE_NAMEN[VLOER], "soort": "vloer",
        "bruto": lengte * breedte, "opening": 0.0, "netto": lengte * breedte,
        "lengte": lengte, "breedte": breedte, "hoogte": hoogte, "openingen": 0,
    })
    return vlakken


def vind_vlak(vlakken: List[Dict[str, Any]], sleutel: str) -> Optional[Dict[str, Any]]:
    return next((v for v in vlakken if v["sleutel"] == sleutel), None)


# ---------------------------------------------------------------------------
# Materiaal- en taakregels
# ---------------------------------------------------------------------------

@dataclass
class Ctx:
    """Context waarmee een werkpakket zijn werk doet."""
    oppervlak: Dict[str, Any]
    opties: Dict[str, str]
    tarieven: Tarieven
    aantal: float                       # m² die berekend wordt
    uurtarief: float = 45.0


def money(waarde: float, decimalen: int = 2) -> float:
    """Afronden op de cent (half weg van nul) — identiek aan de JS-port."""
    factor = 10 ** decimalen
    return math.copysign(math.floor(abs(waarde) * factor + 0.5) / factor, waarde)


def _materiaal(omschrijving: str, aantal: float, sleutel: str, tarieven: Tarieven,
               eenheid: Optional[str] = None, decimaal: int = 2) -> Dict[str, Any]:
    aantal = money(float(aantal), decimaal)
    eenheidsprijs = tarieven.prijs(sleutel)
    return {
        "omschrijving": omschrijving,
        "aantal": aantal,
        "eenheid": eenheid or tarieven.eenheid(sleutel),
        "prijs_sleutel": sleutel,
        "eenheidsprijs": eenheidsprijs,
        "totaal": money(aantal * eenheidsprijs),
        "soort": "materiaal",
    }


def _taak(sleutel: str, hoeveelheid: float, tarieven: Tarieven,
          uurtarief: float) -> Dict[str, Any]:
    uren_per_m2 = tarieven.prijs(sleutel)
    uren = money(uren_per_m2 * hoeveelheid)
    return {
        "omschrijving": tarieven.naam(sleutel),
        "uren_per_m2": uren_per_m2,
        "uren": money(uren),
        "tarief": uurtarief,
        "totaal": money(uren * uurtarief),
        "soort": "taak",
    }


def _platen(ctx: Ctx, m2: float, plaat_key: str) -> Dict[str, Any]:
    plaat_opp = ctx.tarieven.per_eenheid(plaat_key) or 3.12
    stuks = math.ceil(m2 / plaat_opp - 1e-9) if m2 > 0 else 0
    naam = ctx.tarieven.naam(plaat_key)
    return _materiaal(f"{naam} · {m2:.1f} m²", stuks, plaat_key, ctx.tarieven, decimaal=0)


def _afwerking(ctx: Ctx, m2_plaat: float) -> List[Dict[str, Any]]:
    """Bevestiging en voegafwerking, afhankelijk van het plaatoppervlak."""
    return [
        _materiaal("Schroeven (20/m²)", math.ceil(m2_plaat * SCHROEVEN_PER_M2 / 1000),
                   "schroef", ctx.tarieven, decimaal=0),
        _materiaal(f"Voegband ({TAPE_M_PER_M2} m/m²)",
                   math.ceil(m2_plaat * TAPE_M_PER_M2 / 50), "tape", ctx.tarieven, decimaal=0),
        _materiaal(f"Voegmiddel ({COMPOUND_KG_PER_M2} kg/m²)",
                   math.ceil(m2_plaat * COMPOUND_KG_PER_M2 / 25), "compound", ctx.tarieven, decimaal=0),
    ]


# ---------------------------------------------------------------------------
# Berekening per werkpakket
# ---------------------------------------------------------------------------

def _gyproc_wand_profiel(ctx: Ctx) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    vlak = ctx.oppervlak
    opp = ctx.aantal
    opt = ctx.opties
    tar = ctx.tarieven
    if opp <= 0:
        return [], []

    zijden = 2 if opt.get("zijden") == "2 zijden" else 1
    plaat_key = PLAAT_KEYS.get(opt.get("plaat", "12,5 mm"), "plaat_gyproc_12_5")
    profiel_key = "profiel_c100" if opt.get("profiel") == "C100" else "profiel_c75"
    isolatie_key = ISOLATIE_KEYS.get(opt.get("isolatie", "geen"))

    muurlengte = float(vlak.get("lengte") or 0.0)
    muurhoogte = float(vlak.get("hoogte") or 0.0)
    aantal_openingen = int(vlak.get("openingen") or 0)

    materiaal: List[Dict[str, Any]] = []
    taken: List[Dict[str, Any]] = []

    m2_plaat = opp * zijden * (1 + PLAAT_VERSPILLING)
    materiaal.append(_platen(ctx, m2_plaat, plaat_key))

    if muurlengte > 0 and muurhoogte > 0:
        # Verticale stuks: spoorafstand + 1 per wand + 2 per opening.
        n_stuks = math.ceil(muurlengte / SPOORAFSTAND) + 1 + 2 * aantal_openingen
        profiel_m = n_stuks * muurhoogte * (1 + PROFIEL_VERSPILLING)
        materiaal.append(_materiaal(
            f"C-profiel {opt.get('profiel', 'C75')} · {n_stuks} stuks",
            math.ceil(profiel_m / PROFIEL_LENGTE - 1e-9), profiel_key, tar, decimaal=0))
        materiaal.append(_materiaal(
            "U-profiel (vloer)", math.ceil(muurlengte / PROFIEL_LENGTE - 1e-9),
            "profiel_u25", tar, decimaal=0))
        materiaal.append(_materiaal(
            "Vlakke band (plafond)", math.ceil(muurlengte / PROFIEL_LENGTE - 1e-9),
            "profiel_vlakband", tar, decimaal=0))

    if isolatie_key:
        materiaal.append(_materiaal(
            f"Isolatie · {opt.get('isolatie')}",
            opp * (1 + PROFIEL_VERSPILLING), isolatie_key, tar, eenheid="m2", decimaal=1))

    materiaal.extend(_afwerking(ctx, m2_plaat))

    taken.append(_taak("uur_wand_opmeten", opp, tar, ctx.uurtarief))
    taken.append(_taak("uur_wand_profielen", opp, tar, ctx.uurtarief))
    if isolatie_key:
        taken.append(_taak("uur_wand_isolatie", opp, tar, ctx.uurtarief))
    taken.append(_taak("uur_wand_platen", opp * zijden, tar, ctx.uurtarief))
    taken.append(_taak("uur_wand_voegen", opp * zijden, tar, ctx.uurtarief))
    return materiaal, taken


def _gyproc_plafond(ctx: Ctx) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    vlak = ctx.oppervlak
    opp = ctx.aantal
    opt = ctx.opties
    tar = ctx.tarieven
    if opp <= 0:
        return [], []

    plaat_key = PLAAT_KEYS.get(opt.get("plaat", "12,5 mm"), "plaat_gyproc_12_5")
    profiel_key = "profiel_c100" if opt.get("profiel") == "C100" else "profiel_c75"
    isolatie_key = ISOLATIE_KEYS.get(opt.get("isolatie", "geen"))

    lengte = float(vlak.get("lengte") or 0.0)
    breedte = float(vlak.get("breedte") or 0.0)

    materiaal: List[Dict[str, Any]] = []
    taken: List[Dict[str, Any]] = []

    m2_plaat = opp * (1 + PLAAT_VERSPILLING)
    materiaal.append(_platen(ctx, m2_plaat, plaat_key))

    if lengte > 0 and breedte > 0:
        n_profielen = math.ceil(lengte / SPOORAFSTAND)
        profiel_m = n_profielen * breedte * (1 + PROFIEL_VERSPILLING)
        materiaal.append(_materiaal(
            f"C-profiel {opt.get('profiel', 'C75')} · {n_profielen} profielen",
            math.ceil(profiel_m / PROFIEL_LENGTE - 1e-9), profiel_key, tar, decimaal=0))
        materiaal.append(_materiaal(
            "Vlakke band (rondom)",
            math.ceil(2 * (lengte + breedte) / PROFIEL_LENGTE - 1e-9),
            "profiel_vlakband", tar, decimaal=0))
        materiaal.append(_materiaal(
            "Veerhangers",
            n_profielen * math.ceil(breedte / HANGERAFSTAND), "hanghaak", tar, decimaal=0))

    if isolatie_key:
        materiaal.append(_materiaal(
            f"Isolatie · {opt.get('isolatie')}",
            opp * (1 + PROFIEL_VERSPILLING), isolatie_key, tar, eenheid="m2", decimaal=1))

    materiaal.extend(_afwerking(ctx, m2_plaat))

    taken.append(_taak("uur_plafond_ophangen", opp, tar, ctx.uurtarief))
    if isolatie_key:
        taken.append(_taak("uur_plafond_isolatie", opp, tar, ctx.uurtarief))
    taken.append(_taak("uur_plafond_platen", opp, tar, ctx.uurtarief))
    taken.append(_taak("uur_plafond_voegen", opp, tar, ctx.uurtarief))
    return materiaal, taken


def _gyproc_direct(ctx: Ctx) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    opp = ctx.aantal
    opt = ctx.opties
    tar = ctx.tarieven
    if opp <= 0:
        return [], []

    plaat_key = PLAAT_KEYS.get(opt.get("plaat", "GGL 30 mm"), "plaat_ggl_30")
    m2_plaat = opp * (1 + PLAAT_VERSPILLING)

    materiaal = [
        _platen(ctx, m2_plaat, plaat_key),
        _materiaal(f"Gipslijm ({LIJM_KG_PER_M2} kg/m²)",
                   math.ceil(opp * LIJM_KG_PER_M2 / 25), "lijm", tar, decimaal=0),
    ]
    materiaal.extend(_afwerking(ctx, m2_plaat))

    taken = [
        _taak("uur_direct_platen", opp, tar, ctx.uurtarief),
        _taak("uur_direct_voegen", opp, tar, ctx.uurtarief),
    ]
    return materiaal, taken


def _gyproc_voegafwerking(ctx: Ctx) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    opp = ctx.aantal
    tar = ctx.tarieven
    if opp <= 0:
        return [], []
    materiaal = [
        _materiaal(f"Voegband ({TAPE_M_PER_M2} m/m²)",
                   math.ceil(opp * TAPE_M_PER_M2 / 50), "tape", tar, decimaal=0),
        _materiaal(f"Voegmiddel ({COMPOUND_KG_PER_M2} kg/m²)",
                   math.ceil(opp * COMPOUND_KG_PER_M2 / 25), "compound", tar, decimaal=0),
    ]
    taken = [_taak("uur_voegafwerking", opp, tar, ctx.uurtarief)]
    return materiaal, taken


def _schilderen_gyproc(ctx: Ctx) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    opp = ctx.aantal
    tar = ctx.tarieven
    if opp <= 0:
        return [], []
    materiaal = [
        _materiaal("Primer gipsplaten", math.ceil(opp / 120), "primer", tar, decimaal=0),
        _materiaal("Muurverf · 2 lagen", math.ceil(2 * opp / 120), "verf", tar, decimaal=0),
    ]
    taken = [_taak("uur_schilderen", opp, tar, ctx.uurtarief)]
    return materiaal, taken


def _installatiewerk(ctx: Ctx, recept: Dict[str, Any]):
    """Losse punten/meters: nooit afleiden van het wandoppervlak."""
    if ctx.aantal <= 0:
        return [], []
    materiaal = []
    if recept.get("materiaal"):
        key = recept["materiaal"]
        materiaal.append(_materiaal(ctx.tarieven.naam(key), ctx.aantal, key, ctx.tarieven))
    return materiaal, [_taak(recept["arbeid"], ctx.aantal, ctx.tarieven, ctx.uurtarief)]


BEREKENERS: Dict[str, Callable[[Ctx], Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]]] = {
    "gyproc_wand_profiel": _gyproc_wand_profiel,
    "gyproc_plafond": _gyproc_plafond,
    "gyproc_direct": _gyproc_direct,
    "gyproc_voegafwerking": _gyproc_voegafwerking,
    "schilderen_gyproc": _schilderen_gyproc,
}

for _pakket in PAKKET_OP_ID.values():
    if _pakket.get("recept"):
        BEREKENERS[_pakket["id"]] = lambda ctx, recept=_pakket["recept"]: _installatiewerk(ctx, recept)


# ---------------------------------------------------------------------------
# Eén werkregel doorrekenen
# ---------------------------------------------------------------------------

def standaard_opties(pakket_id: str) -> Dict[str, str]:
    pakket = PAKKET_OP_ID.get(pakket_id, {})
    return {o["id"]: o["standaard"] for o in pakket.get("opties", [])}


def bereken_regel(regel: Werkregel, vlak: Dict[str, Any], project: Project,
                  tarieven: Tarieven) -> Dict[str, Any]:
    """Reken één werkregel door tot materiaal, uren en prijs."""
    pakket = PAKKET_OP_ID.get(regel.pakket_id)
    if pakket is None:
        raise KeyError(f"Onbekend werkpakket: {regel.pakket_id}")
    berekenaar = BEREKENERS.get(regel.pakket_id)
    if berekenaar is None:
        raise KeyError(f"Geen berekening voor werkpakket: {regel.pakket_id}")

    opties = standaard_opties(regel.pakket_id)
    opties.update({k: v for k, v in regel.opties.items() if v})

    aantal = regel.hoeveelheid if regel.hoeveelheid is not None else (
        float(vlak["netto"]) if pakket.get("eenheid", "m2") == "m2" else 0.0)
    if pakket.get("eenheid") in ("st", "m"):
        aantal = max(0.0, aantal)
        if pakket["eenheid"] == "st":
            aantal = math.ceil(aantal)

    ctx = Ctx(oppervlak=vlak, opties=opties, tarieven=tarieven, aantal=aantal,
              uurtarief=project.uurtarief)
    materiaal, taken = berekenaar(ctx)

    materiaal_kosten = money(sum(l["totaal"] for l in materiaal))
    uren = money(sum(t["uren"] for t in taken))
    arbeidskosten = money(sum(t["totaal"] for t in taken))
    marge = money(materiaal_kosten * project.marge_pct / 100.0)

    omschrijving = pakket["naam"]
    if vlak.get("naam"):
        omschrijving = f"{pakket['naam']} — {vlak['naam']}"
    optie_tekst = ", ".join(
        f"{_optie_label(pakket, oid)}: {waarde}"
        for oid, waarde in opties.items()
        if waarde and waarde not in ("geen", "1 zijde")
    )
    if optie_tekst:
        omschrijving += f" ({optie_tekst})"

    return {
        "regel_id": regel.id,
        "pakket_id": regel.pakket_id,
        "pakket": pakket,
        "ruimte_id": regel.ruimte_id,
        "oppervlak": vlak["sleutel"],
        "oppervlak_naam": vlak["naam"],
        "omschrijving": omschrijving,
        "opties": opties,
        "aantal": money(aantal),
        "eenheid": pakket.get("eenheid", "m2"),
        "materiaal": materiaal,
        "taken": taken,
        "uren": money(uren),
        "materiaal_kosten": materiaal_kosten,
        "arbeidskosten": arbeidskosten,
        "marge": marge,
        "totaal": money(materiaal_kosten + arbeidskosten + marge),
        "notitie": regel.notitie,
    }


def _optie_label(pakket: Dict[str, Any], optie_id: str) -> str:
    for optie in pakket.get("opties", []):
        if optie["id"] == optie_id:
            return optie["label"]
    return optie_id


# ---------------------------------------------------------------------------
# Snelle m²-prijzen (referentie per werkpakket)
# ---------------------------------------------------------------------------

#: Referentiegeometrie voor de snelle m²-prijs: wand 4,0 × 2,5 m met één deur.
REFERENTIE_MUUR = {
    "sleutel": "noord", "naam": ZIJDE_NAMEN["noord"], "soort": "muur",
    "bruto": 10.0, "opening": 1.6, "netto": 8.4,
    "lengte": 4.0, "hoogte": 2.5, "openingen": 1,
}
#: Referentiegeometrie voor plafonds: 4,0 × 3,0 m.
REFERENTIE_PLAFOND = {
    "sleutel": PLAFOND, "naam": ZIJDE_NAMEN[PLAFOND], "soort": "plafond",
    "bruto": 12.0, "opening": 0.0, "netto": 12.0,
    "lengte": 4.0, "breedte": 3.0, "hoogte": 2.5, "openingen": 0,
}


def referentie_tarieven() -> Dict[str, float]:
    """Snelle m²-prijzen per werkpakket (materiaal + arbeid per m²).

    Worden afgeleid uit de standaardtarieven, zodat de snelle prijs altijd
    klopt met de gedetailleerde berekening van hetzelfde pakket.
    """
    tarieven = Tarieven()
    project = Project(uurtarief=45.0)
    referentie: Dict[str, float] = {}

    for pakket_id in BEREKENERS:
        if PAKKET_OP_ID[pakket_id].get("eenheid", "m2") != "m2":
            continue
        vlak = REFERENTIE_PLAFOND if pakket_id == "gyproc_plafond" else REFERENTIE_MUUR
        ctx = Ctx(
            oppervlak=vlak,
            opties=standaard_opties(pakket_id),
            tarieven=tarieven,
            aantal=vlak["netto"],
            uurtarief=project.uurtarief,
        )
        materiaal, taken = BEREKENERS[pakket_id](ctx)
        materiaal_kosten = sum(l["totaal"] for l in materiaal)
        arbeidskosten = sum(t["totaal"] for t in taken)
        referentie[f"m2_{pakket_id}_materiaal"] = money(materiaal_kosten / vlak["netto"])
        referentie[f"m2_{pakket_id}_arbeid"] = money(arbeidskosten / vlak["netto"])
    return referentie


def m2_sleutels(pakket_id: str) -> Tuple[str, str]:
    return f"m2_{pakket_id}_materiaal", f"m2_{pakket_id}_arbeid"
