#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bedrijvenkaart België — webserver (pure Python-stdlib, geen dependencies).

Starten:   python3 serve.py            (poort 8080, bereikbaar op 0.0.0.0)
           PORT=9000 python3 serve.py

Routes:
    GET  /                      → de bedrijvenkaart (web/index.html)
    GET  /kaart, /kaart/        → idem
    GET  /console               → de oude agentenconsole (web/console.html)
    GET  /api/bedrijven         → alle vestigingen + metadata (JSON)
    GET  /api/sectoren          → sectoroverzicht met kleuren en aantallen
    GET  /api/import/status     → status van de KBO-import
    POST /api/import            → start de KBO/CSE-import op de achtergrond
    GET  /*                     → statische bestanden uit web/

De kaart draait volledig in de browser; de server levert alleen bestanden en data.
"""

import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

WORTEL = Path(__file__).resolve().parent
WEBMAP = WORTEL / "web"
DATAJSON = WEBMAP / "data" / "bedrijven.json"
POORT = int(os.environ.get("PORT", "8080"))

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".csv": "text/csv; charset=utf-8",
    ".geojson": "application/geo+json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
}

# Eén import tegelijk; de status is leesbaar via /api/import/status.
IMPORT_SLOT = threading.Lock()
IMPORT_STATUS = {
    "bezig": False,
    "fase": "wachten",
    "melding": "Nog geen import gestart.",
    "voortgang": 0,
    "resultaat": None,
}


class KaartHandler(BaseHTTPRequestHandler):
    server_version = "Bedrijvenkaart/1.0"
    protocol_version = "HTTP/1.1"

    # ---------------- GET ----------------
    def do_GET(self):
        pad = urlparse(self.path).path

        if pad in ("/", "/index.html", "/kaart", "/kaart/"):
            self._bestand(WEBMAP / "index.html", cache=False)
            return
        if pad in ("/console", "/console/"):
            self._bestand(WEBMAP / "console.html", cache=False)
            return
        if pad == "/api/bedrijven":
            self._data()
            return
        if pad == "/api/sectoren":
            self._sectoren()
            return
        if pad == "/api/import/status":
            self._json(dict(IMPORT_STATUS))
            return

        self._statisch(pad)

    # ---------------- POST ----------------
    def do_POST(self):
        pad = urlparse(self.path).path
        if pad == "/api/import":
            self._start_import()
            return
        self._fout(404, "Onbekende route.")

    # ---------------- API ----------------
    def _data(self):
        if not DATAJSON.exists():
            self._fout(503, "Kaartdata ontbreekt. Voer 'python3 scripts/bouw_data.py' uit.")
            return
        body = DATAJSON.read_bytes()
        self._verstuur(200, "application/json; charset=utf-8", body, cache=False)

    def _sectoren(self):
        if not DATAJSON.exists():
            self._fout(503, "Kaartdata ontbreekt.")
            return
        data = json.loads(DATAJSON.read_text(encoding="utf-8"))
        self._json({"sectoren": data.get("sectoren", []), "meta": data.get("meta", {})})

    def _start_import(self):
        if IMPORT_SLOT.locked():
            self._fout(409, "Er loopt al een import.")
            return

        lengte = int(self.headers.get("Content-Length", 0) or 0)
        try:
            verzoek = json.loads(self.rfile.read(lengte) or b"{}") if lengte else {}
        except ValueError:
            self._fout(400, "Ongeldige JSON.")
            return

        def werk():
            with IMPORT_SLOT:
                IMPORT_STATUS.update({"bezig": True, "fase": "starten", "voortgang": 0,
                                      "melding": "Import gestart…", "resultaat": None})
                try:
                    sys.path.insert(0, str(WORTEL / "scripts"))
                    import kbo_import  # late import: alleen nodig bij gebruik

                    def voortgang(fase, percentage, melding):
                        IMPORT_STATUS.update({"fase": fase, "voortgang": percentage, "melding": melding})

                    resultaat = kbo_import.importeer(
                        doel_csv=WORTEL / "data" / "bedrijven.csv",
                        doel_json=DATAJSON,
                        limiet=int(verzoek.get("limiet") or 0),
                        provincies=verzoek.get("provincies") or [],
                        sectoren=verzoek.get("sectoren") or [],
                        voortgang=voortgang,
                    )
                    IMPORT_STATUS["resultaat"] = resultaat
                    IMPORT_STATUS["melding"] = (
                        f"Klaar: {resultaat.get('vestigingen', 0):,} vestigingen "
                        f"van {resultaat.get('bedrijven', 0):,} bedrijven."
                    ).replace(",", ".")
                except Exception as fout:  # noqa: BLE001 — status moet altijd eindigen
                    IMPORT_STATUS["melding"] = f"Import mislukt: {fout}"
                    IMPORT_STATUS["resultaat"] = {"fout": str(fout)}
                finally:
                    IMPORT_STATUS["bezig"] = False

        threading.Thread(target=werk, daemon=True).start()
        self._json({"gestart": True, "status": dict(IMPORT_STATUS)}, code=202)

    # ---------------- statisch ----------------
    def _statisch(self, pad):
        ruw = pad.lstrip("/") or "index.html"
        doel = (WEBMAP / ruw).resolve()
        if WEBMAP not in doel.parents and doel != WEBMAP:
            self._fout(403, "Geen toegang.")
            return
        if doel.is_dir():
            doel = doel / "index.html"
        if not doel.is_file():
            self._fout(404, "Niet gevonden.")
            return
        # Alleen de meegeleverde bibliotheken mogen in de browsercache; eigen
        # HTML/CSS/JS/data moet altijd vers zijn (na een import of aanpassing).
        mag_cachen = ruw.startswith("vendor/")
        self._bestand(doel, cache=mag_cachen)

    def _bestand(self, pad: Path, cache=True):
        try:
            body = pad.read_bytes()
        except OSError:
            self._fout(404, "Niet gevonden.")
            return
        self._verstuur(200, MIME.get(pad.suffix, "application/octet-stream"), body, cache=cache)

    # ---------------- helpers ----------------
    def _verstuur(self, code, inhoudstype, body: bytes, cache=True):
        self.send_response(code)
        self.send_header("Content-Type", inhoudstype)
        self.send_header("Content-Length", str(len(body)))
        if cache:
            self.send_header("Cache-Control", "public, max-age=3600")
        else:
            self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, payload, code=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self._verstuur(code, "application/json; charset=utf-8", body, cache=False)

    def _fout(self, code, melding):
        self._json({"fout": melding}, code)

    def log_message(self, formaat, *args):
        print(f"[kaart] {self.address_string()} {formaat % args}")


def main():
    if not DATAJSON.exists():
        print("⚠  web/data/bedrijven.json ontbreekt — voer eerst uit: python3 scripts/bouw_data.py")
    server = ThreadingHTTPServer(("0.0.0.0", POORT), KaartHandler)
    print(f"🗺️  Bedrijvenkaart België draait op http://0.0.0.0:{POORT}")
    print("    OpenStreetMap-tegels · KBO-import beschikbaar via /api/import")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nGestopt.")


if __name__ == "__main__":
    main()
