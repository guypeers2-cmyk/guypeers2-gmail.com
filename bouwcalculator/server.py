#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bouwprijscalculator — webserver (pure Python-stdlib, geen dependencies).

Starten:   python3 bouwcalculator/server.py
           PORT=8090 python3 bouwcalculator/server.py

Endpoints:
    GET  /                      → de calculator (web/index.html)
    GET  /api/prijsboek         → tarieven, werkpakketten en referentieprijzen
    POST /api/offerte           → {"project": {...}} → volledig berekende offerte
    GET  /api/projecten         → opgeslagen projecten
    POST /api/projecten/opslaan → {"project": {...}, "id": "..."} → opslaan
    GET  /api/projecten/<id>    → één opgeslagen project
    POST /api/projecten/verwijder → {"id": "..."} → verwijderen

De rekenkern draait server-side; de browser is de presentatielaag.
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from bouw import PAKKETTEN, bereken_offerte, referentie_tarieven  # noqa: E402
from bouw import opslag  # noqa: E402
from bouw.tarieven import TARIEVEN, Tarieven  # noqa: E402

WEBMAP = Path(__file__).resolve().parent / "web"
POORT = int(os.environ.get("PORT", "8090"))

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".json": "application/json; charset=utf-8",
}


class BouwHandler(BaseHTTPRequestHandler):
    server_version = "Bouwprijscalculator/1.0"

    # ---------------- GET ----------------
    def do_GET(self):
        pad = self.path.split("?")[0]
        if pad in ("/", "/index.html"):
            self._bestand(WEBMAP / "index.html")
        elif pad == "/api/prijsboek":
            referentie = referentie_tarieven()
            tarieven = Tarieven(referentie=referentie)
            self._json({
                "tarieven": tarieven.overzicht(),
                "pakketten": PAKKETTEN,
                "referentie": referentie,
                "versie": "1.0.0",
                "opslag": "server",
            })
        elif pad == "/api/projecten":
            self._json({"projecten": opslag.lijst()})
        elif pad.startswith("/api/projecten/"):
            id_ = pad.rsplit("/", 1)[-1]
            project = opslag.laad(id_)
            if project is None:
                self._fout(404, "Offerte niet gevonden.")
            else:
                self._json({"project": project})
        elif pad.startswith("/"):
            doel = (WEBMAP / pad.lstrip("/")).resolve()
            if WEBMAP in doel.parents and doel.is_file():
                self._bestand(doel)
            else:
                self._fout(404, "Pagina niet gevonden.")
        else:
            self._fout(400, "Ongeldig verzoek.")

    # ---------------- POST ----------------
    def do_POST(self):
        pad = self.path.split("?")[0]
        data = self._lees_json()
        if data is None:
            return
        if pad == "/api/offerte":
            try:
                self._json(bereken_offerte(data.get("project") or {}))
            except (KeyError, ValueError, TypeError) as fout:
                self._fout(400, f"Kon de offerte niet berekenen: {fout}")
        elif pad == "/api/projecten/opslaan":
            try:
                self._json(opslag.opslaan(data.get("project") or {}, data.get("id")))
            except (OSError, TypeError) as fout:
                self._fout(400, f"Kon niet opslaan: {fout}")
        elif pad == "/api/projecten/verwijder":
            self._json({"verwijderd": opslag.verwijder(str(data.get("id", "")))})
        else:
            self._fout(404, "Onbekende route.")

    # ---------------- helpers ----------------
    def _lees_json(self):
        try:
            lengte = int(self.headers.get("Content-Length", 0))
            return json.loads(self.rfile.read(lengte) or b"{}")
        except (ValueError, OSError):
            self._fout(400, "Ongeldige JSON.")
            return None

    def _json(self, payload, code=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _bestand(self, pad: Path):
        body = pad.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", MIME.get(pad.suffix, "application/octet-stream"))
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _fout(self, code, melding):
        self._json({"fout": melding}, code)

    def log_message(self, formaat, *args):
        print(f"[bouw] {self.address_string()} {formaat % args}")


def main():
    server = ThreadingHTTPServer(("0.0.0.0", POORT), BouwHandler)
    print(f"🏗️  Bouwprijscalculator draait op http://0.0.0.0:{POORT}")
    print(f"    {len(PAKKETTEN)} werkpakketten · {len(TARIEVEN)} tarieven · rekenkern actief")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nSysteem gestopt.")


if __name__ == "__main__":
    main()
