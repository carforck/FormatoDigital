/**
 * Programación y acta de entrega del sistema de seguridad electrónica (FORMA 7PA/F1-13).
 * Formato PROPIO de Fortox: SOTEC instala el sistema para un abonado de Fortox y diligencia
 * el formato de Fortox; no existe versión SOTEC (ver «Formatos propios de un cliente» en
 * @/nucleo/variantes). Dos hojas carta:
 *   1. Información de contacto, materiales, zonificación (tipo de sistema, particiones y zonas).
 *   2. Registro de usuarios activos (personal responsable), horarios, capacitación, protocolos,
 *      firma del cliente y del técnico, y el control interno que Fortox firma en papel.
 *
 * DATOS SENSIBLES: `claveMaestra`, `claveInstalador` y la `claveTelefonica` de cada usuario
 * son códigos del panel de alarma. Se muestran enmascarados (●●●●) y solo los revelan el autor,
 * la coordinación y la administración (ver ./claves.ts y `puedeVerClaves` en @/nucleo/permisos).
 */

/** Tipos de sistema con casilla en la zonificación. */
export type SistemaActa = "Alarma" | "CCTV" | "Control de Acceso" | "Sistema de Detección de Incendios";

/** Días de la tabla de horarios (con «Festivos»). */
export type DiaActa = "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes" | "Sábado" | "Domingo" | "Festivos";

/** Renglón de «II. Materiales»: descripción y cantidades despachada, instalada y reintegrada (texto: pueden ir vacías). */
export interface MaterialActa {
  id: string;
  descripcion: string;
  despacho: string;
  instalado: string;
  reintegro: string;
}

/** Zona del sistema (# Zona 1–36 del formato): cantidad de dispositivos, descripción y partición. */
export interface ZonaActa {
  numero: number;
  cantidad: string;
  descripcion: string;
  particion: string;
}

/** Usuario activo del sistema de alarma («IV. Personal responsable»), en orden de prioridad. */
export interface UsuarioActa {
  id: string;
  nombre: string;
  cargo: string;
  /** Número de usuario en el panel. */
  usuario: string;
  /** SENSIBLE: clave telefónica del usuario (se enmascara). */
  claveTelefonica: string;
  telefono: string;
  celular: string;
}

/** Contenido del acta. */
export interface DatosActa {
  // ── Encabezado
  /** «Cliente Nuevo» o «Adición» (casillas del encabezado). */
  tipoActa: "" | "Cliente Nuevo" | "Adición";
  /** Ciudad donde se entrega (celda CIUDAD del encabezado). */
  ciudad: string;
  /** Fecha (AAAA-MM-DD; impresa en AA · MM · DD). */
  fecha: string;
  /** Proyecto como se muestra («PRY-012-25 · …»): no va en el papel, solo en la app. */
  proyecto: string;

  // ── I. Información de contacto
  cliente: string;
  abonado: string;
  nit: string;
  an8: string;
  ciudadCliente: string;
  direccion: string;
  telefono: string;
  barrio: string;
  correo: string;
  contacto: string;
  cargo: string;
  /** Marca y referencia del panel de alarma. */
  panel: string;
  comunicacionPrimaria: string;
  simCard: string;
  comunicacionSecundaria: string;
  intervaloTest: string;
  /** SENSIBLE: clave maestra del panel. */
  claveMaestra: string;
  /** SENSIBLE: clave de instalador del panel. */
  claveInstalador: string;

  // ── II. Materiales (dos tablas de 6 renglones en el papel)
  materiales: MaterialActa[];

  // ── III. Zonificación
  sistemas: SistemaActa[];
  /** Nombre de las particiones 1 a 8 (índice 0 = partición 1). */
  particiones: string[];
  zonas: ZonaActa[];

  // ── Hoja 2: registro de usuarios activos
  /** «Unidad nueva» o «Actualización de datos». */
  registro: "" | "Unidad nueva" | "Actualización de datos";
  usuarios: UsuarioActa[];
  /** V. Horarios: días con apertura y con cierre marcados. */
  apertura: DiaActa[];
  cierre: DiaActa[];
  /** Temas de la capacitación marcados (ver `TEMAS_CAPACITACION`). */
  capacitacion: string[];
  /** «Otro ¿Cuál?» de la capacitación. */
  capacitacionOtro: string;
  /** VI. Protocolos u observaciones del cliente. */
  observaciones: string;

  // ── Firmas
  /** Firma del cliente que recibe a satisfacción («Firma y C.C Cliente»). */
  firmaCliente: string;
  nombreFirmaCliente: string;
  cedulaFirmaCliente: string;
  /** Nombre del técnico que entrega (el autor por defecto). */
  tecnico: string;
  /** Firma del técnico que entrega (data URL). */
  firmaTecnico: string;
}
