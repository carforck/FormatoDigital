/**
 * Manifiesto de la app instalable (PWA), servido por Next en /manifest.webmanifest y
 * enlazado solo en el <head>. Con él (y el service worker de public/sw.js) Chrome, Edge y
 * Android ofrecen «Instalar app»; iOS usa además los metadatos `appleWebApp` del layout raíz.
 *
 * Colores de la marca (tailwind.config.ts): grafito `sotec` #1F1F1F y verde `sotec.green` #92D050.
 * Íconos: public/iconos/, generados con scripts/generar-iconos-pwa.py.
 */
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "ControlOne by SOTEC",
    short_name: "ControlOne",
    description: "Toda tu empresa, un solo control: formatos, reportes, aprobaciones, firmas, proyectos, equipos y cobros, también sin conexión.",
    lang: "es-CO",
    dir: "ltr",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "any",
    theme_color: "#1F1F1F",
    background_color: "#1F1F1F",
    categories: ["business", "productivity"],
    icons: [
      { src: "/iconos/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/iconos/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/iconos/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Atajos al mantener presionado el ícono (Android) o con clic derecho (escritorio)
    shortcuts: [
      { name: "Nuevo reporte técnico", short_name: "Nuevo reporte", url: "/app/nuevo/reporte", icons: [{ src: "/iconos/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Documentos", short_name: "Documentos", url: "/app/documentos", icons: [{ src: "/iconos/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Revisión y aprobación", short_name: "Revisión", url: "/app/revision", icons: [{ src: "/iconos/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
