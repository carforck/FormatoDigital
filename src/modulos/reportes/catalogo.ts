import type { DatosReporte } from "./tipos";

export const TIPOS_REPORTE = ["Preventivo", "Correctivo", "Instalación", "Diagnóstico", "Garantía"] as const;

export function reporteVacio(fecha: string): DatosReporte {
  return {
    fecha,
    horaLlegada: "",
    horaSalida: "",
    tipoReporte: "",
    cliente: "",
    direccion: "",
    personaContactada: "",
    correo: "",
    telefono: "",
    cargo: "",
    asunto: "",
    descripcion: "",
    recomendaciones: "",
    nombreTecnico: "",
    firmaTecnico: "",
    firmaCliente: "",
    fotos: [],
  };
}
