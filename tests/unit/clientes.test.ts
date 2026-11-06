// Pruebas del directorio alimentado desde los formatos (pedido 14 de Magno): nombre comparable,
// clientes nuevos, campos vacíos, desactivados y parecidos (se preguntan). Los casos de claveNombre
// se leen de supabase/tests/10_rls_y_flujo.sql: la app y `public.clave_nombre` deben coincidir. Uso: npx tsx tests/unit/clientes.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { avisoPlan, buscarCliente, claveNombre, clienteDeObra, completarVacios, digitoVerificacion, mismoNombre, nombreLimpio, normalizarNit, planCliente, planProyectoNuevo, separarCliente } from "../../src/nucleo/clientes";
import { buscarOpcion, comparable, unirOpciones } from "../../src/nucleo/opciones";
import { PERSONAS, contarPorTipo, datoVacio, documentoCliente, ordenarPorTipo, tipoPersonaDe, unirDatos } from "../../src/nucleo/personas";
import type { Cliente, Documento, Proyecto } from "../../src/nucleo/tipos";

let fallos = 0;
let casos = 0;
function igual<T>(nombre: string, r: T, esperado: T) {
  casos++;
  if (JSON.stringify(r) !== JSON.stringify(esperado)) {
    fallos++;
    console.log(`✗ ${nombre}: ${JSON.stringify(r)} (esperado ${JSON.stringify(esperado)})`);
  }
}

const base: Cliente = { id: "c-1", nombre: "Ferretería El Tornillo", nit: "", direccion: "", contacto: "Marta Gómez", cargo: "", correo: "", telefono: "", sitio: "" };
const inactivo: Cliente = { ...base, id: "c-2", nombre: "Centro Logístico Bahía", activo: false };
const clientes = [base, inactivo];
const reporte = (datos: Record<string, string>, clienteId = ""): Documento =>
  ({ id: "d-1", tipo: "reporte", codigo: "RT-001-26", consecutivo: 1, estado: "borrador", autorId: "u", clienteId, creado: "", actualizado: "", historial: [], datos: { cliente: "", direccion: "", personaContactada: "", correo: "", telefono: "", cargo: "", ...datos } }) as unknown as Documento;

// Nombre comparable: mayúsculas, tildes y espacios no cuentan
igual("clave sin tildes ni espacios", claveNombre("  FERRETERÍA   el tornillo "), "ferreteria el tornillo");
igual("ñ y diéresis", claveNombre("Cigüeña Ñoño"), "cigueña ñoño");

// Mismos casos que la base de datos (bloque «casos clave_nombre» de las pruebas SQL)
const sql = readFileSync(join(__dirname, "../../supabase/tests/10_rls_y_flujo.sql"), "utf8");
const bloque = sql.slice(sql.indexOf("-- casos clave_nombre: inicio"), sql.indexOf("-- casos clave_nombre: fin"));
/** Literal E'…' / '…' de PostgreSQL a texto (comillas dobladas, \t y \uXXXX). */
const literal = (t: string, e: boolean) =>
  (e ? t.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\t/g, "\t").replace(/\\\\/g, "\\") : t).replace(/''/g, "'");
const casosSql = [...bloque.matchAll(/\((E?)'((?:[^']|'')*)', '((?:[^']|'')*)'\)/g)].map((m) => [literal(m[2], m[1] === "E"), literal(m[3], false)] as const);
igual("hay casos compartidos con la base", casosSql.length >= 20, true);
for (const [entrada, esperado] of casosSql) igual(`claveNombre(${JSON.stringify(entrada)})`, claveNombre(entrada), esperado);
igual("nombre limpio sin tabulación ni espacio duro", nombreLimpio("Pena\u00a0Hermanos\t"), "Pena Hermanos");
igual("mismo nombre: mayúsculas y espacios", mismoNombre("  FERRETERÍA  el tornillo", "Ferretería El Tornillo"), true);
igual("no es el mismo nombre: sin tilde", mismoNombre("Ferreteria El Tornillo", "Ferretería El Tornillo"), false);
igual("buscar con otra escritura", buscarCliente(clientes, "ferreteria  EL TORNILLO")?.id, "c-1");
igual("buscar inexistente", buscarCliente(clientes, "Otra"), undefined);
igual("buscar vacío", buscarCliente(clientes, "   "), undefined);

// Completar: solo lo vacío y lo válido
const comp = completarVacios(base, { contacto: "Pedro", correo: "compras@tornillo.example", telefono: "12", direccion: "Calle 1" });
igual("no sobrescribe el contacto", comp.cliente.contacto, "Marta Gómez");
igual("llena correo y dirección; no un teléfono inválido", comp.campos, ["direccion", "correo"]);
igual("correo inválido no se completa", completarVacios(base, { correo: "no-es-correo" }).campos, []);

// Plan al guardar
const nuevo = planCliente(clientes, reporte({ cliente: "  Distribuidora  La Ceiba ", personaContactada: "Luis Pérez", cargo: "Compras", correo: "luis@ceiba.example", telefono: "3001234567", direccion: "Cra 5" }), "c-n");
igual("cliente nuevo", nuevo.accion, "crear");
igual("datos del nuevo", nuevo.accion === "crear" && [nuevo.cliente.id, nuevo.cliente.nombre, nuevo.cliente.contacto, nuevo.cliente.cargo, nuevo.cliente.correo, nuevo.cliente.telefono, nuevo.cliente.direccion], ["c-n", "Distribuidora La Ceiba", "Luis Pérez", "Compras", "luis@ceiba.example", "3001234567", "Cra 5"]);
igual("aviso del nuevo", avisoPlan(nuevo), "Guardé «Distribuidora La Ceiba» en el directorio de clientes: la próxima vez se autocompleta.");
const existe = planCliente(clientes, reporte({ cliente: "FERRETERÍA EL TORNILLO", correo: "compras@tornillo.example", personaContactada: "Otro" }), "c-n");
igual("existente: se enlaza y completa", existe.accion === "enlazar" && [existe.cliente.id, existe.campos, existe.cliente.contacto], ["c-1", ["correo"], "Marta Gómez"]);
// Se parece sin ser el mismo nombre (sin tilde, con razón social): se pregunta, no se enlaza ni se crea solo
const parecido = planCliente(clientes, reporte({ cliente: "Ferreteria el Tornillo S.A.S." }), "c-n");
igual("parecido: se pregunta", parecido.accion === "parecido" && parecido.cliente.id, "c-1");
igual("parecido: sin aviso de creación", avisoPlan(parecido), null);
igual("Peña no es Pena", planCliente([{ ...base, id: "c-3", nombre: "Peña Hermanos" }], reporte({ cliente: "Pena Hermanos" }), "c-n").accion, "crear");
igual("desactivado: no se recrea", planCliente(clientes, reporte({ cliente: "centro logistico bahia" }), "c-n").accion, "inactivo");
igual("elegido del directorio: completa ese", planCliente(clientes, reporte({ cliente: "Ferretería El Tornillo", cargo: "Jefe" }, "c-1"), "c-n").accion, "enlazar");
igual("sin nombre: nada", planCliente(clientes, reporte({ cliente: " " }), "c-n").accion, "nada");
igual("sin cambios: sin aviso", avisoPlan(planCliente(clientes, reporte({ cliente: "Ferretería El Tornillo" }), "c-n")), null);
// La legalización de gastos no registra clientes («cliente u obra» puede ser interno)
igual("gasto no registra", planCliente(clientes, { ...reporte({}), tipo: "gasto", datos: { clienteObra: "Administración" } } as unknown as Documento, "c-n").accion, "nada");

// Todo formato con cliente lo registra (pedido de Magno: cliente, reporte, cotización y requerimiento relacionados)
const otroTipo = (tipo: string, datos: Record<string, unknown>, clienteId = "") => ({ ...reporte({}, clienteId), tipo, datos }) as unknown as Documento;
const rq = planCliente(clientes, otroTipo("requerimiento", { cliente: "Constructora Ficticia Delta", sitio: "Bodega 3" }), "c-n");
igual("requerimiento: crea el cliente con su sitio", rq.accion === "crear" && [rq.cliente.nombre, rq.cliente.sitio], ["Constructora Ficticia Delta", "Bodega 3"]);
igual("requerimiento: enlaza el existente", planCliente(clientes, otroTipo("requerimiento", { cliente: "Ferretería El Tornillo", sitio: "" }), "c-n").accion, "enlazar");
const epp = planCliente(clientes, otroTipo("epp", { obra: "Hotel Ficticio Mar Azul · Cocina" }), "c-n");
igual("EPP: el cliente es lo de antes de « · » (sin el sitio)", epp.accion === "crear" && [epp.cliente.nombre, epp.cliente.sitio], ["Hotel Ficticio Mar Azul", ""]);
igual("EPP: área interna no es cliente", planCliente(clientes, otroTipo("epp", { obra: "Sede SOTEC" }), "c-n").accion, "nada");
igual("EPP: parecido se pregunta", planCliente(clientes, otroTipo("epp", { obra: "Ferreteria el tornillo SAS · Patio" }), "c-n").accion, "parecido");
igual("cliente de la obra", ["Sede SOTEC", "Oficina principal", "Administración", "N/A", "Ladrillera Ficticia · Hornos", " Granja  Sol | Galpón 2"].map(clienteDeObra), ["", "", "", "", "Ladrillera Ficticia", "Granja Sol"]);

// Proyecto nuevo desde un formato: con el cliente ya resuelto; no se duplica uno abierto igual
const pry = (x: Partial<Proyecto>): Proyecto => ({ id: "p-1", codigo: "PRY-001-26", consecutivo: 1, nombre: "Ampliación CCTV", clienteId: "c-1", sitio: "", responsableId: "u", fechaInicio: "", estado: "activo", descripcion: "", creado: "", actualizado: "", historial: [], ...x });
const pend = { id: "p-n", nombre: "  Ampliación  cctv ", sitio: "" };
igual("proyecto: sin cliente no se crea", planProyectoNuevo([], pend, "").accion, "nada");
igual("proyecto: nombre corto", planProyectoNuevo([], { ...pend, nombre: "ab" }, "c-1").accion, "nada");
igual("proyecto: cliente sin proyectos → se crea", planProyectoNuevo([], pend, "c-1").accion, "crear");
const igualAbierto = planProyectoNuevo([pry({})], pend, "c-1");
igual("proyecto: uno abierto igual del cliente se enlaza", igualAbierto.accion === "enlazar" && igualAbierto.proyecto.id, "p-1");
igual("proyecto: uno cerrado igual no cuenta", planProyectoNuevo([pry({ estado: "cerrado" })], pend, "c-1").accion, "crear");
igual("proyecto: el de otro cliente no cuenta", planProyectoNuevo([pry({ clienteId: "c-9" })], pend, "c-1").accion, "crear");
igual("proyecto: guardado dos veces (mismo id) se enlaza", planProyectoNuevo([pry({ id: "p-n", nombre: "Otro nombre" })], pend, "c-1").accion, "enlazar");

// Nombre pegado con otros datos (caso típico: «* Razón social: FARO ANDINO S.A.S. * NIT: 900123456»)
const sep = (t: string) => {
  const r = separarCliente(t);
  return [r.nombre, r.nit];
};
igual("FARO ANDINO con viñetas y etiquetas", sep("* Razón social: FARO ANDINO S.A.S. * NIT: 900123456"), ["FARO ANDINO S.A.S.", "900.123.456"]);
igual("FARO ANDINO en dos líneas con DV", sep("Razón social: FARO ANDINO S.A.S.\nNIT: 900.123.456-8"), ["FARO ANDINO S.A.S.", "900.123.456-8"]);
igual("FARO ANDINO pegado en un campo (el navegador quita el salto de línea)", sep("Razón social: FARO ANDINO S.A.S.NIT: 900123456"), ["FARO ANDINO S.A.S.", "900.123.456"]);
igual("NIT al final sin dos puntos", sep("FARO ANDINO S.A.S. NIT 900123456-8"), ["FARO ANDINO S.A.S.", "900.123.456-8"]);
igual("guion y «Nit.»", sep("FARO ANDINO S.A.S - Nit. 900.123.456-8"), ["FARO ANDINO S.A.S", "900.123.456-8"]);
igual("NIT al inicio", sep("NIT 900123456 Constructora ABC SAS"), ["Constructora ABC SAS", "900.123.456"]);
igual("solo viñeta", sep("• FARO ANDINO S.A.S."), ["FARO ANDINO S.A.S.", ""]);
igual("etiqueta «Cliente:»", sep("Cliente: Conjunto Los Robles"), ["Conjunto Los Robles", ""]);
const ficha = separarCliente("Datos del cliente:\n• Razón social: Ferretería El Tornillo Ltda.\n• NIT: 800.123.456-5\n• Dirección: Cra 5 # 10-20\n• Teléfono: 300 123 4567\n• Correo: compras@tornillo.co");
igual("ficha completa: nombre, NIT y otros datos", [ficha.nombre, ficha.nit, ficha.otros], ["Ferretería El Tornillo Ltda.", "800.123.456-5", { direccion: "Cra 5 # 10-20", telefono: "300 123 4567", correo: "compras@tornillo.co" }]);
igual("aviso «Separé el NIT…»", separarCliente("* Razón social: FARO ANDINO S.A.S. * NIT: 900123456").aviso?.startsWith("Separé el NIT 900.123.456"), true);
igual("DV equivocado: se avisa", separarCliente("FARO ANDINO S.A.S. NIT 900.123.456-1").aviso?.includes("debería ser 8"), true);
for (const n of ["Ferretería El Tornillo", "Hotel Las Américas - Sede Norte", "Ladrillera Arcillas del Caribe · Proyecto CCTV", "Peña & Hijos S. en C."])
  igual(`nombre normal sin cambios: ${n}`, [separarCliente(n).nombre, separarCliente(n).cambio], [n, false]);
igual("dígito de verificación DIAN", [digitoVerificacion("900123456"), digitoVerificacion("860002964")], [8, 4]);
igual("NIT con puntos", normalizarNit("900123456").nit, "900.123.456");
igual("C.C. de 10 dígitos", normalizarNit("1047123456").nit, "1.047.123.456");
igual("NIT ilegible queda igual", normalizarNit("en trámite").nit, "en trámite");

// Listas con «＋ Agregar otro»: sin mayúsculas, tildes ni espacios de más; la ñ cuenta
igual("comparable sin tildes", comparable("  ALIMENTACIÓN  extra "), "alimentacion extra");
igual("ñ no es n", comparable("Señal") === comparable("Senal"), false);
igual("buscar opción existente", buscarOpcion(["Alimentación", "Peajes"], "alimentacion"), "Alimentación");
igual("unir sin repetir y «Otro» al final", unirOpciones(["Transporte", "Otro"], ["transporte", " Peajes  "], ["Parqueadero"]), ["Transporte", "Peajes", "Parqueadero", "Otro"]);

// Persona jurídica o natural (pedido de Magno): sin tipo cuenta como jurídica; el documento cambia de etiqueta
const natural: Cliente = { ...base, id: "c-n1", nombre: "Rosa Inventada Pérez", nit: "1.234.567.890", tipoPersona: "natural" };
igual("sin tipo: jurídica", tipoPersonaDe(base), "juridica");
igual("natural", tipoPersonaDe(natural), "natural");
igual("tipo desconocido: jurídica", tipoPersonaDe({ tipoPersona: "otra" as never }), "juridica");
igual("documento de la natural: C.C.", documentoCliente(natural), "C.C. 1.234.567.890");
igual("documento de la jurídica: NIT", documentoCliente({ ...base, nit: "901.624.955" }), "NIT 901.624.955");
igual("sin documento: vacío", documentoCliente(base), "");
igual("etiquetas del formulario", [PERSONAS.juridica.documentoLargo, PERSONAS.natural.documentoLargo, PERSONAS.juridica.nombre, PERSONAS.natural.nombre], ["NIT", "Cédula", "Razón social", "Nombre completo"]);
igual("conteo por tipo", contarPorTipo([base, inactivo, natural]), { todos: 3, juridica: 2, natural: 1 });
igual("jurídicos primero, en su orden", ordenarPorTipo([natural, base, inactivo]).map((c) => c.id), ["c-1", "c-2", "c-n1"]);

// Datos unidos sin separadores sueltos (DAGAR S.A.S, Fortox, VS TURBACO: sin contacto ni cargo)
igual("sin contacto ni cargo: solo el NIT", unirDatos(["", " ", "NIT 901624955"]), "NIT 901624955");
igual("puntos y guiones sueltos no cuentan", unirDatos([".", "-", "·", "Calle 5 # 3-20", undefined, null]), "Calle 5 # 3-20");
igual("todo vacío: cadena vacía", unirDatos(["", ".", undefined]), "");
igual("con todo", unirDatos(["Marta Gómez", "Compras", "NIT 1"]), "Marta Gómez · Compras · NIT 1");
igual("recorta espacios", unirDatos(["  Ana  ", "3001234567 "]), "Ana · 3001234567");
igual("dato vacío", [datoVacio(" . "), datoVacio("Ñ"), datoVacio("7")], [true, false, false]);

console.log(fallos ? `\n${fallos} de ${casos} casos fallaron` : `✓ clientes: ${casos} casos`);
process.exit(fallos ? 1 : 0);
