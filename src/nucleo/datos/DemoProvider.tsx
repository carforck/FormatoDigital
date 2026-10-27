"use client";

/**
 * Proveedor único de datos del aplicativo (`DemoProvider` + `useDemo`). Guarda
 * todo el estado (usuarios, clientes, documentos, cuentas, proyectos, equipos,
 * avisos, auditoría, enlaces de firma y consecutivos) y expone las acciones.
 *
 * Dos modos (`Modo`, elegido en /acceso y recordado por `./empresa.ts`):
 * - «demo»: datos ficticios de `./seed.ts` en localStorage (`KEY`); las
 *   pestañas se sincronizan con el evento `storage`.
 * - «empresa»: el estado completo por organización en `public.espacios`
 *   (`./empresa.ts`) con versión optimista: guardado agrupado, respaldo local,
 *   sondeo de cambios de otros equipos y estado de sincronización. Sin conexión
 *   trabaja con la copia local del espacio y sincroniza al volver la red.
 *
 * Reglas: cada acción revalida contra el estado más reciente dentro de `setS`
 * y no hace nada si ya no aplica (doble clic, otra pestaña, rol); los
 * consecutivos salen de contadores por tipo y año que solo avanzan (no se
 * reutilizan al borrar); los permisos replican la base de datos (separación de
 * funciones de 0008, lo comercial solo admin de 0011, trabajo de campo de 0013:
 * retirar un envío, firma del cliente en sitio y clientes nuevos desde los
 * formatos). Ver docs/ARQUITECTURA.md.
 *
 * Exporta: `DemoProvider`, `useDemo`, `ahora`, `hoy`, `KEY_TRAS_LOGIN`, `Sincronizacion`.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { SIGUIENTES, type CuentaCobro, type EstadoCuentaCobro } from "@/modulos/cobros/tipos";
import { puedeVerEquipo } from "@/modulos/equipos/logica";
import * as reglasEquipos from "@/modulos/equipos/reglas";
import type { ApiEquipos, Equipo } from "@/modulos/equipos/tipos";
import { CATALOGO_SERVICIOS, IVA_GENERAL, type ServicioCatalogo } from "@/modulos/cotizaciones/catalogo";
import { infoDoc, prefijoDe } from "@/modulos/registro";
import { planCliente } from "@/nucleo/clientes";
import { puede, puedeCrearTipo, puedeFirmaClienteEnSitio, puedeRetirarDoc, puedeUsarTipo, puedeVerCuenta, puedeVerDoc, puedeVerProyecto } from "@/nucleo/permisos";
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
import {
  cerrarSesion,
  espacioLocal,
  guardarConflicto,
  guardarEspacioLocal,
  guardarEspacio,
  guardarModo,
  iniciarSesion,
  leerEspacio,
  leerModo,
  sesionActual,
  sesionGuardada,
  SIN_CONEXION,
  versionEspacio,
  type Espacio,
  type Modo,
  type Sesion,
} from "@/nucleo/datos/empresa";

// Subir la versión al cambiar la semilla: los navegadores cargan los datos nuevos
const KEY = "sotec-demo-v9";

/** Estado completo de la app: lo que se guarda en localStorage (demo) o en `espacios` (empresa). */
interface Estado {
  /** Usuario de esta sesión (no se comparte entre equipos en modo empresa). */
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

/** Reconstruye los contadores a partir de los documentos y cuentas existentes (semilla y datos guardados sin `consecutivos`). */
/** Une dos tablas de contadores quedándose con el mayor de cada clave. */
function maximos(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const r = { ...a };
  for (const [k, v] of Object.entries(b)) r[k] = Math.max(r[k] ?? 0, v);
  return r;
}

function contadoresDe(docs: Documento[], cuentas: CuentaCobro[], proyectos: Proyecto[] = []): Record<string, number> {
  const c: Record<string, number> = {};
  for (const p of proyectos) c[`proyecto-${anioDe(p.creado)}`] = Math.max(c[`proyecto-${anioDe(p.creado)}`] ?? 0, p.consecutivo);
  for (const d of docs) c[`${d.tipo}-${anioDe(d.creado)}`] = Math.max(c[`${d.tipo}-${anioDe(d.creado)}`] ?? 0, d.consecutivo);
  for (const x of cuentas) c[`cobro-${anioDe(x.creado)}`] = Math.max(c[`cobro-${anioDe(x.creado)}`] ?? 0, x.consecutivo);
  return c;
}

/** Estado inicial de la demo: datos ficticios de la semilla, sin sesión. */
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

/** Espacio vacío de una empresa real: sin datos de ejemplo; la configuración parte de la de SOTEC. */
function inicialEmpresa(): Estado {
  return {
    usuarioId: null,
    usuarios: [],
    clientes: [],
    documentos: [],
    notificaciones: [],
    auditoria: [],
    config: CONFIG_SEED,
    cuentas: [],
    proyectos: [],
    equipos: [],
    enlaces: [],
    consecutivos: {},
  };
}

/**
 * Estado de la empresa a partir del espacio guardado y la sesión (el usuario y su rol salen de Supabase).
 * Lo que falte en un espacio viejo se completa con el estado vacío; el rol y el correo de Supabase
 * mandan sobre lo guardado, y en el primer ingreso el usuario se agrega a la lista.
 */
function desdeEspacio(e: Espacio, ses: Sesion): Estado {
  const base = inicialEmpresa();
  const g = e.estado as Partial<Estado>;
  const usuarios = g.usuarios ?? [];
  const yo = usuarios.find((u) => u.id === ses.usuario.id);
  return {
    ...base,
    ...g,
    config: { ...base.config, ...(g.config ?? {}) },
    // Los consecutivos solo avanzan: si faltan o quedaron atrás, se reconstruyen desde lo ya emitido (no se reutilizan números)
    consecutivos: maximos(g.consecutivos ?? {}, contadoresDe(g.documentos ?? [], g.cuentas ?? [], g.proyectos ?? [])),
    usuarios: yo ? usuarios.map((u) => (u.id === yo.id ? { ...u, rol: ses.usuario.rol, email: ses.usuario.email, activo: true } : u)) : [ses.usuario, ...usuarios],
    usuarioId: ses.usuario.id,
  };
}

/** Lo que se comparte: todo menos el usuario de esta sesión. También sirve para saber si hay cambios sin guardar. */
const compartido = (st: Estado) => JSON.stringify({ ...st, usuarioId: null });
/** Perfil de la demo elegido estando en modo empresa: se aplica al montar la demo (sessionStorage). */
const KEY_ENTRAR_DEMO = "fd-entrar-demo";
/** Marca que se acaba de iniciar sesión: /acceso lleva al aplicativo cuando el espacio termina de cargar. */
export const KEY_TRAS_LOGIN = "fd-tras-login";

/** Estado del guardado en modo empresa (indicador en la barra superior). En la demo queda en «guardado». */
export type Sincronizacion = "guardado" | "guardando" | "sin-conexion";

/** Fecha y hora local «AAAA-MM-DDTHH:mm:ss» (sin zona): marca de tiempo de eventos, avisos y auditoría. */
export function ahora(): string {
  // Hora local sin zona, suficiente para la demo
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
/** Fecha local de hoy «AAAA-MM-DD» (define el año de los consecutivos). */
export function hoy(): string {
  return ahora().slice(0, 10);
}
/** Id aleatorio con prefijo («d-…», «n-…»); no es el código visible del documento. */
function uid(p: string) {
  return `${p}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Lo que expone `useDemo()`: el estado crudo, vistas ya filtradas por permisos
 * (`visibles`, `misNotificaciones`, `cuentasVisibles`, `proyectosVisibles`,
 * `equiposVisibles`) y las acciones. Las acciones validan rol y estado: si no
 * aplican, no cambian nada (las que devuelven texto, devuelven el motivo).
 */
interface Api extends Estado, ApiEquipos {
  /** Ya se cargaron los datos guardados (y la sesión, en modo empresa). */
  listo: boolean;
  /** demo: datos ficticios en el navegador; empresa: espacio real en Supabase. */
  modo: Modo;
  /** Nombre de la organización en modo empresa. */
  organizacion: string | null;
  sincronizacion: Sincronizacion;
  /** Login del espacio de la empresa; devuelve el error o null. */
  entrarEmpresa: (correo: string, clave: string) => Promise<string | null>;
  // Sesión y vistas filtradas
  usuario: Usuario | null;
  /** Documentos que el usuario puede ver (`puedeVerDoc`). */
  visibles: Documento[];
  /** Avisos para su rol o su id, solo de lo que puede abrir. */
  misNotificaciones: Notificacion[];
  /** Entra con un perfil de la demo (el primero activo del rol, o `usuarioId`); desde el modo empresa cambia a la demo. */
  entrarComo: (rol: Rol, usuarioId?: string) => void;
  /** Solo para la demo: el usuario cliente actual pasa a ver el portal de otra empresa. */
  verPortalDe: (clienteId: string) => void;
  /** Cierra la sesión (en modo empresa también la de Supabase); los datos quedan. */
  salir: () => void;
  // Documentos y su flujo: borrador → en revisión → aprobado → cerrado (o rechazado)
  /**
   * Crea (con el consecutivo definitivo) o actualiza el contenido de un documento propio en borrador o rechazado.
   * Con `registrar_clientes`, el cliente escrito que no está en el directorio se crea y se enlaza; si ya está,
   * se enlaza y se llenan solo sus campos vacíos (`planCliente`, @/nucleo/clientes).
   */
  guardar: (doc: Documento) => Documento;
  /** Vista previa del siguiente id y código; el definitivo se asigna en `guardar`. */
  nuevoId: (tipo: TipoDoc) => { id: string; codigo: string; consecutivo: number };
  /** El autor lo envía a revisión (o lo aprueba de una vez si el formato tiene `aprobarAlEnviar`). */
  enviar: (id: string) => void;
  /**
   * Un revisor con acceso al módulo aprueba lo ajeno en revisión; `firmaAutoriza` va a la casilla del formato.
   * Si ya trae la firma del cliente tomada en sitio (reporte), queda cerrado de una vez.
   * Devuelve el motivo si ya no aplica (p. ej. el autor lo retiró) o null.
   */
  aprobar: (id: string, firmaAutoriza?: string) => string | null;
  /** El autor retira su envío mientras está en revisión: vuelve a borrador para corregirlo. Devuelve el motivo si no se pudo, o null. */
  retirar: (id: string) => string | null;
  /**
   * El autor toma en sitio la firma del cliente que faltó (en revisión o aprobado; si ya está
   * aprobado, lo cierra). `nombre` y `cargo`: quién recibe. Devuelve el motivo si no se pudo, o null.
   */
  firmaClienteEnSitio: (id: string, imagen: string, nombre: string, cargo: string) => string | null;
  /** Un revisor devuelve lo ajeno en revisión con motivo obligatorio. Devuelve el motivo si ya no aplica, o null. */
  rechazar: (id: string, motivo: string) => string | null;
  /** Cierra un aprobado: un revisor, o el cliente con su firma si el formato lo cierra el cliente. */
  cerrar: (id: string, cambios: Partial<Documento["datos"]>) => void;
  /** Copia como borrador propio (el módulo limpia fechas y firmas); devuelve el id nuevo. */
  duplicar: (id: string) => string | null;
  /** Borra un borrador propio; el consecutivo no se libera. */
  eliminar: (id: string) => void;
  marcarLeidas: () => void;
  // Directorio y configuración
  /** Crea o actualiza un usuario (requiere `usuarios`). */
  actualizarUsuario: (u: Usuario) => void;
  /** Crea o actualiza un cliente (requiere `clientes`). */
  guardarCliente: (c: Cliente) => void;
  /** Activa o desactiva un cliente (sale de los selectores; el historial se conserva). */
  cambiarActivoCliente: (id: string, activo: boolean) => void;
  /** Elimina un cliente sin documentos, proyectos ni cuentas. Devuelve el motivo si no se puede. */
  eliminarCliente: (id: string) => string | null;
  /** Clientes que se pueden elegir en los formularios (activos). */
  clientesActivos: Cliente[];
  actualizarConfig: (c: Config) => void;
  /** «＋ Agregar otro» del asistente: guarda la opción para toda la empresa (clave «formato.paso»). */
  agregarOpcion: (clave: string, valor: string) => void;
  /** Quita una opción agregada (Configuración, solo administración). */
  quitarOpcion: (clave: string, valor: string) => void;
  /** Agrega un servicio o producto al catálogo de la cotización; devuelve el servicio creado (o el existente con esa descripción). */
  agregarServicio: (s: { descripcion: string; unidad: string; precioReferencia: number; detalle?: string }) => ServicioCatalogo;
  /** Quita un servicio agregado al catálogo (Configuración, solo administración). */
  quitarServicio: (clave: string) => void;
  /** Restablece la demo a la semilla conservando la sesión (no hace nada en modo empresa). */
  reiniciar: () => void;
  // Firma remota y envíos
  /** Crea un enlace de firma (7 días) para un reporte aprobado sin firma del cliente; devuelve el token o "". */
  crearEnlaceFirma: (docId: string, correo: string) => string;
  /** Enlace sin usar ni vencer y su reporte aún pendiente de firma, o null. */
  enlaceVigente: (token: string) => { enlace: EnlaceFirma; doc: Documento } | null;
  /** Firma del cliente sin cuenta: cierra el reporte y anula los demás enlaces del documento. */
  firmarConEnlace: (token: string, nombre: string, imagen: string) => "cerrado" | "firmado" | "invalido";
  /** Deja en el historial un envío por correo o WhatsApp; una cuenta emitida pasa a «enviada». */
  registrarEnvio: (ref: { docId?: string; cuentaId?: string }, canal: "correo" | "whatsapp", destino: string) => void;
  // Cuentas de cobro (solo la administración; el cliente ve las suyas emitidas)
  cuentasVisibles: CuentaCobro[];
  /** Vista previa del siguiente código; el definitivo se asigna al guardar la cuenta por primera vez. */
  nuevoCodigoCuenta: () => { id: string; codigo: string; consecutivo: number };
  /** Devuelve un mensaje de error si no se puede guardar, o null si se guardó. */
  guardarCuenta: (c: CuentaCobro) => string | null;
  /** Avanza el estado según `SIGUIENTES` (emitir avisa al portal del cliente). */
  cambiarEstadoCuenta: (id: string, estado: EstadoCuentaCobro) => void;
  /** Cuenta de cobro (no anulada) que ya incluye un reporte, si existe. */
  cuentaDeReporte: (docId: string) => CuentaCobro | undefined;
  /** Mensaje para el usuario si el último guardado falló (sin espacio, sin conexión o conflicto). */
  errorGuardado: string | null;
  // Proyectos
  proyectosVisibles: Proyecto[];
  /** Vista previa del siguiente código PRY; el definitivo se asigna al guardar el proyecto por primera vez. */
  nuevoCodigoProyecto: () => { id: string; codigo: string; consecutivo: number };
  /** Crea o actualiza un proyecto (admin y SST). Devuelve un mensaje de error o null. */
  guardarProyecto: (p: Proyecto) => string | null;
  /** Pausa, reactiva o cierra (al cerrar sin fecha de fin, queda la de hoy). */
  cambiarEstadoProyecto: (id: string, estado: EstadoProyecto) => void;
  /** Elimina un proyecto sin documentos ni cuentas. Devuelve el motivo si no se puede. */
  eliminarProyecto: (id: string) => string | null;
}

const Ctx = createContext<Api | null>(null);

/** Elige el modo guardado en el navegador y monta el proveedor de ese modo (al cambiar de modo se monta de cero). */
export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [modo, setModo] = useState<Modo | null>(null);
  // Cada cambio (también entrar de nuevo al mismo modo) vuelve a montar y cargar los datos
  const [montaje, setMontaje] = useState(0);
  useEffect(() => setModo(leerModo()), []);
  const cambiarModo = useCallback((m: Modo) => {
    guardarModo(m);
    setModo(m);
    setMontaje((n) => n + 1);
  }, []);
  return (
    <DatosProvider key={`${modo ?? "cargando"}-${montaje}`} modo={modo} cambiarModo={cambiarModo}>
      {children}
    </DatosProvider>
  );
}

/** Proveedor de un modo concreto: carga, guarda y sincroniza el estado y arma la API del contexto. */
function DatosProvider({ children, modo, cambiarModo }: { children: React.ReactNode; modo: Modo | null; cambiarModo: (m: Modo) => void }) {
  const [s, setS] = useState<Estado>(() => (modo === "empresa" ? inicialEmpresa() : inicial()));
  // Último estado, para leerlo desde el sondeo sin reiniciar sus temporizadores
  const sRef = useRef(s);
  sRef.current = s;
  const [listo, setListo] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [organizacion, setOrganizacion] = useState<string | null>(null);
  const [sincronizacion, setSincronizacion] = useState<Sincronizacion>("guardado");
  // Modo empresa: organización, versión leída y último estado compartido que quedó guardado
  // (`ultimo` null = hay algo pendiente de guardar; `guardando` evita dos guardados a la vez)
  const orgId = useRef<string | null>(null);
  const version = useRef(0);
  const ultimo = useRef<string | null>(null);
  const guardando = useRef(false);
  const sesion = useRef<Sesion | null>(null);
  // Sin conexión: `pendiente` = hay cambios que solo están en este equipo; `sinVerificar` = se
  // entró con la sesión guardada (sin red) y hay que confirmarla con Supabase antes de guardar
  const pendiente = useRef(false);
  const sinVerificar = useRef(false);

  /**
   * Adopta el espacio de la empresa (al cargar, al detectar cambios de otro equipo o tras un
   * conflicto) y deja la copia local al día. `conCambios`: el estado trae cambios hechos sin
   * conexión que aún no están en el servidor (se envían con el guardado normal).
   */
  const adoptar = useCallback((e: Espacio, ses: Sesion, conCambios = false) => {
    const st = desdeEspacio(e, ses);
    version.current = e.version;
    // Si el espacio ya trae a este usuario no hay nada que guardar; si no (primer ingreso), se guarda con él
    const conocido = ((e.estado as Partial<Estado>).usuarios ?? []).some((u) => u.id === ses.usuario.id);
    ultimo.current = conocido && !conCambios ? compartido(st) : null;
    pendiente.current = conCambios;
    if (!conCambios) guardarEspacioLocal({ organizacionId: ses.organizacionId, usuarioId: ses.usuario.id, version: e.version, pendiente: false }, compartido(st));
    setS(st);
  }, []);

  // Modo empresa: sesión, espacio y sincronización con los demás equipos
  useEffect(() => {
    if (modo !== "empresa") return;
    let vivo = true;
    (async () => {
      // Sin red se usa la sesión guardada en el último ingreso en línea (si no se cerró sesión)
      const enLinea = await sesionActual();
      const ses = enLinea === SIN_CONEXION ? sesionGuardada() : enLinea;
      if (!vivo) return;
      if (!ses) {
        setListo(true);
        return;
      }
      const copia = espacioLocal(ses.organizacionId, ses.usuario.id);
      const e = enLinea === SIN_CONEXION ? null : await leerEspacio(ses.organizacionId);
      if (!vivo) return;
      if (!e && !copia) {
        setErrorGuardado("No se pudo abrir el espacio de la empresa. Revisa la conexión e intenta de nuevo.");
        setSincronizacion("sin-conexion");
        setListo(true);
        return;
      }
      sesion.current = ses;
      orgId.current = ses.organizacionId;
      setOrganizacion(ses.organizacion);
      if (!e && copia) {
        // Sin conexión: se trabaja con la copia de este equipo; lo pendiente se envía al volver la red
        sinVerificar.current = enLinea === SIN_CONEXION;
        adoptar(copia, ses, copia.pendiente);
        setSincronizacion("sin-conexion");
      } else if (e && copia?.pendiente && copia.version === e.version) {
        // Quedaron cambios sin conexión y nadie más guardó: se conservan y se envían ya
        adoptar({ estado: copia.estado, version: e.version }, ses, true);
      } else if (e) {
        adoptar(e, ses);
        // Quedaron cambios sin conexión pero otro equipo guardó entre tanto: gana lo más reciente (como un conflicto)
        if (copia?.pendiente) {
          guardarConflicto(JSON.stringify(copia.estado));
          setErrorGuardado("Mientras trabajabas sin conexión otra persona guardó cambios y se cargaron los datos más recientes. Revisa tus últimos cambios y vuelve a hacerlos si no aparecen.");
        }
      }
      setListo(true);
    })();
    return () => {
      vivo = false;
    };
  }, [modo, adoptar]);

  // Modo empresa: guarda los cambios (agrupados 700 ms) si nadie más guardó antes.
  // Primero deja la copia local (marcada como pendiente); luego envía la versión leída. Si
  // otro equipo ganó («conflicto») se adopta lo remoto y el último cambio local se pierde
  // (se avisa). Sin conexión el cambio queda en este equipo y se envía al volver la red
  // (evento `online` y sondeo de abajo).
  useEffect(() => {
    if (modo !== "empresa" || !listo || !orgId.current || !s.usuarioId) return;
    const json = compartido(s);
    if (json === ultimo.current) return;
    setSincronizacion(navigator.onLine && !sinVerificar.current ? "guardando" : "sin-conexion");
    const t = setTimeout(async () => {
      if (guardando.current || !orgId.current || !sesion.current) return;
      const ses = sesion.current;
      pendiente.current = true;
      const enEquipo = guardarEspacioLocal({ organizacionId: ses.organizacionId, usuarioId: ses.usuario.id, version: version.current, pendiente: true }, json);
      if (!navigator.onLine || sinVerificar.current) {
        setSincronizacion("sin-conexion");
        setErrorGuardado(enEquipo ? null : "Sin conexión y sin espacio en este equipo para guardar los cambios (las fotos ocupan espacio). No cierres la app hasta recuperar la conexión.");
        return;
      }
      guardando.current = true;
      const r = await guardarEspacio(orgId.current, JSON.parse(json), version.current);
      guardando.current = false;
      if (typeof r === "number") {
        version.current = r;
        ultimo.current = json;
        pendiente.current = false;
        guardarEspacioLocal({ organizacionId: ses.organizacionId, usuarioId: ses.usuario.id, version: r, pendiente: false }, json);
        setSincronizacion("guardado");
        setErrorGuardado(null);
      } else if (r === "conflicto") {
        guardarConflicto(json);
        const e = await leerEspacio(orgId.current);
        if (e) adoptar(e, ses);
        setSincronizacion("guardado");
        setErrorGuardado("Otra persona guardó cambios al mismo tiempo y se cargaron los datos más recientes. Revisa tu último cambio y vuelve a hacerlo si no aparece.");
      } else {
        setSincronizacion("sin-conexion");
        // Sin red el aviso de la franja basta; si hay red, el servidor falló y se avisa aparte
        setErrorGuardado(navigator.onLine ? "No se pudo guardar en el servidor: tus cambios quedaron en este equipo y se reintentará automáticamente." : null);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [s, modo, listo, adoptar]);

  // Modo empresa: trae lo que guardaron otros equipos (cada 15 s, al volver a la pestaña y al
  // volver la conexión); reintenta si quedó sin guardar
  useEffect(() => {
    if (modo !== "empresa" || !listo) return;
    const revisar = async () => {
      if (!orgId.current || !sesion.current || guardando.current) return;
      if (!navigator.onLine) {
        setSincronizacion("sin-conexion");
        return;
      }
      // Se entró sin conexión: primero se confirma la sesión con Supabase
      if (sinVerificar.current) {
        const ses = await sesionActual();
        if (ses === SIN_CONEXION) return;
        if (!ses || ses.organizacionId !== orgId.current || ses.usuario.id !== sesion.current.usuario.id) {
          setErrorGuardado("Tu sesión venció. Inicia sesión de nuevo para sincronizar: tus cambios siguen guardados en este equipo.");
          return;
        }
        sesion.current = ses;
        sinVerificar.current = false;
      }
      const v = await versionEspacio(orgId.current);
      if (v === null) {
        setSincronizacion("sin-conexion");
        return;
      }
      if (v > version.current) {
        const e = await leerEspacio(orgId.current);
        if (e && sesion.current) {
          // Había cambios de este equipo sin enviar: gana lo más reciente del servidor (como un conflicto)
          if (pendiente.current) {
            guardarConflicto(compartido(sRef.current));
            setErrorGuardado("Mientras estabas sin conexión otra persona guardó cambios y se cargaron los datos más recientes. Revisa tus últimos cambios y vuelve a hacerlos si no aparecen.");
          }
          adoptar(e, sesion.current);
        }
      } else {
        // Sin cambios ajenos: si algo quedó sin guardar (sin conexión), se fuerza otro intento
        if (!pendiente.current) setSincronizacion("guardado");
        setS((prev) => ({ ...prev }));
      }
    };
    const id = setInterval(revisar, 15000);
    const alVolver = () => document.visibilityState === "visible" && revisar();
    const alPerderRed = () => setSincronizacion("sin-conexion");
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("online", revisar);
    window.addEventListener("offline", alPerderRed);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("online", revisar);
      window.removeEventListener("offline", alPerderRed);
    };
  }, [modo, listo, adoptar]);

  // Modo demo: carga lo guardado en el navegador y escucha a las demás pestañas
  useEffect(() => {
    if (modo !== "demo") return;
    // Datos guardados por una versión anterior: lo que falte sale de la semilla y la
    // configuración se mezcla; sin `consecutivos`, se reconstruyen de lo existente
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
    // Se eligió un perfil de la demo estando en el modo empresa: se entra al montar la demo
    try {
      const p = sessionStorage.getItem(KEY_ENTRAR_DEMO);
      sessionStorage.removeItem(KEY_ENTRAR_DEMO);
      if (p) {
        const { rol, usuarioId } = JSON.parse(p) as { rol: Rol; usuarioId?: string };
        setS((prev) => {
          const u = usuarioId ? prev.usuarios.find((x) => x.id === usuarioId) : prev.usuarios.find((x) => x.rol === rol && x.activo);
          return u ? { ...prev, usuarioId: u.id } : prev;
        });
      }
    } catch {
      /* ignorar */
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
  }, [modo]);

  // Modo demo: cada cambio se guarda entero en localStorage (las fotos pueden llenar la cuota)
  useEffect(() => {
    if (!listo || modo !== "demo") return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
      setErrorGuardado(null);
    } catch {
      setErrorGuardado("El navegador no tiene espacio para guardar más datos de la demo (las fotos ocupan espacio). Quita algunas fotos o restablece la demo en Configuración.");
    }
  }, [s, listo, modo]);

  const usuario = s.usuarios.find((u) => u.id === s.usuarioId) ?? null;

  /** Antepone una entrada de auditoría a nombre del usuario de la sesión. */
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

  /**
   * Aplica un cambio de estado a un documento sobre el estado más reciente: `fn` revalida
   * y devuelve el documento nuevo más lo que cambie (avisos, auditoría), o null si no aplica.
   */
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

  // Las validaciones fuera de setS dan respuesta inmediata con el estado del render;
  // las de dentro de setS (con `prev`) son las que valen.
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
    /** Revisores (por rol) con acceso al módulo del documento: a ellos van los avisos de revisión. */
    const revisoresDe = (tipo: TipoDoc) => (["supervisor", "admin"] as const).filter((r) => puedeUsarTipo(r, tipo));
    /** Por qué un documento ya no se puede aprobar o rechazar (otro llegó primero). */
    const yaNoEnRevision = (d: Documento): string => {
      const ultimo = d.historial[d.historial.length - 1];
      if (d.estado === "borrador" && ultimo?.accion === "Retiró el envío para corregir") return `${nombre(ultimo.usuarioId)} retiró ${d.codigo} para corregirlo: ya no está en revisión. Volverá a tu bandeja cuando lo reenvíe.`;
      if (d.estado === "aprobado" || d.estado === "cerrado") return `${d.codigo} ya fue aprobado${ultimo ? ` (${nombre(ultimo.usuarioId)})` : ""}.`;
      if (d.estado === "rechazado") return `${d.codigo} ya fue devuelto al autor.`;
      return `${d.codigo} ya no está en revisión.`;
    };
    /**
     * Directorio de clientes al guardar (pedido de Magno): el cliente escrito que no está se crea
     * para toda la organización (también desde el técnico, con `registrar_clientes`) y se enlaza;
     * si ya está, se enlaza y se llenan solo sus campos vacíos. Uno desactivado no se recrea.
     */
    const conDirectorio = (prev: Estado, doc: Documento): { doc: Documento; clientes: Cliente[]; auditoria: Auditoria[] } => {
      const sinCambio = { doc, clientes: prev.clientes, auditoria: prev.auditoria };
      const r = rolDe(prev);
      if (!r || !(puede(r, "registrar_clientes") || puede(r, "clientes"))) return sinCambio;
      const plan = planCliente(prev.clientes, doc, uid("c"));
      if (plan.accion === "crear") {
        return { doc: { ...doc, clienteId: plan.cliente.id }, clientes: [...prev.clientes, plan.cliente], auditoria: registrar(prev, "Creó cliente desde un formato", `${plan.cliente.nombre} · ${doc.codigo}`) };
      }
      if (plan.accion === "enlazar") {
        if (!plan.campos.length) return { ...sinCambio, doc: { ...doc, clienteId: plan.cliente.id } };
        return {
          doc: { ...doc, clienteId: plan.cliente.id },
          clientes: prev.clientes.map((c) => (c.id === plan.cliente.id ? plan.cliente : c)),
          auditoria: registrar(prev, "Completó datos del cliente", `${plan.cliente.nombre}: ${plan.campos.join(", ")}`),
        };
      }
      return sinCambio;
    };
    /** Código visible: PREFIJO-001-26. */
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

      modo: modo ?? "demo",
      organizacion,
      sincronizacion,
      async entrarEmpresa(correo, clave) {
        const error = await iniciarSesion(correo, clave);
        if (!error) {
          try {
            sessionStorage.setItem(KEY_TRAS_LOGIN, "1");
          } catch {
            /* ignorar */
          }
          cambiarModo("empresa");
        }
        return error;
      },
      entrarComo(rol, usuarioId) {
        // Los perfiles de prueba son de la demo: si se está en el modo empresa se cambia de modo y se entra al montarla
        if (modo !== "demo") {
          try {
            sessionStorage.setItem(KEY_ENTRAR_DEMO, JSON.stringify({ rol, usuarioId }));
          } catch {
            /* ignorar */
          }
          cambiarModo("demo");
          return;
        }
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
        if (modo === "empresa") {
          void cerrarSesion();
          sesion.current = null;
          orgId.current = null;
        }
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
            const dir = conDirectorio(prev, { ...existente, datos: doc.datos, clienteId: doc.clienteId, proyectoId: doc.proyectoId || undefined, actualizado: ahora() } as Documento);
            const merged = { ...dir.doc, equiposIds: equiposDelCliente(prev, dir.doc) } as Documento;
            return { ...prev, clientes: dir.clientes, auditoria: dir.auditoria, documentos: prev.documentos.map((d) => (d.id === doc.id ? merged : d)) };
          }
          // Documento nuevo: solo de un módulo que el perfil puede diligenciar (lo comercial, la administración)
          const r = rolDe(prev);
          if (!r || !puedeCrearTipo(r, doc.tipo)) return prev;
          // Toma el consecutivo definitivo del año (no se reutiliza aunque se elimine)
          const anio = anioDe(hoy());
          const clave = `${doc.tipo}-${anio}`;
          const n = (prev.consecutivos[clave] ?? 0) + 1;
          const base = {
            ...actualizado,
            consecutivo: n,
            codigo: codigo(prefijo(prev, doc.tipo), n, anio),
            autorId: prev.usuarioId ?? doc.autorId,
            estado: "borrador",
            historial: [evento(prev, "Creó el documento")],
          } as Documento;
          const dir = conDirectorio(prev, base);
          const nuevo = { ...dir.doc, equiposIds: equiposDelCliente(prev, dir.doc) } as Documento;
          return {
            ...prev,
            clientes: dir.clientes,
            consecutivos: { ...prev.consecutivos, [clave]: n },
            documentos: [nuevo, ...prev.documentos],
            auditoria: registrar({ ...prev, auditoria: dir.auditoria }, "Creó", nuevo.codigo),
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
          const revisores = revisoresDe(d.tipo);
          return {
            doc: { ...d, estado: "en_revision", motivoRechazo: undefined, historial: [...d.historial, evento(prev, "Envió a revisión")] },
            notificaciones: [...revisores.map((r) => ({ id: uid("n"), para: r, texto, docId: d.id, fecha: ahora(), leida: false })), ...prev.notificaciones],
            auditoria: registrar(prev, "Envió a revisión", d.codigo),
          };
        });
      },

      aprobar(id, firmaAutoriza) {
        const actual = s.documentos.find((x) => x.id === id);
        if (!actual) return "Documento no disponible.";
        if (actual.estado !== "en_revision") return yaNoEnRevision(actual);
        transicion(id, (d, prev) => {
          // Solo un revisor, solo en revisión y nunca sobre un documento propio (si el autor lo retiró, gana el retiro)
          if (d.estado !== "en_revision" || !revisaTipo(prev, d.tipo) || d.autorId === prev.usuarioId) return null;
          const u = prev.usuarios.find((x) => x.id === prev.usuarioId);
          const info = infoDoc(d.tipo);
          // Cada formato escribe en su casilla quién autoriza (permiso) o da el Vo.Bo. (gastos)
          const datos = u && info.flujo.alAprobar ? { ...d.datos, ...info.flujo.alAprobar(d.datos as never, u, firmaAutoriza) } : d.datos;
          // Firma del cliente tomada en sitio (su «recibido»): al aprobarlo queda cerrado (igual que 0013)
          const campo = info.flujo.cierre === "cliente" ? info.flujo.campoFirmaCliente : undefined;
          const enSitio = Boolean(campo && String((datos as unknown as Record<string, unknown>)[campo] ?? "").startsWith("data:image/"));
          let notifs = notificar(prev, d.autorId, enSitio ? `${d.codigo} fue aprobado por ${nombre(prev.usuarioId)} y quedó cerrado con la firma del cliente` : `${d.codigo} fue aprobado por ${nombre(prev.usuarioId)}`, d.id);
          // Lo que cierra el cliente con su firma (reporte, cotización) le llega a su portal
          if (info.visibleCliente && info.flujo.cierre === "cliente") {
            const texto = enSitio
              ? `${prev.config.empresa} compartió ${info.formato.el} ${info.formato.corto.toLowerCase()} ${d.codigo}, firmado en sitio`
              : `${prev.config.empresa} compartió ${info.formato.el} ${info.formato.corto.toLowerCase()} ${d.codigo} para tu firma`;
            notifs = [...aClientes(prev, d.clienteId, texto, d.id), ...notifs];
          }
          const historial = [...d.historial, evento(prev, "Aprobó"), ...(enSitio ? [evento(prev, "Cerrado con la firma del cliente en sitio")] : [])];
          return {
            doc: { ...d, datos, estado: enSitio ? "cerrado" : "aprobado", historial } as Documento,
            notificaciones: notifs,
            auditoria: enSitio ? registrar({ ...prev, auditoria: registrar(prev, "Aprobó", d.codigo) }, "Cerró con la firma del cliente en sitio", d.codigo) : registrar(prev, "Aprobó", d.codigo),
          };
        });
        return null;
      },

      retirar(id) {
        const actual = s.documentos.find((x) => x.id === id);
        if (!actual || !usuario) return "Documento no disponible.";
        if (actual.autorId !== usuario.id) return "Solo el autor puede retirar el envío.";
        if (actual.estado === "aprobado" || actual.estado === "cerrado") return `${actual.codigo} ya fue aprobado y no se puede retirar. Si hay que corregirlo, el revisor debe devolverlo con el motivo.`;
        if (actual.estado !== "en_revision") return `${actual.codigo} ya no está en revisión.`;
        if (!puedeRetirarDoc(usuario, actual)) return "Este formato no se retira de revisión.";
        transicion(id, (d, prev) => {
          const u = prev.usuarios.find((x) => x.id === prev.usuarioId);
          // Revalida con lo más reciente: si el revisor aprobó o rechazó primero, gana el revisor
          if (!u || !puedeRetirarDoc(u, d)) return null;
          const revisores = revisoresDe(d.tipo);
          const texto = `${nombre(prev.usuarioId)} retiró ${d.codigo} de revisión para corregirlo`;
          // El aviso «envió … a revisión» sin leer ya no aplica: se quita
          const vigentes = prev.notificaciones.filter((n) => !(n.docId === d.id && !n.leida && (revisores as readonly string[]).includes(n.para) && n.texto.endsWith("a revisión")));
          return {
            doc: { ...d, estado: "borrador", historial: [...d.historial, evento(prev, "Retiró el envío para corregir")] },
            notificaciones: [...revisores.map((r) => ({ id: uid("n"), para: r, texto, docId: d.id, fecha: ahora(), leida: false })), ...vigentes],
            auditoria: registrar(prev, "Retiró el envío para corregir", d.codigo),
          };
        });
        return null;
      },

      firmaClienteEnSitio(id, imagen, quien, cargo) {
        const actual = s.documentos.find((x) => x.id === id);
        if (!actual || !usuario) return "Documento no disponible.";
        if (!puedeFirmaClienteEnSitio(usuario, actual)) return actual.estado === "cerrado" ? `${actual.codigo} ya está cerrado.` : "La firma del cliente ya no se puede tomar aquí.";
        if (!imagen.startsWith("data:image/") || quien.trim().length < 3) return "Falta la firma o el nombre de quien firma.";
        transicion(id, (d, prev) => {
          const u = prev.usuarios.find((x) => x.id === prev.usuarioId);
          if (!u || !puedeFirmaClienteEnSitio(u, d)) return null;
          const info = infoDoc(d.tipo);
          const campo = info.flujo.campoFirmaCliente!;
          const datos = { ...d.datos, ...info.aplicarFirma(campo, imagen, d.datos), ...(d.tipo === "reporte" ? { nombreRecibe: quien.trim(), cargoRecibe: cargo.trim() } : {}) };
          // Ya aprobado: la firma lo cierra (como en el portal o por enlace); en revisión, se cierra al aprobarlo
          const cierra = d.estado === "aprobado";
          const historial = [...d.historial, evento(prev, "Firma del cliente en sitio", quien.trim()), ...(cierra ? [evento(prev, "Cerrado con la firma del cliente en sitio")] : [])];
          const texto = `${nombre(prev.usuarioId)} tomó en sitio la firma del cliente en ${d.codigo}${cierra ? ": quedó cerrado" : ""}`;
          return {
            doc: { ...d, datos, estado: cierra ? "cerrado" : d.estado, historial } as Documento,
            // Los enlaces de firma pendientes de ese documento ya no sirven
            enlaces: prev.enlaces.map((e) => (e.docId === d.id && !e.usado ? { ...e, usado: ahora() } : e)),
            notificaciones: [...revisoresDe(d.tipo).map((r) => ({ id: uid("n"), para: r, texto, docId: d.id, fecha: ahora(), leida: false })), ...prev.notificaciones],
            auditoria: registrar(prev, "Firma del cliente en sitio", `${d.codigo} · ${quien.trim()}`),
          };
        });
        return null;
      },

      rechazar(id, motivo) {
        const actual = s.documentos.find((x) => x.id === id);
        if (!actual) return "Documento no disponible.";
        if (actual.estado !== "en_revision") return yaNoEnRevision(actual);
        transicion(id, (d, prev) => {
          if (d.estado !== "en_revision" || !revisaTipo(prev, d.tipo) || d.autorId === prev.usuarioId || !motivo.trim()) return null;
          return {
            doc: { ...d, estado: "rechazado", motivoRechazo: motivo, historial: [...d.historial, evento(prev, "Rechazó", motivo)] },
            notificaciones: notificar(prev, d.autorId, `${d.codigo} fue rechazado: ${motivo}`, d.id),
            auditoria: registrar(prev, "Rechazó", `${d.codigo} · ${motivo}`),
          };
        });
        return null;
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
        // Lo agregado desde el asistente se conserva aunque el formulario de Configuración tenga una copia vieja
        setS((prev) => ({
          ...prev,
          config: { ...c, opcionesPropias: prev.config.opcionesPropias, serviciosPropios: prev.config.serviciosPropios },
          auditoria: registrar(prev, "Cambió configuración", "Formatos y consecutivos"),
        }));
      },

      // Opciones y servicios agregados desde el asistente: quedan en la configuración de la empresa para todo el equipo
      agregarOpcion(clave, valor) {
        const v = valor.trim();
        if (!v || !usuario) return;
        setS((prev) => {
          const actuales = prev.config.opcionesPropias?.[clave] ?? [];
          if (actuales.some((x) => x.toLowerCase() === v.toLowerCase())) return prev;
          return {
            ...prev,
            config: { ...prev.config, opcionesPropias: { ...prev.config.opcionesPropias, [clave]: [...actuales, v] } },
            auditoria: registrar(prev, "Agregó una opción", `${clave}: ${v}`),
          };
        });
      },
      quitarOpcion(clave, valor) {
        if (!usuario || !puede(usuario.rol, "config")) return;
        setS((prev) => {
          const restantes = (prev.config.opcionesPropias?.[clave] ?? []).filter((x) => x !== valor);
          const opcionesPropias = { ...prev.config.opcionesPropias, [clave]: restantes };
          if (!restantes.length) delete opcionesPropias[clave];
          return { ...prev, config: { ...prev.config, opcionesPropias }, auditoria: registrar(prev, "Quitó una opción", `${clave}: ${valor}`) };
        });
      },
      agregarServicio(m) {
        const descripcion = m.descripcion.trim();
        const existente = [...CATALOGO_SERVICIOS, ...(s.config.serviciosPropios ?? [])].find((x) => x.descripcion.toLowerCase() === descripcion.toLowerCase());
        if (existente) return existente;
        const nuevo: ServicioCatalogo = {
          clave: uid("srv"),
          descripcion,
          detalle: m.detalle?.trim() || undefined,
          unidad: m.unidad.trim() || "Unidades",
          precioReferencia: Math.max(0, Math.round(m.precioReferencia)),
          ivaPct: IVA_GENERAL,
        };
        setS((prev) => ({
          ...prev,
          config: { ...prev.config, serviciosPropios: [...(prev.config.serviciosPropios ?? []), nuevo] },
          auditoria: registrar(prev, "Agregó un servicio al catálogo", `${nuevo.descripcion} · $ ${nuevo.precioReferencia.toLocaleString("es-CO")}`),
        }));
        return nuevo;
      },
      quitarServicio(clave) {
        if (!usuario || !puede(usuario.rol, "config")) return;
        setS((prev) => {
          const sv = prev.config.serviciosPropios?.find((x) => x.clave === clave);
          if (!sv) return prev;
          return {
            ...prev,
            config: { ...prev.config, serviciosPropios: prev.config.serviciosPropios!.filter((x) => x.clave !== clave) },
            auditoria: registrar(prev, "Quitó un servicio del catálogo", sv.descripcion),
          };
        });
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
              datos: { ...d.datos, firmaCliente: imagen, nombreRecibe: d.datos.nombreRecibe || nombre.trim() },
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
        // Solo la demo se restablece; el espacio de la empresa nunca se borra desde aquí
        if (modo !== "demo") return;
        setS((prev) => ({ ...inicial(), usuarioId: prev.usuarioId }));
      },
    };
  }, [s, listo, usuario, registrar, transicion, errorGuardado, modo, organizacion, sincronizacion, cambiarModo]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/** Datos y acciones del aplicativo; solo dentro de `DemoProvider` (si no, lanza un error). */
export function useDemo(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemo fuera de DemoProvider");
  return v;
}
