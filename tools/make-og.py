#!/usr/bin/env python3
"""
tools/make-og.py — regenerate assets/og.png (the 1200x630 link-preview card).

    python3 -m venv /tmp/ogenv && /tmp/ogenv/bin/pip install Pillow
    /tmp/ogenv/bin/python tools/make-og.py

Text is drawn segment by segment because no single macOS system font covers
Thai + Japanese + Latin: each run picks the font that actually has the glyphs
(drawing Thai with a CJK font silently produces tofu boxes).
"""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
PAPER, INK, SOFT, ACCENT = (243, 242, 239), (34, 30, 24), (95, 90, 81), (191, 63, 41)
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def font(path, size, index=0):
    return ImageFont.truetype(path, size, index=index)


CJK = '/System/Library/Fonts/Hiragino Sans GB.ttc'
LAT = '/System/Library/Fonts/HelveticaNeue.ttc'
THAI = '/System/Library/Fonts/Supplemental/Thonburi.ttc'


def run(d, x, y, parts):
    """Draw [(text, font, colour), ...] on one baseline, returning the end x."""
    for text, f, colour in parts:
        d.text((x, y), text, font=f, fill=colour)
        x += d.textlength(text, font=f)
    return x


img = Image.new('RGB', (W, H), PAPER)
d = ImageDraw.Draw(img)

# wood board card (right), matching the app's board gradient
bx, by, bw, bh = 660, 60, 480, 510
wood = Image.new('RGB', (bw, bh))
wd = ImageDraw.Draw(wood)
for y in range(bh):
    t = y / bh
    wd.line([(0, y), (bw, y)],
            fill=(int(227 + (207 - 227) * t), int(189 + (159 - 189) * t), int(128 + (86 - 128) * t)))
mask = Image.new('L', (bw, bh), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, bw - 1, bh - 1], 28, fill=255)
img.paste(wood, (bx, by), mask)

n, pad = 5, 70
step = (bw - 2 * pad) // (n - 1)
gx0, gy0 = bx + pad, by + pad
for i in range(n):
    d.line([(gx0, gy0 + i * step), (gx0 + (n - 1) * step, gy0 + i * step)], fill=(91, 61, 28), width=3)
    d.line([(gx0 + i * step, gy0), (gx0 + i * step, gy0 + (n - 1) * step)], fill=(91, 61, 28), width=3)

# 碁石さん stones (art by とろろ, used with permission — credited on the card)
R = int(step * 0.46)
for cx, cy, colour, face in [(1, 1, 'black', 13), (2, 2, 'white', 11),
                             (3, 1, 'black', 2), (1, 3, 'white', 8), (3, 3, 'black', 7)]:
    st = Image.open(os.path.join(ROOT, f'assets/mascot/stone-{colour}-{face}.png')).convert('RGBA')
    st = st.resize((R * 2, R * 2), Image.LANCZOS)
    img.paste(st, (gx0 + cx * step - R, gy0 + cy * step - R), st)

# title — 囲碁 (Japanese), not 围棋: the app speaks TH/EN/JA, no Chinese
run(d, 70, 150, [('囲碁', font(CJK, 62), ACCENT),
                 (' Go ', font(LAT, 62, 2), INK),
                 ('หมากล้อม', font(THAI, 58), ACCENT)])
d.text((70, 240), 'learn & play', font=font(LAT, 27), fill=SOFT)

d.text((70, 304), '12 บทเรียน · เล่นกับบอทระดับดั้น', font=font(THAI, 26), fill=INK)
d.text((70, 348), '12 lessons · play a dan-level KataGo bot', font=font(LAT, 27), fill=INK)
run(d, 70, 392, [('ไทย', font(THAI, 26), SOFT),
                 (' / English / ', font(LAT, 27), SOFT),
                 ('日本語', font(CJK, 27), SOFT)])

d.rounded_rectangle([70, 456, 392, 514], 29, fill=ACCENT)
d.text((100, 472), 'go.soxylo.com', font=font(LAT, 27), fill=(255, 255, 255))

run(d, 70, 558, [('碁石さん', font(CJK, 19), SOFT),
                 (' © ', font(LAT, 19), SOFT),
                 ('とろろ', font(CJK, 19), SOFT),
                 ('  ·  tororoigo.web.fc2.com', font(LAT, 19), SOFT)])

out = os.path.join(ROOT, 'assets/og.png')
img.save(out, optimize=True)
print('wrote', out, img.size)
