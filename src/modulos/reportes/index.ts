import type { ModuloDocumento } from "@/modulos/contrato";

import { TIPOS_REPORTE, reporteVacio } from "./catalogo";
import { PlantillaReporte } from "./PlantillaReporte";
import type { DatosReporte } from "./tipos";
import { faltantesReporte } from "./validar";

/** Borrador de la descripción en el estilo del formato (redacción asistida). */
function redactarDescripcion(d: DatosReporte): string {
  const tipo = (d.tipoReporte || "técnico").toLowerCase();
  const asunto = d.asunto || "la solicitud del cliente";
  return `Se realiza visita de mantenimiento ${tipo} en las instalaciones de ${d.cliente || "el cliente"} para atender: ${asunto.toLowerCase()}.

Durante el diagnóstico se inspeccionan equipos, conexiones, alimentación eléctrica y estado general de la infraestructura, identificando los puntos que afectan el funcionamiento del sistema.

Como acción ${tipo === "preventivo" ? "preventiva" : "correctiva"}, se ejecutan los ajustes, reemplazos y configuraciones necesarias, dejando registro fotográfico del antes y el después.

Finalmente se realizan pruebas de funcionamiento junto con ${d.personaContactada || "la persona contactada"}, confirmando que el sistema queda operando bajo condiciones normales.`;
}

const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
/** Hora actual redondeada a 5 minutos (sugerencia de llegada o salida). */
const ahoraHHMM = () => {
  const d = new Date();
  return hhmm(Math.round((d.getHours() * 60 + d.getMinutes()) / 5) * 5);
};

/** Módulo FO-GSST-22 · Reporte técnico. */
export const moduloReportes: ModuloDocumento<DatosReporte> = {
  clave: "reporte",
  vacio: (hoy, u) => ({ ...reporteVacio(hoy), nombreTecnico: u.nombre }),
  totalComprobaciones: 10,
  titulo: (d) => d.asunto,
  faltantes: faltantesReporte,
  formato: { codigo: "FO-GSST-22", nombre: "Formato de reporte técnico", version: "01", fecha: "01/03/2020", corto: "Reporte técnico", el: "el", nuevo: "Nuevo", plural: "reportes" },
  prefijo: "RT",
  // Equipos atendidos: se preguntan después del asunto y salen en «Datos generales»
  equipos: { despuesDe: "asunto" },
  Plantilla: PlantillaReporte,
  clienteDe: (d) => d.cliente,
  campoCliente: "cliente",
  visibleCliente: true,
  color: "var(--serie-a)",
  flujo: { aprobar: "Aprobar", firmaAlAprobar: false, cierre: "cliente", campoFirmaCliente: "firmaCliente", cerrar: "Firmar como cliente", eventoCierre: "Firmó como cliente" },
  duplicar: (d, hoy) => ({ ...d, fecha: hoy, firmaTecnico: "", firmaCliente: "" }),
  alElegirProyecto: (p) => ({
    cambio: { proyecto: `${p.codigo} · ${p.nombre}` },
    mensaje: `El reporte queda en el proyecto ${p.codigo} · ${p.nombre}${p.sitio ? ` (${p.sitio})` : ""}.`,
  }),

  alElegirCliente: (c) => ({
    cambio: { cliente: c.nombre, direccion: c.direccion, personaContactada: c.contacto, correo: c.correo, telefono: c.telefono, cargo: c.cargo },
    mensaje: `Encontré a ${c.nombre} en tu directorio. Completé dirección, contacto (${c.contacto}), correo, teléfono y cargo. Puedes ajustarlos con un clic en el formato.`,
  }),

  pasos: ({ datos, clientes, usuarioNombre, hoy }) => [
    { id: "cliente", tipo: "texto", resaltar: "cliente", pregunta: "¿Para qué cliente es el reporte?", sugerencias: clientes.map((c) => c.nombre), ayuda: "Elige uno del directorio para autocompletar sus datos, o escribe uno nuevo." },
    { id: "tipoReporte", tipo: "select", resaltar: "tipoReporte", pregunta: "¿Qué tipo de reporte es?", opciones: [...TIPOS_REPORTE] },
    { id: "fecha", tipo: "fecha", resaltar: "fecha", pregunta: "¿En qué fecha se hizo la visita?", sugerencias: [hoy] },
    {
      id: "horaLlegada",
      tipo: "hora",
      resaltar: "horaLlegada",
      pregunta: "¿A qué hora llegaste al sitio?",
      sugerencias: Array.from(new Set(["08:00", "13:00", ahoraHHMM()])),
      ayuda: "Con la llegada y la salida el tablero calcula el tiempo de cada servicio.",
    },
    {
      id: "horaSalida",
      tipo: "hora",
      resaltar: "horaSalida",
      pregunta: "¿A qué hora terminaste el servicio?",
      sugerencias: datos.horaLlegada ? Array.from(new Set([hhmm(minutos(datos.horaLlegada) + 120), ahoraHHMM()])).filter((h) => h > datos.horaLlegada!) : [ahoraHHMM()],
      validar: (v) => (datos.horaLlegada && v && v <= datos.horaLlegada ? "La hora de salida debe ser posterior a la de llegada." : null),
    },
    {
      id: "personaContactada",
      tipo: "texto",
      resaltar: "personaContactada",
      pregunta: "¿Con quién se atendió la visita?",
      sugerencias: datos.personaContactada ? [datos.personaContactada] : [],
      validar: (v) => (v.trim().length < 3 ? "Escribe el nombre de la persona contactada." : null),
    },
    {
      id: "asunto",
      tipo: "texto",
      resaltar: "asunto",
      pregunta: "¿Cuál es el asunto?",
      sugerencias: ["Mantenimiento preventivo CCTV", "Reparación fibra óptica", "Instalación control de acceso", "Revisión cerca eléctrica"],
      validar: (v) => (v.trim().length < 5 ? "El asunto debe tener al menos 5 caracteres." : null),
    },
    {
      id: "descripcion",
      tipo: "textarea",
      resaltar: "descripcion",
      pregunta: "Describe el trabajo realizado: diagnóstico, acción y resultado.",
      ayuda: "¿Sin tiempo? Usa «Redactar borrador» y ajústalo: el texto queda en el estilo del formato.",
      generar: () => redactarDescripcion(datos),
      validar: (v) => (v.trim().length < 40 ? "La descripción debe tener al menos 40 caracteres para que sea útil al cliente." : null),
    },
    {
      id: "recomendaciones",
      tipo: "textarea",
      resaltar: "recomendaciones",
      opcional: true,
      pregunta: "¿Alguna recomendación para el cliente?",
      sugerencias: ["Programar mantenimiento preventivo trimestral.", "Proteger con tubería los tramos de cable expuestos.", "Instalar UPS para respaldo eléctrico de los equipos."],
    },
    {
      id: "fotos",
      tipo: "fotos",
      resaltar: "fotos",
      pregunta: "¿Agregamos el registro fotográfico? Toma o sube fotos del antes y el después.",
      ayuda: "Salen en una hoja anexa del reporte con el mismo encabezado. En el formato puedes escribir la descripción de cada foto.",
    },
    { id: "nombreTecnico", tipo: "texto", resaltar: "nombreTecnico", pregunta: "Nombre del técnico que firma", sugerencias: [usuarioNombre] },
    { id: "firmaTecnico", tipo: "firma", resaltar: "firmaTecnico", pregunta: "Firma del técnico. Puedes firmar con el dedo desde el celular." },
  ],

  aplicar: (id, valor, datos) => {
    if (id === "fotos") {
      const nuevas = valor as NonNullable<DatosReporte["fotos"]>;
      return {
        cambio: { fotos: [...(datos.fotos ?? []), ...nuevas] },
        mensaje: nuevas.length ? `Agregué ${nuevas.length} foto(s) a la hoja «Registro fotográfico». Escribe la descripción de cada una en el formato.` : undefined,
      };
    }
    return { cambio: { [id]: valor } as Partial<DatosReporte> };
  },
};

export type { DatosReporte } from "./tipos";
