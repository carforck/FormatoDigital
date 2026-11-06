/**
 * Clientes por tipo de persona (pedido de Magno): jurídica (empresa, con NIT) o natural (con
 * cédula). El documento se guarda en el mismo campo `nit` de siempre: solo cambia su etiqueta.
 * Los clientes de antes no tienen tipo y cuentan como jurídicos (igual que el valor por defecto
 * de public.clientes.tipo_persona, 0015). También: unir datos sin separadores huérfanos.
 */
import type { Cliente, TipoPersona } from "@/nucleo/tipos";

/** El tipo de persona del cliente; sin valor, jurídica. */
export function tipoPersonaDe(c: Pick<Cliente, "tipoPersona">): TipoPersona {
  return c.tipoPersona === "natural" ? "natural" : "juridica";
}

/** Etiquetas por tipo: del documento (corta para listas, larga para el formulario), del nombre y del grupo. */
export const PERSONAS: Record<TipoPersona, { documento: string; documentoLargo: string; nombre: string; singular: string; plural: string }> = {
  juridica: { documento: "NIT", documentoLargo: "NIT", nombre: "Razón social", singular: "Persona jurídica", plural: "Jurídicos" },
  natural: { documento: "C.C.", documentoLargo: "Cédula", nombre: "Nombre completo", singular: "Persona natural", plural: "Naturales" },
};

/** «NIT 900.123.456» o «C.C. 1.234.567»; vacío sin documento. */
export function documentoCliente(c: Pick<Cliente, "tipoPersona" | "nit">): string {
  const n = (c.nit ?? "").trim();
  return n ? `${PERSONAS[tipoPersonaDe(c)].documento} ${n}` : "";
}

/** Un dato vacío o sin letras ni números («.», «-», «·»): no se muestra. */
export function datoVacio(v?: string | null): boolean {
  return !/[0-9A-Za-z\u00C0-\u024F]/.test(v ?? "");
}

/** Une los datos con « · » saltando los vacíos (sin «· ·» ni puntos sueltos). */
export function unirDatos(partes: (string | null | undefined)[], separador = " · "): string {
  return partes
    .filter((p): p is string => !datoVacio(p))
    .map((p) => p.trim())
    .join(separador);
}

/** Cuántos clientes hay de cada tipo. */
export function contarPorTipo(clientes: Pick<Cliente, "tipoPersona">[]): Record<TipoPersona | "todos", number> {
  const naturales = clientes.filter((c) => tipoPersonaDe(c) === "natural").length;
  return { todos: clientes.length, juridica: clientes.length - naturales, natural: naturales };
}

/** Jurídicos primero y luego naturales, conservando el orden de cada grupo. */
export function ordenarPorTipo<T extends Pick<Cliente, "tipoPersona">>(clientes: T[]): T[] {
  return [...clientes.filter((c) => tipoPersonaDe(c) === "juridica"), ...clientes.filter((c) => tipoPersonaDe(c) === "natural")];
}
