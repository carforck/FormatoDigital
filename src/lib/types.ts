export type Rol = "tecnico" | "supervisor" | "admin" | "cliente";

export type Estado = "borrador" | "en_revision" | "aprobado" | "rechazado" | "cerrado";

export type TipoDoc = "reporte" | "permiso";

export interface Usuario {
  id: string;
  nombre: string;
  cargo: string;
  rol: Rol;
  email: string;
  cedula?: string;
  clienteId?: string; // solo para rol cliente
  activo: boolean;
}

export interface Cliente {
  id: string;
  nombre: string;
  direccion: string;
  contacto: string;
  cargo: string;
  correo: string;
  telefono: string;
  sitio: string;
}

/** FO-GSST-22 · Formato de reporte técnico */
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

export interface Evento {
  fecha: string;
  usuarioId: string;
  accion: string;
  detalle?: string;
}

interface DocBase {
  id: string;
  codigo: string;
  consecutivo: number;
  estado: Estado;
  autorId: string;
  clienteId: string;
  creado: string;
  actualizado: string;
  motivoRechazo?: string;
  historial: Evento[];
}

export interface DocReporte extends DocBase {
  tipo: "reporte";
  datos: DatosReporte;
}
export interface DocPermiso extends DocBase {
  tipo: "permiso";
  datos: DatosPermiso;
}
export type Documento = DocReporte | DocPermiso;

export interface Notificacion {
  id: string;
  para: Rol | string; // rol o id de usuario
  texto: string;
  docId?: string;
  fecha: string;
  leida: boolean;
}

export interface Auditoria {
  id: string;
  fecha: string;
  usuarioId: string;
  accion: string;
  detalle: string;
}

export interface Config {
  empresa: string;
  nit: string;
  prefijoReporte: string;
  prefijoPermiso: string;
  exigirFirmaCliente: boolean;
  vigenciaPermisoHoras: number;
}
