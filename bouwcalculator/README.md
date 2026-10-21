# 🏗️ Bouwprijscalculator

**Prijzen berekenen voor bouwwerk op basis van maten — gestart met Gyproc.**

![De Bouwprijscalculator](docs/screenshot.png)

> 🌐 **Online app:** <https://patient-sun-c959.guypeers2.workers.dev>
>
> ⬇️ **Offline:** open `bouwcalculator.html` of
> `web/bouwcalculator-standalone.html` uit deze map.
>
> De bronbestanden in deze map en de gegenereerde HTML zijn de actuele versie;
> oudere releases/HTML-previewlinks bevatten niet noodzakelijk de nieuwste functies.

Een zelfstandige webapp (zonder dependencies, pure Python-stdlib) waarmee een
bouwer of werknemer vanuit de maten van een ruimte een offerte opstelt:
oppervlakken → materiaalname (take-off) → gewerkte uren → prijs → BTW.

Het standalone HTML-bestand rekent volledig offline, zonder externe dienst.
De online app gebruikt de eigen Cloudflare Worker voor de offerteberekening.

---

## Compacte bediening

De werkruimte gebruikt compacte SVG-pictogrammen voor tekenen, selecteren,
verschuiven, meten, zoomen, draaien, historie, opslaan en kameracties. Elke
pictogramknop heeft een Nederlandse tooltip en een toegankelijke naam; de
actieve stand blijft zichtbaar. De huisuitleg staat achter **ⓘ** (ook bereikbaar
met Tab/Enter; Escape sluit en herstelt de focus). Op mobiel behouden
pictogramacties minimaal 44 × 44 px aanraakruimte.

Navigatie en bovenbalk blijven op één rij, panelen en formulieren hebben minder
witruimte, en de kamermeetstaat toont compacte symbolen met echte meetwaarden.
Maten, tarieven, bevestigingen en waarschuwingen blijven tekstueel beschikbaar.
Print/PDF behoudt zijn eigen documentopmaak. De offline HTML bevat dezelfde UI.

## Navigatie en werkvolgorde

**Ontwerp** en **Tarieven** staan samen in één vaste bovenbalk. De offerte zelf
blijft het einddocument van het ontwerp, niet een tweede gelijknamige hoofdtab.
De vaste taakbalk leidt naar **Tekening → Maten → Werken → Offerte**, met
projectinstellingen apart. De locatiebalk combineert huis/kamer-keuze met de
kamernaam en de huidige taak. Kamerchips kunnen horizontaal scrollen.

De actieve taak volgt ook handmatig scrollen. Navigatie houdt rekening met de
werkelijke hoogte van beide vaste balken en de voorkeur voor minder beweging;
Tab, pijltjes/Home/End en native details-focus blijven beschikbaar. Taakknoppen
vouwen andere werkpanelen dicht, maar bewaren tekenopties en geneste invoer.
Toevoegen vanuit de uitgebreide installatie-invoer houdt juist het bronpaneel
open, zodat je meerdere werken achter elkaar kunt toevoegen.

Zwevende snelknoppen verschijnen alleen wanneer de overeenkomstige bediening
niet in beeld staat. Huisstand, dialoogvensters en Tarieven verbergen ze. Een
mislukte berekening blijft ook op mobiel als tekst zichtbaar. Navigatie wijzigt
geen projectgegevens, prijsberekening of undo-geschiedenis.

### Snel van kamer wisselen

Het huisicoon in de vaste bovenbalk en de kamernaam openen **Huis & kamers**.
Zoek op naam (ook zonder accenten), kies een kamer en werk daar verder. Vanuit
Maten/Werken blijft dezelfde taak open; vanuit het huisplan of Tarieven opent de
kamertekening. De keuze bevat afmetingen, werkpostentelling en de huidige kamer.
De zoekbalk en het huisplan-knopje blijven bereikbaar bij lange kamerlijsten.

Pijltjes omhoog/omlaag kiezen een kamer, Home/End springen naar begin/einde,
Enter opent en Escape sluit met focusterugkeer. Annuleren verandert niets.
Ook de tabbladen Project/Prijzen ondersteunen pijltjes en Home/End; alleen het
actieve tabblad zit in de Tab-volgorde. Op grotere schermen tonen de taakknoppen
korte labels naast hun pictogram. Mobiel blijven ze compact en aanraakbaar.

Browserregressie: `tools/kamerkeuze_review.mjs` test online/offline, 23 kamers,
zoeken, accenten, veilige tekstweergave, toetsenbord, focus, huis-/tariefovergangen,
kleine schermen en ongewijzigde projectgegevens/prijs/historie.

Regressies: `tools/routing_review.mjs` (online of offline) en
`tests/test_studio_ui.py`; gebruik dezelfde optionele browsertooling als de
andere reviews. De app zelf blijft zonder externe dependencies werken.

## Vijf workflowverbeteringen

1. **Kamerfilters en sortering.** Toon alle kamers, kamers met werkposten of nog
   lege kamers. Combineer met naamzoeken; sorteer op projectvolgorde of naam
   (natuurlijke Nederlandse sortering). Sorteren wijzigt de projectvolgorde niet.
   Heropenen wist de zoekterm en het filter; de sorteervoorkeur blijft tijdens de
   sessie bewaard.
2. **Kamerbedragen.** De kamerkeuze toont de som van de bestaande berekende
   werkregeltotalen per kamer: exclusief btw en vóór projectkorting. Dit is geen
   nieuw prijsmodel. Alle eurobedragen hebben twee decimalen. Tijdens berekenen
   of bij een fout verschijnt een streep in plaats van een verouderd bedrag.
3. **Kameroverzicht.** Naast de kamerbediening staan het berekende bruto
   vloeroppervlak en het aantal werkposten. Het oppervlak komt uit de rekenkern,
   niet uit lengte × breedte voor willekeurige contouren. Huisstand verbergt deze
   kamergebonden informatie.
4. **Geleide stappen.** Onder Maten staat Verder naar werken; onder Werken staat
   Offerte bekijken. Beide bieden Terug naar tekening. Sluiten van panelen bewaart
   de invoervelden en tekeninstellingen; de offerteprint bevat deze knoppen niet.
5. **Tabpositie.** Ontwerp en Tarieven onthouden elk hun eigen scrollpositie zolang
   de app open staat. Het eerste tariefbezoek start bovenaan; terugkeren herstelt de
   werkplek. Expliciete taak- of kamernavigatie krijgt voorrang op die positie.

`tools/workflow_review.mjs` test alle vijf onderdelen online/offline, inclusief
projectkorting, laden, gecombineerde filters, conceptvelden, scrollherstel,
320–1440 px, printisolatie en ongewijzigde projectgegevens/totaal/historie.

## Betrouwbare huisselectie en plaatsing

Kamers buiten het huisplan kunnen nu ook in de huislijst echt geselecteerd en
rechtstreeks geopend worden. De vorige kamer blijft niet ongemerkt gemarkeerd.
De selectiestatus, kamergegevens en X/Y-invoer verwijzen naar dezelfde kamer;
indelen is pas beschikbaar zodra die kamer op het plan staat. De melding
**buiten plan** opent de plaatsingssectie bij een nog niet geplaatste kamer.

De coördinaten volgen kamerselectie en undo/redo. Handmatig ingevoerde, nog niet
bevestigde posities blijven bij camerabediening behouden, met **Nog niet toegepast**.
Een expliciete kamerwissel of vervanging van het project herstelt de werkelijke
positie. Ongeldige plaatsing verandert geen projectdata. Van het plan halen vraagt
bevestiging en behoudt de kamer, werkposten en offertebedragen.

Browsercontrole: `tools/huis_placement_review.mjs` (online/offline), inclusief
ongeldige plaatsing, conceptinvoer, kamerselectie, waarschuwing, bevestiging,
undo/redo tijdens een snede en 320–1440 px.

## Veiliger bewaren en back-ups

Mislukt automatisch bewaren in de browser (bijvoorbeeld volle of geblokkeerde
opslag), dan blijft een waarschuwing staan met **JSON-back-up downloaden** en
**Bewaren opnieuw proberen**. Berekenen of navigeren wist die waarschuwing niet.
Een JSON-download bevat de huidige offerte; het is geen export van het hele
archief en de app kan niet bevestigen dat je browser het bestand heeft bewaard.
De waarschuwing verdwijnt daarom pas na een geslaagde opslagpoging.

Conceptopslag en opgeslagen offertes worden afzonderlijk gecontroleerd. Een
ongeldig of onleesbaar lokaal offertearchief wordt niet overschreven met een
nieuwe, lege lijst. Een mislukte lokale verwijderactie meldt geen succes en
behoudt de offerte. De waarschuwing verschijnt ook op mobiel en bij Tarieven,
maar nooit in de offerteprint.

Tijdens expliciet opslaan is de opslagknop tijdelijk geblokkeerd. De app slaat
een vaste momentopname op: wijzigingen tijdens de aanvraag blijven behouden en
worden als nog niet opgeslagen gemeld. Een vertraagd antwoord voor een vorige
offerte krijgt nooit het opslag-ID van een nieuw geopende offerte toegewezen.
Geometrieklonen en undo/redo blijven wel bij hetzelfde document horen.

Regressie: `tools/storage_review.mjs` simuleert volle/geblokkeerde opslag,
beschadigde archieven, back-upinhoud, herstel, verwijderen, dubbele aanvragen,
projectwissels, tussentijdse wijzigingen, HTTP-fouten en mobiel/print.

## Actuele berekeningen en printveiligheid

Berekenen heeft een eigen UI-status, los van opslaan. Bij invoer wordt een lopend
ouder antwoord meteen ongeldig, ook tijdens de korte wachttijd vóór herberekenen.
In die wachttijd toont het navigatietotaal een ellips; bij een fout een streep.
Kamerbedragen en vloerinzichten gebruiken dezelfde status. Een opslagmelding kan
geen rekenfout wissen en een opslagfout maakt een geldige berekening niet ongeldig.
Bij een nieuwe offerte worden de uitkomsten van het vorige project gewist.

De offerte bevat bij wachten/falen een waarschuwing dat eerdere bedragen niet
actueel zijn. Bij fouten is **Opnieuw berekenen** beschikbaar. De printknop van de
app werkt alleen met een actuele berekening; gebruik je de browserprintfunctie toch, dan
staat de waarschuwing ook op de afdruk. Een normale actuele offerte houdt de
bestaande printopmaak. Dit is geen wijziging van het prijsmodel.

Regressie: `tools/calculation_review.mjs` test fout/herstel, onafhankelijke
opslagstatus, vertraagde antwoorden tijdens de debounce, printbewaking en
ongewijzigde projectgegevens, totalen en historie.

## Opgeslagen offertes terugvinden

**Bestand → Openen** heeft een doorzoekbare lijst: zoek op projectnaam of klant
(ook zonder accenten) en sorteer op wijzigingsdatum of natuurlijke projectnaam.
De zoekbalk en sluitknop blijven zichtbaar terwijl de lijst afzonderlijk scrollt.
Een teller maakt onderscheid tussen een leeg archief en een zoekterm zonder hits.
De opslaglocatie staat erbij: deze browser of je server.

Het venster is een native dialoog met toetsenbordfocus binnen het venster.
Pijl omlaag vanuit zoeken focust Openen; Escape sluit ook met een ingevulde
zoekterm en herstelt de bestandmenu-focus. Openen van een offerte focust juist de
tekening. Bij wijzigingen sinds de laatste opening of expliciete opslag vraagt
de app bevestiging vóór vervangen; annuleren laat de huidige offerte intact.

Laadfouten verschijnen in het venster met Opnieuw laden. Na sluiten worden late
laadreacties genegeerd. Ook serververwijdering controleert nu het echte resultaat,
in plaats van altijd succes te melden. Zoekterm/sortering blijven bij het
verversen na verwijderen behouden. De prijs- en geometriekern zijn ongewijzigd.

Regressie: `tools/archive_review.mjs` met 23 offertes, zoeken/sorteren, focus,
bevestigingen, laad-/verwijderfouten, vertraagde antwoorden en 320–1440 px.

## Ramen, deuren en kamers sneller invoeren

Boven de kamertekening staan **＋ Deur** en **＋ Raam**. Kies de wand en geef
breedte, hoogte en onderkant in één venster op. Een lege positie centreert de
opening; een ingevulde positie meet vanaf het begin van de wand. Ongeldige maten
of een opening boven het lokale schuine plafond worden geweigerd vóór opslaan.
Tijdens invoeren toont een **live wandvoorbeeld** de opening en de vrije afstand
links/rechts. Maatknoppen vullen voorbeeldmaten in (deur: 0,80/0,90/1,00 × 2,10 m;
raam: 0,60 × 0,60 / 1,20 × 1,20 / 1,80 × 1,20 m). Dit zijn openingmaten, geen
bestelmaten van kozijn of deurblad. Zelf ingevoerde posities blijven behouden bij
het kiezen van een maatknop. Het voorbeeld bewaart niets en herberekent geen prijzen.

Na toevoegen blijft de opening geselecteerd en openen de eigenschappen. Sleep om
te verplaatsen; ongedaan maken blijft beschikbaar. Ook de objectcatalogus en de
knoppen onder Ruimtematen gebruiken ditzelfde invoervenster.

In het huisplan: selecteer een lege kamer en kies **Indelen**. **Links/rechts**
of **Boven/onder** start een halve verdeling. Sleep de scheidingswand rechtstreeks op de tekening: de twee gekleurde delen en oppervlakten zijn alleen een voorbeeld.
Pas **Splitsen toepassen** maakt kamers aan. De twee richtingknoppen staan direct boven het huisplan; de dubbele knoppenrij is verwijderd. De greep blijft zichtbaar groot op mobiel. Pijltjes op de greep verplaatsen 5 cm, Shift+pijltjes 25 cm. Escape tijdens slepen herstelt de vorige voorbeeldpositie. De schuifregelaar staat nu bij de precieze invoer. **Maten, kamernamen en vrije snede**
bevat de precieze invoer en twee-grenspuntenmethode. Ook een **vrije schuine snede**
toont vóór bevestigen twee gekleurde delen, oppervlakten en de scheidingswandlengte.
Tik dicht bij de kamerwanden; een tik midden in een kamer kiest geen onverwacht
wandpunt. Een derde tik wist een voltooid voorbeeld niet. **Laatste punt terug**
(of Backspace met focus op het huisplan) corrigeert het laatste grenspunt;
Escape annuleert de snede. Ongeldige sneden hebben geen bevestigbaar voorbeeld.
Herhaal voor meer kamers.
Kamers met werken, openingen of wandhelling blijven beschermd tegen splitsen.

Onder de geselecteerde kamer in het huisplan kun je ook meteen de **kamernaam**
wijzigen. Alleen **Bewaar** schrijft de naam weg; Escape of de terugzetknop
annuleert de tekstwijziging. Achtergrondverversingen behouden je nog niet bewaarde
tekst. Undo/redo werkt ook voor de naam, zonder werken of maten te wijzigen.

Regressie: `tools/easy_layout_review.mjs`, `tools/insertion_preview_review.mjs`, `tools/free_cut_review.mjs`, `tools/direct_partition_review.mjs` en bestaande huis-/objectmenu-/dragreviews.

## Lichte en donkere weergave

De app opent standaard **licht**, ook als het apparaat donker is ingesteld.
Open het **bestandsmenu (mapje rechtsboven) → Weergave** voor **Licht**, **Donker**
of **Systeem**. Systeem volgt ook wijzigingen van de apparaatinstelling terwijl
je werkt. Een expliciete lichte/donkere keuze heeft altijd voorrang.

De voorkeur wordt apart in deze browser bewaard, is niet onderdeel van de offerte
of undo-historie en geldt ook voor de offlineversie. Als bewaren geblokkeerd is,
blijft de keuze voor deze sessie actief met een melding. Afdrukken/PDF blijven
wit. Verbeterd tekst- en knopcontrast geldt voor beide schermthema's; het huisplan
volgt dezelfde keuze. Het bestandsmenu is op lage schermen intern scrollbaar.

Regressie: `tools/appearance_review.mjs` en `tools/huis_theme_review.mjs`.

## Sneller werken in de tekening

Met focus in de kamer-tekening: **V** selecteren, **H** hand/beeld verschuiven,
**M** meten en **F** passend in beeld. Deze sneltoetsen werken niet tijdens typen
in invoervelden of met Ctrl/Alt/Cmd. Terug naar Selecteren herstelt de focus op
het geselecteerde object, zodat de bestaande pijltjestoetsen meteen bruikbaar zijn.

Dubbelklik of dubbeltik op een object of opening opent de eigenschappen bij de
tekening, in 2D, 3D en vlakaanzicht. Een echte sleepbeweging wordt nooit als deze
snelle bewerkingsactie geteld. De selectie toont de wereldpositie **X/Y/Z** in
meter; draaien van de camera verandert die coördinaten niet. Openingen zijn nu
ook selecteerbaar in de objectlijst, naast hun afzonderlijke verwijderknop.
Selectiemarkering en toegankelijke pressed/expanded-states blijven gelijklopen.

Regressie: `tools/drawing_ui_review.mjs`, plus de bestaande drag-/navigatiereviews.
Camera, selectie en eigenschappen openen veranderen geen projectdata of prijzen.
Bevestigde bewerkingen behouden de bestaande historie en validatie.

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
python3 -m unittest discover -s bouwcalculator/tests -v   # 62 tests
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
   Of klik gewoon **op de wand in de plattegrond**: de werkregel komt er dan
   automatisch bij.
4. **Offerte** — rechts staat het offertedocument: materiaal, arbeid, marge,
   korting, BTW en totaal. Met **🖨 Offerte printen** wordt het een A4-PDF
   (via de printknop van je browser).

---

## De plattegrond

De app tekent de ruimte voor je uit — in zuivere SVG, dus scherp op elke
printer en in elke browser:

* **Bovenaanzicht** — wanden met dikte, deuren met slag, ramen met kozijn,
  maatvoering (lengte, breedte, hoogte) en per wand het nettoppervlak plus
  het werk dat er al op staat.
* **3D** — een axonometrische doorsnede met vloerraster, raamkozijnen,
  glas, deuren met klink en uitsparingen op de opgegeven hoogte.
  Met **Links/Rechts** draai je in stappen van 90° langs alle vier de wanden.
  **+/−** zoomt tussen 75% en 160%; **Herstel** zet de camera terug.
  **Maten** schakelt de maatvoering en het overzicht van hoogte, vloeroppervlak
  en volume aan of uit. Klik op een 3D-wand om werk toe te voegen;
  een blauwe bovenrand geeft aan dat er al werk op staat.
  Dit is een schematische doorsnede, geen vrij draaibaar BIM-model.

Klik op een wand (of op een deur daarin) en de werkregel voor dat vlak wordt
toegevoegd. De plattegrond staat ook in het **gedrukte offerte-document**,
zodat de klant ziet over welke ruimte het gaat.

![3D-doorsnede met camerabediening](docs/3d-voorbeeld.png)

### Deuren en ramen plaatsen

Bij elke opening stel je **Vanaf start** en **Boven vloer** in (meter).
Noord/zuid meten vanaf de westhoek, oost/west vanaf de noordhoek.
Laat **Vanaf start** leeg voor automatische verdeling. **Boven vloer** is
bijvoorbeeld 0,90 m voor een raam met een vensterbank op die hoogte.
De positie en borstwering worden opgeslagen en mee geëxporteerd naar JSON.
De tekening begrenst openingen tot de wand; de calculatie gebruikt steeds
de ingevoerde breedte en hoogte. Dit is een schematische visualisatie,
geen uitvoeringsplan. De 3D-uitsnede toont steeds twee achterwanden; draai de camera om alle vier de wanden te bekijken.

De tekening wordt opnieuw opgebouwd zodra er iets verandert: maten, deuren,
ramen of werkregels. De module `web/plattegrond.js` staat helemaal los van
de rekenkern en gebruikt geen browser-API's die niet in een testomgeving
beschikbaar zijn.

---

## Elektriciteitswerken

Per ruimte staat nu een kaart **Elektriciteit**. Kies een wand, vloer of plafond,
klik een werkpakket aan en vul het **aantal** of de **lengte in meter** in.
Elk toegevoegd pakket begint met 1 stuk/meter; meet de werkelijke hoeveelheid.

| Werkpakket | Eenheid | Materiaal / eenheid (excl. btw) | Arbeidsnorm |
|---|---|---:|---:|
| Stopcontact enkel, inbouw | st | € 12,50 | 0,35 u/st |
| Stopcontact dubbel, inbouw | st | € 23,00 | 0,50 u/st |
| Schakelaar enkelpolig, inbouw | st | € 11,00 | 0,30 u/st |
| Lichtpunt aansluiten | st | € 3,50 | 0,25 u/st |
| Kabel XVB 3G2,5 aanbrengen | m | € 1,65 | 0,06 u/m |
| Kabel XVB 3G1,5 aanbrengen | m | € 1,20 | 0,06 u/m |
| Sleuf frezen in metselwerk | m | € 0,00 | 0,18 u/m |
| Sleuf dichtzetten | m | € 0,85 | 0,10 u/m |

**Dit zijn indicatieve, gekozen startwaarden, geen geverifieerde marktprijzen.**
Pas ze aan in de hoofdtab **Tarieven**, categorie **Elektriciteit**.
Arbeid = hoeveelheid × arbeidsnorm × projectuurtarief. De bestaande materiaal-
marge, korting en btw gelden ook voor deze posten. Bedragen tonen twee decimalen.

- Een enkel/dubbel stopcontact of schakelaar bevat het mechanisme, standaard
  afdekking en inbouwdoos/dozen; geen aparte kabellengte of sleuf.
- Een dubbel stopcontact telt als één dubbel punt (niet als twee enkele).
- Lichtpunten bevatten aansluitmateriaal, geen armatuur.
- Kabels bevatten geen buis, sleuf of aansluitpunt. De kabelkeuze is een
  handmatige raming, geen automatisch advies over kabelsecties.
- Frezen geldt indicatief voor een sleuf tot 3 × 3 cm in baksteen; zonder
  inbouwdoosgat, afvoer, kabel of dichtzetten. Niet voor beton of dragende delen.
- Dichtzetten bevat vulmateriaal; schilderwerk en eindplamuur apart begroten.
- Stopcontacten/schakelaars/lichtpunten worden naar hele stuks naar boven
  afgerond; lengtes mogen decimalen hebben. Ontbrekende hoeveelheid = 0,
  nooit het wandoppervlak. Negatieve hoeveelheden worden 0.
- De snelle m²-modus heeft **geen invloed** op elektriciteitsregels.
- Opslaan, JSON export/import, tarievenherstel en print werken voor alle posten.

**Zonder verdeelkast, keuring, schema’s of AREI-conformiteitscontrole.** Dit is
geen installatieontwerp; laat ontwerp en uitvoering door een vakbekwaam
elektricien beoordelen. Op de offerte staat hiervoor een waarschuwing.
Alle posten zijn nu ook schematisch zichtbaar in 2D/3D. Automatische voorbeeldposities
zijn nadrukkelijk geen installatieontwerp: vul de plaatsing in bij de werkregel.

---

## Sanitair & water

Kies **Sanitair & water** bij de installatiewerken onder de plattegrond.
Kies de locatie (wand/vloer/plafond) en voeg een pakket toe. Het begint met
1 stuk of meter: vul de werkelijk gemeten hoeveelheid in. Ook achteraf kun je
in de werkregel de locatie wijzigen. De werkpakketkeuzelijst is per vakgebied
ingedeeld. Sanitair rekent in zowel detail- als m²-modus per stuk of meter.

| Pakket | Eenheid | Startprijs materiaal excl. btw | Arbeidsnorm |
|---|---|---:|---:|
| Koudwaterleiding meerlagen 16 mm | m | € 3,50 | 0,12 u/m |
| Warmwaterleiding meerlagen 16 mm | m | € 3,50 | 0,12 u/m |
| Leidingisolatie aanbrengen | m | € 1,80 | 0,04 u/m |
| Afvoerleiding PVC 50 mm | m | € 4,50 | 0,15 u/m |
| Afvoerleiding PVC 110 mm | m | € 9,00 | 0,20 u/m |
| Leidingkoppeling monteren | st | € 5,50 | 0,10 u/st |
| Afvoerhulpstuk monteren | st | € 6,00 | 0,12 u/st |
| Afsluitkraan plaatsen | st | € 12,50 | 0,25 u/st |
| Collector met 4 uitgangen plaatsen | st | € 65,00 | 0,75 u/st |
| Staande wc met reservoir plaatsen | st | € 190,00 | 2,00 u/st |
| Lavabo met sifon plaatsen | st | € 120,00 | 1,50 u/st |
| Lavabomengkraan plaatsen | st | € 85,00 | 0,60 u/st |
| Opbouw-douchemengkraan plaatsen | st | € 125,00 | 1,00 u/st |
| Wasmachine-aansluitpunt plaatsen | st | € 35,00 | 0,60 u/st |
| Drukproef waterleiding | st | € 0,00 | 1,00 u/st |

Alle startprijzen zijn **gekozen, indicatieve ramingswaarden**, geen
geverifieerde marktprijzen. Pas ze aan onder **Tarieven → Sanitair & water**.
Dezelfde projectmarge, korting, uurtarief en btw gelden als voor andere werken.
Alles blijft bewaard bij opslaan en JSON export/import; de offerte toont een
waarschuwing over de beperkingen.

### Inbegrepen en uitgesloten

- Waterleidingen: rechte meerlagenleiding 16 mm en kleine bevestigingen;
  koppelingen, isolatie, sleuven en aansluitpunten apart begroten.
- PVC-afvoer 50/110 mm: rechte buis en kleine bevestigingen; bochten en
  T-stukken apart. Geen rioleringsaansluiting, graafwerk, afschotberekening
  of automatisch diameteradvies.
- Collector: basiscollector met vier uitgangen; zonder kast of koppelingen.
- Wc: standaard staande wc met reservoir; geen hang-wc-frame of leidingen.
- Lavabo: standaard lavabo met sifon; kraan, meubel en leidingen apart.
- Douchekraan: opbouwkraan op voorbereide aansluitingen; zonder douchebak,
  wand, afvoer of waterdichting. Wasmachinepunt op voorbereide leidingen;
  zonder toestel, nieuwe leidingen of elektriciteit.
- Drukproef: één arbeidsraming voor een testbeurt, **geen officiële keuring**
  en geen conformiteitsattest. Externe keuring en herstellingen apart.

Dit is een offertecalculator, geen installatieontwerp of controle op
leidingdimensionering, drinkwaterveiligheid, terugstroombeveiliging of
conformiteit. Laat ontwerp en uitvoering door een vakbekwaam installateur
beoordelen. Toestellen en leidingen worden schematisch getekend; automatische voorbeeldposities
zijn geen exacte montagepunten. Vul daarvoor de plaatsing bij de werkregel in.

## Tekening eerst: de ontwerpstudio

De tekening staat bovenaan en krijgt de volle werkbreedte. Ondersteunende
panelen zijn standaard ingeklapt: ruimtematen/openingen, meetstaat/werkregels,
uitgebreide installatie-invoer, project/prijzen en offerte. Ook de legenda,
verwijderlijst, tekenopties en uitleg zijn inklapbaar. Tijdens bewerken blijven
open/gesloten panelen behouden; een herladen pagina start weer rustig ingeklapt.

- **Bestand** bovenaan bundelt Nieuw, Openen en Offerte printen; Opslaan blijft direct zichtbaar.
- **Tekening** in de navigatie of de vaste knop linksonder brengt je terug naar
  het ontwerp en klapt de ondersteunende panelen weer in.
- **Ruimtematen**, **Werkregels**, **Offerte** en **Project & prijzen** openen
  rechtstreeks de juiste sectie. De navigatie toont ook het actuele offertotaal.
- Klik een object om het ter plaatse te selecteren. De selectiebalk toont de
  naam, **Eigenschappen**, verwijderen en selectie opheffen. Alleen Eigenschappen
  opent de invoer; selecteren springt niet meer weg van de tekening.
- Een wand aanklikken of met Enter activeren opent het objectmenu op dat vlak,
  zonder ongevraagd een Gyproc-post toe te voegen.
- Zoom +/− en Herstel werken in bovenaanzicht, vlakaanzicht én 3D; draai- en
  matenknoppen worden alleen in 3D getoond. Een ingezoomde tekening kan randen
  afsnijden: Herstel toont het hele vlak weer.
- Ruimtes en de drie weergaveknoppen blijven direct bereikbaar. Op mobiel zijn
  de zes vlakkaarten compacter en ontstaan geen horizontale paginascrollbalken.
- Afdrukken opent de gesloten offertedetails tijdelijk en herstelt de
  schermtoestand achteraf. De geprinte offerte blijft volledig, met 2D-overzicht.

Optionele browsercontrole: `tools/studio_review.mjs` (Worker of offline bestand).

## Eerst het hele huis, daarna per ruimte

1. Kies **Hele huis → Huiscontour tekenen**. Gebruik een startvorm of teken de
   hoeken zelf op maat. Dit is de binnencontour van één verdieping.
2. Kies **Kamer splitsen**. Geef een exacte X- of Y-positie op, of gebruik
   **Twee grenspunten kiezen** voor een schuine scheidingswand. Tikken klikt langs
   de dichtstbijzijnde wand op 5 cm. Geef beide kamers een naam en pas toe.
3. Herhaal tot de indeling klopt. Selecteer een kamer op het plan, in de kamerlijst
   of met Tab/Enter. **Open geselecteerde ruimte** opent de bestaande werkstudio
   met Gyproc, installaties, openingen, eigen maten en offerteposten.
4. **2D / 3D** toont het hele huis, inclusief schuine wanden, ramen/deuren en
   schematische werk-/tracémarkeringen. Met **+ / − / Passend** zoom je rond de
   geselecteerde kamer. **Hand** verschuift het beeld met muis of touch; pijltjes
   werken ook. In 3D draai je met **Links / Rechts** door vier kijkrichtingen.
   **Passend** herstelt zoom en verschuiving. Escape of touch-annulering herstelt
   een nog lopende beweging. Camerabediening verandert geen maten, offerteposten
   of projecthistorie. Het huisoverzicht staat ongezoomd in de geprinte offerte.
5. De geselecteerde kamer toont meteen vloer, plafond, netto wandoppervlak en
   aantal werkposten. **Dubbelklik** opent de kamer direct; Tab/Enter en de knop
   **Open geselecteerde ruimte** blijven beschikbaar voor toetsenbord en touch.

Een lege startruimte wordt alleen na bevestiging de onverdeelde woning. Bestaande
kamers met werkposten blijven behouden buiten het huisplan én blijven meetellen
in de offerte; dat wordt expliciet vermeld. Via **Kamers op het huisplan & plaatsing**
kun je kamers exact plaatsen/verplaatsen of alleen van het plan halen zonder
werken te wissen. Kamers mogen grenzen delen, niet overlappen of buiten de woning
liggen. Er is geen automatische wanddikte of constructieve gedeelde-wandcalculatie:
afwerking op beide zijden is werk in twee afzonderlijke kamers.

Splitsen kan alleen vóór werkposten, openingen en wandhellingen in de betreffende
kamer zijn toegevoegd. Zo is er geen onveilige automatische verdeling of stil
verlies van bestaande posten. Een tekening wijzigen, splitsen of plaatsing aanpassen
is ongedaan te maken/opnieuw uit te voeren. JSON en lokale/serveropslag bewaren
huiscontour, kamerpositie en schuine wanden.

### Echt schuine wanden, niet alleen diagonale lijnen

Open **Per ruimte → Ruimte tekenen → Schuine wanden (uit het lood)** en voer per
wand de **insprong bovenaan** in meters in. Bijvoorbeeld: 1,00 m bij 2,50 m verticale
ruimtehoogte. De bovenkant komt naar binnen; 0 betekent een rechte wand. Het
plafond wordt kleiner, de zijwanden worden trapezia en de offerte gebruikt de
werkelijke schuine oppervlakken. Dit zie je in 2D (gestippelde bovencontour),
3D, vlakaanzicht en meetstaat. Openingen en objecten volgen het wandvlak;
**Langs helling** is de echte afstand over het schuine vlak.

Dit model ondersteunt naar binnen hellende wanden bij een vlak plafond en een
convexe contour. Combinatie met een hellend plafond of concave L/U-kamer wordt
expliciet geweigerd: deel zo'n vorm eerst op in geschikte kamers. Te grote insprong
of een wegvallend plafond wordt ook geweigerd. Profiel- en materiaalnormen blijven
ramingen, geen gecertificeerde plaatindeling, stabiliteitsberekening of uitvoeringsplan.

## Ruimtes zelf tekenen, extra hoeken en schuine plafonds

Klik **Ruimte tekenen** boven het plan, of bij Ruimtematen & openingen.

- Kies rechthoek, L-, T- of U-vorm, trapezium, afgeschuinde hoek, achthoek of
  driehoek. Gebruik **Vrij tekenen** om zelf de hoekpunten aan te tikken.
- Sluit de contour via het eerste punt of **Contour sluiten**. Sleep punten om
  te corrigeren. Lengtes en binnenhoeken staan in beeld; inspringende hoeken
  kunnen groter zijn dan 180°.
- Onder **Hoeken precies invoeren** staan X/Y-coördinaten, een + om een wand te
  splitsen en een − om een hoek te verwijderen. Toetsenbord op een hoek: pijltjes
  5 cm, Shift 25 cm, Alt 1 cm; Enter opent de coördinaten.
- Bij vrij tekenen kun je ook een volgende wand via **lengte & richting**
  invoeren: 0° rechts, 90° omlaag, 180° links, 270° omhoog. Kies een voldoende
  groot tekenbereik. De eindwand kan sluiten op het eerste punt.
- **Stap terug** werkt op het concept. **Annuleren** of Escape sluit zonder
  projectwijziging; Escape tijdens slepen herstelt eerst de gesleepte hoek.
- Kies een vlak plafond of één **helling langs X/Y**, met hoogte bij het begin
  en aan de overkant. De wanden volgen die helling. De werkelijke schuine
  plafondoppervlakte wordt berekend, niet alleen de bovenprojectie.
- Pas de vorm expliciet toe. Elke rand is nu een afzonderlijke wand in de
  meetstaat, het objectmenu en de vlakaanzichten. Bestaande gebruikte wanden
  die verdwijnen, moeten bewust aan een nieuwe wand worden gekoppeld.
  Werkposten/openingen worden niet stil verwijderd; de actie is terug te draaien.

**Rekenmodel:** binnencontour zonder wanddikte, 3–64 hoeken, minimaal 5 cm per
wand, maximaal 1000 m tekenbereik en minimaal 0,01 m² vloer. Ongeldige/kruisende
contouren worden afgewezen. Lengte/breedte zijn bij vrije vormen het omhullende
bereik; hoogte is bij een helling de maximale hoogte. Wijzigen gebeurt via de
editor, niet door deze afgeleide waarden afzonderlijk te veranderen.

**Beperkingen:** geen ronde wanden, gaten, schuine vloeren of meerdere dakvlakken/nokken.
Uit het lood hellende wanden zijn apart beschikbaar bij een vlak plafond en een convexe kamer. Plaatsingen zijn schematisch: controleer
openingen, tracés en objecten na een vormwijziging. De geselecteerde plaatsing
waarschuwt bij overschrijding van contour/plafond. Profielen en snijverlies
blijven ramingsnormen, geen gecertificeerd uitvoerings- of zaagplan.

Zie [de vergelijking van zes ruimteplanners en verbeterprioriteiten](docs/onderzoek-ruimteplanners.md)
en [het geometrie-/visualisatiemodel](docs/visualisatie.md).

## Getekende tracélengte naar de offerte

Selecteer een leiding-, kabel- of ander werk met eenheid meter. Onder de selectie
staan de **rechte 3D-lengte** en de huidige offertehoeveelheid naast elkaar.
**Acties → Tracélengte overnemen…** vervangt na bevestiging de hoeveelheid door
die eindpuntafstand, afgerond op twee decimalen. De offerte wordt opnieuw berekend.

Dit is nadrukkelijk een optionele overname van het getekende rechte lijnstuk:
geen bochten, reserve, extra leidingen, vermenigvuldiging met aansluitpunten of
installatieadvies. Gebruik alleen toegepaste eindpunten; nog niet bevestigde
invoervelden tellen niet mee. Nulmetingen kunnen niet worden overgenomen.
De getekende eindpunten worden expliciet opgeslagen, ook wanneer ze eerst
voorbeeldposities waren. De actie ondersteunt Ongedaan/Opnieuw en projectopslag.
Slepen, draaien en zoomen wijzigen nog steeds nooit automatisch de hoeveelheid.

Browsercontrole: `tools/trace_review.mjs`, online en met het offline bestand.

## Herhaald plaatsen en centreren

Selecteer een werkregel of opening en open **Acties** in de selectiebalk.

- **Dupliceren…** vraagt bevestiging. Een werkregel wordt volledig gekopieerd,
  inclusief pakket, opties, notitie en hoeveelheid, en telt extra mee in de offerte.
  Ook een automatische m²-post blijft een volledige extra m²-post.
- De kopie krijgt een eigen ID en zelfstandige plaatsing. Waar ruimte is, wordt
  ze maximaal 25 cm verschoven binnen het toegewezen vlak. Zonder vrije ruimte
  kan de kopie overlappen: controleer de positie en aantallen zelf.
- Een opening kopiëren neemt maten en aantal over, en beïnvloedt de aftrek van
  openingen/netto-oppervlakte. Automatisch geplaatste openingen op die wand krijgen
  hun huidige positie expliciet opgeslagen, zodat ze niet door de extra opening verschuiven.
- **Centreren op vlak** centreert een punt/marker in de assen van zijn toegewezen
  wand, vloer of plafond. De verborgen diepte blijft gelijk. Een tracé verschuift
  als geheel, met behoud van de eindpuntvector. Een opening centreert langs de wand;
  maten en borstwering blijven gelijk.
- Beide acties werken met Ongedaan/Opnieuw. Centreren wijzigt geen hoeveelheden
  of prijzen; dupliceren kan dat nadrukkelijk wel doen. Geen automatische botsingscontrole.

Browsercontrole: `tools/acties_review.mjs`, inclusief annuleer/bevestig, offerte,
openingen, tracés en mobiele menubediening.

## Afstanden controleren in de tekening

Kies **Meten** en wijs twee punten aan, of sleep van begin naar einde. De
stippellijn en het meetpaneel tonen de rechte afstand in meter. Onder
**Meetpunten precies invoeren** kun je dezelfde controle via getalvelden uitvoeren.
**Wissen** verwijdert de controlemaat; een volgende meting vervangt de vorige.

- Bovenaanzicht meet in X/Y. Elk vlakaanzicht meet in zijn eigen zichtbare vlak,
  inclusief de hoogte bij wanden en de vaste hoogte van het plafond.
- In 3D kies je expliciet Vloer X/Y, Wand noord X/Z of Wand west Y/Z. Een
  punt wordt op dat meetvlak geïnterpreteerd, niet automatisch op een toestel.
- Zoomen, cameradraaien en beeld verschuiven veranderen de modelafstand niet.
  Wisselen van ruimte, aanzicht, vlak of ruimtematen wist de controlemaat.
- Escape annuleert een lopende meting. In focusmodus sluit een volgende Escape
  het venster. Toetsenbordgebruikers kunnen de meetpunten numeriek invoeren.
- Een controlemaat verandert geen hoeveelheden/prijzen, staat niet in undo/redo
  en wordt niet opgeslagen, geëxporteerd of afgedrukt. Het is geen automatische
  leidinglengte of gecertificeerde inmeting. Klikpunten snappen niet aan objecten;
  gebruik de numerieke invoer voor exacte coördinaten.

Browsercontrole: `tools/meten_review.mjs`; afstandstest: `tests/test_meten.py`.

## Vergroten en het beeld verschuiven

**Vergroten** opent de bestaande tekening in een focusvenster, zonder een tweede
kopie van de scène te maken. Sluit met **Sluiten** of Escape. De geselecteerde
ruimte, camera, objecten en tekenopties blijven behouden. Objecten toevoegen blijft
ook hier mogelijk. **Alle instellingen** sluit de focusmodus en opent het juiste
invoerpaneel. Printen herstelt de focusmodus na de afdrukdialoog.

Gebruik **Hand** om met muis of één vinger het beeld te verschuiven. Met
**Selecteren** verplaats je weer objecten. De middelste muisknop verschuift het
beeld ook tijdelijk. Bij Hand verschuiven pijltjes het beeld; Shift vergroot die
stap. Escape tijdens verschuiven annuleert die camerabeweging, niet het project.
Zoomen gaat via +/− van 75% tot 300%; **Herstel** centreert het volledige beeld.
Dit werkt in bovenaanzicht, vlakaanzicht en 3D. Wisselen van aanzicht of vlak
centreert de verschuiving opnieuw. Camera-instellingen staan niet in undo/redo.

Browsercontrole: `tools/navigatie_review.mjs`, inclusief touch en focus/print-herstel.

## Directe eigenschappen en ongedaan maken

Selecteer een object of opening en klik **Eigenschappen**. Het compacte formulier
blijft bij de tekening: X/Y/Z, eindcoördinaten voor tracés, vlak en aantal/lengte.
Voor openingen zijn positie, borstwering, breedte, hoogte en aantal beschikbaar.
**Toepassen** bewaart de wijziging; **Alle instellingen** opent de volledige
werkregel of ruimtematen. Ongeldige of buiten de wand passende openingen worden
niet toegepast. Een andere selectie of herladen verwerpt nog niet toegepaste invoer.

**Ongedaan** en **Opnieuw** herstellen projectwijzigingen, inclusief plaatsen,
verplaatsen, verwijderen, aantallen en openingmaten. Sneltoetsen op het werkvlak:
Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z of Ctrl+Y. In tekst- en getalvelden blijft de gewone
browser-undo actief. Maximaal 50 stappen per sessie; kort na elkaar typen in
hetzelfde veld wordt gegroepeerd. Herladen, Nieuw, Openen of importeren begint
een nieuwe geschiedenis. De actuele projectversie wordt wel lokaal bewaard.

De geschiedenis bevat het project, niet camera, selectie of opengeklapte panelen.
Posities wijzigen geen prijzen; aantallen en afmetingen kunnen dat wel doen.
Browsercontrole: `tools/edit_review.mjs`; pure historie-test: `tests/test_geschiedenis.py`.

## Objecten verwijderen

Naast elke werkregel in de legenda bij de tekening staat een vuilbak-icoon.
Na bevestiging verwijdert dit de hele werkregel uit de tekening én offerte,
niet alleen zijn symbool. Deuren en ramen hebben daar een eigen vuilbakknop;
verwijderen herberekent de netto-oppervlakte en bijbehorende calculatie.
Annuleren laat alles ongewijzigd. De knoppen werken ook in Vlakaanzicht.

## Objecten toevoegen via één menu

Klik bij Ruimteontwerp op **+ Object toevoegen**, of gebruik de vaste knop
rechtsonder (zichtbaar in Calculator & offerte). Het dialoogmenu bundelt alle
28 werkpakketten en deuren/ramen. Zoek op naam of kies Afwerking, Elektriciteit,
Sanitair of Deuren & ramen. Kies het vlak en geef het aantal of de lengte op.
Bij m²-posten wordt automatisch de gemeten oppervlakte gebruikt.

In Vlakaanzicht wordt het geselecteerde vlak overgenomen. Deuren en ramen
kunnen alleen op een wand worden toegevoegd; hun maten zijn achteraf instelbaar.
Het menu blijft open voor herhaald toevoegen. Sluit met Sluiten, Escape of
buiten het menu klikken. Native dialog zorgt voor modale toetsenbordfocus.
Op mobiel verschijnt het als een onderpaneel met een scrollbare objectlijst.
De bestaande knoppen voor werken en installaties blijven beschikbaar.

Browsercontrole: `tools/object_menu_review.mjs`, met dezelfde optionele tooling
als de andere browserreviews; werkt tegen Python, Worker en standalone HTML.

## Alle werken visualiseren in 2D, 3D & vlakaanzicht

De plattegrond toont nu alle actieve werkregels van de gekozen ruimte:
- Gyproc, voegafwerking en schilderwerk als genummerde vlakmarkering.
- Stopcontacten, schakelaars en lichtpunten als herkenbare symbolen.
- Wc, lavabo, collector en wasmachinepunt met symbolen en indicatieve 3D-volumes.
- Overige kranen, koppelingen en drukproef als schematische symbolen.
- Water warm/koud, afvoer, bekabeling, isolatie en sleuven als gekleurde tracés.

Gebruik de lagen **Gyproc & afwerking**, **Elektriciteit** en **Sanitair & water**
om een druk plan leesbaar te houden. Elk nummer verwijst naar de legenda;
klik het symbool of de legendaregel aan om de bijbehorende werkregel te bewerken.
Eén symbool vertegenwoordigt één werkregel, met een ×-aantal bij meerdere stuks.
Splits een regel als je losse punten op verschillende posities wilt plaatsen.

De tab **Vlakaanzicht** toont elke wand recht van binnenuit, plus een vlakke
projectie van vloer en plafond. Kies het vlak via de zes kaarten boven de tekening.
Metrisch raster, breedte-/hoogtematen en een gefilterde legenda ondersteunen het
positioneren. Muis, touch en pijltjes werken ook in deze aanzichten.

Bij elke installatiepost vind je **Plaatsing in 2D & 3D**:
**X** vanaf west, **Y** vanaf noord en **Z** boven vloer, in meter.
Meterposten hebben bovendien eindcoördinaten **X2/Y2/Z2**. Lege velden krijgen
een duidelijk aangeduide automatische voorbeeldpositie. De tekening begrenst
coördinaten tot de ruimte; de ingevoerde waarden blijven bewaard.

Symbolen, hele tracés, eindpunten, deuren, ramen en genummerde vlakmarkeringen
kun je met muis of vinger **naar hun positie slepen**. Er is 5 cm vastklikken,
Escape om te annuleren en toetsenbordbediening (pijltjes, Shift, Alt). In 3D
volgt het automatische sleepvlak de wand/vloer; kies X/Y, X/Z of Y/Z voor een
andere verplaatsingsrichting. Wandmaten en openingmaten blijven numerieke velden.

**De plaatsing verandert geen prijzen of gemeten hoeveelheden.** Een rechte
tracélijn is geen automatische leidinglengteberekening. Vlakmarkeringen zijn
geen exacte gedeeltelijke oppervlakbedekking; sanitaire volumes zijn geen
productmaten of BIM-objecten. De tekening vervangt geen uitvoeringsplan.

De geprinte offerte bevat de 2D-tekening met alle werken en een genummerde legenda,
onafhankelijk van tijdelijk verborgen schermlagen. Posities blijven behouden in
opgeslagen projecten en JSON export/import. Zie [de visualisatie-uitleg](docs/visualisatie.md).

## Apparaatcompatibiliteit

De layout is getest met Chromium op breedtes van **320 tot 1920 px**, inclusief
mobiele aanraakemulatie. Brede tabellen scrollen binnen hun eigen kaart.
Mobiele bediening heeft knoppen van minimaal 44 px hoog en geld-/meetvelden
met 16 px invoertekst. Donkere modus, verminderde animatie en A4-print vanuit
het tarievenblad zijn gecontroleerd. Dit vervangt geen echte Safari/iPhone-,
Firefox- of Android-hardwaretest.

Zie [de apparaatreview](docs/device-compatibility.md) voor de matrix, beperkingen
en het herhaalbare testschema.

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

Het prijsboek staat in de **eigen hoofdtab Tarieven**, naast **Calculator & offerte**.
Materiaalprijzen en snelle m²-prijzen worden met precies twee decimalen getoond,
evenals het uurtarief en alle bedragen in de offerte, details en 3D-weergave.
Na het bewerken van een geldveld wordt bijvoorbeeld `7.5` weergegeven als `7.50`.
Uurnormen zijn geen eurobedragen en behouden hun eigen precisie.

Zoek op de naam van een tarief of filter op **Materiaal**, **Uurnormen** en
**Snelle m²-prijzen**. **Alleen aangepast** toont uitsluitend tarieven waarvoor
je in deze offerte een eigen waarde hebt ingevuld. De teller vermeldt hoeveel
tarieven zichtbaar en aangepast zijn. De markering **Eigen tarief** betekent
ook bij een gelijk bedrag dat er een expliciete projectwaarde is opgeslagen.

Met **Herstel** naast een tarief verwijder je die eigen waarde. Met
**Alle tarieven herstellen** verwijder je na bevestiging alle eigen tarieven
van deze offerte. De calculatie gebruikt daarna weer de standaardprijzen;
snelle m²-prijzen worden opnieuw afgeleid uit de geldende materiaal- en
uurnormen. Het uurtarief, kortingen, btw en werkregels blijven ongewijzigd.


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
│   ├── plattegrond.js   # 2D-bovenaanzicht en 3D-weergave (SVG)
│   ├── slepen.js        # Muis/touch/toetsenbord: objecten positioneren
│   ├── geschiedenis.js  # Begrensde undo/redo zonder browserafhankelijkheden
│   ├── navigatie.js     # Handgereedschap en toegankelijke focusmodus
│   ├── meten.js         # Niet-destructieve metrische controlemaat
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

---

## Hosting: wat werkt waarom

Niet elke host serveert HTML en JavaScript met het juiste MIME-type, en dat
bepaalt of de app opent:

| Host | `.html` | `.js` | App werkt? |
|------|---------|-------|-----------|
| Cloudflare Worker (onze eigen deploy) | `text/html` | `text/javascript` | ✅ |
| GitHub Pages | `text/html` | `text/javascript` | ✅ |
| onze Python-server | `text/html` | `application/javascript` | ✅ |
| jsDelivr / raw.githubusercontent (GitHub-bestanden) | `text/plain` | `text/plain` | ❌ alleen downloaden |
| lokaal bestand (`file://`) | — | — | ✅ (browser-engine) |

Daarom zijn er twee varianten:

- **meerbestanden** (`bouwcalculator/web/`) — voor onze eigen Worker, Pages en
  de lokale server. De rekenkern is een ES-module.
- **één bestand** (`bouwcalculator/bouwcalculator.html`, circa 312 KiB) — alles inline,
  dus het werkt ook op hosts die HTML als `text/plain` teruggeven of op een
  stickie/schijf. De app rekent dan in de browser.

`bouwcalculator/tools/maak_standalone.py` bouwt de één-bestand-variant uit de
brondbestanden; de Python-tests bewaken dat beide rekenkernels identiek
uitkomen (`tests/test_pariteit.py`).

### Objecten naast het tekenvlak: deur, raam en trap

De kamerwerkstudio heeft een compacte zijrail **Deur · Raam · Trap**, ook op
320 px. Deur/raam behouden hun wandkeuze, presets en voorbeeld. Trap bewaart een
**schematische rechte trap** in `ruimtes[].trappen`: stabiel id, naam, X/Y van de
linkerbovenhoek van de voetafdruk, breedte, vloer-lengte, hoogte, richting
(0/90/180/270 graden) en 2–40 treden. De pijl geeft de stijgrichting aan.

- Klik een trap of gebruik **Objecten & verwijderen** om maten aan te passen of
  de trap te verwijderen. Annuleren wijzigt niets; bewaren/verwijderen kan met
  undo/redo worden hersteld.
- Sleep met muis of touch op het vloerplan of in 3D; positie snapt op 5 cm.
  Escape/pointer-annulering herstelt de oorspronkelijke positie. Wandaanzichten
  blijven via het formulier bewerkbaar. De trap verschijnt ook in het huisplan.
- De voetafdruk moet volledig in de kamer passen, ook bij een concave contour.
  De opgegeven hoogte mag niet boven het plafond komen. Dit is **geen**
  constructieve trap-, optrede/aantrede- of hoofdruimtecontrole.
- Trappen zijn geen wandopeningen en geen werkposten. Prijs en vloeroppervlakte
  blijven ongewijzigd; er ontstaat geen automatische vloersparing of koppeling
  tussen verdiepingen. Voeg eventuele werkzaamheden afzonderlijk toe.
- Python, Worker en offline bewaren dezelfde trapgegevens. Kamers met trappen
  worden niet ongemerkt gesplitst. Oude projecten zonder `trappen` blijven geldig.

Controle: `python3 -m unittest discover -s bouwcalculator/tests`,
`tools/stairs_review.mjs` (online en offline), plus de bestaande insertion-,
compact- en directe-indelingsreviews. Browserreviews gebruiken een geïsoleerd
profiel en schrijven niet naar het projectenarchief.

### Gyproc-platen zichtbaar op het plan

Een Gyproc-werkpost (`gyproc_wand_profiel`, `gyproc_plafond` of `gyproc_direct`)
toont nu een schematische plaatverdeling op het bijbehorende vlak:

- Standaard/15 mm: **120 × 260 cm**; GGL 30 mm: **120 × 240 cm**, overeenkomstig
  het bestaande prijsboek. Rechtop op de wand, in lokale vlakmaten op het plafond.
- Zichtbaar in kamer-2D (naden langs de wand), 3D, vlakaanzicht en huisoverzicht.
  Deuren en ramen worden uit de plaatlaag gemaskeerd. Concave contouren, hellende
  plafonds en schuine wanden blijven begrensd door hun werkelijke vlakcontour.
- **Tekenopties → Gyproc-platen** verbergt de naden zonder werkposten of bedragen
  te wijzigen. De bestaande laag **Gyproc & afwerking** verbergt ze eveneens.
- Eén zichtbare laag per vlak; geen automatisch zaagplan, schroefpatroon,
  constructieve naadcontrole, exact gedeeltelijk bekleed oppervlak of weergave
  van alle lagen/zijden. De aantallen en het snijverlies blijven uitsluitend uit
  de bestaande calculatie komen. De naden zijn geen nieuwe sleepbare objecten;
  de bestaande werkregelmarker blijft bewerkbaar en verplaatsbaar.
- Een SVG-patroon houdt de renderkosten beperkt; in het bovenaanzicht worden op
  uitzonderlijk lange wanden maximaal circa 400 naadmarkeringen getoond.

Browsercontrole: `tools/panels_review.mjs` (online/offline, beide thema's,
320–1440 px, materiaalformaten, uitsparingen, vormgeometrie en ongewijzigde
project-/prijsgegevens).

### Trap draaien met voorbeeld

Klik een trap om **Trap bewerken** te openen. **90° links / 90° rechts** draait
rond het middelpunt van de voetafdruk en past X/Y daarop aan. Het kamerplannetje
laat de nieuwe stijgrichting onmiddellijk zien. De bestaande richtingskeuze en
exacte X/Y-invoer blijven beschikbaar.

Draaien is een concept: pas **Trap bewaren** wijzigt het project en de
undo-geschiedenis. Sluiten/Escape annuleert. Een trap buiten de kamer of boven
het plafond kan niet worden bewaard; verplaats het concept of draai terug.
Prijs en werkposten blijven ongewijzigd. Controle:
`tools/stair_rotation_review.mjs` (online/offline, vier kwartslagen, beide
richtingen, middelpunt, annuleren, bewaren, undo/redo, ongeldige plaatsing en
320–1440 px).

### Objecten verslepen in kamer én huis

Alle catalogusobjecten en werkmarkeringen, deuren, ramen en trappen zijn nu
rechtstreeks verplaatsbaar in het huisoverzicht én de kamerwerkstudio. Gebruik
**Selecteren**; **Hand** verschuift uitsluitend het beeld. In het huisplan:

- Sleep met muis, pen of touch; vastklikken op 5 cm, Alt voor vrije plaatsing.
- Tab/pijltjes werken ook: 5 cm, Shift 25 cm, Alt 1 cm. In 3D volgen wandobjecten
  het wandvlak; een raam kan ook omhoog/omlaag. Deuren blijven op vloerniveau.
- Huisverplaatsingen zijn een concept tot loslaten. Escape/pointer-annulering
  herstelt de positie; buiten de kamer/plafond plaatsen wordt geweigerd.
- Dubbelklik of Enter op een huisobject opent de bijbehorende kamer voor de
  bestaande eigenschappen. Undo/redo en opgeslagen projecten bewaren posities.
- Een Gyproc-werkmarkering verschuift de **hele schematische plaatverdeling**.
  Het dekkingsvlak blijft aan de gemeten wand/plafond gekoppeld. Er ontstaan geen
  losse plaatobjecten en oppervlakten, aantallen, snijverlies en prijzen wijzigen
  niet door het verslepen. Tracés verplaatsen als geheel; afzonderlijke
  eindpunten zijn in de kamerstudio instelbaar.

Controle: `tools/all_objects_review.mjs` (hele catalogus, kamer/huis,
2D/3D, muis/touch/toetsenbord, uitsluitend conceptmutatie tijdens huis-slepen,
annuleren, undo/redo en identieke calculatietotalen).

### Direct zichtbare knop Verwijderen

Selecteer in de kamertekening een raam, deur of werkobject. **Verwijderen** staat
nu met tekst in de selectiebalk én in de rechter knoppenkolom, zonder eerst een
paneel open te klappen. De objectenlijst heeft ook een vuilbakknop naast trappen.
In het huisoverzicht verschijnt na objectselectie een balk met objectnaam en
**Verwijderen**; Tab-focus op een object werkt eveneens.

Elke verwijderactie vraagt bevestiging. Openingen verwijderen berekent de netto
oppervlakken en offerte opnieuw; een werkobject verwijderen verwijdert ook zijn
offertepost. Trappen verwijderen wijzigt alleen de tekening. Undo/redo blijft
beschikbaar en een verouderde huisobjectselectie wordt automatisch opgeheven.
Controle: `tools/delete_review.mjs` (online/offline, deur/raam/werk/trap,
bevestigen/annuleren, herberekening, undo en 320–1440 px).

### 3D-model met slepen rondom bekijken

Kies **3D → 3D-model draaien** (ronde pijl). Sleep links/rechts met muis, pen of
één vinger om de camera vrij 360° rond de kamer of het huis te bewegen. Dit is
horizontaal rondom kijken; de verticale kijkhelling blijft isometrisch.

- Scroll boven het 3D-model om te zoomen; +/− blijven beschikbaar op touch.
- **Hand** verschuift het beeld; **Selecteren** verplaatst objecten. De nieuwe
  cameramodus verplaatst geen objecten en voegt geen undo-stappen toe.
- **Escape**/pointer-annulering herstelt de camera vóór de sleepbeweging.
- Met focus op het model draaien links/rechts 7,5° (Shift: 30°) en zoomen
  omhoog/omlaag. In de kamer activeert **R** de draaistand; **V/H/M/F** blijven
  selecteren/hand/meten/passend. De knop is in 2D verborgen.
- De bestaande 90°-knoppen blijven werken. **Passend** herstelt zoom en pan;
  in het huis blijft de gekozen kijkrichting daarbij behouden.
- Camera-instellingen zijn alleen weergavestatus; project, maten, opgeslagen
  objectposities, offerteprijzen en de vaste offerteplattegronden veranderen niet.

Controle: `tools/orbit_review.mjs` (online/offline, muis/touch/toetsenbord,
vrije hoek, annuleren, wielzoom, verschuiven, passend, 2D-overgang en geen
project-/prijs-/undo-/API-mutatie). De pure camerageometrie en drag-projecties
worden ook met niet-rechte kijkhoeken getest.

### Herbruikbare objectcombinaties

Open **Object** naast de tekening → **Combinaties**. Onder **Nieuwe combinatie
bewaren uit deze kamer** kies je bestaande werkposten, deuren/ramen en trappen,
geef je de set een naam en bewaar je die. Daarna kun je de set ook in een ander
project of een andere kamer kiezen en via **Voorbeeld bekijken** toevoegen.

- Werkopties en aantallen/lopende meters worden overgenomen. m²-werk wordt
  opnieuw uit de doelkamer gemeten; de actuele tarieven, korting en btw gelden.
  Het voorbeeld toont de verandering van het volledige offertotaal, inclusief
  het effect van nieuwe openingen op bestaande werkposten.
- Behoud oorspronkelijke vlakken, of plaats wandobjecten/openingen op de in
  het objectmenu gekozen wand. Vloer/plafond blijven behouden. Posities zijn
  optioneel; werkposities blijven alleen bij hetzelfde vlak behouden.
- Deuren, ramen, werkposities/tracés en trappen moeten in de doelkamer passen.
  Een fout voegt niets toe. Controleer de plaatsing op de tekening: dit is geen
  automatische indelingsplanner of controle op onderlinge botsingen.
- Toevoegen maakt nieuwe object-ID's, verandert geen bronobjecten en vormt één
  undo-stap. Een gewijzigd project, gewijzigde kamer, instelling of opgeslagen
  combinatie vereist een nieuw voorbeeld.
- Maximaal 30 combinaties, elk met maximaal 100 objecten. De bibliotheek staat
  uitsluitend in de browser (`bouwcalculator.combinaties.v1`), ook offline.
  Project-/klantvelden, werknotities en tarieven worden niet opgeslagen.
  Namen van gekozen objecten en de zelfgekozen combinatienaam worden wel bewaard.
  Geen synchronisatie of opname in projectbestanden; een ander apparaat of een
  andere browser heeft zijn eigen bibliotheek. Bewaar online en offline zo nodig
  elk apart: hun browseropslag kan verschillen.
- Wissen vraagt bevestiging en wist alleen de bewaarde set, niet de objecten in
  offertes. Beschadigde of geblokkeerde opslag wordt niet stilzwijgend vervangen;
  bij een opslagfout blijft de bestaande bibliotheek behouden.

Controle: `tools/combinations_review.mjs`, zowel met `APP_URL=http://localhost:8096/`
als zonder `APP_URL` voor de standalone. Test selectie van gemengde objecten,
privacyvelden, opslag/herladen, voorbeeld zonder mutaties of rekenverzoeken,
nieuwe ID's, opties/aantallen/m², posities, wandmapping, één undo/redo, verlopen
voorbeelden, onbekende werkpakketten, te kleine kamers, corrupte/volle opslag,
annuleren/wissen en 320/390/768/1440px zonder horizontale overflow.

### Volgende stap bij objecten

Het objectmenu toont na toevoegen passende **Volgende stap**-knoppen, los van
zoekterm/categoriefilter. Bijvoorbeeld sleuf → kabel → stopcontact/schakelaar of
lichtpunt → sleuf dichtzetten. Er zijn ook routes voor water/afvoer, aansluitingen,
isolatie/druktest en Gyproc → voegafwerking → schilderen. Dit zijn optionele
catalogussuggesties, geen uitvoeringsvoorschrift, dimensionering, AREI-controle of
controle op geschiktheid van de sleuf. Niet-beschikbare producten worden niet
verzonnen: een aparte buispost en algemene eindafwerking van metselwerk ontbreken
bijvoorbeeld in het huidige prijsboek.

- Elke klik voegt uitsluitend het gekozen object toe, op hetzelfde vlak, met een
  eigen undo-stap. Er worden geen volledige ketens automatisch gefactureerd.
- De knop toont zijn hoeveelheid: meterposten stellen de laatst gebruikte
  meterlengte op dat vlak voor; stukposten starten op één. Achteraf aanpassen via
  eigenschappen. De gewone catalogus blijft het eigen aantal-/lengteveld gebruiken.
  Het tracé wordt niet gekopieerd; controleer de plaatsing op de tekening.
- Eerder aanwezige posten blijven mogelijk (meerdere aansluitpunten zijn normaal)
  maar krijgen de melding ‘al op dit vlak’. Er is geen claim dat het werk klaar is.
- Bij opnieuw openen krijgt een geselecteerde werkpost voorrang, anders de laatste
  post op het gekozen vlak. Een ander vlak krijgt zijn eigen context. Overslaan
  wijzigt geen offerte. Een verwijderde/gewijzigde bron wordt niet stilzwijgend gebruikt.
- Aan het einde van een route blijft de volledige catalogus beschikbaar. m²-knoppen
  vermelden expliciet dat het hele gekozen vlak opnieuw gemeten wordt.

Controle: `tools/next_steps_review.mjs` online en standalone: sleuf/kabel/punt/dichten,
zoekfilter, geen automatische extra posten, 5 m behouden na één stuk, vlakcontext,
undo/hervatten, verlopen bron, overslaan en 320–1440px zonder horizontale overflow.

### Mobiele ruimtewizard

De standaardweergave begeleidt per actieve ruimte door zeven stappen:
**maten → ramen/deuren/trap → elektriciteit → sanitair/water → Gyproc → afwerking
→ offerte**. De bestaande interactieve tekening blijft onder de vraag staan.
Op mobiel staan Vorige/Volgende vast onderaan met veilige schermrandruimte.
De stapindicator toont alleen de huidige stap; werkstappen zijn optioneel.

- Maten beginnen met de huidige waarden, niet met een leeg of nieuw project.
  Alleen bevestigen past ze toe. Zelf tekenen blijft een alternatief met de
  bestaande tekeneditor. Bij bijzondere vormen, huisplaatsingen of bestaande
  objecten zijn de directe maatvelden alleen-lezen; gebruik de tekeneditor.
- ‘Ja’ opent de objectkeuzes zonder offertewijziging. Een onderdeel kiezen opent eerst de vragen over plaats en hoeveelheid. Pas
  ‘Toevoegen aan deze kamer’ voegt één werkpost toe, met de normale undo/rekenlogica. Een m²-post
  meet het volledige gekozen vlak, nooit automatisch alle wanden. Plafond-Gyproc
  gebruikt het plafond; wand-Gyproc vereist een wand. Hoeveelheid en muur zijn te wijzigen met ‘Aanpassen’ in het stappenplan.
  Verdere werkopties en posities zijn te wijzigen bij Eigenschappen. Er worden geen voorgeschreven elektrische
  circuits, leidingdiameters of technische conformiteitscontroles verondersteld.
- Overslaan en teruggaan verwijderen geen werken. Een andere actieve kamer start
  bij zijn eigen maten; de bestaande gegevens en werkposten blijven behouden.
- De offertestap toont ook de bestaande project-/prijsinstellingen voor klant,
  btw, korting en uurtarieven, met opslaan, print/PDF en ‘Nog een ruimte’.
- Onder ‘Meer mogelijkheden’ herstelt ‘Zelf alles bedienen’ alle bestaande panelen;
  ‘Terug naar stap voor stap’ keert terug.
  Het huisplan gebruikt vrij ontwerpen. `?weergave=vrij` opent rechtstreeks de
  geavanceerde weergave, ook bruikbaar voor bestaande browserregressies.
- Wizardstappen zijn weergavestatus, geen nieuw projectschema. Bestaande JSON,
  offlinecalculatie, prijsboek en server blijven ongewijzigd. De standalone bevat
  de complete wizard, zonder extra externe bestanden of dependencies.

Controle: `tools/wizard_review.mjs` online/standalone: ongeldige/gewijzigde maten,
geen toevoeging door alleen ‘Ja’, aantallen, Gyproc-vlakken, overslaan, offerte,
extra ruimte, kamerwissel zonder berekening, beschermde maten, tekeneditor,
vrij ontwerpen en 320/390/768/1440px zonder horizontale overflow.


### Begeleiding zonder computerkennis

De begeleide schermen gebruiken gewone taal en leggen telkens uit wat een klik
betekent. Eén onderdeel toevoegen volgt **kiezen → plaats/aantal invullen → prijs
bekijken → bevestigen**. Alleen kiezen, annuleren of verder bladeren voegt niets
stilzwijgend toe. Een open bewerkformulier blokkeert stapnavigatie tot bewaren of
annuleren. Bij overschakelen naar zelf bedienen wordt om bevestiging gevraagd
als er nog een onderdeel niet bewaard is.

- Voorbeeldmaten zijn als voorbeelden aangeduid; er staat hoe je centimeters naar
  meters omzet. Een komma én een punt werken voor maten en meterlengtes, ongeacht
  de getalnotatie van de browser. Aantallen zijn hele stuks. Invoerfouten worden in
  het Nederlands uitgelegd en het veld krijgt focus.
- De prijs vóór bevestigen is het nieuwe **volledige offertotaal**, inclusief btw,
  met het verschil ten opzichte van de huidige offerte. Het is geen prijs alleen
  voor deze kamer. De rekenmotor berekent lokaal: geen projectmutatie of API-aanroep.
- ‘Al toegevoegd in deze kamer’ toont aantallen, muur en rechtstreeks Aanpassen/
  Weghalen. Aanpassen behoudt ID, werkopties en notitie. Weghalen vraagt bevestiging;
  bestaande undo/redo blijft werken via de tekening.
- Gyproc-keuzes hebben begrijpelijke namen en vragen geen aantal platen. Alleen
  geschikte vlakken zijn beschikbaar: wandbekleding op muren, plafondbekleding
  op het plafond. Niet alle muren worden automatisch tegelijk gefactureerd.
- De algemene invoegrail is verborgen in de begeleide kamerweergave zodat gebruikers
  niet per ongeluk een andere toevoegroute openen. De tekening blijft rustig, maar objecten zijn rechtstreeks sleepbaar;
  Meer mogelijkheden biedt de oorspronkelijke bediening. De laatste stap geeft
  een korte checklist voor klantgegevens, prijscontrole, bewaren en afdrukken.

Extra controle: `tools/novice_review.mjs` online/standalone op mobiel: komma/punt,
prijs vóór bevestigen, geen API- of projectmutatie bij kiezen/voorbeeld, blokkeren
van onbewaarde stapwissels, hele stuks, annuleren, 320/390px en print. De uitgebreide
`wizard_review.mjs` controleert ook direct aanpassen, bevestigen/annuleren van
weghalen en de beschermde Gyproc-vlakkeuzes.

### Leesbare tekenmaten en rechte hoeken

In de gedeelde ruimte-/huiscontour-editor staat een contrastrijke, vaste uitleesbalk
bij de tekening: hoeknummer, X en Y in meter (tot op een millimeter). X loopt naar
rechts en Y naar beneden. Aanwijzen, slepen en toetsenbordfocus tonen de betreffende
hoek; tijdens vrij tekenen zie je de voorgestelde nieuwe positie. SVG-maatlabels
schalen mee met de schermbreedte en hebben een duidelijke achtergrondomlijning.

**Vastklikken op rechte hoeken** staat standaard aan, los van het raster van 5 cm:
- bij plaatsen klikt een bijna horizontale/verticale lijn vast op de vorige hoek;
- na een schuine lijn is ook een exacte loodrechte vervolglijn mogelijk;
- bij hoekverplaatsing helpen de aangrenzende hoeken met X/Y-uitlijning;
- een stippellijn en tekst tonen de actieve uitlijning, binnen 12 schermpixels;
- zet het vinkje uit voor vrij tekenen; Alt onderdrukt de hoekhulp tijdelijk.

Exact ingevoerde coördinaten en numeriek ingevoerde wandrichtingen worden niet
stilzwijgend aangepast. Haaks tekenen maakt bestaande schuine wanden niet ineens
recht. Alles blijft een ontwerp tot Toepassen; annuleren en stap terug behouden
hun bestaande werking. Dit controleert geen onderlinge botsingen of bouwkundige
uitvoerbaarheid.

Controle: `tools/drawing_snap_review.mjs` online/standalone voor X/Y-uitlijning,
loodrechte vervolgwand, twee aangrenzende hoeken, buiten tolerantie, echte
pointerinvoer, Alt, leesbalk, projectisolatie/annuleren en 320/390/768px.

### Strikt begeleide keuzes: plan → elektriciteit

De begeleide weergave toont alleen het huidige beslispunt. De voortgang is een
leesbare stapindicator, geen reeks links naar toekomstige schermen. Tijdens de
vragen zijn algemene tabbladen, bestandacties, kamerwissels en vrije bediening
verborgen. De tekening laat bestaande objecten rechtstreeks verslepen; de kamervorm verandert
alleen via de eigen maat-/tekenstap. De volledige bediening is beschikbaar na de controle
van de offerte, of rechtstreeks via `?weergave=vrij`.

Elektriciteit heeft een eigen deelwizard (`web/elektriciteit-wizard.js`):
1. Eerst toestemming om extra elektriciteitswerken te begroten.
2. Aantal nieuwe stopcontacten → muur → prijs → expliciet bevestigen.
3. Eventueel nog een andere muur; daarna schakelaars en plafondlichtpunten.
4. Sleuf nodig? Ja / nee / nog onbekend. Geen veronderstelde sleuflengte op basis
   van aansluitpunten; de gebruiker vult gemeten meters per muur in.
5. Alleen na een toegevoegde sleuf: dichtzetten? Ook dit krijgt een eigen prijs
   en bevestiging. Het voorstel geldt voor de laatst toegevoegde sleuf, niet voor
   alle sleuven in het project.
6. Overzicht van werkelijk opgenomen posten en wat de vakman nog moet controleren.

- ‘Geen extra nodig’ slaat alleen de huidige vraag over, zonder bestaande regels
  te wissen. Bestaande aantallen worden vermeld; revisits vragen extra aantallen
  zodat bestaande regels niet stilzwijgend worden vervangen of opnieuw geteld.
- Hoeveelheid, plaats en bevestiging zijn aparte beslissingen. Een voorbeeld
  verandert geen project of offertegeschiedenis. Een gewijzigd project vereist
  opnieuw controleren van de prijs. Elke bevestiging vormt één wijziging.
- Op het scherm na toevoegen kan de laatste toevoeging worden weggehaald bij een
  vergissing, waarna dezelfde vraag terugkomt.
- Kabeltype, kabelafstand, circuits en beveiliging worden niet gegokt. Ze worden
  hier niet automatisch begroot. De controlewaarschuwing blijft ook in de laatste
  offertestap zichtbaar wanneer elektriciteitswerken aanwezig zijn. Dit is geen
  verklaring dat een installatie compleet of conform is.
- ‘Nog onbekend’ wordt in het huidige elektriciteitsoverzicht als onbeslist getoond,
  zonder een sleufpost aan te maken. Die keuze is sessiestatus, geen opgeslagen
  technische keuring of projectveld. Na herladen blijft de algemene waarschuwing
  over volledigheid van elektrische posten gelden.
- De eerste sanitairkeuze is beperkt tot toilet, lavabo, douche en wasmachine;
  leidingen/aansluitingen zijn niet impliciet inbegrepen. De eindcontrole meldt
  dat ontbrekende onderdelen apart moeten worden begroot.

QA: `tools/guided_electricity_review.mjs` online en standalone voor de volledige
volgorde, gescheiden hoeveelheden/plaatsen/prijzen/bevestiging, geen gegokte kabels,
onbesliste sleuf, verlopen prijsvoorbeeld en mobiele schermen. De bestaande
`wizard_review.mjs` en `novice_review.mjs` volgen nu eveneens de strikte volgorde;
ze controleren ook correcties, komma-invoer, hele aantallen, overige werkstappen,
planeditor en terugschakelen naar de volledige bediening.

### Actuele wizard: eerst plan, vervolgens elke wand

Deze route vervangt de eerdere kamerbrede werkvolgorde:

1. **Plan vastleggen.** Vul binnenmaten en naam in, of teken de vorm. De kamer
   toont de werkelijke vorm en het afgeleide aantal wanden: geen los ingevoerd
   wandenaantal dat niet met de geometrie overeenkomt. Bevestig daarna het
   genummerde plan met de lengte van elke wand en de kamerhoogte.
2. **Wand voor wand.** Per wand komen achtereenvolgens ramen/deuren, elektriciteit,
   sanitair, Gyproc en afwerking. Daarna volgt een controle van alleen die wand.
   Alleen bevestigen van die controle gaat door naar de volgende wand.
3. **Plafond apart.** Na alle wanden kunnen plafondbekleding en plafondlichtpunten
   worden toegevoegd en geplaatst, gevolgd door plafondafwerking en de offerte.

Een klein plan markeert de huidige wand. De grote tekening toont het bijbehorende
vooraanzicht, zodat gebruikers niet hoeven te raden welke wand bedoeld wordt.
De wandkeuze is vastgezet in objectformulieren en de openingseditor; objecten van
andere wanden verschijnen niet in het actuele werkoverzicht. Buiten de wizard
blijft de openingseditor vrij van wand kunnen wisselen.

Elektrische aansluitpunten worden **één voor één geplaatst**, ook als de gebruiker
vooraf meerdere stuks kiest. Elk punt krijgt een afstand langs de huidige wand en
hoogte boven de vloer, daarna zijn eigen prijscontrole en bevestiging. Stoppen
met de resterende punten voegt niets automatisch toe. Meterposten krijgen een
begin, einde en hoogte voor het schematische tracé; de opgegeven gemeten meters
blijven de offertehoeveelheid. Dichtzetten neemt het laatst bevestigde tracé over.

Sanitaire toestellen vragen eveneens afstand/hoogte voor hun markeringspositie.
Plafondlichtpunten krijgen X/Y binnen de kamer en volgen de plafondhoogte. Punten
buiten de wand/kamer of boven een schuin plafond worden geweigerd, niet stilzwijgend
verplaatst. Dit blijft een schematisch plaatsingsplan: geen botsingscontrole,
installatieontwerp of verklaring dat alle benodigde posten inbegrepen zijn.

QA: `tools/wall_wizard_review.mjs` controleert vier wanden, afgeleide wandtelling,
wandvergrendeling, twee afzonderlijk geplaatste stopcontacten, ongeldige posities,
Gyproc, alle controles, plafondlichtpunt en mobiele breedtes. `wall_shape_review.mjs`
controleert een zelfgetekende L-kamer met zes wanden, stabiele wand-ID's, alle
wandstappen zonder offertewijzigingen en reset bij een nieuw project.
De oude `wizard_review.mjs`/`guided_electricity_review.mjs`-ingangen verwijzen naar
de nieuwe wandregressie; `novice_review.mjs` controleert de actuele komma-invoer,
hele aantallen, bevestiging en corrigeren van een toevoeging.


### Bestaande objecten direct verslepen, ook tijdens de wizard

De wizard blokkeert de tekening niet meer met `inert` of `pointer-events:none`.
Zichtbare werkobjecten, volledige werkvlakmarkeringen, leidingen, ramen/deuren en
trappen blijven direct te verplaatsen met muis/touch of toetsenbord. Losse
Gyproc-platen blijven onderdeel van het volledige werkschema, geen individuele
sleepobjecten. De bestaande geometrie-, begrenzings- en undo/redo-regels gelden.

Tijdens begeleiding krijgt object-slepen automatisch voorrang als een eerdere
vrije ontwerpsessie nog Hand/Draaien/Meten geselecteerd had. Verborgen
camerasneltoetsen H/M/R veranderen de wizard niet ongemerkt van gereedschap.
Vrij ontwerpen behoudt wel de expliciete camera-/meetmodi. Een lege wand aanklikken
opent tijdens de wizard geen catalogus: de huidige vraag blijft de toevoegroute.
De positiehulp is weer zichtbaar; extra panelen blijven verborgen.

Verplaatsen verandert geen hoeveelheden of tarieven. Bij ramen/deuren blijven de
bestaande begrenzingen gelden. Een nog niet bevestigd wizardvoorbeeld ziet een
inmiddels gewijzigde objectpositie als gewijzigd project en vraagt herbevestiging.

Controle: `tools/wizard_drag_review.mjs` voor alle werkpakketten met toetsenbord,
venster/trap met echte pointerbewegingen, herstel uit Hand, Escape, mobiele touch
en ongewijzigde totalen. `all_objects_review.mjs` blijft de vrije huis-/kamerbediening
controleren via `APP_URL=http://localhost:8096/?weergave=vrij`.

### Elektriciteit actueel: aansluitpunten eerst, alle keuzes grafisch

De wizard behandelt per wand het aantal nieuwe aansluitpunten (0–100), daarna
**per punt**: type (stopcontact/schakelaar/lichtpunt), enkel/dubbel stopcontact,
inbouw/opbouw, plaats op de wand, sleuf nodig (ja/nee/onbekend), gemeten
sleuflengte en tracé, dichtzetten (ja/nee/onbekend), kabelkeuze en afzonderlijke
kabellengte. Elke keuze heeft een pictogram of een schematisch wandaanzicht.
De grote bestaande tekening blijft beschikbaar en bestaande objecten sleepbaar.
Een dubbel stopcontact telt als één dubbel aansluitpunt.

Sleuven worden per punt apart gerekend, niet als gedeeld netwerk. Een expliciete
waarschuwing vraagt gedeelde meters niet dubbel te tellen. Inbouw leidt niet
automatisch tot frezen. De schematische rechte lijn kan korter zijn dan de
werkelijk gemeten route met bochten, maar niet langer. Onbekende sleuf-, kabel-
en dichtzetkeuzes worden als nog-te-bepalen werknotities op de offerte bewaard.
Dit is geen elektrisch stroomkringontwerp of automatische materiaalkeuring.

Een overzicht toont onderdelen, totale offerteprijs en prijsverschil. Pas na
expliciete bevestiging wordt het volledige punt met alle gekozen werken in
één undo-stap toegevoegd. Veranderde offertes vereisen prijsherbevestiging.
Voor opbouw zijn drie aparte, aanpasbare recepten toegevoegd: enkel/dubbel
stopcontact en schakelaar. Hun materiaal-/arbeidsprijzen zijn **indicatieve
richttarieven, geen geverifieerde actuele marktprijzen**; de wizard vermeldt dit.

Optioneel bewaren gebruikt dezelfde lokale combinatiebibliotheek (maximaal
30 sets, 100 onderdelen per set). Klantvelden, tarieven en werknotities worden
niet meegenomen. Bij een volgend punt kunnen sets met precies één aansluitpunt
(aantal 1), optioneel sleuf, dichtzetten en kabel als voorstel dienen. Uitvoering,
plaats, sleuf en kabel worden opnieuw bevestigd; de prijs gebruikt actuele
instelbare tarieven. Oude sets blijven beschikbaar via Object → Combinaties.
Opslaan verandert de offerte niet. Volle/geblokkeerde/corrupte opslag wordt niet
overschreven. Verwijderde bronregels verhinderen onvolledig bewaren.

Controle: `tools/connection_wizard_review.mjs` online/standalone dekt uitvoering,
plaatsing, afzonderlijke sleuven/kabelmeters, onbekende details, expliciete
bevestiging, verlopen prijsvoorbeelden, opslag/hergebruik en foutieve opslag.
`trench_wizard_review.mjs` verwijst voor compatibiliteit naar deze test; dit is
geen extra onafhankelijke suite. Wand-, ruimtevorm-, novice- en sleepregressies
blijven beschikbaar. Python/JavaScript-pariteit omvat alle nieuwe opbouwrecepten.

### Klikbare begeleiding en het 3D-eindbeeld

Aantallen aansluitpunten hebben 1/2/3/4-keuzes en min/plus (0–100), met
een handmatig veld voor grotere aantallen. Ook stuksaantallen in de overige
wizardonderdelen hebben klikknoppen. Vanaf de typekeuze staat het voorgestelde
aansluitpunt op de wandtekening. Dit blijft uitsluitend een lokaal ontwerp.
Bij de plaatsingsstap: tik of sleep op de wand, kies Links/Midden/Rechts of een
voorbeeldhoogte, of gebruik pijltjestoetsen per 10 cm. Exacte maten blijven
handmatig aanpasbaar. Hoogtes zijn startvoorstellen, geen installatienormen;
buiten de werkelijke wand of boven een schuin plafond plaatsen wordt geweigerd.

Het eindscherm biedt offerte bewaren/PDF én knoppen voor 3D van de ruimte en
het hele huis, met een zichtbare terugknop naar de offerte. Gezamenlijke 3D
vereist dat ruimtes op het huisplan zijn geplaatst; losse kamers worden niet
automatisch ingedeeld. 3D bekijken verandert geen maten, werkposten of prijzen.
`tools/click_guidance_review.mjs` test klikken, tellen, muisslepen, aanraken,
toetsenbord, mobiele breedtes en de retourroute 3D → offerte.

### Hele wizard: één vraag per scherm

De actuele begeleiding en audit staan in [docs/WIZARD_AUDIT.md](docs/WIZARD_AUDIT.md).
Kamermaten, ramen/deuren, sanitair, Gyproc, afwerking en het eindscherm zijn nu
opgedeeld in kleine vragen. Wand-/plafondvoorbeelden blijven zichtbaar; knoppen
passen maten/aantallen aan. Nieuwe werkposten worden uitsluitend op de laatste
bevestigingspagina toegevoegd. De vorm-, huis- en trapeditors behouden hun
specialistische bediening. Controleer de volledige route met
`tools/full_wizard_review.mjs`, naast de bestaande regressies.
