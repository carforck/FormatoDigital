/**
 * Control documental, contenido inicial y armado de ítems del requerimiento. Usa el
 * catálogo de servicios y las unidades de la cotización, sin precios.
 */

import type { InfoFormato } from "@/modulos/contrato";
import { CATALOGO_SERVICIOS, leerNumero, quitarTildes, unidadDe, UNIDADES, type ServicioCatalogo } from "@/modulos/cotizaciones/catalogo";
import { cantidadTexto } from "@/modulos/cotizaciones/calculos";

import type { DatosRequerimiento, ItemRequerimiento } from "./tipos";

/** Prefijo del consecutivo (RQ-001-26). */
export const PREFIJO_REQUERIMIENTO = "RQ";

/** Control documental. El código lo asigna SOTEC en su sistema de gestión: cambiarlo aquí basta. */
export const FORMATO_REQUERIMIENTO: InfoFormato = {
  codigo: "FO-???-?? por confirmar",
  nombre: "Requerimiento de materiales y servicios",
  version: "01",
  fecha: "por confirmar",
  corto: "Requerimiento",
  el: "el",
  nuevo: "Nuevo",
  plural: "requerimientos",
};

/** Requerimiento en blanco con la fecha dada (el módulo completa quién solicita). */
export function requerimientoVacio(fecha: string): DatosRequerimiento {
  return { fecha, fechaRequerida: "", cliente: "", proyecto: "", sitio: "", asunto: "", items: [], observaciones: "", solicitante: "", cargo: "", firmaSolicitante: "" };
}

// Contador de la sesión: dos líneas creadas en el mismo milisegundo no repiten id
let seq = 0;
/** Id único para una línea nueva. */
export const idItemRq = () => `rq-${Date.now().toString(36)}-${(++seq).toString(36)}`;

/** Línea nueva en blanco (1 unidad). */
export function itemRqVacio(): ItemRequerimiento {
  return { id: idItemRq(), descripcion: "", detalle: "", cantidad: 1, unidad: "Unidades", observacion: "" };
}

/** Línea a partir de un servicio del catálogo (sin precio: eso lo pone la administración al cotizar). */
export function itemRqDeServicio(s: Pick<ServicioCatalogo, "descripcion" | "detalle" | "unidad">, cantidad = 1): ItemRequerimiento {
  return { id: idItemRq(), descripcion: s.descripcion, detalle: s.detalle ?? "", cantidad, unidad: s.unidad, observacion: "" };
}

/** Servicio del catálogo con esa descripción (sin importar mayúsculas ni tildes). */
export function servicioDe(descripcion: string, catalogo: ServicioCatalogo[] = CATALOGO_SERVICIOS): ServicioCatalogo | undefined {
  const clave = quitarTildes(descripcion.trim());
  return clave ? catalogo.find((s) => quitarTildes(s.descripcion) === clave) : undefined;
}

/**
 * Tabla tras marcar ítems en el asistente: lo que sigue marcado conserva su fila (cantidad,
 * observación), lo desmarcado sale si vino del catálogo o de la lista, y lo nuevo entra con
 * cantidad 1 (con la unidad del catálogo si está; si no, «Unidades»). Lo escrito a mano en la
 * tabla que no está en la lista de opciones se conserva.
 */
export function itemsMarcadosRq(items: ItemRequerimiento[], marcados: string[], opciones: string[], catalogo: ServicioCatalogo[] = CATALOGO_SERVICIOS): ItemRequerimiento[] {
  const k = (s: string) => quitarTildes(s.trim());
  const marcadosK = marcados.map(k);
  const opcionesK = opciones.map(k);
  const quedan = items.filter((i) => marcadosK.includes(k(i.descripcion)) || !opcionesK.includes(k(i.descripcion)));
  const nuevos = marcados
    .filter((m) => !quedan.some((i) => k(i.descripcion) === k(m)))
    .map((m) => {
      const s = servicioDe(m, catalogo);
      return s ? itemRqDeServicio(s) : { ...itemRqVacio(), descripcion: m.trim() };
    });
  return [...quedan, ...nuevos];
}

/** Una línea por ítem: «4 unidades x Instalación de cámara IP | Bodega norte». */
export function lineaRq(i: ItemRequerimiento): string {
  const cant = cantidadTexto(i.cantidad).replace(/,00$/, "");
  return `${cant} ${i.unidad.toLowerCase()} x ${i.descripcion}${i.observacion ? ` | ${i.observacion}` : ""}`;
}

/** Resultado de `leerItemsRq`: los ítems leídos y los errores por línea. */
export type LecturaItemsRq = { items: ItemRequerimiento[]; errores: string[] };

/**
 * Lee los ítems escritos en el asistente, uno por línea, «<cantidad> [unidad] x <descripción> [| observación]».
 * Si la descripción coincide con un ítem anterior conserva su id y su detalle; con el catálogo, su unidad y detalle.
 */
export function leerItemsRq(texto: string, previos: ItemRequerimiento[] = [], catalogo: ServicioCatalogo[] = CATALOGO_SERVICIOS): LecturaItemsRq {
  const items: ItemRequerimiento[] = [];
  const errores: string[] = [];
  texto
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean)
    .forEach((linea, k) => {
      const m = /^([\d.,]+)\s*([^\dx×]*?)\s*[x×]\s+(.+)$/i.exec(linea);
      if (!m) {
        errores.push(`Línea ${k + 1}: usa «cantidad x descripción».`);
        return;
      }
      const cantidad = leerNumero(m[1], true);
      const [descripcion, observacion = ""] = m[3].split("|").map((s) => s.trim());
      const previo = previos.find((p) => quitarTildes(p.descripcion) === quitarTildes(descripcion) && !items.some((x) => x.id === p.id));
      const s = servicioDe(descripcion, catalogo);
      const unidad = (m[2] && unidadDe(m[2])) || previo?.unidad || s?.unidad || "Unidades";
      if (m[2] && !unidadDe(m[2])) errores.push(`Línea ${k + 1}: unidad «${m[2]}» desconocida (usa ${UNIDADES.join(", ").toLowerCase()}).`);
      if (!(cantidad > 0)) errores.push(`Línea ${k + 1}: cantidad inválida.`);
      if (!descripcion) errores.push(`Línea ${k + 1}: falta la descripción.`);
      items.push({
        id: previo?.id ?? idItemRq(),
        descripcion,
        detalle: previo?.detalle ?? s?.detalle ?? "",
        cantidad: cantidad > 0 ? cantidad : 0,
        unidad,
        observacion: m[3].includes("|") ? observacion : previo?.observacion ?? "",
      });
    });
  if (!items.length && !errores.length) errores.push("Escribe al menos un ítem.");
  return { items, errores };
}
