"""Genera public/controlone-logo.png: marca ControlOne para los formatos impresos
de la demo (fondo transparente, sobre papel blanco). En el modo empresa los
formatos llevan el logo de la empresa.

    python3 scripts/generar-logo-formato.py   (requiere Pillow)
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
FUENTES = RAIZ / "node_modules/geist/dist/fonts/geist-sans"
VERDE, VERDE_OSCURO, GRAFITO = (146, 208, 80), (63, 122, 18), (31, 31, 31)
ESC = 4  # se dibuja grande y se reduce para bordes suaves

W, H = 760 * ESC, 160 * ESC
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# Ícono: cuadro verde con un documento y un check (como en la landing)
s = 140 * ESC
x0, y0 = 10 * ESC, (H - s) // 2
d.rounded_rectangle((x0, y0, x0 + s, y0 + s), radius=34 * ESC, fill=VERDE)
dx, dy, dw, dh, pl = x0 + 40 * ESC, y0 + 26 * ESC, 60 * ESC, 88 * ESC, 18 * ESC
g = 8 * ESC
d.line([(dx, dy), (dx + dw - pl, dy), (dx + dw, dy + pl), (dx + dw, dy + dh), (dx, dy + dh), (dx, dy)], fill=GRAFITO, width=g, joint="curve")
d.line([(dx + dw - pl, dy), (dx + dw - pl, dy + pl), (dx + dw, dy + pl)], fill=GRAFITO, width=g, joint="curve")
d.line([(dx + 14 * ESC, dy + 54 * ESC), (dx + 26 * ESC, dy + 66 * ESC), (dx + 47 * ESC, dy + 42 * ESC)], fill=GRAFITO, width=g, joint="curve")

# Palabra: «Control» grafito + «One» verde oscuro (legible en papel)
f = ImageFont.truetype(str(FUENTES / "Geist-SemiBold.ttf"), 92 * ESC)
tx, ty = x0 + s + 30 * ESC, H // 2
d.text((tx, ty), "Control", font=f, fill=GRAFITO, anchor="lm")
d.text((tx + d.textlength("Control", font=f), ty), "One", font=f, fill=VERDE_OSCURO, anchor="lm")

img = img.crop(img.getbbox()).resize((img.getbbox()[2] // ESC - img.getbbox()[0] // ESC, (img.getbbox()[3] - img.getbbox()[1]) // ESC), Image.LANCZOS)
salida = RAIZ / "public/controlone-logo.png"
img.save(salida, optimize=True)
print(f"{salida.relative_to(RAIZ)}: {img.width}×{img.height}, {salida.stat().st_size // 1024} KB")
