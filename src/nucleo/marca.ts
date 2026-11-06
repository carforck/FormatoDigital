/**
 * Marca que se muestra según el modo (pedido de Magno: «quitar el logo de SOTEC en la cuenta demo»).
 * - Modo empresa (cuenta real de SOTEC): el logo de SOTEC en la app y en los formatos.
 * - Modo demo (datos ficticios): solo la marca ControlOne; nunca el logo de una empresa real.
 * La landing (/) es la página comercial de «ControlOne by SOTEC» y su sección del caso SOTEC
 * puede seguir mostrando el logo de SOTEC: eso no pasa por aquí.
 */
import type { Modo } from "@/nucleo/datos/empresa";

/** Logo de SOTEC para fondos claros (formatos impresos). */
export const LOGO_SOTEC = "/sotec-logo-v3.png";
/** Logo de SOTEC para fondos oscuros (barra lateral). */
export const LOGO_SOTEC_OSCURO = "/sotec-logo-v3-oscuro.png";
/** Marca ControlOne (ícono + nombre) para fondos claros; en fondos oscuros va `MarcaControlOne`. */
export const LOGO_CONTROLONE = "/controlone-logo.png";

/** Logo de la barra lateral (fondo oscuro): el de SOTEC en la empresa; en la demo `null` → marca ControlOne en texto. */
export function logoBarra(modo: Modo): string | null {
  return modo === "empresa" ? LOGO_SOTEC_OSCURO : null;
}

/** Logo de los formatos (fondo claro) de la variante base: SOTEC en la empresa, ControlOne en la demo. */
export function logoFormato(modo: Modo): string {
  return modo === "empresa" ? LOGO_SOTEC : LOGO_CONTROLONE;
}

/** Nombre corto de la marca para la barra superior («SOTEC · SG-SST» / «ControlOne · SG-SST»). */
export function nombreMarca(modo: Modo): string {
  return modo === "empresa" ? "SOTEC" : "ControlOne";
}
