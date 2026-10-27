"use client";

/**
 * Modal de firma manuscrita sobre `<canvas>`; entrega la firma como PNG en
 * data URL. Usado en el generador, `/app/documentos/ver` y `/firmar`
 * (firma del cliente por enlace). Con el dedo en iPhone y Android: `touch-none` evita que el
 * trazo desplace la página; si el sistema cancela el toque (gesto, llamada) el trazo termina.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Eraser, PenLine, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fondoQueCierra, useModal } from "@/components/ui/useModal";

interface Props {
  titulo: string;
  onGuardar: (dataUrl: string) => void;
  onCerrar: () => void;
}

/** Modal con un lienzo para firmar con el dedo, el lápiz o el mouse. */
export function FirmaPad({ titulo, onGuardar, onCerrar }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const dibujando = useRef(false);
  const [vacio, setVacio] = useState(true);
  const dialogo = useModal<HTMLDivElement>(onCerrar);
  const fondo = fondoQueCierra(onCerrar);
  const idTitulo = useId();

  // Lienzo a la densidad de la pantalla para que el trazo no salga borroso en retina
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1d3b8a";
  }, []);

  function punto(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function limpiar() {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setVacio(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" {...fondo}>
      <div ref={dialogo} role="dialog" aria-modal="true" aria-labelledby={idTitulo} className="w-full max-w-lg rounded-xl bg-white p-4 shadow-xl outline-none">
        <div className="mb-3 flex items-center justify-between">
          <p id={idTitulo} className="flex items-center gap-2 font-semibold">
            <PenLine className="h-4 w-4" /> {titulo}
          </p>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <canvas
          ref={ref}
          role="img"
          aria-label="Área para firmar"
          className="h-44 w-full touch-none rounded-lg border-2 border-dashed border-slate-300 bg-slate-50"
          onPointerDown={(e) => {
            dibujando.current = true;
            const ctx = ref.current!.getContext("2d")!;
            const p = punto(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            // La captura no es esencial: algunos navegadores la rechazan si el puntero ya se soltó
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              /* sin captura: el trazo sigue mientras el dedo esté sobre el lienzo */
            }
          }}
          onPointerMove={(e) => {
            if (!dibujando.current) return;
            const ctx = ref.current!.getContext("2d")!;
            const p = punto(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            setVacio(false);
          }}
          onPointerUp={() => (dibujando.current = false)}
          onPointerCancel={() => (dibujando.current = false)}
        />
        <p className="mt-1 text-xs text-slate-500">Firma con el dedo, el lápiz o el mouse. Queda con fecha y hora en el historial.</p>
        <div className="mt-3 flex justify-between gap-2">
          <Button variant="ghost" onClick={limpiar}>
            <Eraser className="h-4 w-4" /> Limpiar
          </Button>
          <Button disabled={vacio} onClick={() => onGuardar(ref.current!.toDataURL("image/png"))}>
            Guardar firma
          </Button>
        </div>
      </div>
    </div>
  );
}
