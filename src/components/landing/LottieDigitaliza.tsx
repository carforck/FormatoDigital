"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { asset } from "@/nucleo/rutas";
import { CheckCircle2, CloudUpload, PenLine, ScanLine } from "lucide-react";

// lottie-web toca `document`: solo en el cliente
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const ETAPAS = [
  { icon: ScanLine, t: "Leyendo tu formato" },
  { icon: CheckCircle2, t: "Campos validados" },
  { icon: CloudUpload, t: "Sincronizado" },
  { icon: PenLine, t: "Listo para firmar" },
];

/** Animación principal: el papel se escanea y pasa al celular. */
export function LottieDigitaliza() {
  const [data, setData] = useState<object | null>(null);
  const [etapa, setEtapa] = useState(0);

  useEffect(() => {
    fetch(asset("/lottie/digitaliza.json"))
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-xl">
      <div className="absolute inset-[10%] -z-10 rounded-full bg-sotec-green/20 blur-3xl" />
      {data && (
        <Lottie
          animationData={data}
          loop
          autoplay
          className="h-full w-full"
          onEnterFrame={(e) => {
            const f = (e as unknown as { currentTime: number }).currentTime;
            const k = f < 34 ? 0 : f < 72 ? 1 : f < 112 ? 2 : 3;
            setEtapa((prev) => (prev === k ? prev : k));
          }}
        />
      )}
      <div className="absolute left-1/2 top-2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
        {ETAPAS.map((x, k) => (
          <span key={x.t} className={k === etapa ? "flex items-center gap-1.5 text-sotec-green" : "hidden"}>
            <x.icon key={etapa} className="icono-dibujar h-3.5 w-3.5" /> {x.t}
          </span>
        ))}
        <span className="flex gap-1">
          {ETAPAS.map((x, k) => (
            <i key={x.t} className={`h-1.5 w-1.5 rounded-full transition ${k <= etapa ? "bg-sotec-green" : "bg-white/25"}`} />
          ))}
        </span>
      </div>
      <div className="absolute -left-2 bottom-8 hidden animate-float-y rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-white backdrop-blur sm:block">
        <p className="text-white/60">Formato original</p>
        <p className="font-semibold">FO-GSST-22 · papel</p>
      </div>
      <div className="absolute -right-2 bottom-16 hidden animate-float-y-slow rounded-xl border border-sotec-green/30 bg-sotec-green/15 px-3 py-2 text-xs text-white backdrop-blur sm:block">
        <p className="text-sotec-green">En la app</p>
        <p className="font-semibold">RT-011-26 · con firma</p>
      </div>
    </div>
  );
}
