import type { Estado, EstadoProyecto, Rol } from "./tipos";

// El control documental de cada formato (código, versión, nombre) lo aporta su
// módulo: ver `formatoDe(tipo)` en src/modulos/registro.ts.

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  cerrado: "Cerrado",
};

export const COLOR_ESTADO: Record<Estado, string> = {
  borrador: "bg-slate-100 text-slate-700 ring-slate-200",
  en_revision: "bg-amber-50 text-amber-800 ring-amber-200",
  aprobado: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rechazado: "bg-rose-50 text-rose-800 ring-rose-200",
  cerrado: "bg-sky-50 text-sky-800 ring-sky-200",
};

export const ETIQUETA_ROL: Record<Rol, string> = {
  tecnico: "Técnico de campo",
  supervisor: "Coordinador SST",
  admin: "Administrador",
  cliente: "Cliente",
};

export const ETIQUETA_ESTADO_PROYECTO: Record<EstadoProyecto, string> = {
  activo: "Activo",
  en_pausa: "En pausa",
  cerrado: "Cerrado",
};

export const COLOR_ESTADO_PROYECTO: Record<EstadoProyecto, string> = {
  activo: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  en_pausa: "bg-amber-50 text-amber-800 ring-amber-200",
  cerrado: "bg-slate-100 text-slate-700 ring-slate-200",
};
