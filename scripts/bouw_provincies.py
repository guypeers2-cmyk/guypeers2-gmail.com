#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vereenvoudigt Natural Earth admin-1 grenzen tot de Belgische provincies.

Bron: ne_10m_admin_1_states_provinces.geojson (Natural Earth, publiek domein).
Download: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/

Gebruik:
    python3 scripts/bouw_provincies.py --bron /pad/naar/ne_10m_admin_1_states_provinces.geojson

Uitvoer: web/data/provincies.geojson (NL-namen, gewest, vereenvoudigde ringen)
"""

import argparse
import json
from pathlib import Path

WORTEL = Path(__file__).resolve().parent.parent
DOEL = WORTEL / "web" / "data" / "provincies.geojson"

NAAM = {"Provincie Antwerpen": "Antwerpen", "Brussels Hoofdstedelijk Gewest": "Brussel"}

GEWEST = {
    "BE-VWV": "Vlaanderen",
    "BE-VOV": "Vlaanderen",
    "BE-VAN": "Vlaanderen",
    "BE-VLI": "Vlaanderen",
    "BE-VBR": "Vlaanderen",
    "BE-WHT": "Wallonië",
    "BE-WNA": "Wallonië",
    "BE-WLX": "Wallonië",
    "BE-WLG": "Wallonië",
    "BE-WBR": "Wallonië",
    "BE-BRU": "Brussels Hoofdstedelijk Gewest",
}


def afstand_tot_lijn(punt, begin, eind):
    """Loodrechte afstand van punt tot het lijnstuk begin-eind (in graden)."""
    dx, dy = eind[0] - begin[0], eind[1] - begin[1]
    lengte2 = dx * dx + dy * dy
    if lengte2 == 0:
        return ((punt[0] - begin[0]) ** 2 + (punt[1] - begin[1]) ** 2) ** 0.5
    t = ((punt[0] - begin[0]) * dx + (punt[1] - begin[1]) * dy) / lengte2
    t = max(0.0, min(1.0, t))
    px, py = begin[0] + t * dx, begin[1] + t * dy
    return ((punt[0] - px) ** 2 + (punt[1] - py) ** 2) ** 0.5


def douglas_peucker(punten, tolerantie):
    if len(punten) < 3:
        return punten
    eerste, laatste = punten[0], punten[-1]
    index, grootste = 0, 0.0
    for i in range(1, len(punten) - 1):
        afstand = afstand_tot_lijn(punten[i], eerste, laatste)
        if afstand > grootste:
            index, grootste = i, afstand
    if grootste > tolerantie:
        links = douglas_peucker(punten[: index + 1], tolerantie)
        rechts = douglas_peucker(punten[index:], tolerantie)
        return links[:-1] + rechts
    return [eerste, laatste]


def vereenvoudig_ring(ring, tolerantie, min_punten=6):
    """Vereenvoudigt een ring; gesloten ringen worden eerst opengeknipt."""
    punten = [tuple(p[:2]) for p in ring]
    gesloten = punten[0] == punten[-1]
    if gesloten:
        punten = punten[:-1]
        # Splits in twee helften: anders is het eerste lijnstuk ontaard.
        midden = len(punten) // 2
        eerste_helft = douglas_peucker(punten[: midden + 1], tolerantie)
        tweede_helft = douglas_peucker(punten[midden:] + [punten[0]], tolerantie)
        vereenvoudigd = eerste_helft[:-1] + tweede_helft
    else:
        vereenvoudigd = douglas_peucker(punten, tolerantie)

    if len(vereenvoudigd) < min_punten:
        return None
    if vereenvoudigd[0] != vereenvoudigd[-1]:
        vereenvoudigd.append(vereenvoudigd[0])
    return [[round(x, 5), round(y, 5)] for x, y in vereenvoudigd]


def verwerk(geometrie, tolerantie):
    ringen = []
    if geometrie["type"] == "Polygon":
        ringen.append(geometrie["coordinates"][0])
    elif geometrie["type"] == "MultiPolygon":
        for polygoon in geometrie["coordinates"]:
            ringen.append(polygoon[0])
    elif geometrie["type"] == "LineString":
        ringen.append(geometrie["coordinates"])
    else:
        return None

    uit = []
    for ring in ringen:
        klein = vereenvoudig_ring(ring, tolerantie)
        if klein:
            uit.append(klein)
    if not uit:
        return None
    if len(uit) == 1:
        return {"type": "Polygon", "coordinates": [uit[0]]}
    return {"type": "MultiPolygon", "coordinates": [[r] for r in uit]}


def main():
    parser = argparse.ArgumentParser(description="Bouw provinciegrenzen voor de kaart")
    parser.add_argument("--bron", type=Path, required=True, help="Natural Earth admin-1 GeoJSON")
    parser.add_argument("--tolerantie", type=float, default=0.004, help="Vereenvoudigingstolerantie in graden")
    args = parser.parse_args()

    data = json.loads(args.bron.read_text(encoding="utf-8"))
    features = []
    for feature in data["features"]:
        props = feature["properties"]
        if props.get("adm0_a3") != "BEL":
            continue
        iso = props.get("iso_3166_2") or ""
        geometrie = verwerk(feature["geometry"], args.tolerantie)
        if not geometrie:
            continue
        features.append({
            "type": "Feature",
            "properties": {
                "naam": NAAM.get(props.get("name_nl"), props.get("name_nl") or props.get("name")),
                "naam_en": props.get("name"),
                "iso": iso,
                "gewest": GEWEST.get(iso, ""),
                "code": iso.split("-")[-1] if "-" in iso else "",
            },
            "geometry": geometrie,
        })

    doel = {"type": "FeatureCollection", "features": features}
    DOEL.parent.mkdir(parents=True, exist_ok=True)
    DOEL.write_text(json.dumps(doel, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"✔ {len(features)} provincies → {DOEL} ({DOEL.stat().st_size / 1024:.0f} kB)")


if __name__ == "__main__":
    main()
