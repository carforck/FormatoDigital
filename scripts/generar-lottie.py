"""Genera public/lottie/digitaliza.json: papel -> escáner -> celular -> check.

python3 scripts/generar-lottie.py
"""
import json
from pathlib import Path

FR, OP, W, H = 30, 180, 640, 480
FADE = (160, 175)  # todo se desvanece antes de reiniciar el ciclo
EASE = {"i": {"x": [0.3], "y": [1]}, "o": {"x": [0.6], "y": [0]}}


def hexc(h, a=1):
    h = h.lstrip("#")
    return [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)] + [a]


def st(v):
    return {"a": 0, "k": v}


def anim(*kfs):
    """kfs: (t, valor). Valores escalares o listas."""
    out = []
    for t, v in kfs:
        out.append({"t": t, "s": v if isinstance(v, list) else [v], **EASE})
    return {"a": 1, "k": out}


def opacidad(entra, sale=None):
    """Aparece en `entra` (t0, t1); opcionalmente se va en `sale`; siempre se apaga en FADE."""
    k = [(0, 0), (entra[0], 0), (entra[1], 100)]
    if sale:
        k += [(sale[0], 100), (sale[1], 0)]
    else:
        k += [(FADE[0], 100), (FADE[1], 0)]
    return anim(*k)


def rect(w, h, color, r=4, x=0, y=0, stroke=None, sw=0, op=100):
    it = [{"ty": "rc", "d": 1, "s": st([w, h]), "p": st([x, y]), "r": st(r)}]
    if color:
        it.append({"ty": "fl", "c": st(hexc(color)), "o": st(op), "r": 1})
    if stroke:
        it.append({"ty": "st", "c": st(hexc(stroke)), "o": st(100), "w": st(sw), "lc": 2, "lj": 2})
    it.append(tr())
    return {"ty": "gr", "it": it}


def elipse(d, color, x=0, y=0):
    return {"ty": "gr", "it": [{"ty": "el", "d": 1, "s": st([d, d]), "p": st([x, y])}, {"ty": "fl", "c": st(hexc(color)), "o": st(100), "r": 1}, tr()]}


def trazo(puntos, color, w, cerrado=False, trim=None):
    n = len(puntos)
    it = [
        {"ty": "sh", "ks": st({"i": [[0, 0]] * n, "o": [[0, 0]] * n, "v": puntos, "c": cerrado})},
        {"ty": "st", "c": st(hexc(color)), "o": st(100), "w": st(w), "lc": 2, "lj": 2},
    ]
    if trim:
        it.append({"ty": "tm", "s": st(0), "e": trim, "o": st(0), "m": 1})
    it.append(tr())
    return {"ty": "gr", "it": it}


def tr():
    return {"ty": "tr", "p": st([0, 0]), "a": st([0, 0]), "s": st([100, 100]), "r": st(0), "o": st(100)}


capas = []


def capa(nombre, formas, p, o, s=None, r=None, a=None, parent=None):
    ind = len(capas) + 1
    l = {
        "ddd": 0, "ind": ind, "ty": 4, "nm": nombre, "sr": 1, "ip": 0, "op": OP, "st": 0, "bm": 0,
        "ks": {"o": o, "r": r or st(0), "p": p if "a" in p else st(p), "a": st(a or [0, 0, 0]), "s": s or st([100, 100, 100])},
        "shapes": formas,
    }
    if parent:
        l["parent"] = parent
    capas.append(l)
    return ind


PAPEL_X, PAPEL_Y = 220, 240
TEL_X, TEL_Y = 500, 240
LINEAS_Y = [-55, -30, -5, 20, 45]
VERDE, GRAFITO = "#92D050", "#1F1F1F"

# --- Papel (la capa padre se define primero para tener su índice) ---
papel = capa(
    "papel",
    [
        rect(130, 7, "#D4D4D8", 3, 0, 75),  # zona de firma
        trazo([[-40, 62], [-25, 52], [-12, 64], [2, 50], [18, 60]], "#1d3b8a", 2),
        rect(120, 14, "#E4E4E7", 3, 0, -88),
        *[rect(130, 9, "#E4E4E7", 3, 0, y) for y in LINEAS_Y],
        rect(170, 220, "#FFFFFF", 8),
    ],
    anim((0, [-140, PAPEL_Y + 30, 0]), (28, [PAPEL_X, PAPEL_Y, 0])),
    opacidad((0, 8)),
    r=anim((0, -18), (28, -4), (40, -4), (60, 0)),
)

# Campos que se vuelven verdes cuando pasa el escáner (crecen desde la izquierda)
for k, y in enumerate(LINEAS_Y):
    t = int(32 + (y + 110) / 220 * 40)
    capa(
        f"campo-{k}",
        [rect(130, 9, VERDE, 3)],
        [-65, y, 0],
        opacidad((t - 1, t)),
        s=anim((0, [0, 100, 100]), (t, [0, 100, 100]), (t + 10, [100, 100, 100])),
        a=[-65, 0, 0],
        parent=papel,
    )

# Escáner: barra con halo que barre la hoja
capa(
    "escaner",
    [rect(200, 4, VERDE, 2), rect(200, 34, VERDE, 4, 0, -15, op=22)],
    anim((0, [0, -115, 0]), (30, [0, -115, 0]), (72, [0, 115, 0])),
    anim((0, 0), (30, 0), (34, 100), (68, 100), (74, 0)),
    parent=papel,
)

# --- Celular ---
tel = capa(
    "celular",
    [
        elipse(6, "#52525B", 0, -100),
        rect(118, 214, "#2A2A2A", 18, stroke="#FFFFFF", sw=3),
    ],
    [TEL_X, TEL_Y, 0],
    opacidad((48, 62)),
    s=anim((0, [80, 80, 100]), (48, [80, 80, 100]), (66, [100, 100, 100])),
)
for k in range(4):
    y = -70 + k * 30
    capa(f"tel-base-{k}", [rect(84, 12, "#3F3F46", 4)], [0, y, 0], opacidad((50, 62)), parent=tel)
    t = 84 + k * 8
    capa(
        f"tel-campo-{k}",
        [rect(84, 12, VERDE, 4)],
        [-42, y, 0],
        opacidad((t - 1, t)),
        s=anim((0, [0, 100, 100]), (t, [0, 100, 100]), (t + 12, [100, 100, 100])),
        a=[-42, 0, 0],
        parent=tel,
    )

# Check final
check = capa(
    "check-circulo",
    [elipse(46, VERDE)],
    [0, 68, 0],
    opacidad((114, 116)),
    s=anim((0, [0, 0, 100]), (114, [0, 0, 100]), (124, [118, 118, 100]), (132, [100, 100, 100])),
    parent=tel,
)
capa(
    "check-trazo",
    [trazo([[-10, 1], [-3, 8], [11, -7]], GRAFITO, 4.5, trim=anim((0, 0), (120, 0), (136, 100)))],
    [0, 0, 0],
    opacidad((119, 121)),
    parent=check,
)

# Datos viajando del papel al celular
for k in range(7):
    t0 = 62 + k * 5
    y0 = PAPEL_Y - 60 + k * 18
    capa(
        f"dato-{k}",
        [rect(10, 10, VERDE, 2)],
        anim((0, [PAPEL_X + 90, y0, 0]), (t0, [PAPEL_X + 90, y0, 0]), (t0 + 22, [TEL_X - 30, TEL_Y - 70 + (k % 4) * 30, 0])),
        opacidad((t0, t0 + 3), (t0 + 18, t0 + 23)),
        r=anim((0, 0), (t0, 0), (t0 + 22, 180)),
    )

# Destellos alrededor del check
for k, (dx, dy) in enumerate([(-38, 40), (38, 44), (-30, 100), (34, 98)]):
    capa(
        f"destello-{k}",
        [elipse(7, VERDE)],
        anim((0, [TEL_X, TEL_Y + 68, 0]), (124, [TEL_X, TEL_Y + 68, 0]), (140, [TEL_X + dx, TEL_Y + dy, 0])),
        opacidad((124, 126), (136, 146)),
    )

# En Lottie la primera capa queda encima: lo creado después va arriba,
# y el papel y el celular (bases) quedan al fondo.
orden = sorted(capas, key=lambda l: (l["nm"] in ("papel", "celular"), -l["ind"]))
data = {"v": "5.7.4", "fr": FR, "ip": 0, "op": OP, "w": W, "h": H, "nm": "digitaliza", "ddd": 0, "assets": [], "layers": orden}

out = Path(__file__).resolve().parent.parent / "public" / "lottie" / "digitaliza.json"
out.write_text(json.dumps(data, separators=(",", ":")))
print(out, len(capas), "capas", out.stat().st_size, "bytes")
