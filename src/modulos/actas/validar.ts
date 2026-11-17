/**
 * Validación del acta de entrega antes de enviarla a revisión. Lo mínimo para que el acta
 * sirva: a quién y cuándo se entregó, qué sistema, y el recibido firmado del cliente con su
 * nombre y cédula. Lo demás (materiales, zonas, usuarios, horarios) depende de la instalación.
 */

import { validarClave } from "./claves";
import type { DatosActa } from "./tipos";

/** Comprobaciones fijas de `faltantesActa` (para el % de avance). */
export const COMPROBACIONES_ACTA = 9;

/** Pendientes antes de enviar el acta a revisión. Vacía = lista. Nunca incluye el valor de una clave. */
export function faltantesActa(d: DatosActa): string[] {
  const f: string[] = [];
  if (!d.fecha) f.push("Fecha");
  if (!d.ciudad.trim()) f.push("Ciudad");
  if (!d.cliente.trim()) f.push("Nombre del cliente");
  if (!d.tipoActa) f.push("Cliente nuevo o adición");
  if (!d.direccion.trim()) f.push("Dirección");
  if (!d.sistemas.length) f.push("Tipo de sistema");
  if (!d.tecnico.trim()) f.push("Nombre del técnico");
  if (!d.firmaTecnico) f.push("Firma del técnico");
  if (!d.firmaCliente) f.push("Firma del cliente");
  if (d.firmaCliente && (!d.nombreFirmaCliente.trim() || !d.cedulaFirmaCliente.trim())) f.push("Nombre y C.C. de quien firma");
  if (validarClave(d.claveMaestra)) f.push("Clave maestra: de 4 a 8 dígitos");
  if (validarClave(d.claveInstalador)) f.push("Clave de instalador: de 4 a 8 dígitos");
  d.zonas.forEach((z) => {
    if (!z.descripcion.trim()) f.push(`Zona ${z.numero}: descripción`);
  });
  d.usuarios.forEach((u, k) => {
    if (!u.nombre.trim()) f.push(`Usuario ${k + 1}: nombre`);
    if (validarClave(u.claveTelefonica)) f.push(`Usuario ${k + 1}: clave telefónica de 4 a 8 dígitos`);
  });
  d.materiales.forEach((m, k) => {
    if (!m.descripcion.trim()) f.push(`Material ${k + 1}: descripción`);
  });
  return f;
}
