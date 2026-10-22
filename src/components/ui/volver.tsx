"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { useDemo } from "@/nucleo/datos/DemoProvider";
import { rutaEquipo, rutaProyecto } from "@/nucleo/rutas";

/**
 * Origen de la navegación: `?desde=proyecto:<id>` (o `?proyecto=<id>` en el
 * generador) hace que «Volver» regrese al proyecto; `?desde=equipo:<id>`, a la
 * ficha del equipo; si no, a la lista padre.
 */
export function useOrigen(lista: { href: string; label: string }) {
  const params = useSearchParams();
  const demo = useDemo();
  const desde = params.get("desde") ?? "";
  // Desde la ficha de un equipo (su historial o «Nuevo reporte de este equipo»): se vuelve a la ficha
  if (desde.startsWith("equipo:")) {
    const e = demo.equiposVisibles.find((x) => x.id === desde.slice(7));
    if (e) return { href: rutaEquipo(e.id), label: `Volver al equipo ${e.nombre}`, query: `desde=equipo:${e.id}` };
  }
  const idProyecto = desde.startsWith("proyecto:") ? desde.slice(9) : params.get("proyecto");
  const p = idProyecto ? demo.proyectosVisibles.find((x) => x.id === idProyecto) : undefined;
  if (p) return { href: rutaProyecto(p.id), label: `Volver al proyecto ${p.codigo}`, query: `desde=proyecto:${p.id}` };
  return { href: lista.href, label: `Volver a ${lista.label}`, query: "" };
}

/** Enlace «← Volver a …» de las páginas de detalle, edición y generador. */
export function Volver({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="print:hidden inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
      <ArrowLeft className="h-4 w-4" aria-hidden /> {label}
    </Link>
  );
}
