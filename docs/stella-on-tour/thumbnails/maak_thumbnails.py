#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genereert de thumbnail-set voor Stella on Tour (1280 × 720).

Ontwerphulpje voor de documentatie, geen deel van de Gids-runtime. Vereist Pillow:

    python3 -m venv .venv && .venv/bin/pip install pillow
    .venv/bin/python docs/stella-on-tour/thumbnails/maak_thumbnails.py foto.jpg

De uitsnedes zijn relatief (0–1) zodat ze werken met elke resolutie.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

W, H = 1280, 720
BG = (18, 16, 11)
ACCENT = (232, 179, 58)
WHITE = (255, 255, 255)
INK = (23, 19, 10)

BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
HERE = Path(__file__).resolve().parent
OUT = HERE / "voorbeelden"

# uitsnede per variant: (x0, y0, x1, y1) als fractie van de bronfoto
CROP_CARD = (0.255, 0.00, 0.800, 0.735)   # kop + borst, staand kader
CROP_WIDE = (0.00, 0.005, 1.00, 0.760)   # volledig breed, 16:9


def font(size):
    return ImageFont.truetype(BOLD, size)


def grade(im):
    """Warme, contrastrijke basis — anders ziet een huiskamerfoto er vlak uit."""
    im = ImageEnhance.Color(im).enhance(1.06)
    im = ImageEnhance.Contrast(im).enhance(1.07)
    warm = Image.new("RGBA", im.size, (255, 186, 92, 22))
    return Image.alpha_composite(im.convert("RGBA"), warm).convert("RGB")


def crop_fraction(im, box):
    w, h = im.size
    x0, y0, x1, y1 = box
    return im.crop((round(x0 * w), round(y0 * h), round(x1 * w), round(y1 * h)))


def cover(im, w, h):
    im = im.convert("RGB")
    s = max(w / im.width, h / im.height)
    im = im.resize((max(w, round(im.width * s)), max(h, round(im.height * s))),
                   Image.LANCZOS)
    left = (im.width - w) // 2
    top = (im.height - h) // 2
    return im.crop((left, top, left + w, top + h))


def sharp(im):
    return im.filter(ImageFilter.UnsharpMask(2, 90, 2))


def vignette(im, strength=0.55):
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


def fit(draw, text, max_w, start, minimum=24):
    size = start
    while size > minimum:
        f = font(size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return font(minimum)


def spaced(draw, xy, text, f, fill, tracking=3):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill)
        x += draw.textlength(ch, font=f) + tracking


def brand(draw, x, y, fill=WHITE, opacity=205, tracking=4, size=22):
    f = font(size)
    spaced(draw, (x, y), "STELLA ON TOUR", f, fill + (opacity,), tracking=tracking)


def brand_width(draw, size=22, tracking=4):
    f = font(size)
    return sum(draw.textlength(c, font=f) for c in "STELLA ON TOUR") + tracking * (len("STELLA ON TOUR") - 1)


def background():
    base = Image.new("RGBA", (W, H), BG + (255,))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((-280, 110, 800, 680), fill=(232, 179, 58, 30))
    base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(120)))
    return base


def photo_card(base, im, box, radius=26):
    x, y, w, h = box
    card = cover(crop_fraction(im, CROP_CARD), w, h)
    card = rounded(vignette(sharp(card), 0.5), radius)
    sh = Image.new("RGBA", (w + 90, h + 90), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((45, 45, w + 45, h + 45), radius=radius,
                                         fill=(0, 0, 0, 175))
    sh = sh.filter(ImageFilter.GaussianBlur(24))
    base.alpha_composite(sh, (x - 45, y - 45))
    base.alpha_composite(card, (x, y))


# ---------------------------------------------------------------- variant A
def variant_a(im):
    base = background()
    photo_card(base, im, (648, 52, 584, 616))
    d = ImageDraw.Draw(base)

    d.text((62, 146), "15", font=font(152), fill=WHITE)
    d.text((62, 318), "WANDELINGEN", font=fit(d, "WANDELINGEN", 560, 86), fill=WHITE)
    d.rectangle((62, 452, 158, 462), fill=ACCENT)
    spaced(d, (62, 494), "WAT IK LEERDE", fit(d, "WAT IK LEERDE", 520, 32), ACCENT)
    brand(d, 62, 660)
    return base.convert("RGB")


# ---------------------------------------------------------------- variant B
def variant_b(im):
    base = background()
    d = ImageDraw.Draw(base)
    d.rectangle((0, 0, 620, H), fill=ACCENT)

    d.text((56, 128), "7", font=font(170), fill=INK)
    d.text((56, 330), "DAGEN", font=fit(d, "DAGEN", 500, 106), fill=INK)
    d.rectangle((56, 462, 166, 471), fill=INK)
    spaced(d, (56, 502), "LEIBANDLES, ZONDER STRESS",
           fit(d, "LEIBANDLES, ZONDER STRESS", 496, 30), INK, tracking=2)
    brand(d, 56, 660, fill=INK, opacity=190)

    photo_card(base, im, (668, 44, 564, 632))
    return base.convert("RGB")


# ---------------------------------------------------------------- variant C
def variant_c(im):
    base = Image.new("RGBA", (W, H), BG + (255,))
    photo = cover(crop_fraction(im, CROP_WIDE), W, H)
    photo = sharp(photo).convert("RGBA")
    base.alpha_composite(photo, (0, 0))

    # donker verloop onderaan, zodat de tekst leesbaar is
    grad = Image.new("L", (1, H), 0)
    for y in range(H):
        t = max(0.0, (y - H * 0.38) / (H * 0.62))
        grad.putpixel((0, y), int(min(1.0, t ** 1.25) * 225))
    grad = grad.resize((W, H))
    shade = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    shade.putalpha(grad)
    base.alpha_composite(shade)

    # lichte vignette links, zodat de tekst niet op de kat valt
    left = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(left).rectangle((0, 0, 620, H), fill=(0, 0, 0, 60))
    base.alpha_composite(left.filter(ImageFilter.GaussianBlur(90)))

    d = ImageDraw.Draw(base)
    d.text((64, 414), "MIJN KAT", font=fit(d, "MIJN KAT", 520, 72), fill=WHITE)
    d.text((64, 494), "WANDELT", font=fit(d, "WANDELT", 520, 110), fill=ACCENT)
    d.rectangle((64, 622, 160, 631), fill=WHITE)
    f_small = fit(d, "ELKE ZONDAG EEN NIEUWE ROUTE", 520, 26)
    spaced(d, (64, 656), "ELKE ZONDAG EEN NIEUWE ROUTE", f_small, (214, 206, 190), tracking=2)

    bw = brand_width(d)
    brand(d, W - 64 - bw, 676, opacity=190)
    return base.convert("RGB")


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "foto.jpg"
    if not src.exists():
        raise SystemExit(f"Foto niet gevonden: {src}")
    im = grade(Image.open(src))
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in (("A-15-wandelingen", variant_a),
                     ("B-7-dagen-leibandles", variant_b),
                     ("C-mijn-kat-wandelt", variant_c)):
        path = OUT / f"thumbnail-{name}.png"
        fn(im).save(path, "PNG", optimize=True)
        print("geschreven:", path)


if __name__ == "__main__":
    main()
