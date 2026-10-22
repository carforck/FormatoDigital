import type { Equipo, EstadoEquipo, SistemaEquipo } from "./tipos";

/**
 * Inventario de ejemplo (clientes, ubicaciones y seriales ficticios; las marcas
 * son solo fabricantes de equipos). Los reportes de la semilla los marcan como
 * atendidos (EQUIPOS_DE_DOC), así cada ficha ya trae historial.
 */
type Fila = [id: string, sistema: SistemaEquipo, tipo: string, nombre: string, marca: string, modelo: string, serial: string, ubicacion: string, estado?: EstadoEquipo, notas?: string];

const CLAY: Fila[] = [
  ["eq-clay-nvr", "cctv", "NVR", "NVR principal 16 canales", "Dahua", "NVR4216-16P-4KS2", "DH-NVR-0000101", "Cuarto de comunicaciones", "operativo", "Grabación continua 30 días. Monitoreo remoto por la app del fabricante."],
  ["eq-clay-sw", "cctv", "Switch PoE", "Switch PoE nodo Molienda", "Hikvision", "DS-3E0318P-E", "HK-SW-0000102", "Nodo Molienda"],
  ["eq-clay-c01", "cctv", "Cámara domo", "Cámara 1 – Portería", "Dahua", "IPC-HDW2431T", "DH-CAM-0000111", "Portería"],
  ["eq-clay-c02", "cctv", "Cámara bala", "Cámara 2 – Hornos 1", "Hikvision", "DS-2CD2T47G2", "HK-CAM-0000112", "Hornos"],
  ["eq-clay-c03", "cctv", "Cámara bala", "Cámara 3 – Hornos 2", "Hikvision", "DS-2CD2T47G2", "HK-CAM-0000113", "Hornos"],
  ["eq-clay-c04", "cctv", "Cámara bala", "Cámara 4 – Patio de secado norte", "Hikvision", "DS-2CD2T47G2", "HK-CAM-0000114", "Patio de secado", "con_falla", "Imagen con interferencia en la noche: revisar conector y fuente."],
  ["eq-clay-c05", "cctv", "Cámara bala", "Cámara 5 – Patio de secado sur", "Hikvision", "DS-2CD2T47G2", "HK-CAM-0000115", "Patio de secado"],
  ["eq-clay-c06", "cctv", "Cámara domo", "Cámara 6 – Molienda", "Dahua", "IPC-HDW2431T", "DH-CAM-0000116", "Molienda"],
  ["eq-clay-c07", "cctv", "Cámara domo", "Cámara 7 – Bodega de producto", "Dahua", "IPC-HDW2431T", "DH-CAM-0000117", "Bodega de producto"],
  ["eq-clay-c08", "cctv", "Cámara bala", "Cámara 8 – Báscula", "Dahua", "IPC-HFW2431S", "DH-CAM-0000118", "Báscula"],
  ["eq-clay-c09", "cctv", "Cámara bala", "Cámara 9 – Parqueadero", "Dahua", "IPC-HFW2431S", "", "Parqueadero"],
  ["eq-clay-c10", "cctv", "Cámara domo", "Cámara 10 – Oficinas", "Dahua", "IPC-HDW2431T", "", "Oficinas administrativas"],
  ["eq-clay-pan", "alarmas", "Panel de alarma", "Panel de alarma bodega", "Paradox", "SP6000", "PX-PAN-0000121", "Bodega de producto"],
  ["eq-clay-s01", "alarmas", "Sensor de movimiento", "Sensor 1 – Bodega acceso", "Paradox", "PMD2P", "", "Bodega de producto"],
  ["eq-clay-s02", "alarmas", "Sensor de movimiento", "Sensor 2 – Bodega fondo", "Paradox", "PMD2P", "", "Bodega de producto"],
  ["eq-clay-pc", "computo", "PC", "PC de monitoreo", "Lenovo", "ThinkCentre M70s", "LN-PC-0000131", "Sala de control"],
];

const CONJ: Fila[] = [
  ["eq-conj-ene", "cerca", "Energizador", "Energizador cerca perimetral", "Nemtek", "Druid 21", "NT-EN-0000201", "Portería principal"],
  ["eq-conj-z1", "cerca", "Zona de cerca", "Zona 1 – Lindero norte", "", "", "", "Lindero norte"],
  ["eq-conj-z2", "cerca", "Zona de cerca", "Zona 2 – Lindero sur", "", "", "", "Lindero sur"],
  ["eq-conj-pan", "alarmas", "Panel de alarma", "Panel de alarma portería", "Paradox", "MG5050", "PX-PAN-0000211", "Portería principal"],
  ["eq-conj-sp1", "alarmas", "Sensor de movimiento", "Sensor perimetral 1 – Lindero norte", "Paradox", "NV780MX", "", "Lindero norte"],
  ["eq-conj-sir", "alarmas", "Sirena", "Sirena exterior portería", "", "", "", "Portería principal"],
  ["eq-conj-ctl", "acceso", "Controladora", "Controladora portería peatonal", "ZKTeco", "inBio260", "ZK-CT-0000221", "Portería peatonal"],
  ["eq-conj-bio", "acceso", "Lectora biométrica", "Lectora biométrica portería", "ZKTeco", "SpeedFace-V5L", "ZK-LB-0000222", "Portería peatonal"],
  ["eq-conj-cer", "acceso", "Cerradura electromagnética", "Cerradura puerta peatonal", "ZKTeco", "LM-280", "", "Portería peatonal"],
  ["eq-conj-ptz", "cctv", "Cámara PTZ", "Cámara PTZ – Portería", "Hikvision", "DS-2DE4425IW", "HK-PTZ-0000231", "Portería principal", "fuera_servicio", "Fuente de poder averiada; cambio pendiente de aprobación de la administración."],
];

const TANGO: Fila[] = [
  ["eq-tango-ctl", "acceso", "Controladora", "Controladora torre B", "ZKTeco", "inBio460", "ZK-CT-0000301", "Torre B · cuarto técnico"],
  ["eq-tango-tor", "acceso", "Torniquete", "Torniquete 1 – Lobby torre B", "ZKTeco", "TS2000", "", "Lobby torre B"],
  ["eq-tango-lec", "acceso", "Lectora de tarjeta", "Lectora tarjeta – Ascensor torre B", "ZKTeco", "KR600E", "", "Ascensor torre B"],
  ["eq-tango-sw", "computo", "Switch", "Switch oficina de obra", "TP-Link", "TL-SG1024", "", "Oficina de obra"],
];

const PUERTO: Fila[] = [
  ["eq-puerto-c1", "cctv", "Cámara bala", "Cámara 1 – Bodega acceso", "Hikvision", "DS-2CD2043G2", "", "Bodega"],
  ["eq-puerto-c2", "cctv", "Cámara bala", "Cámara 2 – Patio de contenedores", "Hikvision", "DS-2CD2043G2", "", "Patio 2"],
  ["eq-puerto-fpan", "incendio", "Panel de incendio", "Panel de incendio bodegas", "Notifier", "NFS2-640", "NF-PI-0000401", "Bodega 1 · cuarto eléctrico"],
  ["eq-puerto-fd1", "incendio", "Detector de humo", "Detector de humo B1-01", "Notifier", "FSP-851", "", "Bodega 1"],
  ["eq-puerto-fd2", "incendio", "Detector de humo", "Detector de humo B2-01", "Notifier", "FSP-851", "", "Bodega 2"],
];

const PROYECTO: Record<string, string> = { "c-clay": "p-1", "c-conj": "p-4", "c-tango": "p-2" };

export function equiposSeed(): Equipo[] {
  const armar = (clienteId: string, filas: Fila[], fecha: string, autor: string): Equipo[] =>
    filas.map(([id, sistema, tipo, nombre, marca, modelo, serial, ubicacion, estado = "operativo", notas = ""]) => ({
      id,
      clienteId,
      proyectoId: PROYECTO[clienteId],
      sistema,
      tipo,
      nombre,
      marca,
      modelo,
      serial,
      ubicacion,
      estado,
      notas,
      creadoPor: autor,
      creado: `${fecha}T08:00:00`,
      actualizado: `${fecha}T08:00:00`,
      historial: [{ fecha: `${fecha}T08:00:00`, usuarioId: autor, accion: "Registró el equipo" }],
    }));
  return [
    ...armar("c-clay", CLAY, "2026-05-26", "u-tec1"),
    ...armar("c-conj", CONJ, "2026-07-03", "u-tec1"),
    ...armar("c-tango", TANGO, "2026-07-21", "u-tec2"),
    ...armar("c-puerto", PUERTO, "2026-06-12", "u-tec2"),
  ];
}

/** Equipos atendidos en cada reporte de la semilla (mismo cliente del reporte). */
export const EQUIPOS_DE_DOC: Record<string, string[]> = {
  "d-rt-clay": ["eq-clay-sw", "eq-clay-c04", "eq-clay-c05", "eq-clay-c06"],
  "d-rt-3": ["eq-clay-nvr", "eq-clay-pc", "eq-clay-c01"],
  "d-rt-7": ["eq-clay-nvr", "eq-clay-c02", "eq-clay-c03", "eq-clay-c04"],
  "d-rt-9": ["eq-clay-pan", "eq-clay-s01", "eq-clay-s02"],
  "d-rt-1": ["eq-conj-ene", "eq-conj-z1", "eq-conj-z2"],
  "d-rt-5": ["eq-conj-ptz"],
  "d-rt-8": ["eq-conj-pan", "eq-conj-sp1", "eq-conj-sir"],
  "d-rt-2": ["eq-tango-ctl", "eq-tango-tor", "eq-tango-lec"],
  "d-rt-6": ["eq-tango-sw"],
  "d-rt-0": ["eq-puerto-c1", "eq-puerto-c2"],
  "d-rt-4": ["eq-puerto-fpan", "eq-puerto-fd1", "eq-puerto-fd2"],
};
