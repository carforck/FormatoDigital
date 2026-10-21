"use client";

import { useEffect, useState } from "react";
import { Bot, Check, PenLine } from "lucide-react";

import { asset } from "@/nucleo/rutas";
import { cn } from "@/lib/utils";

/** Mini demo que se reproduce sola: el asistente pregunta y el formato se llena. */
const GUION: { q: string; a: string; campo: string; valor: string }[] = [
  { q: "¿Para qué cliente es el reporte?", a: "Ladrillera Arcillas del Caribe", campo: "Cliente", valor: "Ladrillera Arcillas del Caribe" },
  { q: "¿Qué tipo de reporte es?", a: "Correctivo", campo: "Tipo reporte", valor: "Correctivo" },
  { q: "¿Cuál es el asunto?", a: "Reparación fibra óptica", campo: "Asunto", valor: "Reparación fibra óptica" },
  { q: "Describe el trabajo realizado", a: "Se reemplazó el tramo de fibra cristalizado…", campo: "Descripción", valor: "Se reemplazó el tramo de fibra cristalizado entre Molino 3 y Patio Ladrillo. Enlace estable." },
];

export function HeroDemo() {
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPaso((p) => (p + 1) % (GUION.length + 3)), 1600);
    return () => clearInterval(t);
  }, []);

  const hechos = Math.min(paso, GUION.length);
  const firmado = paso >= GUION.length + 1;

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-sotec-green/25 blur-3xl" />
      <div className="grid gap-3 sm:grid-cols-[1fr_1.15fr]">
        <div className="rounded-2xl border border-white/10 bg-white p-3 text-slate-800 shadow-2xl">
          <p className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sotec text-sotec-green">
              <Bot className="h-3.5 w-3.5" />
            </span>
            Asistente
          </p>
          <div className="mt-2 h-[230px] space-y-2 overflow-hidden text-[11px]">
            {GUION.slice(0, Math.min(paso + 1, GUION.length)).map((g, k) => (
              <div key={k} className="space-y-1 animate-in fade-in slide-in-from-bottom-1">
                <p className="w-fit max-w-[90%] rounded-xl bg-slate-100 px-2 py-1">{g.q}</p>
                {k < hechos && <p className="ml-auto w-fit max-w-[90%] rounded-xl bg-sotec px-2 py-1 text-white">{g.a}</p>}
              </div>
            ))}
            {firmado && <p className="w-fit rounded-xl bg-emerald-50 px-2 py-1 text-emerald-800 animate-in fade-in">✓ Firmado y enviado a revisión</p>}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-3 font-[Arial] text-[10px] text-black shadow-2xl">
          <div className="flex items-center justify-between border border-black px-1.5 py-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset("/sotec-logo.png")} alt="" className="h-5 w-auto" />
            <span className="text-[8px] font-bold">FO-GSST-22</span>
          </div>
          <p className="mt-1 bg-sotec-green py-0.5 text-center font-bold">DATOS GENERALES</p>
          <div className="space-y-1 border border-t-0 border-black p-1.5">
            {GUION.slice(0, 3).map((g, k) => (
              <p key={g.campo} className="flex gap-1">
                <span>{g.campo}:</span>
                <span className={cn("flex-1 border-b border-black transition-colors", k < hechos && "bg-sotec-green/30")}>{k < hechos ? g.valor : ""}</span>
              </p>
            ))}
          </div>
          <p className="mt-1 bg-sotec-green py-0.5 text-center font-bold">DESCRIPCIÓN</p>
          <p className="h-[62px] border border-t-0 border-black p-1.5">{hechos >= 4 ? GUION[3].valor : ""}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="flex h-7 items-end justify-center">
                {firmado ? (
                  <svg viewBox="0 0 120 30" className="h-7 animate-in fade-in" aria-hidden>
                    <path d="M5 22 C 25 2, 35 30, 55 15 S 85 5, 115 18" fill="none" stroke="#1d3b8a" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  paso === GUION.length && <PenLine className="h-4 w-4 animate-pulse text-sotec-greenDeep" />
                )}
              </div>
              <p className="border-t border-black">Firma técnico</p>
            </div>
            <div>
              <div className="h-7" />
              <p className="border-t border-black">Firma cliente</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[9px] text-slate-500">
            <span>RT-011-26</span>
            <span className={cn("flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold", firmado ? "bg-amber-100 text-amber-800" : "bg-slate-100")}>
              {firmado ? <Check className="h-2.5 w-2.5" /> : null}
              {firmado ? "En revisión" : "Borrador"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
