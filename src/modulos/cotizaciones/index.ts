/**
 * Módulo de documento Cotización (prefijo COT): comercial, solo la
 * administración (`requiere: "cotizar"`). La aprueba y la envía al cliente en un
 * solo paso, sin revisor aparte; el cliente la acepta firmando. Reexporta lo que
 * usan otras pantallas (plantilla, cálculos y catálogo).
 */

import type { ModuloDocumento } from "@/modulos/contrato";
import { cop, pesosEnLetras } from "@/nucleo/letras";

import { diasEntre, sumarDias, totalesCotizacion } from "./calculos";
import {
  CATALOGO_SERVICIOS,
  DIAS_VALIDEZ,
  FORMATO_COTIZACION,
  PREFIJO_COTIZACION,
  SUGERENCIAS_FORMA_PAGO,
  SUGERENCIAS_GARANTIA,
  SUGERENCIAS_TIEMPO_ENTREGA,
  cotizacionVacia,
  etiquetaServicio,
  idItem,
  itemDeCatalogo,
  leerItems,
  lineaDeItem,
} from "./catalogo";
import { PlantillaCotizacion } from "./PlantillaCotizacion";
import type { DatosCotizacion } from "./tipos";
import { COMPROBACIONES_COTIZACION, faltantesCotizacion } from "./validar";

// Fecha local AAAA-MM-DD (la de aceptación es la del dispositivo que firma, no UTC)
const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Resumen que el asistente muestra en el chat al cambiar los ítems
const resumenTotal = (d: Pick<DatosCotizacion, "items">) => {
  const { subtotal, iva, total } = totalesCotizacion(d);
  return `Subtotal ${cop(subtotal)} + IVA ${cop(iva)} = ${cop(total)} (${pesosEnLetras(total).toLowerCase()}).`;
};

/**
 * Módulo de cotizaciones (réplica de la cotización de Odoo de SOTEC).
 * La ve el cliente: aprobada = enviada; el cliente la acepta firmando → cerrada.
 */
export const moduloCotizaciones: ModuloDocumento<DatosCotizacion> = {
  clave: "cotizacion",
  formato: FORMATO_COTIZACION,
  prefijo: PREFIJO_COTIZACION,
  Plantilla: PlantillaCotizacion,
  visibleCliente: true,
  // Comercial: solo la administración la crea, la ve y la aprueba (el técnico y SST no)
  requiere: "cotizar",
  clienteDe: (d) => d.cliente,
  campoCliente: "cliente",
  valor: (d) => totalesCotizacion(d).total,
  // Aprobada = enviada al cliente; aceptada = el cliente firmó
  etiquetasEstado: { aprobado: "Aprobada", cerrado: "Aceptada" },

  vacio: (hoy, u) => ({ ...cotizacionVacia(hoy), vendedor: u.nombre }),
  totalComprobaciones: COMPROBACIONES_COTIZACION,
  titulo: (d) => `${d.asunto || "Cotización"} · ${cop(totalesCotizacion(d).total)}`,
  faltantes: faltantesCotizacion,

  alElegirCliente: (c) => ({
    cambio: { cliente: c.nombre, clienteNit: c.nit ?? "", contacto: c.contacto, correo: c.correo, telefono: c.telefono, direccion: c.direccion, aceptaNombre: c.contacto, aceptaCargo: c.cargo },
    mensaje: `Cliente ${c.nombre}: completé ${c.nit ? "NIT, " : ""}contacto (${c.contacto}), correo, teléfono y dirección.`,
  }),

  alElegirProyecto: (p) => ({
    cambio: { asunto: p.sitio ? `${p.nombre} · ${p.sitio}` : p.nombre },
    mensaje: `Asunto tomado del proyecto ${p.codigo}.`,
  }),

  pasos: ({ datos, clientes, hoy, serviciosPropios }) => [
    { id: "cliente", tipo: "texto", resaltar: "cliente", pregunta: "¿Para qué cliente es la cotización?", sugerencias: clientes.map((c) => c.nombre), ayuda: "Elige uno del directorio para autocompletar contacto, correo y dirección." },
    {
      id: "asunto",
      tipo: "texto",
      resaltar: "asunto",
      pregunta: "¿Qué se cotiza? Escribe el asunto o proyecto.",
      sugerencias: [datos.asunto, "Mantenimiento preventivo del sistema CCTV", "Instalación de cámaras IP", "Control de acceso en portería"].filter(Boolean),
      validar: (v) => (v.trim().length < 5 ? "El asunto debe tener al menos 5 caracteres." : null),
    },
    {
      id: "servicios",
      tipo: "multi",
      resaltar: "items",
      pregunta: "Elige los servicios del catálogo (precios de referencia sin IVA).",
      ayuda: "En el siguiente paso ajustas cantidades y precios. Si no aplica ninguno, continúa con 0.",
      ayudaAgregar: "¿No está en el catálogo? Agrega el servicio o producto con su precio y queda disponible para todo el equipo.",
      agregar: "servicio",
      opciones: [...CATALOGO_SERVICIOS, ...(serviciosPropios ?? [])].map(etiquetaServicio),
      inicial: () => [...CATALOGO_SERVICIOS, ...(serviciosPropios ?? [])].filter((s) => datos.items.some((i) => i.descripcion === s.descripcion)).map(etiquetaServicio),
    },
    {
      id: "items",
      tipo: "textarea",
      resaltar: "items",
      // Si ya hay ítems (del catálogo), se puede omitir y ajustarlos en el formato
      opcional: datos.items.length > 0,
      pregunta: "Revisa los ítems: uno por línea, «cantidad unidad x descripción | detalle @ precio».",
      ayuda: "Ejemplo: 32 puntos x Mantenimiento preventivo punto CCTV | Hasta 3 m de altura @ 30.000\nUsa «Redactar borrador» para cargar los ítems actuales y cambiar cantidades o precios. Para otro IVA agrega [5%] o [0%] al final.",
      generar: () => datos.items.map(lineaDeItem).join("\n"),
      validar: (v) => {
        const r = leerItems(v, datos.items);
        return r.errores.length ? r.errores.slice(0, 3).join(" ") : null;
      },
    },
    { id: "vencimiento", tipo: "fecha", resaltar: "vencimiento", pregunta: "¿Hasta qué fecha es válida la oferta?", sugerencias: [sumarDias(datos.fecha || hoy, DIAS_VALIDEZ), sumarDias(datos.fecha || hoy, 15)], validar: (v) => (diasEntre(datos.fecha || hoy, v) >= 0 ? null : "El vencimiento no puede ser anterior a la fecha de cotización.") },
    { id: "formaPago", tipo: "texto", resaltar: "formaPago", pregunta: "¿Forma de pago?", sugerencias: SUGERENCIAS_FORMA_PAGO },
    { id: "tiempoEntrega", tipo: "texto", resaltar: "tiempoEntrega", pregunta: "¿Tiempo de entrega o ejecución?", sugerencias: SUGERENCIAS_TIEMPO_ENTREGA },
    { id: "garantia", tipo: "texto", resaltar: "garantia", opcional: true, pregunta: "¿Garantía?", sugerencias: SUGERENCIAS_GARANTIA },
    { id: "observaciones", tipo: "textarea", resaltar: "observaciones", opcional: true, pregunta: "¿Observaciones para el cliente?", sugerencias: ["No incluye obras civiles ni resanes.", "Trabajos en horario diurno; en horario nocturno se cotiza aparte."] },
    { id: "confirmar", tipo: "select", resaltar: "total", pregunta: "¿Revisamos el total?", opciones: ["Ver resumen"], agregar: false },
  ],

  aplicar: (id, v, datos, extras) => {
    if (id === "servicios") {
      const elegidos = [...CATALOGO_SERVICIOS, ...(extras?.serviciosPropios ?? [])].filter((s) => (v as string[]).includes(etiquetaServicio(s)));
      const nuevos = elegidos.filter((s) => !datos.items.some((i) => i.descripcion === s.descripcion)).map((s) => itemDeCatalogo(s));
      const items = [...datos.items, ...nuevos];
      return { cambio: { items }, mensaje: nuevos.length ? `Agregué ${nuevos.length} ítem(s) con cantidad 1. ${resumenTotal({ items })}` : undefined };
    }
    if (id === "items") {
      if (!String(v).trim()) return { cambio: {}, mensaje: datos.items.length ? `Conservo los ${datos.items.length} ítem(s). ${resumenTotal(datos)}` : undefined };
      const { items, errores } = leerItems(v as string, datos.items);
      if (errores.length) return { cambio: {}, mensaje: `⚠️ ${errores.join(" ")}` };
      return { cambio: { items }, mensaje: `${items.length} ítem(s). ${resumenTotal({ items })}` };
    }
    if (id === "confirmar") {
      const f = faltantesCotizacion(datos);
      return { cambio: {}, mensaje: `${resumenTotal(datos)}${f.length ? ` Falta: ${f.join(", ")}.` : " Lista: al aprobarla y enviarla queda en el portal del cliente, que la acepta firmando."}` };
    }
    return { cambio: { [id]: v } as Partial<DatosCotizacion> };
  },

  // La administración es quien cotiza y quien aprueba: un solo paso, sin revisor aparte
  // (borrador → aprobada = enviada al cliente). Ver docs/ARQUITECTURA.md y la migración 0011.
  flujo: {
    aprobar: "Aprobar y enviar al cliente",
    aprobarAlEnviar: "Aprobar y enviar al cliente",
    firmaAlAprobar: false,
    cierre: "cliente",
    campoFirmaCliente: "firmaCliente",
    cerrar: "Aceptar y firmar",
    eventoCierre: "Cotización aceptada por el cliente",
  },

  aplicarFirma: (campo, imagen, d) => (campo === "firmaCliente" ? { firmaCliente: imagen, aceptaFecha: d.aceptaFecha || hoyLocal() } : ({ [campo]: imagen } as Partial<DatosCotizacion>)),

  // La copia conserva los días de validez de la original (o `DIAS_VALIDEZ`) e ids nuevos en las líneas
  duplicar: (d, hoy) => ({
    ...d,
    fecha: hoy,
    vencimiento: sumarDias(hoy, Math.max(0, diasEntre(d.fecha, d.vencimiento)) || DIAS_VALIDEZ),
    items: d.items.map((i) => ({ ...i, id: idItem() })),
    firmaCliente: "",
    aceptaFecha: "",
  }),
};

export { PlantillaCotizacion } from "./PlantillaCotizacion";
export type { PropsPlantillaCotizacion } from "./PlantillaCotizacion";
export { importeItem, ivaPorTarifa, totalesCotizacion } from "./calculos";
export { CATALOGO_SERVICIOS, EMPRESA_COTIZACION, FORMATO_COTIZACION, PREFIJO_COTIZACION, UNIDADES } from "./catalogo";
export type { EmpresaCotizacion } from "./catalogo";
export type { DatosCotizacion, ItemCotizacion } from "./tipos";
