/**
 * Catálogos y contenido inicial del reporte técnico (FO-GSST-22).
 */

import type { DatosReporte } from "./tipos";

/** Opciones de «Tipo reporte» que ofrece el asistente. */
export const TIPOS_REPORTE = ["Preventivo", "Correctivo", "Instalación", "Diagnóstico", "Garantía"] as const;

/** Reporte en blanco con la fecha dada (el módulo completa el nombre del técnico). */
export function reporteVacio(fecha: string): DatosReporte {
  return {
    fecha,
    horaLlegada: "",
    horaSalida: "",
    tipoReporte: "",
    cliente: "",
    direccion: "",
    personaContactada: "",
    correo: "",
    telefono: "",
    cargo: "",
    asunto: "",
    descripcion: "",
    recomendaciones: "",
    nombreTecnico: "",
    firmaTecnico: "",
    firmaCliente: "",
    fotos: [],
  };
}
