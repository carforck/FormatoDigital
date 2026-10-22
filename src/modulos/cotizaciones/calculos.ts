import type { DatosCotizacion, ItemCotizacion } from "./tipos";

/**
 * Cálculos de la cotización (funciones puras, sin React).
 * Todo se redondea a pesos enteros: el importe de cada línea y el IVA de cada
 * tarifa sobre la suma de sus bases (como se liquida en la factura).
 */

const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : 0);

/** Importe de la línea sin impuestos (cantidad × precio, en pesos). */
export function importeItem(i: Pick<ItemCotizacion, "cantidad" | "precioUnitario">): number {
  return Math.round(Math.max(0, num(i.cantidad)) * Math.max(0, num(i.precioUnitario)));
}

/** IVA de una sola línea (informativo; el total usa `ivaPorTarifa`). */
export function ivaItem(i: Pick<ItemCotizacion, "cantidad" | "precioUnitario" | "ivaPct">): number {
  return Math.round((importeItem(i) * Math.max(0, num(i.ivaPct))) / 100);
}

export interface TarifaIva {
  /** % de la tarifa (19, 5, 0). */
  pct: number;
  /** Suma de importes con esa tarifa. */
  base: number;
  /** IVA de la tarifa redondeado a pesos. */
  iva: number;
}

/** IVA agrupado por tarifa, de mayor a menor %. Incluye la tarifa 0 % si hay líneas exentas. */
export function ivaPorTarifa(items: ItemCotizacion[]): TarifaIva[] {
  const bases = new Map<number, number>();
  for (const i of items) {
    const pct = Math.max(0, num(i.ivaPct));
    bases.set(pct, (bases.get(pct) ?? 0) + importeItem(i));
  }
  return [...bases.entries()].sort((a, b) => b[0] - a[0]).map(([pct, base]) => ({ pct, base, iva: Math.round((base * pct) / 100) }));
}

export interface TotalesCotizacion {
  /** Base sin impuestos. */
  subtotal: number;
  tarifas: TarifaIva[];
  iva: number;
  total: number;
}

export function totalesCotizacion(d: Pick<DatosCotizacion, "items">): TotalesCotizacion {
  const tarifas = ivaPorTarifa(d.items);
  const subtotal = tarifas.reduce((a, t) => a + t.base, 0);
  const iva = tarifas.reduce((a, t) => a + t.iva, 0);
  return { subtotal, tarifas, iva, total: subtotal + iva };
}

/** Días calendario entre dos fechas AAAA-MM-DD (negativo si `hasta` es anterior). */
export function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${hasta.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
  return Math.round((b - a) / 86_400_000);
}

/** Suma días a una fecha AAAA-MM-DD sin depender de la zona horaria. */
export function sumarDias(fecha: string, dias: number): string {
  const t = Date.parse(`${fecha.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(t)) return "";
  return new Date(t + dias * 86_400_000).toISOString().slice(0, 10);
}

/** 32 → «32,00»; 12.5 → «12,50» (formato es-CO, como la columna Cantidad). */
export function cantidadTexto(n: number): string {
  return new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num(n));
}

/** 2026-09-25 → «25/09/2026». */
export function fechaCorta(iso: string): string {
  const [y, m, d] = (iso || "").slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}
