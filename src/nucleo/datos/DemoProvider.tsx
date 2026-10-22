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
const KEY = "sotec-demo-v5";

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
  /** Último consecutivo usado por formato y año («reporte-2026»). Solo avanza: no se reutilizan números. */
  consecutivos: Record<string, number>;
}

const anioDe = (iso: string) => iso.slice(0, 4);

/** Reconstruye los contadores a partir de los documentos y cuentas existentes. */
function contadoresDe(docs: Documento[], cuentas: CuentaCobro[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const d of docs) c[`${d.tipo}-${anioDe(d.creado)}`] = Math.max(c[`${d.tipo}-${anioDe(d.creado)}`] ?? 0, d.consecutivo);
  for (const x of cuentas) c[`cobro-${anioDe(x.creado)}`] = Math.max(c[`cobro-${anioDe(x.creado)}`] ?? 0, x.consecutivo);
  return c;
}

function inicial(): Estado {
  const documentos = documentosSeed();
  const cuentas = cuentasSeed();
  return {
    usuarioId: null,
    usuarios: USUARIOS_SEED,
    clientes: CLIENTES_SEED,
    documentos,
    notificaciones: notificacionesSeed(),
    auditoria: auditoriaSeed(),
    config: CONFIG_SEED,
    cuentas,
    enlaces: [],
    consecutivos: contadoresDe(documentos, cuentas),
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
  /** Solo para la demo: el usuario cliente actual pasa a ver el portal de otra empresa. */
  verPortalDe: (clienteId: string) => void;
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
  /** Devuelve un mensaje de error si no se puede guardar, o null si se guardó. */
  guardarCuenta: (c: CuentaCobro) => string | null;
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
    const cargar = (raw: string | null) => {
      if (!raw) return;
      const guardado = JSON.parse(raw);
      const base = inicial();
      const docs = guardado.documentos ?? base.documentos;
      const cuentas = guardado.cuentas ?? base.cuentas;
      setS({ ...base, ...guardado, config: { ...base.config, ...guardado.config }, consecutivos: guardado.consecutivos ?? contadoresDe(docs, cuentas) });
    };
    try {
      cargar(localStorage.getItem(KEY));
    } catch {
      /* sin almacenamiento: la demo funciona en memoria */
    }
    setListo(true);
    // Otra pestaña guardó: se adopta su estado para no pisarlo con uno viejo
    const sincronizar = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      try {
        cargar(e.newValue);
      } catch {
        /* ignorar */
      }
    };
    window.addEventListener("storage", sincronizar);
    return () => window.removeEventListener("storage", sincronizar);
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
    (id: string, fn: (d: Documento, prev: Estado) => (Partial<Estado> & { doc: Documento }) | null) => {
      setS((prev) => {
        const d = prev.documentos.find((x) => x.id === id);
        if (!d) return prev;
        const r = fn(d, prev);
        // La acción no aplica al estado actual (doble clic, otra pestaña, rol): no se hace nada
        if (!r) return prev;
        const { doc, ...resto } = r;
        return { ...prev, ...resto, documentos: prev.documentos.map((x) => (x.id === id ? doc : x)) };
      });
    },
    [],
  );

  const api = useMemo<Api>(() => {
    const nombre = (id: string | null) => s.usuarios.find((u) => u.id === id)?.nombre.split(" ").slice(0, 2).join(" ") ?? "Alguien";
    const evento = (prev: Estado, accion: string, detalle?: string) => ({ fecha: ahora(), usuarioId: prev.usuarioId ?? "", accion, detalle });
    const rolDe = (prev: Estado) => prev.usuarios.find((x) => x.id === prev.usuarioId)?.rol;
    const esRevisor = (prev: Estado) => {
      const r = rolDe(prev);
      return r === "admin" || r === "supervisor";
    };
    /** Un enlace sirve si no se usó, no venció y el reporte está aprobado y sin firma del cliente. */
    const enlaceValido = (st: Estado, token: string): { enlace: EnlaceFirma; doc: Documento } | null => {
      const enlace = st.enlaces.find((e) => e.token === token);
      if (!enlace || enlace.usado || enlace.expira < ahora()) return null;
      const doc = st.documentos.find((d) => d.id === enlace.docId);
      if (!doc || doc.tipo !== "reporte" || doc.estado !== "aprobado" || doc.datos.firmaCliente) return null;
      return { enlace, doc };
    };
    const vigente = (token: string) => enlaceValido(s, token);
    /** Notificaciones para los usuarios del portal de un cliente (no para todos los clientes). */
    const aClientes = (prev: Estado, clienteId: string, texto: string, docId?: string): Notificacion[] =>
      prev.usuarios
        .filter((x) => x.rol === "cliente" && x.activo && x.clienteId === clienteId)
        .map((x) => ({ id: uid("n"), para: x.id, texto, docId, fecha: ahora(), leida: false }));
    const prefijo = (prev: Estado, tipo: TipoDoc) => ({ reporte: prev.config.prefijoReporte, permiso: prev.config.prefijoPermiso, gasto: prev.config.prefijoGasto })[tipo];
    const codigo = (pref: string, n: number, anio: string) => `${pref}-${String(n).padStart(3, "0")}-${anio.slice(2)}`;

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
      verPortalDe(clienteId) {
        setS((prev) => {
          const u = prev.usuarios.find((x) => x.id === prev.usuarioId);
          const c = prev.clientes.find((x) => x.id === clienteId);
          if (!u || u.rol !== "cliente" || !c || u.clienteId === c.id) return prev;
          const cambiado = { ...u, clienteId: c.id, cargo: `${u.cargo.split(" · ")[0]} · ${c.nombre}` };
          return { ...prev, usuarios: prev.usuarios.map((x) => (x.id === u.id ? cambiado : x)), auditoria: [{ id: uid("a"), fecha: ahora(), usuarioId: u.id, accion: "Cambió la empresa del portal", detalle: c.nombre }, ...prev.auditoria] };
        });
      },
      salir() {
        setS((prev) => ({ ...prev, usuarioId: null }));
      },

      // Vista previa del siguiente código; el definitivo se asigna al guardar (guardar)
      nuevoId(tipo) {
        const anio = anioDe(hoy());
        const consecutivo = (s.consecutivos[`${tipo}-${anio}`] ?? 0) + 1;
        return { id: uid("d"), consecutivo, codigo: codigo(prefijo(s, tipo), consecutivo, anio) };
      },

      guardar(doc) {
        const actualizado = { ...doc, actualizado: ahora() };
        setS((prev) => {
          const existente = prev.documentos.find((d) => d.id === doc.id);
          if (existente) {
            // Solo el autor edita, y solo en borrador o rechazado; se conserva lo que no es contenido
            const editable = existente.autorId === prev.usuarioId && (existente.estado === "borrador" || existente.estado === "rechazado");
            if (!editable) return prev;
            const merged = { ...existente, datos: doc.datos, clienteId: doc.clienteId, actualizado: ahora() } as Documento;
            return { ...prev, documentos: prev.documentos.map((d) => (d.id === doc.id ? merged : d)) };
          }
          // Documento nuevo: toma el consecutivo definitivo del año (no se reutiliza aunque se elimine)
          const anio = anioDe(hoy());
          const clave = `${doc.tipo}-${anio}`;
          const n = (prev.consecutivos[clave] ?? 0) + 1;
          const nuevo = {
            ...actualizado,
            consecutivo: n,
            codigo: codigo(prefijo(prev, doc.tipo), n, anio),
            autorId: prev.usuarioId ?? doc.autorId,
            estado: "borrador",
            historial: [evento(prev, "Creó el documento")],
          } as Documento;
          return {
            ...prev,
            consecutivos: { ...prev.consecutivos, [clave]: n },
            documentos: [nuevo, ...prev.documentos],
            auditoria: registrar(prev, "Creó", nuevo.codigo),
          };
        });
        return actualizado;
      },

      enviar(id) {
        transicion(id, (d, prev) => {
          if (d.autorId !== prev.usuarioId || (d.estado !== "borrador" && d.estado !== "rechazado")) return null;
          const texto = `${nombre(prev.usuarioId)} envió ${d.codigo} a revisión`;
          return {
            doc: { ...d, estado: "en_revision", motivoRechazo: undefined, historial: [...d.historial, evento(prev, "Envió a revisión")] },
            notificaciones: [
              { id: uid("n"), para: "supervisor", texto, docId: d.id, fecha: ahora(), leida: false },
              { id: uid("n"), para: "admin", texto, docId: d.id, fecha: ahora(), leida: false },
              ...prev.notificaciones,
            ],
            auditoria: registrar(prev, "Envió a revisión", d.codigo),
          };
        });
      },

      aprobar(id, firmaAutoriza) {
        transicion(id, (d, prev) => {
          // Solo un revisor, solo en revisión y nunca sobre un documento propio
          if (d.estado !== "en_revision" || !esRevisor(prev) || d.autorId === prev.usuarioId) return null;
          const u = prev.usuarios.find((x) => x.id === prev.usuarioId);
          const datos =
            d.tipo === "permiso"
              ? { ...d.datos, autoriza: d.datos.autoriza || u?.nombre || "", firmaAutoriza: firmaAutoriza || d.datos.firmaAutoriza }
              : d.tipo === "gasto"
                ? { ...d.datos, voboNombre: u?.nombre || "", firmaVobo: firmaAutoriza || d.datos.firmaVobo }
                : d.datos;
          let notifs = notificar(prev, d.autorId, `${d.codigo} fue aprobado por ${nombre(prev.usuarioId)}`, d.id);
          if (d.tipo === "reporte") notifs = [...aClientes(prev, d.clienteId, `${prev.config.empresa} compartió el reporte ${d.codigo} para tu firma`, d.id), ...notifs];
          return {
            doc: { ...d, datos, estado: "aprobado", historial: [...d.historial, evento(prev, "Aprobó")] } as Documento,
            notificaciones: notifs,
            auditoria: registrar(prev, "Aprobó", d.codigo),
          };
        });
      },

      rechazar(id, motivo) {
        transicion(id, (d, prev) => {
          if (d.estado !== "en_revision" || !esRevisor(prev) || d.autorId === prev.usuarioId || !motivo.trim()) return null;
          return {
            doc: { ...d, estado: "rechazado", motivoRechazo: motivo, historial: [...d.historial, evento(prev, "Rechazó", motivo)] },
            notificaciones: notificar(prev, d.autorId, `${d.codigo} fue rechazado: ${motivo}`, d.id),
            auditoria: registrar(prev, "Rechazó", `${d.codigo} · ${motivo}`),
          };
        });
      },

      cerrar(id, cambios) {
        transicion(id, (d, prev) => {
          if (d.estado !== "aprobado") return null;
          const u = prev.usuarios.find((x) => x.id === prev.usuarioId);
          // Reporte: lo cierra la firma del cliente (su portal) o un revisor; permiso y gastos: un revisor
          const puedeCerrar = esRevisor(prev) || (d.tipo === "reporte" && u?.rol === "cliente" && u.clienteId === d.clienteId);
          if (!puedeCerrar) return null;
          return {
          doc: { ...d, datos: { ...d.datos, ...cambios }, estado: "cerrado", historial: [...d.historial, evento(prev, d.tipo === "permiso" ? "Cerró el permiso" : d.tipo === "gasto" ? "Marcó como reembolsado" : "Firmó como cliente")] } as Documento,
          notificaciones: notificar(prev, d.autorId, `${d.codigo} quedó cerrado`, d.id),
          auditoria: registrar(prev, d.tipo === "permiso" ? "Cerró permiso" : d.tipo === "gasto" ? "Reembolsó gastos" : "Firma cliente", d.codigo),
          };
        });
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
          // Solo borradores propios; el consecutivo no se libera
          if (!d || d.estado !== "borrador" || d.autorId !== prev.usuarioId) return prev;
          return { ...prev, documentos: prev.documentos.filter((x) => x.id !== id), auditoria: registrar(prev, "Eliminó", d.codigo) };
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
        const doc = s.documentos.find((x) => x.id === docId);
        if (!doc || doc.tipo !== "reporte" || doc.estado !== "aprobado" || doc.datos.firmaCliente) return "";
        const token = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join("");
        const expira = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 19);
        setS((prev) => {
          const d = prev.documentos.find((x) => x.id === docId);
          if (!d || d.estado !== "aprobado") return prev;
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
        if (!v || !nombre.trim() || !imagen.startsWith("data:image/")) return "invalido";
        const cierra = true;
        setS((prev) => {
          // Se vuelve a validar con el estado más reciente (doble clic, otra pestaña, otro enlace ya usado)
          if (!enlaceValido(prev, token)) return prev;
          return {
          ...prev,
          // Al firmar se anulan todos los enlaces pendientes de ese documento
          enlaces: prev.enlaces.map((e) => (e.docId === v.doc.id && !e.usado ? { ...e, usado: ahora() } : e)),
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
          };
        });
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

      // Vista previa; el código definitivo se asigna al guardar la cuenta por primera vez
      nuevoCodigoCuenta() {
        const anio = anioDe(hoy());
        const consecutivo = (s.consecutivos[`cobro-${anio}`] ?? 0) + 1;
        return { id: uid("cc"), consecutivo, codigo: codigo(s.config.prefijoCobro, consecutivo, anio) };
      },

      guardarCuenta(c) {
        if (!usuario || !puede(usuario.rol, "cobros")) return "Sin permiso para gestionar cuentas de cobro.";
        // Un reporte solo se cobra una vez (en una cuenta activa)
        const repetido = c.items.find((i) => i.documentoId && s.cuentas.some((x) => x.id !== c.id && x.estado !== "anulada" && x.items.some((j) => j.documentoId === i.documentoId)));
        if (repetido) {
          const cod = s.documentos.find((d) => d.id === repetido.documentoId)?.codigo ?? "";
          return `El reporte ${cod} ya está en otra cuenta de cobro activa.`;
        }
        setS((prev) => {
          const existe = prev.cuentas.find((x) => x.id === c.id);
          if (existe && existe.estado !== "borrador") return prev; // emitida: ya no cambia
          if (c.items.some((i) => i.documentoId && prev.cuentas.some((x) => x.id !== c.id && x.estado !== "anulada" && x.items.some((j) => j.documentoId === i.documentoId)))) return prev;
          if (existe) {
            return { ...prev, cuentas: prev.cuentas.map((x) => (x.id === c.id ? { ...c, codigo: existe.codigo, consecutivo: existe.consecutivo, estado: existe.estado, historial: existe.historial, actualizado: ahora() } : x)) };
          }
          const anio = anioDe(hoy());
          const n = (prev.consecutivos[`cobro-${anio}`] ?? 0) + 1;
          const nueva = { ...c, consecutivo: n, codigo: codigo(prev.config.prefijoCobro, n, anio), estado: "borrador" as const, actualizado: ahora(), historial: [evento(prev, "Creó la cuenta de cobro")] };
          return {
            ...prev,
            consecutivos: { ...prev.consecutivos, [`cobro-${anio}`]: n },
            cuentas: [nueva, ...prev.cuentas],
            auditoria: registrar(prev, "Creó cuenta de cobro", nueva.codigo),
          };
        });
        return null;
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
              estado === "emitida" ? [...aClientes(prev, c.clienteId, `${prev.config.empresa} emitió la cuenta de cobro ${c.codigo}`), ...prev.notificaciones] : prev.notificaciones,
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
