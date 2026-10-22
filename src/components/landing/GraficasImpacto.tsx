"use client";

import { useState } from "react";
import { Clock, CloudOff, FileCheck2, ShieldCheck, Table2 } from "lucide-react";

import { Contador, Icono, useVisible } from "@/components/fx/Reveal";
import { cn } from "@/lib/utils";

// Paleta validada (validate_palette.js, modo claro): pasa las 6 comprobaciones.
const PAPEL = "#4F6FD0";
const DIGITAL = "#4E9A2A";
const REJILLA = "#E7E9E4";
const TINTA_TENUE = "#71717A";

const ETAPAS = [
  { etapa: "Diligenciar", papel: 15, digital: 6 },
  { etapa: "Firmar y aprobar", papel: 8, digital: 2 },
  { etapa: "Entregar y escanear", papel: 7, digital: 0 },
  { etapa: "Buscar para auditoría", papel: 20, digital: 1 },
];

const CALIDAD = [
  { mes: "Papel", v: 62 },
  { mes: "Mes 1", v: 84 },
  { mes: "Mes 2", v: 91 },
  { mes: "Mes 3", v: 95 },
  { mes: "Mes 4", v: 97 },
  { mes: "Mes 5", v: 98 },
  { mes: "Mes 6", v: 99 },
];

interface Tip {
  x: number;
  y: number;
  valor: string;
  etiqueta: string;
  color?: string;
}

function Tooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return (
    <div className="pointer-events-none absolute z-10 -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg" style={{ left: tip.x + 10, top: Math.max(56, tip.y) }}>
      <p className="text-sm font-semibold text-slate-900">{tip.valor}</p>
      <p className="flex items-center gap-1.5 text-slate-500">
        {tip.color && <i className="inline-block h-0.5 w-3 rounded" style={{ background: tip.color }} />}
        {tip.etiqueta}
      </p>
    </div>
  );
}

function BarrasEtapas() {
  const { ref, visible } = useVisible<HTMLDivElement>("0px", true);
  const [tip, setTip] = useState<Tip | null>(null);
  const [tabla, setTabla] = useState(false);
  const W = 560;
  const H = 260;
  const M = { t: 12, r: 8, b: 44, l: 32 };
  const max = 20;
  const ih = H - M.t - M.b;
  const grupo = (W - M.l - M.r) / ETAPAS.length;
  const bw = Math.min(34, grupo / 3);
  const y = (v: number) => M.t + ih - (v / max) * ih;

  /** Convierte coordenadas del SVG a coordenadas de la tarjeta para ubicar el tooltip. */
  function mostrar(el: SVGElement, sx: number, sy: number, valor: string, etiqueta: string, color: string) {
    const svg = el.ownerSVGElement!;
    const fig = svg.closest("figure")!.getBoundingClientRect();
    const r = svg.getBoundingClientRect();
    setTip({ x: r.left - fig.left + (sx / W) * r.width, y: r.top - fig.top + (sy / H) * r.height, valor, etiqueta, color });
  }

  return (
    <figure ref={ref} className="relative rounded-2xl border border-slate-200 bg-white p-5">
      <figcaption className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">Minutos por formato, en cada etapa</p>
          <div className="mt-1 flex gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm" style={{ background: PAPEL }} /> En papel
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm" style={{ background: DIGITAL }} /> Digital
            </span>
          </div>
        </div>
        <button onClick={() => setTabla(!tabla)} className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50" aria-pressed={tabla}>
          <Table2 className="h-3.5 w-3.5" /> {tabla ? "Ver gráfica" : "Ver tabla"}
        </button>
      </figcaption>

      {tabla ? (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>
              <th className="py-1 font-medium">Etapa</th>
              <th className="py-1 text-right font-medium">Papel (min)</th>
              <th className="py-1 text-right font-medium">Digital (min)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ETAPAS.map((e) => (
              <tr key={e.etapa}>
                <td className="py-1.5">{e.etapa}</td>
                <td className="py-1.5 text-right tabular-nums">{e.papel}</td>
                <td className="py-1.5 text-right tabular-nums">{e.digital}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Minutos por etapa: papel frente a digital">
          {[0, 5, 10, 15, 20].map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke={REJILLA} strokeWidth={1} />
              <text x={M.l - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill={TINTA_TENUE}>
                {v}
              </text>
            </g>
          ))}
          {ETAPAS.map((e, k) => {
            const cx = M.l + grupo * k + grupo / 2;
            const barras = [
              { v: e.papel, color: PAPEL, x: cx - bw - 1, serie: "En papel" },
              { v: e.digital, color: DIGITAL, x: cx + 1, serie: "Digital" },
            ];
            return (
              <g key={e.etapa}>
                {barras.map((b, j) => {
                  const alto = Math.max(b.v === 0 ? 2 : 0, (b.v / max) * ih);
                  const top = M.t + ih - alto;
                  return (
                    <g key={j}>
                      <path
                        d={`M${b.x},${M.t + ih} V${top + 4} Q${b.x},${top} ${b.x + 4},${top} H${b.x + bw - 4} Q${b.x + bw},${top} ${b.x + bw},${top + 4} V${M.t + ih} Z`}
                        fill={b.color}
                        className={cn("origin-bottom transition-opacity", visible ? "animate-grow-y" : "scale-y-0", tip && tip.etiqueta !== `${b.serie} · ${e.etapa}` && "opacity-60")}
                        style={{ transformBox: "fill-box", animationDelay: `${k * 120 + j * 80}ms` }}
                      />
                      <rect
                        x={b.x - 4}
                        y={M.t}
                        width={bw + 8}
                        height={ih}
                        fill="transparent"
                        tabIndex={0}
                        aria-label={`${e.etapa}, ${b.serie}: ${b.v} minutos`}
                        onPointerMove={(ev) => mostrar(ev.currentTarget, b.x + bw, top, `${b.v} min`, `${b.serie} · ${e.etapa}`, b.color)}
                        onFocus={(ev) => mostrar(ev.currentTarget, b.x + bw, top, `${b.v} min`, `${b.serie} · ${e.etapa}`, b.color)}
                        onPointerLeave={() => setTip(null)}
                        onBlur={() => setTip(null)}
                      />
                    </g>
                  );
                })}
                <text x={cx} y={H - M.b + 18} textAnchor="middle" fontSize={11.5} fill="#3F3F46">
                  {e.etapa}
                </text>
              </g>
            );
          })}
          <line x1={M.l} x2={W - M.r} y1={M.t + ih} y2={M.t + ih} stroke="#A1A1AA" strokeWidth={1} />
        </svg>
      )}
      <Tooltip tip={tip} />
      <p className="mt-2 text-xs text-slate-500">Total por formato: 50 min en papel frente a 9 min digital.</p>
    </figure>
  );
}

function LineaCalidad() {
  const { ref, visible } = useVisible<HTMLDivElement>("0px", true);
  const [i, setI] = useState<number | null>(null);
  const W = 560;
  const H = 260;
  const M = { t: 16, r: 16, b: 32, l: 36 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const x = (k: number) => M.l + (k / (CALIDAD.length - 1)) * iw;
  const y = (v: number) => M.t + ih - ((v - 50) / 50) * ih;
  const linea = CALIDAD.map((d, k) => `${k ? "L" : "M"}${x(k)},${y(d.v)}`).join(" ");
  const area = `${linea} L${x(CALIDAD.length - 1)},${M.t + ih} L${x(0)},${M.t + ih} Z`;
  const ultimo = CALIDAD[CALIDAD.length - 1];

  return (
    <figure ref={ref} className="relative rounded-2xl border border-slate-200 bg-white p-5">
      <figcaption>
        <p className="font-semibold text-slate-900">Formatos completos al primer intento</p>
        <p className="text-xs text-slate-500">Porcentaje de documentos que pasan la revisión sin devolverse</p>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full touch-none"
        role="img"
        aria-label={`De ${CALIDAD[0].v}% en papel a ${ultimo.v}% al sexto mes`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setI(Math.max(0, Math.min(CALIDAD.length - 1, Math.round(((px - M.l) / iw) * (CALIDAD.length - 1)))));
        }}
        onPointerLeave={() => setI(null)}
      >
        <defs>
          <linearGradient id="area-calidad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={DIGITAL} stopOpacity={0.22} />
            <stop offset="100%" stopColor={DIGITAL} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke={REJILLA} />
            <text x={M.l - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill={TINTA_TENUE}>
              {v}%
            </text>
          </g>
        ))}
        {CALIDAD.map((d, k) => (
          <text key={d.mes} x={x(k)} y={H - 10} textAnchor="middle" fontSize={11} fill={TINTA_TENUE}>
            {d.mes}
          </text>
        ))}
        <line x1={x(0.5)} x2={x(0.5)} y1={M.t} y2={M.t + ih} stroke="#A1A1AA" strokeDasharray="3 3" />
        <text x={x(0.5) + 6} y={M.t + 10} fontSize={11} fill="#3F3F46">
          Arranque digital
        </text>
        <path d={area} fill="url(#area-calidad)" className={cn("transition-opacity duration-1000", visible ? "opacity-100" : "opacity-0")} />
        <path
          d={linea}
          fill="none"
          stroke={DIGITAL}
          strokeWidth={2}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={visible ? 0 : 1}
          style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1)" }}
        />
        <circle cx={x(CALIDAD.length - 1)} cy={y(ultimo.v)} r={4.5} fill={DIGITAL} stroke="#fff" strokeWidth={2} className={cn("transition-opacity delay-1000 duration-500", visible ? "opacity-100" : "opacity-0")} />
        <text x={x(CALIDAD.length - 1) - 8} y={y(ultimo.v) - 10} textAnchor="end" fontSize={12} fontWeight={600} fill="#18181B">
          {ultimo.v}%
        </text>
        {i !== null && (
          <g>
            <line x1={x(i)} x2={x(i)} y1={M.t} y2={M.t + ih} stroke="#71717A" strokeWidth={1} />
            <circle cx={x(i)} cy={y(CALIDAD[i].v)} r={5} fill={DIGITAL} stroke="#fff" strokeWidth={2} />
          </g>
        )}
      </svg>
      {i !== null && (
        <div className="pointer-events-none absolute right-5 top-5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
          <p className="text-sm font-semibold text-slate-900">{CALIDAD[i].v}%</p>
          <p className="text-slate-500">{CALIDAD[i].mes}</p>
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">El asistente no deja avanzar con campos vacíos o mal diligenciados.</p>
    </figure>
  );
}

export function GraficasImpacto() {
  const kpis = [
    { v: 82, suf: "%", t: "menos tiempo por formato", d: "de 50 a 9 minutos", icon: Clock },
    { v: 99, suf: "%", t: "formatos completos", d: "al primer intento", icon: FileCheck2 },
    { v: 0, suf: "", t: "documentos perdidos", d: "todo queda en la nube", icon: CloudOff },
    { v: 24, suf: "/7", t: "acceso para auditoría", d: "desde cualquier lugar", icon: ShieldCheck },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.t} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-sotec-green hover:shadow-md">
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-sotec-soft text-sotec-greenDeep">
              <Icono icon={k.icon} efecto="bounce" className="h-5 w-5" />
            </span>
            <p className="text-4xl font-semibold tracking-tight text-slate-900">
              <Contador valor={k.v} sufijo={k.suf} />
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">{k.t}</p>
            <p className="text-xs text-slate-500">{k.d}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarrasEtapas />
        <LineaCalidad />
      </div>
    </div>
  );
}
