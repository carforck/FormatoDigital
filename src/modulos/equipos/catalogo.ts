import type { EstadoEquipo, SistemaEquipo } from "./tipos";

/**
 * Sistemas en los que se agrupan los equipos de un cliente. Para agregar uno
 * basta una entrada aquí (y su ícono en IconoEquipo.tsx): la base de datos
 * guarda la clave como texto, sin lista cerrada.
 */
export const SISTEMAS = [
  {
    clave: "cctv",
    nombre: "Sistema CCTV",
    corto: "CCTV",
    tipos: ["NVR", "DVR", "Cámara domo", "Cámara bala", "Cámara PTZ", "Switch PoE", "Disco duro", "Monitor", "Fuente de poder"],
  },
  {
    clave: "alarmas",
    nombre: "Sistema de alarma",
    corto: "Alarmas",
    tipos: ["Panel de alarma", "Teclado", "Sensor de movimiento", "Contacto magnético", "Sirena", "Botón de pánico", "Batería"],
  },
  {
    clave: "acceso",
    nombre: "Control de acceso",
    corto: "Control de acceso",
    tipos: ["Controladora", "Lectora biométrica", "Lectora de tarjeta", "Cerradura electromagnética", "Torniquete", "Botón de salida", "Fuente de poder"],
  },
  {
    clave: "incendio",
    nombre: "Detección de incendio",
    corto: "Incendio",
    tipos: ["Panel de incendio", "Detector de humo", "Detector de temperatura", "Estación manual", "Sirena con estrobo", "Módulo de control"],
  },
  {
    clave: "computo",
    nombre: "Cómputo y redes",
    corto: "Cómputo y redes",
    tipos: ["PC", "Portátil", "Servidor", "Switch", "Router", "Access point", "UPS", "Impresora"],
  },
  {
    clave: "cerca",
    nombre: "Cerca eléctrica",
    corto: "Cerca eléctrica",
    tipos: ["Energizador", "Zona de cerca", "Sirena", "Batería", "Puesta a tierra"],
  },
] as const;

export const CLAVES_SISTEMA = SISTEMAS.map((s) => s.clave) as SistemaEquipo[];

export const esSistema = (x: string): x is SistemaEquipo => (CLAVES_SISTEMA as string[]).includes(x);

/** Sistema por clave (con un valor por defecto si la clave no está en el catálogo). */
export function sistemaDe(clave: string) {
  return SISTEMAS.find((s) => s.clave === clave) ?? { clave, nombre: clave || "Sin sistema", corto: clave || "Sin sistema", tipos: [] as readonly string[] };
}

export const ETIQUETA_ESTADO_EQUIPO: Record<EstadoEquipo, string> = {
  operativo: "Operativo",
  con_falla: "Con falla",
  fuera_servicio: "Fuera de servicio",
  retirado: "Retirado",
};

/** Mismos tonos que los estados de documentos (el modo oscuro los ajusta en globals.css). */
export const COLOR_ESTADO_EQUIPO: Record<EstadoEquipo, string> = {
  operativo: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  con_falla: "bg-amber-50 text-amber-800 ring-amber-200",
  fuera_servicio: "bg-rose-50 text-rose-800 ring-rose-200",
  retirado: "bg-slate-100 text-slate-700 ring-slate-200",
};

export const ESTADOS_EQUIPO = Object.keys(ETIQUETA_ESTADO_EQUIPO) as EstadoEquipo[];
