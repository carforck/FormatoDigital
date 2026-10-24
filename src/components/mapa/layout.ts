/**
 * Distribución automática de los diagramas del Mapa del sistema con dagre.
 * Independiente de React Flow: recibe cajas medidas y aristas guía; lo usa
 * `useDistribucion` (lienzo.tsx).
 */
import dagre from "@dagrejs/dagre";

/** Arista que guía las capas; `peso` alto la mantiene más corta y recta. */
export interface AristaLayout {
  desde: string;
  hacia: string;
  peso?: number;
  /** Texto de la arista: dagre le reserva espacio entre capas. */
  etiqueta?: string;
}

/** Nodo a ubicar con su tamaño real en píxeles. */
export interface CajaLayout {
  id: string;
  ancho: number;
  alto: number;
}

/**
 * Distribución automática por capas (dagre). Devuelve la esquina superior
 * izquierda de cada caja, como la espera React Flow. Ignora aristas con
 * extremos desconocidos o en bucle; es multigrafo para admitir aristas paralelas.
 */
export function distribuir(
  cajas: CajaLayout[],
  aristas: AristaLayout[],
  opciones: { direccion?: "TB" | "LR"; sepNodos?: number; sepCapas?: number } = {},
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({ rankdir: opciones.direccion ?? "TB", nodesep: opciones.sepNodos ?? 40, ranksep: opciones.sepCapas ?? 80, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const c of cajas) g.setNode(c.id, { width: c.ancho, height: c.alto });
  aristas.forEach((a, i) => {
    if (g.hasNode(a.desde) && g.hasNode(a.hacia) && a.desde !== a.hacia) g.setEdge(a.desde, a.hacia, { weight: a.peso ?? 1, width: a.etiqueta ? a.etiqueta.length * 5.6 + 12 : 0, height: a.etiqueta ? 18 : 0, labelpos: "c" }, String(i));
  });
  dagre.layout(g);
  const pos = new Map<string, { x: number; y: number }>();
  for (const c of cajas) {
    const n = g.node(c.id);
    pos.set(c.id, { x: n.x - c.ancho / 2, y: n.y - c.alto / 2 });
  }
  return pos;
}
