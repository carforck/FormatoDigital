import { BASE } from "@/nucleo/rutas";
import type { Documento } from "@/nucleo/tipos";

/**
 * Impresión y PDF: todos los botones «PDF» / «Imprimir» abren la ruta
 * dedicada `/imprimir` (fuera del shell del aplicativo), en la misma pestaña
 * (en el celular las ventanas emergentes se bloquean). Allí solo están las
 * hojas del documento en flujo normal, así imprime igual en Safari (iOS),
 * Chrome (Android) y los navegadores de escritorio. Ver docs/ARQUITECTURA.md.
 */

/** Página desde la que se abrió la impresión (para que «Volver» regrese con «atrás»). */
export const CLAVE_ORIGEN_IMPRESION = "fd-imprimir-origen";
/** Borrador en memoria del generador que se pasa a la impresión (sessionStorage). */
const PREFIJO_BORRADOR = "fd-imprimir-borrador-";
/** El generador recupera al volver lo que tenía sin guardar de un documento existente. */
export const CLAVE_RETORNO_GENERADOR = "fd-generador-retorno";

type Navegador = { push: (href: string) => void };

export interface ParamsImpresion {
  /** Documento guardado. */
  doc?: string;
  /** Cuenta de cobro guardada. */
  cuenta?: string;
  /** Contenido actual del generador (puede no estar guardado). */
  borrador?: Documento;
}

/** Ruta + query de la página actual, sin el prefijo de la ruta pública (el router lo agrega). */
function aqui(): string {
  const ruta = BASE && location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) || "/" : location.pathname;
  return ruta + location.search;
}

/** Guarda el borrador para la página de impresión; devuelve su clave o null si no cupo. */
export function guardarBorradorImpresion(doc: Documento): string | null {
  try {
    // Solo se conserva el último: las fotos ocupan espacio
    for (const k of Object.keys(sessionStorage)) if (k.startsWith(PREFIJO_BORRADOR)) sessionStorage.removeItem(k);
    const clave = `${PREFIJO_BORRADOR}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    sessionStorage.setItem(clave, JSON.stringify(doc));
    return clave;
  } catch {
    return null;
  }
}

export function leerBorradorImpresion(clave: string): Documento | null {
  if (!clave.startsWith(PREFIJO_BORRADOR)) return null;
  try {
    return JSON.parse(sessionStorage.getItem(clave) ?? "null");
  } catch {
    return null;
  }
}

/** Abre la página de impresión del documento, la cuenta o el borrador indicado; devuelve la clave del borrador. */
export function abrirImpresion(router: Navegador, p: ParamsImpresion): string | null {
  const volver = aqui();
  const q = new URLSearchParams();
  let clave: string | null = null;
  if (p.doc) q.set("doc", p.doc);
  if (p.cuenta) q.set("cuenta", p.cuenta);
  if (p.borrador) {
    clave = guardarBorradorImpresion(p.borrador);
    if (clave) q.set("borrador", clave);
    // Sin espacio: la página cae al guardado automático del generador
    else q.set("borrador", "");
    q.set("tipo", p.borrador.tipo);
    q.set("id", p.borrador.id);
  }
  q.set("volver", volver);
  // Cada apertura imprime una vez sola (la marca evita repetirlo al volver con «adelante»)
  q.set("n", Date.now().toString(36));
  try {
    sessionStorage.setItem(CLAVE_ORIGEN_IMPRESION, volver);
  } catch {
    /* sin almacenamiento */
  }
  router.push(`/imprimir?${q.toString()}`);
  return clave;
}

/** Nombre del archivo PDF (el navegador lo toma del título): sin caracteres inválidos en nombres de archivo. */
export function tituloArchivo(partes: (string | undefined)[]): string {
  return partes
    .map((x) => (x ?? "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" · ")
    .slice(0, 150);
}
