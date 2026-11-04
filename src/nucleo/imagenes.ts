/**
 * Reduce una foto del celular antes de guardarla: máximo `lado` px en el lado
 * mayor y JPEG con `calidad`. Una foto de 4 MB queda en ~100-200 KB, suficiente
 * para el registro fotográfico impreso y los soportes de gastos. Devuelve un
 * data URL JPEG (fondo blanco para las PNG con transparencia). Solo en el navegador.
 * Si el navegador no puede abrir el archivo (HEIC del iPhone fuera de Safari, archivo
 * dañado) lanza un error: quien la llama muestra el aviso (`ElegirImagen`).
 * `sello`: líneas que se estampan al pie de la imagen (franja oscura con letra blanca), p. ej.
 * la fecha y hora de la foto de la entrega de EPP: quedan en la imagen aunque se reutilice.
 */
export async function comprimirImagen(archivo: File, lado = 1280, calidad = 0.72, sello?: string[], maxBytes?: number): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => mal(new Error("No se pudo leer la imagen"));
      i.src = url;
    });
    return aJpeg(img, img.naturalWidth, img.naturalHeight, { lado, calidad, sello, maxBytes });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Medidas reducidas: el lado mayor queda en `lado` px como máximo (sin agrandar), proporción intacta. */
export function medidasReducidas(ancho: number, alto: number, lado: number): { ancho: number; alto: number } {
  if (!(ancho > 0 && alto > 0)) return { ancho: 0, alto: 0 };
  const escala = Math.min(1, lado / Math.max(ancho, alto));
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) };
}

/** Bytes que ocupa el contenido de un data URL en base64 (lo que pesa la imagen guardada). */
export function bytesDataUrl(url: string): number {
  const b64 = url.slice(url.indexOf(",") + 1);
  return Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
}

/** Calidades que se prueban, de la pedida hacia abajo, hasta quedar bajo `maxBytes` (piso 0.4). */
export function calidadesHasta(calidad: number): number[] {
  const r = [calidad];
  for (let q = Math.round((calidad - 0.1) * 100) / 100; q >= 0.4 - 1e-9; q = Math.round((q - 0.1) * 100) / 100) r.push(q);
  return r;
}

/**
 * Dibuja una imagen o un cuadro de video (cámara en la app) reducido a `lado`, con el `sello`
 * al pie, y lo devuelve como JPEG. Con `maxBytes` baja la calidad hasta que pese menos.
 */
export function aJpeg(fuente: CanvasImageSource, ancho: number, alto: number, o: { lado: number; calidad: number; sello?: string[]; maxBytes?: number }): string {
  const m = medidasReducidas(ancho, alto, o.lado);
  const c = document.createElement("canvas");
  c.width = m.ancho;
  c.height = m.alto;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(fuente, 0, 0, c.width, c.height);
  if (o.sello?.length) estampar(ctx, c.width, c.height, o.sello);
  let url = "";
  for (const q of o.maxBytes ? calidadesHasta(o.calidad) : [o.calidad]) {
    url = c.toDataURL("image/jpeg", q);
    if (!o.maxBytes || bytesDataUrl(url) <= o.maxBytes) break;
  }
  return url;
}

/** Franja al pie con las líneas del sello (tamaño de letra según el ancho de la foto). */
function estampar(ctx: CanvasRenderingContext2D, ancho: number, alto: number, lineas: string[]) {
  const letra = Math.max(12, Math.round(Math.min(ancho, alto * 1.4) / 22));
  const margen = Math.round(letra * 0.5);
  const interlinea = Math.round(letra * 1.25);
  const franja = lineas.length * interlinea + margen * 2;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, alto - franja, ancho, franja);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "top";
  lineas.forEach((l, k) => {
    ctx.font = `${k === 0 ? "bold " : ""}${letra}px Arial, Helvetica, sans-serif`;
    ctx.fillText(l, margen, alto - franja + margen + k * interlinea + Math.round((interlinea - letra) / 2), ancho - margen * 2);
  });
}

/**
 * Comprime varias imágenes (máx. `max`, en orden) y separa las que no se pudieron leer,
 * para agregar las buenas y avisar cuántas fallaron en vez de perderlas todas. `sobrantes`:
 * las que pasaron del máximo y no se agregaron (quien llama lo avisa).
 */
export async function comprimirVarias(archivos: File[], max = 12, lado?: number, calidad?: number): Promise<{ imagenes: string[]; fallidas: number; sobrantes: number }> {
  const imagenes: string[] = [];
  let fallidas = 0;
  for (const f of archivos.slice(0, max)) {
    try {
      imagenes.push(await comprimirImagen(f, lado, calidad));
    } catch {
      fallidas++;
    }
  }
  return { imagenes, fallidas, sobrantes: Math.max(0, archivos.length - max) };
}
