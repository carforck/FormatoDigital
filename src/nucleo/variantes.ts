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
 *   1. Lo que elige quien diligencia: el asistente pregunta «¿Con qué formato sale el reporte?»
 *      (y el formulario tiene su selector «Formato»); se guarda en el documento.
 *   2. Si no eligió: el «Tipo de proyecto» del proyecto (Configuración · tipos de proyecto).
 *   3. Si no (o proyecto antiguo sin tipo): el «Formato por defecto» del cliente.
 *   4. Si no, el nombre del cliente: «Sevin Ltda.» → Sevin, «Oficina Fortox» → Fortox (`clientes`).
 *   5. Si no: SOTEC.
 * Cada paso cuenta solo si su variante cubre el tipo de documento: un proyecto «Servicios Fortox»
 * no cambia la Entrega de EPP, así que para ella sigue mandando el cliente (La Clay); y un
 * proyecto «Obra La Clay» no cambia sus reportes técnicos.
 * El documento guarda la variante con la que se creó (`Documento.variante`): cambiar
 * después el tipo del proyecto o del cliente no cambia los documentos ya guardados.
 * Un documento antiguo sin `variante` sale como SOTEC.
 *
 * ══ FORTOX ══════════════════════════════════════════════════════════════════════
 * Formato oficial «Reporte de mantenimiento de seguridad electrónica» (FORMA 7PA/F1-15),
 * tomado del PDF que envió Fortox (insumos/formato-reporte-tecnico-fortox.pdf, fuera del
 * repo). Su hoja es distinta a la de SOTEC, así que el reporte la dibuja aparte
 * (`hoja: "fortox"`, ver src/modulos/reportes/HojaFortox.tsx); logo en public/variantes.
 *
 * ══ SEVIN ═══════════════════════════════════════════════════════════════════════
 * «Informe de servicios» GSE-FO-03, versión 03, octubre 2023 (insumos/GSE-FO-03-informe-de-
 * servicio-sevin-v3.pdf). Hoja propia: src/modulos/reportes/HojaSevin.tsx.
 *
 * ══ LA CLAY ═════════════════════════════════════════════════════════════════════
 * «Matriz Entrega de EPP's» de Ladrillera La Clay S.A.S. (Sistema Integrado de Gestión,
 * versión 0, fecha de edición 5/05/2026; el código viene en blanco en el papel). Solo cambia
 * la Entrega de EPP (no el reporte): hoja propia src/modulos/epp/HojaLaClay.tsx.
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

/** Hojas propias de las variantes (formatos que no son el de SOTEC con otra marca). */
export type HojaVariante = "fortox" | "sevin" | "laclay";

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
  hoja?: HojaVariante;
  /** Palabras del nombre del cliente que, sin otra indicación, eligen esta variante («sevin»). */
  clientes?: string[];
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
  clientes: ["fortox"],
  formatos: {
    // Fortox no maneja versión ni fecha del formato: solo la FORMA
    reporte: { nombre: "Reporte de mantenimiento de seguridad electrónica", codigo: "7PA/F1-15", version: "—", fecha: "—" },
  },
};

/** SEVIN: su «Informe de servicios» GSE-FO-03 (versión 03, octubre 2023), con hoja propia. */
const VARIANTE_SEVIN: VarianteFormato = {
  clave: "sevin",
  marca: "SEVIN",
  etiqueta: "Servicios Sevin",
  logo: "/variantes/sevin-logo.png",
  colorEncabezado: "#002060", // azul oscuro de las franjas del formato de Sevin
  colorMarca: "#002060",
  hoja: "sevin",
  clientes: ["sevin"],
  formatos: {
    reporte: { nombre: "Informe de servicios", codigo: "GSE-FO-03", version: "03", fecha: "Octubre 2023" },
  },
};

/** LA CLAY: su «Matriz Entrega de EPP's» (Sistema Integrado de Gestión, versión 0), con hoja propia. */
const VARIANTE_LACLAY: VarianteFormato = {
  clave: "laclay",
  marca: "LA CLAY",
  etiqueta: "Ladrillera La Clay",
  logo: "/variantes/laclay-logo.png",
  colorEncabezado: "#A6A6A6", // franja gris de los títulos de la matriz
  colorMarca: "#E36C0A",
  hoja: "laclay",
  clientes: ["la clay", "laclay"],
  formatos: {
    // El papel trae el código en blanco
    epp: { nombre: "Matriz Entrega de EPP's", codigo: "", version: "0", fecha: "5/05/2026" },
  },
};

/** Variantes disponibles, en el orden de los selectores. */
export const VARIANTES: VarianteFormato[] = [VARIANTE_SOTEC, VARIANTE_FORTOX, VARIANTE_SEVIN, VARIANTE_LACLAY];

/** Texto en minúsculas, sin tildes ni signos, para comparar nombres. */
const plano = (t: string) => ` ${t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñ]+/g, " ")} `;

/** Variante que corresponde al nombre de un cliente («Sevin Ltda.» → sevin); undefined si ninguna. */
export function varianteDeNombreCliente(nombre?: string): string | undefined {
  if (!nombre?.trim()) return undefined;
  const n = plano(nombre);
  return VARIANTES.find((v) => v.clientes?.some((c) => n.includes(plano(c))))?.clave;
}

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
  { nombre: "Servicios Sevin", variante: "sevin" },
  { nombre: "Obra La Clay", variante: "laclay" },
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
 * Variante con la que sale un documento nuevo o en borrador: la elegida en el documento;
 * si no, la del tipo del proyecto; si no, la del cliente (formato por defecto o su nombre);
 * si no, SOTEC. Siempre se devuelve una que cubra el tipo de documento (FORTOX no cambia,
 * p. ej., los gastos): la que no lo cubre se salta y decide la siguiente. Sin `elegida`, es
 * la variante sugerida.
 */
export function resolverVariante(a: {
  tipo: TipoDoc;
  proyecto?: Pick<Proyecto, "tipo"> | null;
  cliente?: (Pick<Cliente, "variante"> & Partial<Pick<Cliente, "nombre">>) | null;
  config: Pick<Config, "tiposProyecto">;
  /** Variante elegida en el documento (asistente o selector «Formato»). */
  elegida?: string;
}): string {
  if (a.elegida) return varianteParaTipo(a.tipo, a.elegida).clave;
  // En orden: proyecto, formato del cliente, nombre del cliente; vale el primero que cubra el tipo
  const candidatas = [varianteDeTipoProyecto(a.config, a.proyecto?.tipo), a.cliente?.variante, varianteDeNombreCliente(a.cliente?.nombre)];
  const clave = candidatas.find((c) => c && VARIANTES.some((v) => v.clave === c && cubre(v, a.tipo)));
  return clave ?? VARIANTE_BASE;
}

/**
 * Formatos que se pueden elegir para un tipo de documento: las variantes que lo cubren, en el
 * orden de `VARIANTES`. Con una sola (solo SOTEC), no hace falta preguntar.
 */
export function formatosPara(tipo: TipoDoc): VarianteFormato[] {
  const r = VARIANTES.filter((v) => cubre(v, tipo));
  return r.length > 1 ? r : [];
}
