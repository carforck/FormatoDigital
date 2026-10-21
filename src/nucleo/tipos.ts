import type { DatosPermiso } from "@/modulos/permisos/tipos";
import type { DatosReporte } from "@/modulos/reportes/tipos";

// Los tipos propios de cada formato viven en su módulo; se reexportan aquí por comodidad.
export type { DatosReporte } from "@/modulos/reportes/tipos";
export type { DatosPermiso, Ejecutor, SiNoNa } from "@/modulos/permisos/tipos";

export type Rol = "tecnico" | "supervisor" | "admin" | "cliente";

export type Estado = "borrador" | "en_revision" | "aprobado" | "rechazado" | "cerrado";

export type TipoDoc = "reporte" | "permiso";

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

export type Documento = DocReporte | DocPermiso;

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
  prefijoReporte: string;
  prefijoPermiso: string;
  exigirFirmaCliente: boolean;
  vigenciaPermisoHoras: number;
}
