"use client";

/**
 * Animación Lottie decorativa de la pantalla de acceso (`/acceso`). Carga el
 * JSON en el cliente; si falla, el contenedor queda vacío con su proporción.
 */
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { LottieRefCurrentProps } from "lottie-react";

import { asset } from "@/nucleo/rutas";
import { cn } from "@/lib/utils";

// lottie-web toca `document`: solo en el cliente
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

/**
 * ControlOne en el centro conectado con las áreas de la empresa
 * (public/lottie/control.json, generado por scripts/generar-lottie-control.py).
 * Con «reducir movimiento» queda quieta en el cuadro con todo conectado.
 */
export function LottieControl({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [data, setData] = useState<object | null>(null);
  const [quieta, setQuieta] = useState(false);
  const ref = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    setQuieta(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    fetch(asset("/lottie/control.json"))
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <div aria-hidden className={cn("aspect-[52/30] w-full", className)} style={style}>
      {data && (
        <Lottie
          lottieRef={ref}
          animationData={data}
          loop={!quieta}
          autoplay={!quieta}
          onDOMLoaded={() => quieta && ref.current?.goToAndStop(110, true)}
          className="h-full w-full"
        />
      )}
    </div>
  );
}
