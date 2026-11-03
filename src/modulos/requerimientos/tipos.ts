/**
 * Requerimiento (pedido de Magno): el técnico pide los ítems (materiales, equipos o
 * servicios) que necesita un cliente o proyecto, con la misma tabla de la cotización
 * pero sin lo comercial (sin precios, IVA, totales, validez ni condiciones).
 * Flujo: borrador → en revisión → la administración lo convierte en cotización
 * (queda cerrado = «Atendido», enlazado a la cotización por `origenId`) o un revisor
 * lo aprueba y después lo marca como atendido sin cotizar. Interno: el cliente no lo ve.
 */

/** Una línea del requerimiento. */
export interface ItemRequerimiento {
  id: string;
  /** Material, equipo o servicio (si coincide con el catálogo de la cotización, al convertir toma su precio de referencia). */
  descripcion: string;
  /** Segunda línea opcional (referencia, marca, alcance). */
  detalle?: string;
  /** Admite decimales (12,5 metros). */
  cantidad: number;
  /** Unidad en plural, como en la cotización: «Unidades», «Metros»… */
  unidad: string;
  /** Para qué o dónde va (nota del técnico; no pasa a la cotización del cliente). */
  observacion: string;
}

/** Contenido del requerimiento. */
export interface DatosRequerimiento {
  /** Fecha del requerimiento (AAAA-MM-DD). */
  fecha: string;
  /** Para cuándo se necesita (opcional, AAAA-MM-DD). */
  fechaRequerida: string;
  cliente: string;
  /** Proyecto como se imprime («PRY-001-26 · CCTV hornos…»), si lo hay. */
  proyecto: string;
  /** Sitio o área donde se necesita. */
  sitio: string;
  /** Qué se requiere y para qué (pasa al asunto de la cotización). */
  asunto: string;
  items: ItemRequerimiento[];
  observaciones: string;
  /** Técnico que solicita (nombre, cargo y firma). */
  solicitante: string;
  cargo: string;
  firmaSolicitante: string;
}
