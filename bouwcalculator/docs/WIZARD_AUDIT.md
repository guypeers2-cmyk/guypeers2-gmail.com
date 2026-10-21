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
