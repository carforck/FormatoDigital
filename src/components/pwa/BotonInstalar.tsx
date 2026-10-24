"use client";

/**
 * Botón discreto «Instalar app» (PWA). Solo aparece si se puede instalar:
 * - Chrome, Edge, Android: abre el diálogo de instalación del navegador.
 * - iOS (Safari): muestra cómo agregarla a la pantalla de inicio.
 * - Ya instalada o navegador sin soporte: no muestra nada.
 *
 * `variante="menu"`: ítem del menú de perfil del aplicativo (AppShell).
 * `variante="acceso"`: enlace pequeño en /acceso.
 */
import { useState } from "react";
import { Download, PlusSquare, Share } from "lucide-react";

import { cn } from "@/lib/utils";
import { useInstalarApp } from "./instalacion";

export function BotonInstalar({ variante, className }: { variante: "menu" | "acceso"; className?: string }) {
  const { forma, instalar } = useInstalarApp();
  const [verPasos, setVerPasos] = useState(false);
  if (!forma) return null;

  const alTocar = () => {
    if (forma === "dialogo") void instalar();
    else setVerPasos(!verPasos);
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={alTocar}
        aria-expanded={forma === "ios" ? verPasos : undefined}
        className={cn(
          variante === "menu"
            ? "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-50"
            : "inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-sotec-greenDeep hover:text-sotec focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sotec-greenDeep focus-visible:ring-offset-2",
        )}
      >
        <Download className={variante === "menu" ? "h-4 w-4" : "h-3.5 w-3.5 text-sotec-greenDeep"} />
        Instalar app
        {variante === "menu" && <span className="ml-auto text-[11px] text-slate-400">funciona sin conexión</span>}
      </button>
      {forma === "ios" && verPasos && (
        <p role="note" className={cn("rounded-lg bg-sotec-soft px-3 py-2 text-xs leading-relaxed text-slate-700", variante === "menu" ? "mx-2 mb-1" : "mt-2 max-w-sm")}>
          En Safari toca <Share aria-label="Compartir" className="inline h-3.5 w-3.5 -translate-y-px text-sotec-greenDeep" /> <strong>Compartir</strong> y luego{" "}
          <PlusSquare aria-hidden className="inline h-3.5 w-3.5 -translate-y-px text-sotec-greenDeep" /> <strong>Agregar a pantalla de inicio</strong>. ControlOne
          quedará como una app y abrirá aunque no tengas conexión.
        </p>
      )}
    </div>
  );
}
