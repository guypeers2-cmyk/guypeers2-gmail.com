# Apparaatcompatibiliteit — review 18 oktober 2026

## Testomgeving en afbakening

Headless Chromium via Puppeteer; desktopvensters en mobiele viewport-/touch-emulatie.
Geen echte iPhone, iPad of Android-hardware getest. Geen native Safari/WebKit of
Firefox uitgevoerd. Een geslaagde viewporttest is geen certificatie voor alle browsers.
De app vereist een moderne browser met JavaScript, SVG, Intl en CSS Grid/Flexbox.
Geen nieuwe runtime-dependencies toegevoegd.

## Resultaten

| Breedte (CSS-px) | Rekenblad | Tarievenblad | Horizontale pagina-overflow |
|---:|---|---|---|
| 320 | OK | OK | Geen |
| 360 | OK | OK | Geen |
| 390 | OK | OK | Geen |
| 768 | OK | OK | Geen |
| 1024 | OK | OK | Geen |
| 1280 | OK | OK | Geen |
| 1440 | OK | OK | Geen |
| 1920 | OK | OK | Geen |

De volledige matrix is geslaagd via de Python-server, de lokale Cloudflare Worker
en het offline `file://`-bestand: 48 combinaties van breedte, hoofdtab en hostingmodus.
Naast scrollWidth is ook `innerWidth` gecontroleerd: een mobiele browser mag niet
stilzwijgend de layout breder maken en het scherm vervolgens verkleinen.

Aanvullend geslaagd:
- Sanitair kiezen, 15 pakketten, locatie wijzigen, meterhoeveelheid invullen.
- Sanitair blijft per stuk/meter in een gemengde offerte met snelle m²-Gyproc.
- Tarievenfilter sanitair (29 materiaal-/arbeidsnormen), project herladen.
- Mobiele knoppen minimaal 44 px hoog; hoeveelheidinvoer minimaal 16 px.
- 3D openen en draaien bij elke schermbreedte.
- Donkere modus en `prefers-reduced-motion`.
- A4-PDF vanuit actieve hoofdtab Tarieven: offertedocument zichtbaar,
  calculatorbediening en tarieveneditor niet afgedrukt.
- Geen JavaScript-/consolefouten tijdens deze controles.

## Opgeloste problemen

- Op 320–390 px werd de mobiele layout 427 px breed door tabellen.
  Oppervlakken, openingsmaten en detaillijsten scrollen nu lokaal.
- Lange werkpakketnamen konden selectvelden buiten de werkkaart duwen.
  Op smalle schermen staat de selector op een eigen regel en binnen de kaart.
- Kleine knoppen vergroot naar minimaal 44 px hoog op mobiele breedtes.
- Invoertekst op mobiel naar 16 px; dit voorkomt doorgaans iOS-focuszoom,
  maar het gedrag is nog niet op een echte iPhone geverifieerd.
- Verminderde-animatievoorkeur gerespecteerd.
- Namen van ruimte, opening en werkpakket expliciet toegankelijk benoemd.

## Herhalen

Optionele ontwikkeltools; de app blijft Python-stdlib en browser-JavaScript zonder
extra runtimebibliotheken. Installeer browsertools buiten de repository:

```bash
npm install --prefix /tmp/bouw-browser puppeteer-core @sparticuz/chromium
PORT=8093 python3 bouwcalculator/server.py
```

In een tweede terminal:

```bash
BROWSER_MODULE_ROOT=/tmp/bouw-browser \
APP_URL=http://localhost:8093/ \
node bouwcalculator/tools/browser_review.mjs
```

De meegeleverde Linux-Chromium heeft geschikte systeembibliotheken nodig.
Als je al een Chrome/Chromium-installatie hebt, geef `CHROME_PATH` op; dan is
`@sparticuz/chromium` niet nodig. Het script produceert screenshots, PDF en
`results.json` in `/tmp/bouw-browser-review` (niet in Git).

Herhaal met `APP_URL=http://localhost:8787/` voor een lokale Worker, of met een
absolute `file:///.../bouwcalculator.html`-URL voor de standalone.
Gebruik `REVIEW_OUTPUT` voor een aparte uitvoermap. De test wist uitsluitend
het localStorage van zijn eigen tijdelijke browserprofiel, niet dat van je browser.

## Nog handmatig te controleren

- iPhone/iPad: Safari, schermtoetsenbord, datumkiezer, nummerinvoer met komma.
- Android: Chrome, schermtoetsenbord, bestanden importeren/downloaden en printen.
- Desktop: Firefox, Safari, browserzoom 200%, lange offertes over meerdere A4's.
- Screenreader en hoge-contrast-/forced-colorsmodus.
- Browseropslag in privémodus en onder beperkend opslagbeleid. Die kan ontbreken;
  bewaar belangrijke offertes daarom ook als JSON-bestand.

Op zeer smalle schermen is horizontaal scrollen binnen brede tabellen bewust
behouden: de kolommen worden niet onleesbaar klein gemaakt.
