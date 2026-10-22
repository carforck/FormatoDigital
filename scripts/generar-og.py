"""Genera la imagen para compartir el enlace (Open Graph): public/og.jpg, 1200×630.

    python3 scripts/generar-og.py

WhatsApp, LinkedIn y Facebook la muestran al pegar el enlace; se deja en JPEG
para que pese menos de 300 KB (WhatsApp ignora imágenes más pesadas).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

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

# Marca
d.rounded_rectangle((72, 64, 112, 104), radius=10, fill=VERDE)
d.text((92, 84), "F", font=fuente("Bold", 26), fill=GRAFITO, anchor="mm")
d.text((126, 84), "FormatoDigital", font=fuente("SemiBold", 30), fill=BLANCO, anchor="lm")

# Titular, con «cualquier formato» en verde
t = fuente("Bold", 64)
lineas = [[("Digitalizamos y", BLANCO)], [("optimizamos ", BLANCO), ("cualquier", VERDE)], [("formato", VERDE), (" de tu", BLANCO)], [("sistema de gestión.", BLANCO)]]
y = 170
for linea in lineas:
    x = 72
    for texto, color in linea:
        d.text((x, y), texto, font=t, fill=color)
        x += d.textlength(texto, font=t)
    y += 76

d.text((72, y + 22), "Reportes, permisos de trabajo, gastos y cuentas de cobro:", font=fuente("Regular", 26), fill=(205, 205, 205))
d.text((72, y + 58), "con firma, fotos y aprobación desde el celular.", font=fuente("Regular", 26), fill=(205, 205, 205))

# Caso de cliente: logo de SOTEC (variante para fondo oscuro) en una tarjeta
logo = Image.open(RAIZ / "public/sotec-logo-v3-oscuro.png").convert("RGBA")
logo = logo.crop(logo.getbbox())
logo.thumbnail((210, 96), Image.LANCZOS)
etiqueta = fuente("SemiBold", 16)
ancho = max(logo.width, round(d.textlength("CASO DE CLIENTE", font=etiqueta))) + 48
alto = logo.height + 76
x0, y0, x1, y1 = W - 64 - ancho, H - 56 - alto, W - 64, H - 56
sombra = Image.new("L", (W, H), 0)
ImageDraw.Draw(sombra).rounded_rectangle((x0, y0 + 6, x1, y1 + 6), radius=22, fill=160)
lienzo.paste((0, 0, 0), (0, 0), sombra.filter(ImageFilter.GaussianBlur(14)))
d = ImageDraw.Draw(lienzo)
d.rounded_rectangle((x0, y0, x1, y1), radius=22, fill=(20, 20, 20), outline=(72, 72, 72), width=2)
d.text(((x0 + x1) // 2, y0 + 30), "CASO DE CLIENTE", font=etiqueta, fill=VERDE, anchor="mm")
lienzo.paste(logo, ((x0 + x1 - logo.width) // 2, y0 + 52), logo)

salida = RAIZ / "public/og.jpg"
lienzo.save(salida, "JPEG", quality=86, optimize=True, progressive=True)
print(f"{salida.relative_to(RAIZ)}: {salida.stat().st_size // 1024} KB")
