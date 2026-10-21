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
