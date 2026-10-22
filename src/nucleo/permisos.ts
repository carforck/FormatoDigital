import type { CuentaCobro } from "@/modulos/cobros/tipos";
import type { Documento, Rol, Usuario } from "@/nucleo/tipos";

export type Accion =
  | "crear"
  | "ver_todos"
  | "revisar"
  | "cerrar_permiso"
  | "firmar_cliente"
  | "clientes"
  | "cobros"
  | "ver_cobros"
  | "usuarios"
  | "config"
  | "auditoria";

const MATRIZ: Record<Rol, Accion[]> = {
  tecnico: ["crear"],
  supervisor: ["crear", "ver_todos", "revisar", "cerrar_permiso", "clientes", "cobros", "ver_cobros"],
  admin: ["crear", "ver_todos", "revisar", "cerrar_permiso", "clientes", "cobros", "ver_cobros", "usuarios", "config", "auditoria"],
  cliente: ["firmar_cliente", "ver_cobros"],
};

export const DESCRIPCION_ACCION: Record<Accion, string> = {
  crear: "Crear reportes, permisos y legalizaciones de gastos",
  ver_todos: "Ver documentos de todo el equipo",
  revisar: "Aprobar o rechazar documentos",
  cerrar_permiso: "Cerrar permisos de trabajo",
  firmar_cliente: "Firmar reportes como cliente",
  clientes: "Gestionar clientes",
  cobros: "Crear y emitir cuentas de cobro",
  ver_cobros: "Consultar cuentas de cobro",
  usuarios: "Gestionar usuarios y roles",
  config: "Configurar formatos y consecutivos",
  auditoria: "Consultar la auditoría",
};

export const ACCIONES = Object.keys(DESCRIPCION_ACCION) as Accion[];

export function puede(rol: Rol, accion: Accion): boolean {
  return MATRIZ[rol].includes(accion);
}

/** Qué documentos ve cada usuario. */
export function puedeVerDoc(u: Usuario, d: Documento): boolean {
  if (puede(u.rol, "ver_todos")) return true;
  // Igual que la política documentos_ver de la base: solo aprobados o cerrados, y nunca formatos internos (gastos)
  if (u.rol === "cliente") return d.tipo !== "gasto" && d.clienteId === u.clienteId && (d.estado === "aprobado" || d.estado === "cerrado");
  return d.autorId === u.id;
}

/** El autor solo edita mientras el documento está en borrador o rechazado. */
/**
 * Solo el autor edita su documento, y solo mientras está en borrador o rechazado.
 * Los revisores no editan contenido ajeno: lo aprueban o lo devuelven con motivo
 * (separación de funciones del SGC; la base de datos aplica la misma regla).
 */
export function puedeEditarDoc(u: Usuario, d: Documento): boolean {
  if (u.rol === "cliente") return false;
  return d.autorId === u.id && (d.estado === "borrador" || d.estado === "rechazado");
}

/** Revisa (aprueba o rechaza) un revisor, sobre un documento en revisión que no sea suyo. */
export function puedeRevisarDoc(u: Usuario, d: Documento): boolean {
  return puede(u.rol, "revisar") && d.estado === "en_revision" && d.autorId !== u.id;
}

/** El cliente solo ve sus cuentas ya emitidas; la administración, todas. */
export function puedeVerCuenta(u: Usuario, c: CuentaCobro): boolean {
  if (puede(u.rol, "cobros")) return true;
  return u.rol === "cliente" && c.clienteId === u.clienteId && ["emitida", "enviada", "pagada"].includes(c.estado);
}
