"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./mapa.css";
import { Diamond, KeyRound, Link2, Lock, Search, Table2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { ESQUEMA, type ColumnaDb, type RelacionDb, type TablaDb } from "./esquema";
import { ItemLeyenda, Linea, MarcoLienzo, SelectorVista, useDistribucion, useOscuro } from "./lienzo";

type NodoTabla = Node<{ tabla: TablaDb; resaltadas: Set<string> | null }, "tabla">;

/** Columnas multiempresa y de usuario: se pueden ocultar para despejar el diagrama. */
const ORG = "organizaciones";
const AUTH = "auth.users";

function IconoColumna({ c }: { c: ColumnaDb }) {
  if (c.pk) return <KeyRound aria-label="Llave primaria" className="h-3 w-3 text-amber-600" />;
  if (c.fk) return <Link2 aria-label="Llave foránea" className="h-3 w-3 text-sotec-greenDeep" />;
  return <span aria-hidden className="h-3 w-3" />;
}

const TablaVista = memo(function TablaVista({ data, selected }: NodeProps<NodoTabla>) {
  const { tabla: t, resaltadas } = data;
  return (
    <div className={cn("w-[264px] overflow-hidden rounded-lg border bg-white text-[11px] shadow-sm", selected ? "border-sotec-green ring-2 ring-sotec-green/40" : "border-slate-300", t.externa && "border-dashed")}>
      <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5", t.externa ? "bg-slate-100" : "bg-sotec")}>
        <Table2 aria-hidden className={cn("h-3.5 w-3.5", t.externa ? "text-slate-500" : "text-sotec-green")} />
        <span className={cn("flex-1 truncate font-mono text-xs font-semibold", t.externa ? "text-slate-700" : "text-white")}>{t.nombre}</span>
        {t.rls && (
          <span title="Row Level Security activo" className="flex items-center gap-0.5 rounded bg-sotec-green/20 px-1 text-[9px] font-semibold text-sotec-green">
            <Lock aria-hidden className="h-2.5 w-2.5" /> RLS
          </span>
        )}
        {t.externa && <span className="rounded bg-white px-1 text-[9px] font-semibold text-slate-500">Supabase</span>}
      </div>
      <ul>
        {t.columnas.map((c) => (
          <li
            key={c.nombre}
            className={cn("relative flex h-[22px] items-center gap-1.5 border-t border-slate-100 px-2.5", resaltadas?.has(`${t.nombre}.${c.nombre}`) && "bg-sotec-soft")}
            title={[c.fk ? `→ ${c.fk.tabla}.${c.fk.columna}${c.fk.alBorrar ? ` (on delete ${c.fk.alBorrar})` : ""}` : "", c.defecto ? `default ${c.defecto}` : ""].filter(Boolean).join(" · ") || undefined}
          >
            <Handle id={`${c.nombre}-s`} type="source" position={Position.Left} isConnectable={false} />
            <IconoColumna c={c} />
            <span className={cn("min-w-0 flex-1 truncate font-mono", c.pk ? "font-semibold text-slate-900" : "text-slate-700")}>{c.nombre}</span>
            <span className="shrink-0 font-mono text-[10px] text-slate-500">{c.tipo}</span>
            <Diamond aria-label={c.nulo ? "Admite nulos" : "Obligatoria (not null)"} className={cn("h-2.5 w-2.5 shrink-0", c.nulo ? "text-slate-400" : "fill-current text-slate-500")} />
            <Handle id={`${c.nombre}-t`} type="target" position={Position.Right} isConnectable={false} />
          </li>
        ))}
      </ul>
    </div>
  );
});

const TIPOS_NODO = { tabla: TablaVista };

interface Filtros {
  org: boolean;
  auth: boolean;
}

function visibles(f: Filtros) {
  const tablas = ESQUEMA.tablas.filter((t) => f.auth || t.nombre !== AUTH);
  const nombres = new Set(tablas.map((t) => t.nombre));
  const relaciones = ESQUEMA.relaciones.filter((r) => nombres.has(r.desde) && nombres.has(r.hacia) && (f.org || r.hacia !== ORG));
  return { tablas, relaciones };
}

function Diagrama({ filtros, buscar, alElegir }: { filtros: Filtros; buscar: string; alElegir: (t: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const oscuro = useOscuro(ref);
  const { fitView } = useReactFlow();
  const { tablas, relaciones } = useMemo(() => visibles(filtros), [filtros]);
  const clave = `${filtros.org}-${filtros.auth}`;
  const [rf, setRf, onNodesChange] = useNodesState<NodoTabla>([]);
  useEffect(() => {
    setRf(tablas.map((t) => ({ id: t.nombre, type: "tabla", position: { x: 0, y: 0 }, data: { tabla: t, resaltadas: null } })));
  }, [tablas, setRf]);
  // Tabla referenciada a la izquierda, tabla con la FK a la derecha. Las FK a organizaciones y
  // auth.users (casi todas las tablas las tienen) no guían las capas: si no, todo quedaría en una columna
  const guia = useMemo(() => relaciones.filter((r) => r.hacia !== ORG && r.hacia !== AUTH).map((r) => ({ desde: r.hacia, hacia: r.desde })), [relaciones]);
  const base = useMemo<Edge[]>(() => [], []);
  const listo = useDistribucion(setRf, base, clave, { direccion: "LR", sepNodos: 28, sepCapas: 110 }, guia);

  const [fija, setFija] = useState<string | null>(null);
  const [encima, setEncima] = useState<string | null>(null);
  const q = buscar.trim().toLowerCase();
  const coincide = useMemo(() => (q ? new Set(tablas.filter((t) => t.nombre.toLowerCase().includes(q)).map((t) => t.nombre)) : null), [q, tablas]);
  const activa = encima ?? fija;
  const relActivas = useMemo(() => (activa ? relaciones.filter((r) => r.desde === activa || r.hacia === activa) : null), [activa, relaciones]);
  const enFoco = useMemo(() => {
    if (relActivas && activa) return new Set([activa, ...relActivas.flatMap((r) => [r.desde, r.hacia])]);
    return coincide;
  }, [relActivas, activa, coincide]);
  const columnas = useMemo(() => (relActivas ? new Set(relActivas.flatMap((r) => [`${r.desde}.${r.columna}`, `${r.hacia}.${r.columnaDestino}`])) : null), [relActivas]);

  // Al buscar una tabla exacta (o única coincidencia) se centra legible; sus relaciones quedan resaltadas
  useEffect(() => {
    if (!listo || !coincide) return;
    const t = coincide.has(q) ? q : coincide.size === 1 ? Array.from(coincide)[0] : null;
    if (!t) return;
    setFija(t);
    alElegir(t);
    fitView({ nodes: [{ id: t }], padding: 0.6, maxZoom: 1, duration: 400 });
  }, [coincide, q, listo, fitView, alElegir]);

  const nodes = useMemo(
    () => rf.map((n) => ({ ...n, selected: n.id === fija, className: enFoco && !enFoco.has(n.id) ? "atenuado" : undefined, data: { ...n.data, resaltadas: columnas } })),
    [rf, fija, enFoco, columnas],
  );
  const edges = useMemo<Edge[]>(
    () =>
      relaciones.map((r) => {
        const on = !!relActivas?.some((x) => x.id === r.id);
        const tenue = (relActivas && !on) || (!relActivas && coincide && !(coincide.has(r.desde) || coincide.has(r.hacia)));
        return {
          id: r.id,
          source: r.desde,
          sourceHandle: `${r.columna}-s`,
          target: r.hacia,
          targetHandle: `${r.columnaDestino}-t`,
          type: "smoothstep",
          animated: on,
          className: tenue ? "atenuada" : undefined,
          zIndex: on ? 2 : 0,
          style: { stroke: on ? "var(--m-rel)" : "var(--m-linea)", strokeWidth: on ? 2 : 1.1, strokeDasharray: r.nulo ? "5 3" : undefined },
          label: on ? r.columna : undefined,
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
        };
      }),
    [relaciones, relActivas, coincide],
  );

  return (
    <div ref={ref}>
      <MarcoLienzo etiqueta="Diagrama entidad-relación de la base de datos">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={TIPOS_NODO}
          onNodesChange={onNodesChange}
          onNodeClick={(_, n) => {
            const sig = fija === n.id ? null : n.id;
            setFija(sig);
            alElegir(sig);
          }}
          onNodeMouseEnter={(_, n) => setEncima(n.id)}
          onNodeMouseLeave={() => setEncima(null)}
          onPaneClick={() => {
            setFija(null);
            alElegir(null);
          }}
          nodesConnectable={false}
          colorMode={oscuro ? "dark" : "light"}
          minZoom={0.08}
          maxZoom={2}
          fitView
          onlyRenderVisibleElements={false}
          proOptions={{ hideAttribution: true }}
          style={{ opacity: listo ? 1 : 0 }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap pannable zoomable position="bottom-right" style={{ width: 150, height: 100 }} nodeStrokeWidth={2} nodeColor={(n) => (n.id === fija ? "#92D050" : (n as NodoTabla).data.tabla.externa ? (oscuro ? "#2B342D" : "#E2E8F0") : oscuro ? "#3A453C" : "#1F1F1F")} ariaLabel="Minimapa de tablas" />
        </ReactFlow>
      </MarcoLienzo>
    </div>
  );
}

function Detalle({ tabla, onCerrar }: { tabla: TablaDb; onCerrar: () => void }) {
  const salen = ESQUEMA.relaciones.filter((r) => r.desde === tabla.nombre);
  const llegan = ESQUEMA.relaciones.filter((r) => r.hacia === tabla.nombre);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sotec-greenDeep">
            Tabla {tabla.esquema}
            {tabla.migracion ? ` · ${tabla.migracion}` : ""}
            {tabla.rls ? " · RLS" : ""}
          </p>
          <p className="font-mono font-semibold text-slate-900">{tabla.nombre}</p>
          {tabla.descripcion && <p className="mt-1 text-xs text-slate-600">{tabla.descripcion}</p>}
        </div>
        <button onClick={onCerrar} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Cerrar detalle">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 grid gap-3 text-xs sm:grid-cols-2">
        <RelacionesTexto titulo={`Referencia a (${salen.length})`} relaciones={salen} sentido="sale" />
        <RelacionesTexto titulo={`La referencian (${llegan.length})`} relaciones={llegan} sentido="llega" />
      </div>
    </div>
  );
}

function RelacionesTexto({ titulo, relaciones, sentido }: { titulo: string; relaciones: RelacionDb[]; sentido: "sale" | "llega" }) {
  return (
    <div>
      <p className="font-medium text-slate-700">{titulo}</p>
      {relaciones.length === 0 ? (
        <p className="text-slate-500">Ninguna.</p>
      ) : (
        <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-slate-600">
          {relaciones.map((r) => (
            <li key={r.id} className="break-words">
              {sentido === "sale" ? `${r.columna} → ${r.hacia}.${r.columnaDestino}` : `${r.desde}.${r.columna} → ${r.columnaDestino}`}
              {r.alBorrar && <span className="text-slate-400"> · on delete {r.alBorrar}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Lista({ buscar }: { buscar: string }) {
  const q = buscar.trim().toLowerCase();
  const tablas = ESQUEMA.tablas.filter((t) => !q || t.nombre.toLowerCase().includes(q));
  return (
    <div className="space-y-4">
      {tablas.length === 0 && <p className="text-sm text-slate-500">Ninguna tabla coincide con «{buscar}».</p>}
      {tablas.map((t) => (
        <section key={t.nombre} aria-labelledby={`tabla-${t.nombre}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-2.5">
            <h3 id={`tabla-${t.nombre}`} className="font-mono text-sm font-semibold text-slate-900">
              {t.nombre}
            </h3>
            <p className="text-xs text-slate-500">
              {[t.externa ? "Tabla de Supabase (no la crea ninguna migración)" : `Creada en ${t.migracion}`, t.rls ? "RLS activo" : "", t.descripcion].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <caption className="sr-only">Columnas de {t.nombre}</caption>
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-1.5 font-medium">Columna</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Tipo</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Llave</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Nulos</th>
                  <th scope="col" className="px-4 py-1.5 font-medium">Referencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {t.columnas.map((c) => (
                  <tr key={c.nombre}>
                    <th scope="row" className="px-4 py-1 font-mono font-medium">{c.nombre}</th>
                    <td className="px-2 py-1 font-mono">{c.tipo}</td>
                    <td className="px-2 py-1">{[c.pk && "PK", c.fk && "FK", c.unico && "Única"].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-2 py-1">{c.nulo ? "Sí" : "No"}</td>
                    <td className="px-4 py-1 font-mono">{c.fk ? `${c.fk.tabla}.${c.fk.columna}${c.fk.alBorrar ? ` (on delete ${c.fk.alBorrar})` : ""}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

export default function MapaBaseDatos() {
  const [lista, setLista] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>({ org: true, auth: true });
  const [buscar, setBuscar] = useState("");
  const [elegida, setElegida] = useState<string | null>(null);
  const tabla = elegida ? ESQUEMA.tablas.find((t) => t.nombre === elegida) : null;
  const propias = ESQUEMA.tablas.filter((t) => !t.externa).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="sr-only">Buscar una tabla</span>
          <Search aria-hidden className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            list="mapa-tablas"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar tabla (p. ej. documentos)"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-sm outline-none focus:border-sotec-greenDeep"
          />
          {buscar && (
            <button onClick={() => setBuscar("")} className="absolute right-1.5 top-1.5 rounded p-1 text-slate-400 hover:text-slate-700" aria-label="Limpiar búsqueda">
              <X className="h-4 w-4" />
            </button>
          )}
          <datalist id="mapa-tablas">
            {ESQUEMA.tablas.map((t) => (
              <option key={t.nombre} value={t.nombre} />
            ))}
          </datalist>
        </label>
        {!lista && (
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={filtros.org} onChange={(e) => setFiltros({ ...filtros, org: e.target.checked })} className="accent-[#3F7A12]" />
              Relaciones con <code className="font-mono">organizaciones</code>
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={filtros.auth} onChange={(e) => setFiltros({ ...filtros, auth: e.target.checked })} className="accent-[#3F7A12]" />
              <code className="font-mono">auth.users</code>
            </label>
          </div>
        )}
        <div className="ml-auto">
          <SelectorVista lista={lista} onCambiar={setLista} etiqueta="la base de datos" />
        </div>
      </div>
      <p className="text-sm text-slate-600">
        {propias} tablas y {ESQUEMA.relaciones.length} llaves foráneas, generadas de {ESQUEMA.migraciones.length} migraciones. Pasa el cursor o toca una tabla para resaltar sus relaciones.
      </p>
      {lista ? (
        <Lista buscar={buscar} />
      ) : (
        <ReactFlowProvider>
          <Diagrama filtros={filtros} buscar={buscar} alElegir={setElegida} />
        </ReactFlowProvider>
      )}
      {!lista && tabla && <Detalle tabla={tabla} onCerrar={() => setElegida(null)} />}
      <ul aria-label="Leyenda" className="mapa-lienzo flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <ItemLeyenda muestra={<KeyRound className="h-3.5 w-3.5 text-amber-600" />} texto="Llave primaria" />
        <ItemLeyenda muestra={<Link2 className="h-3.5 w-3.5 text-sotec-greenDeep" />} texto="Llave foránea" />
        <ItemLeyenda muestra={<Diamond className="h-3 w-3 fill-current text-slate-500" />} texto="Obligatoria (not null)" />
        <ItemLeyenda muestra={<Diamond className="h-3 w-3 text-slate-400" />} texto="Admite nulos" />
        <ItemLeyenda muestra={<Linea color="var(--m-linea, #64748B)" />} texto="FK obligatoria → PK referenciada" />
        <ItemLeyenda muestra={<Linea color="var(--m-linea, #64748B)" trazo="5 3" />} texto="FK opcional" />
        <ItemLeyenda muestra={<span className="rounded bg-sotec px-1 text-[9px] font-semibold text-sotec-green">RLS</span>} texto="Row Level Security activo" />
        <ItemLeyenda muestra={<span className="h-3.5 w-5 rounded border border-dashed border-slate-400 bg-slate-100" />} texto="Tabla de Supabase (auth)" />
      </ul>
    </div>
  );
}
