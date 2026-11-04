#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bouwt de kaartdata: data/bedrijven.csv  →  web/data/bedrijven.json

Het CSV-bestand is de bron. Dit script zet het om naar het compacte JSON-formaat
dat de kaart in de browser laadt.

Gebruik:  python3 scripts/bouw_data.py
          python3 scripts/bouw_data.py --csv mijn-export.csv
"""

import argparse
import csv
import json
from pathlib import Path

WORTEL = Path(__file__).resolve().parent.parent
STANDAARD_CSV = WORTEL / "data" / "bedrijven.csv"
DOEL_JSON = WORTEL / "web" / "data" / "bedrijven.json"

# Kolomaliassen: zo werkt ook een export met Engelse of afwijkende kopjes.
ALIASSEN = {
    "naam": ["naam", "name", "bedrijfsnaam", "company", "company_name", "firma", "onderneming"],
    "btw": ["btw", "btw_nummer", "vat", "vat_number", "ondernemingsnummer", "kbo"],
    "sector": ["sector", "branche", "industry", "categorie", "category", "activiteit"],
    "type": ["type", "vestigingstype", "establishment_type"],
    "straat": ["straat", "street", "adres", "address", "address_line", "straatnaam"],
    "postcode": ["postcode", "zip", "zipcode", "postal_code", "cp"],
    "stad": ["stad", "gemeente", "city", "town", "plaats", "municipality"],
    "provincie": ["provincie", "province", "prov"],
    "gewest": ["gewest", "region", "regio"],
    "lat": ["lat", "latitude", "breedtegraad", "y"],
    "lon": ["lon", "lng", "long", "longitude", "lengtegraad", "x"],
    "werknemers": ["werknemers", "employees", "personeel", "headcount", "aantal_werknemers", "fte"],
    "omzet": ["omzet", "revenue", "turnover", "omzet_band"],
    "opgericht": ["opgericht", "founded", "oprichtingsjaar", "founding_year"],
    "status": ["status", "staat", "state"],
    "website": ["website", "url", "site", "web"],
    "telefoon": ["telefoon", "phone", "telephone", "tel", "gsm"],
    "precisie": ["precisie", "precision", "nauwkeurigheid"],
}

SECTOR_KLEUREN = {
    "Technologie & software": "#4f46e5",
    "Logistiek & transport": "#0ea5e9",
    "Voeding & dranken": "#ea580c",
    "Bouw & vastgoed": "#b45309",
    "Zorg & biotech": "#e11d48",
    "Financiën & verzekeringen": "#0f766e",
    "Industrie & maakbedrijf": "#475569",
    "Energie & milieu": "#65a30d",
    "Retail & e-commerce": "#db2777",
    "Transport & mobiliteit": "#2563eb",
    "Media & marketing": "#7c3aed",
    "Onderwijs & opleiding": "#0891b2",
}
FALLBACK_KLEUREN = ["#64748b", "#a16207", "#9333ea", "#15803d", "#be123c", "#0369a1"]


def normaliseer(kop):
    return str(kop or "").strip().lower().replace(" ", "_").replace("-", "_")


def veldkoppen(koppen):
    """Koppelt de kolommen van het CSV-bestand aan onze vaste velden."""
    genormaliseerd = {normaliseer(k): k for k in koppen}
    koppeling = {}
    for veld, aliassen in ALIASSEN.items():
        for alias in aliassen:
            if alias in genormaliseerd:
                koppeling[veld] = genormaliseerd[alias]
                break
    return koppeling


def tekst(waarde):
    return " ".join(str(waarde or "").split())


def getal(waarde, standaard=0):
    ruw = tekst(waarde).replace("€", "").replace(" ", "").replace(".", "").replace(",", ".")
    if not ruw:
        return standaard
    cijfers = "".join(c for c in ruw if c.isdigit() or c in "-.")
    try:
        return int(float(cijfers))
    except ValueError:
        return standaard


def coordinaten(waarde):
    ruw = tekst(waarde).replace(",", ".")
    try:
        return float(ruw)
    except ValueError:
        return None


def lees_csv(pad: Path):
    with pad.open(newline="", encoding="utf-8-sig") as f:
        monster = f.read(8192)
        f.seek(0)
        try:
            dialect = csv.Sniffer().sniff(monster, delimiters=",;\t|")
            scheidingsteken = dialect.delimiter
        except csv.Error:
            scheidingsteken = ","
        lezer = csv.DictReader(f, delimiter=scheidingsteken)
        koppeling = veldkoppen(lezer.fieldnames or [])
        rijen = []
        for nummer, rij in enumerate(lezer, start=1):
            def pak(veld):
                kolom = koppeling.get(veld)
                return rij.get(kolom) if kolom else None

            lat, lon = coordinaten(pak("lat")), coordinaten(pak("lon"))
            if lat is None or lon is None:
                continue
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                continue
            rijen.append({
                "id": nummer,
                "naam": tekst(pak("naam")) or f"Bedrijf {nummer}",
                "btw": tekst(pak("btw")),
                "sector": tekst(pak("sector")) or "Overig",
                "type": tekst(pak("type")) or "Vestiging",
                "straat": tekst(pak("straat")),
                "postcode": tekst(pak("postcode")),
                "stad": tekst(pak("stad")),
                "provincie": tekst(pak("provincie")),
                "gewest": tekst(pak("gewest")),
                "lat": round(lat, 6),
                "lon": round(lon, 6),
                "werknemers": max(0, getal(pak("werknemers"))),
                "omzet": tekst(pak("omzet")),
                "opgericht": tekst(pak("opgericht")),
                "status": tekst(pak("status")) or "Onbekend",
                "website": tekst(pak("website")),
                "telefoon": tekst(pak("telefoon")),
                "precisie": tekst(pak("precisie")) or "adres",
            })
    return rijen


def hoofdletters(rijen):
    """Sector-metadata (kleur, volgorde, aantal) voor de legenda en filters."""
    from collections import Counter

    telling = Counter(r["sector"] for r in rijen)
    sectoren = []
    for i, (naam, aantal) in enumerate(sorted(telling.items(), key=lambda kv: (-kv[1], kv[0]))):
        sectoren.append({
            "naam": naam,
            "kleur": SECTOR_KLEUREN.get(naam, FALLBACK_KLEUREN[i % len(FALLBACK_KLEUREN)]),
            "aantal": aantal,
        })
    return sectoren


def schrijf_json(rijen, doel=DOEL_JSON, bron="bedrijven.csv", demo=False):
    """Schrijft de kaart-JSON voor een lijst verrijkte rijen."""
    payload = {
        "meta": {
            "bron": bron,
            "bijgewerkt": "2026-11-04",
            "dekking": "België",
            "bedrijven": len({r["naam"] for r in rijen}),
            "vestigingen": len(rijen),
            "werknemers": sum(int(r.get("werknemers") or 0) for r in rijen),
            "gewesten": sorted({r["gewest"] for r in rijen if r.get("gewest")}),
            "provincies": sorted({r["provincie"] for r in rijen if r.get("provincie")}),
            "demo": demo,
            "opmerking": (
                "Demo-dataset — namen, BTW-nummers en cijfers zijn verzonnen; "
                "de plaatsen en coördinaten zijn echt."
            ) if demo else "",
        },
        "sectoren": hoofdletters(rijen),
        "bedrijven": [
            {k: r.get(k) for k in ("id", "naam", "btw", "sector", "type", "straat", "postcode",
                                   "stad", "provincie", "gewest", "lat", "lon", "werknemers",
                                   "omzet", "opgericht", "status", "website", "telefoon",
                                   "precisie")}
            for r in rijen
        ],
    }
    doel = Path(doel)
    doel.parent.mkdir(parents=True, exist_ok=True)
    doel.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return payload


def main():
    parser = argparse.ArgumentParser(description="CSV → JSON voor de bedrijvenkaart")
    parser.add_argument("--csv", type=Path, default=STANDAARD_CSV)
    parser.add_argument("--uit", type=Path, default=DOEL_JSON)
    args = parser.parse_args()

    if not args.csv.exists():
        raise SystemExit(f"CSV niet gevonden: {args.csv}")

    rijen = lees_csv(args.csv)
    meta = lees_meta(args.csv)
    payload = schrijf_json(rijen, doel=args.uit, bron=meta.get("bron") or args.csv.name,
                           demo=bool(meta.get("demo")))
    print(f"✔ {len(rijen)} vestigingen · {payload['meta']['bedrijven']} bedrijven → {args.uit} "
          f"({args.uit.stat().st_size / 1024:.0f} kB)")


META_NAAST_CSV = "bedrijven.meta.json"


def lees_meta(pad):
    """Sidecar met herkomst van de dataset (demo of een echte import)."""
    naast = Path(pad).with_name(META_NAAST_CSV)
    if not naast.exists():
        return {}
    try:
        return json.loads(naast.read_text(encoding="utf-8"))
    except ValueError:
        return {}


def schrijf_meta(pad, meta):
    naast = Path(pad).with_name(META_NAAST_CSV)
    naast.parent.mkdir(parents=True, exist_ok=True)
    naast.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
