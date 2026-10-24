"use client";

/**
 * Modo empresa (fase 1): acceso con usuario y contraseña de Supabase Auth y
 * estado completo de la app por organización en `public.espacios`
 * (supabase/migrations/0012_espacio_empresa.sql), con concurrencia optimista
 * por versión. El modo demo sigue en localStorage. Quien orquesta la carga, el
 * guardado y la sincronización es `DemoProvider` (`./DemoProvider.tsx`).
 *
 * Reglas del espacio: cada guardado envía la versión que leyó; la fila solo se
 * actualiza si nadie más guardó entre tanto (`version` sube de a uno, lo exige
 * también la base de datos). Si otro equipo ganó, se responde "conflicto" y el
 * proveedor recarga el estado remoto.
 *
 * Sin conexión (app instalable, ver README «App instalable y sin conexión»): tras cada
 * carga o guardado exitoso quedan en este equipo la sesión (`fd-empresa-sesion`) y la
 * última copia del espacio (el estado en `fd-empresa-respaldo`; su versión y si tiene
 * cambios pendientes en `fd-empresa-copia`). Si al abrir no hay red, el proveedor trabaja con esa copia y sincroniza
 * cuando vuelve la conexión, con la misma regla de versión optimista.
 */

import type { Rol, Usuario } from "@/nucleo/tipos";

import { supabase } from "./supabase";

/** «demo»: datos ficticios en localStorage · «empresa»: espacio real en Supabase. */
export type Modo = "demo" | "empresa";
const KEY_MODO = "fd-modo";

/** Modo elegido en /acceso; se recuerda en el navegador. */
export function leerModo(): Modo {
  try {
    return localStorage.getItem(KEY_MODO) === "empresa" ? "empresa" : "demo";
  } catch {
    return "demo";
  }
}

/** Recuerda el modo para la próxima visita. */
export function guardarModo(m: Modo) {
  try {
    localStorage.setItem(KEY_MODO, m);
  } catch {
    /* sin almacenamiento: queda en memoria */
  }
}

/** Sesión del modo empresa: la organización y el usuario (con su rol) salen de `miembros` y `perfiles`. */
export interface Sesion {
  organizacionId: string;
  organizacion: string;
  usuario: Usuario;
}

/** Fila de `espacios`: el estado completo de la app (JSON) y su versión. */
export interface Espacio {
  estado: Record<string, unknown>;
  version: number;
}

/** No se pudo confirmar la sesión por falta de red (distinto de «no hay sesión»). */
export const SIN_CONEXION = "sin-conexion" as const;

/** El navegador sabe que no hay red. */
const sinRed = () => typeof navigator !== "undefined" && navigator.onLine === false;

/**
 * Sesión activa con su organización y rol (primera membresía activa del equipo interno).
 * null: no hay sesión o ya no tiene acceso. SIN_CONEXION: no se pudo consultar (sin red o
 * servidor caído); el proveedor usa entonces la sesión guardada en este equipo.
 */
export async function sesionActual(): Promise<Sesion | null | typeof SIN_CONEXION> {
  const sb = supabase();
  if (!sb) return null;
  if (sinRed()) return SIN_CONEXION;
  const { data, error: errorSesion } = await sb.auth.getSession();
  const user = data.session?.user;
  // Un token vencido que no se pudo renovar por falta de red no es «sin sesión»
  if (!user) return errorSesion && (errorSesion.status === 0 || errorSesion.name === "AuthRetryableFetchError") ? SIN_CONEXION : null;
  const { data: miembros, error } = await sb
    .from("miembros")
    .select("organizacion_id, rol, cargo, activo, organizaciones(nombre)")
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .neq("rol", "cliente");
  if (error) return SIN_CONEXION;
  if (!miembros?.length) return null;
  const m = miembros[0] as unknown as { organizacion_id: string; rol: Rol; cargo: string; organizaciones: { nombre: string } | null };
  const { data: perfil } = await sb.from("perfiles").select("nombre, cedula").eq("id", user.id).maybeSingle();
  const sesion: Sesion = {
    organizacionId: m.organizacion_id,
    organizacion: m.organizaciones?.nombre ?? "",
    usuario: {
      id: user.id,
      nombre: perfil?.nombre || user.email || "Usuario",
      cargo: m.cargo,
      rol: m.rol,
      email: user.email ?? "",
      cedula: perfil?.cedula || undefined,
      activo: true,
    },
  };
  guardarLocal(KEY_SESION, JSON.stringify(sesion));
  return sesion;
}

/** Dominio de los usuarios internos sin correo propio: «admin» entra como admin@sotecse.com. */
const DOMINIO_USUARIOS = "sotecse.com";
const aCorreo = (usuario: string) => {
  const u = usuario.trim().toLowerCase();
  return u.includes("@") ? u : `${u}@${DOMINIO_USUARIOS}`;
};

/**
 * Inicia sesión con usuario o correo y contraseña. Un usuario sin «@» se completa
 * con el dominio de la empresa. Devuelve null si entró o el mensaje de error
 * para mostrar; si la cuenta no tiene rol interno activo, cierra la sesión.
 */
export async function iniciarSesion(correo: string, clave: string): Promise<string | null> {
  const sb = supabase();
  if (!sb) return "El acceso de la empresa no está configurado en este despliegue.";
  const { error } = await sb.auth.signInWithPassword({ email: aCorreo(correo), password: clave });
  if (error) return error.message === "Invalid login credentials" ? "Usuario o contraseña incorrectos." : "No se pudo iniciar sesión. Intenta de nuevo.";
  const ses = await sesionActual();
  if (ses === SIN_CONEXION) return "No se pudo verificar tu acceso. Revisa la conexión e intenta de nuevo.";
  if (!ses) {
    await sb.auth.signOut();
    return "Tu usuario no tiene acceso al espacio de la empresa. Pide al administrador que te asigne un rol.";
  }
  return null;
}

/**
 * Cierra la sesión de Supabase y olvida la sesión guardada (sin conexión ya no se puede
 * entrar). La copia local del espacio y el respaldo se conservan: si quedaron cambios sin
 * sincronizar, se envían cuando la misma persona vuelva a iniciar sesión.
 */
export async function cerrarSesion() {
  borrarLocal(KEY_SESION);
  await supabase()?.auth.signOut();
}

/** Lee el espacio de la organización; null si no existe o no se pudo leer (RLS, red). */
export async function leerEspacio(organizacionId: string): Promise<Espacio | null> {
  const { data, error } = await supabase()!.from("espacios").select("estado, version").eq("organizacion_id", organizacionId).maybeSingle();
  if (error || !data) return null;
  return { estado: (data.estado ?? {}) as Record<string, unknown>, version: Number(data.version) };
}

/** Solo la versión (consulta liviana para saber si otro equipo guardó). */
export async function versionEspacio(organizacionId: string): Promise<number | null> {
  const { data, error } = await supabase()!.from("espacios").select("version").eq("organizacion_id", organizacionId).maybeSingle();
  return error || !data ? null : Number(data.version);
}

/** Guarda si nadie más guardó desde `version`. Devuelve la versión nueva, "conflicto" o "error". */
export async function guardarEspacio(organizacionId: string, estado: unknown, version: number): Promise<number | "conflicto" | "error"> {
  const { data, error } = await supabase()!
    .from("espacios")
    .update({ estado, version: version + 1 })
    .eq("organizacion_id", organizacionId)
    .eq("version", version)
    .select("version");
  if (error) return "error";
  return data?.length ? Number(data[0].version) : "conflicto";
}

// ── Copia local para trabajar sin conexión ─────────────────────────────────────────

/** Última sesión confirmada en línea (organización, usuario y rol). */
const KEY_SESION = "fd-empresa-sesion";
/** Estado (JSON) de la última copia del espacio en este equipo: el respaldo local de siempre. */
const KEY_RESPALDO = "fd-empresa-respaldo";
/** Datos de esa copia (ver `CopiaLocal`); el estado en sí va en KEY_RESPALDO para no guardarlo dos veces. */
const KEY_COPIA = "fd-empresa-copia";
/** Cambios propios que perdieron un conflicto de versión (solo el último), por si hay que rescatarlos a mano. */
const KEY_CONFLICTO = "fd-empresa-conflicto";

/**
 * Datos de la copia local del espacio. `version` es la versión del servidor sobre la que se
 * trabaja; `pendiente`, que el estado tiene cambios que aún no llegan al servidor. Va atada
 * a la organización y al usuario: otra persona que entre en el mismo equipo no la usa.
 */
interface CopiaLocal {
  organizacionId: string;
  usuarioId: string;
  version: number;
  pendiente: boolean;
  /** Fecha (ISO) en que se guardó la copia. */
  fecha: string;
}

function guardarLocal(clave: string, valor: string): boolean {
  try {
    localStorage.setItem(clave, valor);
    return true;
  } catch {
    return false; // sin almacenamiento o sin espacio (las fotos ocupan)
  }
}
function leerLocal(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
function borrarLocal(clave: string) {
  try {
    localStorage.removeItem(clave);
  } catch {
    /* ignorar */
  }
}

/** Sesión guardada en este equipo tras el último ingreso en línea (null si se cerró la sesión). */
export function sesionGuardada(): Sesion | null {
  try {
    return JSON.parse(leerLocal(KEY_SESION) ?? "null") as Sesion | null;
  } catch {
    return null;
  }
}

/** Copia local del espacio de esa organización y usuario (con `pendiente`), si existe. */
export function espacioLocal(organizacionId: string, usuarioId: string): (Espacio & { pendiente: boolean }) | null {
  try {
    const c = JSON.parse(leerLocal(KEY_COPIA) ?? "null") as CopiaLocal | null;
    const estado = leerLocal(KEY_RESPALDO);
    if (!c || !estado || c.organizacionId !== organizacionId || c.usuarioId !== usuarioId) return null;
    return { estado: JSON.parse(estado) as Record<string, unknown>, version: c.version, pendiente: c.pendiente };
  } catch {
    return null;
  }
}

/**
 * Guarda la copia local del espacio (`estadoJson`: el estado compartido ya serializado) al
 * cargar, al guardar y al editar sin conexión. Devuelve false si el navegador no tiene espacio.
 */
export function guardarEspacioLocal(c: Omit<CopiaLocal, "fecha">, estadoJson: string): boolean {
  // Primero el estado y luego sus datos: si el estado no cabe, la copia anterior sigue coherente
  if (!guardarLocal(KEY_RESPALDO, estadoJson)) return false;
  return guardarLocal(KEY_COPIA, JSON.stringify({ ...c, fecha: new Date().toISOString() }));
}

/** Deja aparte los cambios propios que perdieron un conflicto de versión (rescate manual). */
export function guardarConflicto(estadoJson: string) {
  guardarLocal(KEY_CONFLICTO, estadoJson);
}
