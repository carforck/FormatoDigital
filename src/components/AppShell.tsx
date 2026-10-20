"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  ClipboardCheck,
  FileText,
  FolderOpen,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Users,
  X,
} from "lucide-react";

import { asset, rutaDoc } from "@/lib/base";
import { ETIQUETA_ROL } from "@/lib/formatos";
import { puede, type Accion } from "@/lib/permisos";
import { useDemo } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Item {
  href: string;
  label: string;
  icon: typeof FileText;
  req?: Accion;
  contador?: "revision" | "borradores";
}

const GRUPOS: { titulo: string; items: Item[] }[] = [
  {
    titulo: "Documentos",
    items: [
      { href: "/app", label: "Tablero", icon: LayoutDashboard },
      { href: "/app/nuevo/reporte", label: "Nuevo reporte técnico", icon: FileText, req: "crear" },
      { href: "/app/nuevo/permiso", label: "Nuevo permiso de trabajo", icon: HardHat, req: "crear" },
      { href: "/app/documentos", label: "Documentos", icon: FolderOpen, contador: "borradores" },
    ],
  },
  {
    titulo: "Gestión SST",
    items: [
      { href: "/app/revision", label: "Revisión y aprobación", icon: ClipboardCheck, req: "revisar", contador: "revision" },
      { href: "/app/clientes", label: "Clientes", icon: Building2, req: "clientes" },
    ],
  },
  {
    titulo: "Administración",
    items: [
      { href: "/app/usuarios", label: "Usuarios y roles", icon: Users, req: "usuarios" },
      { href: "/app/config", label: "Configuración", icon: Settings, req: "config" },
      { href: "/app/auditoria", label: "Auditoría", icon: ScrollText, req: "auditoria" },
    ],
  },
];

/** Rutas que exigen un permiso específico. */
const RUTAS: [string, Accion][] = [
  ["/app/nuevo", "crear"],
  ["/app/revision", "revisar"],
  ["/app/clientes", "clientes"],
  ["/app/usuarios", "usuarios"],
  ["/app/config", "config"],
  ["/app/auditoria", "auditoria"],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const demo = useDemo();
  const { usuario, listo } = demo;
  const path = usePathname();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [bell, setBell] = useState(false);

  useEffect(() => {
    if (listo && !usuario) router.replace("/acceso");
  }, [listo, usuario, router]);

  useEffect(() => setAbierto(false), [path]);

  if (!listo || !usuario) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Cargando demo…</div>;
  }

  const bloqueada = RUTAS.find(([r, a]) => path.startsWith(r) && !puede(usuario.rol, a));
  const contadores = {
    revision: demo.visibles.filter((d) => d.estado === "en_revision").length,
    borradores: demo.visibles.filter((d) => d.autorId === usuario.id && (d.estado === "borrador" || d.estado === "rechazado")).length,
  };
  const sinLeer = demo.misNotificaciones.filter((n) => !n.leida).length;

  const nav = (
    <nav className="space-y-5">
      {GRUPOS.map((g) => {
        const items = g.items.filter((i) => !i.req || puede(usuario.rol, i.req));
        if (!items.length) return null;
        return (
          <div key={g.titulo}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">{g.titulo}</p>
            {items.map((i) => {
              const activo = i.href === "/app" ? path === "/app" : path.startsWith(i.href);
              const n = i.contador ? contadores[i.contador] : 0;
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white",
                    activo && "bg-white/10 font-medium text-white",
                  )}
                >
                  <i.icon className={cn("h-4 w-4", activo && "text-sotec-green")} />
                  <span className="flex-1">{i.label}</span>
                  {n > 0 && <span className="rounded-full bg-sotec-green px-1.5 text-[11px] font-semibold text-sotec">{n}</span>}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F6F8F4]">
      <div className="print:hidden bg-sotec-green px-4 py-1 text-center text-xs font-medium text-sotec">
        Modo demostración · datos ficticios guardados solo en este navegador ·{" "}
        <Link href="/" className="underline">
          volver a la presentación
        </Link>
      </div>

      <aside
        className={cn(
          "print:hidden fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sotec p-4 transition-transform lg:top-6 lg:translate-x-0",
          abierto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <Link href="/app" className="rounded-md bg-white px-2 py-1.5">
            <img src={asset("/sotec-logo.png")} alt="SOTEC" className="h-7 w-auto" />
          </Link>
          <button className="text-white lg:hidden" onClick={() => setAbierto(false)} aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto">{nav}</div>
        <div className="mt-4 rounded-lg bg-white/5 p-3 text-xs text-white/80">
          <p className="font-semibold text-white">{usuario.nombre}</p>
          <p>{usuario.cargo}</p>
          <p className="mt-1 inline-block rounded bg-sotec-green/20 px-1.5 py-0.5 text-sotec-green">{ETIQUETA_ROL[usuario.rol]}</p>
        </div>
      </aside>
      {abierto && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setAbierto(false)} />}

      <div className="lg:pl-64">
        <header className="print:hidden sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur">
          <button className="lg:hidden" onClick={() => setAbierto(true)} aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </button>
          <label className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <span className="hidden sm:inline">Ver como</span>
            <select
              value={usuario.id}
              onChange={(e) => {
                const u = demo.usuarios.find((x) => x.id === e.target.value)!;
                demo.entrarComo(u.rol, u.id);
                router.push("/app");
              }}
              className="w-[150px] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 sm:w-auto sm:max-w-[240px] sm:text-sm"
            >
              {demo.usuarios
                .filter((u) => u.activo)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {ETIQUETA_ROL[u.rol]} · {u.nombre}
                  </option>
                ))}
            </select>
          </label>
          <div className="relative">
            <button
              onClick={() => {
                setBell(!bell);
                if (!bell) setTimeout(() => demo.marcarLeidas(), 1500);
              }}
              className="relative rounded-md p-2 hover:bg-slate-100"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              {sinLeer > 0 && <span className="absolute right-1 top-1 h-4 min-w-4 rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white">{sinLeer}</span>}
            </button>
            {bell && (
              <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                <p className="px-2 py-1 text-xs font-semibold text-slate-500">Notificaciones</p>
                {demo.misNotificaciones.length === 0 && <p className="px-2 py-3 text-sm text-slate-500">Sin novedades.</p>}
                <div className="max-h-80 overflow-y-auto">
                  {demo.misNotificaciones.slice(0, 12).map((n) => (
                    <Link
                      key={n.id}
                      href={n.docId ? rutaDoc(n.docId) : "/app"}
                      onClick={() => setBell(false)}
                      className={cn("block rounded-md px-2 py-2 text-sm hover:bg-slate-50", !n.leida && "bg-sotec-soft")}
                    >
                      {n.texto}
                      <span className="block text-[11px] text-slate-500">{n.fecha.replace("T", " ").slice(0, 16)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              demo.salir();
              router.push("/acceso");
            }}
            className="rounded-md p-2 hover:bg-slate-100"
            aria-label="Salir"
            title="Cambiar de perfil"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          {bloqueada ? (
            <div className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-lg font-semibold">Acceso restringido</p>
              <p className="mt-1 text-sm text-slate-600">
                El perfil <strong>{ETIQUETA_ROL[usuario.rol]}</strong> no tiene permiso para esta sección. Así se ve el control de acceso por rol: cambia de perfil arriba para probarla.
              </p>
              <Link href="/app" className="mt-4 inline-block text-sm font-medium text-sotec-greenDeep underline">
                Ir al tablero
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
