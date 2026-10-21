/**
 * FO-GSST-25 · Formato de legalización y registro de gastos operativos (SOTEC).
 * Se guarda como un documento más (documentos.datos en la base de datos), con
 * el mismo flujo: borrador → en revisión → aprobado (Vo.Bo.) → cerrado (reembolsado).
 */
export type TipoGasto = "Transporte" | "Alimentación" | "Hospedaje" | "Materiales" | "Otros";

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
  voboNombre: string;
  firmaVobo: string;
}

export const totalItemGasto = (i: ItemGasto) => i.cantidad * i.valorUnitario;
export const totalGastos = (d: Pick<DatosGasto, "items">) => d.items.reduce((a, i) => a + totalItemGasto(i), 0);
