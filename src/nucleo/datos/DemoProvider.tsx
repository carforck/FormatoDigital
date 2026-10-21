"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { SIGUIENTES, type CuentaCobro, type EstadoCuentaCobro } from "@/modulos/cobros/tipos";
import { puede, puedeVerCuenta, puedeVerDoc } from "@/nucleo/permisos";
import {
  CLIENTES_SEED,
  CONFIG_SEED,
  USUARIOS_SEED,
  auditoriaSeed,
  cuentasSeed,
  documentosSeed,
  notificacionesSeed,
} from "@/nucleo/datos/seed";
import type { Auditoria, Cliente, Config, Documento, EnlaceFirma, Notificacion, Rol, TipoDoc, Usuario } from "@/nucleo/tipos";

// Subir la versión al cambiar la semilla: los navegadores cargan los datos nuevos
const KEY = "sotec-demo-v2";

interface Estado {
  usuarioId: string | null;
  usuarios: Usuario[];
  clientes: Cliente[];
  documentos: Documento[];
  notificaciones: Notificacion[];
  auditoria: Auditoria[];
  config: Config;
  cuentas: CuentaCobro[];
  enlaces: EnlaceFirma[];
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
    cuentas: cuentasSeed(),
    enlaces: [],
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
  // Firma remota y envíos
  crearEnlaceFirma: (docId: string, correo: string) => string;
  enlaceVigente: (token: string) => { enlace: EnlaceFirma; doc: Documento } | null;
  firmarConEnlace: (token: string, nombre: string, imagen: string) => "cerrado" | "firmado" | "invalido";
  registrarEnvio: (ref: { docId?: string; cuentaId?: string }, canal: "correo" | "whatsapp", destino: string) => void;
  // Cuentas de cobro
  cuentasVisibles: CuentaCobro[];
  nuevoCodigoCuenta: () => { id: string; codigo: string; consecutivo: number };
  guardarCuenta: (c: CuentaCobro) => void;
  cambiarEstadoCuenta: (id: string, estado: EstadoCuentaCobro) => void;
  /** Cuenta de cobro (no anulada) que ya incluye un reporte, si existe. */
  cuentaDeReporte: (docId: string) => CuentaCobro | undefined;
  errorGuardado: string | null;
}

const Ctx = createContext<Api | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<Estado>(inicial);
  const [listo, setListo] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const guardado = JSON.parse(raw);
        const base = inicial();
        setS({ ...base, ...guardado, config: { ...base.config, ...guardado.config } });
      }
    } catch {
      /* sin almacenamiento: la demo funciona en memoria */
    }
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
      setErrorGuardado(null);
    } catch {
      setErrorGuardado("El navegador no tiene espacio para guardar más datos de la demo (las fotos ocupan espacio). Quita algunas fotos o restablece la demo en Configuración.");
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
    const vigente = (token: string): { enlace: EnlaceFirma; doc: Documento } | null => {
      const enlace = s.enlaces.find((e) => e.token === token);
      if (!enlace || enlace.usado || enlace.expira < ahora()) return null;
      const doc = s.documentos.find((d) => d.id === enlace.docId);
      return doc ? { enlace, doc } : null;
    };

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
        const pref = { reporte: s.config.prefijoReporte, permiso: s.config.prefijoPermiso, gasto: s.config.prefijoGasto }[tipo];
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
              : d.tipo === "gasto"
                ? { ...d.datos, voboNombre: u?.nombre || "", firmaVobo: firmaAutoriza || d.datos.firmaVobo }
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
          doc: { ...d, datos: { ...d.datos, ...cambios }, estado: "cerrado", historial: [...d.historial, evento(prev, d.tipo === "permiso" ? "Cerró el permiso" : d.tipo === "gasto" ? "Marcó como reembolsado" : "Firmó como cliente")] } as Documento,
          notificaciones: notificar(prev, d.autorId, `${d.codigo} quedó cerrado`, d.id),
          auditoria: registrar(prev, d.tipo === "permiso" ? "Cerró permiso" : d.tipo === "gasto" ? "Reembolsó gastos" : "Firma cliente", d.codigo),
        }));
      },

      duplicar(id) {
        const d = s.documentos.find((x) => x.id === id);
        if (!d || !usuario) return null;
        const n = api.nuevoId(d.tipo);
        const datos = d.tipo === "reporte"
          ? { ...d.datos, fecha: hoy(), firmaTecnico: "", firmaCliente: "" }
          : d.tipo === "permiso"
            ? { ...d.datos, fechaEmision: hoy(), firmaAutoriza: "", firmaEncargado: "", firmaCierre: "", cierreAreaLimpia: "", cierraNombre: "", ejecutores: d.datos.ejecutores.map((e) => ({ ...e, firma: "" })) }
            : { ...d.datos, fecha: hoy(), items: [], firmaColaborador: "", voboNombre: "", firmaVobo: "" };
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

      crearEnlaceFirma(docId, correo) {
        const token = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join("");
        const expira = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 19);
        setS((prev) => {
          const d = prev.documentos.find((x) => x.id === docId);
          return {
            ...prev,
            enlaces: [{ token, docId, campo: "firmaCliente", correo, creado: ahora(), expira }, ...prev.enlaces],
            documentos: prev.documentos.map((x) => (x.id === docId ? { ...x, historial: [...x.historial, evento(prev, "Pidió la firma del cliente por enlace", correo || undefined)] } : x)),
            auditoria: registrar(prev, "Solicitó firma remota", d?.codigo ?? docId),
          };
        });
        return token;
      },

      enlaceVigente: vigente,

      firmarConEnlace(token, nombre, imagen) {
        const v = vigente(token);
        if (!v || v.doc.tipo !== "reporte" || !nombre.trim() || !imagen.startsWith("data:image/")) return "invalido";
        const cierra = v.doc.estado === "aprobado";
        setS((prev) => ({
          ...prev,
          enlaces: prev.enlaces.map((e) => (e.token === token ? { ...e, usado: ahora() } : e)),
          documentos: prev.documentos.map((d) => {
            if (d.id !== v.doc.id || d.tipo !== "reporte") return d;
            const ev = { fecha: ahora(), usuarioId: "", accion: "Firmó por enlace", detalle: nombre.trim() };
            return {
              ...d,
              datos: { ...d.datos, firmaCliente: imagen },
              estado: cierra ? "cerrado" : d.estado,
              historial: [...d.historial, ev, ...(cierra ? [{ ...ev, accion: "Cerró con la firma del cliente" }] : [])],
            };
          }),
          notificaciones: [
            { id: uid("n"), para: v.doc.autorId, texto: `${nombre.trim()} firmó ${v.doc.codigo} desde el enlace`, docId: v.doc.id, fecha: ahora(), leida: false },
            ...prev.notificaciones,
          ],
          auditoria: [{ id: uid("a"), fecha: ahora(), usuarioId: "enlace", accion: "Firma por enlace", detalle: `${v.doc.codigo} · ${nombre.trim()}` }, ...prev.auditoria],
        }));
        return cierra ? "cerrado" : "firmado";
      },

      registrarEnvio({ docId, cuentaId }, canal, destino) {
        const accion = canal === "correo" ? "Envió por correo" : "Envió por WhatsApp";
        setS((prev) => ({
          ...prev,
          documentos: docId ? prev.documentos.map((d) => (d.id === docId ? { ...d, historial: [...d.historial, evento(prev, accion, destino)] } : d)) : prev.documentos,
          cuentas: cuentaId
            ? prev.cuentas.map((c) =>
                c.id === cuentaId ? { ...c, estado: c.estado === "emitida" ? "enviada" : c.estado, historial: [...c.historial, evento(prev, accion, destino)], actualizado: ahora() } : c,
              )
            : prev.cuentas,
          auditoria: registrar(prev, accion, destino),
        }));
      },

      cuentasVisibles: usuario ? s.cuentas.filter((c) => puedeVerCuenta(usuario, c)) : [],

      nuevoCodigoCuenta() {
        const yy = hoy().slice(2, 4);
        const consecutivo = (s.cuentas.length ? Math.max(...s.cuentas.map((c) => c.consecutivo)) : 0) + 1;
        return { id: uid("cc"), consecutivo, codigo: `${s.config.prefijoCobro}-${String(consecutivo).padStart(3, "0")}-${yy}` };
      },

      guardarCuenta(c) {
        if (!usuario || !puede(usuario.rol, "cobros")) return;
        setS((prev) => {
          const existe = prev.cuentas.find((x) => x.id === c.id);
          if (existe && existe.estado !== "borrador") return prev; // emitida: ya no cambia
          const nueva = { ...c, actualizado: ahora(), historial: existe ? existe.historial : [evento(prev, "Creó la cuenta de cobro")] };
          return {
            ...prev,
            cuentas: existe ? prev.cuentas.map((x) => (x.id === c.id ? nueva : x)) : [nueva, ...prev.cuentas],
            auditoria: existe ? prev.auditoria : registrar(prev, "Creó cuenta de cobro", c.codigo),
          };
        });
      },

      cambiarEstadoCuenta(id, estado) {
        if (!usuario || !puede(usuario.rol, "cobros")) return;
        setS((prev) => {
          const c = prev.cuentas.find((x) => x.id === id);
          if (!c || !SIGUIENTES[c.estado].includes(estado)) return prev;
          const etiqueta = { emitida: "Emitió", enviada: "Marcó como enviada", pagada: "Marcó como pagada", anulada: "Anuló", borrador: "" }[estado];
          return {
            ...prev,
            cuentas: prev.cuentas.map((x) => (x.id === id ? { ...x, estado, actualizado: ahora(), historial: [...x.historial, evento(prev, etiqueta)] } : x)),
            notificaciones:
              estado === "emitida"
                ? [{ id: uid("n"), para: "cliente", texto: `${prev.config.empresa} emitió la cuenta de cobro ${c.codigo}`, fecha: ahora(), leida: false }, ...prev.notificaciones]
                : prev.notificaciones,
            auditoria: registrar(prev, `Cuenta de cobro: ${etiqueta.toLowerCase()}`, c.codigo),
          };
        });
      },

      cuentaDeReporte(docId) {
        return s.cuentas.find((c) => c.estado !== "anulada" && c.items.some((i) => i.documentoId === docId));
      },

      errorGuardado,

      reiniciar() {
        setS((prev) => ({ ...inicial(), usuarioId: prev.usuarioId }));
      },
    };
  }, [s, listo, usuario, registrar, transicion, errorGuardado]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDemo(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemo fuera de DemoProvider");
  return v;
}
