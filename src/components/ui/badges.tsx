import { COLOR_ESTADO, ETIQUETA_ESTADO } from "@/lib/formatos";
import type { Estado } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EstadoBadge({ estado }: { estado: Estado }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", COLOR_ESTADO[estado])}>{ETIQUETA_ESTADO[estado]}</span>;
}

export function fechaCorta(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
