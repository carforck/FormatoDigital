// Pruebas de la cotización: totales, IVA, validación y lectura de ítems. Uso: npx tsx tests/unit/cotizacion.test.ts
import { cantidadTexto, diasEntre, importeItem, ivaPorTarifa, sumarDias, totalesCotizacion } from "../../src/modulos/cotizaciones/calculos";
import { CATALOGO_SERVICIOS, cotizacionVacia, itemDeCatalogo, leerItems, leerNumero, lineaDeItem } from "../../src/modulos/cotizaciones/catalogo";
import type { DatosCotizacion, ItemCotizacion } from "../../src/modulos/cotizaciones/tipos";
import { faltantesCotizacion } from "../../src/modulos/cotizaciones/validar";
import { cop, pesosEnLetras } from "../../src/nucleo/letras";

let fallos = 0;
let casos = 0;
function igual<T>(nombre: string, r: T, esperado: T) {
  casos++;
  if (JSON.stringify(r) !== JSON.stringify(esperado)) {
    fallos++;
    console.log(`✗ ${nombre}: ${JSON.stringify(r)} (esperado ${JSON.stringify(esperado)})`);
  }
}

const it = (cantidad: number, precioUnitario: number, ivaPct = 19, descripcion = "Ítem"): ItemCotizacion => ({ id: `${descripcion}-${cantidad}-${precioUnitario}-${ivaPct}`, descripcion, cantidad, unidad: "Unidades", precioUnitario, ivaPct });

// Caso del formato de referencia: 32 × 30.000 + 1 × 90.000 con IVA 19 %
const t = totalesCotizacion({ items: [it(32, 30000), it(1, 90000)] });
igual("subtotal", t.subtotal, 1_050_000);
igual("iva 19 %", t.iva, 199_500);
igual("total", t.total, 1_249_500);
igual("total en COP", cop(t.total).replace(/\s/g, " "), "$ 1.249.500");
igual("total en letras", pesosEnLetras(t.total), "UN MILLÓN DOSCIENTOS CUARENTA Y NUEVE MIL QUINIENTOS PESOS M/CTE");

// Redondeo en pesos
igual("importe con decimales", importeItem({ cantidad: 12.5, precioUnitario: 6533 }), 81_663);
igual("iva redondeado por tarifa", totalesCotizacion({ items: [it(1, 1001)] }).iva, 190); // 190,19
igual("iva sobre la suma, no por línea", totalesCotizacion({ items: [it(1, 3), it(1, 3), it(1, 3)] }).iva, 2); // 9 × 19 % = 1,71 → 2 (por línea daría 3)
igual("valores inválidos cuentan 0", importeItem({ cantidad: NaN, precioUnitario: 1000 }), 0);
igual("negativos cuentan 0", importeItem({ cantidad: -2, precioUnitario: 1000 }), 0);

// Varias tarifas
igual(
  "iva por tarifa",
  ivaPorTarifa([it(1, 100000, 19), it(2, 50000, 5), it(1, 30000, 0)]),
  [
    { pct: 19, base: 100000, iva: 19000 },
    { pct: 5, base: 100000, iva: 5000 },
    { pct: 0, base: 30000, iva: 0 },
  ],
);
igual("total mixto", totalesCotizacion({ items: [it(1, 100000, 19), it(2, 50000, 5), it(1, 30000, 0)] }).total, 254_000);
igual("sin ítems", totalesCotizacion({ items: [] }), { subtotal: 0, tarifas: [], iva: 0, total: 0 });

// Fechas
igual("vencimiento +30", sumarDias("2026-09-25", 30), "2026-10-25");
igual("cruce de año", sumarDias("2026-12-15", 30), "2027-01-14");
igual("días entre", diasEntre("2026-09-25", "2026-10-25"), 30);
igual("cantidad es-CO", cantidadTexto(32), "32,00");
igual("vacía vence a 30 días", cotizacionVacia("2026-10-22").vencimiento, "2026-11-21");

// Números escritos
igual("precio con puntos", leerNumero("30.000", false), 30000);
igual("precio con $", leerNumero("$ 1.249.500", false), 1249500);
igual("cantidad con coma", leerNumero("12,5", true), 12.5);
igual("cantidad con miles", leerNumero("1.200", true), 1200);

// Ítems en texto
const l = leerItems("32 puntos x Mantenimiento preventivo punto CCTV | Hasta 3 m de altura @ 30.000\n1 x Mantenimiento preventivo grabador @ 90000\n2,5 metros x Cable especial @ 7.000 [0%]");
igual("líneas leídas sin errores", l.errores, []);
igual("cantidad y unidad", [l.items[0].cantidad, l.items[0].unidad, l.items[0].detalle], [32, "Puntos", "Hasta 3 m de altura"]);
igual("unidad y detalle del catálogo", [l.items[1].unidad, l.items[1].detalle], ["Unidades", "DVR/NVR, gabinete y fuente"]);
igual("iva de la línea", [l.items[2].cantidad, l.items[2].unidad, l.items[2].ivaPct], [2.5, "Metros", 0]);
igual("total de las líneas", totalesCotizacion({ items: l.items }).total, 1_249_500 + 17_500);
igual("precio del catálogo si se omite", leerItems("3 x Visita técnica de diagnóstico").items[0].precioUnitario, 80000);
igual("línea inválida", leerItems("hola").errores.length, 1);
igual("sin precio", leerItems("2 x Algo nuevo").errores, ["Línea 1: falta el precio («@ 30.000»)."]);
igual("vacío", leerItems("  ").errores, ["Escribe al menos un ítem."]);
const previo = itemDeCatalogo(CATALOGO_SERVICIOS[0], 1);
const ida = leerItems(lineaDeItem({ ...previo, cantidad: 32 }), [previo]);
igual("ida y vuelta conserva el id", [ida.items[0].id, ida.items[0].cantidad, ida.items[0].precioUnitario, ida.items[0].detalle], [previo.id, 32, 30000, previo.detalle]);

// Validación
const lista: DatosCotizacion = { ...cotizacionVacia("2026-10-22"), cliente: "Conjunto Residencial Los Robles", asunto: "Mantenimiento CCTV", vendedor: "Andrea Ríos Martínez", items: [it(32, 30000)] };
igual("lista para enviar", faltantesCotizacion(lista), []);
igual("vacía", faltantesCotizacion(cotizacionVacia("2026-10-22")), ["Cliente", "Asunto o proyecto", "Vendedor", "Al menos un ítem"]);
igual("vencimiento anterior", faltantesCotizacion({ ...lista, vencimiento: "2026-10-01" }), ["El vencimiento no puede ser anterior a la fecha de cotización"]);
igual("ítem sin precio", faltantesCotizacion({ ...lista, items: [it(2, 0)] }), ["Ítem 1: precio unitario"]);
igual("ítem sin cantidad", faltantesCotizacion({ ...lista, items: [it(0, 1000)] }), ["Ítem 1: cantidad"]);
igual("correo inválido", faltantesCotizacion({ ...lista, correo: "sin-arroba" }), ["Correo del cliente válido"]);
igual("condiciones vacías", faltantesCotizacion({ ...lista, formaPago: " ", tiempoEntrega: "" }), ["Forma de pago", "Tiempo de entrega"]);

console.log(fallos ? `${fallos} fallo(s) de ${casos}` : `✓ ${casos} casos de cotización`);
process.exit(fallos ? 1 : 0);
