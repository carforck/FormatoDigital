/** Foto del registro fotográfico (hoja anexa del reporte). */
export interface FotoReporte {
  id: string;
  src: string; // JPEG comprimido (data URL en la demo; ruta de Storage en producción)
  descripcion: string;
  etiqueta: "antes" | "despues" | "";
}

/** FO-GSST-22 · Formato de reporte técnico: contenido del formato. */
export interface DatosReporte {
  fecha: string;
  tipoReporte: string;
  cliente: string;
  direccion: string;
  personaContactada: string;
  correo: string;
  telefono: string;
  cargo: string;
  asunto: string;
  /** Proyecto u obra (código y nombre) cuando el reporte pertenece a uno. */
  proyecto?: string;
  descripcion: string;
  recomendaciones: string;
  nombreTecnico: string;
  firmaTecnico: string; // data URL
  firmaCliente: string; // data URL
  /** Registro fotográfico: sale en una hoja anexa con el mismo encabezado. */
  fotos?: FotoReporte[];
}
