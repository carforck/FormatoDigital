"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, Loader2, Lock, PlayCircle } from "lucide-react";

import { asset } from "@/nucleo/rutas";
import { PERFILES } from "@/nucleo/perfiles";
import { KEY_TRAS_LOGIN, useDemo } from "@/nucleo/datos/DemoProvider";
import { ETIQUETA_ROL } from "@/nucleo/catalogos";
import { cn } from "@/lib/utils";

type Vista = "empresa" | "demo";

const BENEFICIOS = [
  ["Un solo lugar para toda la empresa", "Reportes, permisos de trabajo, gastos, cotizaciones, proyectos, equipos y cuentas de cobro."],
  ["Tu equipo, sincronizado", "Lo que guarda un técnico en campo lo ve la coordinación en la oficina."],
  ["Cada quien ve lo suyo", "Menús y permisos según el rol: técnico, SST y administración."],
];

export default function Acceso() {
  const demo = useDemo();
  const router = useRouter();
  const [vista, setVista] = useState<Vista>("empresa");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  // Abre en el acceso de la empresa; si hay una sesión abierta, en la pestaña de esa sesión
  useEffect(() => {
    if (demo.listo && demo.usuario) setVista(demo.modo);
  }, [demo.listo, demo.modo, demo.usuario]);

  // Recién iniciada la sesión: al cargar el espacio de la empresa se entra al aplicativo
  useEffect(() => {
    let tras = false;
    try {
      tras = sessionStorage.getItem(KEY_TRAS_LOGIN) === "1";
    } catch {
      /* ignorar */
    }
    if (!tras) return;
    setEntrando(true);
    if (!demo.listo) return;
    try {
      sessionStorage.removeItem(KEY_TRAS_LOGIN);
    } catch {
      /* ignorar */
    }
    if (demo.modo === "empresa" && demo.usuario) router.replace("/app");
    else {
      setEntrando(false);
      setError("No se pudo abrir el espacio de la empresa. Intenta de nuevo.");
    }
  }, [demo.listo, demo.modo, demo.usuario, router]);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo.trim() || !clave) {
      setError("Escribe tu correo y tu contraseña.");
      return;
    }
    setError(null);
    setEntrando(true);
    const err = await demo.entrarEmpresa(correo, clave);
    if (err) {
      setError(err);
      setEntrando(false);
    }
  };

  const continuar = demo.usuario && demo.modo === vista ? demo.usuario : null;
  const campo =
    "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sotec-greenDeep focus:ring-2 focus:ring-sotec-green/40";

  return (
    <main className="min-h-screen bg-sotec text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-14">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Volver a la presentación
        </Link>
        <div className="mt-6 flex items-center gap-3">
          <img src={asset("/sotec-logo-v3-oscuro.png")} alt="SOTEC" className="h-16 w-auto" />
        </div>
        <h1 className="mt-6 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Accede a ControlOne</h1>
        <p className="mt-3 max-w-2xl text-white/70">Toda tu empresa, un solo control. Entra al espacio de tu empresa o recorre la demo corporativa.</p>

        {/* Dos accesos: el espacio real de la empresa y la demo con datos ficticios */}
        <div role="tablist" aria-label="Tipo de acceso" className="mt-8 grid max-w-xl grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
          {(
            [
              ["empresa", "Acceso empresa", Building2],
              ["demo", "Probar la demo", PlayCircle],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              role="tab"
              aria-selected={vista === v}
              onClick={() => setVista(v)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                vista === v ? "bg-sotec-green text-sotec shadow" : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" /> {label}
            </button>
          ))}
        </div>

        {/* De regreso desde la presentación: se retoma la sesión sin volver a entrar */}
        {continuar && !entrando && (
          <Link
            href="/app"
            className="mt-6 inline-flex max-w-full items-center gap-2 rounded-xl border border-sotec-green/40 bg-sotec-green/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-sotec-green/20"
          >
            <span className="min-w-0 truncate">
              Continuar como {continuar.nombre} · {ETIQUETA_ROL[continuar.rol]}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-sotec-green" />
          </Link>
        )}

        {vista === "empresa" ? (
          <section className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-center">
            <form onSubmit={entrar} noValidate className="rounded-2xl bg-white p-6 text-slate-900 shadow-xl sm:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sotec-green text-sotec">
                <Lock className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-xl font-semibold">Espacio de la empresa</h2>
              <p className="mt-1 text-sm text-slate-500">Datos reales de tu empresa, compartidos con tu equipo.</p>

              <label className="mt-6 block text-sm font-medium text-slate-700" htmlFor="correo">
                Correo
              </label>
              <input
                id="correo"
                type="email"
                autoComplete="username"
                inputMode="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className={cn(campo, "mt-1.5")}
                placeholder="tucorreo@empresa.com"
              />
              <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="clave">
                Contraseña
              </label>
              <div className="relative mt-1.5">
                <input
                  id="clave"
                  type={verClave ? "text" : "password"}
                  autoComplete="current-password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  className={cn(campo, "pr-11")}
                />
                <button
                  type="button"
                  onClick={() => setVerClave(!verClave)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-700"
                  aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {verClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && (
                <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={entrando}
                className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-sotec text-sm font-semibold text-white transition hover:bg-black disabled:opacity-70"
              >
                {entrando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {entrando ? "Entrando…" : "Entrar"}
              </button>
              <p className="mt-4 text-xs text-slate-500">¿No tienes acceso? Pídele al administrador de tu empresa que te cree un usuario.</p>
            </form>

            <ul className="space-y-5">
              {BENEFICIOS.map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-sotec-green" />
                  <span>
                    <span className="block font-semibold text-white">{t}</span>
                    <span className="text-sm text-white/70">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="mt-8">
            <h2 className="text-xl font-semibold">¿Con qué perfil quieres recorrer la demo?</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              Sin usuario ni contraseña. Cada perfil ve un menú y unos permisos distintos; puedes cambiar de perfil en cualquier momento desde la barra superior.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <p className="mt-8 text-xs text-white/50">Los datos de la demo son ficticios y se guardan solo en este navegador. El administrador puede restablecerlos desde Configuración.</p>
          </section>
        )}
      </div>
    </main>
  );
}
