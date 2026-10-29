/**
 * Reglas del inventario como funciones puras: el proveedor de datos de la demo
 * las aplica dentro de su actualización de estado (revalidan con el estado más
 * reciente, así un doble clic o dos pestañas no duplican ni pisan nada) y la
 * base de datos aplica las mismas en 0010 (RLS y trigger equipos_coherencia).
 */
import type { Cliente, Documento, Evento, Usuario } from "@/nucleo/tipos";

import { ETIQUETA_ESTADO_EQUIPO } from "./catalogo";
import { equipoRepetido, equipoVacio, equiposIdsDe, faltantesEquipo, idEquipo, puedeEditarEquipos, puedeEliminarEquipos } from "./logica";
import type { Equipo, EquipoMinimo, EstadoEquipo } from "./tipos";

/** Resultado de una regla: la lista nueva (o la misma si no hubo cambio), el equipo afectado y el error. */
export interface Cambio {
  equipos: Equipo[];
  equipo: Equipo | null;
  error: string | null;
  existente?: boolean;
  /** Acción y detalle para la auditoría (si hubo cambio). */
  auditoria?: [string, string];
}

// Quién actúa, el directorio de clientes y la hora del cambio
interface Ctx {
  usuario: Usuario | undefined;
  clientes: Cliente[];
  ahora: string;
}

const sinCambio = (equipos: Equipo[], error: string | null, equipo: Equipo | null = null, existente?: boolean): Cambio => ({ equipos, equipo, error, existente });
const evento = (c: Ctx, accion: string, detalle?: string): Evento => ({ fecha: c.ahora, usuarioId: c.usuario?.id ?? "", accion, detalle });

/** Crea con lo mínimo o devuelve el que ya existe con ese nombre en el cliente y el sistema. */
export function crear(equipos: Equipo[], m: EquipoMinimo, c: Ctx): Cambio {
  if (!c.usuario || !puedeEditarEquipos(c.usuario.rol)) return sinCambio(equipos, "Sin permiso para registrar equipos.");
  const falta = faltantesEquipo(m);
  if (falta.length) return sinCambio(equipos, `Falta: ${falta.join(", ")}.`);
  if (!c.clientes.some((x) => x.id === m.clienteId)) return sinCambio(equipos, "El cliente no está en el directorio.");
  const repetido = equipoRepetido(equipos, m);
  if (repetido) return sinCambio(equipos, null, repetido, true);
  const id = idEquipo(m, new Set(equipos.map((e) => e.id)));
  const nuevo = { ...equipoVacio(m, c.usuario.id, c.ahora, id), historial: [evento(c, "Registró el equipo")] };
  return { equipos: [nuevo, ...equipos], equipo: nuevo, error: null, auditoria: ["Registró equipo", nuevo.nombre] };
}

/** Crea o actualiza desde la ficha. El cliente del equipo no cambia después de creado. */
export function guardar(equipos: Equipo[], e: Equipo, c: Ctx): Cambio {
  if (!c.usuario || !puedeEditarEquipos(c.usuario.rol)) return sinCambio(equipos, "Sin permiso para editar equipos.");
  const existe = equipos.find((x) => x.id === e.id);
  if (!existe) {
    const r = crear(equipos, { clienteId: e.clienteId, proyectoId: e.proyectoId, sistema: e.sistema, tipo: e.tipo, nombre: e.nombre, ubicacion: e.ubicacion }, c);
    if (!r.equipo || r.existente) return r.existente ? { ...r, error: `Ya existe «${r.equipo!.nombre}» en este cliente y sistema.`, equipo: r.equipo } : r;
    const completo: Equipo = { ...r.equipo, marca: e.marca.trim(), modelo: e.modelo.trim(), serial: e.serial.trim(), notas: e.notas.trim(), estado: e.estado };
    return { ...r, equipos: r.equipos.map((x) => (x.id === completo.id ? completo : x)), equipo: completo };
  }
  const falta = faltantesEquipo({ ...e, clienteId: existe.clienteId });
  if (falta.length) return sinCambio(equipos, `Falta: ${falta.join(", ")}.`);
  const repetido = equipoRepetido(equipos, { ...e, clienteId: existe.clienteId });
  if (repetido) return sinCambio(equipos, `Ya existe «${repetido.nombre}» en este cliente y sistema.`);
  const act: Equipo = {
    ...existe,
    proyectoId: e.proyectoId || undefined,
    sistema: e.sistema,
    tipo: e.tipo.trim(),
    nombre: e.nombre.trim().replace(/\s+/g, " "),
    marca: e.marca.trim(),
    modelo: e.modelo.trim(),
    serial: e.serial.trim(),
    ubicacion: e.ubicacion.trim(),
    estado: e.estado,
    notas: e.notas.trim(),
    actualizado: c.ahora,
  };
  const igual = JSON.stringify({ ...act, actualizado: "" }) === JSON.stringify({ ...existe, actualizado: "" });
  if (igual) return sinCambio(equipos, null, existe);
  act.historial = [...existe.historial, evento(c, existe.estado !== act.estado ? `Actualizó la ficha · ${ETIQUETA_ESTADO_EQUIPO[act.estado]}` : "Actualizó la ficha")];
  return { equipos: equipos.map((x) => (x.id === e.id ? act : x)), equipo: act, error: null, auditoria: ["Actualizó equipo", act.nombre] };
}

/** Fuera de servicio, retirar o reactivar: el equipo y su historial se conservan. */
export function cambiarEstado(equipos: Equipo[], id: string, estado: EstadoEquipo, c: Ctx): Cambio {
  if (!c.usuario || !puedeEditarEquipos(c.usuario.rol)) return sinCambio(equipos, "Sin permiso para cambiar el estado de equipos.");
  const e = equipos.find((x) => x.id === id);
  if (!e) return sinCambio(equipos, "El equipo ya no existe.");
  if (!(estado in ETIQUETA_ESTADO_EQUIPO)) return sinCambio(equipos, "Estado no válido.");
  if (e.estado === estado) return sinCambio(equipos, null, e); // doble clic: no repite el evento
  const accion = estado === "retirado" ? "Retiró el equipo" : e.estado === "retirado" ? "Reactivó el equipo" : `Cambió el estado a ${ETIQUETA_ESTADO_EQUIPO[estado].toLowerCase()}`;
  const act: Equipo = { ...e, estado, actualizado: c.ahora, historial: [...e.historial, evento(c, accion)] };
  return { equipos: equipos.map((x) => (x.id === id ? act : x)), equipo: act, error: null, auditoria: [accion, e.nombre] };
}

/** Borra solo si ningún documento lo marca (si tiene historial, se retira). Administración y SST. */
export function eliminar(equipos: Equipo[], id: string, documentos: Documento[], c: Ctx): Cambio {
  if (!c.usuario || !puedeEliminarEquipos(c.usuario.rol)) return sinCambio(equipos, "Solo administración y SST eliminan equipos; puedes retirarlo.");
  const e = equipos.find((x) => x.id === id);
  if (!e) return sinCambio(equipos, null); // ya se eliminó (doble clic)
  const n = documentos.filter((d) => equiposIdsDe(d).includes(id)).length;
  if (n > 0) return sinCambio(equipos, `«${e.nombre}» tiene ${n} reporte(s) en su historial: no se elimina, retíralo para conservarlo.`, e);
  return { equipos: equipos.filter((x) => x.id !== id), equipo: null, error: null, auditoria: ["Eliminó equipo", e.nombre] };
}
