/**
 * Listas de opciones de la empresa («＋ Agregar otro»): reglas puras que comparten el
 * asistente (ChatAsistente), los formularios (`SelectConOtro`, `AgregarOtro`) y el
 * proveedor de datos (`agregarOpcion`). Lo que el equipo agrega se guarda en
 * `config.opcionesPropias[clave]` y la administración lo revisa en Configuración
 * (`OpcionesAgregadas`).
 *
 * - Las claves son «formato.paso» (p. ej. «permiso.epp», las del asistente) o, fuera de
 *   los formatos, «equipos.sistema» y «equipos.tipo.<sistema>» (ver `LISTA`).
 * - Se compara sin mayúsculas, tildes ni espacios de más (`comparable`): «alimentacion»
 *   es la misma opción que «Alimentación» y no se repite.
 * - Se guarda recortado y con un solo espacio (`limpiarOpcion`); el vacío no se agrega.
 */

/** Claves de las listas que se comparten entre el asistente y los formularios. */
export const LISTA = {
  /** Tipo de gasto de cada fila de la legalización (paso «items» del asistente). */
  tipoGasto: "gasto.items",
  /** Unidad de los ítems de la cotización. */
  unidad: "cotizacion.unidad",
  /** Sistemas del inventario de equipos (CCTV, alarmas…). */
  sistemaEquipo: "equipos.sistema",
  /** Tipos de equipo de un sistema («Cámara domo» en CCTV). */
  tipoEquipo: (sistema: string) => `equipos.tipo.${sistema}`,
} as const;

/** Texto comparable: sin tildes (la ñ se conserva), minúsculas y un solo espacio. */
export function comparable(s: string): string {
  return s
    .normalize("NFC")
    .replace(/ñ/gi, "\u0000")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\u0000/g, "ñ")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

/** Opción lista para guardar: recortada, con un solo espacio y sin espacios duros. */
export const limpiarOpcion = (s: string) => s.normalize("NFC").replace(/[\s​]+/g, " ").trim();

/** La opción de la lista que es la misma que `valor` (sin mayúsculas, tildes ni espacios), si existe. */
export function buscarOpcion(lista: readonly string[], valor: string): string | undefined {
  const k = comparable(valor);
  return k ? lista.find((x) => comparable(x) === k) : undefined;
}

/**
 * Une listas en orden y sin repetidos (la primera escritura gana): catálogo del formato,
 * lo agregado por la empresa y los valores que ya tiene el documento. «Otro» queda al final.
 */
export function unirOpciones(...listas: (readonly string[] | undefined)[]): string[] {
  const salida: string[] = [];
  let otro: string | undefined;
  for (const l of listas)
    for (const x of l ?? []) {
      const v = limpiarOpcion(x);
      if (!v) continue;
      if (comparable(v) === "otro") otro ??= v;
      else if (!buscarOpcion(salida, v)) salida.push(v);
    }
  return otro ? [...salida, otro] : salida;
}
