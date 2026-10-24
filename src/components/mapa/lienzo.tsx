"use client";

/**
 * Piezas compartidas por los dos diagramas del Mapa del sistema (MapaModulos y
 * MapaBaseDatos): tema oscuro, distribución con medida real de nodos, selector
 * Diagrama/Lista, marco del lienzo y elementos de la leyenda.
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import { useNodesInitialized, useReactFlow, type Edge, type Node } from "@xyflow/react";
import { LayoutGrid, List } from "lucide-react";

import { cn } from "@/lib/utils";
import { distribuir, type AristaLayout } from "./layout";

/** El shell pone la clase `dark` en su raíz; se sigue con un observador (el tema cambia sin recargar). */
export function useOscuro(ref: RefObject<HTMLElement>): boolean {
  const [oscuro, setOscuro] = useState(false);
  useEffect(() => {
    const leer = () => setOscuro(!!ref.current?.closest(".dark"));
    leer();
    const obs = new MutationObserver(leer);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"], subtree: true });
    return () => obs.disconnect();
  }, [ref]);
  return oscuro;
}

/**
 * Distribuye los nodos con su tamaño real: primero se pintan (invisibles), React
 * Flow los mide y luego dagre calcula las posiciones. `clave` cambia cuando cambia
 * la estructura (filtros), para volver a distribuir.
 */
export function useDistribucion<N extends Node>(
  setNodes: (f: (n: N[]) => N[]) => void,
  aristas: Edge[],
  clave: string,
  opciones: Parameters<typeof distribuir>[2],
  /** Aristas que guían la distribución (por defecto, las mismas). */
  guia?: AristaLayout[],
) {
  const iniciados = useNodesInitialized();
  const { getNodes, fitView } = useReactFlow<N>();
  const [listo, setListo] = useState(false);
  const hecha = useRef<string | null>(null);
  const opcionesRef = useRef(opciones);
  opcionesRef.current = opciones;

  // Va antes del efecto que distribuye: al cambiar la estructura se oculta hasta medir de nuevo
  useEffect(() => {
    setListo(false);
  }, [clave]);

  useEffect(() => {
    if (!iniciados || hecha.current === clave) return;
    const medidos = getNodes();
    const pos = distribuir(
      medidos.map((n) => ({ id: n.id, ancho: n.measured?.width ?? 260, alto: n.measured?.height ?? 120 })),
      guia ?? aristas.map((a) => ({ desde: a.source, hacia: a.target })),
      opcionesRef.current,
    );
    hecha.current = clave;
    setNodes((ns) => ns.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position })));
    setListo(true);
  }, [iniciados, clave, getNodes, setNodes, aristas, guia]);

  // Encuadre cuando las posiciones nuevas ya están en el lienzo
  useEffect(() => {
    if (!listo) return;
    // En el celular no se encoge hasta lo ilegible: queda legible y se recorre arrastrando
    const angosto = window.matchMedia("(max-width: 640px)").matches;
    const id = requestAnimationFrame(() => fitView({ padding: 0.08, duration: 0, minZoom: angosto ? 0.42 : undefined }));
    return () => cancelAnimationFrame(id);
  }, [listo, fitView]);

  return listo;
}

/** Selector Diagrama / Lista (la lista es la alternativa accesible del diagrama). */
export function SelectorVista({ lista, onCambiar, etiqueta }: { lista: boolean; onCambiar: (lista: boolean) => void; etiqueta: string }) {
  return (
    <div role="group" aria-label={`Ver ${etiqueta} como`} className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
      {[
        { v: false, t: "Diagrama", I: LayoutGrid },
        { v: true, t: "Lista", I: List },
      ].map(({ v, t, I }) => (
        <button
          key={t}
          type="button"
          aria-pressed={lista === v}
          onClick={() => onCambiar(v)}
          className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition", lista === v ? "bg-sotec text-white" : "text-slate-600 hover:bg-slate-100")}
        >
          <I className="h-3.5 w-3.5" /> {t}
        </button>
      ))}
    </div>
  );
}

/** Contenedor del lienzo: llena el ancho; alto según la pantalla. */
export function MarcoLienzo({ children, etiqueta }: { children: React.ReactNode; etiqueta: string }) {
  return (
    <div
      className="mapa-lienzo relative h-[64svh] min-h-[420px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white lg:h-[72vh] lg:min-h-[560px]"
      role="region"
      aria-label={`${etiqueta}. La misma información está en la vista Lista.`}
    >
      {children}
    </div>
  );
}

/** Fila de la leyenda: muestra gráfica (decorativa) + texto. */
export function ItemLeyenda({ muestra, texto }: { muestra: React.ReactNode; texto: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className="flex shrink-0 items-center">
        {muestra}
      </span>
      <span>{texto}</span>
    </li>
  );
}

/** Muestra de línea para la leyenda (sólida, punteada, discontinua). */
export function Linea({ color, trazo }: { color: string; trazo?: string }) {
  return (
    <svg width="30" height="10" viewBox="0 0 30 10">
      <line x1="1" y1="5" x2="24" y2="5" stroke={color} strokeWidth="2" strokeDasharray={trazo} />
      <path d="M23 1.5 L29 5 L23 8.5 Z" fill={color} />
    </svg>
  );
}
