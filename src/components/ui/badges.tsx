import { etiquetaEstado } from "@/modulos/registro";
import { COLOR_ESTADO, COLOR_ESTADO_PROYECTO, ETIQUETA_ESTADO, ETIQUETA_ESTADO_PROYECTO } from "@/nucleo/catalogos";
import type { Estado, EstadoProyecto, TipoDoc } from "@/nucleo/tipos";
import { cn } from "@/lib/utils";

/** Estado del documento; con `tipo`, en la concordancia del formato («Aprobada», «Aceptada»). */
export function EstadoBadge({ estado, tipo }: { estado: Estado; tipo?: TipoDoc }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", COLOR_ESTADO[estado])}>{tipo ? etiquetaEstado(tipo, estado) : ETIQUETA_ESTADO[estado]}</span>;
}

export function EstadoProyectoBadge({ estado }: { estado: EstadoProyecto }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", COLOR_ESTADO_PROYECTO[estado])}>{ETIQUETA_ESTADO_PROYECTO[estado]}</span>;
}

export function fechaCorta(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
