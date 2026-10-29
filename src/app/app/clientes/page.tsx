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
 */
import { useState } from "react";
import { Plus, Power, Trash2, Wand2 } from "lucide-react";

import { Avatar, PageHeader } from "@/components/ui/corporativo";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { separarCliente } from "@/nucleo/clientes";
import type { Cliente } from "@/nucleo/tipos";
import { cn } from "@/lib/utils";
import { VARIANTES, VARIANTE_BASE, varianteDe } from "@/nucleo/variantes";

/** Cliente en blanco para el formulario de alta (el id se genera al abrir). */
const VACIO: Cliente = { id: "", nombre: "", nit: "", direccion: "", contacto: "", cargo: "", correo: "", telefono: "", sitio: "" };
/** Campos editables del formulario con su etiqueta (`activo` se maneja con el botón Desactivar/Reactivar). */
const CAMPOS: [Exclude<keyof Cliente, "activo">, string][] = [
  ["nombre", "Razón social"],
  ["nit", "NIT o C.C."],
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
            demo.guardarCliente(conNombreSeparado(form, form.nombre) ?? form);
            abrir(null);
          }}
        >
          {CAMPOS.map(([k, l]) => (
            <label key={k} className="text-sm">
              <span className="text-xs text-slate-500">{l}</span>
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {demo.clientes.map((c) => {
          const n = demo.documentos.filter((d) => d.clienteId === c.id).length;
          const np = demo.proyectos.filter((p) => p.clienteId === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => abrir(c)}
              aria-label={`Editar ${c.nombre}`}
              className={cn("flex min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sotec-greenDeep hover:shadow-md", c.activo === false && "opacity-70")}
            >
              <Avatar nombre={c.nombre} className="h-11 w-11 rounded-xl text-sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0 break-words font-semibold text-slate-900">
                    {c.nombre}
                    {c.activo === false && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 align-middle text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">Inactivo</span>}
                    {c.variante && c.variante !== VARIANTE_BASE && <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 align-middle text-[11px] font-medium text-white">Formato {varianteDe(c.variante).marca}</span>}
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {n} docs{np ? ` · ${np} proy.` : ""}
                  </span>
                </span>
                <span className="mt-0.5 block break-words text-sm text-slate-600">
                  {c.contacto} · {c.cargo}
                  {c.nit ? ` · NIT ${c.nit}` : ""}
                </span>
                <span className="mt-0.5 block break-words text-xs text-slate-500">
                  {c.direccion} · {c.telefono}
                  {c.correo && (
                    <>
                      {" · "}
                      <span className="[overflow-wrap:anywhere]">{c.correo}</span>
                    </>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
