/**
 * Tipos del módulo Equipos (inventario simple por cliente y sistema). Se guardan
 * en public.equipos y la relación con los reportes en public.documento_equipos
 * (0010_equipos.sql). Reexportados en `@/nucleo/tipos`.
 */

import type { Evento } from "@/nucleo/tipos";

import type { SISTEMAS } from "./catalogo";

/** Clave del sistema (CCTV, alarmas, control de acceso…): sale del catálogo, así se amplía en un solo lugar. */
export type SistemaEquipo = (typeof SISTEMAS)[number]["clave"];

/** «Retirado»: dado de baja; no se ofrece en los reportes nuevos, pero conserva su historial. */
export type EstadoEquipo = "operativo" | "con_falla" | "fuera_servicio" | "retirado";

/**
 * Equipo instalado en un cliente (y, opcional, en un proyecto): «Cámara 7 – Portería»,
 * «NVR 16 canales», «Energizador cerca norte». Su historial son los reportes técnicos
 * que lo marcan como atendido (`Documento.equiposIds`). Refleja public.equipos (0010).
 *
 * Lo mínimo para crearlo es sistema, tipo y nombre: el técnico lo crea desde el
 * reporte y marca, modelo y serial se completan después en la ficha.
 */
export interface Equipo {
  id: string;
  clienteId: string;
  proyectoId?: string;
  sistema: SistemaEquipo;
  /** DVR/NVR, cámara domo, sensor de movimiento, panel, controladora, PC, switch… */
  tipo: string;
  nombre: string;
  marca: string;
  modelo: string;
  serial: string;
  ubicacion: string;
  estado: EstadoEquipo;
  notas: string;
  creadoPor: string;
  creado: string;
  actualizado: string;
  historial: Evento[];
}

/** Lo mínimo para crear un equipo desde el reporte. */
export interface EquipoMinimo {
  clienteId: string;
  proyectoId?: string;
  sistema: SistemaEquipo;
  tipo: string;
  nombre: string;
  ubicacion?: string;
}

/** Resultado de guardar un equipo: el guardado (o el que ya existía con ese nombre) o un error. */
export interface ResultadoEquipo {
  equipo: Equipo | null;
  error: string | null;
  /** Ya existía un equipo con ese nombre en el cliente y el sistema: no se duplicó. */
  existente?: boolean;
}

/** Lo que el proveedor de datos expone del módulo de equipos. */
export interface ApiEquipos {
  equipos: Equipo[];
  /** Los que el usuario actual puede ver (el cliente, solo los de su empresa). */
  equiposVisibles: Equipo[];
  /** Crea o actualiza (admin, SST y técnico). Idempotente: el mismo nombre en el mismo cliente y sistema no se duplica. */
  guardarEquipo: (e: Equipo) => ResultadoEquipo;
  /** Crea con lo mínimo (sistema, tipo, nombre) o devuelve el que ya existe con ese nombre. */
  crearEquipo: (m: EquipoMinimo) => ResultadoEquipo;
  /** Cambia el estado (fuera de servicio, retirar, reactivar). Admin, SST y técnico. Devuelve un error o null. */
  cambiarEstadoEquipo: (id: string, estado: EstadoEquipo) => string | null;
  /** Borra un equipo SIN reportes (admin y SST); con historial hay que retirarlo. Devuelve un error o null. */
  eliminarEquipo: (id: string) => string | null;
}

/** Lo que imprime el formato de un equipo atendido. */
export interface EquipoAtendido {
  id: string;
  nombre: string;
  sistema: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  serial?: string;
  ubicacion?: string;
}
