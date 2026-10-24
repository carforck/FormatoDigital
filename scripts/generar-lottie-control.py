"""Genera public/lottie/control.json: ControlOne en el centro conectado con las áreas
de la empresa (documentos, aprobaciones, proyectos, equipos, cobros y personas).
Las conexiones se dibujan, los nodos aparecen y los datos viajan hacia el centro.

python3 scripts/generar-lottie-control.py
"""
import json
import math
from pathlib import Path

FR, OP, W, H = 30, 180, 520, 300
FADE = (164, 178)  # todo se desvanece antes de reiniciar el ciclo
EASE = {"i": {"x": [0.3], "y": [1]}, "o": {"x": [0.6], "y": [0]}}
LINEAL = {"i": {"x": [1], "y": [1]}, "o": {"x": [0], "y": [0]}}
VERDE, GRAFITO, NODO, BORDE = "#92D050", "#1F1F1F", "#2A2F2B", "#3F5A2A"
CX, CY = W / 2, H / 2


def hexc(h, a=1):
    h = h.lstrip("#")
    return [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)] + [a]


def st(v):
    return {"a": 0, "k": v}


def anim(*kfs, ease=EASE):
    return {"a": 1, "k": [{"t": t, "s": v if isinstance(v, list) else [v], **ease} for t, v in kfs]}


def tr():
    return {"ty": "tr", "p": st([0, 0]), "a": st([0, 0]), "s": st([100, 100]), "r": st(0), "o": st(100)}


def rect(w, h, color=None, r=4, x=0, y=0, stroke=None, sw=0):
    it = [{"ty": "rc", "d": 1, "s": st([w, h]), "p": st([x, y]), "r": st(r)}]
    if color:
        it.append({"ty": "fl", "c": st(hexc(color)), "o": st(100), "r": 1})
    if stroke:
        it.append({"ty": "st", "c": st(hexc(stroke)), "o": st(100), "w": st(sw), "lc": 2, "lj": 2})
    it.append(tr())
    return {"ty": "gr", "it": it}


def elipse(d, color=None, x=0, y=0, stroke=None, sw=0):
    it = [{"ty": "el", "d": 1, "s": st([d, d]), "p": st([x, y])}]
    if color:
        it.append({"ty": "fl", "c": st(hexc(color)), "o": st(100), "r": 1})
    if stroke:
        it.append({"ty": "st", "c": st(hexc(stroke)), "o": st(100), "w": st(sw), "lc": 2, "lj": 2})
    it.append(tr())
    return {"ty": "gr", "it": it}


def trazo(puntos, color, w, trim=None):
    n = len(puntos)
    it = [
        {"ty": "sh", "ks": st({"i": [[0, 0]] * n, "o": [[0, 0]] * n, "v": puntos, "c": False})},
        {"ty": "st", "c": st(hexc(color)), "o": st(100), "w": st(w), "lc": 2, "lj": 2},
    ]
    if trim:
        it.append({"ty": "tm", "s": st(0), "e": trim, "o": st(0), "m": 1})
    it.append(tr())
    return {"ty": "gr", "it": it}


capas = []


def capa(nombre, formas, p, o, s=None):
    capas.append({
        "ddd": 0, "ind": len(capas) + 1, "ty": 4, "nm": nombre, "sr": 1, "ip": 0, "op": OP, "st": 0, "bm": 0,
        "ks": {"o": o, "r": st(0), "p": p if isinstance(p, dict) else st(p), "a": st([0, 0, 0]), "s": s or st([100, 100, 100])},
        "shapes": formas,
    })


def aparece(t0, t1):
    return anim((0, 0), (t0, 0), (t1, 100), (FADE[0], 100), (FADE[1], 0))


def rebote(t):
    return anim((0, [0, 0, 100]), (t, [0, 0, 100]), (t + 9, [112, 112, 100]), (t + 15, [100, 100, 100]))


# Íconos sencillos dentro de cada nodo (en verde)
def ico_documento():
    return [rect(16, 3, VERDE, 1.5, 0, -6), rect(16, 3, VERDE, 1.5, 0, 0), rect(10, 3, VERDE, 1.5, -3, 6)]


def ico_check():
    return [trazo([[-8, 0], [-2, 6], [9, -6]], VERDE, 3.5)]


def ico_barras():
    return [rect(4, 8, VERDE, 1, -7, 4), rect(4, 14, VERDE, 1, 0, 1), rect(4, 20, VERDE, 1, 7, -2)]


def ico_engrane():
    return [elipse(16, stroke=VERDE, sw=3), elipse(5, VERDE)]


def ico_moneda():
    return [elipse(20, stroke=VERDE, sw=3), rect(3, 10, VERDE, 1)]


def ico_persona():
    return [elipse(8, VERDE, 0, -5), rect(16, 7, VERDE, 3.5, 0, 6)]


AREAS = [ico_documento, ico_check, ico_barras, ico_engrane, ico_moneda, ico_persona]
RX, RY = 195, 108
NODOS = []
for k in range(len(AREAS)):
    ang = math.radians(-90 + k * 60 + 30)
    NODOS.append((CX + RX * math.cos(ang), CY + RY * math.sin(ang)))

# El orden de las capas va de arriba hacia abajo: centro, nodos, datos, conexiones, pulsos

# Centro: ControlOne
capa(
    "centro",
    [
        rect(26, 5, GRAFITO, 2.5, 0, -8),
        rect(26, 5, GRAFITO, 2.5, 0, 0),
        rect(16, 5, GRAFITO, 2.5, -5, 8),
        rect(66, 66, VERDE, 16),
    ],
    [CX, CY, 0],
    aparece(0, 8),
    s=anim((0, [60, 60, 100]), (12, [108, 108, 100]), (20, [100, 100, 100])),
)

# Nodos de las áreas
for k, ((x, y), ico) in enumerate(zip(NODOS, AREAS)):
    t = 18 + k * 7
    capa(f"area-{k}", [*ico(), rect(48, 48, NODO, 12, stroke=BORDE, sw=2)], [x, y, 0], aparece(t, t + 6), s=rebote(t))

# Datos que viajan de cada área al centro (dos viajes por área)
for k, (x, y) in enumerate(NODOS):
    for v in range(2):
        t0 = 62 + k * 6 + v * 46
        t1 = t0 + 24
        if t1 > FADE[0]:
            continue
        capa(
            f"dato-{k}-{v}",
            [elipse(8, VERDE)],
            anim((0, [x, y, 0]), (t0, [x, y, 0]), (t1, [CX, CY, 0]), ease=LINEAL),
            anim((0, 0), (t0, 0), (t0 + 3, 100), (t1 - 3, 100), (t1, 0)),
        )

# Conexiones que se dibujan del centro hacia cada área
for k, (x, y) in enumerate(NODOS):
    t = 12 + k * 7
    capa(f"linea-{k}", [trazo([[CX, CY], [x, y]], BORDE, 2, trim=anim((0, 0), (t, 0), (t + 12, 100)))], [0, 0, 0], aparece(t, t + 2))

# Pulsos que salen del centro
for k, t in enumerate((24, 70, 116)):
    capa(
        f"pulso-{k}",
        [elipse(70, stroke=VERDE, sw=2)],
        [CX, CY, 0],
        anim((0, 0), (t, 0), (t + 2, 55), (t + 40, 0)),
        s=anim((0, [100, 100, 100]), (t, [100, 100, 100]), (t + 40, [230, 230, 100])),
    )

salida = Path(__file__).resolve().parent.parent / "public/lottie/control.json"
salida.write_text(json.dumps({"v": "5.7.4", "fr": FR, "ip": 0, "op": OP, "w": W, "h": H, "nm": "control", "ddd": 0, "assets": [], "layers": capas}, separators=(",", ":")))
print(f"{salida.name}: {salida.stat().st_size // 1024} KB, {len(capas)} capas")
