# Alle werken in 2D en 3D

## Wat staat op het plan?

De meetstaat van de gekozen ruimte is de bron. Elke positieve werkregel krijgt
een nummer; nulhoeveelheden worden niet als geplaatst werk getekend. Ruimteknoppen
wisselen tussen de plannen van kamers. Er is nog geen samengevoegde woningplattegrond.

- Afwerking/Gyproc: genummerde vlakmarkeringen, inclusief vloer en plafond.
  In 3D zijn de twee achterwanden zichtbaar; draai de camera voor de andere wanden.
- Elektriciteit: symbolen voor stopcontacten, schakelaars en lichtpunten;
  lijnen voor kabels en sleuven. Een dubbel stopcontact is één dubbel punt.
- Sanitair: symbolen voor alle toestellen/hulpstukken en de drukproef.
  Wc, lavabo, collector en wasmachinepunt hebben bovendien indicatieve 3D-volumes.
- Tracés: koud water blauw, warm water rood, afvoer groen, elektriciteit oker,
  sleuven paars en gestreept. Overige sanitaire meterposten groen.
- Eén symbool per werkregel, niet één per fysiek onderdeel. `× 4` betekent
  bijvoorbeeld vier stopcontacten op dezelfde schematische regel. Splits de
  regel in vier regels als je vier afzonderlijke plaatsingen wilt vastleggen.

![2D-meetstaat](2d-installaties.png)

![3D-meetstaat](3d-installaties.png)

## Plaatsing invoeren

Open bij een installatiepost **Plaatsing in 2D & 3D**.

| Veld | Betekenis |
|---|---|
| Start X | Afstand vanaf de westzijde, meter |
| Start Y | Afstand vanaf de noordzijde, meter |
| Hoogte Z | Afstand boven de vloer, meter |
| Eind X/Y/Z | Eindpunt van een meterpost, meter |

Leeg = automatische schematische voorbeeldplaatsing. Een deels ingevulde
plaatsing gebruikt voor de overige velden nog automatische waarden.
Coördinaten buiten de ruimte worden alleen voor de weergave begrensd, niet
in het project overschreven. Negatieve plaatsingscoördinaten worden bij invoer
naar nul genormaliseerd. Wijzigingen blijven behouden bij herladen, opslaan en
JSON export/import; ook beide rekenkernen bewaren de plaatsingsmetadata.

Klik een symbool, tracé of genummerde legendaregel om de betreffende werkregel
ter plaatse te selecteren. De selectiebalk onder de tekening geeft toegang tot
Eigenschappen en verwijderen. Toetsenbord: Tab naar een SVG-symbool, Enter of
spatie om te selecteren. Een wandklik opent het objectmenu op dat vlak.

## Slepen naar positie

- Sleep met de muis of één vinger: symbolen, hele tracés, afzonderlijke eindpunten,
  deuren, ramen en de genummerde m²-vlakmarkeringen.
- In 2D verplaats je X/Y. In 3D volgt **Automatisch** het toegewezen vlak:
  noord/zuid = X/Z, west/oost = Y/Z, vloer/plafond = X/Y.
  Kies een ander sleepvlak om een toestel vrij te plaatsen of de hoogte te wijzigen.
- Deuren en ramen blijven aan hun oorspronkelijke wand. Een raam kan in 3D ook
  omhoog/omlaag; slepen verandert de onderkanthoogte van deuren niet. Breedte en hoogte blijven gelijk.
- Standaard klikken posities vast op 5 cm. Zet dit uit of houd Alt ingedrukt
  tijdens slepen voor vrije plaatsing. Escape annuleert de huidige sleepbeweging.
- Tab naar een object of eindpunt en gebruik pijltjes: 5 cm, Shift + pijltje:
  25 cm, Alt + pijltje: 1 cm. Links/rechts is X (Y bij Y/Z); omhoog/omlaag
  is Y in bovenaanzicht en Z in een verticaal vlak.
- Posities blijven binnen de ruimte. Bij verplaatsing van een heel tracé blijven
  de onderlinge afstand en hoogteverschillen van de eindpunten behouden.
- Loslaten bewaart de positie lokaal; JSON export/import bewaart die ook.
  De plaatsingsvelden blijven beschikbaar voor precieze invoer.
- Binnen de tekening zijn aanraakbewegingen voor positioneren gereserveerd.
  Scroll de pagina via het gebied buiten de tekening. Bij overlapping kun je
  lagen verbergen, de camera draaien of de numerieke plaatsingsvelden gebruiken.

Slepen verandert **geen hoeveelheden of prijzen**. Een m²-nummer verplaatsen
verschuift alleen het label, niet het gemeten afwerkingsvlak. De ruimtematen,
wandgeometrie, openingmaten, camerabediening, maatlijnen en legenda worden niet
versleept; ruimtematen en openingmaten pas je aan via hun velden.

## Lagen en print

De drie laagkeuzes verbergen of tonen afwerking, elektriciteit en sanitair.
Dit is uitsluitend een weergavefilter: verborgen werken blijven in de offerte.
Op papier staan alle actieve werken met hun genummerde legenda. De hoofdkaart
kan in 3D draaien/zoomen zoals voorheen; print gebruikt het 2D-bovenaanzicht.

## Belangrijke beperkingen

- Geen uitvoeringsplan, elektrisch schema, hydraulisch ontwerp of conformiteitscontrole.
- Automatische posities zijn voorbeelden, geen voorgestelde veilige montagepunten.
- Tracés zijn rechte schematische lijnstukken. Bochten, doorvoeren en fysieke
  leidinglengtes worden niet afgeleid. De offerte gebruikt je gemeten hoeveelheid.
- Plafonds/floeren hebben in bovenaanzicht dezelfde contour; hun badges en
  legendaregels onderscheiden ze. Z-hoogtes veranderen het bovenaanzicht niet.
- Vlakmarkeringen tonen op welk vlak werk zit, geen exacte gedeeltelijke dekking.
- Sanitaire volumes zijn illustratief: geen echte productmaten of botsingscontrole.
- Meerdere elementen kunnen in projectie overlappen. Gebruik de lagen, draai de
  camera of pas posities aan; er is geen automatische collision-/clash-detectie.

## Testen

- Unit-test: alle 28 werkpakketten renderen in beide aanzichten; laagfilters,
  nulhoeveelheden, escaping en begrenzing gecontroleerd.
- Python/JS-pariteit vergelijkt ook de projectecho inclusief plaatsingsmetadata.
- 11-regelige gemengde voorbeeldscène: 2D/3D, indicatieve volumes, laagfilters,
  toetsenbordselectie, coördinaatwijziging, herladen, mobiele breedte en print.
- Plaatsingswijzigingen en laagfilters veranderen de offertotalen niet.

Herhaalbare optionele browsertest (dezelfde dependencies als de apparaatreview):

```bash
PORT=8094 python3 bouwcalculator/server.py
# tweede terminal
BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8094/ \
node bouwcalculator/tools/visual_review.mjs
```

Resultaten: `/tmp/bouw-visual-review` (of `REVIEW_OUTPUT`). Met `APP_URL` test je
ook een lokale Worker of het standalone `file:///.../bouwcalculator.html`-bestand.

De aanvullende `tools/drag_review.mjs` controleert met echte Chromium Pointer
Events de vier 3D-hoeken, muis- en touchslepen, zoom, toetsenbord, Escape,
openingen, tracés/eindpunten, vlaknummers, herladen en gelijkblijvende totalen.
Dit is browseremulatie, geen test op fysieke iPhones of Android-apparaten.

## Vlakaanzicht — elk vlak recht van voren

De ontwerpkaart heeft drie weergaven: **Bovenaanzicht**, **Vlakaanzicht** en **3D**.
Onder Vlakaanzicht staan zes vlakkaarten direct boven de tekening, met netto m²:
noord, oost, zuid, west, vloer en plafond. De gekozen kaart is blauw gemarkeerd.

- Wanden worden loodrecht van binnenuit bekeken, met horizontale breedte en
  verticale hoogte. Richtingslabels geven aan wat links en rechts ligt.
  Zuid en west zijn daarom horizontaal gespiegeld ten opzichte van de modelassen.
- Vloer en plafond zijn vlakke X/Y-projecties, met noord boven als vaste referentie;
  geen perspectief of geometrisch gespiegelde blik door het plafond.
- Alleen werkregels die aan het gekozen vlak zijn toegewezen staan in de tekening
  en legenda. Wandopeningen verschijnen op hun eigen wand. Lagen blijven werken.
- Een rustig metrisch raster (standaard 50 cm, grover bij grote kamers), maatlijnen
  en hoogte vanaf vloer helpen bij het positioneren. Symbolen blijven schematisch.
- Slepen en pijltjes werken in het zichtbare vlak, zonder verborgen diepte te
  wijzigen. Bij zuid/west beweegt pijltje rechts ook visueel naar rechts.
  Ramen kunnen horizontaal en verticaal worden verplaatst; deurhoogtes niet.
- Dit is geen automatische beste/veilige installatiepositie: je kiest zelf de
  plaatsing. Wijzig de locatie van de werkregel om hem aan een ander vlak toe te wijzen.
- Print/PDF houdt de bestaande 2D-overzichtstekening; de vlakkeuze is een schermfilter.

Optionele browsertest: `tools/aanzicht_review.mjs`, met dezelfde omgevingsvariabelen
als de andere browserreviews. Deze test controleert zes vlakken, filtering,
positioneren, gespiegelde toetsenbordbediening, raamhoogte en responsive layout.

## Ontwerpstudio: minder panelen, meer tekening

De kaart is nu het hoofdwerkvlak, niet een kleine kolom tussen twee formulieren.
Met de navigatie bovenaan open je ruimtematen, werkregels, project/prijzen of de
offerte. **Tekening** (ook vast linksonder) sluit de ondersteunende secties en
brengt je terug naar het ontwerp. Het actuele totaal blijft in de navigatie staan. Minder gebruikte bestandsacties
(Nieuw, Openen, Offerte printen) staan onder **Bestand**; Opslaan blijft direct zichtbaar.

Lagen, vastklikken en het 3D-sleepvlak staan onder **Tekenopties**. De legenda en
vuilbakken staan onder **Objecten & verwijderen**; een geselecteerd object heeft
ook een directe vuilbak in de selectiebalk. Hulp en uitgebreide installatie-invoer
zijn eveneens ingeklapt, maar niet verwijderd. Native details/summary ondersteunt
muis, aanraking en toetsenbord zonder extra bibliotheken.

Zoom werkt nu in alle drie de weergaven. Het printbeeld blijft ongezoomd en toont
alle offertewerken; gesloten panelen sluiten niets uit van de afdruk.

## Eigenschappen zonder het ontwerp te verlaten

De selectiebalk opent nu een compact formulier onder de tekening. Pas coördinaten,
vlak, aantal/lengte of openingmaten aan en klik **Toepassen**. Het is geen live
formulier: nog niet toegepaste invoer gaat verloren bij een andere selectie of
herladen. **Alle instellingen** brengt je naar de uitgebreide invoerpanelen.
Raam/deurmaten die buiten de gekozen wand vallen worden geweigerd met uitleg.

Ongedaan/Opnieuw herstelt ook de projectgegevens en offerte, niet alleen het SVG.
Geschiedenis is beperkt tot 50 stappen in de huidige sessie, wordt niet geëxporteerd
en begint opnieuw bij herladen of het openen/importeren van een project.
De camera, lagen en selectie zijn geen offertewijzigingen en staan niet in die historie.
Een lege ruimteverzameling geeft nu een startactie in de tekening; het verwijderen
van de laatste ruimte kan ook ongedaan worden gemaakt.
