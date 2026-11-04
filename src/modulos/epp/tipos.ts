/**
 * Entrega de EPP · Registro de entrega de elementos de protección personal (SOTEC).
 * Se guarda como un documento más (mismo flujo: borrador → en revisión → aprobado con la
 * firma de quien entrega → cerrado). Interno: el cliente no lo ve.
 * Soporte del SG-SST (Decreto 1072 de 2015, Resolución 0312 de 2019): cada trabajador
 * firma el recibido de lo que se le entrega.
 */

import type { FotoRecibeEpp } from "./foto";

export type { FotoRecibeEpp } from "./foto";

/** Motivo de la entrega de un elemento. */
export type MotivoEpp = "Ingreso" | "Reposición" | "Dotación" | "Pérdida o daño" | (string & {});

/** Un elemento entregado (una fila de la tabla del formato). */
export interface ItemEpp {
  id: string;
  /** Elemento del catálogo (`EPP_CATALOGO`) o uno agregado con «＋ Agregar otro» (lista «epp.elementos»). */
  elemento: string;
  cantidad: number;
  /** Talla, referencia o marca. */
  talla: string;
  motivo: MotivoEpp;
  /** Fecha de entrega del elemento (por defecto, la del formato). En la matriz de La Clay, «EMISIÓN». */
  fecha: string;
  /** Código del elemento en el almacén del cliente (matriz de La Clay, columna «CÓDIGO»). Opcional. */
  codigo?: string;
  /** Unidad («UNIDAD», «PAR»); sin ella se deduce del elemento (`unidadEpp`). Opcional. */
  unidad?: string;
  /** Fecha en que se solicitó el elemento (matriz de La Clay, «SOLICITADO»). Opcional. */
  solicitado?: string;
}

/** Contenido del formato de entrega de EPP. */
export interface DatosEpp {
  fecha: string;
  /** Trabajador que recibe. */
  trabajador: string;
  cedula: string;
  cargo: string;
  /** Proceso o área del trabajador en la obra (matriz de La Clay, «PROCESO»). Opcional. */
  proceso?: string;
  /** Área, proyecto u obra (o el cliente donde trabaja). */
  obra: string;
  items: ItemEpp[];
  observaciones: string;
  /** Firma del trabajador que recibe. */
  firmaRecibe: string;
  /**
   * Foto del trabajador recibiendo el EPP (evidencia opcional): con la fecha y hora de la
   * captura (EXIF o del archivo, nunca escritas a mano) estampadas en la imagen y bajo ella.
   */
  fotoRecibe?: FotoRecibeEpp;
  /** Quien entrega (almacén, Coordinador SST): nombre, cargo y firma; al aprobar se completan con el revisor. */
  entregaNombre: string;
  entregaCargo: string;
  firmaEntrega: string;
}

/** Unidades entregadas en total. */
export const totalUnidades = (d: Pick<DatosEpp, "items">) => d.items.reduce((a, i) => a + (i.cantidad > 0 ? i.cantidad : 0), 0);

/** Elementos que se entregan por par (guantes, botas, tapones auditivos…). */
const POR_PAR = /\b(guante|bota|zapato|calzado|polaina|manga|tapon)/;

/** Unidad de un elemento: la anotada o, si no, «PAR» o «UNIDAD» según el elemento. */
export function unidadEpp(i: Pick<ItemEpp, "elemento" | "unidad">): string {
  if (i.unidad?.trim()) return i.unidad.trim().toUpperCase();
  const e = i.elemento.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return POR_PAR.test(e) ? "PAR" : "UNIDAD";
}

/** Fecha como la escribe la matriz de La Clay: «2026-05-05» → «5/05/2026»; otro texto queda igual. */
export function fechaLaClay(f?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f ?? "");
  return m ? `${Number(m[3])}/${m[2]}/${m[1]}` : (f ?? "");
}
