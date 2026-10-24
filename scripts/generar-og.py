"""Genera la imagen para compartir el enlace (Open Graph): public/og.jpg, 1200×630.

    python3 scripts/generar-og.py

WhatsApp, LinkedIn y Facebook la muestran al pegar el enlace; se deja en JPEG
para que pese menos de 300 KB (WhatsApp ignora imágenes más pesadas).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
FUENTES = RAIZ / "node_modules/geist/dist/fonts/geist-sans"
W, H = 1200, 630
GRAFITO = (31, 31, 31)
VERDE = (146, 208, 80)
BLANCO = (255, 255, 255)


def fuente(peso: str, tam: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FUENTES / f"Geist-{peso}.ttf"), tam)


def cubrir(img: Image.Image, w: int, h: int) -> Image.Image:
    esc = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * esc), round(img.height * esc)), Image.LANCZOS)
    x, y = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((x, y, x + w, y + h))


lienzo = Image.new("RGB", (W, H), GRAFITO)

# Foto a la derecha, oscurecida y fundida hacia el texto
foto = cubrir(Image.open(RAIZ / "public/landing/tecnico-tablet-obra.webp").convert("RGB"), 720, H)
foto = Image.blend(foto, Image.new("RGB", foto.size, GRAFITO), 0.45)
fundido = Image.linear_gradient("L").rotate(90).resize((720, H))  # 0 a la izquierda → 255 a la derecha
lienzo.paste(foto, (W - 720, 0), fundido)

d = ImageDraw.Draw(lienzo)
d.rectangle((0, 0, 12, H), fill=VERDE)

# Marca: «Control» + «One» en verde, como en la landing
d.rounded_rectangle((72, 64, 112, 104), radius=10, fill=VERDE)
marca = fuente("SemiBold", 30)
d.text((126, 84), "Control", font=marca, fill=BLANCO, anchor="lm")
d.text((126 + d.textlength("Control", font=marca), 84), "One", font=marca, fill=VERDE, anchor="lm")

# Titular, con «un solo control» en verde
t = fuente("Bold", 72)
lineas = [[("Toda tu empresa,", BLANCO)], [("un solo control.", VERDE)]]
y = 200
for linea in lineas:
    x = 72
    for texto, color in linea:
        d.text((x, y), texto, font=t, fill=color)
        x += d.textlength(texto, font=t)
    y += 86

d.text((72, y + 30), "Formatos, reportes, aprobaciones, firmas, proyectos,", font=fuente("Regular", 28), fill=(205, 205, 205))
d.text((72, y + 70), "equipos y cuentas de cobro en una sola plataforma.", font=fuente("Regular", 28), fill=(205, 205, 205))

salida = RAIZ / "public/og.jpg"
lienzo.save(salida, "JPEG", quality=86, optimize=True, progressive=True)
print(f"{salida.relative_to(RAIZ)}: {salida.stat().st_size // 1024} KB")
