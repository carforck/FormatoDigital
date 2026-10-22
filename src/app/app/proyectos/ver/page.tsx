"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CircleDollarSign, FileText, Lock, MapPin, Pause, PenLine, Play, Plus, Receipt, Trash2, UserRound, Wallet } from "lucide-react";

import { BarraPresupuesto } from "@/components/proyectos/piezas";
import { Volver, marcarEdicion } from "@/components/ui/volver";
import { EstadoBadge, EstadoProyectoBadge, fechaCorta } from "@/components/ui/badges";
import { EstadoCuentaBadge } from "@/components/ui/estado-cuenta";
import { IconoDoc } from "@/components/ui/icono-doc";
import { cn } from "@/lib/utils";
import { totales } from "@/modulos/cobros/tipos";
import { TIPOS_DOC, cantidadDoc, formatoDe, rutaNuevo, tituloDoc, valorDoc } from "@/modulos/registro";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { cop } from "@/nucleo/letras";
import { puede, puedeVerProyecto } from "@/nucleo/permisos";
import { resumenProyecto } from "@/nucleo/proyectos";
import { rutaCuenta, rutaDoc } from "@/nucleo/rutas";
import type { TipoDoc } from "@/nucleo/tipos";

type Pestana = "todos" | TipoDoc | "cobros";

function Detalle() {
  const id = useSearchParams().get("id") ?? "";
  const demo = useDemo();
  const router = useRouter();
  const u = demo.usuario!;
  const [aviso, setAviso] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>("todos");
  const p = demo.proyectos.find((x) => x.id === id);

  if (!p || !puedeVerProyecto(u, p, demo.documentos)) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="font-semibold">Proyecto no disponible para este perfil</p>
        <Link href="/app/proyectos" className="mt-3 inline-block text-sm text-sotec-greenDeep underline">
          Ir a proyectos
        </Link>
      </div>
    );
  }

  const interno = u.rol !== "cliente";
  const gestiona = puede(u.rol, "proyectos");
  // Solo se crean documentos en proyectos abiertos (activos o en pausa)
  const crea = puede(u.rol, "crear") && p.estado !== "cerrado";
  const cliente = demo.clientes.find((c) => c.id === p.clienteId);
  const responsable = demo.usuarios.find((x) => x.id === p.responsableId);
  // Lo visible para el perfil: el cliente solo ve lo aprobado o cerrado de formatos visibles para él
  const r = resumenProyecto(p, demo.visibles, demo.cuentasVisibles);
  const tipos = TIPOS_DOC.filter((t) => interno || r.porTipo[t] > 0 || t === "reporte" || t === "cotizacion").filter((t) => interno || t !== "gasto");
  const verCobros = puede(u.rol, "ver_cobros");
  const autor = (uid: string) => demo.usuarios.find((x) => x.id === uid)?.nombre ?? "—";
  const docs = [...r.docs].sort((a, b) => b.creado.localeCompare(a.creado));
  const lista = pestana === "todos" ? docs : pestana === "cobros" ? [] : docs.filter((d) => d.tipo === pestana);
  const nuevoEn = (t: TipoDoc) => rutaNuevo(t, `proyecto=${p.id}`);

  const pestanas: { clave: Pestana; nombre: string; n: number }[] = [
    { clave: "todos", nombre: "Todos", n: r.docs.length },
    ...tipos.map((t) => ({ clave: t as Pestana, nombre: formatoDe(t).plural.replace(/^./, (x) => x.toUpperCase()), n: r.porTipo[t] })),
    ...(verCobros ? [{ clave: "cobros" as Pestana, nombre: "Cuentas de cobro", n: r.cuentas.length }] : []),
  ];

  const kpis = [
    { t: "Documentos", v: String(r.docs.length), d: tipos.map((t) => cantidadDoc(t, r.porTipo[t])).join(" · "), icon: FileText },
    { t: "Cotizado", v: cop(r.cotizado), d: `Aceptado por el cliente: ${cop(r.aceptado)}`, icon: CircleDollarSign },
    ...(interno ? [{ t: "Gastos legalizados", v: cop(r.gastado), d: "Con Vo.Bo. o reembolsados", icon: Wallet }] : []),
    ...(verCobros ? [{ t: "Cobrado", v: cop(r.cobrado), d: `Facturado: ${cop(r.facturado)}`, icon: Receipt }] : []),
  ];

  return (
    <div className="space-y-5">
      <Volver href="/app/proyectos" label="Volver a Proyectos" />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-slate-500">{p.codigo}</span>
              <EstadoProyectoBadge estado={p.estado} />
            </p>
            <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight text-slate-900">{p.nombre}</h1>
            <p className="break-words text-sm text-slate-600">{cliente?.nombre ?? "—"}</p>
          </div>
          {gestiona && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/app/proyectos/editar?id=${p.id}`} onClick={marcarEdicion} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
                <PenLine className="h-4 w-4" /> Editar
              </Link>
              {p.estado === "activo" && (
                <button onClick={() => demo.cambiarEstadoProyecto(p.id, "en_pausa")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
                  <Pause className="h-4 w-4" /> Pausar
                </button>
              )}
              {p.estado !== "activo" && (
                <button onClick={() => demo.cambiarEstadoProyecto(p.id, "activo")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
                  <Play className="h-4 w-4" /> Reactivar
                </button>
              )}
              {p.estado !== "cerrado" && (
                <button
                  onClick={() => confirm(`¿Cerrar el proyecto ${p.codigo}? Ya no se podrán crear documentos en él.`) && demo.cambiarEstadoProyecto(p.id, "cerrado")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  <Lock className="h-4 w-4" /> Cerrar proyecto
                </button>
              )}
              <button
                onClick={() => {
                  // Solo se elimina un proyecto vacío; con documentos se ofrece cerrarlo
                  const usos = demo.documentos.filter((d) => d.proyectoId === p.id).length + demo.cuentas.filter((c) => c.proyectoId === p.id).length;
                  if (usos) {
                    setAviso(`Este proyecto tiene ${usos} documento(s) o cuenta(s) de cobro y no se puede eliminar. Ciérralo para conservar su historial.`);
                    return;
                  }
                  if (!confirm(`¿Eliminar el proyecto ${p.codigo}? Esta acción no se puede deshacer.`)) return;
                  const error = demo.eliminarProyecto(p.id);
                  if (error) setAviso(error);
                  else router.replace("/app/proyectos");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
            </div>
          )}
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex min-w-0 gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">Sitio</dt>
              <dd className="break-words text-slate-800">{p.sitio || cliente?.sitio || "—"}</dd>
            </div>
          </div>
          <div className="flex min-w-0 gap-2">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">Responsable</dt>
              <dd className="break-words text-slate-800">{responsable?.nombre ?? "—"}</dd>
            </div>
          </div>
          <div className="flex min-w-0 gap-2">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">Fechas</dt>
              <dd className="text-slate-800">
                {fechaCorta(p.fechaInicio)} – {p.fechaFin ? fechaCorta(p.fechaFin) : "en curso"}
              </dd>
            </div>
          </div>
          {cliente && (
            <div className="flex min-w-0 gap-2">
              <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <div className="min-w-0">
                <dt className="text-xs text-slate-500">Contacto del cliente</dt>
                <dd className="break-words text-slate-800">
                  {cliente.contacto} · {cliente.cargo}
                </dd>
              </div>
            </div>
          )}
        </dl>
        {aviso && (
          <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="min-w-0 flex-1">{aviso}</p>
            {p.estado !== "cerrado" && (
              <button
                onClick={() => {
                  demo.cambiarEstadoProyecto(p.id, "cerrado");
                  setAviso(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sotec px-3 py-1.5 text-sm font-medium text-white hover:bg-black"
              >
                <Lock className="h-4 w-4" /> Cerrar el proyecto
              </button>
            )}
          </div>
        )}
        {p.descripcion && <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">{p.descripcion}</p>}
        {interno && (
          <div className="mt-4 max-w-xl">
            <BarraPresupuesto gastado={r.gastado} presupuesto={p.presupuesto} />
          </div>
        )}
      </section>

      <div className={cn("grid grid-cols-1 gap-3 min-[420px]:grid-cols-2", kpis.length > 3 ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
        {kpis.map((k) => (
          <div key={k.t} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sotec-soft text-sotec-greenDeep">
              <k.icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-slate-500">{k.t}</span>
              <span className="block truncate text-lg font-semibold tabular-nums text-slate-900">{k.v}</span>
              <span className="block text-[11px] text-slate-500">{k.d}</span>
            </span>
          </div>
        ))}
      </div>

      {crea && (
        <section aria-label="Nuevo documento en este proyecto" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Nuevo en este proyecto</h2>
          <p className="text-xs text-slate-500">El formato se abre con el cliente y el proyecto ya diligenciados.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TIPOS_DOC.map((t) => (
              <Link key={t} href={nuevoEn(t)} onClick={marcarEdicion} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:border-sotec-green hover:bg-slate-50">
                <Plus className="h-4 w-4" aria-hidden />
                <IconoDoc tipo={t} className="h-4 w-4 text-slate-500" /> {formatoDe(t).corto}
              </Link>
            ))}
            {puede(u.rol, "cobros") && (
              <Link href={`/app/cobros/nueva?proyecto=${p.id}&cliente=${p.clienteId}`} onClick={marcarEdicion} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:border-sotec-green hover:bg-slate-50">
                <Plus className="h-4 w-4" aria-hidden />
                <Receipt className="h-4 w-4 text-slate-500" aria-hidden /> Cuenta de cobro
              </Link>
            )}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div role="tablist" aria-label="Documentos del proyecto por tipo" className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-slate-100 px-2 pt-2">
          {pestanas.map((t) => (
            <button
              key={t.clave}
              role="tab"
              aria-selected={pestana === t.clave}
              onClick={() => setPestana(t.clave)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition",
                pestana === t.clave ? "border-sotec-greenDeep text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              {t.nombre}
              <span className="rounded-full bg-slate-100 px-1.5 text-[11px] tabular-nums text-slate-600">{t.n}</span>
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {pestana === "cobros" ? (
            r.cuentas.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                <p>Este proyecto aún no tiene cuentas de cobro.</p>
                {puede(u.rol, "cobros") && (
                  <Link href={`/app/cobros/nueva?proyecto=${p.id}&cliente=${p.clienteId}`} onClick={marcarEdicion} className="mt-2 inline-flex items-center gap-1 font-medium text-sotec-greenDeep hover:underline">
                    <Plus className="h-4 w-4" aria-hidden /> Crear la primera cuenta de cobro
                  </Link>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {r.cuentas.map((c) => (
                  <li key={c.id}>
                    <Link href={`${rutaCuenta(c.id)}&desde=proyecto:${p.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <Receipt className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          <span className="font-mono">{c.codigo}</span> · {c.concepto}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {fechaCorta(c.fecha)} · {cop(totales(c).total)}
                        </span>
                      </span>
                      <EstadoCuentaBadge estado={c.estado} />
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : lista.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">
              <p>No hay {pestana === "todos" ? "documentos" : formatoDe(pestana).plural} visibles en este proyecto.</p>
              {crea && pestana !== "todos" && (
                <Link href={nuevoEn(pestana)} onClick={marcarEdicion} className="mt-2 inline-flex items-center gap-1 font-medium text-sotec-greenDeep hover:underline">
                  <Plus className="h-4 w-4" aria-hidden /> {formatoDe(pestana).nuevo} {formatoDe(pestana).corto.toLowerCase()} en este proyecto
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lista.map((d) => {
                const v = valorDoc(d);
                return (
                  <li key={d.id}>
                    <Link href={rutaDoc(d.id, `&desde=proyecto:${p.id}`)} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <IconoDoc tipo={d.tipo} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          <span className="font-mono">{d.codigo}</span> · {tituloDoc(d)}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {formatoDe(d.tipo).corto} · {autor(d.autorId)} · {fechaCorta(d.creado)}
                          {v !== null && d.tipo !== "cotizacion" ? ` · ${cop(v)}` : ""}
                        </span>
                      </span>
                      <EstadoBadge estado={d.estado} tipo={d.tipo} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Detalle />
    </Suspense>
  );
}
