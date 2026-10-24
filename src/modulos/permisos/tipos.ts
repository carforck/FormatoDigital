/**
 * Tipos del permiso de trabajo (F-GSST-13). El contenido se guarda en
 * `documentos.datos` (jsonb).
 */

/** Respuesta de una verificación de condiciones ("" = sin responder; "NO" bloquea el envío). */
export type SiNoNa = "SI" | "NO" | "NA" | "";

/** Integrante del grupo ejecutor: cada uno firma en su fila. */
export interface Ejecutor {
  nombre: string;
  cedula: string;
  arlEps: string;
  horaInicio: string;
  horaFin: string;
  firma: string;
}

/** F-GSST-13 · Permiso de trabajo */
export interface DatosPermiso {
  fechaEmision: string;
  hora: string;
  ampm: "AM" | "PM";
  cliente: string;
  sitioTrabajo: string;
  puestoProyecto: string;
  responsable: string;
  actividades: string;
  equipo: string[];
  maquinariaCual: string;
  equipoMenorCual: string;
  equipoOtros: string;
  peligros: string[];
  peligrosOtros: string;
  medidas: string[];
  medidasOtras: string;
  epp: string[];
  eppOtro: string;
  /** Una respuesta por pregunta de `PREGUNTAS_VERIFICACION`, en el mismo orden. */
  verificacion: SiNoNa[];
  ejecutores: Ejecutor[];
  autoriza: string;
  firmaAutoriza: string;
  encargado: string;
  firmaEncargado: string;
  /** Cierre: lo diligencia el emisor en el detalle, ya aprobado (`flujo.cierre: "formulario"`). */
  cierreAreaLimpia: "SI" | "NO" | "";
  cierraNombre: string;
  firmaCierre: string;
}
