/**
 * Línea de contacto del pie de los formatos SOTEC (pedido de Magno: «en el pie de página que
 * salga el NIT y mi celular, centrado en la página»). Los valores los escribe la administración
 * en Configuración (`Config.nit`, `Config.telefono`, `Config.correo`); aquí solo se normalizan
 * para que «NIT NIT …» o «Cel. Cel. …» no salgan duplicados si el prefijo se escribió a mano.
 */

/** NIT sin el prefijo «NIT» que alguien pudo escribir («NIT: 900…», «nit. 900…» → «900…»). */
export function nitSinPrefijo(nit?: string | null): string {
  return (nit ?? "").replace(/^\s*n\.?\s*i\.?\s*t\.?\s*[:.\-–]?\s*/i, "").trim();
}

/** Celular sin el prefijo escrito a mano («Cel. 300…», «Celular: 300…», «Tel 300…» → «300…»). */
export function celularSinPrefijo(tel?: string | null): string {
  return (tel ?? "").replace(/^\s*(cel(ular)?|m[oó]vil|tel([eé]fono)?s?)\.?\s*[:.\-–]?\s*/i, "").trim();
}

/** «NIT 900.000.000-0» o "" si no hay NIT. */
export function textoNit(nit?: string | null): string {
  const n = nitSinPrefijo(nit);
  return n ? `NIT ${n}` : "";
}

/**
 * Partes de la línea del pie, en orden: «NIT …», «Cel. …» y lo adicional que el formato ya
 * mostraba (correo, web). Lo vacío no sale (sin «Cel.» suelto).
 */
export function partesContacto(datos: { nit?: string | null; telefono?: string | null; extras?: (string | null | undefined)[] }): string[] {
  const cel = celularSinPrefijo(datos.telefono);
  return [textoNit(datos.nit), cel ? `Cel. ${cel}` : "", ...(datos.extras ?? []).map((x) => (x ?? "").trim())].filter(Boolean);
}

/** Crédito de la marca en los formatos de la demo: «© 2026 ControlOne by SOTEC». */
export const creditoDemo = (anio = new Date().getFullYear()) => `© ${anio} ControlOne by SOTEC`;
