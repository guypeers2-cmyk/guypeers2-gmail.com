# 🖼️ Thumbnails — drie varianten met jouw foto

Gemaakt met de foto die je aanleverde (4032 × 3024 px — ruim voldoende). Klaar voor gebruik: **1280 × 720**, PNG, onder de 2 MB-limiet van YouTube.

| Bestand | Voor welke video | Tekst |
|---|---|---|
| [voorbeelden/thumbnail-A-15-wandelingen.png](voorbeelden/thumbnail-A-15-wandelingen.png) | Long 1 — "15 wandelingen" | 15 / WANDELINGEN / wat ik leerde |
| [voorbeelden/thumbnail-B-7-dagen-leibandles.png](voorbeelden/thumbnail-B-7-dagen-leibandles.png) | Long 2 — de leibandles | 7 / DAGEN / leibandles, zonder stress |
| [voorbeelden/thumbnail-C-mijn-kat-wandelt.png](voorbeelden/thumbnail-C-mijn-kat-wandelt.png) | kanaaltrailer / kanaalbreed | MIJN KAT / WANDELT / elke zondag een nieuwe route |

Variant **C** is de volledige-foto-versie (16:9, tekst onderaan over een donker verloop). Varianten **A** en **B** zetten de kop in een kader, omdat dat op klein formaat net iets strakker leest.

## Waarom deze drie

- **A** is de "bewijs"-thumbnail: een getal plus een gezicht. Cijfers werken in de feed omdat ze een belofte zijn ("15 wandelingen" = ervaring).
- **B** is de "hoe dan"-thumbnail: geel blok, zwarte tekst, maximale leesbaarheid op 120 px. Dit is de video die jarenlang views moet krijgen, dus de thumbnail moet eerder *duidelijk* dan *mooi* zijn.
- **C** is de kanaal-thumbnail: geen onderwerp, wel de positionering in drie woorden.

## Twee dingen die je moet weten

**1. De resolutie is nu in orde.** 4032 × 3024 geeft haarscherpe thumbnails, ook op tv-formaat. Ik heb de foto licht gecorrigeerd (kleur, contrast, verscherping) en de uitsnede op de kop gelegd, zodat de deurklink en de muur rechts wegvallen.

**2. Deze foto is binnen genomen.** Voor een kanaal over *wandelen* werkt een foto met harnas, buiten, in daglicht vele malen beter — ook omdat kijkers op de thumbnail al zien dat het geen gewone kattenvideo is. De beste thumbnailfoto's:

- kat kijkt recht in de camera (oogcontact > mooie achtergrond)
- buiten, met harnas zichtbaar
- geen rommel in de achtergrond (vuilnisbak, wasrek, meubels)
- tegenlicht vermijden; zachte namiddagzon
- kat vult minstens de helft van het kanaal waarin ze staat

## Zelf maken of aanpassen

| Manier | Wanneer |
|---|---|
| [thumbnail-maker.html](thumbnail-maker.html) | snel: foto slepen, tekst typen, PNG downloaden (draait in je browser) |
| [maak_thumbnails.py](maak_thumbnails.py) | opnieuw genereren met een andere foto of andere tekst: `python3 -m venv .venv && .venv/bin/pip install pillow && .venv/bin/python docs/stella-on-tour/thumbnails/maak_thumbnails.py jouw-foto.jpg` |
| [A-closeup.svg](A-closeup.svg) · [B-landschap.svg](B-landschap.svg) · [C-contrast.svg](C-contrast.svg) | bewerken in Figma, Inkscape of Illustrator (tekst blijft bewerkbaar) |

> `maak_thumbnails.py` is het enige bestand in dit project dat een externe bibliotheek (Pillow) gebruikt. Het is een ontwerphulpje voor de documentatie, geen deel van de Gids-runtime — die blijft dependency-vrij.

## Regels (uit het groeiplan)

- max. 4 woorden groot, max. 34 tekens klein
- leesbaar op 120 px breed
- gezicht of ogen altijd in beeld
- nooit twee keer dezelfde lay-out naast elkaar op je kanaal
- test twee varianten in Studio (*Test en vergelijk*) als je die functie hebt
