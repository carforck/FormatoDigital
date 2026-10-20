"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ETIQUETA_ROL } from "@/lib/formatos";
import { ACCIONES, DESCRIPCION_ACCION, puede } from "@/lib/permisos";
import { useDemo } from "@/lib/store";
import type { Rol } from "@/lib/types";

const ROLES = Object.keys(ETIQUETA_ROL) as Rol[];

export default function Usuarios() {
  const demo = useDemo();
  const [nuevo, setNuevo] = useState({ nombre: "", email: "", cargo: "", rol: "tecnico" as Rol });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios y roles</h1>
        <p className="text-sm text-slate-500">Asigna el rol de cada persona; el menú y los permisos cambian al instante.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Persona</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Activo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {demo.usuarios.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2.5">
                  <p className="font-medium">{u.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {u.cargo} · {u.email}
                  </p>
                </td>
                <td className="px-4">
                  <select
                    value={u.rol}
                    disabled={u.id === demo.usuario?.id}
                    onChange={(e) => demo.actualizarUsuario({ ...u, rol: e.target.value as Rol, clienteId: e.target.value === "cliente" ? u.clienteId ?? demo.clientes[0].id : undefined })}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ETIQUETA_ROL[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4">
                  <input type="checkbox" aria-label="Activo" checked={u.activo} disabled={u.id === demo.usuario?.id} onChange={(e) => demo.actualizarUsuario({ ...u, activo: e.target.checked })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          demo.actualizarUsuario({ id: `u-${Date.now()}`, ...nuevo, activo: true, clienteId: nuevo.rol === "cliente" ? demo.clientes[0].id : undefined });
          setNuevo({ nombre: "", email: "", cargo: "", rol: "tecnico" });
        }}
      >
        <label className="min-w-[180px] flex-1 text-sm">
          <span className="text-xs text-slate-500">Nombre</span>
          <Input required value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
        </label>
        <label className="min-w-[180px] flex-1 text-sm">
          <span className="text-xs text-slate-500">Correo</span>
          <Input required type="email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} />
        </label>
        <label className="min-w-[140px] flex-1 text-sm">
          <span className="text-xs text-slate-500">Cargo</span>
          <Input value={nuevo.cargo} onChange={(e) => setNuevo({ ...nuevo, cargo: e.target.value })} />
        </label>
        <select value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value as Rol })} className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm" aria-label="Rol">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ETIQUETA_ROL[r]}
            </option>
          ))}
        </select>
        <Button type="submit">
          <Plus className="h-4 w-4" /> Invitar
        </Button>
      </form>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <h2 className="px-4 pt-4 font-semibold">Matriz de permisos</h2>
        <table className="mt-2 w-full text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Acción</th>
              {ROLES.map((r) => (
                <th key={r} className="px-2 py-2 font-medium">
                  {ETIQUETA_ROL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ACCIONES.map((a) => (
              <tr key={a}>
                <td className="px-4 py-2">{DESCRIPCION_ACCION[a]}</td>
                {ROLES.map((r) => (
                  <td key={r} className="text-center">
                    {puede(r, a) ? <Check className="mx-auto h-4 w-4 text-emerald-600" /> : <Minus className="mx-auto h-4 w-4 text-slate-300" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
