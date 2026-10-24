"use client";

/**
 * Registra el service worker (public/sw.js) que deja la app abrir sin conexión.
 *
 * - Solo en producción (`next build` + `next start` o Vercel). En desarrollo NO se
 *   registra y, si quedó uno de una prueba anterior en el mismo puerto, se elimina junto
 *   con sus cachés: así no interfiere con la recarga en caliente ni con las pruebas e2e.
 * - La URL lleva la versión del despliegue (`?v=`, de next.config.mjs): cada despliegue
 *   instala el service worker nuevo en segundo plano y se activa solo, sin recargar la
 *   página (ver «Actualizaciones» en README.md). Además se busca una versión nueva cada hora
 *   y al volver a la pestaña, por si la app queda abierta muchos días.
 *
 * Se monta una vez en el layout raíz. También carga `./instalacion` para no perder el
 * evento `beforeinstallprompt`, que el navegador puede disparar apenas carga la página.
 */
import { useEffect } from "react";

import "./instalacion";

/** Versión del despliegue (commit en Vercel o fecha de la compilación). */
const VERSION = process.env.NEXT_PUBLIC_VERSION_APP ?? "local";

export function RegistroPWA() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Desarrollo: sin service worker (y se limpia cualquiera que haya quedado)
      void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()));
      if ("caches" in window) void caches.keys().then((ks) => ks.filter((k) => k.startsWith("co-")).forEach((k) => void caches.delete(k)));
      return;
    }

    let reg: ServiceWorkerRegistration | null = null;
    const registrar = () => {
      navigator.serviceWorker
        .register(`/sw.js?v=${encodeURIComponent(VERSION)}`, { scope: "/", updateViaCache: "none" })
        .then((r) => {
          reg = r;
        })
        .catch(() => {
          /* sin service worker la app funciona igual, solo que no abre sin conexión */
        });
    };
    // Después de la carga, para no competir con la primera pintura
    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });

    const buscar = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void reg?.update().catch(() => {});
    };
    const id = window.setInterval(buscar, 60 * 60 * 1000);
    document.addEventListener("visibilitychange", buscar);
    return () => {
      window.removeEventListener("load", registrar);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", buscar);
    };
  }, []);
  return null;
}
