/**
 * Validación de la legalización de gastos antes de enviarla a revisión.
 */

import type { DatosGasto } from "./tipos";

/** Pendientes antes de enviar la legalización a revisión. Vacía = lista. */
export function faltantesGasto(d: DatosGasto): string[] {
  const f: string[] = [];
  if (!d.fecha) f.push("Fecha");
  if (!d.centroCostos.trim()) f.push("Centro de costos");
  if (!d.clienteObra.trim()) f.push("Cliente / obra");
  if (!d.colaborador.trim()) f.push("Colaborador");
  if (d.cedula.replace(/\D/g, "").length < 6) f.push("Cédula del colaborador");
  if (d.items.length === 0) f.push("Al menos un gasto");
  d.items.forEach((i, k) => {
    if (!i.descripcion.trim()) f.push(`Gasto ${k + 1}: descripción o motivo`);
    if (!(i.valorUnitario > 0) || !(i.cantidad > 0)) f.push(`Gasto ${k + 1}: valor`);
    // Sin soporte no se legaliza: número de recibo o foto de la factura
    if (!i.recibo.trim() && !i.soporte) f.push(`Gasto ${k + 1}: número de recibo o foto de la factura`);
  });
  if (!d.firmaColaborador) f.push("Firma del colaborador");
  return f;
}
