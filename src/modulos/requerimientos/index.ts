/**
 * Módulo de documento Requerimiento (prefijo RQ, pedido de Magno): el técnico pide los
 * ítems que necesita un cliente o proyecto con la tabla de la cotización, sin lo comercial.
 * Borrador → «Enviar a revisión» → la administración lo convierte en cotización (queda
 * cerrado = «Atendido», ver ./conversion.ts) o un revisor lo aprueba y después lo marca
 * como atendido. Interno: el cliente no lo ve. Código del formato por confirmar con SOTEC.
 */

import type { ModuloDocumento } from "@/modulos/contrato";
import { CATALOGO_SERVICIOS } from "@/modulos/cotizaciones/catalogo";

import { FORMATO_REQUERIMIENTO, PREFIJO_REQUERIMIENTO, idItemRq, itemsMarcadosRq, leerItemsRq, lineaRq, requerimientoVacio } from "./catalogo";
import { PlantillaRequerimiento } from "./PlantillaRequerimiento";
import type { DatosRequerimiento } from "./tipos";
import { COMPROBACIONES_REQUERIMIENTO, faltantesRequerimiento } from "./validar";

/** Módulo Requerimiento. */
export const moduloRequerimientos: ModuloDocumento<DatosRequerimiento> = {
  clave: "requerimiento",
  vacio: (hoy, u) => ({ ...requerimientoVacio(hoy), solicitante: u.nombre, cargo: u.cargo }),
  totalComprobaciones: COMPROBACIONES_REQUERIMIENTO,
  titulo: (d) => `${d.asunto || "Requerimiento"} · ${d.items.length} ítem(s)`,
  faltantes: faltantesRequerimiento,
  formato: FORMATO_REQUERIMIENTO,
  prefijo: PREFIJO_REQUERIMIENTO,
  Plantilla: PlantillaRequerimiento,
  clienteDe: (d) => d.cliente,
  campoCliente: "cliente",
  visibleCliente: false,
  color: "var(--serie-f)",
  // Cerrado = «Atendido»: convertido en cotización o cerrado sin cotizar por un revisor
  etiquetasEstado: { cerrado: "Atendido" },
  flujo: {
    aprobar: "Aprobar requerimiento",
    firmaAlAprobar: false,
    cierre: "revisor",
    cerrar: "Cerrar sin cotizar",
    eventoCierre: "Cerró el requerimiento sin cotizar",
  },
  duplicar: (d, hoy) => ({ ...d, fecha: hoy, fechaRequerida: "", items: d.items.map((i) => ({ ...i, id: idItemRq() })), firmaSolicitante: "" }),
  alElegirCliente: (c) => ({ cambio: { cliente: c.nombre, sitio: c.sitio }, mensaje: `Cliente ${c.nombre}${c.sitio ? `, sitio ${c.sitio}` : ""}.` }),
  alElegirProyecto: (p) => ({
    cambio: { proyecto: `${p.codigo} · ${p.nombre}`, ...(p.sitio ? { sitio: p.sitio } : {}) },
    mensaje: `El requerimiento queda en el proyecto ${p.codigo}.`,
  }),

  pasos: ({ datos, clientes, hoy, serviciosPropios }) => {
    const opciones = [...CATALOGO_SERVICIOS, ...(serviciosPropios ?? [])].map((s) => s.descripcion);
    return [
      { id: "cliente", tipo: "texto", resaltar: "cliente", pregunta: "¿Para qué cliente es el requerimiento?", sugerencias: clientes.map((c) => c.nombre) },
      { id: "sitio", tipo: "texto", resaltar: "sitio", opcional: true, pregunta: "¿En qué sitio o área se necesita?", sugerencias: [datos.sitio].filter(Boolean) },
      {
        id: "asunto",
        tipo: "texto",
        resaltar: "asunto",
        pregunta: "¿Qué se requiere y para qué?",
        sugerencias: [datos.asunto, "Materiales para ampliación de CCTV", "Repuestos para mantenimiento correctivo", "Servicio adicional solicitado por el cliente"].filter(Boolean),
        validar: (v) => (v.trim().length < 5 ? "Escribe al menos 5 caracteres." : null),
      },
      {
        id: "servicios",
        tipo: "multi",
        resaltar: "items",
        pregunta: "Marca lo que se requiere del catálogo de servicios.",
        ayuda: "En el siguiente paso ajustas cantidades o agregas lo que no esté. Si nada aplica, continúa con 0.",
        opciones,
        inicial: () => opciones.filter((o) => datos.items.some((i) => i.descripcion === o)),
      },
      {
        id: "items",
        tipo: "textarea",
        resaltar: "items",
        opcional: datos.items.length > 0,
        pregunta: "Revisa los ítems: uno por línea, «cantidad unidad x descripción | observación».",
        ayuda: "Ejemplo: 4 unidades x Cámara domo IP 4 MP | Bodega norte\nUsa «Redactar borrador» para cargar los ítems actuales y cambiar las cantidades.",
        generar: () => datos.items.map(lineaRq).join("\n"),
        validar: (v) => {
          const r = leerItemsRq(v, datos.items, [...CATALOGO_SERVICIOS, ...(serviciosPropios ?? [])]);
          return r.errores.length ? r.errores.slice(0, 3).join(" ") : null;
        },
      },
      { id: "fechaRequerida", tipo: "fecha", resaltar: "fechaRequerida", opcional: true, pregunta: "¿Para cuándo se necesita?", sugerencias: [hoy] },
      { id: "observaciones", tipo: "textarea", resaltar: "observaciones", opcional: true, pregunta: "¿Observaciones?", sugerencias: ["Urgente: el cliente necesita el servicio esta semana.", "Coordinar el acceso al sitio con el contacto del cliente."] },
      { id: "firmaSolicitante", tipo: "firma", resaltar: "firmaSolicitante", pregunta: "Firma de quien solicita." },
    ];
  },

  aplicar: (id, v, datos, extras) => {
    const catalogo = [...CATALOGO_SERVICIOS, ...(extras?.serviciosPropios ?? [])];
    if (id === "servicios") {
      const items = itemsMarcadosRq(datos.items, v as string[], catalogo.map((s) => s.descripcion), catalogo);
      return { cambio: { items }, mensaje: items.length ? `Quedan ${items.length} ítem(s) en la tabla.` : undefined };
    }
    if (id === "items") {
      if (!String(v).trim()) return { cambio: {}, mensaje: datos.items.length ? `Conservo los ${datos.items.length} ítem(s).` : undefined };
      const { items, errores } = leerItemsRq(v as string, datos.items, catalogo);
      if (errores.length) return { cambio: {}, mensaje: `⚠️ ${errores.join(" ")}` };
      return { cambio: { items }, mensaje: `${items.length} ítem(s) en el requerimiento.` };
    }
    return { cambio: { [id]: v } as Partial<DatosRequerimiento> };
  },
};

export type { DatosRequerimiento, ItemRequerimiento } from "./tipos";
