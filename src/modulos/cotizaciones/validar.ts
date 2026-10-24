/**
 * Validación de la cotización antes de aprobarla y enviarla al cliente.
 */

import { diasEntre } from "./calculos";
import type { DatosCotizacion } from "./tipos";

/**
 * Cantidad de comprobaciones de `faltantesCotizacion` (para el % de avance):
 * cliente, asunto, fecha, vencimiento, vendedor, al menos un ítem, ítems
 * completos, forma de pago, tiempo de entrega y correo del cliente válido.
 */
export const COMPROBACIONES_COTIZACION = 10;

const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim());

/**
 * Pendientes antes de enviar la cotización a revisión. Vacía = lista.
 * La firma del cliente NO se exige: llega después, cuando el cliente acepta.
 */
export function faltantesCotizacion(d: DatosCotizacion): string[] {
  const f: string[] = [];
  if (!d.cliente.trim()) f.push("Cliente");
  if (!d.asunto.trim()) f.push("Asunto o proyecto");
  if (!d.fecha) f.push("Fecha de cotización");
  if (!d.vencimiento) f.push("Fecha de vencimiento");
  else if (d.fecha && !(diasEntre(d.fecha, d.vencimiento) >= 0)) f.push("El vencimiento no puede ser anterior a la fecha de cotización");
  if (!d.vendedor.trim()) f.push("Vendedor");
  if (d.items.length === 0) f.push("Al menos un ítem");
  d.items.forEach((i, k) => {
    if (!i.descripcion.trim()) f.push(`Ítem ${k + 1}: descripción`);
    if (!(i.cantidad > 0)) f.push(`Ítem ${k + 1}: cantidad`);
    if (!(i.precioUnitario > 0)) f.push(`Ítem ${k + 1}: precio unitario`);
    if (!i.unidad.trim()) f.push(`Ítem ${k + 1}: unidad`);
    if (!(i.ivaPct >= 0 && i.ivaPct <= 100)) f.push(`Ítem ${k + 1}: % de IVA`);
  });
  if (!d.formaPago.trim()) f.push("Forma de pago");
  if (!d.tiempoEntrega.trim()) f.push("Tiempo de entrega");
  if (d.correo.trim() && !correoValido(d.correo)) f.push("Correo del cliente válido");
  return f;
}
