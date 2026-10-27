// Pruebas del directorio alimentado desde los formatos (pedido 14 de Magno): nombre comparable,
// clientes nuevos, campos vacíos, desactivados y parecidos (se preguntan). Los casos de claveNombre
// se leen de supabase/tests/10_rls_y_flujo.sql: la app y `public.clave_nombre` deben coincidir. Uso: npx tsx tests/unit/clientes.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { avisoPlan, buscarCliente, claveNombre, completarVacios, mismoNombre, nombreLimpio, planCliente } from "../../src/nucleo/clientes";
import type { Cliente, Documento } from "../../src/nucleo/tipos";

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

console.log(fallos ? `\n${fallos} de ${casos} casos fallaron` : `✓ clientes: ${casos} casos`);
process.exit(fallos ? 1 : 0);
