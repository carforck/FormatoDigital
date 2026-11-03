/**
 * Entrega de EPP · Registro de entrega de elementos de protección personal (SOTEC).
 * Se guarda como un documento más (mismo flujo: borrador → en revisión → aprobado con la
 * firma de quien entrega → cerrado). Interno: el cliente no lo ve.
 * Soporte del SG-SST (Decreto 1072 de 2015, Resolución 0312 de 2019): cada trabajador
 * firma el recibido de lo que se le entrega.
 */

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
  /** Fecha de entrega del elemento (por defecto, la del formato). */
  fecha: string;
}

/** Contenido del formato de entrega de EPP. */
export interface DatosEpp {
  fecha: string;
  /** Trabajador que recibe. */
  trabajador: string;
  cedula: string;
  cargo: string;
  /** Área, proyecto u obra (o el cliente donde trabaja). */
  obra: string;
  items: ItemEpp[];
  observaciones: string;
  /** Firma del trabajador que recibe. */
  firmaRecibe: string;
  /** Quien entrega (almacén, Coordinador SST): nombre, cargo y firma; al aprobar se completan con el revisor. */
  entregaNombre: string;
  entregaCargo: string;
  firmaEntrega: string;
}

/** Unidades entregadas en total. */
export const totalUnidades = (d: Pick<DatosEpp, "items">) => d.items.reduce((a, i) => a + (i.cantidad > 0 ? i.cantidad : 0), 0);
