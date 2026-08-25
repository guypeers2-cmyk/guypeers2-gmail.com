#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""De Universele Gids — webconsole (pure Python-stdlib, geen dependencies).

Starten:   python3 serve.py          (poort 8080, bereikbaar op 0.0.0.0)
           PORT=9000 python3 serve.py

Endpoints:
    GET  /                 → de console (web/index.html)
    GET  /api/agenten      → volledig agentenregister (18 agenten)
    GET  /api/statistieken → kwaliteitslog: beslissingen per agent (Agent 16)
    POST /api/bericht      → {"tekst": "...", "state": {...}, "sessie": "..."} → routering + antwoord

De volledige routeringslogica draait server-side in de gids-package;
de browser is puur presentatielaag.
"""

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from gids import GespreksState, alle_agenten, verwerk
from gids.kwaliteit import KwaliteitsAgent

WEBMAP = Path(__file__).resolve().parent / "web"
POORT = int(os.environ.get("PORT", "8080"))

# Agent 16: de Kwaliteits- & Feedback-Agent draait mee op de achtergrond.
KWALITEIT = KwaliteitsAgent()

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
}


class GidsHandler(BaseHTTPRequestHandler):
    server_version = "UniverseleGids/1.0"

    # ---------------- GET: statische console + register-API ----------------
    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self._bestand(WEBMAP / "index.html")
        elif self.path == "/api/agenten":
            self._json({
                "agenten": [
                    {
                        "id": a["id"],
                        "nummer": a["nummer"],
                        "naam": a["name"],
                        "rol": a["role"],
                        "categorie": a.get("categorie", "overig"),
                        "emoji": a.get("emoji", "🏛️"),
                        "spreekt": a.get("spreekt", False),
                        "monitoring": a.get("monitoring", ""),
                        "trigger": a.get("trigger"),
                    }
                    for a in alle_agenten()
                ]
            })
        elif self.path == "/api/statistieken":
            self._json(KWALITEIT.statistieken())
        elif self.path.startswith("/"):
            doel = (WEBMAP / self.path.lstrip("/")).resolve()
            if WEBMAP in doel.parents and doel.is_file():
                self._bestand(doel)
            else:
                self._fout(404, "Onbekende route — de Systeem-Guard vangt dit op.")
        else:
            self._fout(400, "Ongeldig verzoek.")

    # ---------------- POST: bericht door de Hoofdrouter ----------------
    def do_POST(self):
        if self.path != "/api/bericht":
            self._fout(404, "Onbekende route — de Systeem-Guard vangt dit op.")
            return
        try:
            lengte = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(lengte) or b"{}")
            tekst = str(data.get("tekst", "")).strip()
            if not tekst:
                self._fout(400, "Leeg bericht — zeg me waar het over gaat.")
                return
            state = GespreksState.van_dict(data.get("state"))
            resultaat = verwerk(tekst, state)
            # Agent 16 logt elke afloop — privacyveilig (invoer wordt gemaskeerd).
            KWALITEIT.noteer(tekst, resultaat, data.get("sessie") or "anoniem")
            self._json({
                "resultaat": resultaat.naar_dict(),
                "state": state.naar_dict(),
            })
        except (ValueError, KeyError) as fout:
            self._fout(400, f"Ongeldig verzoek: {fout}")

    # ---------------- helpers ----------------
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
        # Rustige loglijn: de Kwaliteitsagent wil geen ruis in de console.
        print(f"[gids] {self.address_string()} {formaat % args}")


def main():
    server = ThreadingHTTPServer(("0.0.0.0", POORT), GidsHandler)
    print(f"🏛️  De Universele Gids draait op http://0.0.0.0:{POORT}")
    print("    18 agenten geladen · router actief · zwijg-protocol gehandhaafd")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nSysteem gestopt.")


if __name__ == "__main__":
    main()
