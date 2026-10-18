# -*- coding: utf-8 -*-
"""Prijsboek (tarieven) van de bouwprijscalculator.

Het prijsboek bestaat uit twee soorten regels:

  * ``materiaal`` — eenheidsprijs (€ per plaat, per rol, per m² …)
  * ``taak``     — gewerkte uren per m² (het geldbedrag volgt uit het uurtarief)

Elke prijs is per project aanpasbaar: ``Project.tarieven`` bevat sleutel → prijs
en overschrijft de standaard. De sleutels zijn stabiel, dus een project blijft
ook bruikbaar wanneer de standaardtarieven later veranderen.

Verder staan hier de werkpakketten (de "ambachten" die de calculator kan
berekenen) met hun opties. De rekenlogica per werkpakket staat in
``bouw.bereken`` — dit bestand blijft pure data.
"""

from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# Standaardtarieven (marktreferentie België, aanpasbaar per project)
# ---------------------------------------------------------------------------

TARIEVEN: Dict[str, Dict[str, Any]] = {
    # ---- Gipsplaten -------------------------------------------------------
    "plaat_gyproc_12_5": {
        "naam": "Gyproc gipsplaat 12,5 mm · 1200×2600",
        "eenheid": "st", "prijs": 9.50, "soort": "materiaal",
        "per_eenheid": 3.12, "per_eenheid_eenheid": "m2",
    },
    "plaat_gyproc_15": {
        "naam": "Gyproc gipsplaat 15 mm · 1200×2600",
        "eenheid": "st", "prijs": 12.00, "soort": "materiaal",
        "per_eenheid": 3.12, "per_eenheid_eenheid": "m2",
    },
    "plaat_ggl_30": {
        "naam": "Gyproc GGL 30 mm (geïsoleerd) · 1200×2400",
        "eenheid": "st", "prijs": 24.00, "soort": "materiaal",
        "per_eenheid": 2.88, "per_eenheid_eenheid": "m2",
    },
    # ---- Profielen & hangars ---------------------------------------------
    "profiel_c75": {
        "naam": "C-profiel 75 mm · 3 m",
        "eenheid": "st", "prijs": 3.60, "soort": "materiaal",
        "per_eenheid": 3.0, "per_eenheid_eenheid": "m",
    },
    "profiel_c100": {
        "naam": "C-profiel 100 mm · 3 m",
        "eenheid": "st", "prijs": 4.80, "soort": "materiaal",
        "per_eenheid": 3.0, "per_eenheid_eenheid": "m",
    },
    "profiel_u25": {
        "naam": "U-profiel 25 mm (vloerprofiel) · 3 m",
        "eenheid": "st", "prijs": 1.90, "soort": "materiaal",
        "per_eenheid": 3.0, "per_eenheid_eenheid": "m",
    },
    "profiel_vlakband": {
        "naam": "Vlakke band 27 mm · 3 m",
        "eenheid": "st", "prijs": 2.20, "soort": "materiaal",
        "per_eenheid": 3.0, "per_eenheid_eenheid": "m",
    },
    "hanghaak": {
        "naam": "Veerhanger / plafondhanger",
        "eenheid": "st", "prijs": 1.40, "soort": "materiaal",
    },
    # ---- Bevestiging & afwerking -----------------------------------------
    "schroef": {
        "naam": "Gyproc schroef 3,5×25 mm · doos 1000",
        "eenheid": "doos", "prijs": 11.00, "soort": "materiaal",
        "per_eenheid": 1000, "per_eenheid_eenheid": "st",
    },
    "tape": {
        "naam": "Voegband · rol 50 m",
        "eenheid": "rol", "prijs": 8.50, "soort": "materiaal",
        "per_eenheid": 50.0, "per_eenheid_eenheid": "m",
    },
    "compound": {
        "naam": "Voegmiddel (Ready-mix) · emmer 25 kg",
        "eenheid": "emmer", "prijs": 26.00, "soort": "materiaal",
        "per_eenheid": 25.0, "per_eenheid_eenheid": "kg",
    },
    "lijm": {
        "naam": "Gipslijm · zak 25 kg",
        "eenheid": "zak", "prijs": 18.00, "soort": "materiaal",
        "per_eenheid": 25.0, "per_eenheid_eenheid": "kg",
    },
    # ---- Isolatie ---------------------------------------------------------
    "isolatie_wol": {
        "naam": "Mineralen wol 75 mm",
        "eenheid": "m2", "prijs": 12.50, "soort": "materiaal",
    },
    "isolatie_pir": {
        "naam": "PIR-isolatieplaat 60 mm",
        "eenheid": "m2", "prijs": 21.00, "soort": "materiaal",
    },
    # ---- Schilderen -------------------------------------------------------
    "primer": {
        "naam": "Primer voor gipsplaten · 10 L",
        "eenheid": "emmer", "prijs": 42.00, "soort": "materiaal",
        "per_eenheid": 120.0, "per_eenheid_eenheid": "m2",
    },
    "verf": {
        "naam": "Muurverf · 10 L",
        "eenheid": "emmer", "prijs": 55.00, "soort": "materiaal",
        "per_eenheid": 120.0, "per_eenheid_eenheid": "m2",
    },
    # ---- Uren (taak) ------------------------------------------------------
    "uur_wand_opmeten": {
        "naam": "Wand: opmeten en uitsetten", "eenheid": "uur/m2",
        "prijs": 0.05, "soort": "taak",
    },
    "uur_wand_profielen": {
        "naam": "Wand: profielen plaatsen", "eenheid": "uur/m2",
        "prijs": 0.30, "soort": "taak",
    },
    "uur_wand_isolatie": {
        "naam": "Wand: isolatie plaatsen", "eenheid": "uur/m2",
        "prijs": 0.10, "soort": "taak",
    },
    "uur_wand_platen": {
        "naam": "Wand: platen bevestigen", "eenheid": "uur/m2",
        "prijs": 0.22, "soort": "taak",
    },
    "uur_wand_voegen": {
        "naam": "Wand: voegen en afwerken", "eenheid": "uur/m2",
        "prijs": 0.30, "soort": "taak",
    },
    "uur_plafond_ophangen": {
        "naam": "Plafond: profielen ophangen", "eenheid": "uur/m2",
        "prijs": 0.35, "soort": "taak",
    },
    "uur_plafond_isolatie": {
        "naam": "Plafond: isolatie plaatsen", "eenheid": "uur/m2",
        "prijs": 0.08, "soort": "taak",
    },
    "uur_plafond_platen": {
        "naam": "Plafond: platen bevestigen", "eenheid": "uur/m2",
        "prijs": 0.25, "soort": "taak",
    },
    "uur_plafond_voegen": {
        "naam": "Plafond: voegen en afwerken", "eenheid": "uur/m2",
        "prijs": 0.30, "soort": "taak",
    },
    "uur_direct_platen": {
        "naam": "Direct: platen verlijmen", "eenheid": "uur/m2",
        "prijs": 0.30, "soort": "taak",
    },
    "uur_direct_voegen": {
        "naam": "Direct: voegen en afwerken", "eenheid": "uur/m2",
        "prijs": 0.30, "soort": "taak",
    },
    "uur_voegafwerking": {
        "naam": "Alleen voegen en afwerken", "eenheid": "uur/m2",
        "prijs": 0.45, "soort": "taak",
    },
    "uur_schilderen": {
        "naam": "Schilderen: primer + 2 lagen", "eenheid": "uur/m2",
        "prijs": 0.35, "soort": "taak",
    },
}

# ---------------------------------------------------------------------------
# Werkpakketten (de ambachten die de calculator kan doorrekenen)
# ---------------------------------------------------------------------------

PAKKETTEN: List[Dict[str, Any]] = [
    {
        "id": "gyproc_wand_profiel",
        "naam": "Gyproc wand op metaalprofiel",
        "categorie": "Gyproc wanden",
        "eenheid": "m2",
        "beschrijving": "C-profiel, optioneel isolatie, gipsplaten, voegafwerking.",
        "opties": [
            {"id": "zijden", "label": "Beplanking", "keuzes": ["1 zijde", "2 zijden"], "standaard": "1 zijde"},
            {"id": "plaat", "label": "Gipsplaat", "keuzes": ["12,5 mm", "15 mm", "GGL 30 mm"], "standaard": "12,5 mm"},
            {"id": "profiel", "label": "Profiel", "keuzes": ["C75", "C100"], "standaard": "C75"},
            {"id": "isolatie", "label": "Isolatie", "keuzes": ["geen", "mineralen wol 75 mm", "PIR 60 mm"], "standaard": "geen"},
        ],
    },
    {
        "id": "gyproc_plafond",
        "naam": "Gyproc plafond op profielen",
        "categorie": "Gyproc plafonds",
        "eenheid": "m2",
        "beschrijving": "Ophangen profielen met veerhangers, isolatie, gipsplaten, voegafwerking.",
        "opties": [
            {"id": "plaat", "label": "Gipsplaat", "keuzes": ["12,5 mm", "15 mm"], "standaard": "12,5 mm"},
            {"id": "profiel", "label": "Profiel", "keuzes": ["C75", "C100"], "standaard": "C75"},
            {"id": "isolatie", "label": "Isolatie", "keuzes": ["geen", "mineralen wol 75 mm"], "standaard": "geen"},
        ],
    },
    {
        "id": "gyproc_direct",
        "naam": "Gyproc direct op metswerk (verlijmd)",
        "categorie": "Gyproc wanden",
        "eenheid": "m2",
        "beschrijving": "Gipsplaten met gipslijm op bestaand metswerk, voegafwerking.",
        "opties": [
            {"id": "plaat", "label": "Gipsplaat", "keuzes": ["GGL 30 mm", "12,5 mm"], "standaard": "GGL 30 mm"},
        ],
    },
    {
        "id": "gyproc_voegafwerking",
        "naam": "Alleen voegen & afwerken Gyproc",
        "categorie": "Gyproc afwerking",
        "eenheid": "m2",
        "beschrijving": "Voegband, voegmiddel en schuren op bestaande gipsplaten.",
        "opties": [],
    },
    {
        "id": "schilderen_gyproc",
        "naam": "Schilderen op gipsplaat",
        "categorie": "Afwerking",
        "eenheid": "m2",
        "beschrijving": "Primer plus twee lagen muurverf.",
        "opties": [],
    },
]

# Elektriciteit: indicatieve startwaarden, geen actuele marktprijzen.
# Per stuk of lopende meter; aansluitpunten bevatten geen kabel of sleuf.
TARIEVEN.update({'elek_stopcontact': {'naam': 'Elektriciteit: Stopcontact enkel, inbouw · materiaal',
                      'eenheid': 'st',
                      'prijs': 12.5,
                      'soort': 'materiaal'},
 'uur_elek_stopcontact': {'naam': 'Elektriciteit: Stopcontact enkel, inbouw · arbeid',
                          'eenheid': 'uur/st',
                          'prijs': 0.35,
                          'soort': 'taak'},
 'elek_stopcontact_dubbel': {'naam': 'Elektriciteit: Stopcontact dubbel, inbouw · materiaal',
                             'eenheid': 'st',
                             'prijs': 23,
                             'soort': 'materiaal'},
 'uur_elek_stopcontact_dubbel': {'naam': 'Elektriciteit: Stopcontact dubbel, inbouw · arbeid',
                                 'eenheid': 'uur/st',
                                 'prijs': 0.5,
                                 'soort': 'taak'},
 'elek_schakelaar': {'naam': 'Elektriciteit: Schakelaar enkelpolig, inbouw · materiaal',
                     'eenheid': 'st',
                     'prijs': 11,
                     'soort': 'materiaal'},
 'uur_elek_schakelaar': {'naam': 'Elektriciteit: Schakelaar enkelpolig, inbouw · arbeid',
                         'eenheid': 'uur/st',
                         'prijs': 0.3,
                         'soort': 'taak'},
 'elek_lichtpunt': {'naam': 'Elektriciteit: Lichtpunt aansluiten · materiaal',
                    'eenheid': 'st',
                    'prijs': 3.5,
                    'soort': 'materiaal'},
 'uur_elek_lichtpunt': {'naam': 'Elektriciteit: Lichtpunt aansluiten · arbeid',
                        'eenheid': 'uur/st',
                        'prijs': 0.25,
                        'soort': 'taak'},
 'elek_kabel_3g25': {'naam': 'Elektriciteit: Kabel XVB 3G2,5 aanbrengen · materiaal',
                     'eenheid': 'm',
                     'prijs': 1.65,
                     'soort': 'materiaal'},
 'uur_elek_kabel_3g25': {'naam': 'Elektriciteit: Kabel XVB 3G2,5 aanbrengen · arbeid',
                         'eenheid': 'uur/m',
                         'prijs': 0.06,
                         'soort': 'taak'},
 'elek_kabel_3g15': {'naam': 'Elektriciteit: Kabel XVB 3G1,5 aanbrengen · materiaal',
                     'eenheid': 'm',
                     'prijs': 1.2,
                     'soort': 'materiaal'},
 'uur_elek_kabel_3g15': {'naam': 'Elektriciteit: Kabel XVB 3G1,5 aanbrengen · arbeid',
                         'eenheid': 'uur/m',
                         'prijs': 0.06,
                         'soort': 'taak'},
 'uur_elek_sleuf': {'naam': 'Elektriciteit: Sleuf frezen in metselwerk · arbeid',
                    'eenheid': 'uur/m',
                    'prijs': 0.18,
                    'soort': 'taak'},
 'elek_sleuf_dichten': {'naam': 'Elektriciteit: Sleuf dichtzetten · materiaal',
                        'eenheid': 'm',
                        'prijs': 0.85,
                        'soort': 'materiaal'},
 'uur_elek_sleuf_dichten': {'naam': 'Elektriciteit: Sleuf dichtzetten · arbeid',
                            'eenheid': 'uur/m',
                            'prijs': 0.1,
                            'soort': 'taak'}})
PAKKETTEN.extend([{'id': 'elek_stopcontact',
  'naam': 'Stopcontact enkel, inbouw',
  'categorie': 'Elektriciteit',
  'eenheid': 'st',
  'beschrijving': 'Inclusief mechanisme, inbouwdoos en standaard afdekking. Kabel en sleuf apart.',
  'opties': [],
  'recept': {'materiaal': 'elek_stopcontact', 'arbeid': 'uur_elek_stopcontact'}},
 {'id': 'elek_stopcontact_dubbel',
  'naam': 'Stopcontact dubbel, inbouw',
  'categorie': 'Elektriciteit',
  'eenheid': 'st',
  'beschrijving': 'Twee aansluitingen als één dubbel punt, inclusief dozen en afdekking. Kabel en '
                  'sleuf apart.',
  'opties': [],
  'recept': {'materiaal': 'elek_stopcontact_dubbel', 'arbeid': 'uur_elek_stopcontact_dubbel'}},
 {'id': 'elek_schakelaar',
  'naam': 'Schakelaar enkelpolig, inbouw',
  'categorie': 'Elektriciteit',
  'eenheid': 'st',
  'beschrijving': 'Inclusief mechanisme, inbouwdoos en standaard afdekking. Kabel en sleuf apart.',
  'opties': [],
  'recept': {'materiaal': 'elek_schakelaar', 'arbeid': 'uur_elek_schakelaar'}},
 {'id': 'elek_lichtpunt',
  'naam': 'Lichtpunt aansluiten',
  'categorie': 'Elektriciteit',
  'eenheid': 'st',
  'beschrijving': 'Aansluitmateriaal en montage. Zonder armatuur, kabel, schakelaar of sleuf.',
  'opties': [],
  'recept': {'materiaal': 'elek_lichtpunt', 'arbeid': 'uur_elek_lichtpunt'}},
 {'id': 'elek_kabel_3g25',
  'naam': 'Kabel XVB 3G2,5 aanbrengen',
  'categorie': 'Elektriciteit',
  'eenheid': 'm',
  'beschrijving': 'Per lopende meter; zonder sleuf, buis of aansluitpunten.',
  'opties': [],
  'recept': {'materiaal': 'elek_kabel_3g25', 'arbeid': 'uur_elek_kabel_3g25'}},
 {'id': 'elek_kabel_3g15',
  'naam': 'Kabel XVB 3G1,5 aanbrengen',
  'categorie': 'Elektriciteit',
  'eenheid': 'm',
  'beschrijving': 'Per lopende meter; zonder sleuf, buis of aansluitpunten.',
  'opties': [],
  'recept': {'materiaal': 'elek_kabel_3g15', 'arbeid': 'uur_elek_kabel_3g15'}},
 {'id': 'elek_sleuf',
  'naam': 'Sleuf frezen in metselwerk',
  'categorie': 'Elektriciteit',
  'eenheid': 'm',
  'beschrijving': 'Per lopende meter in baksteen, indicatief tot 3 × 3 cm. Zonder kabel, '
                  'inbouwdoosgat, dichtzetten of afvoer. Niet voor beton of dragende delen.',
  'opties': [],
  'recept': {'materiaal': None, 'arbeid': 'uur_elek_sleuf'}},
 {'id': 'elek_sleuf_dichten',
  'naam': 'Sleuf dichtzetten',
  'categorie': 'Elektriciteit',
  'eenheid': 'm',
  'beschrijving': 'Vulmateriaal en dichtzetten per meter; zonder eindplamuur of schilderwerk.',
  'opties': [],
  'recept': {'materiaal': 'elek_sleuf_dichten', 'arbeid': 'uur_elek_sleuf_dichten'}}])

PAKKET_OP_ID = {p["id"]: p for p in PAKKETTEN}


# ---------------------------------------------------------------------------
# Tarieven-object: standaard + projectoverschrijvingen
# ---------------------------------------------------------------------------

class Tarieven:
    """Prijsboek met projectoverschrijvingen.

    ``waarden`` bevat de effectieve prijs per sleutel. Projecttarieven
    overschrijven de standaard; onbekende sleutels worden genegeerd (een
    project uit een oudere versie blijft dus bruikbaar).
    """

    def __init__(self, overrides: Optional[Dict[str, float]] = None,
                 referentie: Optional[Dict[str, float]] = None):
        self.standaard: Dict[str, float] = {k: v["prijs"] for k, v in TARIEVEN.items()}
        # Snelle m²-prijzen (afgeleid uit de referentieberekening).
        self.standaard.update(referentie or {})
        self.waarden: Dict[str, float] = dict(self.standaard)
        for sleutel, waarde in (overrides or {}).items():
            if sleutel not in self.waarden:
                continue
            try:
                self.waarden[sleutel] = float(waarde)
            except (TypeError, ValueError):
                continue

    # -- opvragen ------------------------------------------------------------
    def prijs(self, sleutel: str) -> float:
        return float(self.waarden.get(sleutel, 0.0))

    def heeft(self, sleutel: str) -> bool:
        return sleutel in self.waarden

    def meta(self, sleutel: str) -> Dict[str, Any]:
        return TARIEVEN.get(sleutel, {})

    def naam(self, sleutel: str) -> str:
        return self.meta(sleutel).get("naam", sleutel)

    def eenheid(self, sleutel: str) -> str:
        return self.meta(sleutel).get("eenheid", "")

    def per_eenheid(self, sleutel: str) -> Optional[float]:
        return self.meta(sleutel).get("per_eenheid")

    def is_taak(self, sleutel: str) -> bool:
        return self.meta(sleutel).get("soort") == "taak"

    # -- weergave ------------------------------------------------------------
    def overzicht(self) -> List[Dict[str, Any]]:
        """Het volledige prijsboek (voor het tarievenpaneel in de UI)."""
        boek: List[Dict[str, Any]] = []
        for sleutel, meta in TARIEVEN.items():
            boek.append({
                "sleutel": sleutel,
                "naam": meta["naam"],
                "eenheid": meta["eenheid"],
                "prijs": self.prijs(sleutel),
                "standaard": meta["prijs"],
                "soort": meta.get("soort", "materiaal"),
            })
        return boek
