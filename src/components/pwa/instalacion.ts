"use client";

/**
 * Estado de «Instalar app» (PWA) compartido por toda la página.
 *
 * Chrome, Edge y Android disparan `beforeinstallprompt` cuando la app se puede instalar;
 * el evento se guarda aquí (apenas carga este módulo, antes de que React monte los botones)
 * para lanzarlo después desde un botón. iOS no tiene ese evento: allí se muestran las
 * instrucciones (Compartir → Agregar a pantalla de inicio). Si la app ya corre instalada
 * (`display-mode: standalone`) no se ofrece nada.
 *
 * Lo usan `BotonInstalar` (menú de perfil del aplicativo y /acceso) y `RegistroPWA`.
 */
import { useEffect, useState } from "react";

/** Evento de instalación de Chromium (no está en los tipos del DOM). */
interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let evento: EventoInstalar | null = null;
let instalada = false;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Sin la barra automática del navegador: se ofrece con el botón discreto de la app
    e.preventDefault();
    evento = e as EventoInstalar;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    evento = null;
    instalada = true;
    avisar();
  });
}

/** La app corre instalada (ventana propia) y no hay que ofrecer instalarla. */
export function enModoApp(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return instalada || window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

/** iPhone o iPad (el iPad moderno se presenta como Mac con pantalla táctil). */
function esIOS(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Cómo se puede instalar aquí: con el diálogo del navegador, con instrucciones (iOS) o no se ofrece. */
export type FormaInstalar = "dialogo" | "ios" | null;

const calcular = (): FormaInstalar => (enModoApp() ? null : evento ? "dialogo" : esIOS() ? "ios" : null);

/** Forma de instalar disponible en este navegador y la acción para lanzar el diálogo. */
export function useInstalarApp(): { forma: FormaInstalar; instalar: () => Promise<boolean> } {
  const [forma, setForma] = useState<FormaInstalar>(null);
  useEffect(() => {
    const f = () => setForma(calcular());
    f();
    oyentes.add(f);
    return () => {
      oyentes.delete(f);
    };
  }, []);
  const instalar = async () => {
    if (!evento) return false;
    const e = evento;
    await e.prompt();
    const { outcome } = await e.userChoice;
    // El evento solo se puede usar una vez
    evento = null;
    avisar();
    return outcome === "accepted";
  };
  return { forma, instalar };
}
