# Onderzoek ruimteplanners en verbeteringen aan de Bouwprijscalculator

**Datum: 18 oktober 2026 · Doelgroep: aannemer/uitvoerder op de werf**

## Afbakening en werkwijze

Gericht bronnenonderzoek naar zes vergelijkbare producten: officiële helpcentra,
handleidingen en productdocumentatie over vrije ruimtecontouren, maatvoering,
plafondhellingen, 2D/3D en de aansluiting op een kostenraming. De technische
keuzes hieronder zijn mijn beoordeling voor deze app, niet een algemene ranglijst.
De concurrerende apps zijn niet met betaalde accounts interactief doorgemeten.
Prijzen, abonnementen en claims over scan-/AI-nauwkeurigheid zijn niet geverifieerd
en worden niet als basis voor onze bouwprijzen gebruikt.

## Vergelijking

| Product | Wat de documentatie laat zien | Beoordeling voor onze app |
|---|---|---|
| **Floorplanner** | Een snelle rechthoek of wand-voor-wand tekenen voor meerdere zijden/hoeken; een gesloten contour vormt vloer en plafond. Voor complexere plafonds beschrijft de documentatie gesplitste wanden of losse plafondvlakken. [6](https://help.floorplanner.com/en/articles/8426747-how-to-draw-a-room) [4](https://help.floorplanner.com/en/articles/2408322) | Neem de twee startwegen over: snel via voorinstelling, precies via losse hoeken. Behandel plafondvorm als eigen geometrie; gebruik geen willekeurige 3D-vervorming die niet meer met de meetstaat overeenkomt. |
| **RoomSketcher** | Exacte wandlengten zijn tijdens/na tekenen instelbaar. Plafondhellingen gebruiken hoogten op wand-/verdeellijnpunten; aansluitende punten moeten overeenkomen. De helptekst noemt beperkingen bij complexere hellingen en bij niet-haakse wanden in die werkwijze. [2](https://help.roomsketcher.com/hc/en-us/articles/360000202509-How-Can-I-Draw-Walls-with-Exact-Lengths) [1](https://help.roomsketcher.com/hc/en-us/articles/360000563269-How-Can-I-Draw-Sloped-Ceilings) | Combinatie van slepen en exacte invoer is belangrijker dan alleen een mooi plaatje. Begin met één wiskundig vlak plafond; zo sluiten alle wandhoogten automatisch aan, ook bij diagonale wanden. |
| **magicplan** | Vrij tekenen gaat hoek voor hoek op een raster, met maatcorrectie achteraf. Het artikel over schuine plafonds onderscheidt een visuele aanduiding en een methode met echte hoogten. [30](https://help.magicplan.app/create-a-room-with-the-define-corners-feature) [6](https://magicplan.app/blog/sloped-slanted-ceiling-room-layout) | Touch-first hoekpunten en expliciete correctie passen bij gebruik op de werf. Een getekend symbool is geen betrouwbare hoeveelheid: houd visualisatie en gevalideerde rekengeometrie duidelijk uit elkaar. |
| **Sweet Home 3D** | De officiële functies noemen rechte, ronde en hellende wanden met maatvoering via muis/toetsenbord. De handleiding voor schuine plafonds werkt met gesplitste wanden en aangepaste hoogten/afzonderlijke delen. [16](https://www.sweethome3d.com/features/) [1](https://www.sweethome3d.com/slopingCeilingGuide.pdf) | Bruikbare inspiratie voor hoekbewerking en delen. Geen meubels- of modelimport toevoegen voordat oppervlakken, referenties en offertes betrouwbaar blijven bij vormwijzigingen. |
| **Planner 5D** | De potloodfunctie kan een contour hoek voor hoek maken en sluiten op de eerste hoek. Wandmaten kunnen numeriek worden aangepast. [8](https://support.planner5d.com/en/articles/5876887-using-a-partition-wall-function-web) [7](https://support.planner5d.com/en/articles/7210615-how-to-resize-a-room) | Een herkenbaar patroon: tikken om te tekenen, eerste hoek aantikken om te sluiten. Daarnaast een numerieke route voor gebruikers die al een opmeting hebben. |
| **Cedreo** | Documenteert live oppervlaktetabellen voor o.a. unit-cost pricing, maatvoering/annotaties, en afzonderlijk instelbare daken met hellingen. [2](https://cedreo.com/floor-plan-software/surface-area-table/) [1](https://cedreo.com/floor-plans/floor-plan-dimensions/) [4](https://cedreo.com/floor-plan-software/roof/) | De sterkste aansluiting op ons doel is de keten tekening → meetstaat → prijs, niet fotorealisme. Onderscheid vloeroppervlak, werkelijke plafondoppervlakte en eventueel later bruikbare hoogtezones. |

## Belangrijkste tekortkomingen van onze vorige versie

Eigen code-/gebruiksevaluatie, vóór deze wijziging:

1. Iedere ruimte was een rechthoek met vier vaste windrichting-wanden.
2. Het plafond had altijd dezelfde oppervlakte als de vloer en één vaste hoogte.
3. De bediening was hoofdzakelijk objectgericht; de gebruiker kon de ruimte zelf
   niet uittekenen.
4. Veel wandkeuzes waren hard gecodeerd op noord/oost/zuid/west.
5. Een algemene polygon-editor zonder aangepaste rekenkern zou foutieve m² en
   offerteprijzen opleveren. Dat is een groter risico dan een ontbrekend 3D-effect.

## Nu geïmplementeerd

### 1. Zelf tekenen, met snelle startvormen

**Ruimte tekenen** staat rechtstreeks boven het plan en bij Ruimtematen.
Voorinstellingen: rechthoek, L, T, U, trapezium, afgeschuinde hoek, achthoek en
driehoek. **Vrij tekenen** plaatst de hoeken met muis of touch; sluiten kan via de
eerste hoek of de expliciete knop.

Hoeken slepen, coördinaten invoeren, een wand splitsen, een hoek verwijderen,
plaatselijke stappen terugzetten en met pijltjes verplaatsen zijn mogelijk.
Wandlengten en binnenhoeken worden getoond, ook inspringende hoeken van >180°.
Bij vrije invoer kan een volgende wand ook via lengte en richting worden getekend.
De tijdelijke editor verandert het project pas na **Toepassen**.

### 2. Meetstaat die de echte contour volgt

Een simpele, gesloten veelhoek met 3–64 punten, inclusief concave L-/U-vormen.
De vloer gebruikt de veelhoekoppervlakte, niet lengte × breedte van het omhullende
kader. Elke echte rand is een aparte wand met een eigen blijvende sleutel.
Alle vlakkeuzes, openingen, werkposten, aanzichten en het objectmenu volgen die
wanden. Oude rechthoekige offertes blijven ondersteund.

### 3. Controleerbare schuine vlakken

Eén vlak plafond kan hellen langs X of Y, met twee hoogten. De wanden worden
rechthoeken of trapezia afhankelijk van hun eindhoogten. Het plafond krijgt de
werkelijke schuine oppervlakte in plaats van zijn horizontale projectie.
Bovenaanzicht, 3D en ieder wandaanzicht delen dezelfde geometrie. Vloer/plafond in
vlakaanzicht zijn expliciet een bovenprojectie, niet een uitgeklapt zaagpatroon.

### 4. Veilig wijzigen van bestaande offertes

- De conceptcontour heeft een eigen bewerkingshistorie; annuleren verandert niets.
- Kruisende/rakende contouren, nulwanden, dubbele wandsleutels en ongeldige
  hoogten worden afgewezen, ook in de Python- en Worker-rekenkern.
- Bij verdwenen gebruikte wanden moet de gebruiker expliciet een nieuwe wand
  koppelen. Zonder keuze wordt niets toegepast; werkregels worden niet stil
  overgeslagen door de editor.
- Vormwijzigingen met bestaande posten/openingen vragen bevestiging. Geometrie
  en eventuele wandkoppelingen vormen samen één stap in Ongedaan/Opnieuw.
- De selectie waarschuwt voor punten/tracés buiten de contour, boven het plafond
  of een opening die niet past. Dit is geen volledige botsingscontrole.
- Getekende maten kunnen voor weergave worden begrensd; openingaftrek blijft
  gebaseerd op de ingevoerde maten/aantallen. Controle is noodzakelijk.
- De offerte en geprinte plattegrond benoemen omhullende maten als zodanig, niet
  als een rechthoekig kamervolume.

## Waarom niet meteen alle CAD-functies?

**Bewuste grens van deze versie:** één horizontale vloer, één eenvoudige contour
zonder gaten, en één plat of enkelvoudig hellend plafond. Geen ronde wanden,
schuine vloeren, geknikte/samengestelde daken, dakkapellen of constructieve
berekening. Diagonale wanden in de plattegrond zijn wel mogelijk; uit het lood
hellende verticale wanden niet.

De oppervlaktegeometrie is berekend, maar plaatindeling, studverdeling en snijverlies
blijven ramingsnormen. Een complexere contour maakt een materiaalstaat niet
vanzelf een montage- of zaagplan. Hiervoor is een aparte optimalisatie nodig.

## Voorgestelde volgende prioriteiten — nog niet geïmplementeerd

1. **Meerdere plafondvlakken met expliciete randen/nokken.** Alleen toevoegen met
   vlakheids-, aansluit- en overlappingsvalidatie en dezelfde Python/JS-pariteit.
2. **Bestaande schets als achtergrond.** Bekende maat kalibreert de schaal;
   daarna handmatig overtrekken. Lokale verwerking, bestandlimieten en veilig
   omgaan met uploads zijn randvoorwaarden.
3. **Objecten aan wandafstanden koppelen.** Minder losse XYZ-coördinaten,
   duidelijk onderscheid tussen vrij geplaatste tracés en wandgebonden objecten.
4. **Oppervlakken per hoogtezone.** Bruikbare vloer onder een schuin plafond is
   niet hetzelfde als vloer- of afwerkingsoppervlakte. Eventuele regelgeving
   moet apart worden gekozen en gevalideerd.
5. **Volledige woningplattegrond met gedeelde wanden.** Voorkom dubbele hoeveelheden
   voordat meerdere ruimtes visueel tot één woning worden samengevoegd.
6. **Echte materiaallay-out en schaalvaste uitvoer.** Een grotere ingreep dan de
   huidige schematische offerteplattegronden; geen technische schaalcertificering
   suggereren voordat dit is getest.

## Controle en reproduceerbaarheid

- Python-stdlib, geen nieuwe runtime-dependencies.
- Python/JavaScript-rekenpariteit uitgebreid met concave en diagonale contouren,
  beide prijsmodi, beide hellingsassen en een opening op een vijfde wand.
- Geometrietests voor oppervlakken, nulwanden, kruisingen, bereik, identiteit en
  tracés die buiten een concave contour lopen.
- `tools/vorm_review.mjs`: voorinstellingen, vrij tekenen, numerieke invoer,
  splitsen/verwijderen, sleepannulering, wandkoppeling, prijsoppervlakken,
  aanzichten, diagonale verplaatsing, metercontrole, historie, opslag, focusmodus
  en mobiele/touchbediening; uitgevoerd op de Python-server, Worker en het offline bestand.
- Browsercontrole gebruikt Chromium met desktop-/mobiele viewports en echte
  Chromium-touch-events. Geen claim over testen op fysieke iPhones of over
  Safari/Firefox zonder aparte verificatie.
