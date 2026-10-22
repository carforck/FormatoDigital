import { FileText, HardHat, Wallet } from "lucide-react";

import type { TipoDoc } from "@/nucleo/tipos";

const ICONOS = { reporte: FileText, permiso: HardHat, gasto: Wallet } as const;

/** Ícono del tipo de documento (reporte, permiso, legalización de gastos). */
export function IconoDoc({ tipo, className = "h-4 w-4" }: { tipo: TipoDoc; className?: string }) {
  const I = ICONOS[tipo];
  return <I className={className} aria-hidden />;
}
