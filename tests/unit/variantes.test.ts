// Pruebas de las variantes de formato (pedido de Magno: «Servicios Fortox» sale en el formato de Fortox):
// cómo se elige la variante (proyecto > cliente > SOTEC), qué tipos de documento cubre, el control
// documental, las etiquetas y la serie del consecutivo. Uso: npx tsx tests/unit/variantes.test.ts
import {
  TIPOS_PROYECTO_BASE,
  VARIANTE_BASE,
  VARIANTES,
  etiquetaEnVariante,
  formatoEnVariante,
  prefijoVariante,
  resolverVariante,
  formatosPara,
  varianteDeNombreCliente,
  serieConsecutivo,
  tiposProyectoDe,
  varianteDe,
  varianteDeTipoProyecto,
  varianteParaTipo,
} from "../../src/nucleo/variantes";
import type { InfoFormato } from "../../src/modulos/contrato";

let fallos = 0;
let casos = 0;
function igual<T>(nombre: string, r: T, esperado: T) {
  casos++;
  if (JSON.stringify(r) !== JSON.stringify(esperado)) {
    fallos++;
    console.log(`✗ ${nombre}: ${JSON.stringify(r)} (esperado ${JSON.stringify(esperado)})`);
  }
}

const config = {}; // sin tipos propios: los de fábrica
const base0 = (): InfoFormato => ({ codigo: "FO-GSST-22", nombre: "Formato de reporte técnico", version: "01", fecha: "01/03/2020", corto: "Reporte técnico", el: "el", nuevo: "Nuevo", plural: "reportes" });
const fortox = { tipo: "Servicios Fortox" };
const sotec = { tipo: "Servicios SOTEC" };

// Registro
igual("SOTEC es la base", VARIANTE_BASE, "sotec");
igual("existe FORTOX", VARIANTES.some((v) => v.clave === "fortox"), true);
igual("clave desconocida → SOTEC", varianteDe("otra").clave, "sotec");
igual("documento antiguo sin variante → SOTEC", varianteDe(undefined).clave, "sotec");
igual("FORTOX ya no es provisional (formato oficial)", varianteDe("fortox").provisional, undefined);
igual("FORTOX con su logo", varianteDe("fortox").logo, "/variantes/fortox-logo.png");
igual("FORTOX con hoja propia", varianteDe("fortox").hoja, "fortox");

// Tipos de proyecto
igual("tipos de fábrica", tiposProyectoDe(config).map((t) => t.nombre), ["Servicios SOTEC", "Servicios Fortox", "Servicios Sevin", "Obra La Clay"]);
igual("tipos propios de Configuración", tiposProyectoDe({ tiposProyecto: [{ nombre: "Servicios Otra", variante: "fortox" }] }).map((t) => t.nombre), ["Servicios Otra"]);
igual("lista propia vacía → la de fábrica", tiposProyectoDe({ tiposProyecto: [] }), TIPOS_PROYECTO_BASE);
igual("tipo sin importar mayúsculas", varianteDeTipoProyecto(config, "  servicios fortox "), "fortox");
igual("tipo desconocido", varianteDeTipoProyecto(config, "Nada"), undefined);

// Resolución: proyecto > cliente > SOTEC
igual("proyecto Fortox → fortox", resolverVariante({ tipo: "reporte", proyecto: fortox, config }), "fortox");
igual("proyecto SOTEC → sotec", resolverVariante({ tipo: "reporte", proyecto: sotec, config }), "sotec");
igual("sin proyecto ni cliente → sotec", resolverVariante({ tipo: "reporte", config }), "sotec");
igual("cliente con formato Fortox sin proyecto → fortox", resolverVariante({ tipo: "reporte", cliente: { variante: "fortox" }, config }), "fortox");
igual("el proyecto manda sobre el cliente", resolverVariante({ tipo: "reporte", proyecto: sotec, cliente: { variante: "fortox" }, config }), "sotec");
igual("proyecto antiguo sin tipo → el del cliente", resolverVariante({ tipo: "reporte", proyecto: {}, cliente: { variante: "fortox" }, config }), "fortox");
igual("tipo de proyecto que ya no existe → el del cliente", resolverVariante({ tipo: "reporte", proyecto: { tipo: "Borrado" }, cliente: { variante: "fortox" }, config }), "fortox");
igual("FORTOX no cubre los gastos → sotec", resolverVariante({ tipo: "gasto", proyecto: fortox, config }), "sotec");
igual("FORTOX no cubre la cotización → sotec", varianteParaTipo("cotizacion", "fortox").clave, "sotec");
igual(
  "tipo propio que apunta a FORTOX",
  resolverVariante({ tipo: "reporte", proyecto: { tipo: "Servicios Otra" }, config: { tiposProyecto: [{ nombre: "Servicios Otra", variante: "fortox" }] } }),
  "fortox",
);

// Sin proyecto: el técnico elige el servicio («Sin proyecto · Servicios Fortox»)
igual("lo elegido manda sobre el cliente", resolverVariante({ tipo: "reporte", cliente: { variante: "sotec" }, config, elegida: "fortox" }), "fortox");
igual("lo elegido manda sobre el proyecto", resolverVariante({ tipo: "reporte", proyecto: sotec, config, elegida: "fortox" }), "fortox");
igual("elegida Fortox en un gasto → sotec", resolverVariante({ tipo: "gasto", config, elegida: "fortox" }), "sotec");
igual("formatos del reporte", formatosPara("reporte").map((v) => v.etiqueta), ["Servicios SOTEC", "Servicios Fortox", "Servicios Sevin"]);
igual("el gasto no ofrece elegir formato", formatosPara("gasto"), []);

// Control documental y etiquetas
const base: InfoFormato = { codigo: "FO-GSST-22", nombre: "Formato de reporte técnico", version: "01", fecha: "01/03/2020", corto: "Reporte técnico", el: "el", nuevo: "Nuevo", plural: "reportes" };
igual("SOTEC conserva el formato del módulo", formatoEnVariante(base, "reporte", "sotec"), base);
igual("sin variante conserva el formato", formatoEnVariante(base, "reporte", undefined), base);
const ff = formatoEnVariante(base, "reporte", "fortox");
igual("FORTOX: FORMA 7PA/F1-15", ff.codigo, "7PA/F1-15");
igual("FORTOX: nombre corto y concordancia del módulo", [ff.corto, ff.el, ff.plural], ["Reporte técnico", "el", "reportes"]);
igual("FORTOX en un gasto: el formato SOTEC", formatoEnVariante({ ...base, codigo: "FO-GSST-25" }, "gasto", "fortox").codigo, "FO-GSST-25");
igual("etiqueta sin cambio", etiquetaEnVariante("reporte", "fortox", "Cliente"), "Cliente");

// Consecutivos: por defecto, la misma serie del módulo
igual("FORTOX sin prefijo propio", prefijoVariante("reporte", "fortox"), undefined);
igual("serie de SOTEC", serieConsecutivo("reporte", "sotec", "2026"), "reporte-2026");
igual("FORTOX sigue la serie RT", serieConsecutivo("reporte", "fortox", "2026"), "reporte-2026");
// Con prefijo propio, serie aparte (se simula agregándolo a la variante en memoria)
const v = varianteDe("fortox");
const antes = v.formatos.reporte!.prefijo;
v.formatos.reporte!.prefijo = "RTF";
igual("con prefijo propio: serie aparte", serieConsecutivo("reporte", "fortox", "2026"), "reporte.fortox-2026");
igual("con prefijo propio: el prefijo", prefijoVariante("reporte", "fortox"), "RTF");
v.formatos.reporte!.prefijo = antes;

// LA CLAY: «Matriz Entrega de EPP's» (solo la entrega de EPP; el reporte sigue como estaba)
const laClay = { tipo: "Obra La Clay" };
igual("existe LA CLAY con su logo y hoja", [varianteDe("laclay").logo, varianteDe("laclay").hoja], ["/variantes/laclay-logo.png", "laclay"]);
igual("LA CLAY cubre la entrega de EPP", varianteParaTipo("epp", "laclay").clave, "laclay");
igual("LA CLAY no cubre el reporte", varianteParaTipo("reporte", "laclay").clave, "sotec");
igual("formatos de la entrega de EPP", formatosPara("epp").map((v) => v.etiqueta), ["Servicios SOTEC", "Ladrillera La Clay"]);
igual("el reporte no ofrece La Clay", formatosPara("reporte").some((v) => v.clave === "laclay"), false);
igual("nombre «Ladrillera La Clay S.A.S.» → laclay", varianteDeNombreCliente("Ladrillera La Clay S.A.S."), "laclay");
igual("nombre en minúsculas y con obra → laclay", varianteDeNombreCliente("ladrillera la clay · Planta 2"), "laclay");
igual("«LaClay» junto → laclay", varianteDeNombreCliente("LaClay"), "laclay");
igual("«Arcillas del Caribe» no es La Clay", varianteDeNombreCliente("Ladrillera Arcillas del Caribe"), undefined);
igual("«Clayton» no es La Clay", varianteDeNombreCliente("Clayton Ltda."), undefined);
igual("EPP del cliente La Clay → laclay", resolverVariante({ tipo: "epp", cliente: { nombre: "Ladrillera La Clay S.A.S." }, config }), "laclay");
igual("reporte del cliente La Clay → sotec", resolverVariante({ tipo: "reporte", cliente: { nombre: "Ladrillera La Clay S.A.S." }, config }), "sotec");
igual("EPP de un proyecto «Obra La Clay» → laclay", resolverVariante({ tipo: "epp", proyecto: laClay, config }), "laclay");
igual("reporte de un proyecto «Obra La Clay» → sotec", resolverVariante({ tipo: "reporte", proyecto: laClay, config }), "sotec");
igual("reporte de un proyecto «Obra La Clay» con cliente Fortox → fortox", resolverVariante({ tipo: "reporte", proyecto: laClay, cliente: { variante: "fortox" }, config }), "fortox");
igual("EPP de un proyecto Fortox del cliente La Clay → laclay (Fortox no cubre la EPP)", resolverVariante({ tipo: "epp", proyecto: fortox, cliente: { nombre: "Ladrillera La Clay" }, config }), "laclay");
igual("EPP de un proyecto SOTEC del cliente La Clay → sotec (manda el proyecto)", resolverVariante({ tipo: "epp", proyecto: sotec, cliente: { nombre: "Ladrillera La Clay" }, config }), "sotec");
igual("EPP con formato elegido SOTEC → sotec", resolverVariante({ tipo: "epp", cliente: { nombre: "Ladrillera La Clay" }, config, elegida: "sotec" }), "sotec");
igual("cliente con formato por defecto La Clay en un reporte → su nombre o SOTEC", resolverVariante({ tipo: "reporte", cliente: { variante: "laclay", nombre: "Sevin Ltda." }, config }), "sevin");
const fl = formatoEnVariante({ ...base, codigo: "FO-GSST-?? por confirmar", nombre: "Registro de entrega de elementos de protección personal" }, "epp", "laclay");
igual("LA CLAY: control documental (código en blanco, versión 0)", [fl.nombre, fl.codigo, fl.version, fl.fecha], ["Matriz Entrega de EPP's", "", "0", "5/05/2026"]);
igual("LA CLAY sigue la serie EPP", serieConsecutivo("epp", "laclay", "2026"), "epp-2026");

console.log(fallos ? `\n${fallos} de ${casos} casos fallaron` : `✓ variantes: ${casos} casos`);
process.exit(fallos ? 1 : 0);
