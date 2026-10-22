// Pruebas del valor en letras de las cuentas de cobro. Uso: npm run test:unit
import { FUERA_DE_RANGO, pesosEnLetras } from "../../src/nucleo/letras";

const casos: [number, string][] = [
  [821100, "OCHOCIENTOS VEINTIÚN MIL CIEN PESOS M/CTE"],
  [1000000, "UN MILLÓN DE PESOS M/CTE"],
  [1500000, "UN MILLÓN QUINIENTOS MIL PESOS M/CTE"],
  [21000, "VEINTIÚN MIL PESOS M/CTE"],
  [101, "CIENTO UN PESOS M/CTE"],
  [21, "VEINTIÚN PESOS M/CTE"],
  [2000000, "DOS MILLONES DE PESOS M/CTE"],
  [31000000, "TREINTA Y UN MILLONES DE PESOS M/CTE"],
  [450000, "CUATROCIENTOS CINCUENTA MIL PESOS M/CTE"],
  [1001, "MIL UN PESOS M/CTE"],
  [100000, "CIEN MIL PESOS M/CTE"],
  [116000, "CIENTO DIECISÉIS MIL PESOS M/CTE"],
  [222222, "DOSCIENTOS VEINTIDÓS MIL DOSCIENTOS VEINTIDÓS PESOS M/CTE"],
  [1, "UN PESO M/CTE"],
  [0, "CERO PESOS M/CTE"],
  [1_000_000_000, "MIL MILLONES DE PESOS M/CTE"],
  [2_500_000_000, "DOS MIL QUINIENTOS MILLONES DE PESOS M/CTE"],
  [1_001_000_000, "MIL UN MILLONES DE PESOS M/CTE"],
  [21_000_000_000, "VEINTIÚN MIL MILLONES DE PESOS M/CTE"],
  [1_000_000_001, "MIL MILLONES UN PESOS M/CTE"],
  [999_999_999_999, "NOVECIENTOS NOVENTA Y NUEVE MIL NOVECIENTOS NOVENTA Y NUEVE MILLONES NOVECIENTOS NOVENTA Y NUEVE MIL NOVECIENTOS NOVENTA Y NUEVE PESOS M/CTE"],
  [1_000_000_000_000, FUERA_DE_RANGO],
];

let fallos = 0;
for (const [n, esperado] of casos) {
  const r = pesosEnLetras(n);
  if (r !== esperado) {
    fallos++;
    console.log(`✗ ${n}: «${r}» (esperado «${esperado}»)`);
  }
}
console.log(fallos ? `${fallos} fallo(s)` : `✓ ${casos.length} casos de valor en letras`);
process.exit(fallos ? 1 : 0);
