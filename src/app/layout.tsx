/**
 * Layout raíz de toda la app (landing, /acceso, /app/**, /firmar, /imprimir, /offline): fuente
 * Geist, estilos globales, metadatos SEO/Open Graph, los de la app instalable (manifiesto en
 * ./manifest.ts, íconos de public/iconos y `appleWebApp` para iOS) y el DemoProvider (@/nucleo/datos/DemoProvider), que da a todas las
 * páginas los datos y la sesión vía useDemo().
 */
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

import { DemoProvider } from "@/nucleo/datos/DemoProvider";

/** URL pública del sitio; base para resolver las URLs relativas de los metadatos (og:image, etc.). */
const SITIO = process.env.NEXT_PUBLIC_SITE_URL ?? "https://controlone.sotecse.com";
const TITULO = "ControlOne by SOTEC · Toda tu empresa, un solo control";
const DESCRIPCION =
  "Control digital de todas las áreas de tu empresa: formatos, reportes, aprobaciones, firmas, proyectos, equipos y facturación, con firma, fotos y aprobación desde el celular. La plataforma de SOTEC.";

export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: "ControlOne by SOTEC · Toda tu empresa, un solo control",
  description: DESCRIPCION,
  // Vista previa al compartir el enlace (WhatsApp, LinkedIn, Facebook, X); imagen: scripts/generar-og.py
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "/",
    siteName: "ControlOne by SOTEC",
    title: TITULO,
    description: DESCRIPCION,
    images: [{ url: "/og.jpg?v=2", width: 1200, height: 630, type: "image/jpeg", alt: "ControlOne by SOTEC: toda tu empresa, un solo control" }],
  },
  // App instalable (PWA): nombre y barra de estado en iOS; ícono de inicio de iOS (180×180).
  // El enlace al manifiesto lo agrega Next por src/app/manifest.ts. Al declarar `icons` hay que
  // listar también el favicon (src/app/icon.svg): si no, Next deja de enlazarlo.
  applicationName: "ControlOne",
  appleWebApp: { capable: true, title: "ControlOne", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/iconos/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/iconos/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { telephone: false },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRIPCION, images: ["/og.jpg?v=2"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1F1F1F" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={GeistSans.variable}>
      <body className="min-h-screen font-sans">
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
