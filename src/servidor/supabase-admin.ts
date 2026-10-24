/**
 * Código SOLO del servidor: cliente de Supabase con la llave secreta
 * (`SUPABASE_SECRET_KEY`), que salta RLS. Lo usan los Route Handlers de
 * `src/app/api/`; nunca se importa desde un componente ni desde un archivo con
 * "use client" (la llave no debe llegar al navegador).
 *
 * Como la llave secreta salta RLS, cada handler verifica primero quién llama
 * (`adminQueLlama`) y filtra todo por su organización.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import type { RespuestaError } from "@/nucleo/datos/usuarios-contrato";

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRETA = process.env.SUPABASE_SECRET_KEY;

/** Respuesta de error JSON `{ error }` con su estado HTTP (400 por defecto). */
export const respuestaError = (mensaje: string, status = 400) => NextResponse.json<RespuestaError>({ error: mensaje }, { status });

/** Cliente con la llave secreta; null si el despliegue no tiene las variables. Sin sesión persistente: cada petición es independiente. */
export function clienteAdmin(): SupabaseClient | null {
  if (!URL_SB || !SECRETA) return null;
  return createClient(URL_SB, SECRETA, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Administrador verificado que hace la petición. */
export interface AdminVerificado {
  sb: SupabaseClient;
  /** Id del admin (`auth.users.id`). */
  yo: string;
  /** Organización donde es admin activo; todo se limita a ella. */
  org: string;
}

/**
 * Verifica el token `Authorization: Bearer <access_token>` de la petición y que
 * su dueño sea `admin` activo de alguna organización (la primera que encuentre).
 * Devuelve el admin o `{ falla }` con la respuesta de error lista para retornar
 * (503 sin configuración, 401 sin sesión o vencida, 403 si no es admin).
 */
export async function adminQueLlama(req: Request): Promise<AdminVerificado | { falla: NextResponse<RespuestaError> }> {
  const sb = clienteAdmin();
  if (!sb) return { falla: respuestaError("La gestión de usuarios no está configurada en este despliegue.", 503) };
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return { falla: respuestaError("Sesión requerida.", 401) };
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { falla: respuestaError("Sesión vencida. Vuelve a iniciar sesión.", 401) };
  const { data: m } = await sb
    .from("miembros")
    .select("organizacion_id")
    .eq("usuario_id", data.user.id)
    .eq("rol", "admin")
    .eq("activo", true)
    .limit(1)
    .maybeSingle();
  if (!m) return { falla: respuestaError("Solo el administrador gestiona los usuarios.", 403) };
  return { sb, yo: data.user.id, org: m.organizacion_id as string };
}

/** Membresía interna (no «cliente») del usuario en la organización; null si no pertenece. */
export async function miembroInterno(sb: SupabaseClient, org: string, usuarioId: string) {
  const { data } = await sb.from("miembros").select("rol").eq("organizacion_id", org).eq("usuario_id", usuarioId).neq("rol", "cliente").maybeSingle();
  return data;
}
