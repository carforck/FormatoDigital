"use client";

/**
 * Paginación de las listas del aplicativo (documentos, revisión, proyectos, clientes,
 * equipos, cuentas de cobro, usuarios, auditoría e historiales): `usePaginacion` corta la
 * lista ya filtrada y ordenada, y `<Paginacion>` muestra «Mostrando 1–25 de 134» con
 * anterior/siguiente y los números de página compactos (1 … 4 5 6 … 12). Se reinicia a la
 * página 1 cuando cambia `reinicio` (filtros o búsqueda). Con `param`, la página va en la
 * URL (?pag=3) para que «atrás» desde el detalle vuelva a la misma página.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/** Estado de una lista paginada. */
export interface EstadoPaginacion<T> {
  /** Ítems de la página actual. */
  visibles: T[];
  pagina: number;
  paginas: number;
  total: number;
  /** Posición (desde 1) del primer y del último ítem de la página. */
  desde: number;
  hasta: number;
  porPagina: number;
  irA: (pagina: number) => void;
}

/** Página guardada en la URL (?pag=), leída solo en el navegador. */
function paginaDeUrl(param?: string): number {
  if (!param || typeof window === "undefined") return 1;
  const n = Number(new URLSearchParams(window.location.search).get(param));
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/**
 * Corta `items` en páginas de `porPagina`. `reinicio`: texto con los filtros actuales; al
 * cambiar, vuelve a la página 1. `param`: nombre del parámetro de la URL donde guardar la página.
 */
export function usePaginacion<T>(items: T[], porPagina = 20, reinicio = "", param?: string): EstadoPaginacion<T> {
  const [pagina, setPagina] = useState(1);
  const clave = useRef(reinicio);
  const leida = useRef(false);

  // La página de la URL se lee al montar (no en el render del servidor, para no desajustar la hidratación)
  useEffect(() => {
    if (leida.current) return;
    leida.current = true;
    const p = paginaDeUrl(param);
    if (p > 1) setPagina(p);
  }, [param]);

  // Filtros nuevos: de vuelta a la página 1
  useEffect(() => {
    if (clave.current === reinicio) return;
    clave.current = reinicio;
    setPagina(1);
  }, [reinicio]);

  const total = items.length;
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  // Si la lista se achicó (se aprobó o eliminó un documento), no quedar en una página vacía
  const actual = Math.min(pagina, paginas);

  // La página en la URL sin recargar ni romper el historial (replaceState conserva los demás parámetros)
  useEffect(() => {
    if (!param || typeof window === "undefined" || !leida.current) return;
    const url = new URL(window.location.href);
    if (actual > 1) url.searchParams.set(param, String(actual));
    else url.searchParams.delete(param);
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url.href);
  }, [actual, param]);

  const visibles = useMemo(() => items.slice((actual - 1) * porPagina, actual * porPagina), [items, actual, porPagina]);
  return {
    visibles,
    pagina: actual,
    paginas,
    total,
    desde: total ? (actual - 1) * porPagina + 1 : 0,
    hasta: Math.min(actual * porPagina, total),
    porPagina,
    irA: (n) => setPagina(Math.min(Math.max(1, n), paginas)),
  };
}

/** Números de página a mostrar: siempre la primera y la última, y las vecinas de la actual. */
export function numerosPagina(pagina: number, paginas: number): (number | "…")[] {
  if (paginas <= 7) return Array.from({ length: paginas }, (_, i) => i + 1);
  const r: (number | "…")[] = [1];
  const desde = Math.max(2, pagina - 1);
  const hasta = Math.min(paginas - 1, pagina + 1);
  if (desde > 2) r.push("…");
  for (let i = desde; i <= hasta; i++) r.push(i);
  if (hasta < paginas - 1) r.push("…");
  r.push(paginas);
  return r;
}

/**
 * Controles de la paginación. Sin más de una página no muestra nada (salvo `siempre`, que
 * deja el «Mostrando…»). `nombre`: qué se cuenta («documentos», «proyectos»); `id`: clave
 * de la lista si hay varias en la página (por defecto, el nombre).
 */
export function Paginacion<T>({ p, nombre, id, className, siempre }: { p: EstadoPaginacion<T>; nombre: string; id?: string; className?: string; siempre?: boolean }) {
  const clave = (id ?? nombre).replace(/\s+/g, "-");
  if (p.paginas <= 1 && !siempre) return null;
  const boton = "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
  // Al cambiar de página, la lista vuelve a quedar a la vista desde arriba
  const ir = (n: number) => {
    p.irA(n);
    if (typeof window !== "undefined") document.getElementById(`pag-${clave}`)?.scrollIntoView({ block: "nearest" });
  };
  return (
    <nav id={`pag-${clave}`} aria-label={`Páginas de ${nombre}`} className={cn("flex flex-wrap items-center justify-between gap-2 text-sm", className)} data-paginacion={clave}>
      <p className="text-xs text-slate-500" aria-live="polite">
        Mostrando {p.desde}–{p.hasta} de {p.total} {nombre}
      </p>
      {p.paginas > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => ir(p.pagina - 1)} disabled={p.pagina === 1} aria-label="Página anterior" className={cn(boton, "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Anterior</span>
          </button>
          {/* En celular solo «3 / 12»; en pantallas medianas, los números */}
          <span className="px-1 text-xs tabular-nums text-slate-600 sm:hidden">
            {p.pagina} / {p.paginas}
          </span>
          {numerosPagina(p.pagina, p.paginas).map((n, k) =>
            n === "…" ? (
              <span key={`e${k}`} className="hidden px-1 text-slate-400 sm:inline" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => ir(n)}
                aria-label={`Página ${n}`}
                aria-current={n === p.pagina ? "page" : undefined}
                className={cn(boton, "hidden tabular-nums sm:inline-flex", n === p.pagina ? "border-sotec bg-sotec text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}
              >
                {n}
              </button>
            ),
          )}
          <button type="button" onClick={() => ir(p.pagina + 1)} disabled={p.pagina === p.paginas} aria-label="Página siguiente" className={cn(boton, "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}>
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </nav>
  );
}

/**
 * Lista paginada sin hook en quien la usa (para pantallas con retornos tempranos, como las
 * fichas de proyecto o de equipo): `children` dibuja los ítems de la página actual.
 */
export function ListaPaginada<T>({ items, porPagina = 20, reinicio = "", nombre, className, children }: { items: T[]; porPagina?: number; reinicio?: string; nombre: string; className?: string; children: (visibles: T[]) => ReactNode }) {
  const p = usePaginacion(items, porPagina, reinicio);
  return (
    <>
      {children(p.visibles)}
      <Paginacion p={p} nombre={nombre} className={className} />
    </>
  );
}
