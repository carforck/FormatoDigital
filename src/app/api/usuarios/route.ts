/**
 * API `/api/usuarios`: usuarios con login del espacio de la empresa (modo empresa).
 *
 * Solo el `admin` activo de la organización la usa: crea la cuenta de Supabase
 * Auth con su contraseña, cambia rol, cargo, nombre, contraseña o estado, y
 * elimina. Corre en el servidor porque necesita la llave secreta
 * (`src/servidor/supabase-admin.ts`), que nunca llega al navegador.
 *
 * Contrato completo (métodos, cuerpos, respuestas y errores):
 * `src/nucleo/datos/usuarios-contrato.ts`. El cliente que la llama:
 * `src/nucleo/datos/usuarios-api.ts`.
 */

import { NextResponse } from "next/server";

import {
  claveValida,
  correoValido,
  esRolInterno,
  CLAVE_MINIMA,
  type RespuestaListaUsuarios,
  type RespuestaOk,
  type RespuestaUsuarioCreado,
  type RolInterno,
} from "@/nucleo/datos/usuarios-contrato";
import { adminQueLlama, miembroInterno, respuestaError as error } from "@/servidor/supabase-admin";

/** Siempre dinámica: depende del token de cada petición. */
export const dynamic = "force-dynamic";

const CLAVE_CORTA = `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres.`;

/** Lista los usuarios internos (no «cliente») de la organización del admin. */
export async function GET(req: Request) {
  const c = await adminQueLlama(req);
  if ("falla" in c) return c.falla;
  // miembros y perfiles se unen aquí: ambos apuntan a auth.users, no entre sí
  const { data: miembros, error: e } = await c.sb
    .from("miembros")
    .select("usuario_id, rol, cargo, activo")
    .eq("organizacion_id", c.org)
    .neq("rol", "cliente")
    .order("created_at");
  if (e || !miembros) return error("No se pudieron leer los usuarios.", 500);
  const { data: perfiles } = await c.sb.from("perfiles").select("id, email, nombre").in("id", miembros.map((m) => m.usuario_id));
  const perfil = new Map((perfiles ?? []).map((p) => [p.id as string, p]));
  const usuarios = miembros.map((m) => ({
    id: m.usuario_id as string,
    email: (perfil.get(m.usuario_id)?.email as string) ?? "",
    nombre: (perfil.get(m.usuario_id)?.nombre as string) ?? "",
    cargo: m.cargo as string,
    rol: m.rol as RolInterno,
    activo: m.activo as boolean,
  }));
  return NextResponse.json<RespuestaListaUsuarios>({ usuarios, yo: c.yo });
}

/**
 * Crea la cuenta (correo confirmado, sin enviar correo) y la membresía. Si la
 * membresía falla, borra la cuenta recién creada para no dejar usuarios huérfanos.
 */
export async function POST(req: Request) {
  const c = await adminQueLlama(req);
  if ("falla" in c) return c.falla;
  const b = await req.json().catch(() => ({}));
  const email = String(b.email ?? "").trim().toLowerCase();
  const nombre = String(b.nombre ?? "").trim();
  const cargo = String(b.cargo ?? "").trim();
  if (!correoValido(email)) return error("Escribe un correo válido.");
  if (!nombre) return error("Escribe el nombre.");
  if (!esRolInterno(b.rol)) return error("Elige un rol válido.");
  if (!claveValida(b.clave)) return error(CLAVE_CORTA);

  const { data: creado, error: e } = await c.sb.auth.admin.createUser({ email, password: b.clave, email_confirm: true, user_metadata: { nombre } });
  if (e || !creado.user) return error(/already|registered|exists/i.test(e?.message ?? "") ? "Ya existe un usuario con ese correo." : "No se pudo crear el usuario.");
  const id = creado.user.id;
  // El perfil lo crea el trigger de auth.users (0005); se completa el nombre y se da acceso a la organización
  await c.sb.from("perfiles").update({ nombre }).eq("id", id);
  const { error: eM } = await c.sb.from("miembros").insert({ organizacion_id: c.org, usuario_id: id, rol: b.rol, cargo });
  if (eM) {
    await c.sb.auth.admin.deleteUser(id);
    return error("No se pudo dar acceso a la empresa.", 500);
  }
  return NextResponse.json<RespuestaUsuarioCreado>({ usuario: { id, email, nombre, cargo, rol: b.rol, activo: true } });
}

/**
 * Cambia solo los campos presentes: rol, cargo y activo (en `miembros`), nombre
 * (en `perfiles`) y contraseña (en Auth). El admin no puede quitarse el rol de
 * administrador ni desactivarse.
 */
export async function PATCH(req: Request) {
  const c = await adminQueLlama(req);
  if ("falla" in c) return c.falla;
  const b = await req.json().catch(() => ({}));
  const id = String(b.id ?? "");
  if (!(await miembroInterno(c.sb, c.org, id))) return error("Usuario no encontrado.", 404);
  const propio = id === c.yo;
  if (propio && ((b.rol !== undefined && b.rol !== "admin") || b.activo === false)) return error("No puedes quitarte el rol de administrador ni desactivarte.");

  const miembro: Record<string, unknown> = {};
  if (b.rol !== undefined) {
    if (!esRolInterno(b.rol)) return error("Elige un rol válido.");
    miembro.rol = b.rol;
  }
  if (b.cargo !== undefined) miembro.cargo = String(b.cargo).trim();
  if (b.activo !== undefined) miembro.activo = Boolean(b.activo);
  if (Object.keys(miembro).length) {
    const { error: e } = await c.sb.from("miembros").update(miembro).eq("organizacion_id", c.org).eq("usuario_id", id);
    if (e) return error("No se pudo actualizar el usuario.", 500);
  }
  if (b.nombre !== undefined) {
    const nombre = String(b.nombre).trim();
    if (!nombre) return error("El nombre no puede quedar vacío.");
    await c.sb.from("perfiles").update({ nombre }).eq("id", id);
  }
  if (b.clave !== undefined) {
    if (!claveValida(b.clave)) return error(CLAVE_CORTA);
    const { error: e } = await c.sb.auth.admin.updateUserById(id, { password: b.clave });
    if (e) return error("No se pudo cambiar la contraseña.", 500);
  }
  return NextResponse.json<RespuestaOk>({ ok: true });
}

/**
 * Elimina `?id=`: si la persona pertenece a otra organización solo se le quita
 * el acceso a esta; si no, se borra su cuenta de Auth. Nadie se elimina a sí mismo.
 */
export async function DELETE(req: Request) {
  const c = await adminQueLlama(req);
  if ("falla" in c) return c.falla;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (id === c.yo) return error("No puedes eliminar tu propio usuario.");
  if (!(await miembroInterno(c.sb, c.org, id))) return error("Usuario no encontrado.", 404);
  const { count } = await c.sb.from("miembros").select("usuario_id", { count: "exact", head: true }).eq("usuario_id", id);
  const { error: e } =
    (count ?? 0) > 1
      ? await c.sb.from("miembros").delete().eq("organizacion_id", c.org).eq("usuario_id", id)
      : await c.sb.auth.admin.deleteUser(id);
  if (e) return error("No se pudo eliminar. Si tiene historial, desactívalo en lugar de eliminarlo.", 409);
  return NextResponse.json<RespuestaOk>({ ok: true });
}
