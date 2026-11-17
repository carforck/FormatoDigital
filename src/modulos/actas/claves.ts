/**
 * Claves del panel de alarma en el acta de entrega (datos SENSIBLES): clave maestra, clave de
 * instalador y la clave telefónica de cada usuario. Reglas (aprobadas para el acta de Fortox):
 *   - En el formulario y en el detalle salen enmascaradas (●●●●) con «Mostrar» solo para quien
 *     las puede ver: el autor, la coordinación (supervisor) y la administración
 *     (`puedeVerClaves` en @/nucleo/permisos). El cliente y los demás las ven enmascaradas.
 *   - El acta impresa las lleva (es el documento que se entrega): /imprimir las imprime solo para
 *     esos perfiles; para los demás sale enmascarada.
 *   - Nunca van en listados, búsqueda, avisos, auditoría ni resúmenes: usar `sinClaves` antes de
 *     convertir el contenido en texto. No se escriben en la consola.
 * Funciones puras: tests/unit/acta.test.ts.
 */

import type { DatosActa } from "./tipos";

/** Lo que se ve en lugar de una clave escrita. */
export const MASCARA = "●●●●";

/** Clave enmascarada: «●●●●» si hay algo escrito; vacía si no. */
export const enmascarar = (v: string | undefined | null) => (v && String(v).trim() ? MASCARA : "");

/** Campos de primer nivel con claves. */
export const CAMPOS_CLAVE = ["claveMaestra", "claveInstalador"] as const;

/** Copia del acta sin claves (vacías): para búsqueda, resúmenes, duplicar o cualquier texto derivado. */
export function sinClaves(d: DatosActa): DatosActa {
  return { ...d, claveMaestra: "", claveInstalador: "", usuarios: (d.usuarios ?? []).map((u) => ({ ...u, claveTelefonica: "" })) };
}

/** Copia del acta con las claves enmascaradas (●●●●): lo que imprime o muestra un perfil sin permiso. */
export function conClavesOcultas(d: DatosActa): DatosActa {
  return {
    ...d,
    claveMaestra: enmascarar(d.claveMaestra),
    claveInstalador: enmascarar(d.claveInstalador),
    usuarios: (d.usuarios ?? []).map((u) => ({ ...u, claveTelefonica: enmascarar(u.claveTelefonica) })),
  };
}

/** Cuántas claves tiene escritas el acta (para avisos sin revelarlas). */
export function cuantasClaves(d: DatosActa): number {
  return CAMPOS_CLAVE.filter((k) => d[k]?.trim()).length + (d.usuarios ?? []).filter((u) => u.claveTelefonica?.trim()).length;
}

/** Clave válida del panel: 4 a 8 dígitos (paneles DSC, Paradox, Honeywell…). Vacía = sin validar. */
export function validarClave(v: string): string | null {
  if (!v) return null;
  return /^\d{4,8}$/.test(v) ? null : "La clave debe tener de 4 a 8 dígitos.";
}
