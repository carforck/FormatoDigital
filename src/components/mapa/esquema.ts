/**
 * Esquema de la base de datos para la pestaña «Base de datos» del Mapa del
 * sistema (src/app/app/mapa/page.tsx). esquema.json es generado: no se edita a
 * mano, se regenera con COMANDO_ESQUEMA tras agregar una migración.
 */
import datos from "./esquema.json";

/** Tipos del esquema que genera `scripts/generar-mapa-db.py` (esquema.json). */
export interface ColumnaDb {
  nombre: string;
  tipo: string;
  pk: boolean;
  nulo: boolean;
  unico: boolean;
  defecto?: string;
  fk: { tabla: string; columna: string; alBorrar: string | null } | null;
}

export interface TablaDb {
  nombre: string;
  esquema: string;
  columnas: ColumnaDb[];
  migracion: string | null;
  descripcion: string;
  rls: boolean;
  externa: boolean;
}

export interface RelacionDb {
  id: string;
  desde: string;
  columna: string;
  hacia: string;
  columnaDestino: string;
  alBorrar: string | null;
  nulo: boolean;
}

export interface EsquemaDb {
  migraciones: string[];
  tablas: TablaDb[];
  relaciones: RelacionDb[];
}

/** El JSON importado, tipado (el cast es necesario: TS infiere tipos literales del JSON). */
export const ESQUEMA = datos as unknown as EsquemaDb;

/** Comando que regenera esquema.json; la página del mapa lo muestra como ayuda. */
export const COMANDO_ESQUEMA = "python3 scripts/generar-mapa-db.py";
