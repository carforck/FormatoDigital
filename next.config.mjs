/**
 * Versión del despliegue: el commit en Vercel o, en local, la fecha de la compilación.
 * La usa RegistroPWA para registrar /sw.js?v=<versión>: cada despliegue instala el
 * service worker nuevo (y su caché) en segundo plano.
 */
const VERSION_APP = (process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(36)).slice(0, 12);

/** @type {import("next").NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Rutas absolutas desde la raíz (despliegue en Vercel)
  env: { NEXT_PUBLIC_BASE_PATH: "", NEXT_PUBLIC_VERSION_APP: VERSION_APP },
  async headers() {
    return [
      // El service worker siempre se revalida (si no, el navegador tardaría en ver las versiones nuevas)
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      // La API nunca se guarda en ningún caché (navegador, CDN ni service worker)
      { source: "/api/:ruta*", headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }] },
    ];
  },
};

export default nextConfig;
