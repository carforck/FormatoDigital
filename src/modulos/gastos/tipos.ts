/**
 * FO-GSST-25 · Formato de legalización y registro de gastos operativos (SOTEC).
 * Se guarda como un documento más (documentos.datos en la base de datos), con
 * el mismo flujo: borrador → en revisión → aprobado (Vo.Bo.) → cerrado (reembolsado).
 * Las fotos de las facturas van en `archivos` (tipo 'soporte'); ver 0007_gastos_como_formato.sql.
 */

/** Tipos de gasto del formato (ver `TIPOS_GASTO`). */
export type TipoGasto = "Transporte" | "Alimentación" | "Hospedaje" | "Materiales" | "Otros";

/** Un gasto de la legalización (una fila del formato y, si tiene foto, un soporte anexo). */
export interface ItemGasto {
  id: string;
  fecha: string;
  tipo: TipoGasto;
  descripcion: string;
  /** N° de recibo o factura */
  recibo: string;
  cantidad: number;
  valorUnitario: number;
  /** Foto de la factura o recibo (JPEG comprimido; ruta de Storage en producción). */
  soporte: string;
}

/** Contenido del formato FO-GSST-25. */
export interface DatosGasto {
  fecha: string;
  centroCostos: string;
  colaborador: string;
  cedula: string;
  cargo: string;
  telefono: string;
  clienteObra: string;
  items: ItemGasto[];
  observaciones: string;
  firmaColaborador: string;
  /** Vo.Bo.: nombre y firma de quien aprueba; los escribe `flujo.alAprobar`. */
  voboNombre: string;
  firmaVobo: string;
}

/** Valor total de un ítem (cantidad × valor unitario). */
export const totalItemGasto = (i: ItemGasto) => i.cantidad * i.valorUnitario;
/** Valor total legalizado; también es el `valor` del documento en los totales del proyecto. */
export const totalGastos = (d: Pick<DatosGasto, "items">) => d.items.reduce((a, i) => a + totalItemGasto(i), 0);
