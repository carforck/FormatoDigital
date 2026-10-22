"use client";

import { useState } from "react";
import { Plus, Power, Trash2 } from "lucide-react";

import { Avatar, PageHeader } from "@/components/ui/corporativo";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import type { Cliente } from "@/nucleo/tipos";
import { cn } from "@/lib/utils";

const VACIO: Cliente = { id: "", nombre: "", nit: "", direccion: "", contacto: "", cargo: "", correo: "", telefono: "", sitio: "" };
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

export default function Clientes() {
  const demo = useDemo();
  const [form, setForm] = useState<Cliente | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const existente = form && demo.clientes.find((c) => c.id === form.id);
  const abrir = (c: Cliente | null) => {
    setForm(c);
    setAviso(null);
  };

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

      {form && (
        <form
          className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            demo.guardarCliente(form);
            abrir(null);
          }}
        >
          {CAMPOS.map(([k, l]) => (
            <label key={k} className="text-sm">
              <span className="text-xs text-slate-500">{l}</span>
              <Input required={k === "nombre"} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </label>
          ))}
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
