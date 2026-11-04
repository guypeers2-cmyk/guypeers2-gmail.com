#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Geo-hulpjes voor de bedrijvenkaart (pure Python, geen dependencies).

- `Provincies`: grenzen uit web/data/provincies.geojson + punt-in-polygoon
- `Postcodes`: data/postcodes.csv (postcode → gemeente + coördinaten)
- normalisatie van provincie- en gewestnamen
"""

import csv
import json
import unicodedata
from pathlib import Path

WORTEL = Path(__file__).resolve().parent.parent
PROVINCIES_JSON = WORTEL / "web" / "data" / "provincies.geojson"
POSTCODES_CSV = WORTEL / "data" / "postcodes.csv"

PROVINCIES = [
    "Antwerpen", "Brussel", "Henegouwen", "Limburg", "Luik", "Luxemburg",
    "Namen", "Oost-Vlaanderen", "Vlaams-Brabant", "Waals-Brabant", "West-Vlaanderen",
]

GEWEST_VAN_PROVINCIE = {
    "Antwerpen": "Vlaanderen",
    "Limburg": "Vlaanderen",
    "Oost-Vlaanderen": "Vlaanderen",
    "Vlaams-Brabant": "Vlaanderen",
    "West-Vlaanderen": "Vlaanderen",
    "Henegouwen": "Wallonië",
    "Luik": "Wallonië",
    "Luxemburg": "Wallonië",
    "Namen": "Wallonië",
    "Waals-Brabant": "Wallonië",
    "Brussel": "Brussels Hoofdstedelijk Gewest",
}

PROVINCIE_ALIASSEN = {
    # Nederlands
    "antwerpen": "Antwerpen", "provincie antwerpen": "Antwerpen", "antwerp": "Antwerpen",
    "brussel": "Brussel", "brussels": "Brussel", "bruxelles": "Brussel",
    "brussels hoofdstedelijk gewest": "Brussel", "région de bruxelles-capitale": "Brussel",
    "henegouwen": "Henegouwen", "hainaut": "Henegouwen",
    "limburg": "Limburg", "limbourg": "Limburg",
    "luik": "Luik", "liège": "Luik", "liege": "Luik",
    "luxemburg": "Luxemburg", "luxembourg": "Luxemburg",
    "namen": "Namen", "namur": "Namen",
    "oost-vlaanderen": "Oost-Vlaanderen", "oost vlaanderen": "Oost-Vlaanderen",
    "flandre orientale": "Oost-Vlaanderen", "east flanders": "Oost-Vlaanderen",
    "vlaams-brabant": "Vlaams-Brabant", "vlaams brabant": "Vlaams-Brabant",
    "brabant flamand": "Vlaams-Brabant", "flemish brabant": "Vlaams-Brabant",
    "waals-brabant": "Waals-Brabant", "waals brabant": "Waals-Brabant",
    "brabant wallon": "Waals-Brabant", "walloon brabant": "Waals-Brabant",
    "west-vlaanderen": "West-Vlaanderen", "west vlaanderen": "West-Vlaanderen",
    "flandre occidentale": "West-Vlaanderen", "west flanders": "West-Vlaanderen",
}


def zonder_accenten(tekst):
    tekst = unicodedata.normalize("NFKD", str(tekst or ""))
    return "".join(c for c in tekst if not unicodedata.combining(c))


def normaliseer_provincie(waarde):
    """Geeft de canonieke provincienaam, of '' als het onbekend is."""
    sleutel = zonder_accenten(waarde).strip().lower().replace("provincie ", "")
    return PROVINCIE_ALIASSEN.get(sleutel, "")


class Provincies:
    """Provinciegrenzen met snelle punt-in-polygoon-lookup."""

    def __init__(self, pad=PROVINCIES_JSON):
        self.features = []
        if not Path(pad).exists():
            return
        data = json.loads(Path(pad).read_text(encoding="utf-8"))
        for feature in data.get("features", []):
            ringen = self._ringen(feature["geometry"])
            if not ringen:
                continue
            xs = [p[0] for ring in ringen for p in ring]
            ys = [p[1] for ring in ringen for p in ring]
            self.features.append({
                "naam": feature["properties"].get("naam", ""),
                "gewest": feature["properties"].get("gewest", ""),
                "ringen": ringen,
                "bbox": (min(xs), min(ys), max(xs), max(ys)),
            })

    @staticmethod
    def _ringen(geometrie):
        if geometrie["type"] == "Polygon":
            return [geometrie["coordinates"][0]]
        if geometrie["type"] == "MultiPolygon":
            return [polygoon[0] for polygoon in geometrie["coordinates"]]
        return []

    @staticmethod
    def _in_ring(x, y, ring):
        binnen = False
        n = len(ring)
        j = n - 1
        for i in range(n):
            xi, yi = ring[i]
            xj, yj = ring[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi:
                binnen = not binnen
            j = i
        return binnen

    def zoek(self, lat, lon):
        """Provincienaam voor een coördinaat (of '')."""
        try:
            y, x = float(lat), float(lon)
        except (TypeError, ValueError):
            return ""
        for feature in self.features:
            minx, miny, maxx, maxy = feature["bbox"]
            if not (minx <= x <= maxx and miny <= y <= maxy):
                continue
            for ring in feature["ringen"]:
                if self._in_ring(x, y, ring):
                    return feature["naam"]
        return ""

    def gewest(self, provincie):
        return GEWEST_VAN_PROVINCIE.get(provincie, "")


class Postcodes:
    """Postcode → gemeente + coördinaten, met de provincie erbij.

    Per postcode staan er meerdere kernen in de bron (bijv. 4000 = Liège, Glain,
    …). We bewaren alle kernen en kiezen de hoofdgemeente als de kern die het
    dichtst bij het zwaartepunt ligt — of de kern die het best bij de
    gemeentenaam uit het adres past.
    """

    def __init__(self, pad=POSTCODES_CSV, provincies=None):
        self.provincies = provincies or Provincies()
        self.per_code = {}
        pad = Path(pad)
        if not pad.exists():
            return
        kernen = {}
        with pad.open(newline="", encoding="utf-8-sig") as f:
            for rij in csv.reader(f):
                if len(rij) < 4:
                    continue
                code, gemeente = rij[0].strip(), rij[1].strip()
                if not code.isdigit():
                    continue
                try:
                    lon, lat = float(rij[2]), float(rij[3])
                except ValueError:
                    continue
                kernen.setdefault(code.zfill(4), []).append((gemeente, lat, lon))

        # Grote steden komen bij veel postcodes terug; die naam wint van een
        # deelgemeente die toevallig dichter bij het zwaartepunt ligt.
        frequentie = {}
        for rijen in kernen.values():
            for gemeente, _lat, _lon in rijen:
                frequentie[gemeente] = frequentie.get(gemeente, 0) + 1

        for code, rijen in kernen.items():
            mid_lat = sum(r[1] for r in rijen) / len(rijen)
            mid_lon = sum(r[2] for r in rijen) / len(rijen)
            hoofd = min(rijen, key=lambda r: (
                -frequentie.get(r[0], 0),
                (r[1] - mid_lat) ** 2 + (r[2] - mid_lon) ** 2,
            ))
            self.per_code[code] = {
                "stad": hoofd[0],
                "lat": hoofd[1],
                "lon": hoofd[2],
                "provincie": self.provincies.zoek(hoofd[1], hoofd[2]),
                "kernen": [r[0] for r in rijen],
            }

    def zoek(self, postcode):
        code = "".join(c for c in str(postcode or "") if c.isdigit())
        if len(code) > 4:
            code = code[-4:]
        code = code.zfill(4)
        return self.per_code.get(code)

    def kernen(self, postcode):
        code = str(postcode or "").strip().zfill(4)
        kern = self.per_code.get(code)
        return kern["kernen"] if kern else []


def haal_postcode(adres_of_postcode):
    """Pikt de eerste 4-cijferige Belgische postcode uit een tekst."""
    cijfers = "".join(c if c.isdigit() else " " for c in str(adres_of_postcode or ""))
    for deeltje in cijfers.split():
        if len(deeltje) == 4 and deeltje[0] != "0":
            return deeltje
    return ""
