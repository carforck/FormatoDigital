/**
 * Prefijo de la ruta pública. En GitHub Pages el sitio vive en /FormatoDigital;
 * en local queda vacío. Link y router lo agregan solos; esto es para <img>, fetch, etc.
 */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (ruta: string) => `${BASE}${ruta}`;

/** Ruta del detalle de un documento (sin rutas dinámicas: compatible con exportación estática). */
export const rutaDoc = (id: string, extra = "") => `/app/documentos/ver?id=${id}${extra}`;
