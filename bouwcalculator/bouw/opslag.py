# -*- coding: utf-8 -*-
"""Projecten opslaan en laden.

Elk project is één JSON-bestand in ``data/projecten/``. De map ``data/``
staat in ``.gitignore``: klantgegevens belanden nooit in git.
"""

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from .model import Project

DATA_MAP = Path(__file__).resolve().parents[1] / "data" / "projecten"


def _slug(tekst: str) -> str:
    slegte = re.sub(r"[^a-zA-Z0-9]+", "-", (tekst or "offerte").lower()).strip("-")
    return slegte or "offerte"


def _pad(id_: str) -> Path:
    return DATA_MAP / f"{id_}.json"


def _zorg_voor_map() -> None:
    DATA_MAP.mkdir(parents=True, exist_ok=True)


def opslaan(project_data: Dict[str, Any], id_: Optional[str] = None) -> Dict[str, Any]:
    """Sla een project op en geef de metadata terug."""
    _zorg_voor_map()
    project = Project.van_dict(project_data)
    project_id = id_ or f"{_slug(project.naam)}-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    _pad(project_id).write_text(
        json.dumps(project.naar_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
    return {"id": project_id, "naam": project.naam, "opgeslagen": datetime.now().isoformat(timespec="seconds")}


def lijst() -> List[Dict[str, Any]]:
    """Alle opgeslagen projecten (nieuwste eerst)."""
    _zorg_voor_map()
    projecten: List[Dict[str, Any]] = []
    for pad in DATA_MAP.glob("*.json"):
        try:
            data = json.loads(pad.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        projecten.append({
            "id": pad.stem,
            "naam": data.get("naam", pad.stem),
            "klant": data.get("klant", ""),
            "datum": data.get("datum", ""),
            "ruimtes": len(data.get("ruimtes", [])),
            "regels": len(data.get("regels", [])),
            "gewijzigd": datetime.fromtimestamp(pad.stat().st_mtime).isoformat(timespec="seconds"),
        })
    projecten.sort(key=lambda p: p["gewijzigd"], reverse=True)
    return projecten


def laad(id_: str) -> Optional[Dict[str, Any]]:
    pad = _pad(id_)
    if not pad.is_file():
        return None
    try:
        return json.loads(pad.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def verwijder(id_: str) -> bool:
    pad = _pad(id_)
    if pad.is_file():
        pad.unlink()
        return True
    return False
