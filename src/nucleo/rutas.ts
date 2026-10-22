/**
 * Prefijo de la ruta pública (vacío en Vercel: el sitio vive en la raíz). Se
 * conserva por si la app se sirve bajo una subruta; Link y router lo agregan solos,
 * esto es para <img>, fetch y URLs absolutas.
 */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (ruta: string) => `${BASE}${ruta}`;

/** Ruta del detalle de un documento (sin rutas dinámicas: compatible con exportación estática). */
export const rutaDoc = (id: string, extra = "") => `/app/documentos/ver?id=${id}${extra}`;

/** URL absoluta de una ruta pública (para correos y WhatsApp). */
export function urlPublica(ruta: string, query = ""): string {
  const origen = typeof window === "undefined" ? "" : window.location.origin;
  // Bajo una subruta estática las rutas terminan en "/"
  const r = BASE ? `${ruta.replace(/\/$/, "")}/` : ruta;
  return `${origen}${BASE}${r}${query ? `?${query}` : ""}`;
}

export const rutaCuenta = (id: string) => `/app/cobros/ver?id=${id}`;
