/**
 * Foto del trabajador recibiendo el EPP (evidencia de la entrega, opcional, además de su firma).
 *
 * La fecha y la hora nunca se escriben a mano: salen de la foto. Con «Tomar foto» es el momento
 * de la captura; con «Galería» la fecha de la foto. En ambos casos se prefiere la fecha EXIF
 * (DateTimeOriginal) del JPEG, luego la fecha del archivo (`lastModified`) y por último el
 * momento en que se recibió. La leyenda dice de dónde viene para que sea honesta («Tomada en
 * sitio el …» vs «Foto de galería · tomada el …»). Si una foto «de cámara» resulta mucho más
 * vieja que el momento en que se recibe (en el computador «Tomar foto» abre el selector de
 * archivos), se trata como de galería.
 * La fecha también se estampa en la imagen (franja al pie) para que quede en el PDF impreso.
 */

import { aJpeg, comprimirImagen } from "@/nucleo/imagenes";

/** Compresión de la foto guardada: lado mayor ≤ 1024 px, JPEG 0.7 y, si pesa más de 150 KB, menos calidad. */
export const FOTO_EPP = { lado: 1024, calidad: 0.7, maxBytes: 150 * 1024 } as const;

/** De dónde salió la fecha de la foto. */
export type FuenteFecha = "exif" | "archivo" | "ahora";

/** Foto de quien recibe el EPP, con la fecha y hora de la captura (ISO). */
export interface FotoRecibeEpp {
  /** Data URL JPEG comprimido, con la fecha estampada al pie. */
  src: string;
  /** Momento de la captura (ISO 8601). */
  tomada: string;
  origen: "camara" | "galeria";
  /** De dónde salió `tomada` (EXIF, fecha del archivo o el momento en que se agregó). */
  fuente?: FuenteFecha;
}

/** Margen para relojes desajustados: una fecha hasta 10 min en el futuro todavía vale. */
const FUTURO_MS = 10 * 60 * 1000;
/** Una foto de cámara con fecha más vieja que esto no se tomó «en sitio» ahora: se trata como de galería. */
const EN_SITIO_MS = 15 * 60 * 1000;
const MINIMO = Date.UTC(2000, 0, 1);

const dosCifras = (n: number) => String(n).padStart(2, "0");

/** «dd/mm/aaaa hh:mm» (24 h, hora local del dispositivo). */
export function formatoSello(f: Date | string): string {
  const d = typeof f === "string" ? new Date(f) : f;
  if (Number.isNaN(d.getTime())) return "";
  return `${dosCifras(d.getDate())}/${dosCifras(d.getMonth() + 1)}/${d.getFullYear()} ${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}`;
}

/** Texto bajo la foto: deja claro si se tomó en sitio o vino de la galería. */
export function leyendaFoto(f: Pick<FotoRecibeEpp, "tomada" | "origen" | "fuente">): string {
  const s = formatoSello(f.tomada);
  if (f.origen === "camara") return `Tomada en sitio el ${s}`;
  if (f.fuente === "archivo") return `Foto de galería · archivo del ${s}`;
  if (f.fuente === "ahora") return `Foto de galería · agregada el ${s}`;
  return `Foto de galería · tomada el ${s}`;
}

/** Líneas que se estampan al pie de la imagen. */
export function lineasSello(f: Pick<FotoRecibeEpp, "tomada" | "origen">): string[] {
  return [formatoSello(f.tomada), f.origen === "camara" ? "Entrega de EPP" : "Entrega de EPP · foto de galería"];
}

const plausible = (t: number | null | undefined, ahora: number): t is number => typeof t === "number" && Number.isFinite(t) && t >= MINIMO && t <= ahora + FUTURO_MS;

/**
 * Momento de la foto: EXIF → fecha del archivo → ahora (descarta fechas imposibles: antes de
 * 2000 o en el futuro). Una foto de cámara con fecha de hace más de 15 min queda como de galería.
 */
export function momentoFoto(o: { exif?: Date | null; lastModified?: number; ahora: number; origen: "camara" | "galeria" }): { tomada: string; fuente: FuenteFecha; origen: "camara" | "galeria" } {
  const exif = o.exif?.getTime();
  let t: number;
  let fuente: FuenteFecha;
  if (plausible(exif, o.ahora)) [t, fuente] = [exif, "exif"];
  else if (plausible(o.lastModified, o.ahora)) [t, fuente] = [o.lastModified, "archivo"];
  else [t, fuente] = [o.ahora, "ahora"];
  const origen = o.origen === "camara" && o.ahora - t > EN_SITIO_MS ? "galeria" : o.origen;
  return { tomada: new Date(t).toISOString(), fuente, origen };
}

/** «2026:11:04 09:05:33» (EXIF, hora local sin zona) → Date local; `null` si no es una fecha válida. */
export function fechaTextoExif(s: string): Date | null {
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s.trim());
  if (!m) return null;
  const [a, me, d, h, mi, se] = m.slice(1).map((x) => Number(x ?? 0));
  if (a < 1900 || me < 1 || me > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || se > 59) return null;
  const f = new Date(a, me - 1, d, h, mi, se);
  return f.getMonth() === me - 1 ? f : null;
}

/**
 * Fecha EXIF de un JPEG (solo lo necesario, sin dependencias): DateTimeOriginal, si no
 * DateTimeDigitized y si no DateTime del IFD0. Basta con los primeros ~128 KB del archivo.
 * `null` si no es JPEG, no tiene EXIF o la fecha no se puede leer.
 */
export function fechaExif(datos: ArrayBuffer | Uint8Array): Date | null {
  const b = datos instanceof Uint8Array ? datos : new Uint8Array(datos);
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  try {
    if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
    let o = 2;
    while (o + 4 <= v.byteLength) {
      if (v.getUint8(o) !== 0xff) return null;
      const marca = v.getUint8(o + 1);
      if (marca === 0xff) {
        o++; // relleno
        continue;
      }
      if (marca === 0xd9 || marca === 0xda) return null; // fin de imagen / inicio de los datos
      const largo = v.getUint16(o + 2);
      if (largo < 2) return null;
      if (marca === 0xe1 && o + 10 <= v.byteLength && ascii(v, o + 4, 6) === "Exif\0\0") {
        const f = leerTiff(v, o + 10, Math.min(v.byteLength, o + 2 + largo));
        if (f) return f;
      }
      o += 2 + largo;
    }
  } catch {
    // Archivo truncado o EXIF dañado: sin fecha EXIF
  }
  return null;
}

function ascii(v: DataView, o: number, n: number): string {
  let s = "";
  for (let k = 0; k < n && o + k < v.byteLength; k++) s += String.fromCharCode(v.getUint8(o + k));
  return s;
}

/** Lee el bloque TIFF del EXIF (desde `t` hasta `fin`) y devuelve la mejor fecha. */
function leerTiff(v: DataView, t: number, fin: number): Date | null {
  const orden = v.getUint16(t);
  if (orden !== 0x4949 && orden !== 0x4d4d) return null;
  const le = orden === 0x4949;
  const u16 = (o: number) => v.getUint16(o, le);
  const u32 = (o: number) => v.getUint32(o, le);
  if (u16(t + 2) !== 42) return null;

  /** Entradas de un IFD: etiqueta → [tipo, cantidad, valor u offset]. */
  const ifd = (o: number) => {
    const r = new Map<number, [number, number, number]>();
    if (o + 2 > fin) return r;
    const n = u16(o);
    for (let k = 0; k < n; k++) {
      const e = o + 2 + k * 12;
      if (e + 12 > fin) break;
      r.set(u16(e), [u16(e + 2), u32(e + 4), u32(e + 8)]);
    }
    return r;
  };
  const texto = (e?: [number, number, number]) => {
    if (!e || e[0] !== 2) return null;
    const [, n, off] = e;
    const o = n <= 4 ? -1 : t + off;
    if (o < 0 || o + n > fin) return null;
    return fechaTextoExif(ascii(v, o, n).replace(/\0.*$/, ""));
  };

  const ifd0 = ifd(t + u32(t + 4));
  const ptrExif = ifd0.get(0x8769);
  const exif = ptrExif ? ifd(t + ptrExif[2]) : new Map<number, [number, number, number]>();
  return texto(exif.get(0x9003)) ?? texto(exif.get(0x9004)) ?? texto(ifd0.get(0x0132));
}

/**
 * Prepara la foto elegida (solo en el navegador): toma el momento en que llega el archivo,
 * lee la fecha EXIF, la comprime y le estampa la fecha y «Entrega de EPP» al pie.
 * Lanza un error si el navegador no puede abrir la imagen (quien llama muestra el aviso).
 */
export async function prepararFotoRecibe(archivo: File, origen: "camara" | "galeria", ahora = Date.now()): Promise<FotoRecibeEpp> {
  let exif: Date | null = null;
  try {
    exif = fechaExif(await archivo.slice(0, 256 * 1024).arrayBuffer());
  } catch {
    exif = null;
  }
  const m = momentoFoto({
    exif,
    lastModified: archivo.lastModified,
    ahora,
    origen,
  });
  const src = await comprimirImagen(archivo, FOTO_EPP.lado, FOTO_EPP.calidad, lineasSello(m), FOTO_EPP.maxBytes);
  return { src, ...m };
}

/**
 * Foto desde la cámara de la app (cuadro actual del `<video>`): el momento es el de «Capturar»,
 * en sitio, con la misma compresión y el sello al pie. La vista de la cámara frontal
 * se ve como un espejo, pero la foto se guarda sin invertir (como la vería otra persona).
 */
export function fotoDesdeVideo(video: HTMLVideoElement, ahora = Date.now()): FotoRecibeEpp {
  const m = { tomada: new Date(ahora).toISOString(), origen: "camara" as const, fuente: "ahora" as const };
  const src = aJpeg(video, video.videoWidth, video.videoHeight, { ...FOTO_EPP, sello: lineasSello(m) });
  return { src, ...m };
}
