import type { Evento } from "@/nucleo/tipos";

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
}

export interface CuentaCobro {
  id: string;
  codigo: string; // CC-001-26
  consecutivo: number;
  clienteId: string;
  ordenId?: string;
  fecha: string;
  concepto: string;
  items: ItemCuentaCobro[];
  /** % de IVA aplicado (0 si no aplica). */
  ivaPorcentaje: number;
  notas: string;
  estado: EstadoCuentaCobro;
  creadoPor: string;
  creado: string;
  actualizado: string;
  historial: Evento[];
}

export const totalItem = (i: ItemCuentaCobro) => i.cantidad * i.valorUnitario;

export function totales(c: Pick<CuentaCobro, "items" | "ivaPorcentaje">) {
  const subtotal = c.items.reduce((a, i) => a + totalItem(i), 0);
  const iva = Math.round((subtotal * c.ivaPorcentaje) / 100);
  return { subtotal, iva, total: subtotal + iva };
}

export const ETIQUETA_ESTADO_CUENTA: Record<EstadoCuentaCobro, string> = {
  borrador: "Borrador",
  emitida: "Emitida",
  enviada: "Enviada",
  pagada: "Pagada",
  anulada: "Anulada",
};

export const COLOR_ESTADO_CUENTA: Record<EstadoCuentaCobro, string> = {
  borrador: "bg-slate-100 text-slate-700 ring-slate-200",
  emitida: "bg-sky-50 text-sky-800 ring-sky-200",
  enviada: "bg-amber-50 text-amber-800 ring-amber-200",
  pagada: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  anulada: "bg-rose-50 text-rose-800 ring-rose-200",
};

/** Transiciones válidas (iguales a las del trigger cuentas_cobro_flujo). */
export const SIGUIENTES: Record<EstadoCuentaCobro, EstadoCuentaCobro[]> = {
  borrador: ["emitida"],
  emitida: ["enviada", "pagada", "anulada"],
  enviada: ["pagada", "anulada"],
  pagada: [],
  anulada: [],
};
