"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { Bot, Check, PenLine, Send, User } from "lucide-react";

import { useVisible } from "@/components/fx/Reveal";
import { cn } from "@/lib/utils";
import { asset } from "@/nucleo/rutas";

/**
 * Demostración en vivo del asistente: el bot «escribe», el técnico teclea su
 * respuesta y la envía, los mensajes suben solos y el formato FO-GSST-22 se
 * llena campo por campo. Se reproduce solo mientras está en pantalla.
 */
type Campo = "cliente" | "tipo" | "asunto" | "descripcion";
const GUION: { pregunta: string; respuesta: string; campo: Campo }[] = [
  { pregunta: "Hola 👋 ¿Para qué cliente es el reporte?", respuesta: "Ladrillera Arcillas del Caribe", campo: "cliente" },
  { pregunta: "Encontré a Ladrillera Arcillas del Caribe en el directorio y completé sus datos. ¿Qué tipo de reporte es?", respuesta: "Correctivo", campo: "tipo" },
  { pregunta: "¿Cuál es el asunto?", respuesta: "Reparación de fibra óptica", campo: "asunto" },
  { pregunta: "Describe el trabajo realizado.", respuesta: "Se reemplazó el tramo de fibra cristalizado entre Molienda y Patio de secado. Enlace estable.", campo: "descripcion" },
];

interface Msg {
  id: number;
  de: "bot" | "tecnico";
  texto: string;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ChatEnVivo() {
  const { ref, visible } = useVisible<HTMLDivElement>("0px", true);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [escribiendo, setEscribiendo] = useState(false);
  const [entrada, setEntrada] = useState("");
  const [campos, setCampos] = useState<Partial<Record<Campo, string>>>({});
  const [activo, setActivo] = useState<Campo | null>(null);
  const [firmado, setFirmado] = useState(false);
  const scroll = useRef<HTMLDivElement | null>(null);

  // Desplaza el chat (no la página) hasta el último mensaje
  useEffect(() => {
    scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "smooth" });
  }, [msgs, escribiendo]);

  useEffect(() => {
    if (!visible) return;
    let vivo = true;
    let id = 0;
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = (ms: number) => espera(reducido ? 0 : ms);

    (async () => {
      while (vivo) {
        setMsgs([]);
        setCampos({});
        setActivo(null);
        setFirmado(false);
        await t(500);
        for (const paso of GUION) {
          if (!vivo) return;
          // El bot «escribe» y su mensaje aparece letra por letra
          setEscribiendo(true);
          await t(900);
          if (!vivo) return;
          setEscribiendo(false);
          const idBot = ++id;
          setMsgs((m) => [...m, { id: idBot, de: "bot", texto: "" }]);
          for (let k = 1; k <= paso.pregunta.length && vivo; k += 2) {
            setMsgs((m) => m.map((x) => (x.id === idBot ? { ...x, texto: paso.pregunta.slice(0, k) } : x)));
            await t(18);
          }
          setMsgs((m) => m.map((x) => (x.id === idBot ? { ...x, texto: paso.pregunta } : x)));
          setActivo(paso.campo);
          await t(500);
          // El técnico teclea su respuesta en la barra y la envía
          for (let k = 1; k <= paso.respuesta.length && vivo; k++) {
            setEntrada(paso.respuesta.slice(0, k));
            await t(paso.respuesta.length > 40 ? 16 : 45);
          }
          await t(350);
          if (!vivo) return;
          setEntrada("");
          setMsgs((m) => [...m, { id: ++id, de: "tecnico", texto: paso.respuesta }]);
          setCampos((c) => ({ ...c, [paso.campo]: paso.respuesta }));
          await t(700);
        }
        setActivo(null);
        setEscribiendo(true);
        await t(700);
        setEscribiendo(false);
        setMsgs((m) => [...m, { id: ++id, de: "bot", texto: "¡Listo! Firma con el dedo y lo envío a revisión. ✍️" }]);
        await t(1000);
        setFirmado(true);
        setMsgs((m) => [...m, { id: ++id, de: "bot", texto: "✓ Firmado y enviado al Coordinador SST" }]);
        await t(3800);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [visible]);

  const linea = (etiqueta: string, campo: Campo) => (
    <p className="flex items-end gap-1.5">
      <span className="shrink-0">{etiqueta}:</span>
      <span className={cn("min-h-[1.25em] flex-1 border-b border-black px-1 transition-colors duration-500", campos[campo] && "bg-[#92D050]/30", activo === campo && "bg-amber-100 ring-2 ring-[#92D050]")}>
        {campos[campo] ?? ""}
      </span>
    </p>
  );

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-3xl">
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-sotec-green/20 blur-3xl" />
      <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
        {/* Chat */}
        <div className="flex h-[440px] flex-col overflow-hidden rounded-3xl bg-white text-slate-800 shadow-2xl ring-1 ring-black/5 sm:h-[480px]">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sotec text-sotec-green">
              <Bot className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Asistente SOTEC</p>
              <p className="flex items-center gap-1 text-[11px] text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {escribiendo ? "escribiendo…" : "en línea"}
              </p>
            </div>
          </div>
          <div ref={scroll} className="flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-4 text-[13px] [scrollbar-width:none]" aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={cn("flex items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300", m.de === "tecnico" && "justify-end")}>
                {m.de === "bot" && (
                  <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sotec text-sotec-green">
                    <Bot className="h-3 w-3" />
                  </span>
                )}
                <p className={cn("max-w-[82%] rounded-2xl px-3 py-2 leading-snug", m.de === "bot" ? "rounded-bl-md bg-slate-100" : "rounded-br-md bg-sotec text-white")}>{m.texto}</p>
                {m.de === "tecnico" && (
                  <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                    <User className="h-3 w-3" />
                  </span>
                )}
              </div>
            ))}
            {escribiendo && (
              <div className="flex items-end gap-2">
                <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sotec text-sotec-green">
                  <Bot className="h-3 w-3" />
                </span>
                <span className="flex gap-1 rounded-2xl rounded-bl-md bg-slate-100 px-3 py-3" aria-label="El asistente está escribiendo">
                  {[0, 150, 300].map((d) => (
                    <i key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-slate-100 p-3">
            <div className={cn("min-h-[40px] flex-1 truncate rounded-full border px-4 py-2 text-[13px]", entrada ? "border-sotec-green text-slate-800" : "border-slate-200 text-slate-400")}>
              {entrada || "Escribe tu respuesta…"}
              {entrada && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-blink bg-slate-700" />}
            </div>
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition", entrada ? "bg-sotec text-sotec-green" : "bg-slate-100 text-slate-400")}>
              <Send className="h-4 w-4" />
            </span>
          </div>
        </div>

        {/* Formato que se llena */}
        <div className="flex h-[440px] flex-col rounded-3xl bg-white p-4 font-[Arial] text-[11px] text-black shadow-2xl ring-1 ring-black/5 sm:h-[480px]">
          <div className="flex items-center justify-between border border-black px-2 py-1.5">
            <img src={asset("/sotec-logo-v3.png")} alt="" className="h-9 w-auto" />
            <div className="text-right text-[9px] font-bold leading-tight">
              FORMATO DE REPORTE TÉCNICO
              <br />
              <span className="font-normal">FO-GSST-22 · v01</span>
            </div>
          </div>
          <p className="mt-2 bg-[#92D050] py-0.5 text-center font-bold">DATOS GENERALES</p>
          <div className="space-y-2 border border-t-0 border-black p-2">
            {linea("Cliente", "cliente")}
            {linea("Tipo reporte", "tipo")}
            {linea("Asunto", "asunto")}
          </div>
          <p className="mt-2 bg-[#92D050] py-0.5 text-center font-bold">DESCRIPCIÓN</p>
          <p className={cn("min-h-[90px] flex-1 border border-t-0 border-black p-2 leading-snug transition-colors", activo === "descripcion" && "bg-amber-50 ring-2 ring-inset ring-[#92D050]")}>{campos.descripcion ?? ""}</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <div className="flex h-10 items-end justify-center">
                {firmado ? (
                  <svg viewBox="0 0 140 36" className="h-9" aria-hidden>
                    <path d="M6 26 C 26 2, 40 34, 62 16 S 98 4, 134 22" fill="none" stroke="#1d3b8a" strokeWidth="2.2" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1} style={{ animation: "icono-trazo 1.2s ease-out forwards" }} />
                  </svg>
                ) : (
                  <PenLine className="h-4 w-4 text-slate-300" />
                )}
              </div>
              <p className="border-t border-black pt-0.5">Firma técnico</p>
            </div>
            <div>
              <div className="h-10" />
              <p className="border-t border-black pt-0.5">Firma cliente</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
            <span className="font-mono">RT-011-26</span>
            <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold transition-colors", firmado ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500")}>
              {firmado && <Check className="h-3 w-3" />} {firmado ? "En revisión" : "Borrador"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
