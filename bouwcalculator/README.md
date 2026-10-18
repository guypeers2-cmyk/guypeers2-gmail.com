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
python3 -m unittest discover -s bouwcalculator/tests -v   # 57 tests
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
   geselecteerde kamer. Het huisoverzicht staat ook in de geprinte offerte.

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
