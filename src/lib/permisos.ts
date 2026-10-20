import type { Documento, Rol, Usuario } from "./types";

export type Accion =
  | "crear"
  | "ver_todos"
  | "revisar"
  | "cerrar_permiso"
  | "firmar_cliente"
  | "clientes"
  | "usuarios"
  | "config"
  | "auditoria";

const MATRIZ: Record<Rol, Accion[]> = {
  tecnico: ["crear"],
  supervisor: ["crear", "ver_todos", "revisar", "cerrar_permiso", "clientes"],
  admin: ["crear", "ver_todos", "revisar", "cerrar_permiso", "clientes", "usuarios", "config", "auditoria"],
  cliente: ["firmar_cliente"],
};

export const DESCRIPCION_ACCION: Record<Accion, string> = {
  crear: "Crear reportes y permisos",
  ver_todos: "Ver documentos de todo el equipo",
  revisar: "Aprobar o rechazar documentos",
  cerrar_permiso: "Cerrar permisos de trabajo",
  firmar_cliente: "Firmar reportes como cliente",
  clientes: "Gestionar clientes",
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
  if (u.rol === "cliente") return d.clienteId === u.clienteId && d.estado !== "borrador" && d.estado !== "rechazado";
  return d.autorId === u.id;
}

/** El autor solo edita mientras el documento está en borrador o rechazado. */
export function puedeEditarDoc(u: Usuario, d: Documento): boolean {
  if (u.rol === "cliente") return false;
  const abierto = d.estado === "borrador" || d.estado === "rechazado";
  return abierto && (d.autorId === u.id || puede(u.rol, "revisar"));
}
