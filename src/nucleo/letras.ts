/**
 * Valores en pesos colombianos en letras, para cuentas de cobro:
 *   821100  → "OCHOCIENTOS VEINTIÚN MIL CIEN PESOS M/CTE"
 *   1000000 → "UN MILLÓN DE PESOS M/CTE"
 * Basado en el generador de GenCuentasCobroAlzak, con las concordancias
 * "UN/VEINTIÚN" delante de MIL/MILLONES y "DE PESOS" en millones exactos.
 */
const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE"];
const VEINTI = ["VEINTE", "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"];
const DECENAS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

function hasta99(n: number): string {
  if (n <= 20) return UNIDADES[n];
  if (n < 30) return VEINTI[n - 20];
  const u = n % 10;
  return u === 0 ? DECENAS[Math.floor(n / 10)] : `${DECENAS[Math.floor(n / 10)]} Y ${UNIDADES[u]}`;
}

function hasta999(n: number): string {
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const r = n % 100;
  return [CENTENAS[c], r ? hasta99(r) : ""].filter(Boolean).join(" ");
}

/** Forma apocopada delante de MIL / MILLONES: UNO → UN, VEINTIUNO → VEINTIÚN. */
function apocopar(s: string): string {
  return s.replace(/VEINTIUNO$/, "VEINTIÚN").replace(/UNO$/, "UN");
}

function hasta999999(n: number): string {
  if (n < 1000) return hasta999(n);
  const m = Math.floor(n / 1000);
  const r = n % 1000;
  const miles = m === 1 ? "MIL" : `${apocopar(hasta999(m))} MIL`;
  return r ? `${miles} ${hasta999(r)}` : miles;
}

/** Mayor valor que se expresa en letras (999.999.999.999 = novecientos noventa y nueve mil… millones). */
export const MAXIMO_EN_LETRAS = 999_999_999_999;
/** Texto que se muestra en lugar del valor en letras cuando supera `MAXIMO_EN_LETRAS`. */
export const FUERA_DE_RANGO = "VALOR DEMASIADO GRANDE PARA EXPRESAR EN LETRAS";

/** Entero no negativo en letras, en mayúsculas y sin «pesos» (escala larga: MIL MILLONES). */
export function enLetras(n: number): string {
  if (n === 0) return "CERO";
  if (n > MAXIMO_EN_LETRAS) return FUERA_DE_RANGO;
  if (n < 1_000_000) return hasta999999(n);
  const mi = Math.floor(n / 1_000_000);
  const r = n % 1_000_000;
  const millones = mi === 1 ? "UN MILLÓN" : `${apocopar(hasta999999(mi))} MILLONES`;
  return r ? `${millones} ${hasta999999(r)}` : millones;
}

/** Valor de la cuenta de cobro en letras («… PESOS M/CTE»); redondea al peso y devuelve "" si es inválido o negativo. */
export function pesosEnLetras(valor: number): string {
  if (!Number.isFinite(valor) || valor < 0) return "";
  const entero = Math.round(valor);
  if (entero > MAXIMO_EN_LETRAS) return FUERA_DE_RANGO;
  if (entero === 1) return "UN PESO M/CTE";
  const exactoEnMillones = entero >= 1_000_000 && entero % 1_000_000 === 0;
  // Hasta 999.999 millones: MIL MILLONES, DOS MIL QUINIENTOS MILLONES… (escala larga)
  // Delante de "pesos" también va la forma corta: CIENTO UN PESOS, VEINTIÚN PESOS
  return `${apocopar(enLetras(entero))}${exactoEnMillones ? " DE" : ""} PESOS M/CTE`;
}

/** Formato de moneda colombiana sin decimales («$ 821.100»); un valor no finito sale como $ 0. */
export function cop(valor: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number.isFinite(valor) ? valor : 0);
}
