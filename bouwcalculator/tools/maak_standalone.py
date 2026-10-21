#!/usr/bin/env python3
"""Maak een één-bestand-versie van de Bouwprijscalculator.

Alle CSS en JavaScript (prijsboek, rekenkern en app) worden in index.html
gezet, zodat de app als één enkel .html-bestand te openen is: geen server,
 geen build-stap, geen internet nodig. De rekenkern draait dan in de browser.

    python3 bouwcalculator/tools/maak_standalone.py
    → bouwcalculator/web/bouwcalculator-standalone.html

De bronbestanden blijven leidend; dit script is een pure vertaalslag.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent / "web"
DOEL = WEB / "bouwcalculator-standalone.html"
# Tweede kopie: korte, downloadbare link naar de app (bv. via raw/jsDelivr).
KOPIE = WEB.parent / "bouwcalculator.html"

HEADER = """<!--
  Bouwprijscalculator — één-bestand-versie (standalone).
  Gegenereerd door bouwcalculator/tools/maak_standalone.py uit index.html,
  styles.css, prijsboek.js, engine.js en app.js. Niets handmatig wijzigen.
  Open dit bestand in een browser: de app rekent volledig lokaal.
-->
"""


def lees(naam: str) -> str:
    return (WEB / naam).read_text(encoding="utf-8")


def strip_export(js: str) -> str:
    """Maak module-exports gewone declaraties."""
    js = re.sub(r"^\s*export\s+(const|let|var|function|class|async function)\b",
                 r"\1", js, flags=re.MULTILINE)
    js = re.sub(r"^\s*export\s*\{[^}]*\}\s*;?\s*$", "", js, flags=re.MULTILINE)
    js = re.sub(r"^\s*export\s+default\s+", "", js, flags=re.MULTILINE)
    return js


def strip_import(js: str) -> str:
    """Verwijder imports van losse modules (die worden inline gezet)."""
    return re.sub(r"^\s*import\s+[^;]*?from\s*[\"'][^\"']+[\"']\s*;?\s*$",
                  "", js, flags=re.MULTILINE)


def veilig(js: str) -> str:
    """Zorg dat een </script> of </style> de inlining niet breekt."""
    return js.replace("</script", "<\\/script").replace("</style", "<\\/style")


def main() -> int:
    index = lees("index.html")
    css = lees("styles.css")
    prijsboek = strip_import(strip_export(lees("prijsboek.js")))
    vorm = strip_export(lees("vorm.js"))
    engine = strip_import(strip_export(lees("engine.js")))
    app = lees("app.js")

    # In de één-bestand-versie is de engine altijd al aanwezig; de dynamische
    # import zou naar een niet-bestaand bestand wijzen.
    app = app.replace(
        """  // Nóg een poging: dynamisch importeren.
  try {
    const module = await import("./engine.js");
    return module;
  } catch (_) {
    return null;
  }""",
        """  // In de één-bestand-versie is de engine al ingesloten.
  return null;""",
    )

    kern = f"""
(function () {{
{prijsboek}
{vorm}
{engine}
}})();
"""

    plattegrond = lees("plattegrond.js")
    slepen = lees("slepen.js")
    geschiedenis = lees("geschiedenis.js")
    navigatie = lees("navigatie.js")
    meten = lees("meten.js")
    ruimte_vorm = lees("ruimte-vorm.js")
    huis = lees("huis.js")
    studio = lees("studio.js")
    huis_camera = lees("huis-camera.js")

    html = index.replace(
        '<link rel="stylesheet" href="styles.css">',
        f"<style>\n{css}\n</style>",
    )
    html = html.replace('<script src="vervolgstappen.js"></script>', f"<script>\n{veilig(lees('vervolgstappen.js'))}\n</script>")
    html = html.replace('<script src="thema.js"></script>', f"<script>\n{veilig(lees('thema.js'))}\n</script>")
    html = html.replace(
        '<script type="module" src="engine.js"></script>\n'
        '<script src="plattegrond.js"></script>\n<script src="geschiedenis.js"></script>\n<script src="app.js"></script>\n<script src="slepen.js"></script>\n<script src="navigatie.js"></script>\n<script src="meten.js"></script>\n<script src="ruimte-vorm.js"></script>\n<script src="huis-camera.js"></script>\n<script src="huis.js"></script>\n<script src="studio.js"></script>',
        f"<script>\n{veilig(kern)}\n</script>\n"
        f"<script>\n{veilig(plattegrond)}\n</script>\n"
        f"<script>\n{veilig(geschiedenis)}\n</script>\n"
        f"<script>\n{veilig(app)}\n</script>\n<script>\n{veilig(slepen)}\n</script>\n<script>\n{veilig(navigatie)}\n</script>\n<script>\n{veilig(meten)}\n</script>\n<script>\n{veilig(ruimte_vorm)}\n</script>\n<script>\n{veilig(huis_camera)}\n</script>\n<script>\n{veilig(huis)}\n</script>\n<script>\n{veilig(studio)}\n</script>",
    )

    html = html.replace('<script src="openingen.js"></script>', f"<script>\n{veilig(lees('openingen.js'))}\n</script>")
    html = html.replace('<script src="trappen.js"></script>', f"<script>\n{veilig(lees('trappen.js'))}\n</script>")
    html = html.replace('<script src="wizard.js"></script>', f"<script>\n{veilig(lees('wizard.js'))}\n</script>")
    html = html.replace('<script src="combinaties.js"></script>', f"<script>\n{veilig(lees('combinaties.js'))}\n</script>")
    if ("styles.css" in html or 'src="engine.js"' in html
            or 'src="vervolgstappen.js"' in html or 'src="wizard.js"' in html or 'src="combinaties.js"' in html or 'src="trappen.js"' in html or 'src="openingen.js"' in html or 'src="thema.js"' in html or 'src="huis-camera.js"' in html or 'src="studio.js"' in html or 'src="huis.js"' in html or 'src="ruimte-vorm.js"' in html or 'src="meten.js"' in html or 'src="navigatie.js"' in html or 'src="geschiedenis.js"' in html or 'src="slepen.js"' in html or 'src="app.js"' in html or 'src="plattegrond.js"' in html):
        print("FOUT: niet alle verwijzingen zijn vervangen", file=sys.stderr)
        return 1

    html = html.replace("<head>", "<head>\n" + HEADER, 1)
    DOEL.write_text(html, encoding="utf-8")
    KOPIE.write_text(html, encoding="utf-8")
    print(f"{DOEL.relative_to(WEB.parent.parent)}  ({len(html.encode('utf-8')) / 1024:.1f} KiB)")
    print(f"{KOPIE.relative_to(WEB.parent.parent)}  (downloadkopie)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
