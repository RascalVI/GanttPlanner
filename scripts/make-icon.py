"""Generate the portable app icon from simple, scale-safe vector shapes."""

from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
SCALE = 4
SIZE = 256


def px(value: int) -> int:
    return value * SCALE


def box(*values: int) -> tuple[int, ...]:
    return tuple(px(value) for value in values)


image = Image.new("RGBA", (px(SIZE), px(SIZE)), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)

# A quiet blue gradient echoes the presentation cards.
for y in range(px(8), px(248)):
    mix = (y - px(8)) / px(240)
    color = tuple(round(a + (b - a) * mix) for a, b in zip((59, 103, 211), (113, 116, 223)))
    draw.line((px(8), y, px(248), y), fill=(*color, 255))
mask = Image.new("L", image.size, 0)
ImageDraw.Draw(mask).rounded_rectangle(box(8, 8, 248, 248), radius=px(53), fill=255)
image.putalpha(mask)
draw = ImageDraw.Draw(image)

# The staggered bars make the Gantt motif legible at taskbar sizes.
draw.rounded_rectangle(box(43, 65, 157, 95), radius=px(15), fill="#F7FBFF")
draw.rounded_rectangle(box(91, 113, 211, 143), radius=px(15), fill="#BDE3FF")
draw.rounded_rectangle(box(61, 161, 179, 191), radius=px(15), fill="#F7FBFF")

icon = image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
(ROOT / "assets").mkdir(exist_ok=True)
(ROOT / "public").mkdir(exist_ok=True)
icon.save(ROOT / "assets" / "app-icon.png")
icon.save(ROOT / "public" / "app-icon.png")
icon.save(ROOT / "assets" / "app.ico", sizes=[
    (256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16),
])
