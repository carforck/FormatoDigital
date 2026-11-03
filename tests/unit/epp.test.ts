// Pruebas de la entrega de EPP (pedido de Magno): validación antes de enviar y armado de la tabla
// al marcar elementos en el asistente. Uso: npx tsx tests/unit/epp.test.ts
import { eppVacio, itemEpp, itemsMarcados } from "../../src/modulos/epp/catalogo";
import { totalUnidades } from "../../src/modulos/epp/tipos";
import { faltantesEpp } from "../../src/modulos/epp/validar";

let fallos = 0;
let casos = 0;
function igual<T>(nombre: string, r: T, esperado: T) {
  casos++;
  if (JSON.stringify(r) !== JSON.stringify(esperado)) {
    fallos++;
    console.log(`✗ ${nombre}: ${JSON.stringify(r)} (esperado ${JSON.stringify(esperado)})`);
  }
}

// Validación
const vacio = eppVacio("2026-11-03");
igual("en blanco: todo pendiente", faltantesEpp(vacio), ["Área, proyecto u obra", "Trabajador que recibe", "Cédula del trabajador", "Cargo del trabajador", "Al menos un elemento entregado", "Firma del trabajador que recibe"]);
const lleno = {
  ...vacio,
  obra: "Sede SOTEC",
  trabajador: "Trabajador de prueba",
  cedula: "1.000.000.009",
  cargo: "Técnico electricista",
  items: [{ ...itemEpp("Casco de seguridad", "2026-11-03", "Ingreso"), id: "a" }],
  firmaRecibe: "data:image/png;base64,x",
};
igual("completo: listo para enviar", faltantesEpp(lleno), []);
igual("cédula con puntos cuenta los dígitos", faltantesEpp({ ...lleno, cedula: "1.234" }), ["Cédula del trabajador"]);
igual("fila sin cantidad ni motivo", faltantesEpp({ ...lleno, items: [{ ...lleno.items[0], cantidad: 0, motivo: "" }] }), ["Elemento 1: cantidad", "Elemento 1: motivo de la entrega"]);
igual("fila sin elemento", faltantesEpp({ ...lleno, items: [{ ...lleno.items[0], elemento: " " }] }), ["Elemento 1: cuál"]);
igual("la firma de quien entrega no es obligatoria al enviar (firma quien aprueba)", faltantesEpp({ ...lleno, firmaEntrega: "" }), []);

// Tabla desde el asistente
const conCasco = { fecha: "2026-11-03", items: [{ ...itemEpp("Casco de seguridad", "2026-11-01", "Reposición"), id: "a", cantidad: 2, talla: "M" }] };
const t = itemsMarcados(conCasco, ["casco de seguridad", "Gafas de seguridad"]);
igual("lo que sigue marcado conserva su fila (sin importar mayúsculas)", t[0], conCasco.items[0]);
igual("lo nuevo entra con cantidad 1 y la fecha del formato", [t[1].elemento, t[1].cantidad, t[1].fecha, t[1].motivo], ["Gafas de seguridad", 1, "2026-11-03", ""]);
igual("lo desmarcado sale", itemsMarcados(conCasco, ["Gafas de seguridad"]).map((i) => i.elemento), ["Gafas de seguridad"]);
igual("nada marcado: tabla vacía", itemsMarcados(conCasco, []), []);
igual("ids distintos para filas nuevas", new Set(itemsMarcados({ fecha: "x", items: [] }, ["A", "B", "C"]).map((i) => i.id)).size, 3);
igual("total de unidades (ignora negativas)", totalUnidades({ items: [{ ...t[0], cantidad: 2 }, { ...t[1], cantidad: -1 }, { ...t[1], cantidad: 3 }] }), 5);

console.log(fallos ? `\n${fallos} de ${casos} casos fallaron` : `✓ epp: ${casos} casos`);
process.exit(fallos ? 1 : 0);
