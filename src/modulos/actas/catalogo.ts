/**
 * Control documental, contenido inicial, listas y lectura de las tablas del acta de entrega
 * de Fortox (FORMA 7PA/F1-13). Funciones puras (sin React): se prueban en tests/unit/acta.test.ts.
 *
 * El asistente recibe las tablas en bloque, una fila por línea con «|» entre columnas:
 *   materiales  «Descripción | despacho | instalado | reintegro»
 *   zonas       «# zona | cantidad | descripción | partición»
 *   usuarios    «Nombre | Cargo | Usuario | Teléfono residencia | Celular» (la clave va aparte, oculta)
 *   particiones «# | nombre» o un nombre por línea (en orden)
 */

import type { InfoFormato } from "@/modulos/contrato";

import type { DatosActa, DiaActa, MaterialActa, SistemaActa, UsuarioActa, ZonaActa } from "./tipos";

/** Prefijo del consecutivo (ACT-001-26). */
export const PREFIJO_ACTA = "ACT";

/**
 * Control documental del módulo. Como es un formato propio de Fortox, el que se imprime es el
 * de la variante (FORMA 7PA/F1-13, @/nucleo/variantes): este queda para listados y títulos.
 */
export const FORMATO_ACTA: InfoFormato = {
  codigo: "7PA/F1-13",
  nombre: "Programación y acta de entrega del sistema de seguridad electrónica",
  version: "—",
  fecha: "—",
  corto: "Acta de entrega",
  el: "el",
  nuevo: "Nueva",
  plural: "actas de entrega",
};

/** Renglones del papel. */
export const MAX_MATERIALES = 12; // dos tablas de 6
export const MAX_ZONAS = 36;
export const MAX_PARTICIONES = 8;
export const MAX_USUARIOS = 27;

export const SISTEMAS_ACTA: SistemaActa[] = ["Alarma", "CCTV", "Control de Acceso", "Sistema de Detección de Incendios"];
export const DIAS_ACTA: DiaActa[] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo", "Festivos"];
/** Temas de capacitación con casilla (el cuarto es «Otro ¿Cuál?», texto aparte). */
export const TEMAS_CAPACITACION = ["Manejo del sistema de Seguridad Electrónica", "Creación y anulación de usuarios", "Manejo de clave de coacción"] as const;
/** Sugerencias del asistente (el técnico puede escribir otra). */
export const MEDIOS_COMUNICACION = ["Línea telefónica", "GPRS (Sim Card)", "Radio", "IP / Ethernet", "Wi-Fi"];
export const INTERVALOS_TEST = ["Cada 24 horas", "Cada 12 horas", "Cada 6 horas", "Cada hora"];
export const PANELES = ["DSC PowerSeries Neo HS2032", "Paradox SP6000", "Honeywell Vista 48", "Ajax Hub 2 Plus"];

/** Texto fijo del formato. */
export const DECLARACION_ACTA =
  "Como objeto de la presente Acta de Entrega, el cliente declara recibido a satisfacción el Sistema de Seguridad Electrónica, la información y entrenamiento necesario para su operación y conservación.";
export const NOTA_PERSONAL = "Diligencie en este espacio los datos de las personas que poseen clave del sistema para ingresar al inmueble en orden de prioridad";
export const CAPACITACION_TEXTO = "La capacitación suministrada para la operación y conservación del sistema de seguridad electrónica incluye temas como:";
/** VII. Control interno: lo firma Fortox en papel (se imprime en blanco). */
export const CONTROL_INTERNO: [string, string][] = [
  ["Datos del cliente registrados en Monitoreo", "Coord. Nacional Monitoreo"],
  ["Facturación del Cliente", "Auxiliar de Facturación"],
  ["Creación de carpeta del Cliente en Monitoreo", "Operador de Medios Tecnológicos"],
];
/** Sedes de Fortox del pie de la hoja 1 (tal cual el PDF). */
export const SEDES_FORTOX: [string, string][] = [
  ["Bogotá", "(1) 7477878"],
  ["Cali", "(2) 4874747"],
  ["Medellín", "(4) 6048718"],
  ["Pereira", "(6) 3401290"],
  ["Buenaventura", "(2) 2978607"],
  ["Barranquilla", "(5) 3854969"],
  ["Bucaramanga", "(7) 6976753"],
];

/** Acta en blanco con la fecha dada (el módulo pone el técnico). */
export function actaVacia(fecha: string): DatosActa {
  return {
    tipoActa: "",
    ciudad: "",
    fecha,
    proyecto: "",
    cliente: "",
    abonado: "",
    nit: "",
    an8: "",
    ciudadCliente: "",
    direccion: "",
    telefono: "",
    barrio: "",
    correo: "",
    contacto: "",
    cargo: "",
    panel: "",
    comunicacionPrimaria: "",
    simCard: "",
    comunicacionSecundaria: "",
    intervaloTest: "",
    claveMaestra: "",
    claveInstalador: "",
    materiales: [],
    sistemas: [],
    particiones: Array.from({ length: MAX_PARTICIONES }, () => ""),
    zonas: [],
    registro: "",
    usuarios: [],
    apertura: [],
    cierre: [],
    capacitacion: [],
    capacitacionOtro: "",
    observaciones: "",
    firmaCliente: "",
    nombreFirmaCliente: "",
    cedulaFirmaCliente: "",
    tecnico: "",
  };
}

// Contador de la sesión: dos filas creadas en el mismo milisegundo no repiten id
let seq = 0;
/** Id único para una fila nueva. */
export const idActa = (p: string) => `${p}-${Date.now().toString(36)}-${(++seq).toString(36)}`;

/** Fila de material en blanco. */
export const materialVacio = (): MaterialActa => ({ id: idActa("mt"), descripcion: "", despacho: "", instalado: "", reintegro: "" });
/** Usuario en blanco. */
export const usuarioVacio = (): UsuarioActa => ({ id: idActa("us"), nombre: "", cargo: "", usuario: "", claveTelefonica: "", telefono: "", celular: "" });

/** Partes de una línea separada por «|», sin viñetas ni espacios sobrantes. */
const partes = (linea: string) => linea.replace(/^[-•*]\s*/, "").split("|").map((s) => s.trim().replace(/\s+/g, " "));
/** Líneas con contenido. */
const lineas = (texto: string) => texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
/** Cantidad escrita (vacía o un número, con coma decimal). */
const esCantidad = (v: string) => v === "" || /^\d+([.,]\d+)?$/.test(v);
const comparable = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// ── Materiales ──────────────────────────────────────────────────────────────

/** «Sensor PIR | 4 | 4 | 0». */
export const lineaMaterial = (m: MaterialActa) => [m.descripcion, m.despacho, m.instalado, m.reintegro].join(" | ").replace(/( \| )+$/, "");

/** Lee los materiales «Descripción | despacho | instalado | reintegro» (las cantidades pueden ir vacías). */
export function leerMateriales(texto: string, previos: MaterialActa[] = []): { materiales: MaterialActa[]; errores: string[] } {
  const materiales: MaterialActa[] = [];
  const errores: string[] = [];
  lineas(texto).forEach((l, k) => {
    const [descripcion = "", despacho = "", instalado = "", reintegro = "", ...sobra] = partes(l);
    if (!descripcion) errores.push(`Línea ${k + 1}: falta la descripción.`);
    if (sobra.length) errores.push(`Línea ${k + 1}: sobran columnas (usa «Descripción | despacho | instalado | reintegro»).`);
    if (![despacho, instalado, reintegro].every(esCantidad)) errores.push(`Línea ${k + 1}: las cantidades deben ser números.`);
    const previo = previos.find((p) => comparable(p.descripcion) === comparable(descripcion) && !materiales.some((x) => x.id === p.id));
    materiales.push({ id: previo?.id ?? idActa("mt"), descripcion, despacho, instalado, reintegro });
  });
  if (materiales.length > MAX_MATERIALES) errores.push(`El formato trae ${MAX_MATERIALES} renglones de materiales (escribiste ${materiales.length}).`);
  return { materiales, errores };
}

// ── Zonas ───────────────────────────────────────────────────────────────────

/** «1 | 2 | Puerta principal | 1». */
export const lineaZona = (z: ZonaActa) => [String(z.numero), z.cantidad, z.descripcion, z.particion].join(" | ").replace(/( \| )+$/, "");

/**
 * Lee las zonas «# zona | cantidad | descripción | partición». Con dos columnas es «# | descripción»
 * y con tres «# | cantidad | descripción». Zona 1–36 sin repetir; partición 1–8 si se escribe.
 */
export function leerZonas(texto: string): { zonas: ZonaActa[]; errores: string[] } {
  const zonas: ZonaActa[] = [];
  const errores: string[] = [];
  lineas(texto).forEach((l, k) => {
    const p = partes(l);
    let [n = "", cantidad = "", descripcion = "", particion = ""] = p;
    if (p.length === 2) [n, descripcion, cantidad] = [p[0], p[1], ""];
    if (p.length > 4) errores.push(`Línea ${k + 1}: sobran columnas (usa «# zona | cantidad | descripción | partición»).`);
    const numero = Number(n.replace(/^#|^zona\s*/i, ""));
    if (!Number.isInteger(numero) || numero < 1 || numero > MAX_ZONAS) errores.push(`Línea ${k + 1}: la zona debe ser un número de 1 a ${MAX_ZONAS}.`);
    else if (zonas.some((z) => z.numero === numero)) errores.push(`Línea ${k + 1}: la zona ${numero} está repetida.`);
    if (!descripcion) errores.push(`Línea ${k + 1}: falta la descripción de la zona.`);
    if (!esCantidad(cantidad)) errores.push(`Línea ${k + 1}: la cantidad debe ser un número.`);
    if (particion && !/^[1-8]$/.test(particion)) errores.push(`Línea ${k + 1}: la partición debe ser de 1 a ${MAX_PARTICIONES}.`);
    zonas.push({ numero, cantidad, descripcion, particion });
  });
  return { zonas: zonas.sort((a, b) => a.numero - b.numero), errores };
}

// ── Particiones ─────────────────────────────────────────────────────────────

/** Una línea por partición con nombre: «1 | Oficinas». */
export const lineasParticiones = (ps: string[]) =>
  ps
    .map((n, i) => (n.trim() ? `${i + 1} | ${n.trim()}` : ""))
    .filter(Boolean)
    .join("\n");

/** Lee «# | nombre» o un nombre por línea (en orden). Devuelve siempre las 8 posiciones. */
export function leerParticiones(texto: string): { particiones: string[]; errores: string[] } {
  const particiones = Array.from({ length: MAX_PARTICIONES }, () => "");
  const errores: string[] = [];
  let siguiente = 0;
  lineas(texto).forEach((l, k) => {
    const p = partes(l);
    let i = siguiente;
    let nombre = p[0];
    if (p.length > 1) {
      i = Number(p[0]) - 1;
      nombre = p.slice(1).join(" ");
    }
    if (!Number.isInteger(i) || i < 0 || i >= MAX_PARTICIONES) return void errores.push(`Línea ${k + 1}: la partición debe ser de 1 a ${MAX_PARTICIONES}.`);
    if (!nombre) return void errores.push(`Línea ${k + 1}: falta el nombre de la partición.`);
    particiones[i] = nombre;
    siguiente = i + 1;
  });
  return { particiones, errores };
}

// ── Usuarios ────────────────────────────────────────────────────────────────

/** «Nombre | Cargo | Usuario | Teléfono | Celular» (sin la clave: va aparte y oculta). */
export const lineaUsuario = (u: UsuarioActa) => [u.nombre, u.cargo, u.usuario, u.telefono, u.celular].join(" | ").replace(/( \| )+$/, "");

/**
 * Lee los usuarios «Nombre | Cargo | Usuario | Teléfono residencia | Celular», en orden de prioridad.
 * Un usuario que ya estaba (mismo nombre) conserva su id y su clave telefónica.
 */
export function leerUsuarios(texto: string, previos: UsuarioActa[] = []): { usuarios: UsuarioActa[]; errores: string[] } {
  const usuarios: UsuarioActa[] = [];
  const errores: string[] = [];
  lineas(texto).forEach((l, k) => {
    const [nombre = "", cargo = "", usuario = "", telefono = "", celular = "", ...sobra] = partes(l);
    if (nombre.length < 3) errores.push(`Línea ${k + 1}: falta el nombre.`);
    if (sobra.length) errores.push(`Línea ${k + 1}: sobran columnas; la clave telefónica se pide en el paso siguiente (oculta).`);
    const previo = previos.find((p) => comparable(p.nombre) === comparable(nombre) && !usuarios.some((x) => x.id === p.id));
    usuarios.push({ id: previo?.id ?? idActa("us"), nombre, cargo, usuario, claveTelefonica: previo?.claveTelefonica ?? "", telefono, celular });
  });
  if (usuarios.length > MAX_USUARIOS) errores.push(`El formato trae ${MAX_USUARIOS} renglones de usuarios (escribiste ${usuarios.length}).`);
  return { usuarios, errores };
}

/** Fecha AAAA-MM-DD en las casillas AA · MM · DD del formato («26», «11», «17»). */
export function casillasFecha(fecha: string): [string, string, string] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha || "");
  return m ? [m[1].slice(2), m[2], m[3]] : ["", "", ""];
}
