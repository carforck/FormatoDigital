"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, FolderKanban, MapPin, Plus, Search, UserRound } from "lucide-react";

import { BarraPresupuesto } from "@/components/proyectos/piezas";
import { EstadoProyectoBadge, fechaCorta } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/corporativo";
import { IconoDoc } from "@/components/ui/icono-doc";
import { cn } from "@/lib/utils";
import { TIPOS_DOC, cantidadDoc } from "@/modulos/registro";
import { ETIQUETA_ESTADO_PROYECTO } from "@/nucleo/catalogos";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { cop } from "@/nucleo/letras";
import { puede } from "@/nucleo/permisos";
import { resumenProyecto } from "@/nucleo/proyectos";
import { rutaProyecto } from "@/nucleo/rutas";
import type { EstadoProyecto } from "@/nucleo/tipos";

export default function Proyectos() {
  const demo = useDemo();
  const u = demo.usuario!;
  const interno = u.rol !== "cliente";
  const [q, setQ] = useState("");
  const [cliente, setCliente] = useState("");
  const [estado, setEstado] = useState<EstadoProyecto | "">("");

  const nombreCliente = (id: string) => demo.clientes.find((c) => c.id === id)?.nombre ?? "—";
  const nombreUsuario = (id: string) => demo.usuarios.find((x) => x.id === id)?.nombre ?? "—";
  const lista = demo.proyectosVisibles
    .filter((p) => !cliente || p.clienteId === cliente)
    .filter((p) => !estado || p.estado === estado)
    .filter((p) => !q.trim() || `${p.codigo} ${p.nombre} ${p.sitio} ${nombreCliente(p.clienteId)}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.estado === b.estado ? b.fechaInicio.localeCompare(a.fechaInicio) : ["activo", "en_pausa", "cerrado"].indexOf(a.estado) - ["activo", "en_pausa", "cerrado"].indexOf(b.estado)));
  const tipos = TIPOS_DOC.filter((t) => interno || t !== "gasto");
  const sel = "rounded-md border border-slate-200 bg-white px-2 py-2 text-sm";

  return (
    <div className="space-y-4">
      <PageHeader
        etiqueta="Gestión"
        titulo="Proyectos"
        descripcion={interno ? "Cada obra de un cliente con sus reportes, permisos, gastos, cotizaciones y cuentas de cobro." : "Las obras que adelantamos en tu empresa, con sus reportes y cotizaciones."}
        acciones={
          puede(u.rol, "proyectos") && (
            <Link href="/app/proyectos/editar" className="inline-flex items-center gap-2 rounded-lg bg-sotec px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-black">
              <Plus className="h-4 w-4" /> Nuevo proyecto
            </Link>
          )
        }
      />

      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Buscar proyecto</span>
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, nombre, sitio o cliente…" className="w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-2 text-sm" />
        </label>
        {interno && (
          <select className={cn(sel, "max-w-full")} value={cliente} onChange={(e) => setCliente(e.target.value)} aria-label="Cliente">
            <option value="">Todos los clientes</option>
            {demo.clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        )}
        <select className={sel} value={estado} onChange={(e) => setEstado(e.target.value as EstadoProyecto | "")} aria-label="Estado del proyecto">
          <option value="">Todos los estados</option>
          {(Object.keys(ETIQUETA_ESTADO_PROYECTO) as EstadoProyecto[]).map((e) => (
            <option key={e} value={e}>
              {ETIQUETA_ESTADO_PROYECTO[e]}
            </option>
          ))}
        </select>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          <p>{demo.proyectosVisibles.length ? "No hay proyectos con esos filtros." : "Todavía no hay proyectos."}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {(q || cliente || estado) && (
              <button onClick={() => (setQ(""), setCliente(""), setEstado(""))} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
                Limpiar filtros
              </button>
            )}
            {puede(u.rol, "proyectos") && (
              <Link href="/app/proyectos/editar" className="inline-flex items-center gap-1 rounded-lg bg-sotec px-3 py-1.5 font-medium text-white hover:bg-black">
                <Plus className="h-4 w-4" aria-hidden /> {demo.proyectosVisibles.length ? "Nuevo proyecto" : "Crear el primer proyecto"}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((p) => {
            const r = resumenProyecto(p, demo.visibles, demo.cuentasVisibles);
            return (
              <li key={p.id} className="min-w-0">
                <Link
                  href={rutaProyecto(p.id)}
                  className="flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sotec-greenDeep hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sotec text-sotec-green">
                      <FolderKanban className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-500">{p.codigo}</span>
                        <EstadoProyectoBadge estado={p.estado} />
                      </span>
                      <span className="mt-0.5 block break-words font-semibold text-slate-900">{p.nombre}</span>
                      <span className="block break-words text-sm text-slate-600">{nombreCliente(p.clienteId)}</span>
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    {p.sitio && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /> <span className="min-w-0 break-words">{p.sitio}</span>
                      </p>
                    )}
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1.5">
                        <UserRound className="h-3.5 w-3.5" aria-hidden /> {nombreUsuario(p.responsableId)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {fechaCorta(p.fechaInicio)}
                        {p.fechaFin ? ` – ${fechaCorta(p.fechaFin)}` : ""}
                      </span>
                    </p>
                  </div>
                  <ul className="flex flex-wrap gap-1.5" aria-label="Documentos del proyecto">
                    {tipos.map((t) => (
                      <li key={t} className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-xs", r.porTipo[t] ? "bg-slate-100 text-slate-700" : "bg-slate-50 text-slate-400")}>
                        <IconoDoc tipo={t} className="h-3.5 w-3.5" />
                        {cantidadDoc(t, r.porTipo[t])}
                      </li>
                    ))}
                    {r.cuentas.length > 0 && (
                      <li className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {r.cuentas.length} {r.cuentas.length === 1 ? "cuenta de cobro" : "cuentas de cobro"}
                      </li>
                    )}
                  </ul>
                  <dl className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                    <div className="min-w-0">
                      <dt className="text-slate-500">Cotizado</dt>
                      <dd className="truncate font-semibold tabular-nums text-slate-900">{cop(r.cotizado)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-slate-500">Cobrado</dt>
                      <dd className="truncate font-semibold tabular-nums text-slate-900">{cop(r.cobrado)}</dd>
                    </div>
                  </dl>
                  {interno && <BarraPresupuesto gastado={r.gastado} presupuesto={p.presupuesto} />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-slate-500">
        {lista.length} de {demo.proyectosVisibles.length} proyectos visibles para tu perfil
      </p>
    </div>
  );
}
