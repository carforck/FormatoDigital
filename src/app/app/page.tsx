"use client";

import Link from "next/link";
import { CheckCircle2, Clock, FileText, HardHat, Timer, XCircle } from "lucide-react";

import { Contador } from "@/components/fx/Reveal";
import { EstadoBadge, fechaCorta } from "@/components/ui/badges";
import { ETIQUETA_ROL, FORMATOS } from "@/lib/formatos";
import { puede } from "@/lib/permisos";
import { rutaDoc } from "@/lib/base";
import { useDemo } from "@/lib/store";
import type { Estado } from "@/lib/types";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function Tablero() {
  const demo = useDemo();
  const u = demo.usuario!;
  const docs = demo.visibles;
  const cuenta = (e: Estado) => docs.filter((d) => d.estado === e).length;

  // Últimos 6 meses (hasta el mes actual)
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
    { label: "Documentos", valor: docs.length, icon: FileText, nota: `${docs.filter((d) => d.tipo === "reporte").length} reportes · ${docs.filter((d) => d.tipo === "permiso").length} permisos` },
    { label: "En revisión", valor: cuenta("en_revision"), icon: Clock, nota: "Esperando al Coordinador SST" },
    { label: "Aprobados / cerrados", valor: cuenta("aprobado") + cuenta("cerrado"), icon: CheckCircle2, nota: `${cuenta("cerrado")} cerrados con firma` },
    { label: "Rechazados", valor: cuenta("rechazado"), icon: XCircle, nota: "Vuelven al autor con el motivo" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{ETIQUETA_ROL[u.rol]}</p>
          <h1 className="text-2xl font-semibold">Hola, {u.nombre.split(" ")[0]}</h1>
        </div>
        {puede(u.rol, "crear") && (
          <div className="flex gap-2">
            <Link href="/app/nuevo/reporte" className="inline-flex items-center gap-2 rounded-md bg-sotec px-3 py-2 text-sm font-medium text-white hover:bg-sotec/90">
              <FileText className="h-4 w-4" /> Reporte técnico
            </Link>
            <Link href="/app/nuevo/permiso" className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
              <HardHat className="h-4 w-4" /> Permiso de trabajo
            </Link>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm text-slate-500">
              {k.label} <k.icon className="h-4 w-4" />
            </div>
            <p className="mt-1 text-3xl font-semibold">
              <Contador valor={k.valor} duracion={900} />
            </p>
            <p className="text-xs text-slate-500">{k.nota}</p>
          </div>
        ))}
      </div>

      {u.rol !== "cliente" && (
        <div className="flex items-center gap-3 rounded-xl border border-sotec-green/50 bg-sotec-soft p-4 text-sm">
          <Timer className="h-5 w-5 shrink-0 text-sotec-greenDeep" />
          <p>
            <strong>{(docs.length * 41).toLocaleString("es-CO")} minutos ahorrados</strong> estimados este semestre: un formato en papel toma ~50 min entre diligenciar, firmar, escanear y buscarlo; con el asistente, ~9 min.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Documentos por mes</h2>
          <div className="mt-1 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <i className="h-2.5 w-2.5 rounded-sm bg-sotec" /> Reportes
            </span>
            <span className="flex items-center gap-1">
              <i className="h-2.5 w-2.5 rounded-sm bg-sotec-green" /> Permisos
            </span>
          </div>
          <div className="mt-4 flex h-44 items-end gap-3">
            {meses.map((m) => (
              <div key={m.etiqueta} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs tabular-nums text-slate-600">{m.reportes + m.permisos || ""}</span>
                <div className="flex w-full max-w-[44px] origin-bottom animate-grow-y flex-col-reverse overflow-hidden rounded-t" style={{ height: `${((m.reportes + m.permisos) / max) * 140}px`, animationDelay: `${meses.indexOf(m) * 90}ms` }}>
                  <div className="bg-sotec" style={{ flex: m.reportes }} title={`${m.reportes} reportes`} />
                  <div className="border-b-2 border-white bg-sotec-green" style={{ flex: m.permisos }} title={`${m.permisos} permisos`} />
                </div>
                <span className="text-xs text-slate-500">{m.etiqueta}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Por cliente</h2>
          <div className="mt-4 space-y-3">
            {porCliente.map((c) => (
              <div key={c.nombre}>
                <div className="flex justify-between text-sm">
                  <span>{c.nombre}</span>
                  <span className="tabular-nums text-slate-500">{c.n}</span>
                </div>
                <div className="mt-1 h-2 rounded bg-slate-100">
                  <div className="h-2 origin-left animate-grow-x rounded bg-sotec-greenDeep" style={{ width: `${(c.n / maxC) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Actividad reciente</h2>
          <Link href="/app/documentos" className="text-sm text-sotec-greenDeep hover:underline">
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
                  {d.tipo === "reporte" ? <FileText className="h-4 w-4 text-slate-500" /> : <HardHat className="h-4 w-4 text-slate-500" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      <span className="font-mono">{d.codigo}</span> · {d.tipo === "reporte" ? d.datos.asunto : d.datos.actividades}
                    </p>
                    <p className="text-xs text-slate-500">
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
