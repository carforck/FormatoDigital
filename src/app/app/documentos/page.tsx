"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, HardHat, Search } from "lucide-react";

import { EstadoBadge, fechaCorta } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/corporativo";
import { ETIQUETA_ESTADO, FORMATOS } from "@/lib/formatos";
import { rutaDoc } from "@/lib/base";
import { useDemo } from "@/lib/store";
import type { Estado, TipoDoc } from "@/lib/types";
import { cn } from "@/lib/utils";
import { avance } from "@/lib/validar";

export default function Page() {
  return (
    <Suspense>
      <ConClave />
    </Suspense>
  );
}

function ConClave() {
  const q = useSearchParams().get("q") ?? "";
  return <Documentos key={q} />;
}

function Documentos() {
  const demo = useDemo();
  const inicial = useSearchParams().get("q") ?? "";
  const [q, setQ] = useState(inicial);
  const [tipo, setTipo] = useState<TipoDoc | "">("");
  const [estado, setEstado] = useState<Estado | "">("");
  const [cliente, setCliente] = useState("");

  const lista = demo.visibles
    .filter((d) => !tipo || d.tipo === tipo)
    .filter((d) => !estado || d.estado === estado)
    .filter((d) => !cliente || d.clienteId === cliente)
    .filter((d) => {
      if (!q.trim()) return true;
      const t = `${d.codigo} ${d.datos.cliente} ${d.tipo === "reporte" ? `${d.datos.asunto} ${d.datos.descripcion}` : `${d.datos.actividades} ${d.datos.responsable}`}`.toLowerCase();
      return t.includes(q.toLowerCase());
    })
    .sort((a, b) => b.creado.localeCompare(a.creado));

  const autor = (id: string) => demo.usuarios.find((u) => u.id === id)?.nombre ?? "—";
  const sel = "rounded-md border border-slate-200 bg-white px-2 py-2 text-sm";

  return (
    <div className="space-y-4">
      <PageHeader titulo="Documentos" descripcion="Reportes técnicos y permisos de trabajo, con su estado y avance." etiqueta={`${FORMATOS.reporte.codigo} · ${FORMATOS.permiso.codigo}`} />
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, cliente, asunto o texto…" className="w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-2 text-sm" />
        </label>
        <select className={sel} value={tipo} onChange={(e) => setTipo(e.target.value as TipoDoc | "")} aria-label="Tipo">
          <option value="">Todos los formatos</option>
          <option value="reporte">Reporte técnico</option>
          <option value="permiso">Permiso de trabajo</option>
        </select>
        <select className={sel} value={estado} onChange={(e) => setEstado(e.target.value as Estado | "")} aria-label="Estado">
          <option value="">Todos los estados</option>
          {(Object.keys(ETIQUETA_ESTADO) as Estado[]).map((e) => (
            <option key={e} value={e}>
              {ETIQUETA_ESTADO[e]}
            </option>
          ))}
        </select>
        {demo.usuario?.rol !== "cliente" && (
          <select className={sel} value={cliente} onChange={(e) => setCliente(e.target.value)} aria-label="Cliente">
            <option value="">Todos los clientes</option>
            {demo.clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="hidden bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 md:table-header-group">
            <tr>
              <th className="px-4 py-2">Documento</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Autor</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Avance</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lista.map((d) => {
              const pct = avance(d);
              return (
                <tr key={d.id} className="block hover:bg-slate-50 md:table-row">
                  <td className="block px-4 pt-3 md:table-cell md:py-3">
                    <Link href={rutaDoc(d.id)} className="flex items-center gap-2 font-medium hover:underline">
                      {d.tipo === "reporte" ? <FileText className="h-4 w-4 text-slate-500" /> : <HardHat className="h-4 w-4 text-slate-500" />}
                      <span className="font-mono">{d.codigo}</span>
                    </Link>
                    <p className="truncate text-xs text-slate-500 md:max-w-xs">{d.tipo === "reporte" ? d.datos.asunto : d.datos.actividades}</p>
                  </td>
                  <td className="block px-4 md:table-cell">{d.datos.cliente}</td>
                  <td className="block px-4 text-slate-600 md:table-cell">{autor(d.autorId)}</td>
                  <td className="inline-block px-4 text-slate-600 md:table-cell">{fechaCorta(d.creado)}</td>
                  <td className="hidden px-4 md:table-cell">
                    <div className="h-1.5 w-20 rounded bg-slate-200">
                      <div className={cn("h-1.5 rounded", pct === 100 ? "bg-emerald-500" : "bg-amber-400")} style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className="inline-block px-4 pb-3 md:table-cell md:py-3">
                    <EstadoBadge estado={d.estado} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lista.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No hay documentos con esos filtros.</p>}
      </div>
      <p className="text-xs text-slate-500">
        {lista.length} de {demo.visibles.length} documentos visibles para tu perfil · {FORMATOS.reporte.codigo} y {FORMATOS.permiso.codigo}
      </p>
    </div>
  );
}
