import type { Paso, ValorPaso } from "@/components/chat/ChatAsistente";
import type { Cliente, TipoDoc, Usuario } from "@/nucleo/tipos";

/** Contexto que el generador le pasa a un módulo para armar los pasos del asistente. */
export interface ContextoAsistente<D> {
  datos: D;
  clientes: Cliente[];
  usuarioNombre: string;
  hoy: string;
}

/**
 * Contrato de un módulo de documento (formato diligenciable).
 * Agregar un formato nuevo = implementar este contrato en `src/modulos/<clave>/`
 * y registrarlo en `src/modulos/registro.ts`; el generador, la validación, el
 * tablero y el listado lo toman de aquí sin cambios.
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
}
