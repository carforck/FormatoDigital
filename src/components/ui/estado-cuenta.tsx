/**
 * Insignia del estado de una cuenta de cobro. Usada en `/app/cobros`,
 * `/app/cobros/ver` y la ficha del proyecto (`/app/proyectos/ver`).
 */
import { COLOR_ESTADO_CUENTA, ETIQUETA_ESTADO_CUENTA, type EstadoCuentaCobro } from "@/modulos/cobros/tipos";
import { cn } from "@/lib/utils";

/** Pastilla con color y etiqueta del catálogo de `@/modulos/cobros/tipos`. */
export function EstadoCuentaBadge({ estado }: { estado: EstadoCuentaCobro }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", COLOR_ESTADO_CUENTA[estado])}>{ETIQUETA_ESTADO_CUENTA[estado]}</span>;
}
