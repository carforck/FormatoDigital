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
const fortox = { tipo: "Servicios Fortox" };
const sotec = { tipo: "Servicios SOTEC" };

// Registro
igual("SOTEC es la base", VARIANTE_BASE, "sotec");
igual("existe FORTOX", VARIANTES.some((v) => v.clave === "fortox"), true);
igual("clave desconocida → SOTEC", varianteDe("otra").clave, "sotec");
igual("documento antiguo sin variante → SOTEC", varianteDe(undefined).clave, "sotec");
igual("FORTOX está marcado como provisional (sin datos oficiales)", varianteDe("fortox").provisional, true);
igual("FORTOX no inventa logo", varianteDe("fortox").logo, undefined);

// Tipos de proyecto
igual("tipos de fábrica", tiposProyectoDe(config).map((t) => t.nombre), ["Servicios SOTEC", "Servicios Fortox"]);
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

// Control documental y etiquetas
const base: InfoFormato = { codigo: "FO-GSST-22", nombre: "Formato de reporte técnico", version: "01", fecha: "01/03/2020", corto: "Reporte técnico", el: "el", nuevo: "Nuevo", plural: "reportes" };
igual("SOTEC conserva el formato del módulo", formatoEnVariante(base, "reporte", "sotec"), base);
igual("sin variante conserva el formato", formatoEnVariante(base, "reporte", undefined), base);
const ff = formatoEnVariante(base, "reporte", "fortox");
igual("FORTOX: código por confirmar", ff.codigo, "por confirmar");
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

console.log(fallos ? `\n${fallos} de ${casos} casos fallaron` : `✓ variantes: ${casos} casos`);
process.exit(fallos ? 1 : 0);
