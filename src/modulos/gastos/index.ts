import type { ModuloDocumento } from "@/modulos/contrato";

import { gastoVacio } from "./catalogo";
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
