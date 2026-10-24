/**
 * Catálogos de la cotización: control documental, IVA, unidades, servicios con
 * precios de referencia, condiciones sugeridas, contenido inicial y la lectura de
 * ítems escritos en texto (paso «items» del asistente).
 */

import type { InfoFormato } from "@/modulos/contrato";

import { cantidadTexto, sumarDias } from "./calculos";
import type { DatosCotizacion, ItemCotizacion } from "./tipos";

/** Prefijo del consecutivo (COT-001-26). */
export const PREFIJO_COTIZACION = "COT";

/**
 * Control documental de la cotización. El código definitivo lo asigna SOTEC
 * en su sistema de gestión: cambiarlo aquí basta.
 */
export const FORMATO_COTIZACION: InfoFormato = {
  codigo: "FO-COM-01 (por confirmar)",
  nombre: "Cotización",
  version: "01",
  fecha: "01/10/2026",
  corto: "Cotización",
  el: "la",
  nuevo: "Nueva",
  plural: "cotizaciones",
};

/** IVA general en Colombia. */
export const IVA_GENERAL = 19;
/** Tarifas de IVA que ofrece el selector de cada línea. */
export const TARIFAS_IVA = [19, 5, 0] as const;

/** Días de validez por defecto (vencimiento = fecha + 30). */
export const DIAS_VALIDEZ = 30;

/**
 * Datos de la empresa que salen en el encabezado y el pie. Solo el correo y la
 * web son públicos y fijos; teléfono y NIT son valores de ejemplo que se
 * reemplazan con la configuración de la organización (prop `empresa`).
 */
export interface EmpresaCotizacion {
  nombre: string;
  lema: string;
  /** Líneas de la dirección (bloque derecho del encabezado). */
  direccion: string[];
  telefonos: string;
  correo: string;
  web: string;
  /** Con el prefijo «NIT». */
  nit: string;
}

/** Valores por defecto de la empresa (los de Configuración tienen prioridad). */
export const EMPRESA_COTIZACION: EmpresaCotizacion = {
  nombre: "SOTEC",
  lema: "Tu acceso eficaz a la seguridad electrónica",
  direccion: ["Cartagena de Indias, Bolívar", "Colombia"],
  telefonos: "300 000 0000",
  correo: "info@sotecse.com",
  web: "www.sotecse.com",
  nit: "NIT 900.000.000-0",
};

/** Unidades de medida (en plural, como en el formato: «32,00 Unidades»). */
export const UNIDADES = ["Unidades", "Metros", "Puntos", "Servicios", "Visitas", "Horas", "Global"] as const;

/** Servicio del catálogo que se convierte en una línea de la cotización. */
export interface ServicioCatalogo {
  clave: string;
  descripcion: string;
  detalle?: string;
  unidad: string;
  /** Precio de referencia sin IVA; se ajusta en cada cotización. */
  precioReferencia: number;
  ivaPct: number;
}

/**
 * Servicios típicos de SOTEC con PRECIOS DE REFERENCIA (sin IVA) para agilizar
 * la cotización. No son una lista de precios oficial: se revisan en cada caso.
 */
export const CATALOGO_SERVICIOS: ServicioCatalogo[] = [
  { clave: "mant-cctv", descripcion: "Mantenimiento preventivo punto CCTV", detalle: "Hasta 3 m de altura", unidad: "Puntos", precioReferencia: 30_000, ivaPct: IVA_GENERAL },
  { clave: "mant-grabador", descripcion: "Mantenimiento preventivo grabador", detalle: "DVR/NVR, gabinete y fuente", unidad: "Unidades", precioReferencia: 90_000, ivaPct: IVA_GENERAL },
  { clave: "inst-camara", descripcion: "Instalación de cámara IP", detalle: "Incluye fijación, conectorización y ajuste de visual", unidad: "Unidades", precioReferencia: 120_000, ivaPct: IVA_GENERAL },
  { clave: "cableado", descripcion: "Cableado UTP categoría 6", detalle: "Incluye canaleta o tubería EMT", unidad: "Metros", precioReferencia: 6_500, ivaPct: IVA_GENERAL },
  { clave: "config-nvr", descripcion: "Configuración de NVR y acceso remoto", detalle: "Grabación, usuarios y app móvil", unidad: "Servicios", precioReferencia: 250_000, ivaPct: IVA_GENERAL },
  { clave: "control-acceso", descripcion: "Instalación de control de acceso", detalle: "Lector biométrico, cerradura y botón de salida", unidad: "Unidades", precioReferencia: 650_000, ivaPct: IVA_GENERAL },
  { clave: "mant-cerca", descripcion: "Mantenimiento preventivo cerca eléctrica", detalle: "Energizador, aisladores y tensión del cable", unidad: "Servicios", precioReferencia: 180_000, ivaPct: IVA_GENERAL },
  { clave: "visita", descripcion: "Visita técnica de diagnóstico", unidad: "Visitas", precioReferencia: 80_000, ivaPct: IVA_GENERAL },
];

/** Condiciones comerciales sugeridas (editables en el formato y en el asistente). */
export const SUGERENCIAS_FORMA_PAGO = ["50 % de anticipo y 50 % contra entrega", "Contado contra entrega", "Crédito a 30 días con orden de compra"];
export const SUGERENCIAS_TIEMPO_ENTREGA = ["5 días hábiles después de la aprobación", "Inmediato, según disponibilidad", "15 días hábiles después del anticipo"];
export const SUGERENCIAS_GARANTIA = ["6 meses sobre mano de obra; equipos según el fabricante", "12 meses sobre equipos y mano de obra", "3 meses sobre mano de obra"];

/** Condiciones con que arranca una cotización nueva (la primera sugerencia de cada una). */
export const CONDICIONES_DEFECTO = {
  formaPago: SUGERENCIAS_FORMA_PAGO[0],
  tiempoEntrega: SUGERENCIAS_TIEMPO_ENTREGA[0],
  garantia: SUGERENCIAS_GARANTIA[0],
};

/** Cotización en blanco: vence a los `DIAS_VALIDEZ` días y trae las condiciones por defecto. */
export function cotizacionVacia(fecha: string): DatosCotizacion {
  return {
    fecha,
    vencimiento: sumarDias(fecha, DIAS_VALIDEZ),
    vendedor: "",
    cliente: "",
    clienteNit: "",
    contacto: "",
    correo: "",
    telefono: "",
    direccion: "",
    asunto: "",
    items: [],
    ...CONDICIONES_DEFECTO,
    validez: "",
    observaciones: "",
    aceptaNombre: "",
    aceptaCargo: "",
    aceptaFecha: "",
    firmaCliente: "",
  };
}

// Contador de la sesión: dos líneas creadas en el mismo milisegundo no repiten id
let seq = 0;
/** Id único para una línea nueva. */
export const idItem = () => `cot-${Date.now().toString(36)}-${(++seq).toString(36)}`;

/** Línea nueva en blanco (1 unidad, IVA general). */
export function itemVacio(): ItemCotizacion {
  return { id: idItem(), descripcion: "", detalle: "", cantidad: 1, unidad: "Unidades", precioUnitario: 0, ivaPct: IVA_GENERAL };
}

/** Línea nueva a partir de un servicio del catálogo, con su precio de referencia. */
export function itemDeCatalogo(s: ServicioCatalogo, cantidad = 1): ItemCotizacion {
  return { id: idItem(), descripcion: s.descripcion, detalle: s.detalle ?? "", cantidad, unidad: s.unidad, precioUnitario: s.precioReferencia, ivaPct: s.ivaPct };
}

/** Texto de la opción del catálogo en el asistente. */
export const etiquetaServicio = (s: ServicioCatalogo) =>
  `${s.descripcion}${s.detalle ? ` (${s.detalle.toLowerCase()})` : ""} · ref. $ ${s.precioReferencia.toLocaleString("es-CO")}/${s.unidad.toLowerCase().replace(/es$|s$/, "")}`;

/* ---------- Ítems en texto (paso «items» del asistente) ---------- */

const quitarTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** «32,5» o «32.5» → 32.5; «1.200» (miles) → 1200; «$ 30.000» → 30000. */
export function leerNumero(s: string, decimales: boolean): number {
  const t = s.replace(/[$\s]/g, "");
  if (!t) return NaN;
  if (decimales) {
    // Coma decimal es-CO; un punto con 1-2 decimales también se acepta
    if (/^\d+(,\d+)?$/.test(t)) return Number(t.replace(",", "."));
    if (/^\d+\.\d{1,2}$/.test(t)) return Number(t);
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return Number(t.replace(/\./g, "").replace(",", "."));
    return NaN;
  }
  if (/^\d{1,3}([.,]\d{3})+$/.test(t)) return Number(t.replace(/[.,]/g, ""));
  return /^\d+$/.test(t) ? Number(t) : NaN;
}

/** Unidad del catálogo que corresponde a lo escrito: sin tildes, singular o plural, o un prefijo de 3+ letras. */
function unidadDe(token: string): string | undefined {
  const t = quitarTildes(token);
  if (!t) return undefined;
  return UNIDADES.find((u) => {
    const q = quitarTildes(u);
    return q === t || q.replace(/es$|s$/, "") === t.replace(/es$|s$/, "") || (t.length >= 3 && q.startsWith(t));
  });
}

/** Una línea por ítem: «32 puntos x Mantenimiento preventivo punto CCTV | Hasta 3 m @ 30.000 [19%]». */
export function lineaDeItem(i: ItemCotizacion): string {
  const cant = cantidadTexto(i.cantidad).replace(/,00$/, "");
  return `${cant} ${i.unidad.toLowerCase()} x ${i.descripcion}${i.detalle ? ` | ${i.detalle}` : ""} @ ${i.precioUnitario.toLocaleString("es-CO")}${i.ivaPct !== IVA_GENERAL ? ` [${i.ivaPct}%]` : ""}`;
}

/** Resultado de `leerItems`: los ítems leídos y los errores por línea. */
export type LecturaItems = { items: ItemCotizacion[]; errores: string[] };

/**
 * Lee los ítems escritos en el asistente, uno por línea:
 *   «<cantidad> [unidad] x <descripción> [| detalle] @ <precio> [IVA%]»
 * Si la descripción coincide con un ítem anterior o del catálogo, conserva su
 * id, unidad e IVA. El precio puede omitirse si el servicio está en el catálogo.
 */
export function leerItems(texto: string, previos: ItemCotizacion[] = []): LecturaItems {
  const items: ItemCotizacion[] = [];
  const errores: string[] = [];
  texto
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean)
    .forEach((linea, k) => {
      const m = /^([\d.,]+)\s*([^\dx×]*?)\s*[x×]\s+(.+?)(?:\s*@\s*\$?\s*([\d.,]+))?\s*(?:\[\s*(\d{1,2})\s*%?\s*\])?$/i.exec(linea);
      if (!m) {
        errores.push(`Línea ${k + 1}: usa «cantidad x descripción @ precio».`);
        return;
      }
      const cantidad = leerNumero(m[1], true);
      const [descripcion, detalle = ""] = m[3].split("|").map((s) => s.trim());
      const clave = quitarTildes(descripcion);
      const previo = previos.find((p) => quitarTildes(p.descripcion) === clave && !items.some((x) => x.id === p.id));
      const deCatalogo = CATALOGO_SERVICIOS.find((s) => quitarTildes(s.descripcion) === clave);
      const precio = m[4] !== undefined ? leerNumero(m[4], false) : previo?.precioUnitario ?? deCatalogo?.precioReferencia ?? NaN;
      const unidad = (m[2] && unidadDe(m[2])) || previo?.unidad || deCatalogo?.unidad || "Unidades";
      if (m[2] && !unidadDe(m[2])) errores.push(`Línea ${k + 1}: unidad «${m[2]}» desconocida (usa ${UNIDADES.join(", ").toLowerCase()}).`);
      if (!(cantidad > 0)) errores.push(`Línea ${k + 1}: cantidad inválida.`);
      if (!(precio > 0)) errores.push(`Línea ${k + 1}: falta el precio («@ 30.000»).`);
      if (!descripcion) errores.push(`Línea ${k + 1}: falta la descripción.`);
      items.push({
        id: previo?.id ?? idItem(),
        descripcion,
        detalle: detalle || (m[3].includes("|") ? "" : previo?.detalle ?? deCatalogo?.detalle ?? ""),
        cantidad: cantidad > 0 ? cantidad : 0,
        unidad,
        precioUnitario: precio > 0 ? precio : 0,
        ivaPct: m[5] !== undefined ? Number(m[5]) : previo?.ivaPct ?? deCatalogo?.ivaPct ?? IVA_GENERAL,
      });
    });
  if (!items.length && !errores.length) errores.push("Escribe al menos un ítem.");
  return { items, errores };
}
