/**
 * Validación del requerimiento antes de enviarlo a revisión.
 */

import type { DatosRequerimiento } from "./tipos";

/** Comprobaciones de `faltantesRequerimiento` (para el % de avance): fecha, cliente, asunto, solicitante, ítems, ítems completos y firma. */
export const COMPROBACIONES_REQUERIMIENTO = 7;

/** Pendientes antes de enviar el requerimiento a revisión. Vacía = listo. */
export function faltantesRequerimiento(d: DatosRequerimiento): string[] {
  const f: string[] = [];
  if (!d.fecha) f.push("Fecha");
  if (!d.cliente.trim()) f.push("Cliente");
  if (!d.asunto.trim()) f.push("Qué se requiere (asunto)");
  if (!d.solicitante.trim()) f.push("Quién solicita");
  if (d.items.length === 0) f.push("Al menos un ítem");
  d.items.forEach((i, k) => {
    if (!i.descripcion.trim()) f.push(`Ítem ${k + 1}: descripción`);
    if (!(i.cantidad > 0)) f.push(`Ítem ${k + 1}: cantidad`);
    if (!i.unidad.trim()) f.push(`Ítem ${k + 1}: unidad`);
  });
  if (!d.firmaSolicitante) f.push("Firma de quien solicita");
  return f;
}
