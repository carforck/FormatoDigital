"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/corporativo";
import { Input } from "@/components/ui/input";
import { ETIQUETA_ROL } from "@/nucleo/catalogos";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { actualizarUsuario, crearUsuario, eliminarUsuario, listarUsuarios } from "@/nucleo/datos/usuarios-api";
import { CLAVE_MINIMA, ROLES_INTERNOS as ROLES, type NuevoUsuario, type RolInterno, type UsuarioEmpresa } from "@/nucleo/datos/usuarios-contrato";

const VACIO: NuevoUsuario = { nombre: "", email: "", cargo: "", rol: "tecnico", clave: "" };

/**
 * Usuarios con login del modo empresa (solo admin): crear con contraseña, editar
 * nombre, cargo y rol, cambiar contraseña, activar o desactivar y eliminar.
 * Cada cambio se refleja también en la lista de personas de los formatos.
 */
export function PanelUsuariosEmpresa() {
  const demo = useDemo();
  const [usuarios, setUsuarios] = useState<UsuarioEmpresa[] | null>(null);
  const [yo, setYo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [nuevo, setNuevo] = useState(VACIO);
  const [editando, setEditando] = useState<UsuarioEmpresa | null>(null);
  const [claveDe, setClaveDe] = useState<{ id: string; clave: string } | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await listarUsuarios();
      setUsuarios(r.usuarios);
      setYo(r.yo);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** La persona también aparece (o se actualiza) en los formatos del espacio. */
  const reflejar = (u: UsuarioEmpresa) => {
    const previo = demo.usuarios.find((x) => x.id === u.id);
    demo.actualizarUsuario({ ...previo, id: u.id, nombre: u.nombre, email: u.email, cargo: u.cargo, rol: u.rol, activo: u.activo });
  };

  const ejecutar = async (fn: () => Promise<string | void>) => {
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      const msg = await fn();
      if (msg) setAviso(msg);
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const crear = (e: React.FormEvent) => {
    e.preventDefault();
    void ejecutar(async () => {
      const r = await crearUsuario(nuevo);
      reflejar(r.usuario);
      setNuevo(VACIO);
      return `Usuario creado: ${r.usuario.email} ya puede iniciar sesión.`;
    });
  };

  const guardarEdicion = (e: React.FormEvent) => {
    e.preventDefault();
    const u = editando;
    if (!u) return;
    void ejecutar(async () => {
      await actualizarUsuario({ id: u.id, nombre: u.nombre, cargo: u.cargo, rol: u.rol });
      reflejar(u);
      setEditando(null);
      return "Cambios guardados.";
    });
  };

  const cambiarActivo = (u: UsuarioEmpresa) =>
    ejecutar(async () => {
      await actualizarUsuario({ id: u.id, activo: !u.activo });
      reflejar({ ...u, activo: !u.activo });
      return u.activo ? `${u.nombre} ya no puede iniciar sesión.` : `${u.nombre} puede volver a iniciar sesión.`;
    });

  const cambiarClave = (e: React.FormEvent) => {
    e.preventDefault();
    const c = claveDe;
    if (!c) return;
    void ejecutar(async () => {
      await actualizarUsuario({ id: c.id, clave: c.clave });
      setClaveDe(null);
      return "Contraseña actualizada.";
    });
  };

  const eliminar = (u: UsuarioEmpresa) => {
    if (!confirm(`¿Eliminar a ${u.nombre} (${u.email})? Ya no podrá iniciar sesión. Sus documentos se conservan.`)) return;
    void ejecutar(async () => {
      await eliminarUsuario(u.id);
      // En los formatos queda como persona inactiva para conservar el historial
      reflejar({ ...u, activo: false });
      return `${u.nombre} fue eliminado.`;
    });
  };

  const campo = "h-10 rounded-md border border-slate-200 bg-white px-2 text-sm";

  return (
    <section className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 pt-4">
          <div>
            <h2 className="font-semibold">Usuarios con acceso</h2>
            <p className="text-sm text-slate-500">Personas que inician sesión en el espacio de la empresa con su correo y contraseña.</p>
          </div>
          {ocupado && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" aria-label="Guardando" />}
        </div>

        {(error || aviso) && (
          <p role={error ? "alert" : "status"} className={`mx-4 mt-3 rounded-lg px-3 py-2 text-sm ${error ? "border border-rose-200 bg-rose-50 text-rose-800" : "border border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {error ?? aviso}
          </p>
        )}

        {!usuarios ? (
          <p className="px-4 py-6 text-sm text-slate-500">{error ? "" : "Cargando usuarios…"}</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Persona</th>
                <th className="px-4 py-2">Rol</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map((u) => {
                const propio = u.id === yo;
                return (
                  <tr key={u.id} className={u.activo ? "" : "opacity-60"}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar nombre={u.nombre || u.email} className="hidden sm:inline-flex" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">
                            {u.nombre || "Sin nombre"} {propio && <span className="text-xs font-normal text-slate-500">(tú)</span>}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {u.email}
                            {u.cargo && <span className="hidden sm:inline"> · {u.cargo}</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">{ETIQUETA_ROL[u.rol]}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        disabled={propio || ocupado}
                        onClick={() => void cambiarActivo(u)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium disabled:cursor-not-allowed ${u.activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                        title={propio ? "No puedes desactivarte" : u.activo ? "Desactivar acceso" : "Activar acceso"}
                      >
                        {u.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="icon" disabled={ocupado} onClick={() => setEditando({ ...u })} aria-label={`Editar ${u.nombre}`} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" disabled={ocupado} onClick={() => setClaveDe({ id: u.id, clave: "" })} aria-label={`Cambiar contraseña de ${u.nombre}`} title="Cambiar contraseña">
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" disabled={ocupado || propio} onClick={() => eliminar(u)} aria-label={`Eliminar ${u.nombre}`} title={propio ? "No puedes eliminarte" : "Eliminar"}>
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editando && (
        <form onSubmit={guardarEdicion} className="flex flex-wrap items-end gap-2 rounded-xl border border-sotec-green/40 bg-sotec-soft p-4">
          <p className="w-full text-sm font-semibold text-slate-900">Editar {editando.email}</p>
          <label className="min-w-[180px] flex-1 text-sm">
            <span className="text-xs text-slate-500">Nombre</span>
            <Input required value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
          </label>
          <label className="min-w-[140px] flex-1 text-sm">
            <span className="text-xs text-slate-500">Cargo</span>
            <Input value={editando.cargo} onChange={(e) => setEditando({ ...editando, cargo: e.target.value })} />
          </label>
          <select value={editando.rol} disabled={editando.id === yo} onChange={(e) => setEditando({ ...editando, rol: e.target.value as RolInterno })} className={campo} aria-label="Rol">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ETIQUETA_ROL[r]}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={ocupado}>
            Guardar
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEditando(null)}>
            <X className="h-4 w-4" /> Cancelar
          </Button>
        </form>
      )}

      {claveDe && (
        <form onSubmit={cambiarClave} className="flex flex-wrap items-end gap-2 rounded-xl border border-sotec-green/40 bg-sotec-soft p-4">
          <p className="w-full text-sm font-semibold text-slate-900">Nueva contraseña para {usuarios?.find((u) => u.id === claveDe.id)?.email}</p>
          <label className="min-w-[220px] flex-1 text-sm">
            <span className="text-xs text-slate-500">Contraseña (mínimo {CLAVE_MINIMA} caracteres)</span>
            <Input required minLength={CLAVE_MINIMA} type="text" autoComplete="new-password" value={claveDe.clave} onChange={(e) => setClaveDe({ ...claveDe, clave: e.target.value })} />
          </label>
          <Button type="submit" disabled={ocupado}>
            Cambiar contraseña
          </Button>
          <Button type="button" variant="ghost" onClick={() => setClaveDe(null)}>
            <X className="h-4 w-4" /> Cancelar
          </Button>
        </form>
      )}

      <form onSubmit={crear} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="w-full text-sm font-semibold text-slate-900">Nuevo usuario</p>
        <label className="min-w-[180px] flex-1 text-sm">
          <span className="text-xs text-slate-500">Nombre</span>
          <Input required value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
        </label>
        <label className="min-w-[200px] flex-1 text-sm">
          <span className="text-xs text-slate-500">Correo</span>
          <Input required type="email" autoComplete="off" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} />
        </label>
        <label className="min-w-[140px] flex-1 text-sm">
          <span className="text-xs text-slate-500">Cargo</span>
          <Input value={nuevo.cargo} onChange={(e) => setNuevo({ ...nuevo, cargo: e.target.value })} />
        </label>
        <label className="min-w-[160px] flex-1 text-sm">
          <span className="text-xs text-slate-500">Contraseña (mín. {CLAVE_MINIMA})</span>
          <Input required minLength={CLAVE_MINIMA} type="text" autoComplete="new-password" value={nuevo.clave} onChange={(e) => setNuevo({ ...nuevo, clave: e.target.value })} />
        </label>
        <select value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value as RolInterno })} className={campo} aria-label="Rol">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ETIQUETA_ROL[r]}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={ocupado}>
          <Plus className="h-4 w-4" /> Crear usuario
        </Button>
      </form>
    </section>
  );
}
