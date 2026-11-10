#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rendert de volledige aflevering van "Ginger Cat Daily Dose #01" — mét stem.

Leest `aflevering.json`: een lijst scènes (kaart of foto-uitsnede) met per scène
een ondertitel en een audiobestand. De duur van elke scène volgt de duur van de
ingesproken zin, zodat beeld en stem altijd synchroon lopen.

Gebruik:
    python3 maak_aflevering.py --dry-run        # enkel tonen wat er zou gebeuren
    python3 maak_aflevering.py                  # 16:9  → ginger-cat-daily-dose-01.mp4
    python3 maak_aflevering.py --formaat 9:16   # 9:16  → ginger-cat-daily-dose-01-short.mp4

Vereist ffmpeg (systeem, of `pip install imageio-ffmpeg`) en Pillow.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
FOTO = HERE.parent / "thumbnails" / "foto.jpg"
CONFIG = HERE / "aflevering.json"
TMP = HERE / ".tmp-aflevering"

FONT_KANDIDATEN = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]

DUUR_RE = re.compile(r"Duration: (\d+):(\d+):(\d+\.\d+)")


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


def duur_van(bestand: Path) -> float:
    """Leest de duur uit de ffmpeg-uitvoer (werkt ook zonder ffprobe)."""
    res = subprocess.run([ffmpeg_bin(), "-hide_banner", "-i", str(bestand)],
                         capture_output=True, text=True)
    m = DUUR_RE.search(res.stderr)
    if not m:
        sys.exit(f"kon de duur van {bestand.name} niet lezen")
    u, mnt, sec = m.groups()
    return int(u) * 3600 + int(mnt) * 60 + float(sec)


def dims(formaat: str) -> tuple[int, int]:
    return (1080, 1920) if formaat.replace("x", ":") == "9:16" else (1920, 1080)


def achtergrond(box, W: int, H: int, uit: Path) -> Path:
    """Knipt de foto bij tot de gevraagde uitsnede, iets groter dan het beeld."""
    try:
        from PIL import Image
    except ImportError:
        sys.exit("Pillow nodig: pip install pillow")
    im = Image.open(FOTO).convert("RGB")
    w, h = im.size
    x0, y0, x1, y1 = box
    im = im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
    im = im.resize((int(W * 1.15), int(H * 1.15)), Image.LANCZOS)
    im.save(uit, "JPEG", quality=95)
    return uit


def render_scene(bg: Path, duur: float, cap: str, uit: Path, fonte: str,
                 W: int, H: int, fps: int, fade_in=False, fade_out=False) -> None:
    txt = TMP / (uit.stem + ".txt")
    txt.write_text(cap, encoding="utf-8")
    frames = int(round(duur * fps))
    size = int(H * 0.036)
    vf = (f"zoompan=z='min(1.001+0.0008*on,1.14)':"
          f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
          f"d={frames}:s={W}x{H}:fps={fps},"
          f"trim=duration={duur},setpts=PTS-STARTPTS,setsar=1")
    if cap:
        size = max(int(H * 0.022), min(size, int(0.90 * W / (0.55 * max(1, len(cap))))))
        vf += (f",drawtext=fontfile='{fonte}':textfile='{txt}':expansion=none:"
               f"fontcolor=white:fontsize={size}:line_spacing=8:box=1:boxcolor=black@0.5:"
               f"boxborderw={int(size*0.5)}:x=(w-text_w)/2:y=h-{int(H*(0.30 if H > W else 0.20))}")
    if fade_in:
        vf += ",fade=t=in:st=0:d=0.6"
    if fade_out:
        vf += f",fade=t=out:st={max(0.0, duur-0.9):.2f}:d=0.9"
    cmd = [ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-y",
           "-loop", "1", "-t", f"{duur:.3f}", "-i", str(bg),
           "-vf", vf, "-an", "-r", str(fps),
           "-c:v", "libx264", "-preset", "medium", "-crf", "24",
           "-pix_fmt", "yuv420p", str(uit)]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)



def _stempel(sec: float) -> str:
    ms = int(round(sec * 1000))
    u, rest = divmod(ms, 3600000)
    m, rest = divmod(rest, 60000)
    s, ms = divmod(rest, 1000)
    return f"{u:02d}:{m:02d}:{s:02d},{ms:03d}"


def schrijf_srt(planning, lead: float, uit: Path) -> None:
    """Schrijft de ondertitels met dezelfde timing als het beeld."""
    regels, t, n = [], 0.0, 0
    for sc, audio, duur in planning:
        cap = sc.get("caption")
        if cap:
            n += 1
            start = t + (lead if audio else 0.0)
            eind = t + duur - (0.2 if audio else 0.4)
            regels.append(f"{n}\n{_stempel(start)} --> {_stempel(eind)}\n{cap}\n")
        t += duur
    uit.write_text("\n".join(regels), encoding="utf-8")


def build(formaat: str, uitvoer: str, dry: bool, muziek: Path | None) -> int:
    W, H = dims(formaat)
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    scenes = cfg["scenes"]
    lead = float(cfg.get("stem", {}).get("lead", 0.6))
    tail = float(cfg.get("stem", {}).get("tail", 0.9))
    fps = int(cfg.get("fps", 30))
    fonte = font()

    # 1. duur per scène bepalen
    planning = []
    for n, sc in enumerate(scenes, start=1):
        audio = (HERE / sc["audio"]) if sc.get("audio") else None
        if audio and not audio.exists():
            sys.exit(f"audiobestand ontbreekt: {audio.relative_to(HERE)}")
        if audio:
            duur = lead + duur_van(audio) + tail
        else:
            duur = float(sc.get("duur", 3.0))
        planning.append((sc, audio, duur))

    totaal = sum(d for _, _, d in planning)
    print(f"{formaat}: {len(scenes)} scènes, {totaal:.1f} s → {uitvoer}")
    if dry:
        for n, (sc, audio, d) in enumerate(planning, start=1):
            wat = sc.get("caption") or Path(sc.get("bestand", "?")).name
            print(f"  {n:02d} {d:5.1f}s  {wat}")
        return 0

    TMP.mkdir(exist_ok=True)
    for f in TMP.glob("*"):
        f.unlink()

    # 2. video per scène
    delen: list[Path] = []
    offsets: list[tuple[Path, float]] = []
    t = 0.0
    for n, (sc, audio, duur) in enumerate(planning, start=1):
        if sc["type"] == "kaart":
            bg = HERE / sc["bestand"]
            bg = bg.parent / bg.name.replace("16x9", "9x16") if H > W else bg
            if not bg.exists():
                sys.exit(f"kaart ontbreekt: {bg}")
            cap = ""
        else:
            box = sc.get("crop_9x16") or sc["crop"] if H > W else sc["crop"]
            bg = achtergrond(box, W, H, TMP / f"bg{n:02d}.jpg")
            cap = sc.get("caption", "")
        mp4 = TMP / f"{n:02d}-scene.mp4"
        render_scene(bg, duur, cap, mp4, fonte, W, H, fps,
                     fade_in=(n == 1), fade_out=(n == len(planning)))
        delen.append(mp4)
        if audio:
            offsets.append((audio, t + lead))
        t += duur
        print(f"  scène {n:02d}/{len(planning)} klaar ({duur:.1f} s)")

    # 3. video aan elkaar
    lijst = TMP / "lijst.txt"
    lijst.write_text("".join(f"file '{p.name}'\n" for p in delen), encoding="utf-8")
    stil = TMP / "video-stil.mp4"
    subprocess.run([ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-y",
                    "-f", "concat", "-safe", "0", "-i", str(lijst),
                    "-c", "copy", str(stil)], check=True)

    # 4. audio: stille basis + stemmen op hun offset, daarna normaliseren
    cmd = [ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-y",
           "-f", "lavfi", "-t", f"{totaal:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
    for audio, _ in offsets:
        cmd += ["-i", str(audio)]
    if muziek:
        cmd += ["-stream_loop", "-1", "-i", str(muziek)]

    filters = []
    mix_inputs = ["[0:a]"]
    for i, (_, start) in enumerate(offsets, start=1):
        ms = int(round(start * 1000))
        filters.append(f"[{i}:a]aresample=48000,adelay={ms}:all=1,volume=1.0[a{i}]")
        mix_inputs.append(f"[a{i}]")
    if muziek:
        idx = len(offsets) + 1
        filters.append(f"[{idx}:a]aresample=48000,volume=0.10,"
                       f"atrim=0:{totaal:.3f},"
                       f"afade=t=out:st={max(0.0, totaal-2):.2f}:d=2[amuz]")
        mix_inputs.append("[amuz]")
    filters.append("".join(mix_inputs) +
                   f"amix=inputs={len(mix_inputs)}:duration=first:normalize=0,"
                   f"loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,"
                   f"afade=t=out:st={max(0.0, totaal-1.5):.2f}:d=1.5[aout]")
    stem = TMP / "stem.m4a"
    subprocess.run(cmd + ["-filter_complex", ";".join(filters), "-map", "[aout]",
                          "-c:a", "aac", "-b:a", "192k", str(stem)], check=True)

    # 5. muxen
    subprocess.run([ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-y",
                    "-i", str(stil), "-i", str(stem),
                    "-c:v", "copy", "-c:a", "copy", "-shortest",
                    "-movflags", "+faststart", str(HERE / uitvoer)], check=True)

    # 6. ondertitelbestand (handig voor ondertitels/vertaling in Studio)
    srt = HERE / (Path(uitvoer).stem + ".srt")
    schrijf_srt(planning, lead, srt)

    for f in TMP.glob("*"):
        f.unlink()
    try:
        TMP.rmdir()
    except OSError:
        pass
    print("klaar:", HERE / uitvoer)
    print("ondertitels:", srt)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Volledige aflevering met stem.")
    ap.add_argument("--formaat", default="16:9", choices=["9:16", "16:9"])
    ap.add_argument("--uitvoer")
    ap.add_argument("--muziek", help="optioneel muziekbestand (staat op 10 % volume)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    uitvoer = args.uitvoer or (
        "ginger-cat-daily-dose-01-short.mp4" if args.formaat == "9:16"
        else "ginger-cat-daily-dose-01.mp4")
    return build(args.formaat, uitvoer, args.dry_run,
                 Path(args.muziek) if args.muziek else None)


if __name__ == "__main__":
    raise SystemExit(main())
