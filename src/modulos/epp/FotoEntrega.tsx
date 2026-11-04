"use client";

/**
 * Foto del trabajador recibiendo el EPP: en la hoja (SOTEC y matriz de La Clay) con su fecha y
 * hora debajo, y el paso del asistente que la toma (cámara o galería) o la omite. La fecha sale
 * de la foto (`prepararFotoRecibe`), nunca se escribe a mano.
 */
import { useEffect, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import type { ValorPaso } from "@/components/chat/ChatAsistente";
import { ElegirImagen } from "@/components/docs/ElegirImagen";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CamaraGuia, camaraDisponible } from "./CamaraGuia";
import { leyendaFoto, prepararFotoRecibe, type FotoRecibeEpp } from "./foto";

const QUE = "foto del trabajador recibiendo el EPP";

/**
 * Recuadro de la foto en la hoja. Sin foto: al diligenciar, los botones para tomarla (no se
 * imprime); en la hoja impresa no ocupa lugar (`null`).
 */
export function FotoEntrega({
  foto,
  onCambiar,
  resaltado,
  className,
  altoFoto = "h-[120px]",
}: {
  foto?: FotoRecibeEpp;
  onCambiar?: (f: FotoRecibeEpp | undefined) => void;
  resaltado?: boolean;
  className?: string;
  altoFoto?: string;
}) {
  if (!foto && !onCambiar) return null;
  const elegir = (f: FotoRecibeEpp) => onCambiar?.(f);
  return (
    <figure data-foto-recibe className={cn("m-0 flex flex-col", !foto && "print:hidden", resaltado && "rounded ring-2 ring-sotec-green", className)}>
      {foto ? (
        <img src={foto.src} alt="Foto del trabajador recibiendo el EPP" className={cn("w-full border border-black bg-white object-contain", altoFoto)} />
      ) : (
        <div
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1 rounded border border-dashed border-sotec-greenDeep/60 bg-sotec-soft px-1 text-center text-[10px] font-medium leading-tight text-sotec-greenDeep",
            altoFoto,
          )}
        >
          📷 Foto de quien recibe (opcional)
          <ElegirFotoRecibe variante="icono" que={QUE} onFoto={elegir} />
        </div>
      )}
      {foto && (
        <figcaption className="mt-0.5 text-center text-[9px] leading-tight">
          <span data-foto-leyenda>{leyendaFoto(foto)}</span>
          {onCambiar && (
            <span className="print:hidden ml-0.5 inline-flex items-center align-middle">
              <ElegirFotoRecibe variante="icono" que={`${QUE} (reemplazar)`} onFoto={elegir} />
              <button
                type="button"
                aria-label="Quitar la foto de quien recibe"
                title="Quitar la foto"
                onClick={() => onCambiar(undefined)}
                className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

/** Respuesta del paso del asistente: [src, tomada, origen, fuente]. */
export const valorPasoFoto = (f: FotoRecibeEpp): string[] => [f.src, f.tomada, f.origen, f.fuente ?? ""];

/** Foto desde la respuesta del paso (`valorPasoFoto`); `undefined` si se omitió. */
export function fotoDeValor(v: ValorPaso): FotoRecibeEpp | undefined {
  if (!Array.isArray(v) || typeof v[0] !== "string" || !String(v[0]).startsWith("data:image/")) return undefined;
  const [src, tomada, origen, fuente] = v as string[];
  return {
    src,
    tomada,
    origen: origen === "camara" ? "camara" : "galeria",
    ...(fuente === "exif" || fuente === "archivo" || fuente === "ahora" ? { fuente } : {}),
  };
}

/** Paso «Foto del trabajador recibiendo el EPP» del asistente: Tomar foto / Galería / Omitir. */
export function PasoFotoEpp({ actual, avanzar }: { actual?: FotoRecibeEpp; avanzar: (v: ValorPaso, eco: string) => void }) {
  return (
    <div className="space-y-2">
      {actual && (
        <div className="flex items-center gap-2 rounded-md border border-slate-200 p-1.5 text-xs">
          <img src={actual.src} alt="Foto actual de quien recibe" className="h-12 w-16 rounded bg-slate-100 object-contain" />
          <span className="min-w-0 flex-1">{leyendaFoto(actual)}</span>
        </div>
      )}
      <ElegirFotoRecibe que={QUE} textoCamara={actual ? "Tomar otra" : "Tomar foto"} onFoto={(f) => avanzar(valorPasoFoto(f), `📷 ${leyendaFoto(f)}`)} />
      <div className="flex gap-2">
        {actual && (
          <Button size="sm" className="flex-1" onClick={() => avanzar("", "Se deja la foto actual")}>
            Continuar con la foto actual
          </Button>
        )}
        <Button size="sm" variant="ghost" className="flex-1" onClick={() => avanzar("-", "Sin foto")}>
          {actual ? "Quitar y seguir sin foto" : "Omitir"}
        </Button>
      </div>
    </div>
  );
}

/**
 * «Tomar foto» y «Galería» para la foto de quien recibe. Si el navegador lo permite, «Tomar foto»
 * abre la cámara de la app con el marco guía para la cara (`CamaraGuia`); si no (sin HTTPS, sin
 * soporte o permiso negado), queda la cámara del sistema (input con `capture`) con el aviso.
 */
export function ElegirFotoRecibe({ que, onFoto, variante = "bloque", textoCamara = "Tomar foto" }: { que: string; onFoto: (f: FotoRecibeEpp) => void; variante?: "bloque" | "icono"; textoCamara?: string }) {
  // Se decide en el navegador (en el servidor no hay `navigator`): así no cambia el HTML al hidratar
  const [enApp, setEnApp] = useState(false);
  const [abierta, setAbierta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => setEnApp(camaraDisponible()), []);
  return (
    <>
      <ElegirImagen
        variante={variante}
        que={que}
        textoCamara={textoCamara}
        textoGaleria="Galería"
        onCamara={enApp && !aviso ? () => setAbierta(true) : undefined}
        onElegir={async ([archivo], origen) => {
          if (archivo) onFoto(await prepararFotoRecibe(archivo, origen));
        }}
      />
      {aviso && (
        <span role="alert" data-aviso-camara className={variante === "icono" ? "block text-left text-[10px] font-normal leading-tight text-amber-800 print:hidden" : "mt-1.5 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900"}>
          <AlertTriangle className="mr-0.5 inline h-3 w-3 shrink-0 align-[-2px]" aria-hidden="true" />
          {aviso}
        </span>
      )}
      {abierta && (
        <CamaraGuia
          onCerrar={() => setAbierta(false)}
          onCapturar={(f) => {
            setAbierta(false);
            onFoto(f);
          }}
          onSinCamara={(m) => {
            setAbierta(false);
            setAviso(m);
          }}
        />
      )}
    </>
  );
}
