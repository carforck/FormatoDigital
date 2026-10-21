import { DOCUMENTOS } from "@/modulos/registro";

import type { Documento } from "./tipos";

/** Pendientes antes de enviar a revisión, según las reglas del módulo del documento. */
export function faltantes(doc: Documento): string[] {
  return doc.tipo === "reporte" ? DOCUMENTOS.reporte.faltantes(doc.datos) : DOCUMENTOS.permiso.faltantes(doc.datos);
}

/** Porcentaje de diligenciamiento para la barra de progreso. */
export function avance(doc: Documento): number {
  const total = DOCUMENTOS[doc.tipo].totalComprobaciones;
  return Math.max(0, Math.min(100, Math.round(((total - Math.min(total, faltantes(doc).length)) / total) * 100)));
}
