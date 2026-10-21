import type { ModuloDocumento } from "./contrato";
import { moduloGastos } from "./gastos";
import { moduloPermisos } from "./permisos";
import { moduloReportes } from "./reportes";
import type { DatosGasto, DatosPermiso, DatosReporte, Documento, TipoDoc } from "@/nucleo/tipos";

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
  { clave: "nucleo", nombre: "Núcleo", descripcion: "Usuarios y roles, clientes y sitios, firmas (en sitio y por enlace), archivos, envío por correo y WhatsApp, PDF, consecutivos y auditoría.", estado: "activo", relaciona: ["todos"] },
  { clave: "ordenes", nombre: "Órdenes de servicio", descripcion: "Eje de cada trabajo: une permisos, reportes, fotos, gastos y cuentas de cobro.", estado: "en_construccion", relaciona: ["permisos", "reportes", "gastos", "cobros"] },
  { clave: "permisos", nombre: "Permisos de trabajo", descripcion: "Peligros, medidas, EPP, verificación y grupo ejecutor con firmas.", estado: "activo", formato: "F-GSST-13", relaciona: ["ordenes"] },
  { clave: "reportes", nombre: "Reportes técnicos", descripcion: "Diagnóstico, acción y resultado; registro fotográfico como hoja anexa; firma del técnico y del cliente en sitio o por enlace.", estado: "activo", formato: "FO-GSST-22", relaciona: ["ordenes", "cobros"] },
  { clave: "gastos", nombre: "Legalización de gastos", descripcion: "Transporte, alimentación, hospedaje y materiales con la foto de cada factura, Vo.Bo. de administración y reembolso.", estado: "activo", formato: "FO-GSST-25", relaciona: ["ordenes", "cobros"] },
  { clave: "cobros", nombre: "Cuentas de cobro", descripcion: "SOTEC le cobra a su cliente por el servicio, con ítems tomados de los reportes técnicos, IVA y valor en letras.", estado: "activo", relaciona: ["ordenes", "reportes"] },
];

/** Módulos de documentos diligenciables disponibles en el generador. */
export const DOCUMENTOS: { reporte: ModuloDocumento<DatosReporte>; permiso: ModuloDocumento<DatosPermiso>; gasto: ModuloDocumento<DatosGasto> } = {
  reporte: moduloReportes,
  permiso: moduloPermisos,
  gasto: moduloGastos,
};

/** Cliente u obra al que pertenece un documento (cada formato lo nombra distinto). */
export function clienteDoc(d: Documento): string {
  return d.tipo === "gasto" ? d.datos.clienteObra : d.datos.cliente;
}

/** Texto principal de un documento para listados, según su módulo. */
export function tituloDoc(d: Documento): string {
  return d.tipo === "reporte" ? DOCUMENTOS.reporte.titulo(d.datos) : d.tipo === "permiso" ? DOCUMENTOS.permiso.titulo(d.datos) : DOCUMENTOS.gasto.titulo(d.datos);
}

export function moduloDe<T extends TipoDoc>(tipo: T) {
  return DOCUMENTOS[tipo];
}
