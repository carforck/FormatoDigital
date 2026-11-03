"use client";

/**
 * Ruta /app/revision: bandeja del revisor. Muestra los documentos en revisión (más
 * antiguos primero) y los aprobados que cierra SST. Para perfiles con permiso `revisar`
 * (supervisor/Coordinador SST y administración). Cada tarjeta abre el detalle con
 * ?desde=revision para volver aquí. Datos: demo.visibles de useDemo(), así la bandeja se
 * actualiza sola cuando el autor envía o retira un documento (otra pestaña o equipo). Marca
 * los reportes que traen la firma del cliente en sitio (al aprobarlos quedan cerrados).
 * Escritorio (lg): filas compactas ordenables por fecha; celular y tableta: tarjetas. Cada
 * bandeja pagina de a 25 (`usePaginacion`; la de revisión guarda su página en ?pag=).
 */
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Signature } from "lucide-react";

import { EstadoBadge, fechaCorta } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/corporativo";
import { rutaDoc } from "@/nucleo/rutas";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { faltantes } from "@/nucleo/validar";
import { clienteDoc, formatoDe, infoDoc, tituloDoc } from "@/modulos/registro";
import { IconoDoc } from "@/components/ui/icono-doc";
import { Paginacion, usePaginacion } from "@/components/ui/Paginacion";
import type { Documento } from "@/nucleo/tipos";

/** Bandeja de revisión y de cierre pendiente. */
export default function Revision() {
  const demo = useDemo();
  // Por defecto, los más antiguos primero (los que más llevan esperando); «Fecha» invierte el orden
  const [recientes, setRecientes] = useState(false);
  const orden = (a: Documento, b: Documento) => (recientes ? b.creado.localeCompare(a.creado) : a.creado.localeCompare(b.creado));
  const cola = demo.visibles.filter((d) => d.estado === "en_revision").sort(orden);
  // Aprobados que cierra SST (permisos, gastos); los que cierra el cliente con su firma esperan en su portal
  const porCerrar = demo.visibles.filter((d) => d.estado === "aprobado" && infoDoc(d.tipo).flujo.cierre !== "cliente").sort(orden);
  const pagCola = usePaginacion(cola, 25, String(recientes), "pag");
  const pagCierre = usePaginacion(porCerrar, 25, String(recientes));
  const autor = (id: string) => demo.usuarios.find((u) => u.id === id)?.nombre ?? "—";
  /** El formato lo cierra la firma del cliente y ya la trae (tomada en sitio). */
  const firmadoEnSitio = (d: Documento) => {
    const campo = infoDoc(d.tipo).flujo.campoFirmaCliente;
    return Boolean(campo && String((d.datos as unknown as Record<string, unknown>)[campo] ?? "").startsWith("data:image/"));
  };

  /** Tarjeta de un documento con el resultado de la validación automática (faltantes) y el llamado a la acción. */
  const tarjeta = (d: Documento, cta: string) => {
    const p = faltantes(d);
    return (
      <Link key={d.id} href={rutaDoc(d.id, "&desde=revision")} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sotec-greenDeep hover:shadow-md">
        <div className="flex items-center gap-2">
          <IconoDoc tipo={d.tipo} className="h-4 w-4 text-slate-500" />
          <span className="font-mono text-sm font-semibold">{d.codigo}</span>
          <span className="ml-auto">
            <EstadoBadge estado={d.estado} tipo={d.tipo} />
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm font-medium">{tituloDoc(d)}</p>
        <p className="text-xs text-slate-500">
          {formatoDe(d.tipo).corto} · {clienteDoc(d)} · {autor(d.autorId)} · {fechaCorta(d.creado)}
        </p>
        {p.length === 0 ? (
          <p className="mt-2 flex items-center gap-1 text-xs text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Validación automática superada
          </p>
        ) : (
          <p className="mt-2 flex items-center gap-1 text-xs text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" /> {p.length} observación(es) de la validación
          </p>
        )}
        {d.estado === "en_revision" && firmadoEnSitio(d) && (
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
            <Signature className="h-3.5 w-3.5" /> Con firma del cliente en sitio: se cierra al aprobar
          </p>
        )}
        <p className="mt-3 text-sm font-semibold text-sotec-greenDeep">{cta} →</p>
      </Link>
    );
  };

  /**
   * Bandeja: en escritorio (lg) filas compactas (código, formato, cliente, autor, fecha,
   * validación, estado, acción); debajo de lg, las tarjetas de siempre.
   */
  const bandeja = (lista: Documento[], cta: (d: Documento) => string) => (
    <>
      <div className="grid gap-3 md:grid-cols-2 lg:hidden">{lista.map((d) => tarjeta(d, cta(d)))}</div>
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
        <table className="w-full text-sm" data-filas-revision>
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Documento</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Autor</th>
              <th className="px-3 py-2" aria-sort={recientes ? "descending" : "ascending"}>
                <button type="button" onClick={() => setRecientes((x) => !x)} className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-800" title="Ordenar por fecha">
                  Fecha {recientes ? <ArrowDown className="h-3 w-3" aria-hidden /> : <ArrowUp className="h-3 w-3" aria-hidden />}
                </button>
              </th>
              <th className="px-3 py-2">Validación</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">
                <span className="sr-only">Acción</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lista.map((d) => {
              const obs = faltantes(d).length;
              return (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="max-w-[320px] px-3 py-2">
                    <Link href={rutaDoc(d.id, "&desde=revision")} className="flex items-center gap-2 font-medium hover:underline">
                      <IconoDoc tipo={d.tipo} className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="font-mono">{d.codigo}</span>
                      <span className="text-xs font-normal text-slate-500">{formatoDe(d.tipo).corto}</span>
                    </Link>
                    <p className="truncate text-xs text-slate-500">{tituloDoc(d)}</p>
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2">{clienteDoc(d)}</td>
                  <td className="px-3 py-2 text-slate-600">{autor(d.autorId)}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600">{fechaCorta(d.creado)}</td>
                  <td className="px-3 py-2 text-xs">
                    {obs === 0 ? (
                      <span className="flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Superada
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {obs} obs.
                      </span>
                    )}
                    {d.estado === "en_revision" && firmadoEnSitio(d) && (
                      <span className="mt-0.5 flex items-start gap-1 text-emerald-700" title="Se cierra al aprobar">
                        <Signature className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden /> Con firma del cliente en sitio
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <EstadoBadge estado={d.estado} tipo={d.tipo} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <Link href={rutaDoc(d.id, "&desde=revision")} className="font-semibold text-sotec-greenDeep hover:underline">
                      {cta(d)} →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader etiqueta="Gestión SST" titulo="Revisión y aprobación" descripcion="Los documentos llegan validados por el sistema; tú decides si se aprueban o vuelven al autor con el motivo." />
      <section>
        <h2 className="mb-2 font-semibold">Por revisar ({cola.length})</h2>
        {cola.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            <p>Bandeja al día: no hay documentos esperando tu revisión.</p>
            <Link href="/app/documentos" className="mt-2 inline-block font-medium text-sotec-greenDeep hover:underline">
              Ver todos los documentos →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bandeja(pagCola.visibles, () => "Revisar")}
            <Paginacion p={pagCola} nombre="documentos por revisar" id="por-revisar" />
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Aprobados pendientes de cierre ({porCerrar.length})</h2>
        {porCerrar.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Nada pendiente de cierre. Los reportes y cotizaciones aprobados los cierra el cliente con su firma.</p>
        ) : (
          <div className="space-y-3">
            {bandeja(pagCierre.visibles, (d) => infoDoc(d.tipo).flujo.cerrar)}
            <Paginacion p={pagCierre} nombre="documentos por cerrar" id="por-cerrar" />
          </div>
        )}
      </section>
    </div>
  );
}
