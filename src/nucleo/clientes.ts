/**
 * Directorio de clientes alimentado desde los formatos (pedido de Magno: «al digitar
 * un cliente nuevo, que quede almacenado para que en un próximo reporte no toque
 * digitarlo»). Reglas puras que usan el generador (para avisar) y `DemoProvider`
 * (para aplicarlas sobre el estado más reciente al GUARDAR):
 *
 * - El nombre se compara sin mayúsculas, tildes, puntuación, espacios de más ni la razón
 *   social (S.A.S., Ltda.…) (`claveNombre`); la ñ cuenta («Peña» ≠ «Pena»).
 * - Cliente que no está: se crea con lo escrito en el formato (`datosCliente` del módulo).
 * - Cliente que ya está (activo) con el mismo nombre (`mismoNombre`): se enlaza y se llenan
 *   solo sus campos VACÍOS; nunca se sobrescribe lo que ya tiene.
 * - Se parece pero no es el mismo nombre («Ferreteria el tornillo SAS»): se PREGUNTA si es
 *   ese cliente (enlazar al equivocado lo mostraría en el portal de otra empresa); si no,
 *   queda escrito a mano y no se crea otro (la base rechazaría el duplicado).
 * - Cliente desactivado: no se vuelve a crear; el generador ofrece usarlo.
 *
 * La base de datos aplica lo mismo en 0013 (el técnico solo INSERTA clientes y
 * `completar_cliente` llena campos vacíos). Editar, desactivar y eliminar siguen
 * siendo del permiso `clientes` (Coordinador SST y administración).
 */
import { infoDoc } from "@/modulos/registro";
import type { Cliente, Documento } from "@/nucleo/tipos";

/** Campos del cliente que un formato puede completar (sin nombre, id ni estado). */
export const CAMPOS_COMPLETABLES = ["nit", "direccion", "contacto", "cargo", "correo", "telefono", "sitio"] as const;
type CampoCompletable = (typeof CAMPOS_COMPLETABLES)[number];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Mismos caracteres que `clave_nombre` en 0013 (translate): sin tilde, en minúscula; la ñ se conserva
const CON_TILDE = "ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÇÑáàäâãéèëêíìïîóòöôõúùüûçñ";
const SIN_TILDE = "aaaaaeeeeiiiiooooouuuucñaaaaaeeeeiiiiooooouuuucñ";
const TILDES = new Map([...CON_TILDE].map((c, i) => [c, SIN_TILDE[i]]));
/** Razón social al final, solo para comparar: «S.A.S.», «SAS», «S.A.», «Ltda.», «S. en C.», «E.U.». */
const RAZON_SOCIAL = / (s ?a ?s|s ?a|ltda|limitada|s en c( ?s)?|e ?u)$/;

/**
 * Nombre comparable (idéntico a `public.clave_nombre` de 0013; los casos de prueba son los
 * mismos en tests/unit/clientes.test.ts y supabase/tests): NFC, sin tildes (la ñ cuenta),
 * minúsculas, sin puntuación, un solo espacio y sin la razón social del final.
 * «  Ferretería  EL Tornillo S.A.S.» = «ferreteria el tornillo».
 */
export function claveNombre(nombre: string): string {
  return [...nombre.normalize("NFC")]
    .map((c) => TILDES.get(c) ?? c)
    .join("")
    .replace(/[A-Z]/g, (c) => c.toLowerCase())
    .replace(/[.,'’´`"]/g, "")
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim()
    .replace(RAZON_SOCIAL, "")
    .trim();
}

/** Nombre limpio para guardar: sin espacios de más, tabulaciones ni espacios duros (conserva mayúsculas y tildes). */
export const nombreLimpio = (nombre: string) => nombre.normalize("NFC").replace(/[\s\u200b]+/g, " ").trim();

/** El mismo nombre escrito con otras mayúsculas o espacios (sin preguntar); lo demás que coincide se pregunta. */
export const mismoNombre = (a: string, b: string) => nombreLimpio(a).toLocaleLowerCase("es") === nombreLimpio(b).toLocaleLowerCase("es");

/** Cliente del directorio con ese nombre (activo o no), comparando con `claveNombre`. */
export function buscarCliente(clientes: Cliente[], nombre: string): Cliente | undefined {
  const k = claveNombre(nombre);
  return k ? clientes.find((c) => claveNombre(c.nombre) === k) : undefined;
}

/** Pregunta para confirmar un cliente que se parece pero no es el mismo nombre. */
export const preguntaParecido = (escrito: string, c: Cliente) =>
  `«${nombreLimpio(escrito)}» se parece a «${c.nombre}» del directorio de clientes.\n\n¿Es el mismo cliente? (Si no, queda escrito a mano y no se crea otro: escribe un nombre que lo distinga.)`;

/** Datos del cliente escritos en el formato del documento, o null si el formato no registra clientes. */
export function datosClienteDe(doc: Documento): Partial<Omit<Cliente, "id" | "activo">> | null {
  const f = infoDoc(doc.tipo).datosCliente;
  return f ? f(doc.datos) : null;
}

/** Valor del formato que sirve para el campo (correo y teléfono, solo si son válidos). */
function valido(campo: CampoCompletable, v: string | undefined): string {
  const t = (v ?? "").trim();
  if (!t) return "";
  if (campo === "correo") return EMAIL.test(t) ? t : "";
  if (campo === "telefono") return t.replace(/\D/g, "").length >= 7 ? t : "";
  return t;
}

/** Llena solo los campos vacíos del cliente con lo del formato; devuelve el cliente y qué campos cambió. */
export function completarVacios(c: Cliente, datos: Partial<Cliente>): { cliente: Cliente; campos: CampoCompletable[] } {
  const campos: CampoCompletable[] = [];
  const cliente = { ...c };
  for (const k of CAMPOS_COMPLETABLES) {
    const v = valido(k, datos[k]);
    if (v && !(c[k] ?? "").trim()) {
      cliente[k] = v;
      campos.push(k);
    }
  }
  return { cliente, campos };
}

/** Qué pasará con el directorio al guardar el documento. */
export type PlanCliente =
  | { accion: "nada" }
  /** Cliente nuevo: se crea con estos datos y el documento queda enlazado. */
  | { accion: "crear"; cliente: Cliente }
  /** Ya existe (activo): se enlaza y, si hay, se llenan sus campos vacíos. */
  | { accion: "enlazar"; cliente: Cliente; campos: CampoCompletable[] }
  /** Existe pero está desactivado: no se recrea; quien guarda decide si lo usa. */
  | { accion: "inactivo"; cliente: Cliente }
  /** Se parece a uno activo sin ser el mismo nombre: no se enlaza ni se crea sin preguntar. */
  | { accion: "parecido"; cliente: Cliente };

/**
 * Plan para el directorio al guardar `doc` (sin cambiar nada). `idNuevo` es el id del cliente
 * que se crearía. Con `clienteId` ya puesto solo se completan los vacíos de ese cliente.
 */
export function planCliente(clientes: Cliente[], doc: Documento, idNuevo: string): PlanCliente {
  const datos = datosClienteDe(doc);
  if (!datos) return { accion: "nada" };
  const elegido = doc.clienteId ? clientes.find((c) => c.id === doc.clienteId) : undefined;
  if (elegido) {
    const { cliente, campos } = completarVacios(elegido, datos);
    return { accion: "enlazar", cliente, campos };
  }
  const nombre = nombreLimpio(datos.nombre ?? "");
  if (nombre.length < 3) return { accion: "nada" };
  const existente = buscarCliente(clientes, nombre);
  if (existente?.activo === false) return { accion: "inactivo", cliente: existente };
  if (existente && !mismoNombre(existente.nombre, nombre)) return { accion: "parecido", cliente: existente };
  if (existente) {
    const { cliente, campos } = completarVacios(existente, datos);
    return { accion: "enlazar", cliente, campos };
  }
  const nuevo: Cliente = { id: idNuevo, nombre, nit: "", direccion: "", contacto: "", cargo: "", correo: "", telefono: "", sitio: "" };
  return { accion: "crear", cliente: completarVacios(nuevo, datos).cliente };
}

/** Texto para el usuario después de guardar («Guardé «X» en el directorio de clientes»), o null. */
export function avisoPlan(plan: PlanCliente): string | null {
  if (plan.accion === "crear") return `Guardé «${plan.cliente.nombre}» en el directorio de clientes: la próxima vez se autocompleta.`;
  if (plan.accion === "enlazar" && plan.campos.length) return `Completé en el directorio los datos que le faltaban a «${plan.cliente.nombre}» (${plan.campos.map((c) => ETIQUETA_CAMPO[c]).join(", ")}).`;
  return null;
}

const ETIQUETA_CAMPO: Record<CampoCompletable, string> = { nit: "NIT", direccion: "dirección", contacto: "contacto", cargo: "cargo", correo: "correo", telefono: "teléfono", sitio: "sitio" };

// Aviso del directorio para el detalle del documento: el generador lo deja al guardar y el
// detalle lo muestra una vez (la navegación con `replace` no lleva estado).
const KEY_AVISO = "fd-aviso-cliente";

/** Deja el aviso «Guardé «X» en el directorio…» para el detalle del documento. */
export function dejarAvisoCliente(docId: string, texto: string) {
  try {
    sessionStorage.setItem(KEY_AVISO, JSON.stringify({ docId, texto }));
  } catch {
    /* sin almacenamiento: no hay aviso */
  }
}

/** Toma (y borra) el aviso del directorio de ese documento, si hay. */
export function tomarAvisoCliente(docId: string): string | null {
  try {
    const a = JSON.parse(sessionStorage.getItem(KEY_AVISO) ?? "null") as { docId: string; texto: string } | null;
    if (!a || a.docId !== docId) return null;
    sessionStorage.removeItem(KEY_AVISO);
    return a.texto;
  } catch {
    return null;
  }
}

/* ---------- Nombre pegado con otros datos («* Razón social: FARO ANDINO S.A.S. * NIT: 900123456») ---------- */

/** Dígito de verificación de un NIT según la DIAN (pesos 3, 7, 13… de derecha a izquierda). */
export function digitoVerificacion(nit: string): number {
  const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const d = nit.replace(/\D/g, "");
  let suma = 0;
  for (let i = 0; i < d.length; i++) suma += Number(d[d.length - 1 - i]) * PESOS[i];
  const r = suma % 11;
  return r > 1 ? 11 - r : r;
}

/**
 * NIT o C.C. con puntos de miles y, si vino, el dígito de verificación: «900123456» →
 * «900.123.456», «900123456-1» → «900.123.456-1». `dvCorrecto` es false si el dígito que
 * vino no es el que calcula la DIAN (solo NIT de 9 dígitos). Sin 6 a 10 dígitos devuelve el texto tal cual.
 */
export function normalizarNit(texto: string): { nit: string; dvCorrecto: boolean; dvCalculado?: number } {
  const t = texto.trim();
  const m = t.match(/^([\d.\s]+?)(?:\s*-\s*(\d))?$/);
  const base = m ? m[1].replace(/\D/g, "") : "";
  if (!m || base.length < 6 || base.length > 10) return { nit: t, dvCorrecto: true };
  const conPuntos = base.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (m[2] === undefined) return { nit: conPuntos, dvCorrecto: true };
  const dvCalculado = digitoVerificacion(base);
  return { nit: `${conPuntos}-${m[2]}`, dvCorrecto: base.length !== 9 || Number(m[2]) === dvCalculado, dvCalculado };
}

/** Lo que se separó de un nombre de cliente pegado con etiquetas, viñetas o saltos de línea. */
export interface ClienteSeparado {
  /** Nombre limpio (sin etiqueta, viñetas ni NIT). Vacío si no vino un nombre. */
  nombre: string;
  /** NIT normalizado (`normalizarNit`), o vacío. */
  nit: string;
  /** Otros datos que venían con etiqueta («Dirección: …», «Teléfono: …»). */
  otros: Partial<Pick<Cliente, "direccion" | "telefono" | "correo" | "contacto">>;
  /** Si el texto cambió (hay algo que avisar). */
  cambio: boolean;
  /** Aviso para el usuario («Separé el NIT…»), o null. */
  aviso: string | null;
}

// Etiquetas que se reconocen en lo pegado (con «:»); el valor va al campo indicado
const ETIQUETAS: [RegExp, "nombre" | "nit" | keyof ClienteSeparado["otros"]][] = [
  [/^(raz[oó]n\s+social|nombre(\s+(del\s+cliente|de\s+la\s+empresa|comercial))?|cliente|empresa)$/i, "nombre"],
  [/^(nit|n\.?\s?i\.?\s?t\.?|c\.?\s?c\.?|c[eé]dula|rut|nit\s*\/\s*c\.?\s?c\.?)$/i, "nit"],
  [/^(direcci[oó]n|domicilio)$/i, "direccion"],
  [/^(tel[eé]fonos?|tel\.?|celular|cel\.?|m[oó]vil)$/i, "telefono"],
  [/^(correo(\s+electr[oó]nico)?|e-?mail)$/i, "correo"],
  [/^(contacto|persona\s+de\s+contacto|representante(\s+legal)?)$/i, "contacto"],
];
// Antes de una etiqueta conocida pegada al texto anterior (el navegador quita los saltos de línea al pegar en un campo)
const ETIQUETA_EN_LINEA = /(raz[oó]n\s+social|\bnit\b|\bn\.\s?i\.\s?t\.?|direcci[oó]n|tel[eé]fonos?|celular|correo(?:\s+electr[oó]nico)?|e-?mail|persona\s+de\s+contacto)\s*:/gi;
// NIT dentro del texto, con o sin «:» («FARO ANDINO S.A.S. NIT 900.123.456-1»)
const NIT_EN_TEXTO = /(?:\bnit\b|\bn\.\s?i\.\s?t\.?)\s*(?:[:#.]|no\.?|n[°º.])?\s*(\d[\d.\s]*\d(?:\s*-\s*\d)?)/i;
// Viñetas y separadores al inicio o al final de un trozo
const BORDES = /^[\s\-–—•*▪◦‣>·.,;:]+|[\s\-–—•*▪◦‣>·,;:]+$/g;

/**
 * Separa un nombre de cliente pegado con otros datos (lo que pasó en los datos reales:
 * «* Razón social: FARO ANDINO S.A.S. * NIT: 900123456»): etiquetas, viñetas, saltos de línea y el
 * NIT. Un nombre normal no cambia. Lo usan el asistente, el formato y la página de Clientes.
 */
export function separarCliente(texto: string): ClienteSeparado {
  const limpio = nombreLimpio(texto);
  const sinCambio: ClienteSeparado = { nombre: limpio, nit: "", otros: {}, cambio: false, aviso: null };
  // Solo se analiza si hay algo que separar: saltos de línea, viñetas, «Etiqueta:» o un NIT
  if (!/[\n\r*•▪◦‣|\t]|^\s*[-–—]\s|:|\bnit\b|\bn\.\s?i\.\s?t/i.test(texto)) return sinCambio;

  const trozos = texto
    .normalize("NFC")
    .replace(ETIQUETA_EN_LINEA, "\n$&")
    .split(/[\n\r*•▪◦‣|\t]+|\s[-–—]\s(?=[^:]{1,40}:)/)
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  let nombre = "";
  let nitTexto = "";
  const otros: ClienteSeparado["otros"] = {};
  const sueltos: string[] = [];
  for (const trozo of trozos) {
    const m = trozo.match(/^([^:]{1,40}?)\s*:\s*(.*)$/);
    const destino = m ? ETIQUETAS.find(([re]) => re.test(m[1].replace(BORDES, "")))?.[1] : undefined;
    if (m && destino) {
      let valor = m[2];
      if (destino !== "nit") {
        // «Razón social: FARO ANDINO S.A.S. NIT 901…» en el mismo trozo
        const n = valor.match(NIT_EN_TEXTO);
        if (n) {
          nitTexto ||= n[1];
          valor = valor.replace(n[0], " ");
        }
      }
      valor = valor.replace(BORDES, "").replace(/\s+/g, " ").trim();
      if (!valor) continue;
      if (destino === "nombre") nombre ||= valor;
      else if (destino === "nit") nitTexto ||= valor;
      else otros[destino] ||= valor;
      continue;
    }
    // Encabezado sin valor («Datos del cliente:») u otra etiqueta desconocida: no es el nombre
    if (m) continue;
    let t = trozo;
    const n = t.match(NIT_EN_TEXTO);
    if (n) {
      nitTexto ||= n[1];
      t = t.replace(n[0], " ");
    }
    t = t.replace(BORDES, "").replace(/\s+/g, " ").trim();
    if (t) sueltos.push(t);
  }
  nombre = nombreLimpio(nombre || sueltos[0] || "");
  // El nombre conserva su punto final («S.A.S.»): BORDES solo lo quita al inicio
  const { nit, dvCorrecto, dvCalculado } = nitTexto ? normalizarNit(nitTexto.replace(BORDES, "")) : { nit: "", dvCorrecto: true, dvCalculado: undefined };
  const cambio = nombre !== limpio || Boolean(nit) || Object.keys(otros).length > 0;
  if (!cambio) return sinCambio;
  const partes = [nit && `el NIT ${nit}`, otros.direccion && "la dirección", otros.telefono && "el teléfono", otros.correo && "el correo", otros.contacto && "el contacto"].filter(Boolean) as string[];
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}` : partes[0];
  let aviso = lista ? `Separé ${lista} del nombre del cliente: quedó «${nombre || "(sin nombre)"}».` : `Limpié el nombre del cliente: quedó «${nombre}».`;
  if (!dvCorrecto) aviso += ` Revisa el NIT: su dígito de verificación debería ser ${dvCalculado}.`;
  return { nombre, nit, otros, cambio, aviso };
}
