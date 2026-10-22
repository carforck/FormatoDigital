"use client";

import Link from "next/link";
import { marcarEdicion } from "@/components/ui/volver";
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, ChevronRight, FileText, MapPin, Plus, Search } from "lucide-react";

import { fechaCorta } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/corporativo";
import { cn } from "@/lib/utils";
import { sistemaDe } from "@/modulos/equipos/catalogo";
import { coincide, porSistema, puedeEditarEquipos, puedeVerEquipo, resumenHistorial } from "@/modulos/equipos/logica";
import { EstadoEquipoBadge, IconoEquipo, IconoSistema } from "@/modulos/equipos/piezas";
import type { Equipo } from "@/modulos/equipos/tipos";
import { useEquipos } from "@/modulos/equipos/useEquipos";


function Equipos() {
  const demo = useEquipos();
  const u = demo.usuario!;
  const interno = u.rol !== "cliente";
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [q, setQ] = useState("");
  const [verRetirados, setVerRetirados] = useState(false);

  // El cliente ve solo su empresa; el equipo interno elige el cliente (queda en la URL para compartir o volver)
  const clienteId = interno ? params.get("cliente") ?? "" : u.clienteId ?? "";
  const sistema = params.get("sistema") ?? "";
  const ir = (cambios: Record<string, string>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(cambios)) (v ? sp.set(k, v) : sp.delete(k));
    router.replace(`${path}${sp.toString() ? `?${sp}` : ""}`, { scroll: false });
  };

  const todos = demo.equipos.filter((e) => puedeVerEquipo(u, e));
  const resumen = resumenHistorial(demo.visibles);
  const cliente = demo.clientes.find((c) => c.id === clienteId);
  const clientes = interno ? demo.clientes : demo.clientes.filter((c) => c.id === u.clienteId);
  const delCliente = todos.filter((e) => !clienteId || e.clienteId === clienteId);
  const retirados = delCliente.filter((e) => e.estado === "retirado").length;
  const activos = delCliente.filter((e) => verRetirados || e.estado !== "retirado");
  const porSis = porSistema(activos);
  const lista = activos.filter((e) => (!sistema || e.sistema === sistema) && coincide(e, q));
  const grupos = porSistema(lista);
  const crea = puedeEditarEquipos(u.rol);
  const nuevoHref = `/app/equipos/ver?nuevo=1${clienteId ? `&cliente=${clienteId}` : ""}${sistema ? `&sistema=${sistema}` : ""}`;
  const elegirCliente = interno && !clienteId && !q.trim();

  return (
    <div className="space-y-4">
      <PageHeader
        etiqueta="Gestión"
        titulo="Equipos"
        descripcion={interno ? "Inventario de cada cliente por sistema, con el historial de reportes de cada equipo." : "Los equipos instalados en tu empresa y el historial de servicios de cada uno."}
        acciones={
          crea && (
            <Link href={nuevoHref} onClick={marcarEdicion} className="inline-flex items-center gap-2 rounded-lg bg-sotec px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-black">
              <Plus className="h-4 w-4" aria-hidden /> Nuevo equipo
            </Link>
          )
        }
      />

      <label className="relative block">
        <span className="sr-only">Buscar equipo</span>
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={cliente || !interno ? "Buscar por nombre, tipo, marca, serial o ubicación…" : "Buscar en todos los clientes…"}
          className="w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-2 text-sm"
        />
      </label>

      {interno && clienteId && (
        <nav aria-label="Cliente" className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => ir({ cliente: "", sistema: "" })} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
            Todos los clientes
          </button>
          {clientes.map((c) => {
            const n = todos.filter((e) => e.clienteId === c.id && e.estado !== "retirado").length;
            const on = c.id === clienteId;
            return (
              <button key={c.id} type="button" aria-pressed={on} onClick={() => ir({ cliente: c.id, sistema: "" })} className={cn("max-w-full truncate rounded-full border px-3 py-1 text-xs font-medium", on ? "border-sotec bg-sotec text-white" : "border-slate-200 bg-white text-slate-700 hover:border-sotec-greenDeep")}>
                {c.nombre} <span className={on ? "text-white/80" : "text-slate-500"}>({n})</span>
              </button>
            );
          })}
        </nav>
      )}

      {elegirCliente ? (
        <section aria-labelledby="titulo-clientes">
          <h2 id="titulo-clientes" className="mb-2 text-sm font-semibold text-slate-700">
            1. Elige el cliente
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {clientes.map((c) => {
              const eqs = todos.filter((e) => e.clienteId === c.id && e.estado !== "retirado");
              const fallas = eqs.filter((e) => e.estado === "con_falla" || e.estado === "fuera_servicio").length;
              const sis = porSistema(eqs);
              return (
                <li key={c.id} className="min-w-0">
                  <button type="button" onClick={() => ir({ cliente: c.id })} className="flex h-full w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sotec-greenDeep hover:shadow-md">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sotec text-sotec-green">
                      <Building2 className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-semibold text-slate-900">{c.nombre}</span>
                      <span className="block text-sm text-slate-600">
                        {eqs.length ? `${eqs.length} ${eqs.length === 1 ? "equipo" : "equipos"}` : "Sin equipos aún"}
                        {fallas ? ` · ${fallas} con falla o fuera de servicio` : ""}
                      </span>
                      {sis.length > 0 && (
                        <span className="mt-2 flex flex-wrap gap-1">
                          {sis.map((g) => (
                            <span key={g.sistema} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700">
                              <IconoSistema sistema={g.sistema} className="h-3 w-3" /> {sistemaDe(g.sistema).corto} {g.equipos.length}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <>
          {porSis.length > 0 && (
            <nav aria-label="Sistema" className="flex flex-wrap gap-1.5">
              {[{ clave: "", nombre: "Todos", n: activos.length }, ...porSis.map((g) => ({ clave: g.sistema as string, nombre: sistemaDe(g.sistema).nombre, n: g.equipos.length }))].map((s) => {
                const on = sistema === s.clave;
                return (
                  <button key={s.clave || "todos"} type="button" aria-pressed={on} onClick={() => ir({ sistema: s.clave })} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium", on ? "border-sotec bg-sotec text-white" : "border-slate-200 bg-white text-slate-700 hover:border-sotec-greenDeep")}>
                    {s.clave && <IconoSistema sistema={s.clave} />}
                    {s.nombre}
                    <span className={cn("rounded-full px-1.5 text-xs tabular-nums", on ? "bg-white/20" : "bg-slate-100 text-slate-600")}>{s.n}</span>
                  </button>
                );
              })}
            </nav>
          )}
          {retirados > 0 && (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={verRetirados} onChange={(e) => setVerRetirados(e.target.checked)} className="h-4 w-4" />
              Mostrar retirados ({retirados})
            </label>
          )}

          {lista.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="font-medium text-slate-800">{q.trim() ? "Ningún equipo coincide con la búsqueda." : `${cliente ? cliente.nombre : "Este cliente"} aún no tiene equipos registrados.`}</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                {interno
                  ? "Los equipos se crean solos cuando el técnico los marca en un reporte técnico («Nuevo equipo» en el paso de equipos atendidos). También puedes registrarlos aquí."
                  : "Cuando nuestros técnicos registren los equipos atendidos en tus reportes, aparecerán aquí con su historial."}
              </p>
              {crea && !q.trim() && (
                <Link href={nuevoHref} onClick={marcarEdicion} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
                  <Plus className="h-4 w-4" aria-hidden /> Registrar un equipo
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {grupos.map((g) => (
                <section key={g.sistema} aria-labelledby={`sis-${g.sistema}`}>
                  <h2 id={`sis-${g.sistema}`} className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <IconoSistema sistema={g.sistema} /> {sistemaDe(g.sistema).nombre}
                    <span className="font-normal text-slate-500">· {g.equipos.length}</span>
                  </h2>
                  <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {g.equipos.map((e) => (
                      <TarjetaEquipo key={e.id} e={e} href={`/app/equipos/ver?id=${e.id}${interno ? `&cliente=${clienteId || e.clienteId}` : ""}${sistema ? `&sistema=${sistema}` : ""}`} resumen={resumen.get(e.id)} cliente={!clienteId ? demo.clientes.find((c) => c.id === e.clienteId)?.nombre : undefined} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500">
            {lista.length} de {delCliente.length} equipos{cliente ? ` de ${cliente.nombre}` : ""}
          </p>
        </>
      )}
    </div>
  );
}

function TarjetaEquipo({ e, href, resumen, cliente }: { e: Equipo; href: string; resumen?: { n: number; ultimo: string }; cliente?: string }) {
  const detalle = [e.tipo, [e.marca, e.modelo].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
  return (
    <li className="min-w-0">
      <Link href={href} className={cn("flex h-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-sotec-greenDeep hover:shadow-md", e.estado === "retirado" && "opacity-70")}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sotec-soft text-sotec-greenDeep">
          <IconoEquipo tipo={e.tipo} sistema={e.sistema} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <span className="min-w-0 break-words font-semibold text-slate-900">{e.nombre}</span>
            <EstadoEquipoBadge estado={e.estado} />
          </span>
          <span className="block break-words text-sm text-slate-600">{detalle}</span>
          {cliente && <span className="block break-words text-xs text-slate-500">{cliente}</span>}
          {e.ubicacion && (
            <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /> <span className="min-w-0 break-words">{e.ubicacion}</span>
            </span>
          )}
          <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {resumen ? `${resumen.n} ${resumen.n === 1 ? "reporte" : "reportes"} · último ${fechaCorta(resumen.ultimo)}` : "Sin reportes todavía"}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Equipos />
    </Suspense>
  );
}
