# 🏛️ De Universele Gids

**Autonoom multi-agent ecosysteem — werkend prototype op `guypeers2-gmail.com`.**

Dit repository bevat de volledige uitvoering van het master-systeemontwerp van de
Opperwachter (de Baas): achttien gespecialiseerde agenten, één Hoofdrouter, een strikt
zwijg-protocol en het autonome Ja/Nee-leveringsprotocol — geïmplementeerd als een
deterministische, testbare en volledig transparante Python-kern met een webconsole eromheen.

> **Geen dependencies.** De hele gids draait op de Python-standaardbibliotheek (3.9+).
> Ook de arcade (`/pacman/`) heeft er geen: canvas, WebAudio en de Node-standaardtests.

---

## De drie hoofdwetten (geïmplementeerd én bewezen)

| # | Wet | Implementatie | Bewijs |
|---|-----|---------------|--------|
| 1 | **Slechts één agent voert het woord** | `gids/router.py` kiest per invoer exact één specialist; alle 17 andere zwijgen | `tests/test_router.py::TestZwijgProtocol` |
| 2 | **De Router beslist en trekt zich terug** | Agent 3 rangschikt en spreekt zelf nooit in de chat (net als agent 1 en 16) | `test_achtergrondagenten_zwijgen_altijd` |
| 3 | **Elke levering sluit af met het Ja/Nee-protocol** | De afsluiting wordt centraal door de router toegevoegd — niemand kan hem vergeten | `test_elke_output_sluit_af_met_ja_nee` |

---

## Snel starten

```bash
# Webconsole (aanbevolen)
python3 serve.py                 # → http://localhost:8080

# Interactieve terminal-sessie
python3 cli.py

# Alle 18 knelpuntscenario's achter elkaar
python3 cli.py --demo

# Testbatterij (58 Python-tests + 39 JS-tests)
python3 -m unittest discover -s tests -v

# Alleen de arcade-tests (spelkern, console, editor, keuring)
node --test tests/pacman_*.test.mjs
```

De arcade hangt onder dezelfde server: **http://localhost:8080/pacman/**

---

## Architectuur

```
                        ┌──────────────────────────────┐
   👑 De Baas ─────────▶│  WEBCONSOLE / CLI (presentatie) │
                        └──────────────┬───────────────┘
                                       │ POST /api/bericht
                        ┌──────────────▼───────────────┐
                        │   GIDS-PACKAGE (Python-kern)  │
                        │                               │
                        │  ❶ PRIVACY-SCAN (harde trigger)│──▶ Agent 13 grijpt direct in
                        │  ❷ JA/NEE-STATE-ORCHESTRATIE  │──▶ 'ja' → Agent 12 · 'nee…' → revisie
                        │  ❸ SIGNAALSCORING (15 agenten) │──▶ gewogen regex-signalen
                        │  ❹ TYPO-DETECTIE               │──▶ Agent 9 herstelt tikfouten
                        │  ❺ UITVAL (fallback)           │──▶ Agent 14 vangt alles op
                        │  ❻ LEVERING: exact ÉÉN stem    │──▶ + Ja/Nee-afsluiting
                        │                               │
                        │  Toezicht op de achtergrond:   │
                        │  🛡️ Agent 1 · 🧭 Agent 3 · 📈 Agent 16 │
                        └──────────────────────────────┘
```

### Het routeringsprotocol (vaste volgorde, geen uitzonderingen)

1. **Privacy-scan** — gevoelige gegevens (BSN, IBAN, kaartnummers, wachtwoorden)
   zijn een *harde trigger*: de Privacy-agent grijpt vóór alles in en maskeert.
2. **Goedkeuringsstatus** — staat er een levering open? Dan activeert `ja` de
   Proactieve Conversatie-Ontwerper (volgende stap) en start `nee, …` een revisie
   bij dezelfde specialist. Een nieuwe domeinvraag routeert gewoon normaal.
3. **Signaalscoring** — elke sprekende agent scoort op gewogen signaalpatronen
   uit het register, aangevuld met contextheuristieken (korte luide uitroep →
   Timmy; meerdere frustratiesignalen → HITL; …).
4. **Typo-detectie** — bij laag domeinsignaal herstelt de Typo-Fixer korte
   tikfouten via Levenshtein-afstand ("instelingen" → "instellingen").
5. **Uitval** — geen enkel signaal? Dan vangt de Systeem-Guard op: de gebruiker
   ziet nooit een kale foutmelding.
6. **Levering** — de hoogst scorende specialist spreekt; alle anderen zwijgen
   strikt; elke output eindigt met *"Is dit goed? (Ja / Nee of feedback)"*.

---

## Het agentenregister

Bron: `gids/registry.py` — `AGENTS_REGISTRY` is het register van de Baas, 1-op-1
overgenomen. `AGENT_UITBREIDING` voegt de uitvoeringslaag toe (signalen, gewichten,
heuristieken, presentatie).

| # | Agent | Categorie | Spreekt? | Domein |
|---|-------|-----------|----------|--------|
| 1 | Hoofdsupervisor & Eindinspecteur | Bestuur | nooit | kwaliteitswachter achter de schermen |
| 2 | Opstartdeskundige & Marktonderzoeker | Business | ✅ | markt, app-trends, GTM |
| 3 | Hoofdrouter & State-Orchestrator | Bestuur | nooit | kiest en trekt zich terug |
| 4 | Dataspecialist | Business | ✅ | RAG, databases, feiten |
| 5 | Agent Timmy | Frontlijn | ✅ | ongeduld, jeugd, korte uitroepen |
| 6 | Agent Marit | Frontlijn | ✅ | tijdgebrek, shortcuts |
| 7 | Agent Opa Foutje-Bedankt | Frontlijn | ✅ | geruststelling, faalangst |
| 8 | De Jargon-Buster | Frontlijn | ✅ | technisch → mensentaal |
| 9 | Typo-Fixer & Context-Hersteller | Frontlijn | ✅ | tikfouten herstellen |
| 10 | Navigatie- & Pad-Expert | Frontlijn | ✅ | "waar vind ik…" |
| 11 | Toegankelijkheids- & Contrast-Specialist | Frontlijn | ✅ | leesgemak (schakelt zelf de weergave om!) |
| 12 | Proactieve Conversatie-Ontwerper | Frontlijn | ✅ | volgende logische stap na 'ja' |
| 13 | Privacy- & Compliance-Agent | Veiligheid | ✅ | harde trigger, maskeert gegevens |
| 14 | Systeem-Guard & Fallback | Veiligheid | ✅ | vangt storingen én alles onbekende op |
| 15 | HITL-Escalatie | Veiligheid | ✅ | overdracht naar mens (met ticket) |
| 16 | Kwaliteits- & Feedback-Agent | Veiligheid | nooit | continue optimalisatie |
| 17 | Financieel Specialist | Business | ✅ | kosten, prijzen, marges |
| 18 | Marketing Specialist | Business | ✅ | waardepropositie, conversie |

---

## Bestandsstructuur

```
gids/
├── registry.py     # AGENTS_REGISTRY (de Baas) + uitvoeringslaag
├── router.py       # De Hoofdrouter: het 6-stappenprotocol
├── templates.py    # De 15 stemmen + revisie/bevestigingsmodi
├── analyse.py      # onderwerp-extractie + jargonwoordenboek
├── privacy.py      # harde trigger + maskering
├── typo.py         # Levenshtein-herstel
├── kwaliteit.py    # Agent 16: privacyveilige leerlog + statistieken
└── state.py        # Ja/Nee-goedkeuringsstatus (serialiseerbaar)
web/                # console: index.html + styles.css + app.js
web/pacman/         # de arcade: maze.js · validatie.js · engine.js · app.js
                    #            + editor.html + editor.js + pacman.css
serve.py            # stdlib webserver (statisch + JSON-API + /pacman/)
cli.py              # interactieve terminal + --demo
tests/              # 58 Python-tests + 39 JS-tests (node --test)
data/               # runtime: kwaliteitslog (niet in git)
```

---

## 🕹️ Pac-Man — de Gids Arcade

Onder `web/pacman/` staat een volledige herbouw van de klassieke arcade:
28 × 31 doolhof, vier spoken met eigen jachtgedrag, energizers, kers, levels,
levens, highscore, geluid en een doolhof-editor. **Nul dependencies** — het draait
op canvas en de WebAudio-API, en de spellogica is pure JavaScript zonder DOM.

```
/pacman/          de kast: spelen
/pacman/editor.html   zelf een level tekenen
```

### De spelkern (bewust DOM-vrij)

| Bestand | Rol |
|---------|-----|
| `maze.js` | de klassieke indeling als tekst: één teken per tegel (één bron van waarheid) |
| `engine.js` | beweging, spoken-AI, energizers, levels, tekenen — geen DOM, geen `window` |
| `validatie.js` | keurt een doolhof: vorm, hokdeur, bereikbaarheid, spoken buiten |
| `app.js` | alleen presentatie: toetsen, vegen, geluid, scorebord, overlays |
| `editor.js` | tekenen met de muis, symmetrie, keuring, opslaan als JSON |

Beweging gaat **tegel tot tegel** (`van → naar`, voortgang `t`), niet met vrije
snelheidsvectoren. Daardoor blijven muren hard, worden bochten nooit afgesneden en
is de simulatie frame-rate-onafhankelijk — en dus deterministisch testbaar.

### De vier spoken

| Spook | Doel dat het nastreeft |
|-------|------------------------|
| 🔴 Blinky | Pac-Man zelf |
| 🩷 Pinky | vier tegels vóór Pac-Man |
| 🩵 Inky | de verdubbeling van Blinky's positie ten opzichte van twee tegels vóór Pac-Man |
| 🟠 Clyde | Pac-Man, maar vlucht naar zijn eigen hoek zodra hij binnen acht tegels komt |

Met een energizer vluchten ze (het verst verwijderde hoekpunt), en wie gegeten wordt
keert als **ogen** terug naar het hok om er even later weer uit te komen.

### Het doolhof-editor

De editor tekent met de muis of een vinger, spiegelt optioneel links/rechts en keurt
elke wijziging meteen. Opslaan zet het level in `localStorage` en opent
`index.html?doolhof=eigen`; de console keurt dat level bij het laden opnieuw en valt
bij fouten terug op het klassieke doolhof. Exporteren kan als JSON:

```json
{ "rijen": ["############################", "… 31 rijen van 28 tekens …"] }
```

De keuring weigert een level als de hokdeur ontbreekt, er een muur of punt in het hok
staat, Pac-Man op een muur start, een punt onbereikbaar is of de spoken het hok niet
uit kunnen. Waarschuwingen (weinig punten, geen energizers) blokkeren niet.

### Testen zonder browser

De JS-tests draaien met `node --test`: de spelkern headless, en `tests/dom-harnas.mjs`
bootst genoeg DOM na om `app.js` en `editor.js` écht uit te voeren — toetsen, klikken,
vegen, canvas, `localStorage`. Zo is de presentatielaag geen blinde vlek:

```
tests/pacman_engine.test.mjs     17 tests   muren, hok, energizers, levels, determinisme
tests/pacman_validatie.test.mjs   9 tests   keuring van een doolhof
tests/pacman_console.test.mjs     6 tests   app.js: HUD, overlays, invoer, highscore
tests/pacman_editor.test.mjs      7 tests   editor.js: schilderen, opslaan, JSON
tests/test_pacman.py             20 tests   doolhof, bestanden, webserver, JS-suite
```

---

## De LLM-laag inpluggen

De stemmen in `gids/templates.py` zijn nu regelgebaseerde prototype-persona's: voorspelbaar,
gratis en volledig offline testbaar. Voor productie vervang je elke stemfunctie door een
LLM-aanroep **zonder de governance aan te raken**:

```python
# gids/templates.py — voorbeeld
def opstart(ctx):
    return llm_aanroep(
        systeem=f"Jij bent {AGENTS_REGISTRY['agent_2_opstart']['name']}. {rolbeschrijving}. "
                "Werk autonoom uit en eindig nooit met een open vraag.",
        gebruiker=ctx["tekst"],
    )
```

De router, het zwijg-protocol, de privacy-harde-trigger en het Ja/Nee-protocol blijven
exact zoals ze zijn — dát is juist de kracht van deze scheiding: **governance is code,
persona's zijn inwisselbaar.**

---

## Status

- [x] Agentenregister (18 agenten, register van de Baas als bron)
- [x] Hoofdrouter met zwijg-protocol en transparant router-log
- [x] Ja/Nee-goedkeuringsprotocol met revisie-cyclus
- [x] Privacy-harde-trigger met maskering
- [x] Webconsole + CLI + 37 tests (alle groen)
- [x] Kwaliteits- & Feedback-Agent: privacyveilige leerlog + statistiekdashboard + `/api/statistieken` (v1.1)
- [x] Sessiepersistentie: gesprek overleeft een pagina-verversing (localStorage + sessie-id)
- [x] Pac-Man-arcade: volledige spelkern, vier spoken, levels, geluid, doolhof-editor
- [x] Testharnas zonder browser: `app.js` en `editor.js` worden echt uitgevoerd in Node
- [ ] LLM-laag voor persona's (plug-in-punt klaar)
- [ ] Automatische optimalisatie van signaalgewichten op basis van de leerlog

---

*De Universele Gids — v1.1.0 · "Eén agent spreekt, zeventien zwijgen, de Baas beslist."*
