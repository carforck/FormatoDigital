import type { EstadoModulo, InfoModulo } from "@/modulos/registro";

/**
 * Modelo del diagrama «Módulos y flujo».
 *
 * Se arma en tiempo de ejecución a partir de `MODULOS` (src/modulos/registro.ts):
 * cada módulo registrado aparece solo, con su estado (activo, en construcción,
 * planeado) y sus relaciones (`relaciona`). Lo único fijo aquí son las
 * entidades del núcleo (plataforma → organizaciones → clientes) y textos
 * opcionales por clave (etiqueta de la relación, flujo de estados): si un
 * módulo no está registrado, no se dibuja.
 */

/** El estilo «planeado» (borde punteado) sale de `estado`, no del tipo. */
export type TipoNodo = "plataforma" | "entidad" | "eje" | "documento";
export type TipoArista = "jerarquia" | "relacion" | "firma";

export interface Paso {
  estado: string;
  etiqueta: string;
  /** Rama lateral (rechazo, anulación): se dibuja aparte del camino principal. */
  rama?: boolean;
}

export interface NodoModulo {
  id: string;
  tipo: TipoNodo;
  titulo: string;
  subtitulo?: string;
  descripcion: string;
  estado: EstadoModulo;
  formato?: string;
  /** Texto del tipo cuando el genérico no lo describe (p. ej. «Hoja de vida»). */
  tipoTexto?: string;
  flujo: Paso[];
  /** Nota corta bajo el flujo (p. ej. «Rechazado vuelve a borrador»). */
  notaFlujo?: string;
}

/**
 * Arista. En las de jerarquía `desde` es el contenedor y la etiqueta se lee del
 * hijo al contenedor («Gastos legaliza Órdenes»); en las demás, de `desde` a `hacia`.
 */
export interface AristaModulo {
  id: string;
  desde: string;
  hacia: string;
  etiqueta: string;
  tipo: TipoArista;
  /** Alguno de los extremos no está activo: se dibuja punteada. */
  planeada: boolean;
}

export interface GrafoModulos {
  nodos: NodoModulo[];
  aristas: AristaModulo[];
}

const FLUJO_DOCUMENTO: Paso[] = [
  { estado: "borrador", etiqueta: "Borrador" },
  { estado: "en_revision", etiqueta: "En revisión" },
  { estado: "aprobado", etiqueta: "Aprobado" },
  { estado: "cerrado", etiqueta: "Cerrado" },
  { estado: "rechazado", etiqueta: "Rechazado", rama: true },
];

interface Meta {
  /** Contenedor preferido (si está registrado). */
  padre?: string[];
  /** Texto de la arista con el contenedor, leída del hijo al padre («Reportes pertenece a Órdenes»). */
  rama?: string;
  flujo?: Paso[];
  notaFlujo?: string;
  subtitulo?: string;
  tipoTexto?: string;
  eje?: boolean;
}

/** Textos opcionales por clave. No crean módulos: solo describen los que existan en MODULOS. */
const META: Record<string, Meta> = {
  proyectos: {
    padre: ["clientes"],
    rama: "pertenece a",
    eje: true,
    subtitulo: "Agrupa el trabajo de un cliente",
  },
  ordenes: {
    padre: ["proyectos", "clientes"],
    rama: "pertenece a",
    eje: true,
    subtitulo: "Eje de cada trabajo",
    flujo: [
      { estado: "abierta", etiqueta: "Abierta" },
      { estado: "en_ejecucion", etiqueta: "En ejecución" },
      { estado: "cerrada", etiqueta: "Cerrada" },
      { estado: "facturada", etiqueta: "Facturada" },
      { estado: "anulada", etiqueta: "Anulada", rama: true },
    ],
  },
  reportes: { rama: "pertenece a", notaFlujo: "Rechazado vuelve al autor; la firma del cliente lo cierra" },
  permisos: { rama: "autoriza el trabajo de", notaFlujo: "Rechazado vuelve al autor; se cierra al terminar la labor" },
  gastos: { rama: "legaliza los gastos de", notaFlujo: "Aprobado = Vo.Bo.; cerrado = reembolsado. Interno: el cliente no lo ve" },
  cotizaciones: { padre: ["clientes"], rama: "se cotiza a", notaFlujo: "Solo la administración: la aprueba y envía en un paso; la firma del cliente la acepta" },
  cobros: {
    padre: ["proyectos", "ordenes", "clientes"],
    rama: "se emite a",
    flujo: [
      { estado: "borrador", etiqueta: "Borrador" },
      { estado: "emitida", etiqueta: "Emitida" },
      { estado: "enviada", etiqueta: "Enviada" },
      { estado: "pagada", etiqueta: "Pagada" },
      { estado: "anulada", etiqueta: "Anulada", rama: true },
    ],
    notaFlujo: "El cliente solo ve sus cuentas emitidas",
  },
  requerimientos: { rama: "abastece", padre: ["proyectos", "ordenes"] },
  equipos: {
    padre: ["proyectos", "clientes"],
    rama: "se instala en",
    tipoTexto: "Inventario",
    subtitulo: "Por cliente y sistema, con su historial",
    flujo: [
      { estado: "operativo", etiqueta: "Operativo" },
      { estado: "con_falla", etiqueta: "Con falla" },
      { estado: "fuera_servicio", etiqueta: "Fuera de servicio" },
      { estado: "retirado", etiqueta: "Retirado", rama: true },
    ],
    notaFlujo: "Se borra solo sin reportes; con historial se retira",
  },
};

/** Etiqueta de una relación entre dos módulos, en el sentido desde → hacia. */
const RELACIONES: Record<string, string> = {
  "reportes>cobros": "se cobra en",
  "gastos>cobros": "se incluye en",
  "permisos>reportes": "habilita",
  "cotizaciones>proyectos": "origina",
  "cotizaciones>ordenes": "origina",
  "cotizaciones>cobros": "se cobra en",
  "requerimientos>gastos": "se legaliza en",
  "requerimientos>cotizaciones": "se cotiza en",
  "equipos>reportes": "se atiende en",
  "ordenes>cobros": "se factura en",
  "proyectos>cobros": "se cobra en",
  "proyectos>ordenes": "se ejecuta en",
  "permisos>ordenes": "autoriza",
  "reportes>ordenes": "documenta",
  "gastos>ordenes": "legaliza",
};

/** Contenedores posibles de un documento, en orden de preferencia. */
const CONTENEDORES = ["proyectos", "ordenes"];

const esDocumento = (m: InfoModulo, claves: string[]) => !!m.formato || claves.some((c) => m.clave.startsWith(c));

/**
 * Arma el grafo. `clavesDocumento` son las claves de `DOCUMENTOS` (reporte,
 * permiso, gasto…): los módulos cuya clave empieza por una de ellas siguen el
 * flujo de los documentos (borrador → en revisión → aprobado → cerrado / rechazado).
 */
export function armarGrafoModulos(modulos: InfoModulo[], clavesDocumento: string[]): GrafoModulos {
  const nucleo = modulos.find((m) => m.clave === "nucleo");
  const resto = modulos.filter((m) => m.clave !== "nucleo");
  const claves = new Set(resto.map((m) => m.clave));
  const porClave = new Map(resto.map((m) => [m.clave, m]));
  const estadoDe = (id: string): EstadoModulo => porClave.get(id)?.estado ?? "activo";

  const nodos: NodoModulo[] = [
    {
      id: "plataforma",
      tipo: "plataforma",
      titulo: "Plataforma FormatoDigital",
      subtitulo: nucleo ? nucleo.nombre : "Núcleo",
      descripcion: nucleo?.descripcion ?? "Usuarios, roles, firmas, archivos, PDF, consecutivos y auditoría.",
      estado: nucleo?.estado ?? "activo",
      flujo: [],
      notaFlujo: "Transversal: todos los módulos lo usan",
    },
    {
      id: "organizaciones",
      tipo: "entidad",
      titulo: "Organizaciones",
      subtitulo: "Empresas · datos aislados (RLS)",
      descripcion: "Cada empresa que usa la plataforma es una organización con sus usuarios, roles, formatos y consecutivos. SOTEC es la primera.",
      estado: "activo",
      flujo: [],
    },
    {
      id: "clientes",
      tipo: "entidad",
      titulo: "Clientes y sitios",
      subtitulo: "Clientes de cada empresa",
      descripcion: "Directorio de clientes con sus sitios u obras; el usuario con rol cliente queda atado a uno y ve solo sus documentos aprobados.",
      estado: "activo",
      flujo: [],
    },
  ];
  const aristas: AristaModulo[] = [];
  const agregar = (desde: string, hacia: string, etiqueta: string, tipo: TipoArista) => {
    const planeada = estadoDe(desde) !== "activo" || estadoDe(hacia) !== "activo";
    aristas.push({ id: `${tipo}:${desde}>${hacia}`, desde, hacia, etiqueta, tipo, planeada });
  };
  agregar("plataforma", "organizaciones", "opera en", "jerarquia");
  agregar("organizaciones", "clientes", "pertenece a", "jerarquia");

  // Contenedor de cada módulo: preferencia propia (META.padre), luego el primer contenedor con el que se relaciona
  const padres = new Map<string, string>();
  for (const m of resto) {
    const meta = META[m.clave];
    let padre: string | undefined;
    if (meta?.padre) padre = meta.padre.find((p) => p === "clientes" || claves.has(p));
    if (!padre) padre = CONTENEDORES.find((c) => c !== m.clave && claves.has(c) && (m.relaciona.includes(c) || porClave.get(c)?.relaciona.includes(m.clave)));
    padres.set(m.clave, padre ?? "clientes");
  }
  // Evita ciclos entre contenedores (p. ej. proyectos ↔ órdenes): sube hasta clientes si se repite
  for (const [hijo] of padres) {
    const vistos = new Set([hijo]);
    let p = padres.get(hijo);
    while (p && p !== "clientes") {
      if (vistos.has(p)) {
        padres.set(hijo, "clientes");
        break;
      }
      vistos.add(p);
      p = padres.get(p);
    }
  }

  for (const m of resto) {
    const meta = META[m.clave] ?? {};
    const documento = esDocumento(m, clavesDocumento);
    nodos.push({
      id: m.clave,
      tipo: meta.eje ? "eje" : "documento",
      titulo: m.nombre,
      subtitulo: meta.subtitulo,
      descripcion: m.descripcion,
      estado: m.estado,
      formato: m.formato,
      tipoTexto: meta.tipoTexto,
      flujo: meta.flujo ?? (documento ? FLUJO_DOCUMENTO : []),
      notaFlujo: meta.notaFlujo,
    });
    agregar(padres.get(m.clave)!, m.clave, meta.rama ?? "pertenece a", "jerarquia");
  }

  // Relaciones declaradas en `relaciona` (sin repetir la del contenedor ni el mismo par)
  const pares = new Set<string>();
  for (const m of resto) {
    for (const r of m.relaciona) {
      if (r === m.clave || !claves.has(r)) continue;
      if (padres.get(m.clave) === r || padres.get(r) === m.clave) continue;
      const par = [m.clave, r].sort().join("|");
      if (pares.has(par)) continue;
      pares.add(par);
      const ida = RELACIONES[`${m.clave}>${r}`];
      const vuelta = RELACIONES[`${r}>${m.clave}`];
      if (ida || !vuelta) agregar(m.clave, r, ida ?? "se relaciona con", "relacion");
      else agregar(r, m.clave, vuelta, "relacion");
    }
  }

  // Firma del cliente sobre el reporte técnico (en sitio, portal o enlace)
  if (claves.has("reportes")) agregar("clientes", "reportes", "firma el cliente", "firma");
  if (claves.has("cotizaciones")) agregar("clientes", "cotizaciones", "aprueba el cliente", "firma");

  return { nodos, aristas };
}

export const ETIQUETA_ESTADO_MODULO: Record<EstadoModulo, string> = {
  activo: "Activo",
  en_construccion: "En construcción",
  planeado: "Planeado",
};
