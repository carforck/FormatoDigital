"use client";

/**
 * Ruta /app/auditoria: registro de quién hizo qué y cuándo (demo.auditoria de useDemo()).
 * Solo la administración (permiso `auditoria`; AppShell bloquea al resto).
 * Celular: línea de tiempo; escritorio: tabla. Búsqueda por usuario, acción o detalle y
 * paginación de a 25 (?pag=): el registro crece con cada acción del equipo.
 */
import { useState } from "react";
import { Search } from "lucide-react";

import { Avatar, PageHeader } from "@/components/ui/corporativo";
import { Paginacion, usePaginacion } from "@/components/ui/Paginacion";
import { useDemo } from "@/nucleo/datos/DemoProvider";

/** Listado de solo lectura de los eventos de auditoría. */
export default function Auditoria() {
  const demo = useDemo();
  const nombre = (id: string) => demo.usuarios.find((u) => u.id === id)?.nombre ?? id;
  const fecha = (f: string) => f.replace("T", " ").slice(0, 16);
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const lista = t ? demo.auditoria.filter((a) => `${nombre(a.usuarioId)} ${a.accion} ${a.detalle} ${fecha(a.fecha)}`.toLowerCase().includes(t)) : demo.auditoria;
  const pag = usePaginacion(lista, 25, t, "pag");
  return (
    <div className="space-y-4">
      <PageHeader etiqueta="Administración" titulo="Auditoría" descripcion="Quién hizo qué y cuándo. Registro inalterable para las auditorías del SGC." />

      <label className="relative block max-w-md">
        <span className="sr-only">Buscar en la auditoría</span>
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por usuario, acción o detalle…" className="w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-2 text-sm" />
      </label>
      {lista.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No hay eventos con esa búsqueda.</p>}

      {/* Celular: línea de tiempo */}
      <ol className="space-y-2 md:hidden">
        {pag.visibles.map((a) => (
          <li key={a.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <Avatar nombre={nombre(a.usuarioId)} className="h-8 w-8" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium text-slate-900">{nombre(a.usuarioId)}</span> <span className="text-slate-600">{a.accion.toLowerCase()}</span>{" "}
                <span className="font-mono text-xs text-slate-700">{a.detalle}</span>
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500">{fecha(a.fecha)}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Escritorio: tabla */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Fecha</th>
              <th className="px-4 py-2.5">Usuario</th>
              <th className="px-4 py-2.5">Acción</th>
              <th className="px-4 py-2.5">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pag.visibles.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-600">{fecha(a.fecha)}</td>
                <td className="px-4">
                  <span className="flex items-center gap-2">
                    <Avatar nombre={nombre(a.usuarioId)} className="h-7 w-7 text-[10px]" /> {nombre(a.usuarioId)}
                  </span>
                </td>
                <td className="px-4 font-medium text-slate-900">{a.accion}</td>
                <td className="px-4 text-slate-600">{a.detalle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacion p={pag} nombre="eventos" />
    </div>
  );
}
