/**
 * Validación de la entrega de EPP antes de enviarla a revisión.
 */

import type { DatosEpp } from "./tipos";

/** Pendientes antes de enviar la entrega a revisión. Vacía = lista. */
export function faltantesEpp(d: DatosEpp): string[] {
  const f: string[] = [];
  if (!d.fecha) f.push("Fecha");
  if (!d.obra.trim()) f.push("Área, proyecto u obra");
  if (!d.trabajador.trim()) f.push("Trabajador que recibe");
  if (d.cedula.replace(/\D/g, "").length < 6) f.push("Cédula del trabajador");
  if (!d.cargo.trim()) f.push("Cargo del trabajador");
  if (d.items.length === 0) f.push("Al menos un elemento entregado");
  d.items.forEach((i, k) => {
    if (!i.elemento.trim()) f.push(`Elemento ${k + 1}: cuál`);
    if (!(i.cantidad > 0)) f.push(`Elemento ${k + 1}: cantidad`);
    if (!String(i.motivo).trim()) f.push(`Elemento ${k + 1}: motivo de la entrega`);
  });
  if (!d.firmaRecibe) f.push("Firma del trabajador que recibe");
  return f;
}
