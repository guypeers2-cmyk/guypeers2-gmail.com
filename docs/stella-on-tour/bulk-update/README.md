# 🔄 Alles in één keer aanpassen — bulk-update van je kanaal

**Kort antwoord op de vraag:** YouTube Studio heeft **geen importbestand** dat je kan uploaden om video's aan te passen. De bulkeditor van Studio kan alleen tekst aan het *begin* of het *einde* van alle beschrijvingen plakken, of alle beschrijvingen door dezelfde tekst vervangen. Unieke titels, beschrijvingen, tags en playlists per video: dat kan alleen via de **YouTube API**.

Daarom staat hier een klein script dat precies dat doet — één keer opzetten (15 minuten), daarna pas je 15 video's aan met één commando.

> **Wil je liever niets installeren?** Dan is [09-video-instellingen.md](../09-video-instellingen.md) je route: dezelfde teksten, maar met de hand in Studio (ongeveer 35 minuten).

---

## Wat het script doet

| Veld in `videos.json` | Wat er op YouTube gebeurt | API-kosten |
|---|---|---|
| `title` | titel vervangen | 50 |
| `description` | beschrijving vervangen (regels worden samengevoegd) | 50 (zelfde call) |
| `tags` | tags vervangen | 50 (zelfde call) |
| `privacy` | zichtbaarheid (bv. de 5 nutteloze clips → `private`) | 50 (zelfde call) |
| `playlist` | video toevoegen aan playlist (playlist wordt aangemaakt als ze niet bestaat) | 50 |
| `thumbnail` | thumbnail uploaden (optioneel, voor de long-forms) | 50 |

Daglimiet: **10.000 units**. Deze 15 video's kosten samen ongeveer **1.600 units** — ruim binnen de limiet. De teller reset om middernacht Pacific Time.

**Wat het script niet doet:** eindschermen, kaarten, community-posts, reacties en ondertitels. Die stel je in Studio in (of via aparte API-calls; ondertitels kosten 400 units per video).

---

## Eenmalige opzet (15 minuten)

### 1. Google Cloud-project

1. Ga naar [console.cloud.google.com](https://console.cloud.google.com) en log in met **het Google-account van het kanaal**.
2. Maak een nieuw project: **Stella on Tour**.
3. **API's en services → Bibliotheek** → zoek **YouTube Data API v3** → **Inschakelen**.

### 2. OAuth-client

1. **API's en services → OAuth-toestemmingsscherm** (Consent screen):
   - user type: **Extern**
   - app-naam: `Stella on Tour bulk update`
   - **Testgebruikers**: voeg je eigen Gmail-adres toe. **Zonder dit krijg je `access_denied`.**
2. **API's en services → Inloggegevens → Inloggegevens maken → OAuth-client-ID**
   - toepassingstype: **Desktopapp**
3. Download de JSON en hernoem het bestand naar **`client_secret.json`** in deze map.

### 3. Script klaarzetten

```bash
cd docs/stella-on-tour/bulk-update
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

### 4. Je eigen gegevens invullen

Open `videos.json` en vul bovenaan in:

```json
"placeholders": {
  "INSTAGRAM_URL": "https://instagram.com/jouwhandle",
  "LONG1_URL": "",
  "LONG2_URL": ""
}
```

- **`INSTAGRAM_URL` is verplicht** — zonder waarde stopt het script met een foutmelding.
- `LONG1_URL` en `LONG2_URL` mogen leeg blijven: de regel met die link verdwijnt dan uit de beschrijving tot je long-form online staat.

---

## Uitvoeren

```bash
# 1. controleren (raakt niets aan, heeft geen API nodig)
.venv/bin/python update_videos.py --validate

# 2. kijken wat er zou veranderen (nog steeds niets schrijven)
.venv/bin/python update_videos.py --dry-run

# 3. echt uitvoeren
.venv/bin/python update_videos.py
```

De eerste keer opent een browser: log in, kies je kanaal, en keur de toegang goed (Google toont "app niet geverifieerd" → **Geavanceerd → Doorgaan**). Daarna staat het token in `token.json` en hoef je niet meer in te loggen.

Bij de eerste echte run maakt het script automatisch een **back-up** van alle huidige titels, beschrijvingen, tags en zichtbaarheid: `backup-20261110-120000.json`.

### Terugdraaien

```bash
.venv/bin/python update_videos.py --restore backup-20261110-120000.json
```

### Eén video opnieuw doen

```bash
.venv/bin/python update_videos.py --only _dRI6LEy8_E
```

---

## Wat je in de uitvoer ziet

```
config: 15 video's · 5 playlists · max. 91 tekens tags
back-up van de huidige metadata: backup-20261110-120312.json

_dRI6LEy8_E — Mijn kat kiest de warmste plek: de kroeg
    · titel: 'High and Dry … best place even in the pub 🤣' → 'Mijn kat kiest de warmste plek: de kroeg'
    · beschrijving: gewijzigd
    · tags: 0 → 6
    · toegevoegd aan playlist 'Kat op stap in België'
...
12 video('s) bijgewerkt.
```

---

## Veiligheid (lees dit)

- **`token.json` geeft volledige schrijftoegang tot je kanaal.** Deel het nooit, plak het nooit in een chat, commit het nooit. Het staat in `.gitignore`.
- **`client_secret.json`** is je app-sleutel. Zelfde regel.
- Toegang intrekken kan altijd via [myaccount.google.com/permissions](https://myaccount.google.com/permissions) — het script werkt daarna niet meer tot je opnieuw inlogt.
- Het script werkt alleen op **jouw eigen kanaal** (het kanaal van het account dat inlogt). Het kan niets aan een ander kanaal veranderen.
- Eerst `--dry-run`. Altijd. Ook als je haast hebt.

---

## Als er iets fout gaat

| Melding | Oorzaak | Oplossing |
|---|---|---|
| `access_denied` | je Gmail staat niet bij de testgebruikers | toevoegen bij OAuth-toestemmingsscherm |
| `redirect_uri_mismatch` | verkeerd clienttype | client verwijderen, nieuwe maken als **Desktopapp** |
| `quotaExceeded` | 10.000 units op | wachten tot middernacht Pacific Time, of quotum verhogen (aanvraag) |
| `invalid_grant` | token verlopen/ingetrokken | `token.json` verwijderen en opnieuw inloggen |
| `403 forbidden` | verkeerd kanaal gekozen bij inloggen | `token.json` verwijderen, opnieuw inloggen en het juiste kanaal kiezen |
| `The request metadata specifies an invalid video thumbnail` | thumbnail > 2 MB of verkeerde verhouding | 1280 × 720, PNG/JPG < 2 MB |

---

## Waarom geen derde partij?

Tools als TubeBuddy of VidIQ kunnen ook bulkedits doen, maar ze vragen volledige toegang tot je kanaal via hun eigen servers. Voor één keer 15 video's aanpassen is dat meer risico dan winst. Deze 120 regels Python doen hetzelfde, lokaal, en je kunt ze lezen.
