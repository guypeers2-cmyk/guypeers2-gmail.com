# 🎞️ Compilatie maken — Ginger Cat Daily Dose

Deze map bouwt de compilatie uit **je eigen clips**: kaarten, ondertitels, volgorde en een kant-en-klaar ffmpeg-commando. De inhoud en het verhaal staan in [12-compilatie-ginger-cats.md](../12-compilatie-ginger-cats.md).

## 🎬 De video's die er al zijn

| Bestand | Wat | Duur |
|---|---|---|
| `ginger-cat-daily-dose-01-teaser-9x16.mp4` | verticale teaser (1080 × 1920) — voor Shorts/Reels/TikTok | 27 s |
| `ginger-cat-daily-dose-01-teaser-16x9.mp4` | liggende teaser (1920 × 1080) — voor je kanaaltrailer | 27 s |
| `storyboard-daily-dose-01-16x9.mp4` | **bewegend storyboard** van de volledige aflevering (1920 × 1080) | 1 m 31 s |
| `storyboard-daily-dose-01-9x16.mp4` | hetzelfde, verticaal (1080 × 1920) — voor Shorts | 1 m 31 s |

Het **storyboard** is de hele aflevering zoals ze *zou* zijn: introkaart, twaalf segmenten
met hun ondertitel en een langzame zoom op de foto, slotkaart. Het is tegelijk een
**repetitie** (zo voelt de timing, zo staan de ondertitels) en een **placeholder voor de
montage**: zodra je `clips/` vult, rendert `maak_compilatie.py` dezelfde volgorde met echt
beeld. Er zit nog geen geluid in.

Gemaakt met `maak_teaser.py` uit de foto van Stella en de drie kaarten: zes tekstmomenten
("This is Stella.", "She is not a house cat.", "She walks. On a leash.", "On her terms.",
"Every Sunday. A new route.", "Ginger Cat Daily Dose #01") met een langzame zoom op
verschillende delen van de foto.

**Let op:** dit zijn **teasers**, geen compilatie van clips — daarvoor is beeldmateriaal
nodig dat dit project niet heeft. Ze zijn wel meteen bruikbaar: de 16:9-versie is je
kanaaltrailer voor nieuwe bezoekers, de 9:16-versie is je eerste verticale video.

**Stil, en dat is expres.** Zet er in Studio een nummer uit de YouTube Audio Library
onder (25 % volume), of neem 20 seconden commentaar op.

---

**Wat je hier krijgt**

| Bestand | Wat |
|---|---|
| `segments.json` | de 12 segmenten: bestandsnaam, start, duur, Engelse + Nederlandse ondertitel |
| `maak_compilatie.py` | bouwt de video met ffmpeg (intro + clips + outro, ondertitels ingebrand, optioneel muziek) en schrijft een `.srt` |
| `kaarten/intro-16x9.png` · `intro-9x16.png` | titelkaart, 1920 × 1080 en 1080 × 1920 |
| `kaarten/outro-16x9.png` · `outro-9x16.png` | afsluitkaart |
| `kaarten/thumbnail-ginger-cat-daily-dose.png` | thumbnail 1280 × 720 voor de upload |
| `maak_kaarten.py` | maakt die kaarten opnieuw (andere tekst, ander nummer) |
| `maak_teaser.py` | rendert de teaser hierboven (foto + kaarten + bewegende tekst) |
| `maak_storyboard.py` | rendert het bewegende storyboard van alle 12 segmenten (foto + kaarten + ondertitels) |

---

## ⚠️ Eerst dit: alleen je eigen beelden

Een compilatie van **andermans** kattenclips is precies wat je kanaal in de problemen brengt: auteursrechten, en het YouTube-beleid rond hergebruikte inhoud. Dramecs doet het op grote schaal, maar dat maakt het niet slim om te kopiëren — jij hebt een eigen kat, en dat is je voorsprong.

**Wel mag:**
- je eigen clips (ook de ruwe bestanden van je telefoon — beter dan de al geüploade Shorts)
- clips van volgers **met expliciete toestemming** (zie §7)
- muziek uit de YouTube Audio Library

**Niet:** downloaden en hermonteren van andermans video's, ook niet met een bronvermelding.

---

## 1. Wat je nodig hebt

- **ffmpeg** (niet inbegrepen):
  - macOS: `brew install ffmpeg`
  - Windows: `winget install Gyan.FFmpeg`
  - Linux: `sudo apt install ffmpeg`
- Python 3.9+ (het script gebruikt alleen de standaardbibliotheek)

## 1b. Het storyboard renderen (zonder clips)

Heb je nog geen beeldmateriaal, dan kun je de aflevering al wél zien — als bewegend
storyboard op basis van de foto van Stella:

```bash
cd docs/stella-on-tour/compilatie

python3 maak_storyboard.py --dry-run            # enkel tonen wat er zou gebeuren
python3 maak_storyboard.py --limit 3            # eerste 3 segmenten, snel testen
python3 maak_storyboard.py                      # volledig, 16:9  → storyboard-daily-dose-01-16x9.mp4
python3 maak_storyboard.py --formaat 9:16       # volledig, 9:16  → storyboard-daily-dose-01-9x16.mp4
python3 maak_storyboard.py --taal nl            # Nederlandse ondertitels i.p.v. Engels
```

Opties: `--limit N` (alleen de eerste N segmenten), `--formaat 16:9|9:16`, `--taal en|nl`,
`--uitvoer bestandsnaam.mp4`.

**Hoe het werkt:** elk segment wordt apart gerenderd (`zoompan` op een uitsnede van de
foto + ingebrande ondertitel) naar `.tmp-storyboard/`, daarna aan elkaar geplakt met de
`concat`-demuxer. Dat is bewust: één grote `filter_complex` met twaalf `zoompan`-inputs
loopt stuk (exit 234, "Invalid argument"), per scène renderen niet. Een volledige render
duurt ongeveer drie minuten per formaat.

Het storyboard is **stil**. Wil je het toch als video gebruiken: zet er in Studio een
nummer uit de YouTube Audio Library onder.

## 2. Clips klaarzetten

Maak een map `clips/` naast dit bestand en zet je bestanden erin met de namen uit `segments.json`:

```
clips/01-deur.mp4
clips/02-harnas.mp4
clips/03-eerste-straat.mp4
clips/04-zebrapad.mp4
clips/05-kroeg.mp4
clips/06-vrienden.mp4
clips/07-honden.mp4
clips/08-regen.mp4
clips/09-bakkerij.mp4
clips/10-limiet.mp4
clips/11-bankje.mp4
clips/12-slaap.mp4
clips/13-zee.mp4
```

Andere namen mogen ook — pas dan `bestand` aan in `segments.json`.

**Per clip stel je in:**

| Veld | Betekenis |
|---|---|
| `start` | seconde waarop het fragment begint |
| `duur` | lengte in seconden (5–10 is ideaal) |
| `caption_en` / `caption_nl` | de ondertitel in beeld |

## 3. Bouwen

```bash
cd docs/stella-on-tour/compilatie

python3 maak_compilatie.py --dry-run      # toont het ffmpeg-commando, maakt niets
python3 maak_compilatie.py --limit 3      # test met de eerste 3 clips (snel)
python3 maak_compilatie.py                # de volledige compilatie
```

Je krijgt `ginger-cat-daily-dose-01.mp4` en `ginger-cat-daily-dose-01.srt`.

> **Test altijd eerst met `--limit 3`.** Zo zie je of je lettertype, ondertitels en formaat kloppen voor je vijf minuten renderen.

## 4. Formaat: liggend of staand

In `segments.json`:

```json
"formaat": "16:9"   →  1920 × 1080 (long-form)
"formaat": "9:16"   →  1080 × 1920 (Shorts)
```

De juiste kaarten worden automatisch gekozen. Voor de Shorts-versie zet je ook `"uitvoer": "ginger-cat-daily-dose-01-short.mp4"`.

## 5. Muziek

Zet een bestand in deze map (bijvoorbeeld `muziek.mp3`, uit de YouTube Audio Library) en vul in:

```json
"muziek": "muziek.mp3"
```

Het script zet de muziek op 25 % volume en fadet de laatste 2 seconden uit. Zonder muziek is de video stil — dat mag, en voor een eerste test is het zelfs beter.

## 6. Eigen stem eronder (aanbevolen)

Een compilatie zonder stem is een playlist; met een stem wordt het een aflevering. Neem 30–45 seconden commentaar op (wat je ziet, waarom het grappig is) en mix het:

```bash
ffmpeg -i ginger-cat-daily-dose-01.mp4 -i stem.m4a \
  -filter_complex "[0:a]volume=1.0[a0];[1:a]volume=1.4[a1];[a0][a1]amix=inputs=2:duration=longest" \
  -c:v copy -c:a aac -b:a 192k ginger-cat-daily-dose-01-stem.mp4
```

(Is je video nog stil, voeg dan eerst een stille audiolaag toe met `-f lavfi -i anullsrc`.)

## 7. "Ginger cats" breder maken — met toestemming

Wil je echt meerdere ginger cats in één compilatie, dan is de enige veilige route **inzendingen van volgers**. Gebruik deze tekst:

```
Hi! Ik maak een compilatie met ginger cats op mijn kanaal (@StellaonTour).
Mag ik jouw clip gebruiken? Ik vermeld je naam/handle in de video en in de
beschrijving, en je kan altijd vragen om hem te verwijderen.
Stuur gerust de originele file (geen download van TikTok/Reels).
```

Zet per inzending een `clips/<naam>-bron.txt` met: handle, datum toestemming, link naar het bericht. Zo kun je altijd aantonen dat je toestemming had.

## 8. Uploaden

1. **Bestand:** `ginger-cat-daily-dose-01.mp4`
2. **Titel + beschrijving + hoofdstukken:** zie [12-compilatie-ginger-cats.md](../12-compilatie-ginger-cats.md)
3. **Thumbnail:** `kaarten/thumbnail-ginger-cat-daily-dose.png`
4. **Ondertitels:** Studio → *Ondertitels* → *Toevoegen* → *Uploaden* → `ginger-cat-daily-dose-01.srt`
5. **Instellingen:** categorie Dieren, taal Nederlands, niet voor kinderen, comments aan
6. **Playlist:** *Kat op stap in België*

## 9. Als er iets misloopt

| Melding | Oorzaak | Oplossing |
|---|---|---|
| `ffmpeg: command not found` | niet geïnstalleerd | zie §1 |
| `No such filter: drawtext` | ffmpeg zonder libfreetype | herinstalleer via Homebrew/winget (die versies hebben het) |
| `Geef 'duur' op voor …` | ffprobe ontbreekt en er staat geen `duur` in de json | `duur` invullen |
| Video is zwart of heeft balken | verkeerde verhouding | kies `16:9` of `9:16`, niet iets ertussenin |
| Ondertitels vallen buiten beeld | te lange tekst | max. 2 regels, ~40 tekens per regel |
| `Error while filtering: Invalid argument` (exit 234) | te veel `zoompan`-inputs in één filtergraph | laat het script per scène renderen (zoals `maak_storyboard.py`), of verlaag `--limit` |
| `Stray %` of tekst valt weg bij `drawtext` | `%` of `'` in de ondertitel | gebruik `expansion=none` (staat al in de scripts) |
| Ondertitel raakt de rand of zit onder de Shorts-knoppen | te lange tekst / te laag geplaatst | het script verkleint de letters automatisch en houdt 30 % onderaan vrij in 9:16 |
| Render duurt lang | 4K-bronmateriaal | eerst verkleinen: `ffmpeg -i in.mp4 -vf scale=1920:-2 -c:v libx264 -crf 20 klein.mp4` |
