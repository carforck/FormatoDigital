"use client";

/**
 * Variante de formato al dibujar una plantilla (@/nucleo/variantes): quien muestra el
 * documento (generador, detalle, /imprimir, /firmar) envuelve la plantilla en
 * `<ConVariante>` y las piezas comunes (`Encabezado`, `LogoFormato`, `PieFormato`) y las
 * plantillas toman de aquí logo, control documental, colores, pie y etiquetas. Sin
 * envoltura, todo sale como SOTEC. También el chip «Formato: Servicios Fortox».
 */
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { VARIANTE_BASE, etiquetaEnVariante, varianteDe, varianteParaTipo, type VarianteFormato } from "@/nucleo/variantes";
import type { TipoDoc } from "@/nucleo/tipos";

const Contexto = createContext<string | undefined>(undefined);

/**
 * Dibuja la plantilla con una variante. Si la variante cambia el color de las franjas,
 * lo pasa como variable CSS (`--hdr-fondo`, ver globals.css) en un contenedor `contents`.
 */
export function ConVariante({ variante, tipo, children }: { variante?: string; tipo: TipoDoc; children: ReactNode }) {
  const v = varianteParaTipo(tipo, variante);
  if (v.clave === VARIANTE_BASE) return <Contexto.Provider value={undefined}>{children}</Contexto.Provider>;
  return (
    <Contexto.Provider value={v.clave}>
      <div className="contents" data-variante={v.clave} style={v.colorEncabezado ? ({ "--hdr-fondo": v.colorEncabezado } as CSSProperties) : undefined}>
        {children}
      </div>
    </Contexto.Provider>
  );
}

/** Variante con la que se está dibujando un tipo de documento (SOTEC si no hay envoltura). */
export function useVariante(tipo: TipoDoc): VarianteFormato {
  return varianteParaTipo(tipo, useContext(Contexto));
}

/** Variante de la plantilla que se está dibujando, sin saber su tipo (logo): SOTEC si no hay envoltura. */
export function useVarianteActual(): VarianteFormato {
  return varianteDe(useContext(Contexto));
}

/** Etiqueta de un campo según la variante: `const et = useEtiquetas("reporte"); et("Cliente")`. */
export function useEtiquetas(tipo: TipoDoc): (texto: string) => string {
  const clave = useContext(Contexto);
  return (texto) => etiquetaEnVariante(tipo, clave, texto);
}

/** Pie del formato: el de la variante o, en SOTEC, el texto del módulo (`children`). */
export function PieFormato({ tipo, anexo, className, children }: { tipo: TipoDoc; anexo?: boolean; className?: string; children: ReactNode }) {
  const v = useVariante(tipo);
  const texto = anexo ? (v.pieAnexo ?? v.pie) : v.pie;
  return <p className={className}>{v.clave === VARIANTE_BASE || !texto ? children : texto}</p>;
}

/** Chip «Formato: Servicios Fortox» (generador y detalle); avisa si la marca es provisional. */
export function ChipVariante({ variante, tipo, className }: { variante?: string; tipo: TipoDoc; className?: string }) {
  const v = varianteParaTipo(tipo, variante);
  const base = v.clave === VARIANTE_BASE;
  return (
    <span
      data-chip-variante={v.clave}
      title={v.provisional ? "Logo, código y colores provisionales: pendiente el formato oficial." : undefined}
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-x-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
        base ? "bg-sotec-soft text-sotec-greenDeep ring-sotec-green/50" : "bg-slate-800 text-white ring-slate-800",
        className,
      )}
    >
      <span>Formato: {v.etiqueta}</span>
      {v.provisional && <span className="font-normal opacity-80">(provisional)</span>}
    </span>
  );
}
