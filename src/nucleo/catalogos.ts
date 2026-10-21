import type { Estado, Rol, TipoDoc } from "./tipos";

export const FORMATOS: Record<TipoDoc, { codigo: string; nombre: string; version: string; fecha: string; corto: string }> = {
  reporte: { codigo: "FO-GSST-22", nombre: "Formato de reporte técnico", version: "01", fecha: "01/03/2020", corto: "Reporte técnico" },
  permiso: { codigo: "F-GSST-13", nombre: "Permiso de trabajo", version: "01", fecha: "01/03/2019", corto: "Permiso de trabajo" },
};

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
