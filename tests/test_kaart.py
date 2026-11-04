# -*- coding: utf-8 -*-
"""Tests voor de bedrijvenkaart: geocodering, import en de webserver.

Draai met:  python3 -m unittest discover -s tests -v
"""

import csv
import json
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

WORTEL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(WORTEL / "scripts"))

import bouw_data  # noqa: E402
import geo  # noqa: E402
import kbo_import  # noqa: E402

WEB = WORTEL / "web"


class TestPostcodes(unittest.TestCase):
    """Postcode → gemeente + coördinaten (zonder externe diensten)."""

    @classmethod
    def setUpClass(cls):
        cls.postcodes = geo.Postcodes()

    def test_bekende_postcodes_hebben_coordinaten(self):
        for code, provincie in [("1000", "Brussel"), ("9000", "Oost-Vlaanderen"),
                                ("2000", "Antwerpen"), ("8000", "West-Vlaanderen"),
                                ("7000", "Henegouwen"), ("6700", "Luxemburg")]:
            kern = self.postcodes.zoek(code)
            self.assertIsNotNone(kern, code)
            self.assertEqual(kern["provincie"], provincie, code)
            self.assertAlmostEqual(kern["lat"], 50.6, delta=1.2)
            self.assertAlmostEqual(kern["lon"], 4.6, delta=1.6)

    def test_grote_stad_wint_van_deelgemeente(self):
        self.assertEqual(self.postcodes.zoek("4000")["stad"], "Liège")
        self.assertEqual(self.postcodes.zoek("1000")["stad"], "Bruxelles")

    def test_onbekende_postcode(self):
        self.assertIsNone(self.postcodes.zoek("9999"))
        self.assertIsNone(self.postcodes.zoek(""))

    def test_postcode_uit_tekst_halen(self):
        self.assertEqual(geo.haal_postcode("Rue de la Loi 16, 1000 Bruxelles"), "1000")
        self.assertEqual(geo.haal_postcode("Kerkstraat 5, 9000 Gent"), "9000")
        self.assertEqual(geo.haal_postcode("Geen postcode hier"), "")

    def test_provincienamen_normaliseren(self):
        self.assertEqual(geo.normaliseer_provincie("liège"), "Luik")
        self.assertEqual(geo.normaliseer_provincie("PROVINCIE ANTWERPEN"), "Antwerpen")
        self.assertEqual(geo.normaliseer_provincie("Flandre orientale"), "Oost-Vlaanderen")
        self.assertEqual(geo.normaliseer_provincie("onzin"), "")


class TestProvinciegrenzen(unittest.TestCase):
    """Punt-in-polygoon op de meegeleverde provinciegrenzen."""

    @classmethod
    def setUpClass(cls):
        cls.provincies = geo.Provincies()

    def test_alle_provincies_geladen(self):
        namen = {p["naam"] for p in self.provincies.features}
        self.assertEqual(len(namen), 11)
        self.assertIn("Antwerpen", namen)
        self.assertIn("Brussel", namen)

    def test_steden_liggen_in_de_juiste_provincie(self):
        gevallen = [
            (51.2194, 4.4025, "Antwerpen"),
            (51.0543, 3.7174, "Oost-Vlaanderen"),
            (50.6326, 5.5797, "Luik"),
            (50.4674, 4.8718, "Namen"),
            (50.4108, 4.4446, "Henegouwen"),
            (49.6833, 5.8167, "Luxemburg"),
            (50.8798, 4.7005, "Vlaams-Brabant"),
            (50.7167, 4.6000, "Waals-Brabant"),
            (50.9307, 5.3325, "Limburg"),
            (51.2093, 3.2247, "West-Vlaanderen"),
            (50.8467, 4.3525, "Brussel"),
        ]
        for lat, lon, verwacht in gevallen:
            self.assertEqual(self.provincies.zoek(lat, lon), verwacht, (lat, lon))

    def test_buiten_belgie(self):
        self.assertEqual(self.provincies.zoek(52.3676, 4.9041), "")   # Amsterdam
        self.assertEqual(self.provincies.zoek(None, None), "")

    def test_gewest_van_provincie(self):
        self.assertEqual(self.provincies.gewest("Antwerpen"), "Vlaanderen")
        self.assertEqual(self.provincies.gewest("Luik"), "Wallonië")
        self.assertEqual(self.provincies.gewest("Brussel"), "Brussels Hoofdstedelijk Gewest")


class TestBouwData(unittest.TestCase):
    """CSV → JSON, inclusief Engelse kolomnamen en puntkomma-scheiding."""

    def test_engelse_kolommen_en_puntkomma(self):
        with tempfile.TemporaryDirectory() as map:
            pad = Path(map) / "export.csv"
            pad.write_text(
                "name;street;zip;city;latitude;longitude;industry;employees\n"
                "Acme BV;Kerkstraat 1;9000;Gent;51.0543;3.7174;Software;42\n"
                "Zonder coordinaten;Straat 2;2000;Antwerpen;;;Retail;3\n",
                encoding="utf-8")
            rijen = bouw_data.lees_csv(pad)
        self.assertEqual(len(rijen), 1, "rij zonder coördinaten hoort overgeslagen te worden")
        rij = rijen[0]
        self.assertEqual(rij["naam"], "Acme BV")
        self.assertEqual(rij["stad"], "Gent")
        self.assertEqual(rij["sector"], "Software")
        self.assertEqual(rij["werknemers"], 42)
        self.assertEqual(rij["precisie"], "adres")

    def test_ongeldige_coordinaten_worden_gefilterd(self):
        with tempfile.TemporaryDirectory() as map:
            pad = Path(map) / "raar.csv"
            pad.write_text(
                "naam,lat,lon\n"
                "Goed,50.85,4.35\n"
                "Te ver,120.0,4.35\n"
                "Tekst,abc,def\n",
                encoding="utf-8")
            rijen = bouw_data.lees_csv(pad)
        self.assertEqual([r["naam"] for r in rijen], ["Goed"])

    def test_json_heeft_metadata_en_sectorkleuren(self):
        rijen = [
            {"id": 1, "naam": "A", "sector": "Technologie & software", "gewest": "Vlaanderen",
             "provincie": "Antwerpen", "werknemers": 10},
            {"id": 2, "naam": "A", "sector": "Bouw & vastgoed", "gewest": "Vlaanderen",
             "provincie": "Antwerpen", "werknemers": 5},
            {"id": 3, "naam": "B", "sector": "Bouw & vastgoed", "gewest": "Wallonië",
             "provincie": "Luik", "werknemers": 1},
        ]
        with tempfile.TemporaryDirectory() as map:
            doel = Path(map) / "uit.json"
            payload = bouw_data.schrijf_json(rijen, doel=doel, bron="test", demo=False)
            self.assertTrue(doel.exists())
            inhoud = json.loads(doel.read_text(encoding="utf-8"))
        self.assertEqual(payload["meta"]["vestigingen"], 3)
        self.assertEqual(payload["meta"]["bedrijven"], 2)
        self.assertEqual(payload["meta"]["werknemers"], 16)
        self.assertFalse(inhoud["meta"]["demo"])
        self.assertEqual(len(inhoud["sectoren"]), 2)
        self.assertTrue(all(s["kleur"].startswith("#") for s in inhoud["sectoren"]))


class TestKboImport(unittest.TestCase):
    """Hulpjes en de volledige import van een KBO-formaat export."""

    def test_namen_leesbaar_maken(self):
        self.assertEqual(kbo_import.titel("ACME SOFTWARE BV"), "Acme Software BV")
        self.assertEqual(kbo_import.titel("ALGEMENE BOUW CLAES-SEGERS"), "Algemene Bouw Claes-Segers")
        self.assertEqual(kbo_import.titel("Bakkerij Peeters"), "Bakkerij Peeters")

    def test_btw_nummer_formatteren(self):
        self.assertEqual(kbo_import.formatteer_btw("0123456789"), "BE 0123.456.789")
        self.assertEqual(kbo_import.formatteer_btw("123456789"), "BE 0123.456.789")
        self.assertEqual(kbo_import.formatteer_btw("BE 0414709.866"), "BE 0414.709.866")

    def test_nace_naar_sector(self):
        self.assertEqual(kbo_import.sector_uit_nace("62010"), "Technologie & software")
        self.assertEqual(kbo_import.sector_uit_nace("49410"), "Logistiek & transport")
        self.assertEqual(kbo_import.sector_uit_nace("86210"), "Zorg & biotech")
        self.assertEqual(kbo_import.sector_uit_nace("41201"), "Bouw & vastgoed")
        self.assertEqual(kbo_import.sector_uit_nace("10110"), "Voeding & dranken")
        self.assertEqual(kbo_import.sector_uit_nace(""), "")

    def test_stratificeren_bewaart_spreiding(self):
        rijen = []
        for i in range(600):
            rijen.append({"provincie": ["Antwerpen", "Luik", "Gent"][i % 3],
                          "sector": ["A", "B"][i % 2], "naam": f"bedrijf {i}"})
        selectie = kbo_import.stratificeer(rijen, 60)
        self.assertEqual(len(selectie), 60)
        self.assertEqual({r["provincie"] for r in selectie}, {"Antwerpen", "Luik", "Gent"})
        self.assertEqual({r["sector"] for r in selectie}, {"A", "B"})

    def _schrijf_kbo_export(self, map_pad: Path):
        rijen = {
            "enterprise.csv": [
                {"EnterpriseNumber": "0123456789", "Status": "AC", "StartDate": "2010-01-01"},
                {"EnterpriseNumber": "0987654321", "Status": "AC", "StartDate": "2015-01-01"},
            ],
            "establishment.csv": [
                {"EstablishmentNumber": "0123456789", "EnterpriseNumber": "0123456789", "StartDate": "2010-01-01"},
                {"EstablishmentNumber": "2987654321", "EnterpriseNumber": "0987654321", "StartDate": "2015-01-01"},
                {"EstablishmentNumber": "3987654321", "EnterpriseNumber": "0987654321", "StartDate": "2018-01-01"},
            ],
            "address.csv": [
                {"EntityNumber": "0123456789", "TypeOfAddress": "REGO", "Zipcode": "9000",
                 "MunicipalityNL": "Gent", "StreetNL": "Kerkstraat", "HouseNumber": "12"},
                {"EntityNumber": "2987654321", "TypeOfAddress": "REGO", "Zipcode": "4000",
                 "MunicipalityNL": "Liège", "StreetNL": "Rue Saint-Gilles", "HouseNumber": "5"},
                {"EntityNumber": "3987654321", "TypeOfAddress": "REGO", "Zipcode": "2018",
                 "MunicipalityNL": "Antwerpen", "StreetNL": "Meir", "HouseNumber": "80"},
            ],
            "denomination.csv": [
                {"EntityNumber": "0123456789", "Language": "NL", "TypeOfDenomination": "001",
                 "Denomination": "ACME SOFTWARE BV"},
                {"EntityNumber": "0987654321", "Language": "FR", "TypeOfDenomination": "001",
                 "Denomination": "LOGISTIQUE DUBOIS SA"},
            ],
            "activity.csv": [
                {"EntityNumber": "0123456789", "NaceCode": "62010", "Classification": "MAIN"},
                {"EntityNumber": "0987654321", "NaceCode": "49410", "Classification": "MAIN"},
            ],
        }
        for naam, inhoud in rijen.items():
            with (map_pad / naam).open("w", newline="", encoding="utf-8") as f:
                schrijver = csv.DictWriter(f, fieldnames=list(inhoud[0].keys()))
                schrijver.writeheader()
                schrijver.writerows(inhoud)

    def test_volledige_kbo_import(self):
        with tempfile.TemporaryDirectory() as map_pad:
            map_pad = Path(map_pad)
            self._schrijf_kbo_export(map_pad)
            doel_csv = map_pad / "bedrijven.csv"
            doel_json = map_pad / "bedrijven.json"
            resultaat = kbo_import.importeer(
                bron=map_pad, doel_csv=doel_csv, doel_json=doel_json,
                voortgang=lambda *_: None)

            self.assertEqual(resultaat["vestigingen"], 3)
            self.assertEqual(resultaat["bedrijven"], 2)
            self.assertTrue(doel_csv.exists() and doel_json.exists())

            data = json.loads(doel_json.read_text(encoding="utf-8"))
            self.assertEqual(data["meta"]["vestigingen"], 3)
            self.assertFalse(data["meta"]["demo"])
            self.assertEqual(data["meta"]["bron"], "KBO/BCE open data")

            per_naam = {r["naam"]: r for r in data["bedrijven"]}
            self.assertIn("Acme Software BV", per_naam)
            acme = per_naam["Acme Software BV"]
            self.assertEqual(acme["sector"], "Technologie & software")
            self.assertEqual(acme["provincie"], "Oost-Vlaanderen")
            self.assertEqual(acme["btw"], "BE 0123.456.789")
            self.assertEqual(acme["precisie"], "postcode")
            # Postcode 2018 ligt in Antwerpen; de stad komt uit de adrestabel.
            logistiek = per_naam["Logistique Dubois SA"]
            self.assertEqual(logistiek["provincie"], "Luik")
            self.assertEqual(logistiek["sector"], "Logistiek & transport")

    def test_generieke_csv_import(self):
        with tempfile.TemporaryDirectory() as map_pad:
            map_pad = Path(map_pad)
            bron = map_pad / "crm.csv"
            bron.write_text(
                "bedrijfsnaam,adres,postcode,gemeente,branche,personeel\n"
                "Studio Noord,Meir 12,2000,Antwerpen,marketing,25\n"
                "Zorgpunt Zuid,Place Saint-Lambert 3,4000,Liège,zorg,140\n",
                encoding="utf-8")
            resultaat = kbo_import.importeer(
                bron=bron, doel_csv=map_pad / "uit.csv", doel_json=map_pad / "uit.json",
                voortgang=lambda *_: None)
            data = json.loads((map_pad / "uit.json").read_text(encoding="utf-8"))

        self.assertEqual(resultaat["vestigingen"], 2)
        self.assertEqual(data["meta"]["bedrijven"], 2)
        sectoren = {r["naam"]: r["sector"] for r in data["bedrijven"]}
        self.assertEqual(sectoren["Studio Noord"], "Media & marketing")
        self.assertEqual(sectoren["Zorgpunt Zuid"], "Zorg & biotech")
        self.assertEqual(data["meta"]["werknemers"], 165)


class TestWebserver(unittest.TestCase):
    """De server levert de kaart, de data en blokkeert paden buiten web/."""

    @classmethod
    def setUpClass(cls):
        import importlib
        sys.path.insert(0, str(WORTEL))
        cls.serve = importlib.import_module("serve")
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), cls.serve.KaartHandler)
        cls.poort = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def _get(self, pad):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{self.poort}{pad}", timeout=5) as antwoord:
                return antwoord.status, antwoord.headers.get("Content-Type"), antwoord.read()
        except urllib.error.HTTPError as fout:
            return fout.code, fout.headers.get("Content-Type"), fout.read()

    def test_homepage_is_de_kaart(self):
        with urllib.request.urlopen(f"http://127.0.0.1:{self.poort}/", timeout=5) as antwoord:
            self.assertEqual(antwoord.status, 200)
            self.assertIn("text/html", antwoord.headers.get("Content-Type"))
            self.assertEqual(antwoord.headers.get("Cache-Control"), "no-store")
            body = antwoord.read()
        self.assertIn(b"Bedrijvenkaart", body)

    def test_kaart_alias(self):
        self.assertEqual(self._get("/kaart")[0], 200)

    def test_console_blijft_beschikbaar(self):
        code, _, body = self._get("/console")
        self.assertEqual(code, 200)
        self.assertIn(b"Universele Gids", body)

    def test_data_api(self):
        code, inhoudstype, body = self._get("/api/bedrijven")
        self.assertEqual(code, 200)
        self.assertIn("json", inhoudstype)
        data = json.loads(body)
        self.assertIn("bedrijven", data)
        self.assertIn("sectoren", data)
        self.assertGreater(len(data["bedrijven"]), 0)
        self.assertGreater(len(data["sectoren"]), 0)

    def test_sectoren_api(self):
        code, _, body = self._get("/api/sectoren")
        self.assertEqual(code, 200)
        data = json.loads(body)
        self.assertTrue(all({"naam", "kleur", "aantal"} <= set(s) for s in data["sectoren"]))

    def test_statische_bestanden(self):
        for pad in ("/kaart.js", "/kaart.css", "/data/provincies.geojson",
                    "/vendor/leaflet/leaflet.js"):
            code, _, body = self._get(pad)
            self.assertEqual(code, 200, pad)
            self.assertGreater(len(body), 100, pad)

    def test_pad_traversal_geblokkeerd(self):
        self.assertEqual(self._get("/serve.py")[0], 404)
        self.assertIn(self._get("/../serve.py")[0], (403, 404))

    def test_onbekende_route_geeft_404(self):
        code, inhoudstype, body = self._get("/bestaat-niet")
        self.assertEqual(code, 404)
        self.assertIn("fout", json.loads(body))


if __name__ == "__main__":
    unittest.main()
