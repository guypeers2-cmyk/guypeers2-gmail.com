#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rendert de video "Ginger Cat Daily Dose #01" — een korte teaser met de foto
van Stella, de kaarten en bewegende ondertitels.

Waarom een teaser en geen compilatie: voor een compilatie zijn clips nodig die
dit project niet heeft. Dit script maakt wél een echte, uploadbare video met wat
er is: één foto, drie kaarten en zes tekstmomenten.

Gebruik:
    python3 maak_teaser.py                 # 9:16 (Shorts)
    python3 maak_teaser.py --formaat 16:9  # 16:9 (kanaaltrailer)

Vereist ffmpeg (systeem of `pip install imageio-ffmpeg`).
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
FOTO = HERE.parent / "thumbnails" / "foto.jpg"
KAARTEN = HERE / "kaarten"
TMP = HERE / ".tmp-teaser"

FONT_KANDIDATEN = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]

# per scène: crop als fractie van de foto (x0, y0, x1, y1) + ondertitel
SCENES_9x16 = [
    ((0.27, 0.00, 0.69, 1.00), "This is Stella.", 4.0),
    ((0.33, 0.02, 0.63, 0.72), "She is not a house cat.", 3.6),
    ((0.20, 0.30, 0.58, 1.00), "She walks. On a leash.", 3.4),
    ((0.36, 0.34, 0.64, 0.92), "On her terms.", 3.0),
    ((0.18, 0.00, 0.66, 0.88), "Every Sunday. A new route.", 3.8),
    ((0.28, 0.08, 0.72, 0.95), "Ginger Cat Daily Dose #01", 3.4),
]

SCENES_16x9 = [
    ((0.00, 0.02, 1.00, 0.80), "This is Stella.", 4.0),
    ((0.18, 0.00, 0.72, 0.62), "She is not a house cat.", 3.6),
    ((0.00, 0.20, 1.00, 1.00), "She walks. On a leash.", 3.4),
    ((0.30, 0.10, 0.80, 0.85), "On her terms.", 3.0),
    ((0.00, 0.00, 1.00, 0.75), "Every Sunday. A new route.", 3.8),
    ((0.10, 0.00, 0.90, 0.78), "Ginger Cat Daily Dose #01", 3.4),
]


def ffmpeg_bin() -> str:
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("ffmpeg niet gevonden. Installeer ffmpeg, of: pip install imageio-ffmpeg")


def font() -> str:
    for f in FONT_KANDIDATEN:
        if Path(f).exists():
            return f
    sys.exit("Geen vet lettertype gevonden — pas FONT_KANDIDATEN aan.")


def dims(formaat: str) -> tuple[int, int]:
    return (1080, 1920) if formaat.replace("x", ":") == "9:16" else (1920, 1080)


def crop_pixels(box, size):
    w, h = size
    x0, y0, x1, y1 = box
    x = int(round(x0 * w))
    y = int(round(y0 * h))
    cw = max(2, int(round((x1 - x0) * w)) // 2 * 2)
    ch = max(2, int(round((y1 - y0) * h)) // 2 * 2)
    return cw, ch, x, y


def build(formaat: str, uitvoer: str, dry: bool) -> int:
    W, H = dims(formaat)
    scenes = SCENES_9x16 if (W, H) == (1080, 1920) else SCENES_16x9
    intro = KAARTEN / ("intro-9x16.png" if (W, H) == (1080, 1920) else "intro-16x9.png")
    outro = KAARTEN / ("outro-9x16.png" if (W, H) == (1080, 1920) else "outro-16x9.png")
    for p in (FOTO, intro, outro):
        if not p.exists():
            sys.exit(f"bestand ontbreekt: {p}")

    TMP.mkdir(exist_ok=True)
    fonte = font()
    intro_d, outro_d, fps = 2.5, 3.5, 30

    inputs = ["-loop", "1", "-t", f"{intro_d}", "-i", str(intro)]
    for _ in scenes:
        inputs += ["-loop", "1", "-t", "8", "-i", str(FOTO)]
    inputs += ["-loop", "1", "-t", f"{outro_d}", "-i", str(outro)]

    filters, labels = [], []

    filters.append(
        f"[0:v]scale={W}:{H}:force_original_aspect_ratio=decrease,"
        f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=0x12100b,fps={fps},"
        f"format=yuv420p,fade=t=in:st=0:d=0.6[v0]")
    labels.append("[v0]")

    totale_duur = intro_d + sum(s[2] for s in scenes) + outro_d
    idx = 1
    for n, (box, caption, dur) in enumerate(scenes, start=1):
        cw, ch, x, y = crop_pixels(box, (4032, 3024))
        txt = TMP / f"cap{n:02d}.txt"
        txt.write_text(caption, encoding="utf-8")
        frames = int(round(dur * fps))
        size = int(H * 0.036)
        filters.append(
            f"[{idx}:v]crop={cw}:{ch}:{x}:{y},"
            f"zoompan=z='min(1.001+0.00055*on,1.12)':"
            f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"d={frames}:s={W}x{H}:fps={fps},"
            f"trim=duration={dur},setpts=PTS-STARTPTS,setsar=1,"
            f"drawtext=fontfile='{fonte}':textfile='{txt}':fontcolor=white:fontsize={size}:"
            f"line_spacing=8:box=1:boxcolor=black@0.5:boxborderw={int(size*0.5)}:"
            f"x=(w-text_w)/2:y=h-{int(H*0.20)}"
            f"[v{n}]")
        labels.append(f"[v{n}]")
        idx += 1

    filters.append(
        f"[{idx}:v]scale={W}:{H}:force_original_aspect_ratio=decrease,"
        f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=0x12100b,fps={fps},"
        f"format=yuv420p,fade=t=out:st={max(0.0, outro_d-0.8):.2f}:d=0.8[v{idx}]")
    labels.append(f"[v{idx}]")

    filters.append("".join(labels) + f"concat=n={len(labels)}:v=1:a=0[vout]")

    cmd = [ffmpeg_bin(), "-y", *inputs, "-filter_complex", ";".join(filters),
           "-map", "[vout]", "-an", "-c:v", "libx264", "-preset", "medium",
           "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
           str(HERE / uitvoer)]

    print(f"{formaat} · {len(scenes)} scènes · ± {totale_duur:.0f} s → {uitvoer}")
    if dry:
        print(" ".join(cmd))
        return 0
    subprocess.run(cmd, check=True)

    for f in TMP.glob("cap*.txt"):
        f.unlink()
    try:
        TMP.rmdir()
    except OSError:
        pass
    print("klaar:", HERE / uitvoer)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--formaat", default="9:16", choices=["9:16", "16:9"])
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    naam = "ginger-cat-daily-dose-01-teaser-9x16.mp4" if args.formaat == "9:16" \
        else "ginger-cat-daily-dose-01-teaser-16x9.mp4"
    return build(args.formaat, naam, args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
