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

export const ESQUEMA = datos as unknown as EsquemaDb;

export const COMANDO_ESQUEMA = "python3 scripts/generar-mapa-db.py";
