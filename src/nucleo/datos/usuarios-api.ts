"use client";

/**
 * Cliente de `/api/usuarios` para el panel de usuarios del modo empresa
 * (`src/components/usuarios/PanelUsuariosEmpresa.tsx`). Adjunta el token de la
 * sesión actual y convierte las respuestas de error en `Error` con el mensaje
 * del servidor, listo para mostrar. Contrato: `./usuarios-contrato.ts`.
 */

import { supabase } from "./supabase";
import type { CambiosUsuario, NuevoUsuario, RespuestaListaUsuarios, RespuestaOk, RespuestaUsuarioCreado } from "./usuarios-contrato";

/** Llama a /api/usuarios con la sesión actual; lanza Error con el mensaje del servidor. */
async function llamar<T>(metodo: "GET" | "POST" | "PATCH" | "DELETE", cuerpo?: unknown, id?: string): Promise<T> {
  const { data } = (await supabase()?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesión vencida. Vuelve a iniciar sesión.");
  const r = await fetch(`/api/usuarios${id ? `?id=${encodeURIComponent(id)}` : ""}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "No se pudo completar la operación.");
  return j as T;
}

/** Usuarios internos de la organización y el id de quien consulta. */
export const listarUsuarios = () => llamar<RespuestaListaUsuarios>("GET");

/** Crea la cuenta con su contraseña y le da acceso a la organización. */
export const crearUsuario = (nuevo: NuevoUsuario) => llamar<RespuestaUsuarioCreado>("POST", nuevo);

/** Cambia solo los campos presentes (nombre, cargo, rol, activo o contraseña). */
export const actualizarUsuario = (cambios: CambiosUsuario) => llamar<RespuestaOk>("PATCH", cambios);

/** Quita el acceso (o borra la cuenta si no pertenece a otra organización). */
export const eliminarUsuario = (id: string) => llamar<RespuestaOk>("DELETE", undefined, id);
