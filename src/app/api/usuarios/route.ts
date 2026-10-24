import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Usuarios con acceso al espacio de la empresa (modo empresa). Solo el admin de la
 * organización: crea la cuenta de Supabase Auth con su contraseña, cambia rol,
 * cargo, nombre, contraseña o estado, y elimina. La llave secreta vive solo aquí.
 * El rol «cliente» queda fuera: el portal del cliente aún no usa el modo empresa.
 */

export const dynamic = "force-dynamic";

const ROLES = ["admin", "supervisor", "tecnico"] as const;
type RolInterno = (typeof ROLES)[number];

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRETA = process.env.SUPABASE_SECRET_KEY;

const error = (mensaje: string, status = 400) => NextResponse.json({ error: mensaje }, { status });
const esRol = (r: unknown): r is RolInterno => typeof r === "string" && (ROLES as readonly string[]).includes(r);
const claveValida = (c: unknown): c is string => typeof c === "string" && c.length >= 8;

function admin() {
  if (!URL_SB || !SECRETA) return null;
  return createClient(URL_SB, SECRETA, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Quién llama (por su token de sesión) y su organización, si es admin activo. */
async function adminQueLlama(req: Request) {
  const sb = admin();
  if (!sb) return { falla: error("La gestión de usuarios no está configurada en este despliegue.", 503) };
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return { falla: error("Sesión requerida.", 401) };
  const { data, error: e } = await sb.auth.getUser(token);
  if (e || !data.user) return { falla: error("Sesión vencida. Vuelve a iniciar sesión.", 401) };
  const { data: m } = await sb.from("miembros").select("organizacion_id").eq("usuario_id", data.user.id).eq("rol", "admin").eq("activo", true).limit(1).maybeSingle();
  if (!m) return { falla: error("Solo el administrador gestiona los usuarios.", 403) };
  return { sb, yo: data.user.id, org: m.organizacion_id as string };
}

/** El usuario es miembro interno de la organización del admin. */
async function miembroDe(sb: NonNullable<ReturnType<typeof admin>>, org: string, usuarioId: string) {
  const { data } = await sb.from("miembros").select("rol").eq("organizacion_id", org).eq("usuario_id", usuarioId).neq("rol", "cliente").maybeSingle();
  return data;
}

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
  return NextResponse.json({ usuarios, yo: c.yo });
}

export async function POST(req: Request) {
  const c = await adminQueLlama(req);
  if ("falla" in c) return c.falla;
  const b = await req.json().catch(() => ({}));
  const email = String(b.email ?? "").trim().toLowerCase();
  const nombre = String(b.nombre ?? "").trim();
  const cargo = String(b.cargo ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error("Escribe un correo válido.");
  if (!nombre) return error("Escribe el nombre.");
  if (!esRol(b.rol)) return error("Elige un rol válido.");
  if (!claveValida(b.clave)) return error("La contraseña debe tener al menos 8 caracteres.");

  const { data: creado, error: e } = await c.sb.auth.admin.createUser({ email, password: b.clave, email_confirm: true, user_metadata: { nombre } });
  if (e || !creado.user) return error(/already|registered|exists/i.test(e?.message ?? "") ? "Ya existe un usuario con ese correo." : "No se pudo crear el usuario.");
  const id = creado.user.id;
  // El perfil lo crea el trigger de auth.users; se completa el nombre y se da acceso a la organización
  await c.sb.from("perfiles").update({ nombre }).eq("id", id);
  const { error: eM } = await c.sb.from("miembros").insert({ organizacion_id: c.org, usuario_id: id, rol: b.rol, cargo });
  if (eM) {
    await c.sb.auth.admin.deleteUser(id);
    return error("No se pudo dar acceso a la empresa.", 500);
  }
  return NextResponse.json({ usuario: { id, email, nombre, cargo, rol: b.rol, activo: true } });
}

export async function PATCH(req: Request) {
  const c = await adminQueLlama(req);
  if ("falla" in c) return c.falla;
  const b = await req.json().catch(() => ({}));
  const id = String(b.id ?? "");
  if (!(await miembroDe(c.sb, c.org, id))) return error("Usuario no encontrado.", 404);
  const propio = id === c.yo;
  if (propio && ((b.rol !== undefined && b.rol !== "admin") || b.activo === false)) return error("No puedes quitarte el rol de administrador ni desactivarte.");

  const miembro: Record<string, unknown> = {};
  if (b.rol !== undefined) {
    if (!esRol(b.rol)) return error("Elige un rol válido.");
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
    if (!claveValida(b.clave)) return error("La contraseña debe tener al menos 8 caracteres.");
    const { error: e } = await c.sb.auth.admin.updateUserById(id, { password: b.clave });
    if (e) return error("No se pudo cambiar la contraseña.", 500);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const c = await adminQueLlama(req);
  if ("falla" in c) return c.falla;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (id === c.yo) return error("No puedes eliminar tu propio usuario.");
  if (!(await miembroDe(c.sb, c.org, id))) return error("Usuario no encontrado.", 404);
  // Si pertenece a otra organización solo se le quita el acceso a esta; si no, se borra la cuenta
  const { count } = await c.sb.from("miembros").select("usuario_id", { count: "exact", head: true }).eq("usuario_id", id);
  const { error: e } =
    (count ?? 0) > 1
      ? await c.sb.from("miembros").delete().eq("organizacion_id", c.org).eq("usuario_id", id)
      : await c.sb.auth.admin.deleteUser(id);
  if (e) return error("No se pudo eliminar. Si tiene historial, desactívalo en lugar de eliminarlo.", 409);
  return NextResponse.json({ ok: true });
}
