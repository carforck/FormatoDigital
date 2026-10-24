/**
 * Cuenta de cobro de la empresa a su cliente por el servicio. No es un módulo de
 * documento (no usa `ModuloDocumento`): tiene tablas y flujo propios.
 * Refleja public.cuentas_cobro y public.cuenta_cobro_items (0003_finanzas.sql;
 * `proyecto_id` en 0009). Ya emitida, la base no deja cambiar su contenido.
 */
import type { Evento } from "@/nucleo/tipos";

/** Estados de la cuenta (check de `cuentas_cobro.estado`). */
export type EstadoCuentaCobro = "borrador" | "emitida" | "enviada" | "pagada" | "anulada";

/** Línea de la cuenta (`cuenta_cobro_items`); suele venir de un reporte aprobado o cerrado. */
export interface ItemCuentaCobro {
  id: string;
  documentoId?: string; // reporte técnico que respalda la línea
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
}

/** Cuenta de cobro con sus ítems e historial de eventos. */
export interface CuentaCobro {
  id: string;
  codigo: string; // CC-001-26
  consecutivo: number;
  clienteId: string;
  ordenId?: string;
  /** Proyecto u obra al que se carga la cuenta (opcional). */
  proyectoId?: string;
  fecha: string;
  concepto: string;
  items: ItemCuentaCobro[];
  /** % de IVA aplicado (0 si no aplica). La base guarda el valor resultante en `cuentas_cobro.iva`. */
  ivaPorcentaje: number;
  notas: string;
  estado: EstadoCuentaCobro;
  creadoPor: string;
  creado: string;
  actualizado: string;
  historial: Evento[];
}

/** Total de una línea (cantidad × valor unitario). */
export const totalItem = (i: ItemCuentaCobro) => i.cantidad * i.valorUnitario;

/** Subtotal, IVA redondeado a pesos sobre el subtotal y total a pagar. */
export function totales(c: Pick<CuentaCobro, "items" | "ivaPorcentaje">) {
  const subtotal = c.items.reduce((a, i) => a + totalItem(i), 0);
  const iva = Math.round((subtotal * c.ivaPorcentaje) / 100);
  return { subtotal, iva, total: subtotal + iva };
}

/** Etiqueta visible de cada estado. */
export const ETIQUETA_ESTADO_CUENTA: Record<EstadoCuentaCobro, string> = {
  borrador: "Borrador",
  emitida: "Emitida",
  enviada: "Enviada",
  pagada: "Pagada",
  anulada: "Anulada",
};

/** Clases Tailwind de la insignia de cada estado. */
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
