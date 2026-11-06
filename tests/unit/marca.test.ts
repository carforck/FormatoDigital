// Pruebas de la marca según el modo (pedido de Magno: «quitar el logo de SOTEC al entrar a la cuenta demo»):
// en la empresa va el logo de SOTEC; en la demo solo ControlOne. El modo empresa necesita Supabase y no
// se prueba en el e2e, por eso la bifurcación se revisa aquí. Uso: npx tsx tests/unit/marca.test.ts
import fs from "node:fs";
import path from "node:path";

import { LOGO_CONTROLONE, LOGO_SOTEC, LOGO_SOTEC_OSCURO, logoBarra, logoFormato, nombreMarca } from "../../src/nucleo/marca";

let fallos = 0;
let casos = 0;
function igual<T>(nombre: string, r: T, esperado: T) {
  casos++;
  if (JSON.stringify(r) !== JSON.stringify(esperado)) {
    fallos++;
    console.log(`✗ ${nombre}: ${JSON.stringify(r)} (esperado ${JSON.stringify(esperado)})`);
  }
}

igual("empresa: barra lateral con el logo oscuro de SOTEC", logoBarra("empresa"), LOGO_SOTEC_OSCURO);
igual("demo: barra lateral sin logo raster (marca ControlOne en texto)", logoBarra("demo"), null);
igual("empresa: formatos con el logo de SOTEC", logoFormato("empresa"), LOGO_SOTEC);
igual("demo: formatos con la marca ControlOne", logoFormato("demo"), LOGO_CONTROLONE);
igual("demo: el logo de los formatos no es de SOTEC", /sotec/i.test(logoFormato("demo")), false);
igual("empresa: nombre de la marca", nombreMarca("empresa"), "SOTEC");
igual("demo: nombre de la marca", nombreMarca("demo"), "ControlOne");

// Los archivos existen en public/
const pub = path.join(__dirname, "../../public");
for (const f of [LOGO_SOTEC, LOGO_SOTEC_OSCURO, LOGO_CONTROLONE]) igual(`existe public${f}`, fs.existsSync(path.join(pub, f)), true);

// Las piezas de la app no vuelven a escribir a mano el logo de SOTEC (deben pasar por @/nucleo/marca)
const raiz = path.join(__dirname, "../../src");
for (const f of ["components/shell/AppShell.tsx", "components/docs/Encabezado.tsx", "components/landing/ChatEnVivo.tsx", "app/firmar/page.tsx", "app/imprimir/ImprimirCliente.tsx"]) {
  const s = fs.readFileSync(path.join(raiz, f), "utf8");
  igual(`${f}: sin «sotec-logo» escrito a mano`, s.includes("sotec-logo"), false);
}
// El logo de los formatos de la demo no lleva «by SOTEC» debajo (el crédito va en el pie)
const enc = fs.readFileSync(path.join(raiz, "components/docs/Encabezado.tsx"), "utf8");
igual("Encabezado: el logo no lleva «by SOTEC»", />\s*by SOTEC\s*</.test(enc), false);

console.log(`${casos - fallos}/${casos} casos de marca correctos`);
if (fallos) process.exit(1);
