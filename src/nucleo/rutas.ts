/**
 * Prefijo de la ruta pública. En GitHub Pages el sitio vive en /FormatoDigital;
 * en local queda vacío. Link y router lo agregan solos; esto es para <img>, fetch, etc.
 */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (ruta: string) => `${BASE}${ruta}`;

/** Ruta del detalle de un documento (sin rutas dinámicas: compatible con exportación estática). */
export const rutaDoc = (id: string, extra = "") => `/app/documentos/ver?id=${id}${extra}`;

/** URL absoluta de una ruta pública (para correos y WhatsApp). */
export function urlPublica(ruta: string, query = ""): string {
  const origen = typeof window === "undefined" ? "" : window.location.origin;
  // En GitHub Pages las rutas terminan en "/" (exportación estática con trailingSlash)
  const r = BASE ? `${ruta.replace(/\/$/, "")}/` : ruta;
  return `${origen}${BASE}${r}${query ? `?${query}` : ""}`;
}

export const rutaCuenta = (id: string) => `/app/cobros/ver?id=${id}`;
