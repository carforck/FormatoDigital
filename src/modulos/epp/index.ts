/**
 * Módulo de documento Entrega de EPP (prefijo EPP): registro de entrega de elementos de
 * protección personal al trabajador, con su firma de recibido y la de quien entrega.
 * Interno (el cliente no lo ve); lo diligencian el técnico, el Coordinador SST y la
 * administración; al aprobar, el revisor firma como quien entrega si faltaba.
 * Código del formato por confirmar con SOTEC.
 */

import type { ModuloDocumento } from "@/modulos/contrato";
import { EPP_CATALOGO, MOTIVOS_EPP, eppVacio, itemEpp, itemsMarcados } from "./catalogo";
import { PlantillaEpp } from "./PlantillaEpp";
import { totalUnidades, type DatosEpp } from "./tipos";
import { faltantesEpp } from "./validar";

/** Módulo Entrega de EPP. */
export const moduloEpp: ModuloDocumento<DatosEpp> = {
  clave: "epp",
  vacio: (hoy, u) => ({ ...eppVacio(hoy), trabajador: u.nombre, cedula: (u.cedula ?? "").replace(/\./g, ""), cargo: u.cargo }),
  totalComprobaciones: 7,
  titulo: (d) => `${d.trabajador || "Trabajador"} · ${totalUnidades(d)} EPP`,
  faltantes: faltantesEpp,
  formato: {
    codigo: "FO-GSST-?? por confirmar",
    nombre: "Registro de entrega de elementos de protección personal",
    version: "01",
    fecha: "por confirmar",
    corto: "Entrega de EPP",
    el: "la",
    nuevo: "Nueva",
    plural: "entregas de EPP",
  },
  prefijo: "EPP",
  Plantilla: PlantillaEpp,
  clienteDe: (d) => d.obra,
  campoCliente: "obra",
  visibleCliente: false,
  color: "var(--serie-e)",
  flujo: {
    aprobar: "Aprobar y firmar la entrega",
    firmaAlAprobar: true,
    // Quien aprueba queda como quien entrega si nadie firmó la entrega en sitio
    alAprobar: (d, u, firma) => (d.firmaEntrega ? {} : { entregaNombre: d.entregaNombre || u.nombre, entregaCargo: d.entregaCargo || u.cargo, firmaEntrega: firma || "" }),
    cierre: "revisor",
    cerrar: "Archivar la entrega",
    eventoCierre: "Archivó la entrega de EPP",
  },
  duplicar: (d, hoy) => ({ ...d, fecha: hoy, items: d.items.map((i, k) => ({ ...itemEpp(i.elemento, hoy, i.motivo, k), cantidad: i.cantidad, talla: i.talla })), firmaRecibe: "", entregaNombre: "", entregaCargo: "", firmaEntrega: "" }),
  alElegirProyecto: (p, c) => ({
    cambio: { obra: c ? `${c.nombre} · ${p.nombre}` : p.nombre },
    mensaje: `La entrega queda en el proyecto ${p.codigo} · ${p.nombre}.`,
  }),
  alElegirCliente: (c) => ({ cambio: { obra: c.sitio ? `${c.nombre} · ${c.sitio}` : c.nombre }, mensaje: `Área u obra: ${c.sitio ? `${c.nombre} · ${c.sitio}` : c.nombre}.` }),

  pasos: ({ datos, clientes, usuarioNombre, hoy }) => [
    { id: "cliente", tipo: "texto", resaltar: "obra", pregunta: "¿Para qué área, proyecto u obra es la entrega?", sugerencias: ["Sede SOTEC", ...clientes.map((c) => c.nombre)] },
    { id: "trabajador", tipo: "texto", resaltar: "trabajador", pregunta: "¿Quién recibe los elementos?", sugerencias: [datos.trabajador, usuarioNombre].filter((x, i, a) => x && a.indexOf(x) === i) },
    {
      id: "cedula",
      tipo: "texto",
      resaltar: "cedula",
      pregunta: "¿Cédula del trabajador?",
      sugerencias: datos.cedula ? [datos.cedula] : [],
      validar: (v) => (v.replace(/\D/g, "").length < 6 ? "Escribe una cédula válida (solo números)." : null),
    },
    { id: "cargo", tipo: "texto", resaltar: "cargo", pregunta: "¿Cargo del trabajador?", sugerencias: [datos.cargo, "Técnico electricista", "Auxiliar técnico"].filter(Boolean) },
    { id: "fecha", tipo: "fecha", resaltar: "fecha", pregunta: "¿Fecha de la entrega?", sugerencias: [hoy] },
    {
      id: "elementos",
      tipo: "multi",
      resaltar: "items",
      pregunta: "¿Qué elementos se entregan? Márcalos.",
      ayuda: "Cantidad y talla se ajustan con un toque en la tabla del formato.",
      opciones: [...EPP_CATALOGO],
      inicial: () => datos.items.map((i) => i.elemento),
    },
    { id: "motivo", tipo: "select", resaltar: "items", pregunta: "¿Motivo de la entrega?", opciones: [...MOTIVOS_EPP], agregar: false },
    { id: "observaciones", tipo: "textarea", resaltar: "observaciones", opcional: true, pregunta: "¿Observaciones?", sugerencias: ["Se entrega dotación completa por ingreso.", "Reposición por desgaste del elemento anterior."] },
    { id: "firmaRecibe", tipo: "firma", resaltar: "firmaRecibe", pregunta: "Firma del trabajador que recibe." },
    {
      id: "firmaEntrega",
      tipo: "firma",
      resaltar: "firmaEntrega",
      opcional: true,
      pregunta: "Firma de quien entrega (si está presente). Si no, firma quien aprueba.",
      firmante: { nombre: datos.entregaNombre, cargo: datos.entregaCargo || "Coordinador SST" },
      firmar: "Quien entrega firma ahora",
      omitir: "Firma al aprobar",
    },
  ],

  aplicar: (id, v, datos) => {
    if (id === "elementos") {
      const items = itemsMarcados(datos, v as string[]);
      return { cambio: { items }, mensaje: items.length ? `Quedan ${items.length} elemento(s) en la tabla.` : undefined };
    }
    if (id === "motivo") return { cambio: { items: datos.items.map((i) => ({ ...i, motivo: v as string })) }, mensaje: `Motivo «${v}» en todos los elementos (se cambia por fila en la tabla).` };
    if (id === "firmaEntrega") {
      // Firmó en sitio: el asistente entrega [nombre, cargo] de quien entrega
      if (Array.isArray(v)) return { cambio: { entregaNombre: String(v[0] ?? ""), entregaCargo: String(v[1] ?? "") } };
      return { cambio: {} };
    }
    if (id === "fecha") return { cambio: { fecha: v as string, items: datos.items.map((i) => (i.fecha === datos.fecha ? { ...i, fecha: v as string } : i)) } };
    return { cambio: { [id]: v } as Partial<DatosEpp> };
  },
};

export type { DatosEpp, ItemEpp } from "./tipos";
