"use client";

/**
 * Agregar imágenes desde el celular o el computador (pedido de Magno: «al querer
 * agregar imágenes no permite, sólo abre la cámara»). Dos acciones separadas:
 * «Tomar foto» (input con `capture`, abre la cámara) y «Galería / archivos» (sin
 * `capture`: en iPhone y Android ofrece la fototeca y los archivos). Limpia el
 * input después de cada elección (se puede elegir el mismo archivo otra vez) y
 * muestra el error si una imagen no se pudo leer (p. ej. HEIC en Android o en
 * el computador) o si pasaron del máximo de fotos por vez (`avisoSobrantes`). Lo usan el asistente, el reporte (registro fotográfico) y la
 * legalización de gastos (foto de la factura).
 */
import { useState } from "react";
import { AlertTriangle, Camera, ImagePlus, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface Props {
  /** Recibe los archivos elegidos; puede devolver un aviso (p. ej. «1 imagen no se pudo leer»). */
  onElegir: (archivos: File[]) => Promise<string | void> | string | void;
  /** Varias imágenes a la vez (solo desde la galería; la cámara toma una). */
  multiple?: boolean;
  /** Qué se agrega, para las etiquetas accesibles («fotos del reporte», «factura del gasto 2»). */
  que: string;
  /** «bloque»: dos botones grandes (asistente, anexo); «icono»: dos íconos (fila de una tabla). */
  variante?: "bloque" | "icono";
  /** Textos de los botones del bloque. */
  textoCamara?: string;
  textoGaleria?: string;
  /** Deshabilita los botones (p. ej. mientras otro proceso usa las fotos). */
  ocupado?: boolean;
  className?: string;
}

/** Dos botones: cámara y galería/archivos. Los inputs son `sr-only` dentro de cada `<label>`. */
export function ElegirImagen({ onElegir, multiple, que, variante = "bloque", textoCamara = "Tomar foto", textoGaleria = "Galería / archivos", ocupado, className }: Props) {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deshabilitado = ocupado || procesando;

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    // Se copia la lista y se limpia el input: elegir de nuevo el mismo archivo vuelve a disparar «change»
    const lista = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (!lista.length) return;
    setError(null);
    setProcesando(true);
    try {
      const aviso = await onElegir(lista);
      if (aviso) setError(aviso);
    } catch {
      setError(mensajeImagenIlegible(lista.length));
    } finally {
      setProcesando(false);
    }
  }

  const input = (camara: boolean) => (
    <input
      type="file"
      accept="image/*"
      // Sin `capture` el celular ofrece la galería y los archivos; con él abre directo la cámara
      {...(camara ? { capture: "environment" as const } : { multiple })}
      disabled={deshabilitado}
      className="sr-only"
      aria-label={camara ? `Tomar foto: ${que}` : `Elegir de la galería o archivos: ${que}`}
      onChange={elegir}
    />
  );

  if (variante === "icono") {
    const icono = "print:hidden inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-[#2E7D32] hover:bg-[#F1F8E9] focus-within:ring-2 focus-within:ring-sotec-green has-[:disabled]:opacity-50";
    return (
      <span className={cn("print:hidden inline-flex flex-wrap items-center justify-center", className)}>
        <label className={icono} title={`Tomar foto: ${que}`}>
          {procesando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          {input(true)}
        </label>
        <label className={icono} title={`Galería o archivos: ${que}`}>
          <ImagePlus className="h-3.5 w-3.5" />
          {input(false)}
        </label>
        {error && (
          <span role="alert" className="basis-full text-left text-[10px] font-normal leading-tight text-amber-800">
            <AlertTriangle className="mr-0.5 inline h-3 w-3 align-[-2px]" aria-hidden="true" />
            {error}
          </span>
        )}
      </span>
    );
  }

  const boton =
    "flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-sotec-green/60 bg-sotec-soft px-3 py-2.5 text-sm font-medium text-sotec-greenDeep hover:bg-sotec-green/20 focus-within:ring-2 focus-within:ring-sotec-green has-[:disabled]:cursor-wait has-[:disabled]:opacity-60";
  return (
    <div className={cn("print:hidden space-y-1.5", className)}>
      <div className="flex gap-2">
        <label className={boton}>
          {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} {procesando ? "Procesando…" : textoCamara}
          {input(true)}
        </label>
        <label className={boton}>
          <ImagePlus className="h-4 w-4" /> {textoGaleria}
          {input(false)}
        </label>
      </div>
      {error && (
        <p role="alert" className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

/** Aviso de las fotos que pasaron del máximo por vez (`comprimirVarias`); vacío si no sobró ninguna. */
export function avisoSobrantes(n: number, max = 12): string {
  return n > 0 ? `Se agregan hasta ${max} fotos por vez: ${n === 1 ? "1 no se agregó" : `${n} no se agregaron`}. Elígelas de nuevo para agregarlas.` : "";
}

/** Mensaje cuando el navegador no puede abrir la imagen (HEIC fuera de Safari, archivo dañado o que no es imagen). */
export function mensajeImagenIlegible(n = 1): string {
  return `${n === 1 ? "No se pudo leer la imagen" : `${n} imagen(es) no se pudieron leer`}. Si es una foto HEIC del iPhone, compártela como JPG (o en Ajustes › Cámara › Formatos elige «Más compatible») o tómala con «Tomar foto».`;
}
