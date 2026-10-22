import { puede } from "@/nucleo/permisos";
import type { Documento, Rol, Usuario } from "@/nucleo/tipos";

import { CLAVES_SISTEMA, esSistema, sistemaDe } from "./catalogo";
import type { Equipo, EquipoAtendido, EquipoMinimo, SistemaEquipo } from "./tipos";

/** Quién registra y edita equipos (igual que la política equipos_escribir de 0010). */
export const puedeEditarEquipos = (rol: Rol) => puede(rol, "equipos");

/** Borrar (solo sin reportes) es de administración y SST; el técnico retira. */
export const puedeEliminarEquipos = (rol: Rol) => rol === "admin" || rol === "supervisor";

/** El equipo interno ve todos los equipos; el cliente, solo los de su empresa (política equipos_ver). */
export function puedeVerEquipo(u: Usuario, e: Equipo): boolean {
  return u.rol === "cliente" ? e.clienteId === u.clienteId : true;
}

/** Texto comparable: sin tildes, minúsculas, sin guiones ni espacios repetidos. */
export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Equipo con el mismo nombre en el mismo cliente y sistema (lo que no se debe duplicar). */
export function equipoRepetido(equipos: Equipo[], e: Pick<Equipo, "clienteId" | "sistema" | "nombre"> & { id?: string }): Equipo | undefined {
  const n = normalizar(e.nombre);
  return equipos.find((x) => x.id !== e.id && x.clienteId === e.clienteId && x.sistema === e.sistema && normalizar(x.nombre) === n);
}

/**
 * Id estable para un equipo nuevo a partir del cliente, el sistema y el nombre:
 * un doble clic o dos pestañas crean el mismo id, así el equipo no se duplica.
 */
export function idEquipo(m: Pick<EquipoMinimo, "clienteId" | "sistema" | "nombre">, ocupados: Set<string> = new Set()): string {
  const base = `${m.clienteId}|${m.sistema}|${normalizar(m.nombre)}`;
  let h = 5381;
  for (let i = 0; i < base.length; i++) h = ((h << 5) + h + base.charCodeAt(i)) >>> 0;
  const id = `eq-${h.toString(36)}`;
  if (!ocupados.has(id)) return id;
  for (let k = 2; ; k++) if (!ocupados.has(`${id}-${k}`)) return `${id}-${k}`;
}

/** Pendientes de un equipo antes de guardarlo (vacío = listo). */
export function faltantesEquipo(e: Pick<Equipo, "clienteId" | "sistema" | "tipo" | "nombre">): string[] {
  const f: string[] = [];
  if (!e.clienteId) f.push("Cliente");
  if (!esSistema(e.sistema)) f.push("Sistema");
  if (!e.tipo.trim()) f.push("Tipo de equipo");
  if (e.nombre.trim().length < 2) f.push("Nombre del equipo");
  return f;
}

/** Equipos marcados como atendidos en un documento (relación documento_equipos). */
export const equiposIdsDe = (d: Documento): string[] => (d as Documento & { equiposIds?: string[] }).equiposIds ?? [];

/** Fecha del servicio: la del formato si la tiene, si no la de creación. */
export const fechaDoc = (d: Documento): string => String((d.datos as unknown as { fecha?: string }).fecha || d.creado).slice(0, 10);

/** Historial de un equipo: los documentos (visibles para el usuario) que lo marcan, del más reciente al más antiguo. */
export function historialEquipo(id: string, documentos: Documento[]): Documento[] {
  return documentos.filter((d) => equiposIdsDe(d).includes(id)).sort((a, b) => fechaDoc(b).localeCompare(fechaDoc(a)) || b.creado.localeCompare(a.creado));
}

/** Cuántos reportes tiene cada equipo y la fecha del último (para listados). */
export function resumenHistorial(documentos: Documento[]): Map<string, { n: number; ultimo: string }> {
  const r = new Map<string, { n: number; ultimo: string }>();
  for (const d of documentos) {
    const f = fechaDoc(d);
    for (const id of equiposIdsDe(d)) {
      const x = r.get(id);
      r.set(id, x ? { n: x.n + 1, ultimo: f > x.ultimo ? f : x.ultimo } : { n: 1, ultimo: f });
    }
  }
  return r;
}

/** Agrupa por sistema en el orden del catálogo (los que no están en el catálogo, al final). */
export function porSistema(equipos: Equipo[]): { sistema: SistemaEquipo; equipos: Equipo[] }[] {
  const orden = [...CLAVES_SISTEMA, ...Array.from(new Set(equipos.map((e) => e.sistema))).filter((s) => !CLAVES_SISTEMA.includes(s))];
  return orden
    .map((s) => ({ sistema: s, equipos: equipos.filter((e) => e.sistema === s).sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true })) }))
    .filter((g) => g.equipos.length > 0);
}

/** Búsqueda libre por nombre, tipo, marca, modelo, serial y ubicación. */
export function coincide(e: Equipo, q: string): boolean {
  const t = normalizar(q);
  if (!t) return true;
  return normalizar(`${e.nombre} ${e.tipo} ${e.marca} ${e.modelo} ${e.serial} ${e.ubicacion} ${sistemaDe(e.sistema).corto}`).includes(t);
}

/** Lo que imprime el formato de los equipos atendidos (en el orden del catálogo de sistemas). */
export function equiposAtendidos(ids: string[], equipos: Equipo[]): EquipoAtendido[] {
  const elegidos = ids.map((id) => equipos.find((e) => e.id === id)).filter((e): e is Equipo => Boolean(e));
  return porSistema(elegidos).flatMap((g) =>
    g.equipos.map((e) => ({ id: e.id, nombre: e.nombre, sistema: e.sistema, tipo: e.tipo, marca: e.marca, modelo: e.modelo, serial: e.serial, ubicacion: e.ubicacion })),
  );
}

/** Equipo nuevo con lo mínimo; el resto se completa en la ficha. */
export function equipoVacio(m: EquipoMinimo, usuarioId: string, fecha: string, id: string): Equipo {
  return {
    id,
    clienteId: m.clienteId,
    proyectoId: m.proyectoId || undefined,
    sistema: m.sistema,
    tipo: m.tipo.trim(),
    nombre: m.nombre.trim().replace(/\s+/g, " "),
    marca: "",
    modelo: "",
    serial: "",
    ubicacion: m.ubicacion?.trim() ?? "",
    estado: "operativo",
    notas: "",
    creadoPor: usuarioId,
    creado: fecha,
    actualizado: fecha,
    historial: [],
  };
}
