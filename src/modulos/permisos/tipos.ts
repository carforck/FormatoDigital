export type SiNoNa = "SI" | "NO" | "NA" | "";

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
  verificacion: SiNoNa[];
  ejecutores: Ejecutor[];
  autoriza: string;
  firmaAutoriza: string;
  encargado: string;
  firmaEncargado: string;
  cierreAreaLimpia: "SI" | "NO" | "";
  cierraNombre: string;
  firmaCierre: string;
}
