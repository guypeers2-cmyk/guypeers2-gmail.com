# 🗺️ Bedrijvenkaart België

**Interactieve kaart van Belgische bedrijven op OpenStreetMap** — filter op sector,
provincie, omvang en status; bekijk bedrijfsprofielen en zie waar de economie clustert.

> **Geen dependencies.** De kaart draait op de Python-standaardbibliotheek + een
> meegeleverde Leaflet-bundel. Geen build-stap, geen npm, geen API-sleutels.

```bash
python3 serve.py        # → http://localhost:8080
```

---

## Wat je krijgt

| Onderdeel | Wat het doet |
|---|---|
| **Kaart** | OpenStreetMap-tegels (3 stijlen), markers per vestiging, clusters, heatmap |
| **Markers** | Grootte = aantal werknemers, kleur = sector, hover = naam + stad |
| **Filters** | Provincie, sector, werknemers (slider), status — alles direct gekoppeld aan de kaart |
| **Zoeken** | Op naam, stad, postcode of BTW-nummer; suggesties + `/`-sneltoets |
| **Detailpaneel** | Profiel met adres, BTW, omzet, oprichtingsjaar, alle vestigingen en een routelink |
| **Statistieken** | Aantal bedrijven, vestigingen, werknemers en grootste sector — past zich aan je filters aan |
| **Import** | Echte Belgische bedrijfsdata via KBO/BCE-open-data of je eigen CSV-export |
| **Provinciegrenzen** | Echte grenzen (Natural Earth) voor de provincies en de provincie-lookup |

Bij de start staan er **70 bedrijven met 242 vestigingen** in de kaart (demo-dataset).

---

## Snel starten

```bash
# 1. Server starten
python3 serve.py                  # http://localhost:8080

# 2. Eigen data inlezen (zie hieronder) — daarna de pagina herladen
python3 scripts/kbo_import.py --bron ~/Downloads/kbo-open-data.zip --limiet 5000

# 3. Tests
python3 -m unittest discover -s tests -v      # 64 tests
```

Poort aanpassen: `PORT=9000 python3 serve.py`.

---

## Eigen data inlezen

De kaart leest `web/data/bedrijven.json`. Dat bestand maak je uit een CSV met een van
deze twee opdrachten:

### A. Eender welke CSV-export (CRM, handelsgids, studiedienst …)

```bash
python3 scripts/kbo_import.py --bron mijn-bedrijven.csv
```

Kolomnamen worden automatisch herkend — Nederlands, Frans of Engels:

| veld | herkende kolomnamen |
|---|---|
| naam | `naam`, `name`, `bedrijfsnaam`, `company`, `firma`, `denomination` |
| adres | `straat`, `street`, `adres`, `address` · `postcode`, `zip`, `postal_code` · `stad`, `gemeente`, `city` |
| sector | `sector`, `branche`, `industry`, `categorie`, `nace`, `activiteit` |
| cijfers | `werknemers`, `employees`, `personeel` · `omzet`, `revenue` · `opgericht`, `founded` |
| overig | `btw`, `vat`, `ondernemingsnummer` · `provincie`, `province` · `website`, `telefoon`, `status` |
| optioneel | `lat` + `lon` (als die ontbreken wordt er gegeocodeerd via de postcode) |

Komma, puntkomma en tab werken allemaal; UTF-8 en Latin-1 ook.

### B. KBO/BCE open data (officiële Belgische bedrijfsdata)

Download de open data bij de FOD Economie
(<https://kbopub.economie.fgov.be/kbo-open-data/>) en wijs de zip of de uitgepakte
map aan:

```bash
python3 scripts/kbo_import.py --bron kbo-open-data.zip --limiet 5000
```

Het script herkent `enterprise.csv`, `establishment.csv`, `address.csv`,
`denomination.csv` en `activity.csv`, koppelt de adressen aan de vestigingen,
maakt van de NACE-code een sector en geocodeert via de postcode.

**Handig om te weten**

- `--limiet 5000` houdt de dataset hanteerbaar en **stratificeert**: de selectie blijft
  gespreid over alle provincies en sectoren (0 = alles importeren).
- `--provincies "Antwerpen,Limburg"` en `--sectoren "Zorg & biotech"` filteren tijdens de import.
- Adressen worden gegeocodeerd met `data/postcodes.csv` (postcode → gemeente +
  coördinaten). Alleen postcodes: de punten krijgen een kleine, deterministische
  spreiding binnen de gemeente, zodat ze niet allemaal op één punt stapelen. Het veld
  `precisie` (`adres` of `postcode`) zegt welke nauwkeurigheid een rij heeft.
- **Er gaan geen gegevens naar externe diensten.**

### C. Alleen de JSON herbouwen

```bash
python3 scripts/bouw_data.py                  # data/bedrijven.csv → web/data/bedrijven.json
python3 scripts/bouw_data.py --csv eigen.csv  # ander bronbestand
```

---

## Projectstructuur

```
web/
├── index.html              # de kaartpagina
├── kaart.js                # kaartlogica (vanilla JS + Leaflet)
├── kaart.css               # lichte dashboardstijl
├── console.html            # de oude agentenconsole (bereikbaar op /console)
├── app.js, styles.css      # bij de console
├── data/
│   ├── bedrijven.json      # gegenereerde kaartdata
│   └── provincies.geojson  # provinciegrenzen (vereenvoudigd)
└── vendor/                 # Leaflet 1.9.4 + markercluster + heat (meegeleverd)
scripts/
├── gen_bedrijven.py        # demo-dataset genereren
├── bouw_data.py            # CSV → JSON
├── bouw_provincies.py      # provinciegrenzen vereenvoudigen
├── kbo_import.py           # KBO/BCE of eigen CSV importeren + geocoderen
└── geo.py                  # postcodes, provinciegrenzen, naamnormalisatie
data/
├── bedrijven.csv           # de dataset (demo of eigen import)
├── postcodes.csv           # 2 756 postcodes met coördinaten
└── BRONNEN.md              # herkomst en licenties
serve.py                    # stdlib-webserver (statisch + JSON-API)
tests/                      # 64 tests, waarvan 27 voor de kaart
```

### Serverroutes

| route | inhoud |
|---|---|
| `GET /` of `/kaart` | de kaartpagina |
| `GET /console` | de oude agentenconsole |
| `GET /api/bedrijven` | alle vestigingen + metadata |
| `GET /api/sectoren` | sectoren met kleur en aantal |
| `GET /api/import/status` | voortgang van een import |
| `POST /api/import` | import starten (`{"limiet": 5000, "provincies": []}`) |

---

## Data & licenties

| Bron | Gebruik | Licentie |
|---|---|---|
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | kaarttegels | ODbL — attributie staat op de kaart |
| [CARTO-basemaps](https://carto.com/attributions) | lichte/voyager-tegels | gratis tegel-CDN, attributie staat op de kaart |
| [Natural Earth](https://www.naturalearthdata.com/) | provinciegrenzen | publiek domein |
| [jief/zipcode-belgium](https://github.com/jief/zipcode-belgium) | postcodes + coördinaten (basis: bpost) | vrij te gebruiken |
| [Leaflet](https://leafletjs.com/) + plugins | kaartbibliotheek | BSD-2 / MIT |

De **demo-dataset** is verzonnen: bedrijfsnamen, BTW-nummers, werknemersaantallen en
omzetten zijn gegenereerd met `scripts/gen_bedrijven.py`. De plaatsen, postcodes en
coördinaten zijn echt. Zie `data/BRONNEN.md`.

---

## Let op bij productie

- De standaard-OSM-tegels zijn bedoeld voor licht gebruik. Voor veel bezoekers:
  eigen tegelbron of self-hosting ([OSM-tegelbeleid](https://operations.osmfoundation.org/policies/tiles/)).
- `serve.py` is een eenvoudige stdlib-server: prima voor lokaal gebruik en demo's.
  Voor productie zet je `web/` achter nginx/Caddy, of je host de statische bestanden
  op een CDN.
- De kaart werkt volledig client-side; alleen `/api/bedrijven` en de tegels gaan over
  het netwerk.

---

## Wat is er met de oude console gebeurd?

De agentenconsole van *De Universele Gids* staat er nog: open `/console`
(`web/console.html`). De kaart is de nieuwe startpagina, zoals gevraagd. De
Python-kern in `gids/`, `cli.py` en de 37 originele tests werken ongewijzigd.
