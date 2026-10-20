import { PREGUNTAS_VERIFICACION } from "./formatos";
import type { DatosPermiso, DatosReporte, Documento } from "./types";

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

export function faltantesPermiso(d: DatosPermiso): string[] {
  const f: string[] = [];
  if (!d.fechaEmision) f.push("Fecha de emisión");
  if (!d.hora) f.push("Hora");
  if (!d.cliente.trim()) f.push("Nombre de cliente");
  if (!d.sitioTrabajo.trim()) f.push("Sitio de trabajo");
  if (!d.puestoProyecto.trim()) f.push("Puesto / proyecto");
  if (!d.responsable.trim()) f.push("Responsable del trabajo");
  if (!d.actividades.trim()) f.push("Actividades a realizar");
  if (d.peligros.length === 0) f.push("Al menos un peligro identificado");
  if (d.epp.length === 0) f.push("Elementos de protección");
  if (d.equipo.includes("Maquinaria") && !d.maquinariaCual.trim()) f.push("Cuál maquinaria");
  if (d.peligros.includes("Caídas desde altura (1,5 m)")) {
    if (!d.medidas.includes("Lista verificación alturas")) f.push("Lista de verificación de alturas (hay riesgo de caída desde altura)");
    if (!d.epp.includes("Arnés cuerpo completo")) f.push("Arnés de cuerpo completo (hay riesgo de caída desde altura)");
  }
  if (d.peligros.includes("Riesgo eléctrico") && !d.medidas.includes("Lista verificación eléctrico") && !d.medidas.includes("Delimitación del área"))
    f.push("Medida de control para el riesgo eléctrico");
  d.verificacion.forEach((v, i) => {
    if (!v) f.push(`Verificación ${i + 1} sin responder`);
    if (v === "NO") f.push(`Verificación ${i + 1} en "NO": el trabajo no puede autorizarse (${PREGUNTAS_VERIFICACION[i].slice(0, 45)}…)`);
  });
  if (d.ejecutores.length === 0) f.push("Al menos un integrante del grupo ejecutor");
  d.ejecutores.forEach((e, i) => {
    if (!e.nombre.trim() || e.cedula.replace(/\D/g, "").length < 6) f.push(`Ejecutor ${i + 1}: nombre y cédula`);
    if (!e.arlEps.trim()) f.push(`Ejecutor ${i + 1}: ARL / EPS`);
    if (!e.firma) f.push(`Ejecutor ${i + 1}: firma`);
  });
  if (!d.encargado.trim() || !d.firmaEncargado) f.push("Nombre y firma del encargado de ejecutar");
  return f;
}

export function faltantes(doc: Documento): string[] {
  return doc.tipo === "reporte" ? faltantesReporte(doc.datos) : faltantesPermiso(doc.datos);
}

/** Porcentaje de diligenciamiento para la barra de progreso. */
export function avance(doc: Documento): number {
  const total = doc.tipo === "reporte" ? 10 : 16;
  return Math.max(0, Math.min(100, Math.round(((total - Math.min(total, faltantes(doc).length)) / total) * 100)));
}
