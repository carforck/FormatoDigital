"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Rol, Usuario } from "@/nucleo/tipos";

/**
 * Modo empresa (fase 1): la app guarda su estado completo por organización en
 * `public.espacios` (supabase/migrations/0012_espacio_empresa.sql) con
 * concurrencia optimista por versión. El modo demo sigue en localStorage.
 */

export type Modo = "demo" | "empresa";
export const KEY_MODO = "fd-modo";

let cliente: SupabaseClient | null = null;

/** Cliente del navegador; null si faltan las variables de Supabase. */
export function supabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !llave) return null;
  cliente ??= createClient(url, llave, { auth: { persistSession: true, autoRefreshToken: true } });
  return cliente;
}

export function leerModo(): Modo {
  try {
    return localStorage.getItem(KEY_MODO) === "empresa" ? "empresa" : "demo";
  } catch {
    return "demo";
  }
}

export function guardarModo(m: Modo) {
  try {
    localStorage.setItem(KEY_MODO, m);
  } catch {
    /* sin almacenamiento: queda en memoria */
  }
}

export interface Sesion {
  organizacionId: string;
  organizacion: string;
  usuario: Usuario;
}

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

export async function iniciarSesion(correo: string, clave: string): Promise<string | null> {
  const sb = supabase();
  if (!sb) return "El acceso de la empresa no está configurado en este despliegue.";
  const { error } = await sb.auth.signInWithPassword({ email: correo.trim().toLowerCase(), password: clave });
  if (error) return error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : "No se pudo iniciar sesión. Intenta de nuevo.";
  if (!(await sesionActual())) {
    await sb.auth.signOut();
    return "Tu usuario no tiene acceso al espacio de la empresa. Pide al administrador que te asigne un rol.";
  }
  return null;
}

export async function cerrarSesion() {
  await supabase()?.auth.signOut();
}

export async function leerEspacio(organizacionId: string): Promise<Espacio | null> {
  const { data, error } = await supabase()!.from("espacios").select("estado, version").eq("organizacion_id", organizacionId).maybeSingle();
  if (error || !data) return null;
  return { estado: (data.estado ?? {}) as Record<string, unknown>, version: Number(data.version) };
}

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
