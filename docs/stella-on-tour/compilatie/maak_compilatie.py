#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bouwt de compilatie "Ginger Cat Daily Dose" uit je eigen clips, met ffmpeg.

Wat het doet:
  · intromunt (3 s) + jouw clips in de volgorde van segments.json + outro (4 s)
  · alles op één formaat (16:9 of 9:16), 30 fps, mét brandende ondertitels
  · optioneel een muziekbed
  · schrijft ook een .srt met dezelfde ondertitels (voor YouTube)

Gebruik:
    python3 maak_compilatie.py --dry-run     # laat het ffmpeg-commando zien
    python3 maak_compilatie.py --limit 3     # test met de eerste 3 clips
    python3 maak_compilatie.py               # volledige compilatie

Vereist ffmpeg (niet inbegrepen):
    macOS:   brew install ffmpeg
    Windows: winget install Gyan.FFmpeg
    Linux:   sudo apt install ffmpeg
"""

from __future__ import annotations

import argparse
import json
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONFIG = HERE / "segments.json"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_FALLBACKS = [
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]


def load() -> dict:
    with CONFIG.open(encoding="utf-8") as fh:
        cfg = json.load(fh)
    cfg.setdefault("fps", 30)
    cfg.setdefault("muziek", None)
    cfg.setdefault("ondertitels", True)
    return cfg


def font_path() -> str:
    for f in [FONT, *FONT_FALLBACKS]:
        if Path(f).exists():
            return f
    sys.exit("Geen vet lettertype gevonden. Zet FONT in dit script naar een bestaand .ttf-bestand.")


def dims(formaat: str) -> tuple[int, int]:
    return (1080, 1920) if formaat.replace("x", ":").upper() == "9:16" else (1920, 1080)


def probe_duur(path: Path) -> float | None:
    if not shutil.which("ffprobe"):
        return None
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=nw=1:nk=1", str(path)],
            capture_output=True, text=True, check=True).stdout.strip()
        return float(out)
    except Exception:
        return None


def build(cfg: dict, limit: int | None, dry: bool) -> int:
    w, h = dims(cfg.get("formaat", "16:9"))
    fps = cfg["fps"]
    clips_dir = HERE / cfg.get("clips", "clips")
    kaarten = cfg.get("kaarten", {})
    intro = HERE / kaarten.get("intro", "kaarten/intro-16x9.png")
    outro = HERE / kaarten.get("outro", "kaarten/outro-16x9.png")
    if cfg.get("formaat", "16:9").replace("x", ":") == "9:16":
        # gebruik automatisch de staande kaarten als die bestaan
        for attr, value in (("intro", intro), ("outro", outro)):
            alt = Path(str(value).replace("16x9", "9x16"))
            if alt.exists():
                if attr == "intro":
                    intro = alt
                else:
                    outro = alt
    intro_duur = float(kaarten.get("intro_duur", 3.0))
    outro_duur = float(kaarten.get("outro_duur", 4.0))

    segmenten = cfg["segmenten"][:limit] if limit else cfg["segmenten"]
    if not segmenten:
        sys.exit("Geen segmenten in segments.json")

    ontbrekend = []
    for s in segmenten:
        p = clips_dir / s["bestand"]
        if not p.exists():
            ontbrekend.append(str(p))
    for p in (intro, outro):
        if not p.exists():
            ontbrekend.append(str(p))
    if ontbrekend:
        print("Deze bestanden ontbreken:")
        for p in ontbrekend:
            print("  ·", p)
        print("\nZet je clips in de map 'clips' met exact dezelfde namen, "
              "of pas 'bestand' aan in segments.json.")
        if not dry:
            return 1
        print("\n(dry-run: ik ga verder zodat je het commando toch ziet)")

    inputs: list[str] = []
    filters: list[str] = []
    labels: list[str] = []
    duur_totaal = 0.0

    # 1. intro (stilstaand beeld, duur instelbaar)
    inputs += ["-loop", "1", "-t", f"{intro_duur}", "-i", str(intro)]
    filters.append(
        f"[0:v]scale={w}:{h}:force_original_aspect_ratio=decrease,"
        f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=0x12100b,fps={fps},setsar=1[v0]")
    labels.append("[v0]")
    idx = 1

    # 2. clips
    for n, s in enumerate(segmenten, start=1):
        path = clips_dir / s["bestand"]
        dur = s.get("duur")
        if dur is None:
            dur = probe_duur(path)
            if dur is None:
                sys.exit(f"Geef 'duur' op voor {s['bestand']} (ffprobe niet gevonden).")
        start = float(s.get("start", 0))
        end = start + float(dur)

        inputs += ["-i", str(path)]
        duur_totaal += float(dur)
        chain = (f"[{idx}:v]trim=start={start}:end={end},setpts=PTS-STARTPTS,"
                 f"scale={w}:{h}:force_original_aspect_ratio=increase,"
                 f"crop={w}:{h},fps={fps},setsar=1")

        if cfg["ondertitels"] and (s.get("caption_en") or s.get("caption_nl")):
            cap = (s.get("caption_nl") if cfg.get("taal_ondertitel") == "nl" else s.get("caption_en")) \
                  or s.get("caption_en") or s.get("caption_nl")
            txt = HERE / "kaarten" / f"_cap-{n:02d}.txt"
            txt.parent.mkdir(exist_ok=True)
            txt.write_text(cap, encoding="utf-8")
            size = int(w * 0.045)
            chain += (f",drawtext=fontfile='{font_path()}':textfile='{txt}':expansion=none:"
                      f"fontcolor=white:fontsize={size}:line_spacing=6:"
                      f"box=1:boxcolor=black@0.55:boxborderw={int(size * 0.45)}:"
                      f"x=(w-text_w)/2:y=h-{int(h * 0.16)}")

        chain += f"[v{n}]"
        filters.append(chain)
        labels.append(f"[v{n}]")
        idx += 1

    # 3. outro
    inputs += ["-loop", "1", "-t", f"{outro_duur}", "-i", str(outro)]
    filters.append(
        f"[{idx}:v]scale={w}:{h}:force_original_aspect_ratio=decrease,"
        f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=0x12100b,fps={fps},setsar=1[v{idx}]")
    labels.append(f"[v{idx}]")

    concat = "".join(labels) + f"concat=n={len(labels)}:v=1:a=0[vout]"
    filters.append(concat)

    cmd: list[str] = ["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(filters),
                      "-map", "[vout]"]

    if cfg.get("muziek"):
        muziek = HERE / cfg["muziek"]
        if muziek.exists():
            cmd += ["-i", str(muziek)]
            muziek_idx = idx + 1
            totaal = intro_duur + duur_totaal + outro_duur
            cmd += ["-t", f"{totaal:.2f}", "-map", f"{muziek_idx}:a",
                    "-af", "volume=0.25,afade=t=out:st=" + f"{max(0.0, totaal - 2):.2f}" + ":d=2",
                    "-c:a", "aac", "-b:a", "160k"]
        else:
            print(f"! muziekbestand niet gevonden: {muziek} — video wordt stil")

    naam = cfg.get("uitvoer", "compilatie.mp4")
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(HERE / naam)]

    if dry:
        print("\nffmpeg-commando (dry-run):\n")
        print(" \\\n  ".join(shlex.quote(c) for c in cmd))
    else:
        if not shutil.which("ffmpeg"):
            sys.exit("ffmpeg niet gevonden. Installeer het eerst (zie de README).")
        print(f"renderen: {len(segmenten)} clips + intro + outro → {naam}")
        subprocess.run(cmd, check=True)
        print("klaar:", HERE / naam)

    # ondertitels als .srt
    if cfg["ondertitels"]:
        srt = HERE / (Path(naam).stem + ".srt")
        t = intro_duur
        regels = []
        for n, s in enumerate(segmenten, start=1):
            cap = (s.get("caption_nl") if cfg.get("taal_ondertitel") == "nl" else s.get("caption_en")) \
                  or s.get("caption_en") or s.get("caption_nl")
            if not cap:
                t += float(s.get("duur", 0))
                continue
            begin, eind = t, t + float(s.get("duur", 0))
            regels.append(f"{len(regels) + 1}\n{stamp(begin)} --> {stamp(eind)}\n{cap}\n")
            t = eind
        if regels:
            srt.write_text("\n".join(regels), encoding="utf-8")
            print("ondertitels:", srt.name)

    for f in (HERE / "kaarten").glob("_cap-*.txt"):
        f.unlink(missing_ok=True)

    return 0


def stamp(sec: float) -> str:
    h, rest = divmod(max(0.0, sec), 3600)
    m, s = divmod(rest, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}".replace(".", ",")


def main() -> int:
    ap = argparse.ArgumentParser(description="Bouwt de Ginger Cat Daily Dose-compilatie.")
    ap.add_argument("--dry-run", action="store_true", help="alleen het ffmpeg-commando tonen")
    ap.add_argument("--limit", type=int, help="alleen de eerste N clips (om te testen)")
    args = ap.parse_args()
    return build(load(), args.limit, args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
