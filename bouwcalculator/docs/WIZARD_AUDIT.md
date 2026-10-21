# Wizardaudit — 21 oktober 2026

Doel: één concrete beslissing per scherm, grafische ondersteuning en grote,
duidelijke knoppen. De offerte blijft ongewijzigd tot expliciete bevestiging.

## Bevindingen en wijzigingen

| Onderdeel | Gevonden knelpunt | Nieuwe begeleiding |
|---|---|---|
| Ruimte | Naam en drie maten tegelijk | Naam → lengte → breedte → hoogte → visuele bevestiging. Maatknoppen −/+ 10 cm, exact typen blijft mogelijk. |
| Ruimtevoorbeeld | Generiek beeld bij een aangepaste kamer | Werkelijke contour bij bestaande/eigen kamers; live maatvoorbeeld voor nieuwe rechthoeken. |
| Ramen/deuren | Eén dialoog met alle invoervelden | Breedte/voorbeeldmaat → hoogte → positie/onderkant → bevestiging; het bestaande wandvoorbeeld blijft zichtbaar. |
| Elektriciteit | Bestaande aansluitpuntgerichte route | Behouden: grafische type-/uitvoeringskeuzes, aantallen 1–4/−/+, tikken/slepen/toetsenbord voor plaatsing, sleuf/kabel/details per punt. |
| Sanitair | Aantal, plaats en prijs tegelijk | Aantal → grafische plaatsing op de wand → prijsbevestiging. Aantal en maten zijn klikbaar. |
| Gyproc/afwerking | Lang formulier; weinig visuele bevestiging | Gekleurd werkelijk werkvlak → aparte prijsbevestiging. Geen onnodige vragen over aantallen platen. |
| Plafond | Risico op een wandillustratie bij vlakwerk | Bovenaanzicht van de echte kamercontour voor plafondwerk en plafondpunten. |
| Keuzemenu | Ja/nee en catalogus tegelijk; doorlopen zonder keuze | Catalogus is een eigen scherm met terugknop. Volgende wordt tijdens deze keuze uitgeschakeld. |
| Voortgang | Meerdere elkaar overschrijvende teksten | Vier herkenbare fasen: Plan → Wanden → Plafond → Offerte, met huidige fase gemarkeerd. |
| Eindcontrole | Lange lijst met inventaris, 3D en bewaren tegelijk | Projectinventaris/open details → 3D controleren → offerte controleren/bewaren/PDF. |
| Mobiel | Statusmelding kon Volgende onderscheppen | Meldingen zijn niet meer aanraak-/klikblokkerend. Fasen passen binnen 320 px. |
| Prijsveiligheid | Generieke werken hadden geen expliciete verlopen-prijsbevestiging | Wijzigingen aan het project na het prijsvoorbeeld vereisen een nieuwe bevestiging. |

## Veiligheidsregels

- Dezelfde invoerelementen blijven tussen vragen behouden: Vorige wist geen maten.
- Verborgen vragen veroorzaken geen onverwachte native validatiefocus. Vóór
  bevestigen worden alle invoerwaarden opnieuw gecontroleerd.
- Ramen/deuren gebruiken de bestaande geometrie- en plafondcontroles.
- Annuleren en teruggaan voegen geen werkposten toe. Bevestigen blijft één undo-stap.
- De begeleide dialoog wordt na sluiten hersteld; vrij ontwerpen blijft bruikbaar.
- 3D bekijken verandert geen geometrie of bedragen. Samenhangende huis-3D vereist
  dat de kamers op het huisplan zijn geplaatst; dit wordt niet stilzwijgend gedaan.

## Grenzen

De wizard is geen technisch installatieontwerp of garantie op een volledige
begroting. Niet gekozen werken worden niet automatisch toegevoegd. Het eindscherm
toont kamers zonder werkposten, ontbrekende huisplaatsing en opgeslagen
nog-te-bepalen werknotities. Onbekende aantallen zonder toevoegingen zijn geen
begrote werkpost; controle door de vakman blijft nodig.

Bij meerdere stuks in één generieke sanitaire regel geldt dezelfde schematische
plaatsing voor die regel. Verschillende plaatsen moeten als afzonderlijke regels
worden toegevoegd. Vorm-/huis-/trapeditors behouden hun bestaande gespecialiseerde
bediening; die zijn niet tot één-vraag-dialogen omgebouwd.

## Reproduceerbare controles

- `python3 -m unittest discover -s bouwcalculator/tests`
- `python3 -m unittest discover -s tests`
- `tools/full_wizard_review.mjs`: de volledige begeleide route, actuele zichtbare
  velden, validatie, openingsdialoog/herstel, sanitair, verlopen prijzen,
  undo/redo, Gyproc, schilderwerk, plafond en eindcontrole; mobiel en desktop.
- `tools/click_guidance_review.mjs`: klikknoppen, muis/touch/toetsenbord en 3D-retour.
- `tools/connection_wizard_review.mjs`: aansluitpunten, uitvoeringsdetails,
  bibliotheek, opslagfouten en offertebevestiging.
- `tools/novice_review.mjs`, `wall_wizard_review.mjs`, `wall_shape_review.mjs`,
  `wizard_drag_review.mjs`: bestaande novice-/wand-/vorm-/sleepregressies.

Browserreviews gebruiken standaard de standaloneversie. Stel `APP_URL` in voor
controle via de server. De extra paginering in bestaande reviewdrivers vervangt
geen onafhankelijke test; de expliciete één-vraag-controles staan in de volledige
wizardreview.

## Vervolgcontrole: mobiele bedieningsknoppen

- De vaste onderste balk bedient nu ook de actuele deelvraag bij sanitair,
  Gyproc/afwerking en de eindcontrole. Vorige gaat één vraag terug; op de eerste
  objectvraag wordt dat Annuleren. Op de laatste vraag wordt Volgende de echte
  bevestigingsactie. Desktop behoudt de knoppen bij het formulier.
- Op mobiel is de dubbele deelvraag-navigatie verborgen. Het generieke
  toevoegformulier heeft geen tweede zichtbare bevestigingsknop naast de duimbalk.
- Telknoppen: 1–4 op één rij, min/plus als brede knoppen eronder. Alle wizard- en
  openingsknoppen hebben minimaal 48 × 48 CSS-pixels. Invoertekst is 16 px.
- Extra scrollruimte en safe-area-padding houden inhoud boven de onderste balk.
  Telefoons in liggende stand krijgen dezelfde bediening via de coarse-pointer-
  en schermhoogteconditie; alleen de schermbreedte is niet meer bepalend.
- De offertepagina heeft een aparte knop voor een extra ruimte, omdat de mobiele
  primaire eindactie nu Offerte bewaren is.
- `tools/mobile_controls_review.mjs` test met browser-touch-emulatie op
  320×568, 360×640, 390×844, 600×420 en 896×414: echte hit-tests, minimumdoelen,
  zichtbare balk, teruggaan, annuleren, bevestigen, behouden waarden en undo.
  Dit is geen fysieke iOS-/Android-apparaattest.

## Alleen informatie voor de huidige vraag

De naamvraag toont nu uitsluitend de naamvraag, het naamveld en ‘Bevestigen en
volgende’. Geen plattegrond, maatvoorbeeld, fasekaart, offertebedrag of vormkeuze.
Vanaf de maatvragen verschijnt het bijbehorende voorbeeld; alleen de actuele
maat wordt benoemd. De vormeditor wordt aangeboden bij het controleren van de
ruimte. Vaste uitleg en velden buiten de actuele formulierpagina blijven verborgen.
Ook algemene offertesaldi worden tijdens vragen niet getoond; prijsbevestigingen
houden hun expliciete prijsinformatie. Teruggaan bewaart de invoer.

## Herstel maat-invoer bij bestaande kamers

De brede maatblokkade is beperkt tot geometriegestuurde kamers (eigen contour,
dak/helling of huisplaatsing). Alleen de aanwezigheid van werkposten, openingen
of trappen maakt een gewone rechthoek niet langer alleen-lezen. Gewijzigde
maten blijven een ontwerp tot de eindbevestiging. Bij een ingerichte kamer is
een extra bevestiging nodig: de offerte wordt herberekend en objecten worden
niet automatisch verplaatst. Controleer daarna de bestaande plaatsingen.

Bij geometriegestuurde maten staat de reden bij de actuele maatvraag, met een
directe knop naar de vormeditor. Oude validatiefouten verdwijnen bij een volgende
vraag; de zichtbare vraagkop krijgt de focus, niet een verborgen hoofdtitel.

`tools/existing_room_input_review.mjs` controleert bestaande werkposten, echte
maat-invoer, annuleren/bevestigen, behoud van regels, undo en de wijzigroute voor
een eigen contour. De volledige wizard- en aansluitpuntreviews gebruiken echte
klik-/toetsaanslagen in plaats van alleen programmatisch gezette invoerwaarden.

## Vaste projectknoppen in de header

Nieuw project en Project verwijderen staan buiten het verborgen bestandsmenu,
ook in de wizard en bij de naamvraag. Beide hebben minimaal 48px hoge
raakvlakken; op smalle schermen staan ze naast elkaar op een eigen rij.
Nieuw project vraagt bevestiging en bewaart bestaande archiefkopieën.
Project verwijderen vraagt expliciet bevestiging en verwijdert alleen de
huidige archiefkopie (indien opgeslagen) plus het huidige werkconcept. Daarna
begint een leeg project. Andere projecten, tarieven en combinatiebibliotheken
worden niet gewist. Bij een mislukte verwijdering blijft het huidige werk in
geheugen behouden. Tijdens opslaan wordt verwijderen uitgesteld; tijdens
verwijderen zijn de projectknoppen geblokkeerd. Late serverreacties wissen geen
intussen geopend ander project.

`tools/project_header_review.mjs` controleert zichtbaarheid/raakvlakken,
annuleren, klikken op pictogrammen, lokale archiefselectiviteit, nieuw beginnen
en een gesimuleerde serverfout. Die fouttest verwijdert geen echte serverdata.

## Bevestigde objecten in alle projectvoorbeelden

Kleine wizardvoorbeelden gebruiken nu een gedeelde contextlaag, met dezelfde
werk-, openings- en trapgeometrie als de grote tekeneditor. Deze laag komt terug
in de maatillustratie, het kleine ruimteoverzicht, de vormeditor, de
openingsdialoog, de elektriciteitsvragen en de algemene werk-/plafondvoorbeelden.
Een wandaanzicht toont de bevestigde objecten op die wand. Bovenaanzichten tonen
de hele actuele kamer, inclusief wandobjecten, plafondpunten en trappen. Objecten
van andere kamers worden niet op die kamer getekend.

Bevestigde context is groen; een nieuw plaatsingsvoorstel blijft blauw en staat
niet in de bevestigde laag tot expliciet toevoegen. Op de opgeslagen-puntpagina
verdwijnt het dubbele blauwe voorstelsymbool. Werkvlakken zijn gemarkeerd, tracés
getekend, openingen omlijnd en aantallen groter dan één vermeld. Een regel zonder
eigen plaatsing gebruikt dezelfde schematische voorbeeldplaats als de tekeneditor;
er worden geen nieuwe uitvoeringsposities verzonnen of in het project opgeslagen.
De contextlaag onderschept geen tikken voor een nieuwe plaatsing.

Verplaatsen en undo verversen de voorbeelden zonder ingevulde velden te vervangen.
Tijdens de wizard blijven werkobjecten in de grote tekening zichtbaar, ook als
relevante objectlagen eerder in vrij ontwerpen waren uitgezet; de oorspronkelijke
laagvoorkeuren worden niet overschreven. De naamvraag blijft zonder tekening.

`tools/confirmed_context_review.mjs` controleert alle genoemde voorbeeldtypen,
wand-/kamerscope, openingen/werkvlakken/tracés/trappen, geen voortijdige toevoeging,
geen dubbel voorstelsymbool na opslaan, live wijziging/undo en behouden invoer.

## Onderbouwde mobiele UI (22 oktober 2026)

Zie [MOBILE_UX_RESEARCH.md](MOBILE_UX_RESEARCH.md) voor bronnen, concrete ontwerpkeuzes en testbeperkingen. Punt-/sleuftekening vóór coördinaten; compacte wandcontext; ✓ bij bevestigde punten en gestippeld voorstel; inline toegankelijke foutmeldingen met invoerbehoud; VisualViewport-/ResizeObserver-bediening boven het toetsenbord. Exacte invoer, klik-/sleepalternatieven, één vraag per stap, projectknoppen en prijsbevestiging behouden. Nieuwe regressie: `research_mobile_review.mjs`. Headerreview klikt nu op het SVG-pluspad in plaats van het oude letterteken; connection-review controleert de eerste positie van de echte tekening in plaats van een los decoratief pictogram.

## Grafisch starten, focus op elektriciteit en Gyproc (22 oktober 2026)

- Na de maten start iedere wand op de echte interactieve tekening, met **Raam toevoegen**, **Deur toevoegen** en **Object toevoegen** direct eronder. De bestaande canvasnode wordt verplaatst, niet gekopieerd of opnieuw aangemaakt. Voor iedere fasewissel wordt hij veilig teruggezet.
- Object toevoegen biedt een aansluitpunt of Gyproc. Bij een nieuw wandaansluitpunt is de volgorde nu **positie → type → enkel/dubbel → inbouw/opbouw → sleuf/kabel → prijs**. Geen automatisch geplaatste stip, geen voorafgaande aantallen- of typevraag. Klikken, aanraken, exacte invoer en positieknoppen blijven beschikbaar.
- Teruggaan van type naar positie behoudt de gekozen plaats. Een bewaard aansluitpuntsjabloon behoudt de eerst gekozen nieuwe plaats. Bevestigen van de prijs blijft het enige moment waarop nieuwe werken worden toegevoegd. Na toevoegen terug naar de tekening voor een volgend object.
- Hoofdtekening: objectselectie toont meteen eigenschappen. Aansluitpunten hebben een type-/uitvoeringskeuze, positie en aantal; sleuven hun eindpunten en gemeten lengte; Gyproc het werkvlak en de berekende hoeveelheid; ramen/deuren hun positie, afmetingen en aantallen. Wijzigingen vereisen Toepassen en blijven ongedaan te maken.
- Kleine voorbeelden: bevestigde punten, routes, vlakken en openingen zijn klikbaar en via Enter/spatie bereikbaar. Een tijdelijke eigenschappendialoog gebruikt dezelfde editor. De conceptpositie blijft behouden. Punten liggen vóór overlappende routes; een ingeklapt objectenlijstje op de wand geeft ook toegang tot overlappende posten. Vlakken reageren op de rand, zodat een bestaande Gyproc-bekleding het plaatsen op de wand niet blokkeert.
- Nieuwe begeleiding beperkt tot elektriciteit, Gyproc-bekleding en Gyproc-voegafwerking. Geen sanitair-/water- of schilderkeuzes. Bestaande andere werken blijven behouden, zichtbaar en in de offerte. Plafondlichtpunten behouden hun bovenaanzicht en vragen nu positie vóór aantal.
- Nieuwe actuele acceptatieregressie: `tools/graphics_first_review.mjs`, offline én via de Python-server, 320×568, 390×844 en liggend 896×414. Controleert plaats vóór type (ook echte aanraking), terug/invoerbehoud, geen vroege modelwijziging, sleuf/dichten/prijs, eigenschappen/typewijziging/undo, kleine preview via pointer én toetsenbord, overlappende-route-lijst, openingsmaten, Gyproc, plafondlichtpunt, volledige wand-/plafond-/offerteloop, projectreset en één behouden canvas. Bestaande header-, ingerichte-kamermaten- en drag-reviews blijven bruikbaar. Oudere volledige-flow-scripts beschrijven de vervangen aantal-/type-eerst- en sanitair-/schildervolgorde; die zijn voor de nieuwe flow niet de acceptatiecriteria.

## Plaatsbezoek als elektricien — snelle keuzes en klantpresentatie

- Auditperspectief: ruimte meten → zichtbaar punt kiezen → uitvoering/werk beslissen → gemeten meters → prijs bevestigen → volgend punt. Geen automatische kabel- of sleufaanname en geen claim dat de app een installatie ontwerpt of technisch keurt.
- Dubbel stopcontact en inbouw zijn nu expliciete ja/nee-vragen. Kabel heeft eerst een ja/nee/open-puntvraag, en alleen bij ja volgt het technische type. Sleuf en dichten behouden ja/nee met ‘nog te bepalen’ als eerlijke uitweg. Het soort object blijft een korte concrete keuzelijst: een kunstmatige reeks ja/nee-vragen zou hier juist trager zijn.
- Na toevoegen direct ‘Ja, nog een punt’ of ‘Nee, wand bekijken’. Een volgend punt start zonder automatische positie; de vorige werken blijven zichtbaar. Combinatie bewaren is een secundaire, ingeklapte mogelijkheid.
- Invoer van puntpositie, hoogte, sleufbegin/-einde, gemeten sleuf-/kabellengte en objecteigenschappen krijgt klikbare plus/min-maten. Sleuf/kabel heeft ook 1/2/3/5/10m-knoppen. Alleen gemeten meters bepalen de prijs; een rechte getekende lijn vervangt geen bochten of reserve.
- Getekende kamer-/wandmaten zijn klikbaar en via Enter/spatie bereikbaar. Tijdens de eerste maatvragen gaat een klik naar het bijbehorende bestaande invoerveld (draft-only). Daarna opent een maatdialoog met toepassen/annuleren. Ingerichte resize vraagt bevestiging, ondersteunt undo en verplaatst geen objecten. Geometrie-afgeleide maten verwijzen naar de vormeditor; verlaten van een nog niet opgeslagen onderdeel vraagt toestemming. Een geopende maatdialoog weigert een achterhaalde kamersnapshot.
- Op de wand kan de elektricien meteen naar 3D voor de klant; slepen draait dan de ruimte. Terug naar 2D herstelt selecteren. Dit verandert geen werken of prijs.
- De wand toont een live ruimtesamenvatting met aansluitpunten, gemeten sleuf-/kabelmeters, projectraming inclusief btw en het aantal open punten. Sleuf+dichten worden niet dubbel opgeteld in de meterstand; onbekende kabels blijven werknotities, niet een impliciete bevestiging of verzonnen kabelprijs.
- Nieuwe regressie `tools/electrician_visit_review.mjs`: 320/390/896px, 2D/3D zonder modelmutatie, klikbare tekeningmaten annuleren/toepassen/undo, conceptpunt behouden, ja/nee-flow, kabelpoort/terug, tikbare metrische velden, snelle meterkeuzes, onafhankelijke sleuf-/kabelhoeveelheden, direct volgend punt en onbekend werk zichtbaar in notities én samenvatting. Getest offline en via de Python-server. Dit is browserautomatisering, geen fysieke toestel- of elektricien-gebruikstest.

## Compacte, grafische wizard — minder tussenstappen

Nieuwste opdracht vervangt de vroegere strikte één-vraag-per-scherm-volgorde waar samenhangende keuzes sneller samen kunnen. Naam blijft apart; positie blijft vóór aansluitpunttype.

- Kamer: vijf pagina’s naar twee (naam, daarna alle drie de maten met tekening). Geen aparte planbevestiging daarna.
- Raam/deur: vier pagina’s naar één met maatpresets, maten, positie en het bestaande voorbeeld.
- Elektriciteit: enkel/dubbel en inbouw/opbouw samen, met expliciete selectie en één vervolgactie. Sleuflengte, getekende route en dichtzetten samen; exacte route inklapbaar. Kabeltype en gemeten meters samen. Keuzes veranderen geen prijsregel vóór de eindbevestiging; ontbrekende beslissingen blokkeren voortgang. Terug behoudt bevestigde invoer; een typekeuze wist geen getypte meters.
- Gyproc-pakketten direct zichtbaar; geen eerst-ja-dan-kiezen-scherm. Plaats/hoeveelheid/prijs samen op één objectpagina. Geen extra wandcontrole; zonder Gyproc wordt ook geen voegafwerking gevraagd. Alle wanden en plafond blijven doorlopen worden.
- Project-, 3D- en offertecontrole gecombineerd tot één eindscherm. De bestaande prijs- en stale-snapshotcontroles blijven actief.
- Kortere koppen, kleinere pictogrammen, minder herhaalde uitleg en voortgangsdecoratie. Klikbare maten en touchbediening behouden; exacte puntpositie zit in een uitklapvak. Belangrijke onzekerheden, technische beperkingen en indicatieve prijzen blijven zichtbaar.
- Actuele flowregressie: `tools/compact_wizard_review.mjs`, offline en Python-server, 320/390/896px. Echte aanraking voor puntplaatsing; schermreducties; expliciete ontbrekende keuzes; invoerbehoud bij typekeuze/terug; geen vroege mutaties; stale-prijsbevestiging; juiste stuk-/sleuf-/dicht-/kabelhoeveelheden; enkelvoudige Gyproc/raam/eindpagina; volledige wand-/plafondloop; geen horizontale overflow of browserfouten. 119 eenheidstests en permanente-headerreview slagen.
- Historische flowreviews volgen de vervangen paginavolgorde. De oude dragreview stoptte na de maatvragen op een bovenaanzicht/plancontrole; die pagina bestaat niet meer: de nieuwe flow gaat direct naar het huidige wandaanzicht. De compacte flowreview is de actuele wizardacceptatie; er is geen wijziging aan sleepcode of rekenkern.
