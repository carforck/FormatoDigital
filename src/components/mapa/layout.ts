import dagre from "@dagrejs/dagre";

export interface AristaLayout {
  desde: string;
  hacia: string;
  peso?: number;
  /** Texto de la arista: dagre le reserva espacio entre capas. */
  etiqueta?: string;
}

export interface CajaLayout {
  id: string;
  ancho: number;
  alto: number;
}

/**
 * Distribución automática por capas (dagre). Devuelve la esquina superior
 * izquierda de cada caja, como la espera React Flow.
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
