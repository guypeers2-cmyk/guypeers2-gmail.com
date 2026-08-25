# -*- coding: utf-8 -*-
"""Privacy- & Compliance-scanner (Agent 13) — harde trigger, grijpt altijd direct in."""

import re

# Harde patronen: als één hiervan matcht, grijpt de Privacy-agent vóór alle anderen.
_HARDE_PATRONEN = [
    (re.compile(r"\bNL\d{2}\s?[A-Z]{4}(?:\s?\d{2,4}){0,3}\b", re.IGNORECASE), "IBAN-rekeningnummer"),
    (re.compile(r"\b\d{9}\b"), "burgerservicenummer (9 cijfers)"),
    (re.compile(r"\b(?:\d[ -]?){13,15}\d\b"), "creditcardnummer"),
    (re.compile(r"\b(bsn|burgerservicenummer)\b", re.IGNORECASE), "vermelding van je BSN"),
    (re.compile(r"\b(creditcard\w*|pinpas|bankpas)\b", re.IGNORECASE), "betaalpasgegevens"),
    (re.compile(r"\b(wachtwoord\w*|password\w*|pincode|pincode)\b", re.IGNORECASE), "wachtwoord-vermelding"),
    (re.compile(r"\bgeheim\w*\b\s*(is|=|:)\s*\S+", re.IGNORECASE), "geheim/pin-combinatie"),
]

_EMAIL = re.compile(r"\b\S+@\S+\.\S{2,}\b")
_WACHTWOORD_WOORD = re.compile(r"\b(wachtwoord\w*|password\w*)\b", re.IGNORECASE)
_BSN_WOORD = re.compile(r"\b(bsn|burgerservicenummer)\b", re.IGNORECASE)


def scan_gevoelig(tekst: str) -> dict:
    """Scant de invoer op gevoelige persoonsgegevens.

    Geeft terug: {"hits": [...], "gemaskeerd": "..."} — hits leeg = veilig.
    Een e-mailadres alléén telt zacht (geen tussenkomst), een e-mail
    in combinatie met een wachtwoord-vermelding telt wél hard.
    """
    tekst = tekst or ""
    hits = []
    for patroon, label in _HARDE_PATRONEN:
        if patroon.search(tekst):
            hits.append(label)

    email = _EMAIL.search(tekst)
    if email and (_WACHTWOORD_WOORD.search(tekst) or _BSN_WOORD.search(tekst)):
        if "login-gegevens (e-mail + wachtwoord)" not in hits:
            hits.append("login-gegevens (e-mail + wachtwoord)")

    gemaskeerd = mask(tekst)
    return {"hits": hits, "gemaskeerd": gemaskeerd}


def mask(tekst: str) -> str:
    """Vervangt alle gevoelige patronen door kogels (•) zodat het bericht veilig kan meelezen."""
    tekst = tekst or ""
    tekst = re.sub(r"\bNL\d{2}\s?[A-Z]{4}(?:\s?\d{2,4}){0,3}\b", lambda m: "•" * len(m.group(0)), tekst, flags=re.IGNORECASE)
    tekst = re.sub(r"\b\d{9}\b", "•••••••••", tekst)
    tekst = re.sub(r"\b(?:\d[ -]?){13,15}\d\b", "•••• •••• •••• ••••", tekst)
    tekst = _EMAIL.sub("••@••.••", tekst)
    tekst = re.sub(r"\b(wachtwoord\w*|password\w*|pincode)\b([^\n]{0,24})", lambda m: m.group(1) + " " + "•" * len(m.group(2).strip()), tekst, flags=re.IGNORECASE)
    tekst = re.sub(r"\bgeheim\w*\b\s*(is|=|:)\s*\S+", lambda m: m.group(0).split("=")[0].split("is")[0].split(":")[0] + " •••••", tekst, flags=re.IGNORECASE)
    return tekst
