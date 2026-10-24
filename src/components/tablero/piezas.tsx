"use client";

/**
 * Piezas de visualización del tablero (`/app`, `src/app/app/page.tsx`): KPI,
 * variación, minigráfica, barras por mes, barras de filtro y dona. Todas
 * accesibles: el texto lleva el dato y el color solo refuerza; las gráficas
 * clicables filtran la lista del tablero.
 */
import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, Table2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatoDe, infoDoc } from "@/modulos/registro";
import type { TipoDoc } from "@/nucleo/tipos";

/* Colores de serie: variables de globals.css validadas en claro y oscuro; cada
   módulo trae la suya (reportes · permisos · gastos · cotizaciones, en ese orden
   para que azul y violeta no se toquen). */
const SERIE = (t: TipoDoc) => infoDoc(t).color;

const fmt = (n: number, d = 0) => n.toLocaleString("es-CO", { maximumFractionDigits: d, minimumFractionDigits: d });

/**
 * Variación contra el período anterior: flecha + texto; el color solo refuerza.
 * `valor` es una fracción (0.12 = +12 %); `mejorSi` define si subir es bueno;
 * `null` o no finito = sin base de comparación. Menos de 0,5 cuenta como «sin cambio».
 */
export function Variacion({ valor, mejorSi = "sube", unidad = "%" }: { valor: number | null; mejorSi?: "sube" | "baja"; unidad?: "%" | "pp" }) {
  if (valor === null || !Number.isFinite(valor)) return <span className="text-[11px] text-slate-400">sin base de comparación</span>;
  const n = unidad === "pp" ? valor * 100 : valor * 100;
  const plano = Math.abs(n) < 0.5;
  const bueno = plano ? null : (n > 0) === (mejorSi === "sube");
  const I = plano ? Minus : n > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold", bueno === null ? "text-slate-500" : bueno ? "text-emerald-700" : "text-rose-700")}>
      <I className="h-3.5 w-3.5" aria-hidden />
      {plano ? "sin cambio" : `${n > 0 ? "+" : ""}${fmt(n)}${unidad === "pp" ? " pp" : " %"}`}
      <span className="font-normal text-slate-500">&nbsp;vs. período anterior</span>
    </span>
  );
}

/** Minigráfica de 6 meses con el valor del mes al pasar el mouse. */
export function Sparkline({ valores, etiquetas, formato = (n) => fmt(n) }: { valores: (number | null)[]; etiquetas: string[]; formato?: (n: number) => string }) {
  const [i, setI] = useState<number | null>(null);
  const W = 120;
  const H = 32;
  const vals = valores.map((v) => v ?? 0);
  const max = Math.max(1e-9, ...vals);
  const min = Math.min(...vals);
  const x = (k: number) => (k / Math.max(1, vals.length - 1)) * (W - 8) + 4;
  const y = (v: number) => H - 4 - ((v - min) / Math.max(1e-9, max - min)) * (H - 8);
  const linea = vals.map((v, k) => `${k ? "L" : "M"}${x(k)},${y(v)}`).join(" ");
  return (
    <span className="relative inline-block" onPointerLeave={() => setI(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-[120px] overflow-visible" aria-hidden>
        <path d={linea} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {vals.map((v, k) => (
          <rect key={k} x={x(k) - W / vals.length / 2} y={0} width={W / vals.length} height={H} fill="transparent" onPointerEnter={() => setI(k)} />
        ))}
        {i !== null && <circle cx={x(i)} cy={y(vals[i])} r={3.5} fill="currentColor" stroke="white" strokeWidth={1.5} />}
        {i === null && <circle cx={x(vals.length - 1)} cy={y(vals[vals.length - 1])} r={2.5} fill="currentColor" />}
      </svg>
      {i !== null && (
        <span className="pointer-events-none absolute bottom-full right-0 z-10 mb-1 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] shadow-lg">
          <strong className="text-slate-900">{valores[i] === null ? "—" : formato(valores[i]!)}</strong> <span className="text-slate-500">{etiquetas[i]}</span>
        </span>
      )}
    </span>
  );
}

/** Indicador clicable: valor, contexto relativo, variación y tendencia. Con `onClick` es un botón conmutador (`aria-pressed`). */
export function Kpi({
  titulo,
  valor,
  contexto,
  icon: I,
  tono,
  variacion,
  serie,
  activo,
  onClick,
}: {
  titulo: string;
  valor: React.ReactNode;
  contexto: React.ReactNode;
  icon: LucideIcon;
  tono: string;
  variacion?: React.ReactNode;
  serie?: React.ReactNode;
  activo?: boolean;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      aria-pressed={onClick ? Boolean(activo) : undefined}
      className={cn(
        "group flex flex-col rounded-xl border bg-white p-4 text-left shadow-sm transition",
        onClick && "hover:-translate-y-0.5 hover:border-sotec-green hover:shadow-md",
        activo ? "border-sotec-greenDeep ring-2 ring-sotec-green/40" : "border-slate-200",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 sm:text-sm">{titulo}</span>
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tono)}>
          <I className="h-4 w-4" />
        </span>
      </span>
      <span className="mt-1 flex items-end justify-between gap-2">
        <span className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{valor}</span>
        {serie && <span className="hidden text-sotec-greenDeep sm:inline-block">{serie}</span>}
      </span>
      <span className="mt-0.5 text-xs text-slate-500">{contexto}</span>
      {variacion && <span className="mt-2">{variacion}</span>}
      {onClick && <span className="mt-2 text-[11px] font-medium text-sotec-greenDeep opacity-0 transition group-hover:opacity-100">{activo ? "Quitar filtro" : "Filtrar la lista"}</span>}
    </Comp>
  );
}

/** Conteo de documentos de un mes por tipo (los tipos ausentes cuentan 0). */
export type Mes = { etiqueta: string } & Partial<Record<TipoDoc, number>>;
const NOMBRE = (t: TipoDoc) => formatoDe(t).plural.replace(/^./, (x) => x.toUpperCase());

/** Barras apiladas por mes (una serie por tipo de documento), con tooltip y vista de tabla. */
export function BarrasMes({ meses: crudos, tipos }: { meses: Mes[]; tipos: TipoDoc[] }) {
  const meses = crudos.map((m) => ({ ...m, ...Object.fromEntries(tipos.map((t) => [t, m[t] ?? 0])) }) as { etiqueta: string } & Record<TipoDoc, number>);
  const [hover, setHover] = useState<number | null>(null);
  const [tabla, setTabla] = useState(false);
  const total = (m: (typeof meses)[number]) => tipos.reduce((a, t) => a + m[t], 0);
  const max = Math.max(1, ...meses.map(total));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {tipos.map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIE(t) }} /> {NOMBRE(t)}
            </span>
          ))}
        </div>
        <button onClick={() => setTabla(!tabla)} aria-pressed={tabla} className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
          <Table2 className="h-3.5 w-3.5" /> {tabla ? "Ver gráfica" : "Ver tabla"}
        </button>
      </div>
      {tabla ? (
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>
              <th className="py-1 font-medium">Mes</th>
              {tipos.map((t) => (
                <th key={t} className="py-1 text-right font-medium">
                  {NOMBRE(t)}
                </th>
              ))}
              <th className="py-1 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {meses.map((m) => (
              <tr key={m.etiqueta}>
                <td className="py-1.5">{m.etiqueta}</td>
                {tipos.map((t) => (
                  <td key={t} className="py-1.5 text-right tabular-nums">
                    {m[t]}
                  </td>
                ))}
                <td className="py-1.5 text-right font-semibold tabular-nums">{total(m)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          <div className="relative mt-4 flex h-44 items-end gap-2 border-b border-slate-200 sm:gap-4" onPointerLeave={() => setHover(null)}>
            {meses.map((m, k) => (
              <div
                key={m.etiqueta}
                className="relative flex h-full flex-1 flex-col items-center justify-end"
                onPointerEnter={() => setHover(k)}
                onFocus={() => setHover(k)}
                tabIndex={0}
                aria-label={`${m.etiqueta}: ${tipos.map((t) => `${m[t]} ${NOMBRE(t).toLowerCase()}`).join(", ")}`}
              >
                {hover === k && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-slate-900">
                      {m.etiqueta} · {total(m)}
                    </p>
                    {tipos.map((t) => (
                      <p key={t} className="flex items-center gap-1.5 text-slate-600">
                        <i className="inline-block h-0.5 w-3" style={{ background: SERIE(t) }} />
                        <strong className="text-slate-900">{m[t]}</strong> {NOMBRE(t).toLowerCase()}
                      </p>
                    ))}
                  </div>
                )}
                <span className="mb-1 text-xs tabular-nums text-slate-500">{total(m) || ""}</span>
                <div
                  className={cn("flex w-full max-w-[40px] origin-bottom animate-grow-y flex-col-reverse gap-[2px] transition-opacity", hover !== null && hover !== k && "opacity-50")}
                  style={{ height: `${(total(m) / max) * 140}px`, animationDelay: `${k * 80}ms` }}
                >
                  {tipos
                    .filter((t) => m[t] > 0)
                    .map((t, j, arr) => (
                      <div key={t} style={{ flex: m[t], background: SERIE(t), borderRadius: j === arr.length - 1 ? "4px 4px 0 0" : 0 }} />
                    ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-2 sm:gap-4">
            {meses.map((m) => (
              <span key={m.etiqueta} className="flex-1 text-center text-xs text-slate-500">
                {m.etiqueta}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Barras horizontales clicables (estados, clientes): etiqueta, valor y % del total. Clic de nuevo en la activa quita el filtro (`onElegir(null)`). */
export function BarrasFiltro({
  filas,
  activo,
  onElegir,
  color = "var(--serie-b)",
}: {
  filas: { clave: string; nombre: string; valor: number; icono?: React.ReactNode }[];
  activo: string | null;
  onElegir: (clave: string | null) => void;
  color?: string;
}) {
  const total = filas.reduce((a, f) => a + f.valor, 0) || 1;
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <ul className="space-y-1">
      {filas.map((f) => {
        const on = activo === f.clave;
        return (
          <li key={f.clave}>
            <button
              onClick={() => onElegir(on ? null : f.clave)}
              aria-pressed={on}
              className={cn("w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50", on && "bg-sotec-soft ring-1 ring-sotec-green/50", activo && !on && "opacity-60")}
            >
              <span className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-slate-700">
                  {f.icono}
                  {f.nombre}
                </span>
                <span className="shrink-0 tabular-nums">
                  <strong className="text-slate-900">{f.valor}</strong> <span className="text-xs text-slate-500">· {fmt((f.valor / total) * 100)} %</span>
                </span>
              </span>
              <span className="mt-1 block h-2 rounded-full bg-slate-100">
                <span className="block h-2 origin-left animate-grow-x rounded-full" style={{ width: `${(f.valor / max) * 100}%`, background: color }} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Dona de proporciones con leyenda clicable (estados del documento). Cada
 * segmento es un círculo con `strokeDasharray` desplazado por lo acumulado.
 */
export function Dona({
  filas,
  activo,
  onElegir,
  centro,
}: {
  filas: { clave: string; nombre: string; valor: number; color: string }[];
  activo: string | null;
  onElegir: (clave: string | null) => void;
  centro: { valor: string; texto: string };
}) {
  const total = filas.reduce((a, f) => a + f.valor, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  let acumulado = 0;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label={filas.map((f) => `${f.nombre}: ${f.valor}`).join(", ")}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="16" className="text-slate-100" />
        {total > 0 &&
          filas
            .filter((f) => f.valor > 0)
            .map((f) => {
              const largo = (f.valor / total) * C;
              const el = (
                <circle
                  key={f.clave}
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  stroke={f.color}
                  strokeWidth={activo === f.clave ? 20 : 16}
                  strokeDasharray={`${Math.max(largo - 1.5, 0.5)} ${C}`}
                  strokeDashoffset={-acumulado}
                  className={cn("transition-all", activo && activo !== f.clave && "opacity-35")}
                />
              );
              acumulado += largo;
              return el;
            })}
        <g className="rotate-90" style={{ transformOrigin: "60px 60px" }}>
          <text x="60" y="58" textAnchor="middle" className="fill-slate-900 text-[20px] font-semibold dark:fill-slate-100">
            {centro.valor}
          </text>
          <text x="60" y="74" textAnchor="middle" className="fill-slate-500 text-[9px] dark:fill-slate-400">
            {centro.texto}
          </text>
        </g>
      </svg>
      <ul className="w-full min-w-0 space-y-1">
        {filas.map((f) => {
          const on = activo === f.clave;
          return (
            <li key={f.clave}>
              <button
                onClick={() => onElegir(on ? null : f.clave)}
                aria-pressed={on}
                className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-slate-50", on && "bg-sotec-soft ring-1 ring-sotec-green/50", activo && !on && "opacity-60")}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: f.color }} />
                <span className="min-w-0 flex-1 truncate text-slate-700">{f.nombre}</span>
                <span className="shrink-0 tabular-nums">
                  <strong className="text-slate-900">{f.valor}</strong>
                  <span className="text-xs text-slate-500"> · {total ? fmt((f.valor / total) * 100) : 0} %</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
