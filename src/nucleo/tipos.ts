import type { DatosGasto } from "@/modulos/gastos/tipos";
import type { DatosPermiso } from "@/modulos/permisos/tipos";
import type { DatosReporte } from "@/modulos/reportes/tipos";

// Los tipos propios de cada formato viven en su módulo; se reexportan aquí por comodidad.
export type { DatosReporte, FotoReporte } from "@/modulos/reportes/tipos";
export type { DatosPermiso, Ejecutor, SiNoNa } from "@/modulos/permisos/tipos";
export type { DatosGasto, ItemGasto } from "@/modulos/gastos/tipos";

export type Rol = "tecnico" | "supervisor" | "admin" | "cliente";

export type Estado = "borrador" | "en_revision" | "aprobado" | "rechazado" | "cerrado";

export type TipoDoc = "reporte" | "permiso" | "gasto";

export interface Usuario {
  id: string;
  nombre: string;
  cargo: string;
  rol: Rol;
  email: string;
  cedula?: string;
  clienteId?: string; // solo para rol cliente
  activo: boolean;
}

export interface Cliente {
  id: string;
  nombre: string;
  direccion: string;
  contacto: string;
  cargo: string;
  correo: string;
  telefono: string;
  sitio: string;
}

export interface Evento {
  fecha: string;
  usuarioId: string;
  accion: string;
  detalle?: string;
}

interface DocBase {
  id: string;
  codigo: string;
  consecutivo: number;
  estado: Estado;
  autorId: string;
  clienteId: string;
  creado: string;
  actualizado: string;
  motivoRechazo?: string;
  historial: Evento[];
}

export interface DocReporte extends DocBase {
  tipo: "reporte";
  datos: DatosReporte;
}

export interface DocPermiso extends DocBase {
  tipo: "permiso";
  datos: DatosPermiso;
}

export interface DocGasto extends DocBase {
  tipo: "gasto";
  datos: DatosGasto;
}
export type Documento = DocReporte | DocPermiso | DocGasto;

export interface Notificacion {
  id: string;
  para: Rol | string; // rol o id de usuario
  texto: string;
  docId?: string;
  fecha: string;
  leida: boolean;
}

export interface Auditoria {
  id: string;
  fecha: string;
  usuarioId: string;
  accion: string;
  detalle: string;
}

export interface Config {
  empresa: string;
  nit: string;
  ciudad: string;
  prefijoReporte: string;
  prefijoPermiso: string;
  prefijoCobro: string;
  prefijoGasto: string;
  exigirFirmaCliente: boolean;
  vigenciaPermisoHoras: number;
  /** Datos que salen en la cuenta de cobro */
  ivaPorcentaje: number;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  titularCuenta: string;
}

/** Enlace de firma remota: el cliente firma sin cuenta. */
export interface EnlaceFirma {
  token: string;
  docId: string;
  campo: "firmaCliente";
  correo: string;
  creado: string;
  expira: string;
  usado?: string;
}
