// Pruebas de quién edita un documento (pedido de Magno): el autor corrige en borrador, rechazado y
// en revisión mientras nadie lo haya revisado; aprobado o cerrado ya no. Uso: npx tsx tests/unit/permisos.test.ts
import { CORRIGIO_EN_REVISION, puedeEditarDoc, puedeRetirarDoc, revisionSinTocar } from "../../src/nucleo/permisos";
import type { Documento, Estado, Evento, Usuario } from "../../src/nucleo/tipos";

let fallos = 0;
let casos = 0;
function igual<T>(nombre: string, r: T, esperado: T) {
  casos++;
  if (JSON.stringify(r) !== JSON.stringify(esperado)) {
    fallos++;
    console.log(`✗ ${nombre}: ${JSON.stringify(r)} (esperado ${JSON.stringify(esperado)})`);
  }
}

const tecnico: Usuario = { id: "u-t1", nombre: "Tomás Ficticio", cargo: "Técnico", rol: "tecnico", email: "t1@ejemplo.test", activo: true };
const otroTecnico: Usuario = { ...tecnico, id: "u-t2", nombre: "Lina Inventada", email: "t2@ejemplo.test" };
const revisora: Usuario = { id: "u-s", nombre: "Sara Supuesta", cargo: "Coordinadora SST", rol: "supervisor", email: "s@ejemplo.test", activo: true };
const cliente: Usuario = { id: "u-c", nombre: "Carla Cliente", cargo: "Cliente", rol: "cliente", email: "c@ejemplo.test", clienteId: "c-1", activo: true };

const ev = (usuarioId: string, accion: string): Evento => ({ fecha: "2026-11-03T08:00:00", usuarioId, accion });
const doc = (estado: Estado, historial: Evento[], tipo: Documento["tipo"] = "reporte"): Documento =>
  ({ id: "d-1", tipo, codigo: "RT-001-26", consecutivo: 1, estado, autorId: tecnico.id, clienteId: "c-1", creado: "", actualizado: "", historial, datos: {} }) as unknown as Documento;

const enviado = [ev(tecnico.id, "Creó el documento"), ev(tecnico.id, "Envió a revisión")];

// Borrador y rechazado: como siempre
igual("borrador: el autor edita", puedeEditarDoc(tecnico, doc("borrador", [ev(tecnico.id, "Creó el documento")])), true);
igual("rechazado: el autor edita", puedeEditarDoc(tecnico, doc("rechazado", [...enviado, ev(revisora.id, "Rechazó")])), true);

// En revisión sin revisar: el autor lo corrige (también varias veces y con la firma en sitio de por medio)
igual("en revisión sin revisar: el autor edita", puedeEditarDoc(tecnico, doc("en_revision", enviado)), true);
igual("ya corregido una vez: sigue editable", puedeEditarDoc(tecnico, doc("en_revision", [...enviado, ev(tecnico.id, CORRIGIO_EN_REVISION)])), true);
igual("con la firma en sitio del autor: sigue editable", puedeEditarDoc(tecnico, doc("en_revision", [...enviado, ev(tecnico.id, "Firma del cliente en sitio")])), true);
igual("reenviado tras un rechazo: cuenta desde el último envío", puedeEditarDoc(tecnico, doc("en_revision", [...enviado, ev(revisora.id, "Rechazó"), ev(tecnico.id, "Envió a revisión")])), true);
igual("sigue pudiendo retirarlo", puedeRetirarDoc(tecnico, doc("en_revision", enviado)), true);

// El revisor ya actuó: no se edita
igual("en revisión con un evento del revisor: bloqueado", puedeEditarDoc(tecnico, doc("en_revision", [...enviado, ev(revisora.id, "Dejó observaciones")])), false);
igual("revisionSinTocar con evento del revisor", revisionSinTocar(doc("en_revision", [...enviado, ev(revisora.id, "Dejó observaciones")])), false);
igual("aprobado: bloqueado", puedeEditarDoc(tecnico, doc("aprobado", [...enviado, ev(revisora.id, "Aprobó")])), false);
igual("cerrado: bloqueado", puedeEditarDoc(tecnico, doc("cerrado", [...enviado, ev(revisora.id, "Aprobó"), ev("", "Cerró")])), false);

// Nadie más edita lo ajeno en revisión
igual("otro técnico no edita", puedeEditarDoc(otroTecnico, doc("en_revision", enviado)), false);
igual("la revisora no edita contenido ajeno", puedeEditarDoc(revisora, doc("en_revision", enviado)), false);
igual("el cliente no edita", puedeEditarDoc(cliente, doc("en_revision", enviado)), false);
igual("revisionSinTocar solo en revisión", revisionSinTocar(doc("borrador", enviado)), false);

console.log(fallos ? `\n${fallos} de ${casos} casos fallaron` : `✓ permisos: ${casos} casos`);
process.exit(fallos ? 1 : 0);
