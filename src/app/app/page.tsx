"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Clock, FileText, FilterX, Gauge, HardHat, PenLine, Receipt, Timer, Wallet } from "lucide-react";

import { Contador } from "@/components/fx/Reveal";
import { BarrasFiltro, BarrasMes, Kpi, Sparkline, Variacion } from "@/components/tablero/piezas";
import { EstadoBadge, fechaCorta } from "@/components/ui/badges";
import { fechaLarga, nombreCorto, saludo } from "@/components/ui/corporativo";
import { IconoDoc } from "@/components/ui/icono-doc";
import { cn } from "@/lib/utils";
import { totales } from "@/modulos/cobros/tipos";
import { clienteDoc, tituloDoc } from "@/modulos/registro";
import { ETIQUETA_ESTADO, ETIQUETA_ROL, FORMATOS } from "@/nucleo/catalogos";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import {
  ESTADOS_ORDEN,
  PERIODOS,
  TIPOS_ORDEN,
  enRango,
  horasAprobacion,
  meses as mesesDe,
  pendientes as pendientesDe,
  rango,
  tasaFirmaCliente,
  tasaPrimerIntento,
  variacion,
  type Periodo,
} from "@/nucleo/indicadores";
import { cop } from "@/nucleo/letras";
import { puede } from "@/nucleo/permisos";
import { rutaDoc } from "@/nucleo/rutas";
import type { Documento, Estado, TipoDoc } from "@/nucleo/tipos";

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)} %`);
const horas = (h: number | null) => (h === null ? "—" : h < 24 ? `${h.toLocaleString("es-CO", { maximumFractionDigits: 1 })} h` : `${(h / 24).toLocaleString("es-CO", { maximumFractionDigits: 1 })} días`);

export default function Tablero() {
  const demo = useDemo();
  const u = demo.usuario!;
  const [periodo, setPeriodo] = useState<Periodo>("90d");
  const [tipo, setTipo] = useState<TipoDoc | "todos">("todos");
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cliente, setCliente] = useState<string | null>(null);

  const r = rango(periodo);
  const base = useMemo(
    () => demo.visibles.filter((d) => (tipo === "todos" || d.tipo === tipo) && (!cliente || d.clienteId === cliente)),
    [demo.visibles, tipo, cliente],
  );
  const actual = base.filter((d) => enRango(d, r.desde, r.hasta));
  const anterior = base.filter((d) => enRango(d, r.prevDesde, r.prevHasta));
  const lista = estado ? actual.filter((d) => d.estado === estado) : actual;

  // Series de 6 meses para las minigráficas (sin filtro de período)
  const serie = mesesDe(base, 6);
  const etiquetas = serie.map((m) => m.etiqueta);

  const k = {
    total: actual.length,
    totalVar: variacion(actual.length, anterior.length),
    primer: tasaPrimerIntento(actual),
    primerAnt: tasaPrimerIntento(anterior),
    horas: horasAprobacion(actual),
    horasAnt: horasAprobacion(anterior),
    pend: pendientesDe(base),
    firma: tasaFirmaCliente(actual),
    firmaAnt: tasaFirmaCliente(anterior),
  };
  const diff = (a: number | null, b: number | null) => (a === null || b === null ? null : a - b);

  const tipos = TIPOS_ORDEN.filter((t) => (tipo === "todos" ? demo.visibles.some((d) => d.tipo === t) : t === tipo));
  const mesesGrafica = serie.map((m) => ({ etiqueta: m.etiqueta, reporte: m.docs.filter((d) => d.tipo === "reporte").length, permiso: m.docs.filter((d) => d.tipo === "permiso").length, gasto: m.docs.filter((d) => d.tipo === "gasto").length }));

  const filasEstado = ESTADOS_ORDEN.map((e) => ({ clave: e, nombre: ETIQUETA_ESTADO[e], valor: actual.filter((d) => d.estado === e).length })).filter((f) => f.valor > 0 || f.clave === estado);
  const filasCliente = demo.clientes
    .map((c) => ({ clave: c.id, nombre: c.nombre, valor: demo.visibles.filter((d) => d.clienteId === c.id && enRango(d, r.desde, r.hasta) && (tipo === "todos" || d.tipo === tipo)).length }))
    .filter((f) => f.valor > 0 || f.clave === cliente)
    .sort((a, b) => b.valor - a.valor);

  // Finanzas (administración)
  const finanzas = puede(u.rol, "cobros");
  const porCobrar = demo.cuentasVisibles.filter((c) => c.estado === "emitida" || c.estado === "enviada").reduce((a, c) => a + totales(c).total, 0);
  const cobrado = demo.cuentasVisibles.filter((c) => c.estado === "pagada").reduce((a, c) => a + totales(c).total, 0);
  const gastosPend = demo.visibles.filter((d) => d.tipo === "gasto" && (d.estado === "en_revision" || d.estado === "aprobado")).length;

  // Lo que este perfil tiene que hacer ahora (sin filtro: es su bandeja)
  const docs = demo.visibles;
  const pendientes: { d: Documento; accion: string }[] = [];
  if (puede(u.rol, "revisar")) docs.filter((d) => d.estado === "en_revision").forEach((d) => pendientes.push({ d, accion: "Revisar" }));
  if (puede(u.rol, "cerrar_permiso")) docs.filter((d) => d.tipo === "permiso" && d.estado === "aprobado").forEach((d) => pendientes.push({ d, accion: "Cerrar permiso" }));
  if (puede(u.rol, "revisar")) docs.filter((d) => d.tipo === "gasto" && d.estado === "aprobado").forEach((d) => pendientes.push({ d, accion: "Reembolsar" }));
  if (u.rol === "cliente") docs.filter((d) => d.tipo === "reporte" && d.estado === "aprobado").forEach((d) => pendientes.push({ d, accion: "Firmar" }));
  docs.filter((d) => d.autorId === u.id && (d.estado === "rechazado" || d.estado === "borrador")).forEach((d) => pendientes.push({ d, accion: d.estado === "rechazado" ? "Corregir" : "Completar" }));

  const hayFiltros = tipo !== "todos" || estado !== null || cliente !== null;
  const nombreCliente = demo.clientes.find((c) => c.id === cliente)?.nombre;
  const nombrePeriodo = PERIODOS.find((p) => p.clave === periodo)!.nombre;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{fechaLarga()}</p>
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
              <FileText className="h-4 w-4" /> Reporte técnico
            </Link>
            <Link href="/app/nuevo/permiso" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-slate-50">
              <HardHat className="h-4 w-4" /> Permiso
            </Link>
            <Link href="/app/nuevo/gasto" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-slate-50">
              <Wallet className="h-4 w-4" /> Gastos
            </Link>
          </div>
        )}
      </div>

      {/* Filtros: aplican a todo lo de abajo */}
      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Filtros del tablero">
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p.clave} onClick={() => setPeriodo(p.clave)} aria-pressed={periodo === p.clave} className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition sm:text-sm", periodo === p.clave ? "bg-sotec text-white" : "text-slate-600 hover:bg-slate-100")}>
              {p.nombre}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm" role="group" aria-label="Tipo de documento">
          {(["todos", ...TIPOS_ORDEN] as const)
            .filter((t) => t === "todos" || demo.visibles.some((d) => d.tipo === t))
            .map((t) => (
              <button key={t} onClick={() => setTipo(t)} aria-pressed={tipo === t} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition sm:text-sm", tipo === t ? "bg-sotec text-white" : "text-slate-600 hover:bg-slate-100")}>
                {t !== "todos" && <IconoDoc tipo={t} className="h-3.5 w-3.5" />}
                {t === "todos" ? "Todos" : FORMATOS[t].corto.replace(" de trabajo", "").replace("Legalización de gastos", "Gastos")}
              </button>
            ))}
        </div>
        {estado && <span className="rounded-full bg-sotec-soft px-2.5 py-1 text-xs font-medium text-sotec-greenDeep">Estado: {ETIQUETA_ESTADO[estado]}</span>}
        {nombreCliente && <span className="rounded-full bg-sotec-soft px-2.5 py-1 text-xs font-medium text-sotec-greenDeep">Cliente: {nombreCliente}</span>}
        {hayFiltros && (
          <button onClick={() => (setTipo("todos"), setEstado(null), setCliente(null))} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">
            <FilterX className="h-3.5 w-3.5" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Indicadores relativos */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
        <Kpi
          titulo={`Documentos · ${nombrePeriodo}`}
          icon={FileText}
          tono="bg-slate-100 text-slate-700"
          valor={<Contador valor={k.total} duracion={800} />}
          contexto={tipos.map((t) => `${actual.filter((d) => d.tipo === t).length} ${t === "reporte" ? "reportes" : t === "permiso" ? "permisos" : "gastos"}`).join(" · ")}
          variacion={<Variacion valor={k.totalVar} />}
          serie={<Sparkline valores={serie.map((m) => m.docs.length)} etiquetas={etiquetas} />}
          onClick={estado ? () => setEstado(null) : undefined}
        />
        <Kpi
          titulo="Aprobados al primer intento"
          icon={CheckCircle2}
          tono="bg-emerald-50 text-emerald-700"
          valor={pct(k.primer)}
          contexto={`${actual.filter((d) => d.estado === "aprobado" || d.estado === "cerrado").length} aprobados o cerrados · ${actual.filter((d) => d.estado === "rechazado").length} rechazados`}
          variacion={<Variacion valor={diff(k.primer, k.primerAnt)} unidad="pp" />}
          serie={<Sparkline valores={serie.map((m) => tasaPrimerIntento(m.docs))} etiquetas={etiquetas} formato={(n) => pct(n)} />}
          activo={estado === "rechazado"}
          onClick={() => setEstado(estado === "rechazado" ? null : "rechazado")}
        />
        <Kpi
          titulo="Tiempo promedio de aprobación"
          icon={Gauge}
          tono="bg-sky-50 text-sky-800"
          valor={horas(k.horas)}
          contexto="Desde que se envía hasta que se aprueba"
          variacion={<Variacion valor={variacion(k.horas, k.horasAnt)} mejorSi="baja" />}
          serie={<Sparkline valores={serie.map((m) => horasAprobacion(m.docs))} etiquetas={etiquetas} formato={(n) => horas(n)} />}
        />
        <Kpi
          titulo="En revisión ahora"
          icon={Clock}
          tono="bg-amber-50 text-amber-700"
          valor={<Contador valor={k.pend.cantidad} duracion={800} />}
          contexto={k.pend.cantidad ? `El más antiguo lleva ${horas(k.pend.diasMax * 24)}` : "Bandeja al día"}
          variacion={k.firma !== null ? <span className="text-[11px] text-slate-500">{pct(k.firma)} de los reportes ya tienen la firma del cliente</span> : undefined}
          activo={estado === "en_revision"}
          onClick={() => setEstado(estado === "en_revision" ? null : "en_revision")}
        />
      </div>

      {finanzas && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { t: "Cartera por cobrar", v: cop(porCobrar), d: "Cuentas emitidas o enviadas", icon: Receipt, href: "/app/cobros" },
            { t: "Cobrado", v: cop(cobrado), d: "Cuentas pagadas", icon: CheckCircle2, href: "/app/cobros" },
            { t: "Gastos por legalizar o reembolsar", v: String(gastosPend), d: "Legalizaciones en revisión o aprobadas", icon: Wallet, href: "/app/documentos" },
          ].map((f) => (
            <Link key={f.t} href={f.href} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sotec-green hover:shadow-md">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sotec-soft text-sotec-greenDeep">
                <f.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-slate-500">{f.t}</span>
                <span className="block truncate text-lg font-semibold tabular-nums text-slate-900">{f.v}</span>
                <span className="block text-[11px] text-slate-500">{f.d}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-sotec-greenDeep" />
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Documentos por mes</h2>
          <p className="text-xs text-slate-500">Últimos 6 meses{nombreCliente ? ` · ${nombreCliente}` : ""}</p>
          <div className="mt-3">
            <BarrasMes meses={mesesGrafica} tipos={tipos} />
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Estado de los documentos</h2>
          <p className="text-xs text-slate-500">{nombrePeriodo} · toca un estado para filtrar</p>
          <div className="mt-3">
            <BarrasFiltro filas={filasEstado} activo={estado} onElegir={(c) => setEstado(c as Estado | null)} color="var(--serie-a)" />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.5fr] [&>*]:min-w-0">
        {u.rol !== "cliente" && filasCliente.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-900">Documentos por cliente</h2>
            <p className="text-xs text-slate-500">{nombrePeriodo} · toca un cliente para ver solo lo suyo</p>
            <div className="mt-3">
              <BarrasFiltro filas={filasCliente} activo={cliente} onElegir={setCliente} />
            </div>
          </section>
        ) : (
          <section className="relative overflow-hidden rounded-xl bg-sotec p-5 text-white shadow-sm">
            <p className="text-sm text-white/70">Portal del cliente</p>
            <p className="mt-1 font-semibold">Tus reportes de servicio, siempre a la mano</p>
            <p className="mt-2 text-sm text-white/60">Consulta cada visita técnica, descarga el PDF y firma en línea los reportes aprobados.</p>
          </section>
        )}

        {/* Lista filtrada */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="font-semibold text-slate-900">{estado ? `${ETIQUETA_ESTADO[estado]} · ${nombrePeriodo}` : `Documentos · ${nombrePeriodo}`}</h2>
              <p className="text-xs text-slate-500">{lista.length} resultado(s)</p>
            </div>
            <Link href="/app/documentos" className="text-sm font-medium text-sotec-greenDeep hover:underline">
              Ver todos
            </Link>
          </div>
          {lista.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No hay documentos con estos filtros en el período.</p>
          ) : (
            <ul className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto">
              {[...lista]
                .sort((a, b) => b.actualizado.localeCompare(a.actualizado))
                .map((d) => (
                  <li key={d.id}>
                    <Link href={rutaDoc(d.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <IconoDoc tipo={d.tipo} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          <span className="font-mono">{d.codigo}</span> · {tituloDoc(d)}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {clienteDoc(d)} · {fechaCorta(d.creado)}
                        </p>
                      </div>
                      <EstadoBadge estado={d.estado} />
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start [&>*]:min-w-0">
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
              {pendientes.slice(0, 6).map(({ d, accion }) => (
                <li key={d.id + accion}>
                  <Link href={rutaDoc(d.id)} className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <IconoDoc tipo={d.tipo} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        <span className="font-mono">{d.codigo}</span> · {tituloDoc(d)}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{clienteDoc(d)}</span>
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
          {pendientes.length > 6 && (
            <Link href={puede(u.rol, "revisar") ? "/app/revision" : "/app/documentos"} className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-sotec-greenDeep hover:bg-slate-50">
              Ver los {pendientes.length} pendientes
            </Link>
          )}
        </section>

        {/* Ahorro, compacto y relativo */}
        {u.rol !== "cliente" && (
          <section className="relative overflow-hidden rounded-xl bg-sotec p-5 text-white shadow-sm">
            <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sotec-green/15 blur-2xl" />
            <p className="relative flex items-center gap-2 text-sm text-white/70">
              <Timer className="h-4 w-4 text-sotec-green" /> Tiempo ahorrado · {nombrePeriodo}
            </p>
            <p className="relative mt-2 text-4xl font-semibold tracking-tight text-sotec-green">
              <Contador valor={(actual.length * 41) / 60} formato={(n) => `${n.toLocaleString("es-CO", { maximumFractionDigits: 1 })} h`} />
            </p>
            <p className="relative mt-1 text-sm text-white/70">
              ≈ {((actual.length * 41) / 60 / 8).toLocaleString("es-CO", { maximumFractionDigits: 1 })} jornadas de trabajo recuperadas
            </p>
            <p className="relative mt-3 border-t border-white/10 pt-3 text-xs text-white/50">~50 min por formato en papel frente a ~9 min con el asistente.</p>
          </section>
        )}
      </div>
    </div>
  );
}
