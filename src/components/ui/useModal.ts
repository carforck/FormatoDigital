"use client";

/**
 * Accesibilidad de diálogos modales: atrapa el foco, cierra con Esc y con
 * toque en el fondo. Usado por FirmaPad, EnviarDocumento y
 * `/app/documentos/ver`.
 */
import { useEffect, useRef } from "react";

const ENFOCABLES = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

/** Elementos enfocables visibles (o el activo, aunque esté oculto) dentro de `raiz`. */
function enfocables(raiz: HTMLElement): HTMLElement[] {
  return Array.from(raiz.querySelectorAll<HTMLElement>(ENFOCABLES)).filter((el) => el.getClientRects().length > 0 || el === document.activeElement);
}

/**
 * Comportamiento accesible de un modal: Esc cierra, el foco entra al abrir,
 * Tab / Shift+Tab quedan atrapados dentro y, al cerrar, el foco vuelve al
 * elemento que lo abrió. Devuelve la ref para el contenedor del diálogo.
 *
 *   const ref = useModal<HTMLDivElement>(onCerrar);
 *   <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="…">
 */
export function useModal<T extends HTMLElement = HTMLDivElement>(onCerrar: () => void, opciones: { focoInicial?: () => HTMLElement | null } = {}) {
  const ref = useRef<T | null>(null);
  // Refs para no re-ejecutar el efecto (y robar el foco) si el padre pasa un callback nuevo en cada render
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;
  const focoInicial = useRef(opciones.focoInicial);
  focoInicial.current = opciones.focoInicial;

  useEffect(() => {
    const raiz = ref.current;
    if (!raiz) return;
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const inicial = focoInicial.current?.() ?? enfocables(raiz)[0] ?? raiz;
    if (inicial === raiz && !raiz.hasAttribute("tabindex")) raiz.setAttribute("tabindex", "-1");
    inicial.focus({ preventScroll: true });

    function alPresionar(e: KeyboardEvent) {
      if (!raiz) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cerrar.current();
        return;
      }
      if (e.key !== "Tab") return;
      const lista = enfocables(raiz);
      if (lista.length === 0) {
        e.preventDefault();
        raiz.focus();
        return;
      }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const activo = document.activeElement;
      if (!raiz.contains(activo)) {
        e.preventDefault();
        (e.shiftKey ? ultimo : primero).focus();
      } else if (e.shiftKey && (activo === primero || activo === raiz)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }
    // Si el foco se escapa (clic fuera, lector de pantalla), vuelve al diálogo
    function alEnfocar(e: FocusEvent) {
      if (raiz && e.target instanceof Node && !raiz.contains(e.target)) (enfocables(raiz)[0] ?? raiz).focus({ preventScroll: true });
    }

    document.addEventListener("keydown", alPresionar, true);
    document.addEventListener("focusin", alEnfocar);
    return () => {
      document.removeEventListener("keydown", alPresionar, true);
      document.removeEventListener("focusin", alEnfocar);
      if (previo && previo.isConnected) previo.focus({ preventScroll: true });
    };
  }, []);

  return ref;
}

/**
 * Props del fondo de un modal para cerrarlo con un toque fuera del diálogo. Solo
 * cuenta si el toque empezó y terminó en el fondo: un trazo de firma o una
 * selección de texto que termina fuera no cierra el modal.
 *
 *   <div className="fixed inset-0 …" {...fondoQueCierra(onCerrar)}>
 */
export function fondoQueCierra(onCerrar: () => void) {
  let enFondo = false;
  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      enFondo = e.target === e.currentTarget;
    },
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      if (enFondo && e.target === e.currentTarget) onCerrar();
      enFondo = false;
    },
  };
}
