/**
 * Ícono por tipo de documento. Usado en tablero, documentos, revisión y
 * proyectos (`src/app/app/**`). Tipos desconocidos caen en `FileText`.
 */
import { FileSignature, FileText, HardHat, Wallet } from "lucide-react";

import type { TipoDoc } from "@/nucleo/tipos";

const ICONOS: Record<TipoDoc, typeof FileText> = { reporte: FileText, permiso: HardHat, gasto: Wallet, cotizacion: FileSignature };

/** Ícono del tipo de documento (reporte, permiso, legalización de gastos, cotización). */
export function IconoDoc({ tipo, className = "h-4 w-4" }: { tipo: TipoDoc; className?: string }) {
  const I = ICONOS[tipo] ?? FileText;
  return <I className={className} aria-hidden />;
}
