"use client";

/**
 * Cámara de la app con marco guía para la foto del trabajador recibiendo el EPP: el input con
 * `capture` abre la cámara del sistema y no deja dibujar encima, así que aquí se usa
 * `getUserMedia` con un `<video>` (playsInline + muted: iPhone Safari) y un óvalo para la cara.
 * Arranca con la cámara frontal (`user`) y «Voltear» pasa por las cámaras reales del equipo (lo usual es que el
 * técnico le tome la foto al trabajador). «Capturar» dibuja el cuadro en un canvas, lo reduce y
 * le estampa la fecha y la hora (`fotoDesdeVideo`). Al cerrar (o desmontar) se apagan las pistas.
 * Si la cámara no está disponible (sin HTTPS, navegador sin soporte) o se niega el permiso,
 * `onSinCamara` recibe el mensaje y quien la usa ofrece la cámara del sistema y la galería.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Loader2, RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { fotoDesdeVideo, type FotoRecibeEpp } from "./foto";

/** ¿Este navegador puede abrir la cámara en la app? (HTTPS o localhost, con `getUserMedia`). */
export function camaraDisponible(): boolean {
  return typeof window !== "undefined" && window.isSecureContext !== false && typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function";
}

/** Mensaje claro según el error de `getUserMedia`. */
export function mensajeSinCamara(e: unknown): string {
  const n = (e as { name?: string } | null)?.name ?? "";
  if (n === "NotAllowedError" || n === "SecurityError") return "No se dio permiso para usar la cámara. Usa «Tomar foto» (cámara del teléfono) o «Galería», o habilita la cámara para este sitio en el navegador.";
  if (n === "NotFoundError" || n === "OverconstrainedError") return "No se encontró una cámara en este equipo. Usa «Galería» para elegir la foto.";
  if (n === "NotReadableError") return "La cámara está ocupada por otra aplicación. Ciérrala y vuelve a intentar, o usa «Tomar foto» / «Galería».";
  return "No se pudo abrir la cámara de la app. Usa «Tomar foto» (cámara del teléfono) o «Galería».";
}

interface Props {
  onCapturar: (f: FotoRecibeEpp) => void;
  onCerrar: () => void;
  onSinCamara: (mensaje: string) => void;
}

export function CamaraGuia({ onCapturar, onCerrar, onSinCamara }: Props) {
  const video = useRef<HTMLVideoElement | null>(null);
  const flujo = useRef<MediaStream | null>(null);
  const capturar = useRef<HTMLButtonElement | null>(null);
  // Cámara pedida: por dirección (frontal/trasera) o, al voltear, por el id real del dispositivo
  // (varios Android y computadores ignoran `facingMode` y siempre abren la misma)
  const [pedido, setPedido] = useState<{ frontal: boolean; id?: string }>({ frontal: true });
  const anterior = useRef<{ frontal: boolean; id?: string } | null>(null);
  const [frontal, setFrontal] = useState(true);
  const [camaras, setCamaras] = useState<string[]>([]);
  const [actual, setActual] = useState<string | undefined>();
  const [avisoCambio, setAvisoCambio] = useState<string | null>(null);
  const [lista, setLista] = useState(false);

  const apagar = useCallback(() => {
    flujo.current?.getTracks().forEach((t) => t.stop());
    flujo.current = null;
  }, []);

  useEffect(() => {
    let vivo = true;
    setLista(false);
    apagar();
    if (!camaraDisponible()) {
      onSinCamara(mensajeSinCamara(null));
      return;
    }
    const tam = { width: { ideal: 1280 }, height: { ideal: 960 } };
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: pedido.id ? { deviceId: { exact: pedido.id }, ...tam } : { facingMode: { ideal: pedido.frontal ? "user" : "environment" }, ...tam } })
      .then(async (s) => {
        if (!vivo) return s.getTracks().forEach((t) => t.stop());
        flujo.current = s;
        anterior.current = pedido;
        // Lo que de verdad abrió el navegador (espejo solo en la frontal) y qué cámaras hay
        const ajustes = s.getVideoTracks()[0]?.getSettings?.() ?? {};
        setFrontal(ajustes.facingMode ? ajustes.facingMode === "user" : pedido.frontal);
        setActual(ajustes.deviceId);
        navigator.mediaDevices
          .enumerateDevices?.()
          .then((ds) => vivo && setCamaras(ds.filter((d) => d.kind === "videoinput" && d.deviceId).map((d) => d.deviceId)))
          .catch(() => {});
        const v = video.current;
        if (!v) return;
        v.srcObject = s;
        await v.play().catch(() => {});
        if (vivo) setLista(true);
      })
      .catch((e) => {
        if (!vivo) return;
        // Falló al voltear: se vuelve a la cámara que sí funcionaba
        if (anterior.current) {
          setAvisoCambio("No se pudo abrir la otra cámara; sigue la que estaba.");
          setPedido(anterior.current);
          anterior.current = null;
        } else onSinCamara(mensajeSinCamara(e));
      });
    return () => {
      vivo = false;
      apagar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);

  /** Voltear: la siguiente cámara real del equipo; si el navegador no las lista, por dirección. */
  function voltear() {
    setAvisoCambio(null);
    const otras = camaras.filter((id) => id !== actual);
    if (camaras.length > 1 && otras.length) {
      const i = actual ? camaras.indexOf(actual) : -1;
      setPedido({ frontal: !frontal, id: camaras[(i + 1) % camaras.length] === actual ? otras[0] : camaras[(i + 1) % camaras.length] });
    } else setPedido({ frontal: !frontal });
  }
  // Con una sola cámara listada no se ofrece voltear (sin lista, se intenta por dirección)
  const puedeVoltear = camaras.length !== 1;

  // Esc cierra; el foco va a «Capturar», Tab no sale del diálogo y al cerrar vuelve a donde estaba
  const raiz = useRef<HTMLDivElement | null>(null);
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    capturar.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cerrar.current();
      } else if (e.key === "Tab" && raiz.current) {
        const f = [...raiz.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
        if (!f.length) return;
        const i = f.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && i <= 0) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && (i === -1 || i === f.length - 1)) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("keydown", tecla);
      antes?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (lista) capturar.current?.focus();
  }, [lista]);

  function tomar() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const f = fotoDesdeVideo(v);
    apagar();
    onCapturar(f);
  }

  return createPortal(
    <div ref={raiz} role="dialog" aria-modal="true" aria-label="Cámara: foto del trabajador recibiendo el EPP" data-camara-guia className="fixed inset-0 z-[100] flex flex-col bg-black text-white print:hidden">
      <div className="relative min-h-0 flex-1">
        <video ref={video} playsInline muted autoPlay className="h-full w-full object-cover" style={frontal ? { transform: "scaleX(-1)" } : undefined} onLoadedMetadata={() => setLista(true)} />
        {/* Marco guía: óvalo para la cara (SVG con máscara; el resto se oscurece) */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <mask id="marco-cara">
              <rect width="100" height="100" fill="white" />
              <ellipse cx="50" cy="42" rx="22" ry="27" fill="black" />
            </mask>
          </defs>
          <rect width="100" height="100" fill="rgba(0,0,0,0.45)" mask="url(#marco-cara)" />
          <ellipse cx="50" cy="42" rx="22" ry="27" fill="none" stroke="white" strokeWidth="0.6" strokeDasharray="2 1.4" vectorEffect="non-scaling-stroke" />
        </svg>
        <p className="absolute inset-x-0 top-3 mx-auto w-fit max-w-[90%] rounded-full bg-black/60 px-3 py-1 text-center text-sm font-medium">Ubica la cara del trabajador dentro del marco</p>
        {!lista && (
          <p className="absolute inset-0 flex items-center justify-center gap-2 text-sm" role="status">
            <Loader2 className="h-4 w-4 animate-spin" /> Abriendo la cámara…
          </p>
        )}
      </div>
      {avisoCambio && (
        <p role="status" className="bg-amber-500/90 px-4 py-2 text-center text-sm text-black">
          {avisoCambio}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <Button type="button" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={onCerrar} aria-label="Cerrar la cámara">
          <X className="h-5 w-5" /> Cerrar
        </Button>
        <button
          ref={capturar}
          type="button"
          onClick={tomar}
          disabled={!lista}
          aria-label="Capturar"
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-sotec-green text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
        >
          <Camera className="h-7 w-7" />
        </button>
        {puedeVoltear ? (
          <Button type="button" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={voltear} aria-label="Voltear la cámara">
            <RefreshCw className="h-5 w-5" /> Voltear
          </Button>
        ) : (
          <span className="w-[88px]" aria-hidden />
        )}
      </div>
    </div>,
    document.body,
  );
}
