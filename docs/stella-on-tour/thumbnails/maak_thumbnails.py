#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genereert de drie thumbnail-varianten voor Stella on Tour (1280 × 720).

Let op: dit is een **ontwerphulpje voor de documentatie**, geen deel van de
Gids-runtime. Het vereist Pillow (dat is de enige uitzondering op de
"geen dependencies"-regel van het project):

    python3 -m venv .venv && .venv/bin/pip install pillow
    .venv/bin/python docs/stella-on-tour/thumbnails/maak_thumbnails.py foto.jpg

Zonder argument wordt `foto.jpg` naast dit script gebruikt.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1280, 720
BG = (18, 16, 11)
ACCENT = (232, 179, 58)
WHITE = (255, 255, 255)
INK = (23, 19, 10)

BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

HERE = Path(__file__).resolve().parent
OUT = HERE / "voorbeelden"


def font(size, bold=True):
    return ImageFont.truetype(BOLD if bold else REG, size)


def cover(im, w, h):
    """Snijdt de foto bij naar exact w × h (als een 'object-fit: cover')."""
    im = im.convert("RGB")
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    left = (im.width - w) // 2
    top = (im.height - h) // 2
    return im.crop((left, top, left + w, top + h))


def face_crop(im):
    """Snijdt de foto bij op de kop, zodat rommel op de achtergrond verdwijnt."""
    w, h = im.size
    box = (round(w * 0.15), round(h * 0.02), round(w * 0.92), h)
    return im.crop(box)


def vignette(im, strength=0.75):
    w, h = im.size
    mask = Image.new("L", (w, h), 255)
    ImageDraw.Draw(mask).ellipse((-w * 0.18, -h * 0.20, w * 1.18, h * 1.08), fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(70))
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    layer.putalpha(mask.point(lambda v: int(v * strength)))
    return Image.alpha_composite(im.convert("RGBA"), layer)


def rounded(im, radius):
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width - 1, im.height - 1),
                                           radius=radius, fill=255)
    out = im.convert("RGBA")
    out.putalpha(mask)
    return out


def fit(draw, text, max_w, start, minimum=28):
    size = start
    while size > minimum:
        f = font(size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return font(minimum)


def spaced(draw, xy, text, f, fill, tracking=3):
    """Tekst met extra letterafstand (Pillow kent geen letter-spacing)."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill)
        x += draw.textlength(ch, font=f) + tracking


def spaced_width(draw, text, f, tracking=3):
    return sum(draw.textlength(c, font=f) for c in text) + tracking * (len(text) - 1)


def photo_card(base, im, box, radius=26, shadow=True):
    x, y, w, h = box
    card = cover(face_crop(im), w, h).filter(ImageFilter.UnsharpMask(2, 110, 2))
    card = vignette(card)
    card = rounded(card, radius)
    if shadow:
        sh = Image.new("RGBA", (w + 80, h + 80), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle((40, 40, w + 40, h + 40), radius=radius,
                                             fill=(0, 0, 0, 170))
        sh = sh.filter(ImageFilter.GaussianBlur(22))
        base.alpha_composite(sh, (x - 40, y - 40))
    base.alpha_composite(card, (x, y))


def brand(draw, x, y, fill=WHITE, opacity=200):
    f = font(22)
    spaced(draw, (x, y), "STELLA ON TOUR", f, fill + (opacity,), tracking=4)


def background():
    base = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(base)
    # warme gloed achter het tekstblok
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((-260, 120, 780, 660), fill=(232, 179, 58, 26))
    base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(120)))
    return base, d


# ---------------------------------------------------------------- variant A
def variant_a(im):
    base, d = background()
    photo_card(base, im, (642, 54, 588, 612), radius=26)
    d = ImageDraw.Draw(base)

    d.text((62, 150), "15", font=font(150), fill=WHITE)
    f = fit(d, "WANDELINGEN", 560, 86)
    d.text((62, 318), "WANDELINGEN", font=f, fill=WHITE)

    d.rectangle((62, 452, 158, 462), fill=ACCENT)
    f2 = fit(d, "WAT IK LEERDE", 520, 32)
    spaced(d, (62, 494), "WAT IK LEERDE", f2, ACCENT, tracking=3)
    brand(d, 62, 660)
    return base.convert("RGB")


# ---------------------------------------------------------------- variant B
def variant_b(im):
    base, d = background()
    d.rectangle((0, 0, 620, H), fill=ACCENT)

    d.text((56, 132), "7", font=font(168), fill=INK)
    f = fit(d, "DAGEN", 500, 104)
    d.text((56, 330), "DAGEN", font=f, fill=INK)

    d.rectangle((56, 462, 166, 471), fill=INK)
    f2 = fit(d, "LEIBANDLES, ZONDER STRESS", 496, 30)
    spaced(d, (56, 502), "LEIBANDLES, ZONDER STRESS", f2, INK, tracking=2)
    brand(d, 56, 660, fill=INK, opacity=190)

    photo_card(base, im, (668, 44, 564, 632), radius=26)
    return base.convert("RGB")


# ---------------------------------------------------------------- variant C
def variant_c(im):
    base, d = background()
    photo_card(base, im, (48, 48, 560, 624), radius=26)

    d = ImageDraw.Draw(base)
    x = 660
    f = fit(d, "MIJN KAT", 560, 76)
    d.text((x, 236), "MIJN KAT", font=f, fill=WHITE)
    f = fit(d, "WANDELT", 560, 118)
    d.text((x, 330), "WANDELT", font=f, fill=ACCENT)
    d.rectangle((x, 486, x + 96, 495), fill=WHITE)
    f2 = fit(d, "ELKE ZONDAG EEN NIEUWE ROUTE", 540, 27)
    spaced(d, (x, 528), "ELKE ZONDAG EEN NIEUWE ROUTE", f2, (200, 192, 175), tracking=2)
    brand(d, x, 660)
    return base.convert("RGB")


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "foto.jpg"
    if not src.exists():
        raise SystemExit(f"Foto niet gevonden: {src}")
    im = Image.open(src)
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in (("A-15-wandelingen", variant_a),
                     ("B-7-dagen-leibandles", variant_b),
                     ("C-mijn-kat-wandelt", variant_c)):
        path = OUT / f"thumbnail-{name}.png"
        fn(im).save(path, "PNG", optimize=True)
        print("geschreven:", path)


if __name__ == "__main__":
    main()
