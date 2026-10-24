"use client";

/**
 * Ruta /app/equipos/ver: ficha de un equipo (?id=<equipo>) con su historial de reportes, o
 * formulario de alta (?nuevo=1, con ?cliente= y ?sistema= precargados). ?desde= define el
 * regreso y ?ok=creado muestra el aviso tras registrar. Ver: puedeVerEquipo; registrar y
 * editar: puedeEditarEquipos (`equipos`); eliminar sin reportes: admin y SST. Datos: useEquipos().
 */
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, ArchiveRestore, Building2, CircleAlert, CircleCheck, CircleX, FileText, FolderKanban, MapPin, PenLine, Plus, Save, Trash2, X } from "lucide-react";

import { EstadoBadge, fechaCorta } from "@/components/ui/badges";
import { Volver, marcarEdicion, regresarSiViene, useOrigen } from "@/components/ui/volver";
import { cn } from "@/lib/utils";
import { ESTADOS_EQUIPO, ETIQUETA_ESTADO_EQUIPO, SISTEMAS, esSistema, sistemaDe } from "@/modulos/equipos/catalogo";
import { equiposIdsDe, fechaDoc, historialEquipo, puedeEditarEquipos, puedeEliminarEquipos, puedeVerEquipo } from "@/modulos/equipos/logica";
import { EstadoEquipoBadge, IconoEquipo, IconoSistema } from "@/modulos/equipos/piezas";
import type { Equipo, EstadoEquipo, SistemaEquipo } from "@/modulos/equipos/tipos";
import { useEquipos } from "@/modulos/equipos/useEquipos";
import { formatoDe, tituloDoc } from "@/modulos/registro";
import { puede } from "@/nucleo/permisos";
import { rutaDoc, rutaProyecto } from "@/nucleo/rutas";

/** Clases comunes de los campos del formulario. */
const campo = "h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800";

/** Una sola página con dos modos: formulario (crear/editar, `vigente`) o ficha de lectura. */
function Ficha() {
  const params = useSearchParams();
  const router = useRouter();
  const demo = useEquipos();
  const u = demo.usuario!;
  const id = params.get("id") ?? "";
  const nuevo = params.get("nuevo") === "1";
  const edita = puedeEditarEquipos(u.rol);
  const existente = demo.equipos.find((e) => e.id === id);

  /** Equipo en blanco para el alta; el id, las fechas y el historial los asigna guardarEquipo. */
  const vacio = (): Equipo => {
    const sis = params.get("sistema") ?? "";
    return {
      id: "",
      clienteId: params.get("cliente") ?? "",
      sistema: (esSistema(sis) ? sis : "cctv") as SistemaEquipo,
      tipo: "",
      nombre: "",
      marca: "",
      modelo: "",
      serial: "",
      ubicacion: "",
      estado: "operativo",
      notas: "",
      creadoPor: u.id,
      creado: "",
      actualizado: "",
      historial: [],
    };
  };
  const [borrador, setBorrador] = useState<Equipo | null>(() => (nuevo ? vacio() : null));
  const [error, setError] = useState<string | null>(null);
  const [avisoLocal, setAviso] = useState<string | null>(null);
  // ?ok=creado llega con router.replace (la página no se vuelve a montar): el aviso sale de la URL
  const aviso = avisoLocal ?? (params.get("ok") === "creado" ? "Equipo registrado." : null);

  // Vuelve al mismo cliente y sistema que se estaba viendo (vienen en la URL desde el listado)
  const qVolver = new URLSearchParams();
  const cliVolver = params.get("cliente") || existente?.clienteId || "";
  if (cliVolver && u.rol !== "cliente") qVolver.set("cliente", cliVolver);
  if (params.get("sistema")) qVolver.set("sistema", params.get("sistema")!);
  const rutaVolver = `/app/equipos${qVolver.toString() ? `?${qVolver}` : ""}`;
  // Abierta desde un documento (equipos atendidos, ?desde=doc:<id>): «Volver» regresa al documento
  const origen = useOrigen({ href: rutaVolver, label: "Equipos" });
  const volver = <Volver href={origen.href} label={origen.label} />;

  const bloqueo = (texto: string) => (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
      <p className="font-semibold">{texto}</p>
      <Link href="/app/equipos" className="mt-3 inline-block text-sm text-sotec-greenDeep underline">
        Ir a equipos
      </Link>
    </div>
  );

  if (nuevo && !edita) return bloqueo("Tu perfil no registra equipos");
  if (!nuevo && (!existente || !puedeVerEquipo(u, existente))) return bloqueo("Equipo no disponible para este perfil");

  // Al pasar de «nuevo» a la ficha, el borrador sin id ya no aplica
  const vigente = borrador && (nuevo || borrador.id) ? borrador : null;
  const e = vigente ?? existente!;
  const cliente = demo.clientes.find((c) => c.id === e.clienteId);
  const proyecto = demo.proyectos.find((p) => p.id === e.proyectoId);
  const proyectosCliente = demo.proyectosVisibles.filter((p) => p.clienteId === e.clienteId);
  const historial = existente ? historialEquipo(existente.id, demo.visibles) : [];
  // Para borrar cuenta todo el historial, también lo que este perfil no ve
  const reportesTotales = existente ? demo.documentos.filter((d) => equiposIdsDe(d).includes(existente.id)).length : 0;
  const autor = (uid: string) => demo.usuarios.find((x) => x.id === uid)?.nombre ?? "—";
  const nuevoReporte = existente && puede(u.rol, "crear") && existente.estado !== "retirado"
    ? `/app/nuevo/reporte?cliente=${existente.clienteId}${existente.proyectoId ? `&proyecto=${existente.proyectoId}` : ""}&equipo=${existente.id}&desde=equipo:${existente.id}`
    : null;

  const set = (patch: Partial<Equipo>) => setBorrador((b) => (b ? { ...b, ...patch } : b));

  function guardar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!borrador) return;
    const r = demo.guardarEquipo(borrador);
    if (r.error || !r.equipo) {
      setError(r.error ?? "No se pudo guardar.");
      return;
    }
    setError(null);
    // Nuevo: el formulario queda hasta que la URL cambia a la ficha (replace: «atrás» no vuelve al formulario vacío)
    if (nuevo) {
      router.replace(`/app/equipos/ver?id=${r.equipo.id}&ok=creado${qVolver.toString() ? `&${qVolver}` : ""}`);
      return;
    }
    setBorrador(null);
    setAviso("Cambios guardados.");
  }

  /** Cambia el estado del equipo; retirar pide confirmación (se conserva el historial). */
  function estado(est: EstadoEquipo) {
    if (!existente) return;
    if (est === "retirado" && !confirm(`¿Retirar «${existente.nombre}»? Deja de ofrecerse en los reportes nuevos; su historial se conserva y puedes reactivarlo.`)) return;
    const err = demo.cambiarEstadoEquipo(existente.id, est);
    setError(err);
    setAviso(err ? null : `Estado: ${ETIQUETA_ESTADO_EQUIPO[est]}.`);
  }

  /** Elimina el equipo (solo sin reportes) y regresa al listado. */
  function eliminar() {
    if (!existente || !confirm(`¿Eliminar «${existente.nombre}» del inventario? Esta acción no se puede deshacer.`)) return;
    const err = demo.eliminarEquipo(existente.id);
    if (err) setError(err);
    else router.replace(rutaVolver);
  }

  // ─────────────────────────── formulario (crear o editar)
  if (vigente) {
    const borrador = vigente;
    const sis = sistemaDe(borrador.sistema);
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {volver}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{nuevo ? "Nuevo equipo" : `Editar ${existente?.nombre}`}</h1>
        <p className="text-sm text-slate-500">Lo mínimo es cliente, sistema, tipo y nombre. Marca, modelo y serial se pueden completar después.</p>
        <form onSubmit={guardar} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-600">Cliente</span>
              {nuevo ? (
                <select required className={campo} value={borrador.clienteId} onChange={(x) => set({ clienteId: x.target.value, proyectoId: undefined })}>
                  <option value="">Selecciona…</option>
                  {demo.clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <input className={cn(campo, "bg-slate-50")} value={cliente?.nombre ?? "—"} readOnly aria-readonly />
              )}
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-600">Proyecto u obra (opcional)</span>
              <select className={campo} value={borrador.proyectoId ?? ""} onChange={(x) => set({ proyectoId: x.target.value || undefined })} disabled={!borrador.clienteId}>
                <option value="">Sin proyecto</option>
                {proyectosCliente.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} · {p.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-600">Sistema</span>
              <select className={campo} value={borrador.sistema} onChange={(x) => set({ sistema: x.target.value as SistemaEquipo })}>
                {SISTEMAS.map((s) => (
                  <option key={s.clave} value={s.clave}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-600">Tipo</span>
              <input required list="tipos-equipo" className={campo} value={borrador.tipo} onChange={(x) => set({ tipo: x.target.value })} placeholder={sis.tipos[0] ? `Ej: ${sis.tipos[0]}` : ""} />
              <datalist id="tipos-equipo">
                {sis.tipos.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Nombre</span>
              <input required minLength={2} className={campo} value={borrador.nombre} onChange={(x) => set({ nombre: x.target.value })} placeholder="Ej: Cámara 7 – Portería" />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-600">Marca</span>
              <input className={campo} value={borrador.marca} onChange={(x) => set({ marca: x.target.value })} placeholder="Ej: Dahua" />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-600">Modelo</span>
              <input className={campo} value={borrador.modelo} onChange={(x) => set({ modelo: x.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-600">Serial</span>
              <input className={campo} value={borrador.serial} onChange={(x) => set({ serial: x.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-600">Ubicación</span>
              <input className={campo} value={borrador.ubicacion} onChange={(x) => set({ ubicacion: x.target.value })} placeholder="Ej: Portería principal" />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-600">Estado</span>
              <select className={campo} value={borrador.estado} onChange={(x) => set({ estado: x.target.value as EstadoEquipo })}>
                {ESTADOS_EQUIPO.filter((s) => s !== "retirado" || borrador.estado === "retirado").map((s) => (
                  <option key={s} value={s}>
                    {ETIQUETA_ESTADO_EQUIPO[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Notas</span>
              <textarea rows={3} className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-800" value={borrador.notas} onChange={(x) => set({ notas: x.target.value })} />
            </label>
          </div>
          {error && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                // Nuevo: se regresa a la entrada anterior (el listado) en vez de apilar otra
                if (nuevo) {
                  if (!regresarSiViene(router, rutaVolver)) router.replace(rutaVolver);
                } else setBorrador(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              <X className="h-4 w-4" aria-hidden /> Cancelar
            </button>
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-sotec px-4 py-2 text-sm font-medium text-white hover:bg-black">
              <Save className="h-4 w-4" aria-hidden /> {nuevo ? "Registrar equipo" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ─────────────────────────── ficha (lectura) e historial
  const eq = existente!;
  const datos: [string, string][] = [
    ["Sistema", sistemaDe(eq.sistema).nombre],
    ["Tipo", eq.tipo],
    ["Marca", eq.marca],
    ["Modelo", eq.modelo],
    ["Serial", eq.serial],
    ["Ubicación", eq.ubicacion],
  ];
  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50";

  return (
    <div className="space-y-5">
      {volver}
      {aviso && (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CircleCheck className="h-4 w-4" aria-hidden /> {aviso}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sotec text-sotec-green">
            <IconoEquipo tipo={eq.tipo} sistema={eq.sistema} className="h-6 w-6" />
          </span>
          <div className="min-w-[12rem] flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <IconoSistema sistema={eq.sistema} /> {sistemaDe(eq.sistema).nombre} · {eq.tipo}
              <EstadoEquipoBadge estado={eq.estado} />
            </p>
            <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight text-slate-900">{eq.nombre}</h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4 text-slate-400" aria-hidden /> {cliente?.nombre ?? "—"}
              </span>
              {proyecto && (
                <Link href={rutaProyecto(proyecto.id)} className="flex items-center gap-1 hover:underline">
                  <FolderKanban className="h-4 w-4 text-slate-400" aria-hidden /> {proyecto.codigo} · {proyecto.nombre}
                </Link>
              )}
            </p>
          </div>
          {nuevoReporte && (
            <Link href={nuevoReporte} onClick={marcarEdicion} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sotec px-4 py-2.5 sm:w-auto text-sm font-medium text-white shadow-sm hover:bg-black">
              <Plus className="h-4 w-4" aria-hidden /> Nuevo reporte de este equipo
            </Link>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {datos.map(([t, v]) => (
            <div key={t} className="min-w-0">
              <dt className="text-xs text-slate-500">{t}</dt>
              <dd className={cn("break-words", v ? "text-slate-800" : "text-slate-400")}>{v || (edita ? "Por completar" : "—")}</dd>
            </div>
          ))}
        </dl>
        {eq.notas && <p className="mt-4 whitespace-pre-line border-t border-slate-100 pt-3 text-sm text-slate-600">{eq.notas}</p>}

        {edita && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setBorrador({ ...eq })} className={btn}>
              <PenLine className="h-4 w-4" aria-hidden /> Editar ficha
            </button>
            {eq.estado !== "retirado" && (
              <>
                {eq.estado !== "operativo" && (
                  <button type="button" onClick={() => estado("operativo")} className={btn}>
                    <CircleCheck className="h-4 w-4" aria-hidden /> Marcar operativo
                  </button>
                )}
                {eq.estado !== "con_falla" && (
                  <button type="button" onClick={() => estado("con_falla")} className={btn}>
                    <CircleAlert className="h-4 w-4" aria-hidden /> Con falla
                  </button>
                )}
                {eq.estado !== "fuera_servicio" && (
                  <button type="button" onClick={() => estado("fuera_servicio")} className={btn}>
                    <CircleX className="h-4 w-4" aria-hidden /> Fuera de servicio
                  </button>
                )}
                <button type="button" onClick={() => estado("retirado")} className={btn}>
                  <Archive className="h-4 w-4" aria-hidden /> Retirar
                </button>
              </>
            )}
            {eq.estado === "retirado" && (
              <button type="button" onClick={() => estado("operativo")} className={btn}>
                <ArchiveRestore className="h-4 w-4" aria-hidden /> Reactivar
              </button>
            )}
            {puedeEliminarEquipos(u.rol) &&
              (reportesTotales === 0 ? (
                <button type="button" onClick={eliminar} className={cn(btn, "border-rose-200 text-rose-700 hover:bg-rose-50")}>
                  <Trash2 className="h-4 w-4" aria-hidden /> Eliminar
                </button>
              ) : (
                <p className="self-center text-xs text-slate-500">Con {reportesTotales} reporte(s) no se elimina: se retira para conservar su historial.</p>
              ))}
          </div>
        )}
      </section>

      <section aria-labelledby="titulo-historial" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 id="titulo-historial" className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <FileText className="h-4 w-4" aria-hidden /> Historial de reportes
          <span className="text-sm font-normal text-slate-500">· {historial.length}</span>
        </h2>
        {historial.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            {u.rol === "cliente"
              ? "Aún no hay reportes aprobados de este equipo."
              : "Sin reportes todavía. Cuando un técnico lo marque como atendido en un reporte técnico, aparecerá aquí."}
          </p>
        ) : (
          <ol className="mt-4 space-y-4 border-l border-slate-200 pl-4">
            {historial.map((d) => (
              <li key={d.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-sotec-green ring-2 ring-white" aria-hidden />
                <Link href={rutaDoc(d.id, `&desde=equipo:${eq.id}`)} className="block rounded-lg p-2 -m-2 hover:bg-slate-50">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-medium tabular-nums text-slate-900">{fechaCorta(fechaDoc(d))}</span>
                    <span className="font-mono text-xs font-semibold text-slate-500">{d.codigo}</span>
                    <EstadoBadge estado={d.estado} tipo={d.tipo} />
                  </span>
                  <span className="mt-0.5 block break-words text-sm text-slate-800">{tituloDoc(d) || formatoDe(d.tipo).corto}</span>
                  <span className="block text-xs text-slate-500">
                    {[(d.datos as unknown as { tipoReporte?: string }).tipoReporte, (d.datos as unknown as { nombreTecnico?: string }).nombreTecnico || autor(d.autorId)].filter(Boolean).join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      {u.rol !== "cliente" && eq.historial.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <summary className="cursor-pointer font-medium text-slate-700">Cambios de la ficha ({eq.historial.length})</summary>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {eq.historial.map((h, k) => (
              <li key={k}>
                {h.fecha.replace("T", " ").slice(0, 16)} · {autor(h.usuarioId)} · {h.accion}
              </li>
            ))}
          </ul>
        </details>
      )}
      {eq.ubicacion && (
        <p className="sr-only">
          <MapPin aria-hidden /> {eq.ubicacion}
        </p>
      )}
    </div>
  );
}

/** Suspense requerido por useSearchParams. */
export default function Page() {
  return (
    <Suspense>
      <Ficha />
    </Suspense>
  );
}
