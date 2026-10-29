/**
 * Variantes de formato (marca o plantilla con la que sale un documento).
 *
 * SOTEC es la variante por defecto: el formato de cada módulo tal cual. Otra variante
 * (p. ej. FORTOX: SOTEC le presta servicios a Fortox y esos reportes salen en el
 * formato de Fortox) cambia solo la presentación —logo, empresa, código y versión del
 * formato, colores, pie y, si hace falta, etiquetas de campos— y aplica solo a los
 * tipos de documento que declare en `formatos`; los datos del documento no cambian.
 *
 * Cómo se elige (ver `resolverVariante`):
 *   1. El proyecto: su «Tipo de proyecto» (Configuración · tipos de proyecto) apunta a una variante.
 *   2. Sin proyecto (o proyecto antiguo sin tipo): el «Formato por defecto» del cliente.
 *   3. Si no: SOTEC.
 * El documento guarda la variante con la que se creó (`Documento.variante`): cambiar
 * después el tipo del proyecto o del cliente no cambia los documentos ya guardados.
 * Un documento antiguo sin `variante` sale como SOTEC.
 *
 * ══ FORTOX ══════════════════════════════════════════════════════════════════════
 * Formato oficial «Reporte de mantenimiento de seguridad electrónica» (FORMA 7PA/F1-15),
 * tomado del PDF que envió Fortox (insumos/formato-reporte-tecnico-fortox.pdf, fuera del
 * repo). Su hoja es distinta a la de SOTEC, así que el reporte la dibuja aparte
 * (`hoja: "fortox"`, ver src/modulos/reportes/HojaFortox.tsx); logo en public/variantes.
 * ════════════════════════════════════════════════════════════════════════════════
 */
import type { InfoFormato } from "@/modulos/contrato";
import type { Cliente, Config, Proyecto, TipoDoc } from "@/nucleo/tipos";

/** Cómo sale un tipo de documento en una variante (lo que no se indica queda como en el módulo). */
export interface FormatoVariante extends Partial<Pick<InfoFormato, "codigo" | "nombre" | "version" | "fecha">> {
  /** Etiquetas de campos que cambian en esta variante: «texto del formato SOTEC» → «texto de la variante». */
  etiquetas?: Record<string, string>;
  /**
   * Prefijo propio del consecutivo en esta variante (numeración aparte, p. ej. "RTF-001-26").
   * Sin él, el documento sigue la misma serie del módulo (RT-…), que es lo predeterminado.
   */
  prefijo?: string;
}

/** Marca y plantilla con la que sale un documento. */
export interface VarianteFormato {
  /** Clave estable (se guarda en el documento, el proyecto y el cliente). */
  clave: string;
  /** Marca que va en el encabezado y en el logo de texto («SOTEC», «FORTOX»). */
  marca: string;
  /** Texto del chip en el generador y en el detalle: «Formato: Servicios Fortox». */
  etiqueta: string;
  /** Logo (ruta en `public/`); sin él, la variante sale con su marca como logo de texto. */
  logo?: string;
  /** Fondo de las franjas de título del formato (`.hdr`). Por defecto, el verde de SOTEC. */
  colorEncabezado?: string;
  /** Color del logo de texto. */
  colorMarca?: string;
  /** Pie de la hoja principal y de las hojas anexas (por defecto, el del módulo). */
  pie?: string;
  pieAnexo?: string;
  /** Tipos de documento que salen con esta variante; los demás salen como SOTEC. La base cubre todos. */
  formatos: Partial<Record<TipoDoc, FormatoVariante>>;
  /** Datos de marca aún por confirmar: se avisa en el aplicativo (no en el papel). */
  provisional?: boolean;
  /** Hoja propia de la variante cuando su formato no es el de SOTEC con otra marca (p. ej. "fortox"). */
  hoja?: "fortox";
}

/** Clave de la variante por defecto. */
export const VARIANTE_BASE = "sotec";

/** SOTEC: el formato de cada módulo, sin cambios. */
const VARIANTE_SOTEC: VarianteFormato = { clave: VARIANTE_BASE, marca: "SOTEC", etiqueta: "Servicios SOTEC", formatos: {} };

/** FORTOX: su formato de reporte de mantenimiento (FORMA 7PA/F1-15), con hoja propia. */
const VARIANTE_FORTOX: VarianteFormato = {
  clave: "fortox",
  marca: "FORTOX",
  etiqueta: "Servicios Fortox",
  logo: "/variantes/fortox-logo.png",
  colorEncabezado: "#FABF8F", // franjas salmón del formato de Fortox
  colorMarca: "#0B2D5B",
  hoja: "fortox",
  formatos: {
    // Fortox no maneja versión ni fecha del formato: solo la FORMA
    reporte: { nombre: "Reporte de mantenimiento de seguridad electrónica", codigo: "7PA/F1-15", version: "—", fecha: "—" },
  },
};

/** Variantes disponibles, en el orden de los selectores. */
export const VARIANTES: VarianteFormato[] = [VARIANTE_SOTEC, VARIANTE_FORTOX];

/** Variante por su clave; una clave desconocida o vacía es SOTEC (documentos antiguos). */
export function varianteDe(clave?: string | null): VarianteFormato {
  return VARIANTES.find((v) => v.clave === clave) ?? VARIANTE_SOTEC;
}

/** Si la variante cambia ese tipo de documento (la base los cubre todos). */
export const cubre = (v: VarianteFormato, tipo: TipoDoc) => v.clave === VARIANTE_BASE || Boolean(v.formatos[tipo]);

/** Variante con la que sale un tipo de documento: la pedida si lo cubre; si no, SOTEC. */
export function varianteParaTipo(tipo: TipoDoc, clave?: string | null): VarianteFormato {
  const v = varianteDe(clave);
  return cubre(v, tipo) ? v : VARIANTE_SOTEC;
}

/** Control documental del formato en una variante (lo que la variante no define, del módulo). */
export function formatoEnVariante(base: InfoFormato, tipo: TipoDoc, clave?: string | null): InfoFormato {
  const f = varianteParaTipo(tipo, clave).formatos[tipo];
  if (!f) return base;
  return { ...base, codigo: f.codigo ?? base.codigo, nombre: f.nombre ?? base.nombre, version: f.version ?? base.version, fecha: f.fecha ?? base.fecha };
}

/** Etiqueta de un campo en la variante («Cliente» u otra si la variante la cambia). */
export const etiquetaEnVariante = (tipo: TipoDoc, clave: string | null | undefined, texto: string) => varianteParaTipo(tipo, clave).formatos[tipo]?.etiquetas?.[texto] ?? texto;

/** Prefijo propio del consecutivo en la variante (undefined = misma serie del módulo). */
export const prefijoVariante = (tipo: TipoDoc, clave?: string | null) => varianteParaTipo(tipo, clave).formatos[tipo]?.prefijo || undefined;

/** Clave del contador de consecutivos: la serie del módulo o, con prefijo propio, la de la variante. */
export function serieConsecutivo(tipo: TipoDoc, clave: string | null | undefined, anio: string): string {
  return prefijoVariante(tipo, clave) ? `${tipo}.${varianteParaTipo(tipo, clave).clave}-${anio}` : `${tipo}-${anio}`;
}

// ── Tipos de proyecto (Configuración) ───────────────────────────────────────────

/** Tipo de proyecto: cada uno define con qué variante de formato salen sus documentos. */
export interface TipoProyecto {
  /** Nombre visible y clave (se guarda en `Proyecto.tipo`). */
  nombre: string;
  /** Clave de la variante de formato. */
  variante: string;
}

/** Tipo de proyecto por defecto (los proyectos nuevos y los antiguos sin tipo). */
export const TIPO_PROYECTO_BASE = "Servicios SOTEC";

/** Tipos de proyecto de fábrica; la administración agrega más en Configuración. */
export const TIPOS_PROYECTO_BASE: TipoProyecto[] = [
  { nombre: TIPO_PROYECTO_BASE, variante: VARIANTE_BASE },
  { nombre: "Servicios Fortox", variante: "fortox" },
];

/** Tipos de proyecto de la organización (los de Configuración o, si no hay, los de fábrica). */
export function tiposProyectoDe(config: Pick<Config, "tiposProyecto">): TipoProyecto[] {
  const propios = config.tiposProyecto?.filter((t) => t.nombre.trim()) ?? [];
  return propios.length ? propios : TIPOS_PROYECTO_BASE;
}

/** Variante de un tipo de proyecto por su nombre (sin importar mayúsculas); undefined si no existe. */
export function varianteDeTipoProyecto(config: Pick<Config, "tiposProyecto">, tipo?: string): string | undefined {
  const t = tipo?.trim().toLowerCase();
  if (!t) return undefined;
  return tiposProyectoDe(config).find((x) => x.nombre.trim().toLowerCase() === t)?.variante;
}

/**
 * Variante con la que sale un documento nuevo o en borrador: la del tipo del proyecto;
 * sin proyecto (o con uno antiguo sin tipo), la del cliente; si no, SOTEC. Siempre se
 * devuelve una que cubra el tipo de documento (FORTOX no cambia, p. ej., los gastos).
 */
export function resolverVariante(a: {
  tipo: TipoDoc;
  proyecto?: Pick<Proyecto, "tipo"> | null;
  cliente?: Pick<Cliente, "variante"> | null;
  config: Pick<Config, "tiposProyecto">;
}): string {
  const delProyecto = varianteDeTipoProyecto(a.config, a.proyecto?.tipo);
  const clave = delProyecto ?? a.cliente?.variante ?? VARIANTE_BASE;
  return varianteParaTipo(a.tipo, clave).clave;
}
