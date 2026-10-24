"use client";

/**
 * Pestaña «Módulos y flujo» del Mapa del sistema (src/app/app/mapa/page.tsx,
 * cargada con dynamic sin SSR). Dibuja con React Flow el grafo que arma
 * `armarGrafoModulos` desde MODULOS; al pasar o tocar un nodo resalta sus vecinos.
 * La vista Lista muestra la misma información de forma accesible.
 */
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./mapa.css";
import { ArrowRight, Boxes, Building2, FileText, Layers, Network, RotateCcw, Workflow, X } from "lucide-react";

import { DOCUMENTOS, MODULOS } from "@/modulos/registro";
import { cn } from "@/lib/utils";
import { ItemLeyenda, Linea, MarcoLienzo, SelectorVista, useDistribucion, useOscuro } from "./lienzo";
import { armarGrafoModulos, ETIQUETA_ESTADO_MODULO, type AristaModulo, type NodoModulo, type TipoNodo } from "./modelo-modulos";

type NodoRF = Node<{ nodo: NodoModulo }, "modulo">;

const ICONO: Record<TipoNodo, typeof FileText> = { plataforma: Layers, entidad: Building2, eje: Workflow, documento: FileText };
const TIPO: Record<TipoNodo, string> = { plataforma: "Plataforma", entidad: "Entidad", eje: "Eje de trabajo", documento: "Documento" };

/** Flujo de estados de un nodo: camino principal con flechas y ramas (rechazo, anulación) aparte. */
function Flujo({ nodo, compacto }: { nodo: NodoModulo; compacto?: boolean }) {
  const principal = nodo.flujo.filter((p) => !p.rama);
  const ramas = nodo.flujo.filter((p) => p.rama);
  if (!nodo.flujo.length) return null;
  return (
    <div className={cn("mt-2.5 border-t border-slate-100 pt-2", compacto && "mt-1.5 pt-1.5")}>
      <p className="sr-only">Flujo de estados:</p>
      <ol className="flex flex-wrap items-center gap-x-0.5 gap-y-1 text-[10px] font-medium">
        {principal.map((p, i) => (
          <li key={p.estado} className="flex items-center gap-0.5">
            {i > 0 && <ArrowRight aria-hidden className="h-2.5 w-2.5 text-slate-400" />}
            <span className={cn("rounded px-1.5 py-0.5 ring-1", i === principal.length - 1 ? "bg-sky-50 text-sky-800 ring-sky-200" : i === 0 ? "bg-slate-100 text-slate-700 ring-slate-200" : i === 1 ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200")}>
              {p.etiqueta}
            </span>
          </li>
        ))}
      </ol>
      {ramas.length > 0 && (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
          <RotateCcw aria-hidden className="h-2.5 w-2.5" />
          <span>o</span>
          {ramas.map((p) => (
            <span key={p.estado} className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-800 ring-1 ring-rose-200">
              {p.etiqueta}
            </span>
          ))}
        </p>
      )}
      {nodo.notaFlujo && !compacto && <p className="mt-1 text-[10px] leading-snug text-slate-500">{nodo.notaFlujo}</p>}
    </div>
  );
}

/** Tarjeta del nodo en el lienzo; los no activos van punteados con su estado. */
const NodoModuloVista = memo(function NodoModuloVista({ data, selected }: NodeProps<NodoRF>) {
  const n = data.nodo;
  const Icono = ICONO[n.tipo];
  const planeado = n.estado !== "activo";
  const plataforma = n.tipo === "plataforma";
  return (
    <div
      className={cn(
        "w-[248px] rounded-xl border-2 px-3 py-2.5 text-left shadow-sm transition",
        plataforma ? "border-sotec bg-sotec text-white" : "bg-white",
        !plataforma && !planeado && (n.tipo === "documento" ? "border-sotec-green" : "border-slate-300"),
        planeado && "border-dashed border-slate-300 bg-slate-50 opacity-90",
        selected && "ring-2 ring-sotec-green ring-offset-2",
      )}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <div className="flex items-start gap-2">
        <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", plataforma ? "bg-white/10 text-sotec-green" : planeado ? "bg-slate-200 text-slate-500" : "bg-sotec text-sotec-green")}>
          <Icono className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("flex flex-wrap items-center gap-1 text-[10px] font-semibold uppercase tracking-wider", plataforma ? "text-white/60" : "text-slate-500")}>
            {n.tipoTexto ?? TIPO[n.tipo]}
            {n.formato && <span className={cn("rounded px-1 font-mono normal-case tracking-normal", plataforma ? "bg-white/10" : "bg-sotec-soft text-sotec-greenDeep")}>{n.formato}</span>}
          </p>
          <p className={cn("text-sm font-semibold leading-tight", plataforma ? "text-white" : planeado ? "text-slate-600" : "text-slate-900")}>{n.titulo}</p>
          {n.subtitulo && <p className={cn("text-[11px] leading-snug", plataforma ? "text-white/60" : "text-slate-500")}>{n.subtitulo}</p>}
        </div>
        {planeado && <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">{ETIQUETA_ESTADO_MODULO[n.estado]}</span>}
      </div>
      {plataforma && n.notaFlujo && <p className="mt-2 text-[10px] text-white/60">{n.notaFlujo}</p>}
      <Flujo nodo={n} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
});

const TIPOS_NODO = { modulo: NodoModuloVista };

/**
 * Convierte las aristas del modelo a React Flow. Con `foco`, solo quedan nítidas
 * (y animadas) las que unen nodos del foco; el resto se atenúa por CSS.
 */
function aristasRF(aristas: AristaModulo[], foco: Set<string> | null): Edge[] {
  return aristas.map((a) => {
    const color = a.tipo === "firma" ? "var(--m-firma)" : a.tipo === "relacion" ? "var(--m-rel)" : "var(--m-linea)";
    const marca = { type: MarkerType.ArrowClosed, color, width: 16, height: 16 };
    const activa = !foco || (foco.has(a.desde) && foco.has(a.hacia));
    return {
      id: a.id,
      source: a.desde,
      target: a.hacia,
      type: a.tipo === "jerarquia" ? "smoothstep" : "default",
      label: a.etiqueta,
      labelBgPadding: [5, 3] as [number, number],
      labelBgBorderRadius: 4,
      // Jerarquía: la flecha apunta al contenedor («Reportes pertenece a Órdenes»)
      ...(a.tipo === "jerarquia" ? { markerStart: marca } : { markerEnd: marca }),
      className: activa ? undefined : "atenuada",
      animated: !!foco && activa && a.tipo !== "jerarquia",
      style: { stroke: color, strokeWidth: a.tipo === "jerarquia" ? 1.5 : 1.75, strokeDasharray: a.planeada ? "6 4" : a.tipo === "firma" ? "2 4" : undefined },
      zIndex: a.tipo === "jerarquia" ? 0 : 1,
    } satisfies Edge;
  });
}

/** El nodo y los que tocan alguna de sus aristas. */
function vecinos(id: string, aristas: AristaModulo[]): Set<string> {
  const s = new Set([id]);
  for (const a of aristas) {
    if (a.desde === id) s.add(a.hacia);
    if (a.hacia === id) s.add(a.desde);
  }
  return s;
}

/** Lienzo interactivo: hover enfoca temporalmente, clic fija el nodo y abre su panel de detalle. */
function Diagrama({ nodos, aristas }: { nodos: NodoModulo[]; aristas: AristaModulo[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const oscuro = useOscuro(ref);
  const clave = nodos.map((n) => `${n.id}:${n.estado}`).join(",");
  const [rf, setRf, onNodesChange] = useNodesState<NodoRF>([]);
  useEffect(() => {
    setRf(nodos.map((n) => ({ id: n.id, type: "modulo", position: { x: 0, y: 0 }, data: { nodo: n } })));
  }, [nodos, setRf]);
  // Capas: el árbol más las relaciones entre documentos (reporte → cuenta de cobro baja una capa);
  // las relaciones con contenedores (proyectos, órdenes) no guían, para no estirar el árbol
  const guia = useMemo(() => {
    const docs = new Set(nodos.filter((n) => n.tipo === "documento").map((n) => n.id));
    return aristas
      .filter((a) => a.tipo === "jerarquia" || (a.tipo === "relacion" && docs.has(a.desde) && docs.has(a.hacia)))
      .map((a) => ({ desde: a.desde, hacia: a.hacia, peso: a.tipo === "jerarquia" ? 3 : 1, etiqueta: a.etiqueta }));
  }, [aristas, nodos]);
  const edgesBase = useMemo(() => aristasRF(aristas, null), [aristas]);
  const listo = useDistribucion(setRf, edgesBase, clave, { direccion: "TB", sepNodos: 40, sepCapas: 70 }, guia);

  const [fijo, setFijo] = useState<string | null>(null);
  const [encima, setEncima] = useState<string | null>(null);
  const activo = encima ?? fijo;
  const foco = useMemo(() => (activo ? vecinos(activo, aristas) : null), [activo, aristas]);
  const edges = useMemo(() => aristasRF(aristas, foco), [aristas, foco]);
  const nodes = useMemo(() => rf.map((n) => ({ ...n, className: foco && !foco.has(n.id) ? "atenuado" : undefined, selected: n.id === fijo })), [rf, foco, fijo]);
  const detalle = fijo ? nodos.find((n) => n.id === fijo) : null;

  return (
    <div ref={ref}>
      <MarcoLienzo etiqueta="Diagrama de módulos y flujo">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={TIPOS_NODO}
          onNodesChange={onNodesChange}
          onNodeClick={(_, n) => setFijo((f) => (f === n.id ? null : n.id))}
          onNodeMouseEnter={(_, n) => setEncima(n.id)}
          onNodeMouseLeave={() => setEncima(null)}
          onPaneClick={() => setFijo(null)}
          nodesConnectable={false}
          elementsSelectable
          colorMode={oscuro ? "dark" : "light"}
          minZoom={0.15}
          maxZoom={1.75}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ opacity: listo ? 1 : 0 }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap pannable zoomable position="bottom-right" style={{ width: 150, height: 100 }} nodeStrokeWidth={2} nodeColor={(n) => ((n as NodoRF).data.nodo.estado !== "activo" ? (oscuro ? "#2B342D" : "#E2E8F0") : (n as NodoRF).data.nodo.tipo === "plataforma" ? "#1F1F1F" : "#92D050")} ariaLabel="Minimapa de módulos" />
          {detalle && (
            <Panel position="top-right" className="!m-2 w-[min(300px,calc(100%-1rem))] rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-sotec-greenDeep">
                    {detalle.tipoTexto ?? TIPO[detalle.tipo]} · {ETIQUETA_ESTADO_MODULO[detalle.estado]}
                  </p>
                  <p className="font-semibold text-slate-900">{detalle.titulo}</p>
                </div>
                <button onClick={() => setFijo(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Cerrar detalle">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{detalle.descripcion}</p>
              <Relaciones id={detalle.id} nodos={nodos} aristas={aristas} />
            </Panel>
          )}
        </ReactFlow>
      </MarcoLienzo>
    </div>
  );
}

/** Arista como frase [sujeto, verbo, objeto] para leerla en texto. */
function frase(a: AristaModulo, nodos: NodoModulo[]) {
  const t = (id: string) => nodos.find((n) => n.id === id)?.titulo ?? id;
  // Jerarquía: se lee del hijo al contenedor
  return a.tipo === "jerarquia" ? [t(a.hacia), a.etiqueta, t(a.desde)] : [t(a.desde), a.etiqueta, t(a.hacia)];
}

/** Relaciones de un nodo en texto (panel de detalle y vista Lista). */
function Relaciones({ id, nodos, aristas }: { id: string; nodos: NodoModulo[]; aristas: AristaModulo[] }) {
  const propias = aristas.filter((a) => a.desde === id || a.hacia === id);
  if (!propias.length) return null;
  return (
    <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">
      {propias.map((a) => {
        const [x, verbo, y] = frase(a, nodos);
        return (
          <li key={a.id}>
            <strong className="font-medium text-slate-800">{x}</strong> <span className={cn(a.tipo === "relacion" ? "text-sotec-greenDeep" : a.tipo === "firma" ? "text-amber-700" : "")}>{verbo}</span> <strong className="font-medium text-slate-800">{y}</strong>
            {a.planeada && <span className="text-slate-400"> (planeado)</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** Vista Lista: alternativa accesible del diagrama con la misma información. */
function Lista({ nodos, aristas }: { nodos: NodoModulo[]; aristas: AristaModulo[] }) {
  return (
    <ul id="lista-modulos" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {nodos.map((n) => (
        <li key={n.id} className={cn("rounded-xl border bg-white p-4", n.estado === "activo" ? "border-slate-200" : "border-dashed border-slate-300")}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {n.tipoTexto ?? TIPO[n.tipo]}
            {n.formato ? ` · ${n.formato}` : ""} · <span className={n.estado === "activo" ? "text-sotec-greenDeep" : "text-amber-700"}>{ETIQUETA_ESTADO_MODULO[n.estado]}</span>
          </p>
          <h3 className="font-semibold text-slate-900">{n.titulo}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{n.descripcion}</p>
          {n.flujo.length > 0 && (
            <p className="mt-2 text-xs text-slate-700">
              <span className="font-medium">Estados: </span>
              {n.flujo.filter((p) => !p.rama).map((p) => p.etiqueta).join(" → ")}
              {n.flujo.some((p) => p.rama) && ` / ${n.flujo.filter((p) => p.rama).map((p) => p.etiqueta).join(", ")}`}
            </p>
          )}
          {n.notaFlujo && <p className="mt-1 text-xs text-slate-500">{n.notaFlujo}</p>}
          <Relaciones id={n.id} nodos={nodos} aristas={aristas} />
        </li>
      ))}
    </ul>
  );
}

/** Pestaña completa: resumen, selector de vista, diagrama o lista y leyenda. */
export default function MapaModulos() {
  const [lista, setLista] = useState(false);
  // Se lee el registro en cada carga: un módulo nuevo en MODULOS aparece solo
  const grafo = useMemo(() => armarGrafoModulos(MODULOS, Object.values(DOCUMENTOS as Record<string, { clave: string }>).map((d) => d.clave)), []);
  const activos = grafo.nodos.filter((n) => n.estado === "activo").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          <Network aria-hidden className="mr-1 inline h-4 w-4 text-sotec-greenDeep" />
          {grafo.nodos.length} nodos ({activos} activos) y {grafo.aristas.length} relaciones, leídos de <code className="rounded bg-slate-100 px-1 text-xs">MODULOS</code>. Toca un nodo para ver sus relaciones.
        </p>
        <SelectorVista lista={lista} onCambiar={setLista} etiqueta="módulos" />
      </div>
      {lista ? (
        <Lista nodos={grafo.nodos} aristas={grafo.aristas} />
      ) : (
        <ReactFlowProvider>
          <Diagrama nodos={grafo.nodos} aristas={grafo.aristas} />
        </ReactFlowProvider>
      )}
      <ul aria-label="Leyenda" className="mapa-lienzo flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <ItemLeyenda muestra={<span className="h-3.5 w-5 rounded border-2 border-sotec bg-sotec" />} texto="Plataforma (núcleo)" />
        <ItemLeyenda muestra={<span className="h-3.5 w-5 rounded border-2 border-slate-300 bg-white" />} texto="Entidad o eje de trabajo" />
        <ItemLeyenda muestra={<span className="h-3.5 w-5 rounded border-2 border-sotec-green bg-white" />} texto="Documento activo" />
        <ItemLeyenda muestra={<span className="h-3.5 w-5 rounded border-2 border-dashed border-slate-300 bg-slate-50" />} texto="En construcción o planeado: aún no funciona" />
        <ItemLeyenda muestra={<Linea color="var(--m-linea, #64748B)" />} texto="Pertenece a (la flecha apunta al contenedor)" />
        <ItemLeyenda muestra={<Linea color="var(--m-rel, #3F7A12)" />} texto="Relación entre módulos" />
        <ItemLeyenda muestra={<Linea color="var(--m-firma, #B45309)" trazo="2 3" />} texto="Firma o aprobación del cliente" />
        <ItemLeyenda muestra={<Linea color="#94A3B8" trazo="6 4" />} texto="Relación planeada" />
        <ItemLeyenda muestra={<Boxes className="h-4 w-4 text-slate-500" />} texto="Cada documento muestra su flujo de estados" />
      </ul>
    </div>
  );
}
