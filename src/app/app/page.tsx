"use client";

/**
 * Ruta /app: tablero de inicio, distinto según el rol. Filtros (período o mes, formato,
 * estado, cliente, proyecto, técnico) que aplican a indicadores con variación contra el
 * período anterior, gráficas, productividad por técnico (solo quien ve al equipo), finanzas
 * (cartera: administración; gastos: revisores) y la bandeja de pendientes del perfil.
 * Datos: demo.visibles / cuentasVisibles de useDemo(); cálculos en @/nucleo/indicadores.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Clock, FileSignature, FileText, FilterX, FolderKanban, Gauge, HardHat, Hourglass, PenLine, Receipt, RotateCcw, Timer, UserRound, Wallet } from "lucide-react";

import { Contador } from "@/components/fx/Reveal";
import { BarrasFiltro, BarrasMes, Dona, Kpi, Sparkline, Variacion } from "@/components/tablero/piezas";
import { EstadoBadge, fechaCorta } from "@/components/ui/badges";
import { Avatar, fechaLarga, nombreCorto, saludo } from "@/components/ui/corporativo";
import { IconoDoc } from "@/components/ui/icono-doc";
import { cn } from "@/lib/utils";
import { totales } from "@/modulos/cobros/tipos";
import { cantidadDoc, clienteDoc, formatoDe, infoDoc, tituloDoc } from "@/modulos/registro";
import { ETIQUETA_ESTADO, ETIQUETA_ROL } from "@/nucleo/catalogos";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import {
  ESTADOS_ORDEN,
  PERIODOS,
  TIPOS_ORDEN,
  enRango,
  horasAprobacion,
  meses as mesesDe,
  mesesFiltro,
  pendientes as pendientesDe,
  rango,
  rangoMes,
  tasaFirmaCliente,
  tasaPrimerIntento,
  tiempoServicio,
  variacion,
  type Periodo,
} from "@/nucleo/indicadores";
import { cop } from "@/nucleo/letras";
import { puede, puedeCrearTipo } from "@/nucleo/permisos";
import { rutaDoc } from "@/nucleo/rutas";
import type { Documento, Estado, TipoDoc } from "@/nucleo/tipos";

/** Proporción 0–1 como porcentaje entero; «—» si no hay datos. */
const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)} %`);
/** Colores de la dona por estado (mismos tonos de los badges). */
const COLOR_ESTADO: Record<Estado, string> = { borrador: "#94A3B8", en_revision: "#D9963A", aprobado: "var(--serie-a)", cerrado: "var(--serie-b)", rechazado: "#E11D48" };
/** Horas decimales como «X h MM min»; «—» si no hay datos. */
// Se redondea a minutos antes de separar horas y minutos (evita «1 h 60 min»)
const duracion = (h: number | null) => {
  if (h === null) return "—";
  const min = Math.round(h * 60);
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
};
/** Horas legibles: en horas por debajo de un día, en días desde 24 h. */
const horas = (h: number | null) => (h === null ? "—" : h < 24 ? `${h.toLocaleString("es-CO", { maximumFractionDigits: 1 })} h` : `${(h / 24).toLocaleString("es-CO", { maximumFractionDigits: 1 })} días`);

/** Tablero del perfil activo; todos los filtros son estado local (no van en la URL). */
export default function Tablero() {
  const demo = useDemo();
  const u = demo.usuario!;
  const [periodo, setPeriodo] = useState<Periodo>("90d");
  const [tipo, setTipo] = useState<TipoDoc | "todos">("todos");
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cliente, setCliente] = useState<string | null>(null);
  const [proyecto, setProyecto] = useState<string>("");
  const [tecnico, setTecnico] = useState<string | null>(null);
  // Mes puntual (AAAA-MM): si se elige, reemplaza al período y compara con el mes anterior
  const [mes, setMes] = useState("");

  const r = mes ? rangoMes(mes) : rango(periodo);
  // Todos los filtros menos el técnico: base de la productividad por técnico
  const baseEquipo = useMemo(
    () => demo.visibles.filter((d) => (tipo === "todos" || d.tipo === tipo) && (!cliente || d.clienteId === cliente) && (!proyecto || d.proyectoId === proyecto)),
    [demo.visibles, tipo, cliente, proyecto],
  );
  const base = useMemo(() => baseEquipo.filter((d) => !tecnico || d.autorId === tecnico), [baseEquipo, tecnico]);
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
    servicio: tiempoServicio(actual),
    servicioAnt: tiempoServicio(anterior),
  };
  const diff = (a: number | null, b: number | null) => (a === null || b === null ? null : a - b);

  const tipos = TIPOS_ORDEN.filter((t) => (tipo === "todos" ? demo.visibles.some((d) => d.tipo === t) : t === tipo));
  const mesesGrafica = serie.map((m) => ({ etiqueta: m.etiqueta, ...Object.fromEntries(tipos.map((t) => [t, m.docs.filter((d) => d.tipo === t).length])) }));

  const filasEstado = ESTADOS_ORDEN.map((e) => ({ clave: e, nombre: ETIQUETA_ESTADO[e], valor: actual.filter((d) => d.estado === e).length, color: COLOR_ESTADO[e] })).filter((f) => f.valor > 0 || f.clave === estado);
  const finalizados = actual.filter((d) => d.estado === "aprobado" || d.estado === "cerrado").length;

  // Productividad por técnico: quien ve al equipo (no el técnico ni el cliente)
  const veEquipo = u.rol !== "tecnico" && u.rol !== "cliente";
  const actualEquipo = baseEquipo.filter((d) => enRango(d, r.desde, r.hasta));
  const devuelto = (d: Documento) => d.estado === "rechazado" || d.historial.some((h) => h.accion === "Rechazó");
  const filasTecnico = veEquipo
    ? Array.from(new Set([...demo.usuarios.filter((x) => x.rol === "tecnico" && x.activo).map((x) => x.id), ...actualEquipo.map((d) => d.autorId)]))
        .map((id) => {
          const persona = demo.usuarios.find((x) => x.id === id);
          const suyos = actualEquipo.filter((d) => d.autorId === id);
          return {
            id,
            nombre: persona?.nombre ?? "Usuario retirado",
            cargo: persona?.cargo ?? "",
            docs: suyos.length,
            primer: tasaPrimerIntento(suyos),
            devueltos: suyos.filter(devuelto).length,
            enProceso: suyos.filter((d) => d.estado === "borrador" || d.estado === "en_revision").length,
            servicio: tiempoServicio(suyos).promedio,
          };
        })
        .filter((f) => f.docs > 0 || demo.usuarios.some((x) => x.id === f.id && x.rol === "tecnico"))
        .sort((a, b) => b.docs - a.docs)
    : [];
  const maxDocsTecnico = Math.max(1, ...filasTecnico.map((f) => f.docs));
  const tecnicosFiltro = veEquipo ? demo.usuarios.filter((x) => x.rol !== "cliente" && (x.rol === "tecnico" || demo.visibles.some((d) => d.autorId === x.id))) : [];
  const filasCliente = demo.clientes
    .map((c) => ({ clave: c.id, nombre: c.nombre, valor: demo.visibles.filter((d) => d.clienteId === c.id && enRango(d, r.desde, r.hasta) && (tipo === "todos" || d.tipo === tipo) && (!proyecto || d.proyectoId === proyecto)).length }))
    .filter((f) => f.valor > 0 || f.clave === cliente)
    .sort((a, b) => b.valor - a.valor);

  // Finanzas: la cartera y lo cobrado son de la administración (comercial); los gastos, de quien revisa
  const comercial = puede(u.rol, "cobros");
  const finanzas = comercial || puede(u.rol, "revisar");
  const porCobrar = demo.cuentasVisibles.filter((c) => c.estado === "emitida" || c.estado === "enviada").reduce((a, c) => a + totales(c).total, 0);
  const cobrado = demo.cuentasVisibles.filter((c) => c.estado === "pagada").reduce((a, c) => a + totales(c).total, 0);
  const gastosPend = demo.visibles.filter((d) => d.tipo === "gasto" && (d.estado === "en_revision" || d.estado === "aprobado")).length;

  // Lo que este perfil tiene que hacer ahora (sin filtro: es su bandeja)
  const docs = demo.visibles;
  const pendientes: { d: Documento; accion: string }[] = [];
  if (puede(u.rol, "revisar")) docs.filter((d) => d.estado === "en_revision").forEach((d) => pendientes.push({ d, accion: "Revisar" }));
  // Cierres según el formato: SST cierra permisos (formulario) y gastos (un clic); el cliente firma reportes y cotizaciones
  if (puede(u.rol, "cerrar_permiso")) docs.filter((d) => d.estado === "aprobado" && infoDoc(d.tipo).flujo.cierre === "formulario").forEach((d) => pendientes.push({ d, accion: infoDoc(d.tipo).flujo.cerrar }));
  if (puede(u.rol, "revisar")) docs.filter((d) => d.estado === "aprobado" && infoDoc(d.tipo).flujo.cierre === "revisor").forEach((d) => pendientes.push({ d, accion: d.tipo === "gasto" ? "Reembolsar" : infoDoc(d.tipo).flujo.cerrar }));
  if (u.rol === "cliente") docs.filter((d) => d.estado === "aprobado" && infoDoc(d.tipo).flujo.cierre === "cliente").forEach((d) => pendientes.push({ d, accion: "Firmar" }));
  docs.filter((d) => d.autorId === u.id && (d.estado === "rechazado" || d.estado === "borrador")).forEach((d) => pendientes.push({ d, accion: d.estado === "rechazado" ? "Corregir" : "Completar" }));

  const hayFiltros = tipo !== "todos" || estado !== null || cliente !== null || proyecto !== "" || tecnico !== null || mes !== "";
  const proyectosFiltro = demo.proyectosVisibles.filter((p) => !cliente || p.clienteId === cliente);
  const nombreCliente = demo.clientes.find((c) => c.id === cliente)?.nombre;
  const nombreTecnico = demo.usuarios.find((x) => x.id === tecnico)?.nombre;
  const opcionesMes = mesesFiltro(12);
  const nombrePeriodo = mes ? opcionesMes.find((m) => m.clave === mes)?.nombre ?? mes : PERIODOS.find((p) => p.clave === periodo)!.nombre;

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
            {puedeCrearTipo(u.rol, "cotizacion") && (
              <Link href="/app/nuevo/cotizacion" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-slate-50">
                <FileSignature className="h-4 w-4" /> Cotización
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Filtros: aplican a todo lo de abajo */}
      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Filtros del tablero">
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p.clave} onClick={() => (setPeriodo(p.clave), setMes(""))} aria-pressed={!mes && periodo === p.clave} className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition sm:text-sm", !mes && periodo === p.clave ? "bg-sotec text-white" : "text-slate-600 hover:bg-slate-100")}>
              {p.nombre}
            </button>
          ))}
        </div>
        <label className={cn("flex items-center gap-1.5 rounded-lg border bg-white py-0.5 pl-2.5 pr-1 shadow-sm", mes ? "border-sotec-greenDeep ring-1 ring-sotec-green/40" : "border-slate-200")}>
          <CalendarDays className="h-3.5 w-3.5 text-slate-500" aria-hidden />
          <span className="sr-only">Mes</span>
          <select value={mes} onChange={(e) => setMes(e.target.value)} className="bg-transparent py-1 text-xs font-medium text-slate-700 outline-none sm:text-sm">
            <option value="">Mes…</option>
            {opcionesMes.map((m) => (
              <option key={m.clave} value={m.clave}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
        {tecnicosFiltro.length > 0 && (
          <label className={cn("flex items-center gap-1.5 rounded-lg border bg-white py-0.5 pl-2.5 pr-1 shadow-sm", tecnico ? "border-sotec-greenDeep ring-1 ring-sotec-green/40" : "border-slate-200")}>
            <UserRound className="h-3.5 w-3.5 text-slate-500" aria-hidden />
            <span className="sr-only">Técnico</span>
            <select value={tecnico ?? ""} onChange={(e) => setTecnico(e.target.value || null)} className="max-w-[200px] bg-transparent py-1 text-xs font-medium text-slate-700 outline-none sm:text-sm">
              <option value="">Todos los técnicos</option>
              {tecnicosFiltro.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex flex-wrap rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm" role="group" aria-label="Tipo de documento">
          {(["todos", ...TIPOS_ORDEN] as const)
            .filter((t) => t === "todos" || demo.visibles.some((d) => d.tipo === t))
            .map((t) => (
              <button key={t} onClick={() => setTipo(t)} aria-pressed={tipo === t} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition sm:text-sm", tipo === t ? "bg-sotec text-white" : "text-slate-600 hover:bg-slate-100")}>
                {t !== "todos" && <IconoDoc tipo={t} className="h-3.5 w-3.5" />}
                {t === "todos" ? "Todos" : formatoDe(t).plural.replace(/^./, (x) => x.toUpperCase())}
              </button>
            ))}
        </div>
        {proyectosFiltro.length > 0 && (
          <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white py-0.5 pl-2.5 pr-1 shadow-sm">
            <FolderKanban className="h-3.5 w-3.5 text-slate-500" aria-hidden />
            <span className="sr-only">Proyecto</span>
            <select value={proyecto} onChange={(e) => setProyecto(e.target.value)} className="max-w-[220px] bg-transparent py-1 text-xs font-medium text-slate-700 outline-none sm:text-sm">
              <option value="">Todos los proyectos</option>
              {proyectosFiltro.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} · {p.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        {estado && <span className="rounded-full bg-sotec-soft px-2.5 py-1 text-xs font-medium text-sotec-greenDeep">Estado: {ETIQUETA_ESTADO[estado]}</span>}
        {nombreCliente && <span className="rounded-full bg-sotec-soft px-2.5 py-1 text-xs font-medium text-sotec-greenDeep">Cliente: {nombreCliente}</span>}
        {nombreTecnico && <span className="rounded-full bg-sotec-soft px-2.5 py-1 text-xs font-medium text-sotec-greenDeep">Técnico: {nombreTecnico}</span>}
        {hayFiltros && (
          <button onClick={() => (setTipo("todos"), setEstado(null), setCliente(null), setProyecto(""), setTecnico(null), setMes(""))} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">
            <FilterX className="h-3.5 w-3.5" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Mi resumen: el técnico ve su propio trabajo del período de un vistazo (pensado para el celular) */}
      {u.rol === "tecnico" && (
        <section className="rounded-xl bg-sotec p-4 text-white shadow-sm">
          <p className="text-sm text-white/70">Mi resumen · {nombrePeriodo}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { t: "En proceso", v: actual.filter((d) => d.estado === "borrador" || d.estado === "en_revision").length, icon: Clock },
              { t: "Aprobados", v: finalizados, icon: CheckCircle2 },
              { t: "Devueltos", v: actual.filter(devuelto).length, icon: RotateCcw },
              { t: "Horas en sitio", v: duracion(k.servicio.servicios ? k.servicio.total : null), icon: Hourglass },
            ].map((x) => (
              <div key={x.t} className="rounded-lg bg-white/[0.06] p-3">
                <x.icon className="h-4 w-4 text-sotec-green" />
                <p className="mt-2 text-xl font-semibold tabular-nums">{x.v}</p>
                <p className="text-xs text-white/60">{x.t}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Indicadores relativos */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Kpi
          titulo={`Documentos · ${nombrePeriodo}`}
          icon={FileText}
          tono="bg-slate-100 text-slate-700"
          valor={<Contador valor={k.total} duracion={800} />}
          contexto={tipos.map((t) => cantidadDoc(t, actual.filter((d) => d.tipo === t).length)).join(" · ")}
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
        <Kpi
          titulo="Tiempo promedio por servicio"
          icon={Hourglass}
          tono="bg-slate-100 text-slate-700"
          valor={duracion(k.servicio.promedio)}
          contexto={k.servicio.servicios ? `${k.servicio.servicios} servicio(s) con llegada y salida · ${duracion(k.servicio.total)} en total` : "Se calcula con la hora de llegada y de salida del reporte técnico"}
          variacion={k.servicio.promedio !== null ? <Variacion valor={variacion(k.servicio.promedio, k.servicioAnt.promedio)} mejorSi="baja" /> : undefined}
        />
      </div>

      {finanzas && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ...(comercial
              ? [
                  { t: "Cartera por cobrar", v: cop(porCobrar), d: "Cuentas emitidas o enviadas", icon: Receipt, href: "/app/cobros" },
                  { t: "Cobrado", v: cop(cobrado), d: "Cuentas pagadas", icon: CheckCircle2, href: "/app/cobros" },
                ]
              : []),
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
            <Dona filas={filasEstado} activo={estado} onElegir={(c) => setEstado(c as Estado | null)} centro={{ valor: actual.length ? `${Math.round((finalizados / actual.length) * 100)}%` : "—", texto: "finalizados" }} />
          </div>
        </section>
      </div>

      {/* Productividad por técnico: toca una fila para ver solo su trabajo */}
      {veEquipo && filasTecnico.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Productividad por técnico</h2>
            <p className="text-xs text-slate-500">
              {nombrePeriodo}
              {nombreCliente ? ` · ${nombreCliente}` : ""} · documentos, calidad (aprobados al primer intento) y tiempo por servicio
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Técnico</th>
                  <th className="px-4 py-2 font-medium">Documentos</th>
                  <th className="px-4 py-2 text-right font-medium">1er intento</th>
                  <th className="px-4 py-2 text-right font-medium">Devueltos</th>
                  <th className="px-4 py-2 text-right font-medium">En proceso</th>
                  <th className="px-4 py-2 text-right font-medium">Tiempo / servicio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filasTecnico.map((f) => {
                  const on = tecnico === f.id;
                  return (
                    <tr
                      key={f.id}
                      onClick={() => setTecnico(on ? null : f.id)}
                      className={cn("cursor-pointer transition hover:bg-slate-50", on && "bg-sotec-soft", tecnico && !on && "opacity-60")}
                    >
                      <td className="px-4 py-2.5">
                        <button type="button" aria-pressed={on} className="flex items-center gap-2.5 text-left">
                          <Avatar nombre={f.nombre} className="h-8 w-8" />
                          <span className="min-w-0">
                            <span className="block font-medium text-slate-900">{f.nombre}</span>
                            <span className="block text-xs text-slate-500">{f.cargo}</span>
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-28 rounded-full bg-slate-100">
                            <span className="block h-2 origin-left animate-grow-x rounded-full" style={{ width: `${(f.docs / maxDocsTecnico) * 100}%`, background: "var(--serie-b)" }} />
                          </span>
                          <strong className="tabular-nums text-slate-900">{f.docs}</strong>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{pct(f.primer)}</td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums", f.devueltos ? "font-medium text-rose-700" : "text-slate-500")}>{f.devueltos}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{f.enProceso}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{duracion(f.servicio)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
                    <Link href={rutaDoc(d.id, "&desde=tablero")} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
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
                      <EstadoBadge estado={d.estado} tipo={d.tipo} />
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
                  <Link href={rutaDoc(d.id, "&desde=tablero")} className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
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
