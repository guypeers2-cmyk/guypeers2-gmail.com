#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Importeer echte Belgische bedrijfsdata en maak er kaartdata van.

Ondersteunt twee soorten bronnen:

1. **KBO/BCE open data** — de officiële bestanden van de FOD Economie
   (enterprise.csv, establishment.csv, address.csv, denomination.csv, activity.csv),
   als map of als zip:
       python3 scripts/kbo_import.py --bron ~/Downloads/kbo.zip --limiet 5000

2. **Eender welke CSV-export** met adreskolommen (van een CRM, handelsgids,
   studiedienst …). Kolomnamen worden automatisch herkend:
       python3 scripts/kbo_import.py --bron mijn-bedrijven.csv

Adressen worden gegeocodeerd via `data/postcodes.csv` (postcode → gemeente +
coördinaten) en de provincie wordt bepaald met `web/data/provincies.geojson`.
Er gaan geen gegevens naar externe diensten.

Uitvoer: `data/bedrijven.csv` + `web/data/bedrijven.json`.
Gebruik daarna:
       python3 scripts/bouw_data.py     (of meteen: --alleen-json)
"""

import argparse
import csv
import io
import json
import math
import random
import re
import shutil
import sys
import tempfile
import unicodedata
import zipfile
import zlib
from collections import Counter, defaultdict
from pathlib import Path

SCRIPTMAP = Path(__file__).resolve().parent
WORTEL = SCRIPTMAP.parent
sys.path.insert(0, str(SCRIPTMAP))

from geo import Postcodes, Provincies, haal_postcode, normaliseer_provincie, zonder_accenten  # noqa: E402

STANDAARD_CSV = WORTEL / "data" / "bedrijven.csv"
STANDAARD_JSON = WORTEL / "web" / "data" / "bedrijven.json"

# ---------------------------------------------------------------------------
# NACE-BEL 2008 (hoofdafdeling) → sector op de kaart
# ---------------------------------------------------------------------------
NACE_SECTOR = [
    (range(1, 4), "Landbouw & visserij"),
    (range(5, 10), "Industrie & maakbedrijf"),
    (range(10, 13), "Voeding & dranken"),
    (range(13, 18), "Industrie & maakbedrijf"),
    (range(18, 19), "Media & marketing"),
    (range(19, 21), "Industrie & maakbedrijf"),
    (range(21, 22), "Zorg & biotech"),
    (range(22, 28), "Industrie & maakbedrijf"),
    (range(28, 31), "Industrie & maakbedrijf"),
    (range(31, 34), "Industrie & maakbedrijf"),
    (range(35, 40), "Energie & milieu"),
    (range(41, 44), "Bouw & vastgoed"),
    (range(45, 48), "Retail & e-commerce"),
    (range(49, 54), "Logistiek & transport"),
    (range(55, 57), "Horeca & toerisme"),
    (range(58, 61), "Media & marketing"),
    (range(61, 64), "Technologie & software"),
    (range(64, 67), "Financiën & verzekeringen"),
    (range(68, 69), "Vastgoed & makelaardij"),
    (range(69, 76), "Advies & consultancy"),
    (range(77, 83), "Zakelijke dienstverlening"),
    (range(85, 86), "Onderwijs & opleiding"),
    (range(86, 89), "Zorg & biotech"),
    (range(90, 94), "Cultuur & vrije tijd"),
    (range(94, 100), "Overige diensten"),
]

SECTOR_ALIASSEN = {
    "it": "Technologie & software", "ict": "Technologie & software",
    "software": "Technologie & software", "technologie": "Technologie & software",
    "technology": "Technologie & software", "tech": "Technologie & software",
    "logistiek": "Logistiek & transport", "logistics": "Logistiek & transport",
    "transport": "Logistiek & transport", "transport & logistiek": "Logistiek & transport",
    "voeding": "Voeding & dranken", "food": "Voeding & dranken",
    "horeca": "Horeca & toerisme", "toerisme": "Horeca & toerisme",
    "bouw": "Bouw & vastgoed", "construction": "Bouw & vastgoed",
    "vastgoed": "Vastgoed & makelaardij", "real estate": "Vastgoed & makelaardij",
    "zorg": "Zorg & biotech", "health": "Zorg & biotech", "biotech": "Zorg & biotech",
    "financien": "Financiën & verzekeringen", "finance": "Financiën & verzekeringen",
    "verzekeringen": "Financiën & verzekeringen", "insurance": "Financiën & verzekeringen",
    "industrie": "Industrie & maakbedrijf", "industry": "Industrie & maakbedrijf",
    "manufacturing": "Industrie & maakbedrijf",
    "energie": "Energie & milieu", "energy": "Energie & milieu", "milieu": "Energie & milieu",
    "retail": "Retail & e-commerce", "e-commerce": "Retail & e-commerce",
    "handel": "Retail & e-commerce", "commerce": "Retail & e-commerce",
    "media": "Media & marketing", "marketing": "Media & marketing",
    "reclame": "Media & marketing", "communicatie": "Media & marketing",
    "onderwijs": "Onderwijs & opleiding", "education": "Onderwijs & opleiding",
    "advies": "Advies & consultancy", "consultancy": "Advies & consultancy",
    "consulting": "Advies & consultancy",
    "landbouw": "Landbouw & visserij", "agriculture": "Landbouw & visserij",
    "cultuur": "Cultuur & vrije tijd", "cultuur & vrije tijd": "Cultuur & vrije tijd",
    "overige diensten": "Overige diensten",
}

# KBO-kolomnamen (Engels in de open data, soms Frans/Nederlands in eigen exports)
KBO_KOLOMMEN = {
    "onderneming": ["EnterpriseNumber", "Ondernemingsnummer", "UnderNr"],
    "vestiging": ["EstablishmentNumber", "Vestigingsnummer"],
    "entiteit": ["EntityNumber", "EntityContact", "EntityNumberEstablishment"],
    "naam": ["Denomination", "Benaming", "Name", "CompanyName"],
    "adres_type": ["TypeOfAddress", "TypeAdresse", "TypeAdres"],
    "straat": ["StreetNL", "StreetFR", "Street", "Straat"],
    "huisnummer": ["HouseNumber", "Nummer"],
    "postcode": ["Zipcode", "PostalCode", "Postcode"],
    "gemeente": ["MunicipalityNL", "MunicipalityFR", "Municipality", "Gemeente"],
    "land": ["CountryNL", "Country", "Land"],
    "nace": ["NaceCode", "NaceBelCode", "ActivityCode", "NACEBEL2008"],
    "classificatie": ["Classification", "ActivityGroup"],
    "status": ["Status", "JuridicalSituation"],
    "type_onderneming": ["TypeOfEnterprise", "JuridicalForm"],
    "start": ["StartDate", "DateStart"],
    "activiteit": ["ActivityDescription", "Beschrijving"],
}

# ---------------------------------------------------------------------------
# Lees- en opschoonhulpjes
# ---------------------------------------------------------------------------


def schoon(waarde):
    return " ".join(str(waarde or "").split())


RECHTSVORMEN = {"bv", "nv", "bvba", "cv", "vof", "commv", "sa", "srl", "sprl", "asbl",
                "vzw", "sc", "scrl", "se", "sca", "esv", "fve", "gmbh", "ltd", "inc", "plc"}


def titel(waarde):
    """KBO-namen staan in hoofdletters; maak er leesbare namen van."""
    naam = schoon(waarde)
    if not naam:
        return ""
    if len(naam) > 3 and naam.upper() == naam or (len(naam) > 3 and naam.lower() == naam):
        return " ".join(
            woord.upper() if woord.lower().strip(".,") in RECHTSVORMEN else woord
            for woord in _titel_woorden(naam)
        )
    return naam


def _titel_woorden(naam):
    if not naam:
        return []
    kleine_woorden = {"van", "de", "der", "den", "het", "in", "en", "la", "le", "les",
                      "des", "du", "et", "aux", "sur", "sous", "d'", "l'"}
    if True:
        delen = []
        for woord in naam.lower().split():
            if "'" in woord:
                voor, _, na = woord.partition("'")
                woord = voor + "'" + (na[:1].upper() + na[1:])
                delen.append(woord)
            elif woord in kleine_woorden and delen:
                delen.append(woord)
            else:
                # Ook na een koppelteken of apostrof komt een hoofdletter.
                stukken = re.split(r"([-'’])", woord)
                delen.append("".join(
                    stuk if stuk in "-'’" else stuk[:1].upper() + stuk[1:]
                    for stuk in stukken
                ))
    return delen


def formatteer_btw(waarde):
    """Belgisch ondernemingsnummer 0123456789 → BE 0123.456.789."""
    cijfers = re.sub(r"\D", "", str(waarde or ""))
    if len(cijfers) == 10:
        return f"BE {cijfers[:4]}.{cijfers[4:7]}.{cijfers[7:]}"
    if len(cijfers) == 9:
        return f"BE 0{cijfers[:3]}.{cijfers[3:6]}.{cijfers[6:]}"
    return schoon(waarde)


def sector_uit_nace(code):
    cijfers = re.sub(r"\D", "", str(code or ""))[:5]
    if len(cijfers) < 2:
        return ""
    afdeling = int(cijfers[:2])
    for bereik, sector in NACE_SECTOR:
        if afdeling in bereik:
            return sector
    return ""


def sector_uit_tekst(waarde):
    sleutel = zonder_accenten(waarde).strip().lower()
    if sleutel in SECTOR_ALIASSEN:
        return SECTOR_ALIASSEN[sleutel]
    for alias, sector in SECTOR_ALIASSEN.items():
        if alias and alias in sleutel:
            return sector
    return ""


def lees_tabel(pad):
    """Leest CSV (komma, puntkomma of tab) of TSV, met of zonder BOM."""
    ruwe_bytes = Path(pad).read_bytes()
    for codering in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            tekst = ruwe_bytes.decode(codering)
            break
        except UnicodeDecodeError:
            continue
    else:
        return [], []

    eerste = tekst[:4096]
    scheiding = ","
    try:
        scheiding = csv.Sniffer().sniff(eerste, delimiters=",;\t|").delimiter
    except csv.Error:
        telling = Counter(eerste.count(t) for t in ",;\t")
        scheiding = telling.most_common(1)[0][0] or ","

    lezer = csv.DictReader(io.StringIO(tekst), delimiter=scheiding)
    koppen = [schoon(k) for k in (lezer.fieldnames or [])]
    rijen = []
    for rij in lezer:
        rijen.append({schoon(k): v for k, v in rij.items() if k})
    return koppen, rijen


def vind_kolom(koppen, kandidaten):
    """Zoekt een kolomnaam (hoofdletterongevoelig, met aliassen)."""
    genormaliseerd = {zonder_accenten(k).lower().replace(" ", ""): k for k in koppen}
    for kandidaat in kandidaten:
        sleutel = zonder_accenten(kandidaat).lower().replace(" ", "")
        if sleutel in genormaliseerd:
            return genormaliseerd[sleutel]
    for kandidaat in kandidaten:
        sleutel = zonder_accenten(kandidaat).lower().replace(" ", "")
        for genaamde, origineel in genormaliseerd.items():
            if sleutel and sleutel in genaamde:
                return origineel
    return None


# ---------------------------------------------------------------------------
# KBO/BCE-bestanden
# ---------------------------------------------------------------------------
KBO_UITBREIDINGEN = {".csv", ".txt"}


def is_kbo_bestanden(bestanden):
    namen = " ".join(Path(b).name.lower() for b in bestanden)
    return (
        "denomination" in namen or "benaming" in namen
    ) and ("enterprise" in namen or "onderneming" in namen or "establishment" in namen)


def kbo_index(bestanden):
    """Koppelt bestandsnamen aan hun rol (denomination, address, …)."""
    index = {}
    for bestand in bestanden:
        naam = Path(bestand).name.lower()
        for rol in ("enterprise", "establishment", "address", "denomination", "activity", "contact", "branch"):
            if rol in naam:
                index.setdefault(rol, []).append(str(bestand))
                break
    return index


def lees_kbo(bestanden, index, limiet, provincies_filter, sector_filter, voortgang):
    """Leest de KBO-open-data-bestanden en levert kaartrijen."""
    # 1. Adressen: entiteit → (straat, postcode, gemeente)
    adressen = {}
    for pad in index.get("address", []):
        koppen, rijen = lees_tabel(pad)
        k_entiteit = vind_kolom(koppen, KBO_KOLOMMEN["entiteit"])
        k_straat = vind_kolom(koppen, KBO_KOLOMMEN["straat"])
        k_nummer = vind_kolom(koppen, KBO_KOLOMMEN["huisnummer"])
        k_postcode = vind_kolom(koppen, KBO_KOLOMMEN["postcode"])
        k_gemeente = vind_kolom(koppen, KBO_KOLOMMEN["gemeente"])
        k_type = vind_kolom(koppen, KBO_KOLOMMEN["adres_type"])
        if not k_entiteit:
            continue
        for rij in rijen:
            # REGO = maatschappelijke zetel; REEP = bijkantooradres. Beide bruikbaar,
            # maar de zetel krijgt voorrang als beide aanwezig zijn.
            soort_adres = schoon(rij.get(k_type)).upper() if k_type else ""
            if soort_adres and soort_adres not in ("REGO", "REEP"):
                continue
            straat = schoon(rij.get(k_straat)) if k_straat else ""
            nummer = schoon(rij.get(k_nummer)) if k_nummer else ""
            adressen[schoon(rij.get(k_entiteit))] = {
                "straat": f"{straat} {nummer}".strip(),
                "postcode": schoon(rij.get(k_postcode)) if k_postcode else "",
                "gemeente": schoon(rij.get(k_gemeente)) if k_gemeente else "",
            }
    voortgang("adressen", 20, f"{len(adressen)} adressen gelezen")

    # 2. Namen: per onderneming één Nederlandstalige (of eerste) benaming
    namen = {}
    for pad in index.get("denomination", []):
        koppen, rijen = lees_tabel(pad)
        k_entiteit = vind_kolom(koppen, KBO_KOLOMMEN["entiteit"])
        k_naam = vind_kolom(koppen, KBO_KOLOMMEN["naam"])
        k_taal = vind_kolom(koppen, ["Language", "Taal", "Langue"])
        k_type = vind_kolom(koppen, ["TypeOfDenomination", "TypeDenomination"])
        if not (k_entiteit and k_naam):
            continue
        for rij in rijen:
            entiteit = schoon(rij.get(k_entiteit))
            naam = titel(rij.get(k_naam))
            if not entiteit or not naam:
                continue
            taal = schoon(rij.get(k_taal)).upper() if k_taal else ""
            type_naam = schoon(rij.get(k_type)).upper() if k_type else ""
            score = (0 if taal in ("NL", "1") else 1) + (0 if type_naam in ("001", "1", "") else 1)
            huidig = namen.get(entiteit)
            if huidig is None or score < huidig[0]:
                namen[entiteit] = (score, naam)
    namen = {k: v[1] for k, v in namen.items()}
    voortgang("namen", 30, f"{len(namen)} handelsnamen gelezen")

    # 3. Activiteiten: hoofdactiviteit per onderneming
    activiteiten = {}
    for pad in index.get("activity", []):
        koppen, rijen = lees_tabel(pad)
        k_entiteit = vind_kolom(koppen, KBO_KOLOMMEN["entiteit"])
        k_nace = vind_kolom(koppen, KBO_KOLOMMEN["nace"])
        k_class = vind_kolom(koppen, KBO_KOLOMMEN["classificatie"])
        if not (k_entiteit and k_nace):
            continue
        for rij in rijen:
            classificatie = schoon(rij.get(k_class)).upper()
            if classificatie and classificatie not in ("MAIN", "HOOFD", "PRINCIPALE"):
                continue
            activiteiten[schoon(rij.get(k_entiteit))] = schoon(rij.get(k_nace))
    voortgang("activiteiten", 40, f"{len(activiteiten)} hoofdactiviteiten gelezen")

    # 4. Vestigingen (of ondernemingen als er geen vestigingentabel is)
    doel_index = index.get("establishment") or index.get("enterprise") or index.get("branch")
    rijen_uit = []
    for pad in doel_index:
        koppen, rijenset = lees_tabel(pad)
        k_vestiging = vind_kolom(koppen, KBO_KOLOMMEN["vestiging"])
        k_onderneming = vind_kolom(koppen, KBO_KOLOMMEN["onderneming"])
        k_start = vind_kolom(koppen, KBO_KOLOMMEN["start"])
        for rij in rijenset:
            nummer = schoon(rij.get(k_vestiging) or rij.get(k_onderneming))
            onderneming = schoon(rij.get(k_onderneming) or nummer)
            if not nummer:
                continue
            adres = adressen.get(nummer) or adressen.get(onderneming)
            if not adres or not adres["postcode"]:
                continue
            naam = namen.get(onderneming) or namen.get(nummer) or ""
            if not naam:
                continue
            sector = sector_uit_nace(activiteiten.get(onderneming) or activiteiten.get(nummer))
            rijen_uit.append({
                "naam": naam,
                "btw": onderneming,
                "sector": sector,
                "type": "Vestiging",
                "straat": adres["straat"],
                "postcode": adres["postcode"],
                "stad": adres["gemeente"],
                "start": schoon(rij.get(k_start)) if k_start else "",
            })
        if rijen_uit:
            break

    voortgang("vestigingen", 55, f"{len(rijen_uit)} kandidaten met adres")
    return rijen_uit


# ---------------------------------------------------------------------------
# Generieke CSV
# ---------------------------------------------------------------------------
GENERIEKE_ALIASSEN = {
    "naam": ["naam", "name", "bedrijf", "bedrijfsnaam", "company", "company_name", "firma",
             "onderneming", "handelsnaam", "denomination"],
    "btw": ["btw", "btw_nummer", "vat", "vat_number", "ondernemingsnummer", "kbo",
            "enterprisenumber", "btwnummer"],
    "sector": ["sector", "branche", "industry", "categorie", "category", "activiteit",
               "activities", "nace", "nacabel", "hoofdactiviteit"],
    "straat": ["straat", "street", "adres", "address", "straatnaam", "address_line"],
    "postcode": ["postcode", "zip", "zipcode", "postal_code", "cp", "pc"],
    "stad": ["stad", "gemeente", "city", "town", "plaats", "municipality", "commune"],
    "provincie": ["provincie", "province", "prov"],
    "precisie": ["precisie", "precision", "nauwkeurigheid"],
    "lat": ["lat", "latitude", "breedtegraad"],
    "lon": ["lon", "lng", "long", "longitude", "lengtegraad"],
    "werknemers": ["werknemers", "employees", "personeel", "headcount", "aantal_werknemers", "fte"],
    "omzet": ["omzet", "revenue", "turnover"],
    "opgericht": ["opgericht", "founded", "oprichtingsjaar", "startdate", "start"],
    "status": ["status", "staat", "state"],
    "website": ["website", "url", "site", "web"],
    "telefoon": ["telefoon", "phone", "telephone", "tel", "gsm"],
    "type": ["type", "vestigingstype", "establishment_type"],
}


def lees_generiek(pad, voortgang):
    koppen, rijen = lees_tabel(pad)
    if not rijen:
        return []
    kolommen = {veld: vind_kolom(koppen, aliassen) for veld, aliassen in GENERIEKE_ALIASSEN.items()}
    if not kolommen["naam"]:
        raise ValueError(
            "Geen naamkolom gevonden. Verwachte kolommen zijn bijvoorbeeld: "
            "naam, straat, postcode, stad, sector, werknemers, lat, lon."
        )
    uit = []
    for rij in rijen:
        def pak(veld):
            kolom = kolommen.get(veld)
            return schoon(rij.get(kolom)) if kolom else ""

        if not pak("naam"):
            continue
        uit.append({
            "naam": titel(pak("naam")),
            "btw": pak("btw"),
            "sector": pak("sector"),
            "type": pak("type") or "Vestiging",
            "straat": pak("straat"),
            "postcode": pak("postcode") or haal_postcode(pak("straat")),
            "stad": pak("stad"),
            "provincie": pak("provincie"),
            "lat": pak("lat"),
            "lon": pak("lon"),
            "werknemers": pak("werknemers"),
            "omzet": pak("omzet"),
            "opgericht": pak("opgericht"),
            "status": pak("status"),
            "website": pak("website"),
            "telefoon": pak("telefoon"),
            "precisie": pak("precisie"),
        })
    voortgang("lezen", 40, f"{len(uit)} rijen gelezen uit {Path(pad).name}")
    return uit


# ---------------------------------------------------------------------------
# Verrijken: coördinaten + provincie + sector
# ---------------------------------------------------------------------------


def verrijk(rijen, postcodes, provincies, voortgang):
    uit = []
    zonder_coordinaten = 0
    for i, rij in enumerate(rijen):
        lat = rij.get("lat")
        lon = rij.get("lon")
        try:
            lat, lon = float(str(lat).replace(",", ".")), float(str(lon).replace(",", "."))
        except (TypeError, ValueError):
            lat = lon = None

        postcode = "".join(c for c in str(rij.get("postcode") or "") if c.isdigit())
        kern = postcodes.zoek(postcode) if postcode else None

        precisie = schoon(rij.get("precisie")) or "adres"
        if lat is None or lon is None:
            if not kern:
                zonder_coordinaten += 1
                continue
            # Alleen de postcode is bekend: gebruik het gemeentezwaartepunt en
            # spreid de punten deterministisch, anders stapelen alle bedrijven
            # van dezelfde postcode op exact hetzelfde punt.
            lat, lon = kern["lat"], kern["lon"]
            spreiding = 0.012  # ≈ 1,3 km
            zaad = f"{rij.get('naam')}|{rij.get('straat')}|{rij.get('btw')}"
            hoek = (int(zlib.crc32(zaad.encode("utf-8"))) % 3600) / 3600 * 2 * math.pi
            afstand = 0.15 + (int(zlib.crc32(("a" + zaad).encode("utf-8"))) % 850) / 1000
            lat += math.cos(hoek) * spreiding * afstand
            lon += math.sin(hoek) * spreiding * afstand * 1.6
            precisie = "postcode"

        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            zonder_coordinaten += 1
            continue

        provincie = normaliseer_provincie(rij.get("provincie")) or provincies.zoek(lat, lon)
        stad = schoon(rij.get("stad")) or (kern["stad"] if kern else "")
        sector = sector_uit_tekst(rij.get("sector")) or sector_uit_nace(rij.get("sector"))

        uit.append({
            "naam": rij["naam"],
            "btw": formatteer_btw(rij.get("btw")),
            "sector": sector or "Overige diensten",
            "type": schoon(rij.get("type")) or "Vestiging",
            "straat": schoon(rij.get("straat")),
            "postcode": postcode.zfill(4) if postcode else "",
            "stad": stad,
            "provincie": provincie,
            "gewest": provincies.gewest(provincie),
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "werknemers": _getal(rij.get("werknemers")),
            "omzet": schoon(rij.get("omzet")),
            "opgericht": schoon(rij.get("opgericht")),
            "status": schoon(rij.get("status")) or "Actief",
            "website": schoon(rij.get("website")),
            "telefoon": schoon(rij.get("telefoon")),
            "precisie": precisie,
        })
        if i % 5000 == 0:
            voortgang("geocoderen", 55 + int(35 * i / max(1, len(rijen))),
                      f"{i} van {len(rijen)} rijen gegeocodeerd")

    if zonder_coordinaten:
        print(f"  · {zonder_coordinaten} rijen overgeslagen (geen bruikbaar adres of coördinaten)")
    return uit


def _getal(waarde):
    cijfers = re.sub(r"[^\d]", "", str(waarde or ""))
    return int(cijfers) if cijfers else 0


def stratificeer(rijen, limiet, seed=7):
    """Behoudt een representatieve selectie over provincies én sectoren."""
    if not limiet or len(rijen) <= limiet:
        return rijen
    random.seed(seed)
    emmers = defaultdict(list)
    for rij in rijen:
        emmers[(rij["provincie"], rij["sector"])].append(rij)
    for emmer in emmers.values():
        random.shuffle(emmer)

    sleutels = sorted(emmers, key=lambda k: -len(emmers[k]))
    selectie = []
    ronde = 0
    while len(selectie) < limiet:
        toegevoegd = False
        for sleutel in sleutels:
            emmer = emmers[sleutel]
            if len(emmer) > ronde:
                selectie.append(emmer[ronde])
                toegevoegd = True
                if len(selectie) >= limiet:
                    break
        if not toegevoegd:
            break
        ronde += 1
    return selectie


# ---------------------------------------------------------------------------
# Hoofdfunctie
# ---------------------------------------------------------------------------


def importeer(bron=None, doel_csv=STANDAARD_CSV, doel_json=STANDAARD_JSON, limiet=0,
              provincies_filter=None, sectoren_filter=None, voortgang=None):
    """Leest een bron, verrijkt de rijen en schrijft CSV + JSON."""
    voortgang = voortgang or (lambda fase, pct, melding: print(f"  [{pct:3d}%] {melding}"))
    provincies_filter = {normaliseer_provincie(p) or p for p in (provincies_filter or [])}
    sectoren_filter = {s for s in (sectoren_filter or []) if s}

    provincies = Provincies()
    postcodes = Postcodes(provincies=provincies)

    tijdelijk = None
    try:
        if bron is None:
            raise ValueError("Geen bron opgegeven (--bron map, zip of csv).")
        bron = Path(bron).expanduser()
        if not bron.exists():
            raise ValueError(f"Bron bestaat niet: {bron}")

        if bron.is_dir():
            bestanden = sorted(p for p in bron.rglob("*") if p.suffix.lower() in KBO_UITBREIDINGEN)
        elif bron.suffix.lower() == ".zip":
            tijdelijk = Path(tempfile.mkdtemp(prefix="kbo-"))
            with zipfile.ZipFile(bron) as archief:
                archief.extractall(tijdelijk)
            bestanden = sorted(p for p in tijdelijk.rglob("*") if p.suffix.lower() in KBO_UITBREIDINGEN)
        else:
            bestanden = [bron]

        if not bestanden:
            raise ValueError("Geen CSV-bestanden gevonden in de bron.")

        voortgang("starten", 5, f"{len(bestanden)} bestand(en) gevonden")

        if is_kbo_bestanden(bestanden):
            print("  · KBO/BCE-formaat herkend")
            index = kbo_index(bestanden)
            rijen = lees_kbo(bestanden, index, limiet, provincies_filter, sectoren_filter, voortgang)
            soort = "KBO/BCE open data"
            demo = False
        else:
            print("  · generieke CSV-export")
            rijen = []
            for bestand in bestanden:
                rijen.extend(lees_generiek(bestand, voortgang))
            soort = Path(bestanden[0]).name
            demo = False

        if not rijen:
            raise ValueError(
                "Geen bruikbare rijen gevonden. Controleer of het bestand adressen "
                "(straat/postcode) of coördinaten bevat."
            )

        voortgang("filteren", 90, "Filteren en verrijken…")
        if provincies_filter:
            rijen = [r for r in rijen if normaliseer_provincie(r.get("provincie")) in provincies_filter]
        if sectoren_filter:
            rijen = [r for r in rijen if r.get("sector") in sectoren_filter]

        rijen = verrijk(rijen, postcodes, provincies, voortgang)
        rijen = stratificeer(rijen, limiet)

        # Deterministisch sorteren + id's
        rijen.sort(key=lambda r: (r["provincie"], r["stad"], r["naam"], r["straat"]))
        for i, rij in enumerate(rijen, start=1):
            rij["id"] = i

        schrijf_csv(rijen, doel_csv)
        import bouw_data

        bouw_data.schrijf_meta(doel_csv, {
            "demo": demo,
            "bron": soort,
            "geimporteerd": "2026-11-04",
        })
        resultaat = bouw_data.schrijf_json(rijen, doel=doel_json, bron=soort, demo=demo)
        voortgang("klaar", 100, f"{len(rijen)} vestigingen weggeschreven")
        return {
            "bron": soort,
            "vestigingen": len(rijen),
            "bedrijven": len({r["naam"] for r in rijen}),
            "provincies": dict(Counter(r["provincie"] for r in rijen).most_common()),
            "sectoren": dict(Counter(r["sector"] for r in rijen).most_common()),
            "csv": str(doel_csv),
            "json": str(doel_json),
            "meta": resultaat["meta"],
        }
    finally:
        if tijdelijk and tijdelijk.exists():
            shutil.rmtree(tijdelijk, ignore_errors=True)


VELDEN = ["id", "naam", "btw", "sector", "type", "straat", "postcode", "stad", "provincie",
          "gewest", "lat", "lon", "werknemers", "omzet", "opgericht", "status", "website",
          "telefoon", "precisie"]


def schrijf_csv(rijen, pad=STANDAARD_CSV):
    pad = Path(pad)
    pad.parent.mkdir(parents=True, exist_ok=True)
    with pad.open("w", newline="", encoding="utf-8") as f:
        schrijver = csv.DictWriter(f, fieldnames=VELDEN, extrasaction="ignore")
        schrijver.writeheader()
        schrijver.writerows(rijen)
    return pad


def main():
    parser = argparse.ArgumentParser(
        description="Importeer Belgische bedrijfsdata (KBO/BCE of eigen CSV) voor de kaart.")
    parser.add_argument("--bron", required=True, help="Map, zip of CSV-bestand met bedrijfsdata")
    parser.add_argument("--limiet", type=int, default=0,
                        help="Maximaal aantal vestigingen (0 = alles; stratificeert over provincies/sectoren)")
    parser.add_argument("--provincies", default="", help="Komma-lijst, bijv. 'Antwerpen,Limburg'")
    parser.add_argument("--sectoren", default="", help="Komma-lijst met sectornamen")
    args = parser.parse_args()

    print(f"📥 Import uit {args.bron}")
    resultaat = importeer(
        bron=args.bron,
        limiet=args.limiet,
        provincies_filter=[p for p in args.provincies.split(",") if p.strip()],
        sectoren_filter=[s.strip() for s in args.sectoren.split(",") if s.strip()],
    )
    print("\n✔ Import klaar")
    print(f"  bron          : {resultaat['bron']}")
    print(f"  vestigingen   : {resultaat['vestigingen']}")
    print(f"  bedrijven     : {resultaat['bedrijven']}")
    print(f"  CSV           : {resultaat['csv']}")
    print(f"  JSON          : {resultaat['json']}")
    print("\n  Herstart of herlaad de site om de nieuwe data te zien.")


if __name__ == "__main__":
    main()
