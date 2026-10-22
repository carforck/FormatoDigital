import { cn } from "@/lib/utils";
import { cop } from "@/nucleo/letras";

/** Barra de ejecución del presupuesto: el texto dice el %, el color solo refuerza. */
export function BarraPresupuesto({ gastado, presupuesto }: { gastado: number; presupuesto?: number }) {
  if (!presupuesto) return <p className="text-xs text-slate-500">Sin presupuesto definido · gastado {cop(gastado)}</p>;
  const pct = gastado / presupuesto;
  return (
    <div>
      <div className="flex flex-wrap justify-between gap-x-2 text-xs text-slate-600">
        <span>
          Gastado <strong className="tabular-nums text-slate-900">{cop(gastado)}</strong> de {cop(presupuesto)}
        </span>
        <span className={cn("font-semibold tabular-nums", pct > 1 ? "text-rose-700" : "text-slate-700")}>
          {Math.round(pct * 100)} %{pct > 1 ? " · excedido" : ""}
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(1, pct) * 100)} aria-label="Ejecución del presupuesto">
        <div className={cn("h-2 rounded-full", pct > 1 ? "bg-rose-500" : pct > 0.8 ? "bg-amber-400" : "bg-sotec-green")} style={{ width: `${Math.min(100, pct * 100)}%` }} />
      </div>
    </div>
  );
}
