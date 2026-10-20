"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { puede, puedeVerDoc } from "./permisos";
import {
  CLIENTES_SEED,
  CONFIG_SEED,
  USUARIOS_SEED,
  auditoriaSeed,
  documentosSeed,
  notificacionesSeed,
} from "./seed";
import type { Auditoria, Cliente, Config, Documento, Notificacion, Rol, TipoDoc, Usuario } from "./types";

const KEY = "sotec-demo-v1";

interface Estado {
  usuarioId: string | null;
  usuarios: Usuario[];
  clientes: Cliente[];
  documentos: Documento[];
  notificaciones: Notificacion[];
  auditoria: Auditoria[];
  config: Config;
}

function inicial(): Estado {
  return {
    usuarioId: null,
    usuarios: USUARIOS_SEED,
    clientes: CLIENTES_SEED,
    documentos: documentosSeed(),
    notificaciones: notificacionesSeed(),
    auditoria: auditoriaSeed(),
    config: CONFIG_SEED,
  };
}

export function ahora(): string {
  // Hora local sin zona, suficiente para la demo
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
export function hoy(): string {
  return ahora().slice(0, 10);
}
function uid(p: string) {
  return `${p}-${Math.random().toString(36).slice(2, 9)}`;
}

interface Api extends Estado {
  listo: boolean;
  usuario: Usuario | null;
  visibles: Documento[];
  misNotificaciones: Notificacion[];
  entrarComo: (rol: Rol, usuarioId?: string) => void;
  salir: () => void;
  guardar: (doc: Documento) => Documento;
  nuevoId: (tipo: TipoDoc) => { id: string; codigo: string; consecutivo: number };
  enviar: (id: string) => void;
  aprobar: (id: string, firmaAutoriza?: string) => void;
  rechazar: (id: string, motivo: string) => void;
  cerrar: (id: string, cambios: Partial<Documento["datos"]>) => void;
  duplicar: (id: string) => string | null;
  eliminar: (id: string) => void;
  marcarLeidas: () => void;
  actualizarUsuario: (u: Usuario) => void;
  guardarCliente: (c: Cliente) => void;
  actualizarConfig: (c: Config) => void;
  reiniciar: () => void;
}

const Ctx = createContext<Api | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<Estado>(inicial);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...inicial(), ...JSON.parse(raw) });
    } catch {
      /* sin almacenamiento: la demo funciona en memoria */
    }
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignorar */
    }
  }, [s, listo]);

  const usuario = s.usuarios.find((u) => u.id === s.usuarioId) ?? null;

  const registrar = useCallback(
    (prev: Estado, accion: string, detalle: string): Auditoria[] => [
      { id: uid("a"), fecha: ahora(), usuarioId: prev.usuarioId ?? "anon", accion, detalle },
      ...prev.auditoria,
    ],
    [],
  );

  const notificar = (prev: Estado, para: string, texto: string, docId?: string): Notificacion[] => [
    { id: uid("n"), para, texto, docId, fecha: ahora(), leida: false },
    ...prev.notificaciones,
  ];

  const transicion = useCallback(
    (id: string, fn: (d: Documento, prev: Estado) => Partial<Estado> & { doc: Documento }) => {
      setS((prev) => {
        const d = prev.documentos.find((x) => x.id === id);
        if (!d) return prev;
        const { doc, ...resto } = fn(d, prev);
        return { ...prev, ...resto, documentos: prev.documentos.map((x) => (x.id === id ? doc : x)) };
      });
    },
    [],
  );

  const api = useMemo<Api>(() => {
    const nombre = (id: string | null) => s.usuarios.find((u) => u.id === id)?.nombre.split(" ").slice(0, 2).join(" ") ?? "Alguien";
    const evento = (prev: Estado, accion: string, detalle?: string) => ({ fecha: ahora(), usuarioId: prev.usuarioId ?? "", accion, detalle });

    return {
      ...s,
      listo,
      usuario,
      visibles: usuario ? s.documentos.filter((d) => puedeVerDoc(usuario, d)) : [],
      misNotificaciones: usuario
        ? s.notificaciones.filter((n) => n.para === usuario.rol || n.para === usuario.id)
        : [],

      entrarComo(rol, usuarioId) {
        setS((prev) => {
          const u = usuarioId ? prev.usuarios.find((x) => x.id === usuarioId) : prev.usuarios.find((x) => x.rol === rol && x.activo);
          if (!u) return prev;
          return { ...prev, usuarioId: u.id, auditoria: [{ id: uid("a"), fecha: ahora(), usuarioId: u.id, accion: "Ingresó a la demo", detalle: rol }, ...prev.auditoria] };
        });
      },
      salir() {
        setS((prev) => ({ ...prev, usuarioId: null }));
      },

      nuevoId(tipo) {
        const pref = tipo === "reporte" ? s.config.prefijoReporte : s.config.prefijoPermiso;
        const yy = hoy().slice(2, 4);
        const usados = s.documentos.filter((d) => d.tipo === tipo).map((d) => d.consecutivo);
        const consecutivo = (usados.length ? Math.max(...usados) : 0) + 1;
        return { id: uid("d"), consecutivo, codigo: `${pref}-${String(consecutivo).padStart(3, "0")}-${yy}` };
      },

      guardar(doc) {
        const actualizado = { ...doc, actualizado: ahora() };
        setS((prev) => {
          const existe = prev.documentos.some((d) => d.id === doc.id);
          if (existe) {
            return { ...prev, documentos: prev.documentos.map((d) => (d.id === doc.id ? actualizado : d)) };
          }
          return {
            ...prev,
            documentos: [{ ...actualizado, historial: [evento(prev, "Creó el documento")] }, ...prev.documentos],
            auditoria: registrar(prev, "Creó", doc.codigo),
          };
        });
        return actualizado;
      },

      enviar(id) {
        transicion(id, (d, prev) => ({
          doc: { ...d, estado: "en_revision", motivoRechazo: undefined, historial: [...d.historial, evento(prev, "Envió a revisión")] },
          notificaciones: notificar(prev, "supervisor", `${nombre(prev.usuarioId)} envió ${d.codigo} a revisión`, d.id),
          auditoria: registrar(prev, "Envió a revisión", d.codigo),
        }));
      },

      aprobar(id, firmaAutoriza) {
        transicion(id, (d, prev) => {
          const u = prev.usuarios.find((x) => x.id === prev.usuarioId);
          const datos =
            d.tipo === "permiso"
              ? { ...d.datos, autoriza: d.datos.autoriza || u?.nombre || "", firmaAutoriza: firmaAutoriza || d.datos.firmaAutoriza }
              : d.datos;
          let notifs = notificar(prev, d.autorId, `${d.codigo} fue aprobado por ${nombre(prev.usuarioId)}`, d.id);
          if (d.tipo === "reporte") notifs = [{ id: uid("n"), para: "cliente", texto: `SOTEC compartió el reporte ${d.codigo} para tu firma`, docId: d.id, fecha: ahora(), leida: false }, ...notifs];
          return {
            doc: { ...d, datos, estado: "aprobado", historial: [...d.historial, evento(prev, "Aprobó")] } as Documento,
            notificaciones: notifs,
            auditoria: registrar(prev, "Aprobó", d.codigo),
          };
        });
      },

      rechazar(id, motivo) {
        transicion(id, (d, prev) => ({
          doc: { ...d, estado: "rechazado", motivoRechazo: motivo, historial: [...d.historial, evento(prev, "Rechazó", motivo)] },
          notificaciones: notificar(prev, d.autorId, `${d.codigo} fue rechazado: ${motivo}`, d.id),
          auditoria: registrar(prev, "Rechazó", `${d.codigo} · ${motivo}`),
        }));
      },

      cerrar(id, cambios) {
        transicion(id, (d, prev) => ({
          doc: { ...d, datos: { ...d.datos, ...cambios }, estado: "cerrado", historial: [...d.historial, evento(prev, d.tipo === "permiso" ? "Cerró el permiso" : "Firmó como cliente")] } as Documento,
          notificaciones: notificar(prev, d.autorId, `${d.codigo} quedó cerrado`, d.id),
          auditoria: registrar(prev, d.tipo === "permiso" ? "Cerró permiso" : "Firma cliente", d.codigo),
        }));
      },

      duplicar(id) {
        const d = s.documentos.find((x) => x.id === id);
        if (!d || !usuario) return null;
        const n = api.nuevoId(d.tipo);
        const datos = d.tipo === "reporte"
          ? { ...d.datos, fecha: hoy(), firmaTecnico: "", firmaCliente: "" }
          : { ...d.datos, fechaEmision: hoy(), firmaAutoriza: "", firmaEncargado: "", firmaCierre: "", cierreAreaLimpia: "", cierraNombre: "", ejecutores: d.datos.ejecutores.map((e) => ({ ...e, firma: "" })) };
        const copia = { ...d, ...n, datos, estado: "borrador", autorId: usuario.id, creado: ahora(), actualizado: ahora(), motivoRechazo: undefined, historial: [] } as Documento;
        api.guardar(copia);
        return copia.id;
      },

      eliminar(id) {
        setS((prev) => {
          const d = prev.documentos.find((x) => x.id === id);
          return { ...prev, documentos: prev.documentos.filter((x) => x.id !== id), auditoria: registrar(prev, "Eliminó", d?.codigo ?? id) };
        });
      },

      marcarLeidas() {
        setS((prev) => ({
          ...prev,
          notificaciones: prev.notificaciones.map((n) =>
            usuario && (n.para === usuario.rol || n.para === usuario.id) ? { ...n, leida: true } : n,
          ),
        }));
      },

      actualizarUsuario(u) {
        if (!usuario || !puede(usuario.rol, "usuarios")) return;
        setS((prev) => {
          const existe = prev.usuarios.some((x) => x.id === u.id);
          return {
            ...prev,
            usuarios: existe ? prev.usuarios.map((x) => (x.id === u.id ? u : x)) : [...prev.usuarios, u],
            auditoria: registrar(prev, existe ? "Actualizó usuario" : "Creó usuario", `${u.nombre} · ${u.rol}`),
          };
        });
      },

      guardarCliente(c) {
        setS((prev) => {
          const existe = prev.clientes.some((x) => x.id === c.id);
          return {
            ...prev,
            clientes: existe ? prev.clientes.map((x) => (x.id === c.id ? c : x)) : [...prev.clientes, c],
            auditoria: registrar(prev, existe ? "Actualizó cliente" : "Creó cliente", c.nombre),
          };
        });
      },

      actualizarConfig(c) {
        setS((prev) => ({ ...prev, config: c, auditoria: registrar(prev, "Cambió configuración", "Formatos y consecutivos") }));
      },

      reiniciar() {
        setS((prev) => ({ ...inicial(), usuarioId: prev.usuarioId }));
      },
    };
  }, [s, listo, usuario, registrar, transicion]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDemo(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemo fuera de DemoProvider");
  return v;
}
