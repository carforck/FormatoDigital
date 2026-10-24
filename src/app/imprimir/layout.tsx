/**
 * Layout de /imprimir: sin AppShell (página limpia para imprimir o guardar en PDF)
 * y fuera de los buscadores (robots noindex).
 */
import type { Metadata } from "next";

// El título definitivo (nombre del PDF) lo pone la página con el consecutivo del documento
export const metadata: Metadata = { title: "Imprimir documento", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
