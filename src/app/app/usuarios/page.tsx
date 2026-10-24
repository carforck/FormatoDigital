"use client";

/**
 * Ruta /app/usuarios: gestión de usuarios y roles (solo la administración, permiso
 * `usuarios`). En modo empresa delega en PanelUsuariosEmpresa (cuentas reales vía
 * /api/usuarios); en modo demo edita rol, empresa cliente y activación en local con
 * demo.actualizarUsuario. Siempre muestra la matriz de permisos de @/nucleo/permisos.
 */
import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, PageHeader } from "@/components/ui/corporativo";
import { Input } from "@/components/ui/input";
import { ETIQUETA_ROL } from "@/nucleo/catalogos";
import { ACCIONES, DESCRIPCION_ACCION, puede } from "@/nucleo/permisos";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { PanelUsuariosEmpresa } from "@/components/usuarios/PanelUsuariosEmpresa";
import type { Rol } from "@/nucleo/tipos";

const ROLES = Object.keys(ETIQUETA_ROL) as Rol[];

/**
 * El propio usuario no puede cambiarse el rol ni desactivarse (evita quedarse sin acceso).
 * Un usuario con rol Cliente siempre queda ligado a una empresa cliente.
 */
export default function Usuarios() {
  const demo = useDemo();
  const [nuevo, setNuevo] = useState({ nombre: "", email: "", cargo: "", rol: "tecnico" as Rol, clienteId: "" });
  const primerCliente = demo.clientes[0]?.id;
  const sinClientes = demo.clientes.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader etiqueta="Administración" titulo="Usuarios y roles" descripcion="Asigna el rol de cada persona; el menú y los permisos cambian al instante." />

      {demo.modo === "empresa" ? (
        <PanelUsuariosEmpresa />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Persona</th>
                  <th className="px-4 py-2">Rol / empresa</th>
                  <th className="px-4 py-2">Activo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {demo.usuarios.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar nombre={u.nombre} className="hidden sm:inline-flex" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{u.nombre}</p>
                          <p className="text-xs text-slate-500">
                            {u.cargo}
                            <span className="hidden sm:inline"> · {u.email}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={u.rol}
                          aria-label={`Rol de ${u.nombre}`}
                          disabled={u.id === demo.usuario?.id}
                          onChange={(e) => {
                            const rol = e.target.value as Rol;
                            // Al pasar a Cliente conserva su empresa si ya tenía; si no, toma la primera y se puede cambiar al lado
                            demo.actualizarUsuario({ ...u, rol, clienteId: rol === "cliente" ? u.clienteId ?? primerCliente : undefined });
                          }}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r} disabled={r === "cliente" && sinClientes}>
                              {ETIQUETA_ROL[r]}
                            </option>
                          ))}
                        </select>
                        {u.rol === "cliente" && (
                          <select
                            value={u.clienteId ?? ""}
                            aria-label={`Empresa cliente de ${u.nombre}`}
                            disabled={u.id === demo.usuario?.id}
                            onChange={(e) => demo.actualizarUsuario({ ...u, clienteId: e.target.value })}
                            className="max-w-[16rem] truncate rounded-md border border-slate-200 bg-white px-2 py-1"
                          >
                            {!u.clienteId && <option value="">Elegir empresa…</option>}
                            {demo.clientes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nombre}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
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
            className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              const { clienteId, ...resto } = nuevo;
              if (nuevo.rol === "cliente" && !clienteId) return;
              demo.actualizarUsuario({ id: `u-${Date.now()}`, ...resto, activo: true, clienteId: nuevo.rol === "cliente" ? clienteId : undefined });
              setNuevo({ nombre: "", email: "", cargo: "", rol: "tecnico", clienteId: "" });
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
            <select
              value={nuevo.rol}
              onChange={(e) => {
                const rol = e.target.value as Rol;
                setNuevo({ ...nuevo, rol, clienteId: rol === "cliente" ? nuevo.clienteId || primerCliente || "" : "" });
              }}
              className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm"
              aria-label="Rol"
            >
              {ROLES.map((r) => (
                <option key={r} value={r} disabled={r === "cliente" && sinClientes}>
                  {ETIQUETA_ROL[r]}
                </option>
              ))}
            </select>
            {nuevo.rol === "cliente" && (
              <label className="min-w-[200px] flex-1 text-sm">
                <span className="text-xs text-slate-500">Empresa cliente</span>
                <select
                  required
                  value={nuevo.clienteId}
                  onChange={(e) => setNuevo({ ...nuevo, clienteId: e.target.value })}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                  aria-label="Empresa cliente"
                >
                  <option value="" disabled>
                    Elegir empresa…
                  </option>
                  {demo.clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Button type="submit">
              <Plus className="h-4 w-4" /> Invitar
            </Button>
          </form>
        </>
      )}

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
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
