/**
 * Orden de servicio: el eje que une los módulos de un trabajo.
 * Refleja la tabla public.ordenes_servicio (supabase/migrations/0002_operacion.sql).
 * Por ahora no se importa en ninguna parte: se conserva alineado con la tabla
 * para la futura interfaz de órdenes de servicio (módulo «en construcción»).
 */

/** Estados válidos (check de `ordenes_servicio.estado`). */
export type EstadoOrden = "abierta" | "en_ejecucion" | "cerrada" | "facturada" | "anulada";

/** Orden de servicio tal como la guarda la base (columnas en camelCase). */
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
