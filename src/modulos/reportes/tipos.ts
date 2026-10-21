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
  descripcion: string;
  recomendaciones: string;
  nombreTecnico: string;
  firmaTecnico: string; // data URL
  firmaCliente: string; // data URL
}
