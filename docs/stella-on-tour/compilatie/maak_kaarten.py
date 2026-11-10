#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Maakt de kaarten (intro/outro) en de thumbnail voor de compilatie.

Vereist Pillow:

    python3 -m venv .venv && .venv/bin/pip install pillow
    .venv/bin/python docs/stella-on-tour/compilatie/maak_kaarten.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE / "kaarten"
FOTO = HERE.parent / "thumbnails" / "foto.jpg"

BG = (18, 16, 11)
ACCENT = (232, 179, 58)
WHITE = (255, 255, 255)
INK = (23, 19, 10)
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size):
    return ImageFont.truetype(BOLD, size)


def spaced(draw, xy, text, f, fill, tracking=3):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill)
        x += draw.textlength(ch, font=f) + tracking


def glow(size, color=(232, 179, 58, 34)):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w, h = size
    d.ellipse((-w * 0.3, h * 0.15, w * 0.75, h * 0.95), fill=color)
    return layer.filter(ImageFilter.GaussianBlur(w // 12))


def cover(im, w, h):
    im = im.convert("RGB")
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    left = (im.width - w) // 2
    top = (im.height - h) // 2
    return im.crop((left, top, left + w, top + h))


def fit(draw, text, max_w, start, minimum=20):
    size = start
    while size > minimum:
        f = font(size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return font(minimum)


# ---------------------------------------------------------------- intro
def intro(w, h, vertical=False):
    base = Image.new("RGBA", (w, h), BG + (255,))
    base.alpha_composite(glow((w, h)))
    d = ImageDraw.Draw(base)

    pad = round(w * 0.075)
    spaced(d, (pad, round(h * 0.09)), "STELLA ON TOUR", font(round(w * 0.022)),
           (255, 255, 255, 180), tracking=6)

    if vertical:
        top = round(h * 0.33)
        f1 = fit(d, "GINGER CAT", w - 2 * pad, round(w * 0.13))
        d.text((pad, top), "GINGER CAT", font=f1, fill=ACCENT)
        f2 = fit(d, "DAILY DOSE", w - 2 * pad, round(w * 0.20))
        d.text((pad, top + round(h * 0.085)), "DAILY DOSE", font=f2, fill=WHITE)
        d.text((pad, top + round(h * 0.30)), "#01", font=font(round(w * 0.18)), fill=ACCENT)
        d.rectangle((pad, top + round(h * 0.40), pad + round(w * 0.22), top + round(h * 0.408)),
                    fill=ACCENT)
        spaced(d, (pad, top + round(h * 0.43)), "12 MOMENTEN UIT BELGIE",
               font(round(w * 0.030)), (214, 206, 190), tracking=3)
    else:
        top = round(h * 0.34)
        f1 = fit(d, "GINGER CAT", w * 0.62, round(h * 0.10))
        d.text((pad, top), "GINGER CAT", font=f1, fill=ACCENT)
        f2 = fit(d, "DAILY DOSE", w * 0.72, round(h * 0.21))
        d.text((pad, top + round(h * 0.10)), "DAILY DOSE", font=f2, fill=WHITE)
        d.text((pad, top + round(h * 0.33)), "#01", font=font(round(h * 0.15)), fill=ACCENT)
        d.rectangle((pad, top + round(h * 0.505), pad + round(w * 0.13), top + round(h * 0.515)),
                    fill=ACCENT)
        spaced(d, (pad, top + round(h * 0.545)), "12 MOMENTEN UIT BELGIE",
               font(round(h * 0.032)), (214, 206, 190), tracking=3)

    # geen emoji: DejaVu heeft geen emoji-glyphs (je ziet dan een leeg vakje)
    return base.convert("RGB")


# ---------------------------------------------------------------- outro
def outro(w, h, vertical=False):
    base = Image.new("RGBA", (w, h), BG + (255,))
    base.alpha_composite(glow((w, h), (232, 179, 58, 22)))
    d = ImageDraw.Draw(base)
    pad = round(w * 0.075) if not vertical else round(w * 0.09)

    if vertical:
        top = round(h * 0.36)
        f1 = fit(d, "TOT DE VOLGENDE", w - 2 * pad, round(w * 0.155))
        d.text((pad, top), "TOT DE VOLGENDE", font=f1, fill=WHITE)
        f2 = fit(d, "WANDELING", w - 2 * pad, round(w * 0.20))
        d.text((pad, top + round(h * 0.075)), "WANDELING", font=f2, fill=ACCENT)
        d.rectangle((pad, top + round(h * 0.17), pad + round(w * 0.25), top + round(h * 0.176)),
                    fill=ACCENT)
        spaced(d, (pad, top + round(h * 0.20)), "ELKE ZONDAG", font(round(w * 0.045)),
               (214, 206, 190), tracking=5)
        spaced(d, (pad, top + round(h * 0.26)), "@STELLAONTOUR", font(round(w * 0.040)),
               ACCENT, tracking=4)
    else:
        top = round(h * 0.36)
        f1 = fit(d, "TOT DE VOLGENDE WANDELING", w * 0.84, round(h * 0.115))
        d.text((pad, top), "TOT DE VOLGENDE WANDELING", font=f1, fill=WHITE)
        d.rectangle((pad, top + round(h * 0.19), pad + round(w * 0.14), top + round(h * 0.20)),
                    fill=ACCENT)
        spaced(d, (pad, top + round(h * 0.235)), "ELKE ZONDAG EEN NIEUWE ROUTE",
               font(round(h * 0.040)), (214, 206, 190), tracking=3)
        spaced(d, (pad, top + round(h * 0.31)), "@STELLAONTOUR", font(round(h * 0.038)),
               ACCENT, tracking=4)
    return base.convert("RGB")


# ---------------------------------------------------------------- thumbnail
def thumbnail():
    w, h = 1280, 720
    base = Image.new("RGBA", (w, h), BG + (255,))
    d = ImageDraw.Draw(base)
    d.rectangle((0, 0, 620, h), fill=ACCENT)

    pad = 56
    spaced(d, (pad, 96), "GINGER CAT", font(46), INK, tracking=4)

    f = fit(d, "DAILY", 500, 132)
    d.text((pad, 150), "DAILY", font=f, fill=INK)
    f = fit(d, "DOSE", 500, 158)
    d.text((pad, 288), "DOSE", font=f, fill=INK)

    d.text((pad, 452), "#01", font=font(96), fill=INK)
    d.rectangle((pad, 566, pad + 96, 575), fill=INK)
    spaced(d, (pad, 596), "12 MOMENTEN", font(28), INK, tracking=3)
    spaced(d, (pad, 642), "STELLA ON TOUR", font(22), (60, 48, 18), tracking=4)

    if FOTO.exists():
        foto = Image.open(FOTO)
        img = cover(foto, 564, 632)
        img = ImageEnhance.Contrast(img).enhance(1.06)
        mask = Image.new("L", img.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1),
                                               radius=26, fill=255)
        sh = Image.new("RGBA", (564 + 90, 632 + 90), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle((45, 45, 609, 677), radius=26, fill=(0, 0, 0, 170))
        base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(24)), (668 - 45, 44 - 45))
        card = img.convert("RGBA")
        card.putalpha(mask)
        base.alpha_composite(card, (668, 44))
    return base.convert("RGB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = {
        "intro-16x9.png": intro(1920, 1080),
        "intro-9x16.png": intro(1080, 1920, vertical=True),
        "outro-16x9.png": outro(1920, 1080),
        "outro-9x16.png": outro(1080, 1920, vertical=True),
        "thumbnail-ginger-cat-daily-dose.png": thumbnail(),
    }
    for name, im in jobs.items():
        path = OUT / name
        im.save(path, "PNG", optimize=True)
        print("geschreven:", path)


if __name__ == "__main__":
    main()
