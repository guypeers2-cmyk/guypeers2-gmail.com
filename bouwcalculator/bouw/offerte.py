# -*- coding: utf-8 -*-
"""Offerte-opbouw: project → berekende regels → prijstotaal.

Dit is de enige plek waar een project wordt omgezet in iets wat een klant
kan lezen. De webserver roept ``bereken_offerte`` aan; de browser tekent
het resultaat.
"""

from typing import Any, Dict, List

from .bereken import (
    BEREKENERS,
    bereken_regel,
    m2_sleutels,
    referentie_tarieven,
    ruimte_oppervlakken,
    vind_vlak,
)
from .model import Project, ZIJDE_NAMEN
from .tarieven import PAKKETTEN, PAKKET_OP_ID, Tarieven


def _bereken_m2(regel, vlak: Dict[str, Any], project: Project,
                tarieven: Tarieven) -> Dict[str, Any]:
    """Snelle m²-prijs: één regel per werkpakket, zonder gedetailleerde namen."""
    pakket = PAKKET_OP_ID[regel.pakket_id]
    aantal = regel.hoeveelheid if regel.hoeveelheid is not None else float(vlak["netto"])
    sleutel_materiaal, sleutel_arbeid = m2_sleutels(regel.pakket_id)
    prijs_materiaal = tarieven.prijs(sleutel_materiaal)
    prijs_arbeid = tarieven.prijs(sleutel_arbeid)

    materiaal_kosten = round(aantal * prijs_materiaal, 2)
    arbeidskosten = round(aantal * prijs_arbeid, 2)
    uren = round(arbeidskosten / project.uurtarief, 2) if project.uurtarief else 0.0
    marge = round(materiaal_kosten * project.marge_pct / 100.0, 2)

    omschrijving = f"{pakket['naam']} — {vlak['naam']} (snelle m²-prijs)"
    return {
        "regel_id": regel.id,
        "pakket_id": regel.pakket_id,
        "pakket": pakket,
        "ruimte_id": regel.ruimte_id,
        "oppervlak": vlak["sleutel"],
        "oppervlak_naam": vlak["naam"],
        "omschrijving": omschrijving,
        "opties": dict(regel.opties),
        "aantal": round(aantal, 2),
        "eenheid": pakket.get("eenheid", "m2"),
        "materiaal": [{
            "omschrijving": f"Materiaal — {prijs_materiaal:.2f} €/m²",
            "aantal": round(aantal, 2),
            "eenheid": "m2",
            "prijs_sleutel": sleutel_materiaal,
            "eenheidsprijs": prijs_materiaal,
            "totaal": materiaal_kosten,
            "soort": "materiaal",
        }],
        "taken": [{
            "omschrijving": f"Arbeid — {prijs_arbeid:.2f} €/m²",
            "uren_per_m2": round(prijs_arbeid / project.uurtarief, 3) if project.uurtarief else 0.0,
            "uren": uren,
            "tarief": project.uurtarief,
            "totaal": arbeidskosten,
            "soort": "taak",
        }],
        "uren": uren,
        "materiaal_kosten": materiaal_kosten,
        "arbeidskosten": arbeidskosten,
        "marge": marge,
        "totaal": round(materiaal_kosten + arbeidskosten + marge, 2),
        "notitie": regel.notitie,
    }


def bereken_offerte(project_data: Dict[str, Any]) -> Dict[str, Any]:
    """Reken een heel project door en lever de offerte terug als JSON."""
    project = Project.van_dict(project_data)
    referentie = referentie_tarieven()
    tarieven = Tarieven(project.tarieven, referentie)

    ruimtes: List[Dict[str, Any]] = []
    vlakken_per_ruimte: Dict[str, List[Dict[str, Any]]] = {}
    for ruimte in project.ruimtes:
        vlakken = ruimte_oppervlakken(ruimte)
        vlakken_per_ruimte[ruimte.id] = vlakken
        ruimtes.append({
            "id": ruimte.id,
            "naam": ruimte.naam,
            "lengte": ruimte.lengte,
            "breedte": ruimte.breedte,
            "hoogte": ruimte.hoogte,
            "openingen": [o.naar_dict() for o in ruimte.openingen],
            "vlakken": vlakken,
            "wandoppervlak": round(sum(v["netto"] for v in vlakken if v["soort"] == "muur"), 2),
        })

    regels: List[Dict[str, Any]] = []
    waarschuwingen: List[str] = []
    for regel in project.regels:
        ruimte = project.ruimte(regel.ruimte_id)
        if ruimte is None:
            waarschuwingen.append(
                f"Werkregel '{regel.id}' hoort bij een onbekende ruimte en is overgeslagen.")
            continue
        vlak = vind_vlak(vlakken_per_ruimte.get(ruimte.id, []), regel.oppervlak)
        if vlak is None:
            waarschuwingen.append(
                f"Werkregel '{regel.id}' hoort bij een onbekend vlak ({regel.oppervlak}) "
                "en is overgeslagen.")
            continue
        if regel.pakket_id not in PAKKET_OP_ID or regel.pakket_id not in BEREKENERS:
            waarschuwingen.append(
                f"Werkpakket '{regel.pakket_id}' bestaat niet meer en is overgeslagen.")
            continue
        if project.prijsmodus == "m2":
            regels.append(_bereken_m2(regel, vlak, project, tarieven))
        else:
            regels.append(bereken_regel(regel, vlak, project, tarieven))

    materiaal = round(sum(r["materiaal_kosten"] for r in regels), 2)
    arbeid = round(sum(r["arbeidskosten"] for r in regels), 2)
    uren = round(sum(r["uren"] for r in regels), 2)
    marge = round(sum(r["marge"] for r in regels), 2)
    subtotaal = round(materiaal + arbeid + marge, 2)
    korting = round(subtotaal * project.korting_pct / 100.0, 2)
    netto = round(subtotaal - korting, 2)
    btw = round(netto * project.btw_pct / 100.0, 2)
    totaal = round(netto + btw, 2)

    # Totalen per ruimte (voor de offerte per kamer).
    per_ruimte: Dict[str, Dict[str, Any]] = {}
    for regel in regels:
        rij = per_ruimte.setdefault(regel["ruimte_id"], {
            "materiaal": 0.0, "arbeid": 0.0, "uren": 0.0, "marge": 0.0, "totaal": 0.0})
        rij["materiaal"] += regel["materiaal_kosten"]
        rij["arbeid"] += regel["arbeidskosten"]
        rij["uren"] += regel["uren"]
        rij["marge"] += regel["marge"]
        rij["totaal"] += regel["totaal"]
    for ruimte_id, rij in per_ruimte.items():
        for sleutel, waarde in list(rij.items()):
            rij[sleutel] = round(waarde, 2)

    return {
        "project": project.naar_dict(),
        "ruimtes": ruimtes,
        "regels": regels,
        "totalen": {
            "materiaal": materiaal,
            "arbeid": arbeid,
            "uren": uren,
            "marge": marge,
            "subtotaal": subtotaal,
            "korting_pct": project.korting_pct,
            "korting": korting,
            "btw_pct": project.btw_pct,
            "btw": btw,
            "netto": netto,
            "totaal": totaal,
        },
        "per_ruimte": per_ruimte,
        "waarschuwingen": waarschuwingen,
        "tarieven": _tarievenoverzicht(tarieven, referentie),
        "pakketten": PAKKETTEN,
    }


def _tarievenoverzicht(tarieven: Tarieven, referentie: Dict[str, float]) -> List[Dict[str, Any]]:
    """Het volledige, aanpasbare prijsboek (materiaal + uren + snelle m²-prijzen)."""
    overzicht = tarieven.overzicht()
    for pakket_id, pakket in PAKKET_OP_ID.items():
        sleutel_m, sleutel_a = m2_sleutels(pakket_id)
        overzicht.append({
            "sleutel": sleutel_m,
            "naam": f"Snel {pakket['naam']} · materiaal",
            "eenheid": "€/m2",
            "prijs": tarieven.prijs(sleutel_m),
            "standaard": referentie.get(sleutel_m, 0.0),
            "soort": "m2",
        })
        overzicht.append({
            "sleutel": sleutel_a,
            "naam": f"Snel {pakket['naam']} · arbeid",
            "eenheid": "€/m2",
            "prijs": tarieven.prijs(sleutel_a),
            "standaard": referentie.get(sleutel_a, 0.0),
            "soort": "m2",
        })
    return overzicht
