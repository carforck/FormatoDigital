"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Cctv,
  Building2,
  ChevronDown,
  ClipboardCheck,
  FileSignature,
  FileText,
  FolderKanban,
  FolderOpen,
  Globe,
  HardHat,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Plus,
  Receipt,
  ScrollText,
  Network,
  Search,
  Settings,
  Sun,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { Avatar } from "@/components/ui/corporativo";
import { useSeguirEdicion } from "@/components/ui/volver";
import { asset, rutaCuenta, rutaDoc } from "@/nucleo/rutas";
import { ETIQUETA_ROL } from "@/nucleo/catalogos";
import { TIPOS_DOC, rutaNuevo } from "@/modulos/registro";
import { puede, puedeCrearTipo, type Accion } from "@/nucleo/permisos";
import type { TipoDoc } from "@/nucleo/tipos";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { cn } from "@/lib/utils";

interface Item {
  href: string;
  label: string;
  icon: typeof FileText;
  req?: Accion;
  /** Generador de un formato: se muestra si el perfil lo puede diligenciar (permiso `requiere` del módulo). */
  tipo?: TipoDoc;
  contador?: "revision" | "borradores";
}

const GRUPOS: { titulo: string; items: Item[] }[] = [
  {
    titulo: "Documentos",
    items: [
      { href: "/app", label: "Tablero", icon: LayoutDashboard },
      { href: "/app/nuevo/reporte", label: "Nuevo reporte técnico", icon: FileText, tipo: "reporte" },
      { href: "/app/nuevo/permiso", label: "Nuevo permiso de trabajo", icon: HardHat, tipo: "permiso" },
      { href: "/app/nuevo/gasto", label: "Legalizar gastos", icon: Wallet, tipo: "gasto" },
      { href: "/app/nuevo/cotizacion", label: "Nueva cotización", icon: FileSignature, tipo: "cotizacion" },
      { href: "/app/documentos", label: "Documentos", icon: FolderOpen, contador: "borradores" },
    ],
  },
  {
    titulo: "Gestión",
    items: [
      { href: "/app/proyectos", label: "Proyectos", icon: FolderKanban },
      { href: "/app/equipos", label: "Equipos", icon: Cctv },
      { href: "/app/revision", label: "Revisión y aprobación", icon: ClipboardCheck, req: "revisar", contador: "revision" },
      { href: "/app/cobros", label: "Cuentas de cobro", icon: Receipt, req: "ver_cobros" },
      { href: "/app/clientes", label: "Clientes", icon: Building2, req: "clientes" },
    ],
  },
  {
    titulo: "Administración",
    items: [
      { href: "/app/usuarios", label: "Usuarios y roles", icon: Users, req: "usuarios" },
      { href: "/app/config", label: "Configuración", icon: Settings, req: "config" },
      { href: "/app/auditoria", label: "Auditoría", icon: ScrollText, req: "auditoria" },
      { href: "/app/mapa", label: "Mapa del sistema", icon: Network, req: "mapa" },
    ],
  },
];

/** Rutas que exigen un permiso específico. */
const RUTAS: [string, Accion][] = [
  ["/app/nuevo", "crear"],
  ["/app/cobros/nueva", "cobros"],
  ["/app/proyectos/editar", "proyectos"],
  ["/app/cobros", "ver_cobros"],
  ["/app/revision", "revisar"],
  ["/app/clientes", "clientes"],
  ["/app/usuarios", "usuarios"],
  ["/app/config", "config"],
  ["/app/auditoria", "auditoria"],
  ["/app/mapa", "mapa"],
];

/** Título de la barra superior según la ruta. */
const TITULOS: [string, string][] = [
  ["/app/nuevo/reporte", "Nuevo reporte técnico"],
  ["/app/nuevo/permiso", "Nuevo permiso de trabajo"],
  ["/app/nuevo/gasto", "Legalización de gastos"],
  ["/app/nuevo/cotizacion", "Nueva cotización"],
  ["/app/proyectos/editar", "Proyecto"],
  ["/app/proyectos/ver", "Detalle del proyecto"],
  ["/app/proyectos", "Proyectos"],
  ["/app/equipos/ver", "Ficha del equipo"],
  ["/app/equipos", "Equipos"],
  ["/app/documentos/ver", "Detalle del documento"],
  ["/app/documentos", "Documentos"],
  ["/app/revision", "Revisión y aprobación"],
  ["/app/cobros/nueva", "Nueva cuenta de cobro"],
  ["/app/cobros/ver", "Detalle de la cuenta de cobro"],
  ["/app/cobros", "Cuentas de cobro"],
  ["/app/clientes", "Clientes"],
  ["/app/usuarios", "Usuarios y roles"],
  ["/app/config", "Configuración"],
  ["/app/auditoria", "Auditoría"],
  ["/app/mapa", "Mapa del sistema"],
  ["/app", "Tablero"],
];

function useFueraDe<T extends HTMLElement>(abierto: boolean, cerrar: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!abierto) return;
    const f = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cerrar();
    };
    document.addEventListener("pointerdown", f);
    return () => document.removeEventListener("pointerdown", f);
  }, [abierto, cerrar]);
  return ref;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const demo = useDemo();
  const { usuario, listo } = demo;
  const path = usePathname().replace(/\/$/, "") || "/";
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [perfil, setPerfil] = useState(false);
  const [nuevo, setNuevo] = useState(false);
  // Barra lateral en escritorio: riel de íconos que se abre al pasar el mouse; se puede fijar abierta
  const [fijada, setFijada] = useState(false);
  const [hover, setHover] = useState(false);
  const [escritorio, setEscritorio] = useState(false);
  // Tema del aplicativo (la landing y los formatos impresos van siempre claros)
  const [tema, setTema] = useState<"claro" | "oscuro" | "sistema">("sistema");
  const [sistemaOscuro, setSistemaOscuro] = useState(false);

  useEffect(() => {
    try {
      const f = localStorage.getItem("fd-sidebar");
      if (f) setFijada(f === "fija");
      const t = localStorage.getItem("fd-tema");
      if (t === "claro" || t === "oscuro" || t === "sistema") setTema(t);
    } catch {
      /* sin almacenamiento */
    }
    const mqLg = window.matchMedia("(min-width: 1024px)");
    const mqOsc = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      setEscritorio(mqLg.matches);
      setSistemaOscuro(mqOsc.matches);
    };
    sync();
    mqLg.addEventListener("change", sync);
    mqOsc.addEventListener("change", sync);
    return () => {
      mqLg.removeEventListener("change", sync);
      mqOsc.removeEventListener("change", sync);
    };
  }, []);

  const oscuro = tema === "oscuro" || (tema === "sistema" && sistemaOscuro);
  // Fondo del documento acorde (rebote del scroll en móvil)
  useEffect(() => {
    document.body.style.backgroundColor = oscuro ? "#0F1311" : "";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, [oscuro]);

  const guardar = (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* sin almacenamiento */
    }
  };
  const cambiarTema = () => {
    const sig = tema === "claro" ? "oscuro" : tema === "oscuro" ? "sistema" : "claro";
    setTema(sig);
    guardar("fd-tema", sig);
  };
  const compacta = escritorio && !fijada && !hover;
  const [q, setQ] = useState("");
  useSeguirEdicion(path);
  // Query de la URL para el título (?id=, ?nuevo=1). Se lee al confirmar cada navegación o cambio de datos
  // (guardar cambia ?nuevo=1 por ?id=): el shell no usa useSearchParams, que obligaría a envolver todo el layout en Suspense
  const [busqueda, setBusqueda] = useState("");
  useEffect(() => {
    setBusqueda(window.location.search);
  }, [path, demo]);
  const refBell = useFueraDe<HTMLDivElement>(bell, () => setBell(false));
  const refPerfil = useFueraDe<HTMLDivElement>(perfil, () => setPerfil(false));

  useEffect(() => {
    if (listo && !usuario) router.replace("/acceso");
  }, [listo, usuario, router]);

  useEffect(() => {
    setMenu(false);
    setNuevo(false);
    setPerfil(false);
  }, [path]);

  // Esc cierra el menú lateral, la hoja «Nuevo», las notificaciones y el perfil (como los modales)
  useEffect(() => {
    if (!menu && !nuevo && !bell && !perfil) return;
    const f = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(false);
      setNuevo(false);
      setBell(false);
      setPerfil(false);
    };
    document.addEventListener("keydown", f);
    return () => document.removeEventListener("keydown", f);
  }, [menu, nuevo, bell, perfil]);

  if (!listo || !usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7F3]">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-sotec-green border-t-transparent" /> Cargando el espacio de trabajo…
        </div>
      </div>
    );
  }

  // Además de la tabla de rutas, cada generador exige el permiso de su módulo (lo comercial: solo la administración)
  const bloqueada =
    RUTAS.find(([r, a]) => path.startsWith(r) && !puede(usuario.rol, a)) ?? TIPOS_DOC.find((t) => path === rutaNuevo(t) && !puedeCrearTipo(usuario.rol, t));
  const contadores = {
    revision: demo.visibles.filter((d) => d.estado === "en_revision").length,
    borradores: demo.visibles.filter((d) => d.autorId === usuario.id && (d.estado === "borrador" || d.estado === "rechazado")).length,
  };
  const sinLeer = demo.misNotificaciones.filter((n) => !n.leida).length;
  const tituloBase = TITULOS.find(([r]) => path.startsWith(r))?.[1] ?? "Tablero";
  // En el generador con ?id= se continúa un documento existente
  const qs = new URLSearchParams(busqueda);
  const continuando = path.startsWith("/app/nuevo") && qs.has("id");
  // Formularios de crear/editar: el título dice cuál de los dos es
  const titulo = continuando
    ? tituloBase.replace(/^Nuev[oa] /, "Continuar ")
    : path === "/app/proyectos/editar"
      ? qs.has("id") ? "Editar proyecto" : "Nuevo proyecto"
      : path === "/app/cobros/nueva" && qs.has("id")
        ? "Editar cuenta de cobro"
        : path === "/app/equipos/ver" && qs.get("nuevo") === "1"
          ? "Nuevo equipo"
          : tituloBase;
  // Continuar un documento existente no es «Nuevo …»: se marca Documentos
  const activo = (href: string) => (continuando ? href === "/app/documentos" : href === "/app" ? path === "/app" : path.startsWith(href));

  const cambiarPerfil = (id: string) => {
    const u = demo.usuarios.find((x) => x.id === id)!;
    demo.entrarComo(u.rol, u.id);
    setPerfil(false);
    router.push("/app");
  };

  const nav = (
    <nav className="space-y-6">
      {GRUPOS.map((g) => {
        const items = g.items.filter((i) => (!i.req || puede(usuario.rol, i.req)) && (!i.tipo || puedeCrearTipo(usuario.rol, i.tipo)));
        if (!items.length) return null;
        return (
          <div key={g.titulo}>
            <p className={cn("mb-1.5 whitespace-nowrap px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35 transition-opacity", compacta && "opacity-0")}>{g.titulo}</p>
            {items.map((i) => {
              const on = activo(i.href);
              const n = i.contador ? contadores[i.contador] : 0;
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  title={compacta ? i.label : undefined}
                  aria-label={compacta ? i.label : undefined}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white",
                    on && "bg-white/[0.08] font-medium text-white",
                  )}
                >
                  {on && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-sotec-green" />}
                  <span className="relative shrink-0">
                    <i.icon className={cn("h-4 w-4", on ? "text-sotec-green" : "text-white/50")} />
                    {n > 0 && compacta && <span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-sotec-green ring-2 ring-sotec" />}
                  </span>
                  <span className={cn("flex-1 whitespace-nowrap transition-opacity", compacta && "opacity-0")}>{i.label}</span>
                  {n > 0 && !compacta && <span className="rounded-md bg-sotec-green/15 px-1.5 text-[11px] font-semibold text-sotec-green">{n}</span>}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  // Barra inferior (celular): accesos clave según el rol
  const inferior: { href?: string; label: string; icon: typeof FileText; accion?: () => void; badge?: number }[] = [
    { href: "/app", label: "Inicio", icon: LayoutDashboard },
    { href: "/app/documentos", label: "Documentos", icon: FolderOpen, badge: contadores.borradores },
    ...(puede(usuario.rol, "crear") ? [{ label: "Nuevo", icon: Plus, accion: () => setNuevo(true) }] : []),
    ...(puede(usuario.rol, "revisar") ? [{ href: "/app/revision", label: "Revisión", icon: ClipboardCheck, badge: contadores.revision }] : [{ label: "Avisos", icon: Bell, accion: () => setBell(true), badge: sinLeer }]),
    { label: "Menú", icon: Menu, accion: () => setMenu(true) },
  ];

  return (
    <div className={cn("min-h-screen", oscuro ? "dark bg-[#0F1311] text-slate-100" : "bg-[#F5F7F3]")}>
      {/* Franja de demostración discreta */}
      <div className="print:hidden flex h-7 items-center justify-center gap-2 bg-[#141414] px-3 text-[11px] text-white/60">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sotec-green" />
        <span className="truncate">
          Entorno de demostración · datos ficticios
          <span className="hidden sm:inline"> guardados solo en este navegador</span>
        </span>
        <Link href="/" className="shrink-0 font-medium text-sotec-green hover:underline">
          Ver presentación
        </Link>
      </div>

      {/* Barra lateral */}
      <aside
        onMouseEnter={() => escritorio && setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => escritorio && setHover(true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setHover(false)}
        className={cn(
          "print:hidden fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col overflow-hidden border-r border-white/5 bg-sotec transition-[transform,width,box-shadow] duration-200 lg:top-7 lg:z-40 lg:translate-x-0",
          menu ? "translate-x-0" : "-translate-x-full",
          compacta && "lg:w-[72px]",
          escritorio && !fijada && hover && "shadow-2xl shadow-black/40",
        )}
      >
        <div className={cn("flex items-center justify-between pb-4 pt-5", compacta ? "px-3" : "px-4")}>
          <Link href="/app" className="flex items-center gap-2.5" aria-label="Ir al tablero">
            <img src={asset("/sotec-logo-v3-oscuro.png")} alt="SOTEC" className={cn("w-auto transition-all", compacta ? "h-9" : "h-12")} />
          </Link>
          <button className="rounded p-1 text-white/70 hover:text-white lg:hidden" onClick={() => setMenu(false)} aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </button>
          {escritorio && !compacta && (
            <button
              onClick={() => {
                setFijada(!fijada);
                guardar("fd-sidebar", fijada ? "riel" : "fija");
                if (fijada) setHover(false);
              }}
              className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              aria-label={fijada ? "Contraer la barra lateral" : "Fijar la barra lateral abierta"}
              title={fijada ? "Contraer (se abre al pasar el mouse)" : "Fijar abierta"}
            >
              {fijada ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
          )}
        </div>
        <div className={cn("mx-4 mb-5 whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 transition-opacity", compacta && "opacity-0")}>
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">Espacio de trabajo</p>
          <p className="text-sm font-medium text-white">Sistema de gestión SG-SST</p>
        </div>
        <div className={cn("scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden", compacta ? "px-2.5" : "px-3")}>{nav}</div>
        {/* Regreso a la landing desde cualquier módulo */}
        <div className={cn("pb-2", compacta ? "px-2.5" : "px-3")}>
          <Link
            href="/"
            title={compacta ? "Volver al sitio" : undefined}
            aria-label={compacta ? "Volver al sitio" : undefined}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white"
          >
            <Globe className="h-4 w-4 shrink-0 text-white/50" />
            <span className={cn("flex-1 whitespace-nowrap transition-opacity", compacta && "opacity-0")}>Volver al sitio</span>
          </Link>
        </div>
        <div className={cn("border-t border-white/10", compacta ? "px-3.5 py-4" : "p-4")}>
          <div className="flex items-center gap-3">
            <Avatar nombre={usuario.nombre} className="bg-sotec-green text-sotec" />
            <div className={cn("min-w-0 flex-1 transition-opacity", compacta && "opacity-0")}>
              <p className="truncate text-sm font-medium text-white">{usuario.nombre}</p>
              <p className="truncate text-xs text-white/50">{ETIQUETA_ROL[usuario.rol]}</p>
            </div>
            <button
              onClick={() => {
                demo.salir();
                router.push("/acceso");
              }}
              className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Salir"
              title="Salir de la demo"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <p className={cn("mt-3 whitespace-nowrap text-[10px] text-white/30", compacta && "opacity-0")}>FormatoDigital · v0.1 demo</p>
        </div>
      </aside>
      {menu && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] lg:hidden" onClick={() => setMenu(false)} />}

      <div className={cn("transition-[padding] duration-200", escritorio && !fijada ? "lg:pl-[72px]" : "lg:pl-[264px]")}>
        {/* Barra superior */}
        <header className="print:hidden sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="rounded-md p-1.5 hover:bg-slate-100 lg:hidden" onClick={() => setMenu(true)} aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="hidden text-[11px] text-slate-400 sm:block">SOTEC · SG-SST</p>
            <p className="truncate text-sm font-semibold text-slate-900">{titulo}</p>
          </div>

          <form
            className="ml-auto hidden md:block"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/app/documentos?q=${encodeURIComponent(q)}`);
            }}
          >
            <label className="relative block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar documentos…"
                className="h-9 w-56 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none transition focus:w-72 focus:border-sotec-greenDeep focus:bg-white lg:w-64"
              />
            </label>
          </form>

          <button
            onClick={cambiarTema}
            className="ml-auto rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:ml-0"
            aria-label={`Tema: ${tema === "claro" ? "claro" : tema === "oscuro" ? "oscuro" : "según el sistema"}. Cambiar tema`}
            title={tema === "claro" ? "Tema claro" : tema === "oscuro" ? "Tema oscuro" : "Tema del sistema"}
          >
            {tema === "claro" ? <Sun className="h-5 w-5" /> : tema === "oscuro" ? <Moon className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </button>
          <div className="relative" ref={refBell}>
            <button
              onClick={() => {
                setBell(!bell);
                if (!bell) setTimeout(() => demo.marcarLeidas(), 1500);
              }}
              className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              {sinLeer > 0 && <span className="absolute right-1 top-1 h-4 min-w-4 rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white">{sinLeer}</span>}
            </button>
            {bell && (
              <div className="fixed inset-x-3 top-[92px] z-50 rounded-xl border border-slate-200 bg-white p-2 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80">
                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Notificaciones</p>
                {demo.misNotificaciones.length === 0 && <p className="px-2 py-3 text-sm text-slate-500">Sin novedades.</p>}
                <div className="max-h-80 overflow-y-auto">
                  {demo.misNotificaciones.slice(0, 12).map((n) => (
                    <Link
                      key={n.id}
                      href={n.docId ? rutaDoc(n.docId) : n.cuentaId ? rutaCuenta(n.cuentaId) : "/app"}
                      onClick={() => setBell(false)}
                      className={cn("flex gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-50", !n.leida && "bg-sotec-soft")}
                    >
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.leida ? "bg-slate-200" : "bg-sotec-greenDeep")} />
                      <span>
                        {n.texto}
                        <span className="block text-[11px] text-slate-500">{n.fecha.replace("T", " ").slice(0, 16)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Perfil de demostración */}
          <div className="relative" ref={refPerfil}>
            <button onClick={() => setPerfil(!perfil)} className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-100" aria-haspopup="menu" aria-expanded={perfil}>
              <Avatar nombre={usuario.nombre} className="h-8 w-8" />
              <span className="hidden text-left leading-tight sm:block">
                <span className="block max-w-[150px] truncate text-sm font-medium text-slate-900">{usuario.nombre}</span>
                <span className="block text-[11px] text-slate-500">{ETIQUETA_ROL[usuario.rol]}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {perfil && (
              <div role="menu" className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Ver la demo como</p>
                {demo.usuarios
                  .filter((u) => u.activo)
                  .map((u) => (
                    <button
                      key={u.id}
                      role="menuitem"
                      onClick={() => cambiarPerfil(u.id)}
                      className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50", u.id === usuario.id && "bg-sotec-soft")}
                    >
                      <Avatar nombre={u.nombre} className="h-8 w-8" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{u.nombre}</span>
                        <span className="block text-xs text-slate-500">{ETIQUETA_ROL[u.rol]}</span>
                      </span>
                      {u.id === usuario.id && <span className="text-[11px] font-semibold text-sotec-greenDeep">Actual</span>}
                    </button>
                  ))}
                {usuario.rol === "cliente" && (
                  <label className="mt-1 block border-t border-slate-100 px-2 pb-1 pt-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Empresa del portal</span>
                    <select
                      value={usuario.clienteId ?? ""}
                      onChange={(e) => {
                        demo.verPortalDe(e.target.value);
                        setPerfil(false);
                        router.push("/app");
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800"
                    >
                      {demo.clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-[11px] leading-snug text-slate-500">El cliente solo ve los documentos aprobados de su empresa.</span>
                  </label>
                )}
                <div className="my-1 border-t border-slate-100" />
                <Link href="/" onClick={() => setPerfil(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  <Globe className="h-4 w-4" /> Volver al sitio
                </Link>
                <button
                  onClick={() => {
                    demo.salir();
                    router.push("/acceso");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" /> Salir de la demo
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 pb-28 sm:p-6 lg:pb-10">
          {bloqueada ? (
            <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <ScrollText className="h-5 w-5" />
              </span>
              <p className="mt-4 text-lg font-semibold">Acceso restringido</p>
              <p className="mt-1 text-sm text-slate-600">
                El perfil <strong>{ETIQUETA_ROL[usuario.rol]}</strong> no tiene permiso para esta sección. Así funciona el control de acceso por rol: cambia de perfil arriba a la derecha para probarla.
              </p>
              <Link href="/app" className="mt-5 inline-flex rounded-lg bg-sotec px-4 py-2 text-sm font-medium text-white hover:bg-black">
                Ir al tablero
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Navegación inferior en celular */}
      <nav className="print:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-end justify-around px-2">
          {inferior.map((it) => {
            const on = it.href ? activo(it.href) : false;
            const contenido = (
              <>
                {it.label === "Nuevo" ? (
                  <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-sotec text-sotec-green shadow-lg shadow-black/20 ring-4 ring-white">
                    <it.icon className="h-5 w-5" />
                  </span>
                ) : (
                  <span className="relative">
                    <it.icon className={cn("h-5 w-5", on ? "text-sotec-greenDeep" : "text-slate-500")} />
                    {!!it.badge && <span className="absolute -right-2 -top-1.5 h-4 min-w-4 rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white">{it.badge}</span>}
                  </span>
                )}
                <span className={cn("text-[10px] font-medium", on ? "text-sotec-greenDeep" : "text-slate-500")}>{it.label}</span>
              </>
            );
            const cls = "flex min-w-[56px] flex-col items-center gap-1 py-2";
            return it.href ? (
              <Link key={it.label} href={it.href} className={cls}>
                {contenido}
              </Link>
            ) : (
              <button key={it.label} onClick={it.accion} className={cls}>
                {contenido}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Hoja "Nuevo" en celular */}
      {nuevo && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 lg:hidden" onClick={() => setNuevo(false)}>
          <div role="dialog" aria-modal="true" aria-label="Nuevo documento" className="w-full rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />
            <p className="mb-3 text-sm font-semibold text-slate-900">¿Qué formato vas a diligenciar?</p>
            {(
              [
                { tipo: "reporte", t: "Reporte técnico", d: "FO-GSST-22 · visita, diagnóstico y firma del cliente", icon: FileText },
                { tipo: "permiso", t: "Permiso de trabajo", d: "F-GSST-13 · peligros, EPP y grupo ejecutor", icon: HardHat },
                { tipo: "gasto", t: "Legalización de gastos", d: "FO-GSST-25 · gastos con foto de la factura", icon: Wallet },
                { tipo: "cotizacion", t: "Cotización", d: "Propuesta económica al cliente, con aceptación firmada", icon: FileSignature },
              ] as { tipo: TipoDoc; t: string; d: string; icon: typeof FileText }[]
            )
              .filter((o) => puedeCrearTipo(usuario.rol, o.tipo))
              .map((o) => ({ ...o, href: rutaNuevo(o.tipo) }))
              .map((o) => (
              <Link key={o.href} href={o.href} className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-sotec-green">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sotec text-sotec-green">
                  <o.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-medium text-slate-900">{o.t}</span>
                  <span className="block text-xs text-slate-500">{o.d}</span>
                </span>
              </Link>
            ))}
            {/* Lo demás que el perfil puede crear */}
            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {[
                { href: "/app/proyectos/editar", t: "Proyecto", icon: FolderKanban, req: "proyectos" as Accion },
                { href: "/app/cobros/nueva", t: "Cuenta de cobro", icon: Receipt, req: "cobros" as Accion },
                { href: "/app/equipos/ver?nuevo=1", t: "Equipo", icon: Cctv, req: "equipos" as Accion },
              ]
                .filter((o) => puede(usuario.rol, o.req))
                .map((o) => (
                  <Link key={o.href} href={o.href} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-sotec-green">
                    <Plus className="h-4 w-4" aria-hidden /> <o.icon className="h-4 w-4 text-slate-500" aria-hidden /> {o.t}
                  </Link>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
