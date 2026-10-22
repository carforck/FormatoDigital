"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Database, Network, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/ui/corporativo";
import { COMANDO_ESQUEMA, ESQUEMA } from "@/components/mapa/esquema";
import MatrizRoles from "@/components/mapa/MatrizRoles";
import { cn } from "@/lib/utils";

function Cargando() {
  return (
    <div className="flex h-[64svh] min-h-[420px] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500 lg:h-[72vh]">
      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-sotec-green border-t-transparent" /> Cargando el diagrama…
    </div>
  );
}

// React Flow y dagre solo se cargan en el navegador y solo en esta página
const MapaModulos = dynamic(() => import("@/components/mapa/MapaModulos"), { ssr: false, loading: Cargando });
const MapaBaseDatos = dynamic(() => import("@/components/mapa/MapaBaseDatos"), { ssr: false, loading: Cargando });

const VISTAS = [
  { id: "modulos", titulo: "Módulos y flujo", icon: Network },
  { id: "db", titulo: "Base de datos", icon: Database },
  { id: "roles", titulo: "Roles y permisos", icon: ShieldCheck },
] as const;
type Vista = (typeof VISTAS)[number]["id"];

export default function MapaSistema() {
  const [vista, setVista] = useState<Vista>("modulos");

  // La pestaña va en el hash (#db) para poder enlazarla
  useEffect(() => {
    const leer = () => {
      const h = window.location.hash.slice(1);
      if (VISTAS.some((v) => v.id === h)) setVista(h as Vista);
    };
    leer();
    window.addEventListener("hashchange", leer);
    return () => window.removeEventListener("hashchange", leer);
  }, []);
  const elegir = (v: Vista) => {
    setVista(v);
    history.replaceState(null, "", `#${v}`);
  };

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader etiqueta="Administración" titulo="Mapa del sistema" descripcion="Cómo funciona el aplicativo: módulos y sus relaciones, la base de datos y los permisos por rol." />

      <div
        role="tablist"
        aria-label="Vistas del mapa"
        className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const i = VISTAS.findIndex((v) => v.id === vista);
          const sig = VISTAS[(i + (e.key === "ArrowRight" ? 1 : VISTAS.length - 1)) % VISTAS.length].id;
          elegir(sig);
          document.getElementById(`tab-${sig}`)?.focus();
        }}
      >
        {VISTAS.map((v) => (
          <button
            key={v.id}
            id={`tab-${v.id}`}
            role="tab"
            type="button"
            aria-selected={vista === v.id}
            aria-controls={`panel-${v.id}`}
            tabIndex={vista === v.id ? 0 : -1}
            onClick={() => elegir(v.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
              vista === v.id ? "bg-sotec text-white" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            <v.icon className={cn("h-4 w-4", vista === v.id ? "text-sotec-green" : "text-slate-400")} />
            {v.titulo}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${vista}`} aria-labelledby={`tab-${vista}`}>
        {vista === "modulos" && <MapaModulos />}
        {vista === "db" && <MapaBaseDatos />}
        {vista === "roles" && <MatrizRoles />}
      </div>

      <footer className="border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-500">
        Los módulos se leen de <code>src/modulos/registro.ts</code> y los permisos de <code>src/nucleo/permisos.ts</code> al cargar la página. El esquema de la base de datos se genera de{" "}
        {ESQUEMA.migraciones.length} migraciones ({ESQUEMA.migraciones[0]} a {ESQUEMA.migraciones[ESQUEMA.migraciones.length - 1]}) con{" "}
        <code className="rounded bg-slate-100 px-1 text-slate-700">{COMANDO_ESQUEMA}</code> (escribe <code>src/components/mapa/esquema.json</code>; córrelo después de agregar una migración).
      </footer>
    </div>
  );
}
