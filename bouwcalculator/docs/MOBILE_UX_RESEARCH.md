# Onderbouwde mobiele UI — 22 oktober 2026

## Doel en afbakening

De bouwer helpen van kamermaten naar een volledige offerte en 3D-overzicht. De huidige beslissing en de tekening staan centraal. Dit is een gerichte verbetering van de bestaande wizard, geen nieuwe rekenkern of ongevalideerde claim op de ‘beste UI’. Eén vraag per stap, alle bevestigde objecten, teruggaan, slepen, exacte invoer, offlinegebruik en de permanente projectknoppen blijven behouden.

Onderzoek: openbare richtlijnen van Nielsen Norman Group, GOV.UK Design System en W3C. De genoemde `@style`-integratie is niet ondersteund; dit onderzoek is rechtstreeks op openbare bronnen gebaseerd.

## Bevinding → toepassing

| Bron | Relevante bevinding | Concrete toepassing |
| --- | --- | --- |
| [GOV.UK: question pages](https://design-system.service.gov.uk/patterns/question-pages/) | Begin met één vraag per pagina; behoud context en een duidelijke vervolgstap. | Bestaande één-vraag-wizard behouden. Compacte wandoriëntatie naast de kamer-/wandtekst, in plaats van een gecentreerde kaart op een extra rij. |
| [GOV.UK: buttons](https://design-system.service.gov.uk/components/button/) | Eén primaire actie maakt het vervolg duidelijk. | Blauwe contextuele volgende-knop behouden; Vorige blijft visueel secundair. Geen extra primaire actie toegevoegd. |
| [NN/g: progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Primaire taken direct beschikbaar; aanvullende opties pas wanneer relevant. | Tijdens het mobiele toetsenbord verbergen we uitsluitend de globale voortgang en het kleine oriëntatiekaartje; vraag, tekening, invoer en bediening blijven beschikbaar. Geen nieuwe verborgen exacte-matenfunctie: coördinaten blijven direct onder de tekening. |
| [NN/g: web form design](https://www.nngroup.com/articles/web-form-design/) | Korte formulieren, duidelijke verticale volgorde en labels bij velden. | Punt- en sleuftekening vóór coördinaten. Overbodig los productpictogram bij puntplaatsing verwijderd; de interactieve tekening vervangt het. Kortere, gerichte invoerfouten en correcte numerieke toetsenbordhint bij aantallen. |
| [GOV.UK: error messages](https://design-system.service.gov.uk/components/error-message/) | Specifieke fout bij het veld, gekoppeld voor hulptechnologie. | Inline fouttekst, `aria-invalid` en `aria-describedby`; bestaande hintreferenties blijven behouden. Focus naar het foutieve veld, invoer bewaren. Herstel wist de fout; 1–4/plus/min-knoppen kunnen foutieve aantallen corrigeren. Foutmelding/validatie pas na bevestigen, niet bij elke toetsaanslag. |
| [WCAG 2.4.11: focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) | Eigen vaste bediening mag focus niet volledig verbergen. | Header-/footerhoogte meten met ResizeObserver. VisualViewport volgt verkleinen en verschuiven; footer komt boven het toetsenbord. Scrollruimte en gerichte focuscorrectie houden het invoerveld tussen header en footer. Zonder VisualViewport blijft de gewone viewport de fallback. |
| [WCAG 1.4.1: use of color](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html) | Betekenis niet uitsluitend met kleur overbrengen. | Bevestigde puntsymbolen krijgen ✓ bij hun nummer; het conceptpunt krijgt een gestippelde rand en de tekst ‘Dit punt’. Legenda ‘✓ Bevestigd · ◌ Voorstel’, naast bestaande beschrijvende SVG-titels. Thema-afhankelijke kleuren behouden. Dit is geen volledige WCAG-conformiteitsverklaring. |
| [WCAG 2.5.8: target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [WCAG 2.5.7: dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) | AA minimum is 24 CSS-pixels of een toepasselijke afstandsuitzondering; slepen moet een alternatief hebben. | Bestaande 48px mobiele hoofdbediening behouden (ruimer dan dit minimum). Tik op de wand, positie-/hoogteknoppen, coördinaten en pijltjestoetsen blijven alternatieven voor slepen. Nieuw-project-plus is een SVG, zonder afhankelijkheid van een beschikbaar lettertype. |

## Bewuste ontwerpkeuzes

- Geen extra dashboard, carrousel, nieuw navigatieniveau of verplichte tutorial.
- Geen nieuwe afbeeldingen of externe fonts: technische SVG-tekeningen blijven scherp, schaalbaar en offline beschikbaar.
- De tekening blijft zichtbaar bij toetsenbordinvoer, maar compacter. Alleen secundaire voortgang verdwijnt tijdelijk.
- Technische veiligheidsinformatie, onbekende posten en prijsbevestiging blijven behouden.
- Geen wijzigingen aan tarieven, rekenregels, gedeelde meters, projectopslag of 3D-geometrie.

## Verificatie

Nieuwe regressie: `bouwcalculator/tools/research_mobile_review.mjs`.

- 320×568, 390×844 en liggend 896×414; geen horizontale overflow.
- Echte toetsenbordinvoer in naam, aantal, coördinaten en sleuflengte.
- Inline fout, focus, ARIA-relaties, behoud bestaande hint en invoer; herstel via typen én aantal-knop.
- Tekening vóór puntcoördinaten en vóór sleufcoördinaten, zonder wijziging aan project vóór bevestiging.
- Gestippelde conceptmarkering en legenda; kleuren in licht en donker.
- Gesimuleerde VisualViewport-verkleining met 260px toetsenbordruimte, pan van 24px en herstel: footer boven de occlusie en gefocust veld volledig zichtbaar tussen header en footer.
- Browserbeelden worden uitsluitend als tijdelijke reviewbestanden opgeslagen, niet in Git.

Daarnaast: bestaande mobile-controls-review (320–896px, echte touch-hittests, 48px targets, 16px invoer), full-wizard-, connection-wizard-, confirmed-context-, project-header-, existing-room-input- en wizard-drag-reviews; 81 bouweenheidstests en 38 overige eenheidstests.

**Beperking:** Chromium-browserautomatisering en gesimuleerde VisualViewport zijn geen fysieke iOS-/Android-toetsenbordtest of gebruikerstest met bouwers. Volgende praktijkcontrole: laat een bouwer op een echte telefoon een kamer, deur en twee aansluitpunten invoeren, één fout herstellen en de offerte/3D controleren. Observeer vindbaarheid van de tekening, benodigde scrollbewegingen en twijfel bij de volgende actie.
