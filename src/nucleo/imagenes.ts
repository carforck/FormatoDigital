/**
 * Reduce una foto del celular antes de guardarla: máximo `lado` px en el lado
 * mayor y JPEG con `calidad`. Una foto de 4 MB queda en ~100-200 KB, suficiente
 * para el registro fotográfico impreso y los soportes de gastos. Devuelve un
 * data URL JPEG (fondo blanco para las PNG con transparencia). Solo en el navegador.
 * Si el navegador no puede abrir el archivo (HEIC del iPhone fuera de Safari, archivo
 * dañado) lanza un error: quien la llama muestra el aviso (`ElegirImagen`).
 */
export async function comprimirImagen(archivo: File, lado = 1280, calidad = 0.72): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => mal(new Error("No se pudo leer la imagen"));
      i.src = url;
    });
    const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * escala);
    c.height = Math.round(img.naturalHeight * escala);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", calidad);
  } finally {
    URL.revokeObjectURL(url);
  }
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
