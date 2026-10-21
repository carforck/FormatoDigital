/**
 * Orden de servicio: el eje que une los módulos de un trabajo.
 * Refleja la tabla public.ordenes_servicio (supabase/migrations/0002_operacion.sql).
 */
export type EstadoOrden = "abierta" | "en_ejecucion" | "cerrada" | "facturada" | "anulada";

export interface OrdenServicio {
  id: string;
  organizacionId: string;
  codigo: string; // OS-001-26
  clienteId: string;
  sitioId?: string;
  titulo: string;
  descripcion: string;
  estado: EstadoOrden;
  responsableId?: string;
  fechaProgramada?: string;
  creadoPor: string;
  creado: string;
  actualizado: string;
}
