// Pruebas del acta de entrega de Fortox (FORMA 7PA/F1-13): formato propio del cliente (variante
// dueña, nombre en el menú, aviso si el cliente no es de Fortox), lectura de las tablas del
// asistente (materiales, zonas, particiones, usuarios), validación, autollenado del cliente y
// las claves del panel (enmascarar, quitar, quién las ve, duplicar sin claves, búsqueda).
// Datos ficticios. Uso: npx tsx tests/unit/acta.test.ts
// El registro primero (resuelve el ciclo módulos ↔ plantillas, como la app)
import { datosPara, infoDoc, textoBusqueda, tituloDoc } from "../../src/modulos/registro";
import { actaVacia, casillasFecha, leerMateriales, leerParticiones, leerUsuarios, leerZonas, lineaMaterial, lineaUsuario, lineaZona } from "../../src/modulos/actas/catalogo";
import { MASCARA, conClavesOcultas, cuantasClaves, enmascarar, sinClaves, validarClave } from "../../src/modulos/actas/claves";
import { ciudadDeDireccion, moduloActas } from "../../src/modulos/actas";
import type { DatosActa } from "../../src/modulos/actas/tipos";
import { faltantesActa } from "../../src/modulos/actas/validar";
import { puedeCrearTipo, puedeVerDoc, puedeVerSensibles } from "../../src/nucleo/permisos";
import type { Cliente, Documento, Usuario } from "../../src/nucleo/tipos";
import { TIPOS_PROYECTO_BASE, cubre, esDelPropietario, formatoEnVariante, formatosPara, nombreTipo, propietarioDe, resolverVariante, varianteDe, varianteParaTipo } from "../../src/nucleo/variantes";

let fallos = 0;
let casos = 0;
function igual<T>(nombre: string, r: T, esperado: T) {
  casos++;
  if (JSON.stringify(r) !== JSON.stringify(esperado)) {
    fallos++;
    console.log(`✗ ${nombre}: ${JSON.stringify(r)} (esperado ${JSON.stringify(esperado)})`);
  }
}

// ── Formato propio de Fortox (registro de variantes)
const config = { tiposProyecto: TIPOS_PROYECTO_BASE };
igual("el acta es de Fortox", propietarioDe("acta")?.clave, "fortox");
igual("el reporte no es formato propio de nadie", propietarioDe("reporte"), undefined);
igual("SOTEC no cubre el acta", cubre(varianteDe("sotec"), "acta"), false);
igual("SOTEC sigue cubriendo el reporte", cubre(varianteDe("sotec"), "reporte"), true);
igual("sin variante el acta sale como Fortox", varianteParaTipo("acta", undefined).clave, "fortox");
igual("pedida SOTEC, el acta sigue en Fortox", varianteParaTipo("acta", "sotec").clave, "fortox");
igual("pedida Sevin, el acta sigue en Fortox", varianteParaTipo("acta", "sevin").clave, "fortox");
igual("resolver: proyecto SOTEC → Fortox igual", resolverVariante({ tipo: "acta", proyecto: { tipo: "Servicios SOTEC" }, config }), "fortox");
igual("resolver: elegida Sevin → Fortox igual", resolverVariante({ tipo: "acta", config, elegida: "sevin" }), "fortox");
igual("el acta no pregunta el formato", formatosPara("acta"), []);
igual("el reporte sigue ofreciendo formatos", formatosPara("reporte").map((v) => v.clave), ["sotec", "fortox", "sevin"]);
igual("control documental de Fortox", formatoEnVariante(infoDoc("acta").formato, "acta", "fortox").codigo, "7PA/F1-13");
igual("nombre en el menú", nombreTipo("acta", "Acta de entrega"), "Acta de entrega (Fortox)");
igual("un formato de SOTEC no lleva dueño", nombreTipo("reporte", "Reporte técnico"), "Reporte técnico");
igual("cliente de Fortox por el proyecto", esDelPropietario({ tipo: "acta", proyecto: { tipo: "Servicios Fortox" }, cliente: { nombre: "Centro Comercial Inventado" }, config }).coincide, true);
igual("cliente de Fortox por su formato", esDelPropietario({ tipo: "acta", cliente: { nombre: "Bodega Inventada", variante: "fortox" }, config }).coincide, true);
igual("cliente de Fortox por el nombre", esDelPropietario({ tipo: "acta", cliente: { nombre: "Oficina Fortox Cartagena" }, config }).coincide, true);
igual("cliente que no es de Fortox → aviso", esDelPropietario({ tipo: "acta", proyecto: { tipo: "Servicios SOTEC" }, cliente: { nombre: "Panadería La Espiga Ficticia" }, config }).coincide, false);
igual("en un formato de SOTEC no hay aviso", esDelPropietario({ tipo: "reporte", cliente: { nombre: "Panadería" }, config }), { coincide: true });

// ── Tablas del asistente
const m = leerMateriales("Sensor de movimiento PIR | 4 | 4 | 0\nContacto magnético | 6 | 5 | 1\n- Sirena 30 W | 1");
igual("materiales leídos", m.materiales.map((x) => [x.descripcion, x.despacho, x.instalado, x.reintegro]), [["Sensor de movimiento PIR", "4", "4", "0"], ["Contacto magnético", "6", "5", "1"], ["Sirena 30 W", "1", "", ""]]);
igual("materiales sin errores", m.errores, []);
igual("material: cantidad no numérica", leerMateriales("Cable | cuatro").errores, ["Línea 1: las cantidades deben ser números."]);
igual("material: más de 12 renglones", leerMateriales(Array.from({ length: 13 }, (_, k) => `Ítem ${k}`).join("\n")).errores, ["El formato trae 12 renglones de materiales (escribiste 13)."]);
igual("material: conserva el id", leerMateriales("sensor de movimiento pir | 5", m.materiales).materiales[0].id, m.materiales[0].id);
igual("línea de material", lineaMaterial(m.materiales[2]), "Sirena 30 W | 1");

const z = leerZonas("3 | 1 | Ventana cocina | 2\n1 | 2 | Puerta principal | 1\n2 | Sensor sala");
igual("zonas ordenadas", z.zonas.map((x) => [x.numero, x.cantidad, x.descripcion, x.particion]), [[1, "2", "Puerta principal", "1"], [2, "", "Sensor sala", ""], [3, "1", "Ventana cocina", "2"]]);
igual("zonas sin errores", z.errores, []);
igual("zona 37 no existe", leerZonas("37 | 1 | Patio").errores, ["Línea 1: la zona debe ser un número de 1 a 36."]);
igual("zona repetida", leerZonas("1 | Puerta\n1 | Ventana").errores, ["Línea 2: la zona 1 está repetida."]);
igual("partición 9 no existe", leerZonas("1 | 1 | Puerta | 9").errores, ["Línea 1: la partición debe ser de 1 a 8."]);
igual("línea de zona", lineaZona(z.zonas[0]), "1 | 2 | Puerta principal | 1");

const p = leerParticiones("1 | Oficinas\n3 | Bodega\nParqueadero");
igual("particiones por número y en orden", p.particiones, ["Oficinas", "", "Bodega", "Parqueadero", "", "", "", ""]);
igual("partición 9", leerParticiones("9 | Azotea").errores, ["Línea 1: la partición debe ser de 1 a 8."]);

const u = leerUsuarios("Ana Inventada Gómez | Administradora | 01 | 6051234 | 3001234567\nLuis Ficticio | Vigilante | 02");
igual("usuarios leídos", u.usuarios.map((x) => [x.nombre, x.cargo, x.usuario, x.telefono, x.celular, x.claveTelefonica]), [["Ana Inventada Gómez", "Administradora", "01", "6051234", "3001234567", ""], ["Luis Ficticio", "Vigilante", "02", "", "", ""]]);
igual("la clave no va en la línea", leerUsuarios("Ana | Adm | 01 | 1234 | 605 | 300").errores, ["Línea 1: sobran columnas; la clave telefónica se pide en el paso siguiente (oculta)."]);
const conClave = u.usuarios.map((x, k) => ({ ...x, claveTelefonica: k ? "" : "7315" }));
igual("al releer, el usuario conserva su clave", leerUsuarios("ana inventada gómez | Gerente | 01", conClave).usuarios[0].claveTelefonica, "7315");
igual("línea de usuario sin clave", lineaUsuario(conClave[0]).includes("7315"), false);
igual("casillas de la fecha", casillasFecha("2026-11-17"), ["26", "11", "17"]);

// ── Validación
const vacia = actaVacia("2026-11-17");
igual("en blanco: lo mínimo pendiente", faltantesActa(vacia), ["Ciudad", "Nombre del cliente", "Cliente nuevo o adición", "Dirección", "Tipo de sistema", "Nombre del técnico", "Firma del cliente"]);
const lista: DatosActa = {
  ...vacia,
  ciudad: "Cartagena",
  cliente: "Centro Comercial Inventado",
  tipoActa: "Cliente Nuevo",
  direccion: "Calle Ficticia 1 # 2-3",
  sistemas: ["Alarma"],
  tecnico: "Técnico Ficticio",
  firmaCliente: "data:image/png;base64,AAAA",
  nombreFirmaCliente: "Persona Inventada",
  cedulaFirmaCliente: "1000000099",
  claveMaestra: "9137",
  claveInstalador: "8642",
  usuarios: conClave,
  zonas: z.zonas,
  materiales: m.materiales,
};
igual("diligenciada: lista", faltantesActa(lista), []);
igual("firmada sin C.C.", faltantesActa({ ...lista, cedulaFirmaCliente: "" }), ["Nombre y C.C. de quien firma"]);
igual("clave con letras", faltantesActa({ ...lista, claveMaestra: "12ab" }), ["Clave maestra: de 4 a 8 dígitos"]);
igual("clave telefónica corta", faltantesActa({ ...lista, usuarios: [{ ...conClave[0], claveTelefonica: "12" }] }), ["Usuario 1: clave telefónica de 4 a 8 dígitos"]);
igual("las faltas nunca dicen la clave", faltantesActa({ ...lista, claveMaestra: "12ab" }).join(" ").includes("12ab"), false);
igual("validar clave", [validarClave(""), validarClave("1234"), validarClave("123456789"), validarClave("12a4")], [null, null, "La clave debe tener de 4 a 8 dígitos.", "La clave debe tener de 4 a 8 dígitos."]);

// ── Autollenado y asistente
const cliente: Cliente = { id: "c-x", nombre: "Centro Comercial Inventado", nit: "900.000.111-2", direccion: "Av. Ficticia 10, Cartagena", contacto: "Rosa Inventada", cargo: "Jefe de seguridad", correo: "seguridad@inventado.example", telefono: "3000000001", sitio: "" };
const auto = moduloActas.alElegirCliente(cliente).cambio;
igual("autollena contacto del directorio", [auto.cliente, auto.nit, auto.direccion, auto.ciudadCliente, auto.contacto, auto.cargo, auto.correo, auto.telefono], [cliente.nombre, cliente.nit, cliente.direccion, "Cartagena", cliente.contacto, cliente.cargo, cliente.correo, cliente.telefono]);
igual("ciudad de una dirección sin coma", ciudadDeDireccion("Zona Franca"), "");
igual("datos para el directorio", moduloActas.datosCliente!(lista).nombre, "Centro Comercial Inventado");
igual("aplicar claves", moduloActas.aplicar("claves", ["2468", "1357"], vacia).cambio, { claveMaestra: "2468", claveInstalador: "1357" });
igual("aplicar claves: sin mensaje en el chat", moduloActas.aplicar("claves", ["2468", "1357"], vacia).mensaje, undefined);
const conUs = { ...vacia, usuarios: u.usuarios };
igual("aplicar claves de usuarios", moduloActas.aplicar("clavesUsuarios", ["1111", ""], conUs).cambio.usuarios!.map((x) => x.claveTelefonica), ["1111", ""]);
igual("aplicar firma con C.C.", moduloActas.aplicar("firmaCliente", ["Rosa Inventada", "1.000.000.123"], vacia).cambio, { nombreFirmaCliente: "Rosa Inventada", cedulaFirmaCliente: "1.000.000.123" });
igual("aplicar zonas en bloque", moduloActas.aplicar("zonas", "1 | 2 | Puerta principal | 1", vacia).cambio.zonas!.length, 1);
igual("aplicar zonas con error no cambia", moduloActas.aplicar("zonas", "40 | Patio", vacia).cambio, {});
igual("aplicar días", moduloActas.aplicar("apertura", ["Lunes", "Inventado", "Sábado"], vacia).cambio, { apertura: ["Lunes", "Sábado"] });
const pasos = moduloActas.pasos({ datos: vacia, clientes: [cliente], usuarioNombre: "Técnico Ficticio", hoy: "2026-11-17" });
igual("el asistente empieza por el cliente", pasos[0].id, "cliente");
igual("firma del cliente pide la C.C.", pasos.find((x) => x.id === "firmaCliente")?.firmante?.etiquetaCargo, "C.C.");
igual("las claves no son un texto visible", pasos.filter((x) => /clave/i.test(x.id)).map((x) => x.tipo), ["componente", "componente"]);

// ── Claves: enmascarar, quitar, quién las ve
igual("máscara", [enmascarar("1234"), enmascarar(""), enmascarar("  ")], [MASCARA, "", ""]);
const oculta = conClavesOcultas(lista);
igual("ocultas", [oculta.claveMaestra, oculta.claveInstalador, oculta.usuarios[0].claveTelefonica, oculta.usuarios[1].claveTelefonica], [MASCARA, MASCARA, MASCARA, ""]);
igual("ocultas: nada de la clave en el texto", JSON.stringify(oculta).includes("9137") || JSON.stringify(oculta).includes("7315"), false);
const quitada = sinClaves(lista);
igual("sin claves", [quitada.claveMaestra, quitada.claveInstalador, quitada.usuarios[0].claveTelefonica], ["", "", ""]);
igual("cuántas claves", cuantasClaves(lista), 3);
igual("el original no cambia", lista.claveMaestra, "9137");

const doc = { id: "d-act", tipo: "acta", codigo: "ACT-001-26", consecutivo: 1, estado: "aprobado", autorId: "u-tec1", clienteId: "c-x", creado: "2026-11-17", actualizado: "2026-11-17", historial: [], datos: lista } as Documento;
igual("búsqueda: sin la clave", textoBusqueda(doc).includes("9137") || textoBusqueda(doc).includes("8642") || textoBusqueda(doc).includes("7315"), false);
igual("búsqueda: con el cliente", textoBusqueda(doc).includes("centro comercial inventado"), true);
igual("título sin claves", tituloDoc(doc), "Centro Comercial Inventado · Alarma");
const dup = moduloActas.duplicar!(lista, "2026-11-18");
igual("duplicar: sin claves ni firma", [dup.claveMaestra, dup.usuarios[0].claveTelefonica, dup.firmaCliente, dup.fecha], ["", "", "", "2026-11-18"]);

const us = (id: string, rol: Usuario["rol"], clienteId?: string): Usuario => ({ id, nombre: id, cargo: "", rol, email: "", activo: true, clienteId });
const autor = us("u-tec1", "tecnico");
const otroTec = us("u-tec2", "tecnico");
const sup = us("u-sup", "supervisor");
const adm = us("u-adm", "admin");
const cli = us("u-cli", "cliente", "c-x");
igual("ven las claves: autor, coordinación y administración", [autor, sup, adm].map((x) => puedeVerSensibles(x, doc)), [true, true, true]);
igual("no las ven: otro técnico ni el cliente", [otroTec, cli].map((x) => puedeVerSensibles(x, doc)), [false, false]);
igual("el cliente ve el acta aprobada en su portal", puedeVerDoc(cli, doc), true);
igual("el cliente no ve el acta en borrador", puedeVerDoc(cli, { ...doc, estado: "borrador" } as Documento), false);
igual("datos para el cliente: enmascarados", (datosPara(doc, false) as DatosActa).claveMaestra, MASCARA);
igual("datos para el autor: tal cual", (datosPara(doc, true) as DatosActa).claveMaestra, "9137");
igual("otros formatos no cambian", datosPara({ tipo: "reporte", datos: { cliente: "x" } } as unknown as Documento, false), { cliente: "x" } as unknown as Documento["datos"]);
igual("crean el acta: técnico, coordinación y administración", [autor, sup, adm, cli].map((x) => puedeCrearTipo(x.rol, "acta")), [true, true, true, false]);
igual("prefijo", infoDoc("acta").prefijo, "ACT");
igual("cierre", [infoDoc("acta").flujo.cierre, infoDoc("acta").etiquetasEstado.cerrado], ["revisor", "Entregada a Fortox"]);

console.log(fallos ? `\n${fallos} de ${casos} casos fallaron` : `✓ acta: ${casos} casos`);
process.exit(fallos ? 1 : 0);
