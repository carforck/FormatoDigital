"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, FileCheck2, FileX2, HardHat, Search, ShieldCheck, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Icono, useVisible } from "@/components/fx/Reveal";
import { cn } from "@/lib/utils";

const PARES: { icon: LucideIcon; papel: string; digital: string; dato: string }[] = [
  { icon: ShieldCheck, papel: "Campos en blanco o mal diligenciados que se detectan tarde", digital: "El asistente valida cada respuesta antes de avanzar", dato: "99 % completos" },
  { icon: Smartphone, papel: "El técnico vuelve a la oficina para entregar y escanear", digital: "Se diligencia y firma en campo, desde el celular", dato: "0 viajes a la oficina" },
  { icon: HardHat, papel: "Permisos firmados sin verificar EPP ni condiciones", digital: "Las reglas del SG-SST bloquean lo que no cumple", dato: "Bloqueo automático" },
  { icon: Search, papel: "Horas buscando un reporte para el cliente o el auditor", digital: "Cualquier documento aparece en segundos con su historial", dato: "De 20 min a segundos" },
  { icon: BarChart3, papel: "Sin indicadores: nadie sabe cuántos trabajos se hicieron", digital: "Tablero en tiempo real por cliente, mes y estado", dato: "En tiempo real" },
];

/** Comparación fila por fila: cada problema del papel con su solución digital. */
export function PapelVsDigital() {
  const { ref, visible } = useVisible<HTMLDivElement>("0px", true);
  const [activo, setActivo] = useState(0);
  const [mouse, setMouse] = useState(false);
  const [despues, setDespues] = useState(false);

  // Recorre los pares solo mientras está en pantalla y nadie interactúa
  useEffect(() => {
    if (!visible || mouse) return;
    const t = setInterval(() => setActivo((a) => (a + 1) % PARES.length), 2600);
    return () => clearInterval(t);
  }, [visible, mouse]);

  return (
    <div ref={ref}>
      {/* Escritorio: pares en filas */}
      <div className="hidden md:block" onPointerLeave={() => setMouse(false)}>
        <div className="grid grid-cols-[1fr_56px_1.15fr] items-end gap-x-2 pb-3">
          <p className="group flex items-center gap-2 px-5 text-sm font-semibold uppercase tracking-wider text-slate-500">
            <Icono icon={FileX2} className="h-4 w-4" /> Hoy, en papel
          </p>
          <span />
          <p className="group flex items-center gap-2 px-5 text-sm font-semibold uppercase tracking-wider text-sotec-greenDeep">
            <Icono icon={FileCheck2} className="h-4 w-4" /> Con ControlOne
          </p>
        </div>
        <div className="space-y-3">
          {PARES.map((p, k) => {
            const on = activo === k;
            return (
              <div
                key={p.papel}
                onPointerEnter={() => {
                  setMouse(true);
                  setActivo(k);
                }}
                className="grid cursor-default grid-cols-[1fr_56px_1.15fr] items-stretch gap-x-2"
              >
                <div
                  className={cn(
                    "flex items-center rounded-2xl border px-5 py-4 transition-all duration-500",
                    on ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-600",
                  )}
                >
                  <span className={cn("relative transition-all duration-500", on && "text-slate-400")}>
                    {p.papel}
                    <span aria-hidden className={cn("absolute left-0 top-1/2 h-px origin-left bg-rose-400/70 transition-transform duration-500", on ? "scale-x-100" : "scale-x-0")} style={{ width: "100%" }} />
                  </span>
                </div>
                <div className="flex items-center justify-center">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-500",
                      on ? "translate-x-1 border-sotec-green bg-sotec-green text-sotec shadow-[0_0_0_6px_rgba(146,208,80,0.2)]" : "border-slate-200 bg-white text-slate-400",
                    )}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
                <div
                  className={cn(
                    "group flex items-center gap-4 rounded-2xl border px-5 py-4 transition-all duration-500",
                    on ? "-translate-y-0.5 border-sotec-green bg-white shadow-lg shadow-sotec-green/10" : "border-sotec-green/30 bg-sotec-soft/60",
                  )}
                >
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-500", on ? "bg-sotec-green text-sotec" : "bg-sotec text-sotec-green")}>
                    <Icono icon={p.icon} efecto="bounce" className="h-5 w-5" />
                  </span>
                  <span className="flex-1 font-medium text-slate-800">{p.digital}</span>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-500", on ? "bg-sotec text-sotec-green" : "bg-white text-sotec-greenDeep ring-1 ring-sotec-green/40")}>
                    {p.dato}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Celular: interruptor Antes / Después */}
      <div className="md:hidden">
        <div className="mx-auto mb-5 flex w-fit rounded-full bg-slate-100 p-1" role="tablist">
          {[
            { v: false, t: "Antes · papel" },
            { v: true, t: "Después · digital" },
          ].map((o) => (
            <button
              key={o.t}
              role="tab"
              aria-selected={despues === o.v}
              onClick={() => setDespues(o.v)}
              className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition", despues === o.v ? (o.v ? "bg-sotec text-white shadow" : "bg-white text-slate-700 shadow") : "text-slate-500")}
            >
              {o.t}
            </button>
          ))}
        </div>
        <ul className="space-y-3">
          {PARES.map((p, k) => (
            <li
              key={p.papel}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 transition-all duration-500",
                despues ? "border-sotec-green/50 bg-white shadow-sm" : "border-slate-200 bg-slate-50",
              )}
              style={{ transitionDelay: `${k * 60}ms` }}
            >
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors", despues ? "bg-sotec text-sotec-green" : "bg-slate-200 text-slate-500")}>
                {despues ? <p.icon className="h-4 w-4" /> : <FileX2 className="h-4 w-4" />}
              </span>
              <div key={String(despues)} className="min-w-0 flex-1 animate-in fade-in slide-in-from-right-2 duration-300">
                <p className={cn("text-sm", despues ? "font-medium text-slate-800" : "text-slate-600")}>{despues ? p.digital : p.papel}</p>
                {despues && <p className="mt-1 text-xs font-semibold text-sotec-greenDeep">{p.dato}</p>}
              </div>
            </li>
          ))}
        </ul>
        {!despues && (
          <button onClick={() => setDespues(true)} className="mx-auto mt-4 flex items-center gap-1 text-sm font-semibold text-sotec-greenDeep">
            Ver cómo queda en digital <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <a href="#ahorro" className="group mx-auto mt-10 flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sotec-green hover:text-slate-900">
        ¿Cuánto le cuesta el papel a tu empresa?
        <span className="font-semibold text-sotec-greenDeep">Calcúlalo</span>
        <ArrowRight className="h-4 w-4 text-sotec-greenDeep transition group-hover:translate-x-1" />
      </a>
    </div>
  );
}
