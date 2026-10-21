import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

import { DemoProvider } from "@/nucleo/datos/DemoProvider";

export const metadata: Metadata = {
  title: "FormatoDigital · Demo SOTEC",
  description:
    "Digitalizamos y optimizamos los formatos de tu sistema de gestión de calidad. Prototipo de demostración con los formatos de SOTEC.",
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
