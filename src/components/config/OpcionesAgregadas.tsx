"use client";

/**
 * Configuración · «Opciones agregadas»: lo que el equipo sumó a las listas con «＋ Agregar
 * otro», desde el asistente o desde los formularios (`SelectConOtro`, @/nucleo/opciones):
 * tipos de reporte, peligros, EPP, tipos de gasto, unidades, sistemas y tipos de equipo… y
 * los servicios o productos nuevos del catálogo de la cotización. La administración los
 * revisa y quita los que sobren (p. ej. mal escritos); quitar no cambia los documentos
 * que ya los usan.
 */
import { ListPlus, X } from "lucide-react";

import { sistemaDe } from "@/modulos/equipos/catalogo";
import { formatoDe } from "@/modulos/registro";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { cop } from "@/nucleo/letras";
import type { TipoDoc } from "@/nucleo/tipos";

/** Nombre legible de cada lista («formato.paso»); si falta, se muestra el paso tal cual. */
const LISTAS: Record<string, string> = {
  tipoReporte: "Tipo de reporte",
  puestoProyecto: "Tipo de trabajo",
  equipo: "Equipo requerido",
  peligros: "Peligros identificados",
  medidas: "Medidas de seguridad",
  epp: "Elementos de protección personal (EPP)",
  items: "Tipo de gasto",
  unidad: "Unidad de los ítems",
};

function nombreLista(clave: string): string {
  const [tipo, paso, sistema] = clave.split(".");
  // Inventario de equipos (no es un formato): «equipos.sistema» y «equipos.tipo.<sistema>»
  if (tipo === "equipos") return paso === "tipo" ? `Equipos · Tipos de ${sistemaDe(sistema ?? "").nombre}` : "Equipos · Sistemas";
  let formato = tipo;
  try {
    formato = formatoDe(tipo as TipoDoc).corto;
  } catch {
    /* formato desconocido: se deja la clave */
  }
  return `${formato} · ${LISTAS[paso] ?? paso}`;
}

export function OpcionesAgregadas() {
  const demo = useDemo();
  const listas = Object.entries(demo.config.opcionesPropias ?? {}).filter(([, v]) => v.length);
  const servicios = demo.config.serviciosPropios ?? [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold">
        <ListPlus className="h-4 w-4 text-sotec-greenDeep" /> Opciones agregadas por el equipo
      </h2>
      <p className="text-sm text-slate-500">
        Lo que el equipo agregó con «＋ Agregar otro» en el asistente, los formatos y el inventario de equipos. Aparece en las listas para todos; quita lo que sobre. Los documentos que ya lo usan no
        cambian.
      </p>

      {!listas.length && !servicios.length ? (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">Todavía no se ha agregado ninguna opción.</p>
      ) : (
        <div className="mt-3 space-y-4">
          {listas.map(([clave, valores]) => (
            <div key={clave}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{nombreLista(clave)}</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {valores.map((v) => (
                  <li key={v} className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-0.5 pl-2.5 pr-1 text-sm text-slate-700">
                    {clave === "equipos.sistema" ? sistemaDe(v).nombre : v}
                    <button
                      type="button"
                      onClick={() => confirm(`¿Quitar «${v}» de la lista?`) && demo.quitarOpcion(clave, v)}
                      aria-label={`Quitar ${v}`}
                      className="rounded-full p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {servicios.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cotización · servicios y productos del catálogo</p>
              <ul className="mt-1.5 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {servicios.map((sv) => (
                  <li key={sv.clave} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-slate-800">{sv.descripcion}</span>
                    <span className="shrink-0 tabular-nums text-slate-500">
                      {cop(sv.precioReferencia)} / {sv.unidad.toLowerCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => confirm(`¿Quitar «${sv.descripcion}» del catálogo?`) && demo.quitarServicio(sv.clave)}
                      aria-label={`Quitar ${sv.descripcion}`}
                      className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
