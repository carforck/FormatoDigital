"use client";

/**
 * Cliente de Supabase del navegador (llave publishable: pública, la protege RLS).
 * Un solo cliente por pestaña, con sesión persistente y renovación automática
 * del token. Lo usan el modo empresa (`./empresa.ts`) y la API de usuarios
 * (`./usuarios-api.ts`). El cliente con la llave secreta vive aparte, solo en
 * el servidor (`src/servidor/supabase-admin.ts`).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

/** Cliente del navegador; null si faltan las variables de Supabase (la demo funciona sin ellas). */
export function supabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !llave) return null;
  cliente ??= createClient(url, llave, { auth: { persistSession: true, autoRefreshToken: true } });
  return cliente;
}
