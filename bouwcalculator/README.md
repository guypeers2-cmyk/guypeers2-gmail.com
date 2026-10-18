# 🏗️ Bouwprijscalculator

**Prijzen berekenen voor bouwwerk op basis van maten — gestart met Gyproc.**

> 🌐 **URL:** <https://patient-sun-c959.guypeers2.workers.dev>
> Cloudflare Worker · publiceren met **één commando**:
> `bash bouwcalculator/deploy/nu-publiceren.sh` (vanuit de repo-map!)
>
> 🧳 **Direct openen (geen installatie):**
> <https://cdn.jsdelivr.net/gh/guypeers2-cmyk/guypeers2-gmail.com@v1.0.1/bouwcalculator/bouwcalculator.html>
> — de hele app in één HTML-bestand, rekent in de browser.
> Release: <https://github.com/guypeers2-cmyk/guypeers2-gmail.com/releases/tag/v1.0.1>

Een zelfstandige webapp (zonder dependencies, pure Python-stdlib) waarmee een
bouwer of werknemer vanuit de maten van een ruimte een offerte opstelt:
oppervlakken → materiaalname (take-off) → gewerkte uren → prijs → BTW.

De app draait volledig offline. Er gaat niets naar een externe dienst.

---

## Snel starten

```bash
python3 bouwcalculator/server.py          # → http://localhost:8090
PORT=9000 python3 bouwcalculator/server.py
```

Of: open **`bouwcalculator/web/bouwcalculator-standalone.html`** — de app in één
bestand (CSS, prijsboek, rekenkern en app allemaal erin). Geen server, geen
internet, geen installatie: ideaal om mee naar de werf te nemen of op een
telefoon te openen. Opnieuw genereren:

```bash
python3 bouwcalculator/tools/maak_standalone.py
```

Tests:

```bash
python3 -m unittest discover -s bouwcalculator/tests -v   # 19 tests
```

---

## Deployen naar Cloudflare Workers

De app draait op drie manieren — alle drie zijn getest:

| Wijze | Wanneer | Hoe |
|-------|---------|-----|
| **Lokale server** | ontwikkelen, offline | `python3 bouwcalculator/server.py` |
| **Cloudflare Worker** | live op internet | `npx wrangler deploy` |
| **Statische hosting** | zonder API | de app rekent dan zelf in de browser |

### De Worker publiceren

**Eén commando** (deploy + controle in één keer):

```bash
bash bouwcalculator/deploy/nu-publiceren.sh
```

Het script gaat vanzelf naar de repo-map, zet het token klaar (of vraagt het
veilig op), doet `wrangler deploy` en controleert daarna of de URL echt onze
app serveert in plaats van de standaard "Hello World!".

Handmatig kan ook, **maar dan vanuit de map met `wrangler.toml`**:

```bash
cd <repo>                 # map met wrangler.toml
npx wrangler login        # één keer, inloggen bij Cloudflare
npx wrangler deploy
```

> ⚠️ **Let op:** `npx wrangler deploy` vanuit een *andere* map dan de repo
> vindt geen `wrangler.toml` en zet dan de standaard "Hello World!"-worker
> op. Draai het daarom altijd in de repo-map (of gebruik het script).

De worker heet `patient-sun-c959` (zie `wrangler.toml`) en komt live op:

**https://patient-sun-c959.guypeers2.workers.dev**

Controleren of er echt onze app staat (statische bestanden, API én een
voorbeeldberekening):

```bash
bash bouwcalculator/deploy/controle.sh
```

De Worker serveert de app (statische bestanden) en rekent `/api/*` met de
JS-rekenkern. De bestanden in `bouwcalculator/web/` worden automatisch
meegestuurd als assets.

### Deployen bij elke push (GitHub Actions)

De snelste route is het meegeleverde script — één commando doet alles:

```bash
git clone -b arena/c5fdb0b8-guypeers2-gmail-com \
  https://github.com/guypeers2-cmyk/guypeers2-gmail.com.git
cd guypeers2-gmail.com
bash bouwcalculator/deploy/ci.sh
```

Het script controleert je GitHub-login, vraagt om het Cloudflare-token (onzichtbaar
invoer) en zet het als versleuteld secret, plaatst de workflow en pusht.

Het token maak je zelf aan op
<https://dash.cloudflare.com/profile/api-tokens> met de rechten
*Edit Cloudflare Workers* (Account Resources → jouw account). Het token komt
nooit in de repo of in een log terecht.

De workflow draait eerst de tests (Python + JS-pariteit) en deployt daarna:

```
.bouwcalculator/deploy/deploy-worker.yml  →  .github/workflows/deploy-worker.yml
```

### GitHub Pages (publiceren zonder Cloudflare)

De app werkt ook zonder API: dan rekent de browser zelf (de rekenkern zit in
`web/engine.js`). Publiceren kan dus via GitHub Pages, zonder token:

**Settings → Pages → Build and deployment → Deploy from a branch**

| | |
|---|---|
| Branch | `arena/c5fdb0b8-guypeers2-gmail-com` |
| Folder | `/bouwcalculator/web` |

Het resultaat komt op `https://<github-user>.github.io/<repo>/`. Let op: daar
worden offertes in de browser bewaard (localStorage) in plaats van op de
server.

### Workers Builds (Cloudflare)

Is de repo in de Cloudflare-dashboard aan een Worker gekoppeld, dan volstaat
een push: de build doet `wrangler deploy` voor je. De branch-preview komt dan
op `patient-sun-<branch>.guypeers2.workers.dev`.

> De sandbox waarin dit gebouwd is kan `dash.cloudflare.com` en
> `api.cloudflare.com` niet bereiken (netwerkbeperking), dus de eerste
> publicatie moet vanaf een machine met vrij internet gebeuren.

### Twee rekenkernen, één waarheid

Op Workers draait JavaScript, lokaal draait Python. Daarom is de
rekenkern twee keer geschreven — en bewaakt een test dat ze identiek zijn:

```
bouwcalculator/tests/test_pariteit.py  →  17 projecten, cent voor cent gelijk
```

Het prijsboek wordt gegenereerd (`npm run prijsboek`), dus ook dat kan niet
uit elkaar lopen.

---

## De werkwijze in de praktijk

1. **Offertegegevens** — klant, adres, datum, offerte-nummer, je eigen naam.
2. **Ruimte** — lengte × breedte × hoogte, plus deuren en ramen per muur.
   De app rekent zelf de bruto, afgetrokken en netto oppervlak uit:

   | Vlak | Berekening |
   |------|-------------|
   | Wand noord / zuid | lengte × hoogte − openingen |
   | Wand oost / west | breedte × hoogte − openingen |
   | Plafond / vloer | lengte × breedte |

3. **Werk kiezen** — bij elk oppervlak op *+ werk*. Per werkregel stel je de
   opties in (1 of 2 zijden beplankt, welke plaat, welk profiel, isolatie of niet).
4. **Offerte** — rechts staat het offertedocument: materiaal, arbeid, marge,
   korting, BTW en totaal. Met **🖨 Offerte printen** wordt het een A4-PDF
   (via de printknop van je browser).

---

## De rekenkern in het kort

Per werkpakket rekent de app twee dingen uit:

**Materiaal (take-off)** — hoeveel is er nodig?

- gipsplaten: oppervlak × 1,10 verspilling → aantal platen van 3,12 m²
- C-profiel: spoorafstand 40 cm + 1 stuk per wand + 2 stuks per opening
- U-profiel en vlakke band: omtrek van de wand
- veerhangers (plafond): per profiel om de 80 cm
- schroeven: 20 per m² · voegband: 1,4 m per m² · voegmiddel: 0,5 kg per m²
- isolatie: wandoppervlak + 5%

**Arbeid (uren)** — hoe lang duurt het?

| Taak | Uren/m² |
|------|---------|
| Wand opmeten en uitsetten | 0,05 |
| Profielen plaatsen | 0,30 |
| Isolatie plaatsen | 0,10 |
| Platen bevestigen | 0,22 |
| Voegen en afwerken | 0,30 |

Uren × uurtarief (standaard €45/u) = arbeidskosten. Daar bovenop komt een
marge op het materiaal (standaard 15%).

De normen staan als常量en bovenaan `bouw/bereken.py` — één vakman past ze
in één oogopslag aan.

---

## Twee prijsmodi

| Modus | Wat je ziet |
|-------|-------------|
| **Detailschuif** (standaard) | Volledige namenlijst van materiaal en de uren per taak |
| **Snelle m²-prijs** | Eén prijs per m² — snel op de werf, geen namenlijst |

De m²-prijzen worden **afgeleid uit de detailschuif** (referentie: een wand van
4,0 × 2,5 m met één deur). Ze kloppen dus altijd met de gedetailleerde
berekening, en je kan ze per project aanpassen.

---

## Tarieven aanpassen

Onder het tabblad **Tarieven** staan alle eenheidsprijzen, alle uren per m²
en alle snelle m²-prijzen. Wat je daar verandert, wordt meteen doorberekend
en mee opgeslagen met de offerte. De standaardtarieven staan in
`bouw/tarieven.py` en zijn een marktreferentie voor België — pas ze aan op
jouw inkoop.

---

## Een werkpakket toevoegen

Een werkpakket bestaat uit twee stukken:

1. **Metadata** in `bouw/tarieven.py` (`PAKKETTEN`): naam, categorie, eenheid
   en de opties met hun standaardwaarden.
2. **Een berekening** in `bouw/bereken.py`: een functie die een `Ctx`
   krijgt en `(materiaalregels, taken)` teruggeeft. Registreer hem in
   `BEREKENERS` en de calculator kent hem meteen.

De m²-snelprijs wordt automatisch uit de nieuwe berekening afgeleid.

---

## Bestandsstructuur

```
bouwcalculator/
├── server.py            # webserver (statische bestanden + JSON-API)
├── bouw/
│   ├── model.py         # Project, Ruimte, Opening, Werkregel (JSON-in/uit)
│   ├── tarieven.py      # prijsboek + werkpakketten (pure data)
│   ├── bereken.py       # de rekenkern: oppervlakken, namen, uren
│   ├── offerte.py       # project → berekende offerte met totalen
│   └── opslag.py        # offertes opslaan (data/projecten/*.json)
├── web/
│   ├── index.html       # de app
│   ├── styles.css       # stijl + print-opmaak voor de offerte
│   ├── app.js           # presentatielaag (alleen weergave)
│   ├── engine.js        # JS-rekenkern (Worker + browser-fallback)
│   └── prijsboek.js     # gegenereerd uit bouw/tarieven.py
├── worker/
│   ├── src/worker.js    # Cloudflare Worker: assets + /api/*
│   └── test/runner.mjs  # runner voor de pariteitstest
├── tools/
│   └── maak_prijsboek.py  # prijsboek genereren voor de JS-kern
├── deploy/
│   └── deploy-worker.yml  # GitHub Actions-workflow (kopiëren naar .github/workflows/)
├── tests/               # 19 unittest-tests
└── data/                # opgeslagen offertes (in .gitignore)
```

### API

| Route | Doet |
|-------|------|
| `GET /api/prijsboek` | tarieven, werkpakketten, referentieprijzen |
| `POST /api/offerte` | `{"project": {...}}` → de volledig berekende offerte |
| `GET /api/projecten` | opgeslagen offertes |
| `POST /api/projecten/opslaan` | offerte bewaren |
| `GET /api/projecten/<id>` | offerte teruglezen |
| `POST /api/projecten/verwijder` | offerte wissen |

---

## Uitbreiden

- **Meer ambachten**: spuiten, chape, isolatie, elektrisch — elk één werkpakket.
- **Per klant eigen tarieven**: de tarieven zitten in de offerte, dus een
  klant met eigen prijzen is een eigen project.
- **Meerdere verdiepen**: ruimtes zijn vrij in te delen — één ruimte per kamer.
- **Offerte als PDF**: de printopmaak staat in `web/styles.css`; via de
  printknop van de browser ("Als PDF opslaan") krijg je een A4-document.
