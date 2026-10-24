/**
 * KPIs de un proyecto (documentos por tipo, cotizado, gastado, facturado,
 * cobrado y ejecución del presupuesto) para /app/proyectos y su detalle.
 * Funciones puras: reciben solo lo que el usuario puede ver.
 */
import { totales, type CuentaCobro } from "@/modulos/cobros/tipos";
import { TIPOS_DOC, valorDoc } from "@/modulos/registro";

import type { Documento, Proyecto, TipoDoc } from "./tipos";

/** Indicadores de un proyecto a partir de lo que el usuario puede ver. */
export interface ResumenProyecto {
  docs: Documento[];
  cuentas: CuentaCobro[];
  porTipo: Record<TipoDoc, number>;
  /** Cotizaciones aprobadas (enviadas) o aceptadas. */
  cotizado: number;
  /** Cotizaciones aceptadas por el cliente con su firma. */
  aceptado: number;
  /** Gastos con Vo.Bo. (aprobados) o reembolsados (cerrados). */
  gastado: number;
  /** Cuentas de cobro emitidas, enviadas o pagadas. */
  facturado: number;
  /** Cuentas de cobro pagadas. */
  cobrado: number;
  /** Gastado / presupuesto (null sin presupuesto). */
  ejecucion: number | null;
}

const aprobadoOCerrado = (d: Documento) => d.estado === "aprobado" || d.estado === "cerrado";

/** Resume los documentos y cuentas de un proyecto (los valores salen de `valorDoc` y `totales`). */
export function resumenProyecto(p: Proyecto, documentos: Documento[], cuentas: CuentaCobro[]): ResumenProyecto {
  const docs = documentos.filter((d) => d.proyectoId === p.id);
  const cs = cuentas.filter((c) => c.proyectoId === p.id);
  const suma = (lista: Documento[]) => lista.reduce((a, d) => a + (valorDoc(d) ?? 0), 0);
  const porTipo = Object.fromEntries(TIPOS_DOC.map((t) => [t, docs.filter((d) => d.tipo === t).length])) as Record<TipoDoc, number>;
  const cot = docs.filter((d) => d.tipo === "cotizacion");
  const gastado = suma(docs.filter((d) => d.tipo === "gasto" && aprobadoOCerrado(d)));
  return {
    docs,
    cuentas: cs,
    porTipo,
    cotizado: suma(cot.filter(aprobadoOCerrado)),
    aceptado: suma(cot.filter((d) => d.estado === "cerrado")),
    gastado,
    facturado: cs.filter((c) => ["emitida", "enviada", "pagada"].includes(c.estado)).reduce((a, c) => a + totales(c).total, 0),
    cobrado: cs.filter((c) => c.estado === "pagada").reduce((a, c) => a + totales(c).total, 0),
    ejecucion: p.presupuesto ? gastado / p.presupuesto : null,
  };
}
