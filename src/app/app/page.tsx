"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Clock, FileText, HardHat, PenLine, Timer, XCircle } from "lucide-react";

import { Contador } from "@/components/fx/Reveal";
import { EstadoBadge, fechaCorta } from "@/components/ui/badges";
import { fechaLarga, nombreCorto, saludo } from "@/components/ui/corporativo";
import { rutaDoc } from "@/nucleo/rutas";
import { ETIQUETA_ROL, FORMATOS } from "@/nucleo/catalogos";
import { puede } from "@/nucleo/permisos";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import type { Documento, Estado } from "@/nucleo/tipos";
import { cn } from "@/lib/utils";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
// Paleta validada con validate_palette.js (modo claro): pasa las 6 comprobaciones.
const C_REPORTE = "#4F6FD0";
const C_PERMISO = "#4E9A2A";

function titulo(d: Documento) {
  return d.tipo === "reporte" ? d.datos.asunto : d.datos.actividades;
}

export default function Tablero() {
  const demo = useDemo();
  const u = demo.usuario!;
  const docs = demo.visibles;
  const cuenta = (e: Estado) => docs.filter((d) => d.estado === e).length;
  const [hover, setHover] = useState<number | null>(null);

  const base = new Date();
  const meses = Array.from({ length: 6 }).map((_, k) => {
    const dt = new Date(base.getFullYear(), base.getMonth() - 5 + k, 1);
    const clave = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const del = docs.filter((d) => d.creado.startsWith(clave));
    return { etiqueta: MESES[dt.getMonth()], reportes: del.filter((d) => d.tipo === "reporte").length, permisos: del.filter((d) => d.tipo === "permiso").length };
  });
  const max = Math.max(1, ...meses.map((m) => m.reportes + m.permisos));

  const porCliente = demo.clientes
    .map((c) => ({ nombre: c.nombre, n: docs.filter((d) => d.clienteId === c.id).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const maxC = Math.max(1, ...porCliente.map((x) => x.n));

  const kpis = [
    { label: "Documentos", valor: docs.length, icon: FileText, nota: `${docs.filter((d) => d.tipo === "reporte").length} reportes · ${docs.filter((d) => d.tipo === "permiso").length} permisos`, tono: "bg-slate-100 text-slate-700" },
    { label: "En revisión", valor: cuenta("en_revision"), icon: Clock, nota: "Esperando al Coordinador SST", tono: "bg-amber-50 text-amber-700" },
    { label: "Aprobados / cerrados", valor: cuenta("aprobado") + cuenta("cerrado"), icon: CheckCircle2, nota: `${cuenta("cerrado")} cerrados con firma`, tono: "bg-emerald-50 text-emerald-700" },
    { label: "Rechazados", valor: cuenta("rechazado"), icon: XCircle, nota: "Vuelven al autor con el motivo", tono: "bg-rose-50 text-rose-700" },
  ];

  // Lo que este perfil tiene que hacer ahora
  const pendientes: { d: Documento; accion: string }[] = [];
  if (puede(u.rol, "revisar")) docs.filter((d) => d.estado === "en_revision").forEach((d) => pendientes.push({ d, accion: "Revisar" }));
  if (puede(u.rol, "cerrar_permiso")) docs.filter((d) => d.tipo === "permiso" && d.estado === "aprobado").forEach((d) => pendientes.push({ d, accion: "Cerrar permiso" }));
  if (u.rol === "cliente") docs.filter((d) => d.tipo === "reporte" && d.estado === "aprobado").forEach((d) => pendientes.push({ d, accion: "Firmar" }));
  docs.filter((d) => d.autorId === u.id && (d.estado === "rechazado" || d.estado === "borrador")).forEach((d) => pendientes.push({ d, accion: d.estado === "rechazado" ? "Corregir" : "Completar" }));

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm capitalize text-slate-500">{fechaLarga()}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
            {saludo()}, {nombreCorto(u.nombre)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {ETIQUETA_ROL[u.rol]} · {u.cargo}
          </p>
        </div>
        {puede(u.rol, "crear") && (
          <div className="hidden gap-2 sm:flex">
            <Link href="/app/nuevo/reporte" className="inline-flex items-center gap-2 rounded-lg bg-sotec px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-black">
              <FileText className="h-4 w-4" /> Nuevo reporte técnico
            </Link>
            <Link href="/app/nuevo/permiso" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-slate-50">
              <HardHat className="h-4 w-4" /> Nuevo permiso
            </Link>
          </div>
        )}
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-slate-500 sm:text-sm">{k.label}</p>
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", k.tono)}>
                <k.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              <Contador valor={k.valor} duracion={900} />
            </p>
            <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">{k.nota}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        {/* Pendientes */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Pendientes para ti</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{pendientes.length}</span>
          </div>
          {pendientes.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Estás al día. No tienes documentos por atender.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pendientes.slice(0, 5).map(({ d, accion }) => (
                <li key={d.id + accion}>
                  <Link href={rutaDoc(d.id)} className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      {d.tipo === "reporte" ? <FileText className="h-4 w-4" /> : <HardHat className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        <span className="font-mono">{d.codigo}</span> · {titulo(d)}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{d.datos.cliente}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 rounded-lg bg-sotec-soft px-2.5 py-1 text-xs font-semibold text-sotec-greenDeep group-hover:bg-sotec group-hover:text-sotec-green">
                      {accion === "Firmar" && <PenLine className="h-3.5 w-3.5" />}
                      <span className="hidden min-[380px]:inline">{accion}</span> <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Ahorro */}
        {u.rol !== "cliente" ? (
          <section className="relative overflow-hidden rounded-xl bg-sotec p-5 text-white shadow-sm">
            <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sotec-green/15 blur-2xl" />
            <p className="flex items-center gap-2 text-sm text-white/70">
              <Timer className="h-4 w-4 text-sotec-green" /> Tiempo ahorrado este semestre
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-sotec-green">
              <Contador valor={docs.length * 41} formato={(n) => `${Math.round(n).toLocaleString("es-CO")} min`} />
            </p>
            <p className="mt-2 text-sm text-white/60">
              Estimado: ~50 min por formato en papel (diligenciar, firmar, escanear y buscar) frente a ~9 min con el asistente.
            </p>
          </section>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Portal del cliente</p>
            <p className="mt-1 font-semibold text-slate-900">Tus reportes de servicio, siempre a la mano</p>
            <p className="mt-2 text-sm text-slate-600">Consulta cada visita técnica de SOTEC, descarga el PDF y firma en línea los reportes aprobados.</p>
          </section>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900">Documentos por mes</h2>
            <div className="flex gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-sm" style={{ background: C_REPORTE }} /> Reportes
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-sm" style={{ background: C_PERMISO }} /> Permisos
              </span>
            </div>
          </div>
          <div className="relative mt-4 flex h-48 items-end gap-2 border-b border-slate-200 sm:gap-4" onPointerLeave={() => setHover(null)}>
            {meses.map((m, k) => {
              const total = m.reportes + m.permisos;
              return (
                <div key={m.etiqueta} className="relative flex h-full flex-1 flex-col items-center justify-end" onPointerEnter={() => setHover(k)} tabIndex={0} onFocus={() => setHover(k)} aria-label={`${m.etiqueta}: ${m.reportes} reportes y ${m.permisos} permisos`}>
                  {hover === k && (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                      <p className="font-semibold text-slate-900">{m.etiqueta}</p>
                      <p className="flex items-center gap-1.5 text-slate-600">
                        <i className="inline-block h-0.5 w-3" style={{ background: C_REPORTE }} />
                        <strong className="text-slate-900">{m.reportes}</strong> reportes
                      </p>
                      <p className="flex items-center gap-1.5 text-slate-600">
                        <i className="inline-block h-0.5 w-3" style={{ background: C_PERMISO }} />
                        <strong className="text-slate-900">{m.permisos}</strong> permisos
                      </p>
                    </div>
                  )}
                  <span className="mb-1 text-xs tabular-nums text-slate-500">{total || ""}</span>
                  <div
                    className={cn("flex w-full max-w-[40px] origin-bottom animate-grow-y flex-col-reverse gap-[2px] transition-opacity", hover !== null && hover !== k && "opacity-50")}
                    style={{ height: `${(total / max) * 150}px`, animationDelay: `${k * 90}ms` }}
                  >
                    {m.reportes > 0 && <div style={{ flex: m.reportes, background: C_REPORTE, borderRadius: m.permisos ? 0 : "4px 4px 0 0" }} />}
                    {m.permisos > 0 && <div style={{ flex: m.permisos, background: C_PERMISO, borderRadius: "4px 4px 0 0" }} />}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex gap-2 sm:gap-4">
            {meses.map((m) => (
              <span key={m.etiqueta} className="flex-1 text-center text-xs text-slate-500">
                {m.etiqueta}
              </span>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Documentos por cliente</h2>
          <div className="mt-4 space-y-3.5">
            {porCliente.map((c) => (
              <div key={c.nombre}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">{c.nombre}</span>
                  <span className="font-medium tabular-nums text-slate-900">{c.n}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-slate-100">
                  <div className="h-2 origin-left animate-grow-x rounded-full" style={{ width: `${(c.n / maxC) * 100}%`, background: C_PERMISO }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Actividad reciente</h2>
          <Link href="/app/documentos" className="text-sm font-medium text-sotec-greenDeep hover:underline">
            Ver todos
          </Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {[...docs]
            .sort((a, b) => b.actualizado.localeCompare(a.actualizado))
            .slice(0, 6)
            .map((d) => (
              <li key={d.id}>
                <Link href={rutaDoc(d.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    {d.tipo === "reporte" ? <FileText className="h-4 w-4" /> : <HardHat className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      <span className="font-mono">{d.codigo}</span> · {titulo(d)}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {FORMATOS[d.tipo].corto} · {d.datos.cliente} · {fechaCorta(d.creado)}
                    </p>
                  </div>
                  <EstadoBadge estado={d.estado} />
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
