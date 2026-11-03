/**
 * Catálogo y contenido inicial de la entrega de EPP.
 */

import { buscarOpcion } from "@/nucleo/opciones";

import type { DatosEpp, ItemEpp, MotivoEpp } from "./tipos";

/** Elementos de protección personal típicos de SOTEC (trabajo eléctrico y en alturas). */
export const EPP_CATALOGO = [
  "Casco de seguridad",
  "Barbuquejo",
  "Gafas de seguridad",
  "Protector auditivo",
  "Guantes dieléctricos",
  "Guantes de vaqueta",
  "Botas dieléctricas",
  "Arnés de cuerpo completo",
  "Eslinga",
  "Línea de vida",
  "Tapabocas",
  "Chaleco reflectivo",
  "Overol / dotación",
] as const;

/** Motivos de entrega, en el orden del selector. */
export const MOTIVOS_EPP: MotivoEpp[] = ["Ingreso", "Reposición", "Dotación", "Pérdida o daño"];

/** Compromiso que firma el trabajador (va impreso en el formato). */
export const COMPROMISO_EPP =
  "Declaro que recibí los elementos de protección personal relacionados, en buen estado y sin costo, y que recibí la instrucción sobre su uso correcto. " +
  "Me comprometo a usarlos durante la jornada en todas las actividades que lo requieran, a cuidarlos y mantenerlos limpios y en buen estado, a no prestarlos " +
  "y a informar a tiempo cuando se deterioren o se pierdan para su reposición, devolviendo los deteriorados, conforme a mis responsabilidades en el SG-SST " +
  "(Decreto 1072 de 2015, art. 2.2.4.6.10).";

/** Fila nueva de la tabla. */
export function itemEpp(elemento: string, fecha: string, motivo: MotivoEpp = "", k = 0): ItemEpp {
  return { id: `e-${Date.now()}-${k}-${Math.random().toString(36).slice(2, 6)}`, elemento, cantidad: 1, talla: "", motivo, fecha };
}

/** Formato en blanco con la fecha dada (el módulo completa trabajador, cédula y cargo). */
export function eppVacio(fecha: string): DatosEpp {
  return {
    fecha,
    trabajador: "",
    cedula: "",
    cargo: "",
    obra: "",
    items: [],
    observaciones: "",
    firmaRecibe: "",
    entregaNombre: "",
    entregaCargo: "",
    firmaEntrega: "",
  };
}

/**
 * Tabla tras marcar elementos en el asistente: lo que sigue marcado conserva su fila (cantidad,
 * talla y motivo), lo desmarcado sale y lo nuevo entra con cantidad 1 y la fecha del formato.
 */
export function itemsMarcados(d: Pick<DatosEpp, "items" | "fecha">, marcados: string[]): ItemEpp[] {
  const quedan = d.items.filter((i) => buscarOpcion(marcados, i.elemento));
  const nuevos = marcados.filter((m) => !buscarOpcion(quedan.map((i) => i.elemento), m)).map((m, k) => itemEpp(m, d.fecha, "", k));
  return [...quedan, ...nuevos];
}
