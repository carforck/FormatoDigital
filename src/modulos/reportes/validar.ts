import type { DatosReporte } from "./tipos";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Lista de pendientes antes de enviar a revisión. Vacía = listo. */
export function faltantesReporte(d: DatosReporte): string[] {
  const f: string[] = [];
  if (!d.fecha) f.push("Fecha");
  if (!d.tipoReporte) f.push("Tipo de reporte");
  if (!d.cliente.trim()) f.push("Cliente");
  if (!d.personaContactada.trim()) f.push("Persona contactada");
  if (d.correo && !EMAIL.test(d.correo)) f.push("Correo con formato válido");
  if (d.telefono && d.telefono.replace(/\D/g, "").length < 7) f.push("Teléfono válido (mín. 7 dígitos)");
  if (!d.asunto.trim()) f.push("Asunto");
  if (d.descripcion.trim().length < 40) f.push("Descripción (mín. 40 caracteres)");
  if (!d.nombreTecnico.trim()) f.push("Nombre del técnico");
  if (!d.firmaTecnico) f.push("Firma del técnico");
  return f;
}
