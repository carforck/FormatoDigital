/**
 * Indicadores del tablero, como funciones puras sobre la lista de documentos.
 * Todos se calculan para un período y se comparan con el período anterior de
 * igual duración, para mostrar variaciones relativas.
 */
import type { Documento, Estado, TipoDoc } from "./tipos";

export type Periodo = "30d" | "90d" | "6m" | "12m";
export const PERIODOS: { clave: Periodo; nombre: string; dias: number }[] = [
  { clave: "30d", nombre: "30 días", dias: 30 },
  { clave: "90d", nombre: "90 días", dias: 90 },
  { clave: "6m", nombre: "6 meses", dias: 182 },
  { clave: "12m", nombre: "12 meses", dias: 365 },
];

const DIA = 864e5;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function rango(periodo: Periodo, hoy = new Date()) {
  const dias = PERIODOS.find((p) => p.clave === periodo)!.dias;
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
  const desde = new Date(hasta.getTime() - dias * DIA);
  const prevDesde = new Date(desde.getTime() - dias * DIA);
  return { desde: iso(desde), hasta: iso(hasta), prevDesde: iso(prevDesde), prevHasta: iso(desde), dias };
}

export const enRango = (d: Documento, desde: string, hasta: string) => d.creado.slice(0, 10) >= desde && d.creado.slice(0, 10) < hasta;

const evento = (d: Documento, accion: string) => d.historial.find((h) => h.accion === accion);

/** Documentos que ya pasaron por revisión (aprobados, cerrados o rechazados alguna vez). */
const revisados = (docs: Documento[]) => docs.filter((d) => d.estado === "aprobado" || d.estado === "cerrado" || d.estado === "rechazado" || evento(d, "Rechazó"));

export function tasaPrimerIntento(docs: Documento[]): number | null {
  const r = revisados(docs);
  if (!r.length) return null;
  return r.filter((d) => !evento(d, "Rechazó") && d.estado !== "rechazado").length / r.length;
}

export function horasAprobacion(docs: Documento[]): number | null {
  const t = docs
    .map((d) => {
      const e = evento(d, "Envió a revisión");
      const a = evento(d, "Aprobó");
      return e && a ? (new Date(a.fecha).getTime() - new Date(e.fecha).getTime()) / 36e5 : null;
    })
    .filter((x): x is number => x !== null && x >= 0);
  return t.length ? t.reduce((a, b) => a + b, 0) / t.length : null;
}

export function pendientes(docs: Documento[], hoy = new Date()) {
  const p = docs.filter((d) => d.estado === "en_revision");
  const dias = p.map((d) => {
    const e = evento(d, "Envió a revisión");
    return (hoy.getTime() - new Date(e?.fecha ?? d.creado).getTime()) / DIA;
  });
  return { cantidad: p.length, diasMax: dias.length ? Math.max(...dias) : 0 };
}

export function tasaFirmaCliente(docs: Documento[]): number | null {
  const r = docs.filter((d) => d.tipo === "reporte" && (d.estado === "aprobado" || d.estado === "cerrado"));
  if (!r.length) return null;
  return r.filter((d) => d.estado === "cerrado").length / r.length;
}

/** Variación relativa (0,25 = +25 %). null si no hay base de comparación. */
export function variacion(actual: number | null, anterior: number | null): number | null {
  if (actual === null || anterior === null || anterior === 0) return null;
  return (actual - anterior) / anterior;
}

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Serie mensual de los últimos `n` meses: etiqueta, clave AAAA-MM y documentos del mes. */
export function meses(docs: Documento[], n = 6, hoy = new Date()) {
  return Array.from({ length: n }).map((_, k) => {
    const dt = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1) + k, 1);
    const clave = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    return { etiqueta: MESES[dt.getMonth()], clave, docs: docs.filter((d) => d.creado.startsWith(clave)) };
  });
}

export const ESTADOS_ORDEN: Estado[] = ["borrador", "en_revision", "aprobado", "cerrado", "rechazado"];
export { TIPOS_DOC as TIPOS_ORDEN } from "@/modulos/registro";

const MESES_LARGO = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** Últimos `n` meses para el filtro «Mes» del tablero (el actual primero). */
export function mesesFiltro(n = 12, hoy = new Date()) {
  return Array.from({ length: n }).map((_, k) => {
    const dt = new Date(hoy.getFullYear(), hoy.getMonth() - k, 1);
    return { clave: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`, nombre: `${MESES_LARGO[dt.getMonth()]} ${dt.getFullYear()}` };
  });
}

/** Rango de un mes (AAAA-MM) y del mes anterior, con la misma forma que `rango`. */
export function rangoMes(clave: string) {
  const [y, m] = clave.split("-").map(Number);
  const desde = new Date(Date.UTC(y, m - 1, 1));
  const hasta = new Date(Date.UTC(y, m, 1));
  const prevDesde = new Date(Date.UTC(y, m - 2, 1));
  return { desde: iso(desde), hasta: iso(hasta), prevDesde: iso(prevDesde), prevHasta: iso(desde), dias: (hasta.getTime() - desde.getTime()) / DIA };
}

/** Horas en sitio de un reporte (llegada → salida); null si no las registró. */
export function horasServicio(d: Documento): number | null {
  if (d.tipo !== "reporte") return null;
  const { horaLlegada: a, horaSalida: b } = d.datos as { horaLlegada?: string; horaSalida?: string };
  if (!a || !b) return null;
  const min = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  const dif = min(b) - min(a);
  return dif > 0 ? dif / 60 : null;
}

/** Promedio y total de horas en sitio de los reportes que las registran. */
export function tiempoServicio(docs: Documento[]) {
  const h = docs.map(horasServicio).filter((x): x is number => x !== null);
  return { promedio: h.length ? h.reduce((a, b) => a + b, 0) / h.length : null, total: h.reduce((a, b) => a + b, 0), servicios: h.length };
}
