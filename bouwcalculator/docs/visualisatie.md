# Alle werken in 2D en 3D

## Wat staat op het plan?

De meetstaat van de gekozen ruimte is de bron. Elke positieve werkregel krijgt
een nummer; nulhoeveelheden worden niet als geplaatst werk getekend. Ruimteknoppen
wisselen tussen de plannen van kamers. Er is nog geen samengevoegde woningplattegrond.

- Afwerking/Gyproc: genummerde vlakmarkeringen, inclusief vloer en plafond.
  Bij klassieke rechthoeken zijn in 3D twee achterwanden zichtbaar. Vrije contouren
  en hellende plafonds gebruiken alle wanden als transparante schil; draai de camera
  of kies een afzonderlijk vlakaanzicht.
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

## Meer tekenruimte en camera verplaatsen

**Vergroten** gebruikt een native modaal focusvenster voor de bestaande
ontwerpkaart. Toetsenbordfocus blijft binnen dat venster. Sluiten/Escape zet de
kaart terug op de oorspronkelijke plek, met behoud van de scène en camera.
Het objectmenu werkt als een tweede dialoog erboven; Escape sluit eerst dat menu.
De volledige invoer openen verlaat de focusmodus automatisch.

**Hand** reserveert slepen voor de camera, ook wanneer je op een symbool begint.
Met **Selecteren** sleep je weer objecten. Middelste muisknop is een tijdelijke
handfunctie. Pijltjes bij Hand verschuiven het beeld; bij Selecteren blijven ze
objectposities aanpassen. Camera verschuiven verandert geen offertegegevens.
Gebruik +/− voor 75–300% zoom en Herstel om weer alles gecentreerd te zien.
Er is geen automatische wiel- of pinchzoom; aanraken met één vinger verschuift
het beeld bij Hand. Tijdens slepen annuleert Escape eerst die beweging.

PDF blijft het volledige ongezoomde 2D-overzicht printen. Camera en focusmodus
worden niet als projectwijziging opgeslagen en zitten niet in de undo-historie.

## Controlemaat: twee punten, echte modelafstand

Het gereedschap **Meten** tekent één tijdelijke rechte controlemaat tussen twee
punten. Wijs twee punten aan of sleep de lijn; het paneel toont meter met twee
decimalen. Getalvelden onder Meetpunten precies invoeren maken dit ook zonder
muis bruikbaar. Wissen of een nieuwe meting vervangt de bestaande lijn.

Bovenaanzicht gebruikt X/Y. Vlakaanzicht gebruikt het zichtbare vlak; zuid/west
blijven correct gespiegeld en plafondmetingen liggen op plafondhoogte. In 3D
kies je expliciet vloer X/Y, noordwand X/Z of westwand Y/Z. De berekening gebruikt
modelcoördinaten, niet de lengte van de geprojecteerde SVG-lijn. De meetlijn blijft
bij draaien en zoomen bij dezelfde modelpunten liggen. Veranderen van ruimte,
aanzicht, vlak of ruimtematen wist de controlemaat.

Dit is alleen een schematische controle: geen automatische object-/rand-snap,
geen opmeting ter plaatse en geen leidinglengteberekening. Het verandert geen
offertegegevens. Meetlijnen worden niet opgeslagen of afgedrukt.

## Objectacties zonder de tekening te verlaten

De selectiebalk bundelt minder gebruikte opdrachten onder **Acties**.
Dupliceren maakt een zelfstandige werkregel met dezelfde hoeveelheid, opties en
notitie; de offerte telt die extra regel mee. Ook een kopie van een m²-post telt
het volledige gemeten vlak nogmaals mee. Daarom wordt eerst bevestiging gevraagd.
Een opening kopiëren neemt ook het aantal over en wijzigt de netto-oppervlakte.

De kopie wordt waar mogelijk tot 25 cm verschoven. Is er geen vrije verschuiving,
dan kan zij overlappen; de app voert geen botsingscontrole uit. Bestaande automatische
openingen op de wand behouden visueel hun plaats doordat hun positie wordt vastgelegd.

Centreren verschuift punten en markers in hun toegewezen vlak. Voor tracés blijft
de vector tussen begin en einde gelijk; een opening centreert alleen langs de wand.
Deze plaatsingsactie verandert geen hoeveelheden. Beide acties zijn ongedaan te maken.

## Expliciet de rechte tracélengte gebruiken

Bij een geselecteerde meterpost toont de selectiebalk de Euclidische 3D-afstand
van de zichtbare, begrensde modeleindpunten, naast de offertehoeveelheid.
De meetwaarde verandert niet door een andere camera, projectie of zoom.
**Acties → Tracélengte overnemen…** vraagt bevestiging en zet uitsluitend daarna
de hoeveelheid op deze afstand, afgerond op twee decimalen. De exacte getekende
begin- en eindcoördinaten worden vastgelegd; dit voorkomt dat voorbeeldposities
later veranderen. De actie werkt met historie en JSON/projectopslag.

Geen automatische leidingberekening: een recht lijnstuk is niet noodzakelijk het
werkelijk benodigde materiaal. Bochten, reservemarge, bijkomende tracés en andere
installatievereisten blijven voor de gebruiker. Nog niet toegepaste invoervelden
tellen niet mee. Een afstand die naar nul afrondt, kan niet worden overgenomen.
Gewoon slepen of een meetlijn plaatsen wijzigt de offertehoeveelheden niet.

## Vrije binnencontour en enkelvoudige plafondhelling

`Ruimte.contour` is een lijst `{id, x, y}` met 3–64 opeenvolgende hoekpunten.
De laatste wand sluit naar het eerste punt. De ID van het beginpunt identificeert
de wand; het volgnummer is slechts het zichtbare label. Invoegen/verwijderen
verandert dus niet zomaar de identiteit van andere wanden. Een lege contour blijft
de klassieke rechthoek met noord/oost/zuid/west, met de bestaande openingrichtingen.
Coördinaten worden naar een oorsprong met minimale X/Y = 0 genormaliseerd;
`lengte` en `breedte` zijn daarna de maximale X/Y. De editor vereist minimaal
5 cm wandlengte en 0,01 m² vloer; kruisende/rakende contouren zijn ongeldig.

`Ruimte.dak` is `null` of `{as: "x" | "y", start, eind}`. De vlakke vloer ligt
op Z = 0. De plafondhoogte is `start + (eind-start) * positie / overspanning`.
Alle wand-eindhoogten komen uit diezelfde functie. De echte wandoppervlakte is
`wandlengte * (beginhoogte + eindhoogte) / 2`. De vloer gebruikt de absolute
schoenveteroppervlakte van de contour. Het plafond vermenigvuldigt dat met
`sqrt(1 + helling²)`. Dit geldt ook voor concave contouren omdat het plafond één
vlak blijft. Python en JavaScript ronden nieuwe geometriewaarden op negen decimalen
voor identieke downstream-ramingen, niet op twee m²-decimalen voor de berekening.

De browser heeft een tijdelijke contour-editor; alleen Toepassen schrijft naar
het project. Ontbrekende gebruikte wanden moeten expliciet worden gekoppeld.
Werkposten, openingreferenties en geometrie worden samen in historie vastgelegd.
Concepten worden niet afgedrukt of geëxporteerd voordat ze zijn toegepast.

Vlakaanzicht van een wand gebruikt zijn eigen lengte-/hoogte-assen, ook als de wand
diagonaal loopt. Slepen, toetsenbord, openingpositie en controlemaat gebruiken
dezelfde projectie. De numerieke controlemaat heet daarom **Langs wand**, niet
wereld-X. Vloer/plafond-aanzicht is een bovenprojectie; een plafondcontrolemaat
neemt wel de werkelijke Z-hoogten van het hellende vlak mee. 3D-meetvlakken blijven
vrij gekozen XY/XZ/YZ-controleplannen, geen automatische oppervlakdetectie.

De contour en plafondhelling tellen mee bij offerteberekening, JSON, lokale/server-
opslag en offerteplattegronden. Andere objectplaatsing blijft schematisch en vrij;
er is geen volledige collision engine. De selectie waarschuwt bij een punt/tracé
buiten de contour of boven het plafond. Ook een recht tracé met beide eindpunten
binnen een U-/L-vorm kan door de uitsparing lopen; dat wordt mee gecontroleerd.
Ramen/deuren die niet binnen hun wand/plafond passen kunnen in de tekening worden
begrensd, maar de calculatie blijft de ingevoerde openingmaten aftrekken.
Overlappende openingaftrekken worden niet geometrisch verenigd.

Materialen/uren gebruiken bestaande pakketnormen. Profielen voor trapeziumwanden
gebruiken de maximale wandhoogte als ramingsbasis; plafondprofielen gebruiken een
omhullende maat met de hellingscorrectie. Dit is geen exacte plaatindeling of
snijoptimalisatie, wat expliciet als offertewaarschuwing wordt vermeld.

## Huisindeling en naar binnen hellende wanden

`Project.huis` is `null` of `{contour, lengte, breedte, hoogte, dak}`. Het is een
geometrische binnencontour van één verdieping, geen extra te offreren ruimte.
`Ruimte.huis_positie` is `null` of `{x,y}` in meter, de oorsprong van de lokale
kamercontour op dat huisplan. Ongeplaatste kamers blijven in de offerte en krijgen
bij een huisplan een waarschuwing. Python en JS controleren kamersegmenten binnen
de woning (dus ook bij concave uitsparingen) en niet-overlappende interieurs.
Gedeelde grenzen zijn toegestaan; de geometrische grenscontrole gebruikt 1 µm
tolerantie vanwege de canonieke afronding op zes coördinaatdecimalen.

De huiseditor hergebruikt de transactionele contour-editor. Splitsen maakt twee
polygonen langs een rechte koorde, met behoud van totale vloeroppervlakte en
globale posities. Rechte X/Y-sneden moeten precies twee unieke grenssnijpunten
hebben; voor concave kamers kan een andere snede of expliciete koorde nodig zijn.
Een planair plafond wordt per deel opnieuw naar het lokale bereik vertaald,
waardoor dezelfde wereldhelling behouden blijft. Alleen lege kamers kunnen worden
gesplitst: geen automatische gok bij het verdelen van werkregels, openingen of
schuine wanden. Dit is één historiewijziging. Huiscontour aanpassen schaalt bestaande
kamers niet ongemerkt mee; ongeldige ligging wordt vóór toepassen geweigerd.

`Ruimte.wand_helling` is een map wand-ID → horizontale insprong bovenaan (m).
Een ontbrekende/lege map betekent verticale wanden. Positieve insprong verschuift
de bovenrand naar binnen. In eerste instantie alleen bij een vlak plafond en een
convexe contour; dakhelling + wandinsprong of concave contour geeft een fout.
Aansluitende collineaire wanddelen vereisen dezelfde insprong.

De topcontour komt uit snijpunten van evenwijdig naar binnen verschoven wandlijnen.
Zij moet geldig blijven, dezelfde omlopen hebben en elke bovenrand moet in dezelfde
richting als haar vloerrand lopen. De bovencontour wordt **niet** opnieuw naar
(0,0) genormaliseerd. Plafond = oppervlak topcontour; vloer blijft onveranderd.
Wandoppervlak = `(onderlengte + bovenlengte) / 2 × hypot(verticale hoogte, insprong)`.
Hierdoor veranderen ook de aangrenzende verticale zijwanden. Openingmaten zijn
rechthoekige maten langs het wandvlak; aftrek blijft breedte × hoogte × aantal.
Niet-passende openingen worden visueel begrensd en gemeld, niet stil uit de offerte
verwijderd of met andere ingevoerde maten geprijsd.

Een wand heeft een orthonormale U/V-basis: U langs de vloerrand, V langs de helling.
3D, vlakaanzicht, slepen en lokale controlemaat gebruiken diezelfde basis. Bij
openingen zijn borstwering en hoogte afstanden langs het wandvlak. Werkregel-
`visualisatie.z` blijft wereld-Z om bestaande plaatsingsdata te behouden; de
weergave projecteert wandobjecten op hun toegewezen vlak en begrenst ze op het
trapezium. Slepen slaat de getoonde positie op. Vloer-/plafondmarkeringen blijven
schematisch, zonder volledige collision engine.

Huis-2D/3D gebruikt eigen SVG-selectie, niet de pointerhandlers van de actieve
kamer. Open de geselecteerde kamer om objecten te bewerken. Werkmarkeringen en
openingen gebruiken wel dezelfde geometriefuncties als de kamerstudio. Het huisplan
wordt ongezoomd vóór de kamerplannen afgedrukt. Zoom en ontwerpniveau zijn geen
prijsgegevens. Afwerking aan twee zijden van een gedeelde wand blijft twee kamerposten;
er is geen BIM-topologie, wandvolume, verdiepingenstapel of constructieve deduplicatie.

Regressie: `test_huis.py` voor oppervlakken, validatie, gedeelde grenzen, roundtrip,
JS/Python-pariteit en sneden; `tools/huis_review.mjs` voor de echte huis→kamers→werk-
workflow, numerieke/vrije sneden, schuine objecten/openingen, bescherming van werk,
historie, herladen en mobiele Chromiumviewport. Draait ook op de offline HTML.


### Huiscamera en kamernavigatie

`huis-camera.js` is een afzonderlijk, dependencyvrij cameramodel. Het beheert
uitsluitend zoom (1–3×), begrensde verschuiving en vier kwartslag-kijkrichtingen.
`huis.js` gebruikt dit voor Hand (muis, pen, touch en pijltjes), Links/Rechts en
Passend. Pointer capture zit op de stabiele canvascontainer; vervangen SVG-kinderen
onderbreken de beweging niet. Escape, pointercancel en verloren capture herstellen
de vorige camerastand. Hand sleept nooit kamers of offerteobjecten.

De draaifunctie werkt vóór projectie; dit zijn vier modelkijkrichtingen, geen
spiegeling van een afgewerkte SVG. Kamers worden per kijkrichting op diepte gesorteerd.
Kamerlabels blijven in alle richtingen met een vaste verticale afstand onder elkaar.
Afdrukken gebruikt altijd de standaardcamera, onafhankelijk van bediening op scherm.
Camerastanden worden niet in project-JSON, opslag of offertehistorie geschreven.

De selectiesamenvatting gebruikt echte vloer-, plafond- en netto wandoppervlakken
uit dezelfde geometriekern. Dubbelklik opent de kamer; dezelfde selectie opnieuw
kiezen vervangt de SVG niet, zodat dubbelklik en toetsenbordfocus behouden blijven.
De openknop en Tab/Enter blijven alternatieven. Rotatieknoppen zijn alleen in 3D
zichtbaar. Regressies: `test_huis_camera.py` en `tools/huis_camera_review.mjs`, inclusief
werkelijke CDP-touch, annulering, ongewijzigde offerte/historie/afdruk en 390px-layout.


### Compacte interface

Veelgebruikte opdrachten zijn inline SVG-pictogrammen met `aria-label`, `title`
en decoratieve `aria-hidden`-SVG's. Knop-ID's, formulieren, pressed states en
rekenacties zijn ongewijzigd. Focusmodus wijzigt het toegankelijke label en de
tooltip, niet de SVG-inhoud. Maatlijnen en de meettool hebben verschillende iconen.

Compacte schermregels zijn begrensd tot `@media screen`; offerteprint behoudt zijn
A4-layout. Mobiele pictogramacties blijven 44 × 44 px. Hulp is een native details-
uitklapper in de huiswerkbalk; klikken buiten sluit, Escape sluit met focusterugkeer.
Veiligheidsmeldingen en expliciete bevestigingen blijven zichtbaar/beschikbaar.

`tools/compact_review.mjs` controleert 320, 390, 768 en 1440 px: geen paginaoverflow,
éénrijige navigatie/bovenbalk, compacte huiswerkbalk, Nederlandse toegankelijke
namen/tooltips, aanraakmaten, hulp-/focusbediening en identieke projectgegevens.


### Logische studionavigatie

`web/studio.js` beheert uitsluitend presentatie: huidige taak, locatiecontext,
focus, scroll en zichtbaarheid van snelknoppen. `studioOpen()` delegeert hieraan;
prijs-, geometrie- en projectmodellen blijven ongewijzigd. De module wordt na
`huis.js` geladen en door `maak_standalone.py` in beide offline kopieën ingesloten.

De header combineert Ontwerp/Tarieven en bestandacties. De taakbalk blijft eronder
staan; `ResizeObserver` meet beide hoogtes voor scrollmarges. Een gebundelde
`requestAnimationFrame`-handler volgt de zichtbare sectie; expliciete navigatie
houdt tijdens soepel scrollen tijdelijk haar doel actief. Wiel-/aanraakbediening
geeft de controle meteen terug aan de gebruiker. Bij reduced motion is de sprong
direct. Alleen de actieve taakknop krijgt `aria-current="location"`.

Expliciete taaknavigatie sluit zusterpanelen, niet de geneste tekeninstellingen.
Inline werkbewerking houdt het oorspronkelijke invoerpaneel bereikbaar. De
huis/kamer-schakelaar staat naast de kamercontext; tekenen verwijst in huisstand
naar het huiscanvas, maten en werken naar de geselecteerde kamer. Dubbele
zwevende acties verdwijnen als de inline actie zichtbaar is; ze zijn eveneens
verborgen in dialogen, huisstand en Tarieven. Print verbergt context/werkbalken en
behoudt het oorspronkelijke offerteherstel.

`tools/routing_review.mjs` controleert routing, scrollspy, sticky offsets,
context, panelen, focus, menusluiting, foutmeldingen, contextuele snelknoppen,
reduced/normal motion, 320–1440 px en ongewijzigde projectgegevens/totaal/historie.


### Doorzoekbare kamerkeuze

De twee `[data-room-picker]`-knoppen openen de native `#studio-rooms`-dialoog.
Zoeken normaliseert accenten en hoofdletters; namen en maten worden ge-escaped,
nooit als project-HTML geïnterpreteerd. De dialoog heeft een benoemd zoekveld,
aangekondigd resultaat-aantal, native knopresultaten en `aria-current` voor de
actieve kamer. Alleen de lijst scrollt; zoekveld en footer blijven zichtbaar.
Escape wordt ook in het zoekveld afgehandeld (anders wist sommige browsers alleen
de zoekterm). Annuleren herstelt de triggerfocus; kiezen focust de bestemming.

Een kamerkeuze verlaat eerst de huisstand voordat de gekozen kamer actief wordt,
om te vermijden dat de huisselectie de nieuwe keuze overschrijft. Maten/Werken
blijven de bestemming als dat de huidige taak is; andere contexten openen de
tekening. Dit is uitsluitend UI-state, zonder projectmutatie of historie-item.
Korte taaklabels verschijnen vanaf 769 px; de mobiele header behoudt 44px-doelen.


### Kamerinzichten en taakvoortgang

De kamerzoeker combineert naamzoeken met `studio-room-filter` (alle/met/zonder
werkposten) en `studio-room-sort` (project/naam). Tellingen komen uit het project;
bedragen zijn uitsluitend een presentatie-aggregatie van reeds berekende
`offerte.regels[].totaal`. Ze zijn expliciet vóór projectkorting en exclusief btw.
Laden/fouten verbergen bedragen, statuswijzigingen vernieuwen het overzicht met
behoud van zoekterm, filter, lijstscroll en gefocuste kamer. Het compacte
kameroverzicht leest `vloer.bruto` uit de berekende vlakken, niet de omhullende
rechthoek van een vrije vorm.

Geleide taakknoppen worden eenmalig buiten de opnieuw gerenderde invoervelden
geplaatst. Ze gebruiken dezelfde `BouwStudio.open`-route en wijzigen geen data.
De hoofdtabfunctie bewaart per tab de scroll-Y vóór het verbergen van de huidige
inhoud. Herstel gebeurt direct na het tonen; er is geen uitgestelde callback die
een aansluitende expliciete kamer-/taaksprong kan overschrijven. Alle nieuwe
bediening en kamerinzichten zijn uitgesloten van offerteprint.


### Huiscanvas en donkere modus

Het huiscanvas gebruikt op het scherm een thema-afhankelijke achtergrond. De lege
beginweergave heeft eigen leesbare tekstkleuren en een zichtbare actie
**Huiscontour tekenen**, die dezelfde bestaande editor opent als het potlood in de
werkbalk. Openen/annuleren verandert geen projectdata. In donkere modus hebben ook
vloer, wanden, labels en objecten een aangepaste schermpalette; de printkleuren
blijven ongewijzigd. `tools/huis_theme_review.mjs` bewaakt licht/donker, 320–1440 px,
4.5:1 tekstcontrast (inclusief startknop), editor/cancel, 2D/3D en printisolatie.


### Progressieve huisbediening

De huiswerkruimte toont drie compacte fasen: Contour → Indelen → Openen, met
`aria-current="step"` voor de huidige fase. Zonder contour zijn weergave-, camera-,
splits- en plaatsingsbediening verborgen; de primaire tekenactie en hulp blijven
bereikbaar. Undo/redo blijft beschikbaar zodra er historie is, ook zonder contour.
Na een contour verschijnt de relevante bediening opnieuw. Acties om te openen en
in te delen verschijnen bij een geselecteerde kamer en hebben naast hun pictogram
een kort zichtbaar label. De stappenbalk stuurt geen projectmutaties aan; bestaande
veiligheidscontroles voor splitsen blijven ongewijzigd. De thema-browserreview
controleert deze lege/ingedeelde/beschermde toestanden naast het kleurcontrast.


### Selectie buiten het huisplan en X/Y-synchronisatie

De huisselectie bewaart een kamer-ID, ook wanneer die kamer geen `huis_positie`
heeft. Het SVG markeert uitsluitend geplaatste kamers; selectie van een losse
kamer laat dus geen oude kamer geselecteerd. Openen werkt voor beide toestanden;
splitsen vereist nog steeds een echte plaatsing. Focus in de kamerlijst blijft
behouden terwijl `aria-pressed` meteen synchroniseert.

`syncPlacement()` koppelt de formulierkamer en coördinaten aan deze selectie.
Een UI-only dirty-vlag bewaart nog niet toegepaste coördinaten bij camerabediening.
Een kamerwissel of projectvervanging herstelt de opgeslagen positie; bevestigde
plaatsing en detacheren gebruiken de bestaande geometrievalidatie en historie.
Na undo van een plaatsing wordt een actieve snede veilig geannuleerd voordat het
canvas opnieuw wordt opgebouwd. De aanklikbare buiten-planmelding opent de
plaatsingssectie bij een losse kamer. `huis_placement_review.mjs` dekt de betrokken
interacties en bewaakt het behoud van kamers, werkposten en prijzen.


### Opslagfouten zijn geen vluchtige rekenstatus

`opslagProblemen` bewaart afzonderlijke UI-fouten voor concept en offertearchief.
Het vaste waarschuwingspaneel staat buiten de hoofdtabpanelen en gebruikt een
`role="alert"`-tekst, echte back-up- en herstelknoppen en voldoende ruimte onder de
pagina. Fouttekst wordt alleen bij wijziging vervangen om herhaalde aankondigingen
bij typen te vermijden. Zwevende tekenacties maken bij deze waarschuwing plaats.
Succes bij de ene opslagsleutel wist geen fout bij de andere. Een back-upaanvraag
is geen bewijs dat opslag hersteld is. Print verbergt dit paneel.

Een UI-documentgeneratie verandert uitsluitend bij `laadProject`, niet bij
geometrieklonen of historie. Expliciet opslaan gebruikt een vaste JSON-snapshot,
een in-flightslot en de documentgeneratie/ID om late antwoorden veilig te verwerken.
Nieuwe wijzigingen blijven intact en krijgen geen misleidende succesmelding.
Het lokale archief wordt vóór herschrijven op lijststructuur gecontroleerd;
onleesbare/beschadigde inhoud blijft bewaard. Lokale verwijdering geeft expliciet
succes/fout terug. `storage_review.mjs` test de daadwerkelijke back-upblob en
kunstmatig vertraagde opslagreacties, zonder gebruikersarchieven aan te raken.


### Berekeningsstatus is onafhankelijk van algemene meldingen

`state.rekenStatus` is presentatie-state (`pending`, `ready`, `error`) en wordt via
`rekenStatus()` en `bouw-rekenstatus` met de studio gesynchroniseerd. De kamerkeuze
leidt prijsvaliditeit niet langer af uit tekst als Opslaan mislukt/Opgeslagen.
Herberekenplanning maakt een ouder requestvolgnummer direct ongeldig, vóór de
220ms-debounce. Alleen het nieuwste antwoord mag uitkomsten publiceren. Laden van
een andere offerte wist de vorige uitkomst voordat er opnieuw wordt gerekend.

De navigatie toont pending/error zonder een oud numeriek totaal. De offerte
waarschuwt voor eerdere bedragen en biedt herberekenen; de appprintknop verstuurt
geen printopdracht zolang de berekening niet actueel is. Native browserprint houdt
in die situatie een zwart-witte waarschuwing zichtbaar. `calculation_review.mjs`
simuleert een echte rekenfout, herstel en omgekeerde requestvolgorde; prijsmodel en
projecthistorie blijven ongewijzigd.


De mobiele offertentabel heeft een eigen benoemd, toetsenbordbereikbaar horizontaal
scrollgebied. Kolommen houden voldoende breedte voor leesbare omschrijvingen en
bedragen; de hele pagina schuift daardoor niet meer horizontaal mee. Bij printen
is die overflowbeperking opgeheven, zodat geen kolommen worden afgeknipt.


### Offertearchief als toegankelijke werkruimte

`#modal-achtergrond` is nu een native dialoog, met behoud van bestaande IDs en
hidden-contracten. Zoeken en sorteren gebruiken uitsluitend de opgehaalde metadata;
zoeken verstuurt geen nieuwe requests en wijzigt geen projectdata. De zoek-/sorteer-
bediening, teller en footer staan buiten het scrollende resultatenpaneel. Namen en
klanten worden ge-escaped. Native focus containment, expliciete Escape-afhandeling
voor search-inputs en afzonderlijk focusherstel bij annuleren/openen voorkomen
achtergrondbediening en focusverlies.

Requesttickets en documentgeneratie beschermen tegen verlate lijst-/projectreacties
na sluiten of een projectwissel. Een UI-only referentie-JSON van de laatst geladen
of expliciet opgeslagen versie ondersteunt de vervangbevestiging, ook bij undo en
wijzigingen tijdens opslaan. Lokale én serververwijdering tonen fouten in de dialoog;
verwijderen opent een inmiddels gesloten venster niet opnieuw. De archiefreview
test deze toestanden zonder archieven van de gebruiker te wijzigen.


### Directe tekeningbediening

V/H/M/F zijn beperkt tot focus binnen `#tekening`, zonder modifier-toetsen,
herhaalde keydown of actieve tekstinvoer. Ze activeren dezelfde bestaande knoppen;
Selecteren herstelt zo mogelijk SVG-objectfocus voor nauwkeurig nudgen. De SVG's
en de lijst delen dezelfde selectiefuncties. Openingen krijgen in hun lijst een
echte selectieknop naast verwijderen. De selectiekaart toont wereld-X/Y/Z en de
eigenschappenknop publiceert `aria-expanded` en `aria-controls`.

Dubbele objectactivatie wordt in de dragcontroller herkend aan dezelfde ruimte,
objectidentiteit, korte tijd en kleine schermverplaatsing. Dit is nodig omdat
pointer capture native dblclick naar de host kan retargeten. Sleepbewegingen,
annuleren en commits wissen de dubbele-activatieketen. Het UI-event opent de
bestaande inspector zonder businessmutatie. `drawing_ui_review.mjs` controleert
alle drie aanzichten, werk/opening, echte touch-dubbeltap, lijstselectie,
veldveiligheid, focusherstel en ongewijzigde prijs/project/historie.


### Eenvoudige openinginvoer en indelingsvoorbeeld

`openingen.js` bundelt de nieuwe tekeningknoppen, oude ruimteknoppen en catalogus
in een native dialoog. Wandlengte, positie, lokale plafondhoogte en beschikbare
ruimte bij wandhelling worden vóór toevoegen gecontroleerd. Annuleren verandert
geen project of historie. De rechthoekige `openingGeometrie` levert nu, net als
de vrije-contourvariant, a/b/c/d zodat openingen ook in het huisplan 2D/3D tekenen.

Het huisplan gebruikt bestaande `BouwVorm.cutAt` voor zowel voorbeeld als echte
snede. De slider verandert alleen UI-invoer, nooit projectdata. De gekleurde
vlakken zijn niet interactief en worden niet afgedrukt. Bevestigen gebruikt de
bestaande kandidaatvalidatie en historie; bescherming voor bestaande werken,
openingen en wandhelling blijft staan. De precieze invoer is inklapbaar.


Het invoervenster gebruikt één `draft()`-validatie voor zowel het live voorbeeld
als definitief toevoegen. Maatknoppen wijzigen alleen invoervelden. De schets
beeldt de wandlengte en plafondhoogten af, met een expliciete schematische disclaimer;
wandhelling moet in de kamertekening worden gecontroleerd. Verkeerde of onvolledige
invoer toont geen schijnbaar geldige opening. Voorbeeldinteracties slaan niets op,
voegen geen historie toe en doen geen rekenverzoeken.

De inline kamernaam heeft een eigen UI-draft, gebonden aan project, kamer-id en
oorspronkelijke naam. Renderen behoudt de tekst zolang deze binding ongewijzigd is;
selectiewissel, projectvervanging en undo/redo synchroniseren de actuele naam.
Bewaren trimt en valideert, en gebruikt de bestaande projecthistorie. Bewaren zonder
verschil maakt geen historiestap. Annuleren verandert uitsluitend de UI-draft.


### Vrije scheidingswanden: eerst valideren, dan bevestigen

De UI-preview voor rechte én vrije sneden gebruikt de bestaande `cutAt`/`split`
functies. Twee vrije grenspunten leveren alleen gekleurde delen op als de snede
werkelijk binnen de kamer ligt en twee geldige contouren oplevert. De echte
bevestiging behoudt de kandidaat-/layoutvalidatie. Incomplete en ongeldige
voorbeelden schakelen de bevestigingsknop uit; de submitvalidatie blijft bestaan.

Grenspunten klikken op 5 cm langs de wand. Een afstandscontrole in schermpixels
voorkomt dat tikken ver van een wand ongewenst een grenspunt kiest. Dubbele punten
worden geweigerd en een derde tik wist een voltooid voorbeeld niet. Punt-terug,
Backspace op het canvas en Escape veranderen uitsluitend UI-staat. Backspace in
tekstvelden blijft native. `free_cut_review.mjs` test ook concave contouren, echte
touch, behoud van project/historie en ontbreken van rekenverzoeken tijdens tekenen.


### Directe verdeling op het huisplan

Links/rechts of boven/onder boven het canvas start de bestaande verdelingspreview.
Een SVG-slider met een 44px brede niet-meeschalende hitlijn maakt de scheidingswand
sleepbaar; de zichtbare greep schaalt om op mobiel bruikbaar te blijven. Slepen
werkt met pointer capture op de host zodat SVG-verversingen de gesture niet breken.
Posities klikken op 5 cm. Pijltoetsen en Shift+pijl bieden dezelfde fijne/grove
bediening. Escape en pointercancel herstellen uitsluitend de oorspronkelijke
UI-positie. Een project-/kamer-/moduscontrole breekt verouderde gestures af.
Geen projectmutatie, historie of berekening vóór de bestaande bevestigingsstap.
Dubbele richtingknoppen zijn verwijderd; de slider en overige details zijn ingeklapt.
