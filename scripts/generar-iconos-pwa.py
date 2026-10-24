#!/usr/bin/env python3
"""
Genera los íconos de la app instalable (PWA) de ControlOne en public/iconos/:

  icon-192.png           Ícono normal 192×192 (Android, escritorio, atajos)
  icon-512.png           Ícono normal 512×512 (pantalla de bienvenida de Android)
  icon-maskable-512.png  Ícono «maskable» 512×512: fondo verde a sangre y el glifo dentro
                         de la zona segura (círculo del 80 %), para que Android lo recorte
                         en círculo, gota o cuadrado sin cortar el dibujo
  apple-touch-icon.png   180×180 para iOS (cuadrado sin transparencia: iOS redondea solo)

La marca es la misma del logotipo de la landing y de /acceso: cuadrado redondeado verde
SOTEC (#92D050) con un documento con check en grafito (#1F1F1F), como `FileCheck2` de
lucide y `src/app/icon.svg`. Se dibuja a 4× y se reduce con LANCZOS para bordes suaves.

Uso:  python3 scripts/generar-iconos-pwa.py      (requiere Pillow: pip install pillow)
"""

from pathlib import Path

from PIL import Image, ImageDraw

VERDE = (0x92, 0xD0, 0x50, 255)  # sotec.green (tailwind.config.ts)
GRAFITO = (0x1F, 0x1F, 0x1F, 255)  # sotec.DEFAULT
ESCALA = 4  # sobremuestreo para el antialias

SALIDA = Path(__file__).resolve().parent.parent / "public" / "iconos"


def glifo(d: ImageDraw.ImageDraw, cx: float, cy: float, alto: float) -> None:
    """Documento con la esquina doblada y un check, centrado en (cx, cy) con la altura dada."""
    ancho = alto * 0.78
    trazo = max(2, round(alto * 0.085))
    x0, y0 = cx - ancho / 2, cy - alto / 2
    x1, y1 = cx + ancho / 2, cy + alto / 2
    pliegue = ancho * 0.36
    # Contorno del documento (esquina superior derecha doblada)
    contorno = [(x0, y0), (x1 - pliegue, y0), (x1, y0 + pliegue), (x1, y1), (x0, y1), (x0, y0)]
    d.line(contorno, fill=GRAFITO, width=trazo, joint="curve")
    # Pliegue
    d.line([(x1 - pliegue, y0), (x1 - pliegue, y0 + pliegue), (x1, y0 + pliegue)], fill=GRAFITO, width=trazo, joint="curve")
    # Check
    check = [(cx - ancho * 0.26, cy + alto * 0.10), (cx - ancho * 0.06, cy + alto * 0.27), (cx + ancho * 0.28, cy - alto * 0.08)]
    d.line(check, fill=GRAFITO, width=trazo, joint="curve")
    # Extremos redondeados (Pillow no redondea las puntas de las líneas)
    r = trazo / 2
    for x, y in contorno + check:
        d.ellipse([x - r, y - r, x + r, y + r], fill=GRAFITO)


def icono(tam: int, *, maskable: bool = False, opaco: bool = False) -> Image.Image:
    """Ícono cuadrado de `tam` px. maskable/opaco: fondo verde a sangre; si no, cuadrado redondeado."""
    t = tam * ESCALA
    fondo = (0, 0, 0, 0) if not (maskable or opaco) else VERDE
    img = Image.new("RGBA", (t, t), fondo)
    d = ImageDraw.Draw(img)
    if not (maskable or opaco):
        # Cuadrado redondeado como el de la landing (radio ≈ 22 %), con un margen mínimo
        m = round(t * 0.04)
        d.rounded_rectangle([m, m, t - m, t - m], radius=round(t * 0.22), fill=VERDE)
        alto = t * 0.50
    else:
        # Maskable: el glifo cabe holgado dentro del círculo seguro (40 % de radio)
        alto = t * (0.42 if maskable else 0.50)
    glifo(d, t / 2, t / 2, alto)
    img = img.resize((tam, tam), Image.LANCZOS)
    return img.convert("RGB") if (maskable or opaco) else img


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    salidas = {
        "icon-192.png": icono(192),
        "icon-512.png": icono(512),
        "icon-maskable-512.png": icono(512, maskable=True),
        "apple-touch-icon.png": icono(180, opaco=True),
    }
    for nombre, img in salidas.items():
        img.save(SALIDA / nombre, optimize=True)
        print(f"public/iconos/{nombre}  {img.size[0]}×{img.size[1]}")


if __name__ == "__main__":
    main()
