/**
 * Cotización comercial de SOTEC a su cliente (réplica de la cotización que hoy
 * sale de Odoo). Se guarda como un documento más (documentos.datos en la base
 * de datos). Flujo: borrador → en revisión → aprobada (= enviada al cliente) →
 * cerrada (el cliente la acepta firmando). El cliente sí la ve.
 */

/** Línea de la cotización. Valores en pesos colombianos (enteros). */
export interface ItemCotizacion {
  id: string;
  /** Primera línea de la descripción (el servicio o producto). */
  descripcion: string;
  /** Segunda línea opcional (alcance, altura, equipos incluidos…). */
  detalle?: string;
  /** Admite decimales (12,5 metros). */
  cantidad: number;
  /** Unidad en plural, como en el formato: «Unidades», «Metros»… */
  unidad: string;
  precioUnitario: number;
  /** % de IVA de la línea (19, 5 o 0). */
  ivaPct: number;
}

export interface DatosCotizacion {
  /** Fecha de cotización (AAAA-MM-DD). */
  fecha: string;
  /** Fecha de vencimiento de la oferta (AAAA-MM-DD). */
  vencimiento: string;
  vendedor: string;

  cliente: string;
  /** NIT o C.C. del cliente (opcional; el directorio aún no lo guarda). */
  clienteNit: string;
  contacto: string;
  correo: string;
  telefono: string;
  direccion: string;

  /** Asunto o proyecto que se cotiza. */
  asunto: string;
  items: ItemCotizacion[];

  // Condiciones comerciales
  formaPago: string;
  tiempoEntrega: string;
  garantia: string;
  /** Texto de validez; vacío = se calcula con la fecha de vencimiento. */
  validez: string;
  observaciones: string;

  // Aceptación del cliente (la firma cierra la cotización)
  aceptaNombre: string;
  aceptaCargo: string;
  aceptaFecha: string;
  firmaCliente: string;
}
