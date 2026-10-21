import type { ModuloDocumento } from "@/modulos/contrato";

import { EPP, EQUIPO_REQUERIDO, MEDIDAS, PELIGROS, PLANTILLAS_ACTIVIDAD, PREGUNTAS_VERIFICACION, permisoVacio } from "./catalogo";
import type { DatosPermiso, Ejecutor, SiNoNa } from "./tipos";
import { faltantesPermiso } from "./validar";

/** Módulo F-GSST-13 · Permiso de trabajo. */
export const moduloPermisos: ModuloDocumento<DatosPermiso> = {
  clave: "permiso",
  vacio: (hoy, u) => ({ ...permisoVacio(hoy), responsable: u.nombre, encargado: u.nombre }),
  totalComprobaciones: 16,
  titulo: (d) => d.actividades,
  faltantes: faltantesPermiso,

  alElegirCliente: (c) => ({
    cambio: { cliente: c.nombre, sitioTrabajo: c.sitio },
    mensaje: `Cliente ${c.nombre} seleccionado. Sitio de trabajo sugerido: ${c.sitio}.`,
  }),

  pasos: ({ datos: d, clientes }) => [
    { id: "cliente", tipo: "texto", resaltar: "cliente", pregunta: "¿Para qué cliente es el permiso de trabajo?", sugerencias: clientes.map((c) => c.nombre) },
    { id: "sitioTrabajo", tipo: "texto", resaltar: "sitioTrabajo", pregunta: "¿Cuál es el sitio de trabajo?", sugerencias: d.sitioTrabajo ? [d.sitioTrabajo] : [] },
    { id: "hora", tipo: "hora", resaltar: "hora", pregunta: "¿A qué hora se emite el permiso?", sugerencias: ["07:00", "07:30", "08:00", "13:00"], ayuda: `Fecha de emisión: ${d.fechaEmision}. Puedes cambiarla en el formato.` },
    {
      id: "puestoProyecto",
      tipo: "select",
      resaltar: "puestoProyecto",
      pregunta: "¿Qué tipo de trabajo se va a realizar?",
      ayuda: "Al elegir la actividad, precargo los peligros, medidas y EPP típicos. Luego los ajustas.",
      opciones: [...Object.keys(PLANTILLAS_ACTIVIDAD), "Otro"],
    },
    { id: "actividades", tipo: "texto", resaltar: "actividades", pregunta: "Describe brevemente las actividades a realizar", sugerencias: d.puestoProyecto ? [`${d.puestoProyecto} en ${d.sitioTrabajo || "sitio"}`] : [] },
    { id: "equipo", tipo: "multi", resaltar: "equipo", pregunta: "Equipo requerido", opciones: [...EQUIPO_REQUERIDO], inicial: () => d.equipo },
    { id: "peligros", tipo: "multi", resaltar: "peligros", pregunta: "Peligros identificados", opciones: [...PELIGROS], inicial: () => d.peligros },
    { id: "medidas", tipo: "multi", resaltar: "medidas", pregunta: "Medidas de seguridad requeridas", opciones: [...MEDIDAS], inicial: () => d.medidas },
    { id: "epp", tipo: "multi", resaltar: "epp", pregunta: "Verificación de elementos de protección personal", opciones: [...EPP], inicial: () => d.epp },
    {
      id: "verificacion",
      tipo: "verificacion",
      resaltar: "verificacion",
      pregunta: "Verificación de condiciones de trabajo. Responde cada punto.",
      ayuda: "Si algún punto queda en NO, el sistema no deja enviar el permiso: así lo exige el SG-SST.",
      opciones: [...PREGUNTAS_VERIFICACION],
      inicial: () => d.verificacion,
    },
    { id: "ejecutores", tipo: "ejecutores", resaltar: "ejecutores", pregunta: "¿Quiénes conforman el grupo ejecutor?" },
    { id: "firmaEncargado", tipo: "firma", resaltar: "autorizacion", pregunta: "Firma de la persona encargada de ejecutar el trabajo." },
  ],

  aplicar: (id, v) => {
    if (id === "puestoProyecto") {
      const t = PLANTILLAS_ACTIVIDAD[v as string];
      if (t) {
        return {
          cambio: { puestoProyecto: v as string, equipo: t.equipo, peligros: t.peligros, medidas: t.medidas, epp: t.epp },
          mensaje: `Precargué ${t.peligros.length} peligros, ${t.medidas.length} medidas y ${t.epp.length} EPP para «${v}». Revísalos en los siguientes pasos.`,
        };
      }
      return { cambio: { puestoProyecto: "" }, mensaje: "Escribe el puesto o proyecto directamente en el formato (clic sobre el campo)." };
    }
    if (id === "hora") {
      const [h, mm] = (v as string).split(":").map(Number);
      if (Number.isNaN(h)) return { cambio: {} };
      return { cambio: { hora: `${String(h % 12 || 12).padStart(2, "0")}:${String(mm || 0).padStart(2, "0")}`, ampm: h >= 12 ? "PM" : "AM" } };
    }
    if (id === "verificacion") {
      const vals = v as SiNoNa[];
      return {
        cambio: { verificacion: vals },
        mensaje: vals.includes("NO") ? "⚠️ Hay puntos en NO. Corrige la condición antes de iniciar: el permiso no podrá enviarse así." : undefined,
      };
    }
    if (id === "ejecutores") {
      return { cambio: { ejecutores: v as Ejecutor[] }, mensaje: "Agregué el grupo ejecutor al formato. Cada persona puede firmar en su fila." };
    }
    return { cambio: { [id]: v } as Partial<DatosPermiso> };
  },
};

export type { DatosPermiso, Ejecutor, SiNoNa } from "./tipos";
