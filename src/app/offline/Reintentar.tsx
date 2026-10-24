"use client";

/** Botón «Reintentar» de /offline: recarga la página pedida (el service worker vuelve a intentar la red). */
export function Reintentar() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="rounded-lg border border-white/25 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10"
    >
      Reintentar
    </button>
  );
}
