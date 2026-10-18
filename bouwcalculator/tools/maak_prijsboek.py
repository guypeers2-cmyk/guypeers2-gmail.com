#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genereer worker/src/prijsboek.js uit bouw/tarieven.py.

De JS-port van de rekenkern gebruikt hetzelfde prijsboek. Door het hier te
genereren in plaats van te kopiëren, lopen Python en JS nooit uiteen.

    python3 bouwcalculator/tools/maak_prijsboek.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from bouw.tarieven import PAKKETTEN, TARIEVEN  # noqa: E402

DOEL = Path(__file__).resolve().parents[1] / "web" / "prijsboek.js"

KOP = """// ==========================================================
// PRIJSBOEK — gegenereerd uit bouw/tarieven.py
// (bouwcalculator/tools/maak_prijsboek.py)
// NIET HANDMATIG AANPASSEN: wijzig de Python-bron en draai
// het script opnieuw, anders lopen Python en JS uiteen.
// ==========================================================

export const TARIEVEN = %s;

export const PAKKETTEN = %s;

export const PAKKET_OP_ID = Object.fromEntries(PAKKETTEN.map((p) => [p.id, p]));
"""


def main() -> int:
    inhoud = KOP % (
        json.dumps(TARIEVEN, ensure_ascii=False, indent=2),
        json.dumps(PAKKETTEN, ensure_ascii=False, indent=2),
    )
    DOEL.write_text(inhoud, encoding="utf-8")
    print(f"geschreven: {DOEL} ({len(inhoud)} tekens)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
