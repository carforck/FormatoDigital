"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { EstadoBadge, fechaCorta } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/corporativo";
import { ETIQUETA_ESTADO } from "@/nucleo/catalogos";
import { rutaDoc } from "@/nucleo/rutas";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import type { Estado, TipoDoc } from "@/nucleo/tipos";
import { cn } from "@/lib/utils";
import { avance } from "@/nucleo/validar";
import { TIPOS_DOC, clienteDoc, formatoDe, rutaNuevo, tituloDoc } from "@/modulos/registro";
import { puede } from "@/nucleo/permisos";
import { IconoDoc } from "@/components/ui/icono-doc";

export default function Page() {
  return (
    <Suspense>
      <ConClave />
    </Suspense>
  );
}

function ConClave() {
  const p = useSearchParams();
  return <Documentos key={`${p.get("q") ?? ""}-${p.get("proyecto") ?? ""}`} />;
}

function Documentos() {
  const demo = useDemo();
  const params = useSearchParams();
  const inicial = params.get("q") ?? "";
  const [q, setQ] = useState(inicial);
  const [proyecto, setProyecto] = useState(params.get("proyecto") ?? "");
  const [tipo, setTipo] = useState<TipoDoc | "">("");
  const [estado, setEstado] = useState<Estado | "">("");
  const [cliente, setCliente] = useState("");

  const lista = demo.visibles
    .filter((d) => !tipo || d.tipo === tipo)
    .filter((d) => !estado || d.estado === estado)
    .filter((d) => !cliente || d.clienteId === cliente)
    .filter((d) => !proyecto || (proyecto === "ninguno" ? !d.proyectoId : d.proyectoId === proyecto))
    .filter((d) => {
      if (!q.trim()) return true;
      const t = `${d.codigo} ${clienteDoc(d)} ${tituloDoc(d)} ${JSON.stringify(d.datos)}`.toLowerCase();
      return t.includes(q.toLowerCase());
    })
    .sort((a, b) => b.creado.localeCompare(a.creado));

  const proyectos = demo.proyectosVisibles.filter((p) => !cliente || p.clienteId === cliente);
  const codigoProyecto = (id?: string) => demo.proyectos.find((p) => p.id === id)?.codigo;
  const tiposVisibles = TIPOS_DOC.filter((t) => demo.visibles.some((d) => d.tipo === t));
  const codigos = tiposVisibles.map((t) => formatoDe(t).codigo).join(" · ");
  const autor = (id: string) => demo.usuarios.find((u) => u.id === id)?.nombre ?? "—";
  const sel = "rounded-md border border-slate-200 bg-white px-2 py-2 text-sm";

  return (
    <div className="space-y-4">
      <PageHeader titulo="Documentos" descripcion={`${tiposVisibles.map((t) => formatoDe(t).plural).join(", ").replace(/^./, (x) => x.toUpperCase())}, con su estado, avance y proyecto.`} etiqueta={codigos} />
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, cliente, asunto o texto…" className="w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-2 text-sm" />
        </label>
        <select className={sel} value={tipo} onChange={(e) => setTipo(e.target.value as TipoDoc | "")} aria-label="Tipo">
          <option value="">Todos los formatos</option>
          {tiposVisibles.map((t) => (
            <option key={t} value={t}>
              {formatoDe(t).corto}
            </option>
          ))}
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
          <select
            className={sel}
            value={cliente}
            onChange={(e) => {
              setCliente(e.target.value);
              // Un proyecto de otro cliente deja de aplicar
              if (proyecto && proyecto !== "ninguno" && demo.proyectos.find((p) => p.id === proyecto)?.clienteId !== e.target.value && e.target.value) setProyecto("");
            }}
            aria-label="Cliente"
          >
            <option value="">Todos los clientes</option>
            {demo.clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        )}
        {proyectos.length > 0 && (
          <select className={cn(sel, "max-w-full")} value={proyecto} onChange={(e) => setProyecto(e.target.value)} aria-label="Proyecto">
            <option value="">Todos los proyectos</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} · {p.nombre}
              </option>
            ))}
            <option value="ninguno">Sin proyecto</option>
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
                      <IconoDoc tipo={d.tipo} className="h-4 w-4 text-slate-500" />
                      <span className="font-mono">{d.codigo}</span>
                    </Link>
                    <p className="truncate text-xs text-slate-500 md:max-w-xs">{tituloDoc(d)}</p>
                    {codigoProyecto(d.proyectoId) && (
                      <Link href={`/app/proyectos/ver?id=${d.proyectoId}`} className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 font-mono text-[10px] text-slate-600 hover:underline">
                        {codigoProyecto(d.proyectoId)}
                      </Link>
                    )}
                  </td>
                  <td className="block px-4 md:table-cell">{clienteDoc(d)}</td>
                  <td className="block px-4 text-slate-600 md:table-cell">{autor(d.autorId)}</td>
                  <td className="inline-block px-4 text-slate-600 md:table-cell">{fechaCorta(d.creado)}</td>
                  <td className="hidden px-4 md:table-cell">
                    <div className="h-1.5 w-20 rounded bg-slate-200">
                      <div className={cn("h-1.5 rounded", pct === 100 ? "bg-emerald-500" : "bg-amber-400")} style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className="inline-block px-4 pb-3 md:table-cell md:py-3">
                    <EstadoBadge estado={d.estado} tipo={d.tipo} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lista.length === 0 && (
          <div className="p-6 text-center text-sm text-slate-500">
            <p>No hay documentos con esos filtros.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {(q || tipo || estado || cliente || proyecto) && (
                <button onClick={() => (setQ(""), setTipo(""), setEstado(""), setCliente(""), setProyecto(""))} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
                  Limpiar filtros
                </button>
              )}
              {demo.usuario && puede(demo.usuario.rol, "crear") && (
                <Link href={rutaNuevo(tipo || "reporte", proyecto && proyecto !== "ninguno" ? `proyecto=${proyecto}` : "")} className="rounded-lg bg-sotec px-3 py-1.5 font-medium text-white hover:bg-black">
                  {formatoDe(tipo || "reporte").nuevo} {formatoDe(tipo || "reporte").corto.toLowerCase()}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500">
        {lista.length} de {demo.visibles.length} documentos visibles para tu perfil · {codigos}
      </p>
    </div>
  );
}
