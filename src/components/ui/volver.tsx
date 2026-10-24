"use client";

/**
 * Navegación de regreso: enlace «← Volver a …», origen por `?desde=` y la
 * marca en sessionStorage que evita duplicar el detalle en el historial al
 * salir de un formulario. Usado por AppShell, el generador y las páginas de
 * documentos, proyectos, equipos y cobros.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { useDemo } from "@/nucleo/datos/DemoProvider";
import { rutaCuenta, rutaDoc, rutaEquipo, rutaProyecto } from "@/nucleo/rutas";

type Router = ReturnType<typeof useRouter>;

/**
 * Origen de la navegación (`?desde=`), para que «Volver» regrese a donde se
 * abrió la página: `proyecto:<id>` (o `?proyecto=<id>` en el generador),
 * `equipo:<id>`, `doc:<id>`, `cuenta:<id>`, `revision` o `tablero`; si no, a
 * la lista padre. Las etiquetas siguen un solo patrón: «Volver a <Lista>» y
 * «Volver al proyecto PRY-…», «Volver al documento RT-…», «Volver a la cuenta CC-…».
 * `query` es el `desde=` que la página debe propagar a sus enlaces hijos.
 */
export function useOrigen(lista: { href: string; label: string }) {
  const params = useSearchParams();
  const demo = useDemo();
  const desde = params.get("desde") ?? "";
  const [clase, id] = [desde.split(":")[0], desde.slice(desde.indexOf(":") + 1)];
  // Desde la ficha de un equipo (su historial o «Nuevo reporte de este equipo»): se vuelve a la ficha
  if (clase === "equipo") {
    const e = demo.equiposVisibles.find((x) => x.id === id);
    if (e) return { href: rutaEquipo(e.id), label: `Volver al equipo ${e.nombre}`, query: `desde=equipo:${e.id}` };
  }
  if (clase === "doc") {
    const d = demo.visibles.find((x) => x.id === id);
    if (d) return { href: rutaDoc(d.id), label: `Volver al documento ${d.codigo}`, query: `desde=doc:${d.id}` };
  }
  if (clase === "cuenta") {
    const c = demo.cuentasVisibles.find((x) => x.id === id);
    if (c) return { href: rutaCuenta(c.id), label: `Volver a la cuenta ${c.codigo}`, query: `desde=cuenta:${c.id}` };
  }
  if (desde === "revision") return { href: "/app/revision", label: "Volver a Revisión", query: "desde=revision" };
  if (desde === "tablero") return { href: "/app", label: "Volver al Tablero", query: "desde=tablero" };
  const idProyecto = clase === "proyecto" ? id : params.get("proyecto");
  const p = idProyecto ? demo.proyectosVisibles.find((x) => x.id === idProyecto) : undefined;
  if (p) return { href: rutaProyecto(p.id), label: `Volver al proyecto ${p.codigo}`, query: `desde=proyecto:${p.id}` };
  return { href: lista.href, label: `Volver a ${lista.label}`, query: "" };
}

// ─────────────── Formulario abierto desde un detalle o una lista
// Detalle → «Editar» → Guardar/Cancelar debe dejar el historial como estaba
// (… → detalle), no apilar otra copia del detalle. Al abrir el formulario se
// marca la página de origen; la marca vale mientras se siga en el formulario
// (AppShell la borra al navegar a otra ruta). Si sigue vigente y el destino
// es esa página, se regresa con «atrás»; si no (URL escrita, otra navegación
// de por medio), se reemplaza la entrada del formulario.
const CLAVE_EDICION = "fd-edicion";
const CLAVE_AVISO = "fd-aviso";

interface Marca {
  /** Página desde la que se abrió el formulario (ruta + query). */
  desde: string;
  /** Ruta del formulario, al llegar a él. */
  en?: string;
}

/** Ruta comparable: la ruta y el `id`, sin avisos ni origen. */
const clave = (url: string) => {
  const u = new URL(url, "http://x");
  return `${u.pathname.replace(/\/$/, "") || "/"}?id=${u.searchParams.get("id") ?? ""}`;
};
const rutaDe = (url: string) => new URL(url, "http://x").pathname.replace(/\/$/, "") || "/";

function leerMarca(): Marca | null {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_EDICION) ?? "null");
  } catch {
    return null;
  }
}
function escribirMarca(m: Marca | null) {
  try {
    if (m) sessionStorage.setItem(CLAVE_EDICION, JSON.stringify(m));
    else sessionStorage.removeItem(CLAVE_EDICION);
  } catch {
    /* sin almacenamiento */
  }
}

/** Se llama al abrir un formulario (editar o crear) desde la página actual. */
export function marcarEdicion() {
  escribirMarca({ desde: location.pathname + location.search });
}

/** AppShell: la marca queda atada al formulario al que se llegó y se borra al salir de él. */
export function useSeguirEdicion(ruta: string) {
  useEffect(() => {
    const m = leerMarca();
    if (!m) return;
    if (!m.en) {
      if (ruta !== rutaDe(m.desde)) escribirMarca({ ...m, en: ruta });
    } else if (m.en !== ruta) escribirMarca(null);
  }, [ruta]);
}

/** Si el formulario actual se abrió desde `destino` (la entrada anterior del historial), regresa con «atrás». */
export function regresarSiViene(router: Router, destino: string): boolean {
  const m = leerMarca();
  escribirMarca(null);
  const ruta = location.pathname.replace(/\/$/, "") || "/";
  if (!m || m.en !== ruta || clave(m.desde) !== clave(destino)) return false;
  router.back();
  return true;
}

/** Sale del formulario hacia el detalle guardado sin duplicar entradas en el historial. */
export function salirAlDetalle(router: Router, destino: string, aviso?: string) {
  if (aviso) {
    try {
      sessionStorage.setItem(CLAVE_AVISO, JSON.stringify({ ruta: clave(destino), aviso }));
    } catch {
      /* sin almacenamiento */
    }
  }
  if (!regresarSiViene(router, destino)) router.replace(destino);
}

/** Aviso que dejó el formulario al regresar con «atrás» (la URL del detalle no lo trae). */
export function useAvisoDeRegreso(): string | null {
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    try {
      const a = JSON.parse(sessionStorage.getItem(CLAVE_AVISO) ?? "null");
      if (a && a.ruta === clave(location.pathname + location.search)) {
        sessionStorage.removeItem(CLAVE_AVISO);
        setAviso(a.aviso);
      }
    } catch {
      /* sin almacenamiento */
    }
  }, []);
  return aviso;
}

/**
 * Enlace «← Volver a …» de las páginas de detalle, edición y generador (siempre
 * arriba a la izquierda). En un formulario abierto desde su detalle, regresa
 * con «atrás» para no duplicar el detalle en el historial.
 */
export function Volver({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (regresarSiViene(router, href)) e.preventDefault();
      }}
      className="print:hidden inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> {label}
    </Link>
  );
}
