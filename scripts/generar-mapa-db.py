#!/usr/bin/env python3
"""
Genera el esquema de la base de datos para el «Mapa del sistema» (/app/mapa).

Lee `supabase/migrations/*.sql` en orden y reproduce el DDL que afecta la
forma de las tablas:

  - CREATE TABLE (columnas, PK y FK en línea o como restricción de tabla)
  - ALTER TABLE: ADD/DROP COLUMN, ADD CONSTRAINT (PK, FK, UNIQUE),
    ALTER COLUMN (TYPE, SET/DROP NOT NULL, SET/DROP DEFAULT), RENAME COLUMN,
    RENAME TO, ENABLE ROW LEVEL SECURITY
  - DROP TABLE

y escribe `src/components/mapa/esquema.json` (determinista: mismo SQL, mismo
archivo; sin fechas). Las tablas de `auth` que se referencian (auth.users) se
agregan como tablas externas de Supabase.

Uso:
    python3 scripts/generar-mapa-db.py           # escribe el JSON
    python3 scripts/generar-mapa-db.py --check   # falla si el JSON está desactualizado
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
MIGRACIONES = RAIZ / "supabase" / "migrations"
SALIDA = RAIZ / "src" / "components" / "mapa" / "esquema.json"

# Palabras que terminan el tipo de una columna
FIN_TIPO = {
    "not", "null", "default", "primary", "references", "unique", "check",
    "generated", "constraint", "collate",
}
INICIO_RESTRICCION = ("constraint", "primary", "foreign", "unique", "check", "exclude")


# ---------------------------------------------------------------------------
# Lectura: separa sentencias respetando comentarios, cadenas y $$…$$
# ---------------------------------------------------------------------------
def sentencias(sql: str) -> list[tuple[str, list[str]]]:
    """Devuelve [(sentencia sin comentarios, comentarios que la preceden)]."""
    salida: list[tuple[str, list[str]]] = []
    buf: list[str] = []
    comentarios: list[str] = []
    i, n = 0, len(sql)
    while i < n:
        c = sql[i]
        if sql.startswith("--", i):
            fin = sql.find("\n", i)
            fin = n if fin < 0 else fin
            if not "".join(buf).strip():
                comentarios.append(sql[i + 2:fin].strip())
            i = fin
            continue
        if sql.startswith("/*", i):
            fin = sql.find("*/", i + 2)
            i = n if fin < 0 else fin + 2
            continue
        if c == "'":
            j = i + 1
            while j < n:
                if sql[j] == "'" and j + 1 < n and sql[j + 1] == "'":
                    j += 2
                    continue
                if sql[j] == "'":
                    break
                j += 1
            buf.append(sql[i:j + 1])
            i = j + 1
            continue
        if c == "$":
            m = re.match(r"\$[A-Za-z_]*\$", sql[i:])
            if m:
                tag = m.group(0)
                fin = sql.find(tag, i + len(tag))
                fin = n if fin < 0 else fin + len(tag)
                buf.append(sql[i:fin])
                i = fin
                continue
        if c == ";":
            texto = "".join(buf).strip()
            if texto:
                salida.append((texto, comentarios))
            buf, comentarios = [], []
            i += 1
            continue
        buf.append(c)
        i += 1
    texto = "".join(buf).strip()
    if texto:
        salida.append((texto, comentarios))
    return salida


def partir_nivel_superior(texto: str, sep: str = ",") -> list[str]:
    """Parte por `sep` fuera de paréntesis y cadenas."""
    partes, buf, prof, en_cadena = [], [], 0, False
    for c in texto:
        if c == "'":
            en_cadena = not en_cadena
        elif not en_cadena:
            if c == "(":
                prof += 1
            elif c == ")":
                prof -= 1
            elif c == sep and prof == 0:
                partes.append("".join(buf).strip())
                buf = []
                continue
        buf.append(c)
    if "".join(buf).strip():
        partes.append("".join(buf).strip())
    return partes


def parentesis(texto: str, desde: int) -> tuple[str, int]:
    """Contenido del paréntesis que abre en `desde` y la posición tras cerrarlo."""
    prof, en_cadena = 0, False
    for j in range(desde, len(texto)):
        c = texto[j]
        if c == "'":
            en_cadena = not en_cadena
        elif not en_cadena:
            if c == "(":
                prof += 1
            elif c == ")":
                prof -= 1
                if prof == 0:
                    return texto[desde + 1:j], j + 1
    return texto[desde + 1:], len(texto)


def ident(nombre: str) -> str:
    return nombre.strip().strip('"')


def nombre_tabla(crudo: str) -> str:
    """public.x → x; auth.users → auth.users."""
    partes = [ident(p) for p in crudo.split(".")]
    if len(partes) == 2 and partes[0].lower() == "public":
        return partes[1]
    return ".".join(partes)


def lista_columnas(texto: str) -> list[str]:
    return [ident(c) for c in texto.split(",") if c.strip()]


RE_REF = re.compile(
    r"references\s+([\w\".]+)\s*(?:\(([^)]*)\))?((?:\s+on\s+(?:delete|update)\s+(?:set\s+null|set\s+default|cascade|restrict|no\s+action))*)",
    re.I,
)


def leer_ref(texto: str) -> dict | None:
    m = RE_REF.search(texto)
    if not m:
        return None
    acciones = m.group(3) or ""
    al_borrar = re.search(r"on\s+delete\s+(set\s+null|set\s+default|cascade|restrict|no\s+action)", acciones, re.I)
    cols = lista_columnas(m.group(2)) if m.group(2) else ["id"]
    return {
        "tabla": nombre_tabla(m.group(1)),
        "columnas": cols,
        "alBorrar": re.sub(r"\s+", " ", al_borrar.group(1).lower()) if al_borrar else None,
    }


# ---------------------------------------------------------------------------
# Modelo
# ---------------------------------------------------------------------------
class Esquema:
    def __init__(self) -> None:
        self.tablas: dict[str, dict] = {}
        self.orden: list[str] = []

    # -- columnas -----------------------------------------------------------
    def columna(self, definicion: str) -> dict:
        tokens = definicion.split()
        nombre = ident(tokens[0])
        resto = definicion[len(tokens[0]):].strip()
        # Tipo: hasta la primera palabra clave de restricción (fuera de paréntesis)
        tipo_tokens, prof, pos = [], 0, 0
        for m in re.finditer(r"\S+", resto):
            t = m.group(0)
            if prof == 0 and t.lower().split("(")[0] in FIN_TIPO:
                pos = m.start()
                break
            tipo_tokens.append(t)
            prof += t.count("(") - t.count(")")
            pos = m.end()
        tipo = re.sub(r"\s+", " ", " ".join(tipo_tokens)).lower()
        tipo = re.sub(r"\s*,\s*", ",", tipo)
        mods = resto[pos:]
        baja = mods.lower()
        col = {
            "nombre": nombre,
            "tipo": tipo,
            "pk": bool(re.search(r"\bprimary\s+key\b", baja)),
            "nulo": not re.search(r"\bnot\s+null\b", baja),
            "unico": bool(re.search(r"\bunique\b", baja)),
            "fk": None,
        }
        if re.search(r"\bgenerated\s+(always|by\s+default)\s+as\s+identity\b", baja):
            col["defecto"] = "identity"
        elif re.search(r"\bgenerated\s+always\s+as\s*\(", baja):
            col["defecto"] = "generada"
        else:
            d = re.search(r"\bdefault\s+(.+?)(?=\s+(?:not\s+null|null|primary|references|unique|check|constraint|generated)\b|$)", mods, re.I | re.S)
            if d:
                col["defecto"] = re.sub(r"\s+", " ", d.group(1).strip())
        ref = leer_ref(mods)
        if ref:
            col["fk"] = {"tabla": ref["tabla"], "columna": ref["columnas"][0], "alBorrar": ref["alBorrar"]}
        if col["pk"]:
            col["nulo"] = False
        return col

    def buscar(self, tabla: str, columna: str) -> dict | None:
        t = self.tablas.get(tabla)
        if not t:
            return None
        return next((c for c in t["columnas"] if c["nombre"] == columna), None)

    def restriccion(self, tabla: str, texto: str) -> None:
        t = self.tablas.get(tabla)
        if not t:
            return
        cuerpo = re.sub(r"^constraint\s+[\w\"]+\s+", "", texto.strip(), flags=re.I)
        baja = cuerpo.lower()
        if baja.startswith("primary key"):
            cols, _ = parentesis(cuerpo, cuerpo.index("("))
            for c in lista_columnas(cols):
                col = self.buscar(tabla, c)
                if col:
                    col["pk"] = True
                    col["nulo"] = False
        elif baja.startswith("foreign key"):
            cols, fin = parentesis(cuerpo, cuerpo.index("("))
            ref = leer_ref(cuerpo[fin:])
            if ref:
                for c, destino in zip(lista_columnas(cols), ref["columnas"]):
                    col = self.buscar(tabla, c)
                    if col:
                        col["fk"] = {"tabla": ref["tabla"], "columna": destino, "alBorrar": ref["alBorrar"]}
        elif baja.startswith("unique"):
            i = cuerpo.find("(")
            if i >= 0:
                cols = lista_columnas(parentesis(cuerpo, i)[0])
                if len(cols) == 1:
                    col = self.buscar(tabla, cols[0])
                    if col:
                        col["unico"] = True
                else:
                    t.setdefault("unicos", []).append(cols)

    # -- sentencias ---------------------------------------------------------
    def crear(self, sql: str, comentarios: list[str], archivo: str) -> None:
        m = re.match(r"create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?([\w\".]+)\s*\(", sql, re.I)
        if not m:
            return
        tabla = nombre_tabla(m.group(1))
        if tabla in self.tablas and re.search(r"if\s+not\s+exists", sql[: m.end()], re.I):
            return
        cuerpo, _ = parentesis(sql, m.end() - 1)
        # Último bloque de comentario antes de la tabla (sin las líneas separadoras)
        bloque: list[str] = []
        for c in reversed(comentarios):
            if not c or re.fullmatch(r"[-=\s]*", c):
                if bloque:
                    break
                continue
            bloque.insert(0, c)
        desc = " ".join(bloque)
        self.tablas[tabla] = {
            "nombre": tabla,
            "esquema": "auth" if tabla.startswith("auth.") else "public",
            "columnas": [],
            "migracion": archivo,
            "descripcion": desc,
            "rls": False,
            "externa": False,
        }
        if tabla not in self.orden:
            self.orden.append(tabla)
        pendientes = []
        for parte in partir_nivel_superior(cuerpo):
            if parte.lower().startswith(INICIO_RESTRICCION):
                pendientes.append(parte)
            elif parte.lower().startswith("like "):
                continue
            else:
                self.tablas[tabla]["columnas"].append(self.columna(parte))
        for p in pendientes:
            self.restriccion(tabla, p)

    def alterar(self, sql: str) -> None:
        m = re.match(r"alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([\w\".]+)\s+(.*)$", sql, re.I | re.S)
        if not m:
            return
        tabla = nombre_tabla(m.group(1))
        t = self.tablas.get(tabla)
        if not t:
            return
        resto = m.group(2).strip()
        rt = re.match(r"rename\s+to\s+([\w\"]+)", resto, re.I)
        if rt:
            nuevo = ident(rt.group(1))
            self.tablas[nuevo] = self.tablas.pop(tabla)
            self.tablas[nuevo]["nombre"] = nuevo
            self.orden[self.orden.index(tabla)] = nuevo
            for otra in self.tablas.values():
                for c in otra["columnas"]:
                    if c["fk"] and c["fk"]["tabla"] == tabla:
                        c["fk"]["tabla"] = nuevo
            return
        for accion in partir_nivel_superior(resto):
            baja = accion.lower()
            if re.match(r"enable\s+row\s+level\s+security", baja):
                t["rls"] = True
            elif re.match(r"disable\s+row\s+level\s+security", baja):
                t["rls"] = False
            elif baja.startswith("add constraint") or re.match(r"add\s+(primary|foreign|unique)", baja):
                self.restriccion(tabla, re.sub(r"^add\s+", "", accion, flags=re.I))
            elif baja.startswith("add"):
                d = re.sub(r"^add\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?", "", accion, flags=re.I)
                col = self.columna(d)
                if not self.buscar(tabla, col["nombre"]):
                    t["columnas"].append(col)
            elif baja.startswith("drop constraint"):
                continue
            elif baja.startswith("drop"):
                d = re.match(r"drop\s+(?:column\s+)?(?:if\s+exists\s+)?([\w\"]+)", accion, re.I)
                if d:
                    nombre = ident(d.group(1))
                    t["columnas"] = [c for c in t["columnas"] if c["nombre"] != nombre]
            elif baja.startswith("rename"):
                r = re.match(r"rename\s+(?:column\s+)?([\w\"]+)\s+to\s+([\w\"]+)", accion, re.I)
                if r:
                    col = self.buscar(tabla, ident(r.group(1)))
                    if col:
                        col["nombre"] = ident(r.group(2))
            elif baja.startswith("alter"):
                a = re.match(r"alter\s+(?:column\s+)?([\w\"]+)\s+(.*)$", accion, re.I | re.S)
                if not a:
                    continue
                col = self.buscar(tabla, ident(a.group(1)))
                if not col:
                    continue
                op = a.group(2).strip()
                opb = op.lower()
                if opb.startswith("set not null"):
                    col["nulo"] = False
                elif opb.startswith("drop not null"):
                    col["nulo"] = True
                elif opb.startswith("drop default"):
                    col.pop("defecto", None)
                elif opb.startswith("set default"):
                    col["defecto"] = re.sub(r"\s+", " ", op[len("set default"):].strip())
                elif opb.startswith(("type", "set data type")):
                    tipo = re.sub(r"^(set\s+data\s+)?type\s+", "", op, flags=re.I)
                    tipo = re.split(r"\s+using\s+|\s+collate\s+", tipo, flags=re.I)[0]
                    col["tipo"] = re.sub(r"\s*,\s*", ",", re.sub(r"\s+", " ", tipo.strip().lower()))

    def borrar(self, sql: str) -> None:
        m = re.match(r"drop\s+table\s+(?:if\s+exists\s+)?(.+?)(?:\s+(?:cascade|restrict))?$", sql, re.I | re.S)
        if not m:
            return
        for crudo in m.group(1).split(","):
            tabla = nombre_tabla(crudo)
            if tabla in self.tablas:
                del self.tablas[tabla]
                self.orden.remove(tabla)
                # CASCADE elimina las FK que apuntaban a la tabla (la columna queda)
                for otra in self.tablas.values():
                    for c in otra["columnas"]:
                        if c["fk"] and c["fk"]["tabla"] == tabla:
                            c["fk"] = None

    # -- salida -------------------------------------------------------------
    def resultado(self, archivos: list[str]) -> dict:
        # Tablas de Supabase referenciadas que no se crean en las migraciones
        externas = sorted({c["fk"]["tabla"] for t in self.tablas.values() for c in t["columnas"] if c["fk"] and c["fk"]["tabla"] not in self.tablas})
        tablas = [self.tablas[n] for n in self.orden]
        for ext in externas:
            esquema = ext.split(".")[0] if "." in ext else "public"
            cols = {c["fk"]["columna"] for t in tablas for c in t["columnas"] if c["fk"] and c["fk"]["tabla"] == ext}
            tablas.append({
                "nombre": ext,
                "esquema": esquema,
                "columnas": [{"nombre": c, "tipo": "uuid", "pk": c == "id", "nulo": False, "unico": False, "fk": None} for c in sorted(cols)],
                "migracion": None,
                "descripcion": "Tabla administrada por Supabase Auth" if esquema == "auth" else "Tabla externa",
                "rls": False,
                "externa": True,
            })
        relaciones = []
        for t in tablas:
            for c in t["columnas"]:
                if c["fk"]:
                    relaciones.append({
                        "id": f'{t["nombre"]}.{c["nombre"]}->{c["fk"]["tabla"]}.{c["fk"]["columna"]}',
                        "desde": t["nombre"],
                        "columna": c["nombre"],
                        "hacia": c["fk"]["tabla"],
                        "columnaDestino": c["fk"]["columna"],
                        "alBorrar": c["fk"]["alBorrar"],
                        "nulo": c["nulo"],
                    })
        return {
            "$comentario": "Generado por scripts/generar-mapa-db.py a partir de supabase/migrations. No editar a mano.",
            "migraciones": archivos,
            "tablas": tablas,
            "relaciones": relaciones,
        }


def generar() -> str:
    esquema = Esquema()
    archivos = sorted(p.name for p in MIGRACIONES.glob("*.sql"))
    for nombre in archivos:
        sql = (MIGRACIONES / nombre).read_text(encoding="utf-8")
        for texto, comentarios in sentencias(sql):
            plano = re.sub(r"\s+", " ", texto).strip()
            baja = plano.lower()
            if re.match(r"create\s+(unlogged\s+)?table\b", baja):
                esquema.crear(texto, comentarios, nombre)
            elif baja.startswith("alter table"):
                esquema.alterar(plano)
            elif baja.startswith("drop table"):
                esquema.borrar(plano)
    return json.dumps(esquema.resultado(archivos), ensure_ascii=False, indent=2) + "\n"


def main() -> int:
    contenido = generar()
    if "--check" in sys.argv:
        actual = SALIDA.read_text(encoding="utf-8") if SALIDA.exists() else ""
        if actual != contenido:
            print(f"{SALIDA.relative_to(RAIZ)} está desactualizado: python3 scripts/generar-mapa-db.py")
            return 1
        print("Esquema al día.")
        return 0
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(contenido, encoding="utf-8")
    datos = json.loads(contenido)
    print(f"{SALIDA.relative_to(RAIZ)}: {len(datos['tablas'])} tablas, {len(datos['relaciones'])} relaciones, {len(datos['migraciones'])} migraciones")
    return 0


if __name__ == "__main__":
    sys.exit(main())
