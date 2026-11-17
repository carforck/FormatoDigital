/**
 * Módulo de documento Acta de entrega (prefijo ACT): «Programación y acta de entrega del sistema
 * de seguridad electrónica», FORMA 7PA/F1-13. Formato PROPIO de Fortox (no hay versión SOTEC):
 * SOTEC lo diligencia cuando entrega a un abonado de Fortox el sistema que instaló. La variante
 * «fortox» lo declara `propio` (@/nucleo/variantes), así que siempre sale con la hoja de Fortox,
 * el menú lo nombra «Acta de entrega (Fortox)» y el generador avisa si el cliente no es de Fortox.
 *
 * Flujo: el técnico lo diligencia con el asistente, el cliente firma el recibido en sitio (nombre
 * y C.C.), se envía a revisión, la coordinación o la administración lo aprueba y lo marca como
 * entregado a Fortox (el «VII. Control interno» lo firma Fortox en papel). El cliente lo ve en su
 * portal cuando está aprobado, con las claves enmascaradas.
 * Claves del panel = datos sensibles: ver ./claves.ts.
 */

import { createElement } from "react";

import type { ModuloDocumento } from "@/modulos/contrato";

import {
  DIAS_ACTA,
  FORMATO_ACTA,
  INTERVALOS_TEST,
  MEDIOS_COMUNICACION,
  PANELES,
  PREFIJO_ACTA,
  SISTEMAS_ACTA,
  TEMAS_CAPACITACION,
  actaVacia,
  idActa,
  leerMateriales,
  leerParticiones,
  leerUsuarios,
  leerZonas,
  lineaMaterial,
  lineaUsuario,
  lineaZona,
  lineasParticiones,
} from "./catalogo";
import { conClavesOcultas, sinClaves } from "./claves";
import { HojaActaFortox } from "./HojaActaFortox";
import { PasoClavesPanel, PasoClavesUsuarios } from "./PasosClaves";
import type { DatosActa, DiaActa, SistemaActa } from "./tipos";
import { COMPROBACIONES_ACTA, faltantesActa } from "./validar";

/** Ciudad al final de la dirección del directorio («Zona Industrial, Cartagena» → «Cartagena»). */
export function ciudadDeDireccion(direccion: string): string {
  const partes = (direccion || "").split(",").map((s) => s.trim()).filter(Boolean);
  return partes.length > 1 ? partes[partes.length - 1] : "";
}

/** Sugerencias sin vacíos ni repetidos. */
const sug = (...xs: (string | undefined)[]) => xs.filter((x, i, a): x is string => Boolean(x?.trim()) && a.indexOf(x) === i);

/** Módulo Acta de entrega (Fortox). */
export const moduloActas: ModuloDocumento<DatosActa> = {
  clave: "acta",
  vacio: (hoy, u) => ({ ...actaVacia(hoy), tecnico: u.nombre }),
  totalComprobaciones: COMPROBACIONES_ACTA,
  // Listados y búsqueda: nunca con claves
  titulo: (d) => `${d.cliente || "Cliente"} · ${d.sistemas.length ? d.sistemas.join(", ") : "Sistema de seguridad electrónica"}`,
  faltantes: faltantesActa,
  formato: FORMATO_ACTA,
  prefijo: PREFIJO_ACTA,
  Plantilla: HojaActaFortox,
  clienteDe: (d) => d.cliente,
  campoCliente: "cliente",
  campoNit: "nit",
  // El cliente escrito a mano queda en el directorio al guardar, con sus datos de contacto
  datosCliente: (d) => ({ nombre: d.cliente, nit: d.nit, direccion: d.direccion, telefono: d.telefono, correo: d.correo, contacto: d.contacto, cargo: d.cargo }),
  // El abonado lo ve en su portal ya aprobado (claves enmascaradas)
  visibleCliente: true,
  color: "var(--serie-g)",
  sensibles: { quitar: sinClaves, ocultar: conClavesOcultas },
  etiquetasEstado: { aprobado: "Aprobada", rechazado: "Rechazada", cerrado: "Entregada a Fortox" },
  flujo: {
    aprobar: "Aprobar acta",
    firmaAlAprobar: false,
    cierre: "revisor",
    cerrar: "Marcar como entregada a Fortox",
    eventoCierre: "Entregó el acta a Fortox",
  },
  // La copia no lleva claves ni firmas (una adición al mismo sistema se vuelve a programar)
  duplicar: (d, hoy) => {
    const c = sinClaves(d);
    return {
      ...c,
      fecha: hoy,
      materiales: c.materiales.map((m) => ({ ...m, id: idActa("mt") })),
      usuarios: c.usuarios.map((u) => ({ ...u, id: idActa("us") })),
      firmaCliente: "",
      nombreFirmaCliente: "",
      cedulaFirmaCliente: "",
    };
  },
  alElegirCliente: (c) => ({
    cambio: { cliente: c.nombre, nit: c.nit ?? "", direccion: c.direccion, ciudadCliente: ciudadDeDireccion(c.direccion), telefono: c.telefono, correo: c.correo, contacto: c.contacto, cargo: c.cargo },
    mensaje: `Cliente ${c.nombre}: llené NIT, dirección, teléfono, correo y contacto del directorio.`,
  }),
  alElegirProyecto: (p) => ({ cambio: { proyecto: `${p.codigo} · ${p.nombre}` }, mensaje: `El acta queda en el proyecto ${p.codigo}.` }),

  pasos: ({ datos, clientes, usuarioNombre, hoy }) => [
    { id: "cliente", tipo: "texto", resaltar: "cliente", pregunta: "¿A qué cliente (abonado) se le entrega el sistema?", sugerencias: clientes.map((c) => c.nombre) },
    { id: "tipoActa", tipo: "select", resaltar: "tipoActa", agregar: false, pregunta: "¿Es un cliente nuevo o una adición a un sistema existente?", opciones: ["Cliente Nuevo", "Adición"] },
    { id: "ciudad", tipo: "texto", resaltar: "ciudad", pregunta: "¿En qué ciudad se entrega?", sugerencias: sug(datos.ciudad, datos.ciudadCliente, "Cartagena") },
    { id: "fecha", tipo: "fecha", resaltar: "fecha", pregunta: "¿Fecha de la entrega?", sugerencias: [hoy] },
    { id: "abonado", tipo: "texto", resaltar: "abonado", opcional: true, pregunta: "¿Número de abonado?", ayuda: "Lo asigna Monitoreo de Fortox; si no lo tienes, omítelo." },
    { id: "an8", tipo: "texto", resaltar: "an8", opcional: true, pregunta: "¿Código AN8 del cliente?", ayuda: "Código del cliente en el sistema de Fortox (opcional)." },
    { id: "direccion", tipo: "texto", resaltar: "direccion", pregunta: "¿Dirección donde queda instalado el sistema?", sugerencias: sug(datos.direccion) },
    { id: "barrio", tipo: "texto", resaltar: "barrio", opcional: true, pregunta: "¿Barrio?" },
    { id: "telefono", tipo: "tel", resaltar: "telefono", opcional: true, pregunta: "¿Teléfono del cliente?", sugerencias: sug(datos.telefono) },
    { id: "correo", tipo: "email", resaltar: "correo", opcional: true, pregunta: "¿Correo electrónico del cliente?", sugerencias: sug(datos.correo) },
    { id: "contacto", tipo: "texto", resaltar: "contacto", opcional: true, pregunta: "¿Persona de contacto?", sugerencias: sug(datos.contacto) },
    { id: "cargo", tipo: "texto", resaltar: "cargo", opcional: true, pregunta: "¿Cargo del contacto?", sugerencias: sug(datos.cargo) },
    { id: "panel", tipo: "texto", resaltar: "panel", opcional: true, pregunta: "¿Marca y referencia del panel de alarma?", sugerencias: sug(datos.panel, ...PANELES) },
    { id: "comunicacionPrimaria", tipo: "texto", resaltar: "comunicacionPrimaria", opcional: true, pregunta: "¿Medio de comunicación primario?", sugerencias: sug(datos.comunicacionPrimaria, ...MEDIOS_COMUNICACION) },
    { id: "simCard", tipo: "texto", resaltar: "simCard", opcional: true, pregunta: "¿Número de la Sim Card?", sugerencias: sug(datos.simCard) },
    { id: "comunicacionSecundaria", tipo: "texto", resaltar: "comunicacionSecundaria", opcional: true, pregunta: "¿Medio de comunicación secundario?", sugerencias: sug(datos.comunicacionSecundaria, ...MEDIOS_COMUNICACION) },
    { id: "intervaloTest", tipo: "texto", resaltar: "intervaloTest", opcional: true, pregunta: "¿Intervalo de test?", sugerencias: sug(datos.intervaloTest, ...INTERVALOS_TEST) },
    {
      id: "claves",
      tipo: "componente",
      resaltar: "claves",
      opcional: true,
      pregunta: "Clave maestra y clave de instalador del panel.",
      render: (avanzar) => createElement(PasoClavesPanel, { maestra: datos.claveMaestra, instalador: datos.claveInstalador, avanzar }),
    },
    {
      id: "materiales",
      tipo: "textarea",
      resaltar: "materiales",
      opcional: true,
      pregunta: "Materiales: uno por línea, «Descripción | despacho | instalado | reintegro».",
      ayuda: "Ejemplo: Sensor de movimiento PIR | 4 | 4 | 0\nEl formato trae 12 renglones. «Redactar borrador» carga los actuales.",
      generar: () => datos.materiales.map(lineaMaterial).join("\n"),
      validar: (v) => {
        const r = leerMateriales(v, datos.materiales);
        return r.errores.length ? r.errores.slice(0, 3).join(" ") : null;
      },
    },
    { id: "sistemas", tipo: "multi", resaltar: "sistemas", agregar: false, pregunta: "Tipo de sistema: márcalos.", opciones: [...SISTEMAS_ACTA], inicial: () => [...datos.sistemas] },
    {
      id: "particiones",
      tipo: "textarea",
      resaltar: "particiones",
      opcional: true,
      pregunta: "Particiones: «número | nombre», una por línea (hasta 8).",
      ayuda: "Ejemplo: 1 | Oficinas\n2 | Bodega",
      generar: () => lineasParticiones(datos.particiones),
      validar: (v) => {
        const r = leerParticiones(v);
        return r.errores.length ? r.errores.slice(0, 3).join(" ") : null;
      },
    },
    {
      id: "zonas",
      tipo: "textarea",
      resaltar: "zonas",
      opcional: true,
      pregunta: "Zonas: una por línea, «# zona | cantidad | descripción | partición».",
      ayuda: "Ejemplo: 1 | 2 | Puerta principal | 1\nZonas de 1 a 36, como el formato.",
      generar: () => datos.zonas.map(lineaZona).join("\n"),
      validar: (v) => {
        const r = leerZonas(v);
        return r.errores.length ? r.errores.slice(0, 3).join(" ") : null;
      },
    },
    { id: "registro", tipo: "select", resaltar: "registro", opcional: true, agregar: false, pregunta: "Registro de usuarios: ¿unidad nueva o actualización de datos?", opciones: ["Unidad nueva", "Actualización de datos"] },
    {
      id: "usuarios",
      tipo: "textarea",
      resaltar: "usuarios",
      opcional: true,
      pregunta: "Personal responsable (usuarios con clave), en orden de prioridad: «Nombre | Cargo | Usuario | Teléfono residencia | Celular».",
      ayuda: "Ejemplo: Ana Gómez | Administradora | 01 | 6051234 | 3001234567\nLa clave telefónica se pide en el paso siguiente (oculta).",
      generar: () => datos.usuarios.map(lineaUsuario).join("\n"),
      validar: (v) => {
        const r = leerUsuarios(v, datos.usuarios);
        return r.errores.length ? r.errores.slice(0, 3).join(" ") : null;
      },
    },
    {
      id: "clavesUsuarios",
      tipo: "componente",
      resaltar: "clavesUsuarios",
      opcional: true,
      pregunta: "Clave telefónica de cada usuario.",
      render: (avanzar) => createElement(PasoClavesUsuarios, { key: datos.usuarios.map((u) => u.id).join(","), usuarios: datos.usuarios, avanzar }),
    },
    { id: "apertura", tipo: "multi", resaltar: "horarios", agregar: false, opcional: true, pregunta: "Horarios: ¿qué días se hace APERTURA del sistema?", opciones: [...DIAS_ACTA], inicial: () => [...datos.apertura] },
    { id: "cierre", tipo: "multi", resaltar: "horarios", agregar: false, opcional: true, pregunta: "¿Y qué días se hace CIERRE?", opciones: [...DIAS_ACTA], inicial: () => [...datos.cierre] },
    { id: "capacitacion", tipo: "multi", resaltar: "capacitacion", agregar: false, opcional: true, pregunta: "¿Qué temas incluyó la capacitación?", opciones: [...TEMAS_CAPACITACION], inicial: () => datos.capacitacion.filter((t) => (TEMAS_CAPACITACION as readonly string[]).includes(t)) },
    { id: "capacitacionOtro", tipo: "texto", resaltar: "capacitacion", opcional: true, pregunta: "¿Otro tema de capacitación? ¿Cuál?" },
    { id: "observaciones", tipo: "textarea", resaltar: "observaciones", opcional: true, pregunta: "Protocolos u observaciones del cliente.", sugerencias: ["Llamar primero al contacto antes de enviar la reacción.", "El cliente solicita verificación por video antes de despachar."] },
    {
      id: "firmaCliente",
      tipo: "firma",
      resaltar: "firmaCliente",
      pregunta: "Firma del cliente: recibe a satisfacción el sistema, la información y el entrenamiento.",
      firmante: { nombre: datos.nombreFirmaCliente || datos.contacto, cargo: datos.cedulaFirmaCliente, etiquetaCargo: "C.C." },
      firmar: "El cliente firma ahora",
      omitir: "El cliente firma después",
    },
    { id: "tecnico", tipo: "texto", resaltar: "tecnico", pregunta: "Nombre del técnico que entrega.", sugerencias: sug(datos.tecnico, usuarioNombre) },
  ],

  aplicar: (id, v, datos) => {
    const lista = (x: typeof v) => (Array.isArray(x) ? (x as string[]) : []);
    if (id === "claves") {
      const [claveMaestra = "", claveInstalador = ""] = lista(v);
      // Nunca se repiten en el chat
      return { cambio: { claveMaestra, claveInstalador } };
    }
    if (id === "clavesUsuarios") {
      const claves = lista(v);
      return { cambio: { usuarios: datos.usuarios.map((u, k) => ({ ...u, claveTelefonica: claves[k] ?? u.claveTelefonica })) } };
    }
    if (id === "firmaCliente") {
      if (Array.isArray(v)) return { cambio: { nombreFirmaCliente: String(v[0] ?? ""), cedulaFirmaCliente: String(v[1] ?? "").replace(/[^\d.]/g, "") } };
      return { cambio: {} };
    }
    if (id === "materiales") {
      if (!String(v).trim()) return { cambio: {}, mensaje: datos.materiales.length ? `Conservo los ${datos.materiales.length} material(es).` : undefined };
      const r = leerMateriales(String(v), datos.materiales);
      return r.errores.length ? { cambio: {}, mensaje: `⚠️ ${r.errores.join(" ")}` } : { cambio: { materiales: r.materiales }, mensaje: `${r.materiales.length} material(es) en la tabla.` };
    }
    if (id === "particiones") {
      if (!String(v).trim()) return { cambio: {} };
      const r = leerParticiones(String(v));
      return r.errores.length ? { cambio: {}, mensaje: `⚠️ ${r.errores.join(" ")}` } : { cambio: { particiones: r.particiones }, mensaje: `${r.particiones.filter(Boolean).length} partición(es).` };
    }
    if (id === "zonas") {
      if (!String(v).trim()) return { cambio: {}, mensaje: datos.zonas.length ? `Conservo las ${datos.zonas.length} zona(s).` : undefined };
      const r = leerZonas(String(v));
      return r.errores.length ? { cambio: {}, mensaje: `⚠️ ${r.errores.join(" ")}` } : { cambio: { zonas: r.zonas }, mensaje: `${r.zonas.length} zona(s) en la tabla.` };
    }
    if (id === "usuarios") {
      if (!String(v).trim()) return { cambio: {}, mensaje: datos.usuarios.length ? `Conservo los ${datos.usuarios.length} usuario(s).` : undefined };
      const r = leerUsuarios(String(v), datos.usuarios);
      return r.errores.length ? { cambio: {}, mensaje: `⚠️ ${r.errores.join(" ")}` } : { cambio: { usuarios: r.usuarios }, mensaje: `${r.usuarios.length} usuario(s) en el registro.` };
    }
    if (id === "sistemas") return { cambio: { sistemas: lista(v).filter((s): s is SistemaActa => (SISTEMAS_ACTA as string[]).includes(s)) } };
    if (id === "apertura" || id === "cierre") return { cambio: { [id]: lista(v).filter((d): d is DiaActa => (DIAS_ACTA as string[]).includes(d)) } as Partial<DatosActa> };
    if (id === "capacitacion") return { cambio: { capacitacion: lista(v) } };
    if (id === "tipoActa" || id === "registro") return { cambio: { [id]: String(v) } as Partial<DatosActa> };
    return { cambio: { [id]: typeof v === "string" ? v : "" } as Partial<DatosActa> };
  },
};

export type { DatosActa } from "./tipos";
