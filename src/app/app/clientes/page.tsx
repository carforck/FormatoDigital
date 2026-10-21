"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Avatar, PageHeader } from "@/components/ui/corporativo";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import type { Cliente } from "@/nucleo/tipos";

const VACIO: Cliente = { id: "", nombre: "", direccion: "", contacto: "", cargo: "", correo: "", telefono: "", sitio: "" };
const CAMPOS: [keyof Cliente, string][] = [
  ["nombre", "Razón social"],
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

  return (
    <div className="space-y-4">
      <PageHeader
        etiqueta="Gestión SST"
        titulo="Clientes"
        descripcion="El asistente usa este directorio para autocompletar los formatos."
        acciones={
          <Button onClick={() => setForm({ ...VACIO, id: `c-${Date.now()}` })}>
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
            setForm(null);
          }}
        >
          {CAMPOS.map(([k, l]) => (
            <label key={k} className="text-sm">
              <span className="text-xs text-slate-500">{l}</span>
              <Input required={k === "nombre"} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </label>
          ))}
          <div className="flex items-end justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {demo.clientes.map((c) => {
          const n = demo.documentos.filter((d) => d.clienteId === c.id).length;
          return (
            <button key={c.id} onClick={() => setForm(c)} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sotec-greenDeep hover:shadow-md">
              <Avatar nombre={c.nombre} className="h-11 w-11 rounded-xl text-sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-slate-900">{c.nombre}</span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{n} docs</span>
                </span>
                <span className="mt-0.5 block text-sm text-slate-600">
                  {c.contacto} · {c.cargo}
                </span>
                <span className="mt-0.5 block break-words text-xs text-slate-500">
                  {c.direccion} · {c.telefono} · {c.correo}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
