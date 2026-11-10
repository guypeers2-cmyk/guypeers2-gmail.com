# 🐈 Ginger Cat Daily Dose #01 — het compilatieconcept

**Wat dit is:** het creatieve plan (en de kant-en-klare bouwstenen) voor een compilatie van 1,5 minuut met Stella's eigen beelden, in de vorm die @dramecs dagelijks gebruikt — maar met een verhaal, een plaats en een kat die echt bestaat.

**Waarom deze vorm werkt:** Dramecs haalt met "This Is Your Daily Dose of Cats Day 140" tienduizenden views per aflevering, met een genummerde reeks en één belofte: *elke dag een paar grappige kattenmomenten*. De kracht zit niet in de montage, maar in **de reeks** (een nummer in de titel = er is meer) en **de herkenbaarheid** (je weet binnen twee seconden wat je krijgt).

**Wat jij toevoegt:** het is één kat, het is echt, en er zit een "hoe" onder. Daarmee is dit geen wegwerpmeme maar de eerste aflevering van iets dat kan groeien.

---

## 1. Wat je nodig hebt

| Onderdeel | Waar |
|---|---|
| Bouwstenen (kaarten, thumbnail, script) | [compilatie/](compilatie/README.md) |
| Je eigen clips | `compilatie/clips/` — de ruwe bestanden van je telefoon |
| Titel + ondertitels per segment | `compilatie/segments.json` |

---

## 2. De opbouw (94 seconden)

De volgorde is niet willekeurig: **eerst het grappigste moment**, dan afwisselen, dan één emotioneel moment, en eindigen met een knipoog.

| # | Moment | Ondertitel in beeld | Duur | Waarom daar |
|---|---|---|---|---|
| — | **Introkaart** | GINGER CAT DAILY DOSE #01 | 2,5 s | meteen duidelijk wat dit is |
| 1 | Ze staat om 7 uur aan de deur | *7 AM. She is ready.* | 5 s | haakje: herkenbaar voor elke katteneigenaar |
| 2 | Ze stapt de kroeg binnen | *She owns this pub now.* | 9 s | **je sterkste moment meteen** (1,4K op je kanaal) |
| 3 | Ze wacht aan het zebrapad | *She waits for the green light.* | 7 s | verrassing: dit doet een kat dus wél |
| 4 | Ze maakt een vriend op straat | *She picks her own friends.* | 8 s | warmte, mensen reageren |
| 5 | Ze keurt elke hond | *Rated 2 out of 10.* | 7 s | het grapje herhalen, steeds erger |
| 6 | Ze weigert over natte tegels | *Wet pavement? Absolutely not.* | 7 s | herkenning, tag-materiaal |
| 7 | Ze vindt de bakkerij | *She found the bakery.* | 8 s | payoff: de kat wint |
| 8 | Ze beslist dat het genoeg is | *Twenty minutes. Not one more.* | 7 s | **welzijn als grap** — je handtekening |
| 9 | Dag 1, de eerste straat | *Day 1 outside.* | 8 s | de origin: waar het begon |
| 10 | Haar bankje | *Her bench. Not yours.* | 6 s | routine = personage |
| 11 | De zee, voor het eerst | *First time at the sea.* | 10 s | **één emotioneel moment**, vlak voor het einde |
| 12 | Ze valt rechtop in slaap | *Full battery. 0%.* | 6 s | de knop: moe, voldaan, klaar |
| — | **Slotkaart** | TOT DE VOLGENDE WANDELING | 3,5 s | reeksbelofte |

**Total: ± 94 seconden.** Kort genoeg om uit te kijken, lang genoeg om een verhaal te hebben.

---

## 3. De ondertitels zijn de grap

De regel uit de Dramecs-analyse: **de titel en de ondertitel doen het werk, niet de uitleg.**

- Max. 6 woorden per ondertitel
- Tegenwoordige tijd, derde persoon ("She owns…", niet "Ik ging…")
- Geen uitroeptekens, geen emoji in beeld
- De ondertitel zegt wat je ziet, plus één laag erboven (de grap)
- Nooit twee regels tegelijk uitleggen

---

## 4. Titel-opties

Kies er één. De eerste is de reeksnaam; de andere zijn eenmalige varianten om te testen.

1. **Ginger Cat Daily Dose #01**
2. **She Walked Into a Pub and Owned It | Ginger Cat Daily Dose #01**
3. **12 Walks With My Ginger Cat (She Picks the Route Now)**
4. **My Ginger Cat Has a Walk Limit and She Knows It**
5. **Ginger Cat Daily Dose #01 — een kat die België te voet verkent**

> Het nummer is het belangrijkste woord in de titel: het is de belofte dat er een #02 komt.

---

## 5. Beschrijving (plakbaar)

```
Twaalf momenten uit de wandelingen van Stella — een ginger cat die België te
voet verkent. Van de kroeg tot de zee, en alles wat ze onderweg beslist.

Deze aflevering: ze kiest haar eigen vrienden, keurt elke hond, en beslist
zelf wanneer het genoeg is.

⏱ Hoofdstukken
00:00 Ze staat om 7 uur klaar
00:08 De kroeg is van haar
00:20 Ze wacht voor groen
00:30 Ze kiest haar vrienden
00:41 Een 2 op 10
00:50 Natte tegels? Nee
00:59 Ze vindt de bakkerij
01:08 Twintig minuten, geen minuut meer
01:16 Dag 1 buiten
01:27 Haar bankje
01:34 De zee, voor het eerst
01:44 Volle batterij, 0%

🐈 Stella wandelt 4× per week. Elke zondag een nieuwe video.
📷 Instagram: [jouw link]

#gingercat #adventurecat #wandelenmetjekat

Bron en welzijn: ik check de regels per plek en stop wanneer zij stopt.
Geen enkel moment in deze video is geforceerd.
```

---

## 6. De Shorts-versie (60 seconden)

Snijd dezelfde compilatie tot 60 seconden met de zes sterkste momenten, in deze volgorde:

1. De kroeg (9 s)
2. Zebrapad (7 s)
3. Honden keuren (7 s)
4. Bakkerij (8 s)
5. Twintig minuten (7 s)
6. Slaap (6 s)

Plus 2 seconden openingstitel en 4 seconden einde = **50 seconden**.

Zet in `segments.json`:

```json
"formaat": "9:16",
"uitvoer": "ginger-cat-daily-dose-01-short.mp4",
"kaarten": { "intro": "kaarten/intro-9x16.png", "outro": "kaarten/outro-9x16.png" }
```

en laat alleen die zes segmenten staan. Titel: **"She Owns This Pub Now 😂"** — de regel uit de Dramecs-analyse: observatie, geen samenvatting.

---

## 7. Wat je niet doet

- **Geen compilatie van andermans katten.** Dat is de reden dat veel "daily dose"-kanalen vroeg of laat in de problemen komen. Jij hebt een eigen kat; gebruik haar.
- **Geen muziek die harder staat dan de omgeving.** Bij een wandeling is wind en verkeer je sfeer.
- **Geen twintig segmenten.** Twaalf is de grens: daarna gaat het voelen als een archief.
- **Geen ondertitel die uitlegt wat je al ziet.** "Ze loopt over straat" bij een kat die over straat loopt is verspilde ruimte.
- **Niet alle clips uit je Shorts plukken.** Gebruik waar mogelijk de ruwe opname: schoner beeld, geen eerdere compressie, en je kunt een ander begin- en eindpunt kiezen.

---

## 8. Waarom dit je kanaal verder helpt

| Effect | Waarom |
|---|---|
| **Een reeks in plaats van losse video's** | "#01" belooft een "#02" — dat is de reden om te abonneren |
| **Een tweede leven voor je beste momenten** | je beste Shorts werken opnieuw, in een langere vorm |
| **Kijkduur** | 94 seconden is tien keer je gemiddelde Short; dat telt mee voor watch time |
| **Een format dat je kan herhalen** | elke maand een nieuwe aflevering met dezelfde kaarten en dezelfde regel |
| **Bewijs dat je echt wandelt** | twaalf momenten na elkaar is overtuigender dan twaalf losse clips |

**En de eerlijke kanttekening:** dit is geen viral-truc. Het is de eerste aflevering van een reeks die pas werkt vanaf #04 of #05 — als de kaarten hetzelfde zijn, de titel hetzelfde patroon heeft en je elke keer twaalf momenten levert. Reeksen groeien door herhaling, niet door één goede aflevering.
