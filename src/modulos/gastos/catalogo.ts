/**
 * Catálogo y contenido inicial de la legalización de gastos (FO-GSST-25).
 */

import type { DatosGasto, TipoGasto } from "./tipos";

/** Tipos de gasto del formato, en el orden del selector. */
export const TIPOS_GASTO: TipoGasto[] = ["Transporte", "Alimentación", "Hospedaje", "Materiales", "Otros"];

/** Legalización en blanco con la fecha dada (el módulo completa colaborador, cédula y cargo). */
export function gastoVacio(fecha: string): DatosGasto {
  return {
    fecha,
    centroCostos: "",
    colaborador: "",
    cedula: "",
    cargo: "",
    telefono: "",
    clienteObra: "",
    items: [],
    observaciones: "",
    firmaColaborador: "",
    voboNombre: "",
    firmaVobo: "",
  };
}
