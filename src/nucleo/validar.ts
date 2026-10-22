import type { ModuloDocumento } from "@/modulos/contrato";
import { DOCUMENTOS } from "@/modulos/registro";

import type { Documento } from "./tipos";

const modulo = (doc: Documento) => DOCUMENTOS[doc.tipo] as unknown as ModuloDocumento<Documento["datos"]>;

/** Pendientes antes de enviar a revisión, según las reglas del módulo del documento. */
export function faltantes(doc: Documento): string[] {
  return modulo(doc).faltantes(doc.datos);
}

/** Porcentaje de diligenciamiento para la barra de progreso. */
export function avance(doc: Documento): number {
  const total = Math.max(1, modulo(doc).totalComprobaciones);
  return Math.max(0, Math.min(100, Math.round(((total - Math.min(total, faltantes(doc).length)) / total) * 100)));
}
