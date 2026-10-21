/**
 * Gasto de un trabajo (materiales, transporte, viáticos…).
 * Refleja public.gastos (0003_finanzas.sql). ESTRUCTURA PROVISIONAL: se
 * ajustará al formato de gastos que envíe SOTEC; sus campos propios van en `datos`.
 */
export type CategoriaGasto = "materiales" | "transporte" | "alimentacion" | "hospedaje" | "herramienta" | "otro";
export type EstadoGasto = "pendiente" | "aprobado" | "rechazado" | "reembolsado";

export interface Gasto {
  id: string;
  organizacionId: string;
  ordenId?: string;
  tecnicoId: string;
  fecha: string;
  categoria: CategoriaGasto;
  descripcion: string;
  valor: number;
  soporteId?: string; // foto del recibo en archivos
  datos: Record<string, unknown>;
  estado: EstadoGasto;
  motivoRechazo?: string;
  revisadoPor?: string;
  revisadoAt?: string;
}
