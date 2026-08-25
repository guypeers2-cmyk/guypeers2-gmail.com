# 🏛️ De Universele Gids

**Autonoom multi-agent ecosysteem — werkend prototype op `guypeers2-gmail.com`.**

Dit repository bevat de volledige uitvoering van het master-systeemontwerp van de
Opperwachter (de Baas): achttien gespecialiseerde agenten, één Hoofdrouter, een strikt
zwijg-protocol en het autonome Ja/Nee-leveringsprotocol — geïmplementeerd als een
deterministische, testbare en volledig transparante Python-kern met een webconsole eromheen.

> **Geen dependencies.** De hele gids draait op de Python-standaardbibliotheek (3.9+).

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

# Testbatterij (30 tests)
python3 -m unittest discover -s tests -v
```

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
serve.py            # stdlib webserver (statisch + JSON-API + /api/statistieken)
cli.py              # interactieve terminal + --demo
tests/              # 37 tests: zwijg-protocol, routing, Ja/Nee, leerlog
data/               # runtime: kwaliteitslog (niet in git)
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
- [ ] LLM-laag voor persona's (plug-in-punt klaar)
- [ ] Automatische optimalisatie van signaalgewichten op basis van de leerlog

---

*De Universele Gids — v1.1.0 · "Eén agent spreekt, zeventien zwijgen, de Baas beslist."*
