/**
 * Equipos atendidos tal como salen impresos en el formato (reporte técnico).
 */

import { sistemaDe } from "./catalogo";
import type { EquipoAtendido } from "./tipos";

/** Cuántos equipos se nombran en el formato antes de resumir («y 4 más»): así el reporte sigue cabiendo en una hoja. */
const MAX_EN_FORMATO = 14;

/**
 * Línea compacta «Equipos atendidos» del formato impreso, agrupada por sistema:
 * «CCTV: NVR 16 canales, Cámara 3 – Hornos · Cerca eléctrica: Energizador».
 */
export function EquiposEnFormato({ equipos }: { equipos: EquipoAtendido[] }) {
  if (!equipos.length) return null;
  const mostrados = equipos.slice(0, MAX_EN_FORMATO);
  const resto = equipos.length - mostrados.length;
  const grupos: { sistema: string; nombres: string[] }[] = [];
  for (const e of mostrados) {
    const g = grupos.find((x) => x.sistema === e.sistema);
    const nombre = e.serial ? `${e.nombre} (S/N ${e.serial})` : e.nombre;
    if (g) g.nombres.push(nombre);
    else grupos.push({ sistema: e.sistema, nombres: [nombre] });
  }
  return (
    <div className="flex min-w-0 items-start gap-1 break-inside-avoid" data-equipos-atendidos>
      <span className="shrink-0">Equipos atendidos ({equipos.length}):</span>
      <span className="min-w-0 flex-1 border-b border-black leading-tight">
        {grupos.map((g, k) => (
          <span key={g.sistema}>
            {k > 0 && " · "}
            <strong>{sistemaDe(g.sistema).corto}:</strong> {g.nombres.join(", ")}
          </span>
        ))}
        {resto > 0 && ` y ${resto} más`}
      </span>
    </div>
  );
}
