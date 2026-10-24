/**
 * Catálogos del permiso de trabajo (F-GSST-13): opciones del formato en el
 * orden en que se imprimen, atajos por actividad y contenido inicial. Los textos
 * son también los valores guardados y los que revisa `validar.ts`: no cambiarlos
 * sin migrar los datos.
 */

import type { DatosPermiso } from "./tipos";

/** Opciones de «Equipo requerido» («Maquinaria» y «Equipo menor» piden cuál). */
export const EQUIPO_REQUERIDO = [
  "Herramienta menor",
  "Escaleras portátiles",
  "Escaleras metálicas",
  "Escaleras de madera",
  "Andamios tubulares",
  "Andamios móviles",
  "Barandas",
  "Plataformas colgantes",
  "Andamios ajustables suspensión ajustable",
  "Andamios ajustables suspensión múltiple",
  "Maquinaria",
  "Equipo menor",
] as const;

/** Opciones de «Peligros identificados». */
export const PELIGROS = [
  "Ruido",
  "Vibraciones",
  "Iluminación",
  "Calor",
  "Frío",
  "Radiación infrarroja",
  "Radiación ultravioleta",
  "Radiación visible",
  "Microondas y radio frecuencia",
  "Carga dinámica",
  "Caída de objetos a nivel",
  "Caída de objetos desde altura",
  "Caídas a nivel",
  "Caídas desde altura (1,5 m)",
  "Impactos de objetos en movimiento",
  "Cortes objetos en movimiento",
  "Riesgo biológico",
  "Colapso estructura, equipo o maquinaria",
  "Riesgo psicolaboral",
  "Riesgo químico",
  "Riesgo locativo",
  "Riesgo eléctrico",
  "Incendio o explosión",
  "Seguridad física",
] as const;

/** Opciones de «Medidas de seguridad requeridas». */
export const MEDIDAS = [
  "Delimitación del área",
  "Señalización del área",
  "Lista verificación alturas",
  "Entibado",
  "Presencia inspector de seguridad",
  "Lista verificación eléctrico",
  "Ventilación / apoyo oxígeno",
  "Plan de emergencia vigente",
  "Lista verificación excavaciones/confinado",
] as const;

/** Opciones de «Verificación elementos de protección». */
export const EPP = [
  "Casco",
  "Casco con barbuquejo",
  "Botas de seguridad",
  "Gafas de seguridad",
  "Respirador polvos/humos",
  "Respirador gases/vapores",
  "Protección auditiva inserción",
  "Protección auditiva copa",
  "Guantes de carnaza",
  "Guantes de hilaza",
  "Guantes otra especificación",
  "Arnés cuerpo completo",
  "Protección contra caídas",
  "Sistemas fijos de anclaje, puntos amarre",
  "Líneas de conexión, cuerdas",
] as const;

/** Preguntas de «Verificación de condiciones de trabajo»; un «NO» impide enviar el permiso. */
export const PREGUNTAS_VERIFICACION = [
  "¿Todos los trabajadores cuentan con afiliación vigente al sistema de riesgos profesionales y se cuenta con los soportes?",
  "¿El sitio donde se realizará el trabajo está aislado completamente y es adecuado?",
  "¿Se cuenta con elementos de atención de emergencias?",
  "¿El (los) ejecutante(s) han elaborado el ATS, recibido instrucciones para ejecutar la tarea y fueron instruidos previamente sobre los riesgos potenciales de la actividad?",
  "¿Ninguno de los trabajadores se encuentra en estado de embriaguez, bajo efecto de drogas o con indicios de fatiga o enfermedad incapacitante?",
  "¿Cada trabajador cuenta con los elementos de protección personal requeridos apropiados para realizar el trabajo?",
] as const;

/** Atajos por tipo de actividad: preseleccionan peligros, medidas y EPP. */
export const PLANTILLAS_ACTIVIDAD: Record<string, { peligros: string[]; medidas: string[]; epp: string[]; equipo: string[] }> = {
  "Trabajo en alturas": {
    equipo: ["Herramienta menor", "Escaleras portátiles"],
    peligros: ["Caídas desde altura (1,5 m)", "Caída de objetos desde altura", "Riesgo locativo", "Radiación ultravioleta"],
    medidas: ["Delimitación del área", "Señalización del área", "Lista verificación alturas", "Plan de emergencia vigente"],
    epp: ["Casco con barbuquejo", "Botas de seguridad", "Gafas de seguridad", "Arnés cuerpo completo", "Protección contra caídas", "Líneas de conexión, cuerdas"],
  },
  "Trabajo eléctrico": {
    equipo: ["Herramienta menor", "Equipo menor"],
    peligros: ["Riesgo eléctrico", "Incendio o explosión", "Cortes objetos en movimiento"],
    medidas: ["Delimitación del área", "Señalización del área", "Lista verificación eléctrico", "Plan de emergencia vigente"],
    epp: ["Casco", "Botas de seguridad", "Gafas de seguridad", "Guantes otra especificación"],
  },
  "Mantenimiento CCTV": {
    equipo: ["Herramienta menor", "Escaleras portátiles", "Equipo menor"],
    peligros: ["Ruido", "Vibraciones", "Iluminación", "Calor", "Caídas a nivel", "Caídas desde altura (1,5 m)", "Riesgo eléctrico", "Riesgo locativo", "Seguridad física"],
    medidas: ["Delimitación del área", "Señalización del área", "Lista verificación alturas", "Presencia inspector de seguridad", "Plan de emergencia vigente"],
    epp: ["Casco", "Botas de seguridad", "Gafas de seguridad", "Respirador polvos/humos", "Protección auditiva inserción", "Guantes de carnaza", "Arnés cuerpo completo", "Protección contra caídas"],
  },
  "Cableado estructurado": {
    equipo: ["Herramienta menor", "Escaleras portátiles"],
    peligros: ["Caídas a nivel", "Cortes objetos en movimiento", "Riesgo locativo", "Riesgo eléctrico"],
    medidas: ["Delimitación del área", "Señalización del área"],
    epp: ["Casco", "Botas de seguridad", "Gafas de seguridad", "Guantes de hilaza"],
  },
};

/** Permiso en blanco con la fecha de emisión dada y una verificación sin responder por pregunta. */
export function permisoVacio(fecha: string): DatosPermiso {
  return {
    fechaEmision: fecha,
    hora: "",
    ampm: "AM",
    cliente: "",
    sitioTrabajo: "",
    puestoProyecto: "",
    responsable: "",
    actividades: "",
    equipo: [],
    maquinariaCual: "",
    equipoMenorCual: "",
    equipoOtros: "",
    peligros: [],
    peligrosOtros: "",
    medidas: [],
    medidasOtras: "",
    epp: [],
    eppOtro: "",
    verificacion: PREGUNTAS_VERIFICACION.map(() => ""),
    ejecutores: [],
    autoriza: "",
    firmaAutoriza: "",
    encargado: "",
    firmaEncargado: "",
    cierreAreaLimpia: "",
    cierraNombre: "",
    firmaCierre: "",
  };
}
