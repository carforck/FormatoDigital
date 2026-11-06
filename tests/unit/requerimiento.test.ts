// Pruebas del requerimiento (pedido de Magno): validación, ítems escritos o marcados en el asistente,
// conversión en cotización (precios del catálogo) y quién la convierte, una sola vez.
// Uso: npx tsx tests/unit/requerimiento.test.ts
import { itemsMarcadosRq, leerItemsRq, requerimientoVacio } from "../../src/modulos/requerimientos/catalogo";
import { CONVERTIDO_EN, cotizacionDe, cotizacionDesdeRequerimiento } from "../../src/modulos/requerimientos/conversion";
import type { DatosRequerimiento, ItemRequerimiento } from "../../src/modulos/requerimientos/tipos";
import { faltantesRequerimiento } from "../../src/modulos/requerimientos/validar";
import { faltantesCotizacion } from "../../src/modulos/cotizaciones/validar";
import { puedeConvertirRequerimiento } from "../../src/nucleo/permisos";
import type { Cliente, Documento, Estado, Proyecto, Usuario } from "../../src/nucleo/tipos";

let fallos = 0;
let casos = 0;
function igual<T>(nombre: string, r: T, esperado: T) {
  casos++;
  if (JSON.stringify(r) !== JSON.stringify(esperado)) {
    fallos++;
    console.log(`✗ ${nombre}: ${JSON.stringify(r)} (esperado ${JSON.stringify(esperado)})`);
  }
}

const it = (descripcion: string, cantidad: number, unidad: string, observacion = "", detalle = ""): ItemRequerimiento => ({ id: `i-${descripcion}`, descripcion, detalle, cantidad, unidad, observacion });

// ── Validación
const vacio = requerimientoVacio("2026-11-03");
igual("en blanco: todo pendiente", faltantesRequerimiento(vacio), ["Cliente", "Qué se requiere (asunto)", "Quién solicita", "Al menos un ítem", "Firma de quien solicita"]);
const lleno: DatosRequerimiento = {
  ...vacio,
  cliente: "Bodegas El Faro Inventado",
  sitio: "Bodega 3",
  asunto: "Materiales para ampliar CCTV",
  solicitante: "Tomás Ficticio",
  cargo: "Técnico",
  items: [it("Instalación de cámara IP", 2, "Unidades", "Muelle de carga"), it("Switch PoE de 8 puertos", 1, "Unidades", "", "Administrable")],
  firmaSolicitante: "data:image/png;base64,x",
};
igual("completo: listo para enviar", faltantesRequerimiento(lleno), []);
igual("ítem sin cantidad", faltantesRequerimiento({ ...lleno, items: [it("Cable", 0, "Metros")] }), ["Ítem 1: cantidad"]);

// ── Ítems escritos en el asistente
const leido = leerItemsRq("4 unidades x Instalación de cámara IP | Bodega norte\n12,5 metros x Cableado UTP categoría 6\n2 x Fuente 12 V");
igual("lee cantidad, unidad, descripción y observación", leido.items.map((i) => [i.cantidad, i.unidad, i.descripcion, i.observacion]), [
  [4, "Unidades", "Instalación de cámara IP", "Bodega norte"],
  [12.5, "Metros", "Cableado UTP categoría 6", ""],
  [2, "Unidades", "Fuente 12 V", ""],
]);
igual("sin errores", leido.errores, []);
igual("toma el detalle del catálogo", leido.items[1].detalle, "Incluye canaleta o tubería EMT");
igual("línea inválida", leerItemsRq("cámaras para la bodega").errores, ["Línea 1: usa «cantidad x descripción»."]);
igual("unidad desconocida", leerItemsRq("3 cajas x Conectores RJ45").errores, ["Línea 1: unidad «cajas» desconocida (usa unidades, metros, puntos, servicios, visitas, horas, global)."]);
const previos = [it("Instalación de cámara IP", 1, "Unidades", "Patio")];
igual("conserva id y observación del ítem anterior", leerItemsRq("3 x instalacion de camara ip", previos).items.map((i) => [i.id, i.cantidad, i.observacion]), [["i-Instalación de cámara IP", 3, "Patio"]]);

// ── Ítems marcados del catálogo
const opciones = ["Instalación de cámara IP", "Visita técnica de diagnóstico"];
const marcados = itemsMarcadosRq([it("Instalación de cámara IP", 5, "Unidades", "Patio"), it("Escalera de 6 m", 1, "Unidades")], ["Visita técnica de diagnóstico"], opciones);
igual("desmarcado del catálogo sale, lo escrito a mano queda y lo nuevo entra con su unidad", marcados.map((i) => [i.descripcion, i.cantidad, i.unidad]), [
  ["Escalera de 6 m", 1, "Unidades"],
  ["Visita técnica de diagnóstico", 1, "Visitas"],
]);

// ── Conversión en cotización
const cliente: Cliente = { id: "c-1", nombre: "Bodegas El Faro Inventado", nit: "900.000.111-2", direccion: "Calle Ficticia 1", contacto: "Rosa Ejemplo", cargo: "Jefe de compras", correo: "compras@faro.example", telefono: "3000000001", sitio: "Bodega 3" };
const proyecto = { id: "p-1", codigo: "PRY-001-26", nombre: "CCTV bodegas" } as Proyecto;
const conv = cotizacionDesdeRequerimiento(lleno, { hoy: "2026-11-03", vendedor: "Gerencia", cliente, proyecto });
igual("ítems: del catálogo con precio de referencia e IVA; fuera del catálogo en 0", conv.datos.items.map((i) => [i.descripcion, i.detalle, i.cantidad, i.unidad, i.precioUnitario, i.ivaPct]), [
  ["Instalación de cámara IP", "Incluye fijación, conectorización y ajuste de visual", 2, "Unidades", 120000, 19],
  ["Switch PoE de 8 puertos", "Administrable", 1, "Unidades", 0, 19],
]);
igual("cuenta con y sin precio", [conv.conPrecio, conv.sinPrecio], [1, 1]);
igual("cliente con los datos del directorio", [conv.datos.cliente, conv.datos.clienteNit, conv.datos.contacto, conv.datos.correo, conv.datos.aceptaNombre, conv.datos.aceptaCargo], [cliente.nombre, cliente.nit, "Rosa Ejemplo", "compras@faro.example", "Rosa Ejemplo", "Jefe de compras"]);
igual("asunto con el sitio", conv.datos.asunto, "Materiales para ampliar CCTV · Bodega 3");
igual("vendedor, fecha y vencimiento a 30 días", [conv.datos.vendedor, conv.datos.fecha, conv.datos.vencimiento], ["Gerencia", "2026-11-03", "2026-12-03"]);
igual("las observaciones internas no pasan al cliente", [conv.datos.observaciones, JSON.stringify(conv.datos).includes("Muelle de carga")], ["", false]);
igual("ids nuevos en las líneas", conv.datos.items.every((i) => i.id.startsWith("cot-")), true);
igual("solo falta el precio del ítem sin catálogo", faltantesCotizacion(conv.datos), ["Ítem 2: precio unitario"]);
const sinCliente = cotizacionDesdeRequerimiento({ ...lleno, sitio: "", asunto: "" }, { hoy: "2026-11-03", vendedor: "Gerencia", proyecto });
igual("cliente escrito a mano y asunto del proyecto", [sinCliente.datos.cliente, sinCliente.datos.contacto, sinCliente.datos.asunto], ["Bodegas El Faro Inventado", "", "CCTV bodegas"]);
const propio = { clave: "propio-switch", descripcion: "Switch PoE de 8 puertos", unidad: "Unidades", precioReferencia: 450000, ivaPct: 19 };
igual("servicio agregado por la empresa: también toma su precio", cotizacionDesdeRequerimiento(lleno, { hoy: "2026-11-03", vendedor: "G", catalogo: [propio] }).datos.items.map((i) => i.precioUnitario), [0, 450000]);
igual("ítems sin descripción no pasan", cotizacionDesdeRequerimiento({ ...lleno, items: [...lleno.items, it(" ", 1, "Unidades")] }, { hoy: "2026-11-03", vendedor: "G" }).datos.items.length, 2);

// ── Quién convierte, una sola vez
const tecnico: Usuario = { id: "u-t", nombre: "Tomás Ficticio", cargo: "Técnico", rol: "tecnico", email: "t@ejemplo.test", activo: true };
const sst: Usuario = { id: "u-s", nombre: "Sara Supuesta", cargo: "Coordinadora SST", rol: "supervisor", email: "s@ejemplo.test", activo: true };
const admin: Usuario = { id: "u-a", nombre: "Gerencia Inventada", cargo: "Gerente", rol: "admin", email: "a@ejemplo.test", activo: true };
const req = (estado: Estado, autorId = tecnico.id): Documento =>
  ({ id: "d-rq", tipo: "requerimiento", codigo: "RQ-001-26", consecutivo: 1, estado, autorId, clienteId: "c-1", creado: "", actualizado: "", historial: [], datos: lleno }) as Documento;
const cot = { id: "d-cot", tipo: "cotizacion", codigo: "COT-001-26", origenId: "d-rq", estado: "borrador" } as Documento;
igual("admin convierte en revisión", puedeConvertirRequerimiento(admin, req("en_revision"), []), true);
igual("admin convierte aprobado", puedeConvertirRequerimiento(admin, req("aprobado"), []), true);
igual("el técnico no convierte", puedeConvertirRequerimiento(tecnico, req("en_revision"), []), false);
igual("SST no convierte (no cotiza)", puedeConvertirRequerimiento(sst, req("aprobado"), []), false);
igual("en borrador no", puedeConvertirRequerimiento(admin, req("borrador"), []), false);
igual("rechazado no", puedeConvertirRequerimiento(admin, req("rechazado"), []), false);
igual("propio en revisión sí (quien cotiza lo aprueba al convertir)", puedeConvertirRequerimiento(admin, req("en_revision", admin.id), []), true);
igual("propio aprobado sí", puedeConvertirRequerimiento(admin, req("aprobado", admin.id), []), true);
igual("propio en borrador no", puedeConvertirRequerimiento(admin, req("borrador", admin.id), []), false);
igual("propio ya convertido no", puedeConvertirRequerimiento(admin, req("en_revision", admin.id), [cot]), false);
igual("el técnico no convierte ni el suyo aprobado", puedeConvertirRequerimiento(tecnico, req("aprobado"), []), false);
igual("ya convertido no", puedeConvertirRequerimiento(admin, req("aprobado"), [cot]), false);
igual("cotizacionDe encuentra la cotización", cotizacionDe("d-rq", [cot])?.codigo, "COT-001-26");
igual("cotizacionDe sin cotización", cotizacionDe("d-otro", [cot]), undefined);
igual("otro tipo no se convierte", puedeConvertirRequerimiento(admin, { ...req("aprobado"), tipo: "reporte" } as Documento, []), false);
igual("evento del historial", CONVERTIDO_EN, "Convertido en cotización");

console.log(fallos ? `\n${fallos} de ${casos} casos fallaron` : `✓ requerimiento: ${casos} casos`);
process.exit(fallos ? 1 : 0);
