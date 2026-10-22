import type { ComponentType } from "react";

import type { Paso, ValorPaso } from "@/components/chat/ChatAsistente";
import type { EquipoAtendido } from "@/modulos/equipos/tipos";
import type { Cliente, Estado, Proyecto, TipoDoc, Usuario } from "@/nucleo/tipos";

/** Contexto que el generador le pasa a un módulo para armar los pasos del asistente. */
export interface ContextoAsistente<D> {
  datos: D;
  clientes: Cliente[];
  usuarioNombre: string;
  hoy: string;
}

/** Control documental del formato (encabezado, listados, títulos). */
export interface InfoFormato {
  codigo: string; // FO-GSST-22
  nombre: string; // Formato de reporte técnico
  version: string;
  fecha: string; // dd/mm/aaaa de la versión
  corto: string; // Reporte técnico
  /** Concordancia con el nombre corto: «el reporte», «la cotización». */
  el: "el" | "la";
  nuevo: "Nuevo" | "Nueva";
  /** Plural para conteos en el tablero y los proyectos («reportes»). */
  plural: string;
}

/** Props comunes de la plantilla (réplica del formato) de cualquier módulo. */
export interface PropsPlantilla<D> {
  datos: D;
  codigoDoc?: string;
  /** Si existe, los campos se editan en línea. */
  editar?: (patch: Partial<D>) => void;
  /** Abre el pad de firma para el campo indicado. */
  firmar?: (campo: string) => void;
  /** Campo que el asistente está preguntando; se resalta en la vista previa. */
  resaltar?: string;
  /** Solo en el detalle: edición de los campos de cierre (permiso). */
  editarCierre?: (patch: Partial<D>) => void;
  /** Datos de la organización para encabezados y pies (los toma de Configuración: `empresaDe`). */
  empresa?: Partial<EmpresaPlantilla>;
  /** Equipos atendidos (módulo Equipos), ya resueltos para imprimir. */
  equipos?: EquipoAtendido[];
}

/** Datos de la organización que una plantilla puede imprimir. */
export interface EmpresaPlantilla {
  nombre: string;
  nit: string; // con el prefijo «NIT»
  telefonos: string;
  correo: string;
  direccion: string[];
}

/** Cómo se aprueba y se cierra el documento (botones, eventos y quién cierra). */
export interface FlujoDocumento<D> {
  /** Texto del botón de aprobación («Aprobar», «Dar Vo.Bo. y firmar»). */
  aprobar: string;
  /** Si aprobar exige la firma del revisor (abre el pad). */
  firmaAlAprobar: boolean;
  /** Lo que se escribe en el formato al aprobar (nombre y firma de quien autoriza). */
  alAprobar?: (datos: D, revisor: Usuario, firma?: string) => Partial<D>;
  /**
   * Quién pasa de aprobado a cerrado:
   * - "cliente": el cliente firma (portal o en sitio con un revisor) en `campoFirmaCliente`.
   * - "revisor": un revisor con un clic (gastos reembolsados, materiales entregados).
   * - "formulario": un revisor diligencia el cierre en el formato (permiso).
   */
  cierre: "cliente" | "revisor" | "formulario";
  /** Campo de la firma del cliente cuando `cierre` es "cliente". */
  campoFirmaCliente?: keyof D & string;
  /** Texto del botón de cierre («Firmar como cliente», «Marcar como reembolsado»). */
  cerrar: string;
  /** Evento del historial y la auditoría al cerrar. */
  eventoCierre: string;
}

/**
 * Contrato de un módulo de documento (formato diligenciable).
 * Agregar un formato nuevo = implementar este contrato en `src/modulos/<clave>/`
 * y registrarlo en `src/modulos/registro.ts`; el generador, la validación, el
 * tablero, los proyectos y el listado lo toman de aquí sin cambios.
 *
 * Los miembros opcionales tienen un valor por defecto en el registro
 * (`infoDoc`), así un módulo nuevo compila con lo mínimo y se completa después.
 */
export interface ModuloDocumento<D> {
  clave: TipoDoc;
  /** Contenido inicial del formato para un usuario. */
  vacio: (hoy: string, usuario: Usuario) => D;
  /** Preguntas del asistente conversacional, en orden. */
  pasos: (ctx: ContextoAsistente<D>) => Paso[];
  /** Aplica una respuesta del asistente; devuelve el cambio y, opcional, un mensaje para el chat. */
  aplicar: (id: string, valor: ValorPaso, datos: D) => { cambio: Partial<D>; mensaje?: string };
  /** Autollenado al elegir un cliente del directorio. */
  alElegirCliente: (c: Cliente) => { cambio: Partial<D>; mensaje: string };
  /** Pendientes antes de enviar a revisión (vacío = listo). */
  faltantes: (datos: D) => string[];
  /** Cantidad de comprobaciones que hace `faltantes` (para el % de avance). */
  totalComprobaciones: number;
  /** Texto principal para listados (asunto, actividades…). */
  titulo: (datos: D) => string;

  // ── Registro genérico (opcionales: el registro pone un valor por defecto) ──

  /** Control documental. Por defecto: código y nombre genéricos a partir de la clave. */
  formato?: InfoFormato;
  /** Prefijo del consecutivo por defecto (RT, PT, LG, COT, RM). La organización lo puede cambiar en Configuración. */
  prefijo?: string;
  /** Réplica del formato. Por defecto: un aviso de «vista previa no disponible». */
  Plantilla?: ComponentType<PropsPlantilla<D>>;
  /** Cliente u obra como lo nombra el formato. Por defecto: `datos.cliente`. */
  clienteDe?: (datos: D) => string;
  /** Campo de texto donde va el cliente escrito a mano (sin directorio). Por defecto: "cliente". */
  campoCliente?: keyof D & string;
  /** Autollenado al elegir un proyecto (obra, sitio, centro de costos). Por defecto: nada. */
  alElegirProyecto?: (p: Proyecto, c: Cliente | undefined) => { cambio: Partial<D>; mensaje?: string };
  /** Si el cliente lo ve en su portal (aprobado o cerrado). Por defecto: false (interno). */
  visibleCliente?: boolean;
  /** Color de la serie en las gráficas (variable CSS). Por defecto: uno de la paleta según el orden. */
  color?: string;
  /** Aprobación y cierre. Por defecto: aprobar sin firma y cierre de un revisor. */
  flujo?: FlujoDocumento<D>;
  /** Etiquetas de estado propias («Aprobada», «Aceptada», «Entregado»). Por defecto: las generales. */
  etiquetasEstado?: Partial<Record<Estado, string>>;
  /** Copia para «Duplicar»: fecha de hoy y sin firmas. Por defecto: el mismo contenido. */
  duplicar?: (datos: D, hoy: string) => D;
  /** Valor monetario del documento (cotizado, gastado…), para los totales del proyecto. */
  valor?: (datos: D) => number;
  /** Aplica una firma del pad en el formato. Por defecto: `{ [campo]: imagen }`. */
  aplicarFirma?: (campo: string, imagen: string, datos: D) => Partial<D>;
  /**
   * El formato registra los equipos atendidos (módulo Equipos): el generador pregunta
   * cuáles después del paso `despuesDe` y la plantilla los imprime. Por defecto: no.
   */
  equipos?: { despuesDe: string };
}
