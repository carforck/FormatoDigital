/**
 * Conversión de un requerimiento en cotización (pedido de Magno): la administración abre
 * el generador de la cotización con el cliente, el proyecto y los ítems del requerimiento;
 * los precios salen del precio de referencia del catálogo cuando la descripción coincide
 * (si no, quedan en 0 para que los ponga). La cotización guarda `origenId` = el requerimiento,
 * y el requerimiento queda cerrado («Atendido») con el evento `CONVERTIDO_EN` en su historial.
 * Funciones puras (sin React) para probarlas en tests/unit/requerimiento.test.ts.
 */

import { CATALOGO_SERVICIOS, IVA_GENERAL, cotizacionVacia, idItem, type ServicioCatalogo } from "@/modulos/cotizaciones/catalogo";
import type { DatosCotizacion, ItemCotizacion } from "@/modulos/cotizaciones/tipos";
import type { Cliente, Documento, Proyecto } from "@/nucleo/tipos";

import { servicioDe } from "./catalogo";
import type { DatosRequerimiento } from "./tipos";

/** Evento del historial del requerimiento al convertirlo (detalle: el código de la cotización). */
export const CONVERTIDO_EN = "Convertido en cotización";
/** Evento del historial del requerimiento si se elimina el borrador de su cotización (vuelve a quedar por cotizar). */
export const COTIZACION_ELIMINADA = "Se eliminó la cotización: queda pendiente de cotizar";

/** Cotización que salió de un requerimiento (la que tiene `origenId` = su id), si ya se convirtió. */
export function cotizacionDe(reqId: string, documentos: Documento[]): Documento | undefined {
  return documentos.find((d) => d.tipo === "cotizacion" && d.origenId === reqId);
}

/** Resultado de la conversión: el contenido de la cotización y cuántos ítems quedaron con o sin precio. */
export interface Conversion {
  datos: DatosCotizacion;
  conPrecio: number;
  sinPrecio: number;
}

/** Ítem de la cotización a partir de una línea del requerimiento (precio e IVA del catálogo si coincide). */
export function itemCotizacionDe(i: DatosRequerimiento["items"][number], catalogo: ServicioCatalogo[] = CATALOGO_SERVICIOS): ItemCotizacion {
  const s = servicioDe(i.descripcion, catalogo);
  return {
    id: idItem(),
    descripcion: i.descripcion.trim(),
    detalle: (i.detalle ?? "").trim() || s?.detalle || "",
    cantidad: i.cantidad > 0 ? i.cantidad : 1,
    unidad: i.unidad || s?.unidad || "Unidades",
    precioUnitario: s?.precioReferencia ?? 0,
    ivaPct: s?.ivaPct ?? IVA_GENERAL,
  };
}

/**
 * Contenido de la cotización desde el requerimiento: cliente (con sus datos del directorio si
 * está), asunto (el del requerimiento; si no, el proyecto), ítems con precio de referencia y las
 * condiciones por defecto. Las observaciones internas del técnico no pasan al cliente.
 */
export function cotizacionDesdeRequerimiento(
  req: DatosRequerimiento,
  o: { hoy: string; vendedor: string; cliente?: Cliente; proyecto?: Proyecto; catalogo?: ServicioCatalogo[] },
): Conversion {
  const c = o.cliente;
  const items = req.items.filter((i) => i.descripcion.trim()).map((i) => itemCotizacionDe(i, o.catalogo ?? CATALOGO_SERVICIOS));
  const sitio = req.sitio.trim();
  const base = req.asunto.trim() || (o.proyecto ? o.proyecto.nombre : "");
  const asunto = sitio && base && !base.toLowerCase().includes(sitio.toLowerCase()) ? `${base} · ${sitio}` : base || sitio;
  const datos: DatosCotizacion = {
    ...cotizacionVacia(o.hoy),
    vendedor: o.vendedor,
    cliente: c?.nombre ?? req.cliente.trim(),
    clienteNit: c?.nit ?? "",
    contacto: c?.contacto ?? "",
    correo: c?.correo ?? "",
    telefono: c?.telefono ?? "",
    direccion: c?.direccion ?? "",
    aceptaNombre: c?.contacto ?? "",
    aceptaCargo: c?.cargo ?? "",
    asunto,
    items,
  };
  const conPrecio = items.filter((i) => i.precioUnitario > 0).length;
  return { datos, conPrecio, sinPrecio: items.length - conPrecio };
}
