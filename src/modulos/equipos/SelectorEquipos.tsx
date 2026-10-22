"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { SISTEMAS, sistemaDe } from "./catalogo";
import { coincide, porSistema } from "./logica";
import { IconoEquipo, IconoSistema } from "./piezas";
import type { Equipo, EquipoMinimo, ResultadoEquipo, SistemaEquipo } from "./tipos";

interface Props {
  /** Equipos del cliente del documento. */
  equipos: Equipo[];
  seleccion: string[];
  onCambiar: (ids: string[]) => void;
  /** Crea un equipo con lo mínimo; sin esta función no se ofrece crear. */
  crear?: (m: Omit<EquipoMinimo, "clienteId" | "proyectoId">) => ResultadoEquipo;
  /** Proyecto del documento: sus equipos salen primero y se ofrece filtrar por él. */
  proyectoId?: string;
  /** El documento aún no tiene un cliente del directorio. */
  sinCliente?: boolean;
  /** Alto máximo de la lista (el asistente es más bajo que el formulario). */
  compacto?: boolean;
}

/**
 * Marca los equipos atendidos en un reporte, agrupados por sistema, y crea uno
 * nuevo con lo mínimo (sistema, tipo y nombre): el inventario se arma solo con el uso.
 */
export function SelectorEquipos({ equipos, seleccion, onCambiar, crear, proyectoId, sinCliente, compacto }: Props) {
  const uid = useId();
  const [q, setQ] = useState("");
  const delProyecto = proyectoId ? equipos.filter((e) => e.proyectoId === proyectoId) : [];
  const [soloProyecto, setSoloProyecto] = useState(delProyecto.length > 0 && delProyecto.length < equipos.length);
  const [abierto, setAbierto] = useState(false);
  const [sistema, setSistema] = useState<SistemaEquipo>("cctv");
  const [tipo, setTipo] = useState("");
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const creando = useRef(false);

  // Los retirados no se ofrecen, salvo que el documento ya los tenga marcados
  const visibles = useMemo(() => equipos.filter((e) => (e.estado !== "retirado" || seleccion.includes(e.id)) && (!soloProyecto || e.proyectoId === proyectoId) && coincide(e, q)), [equipos, seleccion, soloProyecto, proyectoId, q]);
  const grupos = porSistema(visibles);
  const marcados = new Set(seleccion);

  if (sinCliente) {
    return <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">Elige primero un cliente del directorio: los equipos son de cada cliente.</p>;
  }

  const alternar = (id: string) => onCambiar(marcados.has(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id]);

  function enviarNuevo(e: React.FormEvent) {
    e.preventDefault();
    if (!crear || creando.current) return; // un solo equipo aunque se haga doble clic
    creando.current = true;
    try {
      const r = crear({ sistema, tipo, nombre, ubicacion });
      if (!r.equipo) {
        setAviso({ ok: false, texto: r.error ?? "No se pudo crear el equipo." });
        return;
      }
      if (!marcados.has(r.equipo.id)) onCambiar([...seleccion, r.equipo.id]);
      setAviso({ ok: true, texto: r.existente ? `«${r.equipo.nombre}» ya estaba en el inventario: quedó marcado.` : `Creé «${r.equipo.nombre}» en el inventario y quedó marcado.` });
      setNombre("");
      setUbicacion("");
    } finally {
      setTimeout(() => (creando.current = false), 300);
    }
  }

  const sis = sistemaDe(sistema);
  const campo = "h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800";

  return (
    <div className="space-y-2">
      {equipos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
          Este cliente aún no tiene equipos en el inventario. {crear ? "Crea aquí los que atendiste: quedan en su inventario con este reporte en su historial." : ""}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {equipos.length > 6 && (
              <label className="relative min-w-[150px] flex-1">
                <span className="sr-only">Buscar equipo</span>
                <Search className="absolute left-2 top-2 h-4 w-4 text-slate-400" aria-hidden />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar equipo…" className="h-8 w-full rounded-md border border-slate-200 bg-white pl-7 pr-2 text-xs" />
              </label>
            )}
            {delProyecto.length > 0 && delProyecto.length < equipos.length && (
              <div className="flex gap-1" role="group" aria-label="Qué equipos mostrar">
                {[
                  { v: true, t: `Del proyecto (${delProyecto.length})` },
                  { v: false, t: `Todo el cliente (${equipos.length})` },
                ].map((o) => (
                  <button key={String(o.v)} type="button" aria-pressed={soloProyecto === o.v} onClick={() => setSoloProyecto(o.v)} className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", soloProyecto === o.v ? "border-sotec bg-sotec text-white" : "border-slate-200 bg-white text-slate-600")}>
                    {o.t}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={cn("scrollbar-thin space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2", compacto ? "max-h-52" : "max-h-80")}>
            {grupos.length === 0 && <p className="p-2 text-xs text-slate-500">Ningún equipo coincide con la búsqueda.</p>}
            {grupos.map((g) => {
              const n = g.equipos.filter((e) => marcados.has(e.id)).length;
              return (
                <fieldset key={g.sistema} className="min-w-0">
                  <legend className="flex w-full items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <IconoSistema sistema={g.sistema} className="h-3.5 w-3.5" /> {sistemaDe(g.sistema).nombre}
                    <span className="ml-auto font-normal normal-case">{n ? `${n} de ${g.equipos.length}` : g.equipos.length}</span>
                  </legend>
                  <ul className="mt-1 space-y-0.5">
                    {g.equipos.map((e) => {
                      const on = marcados.has(e.id);
                      return (
                        <li key={e.id}>
                          <label className={cn("flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-slate-50", on && "bg-sotec-soft")}>
                            <input type="checkbox" className="h-4 w-4 shrink-0 accent-[#1e2a22]" checked={on} onChange={() => alternar(e.id)} />
                            <IconoEquipo tipo={e.tipo} sistema={e.sistema} className="h-4 w-4 shrink-0 text-slate-500" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-slate-800">{e.nombre}</span>
                              <span className="block truncate text-[11px] text-slate-500">
                                {e.tipo}
                                {e.ubicacion ? ` · ${e.ubicacion}` : ""}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              );
            })}
          </div>
        </>
      )}

      <p className="text-xs text-slate-600" aria-live="polite">
        {seleccion.length ? `${seleccion.length} equipo(s) marcado(s) como atendidos.` : "Ningún equipo marcado."}
      </p>

      {crear && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <button type="button" aria-expanded={abierto} aria-controls={`${uid}-nuevo`} onClick={() => setAbierto((a) => !a)} className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-semibold text-sotec-greenDeep">
            {abierto ? <X className="h-3.5 w-3.5" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
            {abierto ? "Cerrar" : "Nuevo equipo"}
            <span className="font-normal text-slate-500">· sistema, tipo y nombre; lo demás después</span>
          </button>
          {abierto && (
            <form id={`${uid}-nuevo`} onSubmit={enviarNuevo} className="space-y-2 border-t border-slate-100 p-3">
              <div role="radiogroup" aria-label="Sistema" className="flex flex-wrap gap-1">
                {SISTEMAS.map((s) => (
                  <button
                    key={s.clave}
                    type="button"
                    role="radio"
                    aria-checked={sistema === s.clave}
                    onClick={() => {
                      setSistema(s.clave);
                      setTipo("");
                    }}
                    className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", sistema === s.clave ? "border-sotec bg-sotec text-white" : "border-slate-200 bg-white text-slate-600")}
                  >
                    <IconoSistema sistema={s.clave} className="h-3 w-3" /> {s.corto}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1" aria-label={`Tipos de ${sis.nombre}`}>
                {sis.tipos.map((t) => (
                  <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)} className={cn("flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px]", tipo === t ? "border-sotec-greenDeep bg-sotec-soft font-semibold text-sotec-greenDeep" : "border-slate-200 text-slate-600")}>
                    {tipo === t && <Check className="h-3 w-3" aria-hidden />} {t}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block text-xs">
                  <span className="font-medium text-slate-600">Tipo</span>
                  <input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Ej: Cámara domo" className={campo} />
                </label>
                <label className="block text-xs">
                  <span className="font-medium text-slate-600">Nombre</span>
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Cámara 7 – Portería" className={campo} />
                </label>
                <label className="block text-xs sm:col-span-2">
                  <span className="font-medium text-slate-600">Ubicación (opcional)</span>
                  <input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Ej: Portería principal" className={campo} />
                </label>
              </div>
              <button type="submit" disabled={!tipo.trim() || nombre.trim().length < 2} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-sotec px-3 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" aria-hidden /> Crear y marcar
              </button>
            </form>
          )}
          {aviso && (
            <p role="status" className={cn("border-t px-3 py-2 text-xs", aviso.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800")}>
              {aviso.texto}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
