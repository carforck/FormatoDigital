"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { asset } from "@/nucleo/rutas";
import { PERFILES } from "@/nucleo/perfiles";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { ETIQUETA_ROL } from "@/nucleo/catalogos";

export default function Acceso() {
  const demo = useDemo();
  const router = useRouter();

  return (
    <main className="min-h-screen bg-sotec text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-14">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Volver a la presentación
        </Link>
        <div className="mt-6 flex items-center gap-3">
          <img src={asset("/sotec-logo-v3-oscuro.png")} alt="SOTEC" className="h-16 w-auto" />
          <span className="text-sm text-white/60">Prototipo de demostración</span>
        </div>
        <h1 className="mt-6 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">¿Con qué perfil quieres recorrer la demo?</h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Sin usuario ni contraseña. Cada perfil ve un menú y unos permisos distintos; puedes cambiar de perfil en cualquier momento desde la barra superior.
        </p>

        {/* De regreso desde la presentación: se retoma la sesión de la demo sin volver a elegir perfil */}
        {demo.usuario && (
          <Link
            href="/app"
            className="mt-6 inline-flex max-w-full items-center gap-2 rounded-xl border border-sotec-green/40 bg-sotec-green/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-sotec-green/20"
          >
            <span className="min-w-0 truncate">
              Continuar como {demo.usuario.nombre} · {ETIQUETA_ROL[demo.usuario.rol]}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-sotec-green" />
          </Link>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PERFILES.map((p) => (
            <button
              key={p.rol}
              onClick={() => {
                demo.entrarComo(p.rol);
                router.push(p.rol === "tecnico" ? "/app/nuevo/reporte" : p.rol === "supervisor" ? "/app/revision" : "/app");
              }}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:-translate-y-1 hover:border-sotec-green hover:bg-white/10"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sotec-green text-sotec">
                <p.icon className="h-5 w-5" />
              </span>
              <span className="mt-4 text-lg font-semibold">{p.titulo}</span>
              <span className="text-xs text-white/60">{p.persona}</span>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-white/80">
                {p.puede.map((x) => (
                  <li key={x} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-sotec-green" /> {x}
                  </li>
                ))}
              </ul>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-sotec-green">
                Entrar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </button>
          ))}
        </div>
        <p className="mt-8 text-xs text-white/50">Los datos son ficticios y se guardan solo en este navegador. El administrador puede restablecerlos desde Configuración.</p>
      </div>
    </main>
  );
}
