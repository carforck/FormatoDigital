/**
 * Ruta /offline: la muestra el service worker (public/sw.js) cuando no hay conexión y la
 * página pedida todavía no está guardada en el equipo. Es estática y se guarda al instalar
 * el service worker. Ofrece reintentar y volver al aplicativo (que sí está guardado).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2, WifiOff } from "lucide-react";

import { Reintentar } from "./Reintentar";

export const metadata: Metadata = { title: "Sin conexión · ControlOne", robots: { index: false } };

export default function SinConexion() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-sotec px-6 text-center text-white">
      <p className="flex items-center gap-2.5 text-xl font-semibold">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sotec-green text-sotec">
          <FileCheck2 className="h-5 w-5" />
        </span>
        <span>
          Control<span className="text-sotec-green">One</span>
        </span>
      </p>
      <span className="mt-10 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
        <WifiOff className="h-6 w-6 text-sotec-green" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Sin conexión</h1>
      <p className="mt-2 max-w-sm text-sm text-white/75">
        Esta página todavía no está guardada en este equipo. El aplicativo y tus formatos sí funcionan sin conexión: tus cambios se guardan aquí y se
        sincronizan al volver la señal.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/app" className="rounded-lg bg-sotec-green px-4 py-2.5 text-sm font-semibold text-sotec hover:bg-sotec-leaf">
          Ir al aplicativo
        </Link>
        <Reintentar />
      </div>
    </main>
  );
}
