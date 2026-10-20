"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Check,
  ClipboardCheck,
  FileCheck2,
  History,
  Layers,
  PenLine,
  Search,
  ShieldCheck,
  Smartphone,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Icono, useVisible } from "@/components/fx/Reveal";
import { rutaDoc } from "@/lib/base";
import { useDemo } from "@/lib/store";
import type { Rol } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Destino {
  rol: Rol;
  ruta: string;
}

/** Entra a la demo con el rol indicado y abre la pantalla donde vive la función. */
function useIrADemo() {
  const demo = useDemo();
  const router = useRouter();
  return ({ rol, ruta }: Destino) => {
    demo.entrarComo(rol);
    router.push(ruta);
  };
}

function VerEnDemo({ destino, className }: { destino: Destino; className?: string }) {
  const ir = useIrADemo();
  return (
    <button onClick={() => ir(destino)} className={cn("inline-flex items-center gap-1 text-sm font-semibold text-sotec-greenDeep", className)}>
      Verlo en la demo <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
    </button>
  );
}

/** Ciclo de pasos que solo avanza mientras la tarjeta está en pantalla. */
function useCiclo(pasos: number, ms: number) {
  const { ref, visible } = useVisible<HTMLDivElement>("0px", true);
  const [paso, setPaso] = useState(0);
  useEffect(() => {
    if (!visible) return setPaso(0);
    const t = setInterval(() => setPaso((p) => (p + 1) % pasos), ms);
    return () => clearInterval(t);
  }, [visible, pasos, ms]);
  return { ref, paso };
}

function AnimAsistente() {
  const { ref, paso } = useCiclo(5, 1300);
  return (
    <div ref={ref} className="space-y-2 rounded-xl bg-white p-3 text-xs shadow-inner ring-1 ring-slate-200">
      <p className={cn("w-fit rounded-2xl bg-slate-100 px-3 py-1.5 transition-all duration-500", paso >= 0 ? "opacity-100" : "opacity-0")}>¿Qué tipo de reporte es?</p>
      <p className={cn("ml-auto w-fit rounded-2xl bg-sotec px-3 py-1.5 text-white transition-all duration-500", paso >= 1 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>Correctivo</p>
      <p className={cn("w-fit rounded-2xl bg-slate-100 px-3 py-1.5 transition-all duration-500", paso >= 2 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>¿Cuál es el asunto?</p>
      <div className="mt-2 rounded-lg border border-black/80 p-2 font-[Arial] text-[11px] text-black">
        <p className="flex gap-1">
          Tipo reporte:
          <span className={cn("flex-1 border-b border-black px-1 transition-colors duration-500", paso >= 1 && "bg-sotec-green/30")}>{paso >= 1 ? "Correctivo" : ""}</span>
        </p>
        <p className="mt-1 flex gap-1">
          Asunto:
          <span className={cn("flex-1 border-b border-black px-1 transition-colors duration-500", paso >= 3 && "bg-sotec-green/30")}>{paso >= 3 ? "Reparación fibra óptica" : ""}</span>
        </p>
      </div>
    </div>
  );
}

function AnimReglas() {
  const { ref, paso } = useCiclo(4, 1500);
  const arnes = paso >= 2;
  return (
    <div ref={ref} className="space-y-2 rounded-xl bg-white p-3 text-xs shadow-inner ring-1 ring-slate-200">
      <p className="flex items-center gap-2">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-amber-700">!</span> Peligro: caída desde altura (1,5 m)
      </p>
      <p className="flex items-center gap-2">
        <span className={cn("flex h-4 w-4 items-center justify-center rounded-full transition-colors duration-300", arnes ? "bg-emerald-500 text-white" : "bg-rose-100 text-rose-700")}>
          {arnes ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
        </span>
        Arnés de cuerpo completo
      </p>
      <div className={cn("flex items-center justify-between rounded-lg px-3 py-2 font-semibold transition-colors duration-300", arnes ? "bg-sotec text-sotec-green" : "bg-rose-50 text-rose-800 ring-1 ring-rose-200")}>
        {arnes ? "Permiso listo para enviar" : "Bloqueado: falta el arnés"}
        <span className={cn("rounded-md px-2 py-0.5 text-[11px]", arnes ? "bg-sotec-green text-sotec" : "bg-white/70 text-rose-400 line-through")}>Enviar</span>
      </div>
    </div>
  );
}

function AnimFirma() {
  const { ref, paso } = useCiclo(3, 1800);
  return (
    <div ref={ref} className="rounded-xl bg-white p-3 text-xs shadow-inner ring-1 ring-slate-200">
      <svg viewBox="0 0 240 70" className="h-16 w-full" aria-hidden>
        <path
          d="M10 48 C 30 10, 48 66, 70 34 S 104 8, 124 40 S 160 62, 182 26 S 214 30, 230 44 M 50 56 L 190 52"
          fill="none"
          stroke="#1d3b8a"
          strokeWidth={2.4}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={paso >= 1 ? 0 : 1}
          style={{ transition: paso >= 1 ? "stroke-dashoffset 1.4s ease-out" : "none" }}
        />
      </svg>
      <div className="flex items-center justify-between border-t border-black/70 pt-1">
        <span>Firma técnico</span>
        <span className={cn("flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 transition-opacity duration-500", paso >= 2 ? "opacity-100" : "opacity-0")}>
          <Check className="h-3 w-3" /> 10:42 · con fecha y hora
        </span>
      </div>
    </div>
  );
}

const ESTRELLAS: { icon: LucideIcon; t: string; d: string; anim: React.ComponentType; destino: Destino }[] = [
  { icon: Bot, t: "Asistente paso a paso", d: "Pregunta, valida y ubica cada respuesta en el campo correcto del formato.", anim: AnimAsistente, destino: { rol: "tecnico", ruta: "/app/nuevo/reporte" } },
  { icon: ShieldCheck, t: "Reglas de tu SGC", d: "Lo que no cumple no se envía: sin arnés no hay trabajo en alturas.", anim: AnimReglas, destino: { rol: "tecnico", ruta: "/app/nuevo/permiso" } },
  { icon: PenLine, t: "Firma en el celular", d: "Técnicos, ejecutores, supervisores y clientes firman con el dedo.", anim: AnimFirma, destino: { rol: "tecnico", ruta: "/app/nuevo/reporte" } },
];

const RESTO: { icon: LucideIcon; t: string; d: string; destino: Destino }[] = [
  { icon: FileCheck2, t: "Fiel al formato original", d: "Mismo código, versión y estructura.", destino: { rol: "admin", ruta: rutaDoc("d-rt-clay") } },
  { icon: ClipboardCheck, t: "Flujo de aprobación", d: "Revisión, aprobación y cierre con motivo.", destino: { rol: "supervisor", ruta: "/app/revision" } },
  { icon: Users, t: "Roles y accesos", d: "Cada quien ve solo lo suyo.", destino: { rol: "admin", ruta: "/app/usuarios" } },
  { icon: History, t: "Trazabilidad", d: "Quién hizo qué y cuándo, para auditoría.", destino: { rol: "admin", ruta: "/app/auditoria" } },
  { icon: BarChart3, t: "Tablero de indicadores", d: "Por mes, cliente y estado.", destino: { rol: "admin", ruta: "/app" } },
  { icon: Search, t: "Búsqueda instantánea", d: "Por código, cliente o texto.", destino: { rol: "admin", ruta: "/app/documentos" } },
  { icon: Building2, t: "Portal del cliente", d: "Consulta y firma sus reportes.", destino: { rol: "cliente", ruta: "/app/documentos" } },
  { icon: Layers, t: "Plantillas inteligentes", d: "Precarga peligros, medidas y EPP.", destino: { rol: "tecnico", ruta: "/app/nuevo/permiso" } },
  { icon: Smartphone, t: "PDF y celular", d: "Idéntico al formato aprobado.", destino: { rol: "admin", ruta: rutaDoc("d-pt-clay") } },
];

export function FuncionesBento() {
  const ir = useIrADemo();
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {ESTRELLAS.map((f, k) => (
          <div
            key={f.t}
            className={cn(
              "group flex flex-col rounded-3xl border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl",
              k === 0 ? "border-sotec bg-sotec text-white" : "border-slate-200 bg-white hover:border-sotec-green",
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", k === 0 ? "bg-sotec-green text-sotec" : "bg-sotec text-sotec-green")}>
                <Icono icon={f.icon} efecto="bounce" className="h-5 w-5" />
              </span>
              <p className="text-lg font-semibold">{f.t}</p>
            </div>
            <p className={cn("mt-2 text-sm", k === 0 ? "text-white/70" : "text-slate-600")}>{f.d}</p>
            <div className="mt-5 flex flex-1 flex-col justify-center text-slate-800">
              <f.anim />
            </div>
            <VerEnDemo destino={f.destino} className={cn("mt-5", k === 0 && "text-sotec-green")} />
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RESTO.map((f) => (
          <button
            key={f.t}
            onClick={() => ir(f.destino)}
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:border-sotec-green hover:bg-sotec-soft/50 hover:shadow-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors duration-300 group-hover:bg-sotec group-hover:text-sotec-green">
              <Icono icon={f.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-slate-900">{f.t}</span>
              <span className="block text-sm text-slate-600">{f.d}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-sotec-greenDeep" aria-label="Verlo en la demo" />
          </button>
        ))}
      </div>

      <p className="pt-4 text-center text-sm text-slate-600">
        Cada tarjeta te lleva a la pantalla real de la demo.{" "}
        <button onClick={() => ir({ rol: "tecnico", ruta: "/app/nuevo/reporte" })} className="font-semibold text-sotec-greenDeep hover:underline">
          Pruébalas todas, sin contraseña →
        </button>
      </p>
    </div>
  );
}
