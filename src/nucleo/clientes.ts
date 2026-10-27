/**
 * Directorio de clientes alimentado desde los formatos (pedido de Magno: «al digitar
 * un cliente nuevo, que quede almacenado para que en un próximo reporte no toque
 * digitarlo»). Reglas puras que usan el generador (para avisar) y `DemoProvider`
 * (para aplicarlas sobre el estado más reciente al GUARDAR):
 *
 * - El nombre se compara sin mayúsculas, tildes ni espacios de más (`claveNombre`).
 * - Cliente que no está: se crea con lo escrito en el formato (`datosCliente` del módulo).
 * - Cliente que ya está (activo): se enlaza y se llenan solo sus campos VACÍOS; nunca se
 *   sobrescribe lo que ya tiene.
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

/** Nombre comparable: minúsculas, sin tildes y con un solo espacio («  Ferretería  EL Tornillo» = «ferreteria el tornillo»). */
export function claveNombre(nombre: string): string {
  return nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Nombre limpio para guardar: sin espacios de más (conserva mayúsculas y tildes como se escribió). */
export const nombreLimpio = (nombre: string) => nombre.replace(/\s+/g, " ").trim();

/** Cliente del directorio con ese nombre (activo o no), comparando con `claveNombre`. */
export function buscarCliente(clientes: Cliente[], nombre: string): Cliente | undefined {
  const k = claveNombre(nombre);
  return k ? clientes.find((c) => claveNombre(c.nombre) === k) : undefined;
}

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
  | { accion: "inactivo"; cliente: Cliente };

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
