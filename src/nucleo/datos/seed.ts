/**
 * Semilla de la demo: usuarios, clientes, proyectos, documentos, cuentas de
 * cobro, avisos y auditoría ficticios (dominios .example) que carga
 * `DemoProvider` en modo demo. Al cambiarla, subir `KEY` en DemoProvider para
 * que los navegadores tomen los datos nuevos. El modo empresa no la usa.
 */
import { CATALOGO_SERVICIOS, cotizacionVacia } from "@/modulos/cotizaciones/catalogo";
import { PLANTILLAS_ACTIVIDAD, permisoVacio } from "@/modulos/permisos/catalogo";
import { reporteVacio } from "@/modulos/reportes/catalogo";
import { EQUIPOS_DE_DOC } from "@/modulos/equipos/seed";
import type { CuentaCobro } from "@/modulos/cobros/tipos";
import type { Auditoria, Cliente, Config, Documento, Estado, Notificacion, Proyecto, Usuario } from "@/nucleo/tipos";

/** Firma ficticia dibujada como SVG para los documentos de ejemplo. */
export function firmaDemo(seed: number): string {
  const r = (n: number) => Math.round(((Math.sin(seed * 97 + n * 13) + 1) / 2) * 30);
  const d = `M10 ${40 + r(1) / 3} C 40 ${5 + r(2)}, 60 ${70 - r(3)}, 90 ${35 + r(4) / 4} S 140 ${10 + r(5)}, 170 ${40 + r(6) / 3} S 210 ${60 - r(7)}, 240 ${30 + r(8) / 3} M 60 ${55 + r(9) / 5} L 200 ${48 + r(10) / 5}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="80" viewBox="0 0 260 80"><path d="${d}" fill="none" stroke="#1d3b8a" stroke-width="2.2" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml;base64,${typeof btoa === "function" ? btoa(svg) : Buffer.from(svg).toString("base64")}`;
}

/** Un usuario por perfil (dos técnicos); el cliente pertenece a `c-clay`. */
export const USUARIOS_SEED: Usuario[] = [
  { id: "u-tec1", nombre: "Andrés Camacho Ruiz", cargo: "Ingeniero de campo", rol: "tecnico", email: "acamacho@sotec.example", cedula: "1.000.000.001", activo: true },
  { id: "u-tec2", nombre: "Julián Herrera Pacheco", cargo: "Técnico electrónico", rol: "tecnico", email: "jherrera@sotec.example", cedula: "1.000.000.002", activo: true },
  { id: "u-sup", nombre: "Andrea Ríos Martínez", cargo: "Coordinadora SST", rol: "supervisor", email: "sst@sotec.example", cedula: "1.000.000.005", activo: true },
  { id: "u-adm", nombre: "Gerencia SOTEC", cargo: "Gerente general", rol: "admin", email: "gerencia@sotec.example", activo: true },
  { id: "u-cli", nombre: "Ing. Daniel Ortega", cargo: "Ing. de sistemas · Ladrillera Arcillas del Caribe", rol: "cliente", email: "sistemas@arcillasdelcaribe.example", clienteId: "c-clay", activo: true },
];

/** Clientes ficticios en Cartagena. */
export const CLIENTES_SEED: Cliente[] = [
  { id: "c-clay", nit: "900.100.200-1", nombre: "Ladrillera Arcillas del Caribe", direccion: "Zona Industrial, Cartagena", contacto: "Ing. Daniel Ortega", cargo: "Ing. sistemas", correo: "sistemas@arcillasdelcaribe.example", telefono: "3000000000", sitio: "Área de hornos" },
  { id: "c-tango", nit: "900.300.400-2", nombre: "Constructora Horizonte Azul", direccion: "Bocagrande, Cartagena", contacto: "Arq. Laura Méndez", cargo: "Residente de obra", correo: "obra@horizonteazul.example", telefono: "3001112233", sitio: "Hotel Brisas del Mar" },
  { id: "c-puerto", nit: "900.500.600-3", nombre: "Centro Logístico Bahía", direccion: "Mamonal Km 5, Cartagena", contacto: "Jorge Salcedo", cargo: "Jefe de seguridad", correo: "seguridad@logisticabahia.example", telefono: "3014445566", sitio: "Patio 2" },
  { id: "c-conj", nit: "900.700.800-4", nombre: "Conjunto Residencial Los Robles", direccion: "Barrio Los Robles, Cartagena", contacto: "Patricia Ríos", cargo: "Administradora", correo: "admin@losrobles.example", telefono: "3157778899", sitio: "Portería principal" },
  // Sitio donde SOTEC presta servicios para Fortox (ficticio): su proyecto es de tipo «Servicios Fortox»
  { id: "c-mirador", nit: "900.900.100-5", nombre: "Centro Comercial Mirador de la Bahía", direccion: "Av. Pedro de Heredia, Cartagena", contacto: "Luis Arrieta Gómez", cargo: "Supervisor de seguridad", correo: "seguridad@miradorbahia.example", telefono: "3209990011", sitio: "Cuarto de monitoreo" },
];

/** Configuración de SOTEC (prefijos RT, PT, LG, COT, CC, PRY); también es la base del modo empresa. */
export const CONFIG_SEED: Config = {
  empresa: "SOTEC",
  nit: "900.000.000-0",
  ciudad: "Cartagena de Indias",
  prefijoReporte: "RT",
  prefijoPermiso: "PT",
  prefijoCobro: "CC",
  prefijoGasto: "LG",
  prefijos: { cotizacion: "COT" },
  prefijoProyecto: "PRY",
  exigirFirmaCliente: true,
  vigenciaPermisoHoras: 12,
  ivaPorcentaje: 19,
  banco: "Banco de Ejemplo",
  tipoCuenta: "Ahorros",
  numeroCuenta: "000-000000-00",
  titularCuenta: "SOTEC",
};

/** Proyectos de ejemplo: SOTEC trabaja por proyecto y por cliente (todos ficticios). */
export function proyectosSeed(): Proyecto[] {
  const p = (n: number, x: Omit<Proyecto, "id" | "codigo" | "consecutivo" | "creado" | "actualizado" | "historial">): Proyecto => ({
    id: `p-${n}`,
    codigo: `PRY-${String(n).padStart(3, "0")}-26`,
    consecutivo: n,
    creado: `${x.fechaInicio}T08:00:00`,
    actualizado: `${x.fechaFin ?? x.fechaInicio}T08:00:00`,
    historial: [{ fecha: `${x.fechaInicio}T08:00:00`, usuarioId: "u-adm", accion: "Creó el proyecto" }, ...(x.estado !== "activo" ? [{ fecha: `${x.fechaFin ?? x.fechaInicio}T08:00:00`, usuarioId: "u-sup", accion: x.estado === "cerrado" ? "Cerró el proyecto" : "Pausó el proyecto" }] : [])],
    ...x,
  });
  return [
    p(1, { nombre: "CCTV hornos y patio de secado", clienteId: "c-clay", sitio: "Área de hornos", responsableId: "u-tec1", fechaInicio: "2026-05-20", estado: "activo", presupuesto: 18000000, descripcion: "Renovación del circuito cerrado de televisión en hornos, molienda y patio de secado: enlaces de fibra, NVR y monitoreo remoto." }),
    p(2, { nombre: "Control de acceso torre B", clienteId: "c-tango", sitio: "Hotel Brisas del Mar · Torre B", responsableId: "u-tec2", fechaInicio: "2026-07-15", estado: "activo", presupuesto: 24500000, descripcion: "Control de acceso con lectoras y torniquetes para la torre B, cableado estructurado de la oficina de obra y trabajos en alturas." }),
    p(3, { nombre: "Videovigilancia bodega y patio 2", clienteId: "c-puerto", sitio: "Patio 2", responsableId: "u-tec2", fechaInicio: "2026-06-01", fechaFin: "2026-07-15", estado: "cerrado", presupuesto: 9800000, descripcion: "Instalación de 8 cámaras IP con su cableado en la bodega y el patio de contenedores." }),
    p(4, { nombre: "Seguridad perimetral portería", clienteId: "c-conj", sitio: "Portería principal", responsableId: "u-tec1", fechaInicio: "2026-07-01", estado: "en_pausa", presupuesto: 6200000, descripcion: "Cerca eléctrica, alarmas perimetrales y cámara PTZ de la portería. En pausa mientras la asamblea aprueba la segunda fase." }),
    p(5, { nombre: "Detección de incendio bodegas", clienteId: "c-puerto", sitio: "Bodegas 1 y 2", responsableId: "u-sup", fechaInicio: "2026-09-01", estado: "activo", presupuesto: 15000000, descripcion: "Revisión y ampliación del sistema de detección de incendio de las bodegas, con trabajos eléctricos certificados." }),
    // Proyecto de tipo «Servicios Fortox»: sus reportes salen en el formato de Fortox (@/nucleo/variantes).
    // Es de 2025 para no mover los consecutivos de proyecto de 2026.
    {
      ...p(12, { nombre: "Servicios Fortox · CCTV centro comercial", tipo: "Servicios Fortox", clienteId: "c-mirador", sitio: "Cuarto de monitoreo", responsableId: "u-sup", fechaInicio: "2025-11-03", estado: "activo", descripcion: "Mantenimiento de CCTV y alarmas que SOTEC ejecuta para Fortox en el centro comercial: los reportes salen en el formato de Fortox." }),
      codigo: "PRY-012-25",
    },
  ];
}

/** Proyecto de cada documento de ejemplo (coherente con el cliente y el asunto). */
const PROYECTO_DE: Record<string, string> = {
  "d-rt-clay": "p-1", "d-pt-clay": "p-1", "d-rt-3": "p-1", "d-rt-7": "p-1", "d-pt-3": "p-1", "d-lg-0": "p-1",
  "d-rt-2": "p-2", "d-rt-6": "p-2", "d-pt-0": "p-2", "d-pt-2": "p-2", "d-lg-1": "p-2",
  "d-rt-0": "p-3",
  "d-rt-1": "p-4", "d-rt-5": "p-4", "d-rt-8": "p-4",
  "d-rt-4": "p-5", "d-pt-1": "p-5",
  "d-cot-0": "p-2", "d-cot-1": "p-1", "d-cot-2": "p-5",
};

/** Cuentas de cobro de ejemplo: SOTEC le cobra a sus clientes por servicios ya cerrados. */
export function cuentasSeed(): CuentaCobro[] {
  return [
    {
      id: "cc-1",
      codigo: "CC-001-26",
      consecutivo: 1,
      clienteId: "c-puerto",
      proyectoId: "p-3",
      fecha: "2026-06-20",
      concepto: "Instalación de cámaras IP en bodega",
      items: [
        { id: "i1", documentoId: "d-rt-0", descripcion: "Instalación de 8 cámaras IP en bodega", cantidad: 8, valorUnitario: 380000 },
        { id: "i2", descripcion: "Cableado y canaleta", cantidad: 1, valorUnitario: 650000 },
      ],
      ivaPorcentaje: 19,
      notas: "Pago a 30 días.",
      estado: "pagada",
      creadoPor: "u-adm",
      creado: "2026-06-20T10:00:00",
      actualizado: "2026-07-15T09:00:00",
      historial: [
        { fecha: "2026-06-20T10:00:00", usuarioId: "u-adm", accion: "Creó la cuenta de cobro" },
        { fecha: "2026-06-20T10:20:00", usuarioId: "u-adm", accion: "Emitió" },
        { fecha: "2026-06-20T10:25:00", usuarioId: "u-adm", accion: "Envió por correo", detalle: "seguridad@logisticabahia.example" },
        { fecha: "2026-07-15T09:00:00", usuarioId: "u-adm", accion: "Marcó como pagada" },
      ],
    },
    {
      id: "cc-2",
      codigo: "CC-002-26",
      consecutivo: 2,
      clienteId: "c-clay",
      proyectoId: "p-1",
      fecha: "2026-08-12",
      concepto: "Configuración NVR y monitoreo remoto",
      items: [{ id: "i1", documentoId: "d-rt-3", descripcion: "Configuración NVR y monitoreo remoto", cantidad: 1, valorUnitario: 1200000 }],
      ivaPorcentaje: 19,
      notas: "",
      estado: "emitida",
      creadoPor: "u-adm",
      creado: "2026-08-12T15:00:00",
      actualizado: "2026-08-12T15:10:00",
      historial: [
        { fecha: "2026-08-12T15:00:00", usuarioId: "u-adm", accion: "Creó la cuenta de cobro" },
        { fecha: "2026-08-12T15:10:00", usuarioId: "u-adm", accion: "Emitió" },
      ],
    },
  ];
}

function codigo(pref: string, n: number, fecha: string) {
  return `${pref}-${String(n).padStart(3, "0")}-${fecha.slice(2, 4)}`;
}

const DESCRIPCION_CLAY = `Se realiza intervención correctiva sobre el enlace de fibra óptica comprendido entre el nodo Molienda y el nodo Patio de secado, debido a fallas recurrentes e intermitencias presentadas en la red de CCTV.

Durante las labores de diagnóstico se identificó que un tramo de la fibra óptica se encontraba cristalizado y deteriorado, afectando la calidad de la transmisión de datos y generando inestabilidad en las comunicaciones del sistema de videovigilancia.

Como acción correctiva, se efectuó el reemplazo del tramo de fibra óptica afectado, realizando las adecuaciones y conexiones necesarias para garantizar la integridad del enlace y la correcta transmisión de la información entre ambos nodos.

Posteriormente se realizaron pruebas de conectividad y verificación de los servicios asociados, confirmando la estabilidad del enlace, la eliminación de las intermitencias y el correcto funcionamiento de la red de CCTV. El sistema queda operando bajo condiciones normales.`;

interface Extra {
  asunto: string;
  tipo: string;
  cliente: Cliente;
  autor: Usuario;
  fecha: string;
  estado: Estado;
}

/**
 * Documentos de ejemplo en todos los estados: el reporte y el permiso reales del
 * PDF de la ladrillera, histórico de reportes y permisos para el tablero,
 * legalizaciones de gastos y cotizaciones; cada uno con su proyecto y equipos.
 */
export function documentosSeed(): Documento[] {
  const [tec1, tec2] = USUARIOS_SEED;
  const sup = USUARIOS_SEED[2];
  const [clay, tango, puerto, conj] = CLIENTES_SEED;
  const docs: Documento[] = [];
  let nR = 0;
  let nP = 0;

  const hist = (fecha: string, autor: Usuario, estado: Estado, tipo: "reporte" | "permiso" | "gasto" = "reporte", clienteId = "") => {
    const h = [{ fecha: `${fecha}T08:10:00`, usuarioId: autor.id, accion: "Creó el documento" }];
    if (estado !== "borrador") h.push({ fecha: `${fecha}T09:30:00`, usuarioId: autor.id, accion: "Envió a revisión" });
    if (estado === "aprobado" || estado === "cerrado") h.push({ fecha: `${fecha}T11:00:00`, usuarioId: sup.id, accion: "Aprobó" });
    if (estado === "rechazado") h.push({ fecha: `${fecha}T11:00:00`, usuarioId: sup.id, accion: "Rechazó", detalle: "Falta detallar las recomendaciones" } as never);
    // Cierre según el formato: el cliente firma el reporte (en su portal si tiene usuario);
    // el permiso lo cierra SST y los gastos los reembolsa SST/administración
    if (estado === "cerrado") {
      if (tipo === "reporte") {
        h.push(clienteId === "c-clay"
          ? { fecha: `${fecha}T17:00:00`, usuarioId: "u-cli", accion: "Firmó como cliente" }
          : { fecha: `${fecha}T17:00:00`, usuarioId: "", accion: "Cerró con la firma del cliente (en sitio)" });
      } else {
        h.push({ fecha: `${fecha}T17:00:00`, usuarioId: sup.id, accion: tipo === "permiso" ? "Cerró el permiso" : "Marcó como reembolsado" });
      }
    }
    return h;
  };

  // Reporte real del PDF
  nR++;
  docs.push({
    id: "d-rt-clay",
    tipo: "reporte",
    codigo: codigo("RT", nR, "2026-05-26"),
    consecutivo: nR,
    estado: "cerrado",
    autorId: tec1.id,
    clienteId: clay.id,
    creado: "2026-05-26T08:10:00",
    actualizado: "2026-05-26T17:00:00",
    historial: hist("2026-05-26", tec1, "cerrado", "reporte", clay.id),
    datos: {
      ...reporteVacio("2026-05-26"),
      tipoReporte: "Correctivo",
      cliente: clay.nombre,
      direccion: "Zona Industrial",
      personaContactada: "Ing. Daniel",
      correo: clay.correo,
      telefono: clay.telefono,
      cargo: "Ing. sistemas",
      asunto: "Reparación fibra óptica nodo Molienda – Patio de secado",
      descripcion: DESCRIPCION_CLAY,
      recomendaciones: "Programar inspección semestral del tendido de fibra y proteger con tubería los tramos expuestos a calor de los hornos.",
      nombreTecnico: "Ing. Andrés Camacho",
      firmaTecnico: firmaDemo(1),
      firmaCliente: firmaDemo(2),
    },
  });

  // Permiso real del PDF
  nP++;
  const tpl = PLANTILLAS_ACTIVIDAD["Mantenimiento CCTV"];
  docs.push({
    id: "d-pt-clay",
    tipo: "permiso",
    codigo: codigo("PT", nP, "2026-05-26"),
    consecutivo: nP,
    estado: "aprobado",
    autorId: tec1.id,
    clienteId: clay.id,
    creado: "2026-05-26T07:40:00",
    actualizado: "2026-05-26T11:00:00",
    historial: hist("2026-05-26", tec1, "aprobado", "permiso", clay.id),
    datos: {
      ...permisoVacio("2026-05-26"),
      hora: "09:00",
      ampm: "AM",
      cliente: clay.nombre,
      sitioTrabajo: "Área de hornos",
      puestoProyecto: "Mantenimiento CCTV",
      responsable: tec1.nombre,
      actividades: "Mantenimiento sistema CCTV",
      equipo: tpl.equipo,
      equipoMenorCual: "Taladro",
      peligros: tpl.peligros,
      medidas: tpl.medidas,
      epp: tpl.epp,
      verificacion: ["SI", "SI", "SI", "SI", "SI", "SI"],
      ejecutores: [
        { nombre: "Andrés Camacho Ruiz", cedula: "1000000001", arlEps: "ARL Andina / EPS Vital", horaInicio: "09:00", horaFin: "16:00", firma: firmaDemo(3) },
        { nombre: "Julián Herrera Pacheco", cedula: "1000000002", arlEps: "ARL Andina / EPS Vital", horaInicio: "09:00", horaFin: "16:00", firma: firmaDemo(4) },
        { nombre: "Kevin Mendoza Ortiz", cedula: "1000000003", arlEps: "ARL Andina / EPS Vital", horaInicio: "15:00", horaFin: "16:00", firma: firmaDemo(5) },
      ],
      autoriza: sup.nombre,
      firmaAutoriza: firmaDemo(6),
      encargado: tec1.nombre,
      firmaEncargado: firmaDemo(7),
    },
  });

  // Histórico para el tablero
  const extras: Extra[] = [
    { asunto: "Instalación de 8 cámaras IP en bodega", tipo: "Instalación", cliente: puerto, autor: tec2, fecha: "2026-06-12", estado: "cerrado" },
    { asunto: "Mantenimiento preventivo cerca eléctrica", tipo: "Preventivo", cliente: conj, autor: tec1, fecha: "2026-07-03", estado: "cerrado" },
    { asunto: "Diagnóstico control de acceso torre B", tipo: "Diagnóstico", cliente: tango, autor: tec2, fecha: "2026-07-21", estado: "aprobado" },
    { asunto: "Configuración NVR y monitoreo remoto", tipo: "Instalación", cliente: clay, autor: tec1, fecha: "2026-08-09", estado: "cerrado" },
    { asunto: "Revisión sistema de detección de incendio", tipo: "Preventivo", cliente: puerto, autor: tec2, fecha: "2026-09-02", estado: "aprobado" },
    { asunto: "Cambio de fuente en cámara PTZ", tipo: "Correctivo", cliente: conj, autor: tec1, fecha: "2026-09-25", estado: "rechazado" },
    { asunto: "Cableado estructurado oficina obra", tipo: "Instalación", cliente: tango, autor: tec2, fecha: "2026-10-14", estado: "en_revision" },
    { asunto: "Mantenimiento preventivo CCTV hornos", tipo: "Preventivo", cliente: clay, autor: tec1, fecha: "2026-10-17", estado: "en_revision" },
    { asunto: "Ajuste de alarmas perimetrales", tipo: "Correctivo", cliente: conj, autor: tec1, fecha: "2026-10-19", estado: "borrador" },
    // Aprobado y pendiente de la firma del cliente: lo que el portal del cliente muestra para firmar
    { asunto: "Instalación de sensores de movimiento en bodega", tipo: "Instalación", cliente: clay, autor: tec2, fecha: "2026-10-20", estado: "aprobado" },
  ];
  extras.forEach((e, i) => {
    nR++;
    docs.push({
      id: `d-rt-${i}`,
      tipo: "reporte",
      codigo: codigo("RT", nR, e.fecha),
      consecutivo: nR,
      estado: e.estado,
      autorId: e.autor.id,
      clienteId: e.cliente.id,
      creado: `${e.fecha}T08:10:00`,
      actualizado: `${e.fecha}T11:00:00`,
      motivoRechazo: e.estado === "rechazado" ? "Falta detallar las recomendaciones y la firma del cliente." : undefined,
      historial: hist(e.fecha, e.autor, e.estado, "reporte", e.cliente.id),
      datos: {
        ...reporteVacio(e.fecha),
        tipoReporte: e.tipo,
        cliente: e.cliente.nombre,
        direccion: e.cliente.direccion,
        personaContactada: e.cliente.contacto,
        correo: e.cliente.correo,
        telefono: e.cliente.telefono,
        cargo: e.cliente.cargo,
        asunto: e.asunto,
        descripcion: `Se atiende la solicitud "${e.asunto.toLowerCase()}". Se verifican equipos, conexiones y alimentación; se ejecutan los ajustes requeridos y se realizan pruebas de funcionamiento con el cliente. El sistema queda operando en condiciones normales.`,
        recomendaciones: e.estado === "rechazado" ? "" : "Mantener el plan de mantenimiento preventivo trimestral.",
        nombreTecnico: e.autor.nombre,
        firmaTecnico: e.estado === "borrador" ? "" : firmaDemo(10 + i),
        firmaCliente: e.estado === "cerrado" ? firmaDemo(30 + i) : "",
      },
    });
  });

  const permisosExtra: Extra[] = [
    { asunto: "Trabajo en alturas", tipo: "", cliente: tango, autor: tec2, fecha: "2026-07-21", estado: "cerrado" },
    { asunto: "Trabajo eléctrico", tipo: "", cliente: puerto, autor: tec2, fecha: "2026-09-02", estado: "cerrado" },
    { asunto: "Cableado estructurado", tipo: "", cliente: tango, autor: tec2, fecha: "2026-10-14", estado: "aprobado" },
    { asunto: "Trabajo en alturas", tipo: "", cliente: clay, autor: tec1, fecha: "2026-10-20", estado: "en_revision" },
  ];
  permisosExtra.forEach((e, i) => {
    nP++;
    const t = PLANTILLAS_ACTIVIDAD[e.asunto];
    docs.push({
      id: `d-pt-${i}`,
      tipo: "permiso",
      codigo: codigo("PT", nP, e.fecha),
      consecutivo: nP,
      estado: e.estado,
      autorId: e.autor.id,
      clienteId: e.cliente.id,
      creado: `${e.fecha}T07:30:00`,
      actualizado: `${e.fecha}T11:00:00`,
      historial: hist(e.fecha, e.autor, e.estado, "permiso", e.cliente.id),
      datos: {
        ...permisoVacio(e.fecha),
        hora: "07:30",
        cliente: e.cliente.nombre,
        sitioTrabajo: e.cliente.sitio,
        puestoProyecto: e.asunto,
        responsable: e.autor.nombre,
        actividades: `${e.asunto} en ${e.cliente.sitio}`,
        equipo: t.equipo,
        peligros: t.peligros,
        medidas: t.medidas,
        epp: t.epp,
        verificacion: ["SI", "SI", "SI", "SI", "SI", "SI"],
        ejecutores: [
          { nombre: e.autor.nombre, cedula: (e.autor.cedula ?? "").replace(/\./g, ""), arlEps: "ARL Andina / EPS Vital", horaInicio: "07:30", horaFin: "16:00", firma: firmaDemo(50 + i) },
        ],
        autoriza: e.estado === "en_revision" ? "" : sup.nombre,
        firmaAutoriza: e.estado === "en_revision" ? "" : firmaDemo(60 + i),
        encargado: e.autor.nombre,
        firmaEncargado: firmaDemo(70 + i),
        cierreAreaLimpia: e.estado === "cerrado" ? "SI" : "",
        cierraNombre: e.estado === "cerrado" ? sup.nombre : "",
        firmaCierre: e.estado === "cerrado" ? firmaDemo(80 + i) : "",
      },
    });
  });

  // Legalizaciones de gastos (FO-GSST-25)
  const factura = (n: number) =>
    `data:image/svg+xml;base64,${(typeof btoa === "function" ? btoa : (x: string) => Buffer.from(x).toString("base64"))(
      `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#fff"/><rect x="20" y="20" width="260" height="40" fill="#e2e8f0"/><text x="150" y="46" font-family="Arial" font-size="16" text-anchor="middle">RECIBO No. ${n}</text>${[90, 120, 150, 180, 210, 240].map((y) => `<rect x="30" y="${y}" width="${150 + ((y * n) % 90)}" height="10" fill="#cbd5e1"/>`).join("")}<rect x="30" y="320" width="240" height="2" fill="#94a3b8"/><text x="270" y="350" font-family="Arial" font-size="18" text-anchor="end" font-weight="bold">TOTAL</text><text x="150" y="385" font-family="Arial" font-size="11" fill="#64748b" text-anchor="middle">Imagen ilustrativa</text></svg>`,
    )}`;
  const gastos: { autor: Usuario; cliente: Cliente; fecha: string; estado: Estado; items: [string, string, string, number][] }[] = [
    { autor: tec1, cliente: clay, fecha: "2026-10-10", estado: "cerrado", items: [["Transporte", "Taxi Cartagena – Zona Industrial ida y vuelta", "TX-4821", 60000], ["Alimentación", "Almuerzo comisión de servicio", "FE-10233", 25000], ["Materiales", "Conectores y fusionadora (alquiler)", "FV-778", 180000]] },
    { autor: tec2, cliente: tango, fecha: "2026-10-16", estado: "en_revision", items: [["Transporte", "Parqueadero obra Hotel Brisas del Mar", "P-2231", 12000], ["Materiales", "Canaleta y amarres", "FV-1290", 95000]] },
  ];
  gastos.forEach((g, i) => {
    const n = i + 1;
    docs.push({
      id: `d-lg-${i}`,
      tipo: "gasto",
      codigo: `LG-${String(n).padStart(3, "0")}-${g.fecha.slice(2, 4)}`,
      consecutivo: n,
      estado: g.estado,
      autorId: g.autor.id,
      clienteId: g.cliente.id,
      creado: `${g.fecha}T17:00:00`,
      actualizado: `${g.fecha}T18:00:00`,
      historial: hist(g.fecha, g.autor, g.estado, "gasto", g.cliente.id),
      datos: {
        fecha: g.fecha,
        centroCostos: `${g.cliente.nombre} · ${g.cliente.sitio}`,
        colaborador: g.autor.nombre,
        cedula: (g.autor.cedula ?? "").replace(/\./g, ""),
        cargo: g.autor.cargo,
        telefono: "",
        clienteObra: g.cliente.nombre,
        items: g.items.map(([tipo, descripcion, recibo, valor], k) => ({ id: `${i}-${k}`, fecha: g.fecha, tipo: tipo as never, descripcion, recibo, cantidad: 1, valorUnitario: valor, soporte: factura(k + 1) })),
        observaciones: "Gastos de la comisión de servicio en sitio del cliente.",
        firmaColaborador: firmaDemo(90 + i),
        voboNombre: g.estado === "cerrado" ? sup.nombre : "",
        firmaVobo: g.estado === "cerrado" ? firmaDemo(95 + i) : "",
      },
    });
  });

  // Cotizaciones: aceptada (firmada por el cliente), aprobada (en el portal para aceptar) y borrador
  const servicio = (clave: string, cantidad: number, k: string) => {
    const sv = CATALOGO_SERVICIOS.find((x) => x.clave === clave)!;
    return { id: `cot-it-${k}`, descripcion: sv.descripcion, detalle: sv.detalle ?? "", cantidad, unidad: sv.unidad, precioUnitario: sv.precioReferencia, ivaPct: sv.ivaPct };
  };
  const cotizaciones: { id: string; cliente: Cliente; fecha: string; estado: Estado; asunto: string; items: ReturnType<typeof servicio>[] }[] = [
    { id: "d-cot-0", cliente: tango, fecha: "2026-07-10", estado: "cerrado", asunto: "Control de acceso torre B · Hotel Brisas del Mar", items: [servicio("control-acceso", 6, "0a"), servicio("cableado", 240, "0b"), servicio("visita", 1, "0c")] },
    { id: "d-cot-1", cliente: clay, fecha: "2026-10-15", estado: "aprobado", asunto: "Ampliación CCTV patio de secado", items: [servicio("inst-camara", 4, "1a"), servicio("cableado", 180, "1b"), servicio("config-nvr", 1, "1c")] },
    { id: "d-cot-2", cliente: puerto, fecha: "2026-10-21", estado: "borrador", asunto: "Mantenimiento detección de incendio bodegas", items: [servicio("visita", 2, "2a")] },
  ];
  // Lo comercial es de la administración: la gerencia cotiza y aprueba en un solo paso (sin revisor aparte)
  const adm = USUARIOS_SEED.find((x) => x.rol === "admin")!;
  cotizaciones.forEach((c, i) => {
    const n = i + 1;
    const h = [{ fecha: `${c.fecha}T09:00:00`, usuarioId: adm.id, accion: "Creó el documento" }];
    if (c.estado !== "borrador") h.push({ fecha: `${c.fecha}T15:00:00`, usuarioId: adm.id, accion: "Aprobó y envió al cliente" });
    if (c.estado === "cerrado") h.push({ fecha: `${c.fecha}T18:00:00`, usuarioId: "", accion: "Cotización aceptada por el cliente" });
    docs.push({
      id: c.id,
      tipo: "cotizacion",
      codigo: codigo("COT", n, c.fecha),
      consecutivo: n,
      estado: c.estado,
      autorId: adm.id,
      clienteId: c.cliente.id,
      creado: `${c.fecha}T09:00:00`,
      actualizado: `${c.fecha}T15:00:00`,
      historial: h,
      datos: {
        ...cotizacionVacia(c.fecha),
        vendedor: adm.nombre,
        cliente: c.cliente.nombre,
        clienteNit: c.cliente.nit ?? "",
        contacto: c.cliente.contacto,
        correo: c.cliente.correo,
        telefono: c.cliente.telefono,
        direccion: c.cliente.direccion,
        asunto: c.asunto,
        items: c.items,
        aceptaNombre: c.cliente.contacto,
        aceptaCargo: c.cliente.cargo,
        aceptaFecha: c.estado === "cerrado" ? c.fecha : "",
        firmaCliente: c.estado === "cerrado" ? firmaDemo(120 + i) : "",
      },
    });
  });

  // Cada documento queda en su proyecto; el reporte lo muestra en «Proyecto»
  const proyectos = proyectosSeed();
  // y los reportes marcan sus equipos atendidos (módulo Equipos) y su hora de llegada y salida
  const HORAS = [["08:00", "10:30"], ["07:30", "11:15"], ["09:00", "12:00"], ["13:00", "16:45"], ["08:15", "09:50"], ["10:00", "14:30"]];
  return docs.map((d0, k) => {
    let d = (EQUIPOS_DE_DOC[d0.id] ? { ...d0, equiposIds: EQUIPOS_DE_DOC[d0.id] } : d0) as Documento;
    if (d.tipo === "reporte" && d.estado !== "borrador") d = { ...d, datos: { ...d.datos, horaLlegada: HORAS[k % 6][0], horaSalida: HORAS[k % 6][1] } } as Documento;
    const p = proyectos.find((x) => x.id === PROYECTO_DE[d.id]);
    if (!p) return d;
    return (d.tipo === "reporte" ? { ...d, proyectoId: p.id, datos: { ...d.datos, proyecto: `${p.codigo} · ${p.nombre}` } } : { ...d, proyectoId: p.id }) as Documento;
  });
}

/** Avisos de ejemplo, coherentes con los documentos de la semilla. */
export function notificacionesSeed(): Notificacion[] {
  return [
    { id: "n1", para: "supervisor", texto: "Andrés Camacho envió el permiso PT-005-26 a revisión", docId: "d-pt-3", fecha: "2026-10-20T07:45:00", leida: false },
    { id: "n2", para: "supervisor", texto: "Andrés Camacho envió el reporte RT-009-26 a revisión", docId: "d-rt-7", fecha: "2026-10-17T15:20:00", leida: false },
    { id: "n3", para: "u-tec1", texto: "Tu reporte RT-007-26 fue rechazado: falta detallar las recomendaciones", docId: "d-rt-5", fecha: "2026-09-25T11:00:00", leida: false },
    { id: "n6", para: "u-cli", texto: "SOTEC compartió la cotización COT-002-26 para tu firma", docId: "d-cot-1", fecha: "2026-10-15T15:05:00", leida: false },
    { id: "n5", para: "u-cli", texto: "SOTEC aprobó el reporte RT-011-26 y está pendiente de tu firma", docId: "d-rt-9", fecha: "2026-10-20T11:05:00", leida: false },
    { id: "n4", para: "cliente", texto: "SOTEC compartió el reporte RT-001-26 para tu firma", docId: "d-rt-clay", fecha: "2026-05-26T12:00:00", leida: true },
  ];
}

/** Entradas de auditoría de ejemplo. */
export function auditoriaSeed(): Auditoria[] {
  return [
    { id: "a1", fecha: "2026-10-20T07:45:00", usuarioId: "u-tec1", accion: "Envió a revisión", detalle: "PT-005-26" },
    { id: "a2", fecha: "2026-10-17T15:20:00", usuarioId: "u-tec1", accion: "Envió a revisión", detalle: "RT-009-26" },
    { id: "a3", fecha: "2026-10-14T10:00:00", usuarioId: "u-sup", accion: "Aprobó", detalle: "PT-004-26" },
    { id: "a4", fecha: "2026-09-25T11:00:00", usuarioId: "u-sup", accion: "Rechazó", detalle: "RT-007-26" },
  ];
}

/** Inventario de equipos de ejemplo (vive en el módulo Equipos). */
export { equiposSeed } from "@/modulos/equipos/seed";
