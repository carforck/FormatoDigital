/**
 * Contrato de la API `/api/usuarios` (modo empresa), compartido por el servidor
 * (`src/app/api/usuarios/route.ts`) y el cliente (`./usuarios-api.ts`).
 *
 * Solo tipos, constantes y validaciones puras: este archivo se importa en los
 * dos lados, así que no puede depender de React, del navegador ni de Supabase.
 *
 * | Método   | Cuerpo / parámetros                                   | Respuesta 200                         |
 * |----------|-------------------------------------------------------|---------------------------------------|
 * | `GET`    | —                                                     | `RespuestaListaUsuarios`              |
 * | `POST`   | `NuevoUsuario` (JSON)                                 | `RespuestaUsuarioCreado`              |
 * | `PATCH`  | `CambiosUsuario` (JSON, solo los campos que cambian)  | `RespuestaOk`                         |
 * | `DELETE` | `?id=<usuario>`                                       | `RespuestaOk`                         |
 *
 * Todas las llamadas llevan `Authorization: Bearer <access_token>` de la sesión
 * de Supabase y solo las atiende un `admin` activo de la organización. Los
 * errores responden `RespuestaError` con el estado HTTP:
 * 400 datos inválidos · 401 sin sesión o sesión vencida · 403 no es admin ·
 * 404 el usuario no es miembro interno de la organización · 409 no se pudo
 * eliminar (tiene historial) · 500 falla de Supabase · 503 despliegue sin
 * `SUPABASE_SECRET_KEY`.
 */

import type { Rol } from "@/nucleo/tipos";

/**
 * Roles con login en el espacio de la empresa, en el orden en que se ofrecen en
 * el formulario. El rol «cliente» queda fuera: el portal del cliente aún no usa
 * el modo empresa (fase 2).
 */
export const ROLES_INTERNOS = ["tecnico", "supervisor", "admin"] as const satisfies readonly Rol[];

/** Rol de una persona del equipo interno (todo menos «cliente»). */
export type RolInterno = (typeof ROLES_INTERNOS)[number];

/** Largo mínimo de la contraseña (igual en el formulario y en el servidor). */
export const CLAVE_MINIMA = 8;

/** Usuario con login del modo empresa: une `miembros` (rol, cargo, activo) y `perfiles` (correo, nombre). */
export interface UsuarioEmpresa {
  /** `auth.users.id` (también `perfiles.id` y `miembros.usuario_id`). */
  id: string;
  email: string;
  nombre: string;
  cargo: string;
  rol: RolInterno;
  /** `miembros.activo`: inactivo no puede iniciar sesión, pero conserva su historial. */
  activo: boolean;
}

/** `POST`: crea la cuenta de Supabase Auth (correo ya confirmado) y le da acceso a la organización. */
export interface NuevoUsuario {
  email: string;
  nombre: string;
  cargo: string;
  rol: RolInterno;
  /** Contraseña inicial (mínimo `CLAVE_MINIMA` caracteres). */
  clave: string;
}

/**
 * `PATCH`: solo se envían los campos que cambian. El admin no puede quitarse su
 * propio rol de administrador ni desactivarse (evita dejar la empresa sin admin).
 */
export interface CambiosUsuario {
  id: string;
  nombre?: string;
  cargo?: string;
  rol?: RolInterno;
  activo?: boolean;
  /** Contraseña nueva (mínimo `CLAVE_MINIMA` caracteres). */
  clave?: string;
}

/** `GET`: usuarios internos de la organización y el id de quien consulta (para no dejarlo editarse el rol). */
export interface RespuestaListaUsuarios {
  usuarios: UsuarioEmpresa[];
  yo: string;
}

/** `POST`: el usuario recién creado. */
export interface RespuestaUsuarioCreado {
  usuario: UsuarioEmpresa;
}

/** `PATCH` y `DELETE`. */
export interface RespuestaOk {
  ok: true;
}

/** Cualquier respuesta con estado distinto de 2xx: mensaje listo para mostrar al usuario. */
export interface RespuestaError {
  error: string;
}

/** ¿Es uno de los roles internos? */
export const esRolInterno = (r: unknown): r is RolInterno => typeof r === "string" && (ROLES_INTERNOS as readonly string[]).includes(r);

/** ¿La contraseña cumple el largo mínimo? */
export const claveValida = (c: unknown): c is string => typeof c === "string" && c.length >= CLAVE_MINIMA;

/** Validación básica de correo (Supabase Auth hace la definitiva). */
export const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
