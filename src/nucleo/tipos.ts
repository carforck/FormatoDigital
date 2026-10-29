/**
 * Tipos del núcleo compartidos por todos los módulos: usuarios y roles,
 * clientes, proyectos, documentos (unión por `tipo`), avisos, auditoría,
 * configuración y enlaces de firma. Las fechas son texto ISO local
 * («AAAA-MM-DDTHH:mm:ss», ver `ahora()` en el proveedor de datos).
 */
import type { DatosGasto } from "@/modulos/gastos/tipos";
import type { DatosPermiso } from "@/modulos/permisos/tipos";
import type { DatosReporte } from "@/modulos/reportes/tipos";

import type { DatosCotizacion } from "@/modulos/cotizaciones/tipos";
import type { ServicioCatalogo } from "@/modulos/cotizaciones/catalogo";
import type { TipoProyecto } from "@/nucleo/variantes";

// Los tipos propios de cada formato viven en su módulo; se reexportan aquí por comodidad.
export type { DatosReporte, FotoReporte } from "@/modulos/reportes/tipos";
export type { DatosPermiso, Ejecutor, SiNoNa } from "@/modulos/permisos/tipos";
export type { DatosGasto, ItemGasto } from "@/modulos/gastos/tipos";
export type { DatosCotizacion, ItemCotizacion } from "@/modulos/cotizaciones/tipos";
export type { Equipo, EstadoEquipo, SistemaEquipo } from "@/modulos/equipos/tipos";

/** Perfiles: técnico de campo, Coordinador SST («supervisor»), administración y cliente (portal). */
export type Rol = "tecnico" | "supervisor" | "admin" | "cliente";

/** Estados del flujo de un documento (borrador → en revisión → aprobado → cerrado; o rechazado). */
export type Estado = "borrador" | "en_revision" | "aprobado" | "rechazado" | "cerrado";

/** Tipos de documento; cada uno es un módulo en src/modulos/registro.ts. */
export type TipoDoc = "reporte" | "permiso" | "gasto" | "cotizacion";

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
  /** NIT o C.C. (opcional): lo imprime la cotización. */
  nit?: string;
  /** Inactivo: sale de los selectores del generador, pero su historial se conserva. Por defecto, activo. */
  activo?: boolean;
  /**
   * Formato por defecto (variante, @/nucleo/variantes) de sus documentos cuando no se elige
   * proyecto; el tipo del proyecto manda sobre esto. Sin valor: SOTEC.
   */
  variante?: string;
}

export type EstadoProyecto = "activo" | "en_pausa" | "cerrado";

/**
 * Proyecto u obra de un cliente: SOTEC trabaja por proyecto y por cliente.
 * De cada proyecto cuelgan sus documentos (reportes, permisos, gastos y
 * cotizaciones) y sus cuentas de cobro. Refleja public.proyectos (0009).
 */
export interface Proyecto {
  id: string;
  codigo: string; // PRY-001-26
  consecutivo: number;
  nombre: string;
  clienteId: string;
  /** Sitio o ubicación de la obra dentro del cliente. */
  sitio: string;
  /** Usuario responsable (supervisor o ingeniero a cargo). */
  responsableId: string;
  fechaInicio: string;
  fechaFin?: string;
  estado: EstadoProyecto;
  presupuesto?: number;
  /**
   * Tipo de proyecto («Servicios SOTEC», «Servicios Fortox»…; lista en Configuración):
   * define la variante de formato de sus documentos. Sin valor (proyectos antiguos):
   * manda el formato por defecto del cliente o SOTEC.
   */
  tipo?: string;
  descripcion: string;
  creado: string;
  actualizado: string;
  historial: Evento[];
}

/** Entrada del historial de un documento, proyecto o cuenta. */
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
  /** Proyecto u obra al que pertenece (opcional). */
  proyectoId?: string;
  /** Equipos atendidos (módulo Equipos; public.documento_equipos en 0010). */
  equiposIds?: string[];
  /**
   * Variante de formato con la que se creó (marca: «sotec», «fortox»; @/nucleo/variantes).
   * Queda fija al guardar: no cambia si después cambia el tipo del proyecto. Sin valor: SOTEC.
   */
  variante?: string;
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

export interface DocCotizacion extends DocBase {
  tipo: "cotizacion";
  datos: DatosCotizacion;
}

/** Documento de cualquier formato; `tipo` determina la forma de `datos`. */
export type Documento = DocReporte | DocPermiso | DocGasto | DocCotizacion;
/** Contenido del formato según el tipo de documento. */
export type DatosDe<T extends TipoDoc> = Extract<Documento, { tipo: T }>["datos"];

/** Aviso para un rol entero o para un usuario. */
export interface Notificacion {
  id: string;
  para: Rol | string; // rol o id de usuario
  texto: string;
  docId?: string;
  /** Cuenta de cobro a la que lleva el aviso (p. ej. «emitió la cuenta de cobro…»). */
  cuentaId?: string;
  fecha: string;
  leida: boolean;
}

/** Registro de auditoría (quién hizo qué y cuándo). */
export interface Auditoria {
  id: string;
  fecha: string;
  usuarioId: string;
  accion: string;
  detalle: string;
}

/** Configuración de la organización: datos de la empresa, prefijos de consecutivos y datos de cobro. */
export interface Config {
  empresa: string;
  nit: string;
  ciudad: string;
  /** Contacto de la organización para encabezados y pies (cotización). */
  telefono?: string;
  correo?: string;
  prefijoReporte: string;
  prefijoPermiso: string;
  prefijoCobro: string;
  prefijoGasto: string;
  /** Prefijo por tipo de documento para los formatos nuevos (cotizacion…); si falta, el del módulo. */
  prefijos?: Partial<Record<TipoDoc, string>>;
  prefijoProyecto?: string;
  exigirFirmaCliente: boolean;
  vigenciaPermisoHoras: number;
  /** Datos que salen en la cuenta de cobro */
  ivaPorcentaje: number;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  titularCuenta: string;
  /** Opciones agregadas con «＋ Agregar otro» (asistente y formularios), por «formato.paso» (p. ej. «permiso.epp») o «equipos.sistema» / «equipos.tipo.<sistema>» (ver @/nucleo/opciones). */
  opcionesPropias?: Record<string, string[]>;
  /** Servicios o productos agregados al catálogo de la cotización desde el asistente. */
  serviciosPropios?: ServicioCatalogo[];
  /** Tipos de proyecto y su variante de formato (sin valor: los de fábrica, `TIPOS_PROYECTO_BASE`). */
  tiposProyecto?: TipoProyecto[];
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
