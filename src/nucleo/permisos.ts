/**
 * Permisos por rol en la app: matriz de acciones y reglas de quién ve, edita o
 * revisa cada documento, cuenta y proyecto. Replican las políticas RLS y los
 * triggers de la base (0008 separación de funciones, 0009 proyectos, 0011 lo
 * comercial solo admin); `DemoProvider` los vuelve a aplicar en cada acción.
 */
import type { CuentaCobro } from "@/modulos/cobros/tipos";
import { infoDoc } from "@/modulos/registro";
import type { Documento, Proyecto, Rol, TipoDoc, Usuario } from "@/nucleo/tipos";

/** Acciones que un rol puede tener (ver `MATRIZ` y `DESCRIPCION_ACCION`). */
export type Accion =
  | "crear"
  | "cotizar"
  | "ver_todos"
  | "revisar"
  | "cerrar_permiso"
  | "firmar_cliente"
  | "clientes"
  | "cobros"
  | "proyectos"
  | "equipos"
  | "ver_cobros"
  | "usuarios"
  | "config"
  | "auditoria"
  | "mapa";

/**
 * Matriz de roles. Lo COMERCIAL (cotizaciones y cuentas de cobro: `cotizar`, `cobros`,
 * `ver_cobros`) es solo de la administración; el técnico y el Coordinador SST no lo ven.
 * El cliente consulta sus cotizaciones (por `visibleCliente`) y sus cuentas emitidas.
 */
const MATRIZ: Record<Rol, Accion[]> = {
  tecnico: ["crear", "equipos"],
  supervisor: ["crear", "ver_todos", "revisar", "cerrar_permiso", "clientes", "proyectos", "equipos"],
  admin: ["crear", "cotizar", "ver_todos", "revisar", "cerrar_permiso", "clientes", "cobros", "ver_cobros", "proyectos", "equipos", "usuarios", "config", "auditoria", "mapa"],
  cliente: ["firmar_cliente", "ver_cobros"],
};

/** Texto de cada acción para la pantalla de usuarios y roles. */
export const DESCRIPCION_ACCION: Record<Accion, string> = {
  crear: "Crear reportes, permisos y legalizaciones de gastos",
  cotizar: "Crear, aprobar y enviar cotizaciones al cliente (comercial)",
  ver_todos: "Ver documentos de todo el equipo",
  revisar: "Aprobar o rechazar documentos",
  cerrar_permiso: "Cerrar permisos de trabajo",
  firmar_cliente: "Firmar reportes como cliente",
  clientes: "Gestionar clientes",
  cobros: "Crear y emitir cuentas de cobro (comercial)",
  proyectos: "Crear y gestionar proyectos",
  equipos: "Registrar, editar y retirar equipos de los clientes",
  ver_cobros: "Consultar cuentas de cobro",
  usuarios: "Gestionar usuarios y roles",
  config: "Configurar formatos y consecutivos",
  auditoria: "Consultar la auditoría",
  mapa: "Ver el mapa del sistema (módulos, base de datos y permisos)",
};

/** Todas las acciones, en el orden de `DESCRIPCION_ACCION`. */
export const ACCIONES = Object.keys(DESCRIPCION_ACCION) as Accion[];

/** Si el rol tiene la acción en la matriz. */
export function puede(rol: Rol, accion: Accion): boolean {
  return MATRIZ[rol].includes(accion);
}

/**
 * Si el perfil tiene acceso al módulo de un tipo de documento. El personal interno
 * necesita el permiso que exige el módulo (`requiere`, p. ej. `cotizar`); el cliente
 * ve en su portal los formatos visibles para él (`visibleCliente`).
 */
export function puedeUsarTipo(rol: Rol, tipo: TipoDoc): boolean {
  const info = infoDoc(tipo);
  if (rol === "cliente") return info.visibleCliente;
  return !info.requiere || puede(rol, info.requiere);
}

/** Si el perfil diligencia documentos nuevos de ese tipo (generador, «Nuevo», duplicar). */
export function puedeCrearTipo(rol: Rol, tipo: TipoDoc): boolean {
  return puede(rol, "crear") && puedeUsarTipo(rol, tipo);
}

/** Qué documentos ve cada usuario. */
export function puedeVerDoc(u: Usuario, d: Documento): boolean {
  // Módulos restringidos (lo comercial): sin el permiso no se ven, ni los propios
  if (!puedeUsarTipo(u.rol, d.tipo)) return false;
  if (puede(u.rol, "ver_todos")) return true;
  // Igual que la política documentos_ver de la base: solo aprobados o cerrados, y nunca
  // formatos internos (gastos; formatos.visible_cliente = false)
  if (u.rol === "cliente") return infoDoc(d.tipo).visibleCliente && d.clienteId === u.clienteId && (d.estado === "aprobado" || d.estado === "cerrado");
  return d.autorId === u.id;
}

/**
 * Solo el autor edita su documento, y solo mientras está en borrador o rechazado.
 * Los revisores no editan contenido ajeno: lo aprueban o lo devuelven con motivo
 * (separación de funciones del SGC; la base de datos aplica la misma regla).
 */
export function puedeEditarDoc(u: Usuario, d: Documento): boolean {
  if (u.rol === "cliente" || !puedeUsarTipo(u.rol, d.tipo)) return false;
  return d.autorId === u.id && (d.estado === "borrador" || d.estado === "rechazado");
}

/** Revisa (aprueba o rechaza) un revisor, sobre un documento en revisión que no sea suyo. */
export function puedeRevisarDoc(u: Usuario, d: Documento): boolean {
  return puede(u.rol, "revisar") && puedeUsarTipo(u.rol, d.tipo) && d.estado === "en_revision" && d.autorId !== u.id;
}

/** El cliente solo ve sus cuentas ya emitidas; la administración, todas. */
export function puedeVerCuenta(u: Usuario, c: CuentaCobro): boolean {
  if (puede(u.rol, "cobros")) return true;
  return u.rol === "cliente" && c.clienteId === u.clienteId && ["emitida", "enviada", "pagada"].includes(c.estado);
}

/**
 * Qué proyectos ve cada usuario (igual que la política proyectos_ver de 0009):
 * administración y SST, todos; el técnico, los activos (para elegir) y los que
 * tienen documentos suyos; el cliente, solo los de su empresa.
 */
export function puedeVerProyecto(u: Usuario, p: Proyecto, documentos: Documento[] = []): boolean {
  if (puede(u.rol, "ver_todos")) return true;
  if (u.rol === "cliente") return p.clienteId === u.clienteId;
  return p.estado === "activo" || p.responsableId === u.id || documentos.some((d) => d.proyectoId === p.id && d.autorId === u.id);
}
