import type { ModuloDocumento } from "@/modulos/contrato";

import { gastoVacio } from "./catalogo";
import { PlantillaGasto } from "./PlantillaGasto";
import { totalGastos, type DatosGasto, type ItemGasto } from "./tipos";
import { faltantesGasto } from "./validar";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

/** Módulo FO-GSST-25 · Legalización y registro de gastos operativos. */
export const moduloGastos: ModuloDocumento<DatosGasto> = {
  clave: "gasto",
  vacio: (hoy, u) => ({ ...gastoVacio(hoy), colaborador: u.nombre, cedula: (u.cedula ?? "").replace(/\./g, ""), cargo: u.cargo }),
  totalComprobaciones: 8,
  titulo: (d) => `${d.centroCostos || "Gastos"} · ${cop(totalGastos(d))}`,
  faltantes: faltantesGasto,
  formato: { codigo: "FO-GSST-25", nombre: "Formato de legalización y registro de gastos operativos", version: "01", fecha: "01/03/2020", corto: "Legalización de gastos", el: "la", nuevo: "Nueva", plural: "gastos" },
  prefijo: "LG",
  Plantilla: PlantillaGasto,
  clienteDe: (d) => d.clienteObra,
  campoCliente: "clienteObra",
  // Interno: el cliente nunca lo ve, aunque el gasto se cargue a su obra
  visibleCliente: false,
  color: "var(--serie-c)",
  flujo: {
    aprobar: "Dar Vo.Bo. y firmar",
    firmaAlAprobar: true,
    alAprobar: (d, u, firma) => ({ voboNombre: u.nombre, firmaVobo: firma || d.firmaVobo }),
    cierre: "revisor",
    cerrar: "Marcar como reembolsado",
    eventoCierre: "Marcó como reembolsado",
  },
  duplicar: (d, hoy) => ({ ...d, fecha: hoy, items: [], firmaColaborador: "", voboNombre: "", firmaVobo: "" }),
  valor: totalGastos,
  alElegirProyecto: (p, c) => ({
    cambio: { clienteObra: c ? `${c.nombre} · ${p.nombre}` : p.nombre, centroCostos: `${p.codigo} · ${p.nombre}` },
    mensaje: `Los gastos se cargan al proyecto ${p.codigo} · ${p.nombre} (centro de costos y obra).`,
  }),

  alElegirCliente: (c) => ({
    cambio: { clienteObra: c.nombre, centroCostos: c.sitio ? `${c.nombre} · ${c.sitio}` : c.nombre },
    mensaje: `Cliente ${c.nombre} seleccionado. Centro de costos sugerido: ${c.sitio ? `${c.nombre} · ${c.sitio}` : c.nombre}.`,
  }),

  pasos: ({ datos, clientes, hoy }) => [
    { id: "cliente", tipo: "texto", resaltar: "clienteObra", pregunta: "¿Para qué cliente u obra son los gastos?", sugerencias: clientes.map((c) => c.nombre) },
    { id: "centroCostos", tipo: "texto", resaltar: "centroCostos", pregunta: "¿A qué centro de costos se cargan?", sugerencias: [datos.centroCostos, "Sede Cartagena", "Administración"].filter(Boolean) },
    { id: "fecha", tipo: "fecha", resaltar: "fecha", pregunta: "¿Fecha de la legalización?", sugerencias: [hoy] },
    { id: "telefono", tipo: "tel", resaltar: "telefono", opcional: true, pregunta: "¿Tu teléfono de contacto?", validar: (v) => (v.replace(/\D/g, "").length < 7 ? "Escribe un teléfono válido." : null) },
    {
      id: "items",
      tipo: "gastos",
      resaltar: "items",
      pregunta: "Registra cada gasto con la foto de su factura o recibo.",
      ayuda: "Toma la foto con el celular. Sin número de recibo ni foto, el gasto no se puede legalizar.",
    },
    { id: "observaciones", tipo: "textarea", resaltar: "observaciones", opcional: true, pregunta: "¿Observaciones o justificaciones?", sugerencias: ["Gastos de la comisión de servicio en sitio del cliente.", "Se compraron materiales no previstos para terminar el trabajo."] },
    { id: "firmaColaborador", tipo: "firma", resaltar: "firmaColaborador", pregunta: "Firma del colaborador que reporta." },
  ],

  aplicar: (id, v, datos) => {
    if (id === "items") {
      const nuevos = v as ItemGasto[];
      return {
        cambio: { items: [...datos.items, ...nuevos] },
        mensaje: nuevos.length ? `Registré ${nuevos.length} gasto(s) por ${cop(totalGastos({ items: nuevos }))}. Las fotos de las facturas van en la hoja «Soportes».` : undefined,
      };
    }
    return { cambio: { [id]: v } as Partial<DatosGasto> };
  },
};

export type { DatosGasto, ItemGasto } from "./tipos";
