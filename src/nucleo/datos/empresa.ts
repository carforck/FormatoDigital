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

/** Sesión activa con su organización y rol (primera membresía activa del equipo interno). */
export async function sesionActual(): Promise<Sesion | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  const { data: miembros, error } = await sb
    .from("miembros")
    .select("organizacion_id, rol, cargo, activo, organizaciones(nombre)")
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .neq("rol", "cliente");
  if (error || !miembros?.length) return null;
  const m = miembros[0] as unknown as { organizacion_id: string; rol: Rol; cargo: string; organizaciones: { nombre: string } | null };
  const { data: perfil } = await sb.from("perfiles").select("nombre, cedula").eq("id", user.id).maybeSingle();
  return {
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
  if (!(await sesionActual())) {
    await sb.auth.signOut();
    return "Tu usuario no tiene acceso al espacio de la empresa. Pide al administrador que te asigne un rol.";
  }
  return null;
}

/** Cierra la sesión de Supabase (no borra el respaldo local del espacio). */
export async function cerrarSesion() {
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
