/**
 * Área de texto sobre renglones, como los formatos en papel (actividad realizada, diagnóstico…).
 * Los renglones son bordes de verdad y no un degradado CSS: al imprimir desde el celular
 * (Safari iOS, Chrome Android) un `repeating-linear-gradient` sale como un cuadro negro.
 * Siempre hay al menos `minimo` renglones y, si el texto es largo, los que necesite.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Renglones estimados para un texto (≈ `porRenglon` caracteres por renglón y cada salto de línea). */
export function renglonesPara(texto: string, porRenglon = 95): number {
  return (texto || "").split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / porRenglon)), 0);
}

export function Renglones({ children, minimo, texto = "", alto = 24, className }: { children: ReactNode; minimo: number; texto?: string; alto?: number; className?: string }) {
  const n = Math.max(minimo, renglonesPara(texto) + 1);
  return (
    <div className={cn("relative", className)} style={{ lineHeight: `${alto}px`, minHeight: n * alto }}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0">
        {Array.from({ length: n }, (_, i) => (
          <div key={i} className="border-b border-black" style={{ height: alto }} />
        ))}
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
