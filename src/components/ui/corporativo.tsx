/**
 * Piezas de identidad del aplicativo: avatar con iniciales, encabezado de
 * página y textos de saludo/fecha. Usado por AppShell, PanelUsuariosEmpresa y
 * casi todas las pantallas de `src/app/app/**`.
 */
import { cn } from "@/lib/utils";

/** Iniciales de un nombre (sin título profesional): "Andrés Camacho Ruiz" → "AC". */
export function iniciales(nombre: string): string {
  const partes = nombre.replace(/^(Ing\.|Arq\.|Dr\.|Dra\.)\s+/i, "").split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

const TONOS = ["bg-sotec text-sotec-green", "bg-sotec-soft text-sotec-greenDeep", "bg-slate-200 text-slate-700", "bg-emerald-100 text-emerald-800"];

/** Círculo con iniciales; el tono sale de un hash simple del nombre, así cada persona conserva su color. */
export function Avatar({ nombre, className }: { nombre: string; className?: string }) {
  const tono = TONOS[[...nombre].reduce((a, c) => a + c.charCodeAt(0), 0) % TONOS.length];
  return (
    <span aria-hidden className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold", tono, className)}>
      {iniciales(nombre)}
    </span>
  );
}

/** Encabezado uniforme de cada pantalla del aplicativo. */
export function PageHeader({ titulo, descripcion, etiqueta, acciones }: { titulo: React.ReactNode; descripcion?: React.ReactNode; etiqueta?: string; acciones?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
      <div className="min-w-0">
        {etiqueta && <p className="text-xs font-semibold uppercase tracking-wider text-sotec-greenDeep">{etiqueta}</p>}
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-slate-500">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

/** Saludo según la hora del día. */
export function saludo(): string {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

/** Nombre corto para saludar: "Ing. Daniel Ortega" → "Daniel", "Gerencia SOTEC" → "Gerencia". */
export function nombreCorto(nombre: string): string {
  return nombre.replace(/^(Ing\.|Arq\.|Dr\.|Dra\.)\s+/i, "").split(" ")[0];
}

/** «Miércoles, 21 de octubre de 2026» (mayúscula solo al inicio, como en español). */
export function fechaLarga(): string {
  const t = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
