import type { ModuloDocumento } from "./contrato";
import { moduloPermisos } from "./permisos";
import { moduloReportes } from "./reportes";
import type { DatosPermiso, DatosReporte, TipoDoc } from "@/nucleo/tipos";

/**
 * Registro central de módulos de la plataforma.
 *
 * Cada empresa (organización) habilita los módulos que contrata; todos
 * comparten el NÚCLEO y se unen a través de la ORDEN DE SERVICIO.
 * Ver docs/ARQUITECTURA.md.
 */
export type EstadoModulo = "activo" | "en_construccion" | "planeado";

export interface InfoModulo {
  clave: string;
  nombre: string;
  descripcion: string;
  estado: EstadoModulo;
  /** Código del formato que digitaliza, si aplica. */
  formato?: string;
  /** Con qué otros módulos se relaciona. */
  relaciona: string[];
}

export const MODULOS: InfoModulo[] = [
  { clave: "nucleo", nombre: "Núcleo", descripcion: "Usuarios y roles, clientes y sitios, firmas, archivos, correo, PDF, consecutivos y auditoría.", estado: "activo", relaciona: ["todos"] },
  { clave: "ordenes", nombre: "Órdenes de servicio", descripcion: "Eje de cada trabajo: une permisos, reportes, fotos, gastos y cuentas de cobro.", estado: "en_construccion", relaciona: ["permisos", "reportes", "gastos", "cobros"] },
  { clave: "permisos", nombre: "Permisos de trabajo", descripcion: "Peligros, medidas, EPP, verificación y grupo ejecutor con firmas.", estado: "activo", formato: "F-GSST-13", relaciona: ["ordenes"] },
  { clave: "reportes", nombre: "Reportes técnicos", descripcion: "Diagnóstico, acción y resultado, firma del técnico y del cliente; registro fotográfico como hoja anexa.", estado: "activo", formato: "FO-GSST-22", relaciona: ["ordenes", "cobros"] },
  { clave: "gastos", nombre: "Gastos", descripcion: "Materiales, transporte y viáticos con foto del soporte y aprobación. Se ajusta al formato de SOTEC.", estado: "planeado", relaciona: ["ordenes"] },
  { clave: "cobros", nombre: "Cuentas de cobro", descripcion: "SOTEC le cobra a su cliente por el servicio, con ítems tomados de los reportes técnicos.", estado: "planeado", relaciona: ["ordenes", "reportes"] },
];

/** Módulos de documentos diligenciables disponibles en el generador. */
export const DOCUMENTOS: { reporte: ModuloDocumento<DatosReporte>; permiso: ModuloDocumento<DatosPermiso> } = {
  reporte: moduloReportes,
  permiso: moduloPermisos,
};

export function moduloDe<T extends TipoDoc>(tipo: T) {
  return DOCUMENTOS[tipo];
}
