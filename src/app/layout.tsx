import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

import { DemoProvider } from "@/nucleo/datos/DemoProvider";

const SITIO = process.env.NEXT_PUBLIC_SITE_URL ?? "https://formato-digital-nine.vercel.app";
const TITULO = "FormatoDigital · Digitaliza los formatos de tu sistema de gestión";
const DESCRIPCION =
  "Reportes técnicos, permisos de trabajo, gastos y cuentas de cobro con firma, fotos y aprobación desde el celular. Caso de cliente: SOTEC.";

export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: "FormatoDigital · Demo SOTEC",
  description: DESCRIPCION,
  // Vista previa al compartir el enlace (WhatsApp, LinkedIn, Facebook, X); imagen: scripts/generar-og.py
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "/",
    siteName: "FormatoDigital",
    title: TITULO,
    description: DESCRIPCION,
    images: [{ url: "/og.jpg", width: 1200, height: 630, type: "image/jpeg", alt: "FormatoDigital: digitalizamos y optimizamos cualquier formato de tu sistema de gestión" }],
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRIPCION, images: ["/og.jpg"] },
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
