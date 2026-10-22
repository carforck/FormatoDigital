"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { SIGUIENTES, type CuentaCobro, type EstadoCuentaCobro } from "@/modulos/cobros/tipos";
import { puedeVerEquipo } from "@/modulos/equipos/logica";
import * as reglasEquipos from "@/modulos/equipos/reglas";
import type { ApiEquipos, Equipo } from "@/modulos/equipos/tipos";
import { infoDoc, prefijoDe } from "@/modulos/registro";
import { puede, puedeCrearTipo, puedeUsarTipo, puedeVerCuenta, puedeVerDoc, puedeVerProyecto } from "@/nucleo/permisos";
import {
  CLIENTES_SEED,
  CONFIG_SEED,
  USUARIOS_SEED,
  auditoriaSeed,
  cuentasSeed,
  documentosSeed,
  equiposSeed,
  notificacionesSeed,
  proyectosSeed,
} from "@/nucleo/datos/seed";
import type { Auditoria, Cliente, Config, Documento, EnlaceFirma, EstadoProyecto, Notificacion, Proyecto, Rol, TipoDoc, Usuario } from "@/nucleo/tipos";

// Subir la versión al cambiar la semilla: los navegadores cargan los datos nuevos
const KEY = "sotec-demo-v8";

interface Estado {
  usuarioId: string | null;
  usuarios: Usuario[];
  clientes: Cliente[];
  documentos: Documento[];
  notificaciones: Notificacion[];
  auditoria: Auditoria[];
  config: Config;
  cuentas: CuentaCobro[];
  proyectos: Proyecto[];
  /** Inventario de equipos por cliente (módulo Equipos). */
  equipos: Equipo[];
  enlaces: EnlaceFirma[];
  /** Último consecutivo usado por formato y año («reporte-2026»). Solo avanza: no se reutilizan números. */
  consecutivos: Record<string, number>;
}

const anioDe = (iso: string) => iso.slice(0, 4);

/** Reconstruye los contadores a partir de los documentos y cuentas existentes. */
function contadoresDe(docs: Documento[], cuentas: CuentaCobro[], proyectos: Proyecto[] = []): Record<string, number> {
  const c: Record<string, number> = {};
  for (const p of proyectos) c[`proyecto-${anioDe(p.creado)}`] = Math.max(c[`proyecto-${anioDe(p.creado)}`] ?? 0, p.consecutivo);
  for (const d of docs) c[`${d.tipo}-${anioDe(d.creado)}`] = Math.max(c[`${d.tipo}-${anioDe(d.creado)}`] ?? 0, d.consecutivo);
  for (const x of cuentas) c[`cobro-${anioDe(x.creado)}`] = Math.max(c[`cobro-${anioDe(x.creado)}`] ?? 0, x.consecutivo);
  return c;
}

function inicial(): Estado {
  const documentos = documentosSeed();
  const cuentas = cuentasSeed();
  const proyectos = proyectosSeed();
  return {
    usuarioId: null,
    usuarios: USUARIOS_SEED,
    clientes: CLIENTES_SEED,
    documentos,
    notificaciones: notificacionesSeed(),
    auditoria: auditoriaSeed(),
    config: CONFIG_SEED,
    cuentas,
    proyectos,
    equipos: equiposSeed(),
    enlaces: [],
    consecutivos: contadoresDe(documentos, cuentas, proyectos),
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

interface Api extends Estado, ApiEquipos {
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
  /** Activa o desactiva un cliente (sale de los selectores; el historial se conserva). */
  cambiarActivoCliente: (id: string, activo: boolean) => void;
  /** Elimina un cliente sin documentos, proyectos ni cuentas. Devuelve el motivo si no se puede. */
  eliminarCliente: (id: string) => string | null;
  /** Clientes que se pueden elegir en los formularios (activos). */
  clientesActivos: Cliente[];
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
  // Proyectos
  proyectosVisibles: Proyecto[];
  nuevoCodigoProyecto: () => { id: string; codigo: string; consecutivo: number };
  /** Crea o actualiza un proyecto (admin y SST). Devuelve un mensaje de error o null. */
  guardarProyecto: (p: Proyecto) => string | null;
  cambiarEstadoProyecto: (id: string, estado: EstadoProyecto) => void;
  /** Elimina un proyecto sin documentos ni cuentas. Devuelve el motivo si no se puede. */
  eliminarProyecto: (id: string) => string | null;
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
      const proyectos = guardado.proyectos ?? base.proyectos;
      setS({ ...base, ...guardado, proyectos, config: { ...base.config, ...guardado.config }, consecutivos: guardado.consecutivos ?? contadoresDe(docs, cuentas, proyectos) });
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
    /** El perfil actual tiene acceso al módulo del documento (lo comercial es solo de la administración). */
    const usaTipo = (prev: Estado, tipo: TipoDoc) => {
      const r = rolDe(prev);
      return Boolean(r && puedeUsarTipo(r, tipo));
    };
    /** Revisor con acceso al módulo del documento. */
    const revisaTipo = (prev: Estado, tipo: TipoDoc) => esRevisor(prev) && usaTipo(prev, tipo);
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
    const aClientes = (prev: Estado, clienteId: string, texto: string, docId?: string, cuentaId?: string): Notificacion[] =>
      prev.usuarios
        .filter((x) => x.rol === "cliente" && x.activo && x.clienteId === clienteId)
        .map((x) => ({ id: uid("n"), para: x.id, texto, docId, cuentaId, fecha: ahora(), leida: false }));
    const prefijo = (prev: Estado, tipo: TipoDoc) => prefijoDe(prev.config, tipo);
    const gestionaProyectos = (prev: Estado) => {
      const r = rolDe(prev);
      return Boolean(r && puede(r, "proyectos"));
    };
    /** Solo equipos del cliente del documento (al cambiar de cliente se quitan los del anterior). */
    const equiposDelCliente = (prev: Estado, doc: Documento): string[] | undefined => {
      const ids = (doc.equiposIds ?? []).filter((id, k, a) => a.indexOf(id) === k && prev.equipos.some((e) => e.id === id && e.clienteId === doc.clienteId));
      return ids.length ? ids : undefined;
    };
    const ctxEquipos = (prev: Estado) => ({ usuario: prev.usuarios.find((x) => x.id === prev.usuarioId), clientes: prev.clientes, ahora: ahora() });
    /** Aplica una regla del inventario sobre el estado actual (respuesta inmediata) y la revalida con el más reciente. */
    const conEquipos = (regla: (prev: Estado) => reglasEquipos.Cambio): reglasEquipos.Cambio => {
      const r = regla(s);
      if (r.auditoria) {
        setS((prev) => {
          const r2 = regla(prev);
          if (!r2.auditoria) return prev; // doble clic u otra pestaña: ya estaba hecho
          return { ...prev, equipos: r2.equipos, auditoria: registrar(prev, r2.auditoria[0], r2.auditoria[1]) };
        });
      }
      return r;
    };
    const codigo = (pref: string, n: number, anio: string) => `${pref}-${String(n).padStart(3, "0")}-${anio.slice(2)}`;

    return {
      ...s,
      listo,
      usuario,
      visibles: usuario ? s.documentos.filter((d) => puedeVerDoc(usuario, d)) : [],
      // Solo avisos de lo que el perfil puede abrir (nada comercial para el técnico o SST)
      misNotificaciones: usuario
        ? s.notificaciones.filter((n) => {
            if (n.para !== usuario.rol && n.para !== usuario.id) return false;
            const d = n.docId ? s.documentos.find((x) => x.id === n.docId) : undefined;
            if (d && !puedeVerDoc(usuario, d)) return false;
            const c = n.cuentaId ? s.cuentas.find((x) => x.id === n.cuentaId) : undefined;
            return !c || puedeVerCuenta(usuario, c);
          })
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
            const editable = existente.autorId === prev.usuarioId && usaTipo(prev, existente.tipo) && (existente.estado === "borrador" || existente.estado === "rechazado");
            if (!editable) return prev;
            const merged = { ...existente, datos: doc.datos, clienteId: doc.clienteId, proyectoId: doc.proyectoId || undefined, equiposIds: equiposDelCliente(prev, doc), actualizado: ahora() } as Documento;
            return { ...prev, documentos: prev.documentos.map((d) => (d.id === doc.id ? merged : d)) };
          }
          // Documento nuevo: solo de un módulo que el perfil puede diligenciar (lo comercial, la administración)
          const r = rolDe(prev);
          if (!r || !puedeCrearTipo(r, doc.tipo)) return prev;
          // Toma el consecutivo definitivo del año (no se reutiliza aunque se elimine)
          const anio = anioDe(hoy());
          const clave = `${doc.tipo}-${anio}`;
          const n = (prev.consecutivos[clave] ?? 0) + 1;
          const nuevo = {
            ...actualizado,
            equiposIds: equiposDelCliente(prev, doc),
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
          if (d.autorId !== prev.usuarioId || !usaTipo(prev, d.tipo) || (d.estado !== "borrador" && d.estado !== "rechazado")) return null;
          const info = infoDoc(d.tipo);
          // Formato sin revisor aparte (cotización): quien tiene el permiso del módulo la aprueba al enviarla
          if (info.flujo.aprobarAlEnviar) {
            const accion = info.visibleCliente ? "Aprobó y envió al cliente" : "Aprobó";
            const aviso = info.visibleCliente && info.flujo.cierre === "cliente"
              ? aClientes(prev, d.clienteId, `${prev.config.empresa} compartió ${info.formato.el} ${info.formato.corto.toLowerCase()} ${d.codigo} para tu firma`, d.id)
              : [];
            return {
              doc: { ...d, estado: "aprobado", motivoRechazo: undefined, historial: [...d.historial, evento(prev, accion)] },
              notificaciones: [...aviso, ...prev.notificaciones],
              auditoria: registrar(prev, accion, d.codigo),
            };
          }
          const texto = `${nombre(prev.usuarioId)} envió ${d.codigo} a revisión`;
          // Solo a los revisores con acceso al módulo
          const revisores = (["supervisor", "admin"] as const).filter((r) => puedeUsarTipo(r, d.tipo));
          return {
            doc: { ...d, estado: "en_revision", motivoRechazo: undefined, historial: [...d.historial, evento(prev, "Envió a revisión")] },
            notificaciones: [...revisores.map((r) => ({ id: uid("n"), para: r, texto, docId: d.id, fecha: ahora(), leida: false })), ...prev.notificaciones],
            auditoria: registrar(prev, "Envió a revisión", d.codigo),
          };
        });
      },

      aprobar(id, firmaAutoriza) {
        transicion(id, (d, prev) => {
          // Solo un revisor, solo en revisión y nunca sobre un documento propio
          if (d.estado !== "en_revision" || !revisaTipo(prev, d.tipo) || d.autorId === prev.usuarioId) return null;
          const u = prev.usuarios.find((x) => x.id === prev.usuarioId);
          const info = infoDoc(d.tipo);
          // Cada formato escribe en su casilla quién autoriza (permiso) o da el Vo.Bo. (gastos)
          const datos = u && info.flujo.alAprobar ? { ...d.datos, ...info.flujo.alAprobar(d.datos as never, u, firmaAutoriza) } : d.datos;
          let notifs = notificar(prev, d.autorId, `${d.codigo} fue aprobado por ${nombre(prev.usuarioId)}`, d.id);
          // Lo que cierra el cliente con su firma (reporte, cotización) le llega a su portal
          if (info.visibleCliente && info.flujo.cierre === "cliente") {
            notifs = [...aClientes(prev, d.clienteId, `${prev.config.empresa} compartió ${info.formato.el} ${info.formato.corto.toLowerCase()} ${d.codigo} para tu firma`, d.id), ...notifs];
          }
          return {
            doc: { ...d, datos, estado: "aprobado", historial: [...d.historial, evento(prev, "Aprobó")] } as Documento,
            notificaciones: notifs,
            auditoria: registrar(prev, "Aprobó", d.codigo),
          };
        });
      },

      rechazar(id, motivo) {
        transicion(id, (d, prev) => {
          if (d.estado !== "en_revision" || !revisaTipo(prev, d.tipo) || d.autorId === prev.usuarioId || !motivo.trim()) return null;
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
          const { flujo } = infoDoc(d.tipo);
          // Reporte y cotización: los cierra la firma del cliente (su portal, o en sitio ante un revisor);
          // permiso, gastos: un revisor
          const delCliente = flujo.cierre === "cliente";
          const puedeCerrar = revisaTipo(prev, d.tipo) || (delCliente && u?.rol === "cliente" && u.clienteId === d.clienteId);
          if (!puedeCerrar) return null;
          const datos = { ...d.datos, ...cambios } as Record<string, unknown>;
          // Nadie cierra sin la firma real del cliente (igual que el trigger documentos_flujo)
          if (delCliente && flujo.campoFirmaCliente && !String(datos[flujo.campoFirmaCliente] ?? "").startsWith("data:image/")) return null;
          return {
            doc: { ...d, datos, estado: "cerrado", historial: [...d.historial, evento(prev, flujo.eventoCierre)] } as unknown as Documento,
            notificaciones: notificar(prev, d.autorId, `${d.codigo} quedó cerrado`, d.id),
            auditoria: registrar(prev, flujo.eventoCierre, d.codigo),
          };
        });
      },

      duplicar(id) {
        const d = s.documentos.find((x) => x.id === id);
        if (!d || !usuario || !puedeCrearTipo(usuario.rol, d.tipo) || !puedeVerDoc(usuario, d)) return null;
        const n = api.nuevoId(d.tipo);
        // Cada módulo decide qué se limpia al duplicar (fechas y firmas)
        const datos = infoDoc(d.tipo).duplicar(d.datos, hoy());
        const copia = { ...d, ...n, datos, estado: "borrador", autorId: usuario.id, creado: ahora(), actualizado: ahora(), motivoRechazo: undefined, historial: [] } as Documento;
        api.guardar(copia);
        return copia.id;
      },

      eliminar(id) {
        setS((prev) => {
          const d = prev.documentos.find((x) => x.id === id);
          // Solo borradores propios; el consecutivo no se libera
          if (!d || d.estado !== "borrador" || d.autorId !== prev.usuarioId || !usaTipo(prev, d.tipo)) return prev;
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
        if (!usuario || !puede(usuario.rol, "clientes")) return;
        setS((prev) => {
          const existe = prev.clientes.some((x) => x.id === c.id);
          return {
            ...prev,
            clientes: existe ? prev.clientes.map((x) => (x.id === c.id ? c : x)) : [...prev.clientes, c],
            auditoria: registrar(prev, existe ? "Actualizó cliente" : "Creó cliente", c.nombre),
          };
        });
      },

      clientesActivos: s.clientes.filter((c) => c.activo !== false),

      cambiarActivoCliente(id, activo) {
        if (!usuario || !puede(usuario.rol, "clientes")) return;
        setS((prev) => {
          const c = prev.clientes.find((x) => x.id === id);
          if (!c || (c.activo !== false) === activo) return prev;
          return { ...prev, clientes: prev.clientes.map((x) => (x.id === id ? { ...x, activo } : x)), auditoria: registrar(prev, activo ? "Reactivó cliente" : "Desactivó cliente", c.nombre) };
        });
      },

      eliminarCliente(id) {
        if (!usuario || !puede(usuario.rol, "clientes")) return "Sin permiso para gestionar clientes.";
        const usos = s.documentos.filter((d) => d.clienteId === id).length + s.proyectos.filter((p) => p.clienteId === id).length + s.cuentas.filter((c) => c.clienteId === id).length;
        if (usos) return `Tiene ${usos} documento(s), proyecto(s) o cuenta(s) de cobro: desactívalo para conservar su historial.`;
        if (s.usuarios.some((u) => u.clienteId === id)) return "Tiene usuarios del portal: desactívalo o reasigna esos usuarios.";
        setS((prev) => {
          const c = prev.clientes.find((x) => x.id === id);
          // Se revalida con el estado más reciente (otra pestaña pudo agregarle documentos)
          if (!c || prev.documentos.some((d) => d.clienteId === id) || prev.proyectos.some((p) => p.clienteId === id) || prev.cuentas.some((x) => x.clienteId === id)) return prev;
          return { ...prev, clientes: prev.clientes.filter((x) => x.id !== id), auditoria: registrar(prev, "Eliminó cliente", c.nombre) };
        });
        return null;
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
        // Solo lo que el perfil puede ver; una cuenta de cobro, solo la administración
        const dEnv = docId ? s.documentos.find((x) => x.id === docId) : undefined;
        if (!usuario || (docId && (!dEnv || !puedeVerDoc(usuario, dEnv))) || (cuentaId && !puede(usuario.rol, "cobros"))) return;
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
              estado === "emitida" ? [...aClientes(prev, c.clienteId, `${prev.config.empresa} emitió la cuenta de cobro ${c.codigo}`, undefined, c.id), ...prev.notificaciones] : prev.notificaciones,
            auditoria: registrar(prev, `Cuenta de cobro: ${etiqueta.toLowerCase()}`, c.codigo),
          };
        });
      },

      // Solo entre las cuentas que el perfil ve (el técnico y SST, ninguna)
      cuentaDeReporte(docId) {
        return s.cuentas.find((c) => c.estado !== "anulada" && c.items.some((i) => i.documentoId === docId) && Boolean(usuario && puedeVerCuenta(usuario, c)));
      },

      errorGuardado,

      proyectosVisibles: usuario ? s.proyectos.filter((p) => puedeVerProyecto(usuario, p, s.documentos)) : [],

      // Vista previa; el código definitivo se asigna al guardar el proyecto por primera vez
      nuevoCodigoProyecto() {
        const anio = anioDe(hoy());
        const consecutivo = (s.consecutivos[`proyecto-${anio}`] ?? 0) + 1;
        return { id: uid("p"), consecutivo, codigo: codigo(s.config.prefijoProyecto || "PRY", consecutivo, anio) };
      },

      guardarProyecto(p) {
        if (!usuario || !puede(usuario.rol, "proyectos")) return "Sin permiso para gestionar proyectos.";
        if (!p.nombre.trim()) return "Escribe el nombre del proyecto.";
        if (!s.clientes.some((c) => c.id === p.clienteId)) return "Elige el cliente del proyecto.";
        if (p.fechaFin && p.fechaFin < p.fechaInicio) return "La fecha de fin no puede ser anterior a la de inicio.";
        setS((prev) => {
          if (!gestionaProyectos(prev)) return prev;
          const existe = prev.proyectos.find((x) => x.id === p.id);
          if (existe) {
            // El código, el consecutivo y la trazabilidad no se editan
            const act = { ...p, codigo: existe.codigo, consecutivo: existe.consecutivo, creado: existe.creado, historial: [...existe.historial, evento(prev, "Actualizó el proyecto")], actualizado: ahora() };
            return { ...prev, proyectos: prev.proyectos.map((x) => (x.id === p.id ? act : x)), auditoria: registrar(prev, "Actualizó proyecto", `${existe.codigo} · ${p.nombre}`) };
          }
          const anio = anioDe(hoy());
          const n = (prev.consecutivos[`proyecto-${anio}`] ?? 0) + 1;
          const nuevo = { ...p, consecutivo: n, codigo: codigo(prev.config.prefijoProyecto || "PRY", n, anio), creado: ahora(), actualizado: ahora(), historial: [evento(prev, "Creó el proyecto")] };
          return {
            ...prev,
            consecutivos: { ...prev.consecutivos, [`proyecto-${anio}`]: n },
            proyectos: [nuevo, ...prev.proyectos],
            auditoria: registrar(prev, "Creó proyecto", `${nuevo.codigo} · ${nuevo.nombre}`),
          };
        });
        return null;
      },

      cambiarEstadoProyecto(id, estado) {
        setS((prev) => {
          const p = prev.proyectos.find((x) => x.id === id);
          if (!p || p.estado === estado || !gestionaProyectos(prev)) return prev;
          const accion = { activo: "Reactivó el proyecto", en_pausa: "Pausó el proyecto", cerrado: "Cerró el proyecto" }[estado];
          const fechaFin = estado === "cerrado" ? p.fechaFin || hoy() : p.fechaFin;
          return {
            ...prev,
            proyectos: prev.proyectos.map((x) => (x.id === id ? { ...x, estado, fechaFin, actualizado: ahora(), historial: [...x.historial, evento(prev, accion)] } : x)),
            auditoria: registrar(prev, accion, p.codigo),
          };
        });
      },

      eliminarProyecto(id) {
        if (!usuario || !puede(usuario.rol, "proyectos")) return "Sin permiso para gestionar proyectos.";
        const usos = s.documentos.filter((d) => d.proyectoId === id).length + s.cuentas.filter((c) => c.proyectoId === id).length;
        if (usos) return `El proyecto tiene ${usos} documento(s) o cuenta(s) de cobro y no se puede eliminar; ciérralo para conservar su historial.`;
        setS((prev) => {
          const p = prev.proyectos.find((x) => x.id === id);
          if (!p || !gestionaProyectos(prev) || prev.documentos.some((d) => d.proyectoId === id) || prev.cuentas.some((c) => c.proyectoId === id)) return prev;
          return { ...prev, proyectos: prev.proyectos.filter((x) => x.id !== id), auditoria: registrar(prev, "Eliminó proyecto", `${p.codigo} · ${p.nombre}`) };
        });
        return null;
      },

      // Equipos: crear (también desde el reporte), editar, cambiar estado o retirar, y borrar sin historial
      equiposVisibles: usuario ? s.equipos.filter((e) => puedeVerEquipo(usuario, e)) : [],
      crearEquipo(m) {
        return conEquipos((prev) => reglasEquipos.crear(prev.equipos, m, ctxEquipos(prev)));
      },
      guardarEquipo(e) {
        return conEquipos((prev) => reglasEquipos.guardar(prev.equipos, e, ctxEquipos(prev)));
      },
      cambiarEstadoEquipo(id, estado) {
        return conEquipos((prev) => reglasEquipos.cambiarEstado(prev.equipos, id, estado, ctxEquipos(prev))).error;
      },
      eliminarEquipo(id) {
        return conEquipos((prev) => reglasEquipos.eliminar(prev.equipos, id, prev.documentos, ctxEquipos(prev))).error;
      },

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
