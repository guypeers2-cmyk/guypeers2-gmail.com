#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rendert het bewegende storyboard van "Ginger Cat Daily Dose #01".

Dit is de compilatie zoals ze eruit moet zien — maar met Stella's foto op de
plaats van de clips. Zo zie en hoor je de volgorde, het ritme en de ondertitels
voor je gaat filmen. Zodra je echte clips hebt, gebruik je maak_compilatie.py.

Gebruik:
    python3 maak_storyboard.py                 # 16:9 (long-form)
    python3 maak_storyboard.py --formaat 9:16  # 9:16 (Shorts)
    python3 maak_storyboard.py --limit 3       # alleen de eerste 3 segmenten

Vereist ffmpeg (systeem, of `pip install imageio-ffmpeg`).
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
FOTO = HERE.parent / "thumbnails" / "foto.jpg"
KAARTEN = HERE / "kaarten"
CONFIG = HERE / "segments.json"
TMP = HERE / ".tmp-storyboard"

FONT_KANDIDATEN = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]

# afwisselende uitsnedes van de foto (fracties), zodat elk segment anders voelt
CROPS_16x9 = [
    (0.00, 0.02, 1.00, 0.80),
    (0.18, 0.00, 0.72, 0.62),
    (0.00, 0.20, 1.00, 1.00),
    (0.30, 0.10, 0.80, 0.85),
    (0.00, 0.00, 1.00, 0.75),
    (0.10, 0.00, 0.90, 0.78),
]
CROPS_9x16 = [
    (0.27, 0.00, 0.69, 1.00),
    (0.33, 0.02, 0.63, 0.72),
    (0.20, 0.30, 0.58, 1.00),
    (0.36, 0.34, 0.64, 0.92),
    (0.18, 0.00, 0.66, 0.88),
    (0.28, 0.08, 0.72, 0.95),
]


def maak_achtergronden(boxen, W: int, H: int, fotos: list[Path]) -> list[Path]:
    """Knipt de foto vooraf bij en verkleint ze — dat scheelt geheugen in ffmpeg."""
    try:
        from PIL import Image
    except ImportError:
        sys.exit("Pillow nodig voor het storyboard: pip install pillow")
    pad = int(W * 1.15)
    hoogte = int(H * 1.15)
    out = []
    for n, box in enumerate(boxen, start=1):
        im = Image.open(fotos[0]).convert("RGB")
        w, h = im.size
        x0, y0, x1, y1 = box
        im = im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
        im = im.resize((pad, hoogte), Image.LANCZOS)
        p = TMP / f"bg{n:02d}.jpg"
        im.save(p, "JPEG", quality=95)
        out.append(p)
    return out


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
    cw = max(2, int(round((x1 - x0) * w)) // 2 * 2)
    ch = max(2, int(round((y1 - y0) * h)) // 2 * 2)
    return cw, ch, int(round(x0 * w)), int(round(y0 * h))


def render_scene(cmd_base, bg, duur, cap, uit, fonte, W, H, fps, fade_in=False, fade_out=False):
    """Rendert één scène naar een mp4 (los renderen is sneller en vergevingsgezinder)."""
    txt = TMP / (uit.stem + ".txt")
    txt.write_text(cap, encoding="utf-8")
    frames = int(round(duur * fps))
    size = int(H * 0.036)
    vf = (f"zoompan=z='min(1.001+0.0006*on,1.12)':"
          f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
          f"d={frames}:s={W}x{H}:fps={fps},"
          f"trim=duration={duur},setpts=PTS-STARTPTS,setsar=1")
    if cap:
        # ondertitel mag nooit breder worden dan 90% van het beeld
        size = max(int(H * 0.022), min(size, int(0.90 * W / (0.55 * max(1, len(cap))))))
        vf += (f",drawtext=fontfile='{fonte}':textfile='{txt}':expansion=none:fontcolor=white:"
               f"fontsize={size}:line_spacing=8:box=1:boxcolor=black@0.5:"
               f"boxborderw={int(size*0.5)}:x=(w-text_w)/2:y=h-{int(H*(0.30 if H > W else 0.20))}")
    if fade_in:
        vf += ",fade=t=in:st=0:d=0.6"
    if fade_out:
        vf += f",fade=t=out:st={max(0.0, duur-0.8):.2f}:d=0.8"
    cmd = cmd_base + ["-loop", "1", "-t", f"{duur}", "-i", str(bg),
                      "-vf", vf, "-an", "-r", str(fps),
                      "-c:v", "libx264", "-preset", "medium", "-crf", "21",
                      "-pix_fmt", "yuv420p", str(uit)]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def build(formaat: str, taal: str, limit: int | None, uitvoer: str, dry: bool) -> int:
    W, H = dims(formaat)
    verticaal = (W, H) == (1080, 1920)
    scenes = CROPS_9x16 if verticaal else CROPS_16x9

    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    segmenten = cfg["segmenten"][:limit] if limit else cfg["segmenten"]

    intro = KAARTEN / ("intro-9x16.png" if verticaal else "intro-16x9.png")
    outro = KAARTEN / ("outro-9x16.png" if verticaal else "outro-16x9.png")
    for p in (FOTO, intro, outro):
        if not p.exists():
            sys.exit(f"bestand ontbreekt: {p}")

    TMP.mkdir(exist_ok=True)
    fonte = font()
    fps, intro_d, outro_d = 30, 2.5, 3.5

    achtergronden = maak_achtergronden(
        [scenes[i % len(scenes)] for i in range(len(segmenten))], W, H, [FOTO])

    cmd_base = [ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-y"]
    delen: list[Path] = []

    # intro
    if dry:
        print(f"[droog] intro {intro_d}s, {len(segmenten)} scènes, outro {outro_d}s → {uitvoer}")
        return 0
    intro_mp4 = TMP / "00-intro.mp4"
    render_scene(cmd_base, intro, intro_d, "", intro_mp4, fonte, W, H, fps, fade_in=True)
    delen.append(intro_mp4)

    for n, (seg, bg) in enumerate(zip(segmenten, achtergronden), start=1):
        duur = min(float(seg.get("duur", 7)), 8.0)
        cap = seg.get("caption_nl") if taal == "nl" else seg.get("caption_en")
        cap = cap or seg.get("caption_en") or seg.get("caption_nl") or ""
        mp4 = TMP / f"{n:02d}-scene.mp4"
        render_scene(cmd_base, bg, duur, cap, mp4, fonte, W, H, fps)
        delen.append(mp4)
        print(f"  scène {n:02d}/{len(segmenten)} klaar")

    outro_mp4 = TMP / "99-outro.mp4"
    render_scene(cmd_base, outro, outro_d, "", outro_mp4, fonte, W, H, fps, fade_out=True)
    delen.append(outro_mp4)

    lijst = TMP / "lijst.txt"
    lijst.write_text("".join(f"file '{p.name}'\n" for p in delen), encoding="utf-8")
    subprocess.run([ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-y",
                    "-f", "concat", "-safe", "0", "-i", str(lijst),
                    "-c", "copy", "-movflags", "+faststart", str(HERE / uitvoer)], check=True)

    for f in list(TMP.glob("*")):
        f.unlink()
    try:
        TMP.rmdir()
    except OSError:
        pass
    print("klaar:", HERE / uitvoer)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Bewegend storyboard van de compilatie.")
    ap.add_argument("--formaat", default="16:9", choices=["9:16", "16:9"])
    ap.add_argument("--taal", default="en", choices=["en", "nl"])
    ap.add_argument("--limit", type=int)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    naam = f"storyboard-daily-dose-01-{'9x16' if args.formaat == '9:16' else '16x9'}.mp4"
    return build(args.formaat, args.taal, args.limit, naam, args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
