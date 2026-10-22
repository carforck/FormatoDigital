import { createElement, type ComponentType } from "react";

import type { EmpresaPlantilla, FlujoDocumento, InfoFormato, ModuloDocumento, PropsPlantilla } from "./contrato";
import { moduloCotizaciones } from "./cotizaciones";
import { moduloGastos } from "./gastos";
import { moduloPermisos } from "./permisos";
import { moduloReportes } from "./reportes";
import { ETIQUETA_ESTADO } from "@/nucleo/catalogos";
import type { Accion } from "@/nucleo/permisos";
import type { Cliente, Config, DatosDe, Documento, Estado, Proyecto, TipoDoc } from "@/nucleo/tipos";

/**
 * Registro central de módulos de la plataforma.
 *
 * Cada empresa (organización) habilita los módulos que contrata; todos
 * comparten el NÚCLEO y se unen a través del PROYECTO y la ORDEN DE SERVICIO.
 * Ver docs/ARQUITECTURA.md.
 */
export type EstadoModulo = "activo" | "en_construccion" | "planeado";

export interface InfoModulo {
  clave: string;
  nombre: string;
  descripcion: string;
  estado: EstadoModulo;
  /** Código del formato que digitaliza, si aplica. */
  formato?: string;
  /** Con qué otros módulos se relaciona. */
  relaciona: string[];
  /** Permiso que exige al personal interno (lo comercial: solo la administración). */
  requiere?: Accion;
}

export const MODULOS: InfoModulo[] = [
  { clave: "nucleo", nombre: "Núcleo", descripcion: "Usuarios y roles, clientes y sitios, firmas (en sitio y por enlace), archivos, envío por correo y WhatsApp, PDF, consecutivos y auditoría.", estado: "activo", relaciona: ["todos"] },
  { clave: "proyectos", nombre: "Proyectos", descripcion: "Cada obra o proyecto de un cliente reúne sus reportes, permisos, gastos, cotizaciones y cuentas de cobro, con presupuesto contra lo gastado y lo cobrado.", estado: "activo", relaciona: ["reportes", "permisos", "gastos", "cotizaciones", "cobros"] },
  { clave: "ordenes", nombre: "Órdenes de servicio", descripcion: "Eje de cada trabajo: une permisos, reportes, fotos, gastos y cuentas de cobro.", estado: "en_construccion", relaciona: ["proyectos", "permisos", "reportes", "gastos", "cobros"] },
  { clave: "permisos", nombre: "Permisos de trabajo", descripcion: "Peligros, medidas, EPP, verificación y grupo ejecutor con firmas.", estado: "activo", formato: "F-GSST-13", relaciona: ["proyectos", "ordenes"] },
  { clave: "reportes", nombre: "Reportes técnicos", descripcion: "Diagnóstico, acción y resultado; registro fotográfico como hoja anexa; firma del técnico y del cliente en sitio o por enlace.", estado: "activo", formato: "FO-GSST-22", relaciona: ["proyectos", "ordenes", "cobros"] },
  { clave: "gastos", nombre: "Legalización de gastos", descripcion: "Transporte, alimentación, hospedaje y materiales con la foto de cada factura, Vo.Bo. de administración y reembolso.", estado: "activo", formato: "FO-GSST-25", relaciona: ["proyectos", "ordenes", "cobros"] },
  { clave: "cotizaciones", nombre: "Cotizaciones", descripcion: "Propuesta económica al cliente por proyecto: la administración la aprueba y la envía al portal, y el cliente la acepta con su firma. Solo la administración (comercial).", estado: "activo", relaciona: ["proyectos", "cobros"], requiere: "cotizar" },
  { clave: "cobros", nombre: "Cuentas de cobro", descripcion: "SOTEC le cobra a su cliente por el servicio, con ítems tomados de los reportes técnicos, IVA y valor en letras. Solo la administración (comercial).", estado: "activo", relaciona: ["proyectos", "ordenes", "reportes"], requiere: "cobros" },
  { clave: "requerimientos", nombre: "Requerimiento de materiales", descripcion: "Solicitud de materiales para un proyecto, con aprobación y entrega; interno, el cliente no lo ve.", estado: "planeado", relaciona: ["proyectos", "gastos"] },
  {
    clave: "equipos",
    nombre: "Equipos",
    descripcion: "Inventario simple de cada cliente por sistema (CCTV, alarmas, control de acceso, incendio, cómputo y redes, cerca eléctrica). El técnico marca en el reporte los equipos atendidos o crea uno nuevo; la ficha de cada equipo muestra su historial de reportes, también en el portal del cliente.",
    estado: "activo",
    relaciona: ["proyectos", "reportes"],
  },
];

/** Módulos de documentos diligenciables disponibles en el generador. */
export const DOCUMENTOS: { [T in TipoDoc]: ModuloDocumento<DatosDe<T>> } = {
  reporte: moduloReportes,
  permiso: moduloPermisos,
  gasto: moduloGastos,
  cotizacion: moduloCotizaciones,
};

/** Orden en el menú, el tablero, los filtros y los proyectos. */
export const TIPOS_DOC: TipoDoc[] = ["reporte", "permiso", "gasto", "cotizacion"];

// Paleta de series (globals.css), en el orden de TIPOS_DOC
const PALETA = ["var(--serie-a)", "var(--serie-b)", "var(--serie-c)", "var(--serie-d)", "var(--serie-e)"];

/** Lo que el resto de la aplicación lee de un módulo, con los valores por defecto ya puestos. */
export interface InfoDoc {
  clave: TipoDoc;
  formato: InfoFormato;
  prefijo: string;
  Plantilla: ComponentType<PropsPlantilla<unknown>>;
  clienteDe: (datos: unknown) => string;
  campoCliente: string;
  alElegirProyecto?: (p: Proyecto, c: Cliente | undefined) => { cambio: Record<string, unknown>; mensaje?: string };
  visibleCliente: boolean;
  /** Permiso que exige el módulo al personal interno (ver `puedeUsarTipo`). */
  requiere?: Accion;
  color: string;
  flujo: FlujoDocumento<Record<string, unknown>>;
  etiquetasEstado: Record<Estado, string>;
  duplicar: (datos: unknown, hoy: string) => unknown;
  valor?: (datos: unknown) => number;
  aplicarFirma: (campo: string, imagen: string, datos: unknown) => Record<string, unknown>;
  /** Si el formato registra equipos atendidos y después de qué paso del asistente se preguntan. */
  equipos?: { despuesDe: string };
}

function SinPlantilla() {
  return createElement(
    "p",
    { className: "mx-auto max-w-[816px] rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500" },
    "Vista previa del formato no disponible todavía.",
  );
}

const cache = new Map<TipoDoc, InfoDoc>();

/** Información completa de un tipo de documento (módulo + valores por defecto). */
export function infoDoc(tipo: TipoDoc): InfoDoc {
  const hit = cache.get(tipo);
  if (hit) return hit;
  const m = DOCUMENTOS[tipo] as unknown as ModuloDocumento<Record<string, unknown>>;
  const nombre = tipo.charAt(0).toUpperCase() + tipo.slice(1);
  const info: InfoDoc = {
    clave: tipo,
    formato: m.formato ?? { codigo: tipo.toUpperCase(), nombre, version: "01", fecha: "", corto: nombre, el: "el", nuevo: "Nuevo", plural: `${tipo}s` },
    prefijo: m.prefijo ?? tipo.slice(0, 2).toUpperCase(),
    Plantilla: (m.Plantilla ?? SinPlantilla) as ComponentType<PropsPlantilla<unknown>>,
    clienteDe: (d) => (m.clienteDe ? m.clienteDe(d as Record<string, unknown>) : String((d as Record<string, unknown>)?.cliente ?? "")),
    campoCliente: m.campoCliente ?? "cliente",
    alElegirProyecto: m.alElegirProyecto as InfoDoc["alElegirProyecto"],
    visibleCliente: m.visibleCliente ?? false,
    requiere: m.requiere,
    color: m.color ?? PALETA[Math.max(0, TIPOS_DOC.indexOf(tipo)) % PALETA.length],
    flujo: m.flujo ?? { aprobar: "Aprobar", firmaAlAprobar: false, cierre: "revisor", cerrar: "Cerrar", eventoCierre: "Cerró el documento" },
    etiquetasEstado: { ...ETIQUETA_ESTADO, ...m.etiquetasEstado },
    duplicar: (d, hoy) => (m.duplicar ? m.duplicar(d as Record<string, unknown>, hoy) : d),
    valor: m.valor as InfoDoc["valor"],
    aplicarFirma: (campo, imagen, d) => (m.aplicarFirma ? m.aplicarFirma(campo, imagen, d as Record<string, unknown>) : { [campo]: imagen }),
    equipos: m.equipos,
  };
  cache.set(tipo, info);
  return info;
}

/** Control documental del formato (código, nombre, versión, nombre corto). */
export const formatoDe = (tipo: TipoDoc) => infoDoc(tipo).formato;

/** «1 cotización», «3 reportes»: cantidad con la concordancia del formato. */
export const cantidadDoc = (tipo: TipoDoc, n: number) => `${n} ${n === 1 ? formatoDe(tipo).corto.toLowerCase() : formatoDe(tipo).plural}`;

/** Cliente u obra al que pertenece un documento (cada formato lo nombra distinto). */
export function clienteDoc(d: Documento): string {
  return infoDoc(d.tipo).clienteDe(d.datos);
}

/** Texto principal de un documento para listados, según su módulo. */
export function tituloDoc(d: Documento): string {
  return (DOCUMENTOS[d.tipo] as unknown as ModuloDocumento<unknown>).titulo(d.datos);
}

/** Valor monetario del documento (cotizado, gastado…) o null si el formato no lo maneja. */
export function valorDoc(d: Documento): number | null {
  const f = infoDoc(d.tipo).valor;
  return f ? f(d.datos) : null;
}

/** Etiqueta del estado con la concordancia del formato («Aprobada», «Aceptada»). */
export const etiquetaEstado = (tipo: TipoDoc, estado: Estado) => infoDoc(tipo).etiquetasEstado[estado];

/** Prefijo del consecutivo: el configurado por la organización o el del módulo. */
export function prefijoDe(config: Config, tipo: TipoDoc): string {
  const propio = { reporte: config.prefijoReporte, permiso: config.prefijoPermiso, gasto: config.prefijoGasto } as Partial<Record<TipoDoc, string>>;
  return config.prefijos?.[tipo] || propio[tipo] || infoDoc(tipo).prefijo;
}

/** Ruta del generador de un tipo de documento. */
export const rutaNuevo = (tipo: TipoDoc, query = "") => `/app/nuevo/${tipo}${query ? `?${query}` : ""}`;

export function moduloDe<T extends TipoDoc>(tipo: T): ModuloDocumento<DatosDe<T>> {
  return DOCUMENTOS[tipo];
}

/** Datos de la organización (Configuración) para las plantillas; lo vacío queda con el valor de la plantilla. */
export function empresaDe(config: Config): Partial<EmpresaPlantilla> {
  const e: Partial<EmpresaPlantilla> = { nombre: config.empresa, nit: `NIT ${config.nit}` };
  if (config.telefono) e.telefonos = config.telefono;
  if (config.correo) e.correo = config.correo;
  return e;
}
