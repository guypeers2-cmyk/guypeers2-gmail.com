#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genereert een realistische demodataset van Belgische bedrijven.

Uitvoer: data/bedrijven.csv

Deze dataset is *demo-materiaal*: de bedrijfsnamen, adressen, BTW-nummers en
werknemersaantallen zijn verzonnen. De plaatsen en hun coördinaten zijn echt,
zodat de bedrijven netjes op de Belgische kaart verspreid staan. Vervang dit
bestand gerust door je eigen export (zie README → "Eigen data").

Gebruik:  python3 scripts/gen_bedrijven.py
"""

import csv
import random
import re
from pathlib import Path

random.seed(42)

# (naam, provincie, gewest, lat, lon, postcodes, gewicht)
STEDEN = [
    ("Brussel", "Brussel", "Brussels Hoofdstedelijk Gewest", 50.8467, 4.3525, ["1000", "1040", "1050", "1060"], 14),
    ("Antwerpen", "Antwerpen", "Vlaanderen", 51.2194, 4.4025, ["2000", "2018", "2600"], 12),
    ("Gent", "Oost-Vlaanderen", "Vlaanderen", 51.0543, 3.7174, ["9000", "9050"], 9),
    ("Leuven", "Vlaams-Brabant", "Vlaanderen", 50.8798, 4.7005, ["3000", "3001"], 7),
    ("Brugge", "West-Vlaanderen", "Vlaanderen", 51.2093, 3.2247, ["8000"], 5),
    ("Kortrijk", "West-Vlaanderen", "Vlaanderen", 50.8267, 3.2650, ["8500"], 4),
    ("Hasselt", "Limburg", "Vlaanderen", 50.9307, 5.3325, ["3500"], 4),
    ("Mechelen", "Antwerpen", "Vlaanderen", 51.0259, 4.4777, ["2800"], 3),
    ("Aalst", "Oost-Vlaanderen", "Vlaanderen", 50.9378, 4.0404, ["9300"], 3),
    ("Sint-Niklaas", "Oost-Vlaanderen", "Vlaanderen", 51.1651, 4.1437, ["9100"], 3),
    ("Genk", "Limburg", "Vlaanderen", 50.9650, 5.5000, ["3600"], 3),
    ("Turnhout", "Antwerpen", "Vlaanderen", 51.3222, 4.9444, ["2300"], 2),
    ("Roeselare", "West-Vlaanderen", "Vlaanderen", 50.9465, 3.1233, ["8800"], 2),
    ("Oostende", "West-Vlaanderen", "Vlaanderen", 51.2306, 2.9186, ["8400"], 2),
    ("Vilvoorde", "Vlaams-Brabant", "Vlaanderen", 50.9281, 4.4292, ["1800"], 2),
    ("Zaventem", "Vlaams-Brabant", "Vlaanderen", 50.8819, 4.4742, ["1930"], 4),
    ("Leuven-Heverlee", "Vlaams-Brabant", "Vlaanderen", 50.8615, 4.6880, ["3001"], 2),
    ("Waregem", "West-Vlaanderen", "Vlaanderen", 50.8891, 3.4280, ["8790"], 2),
    ("Luik", "Luik", "Wallonië", 50.6326, 5.5797, ["4000", "4020"], 7),
    ("Charleroi", "Henegouwen", "Wallonië", 50.4108, 4.4446, ["6000", "6041"], 6),
    ("Namen", "Namen", "Wallonië", 50.4674, 4.8718, ["5000"], 4),
    ("Bergen", "Henegouwen", "Wallonië", 50.4541, 3.9523, ["7000"], 3),
    ("Elsene", "Brussel", "Brussels Hoofdstedelijk Gewest", 50.8267, 4.3691, ["1050"], 4),
    ("Schaarbeek", "Brussel", "Brussels Hoofdstedelijk Gewest", 50.8676, 4.3737, ["1030"], 2),
    ("Zaventem-Luchthaven", "Vlaams-Brabant", "Vlaanderen", 50.9014, 4.4844, ["1930"], 3),
    ("Doornik", "Henegouwen", "Wallonië", 50.6066, 3.3893, ["7500"], 2),
    ("Aarlen", "Luxemburg", "Wallonië", 49.6833, 5.8167, ["6700"], 1),
    ("Aat", "Henegouwen", "Wallonië", 50.6311, 3.7778, ["7800"], 1),
    ("Verviers", "Luik", "Wallonië", 50.5891, 5.8631, ["4800"], 2),
    ("Waver", "Waals-Brabant", "Wallonië", 50.7167, 4.6000, ["1300"], 2),
    ("Aarschot", "Vlaams-Brabant", "Vlaanderen", 50.9850, 4.8369, ["3200"], 1),
    ("Sint-Truiden", "Limburg", "Vlaanderen", 50.8167, 5.1833, ["3800"], 1),
    ("Herentals", "Antwerpen", "Vlaanderen", 51.1772, 4.8347, ["2200"], 1),
    ("Eupen", "Luik", "Wallonië", 50.6306, 6.0333, ["4700"], 1),
]

SECTOREN = [
    ("Technologie & software", "software"),
    ("Logistiek & transport", "logistiek"),
    ("Voeding & dranken", "voeding"),
    ("Bouw & vastgoed", "bouw"),
    ("Zorg & biotech", "zorg"),
    ("Financiën & verzekeringen", "financien"),
    ("Industrie & maakbedrijf", "industrie"),
    ("Energie & milieu", "energie"),
    ("Retail & e-commerce", "retail"),
    ("Transport & mobiliteit", "transport"),
    ("Media & marketing", "media"),
    ("Onderwijs & opleiding", "onderwijs"),
]

# Echte Belgische naamstammen — de firma's zijn willekeurig samengesteld.
NAAM_A = [
    "Vandenberghe", "De Smet", "Peeters", "Claes", "Janssens", "Maes", "Willems",
    "Delvaux", "Dubois", "Lejeune", "Lambert", "Marchal", "Van Damme", "Vermeulen",
    "Coppens", "Michiels", "Desmet", "Verstraete", "Moens", "Declercq", "Renard",
    "Van Acker", "Leclercq", "Becker", "Schmit", "Nys", "Verhoeven", "De Vos",
]
NAAM_B = [
    "Holding", "Groep", "Group", "Technics", "Solutions", "Partners", "Systems",
    "Logistics", "Foods", "Bouw", "Construct", "Care", "Capital", "Industries",
    "Energy", "Retail", "Digital", "Labs", "Consult", "Ventures", "Transport",
    "Supply", "Works", "Studio", "Bio", "Services", "Automation", "Materials",
]
RECHT = ["BV", "NV", "SA", "BVBA", "Comm.V", "CV", "SRL", "Sprl"]

STRATEN = [
    "Lange Nieuwstraat", "Meir", "Rue Neuve", "Statestraat", "Kerkstraat",
    "Nieuwstraat", "Rue de la Loi", "Gasthuisstraat", "Vestensfraat", "Havenlaan",
    "Quai de l'Industrie", "Industrieweg", "Zonnebloemstraat", "Pontstraat",
    "Chaussée de Louvain", "Europalaan", "Brugstraat", "Vaartstraat",
    "Avenue Louise", "Rue des Bouchers", "Kaaistraat", "Parklaan",
    "Boulevard de la Woluwe", "Rue de l'Église", "Dorpsstraat", "Leuvensesteenweg",
]

STATUS = ["Actief", "Actief", "Actief", "Actief", "Actief", "Actief",
          "In oprichting", "Overgenomen", "Stopgezet"]

OMZET_BANDEN = ["< 1 mln €", "1 – 5 mln €", "5 – 20 mln €", "20 – 50 mln €", "> 50 mln €"]

REEKSEN = "ABCDEFGHJKLMNPQRSTUVWXYZ"


def btw_nummer():
    """Belgisch BTW-nummer: BE 0xxx.xxx.xxx (dummy)."""
    basis = f"0{random.randint(100, 999)}{random.randint(100, 999)}"
    return f"BE {basis}.{random.randint(100, 999)}"


SUFFIX_PER_SECTOR = {
    "software": ["Digital", "Labs", "Systems", "Solutions", "Technics"],
    "logistiek": ["Logistics", "Supply", "Transport", "Groep", "Group"],
    "voeding": ["Foods", "Bakkerij", "Brouwerij", "Ventures", "Groep"],
    "bouw": ["Bouw", "Construct", "Works", "Vastgoed", "Partners"],
    "zorg": ["Care", "Bio", "Health", "Labs", "Services"],
    "financien": ["Capital", "Holding", "Invest", "Partners", "Group"],
    "industrie": ["Industries", "Materials", "Automation", "Works", "Technics"],
    "energie": ["Energy", "Green", "Power", "Solutions", "Ventures"],
    "retail": ["Retail", "Store", "Shop", "Groep", "Ventures"],
    "transport": ["Transport", "Mobility", "Logistics", "Lines", "Group"],
    "media": ["Media", "Studio", "Creative", "Communicatie", "Digital"],
    "onderwijs": ["Academy", "Campus", "Learning", "Institute", "Studio"],
}


def kies_naam(gebruikt, sector_slug="overig"):
    suffixes = SUFFIX_PER_SECTOR.get(sector_slug, NAAM_B)
    for _ in range(200):
        naam = f"{random.choice(NAAM_A)} {random.choice(suffixes)}"
        if random.random() < 0.28:
            naam += f" {random.choice(['Noord', 'Zuid', 'Centraal', 'Vlaanderen', 'Wallonië', 'Belgium'])}"
        if naam not in gebruikt:
            gebruikt.add(naam)
            return naam
    return f"{random.choice(NAAM_A)} {random.choice(NAAM_B)} {len(gebruikt)}"


def main():
    gebruikt = set()
    rijen = []
    stadsgewichten = [s[6] for s in STEDEN]

    # Eerst élke stad één keer (landsdekkend), daarna extra gewicht naar de
    # grootstedelijke kernen — zo blijft de kaart realistisch verdeeld.
    planning = list(STEDEN)
    random.shuffle(planning)
    planning += random.choices(STEDEN, weights=stadsgewichten, k=36)

    for stad in planning:
        stad_naam, provincie, gewest, lat, lon, postcodes, _w = stad
        sector_naam, sector_slug = random.choice(SECTOREN)

        # Eén bedrijf = één identiteit; vestigingen erven die identiteit.
        bedrijf = {
            "naam": kies_naam(gebruikt, sector_slug),
            "btw": btw_nummer(),
            "sector": sector_naam,
            "sector_slug": sector_slug,
            "stad": stad_naam,
            "provincie": provincie,
            "gewest": gewest,
            "opgericht": random.randint(1948, 2024),
            "status": random.choice(STATUS),
            "website": "",
            "telefoon": f"+32 {random.randint(2, 89)} {random.randint(100, 999)} {random.randint(10, 99)} {random.randint(10, 99)}",
            "omzet": random.choice(OMZET_BANDEN),
        }
        bedrijf["website"] = "www." + re.sub(r"[^a-z]", "", bedrijf["naam"].lower())[:18] + ".be"

        # Spreiding rond het stadscentrum, net als echte bedrijvenclusters.
        jitter_lat = random.gauss(0, 0.020)
        jitter_lon = random.gauss(0, 0.028)

        hoofdkantoor = dict(bedrijf)
        hoofdkantoor.update({
            "postcode": random.choice(postcodes),
            "straat": f"{random.choice(STRATEN)} {random.randint(1, 180)}",
            "lat": round(lat + jitter_lat, 6),
            "lon": round(lon + jitter_lon, 6),
            "werknemers": max(2, int(random.lognormvariate(3.1, 1.30))),
            "type": "Hoofdvestiging",
        })
        rijen.append(hoofdkantoor)

        for _v in range(random.choices([0, 0, 0, 1, 2, 3, 5, 9], k=1)[0]):
            filiaal = dict(bedrijf)
            filiaal.update({
                "postcode": random.choice(postcodes),
                "straat": f"{random.choice(STRATEN)} {random.randint(1, 180)}",
                "lat": round(lat + jitter_lat + random.gauss(0, 0.014), 6),
                "lon": round(lon + jitter_lon + random.gauss(0, 0.020), 6),
                "werknemers": max(1, int(random.lognormvariate(2.3, 1.10))),
                "type": "Vestiging",
                "btw": btw_nummer(),
            })
            rijen.append(filiaal)

    rijen.sort(key=lambda r: (r["provincie"], r["stad"], r["naam"]))
    for i, rij in enumerate(rijen, start=1):
        rij["id"] = i

    velden = ["id", "naam", "btw", "sector", "sector_slug", "type", "straat", "postcode",
              "stad", "provincie", "gewest", "lat", "lon", "werknemers", "omzet",
              "opgericht", "status", "website", "telefoon", "precisie"]

    doel = Path(__file__).resolve().parent.parent / "data" / "bedrijven.csv"
    doel.parent.mkdir(parents=True, exist_ok=True)
    with doel.open("w", newline="", encoding="utf-8") as f:
        schrijver = csv.DictWriter(f, fieldnames=velden, extrasaction="ignore")
        schrijver.writeheader()
        schrijver.writerows(rijen)

    import json as _json
    (doel.parent / "bedrijven.meta.json").write_text(_json.dumps({
        "demo": True,
        "bron": "demo-generator (scripts/gen_bedrijven.py)",
        "opmerking": "Namen, BTW-nummers en cijfers zijn verzonnen; plaatsen en coördinaten zijn echt.",
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    bedrijven = len({r["naam"] for r in rijen})
    print(f"✔ {len(rijen)} rijen ({bedrijven} bedrijven) → {doel}")


if __name__ == "__main__":
    main()
