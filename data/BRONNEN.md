# Databronnen — Bedrijvenkaart België

## Wat zit er in deze repository?

| Bestand | Wat | Herkomst / licentie |
|---|---|---|
| `data/postcodes.csv` | 2 756 Belgische postcodes met gemeente, lengte- en breedtegraad (WGS84) | [jief/zipcode-belgium](https://github.com/jief/zipcode-belgium) — gebaseerd op de postcodelijst van bpost. Vrij te gebruiken. |
| `web/data/provincies.geojson` | Grenzen van de 11 Belgische provincies + Brussels Hoofdstedelijk Gewest, vereenvoudigd | [Natural Earth](https://www.naturalearthdata.com/) 1:10m admin-1 (publiek domein) |
| `data/bedrijven.csv` | **Demo**-dataset van 70 bedrijven / 242 vestigingen | Gegenereerd door `scripts/gen_bedrijven.py`; namen, BTW-nummers en cijfers zijn verzonnen |
| `web/data/bedrijven.json` | Gegenereerde kaartdata | `scripts/bouw_data.py` |
| `web/vendor/` | Leaflet 1.9.4, Leaflet.markercluster 1.5.3, Leaflet.heat 0.2.0 | BSD-2-Clause / MIT |

## Kaarttegels

De kaart gebruikt tegels van **OpenStreetMap** (via CARTO's gratis tegel-CDN voor de lichte stijl).
Elke laag toont de vereiste attributie in de rechteronderhoek:

- © [OpenStreetMap](https://www.openstreetmap.org/copyright)-bijdragers
- © [CARTO](https://carto.com/attributions) (lichte en voyager-stijl)

De standaardstijl laadt rechtstreeks van `tile.openstreetmap.org`. Gebruik die stijl
niet voor zware productietrafiek: de [OSM-tegelgebruiksvoorwaarden](https://operations.osmfoundation.org/policies/tiles/)
vragen om een eigen tegelprovider of self-hosting boven ~een paar honderd bezoekers per dag.

## Echte Belgische bedrijfsdata

De officiële bronnen zijn **KBO/BCE** (Kruispuntbank van Ondernemingen) en de
publicaties van de FOD Economie:

- KBO open data: <https://kbopub.economie.fgov.be/kbo-open-data/>
- Statistieken & CSE-bestanden (oprichtingen/stopzettingen): <https://economie.fgov.be/nl/themas/ondernemingen>

Zulke bestanden kun je met `scripts/kbo_import.py` inlezen; het script koppelt
adressen aan coördinaten via `data/postcodes.csv` en bepaalt de provincie met de
provinciegrenzen hierboven. Er worden geen gegevens naar derden gestuurd.
