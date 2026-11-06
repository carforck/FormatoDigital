"use client";

/**
 * Ruta /app/clientes: directorio de clientes que el asistente usa para autocompletar los
 * formatos. Crear, editar, desactivar/reactivar y eliminar (demo.guardarCliente,
 * cambiarActivoCliente, eliminarCliente de useDemo()). Permiso `clientes`: Coordinador SST
 * (supervisor) y administración. «Formato por defecto»: variante de formato (@/nucleo/variantes)
 * de sus documentos cuando no se elige proyecto (el tipo del proyecto manda).
 *
 * Nombre pegado con su NIT u otros datos («* Razón social: FARO ANDINO S.A.S. * NIT: 900123456»):
 * al pegar o salir del campo se separa (`separarCliente`) y se avisa; los clientes que ya
 * quedaron así se listan en «Nombres por revisar» para corregirlos (se guarda solo con «Guardar»).
 * Con más de 8 clientes aparece la búsqueda; la lista pagina de a 20 (?pag=).
 *
 * Tipo de persona (pedido de Magno): cada cliente es persona jurídica (NIT) o natural (cédula;
 * el mismo campo `nit`, otra etiqueta). La lista sale clasificada (jurídicos y luego naturales,
 * con su encabezado) y se filtra con «Todos · Jurídicos · Naturales» (con sus cuentas); cada
 * tarjeta lleva su insignia. Los clientes de antes, sin tipo, cuentan como jurídicos
 * (@/nucleo/personas). Los datos vacíos no dejan separadores sueltos («· ·»): `unirDatos`.
 */
import { Fragment, useState } from "react";
import { Building2, Plus, Power, Search, Trash2, UserRound, Wand2 } from "lucide-react";

import { Avatar, PageHeader } from "@/components/ui/corporativo";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { separarCliente } from "@/nucleo/clientes";
import { PERSONAS, contarPorTipo, documentoCliente, ordenarPorTipo, tipoPersonaDe, unirDatos } from "@/nucleo/personas";
import type { Cliente, TipoPersona } from "@/nucleo/tipos";
import { cn } from "@/lib/utils";
import { VARIANTES, VARIANTE_BASE, varianteDe } from "@/nucleo/variantes";
import { Paginacion, usePaginacion } from "@/components/ui/Paginacion";

/** Cliente en blanco para el formulario de alta (el id se genera al abrir). */
const VACIO: Cliente = { id: "", tipoPersona: "juridica", nombre: "", nit: "", direccion: "", contacto: "", cargo: "", correo: "", telefono: "", sitio: "" };
/**
 * Campos de texto del formulario con su etiqueta (`activo` se maneja con el botón Desactivar/Reactivar;
 * el tipo de persona, con su selector). Nombre y documento toman la etiqueta del tipo (PERSONAS).
 */
const CAMPOS: [Exclude<keyof Cliente, "activo" | "tipoPersona" | "variante">, string][] = [
  ["nombre", ""],
  ["nit", ""],
  ["direccion", "Dirección"],
  ["contacto", "Persona de contacto"],
  ["cargo", "Cargo"],
  ["correo", "Correo"],
  ["telefono", "Teléfono"],
  ["sitio", "Sitio de trabajo habitual"],
];

/**
 * Tarjetas de clientes y formulario en línea. Desactivar conserva el historial; eliminar
 * puede fallar (p. ej. si tiene documentos o proyectos) y el motivo se muestra en `aviso`.
 */
export default function Clientes() {
  const demo = useDemo();
  const [form, setForm] = useState<Cliente | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // «Separé el NIT…» al pegar o corregir un nombre
  const [avisoNombre, setAvisoNombre] = useState<string | null>(null);
  const existente = form && demo.clientes.find((c) => c.id === form.id);
  const abrir = (c: Cliente | null) => {
    setForm(c);
    setAviso(null);
    setAvisoNombre(null);
  };
  /** El cliente con el nombre separado: NIT y otros datos solo llenan campos vacíos. */
  const conNombreSeparado = (c: Cliente, texto: string): Cliente | null => {
    const s = separarCliente(texto);
    if (!s.cambio || !s.nombre) return null;
    const vacio = (v?: string) => !(v ?? "").trim();
    return {
      ...c,
      nombre: s.nombre,
      nit: vacio(c.nit) ? s.nit : c.nit,
      direccion: vacio(c.direccion) ? s.otros.direccion ?? "" : c.direccion,
      telefono: vacio(c.telefono) ? s.otros.telefono ?? "" : c.telefono,
      correo: vacio(c.correo) ? s.otros.correo ?? "" : c.correo,
      contacto: vacio(c.contacto) ? s.otros.contacto ?? "" : c.contacto,
    };
  };
  const separarNombre = (texto: string) => {
    if (!form) return false;
    const c = conNombreSeparado(form, texto);
    if (!c) return false;
    setForm(c);
    setAvisoNombre(separarCliente(texto).aviso);
    return true;
  };
  // Clientes guardados con el nombre pegado con su NIT (datos reales): se ofrecen para corregir
  const porRevisar = demo.clientes.filter((c) => separarCliente(c.nombre).cambio);
  // Búsqueda y páginas de a 20: el directorio crece con cada cliente que escriben los técnicos
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const buscados = t ? demo.clientes.filter((c) => `${c.nombre} ${c.nit ?? ""} ${c.contacto} ${c.correo} ${c.telefono} ${c.direccion}`.toLowerCase().includes(t)) : demo.clientes;
  // Clasificados por tipo de persona: filtro «Todos · Jurídicos · Naturales» y, en «Todos», jurídicos primero
  const [tipo, setTipo] = useState<TipoPersona | "todos">("todos");
  const cuenta = contarPorTipo(buscados);
  const lista = ordenarPorTipo(tipo === "todos" ? buscados : buscados.filter((c) => tipoPersonaDe(c) === tipo));
  const pag = usePaginacion(lista, 20, `${t}|${tipo}`, "pag");

  return (
    <div className="space-y-4">
      <PageHeader
        etiqueta="Gestión SST"
        titulo="Clientes"
        descripcion="El asistente usa este directorio para autocompletar los formatos."
        acciones={
          <Button onClick={() => abrir({ ...VACIO, id: `c-${Date.now()}` })}>
            <Plus className="h-4 w-4" /> Nuevo cliente
          </Button>
        }
      />

      {porRevisar.length > 0 && !form && (
        <section aria-label="Nombres por revisar" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Nombres por revisar · {porRevisar.length}</p>
          <p className="text-amber-800">Estos clientes quedaron con el NIT u otros datos dentro del nombre. «Corregir» separa el nombre y el NIT; revisa y guarda.</p>
          <ul className="mt-2 space-y-1.5">
            {porRevisar.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 break-words font-mono text-xs">{c.nombre}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    abrir(conNombreSeparado(c, c.nombre) ?? c);
                    setAvisoNombre(`${separarCliente(c.nombre).aviso} Revisa y pulsa «Guardar».`);
                  }}
                >
                  <Wand2 className="h-4 w-4" /> Corregir
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {form && (
        <form
          className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            // Por si se escribió (no pegó) el nombre con su NIT y se guardó sin salir del campo
            const c = conNombreSeparado(form, form.nombre) ?? form;
            demo.guardarCliente({ ...c, tipoPersona: tipoPersonaDe(c) });
            abrir(null);
          }}
        >
          <fieldset className="sm:col-span-2">
            <legend className="text-xs text-slate-500">Tipo de cliente</legend>
            <div role="radiogroup" aria-label="Tipo de cliente" className="mt-1 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(["juridica", "natural"] as const).map((tp) => {
                const elegido = tipoPersonaDe(form) === tp;
                const Icono = tp === "juridica" ? Building2 : UserRound;
                return (
                  <button
                    key={tp}
                    type="button"
                    role="radio"
                    aria-checked={elegido}
                    onClick={() => setForm({ ...form, tipoPersona: tp })}
                    className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition", elegido ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800")}
                  >
                    <Icono className="h-4 w-4" aria-hidden /> {PERSONAS[tp].singular}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {CAMPOS.map(([k, etiqueta]) => (
            <label key={k} className="text-sm">
              <span className="text-xs text-slate-500">{k === "nombre" ? PERSONAS[tipoPersonaDe(form)].nombre : k === "nit" ? PERSONAS[tipoPersonaDe(form)].documentoLargo : etiqueta}</span>
              <Input
                required={k === "nombre"}
                value={form[k] ?? ""}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                // El nombre pegado con su NIT («* Razón social: … * NIT: …») se separa (con los saltos de línea del portapapeles)
                onPaste={k === "nombre" ? (e) => separarNombre(e.clipboardData.getData("text")) && e.preventDefault() : undefined}
                onBlur={k === "nombre" ? (e) => separarNombre(e.target.value) : undefined}
              />
            </label>
          ))}
          <label className="text-sm">
            <span className="text-xs text-slate-500">Formato por defecto (sin proyecto)</span>
            <select
              aria-label="Formato por defecto"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
              value={form.variante ?? VARIANTE_BASE}
              onChange={(e) => setForm({ ...form, variante: e.target.value === VARIANTE_BASE ? undefined : e.target.value })}
            >
              {VARIANTES.map((v) => (
                <option key={v.clave} value={v.clave}>
                  {v.etiqueta}
                </option>
              ))}
            </select>
          </label>
          {avisoNombre && (
            <p role="status" className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 sm:col-span-2">
              {avisoNombre}
            </p>
          )}
          {aviso && (
            <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">
              {aviso}
            </p>
          )}
          <div className="flex flex-wrap items-end justify-end gap-2 sm:col-span-2">
            {existente && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="mr-auto"
                  onClick={() => {
                    const activo = existente.activo === false;
                    if (!activo && !confirm(`¿Desactivar a ${existente.nombre}? Deja de aparecer al diligenciar formatos; sus documentos y proyectos se conservan.`)) return;
                    demo.cambiarActivoCliente(existente.id, activo);
                    abrir(null);
                  }}
                >
                  <Power className="h-4 w-4" /> {existente.activo === false ? "Reactivar" : "Desactivar"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-rose-700 hover:bg-rose-50"
                  onClick={() => {
                    if (!confirm(`¿Eliminar a ${existente.nombre}? Esta acción no se puede deshacer.`)) return;
                    const error = demo.eliminarCliente(existente.id);
                    if (error) setAviso(error);
                    else abrir(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Eliminar
                </Button>
              </>
            )}
            <Button type="button" variant="ghost" onClick={() => abrir(null)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      )}

      {demo.clientes.length > 8 && (
        <label className="relative block max-w-md">
          <span className="sr-only">Buscar cliente</span>
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, NIT, contacto o teléfono…" className="w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-2 text-sm" />
        </label>
      )}
      {demo.clientes.length > 0 && (
        <div role="tablist" aria-label="Tipo de cliente" className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
          {(["todos", "juridica", "natural"] as const).map((tp) => (
            <button
              key={tp}
              type="button"
              role="tab"
              aria-selected={tipo === tp}
              onClick={() => setTipo(tp)}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition", tipo === tp ? "bg-sotec text-white" : "text-slate-600 hover:bg-slate-50")}
            >
              {tp === "todos" ? "Todos" : PERSONAS[tp].plural} <span className={cn("ml-1 text-xs", tipo === tp ? "text-white/80" : "text-slate-400")}>{cuenta[tp]}</span>
            </button>
          ))}
        </div>
      )}
      {lista.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          {t ? "No hay clientes con esa búsqueda." : tipo === "natural" ? "Aún no hay clientes persona natural." : tipo === "juridica" ? "Aún no hay clientes persona jurídica." : "Aún no hay clientes."}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {pag.visibles.map((c, i) => {
          const n = demo.documentos.filter((d) => d.clienteId === c.id).length;
          const np = demo.proyectos.filter((p) => p.clienteId === c.id).length;
          const tp = tipoPersonaDe(c);
          // En «Todos», un encabezado donde empieza cada grupo (también al inicio de cada página)
          const encabezado = tipo === "todos" && (i === 0 || tipoPersonaDe(pag.visibles[i - 1]) !== tp);
          // Solo los datos que hay: sin «· ·» ni puntos sueltos cuando falta el contacto, el cargo o el teléfono
          const linea1 = unirDatos([c.contacto, c.cargo, documentoCliente(c)]);
          const linea2 = unirDatos([c.direccion, c.telefono]);
          const correo = unirDatos([c.correo]);
          return (
            <Fragment key={c.id}>
              {encabezado && (
                <h2 className="mt-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-2">
                  {tp === "juridica" ? <Building2 className="h-4 w-4" aria-hidden /> : <UserRound className="h-4 w-4" aria-hidden />}
                  Personas {tp === "juridica" ? "jurídicas" : "naturales"} · {cuenta[tp]}
                </h2>
              )}
              <button
                onClick={() => abrir(c)}
                aria-label={`Editar ${c.nombre}`}
                className={cn("flex min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sotec-greenDeep hover:shadow-md", c.activo === false && "opacity-70")}
              >
                <Avatar nombre={c.nombre} className="h-11 w-11 rounded-xl text-sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 break-words font-semibold text-slate-900">
                      {c.nombre}
                      <span data-tipo-persona={tp} className={cn("ml-2 rounded-full px-2 py-0.5 align-middle text-[11px] font-medium ring-1", tp === "juridica" ? "bg-sky-50 text-sky-800 ring-sky-200" : "bg-violet-50 text-violet-800 ring-violet-200")}>
                        {tp === "juridica" ? "Jurídica" : "Natural"}
                      </span>
                      {c.activo === false && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 align-middle text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">Inactivo</span>}
                      {c.variante && c.variante !== VARIANTE_BASE && <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 align-middle text-[11px] font-medium text-white">Formato {varianteDe(c.variante).marca}</span>}
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {n} docs{np ? ` · ${np} proy.` : ""}
                    </span>
                  </span>
                  {linea1 && <span className="mt-0.5 block break-words text-sm text-slate-600">{linea1}</span>}
                  {(linea2 || correo) && (
                    <span className="mt-0.5 block break-words text-xs text-slate-500">
                      {linea2}
                      {correo && (
                        <>
                          {linea2 && " · "}
                          <span className="[overflow-wrap:anywhere]">{correo}</span>
                        </>
                      )}
                    </span>
                  )}
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>
      <Paginacion p={pag} nombre="clientes" />
    </div>
  );
}
