/**
 * Cuenta de cobro de la empresa a su cliente por el servicio.
 * Refleja public.cuentas_cobro y public.cuenta_cobro_items (0003_finanzas.sql).
 */
export type EstadoCuentaCobro = "borrador" | "emitida" | "enviada" | "pagada" | "anulada";

export interface ItemCuentaCobro {
  id: string;
  documentoId?: string; // reporte técnico que respalda la línea
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  total: number;
}

export interface CuentaCobro {
  id: string;
  organizacionId: string;
  ordenId?: string;
  clienteId: string;
  codigo: string; // CC-001-26
  fecha: string;
  concepto: string;
  items: ItemCuentaCobro[];
  subtotal: number;
  iva: number;
  total: number;
  valorEnLetras: string;
  estado: EstadoCuentaCobro;
}
