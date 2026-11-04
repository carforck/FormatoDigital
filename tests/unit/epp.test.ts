// Pruebas de la entrega de EPP (pedido de Magno): validación antes de enviar y armado de la tabla
// al marcar elementos en el asistente. Uso: npx tsx tests/unit/epp.test.ts
import { eppVacio, itemEpp, itemsMarcados } from "../../src/modulos/epp/catalogo";
import { fechaLaClay, totalUnidades, unidadEpp } from "../../src/modulos/epp/tipos";
import { faltantesEpp } from "../../src/modulos/epp/validar";
import { bytesDataUrl, calidadesHasta, medidasReducidas } from "../../src/nucleo/imagenes";
import { FOTO_EPP, fechaExif, fechaTextoExif, formatoSello, leyendaFoto, lineasSello, momentoFoto } from "../../src/modulos/epp/foto";

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

// Matriz de La Clay: unidad de cada fila, fechas como en el papel y campos opcionales
igual("guantes → PAR", unidadEpp({ elemento: "Guantes de vaqueta" }), "PAR");
igual("botas → PAR", unidadEpp({ elemento: "Botas dieléctricas" }), "PAR");
igual("respirador → UNIDAD", unidadEpp({ elemento: "Respirador material particulado N95" }), "UNIDAD");
igual("gafas → UNIDAD", unidadEpp({ elemento: "Gafas de seguridad" }), "UNIDAD");
igual("la unidad anotada manda (en mayúsculas)", unidadEpp({ elemento: "Guantes de vaqueta", unidad: "caja" }), "CAJA");
igual("fecha ISO → d/mm/aaaa", fechaLaClay("2026-05-05"), "5/05/2026");
igual("fecha con día de dos cifras", fechaLaClay("2026-05-28"), "28/05/2026");
igual("fecha vacía", fechaLaClay(""), "");
igual("código, unidad y solicitado son opcionales al validar", faltantesEpp({ ...lleno, proceso: "Producción", items: [{ ...lleno.items[0], codigo: "EPP-0001", unidad: "UNIDAD", solicitado: "2026-11-01" }] }), []);

// Foto de quien recibe: fecha y hora de la foto (EXIF → archivo → ahora), nunca escritas a mano
/** JPEG mínimo con un APP1 EXIF: IFD0 (DateTime y puntero al IFD EXIF) e IFD EXIF (DateTimeOriginal). */
function jpegConExif(o: { original?: string; general?: string; le?: boolean }): Uint8Array {
  const le = o.le ?? false;
  const textos: [number, string][] = [];
  const tiff: number[] = [];
  const u16 = (n: number) => (le ? [n & 255, n >> 8] : [n >> 8, n & 255]);
  const u32 = (n: number) => (le ? [n & 255, (n >> 8) & 255, (n >> 16) & 255, n >>> 24] : [n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255]);
  // Cabecera (8) + IFD0 con 2 entradas (2 + 24 + 4 = 30) + IFD EXIF con 1 entrada (2 + 12 + 4 = 18) + textos
  const ifd0 = 8;
  const ifdExif = ifd0 + 30;
  let datos = ifdExif + 18;
  const entrada = (tag: number, texto?: string) => {
    if (!texto) return [...u16(0x9999), ...u16(4), ...u32(1), ...u32(0)];
    const off = datos;
    textos.push([off, texto]);
    datos += texto.length + 1;
    return [...u16(tag), ...u16(2), ...u32(texto.length + 1), ...u32(off)];
  };
  tiff.push(...(le ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(ifd0));
  tiff.push(...u16(2), ...entrada(0x0132, o.general), ...u16(0x8769), ...u16(4), ...u32(1), ...u32(ifdExif), ...u32(0));
  tiff.push(...u16(1), ...entrada(0x9003, o.original), ...u32(0));
  for (const [, t] of textos) tiff.push(...[...t].map((c) => c.charCodeAt(0)), 0);
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const largo = app1.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xe1, largo >> 8, largo & 255, ...app1, 0xff, 0xda, 0, 2, 0xff, 0xd9]);
}
const local = (a: number, me: number, d: number, h: number, mi: number, se = 0) => new Date(a, me - 1, d, h, mi, se);
igual("sello dd/mm/aaaa hh:mm (24 h, con ceros)", formatoSello(local(2026, 11, 4, 9, 5)), "04/11/2026 09:05");
igual("sello de la tarde", formatoSello(local(2026, 1, 28, 17, 45)), "28/01/2026 17:45");
igual("sello desde ISO", formatoSello(local(2026, 3, 7, 6, 30).toISOString()), "07/03/2026 06:30");
igual("sello de una fecha inválida: vacío", formatoSello("no es fecha"), "");
igual("texto EXIF → fecha local", fechaTextoExif("2026:11:04 09:05:33")?.getTime(), local(2026, 11, 4, 9, 5, 33).getTime());
igual("texto EXIF en ceros (cámara sin reloj) → null", fechaTextoExif("0000:00:00 00:00:00"), null);
igual("texto EXIF con día imposible → null", fechaTextoExif("2026:02:31 10:00:00"), null);
igual("EXIF DateTimeOriginal (Motorola, big-endian)", fechaExif(jpegConExif({ original: "2026:11:04 09:05:00", general: "2026:11:05 10:00:00" }))?.getTime(), local(2026, 11, 4, 9, 5).getTime());
igual("EXIF DateTimeOriginal (Intel, little-endian)", fechaExif(jpegConExif({ original: "2025:12:24 18:30:10", le: true }))?.getTime(), local(2025, 12, 24, 18, 30, 10).getTime());
igual("sin DateTimeOriginal: DateTime del IFD0", fechaExif(jpegConExif({ general: "2026:10:01 07:15:00" }))?.getTime(), local(2026, 10, 1, 7, 15).getTime());
igual("JPEG sin EXIF → null", fechaExif(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xda, 0, 2])), null);
igual("no es JPEG → null", fechaExif(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), null);
igual("EXIF truncado → null (sin error)", fechaExif(jpegConExif({ original: "2026:11:04 09:05:00" }).slice(0, 30)), null);

const ahora = local(2026, 11, 4, 10, 0).getTime();
const hace = (min: number) => ahora - min * 60000;
const m1 = momentoFoto({ exif: new Date(hace(3)), lastModified: hace(1), ahora, origen: "camara" });
igual("cámara con EXIF: manda el EXIF y es «en sitio»", [m1.tomada, m1.fuente, m1.origen], [new Date(hace(3)).toISOString(), "exif", "camara"]);
const m2 = momentoFoto({ exif: null, lastModified: hace(1), ahora, origen: "camara" });
igual("cámara sin EXIF: fecha del archivo", [m2.tomada, m2.fuente, m2.origen], [new Date(hace(1)).toISOString(), "archivo", "camara"]);
const m3 = momentoFoto({ exif: null, lastModified: 0, ahora, origen: "camara" });
igual("cámara sin EXIF ni fecha de archivo: el momento en que llega", [m3.tomada, m3.fuente, m3.origen], [new Date(ahora).toISOString(), "ahora", "camara"]);
const m4 = momentoFoto({ exif: new Date(ahora + 3600000), lastModified: hace(2), ahora, origen: "camara" });
igual("EXIF en el futuro (reloj mal): se descarta", [m4.fuente, m4.tomada], ["archivo", new Date(hace(2)).toISOString()]);
const m5 = momentoFoto({ exif: new Date(hace(60 * 24 * 3)), lastModified: hace(1), ahora, origen: "camara" });
igual("«Tomar foto» con una foto vieja (computador): queda como de galería", [m5.fuente, m5.origen], ["exif", "galeria"]);
const m6 = momentoFoto({ exif: new Date(hace(60 * 24 * 3)), lastModified: hace(1), ahora, origen: "galeria" });
igual("galería con EXIF: la fecha de la foto", [m6.tomada, m6.fuente, m6.origen], [new Date(hace(60 * 24 * 3)).toISOString(), "exif", "galeria"]);
const m7 = momentoFoto({ exif: new Date(1980, 0, 1), lastModified: undefined, ahora, origen: "galeria" });
igual("galería con fecha imposible y sin archivo: ahora", [m7.fuente, m7.origen], ["ahora", "galeria"]);

const t0 = local(2026, 11, 4, 9, 5).toISOString();
igual("leyenda en sitio", leyendaFoto({ tomada: t0, origen: "camara", fuente: "exif" }), "Tomada en sitio el 04/11/2026 09:05");
igual("leyenda de galería con EXIF", leyendaFoto({ tomada: t0, origen: "galeria", fuente: "exif" }), "Foto de galería · tomada el 04/11/2026 09:05");
igual("leyenda de galería con fecha del archivo", leyendaFoto({ tomada: t0, origen: "galeria", fuente: "archivo" }), "Foto de galería · archivo del 04/11/2026 09:05");
igual("leyenda de galería sin fecha propia", leyendaFoto({ tomada: t0, origen: "galeria", fuente: "ahora" }), "Foto de galería · agregada el 04/11/2026 09:05");
igual("sello estampado en la imagen", lineasSello({ tomada: t0, origen: "camara" }), ["04/11/2026 09:05", "Entrega de EPP"]);
igual("sello de una foto de galería", lineasSello({ tomada: t0, origen: "galeria" }), ["04/11/2026 09:05", "Entrega de EPP · foto de galería"]);
// Compresión de la foto: lado mayor ≤ 1024 px, JPEG 0.7 y menos de 150 KB
igual("límites de la foto de EPP", [FOTO_EPP.lado, FOTO_EPP.calidad, FOTO_EPP.maxBytes], [1024, 0.7, 153600]);
igual("foto de 12 MP horizontal (4032×3024) → 1024×768", medidasReducidas(4032, 3024, FOTO_EPP.lado), { ancho: 1024, alto: 768 });
igual("foto vertical (3024×4032) → 768×1024", medidasReducidas(3024, 4032, FOTO_EPP.lado), { ancho: 768, alto: 1024 });
igual("cámara web 1280×720 → 1024×576", medidasReducidas(1280, 720, FOTO_EPP.lado), { ancho: 1024, alto: 576 });
igual("una foto pequeña no se agranda", medidasReducidas(640, 480, FOTO_EPP.lado), { ancho: 640, alto: 480 });
igual("panorámica muy angosta: al menos 1 px", medidasReducidas(20000, 10, FOTO_EPP.lado), { ancho: 1024, alto: 1 });
igual("medidas inválidas (video sin cuadro) → 0", medidasReducidas(0, 0, FOTO_EPP.lado), { ancho: 0, alto: 0 });
const lados = [[4032, 3024], [3024, 4032], [1920, 1080], [1080, 1920], [4000, 4000], [800, 600]].map(([w, h]) => medidasReducidas(w, h, FOTO_EPP.lado));
igual("ningún lado pasa de 1024 px", lados.every((m) => Math.max(m.ancho, m.alto) <= 1024), true);
igual("bytes de un data URL (base64 con relleno)", [bytesDataUrl("data:image/jpeg;base64,QUJD"), bytesDataUrl("data:image/jpeg;base64,QUI="), bytesDataUrl("data:image/jpeg;base64,QQ==")], [3, 2, 1]);
igual("150 KB en base64 ≈ 200 KB de texto", bytesDataUrl(`data:image/jpeg;base64,${"A".repeat(204800)}`), 153600);
igual("calidades que se prueban si pesa más de 150 KB (piso 0.4)", calidadesHasta(0.7), [0.7, 0.6, 0.5, 0.4]);
igual("la foto es opcional al validar", faltantesEpp({ ...lleno, fotoRecibe: undefined }), []);

console.log(fallos ? `\n${fallos} de ${casos} casos fallaron` : `✓ epp: ${casos} casos`);
process.exit(fallos ? 1 : 0);
