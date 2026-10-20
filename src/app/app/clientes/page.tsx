"use client";

import { useState } from "react";
import { Building2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDemo } from "@/lib/store";
import type { Cliente } from "@/lib/types";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-slate-500">El asistente usa este directorio para autocompletar los formatos.</p>
        </div>
        <Button onClick={() => setForm({ ...VACIO, id: `c-${Date.now()}` })}>
          <Plus className="h-4 w-4" /> Nuevo cliente
        </Button>
      </div>

      {form && (
        <form
          className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
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
            <button key={c.id} onClick={() => setForm(c)} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-sotec-greenDeep">
              <p className="flex items-center gap-2 font-semibold">
                <Building2 className="h-4 w-4 text-slate-500" /> {c.nombre}
                <span className="ml-auto text-xs font-normal text-slate-500">{n} documentos</span>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {c.contacto} · {c.cargo}
              </p>
              <p className="text-xs text-slate-500">
                {c.direccion} · {c.telefono} · {c.correo}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
