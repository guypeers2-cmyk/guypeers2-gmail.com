#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Past alle video-instellingen van @StellaonTour in één keer aan via de YouTube API.

Waarom dit bestaat: YouTube Studio heeft géén importbestand voor metadata. Je kunt
in Studio alleen tekst aan het begin of einde van álle beschrijvingen plakken, of
alles overschrijven met dezelfde tekst. Unieke titels, beschrijvingen, tags en
playlists per video kunnen alleen via de API.

Gebruik:
    python3 update_videos.py --validate        # alleen de config controleren (geen API)
    python3 update_videos.py --dry-run         # tonen wat er zou veranderen
    python3 update_videos.py                   # echt uitvoeren
    python3 update_videos.py --only UCxxxx     # één video

Eerste keer: zie README.md (client_secret.json + inloggen).
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONFIG = HERE / "videos.json"
SECRET = HERE / "client_secret.json"
TOKEN = HERE / "token.json"
SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]

CATEGORY_PETS = "15"


# ------------------------------------------------------------------ config
def load_config(path: Path) -> dict:
    with path.open(encoding="utf-8") as fh:
        cfg = json.load(fh)
    cfg.setdefault("placeholders", {})
    cfg.setdefault("required_placeholders", [])
    cfg.setdefault("playlists", [])
    cfg.setdefault("videos", [])
    return cfg


def resolve(text: str, placeholders: dict, unresolved: set,
            required: set | None = None) -> str:
    """Vervangt {{TOKEN}}-plaatsaanduidingen.

    Is een token leeg, dan verdwijnt de hele regel — behalve als het token
    verplicht is (dan wordt het als probleem gemeld).
    """
    required = required or set()
    out = text
    for key, value in placeholders.items():
        token = "{{" + key + "}}"
        if token not in out:
            continue
        if value:
            out = out.replace(token, value)
        else:
            if key in required:
                unresolved.add(key)
            out = "\n".join(line for line in out.split("\n") if token not in line)
    return out


def validate(cfg: dict, strict: bool = True) -> list[str]:
    problems, warnings = [], []
    placeholders = cfg["placeholders"]
    unresolved: set[str] = set()
    seen: set[str] = set()
    tag_chars = 0

    for v in cfg["videos"]:
        vid = v.get("id", "")
        if len(vid) != 11:
            problems.append(f"{vid!r}: video-id moet 11 tekens zijn")
        if vid in seen:
            problems.append(f"{vid}: komt twee keer voor")
        seen.add(vid)

        title = v.get("title", "")
        if title and len(title) > 100:
            problems.append(f"{vid}: titel is {len(title)} tekens (max. 100)")

        desc = v.get("description", "")
        if isinstance(desc, list):
            desc = "\n".join(desc)
        desc = resolve(desc, placeholders, unresolved, set(cfg["required_placeholders"]))
        if len(desc.encode("utf-8")) > 5000:
            problems.append(f"{vid}: beschrijving is te lang (max. 5.000 bytes)")

        tags = v.get("tags") or []
        total = sum(len(t) + 1 for t in tags)
        tag_chars = max(tag_chars, total)
        if total > 500:
            problems.append(f"{vid}: tags zijn samen {total} tekens (max. 500)")

        if v.get("playlist") and v["playlist"] not in cfg["playlists"]:
            warnings.append(f"{vid}: playlist {v['playlist']!r} staat niet in de lijst "
                            f"(wordt aangemaakt)")

        if not title and not v.get("description") and not v.get("privacy"):
            warnings.append(f"{vid}: geen titel, beschrijving of zichtbaarheid — er gebeurt niets")

        if v.get("thumbnail") and not (HERE / v["thumbnail"]).exists():
            warnings.append(f"{vid}: thumbnail {v['thumbnail']} niet gevonden")

    if unresolved:
        msg = ("deze plaatsaanduidingen zijn nog leeg: " + ", ".join(sorted(unresolved)) +
               " → vul ze bovenaan videos.json in onder \"placeholders\"")
        (problems if strict else warnings).append(msg)

    print(f"config: {len(cfg['videos'])} video's · {len(cfg['playlists'])} playlists · "
          f"max. {tag_chars} tekens tags")
    for w in warnings:
        print("  waarschuwing:", w)
    for p in problems:
        print("  FOUT:", p)
    return problems


# ------------------------------------------------------------------- api
def api():
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
    except ImportError:
        sys.exit("Installeer eerst de dependencies:\n"
                 "  python3 -m venv .venv && .venv/bin/pip install -r requirements.txt")

    creds = None
    if TOKEN.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not SECRET.exists():
                sys.exit(f"client_secret.json ontbreekt in {HERE} — zie README.md stap 2.")
            flow = InstalledAppFlow.from_client_secrets_file(str(SECRET), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN.write_text(creds.to_json(), encoding="utf-8")
        print("inlogtoken opgeslagen in token.json")
    return build("youtube", "v3", credentials=creds, cache_discovery=False)


def snapshot(yt, ids: list[str]) -> dict:
    out = {}
    for i in range(0, len(ids), 50):
        chunk = ids[i:i + 50]
        resp = yt.videos().list(part="snippet,status", id=",".join(chunk)).execute()
        for item in resp.get("items", []):
            out[item["id"]] = item
    return out


def playlist_map(yt):
    mapping, token = {}, None
    while True:
        resp = yt.playlists().list(part="snippet", mine=True, maxResults=50,
                                   pageToken=token).execute()
        for p in resp.get("items", []):
            mapping[p["snippet"]["title"]] = p["id"]
        token = resp.get("nextPageToken")
        if not token:
            return mapping


def ensure_playlist(yt, mapping: dict, name: str, dry: bool) -> str | None:
    if name in mapping:
        return mapping[name]
    if dry:
        print(f"    + playlist '{name}' zou worden aangemaakt")
        return None
    created = yt.playlists().insert(
        part="snippet",
        body={"snippet": {"title": name, "description": ""}},
    ).execute()
    mapping[name] = created["id"]
    print(f"    + playlist '{name}' aangemaakt")
    return created["id"]


def already_in_playlist(yt, playlist_id: str, video_id: str) -> bool:
    resp = yt.playlistItems().list(part="id", playlistId=playlist_id,
                                   videoId=video_id, maxResults=1).execute()
    return bool(resp.get("items"))


def restore(yt, path: Path, dry: bool) -> int:
    """Zet titel/beschrijving/tags/zichtbaarheid terug uit een back-upbestand."""
    data = json.loads(path.read_text(encoding="utf-8"))
    n = 0
    for vid, item in data.items():
        snip, status = item.get("snippet", {}), item.get("status", {})
        if dry:
            print(f"  zou terugzetten: {vid} — {snip.get('title')!r}")
            continue
        body = {
            "id": vid,
            "snippet": {
                "title": snip.get("title", ""),
                "description": snip.get("description", ""),
                "tags": snip.get("tags", []),
                "categoryId": snip.get("categoryId", CATEGORY_PETS),
                "defaultLanguage": snip.get("defaultLanguage", "nl"),
            },
            "status": {"privacyStatus": status.get("privacyStatus", "public")},
        }
        yt.videos().update(part="snippet,status", body=body).execute()
        print(f"  teruggezet: {vid} — {snip.get('title')!r}")
        n += 1
        time.sleep(0.3)
    return n


def run(args):
    cfg = load_config(CONFIG)
    if validate(cfg, strict=not args.allow_unresolved):
        if not args.allow_unresolved:
            sys.exit("Los de fouten hierboven op (of gebruik --allow-unresolved).")

    if args.validate:
        return 0

    yt = api()
    if args.restore:
        restore(yt, Path(args.restore), args.dry_run)
        return 0
    videos = cfg["videos"]
    if args.only:
        videos = [v for v in videos if v["id"] == args.only]
        if not videos:
            sys.exit(f"geen video met id {args.only}")

    ids = [v["id"] for v in videos]
    current = snapshot(yt, ids)
    missing = [i for i in ids if i not in current]
    for i in missing:
        print(f"  ! video {i} niet gevonden op dit kanaal (overgeslagen)")

    if not args.dry_run:
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = HERE / f"backup-{stamp}.json"
        backup.write_text(json.dumps(current, ensure_ascii=False, indent=2),
                          encoding="utf-8")
        print(f"back-up van de huidige metadata: {backup.name}")

    placeholders = cfg["placeholders"]
    unresolved: set[str] = set()
    pmap = playlist_map(yt) if not args.no_playlists else {}
    changed = 0

    for v in videos:
        vid = v["id"]
        if vid not in current:
            continue
        cur = current[vid]
        snip, status = cur["snippet"], cur["status"]

        new_title = v.get("title") or snip.get("title")
        desc = v.get("description", "")
        if isinstance(desc, list):
            desc = "\n".join(desc)
        new_desc = (resolve(desc, placeholders, unresolved, set(cfg["required_placeholders"]))
                    if desc else snip.get("description", ""))
        new_tags = v.get("tags") or snip.get("tags", [])
        new_privacy = v.get("privacy") or status.get("privacyStatus")

        diffs = []
        if new_title != snip.get("title"):
            diffs.append(f"titel: {snip.get('title')!r} → {new_title!r}")
        if new_desc != snip.get("description"):
            diffs.append("beschrijving: gewijzigd")
        if sorted(new_tags) != sorted(snip.get("tags", [])):
            diffs.append(f"tags: {len(snip.get('tags', []))} → {len(new_tags)}")
        if new_privacy != status.get("privacyStatus"):
            diffs.append(f"zichtbaarheid: {status.get('privacyStatus')} → {new_privacy}")

        print(f"\n{vid} — {new_title}")
        if not diffs:
            print("    niets te doen")
        for d in diffs:
            print("    ·", d)

        if diffs and not args.dry_run:
            body = {
                "id": vid,
                "snippet": {
                    "title": new_title,
                    "description": new_desc,
                    "tags": new_tags,
                    "categoryId": snip.get("categoryId") or CATEGORY_PETS,
                    "defaultLanguage": snip.get("defaultLanguage") or "nl",
                },
            }
            parts = ["snippet"]
            if new_privacy != status.get("privacyStatus"):
                body["status"] = {"privacyStatus": new_privacy}
                parts.append("status")
            yt.videos().update(part=",".join(parts), body=body).execute()
            changed += 1
            time.sleep(0.3)

        # thumbnail
        thumb = v.get("thumbnail")
        if thumb and not args.dry_run:
            path = HERE / thumb
            if path.exists():
                yt.thumbnails().set(videoId=vid, media_body=str(path)).execute()
                print("    · thumbnail geüpload")
                time.sleep(0.3)

        # playlist
        name = v.get("playlist")
        if name and not args.no_playlists:
            pid = ensure_playlist(yt, pmap, name, args.dry_run)
            if pid and not args.dry_run and not already_in_playlist(yt, pid, vid):
                yt.playlistItems().insert(
                    part="snippet",
                    body={"snippet": {"playlistId": pid,
                                      "resourceId": {"kind": "youtube#video",
                                                     "videoId": vid}}},
                ).execute()
                print(f"    · toegevoegd aan playlist '{name}'")
                time.sleep(0.3)
            elif pid:
                print(f"    · playlist '{name}': ok")

    print(f"\n{'[dry-run] ' if args.dry_run else ''}{changed} video('s) bijgewerkt.")
    if args.dry_run:
        print("Voer hetzelfde commando zonder --dry-run uit om het echt te doen.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Bulk-update van YouTube-video-instellingen.")
    ap.add_argument("--validate", action="store_true", help="alleen de config controleren")
    ap.add_argument("--dry-run", action="store_true", help="tonen, niets schrijven")
    ap.add_argument("--only", metavar="VIDEO_ID", help="één video bijwerken")
    ap.add_argument("--no-playlists", action="store_true", help="playlists overslaan")
    ap.add_argument("--restore", metavar="BACKUP_JSON",
                    help="metadata terugzetten uit een eerder gemaakte back-up")
    ap.add_argument("--allow-unresolved", action="store_true",
                    help="doorgaan ook als {{placeholders}} leeg zijn")
    args = ap.parse_args()
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
