"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";

import { asset } from "@/nucleo/rutas";
import { PERFILES } from "@/nucleo/perfiles";
import { KEY_TRAS_LOGIN, useDemo } from "@/nucleo/datos/DemoProvider";
import { ETIQUETA_ROL } from "@/nucleo/catalogos";
import { cn } from "@/lib/utils";

const BENEFICIOS = [
  ["Un solo lugar para toda la empresa", "Reportes, permisos de trabajo, aprobaciones, proyectos, equipos y cuentas de cobro."],
  ["Tu equipo, sincronizado", "Lo que guarda un técnico en campo lo ve la coordinación en la oficina, al instante."],
  ["Cada quien ve lo suyo", "Menús y permisos según el rol: técnico, SST, administración y cliente."],
];


// Qué hace cada perfil de la demo, en una línea
const RESUMEN_ROL: Record<string, string> = {
  tecnico: "Diligencia reportes y permisos en campo",
  supervisor: "Revisa, aprueba y firma los documentos",
  admin: "Control total: usuarios, cotizaciones y cobros",
  cliente: "Consulta y firma los reportes de su empresa",
};

const ANILLO = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sotec-greenDeep focus-visible:ring-offset-2";

/** Enlace para retomar una sesión abierta sin volver a entrar. */
function Continuar({ nombre, rol }: { nombre: string; rol: string }) {
  return (
    <Link
      href="/app"
      className={cn(
        "group mt-5 flex w-full items-center gap-2 rounded-xl border border-sotec-green/70 bg-white px-4 py-3 text-sm font-medium text-sotec shadow-sm transition hover:bg-sotec-soft",
        ANILLO,
      )}
    >
      <span className="min-w-0 flex-1 truncate">
        Continuar como <span className="font-semibold">{nombre}</span> · {rol}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-sotec-greenDeep transition group-hover:translate-x-0.5" />
    </Link>
  );
}

export default function Acceso() {
  const demo = useDemo();
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

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

  // De regreso desde la presentación: la sesión abierta se retoma junto a su tipo de acceso
  const sesion = demo.usuario && !entrando ? demo.usuario : null;
  const continuarEmpresa = sesion && demo.modo === "empresa" ? sesion : null;
  const continuarDemo = sesion && demo.modo === "demo" ? sesion : null;

  const campo =
    "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-sotec-greenDeep focus:ring-2 focus:ring-sotec-green/50";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      {/* Panel de marca (escritorio) */}
      <aside className="relative hidden overflow-hidden bg-sotec text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <img
            src={asset("/landing/tecnico-tablet-obra.webp")}
            alt=""
            width={1600}
            height={1067}
            className="h-full w-full object-cover object-[65%_center] opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-sotec via-sotec/85 to-sotec" />
          <div className="absolute -left-32 bottom-10 h-80 w-80 rounded-full bg-sotec-green/15 blur-3xl" />
        </div>

        <div className="relative flex h-full flex-col justify-between gap-10 overflow-y-auto px-10 py-10 xl:px-14">
          <img src={asset("/sotec-logo-v3-oscuro.png")} alt="SOTEC" className="h-16 w-auto self-start" />

          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-sotec-green/40 bg-white/5 px-3 py-1 text-xs font-medium text-sotec-green">
              <ShieldCheck className="h-3.5 w-3.5" /> ControlOne by SOTEC
            </p>
            <p className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">
              Toda tu empresa, <span className="text-sotec-green">un solo control</span>.
            </p>
            <p className="mt-4 max-w-md text-white/75">
              El control digital de todas las áreas de tu empresa, con trazabilidad lista para auditoría.
            </p>
            <ul className="mt-8 space-y-5">
              {BENEFICIOS.map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sotec-green/15">
                    <Check className="h-4 w-4 text-sotec-green" />
                  </span>
                  <span>
                    <span className="block font-semibold">{t}</span>
                    <span className="text-sm text-white/70">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Accesos */}
      <div className="flex min-w-0 flex-col">
        {/* Encabezado de marca (móvil y tableta) */}
        <div className="relative overflow-hidden bg-sotec px-4 pb-7 pt-5 text-white sm:px-8 lg:hidden">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sotec-green/15 blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <img src={asset("/sotec-logo-v3-oscuro.png")} alt="SOTEC" className="h-10 w-auto" />
            <Link
              href="/"
              className={cn("inline-flex items-center gap-1 rounded text-sm text-white/80 hover:text-white", ANILLO, "focus-visible:ring-sotec-green focus-visible:ring-offset-sotec")}
            >
              <ArrowLeft className="h-4 w-4" /> Volver a la presentación
            </Link>
          </div>
          <p className="relative mt-6 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            Toda tu empresa, <span className="text-sotec-green">un solo control</span>.
          </p>
          <p className="relative mt-2 flex flex-wrap items-center gap-x-2 text-xs font-medium text-white/75">
            <ShieldCheck className="h-3.5 w-3.5 text-sotec-green" /> ControlOne by SOTEC
          </p>
        </div>

        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8 lg:px-10 lg:py-10 xl:px-12">
          <div className="hidden justify-end lg:flex">
            <Link href="/" className={cn("inline-flex items-center gap-1 rounded text-sm font-medium text-slate-600 hover:text-sotec", ANILLO)}>
              <ArrowLeft className="h-4 w-4" /> Volver a la presentación
            </Link>
          </div>

          <header className="lg:mt-4">
            <h1 className="text-2xl font-semibold tracking-tight text-sotec sm:text-3xl">Accede a ControlOne</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Entra al espacio de tu empresa o conoce la plataforma con la demo corporativa.
            </p>
          </header>

          <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
            {/* 1. Acceso de la empresa (datos reales) */}
            <section aria-labelledby="titulo-empresa" className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-7">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sotec text-sotec-green">
                  <Lock className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-sotec-greenDeep">Clientes ControlOne</p>
                  <h2 id="titulo-empresa" className="text-xl font-semibold text-sotec">
                    Iniciar sesión
                  </h2>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">Datos reales de tu empresa, compartidos con tu equipo.</p>

              {continuarEmpresa && <Continuar nombre={continuarEmpresa.nombre} rol={ETIQUETA_ROL[continuarEmpresa.rol]} />}

              <form onSubmit={entrar} noValidate className="mt-5">
                <label className="block text-sm font-medium text-slate-700" htmlFor="correo">
                  Correo corporativo
                </label>
                <input
                  id="correo"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "error-acceso" : undefined}
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
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "error-acceso" : undefined}
                    className={cn(campo, "pr-11")}
                  />
                  <button
                    type="button"
                    onClick={() => setVerClave(!verClave)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sotec-greenDeep"
                    aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-pressed={verClave}
                  >
                    {verClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {error && (
                  <p id="error-acceso" role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={entrando}
                  className={cn(
                    "mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-sotec text-sm font-semibold text-white shadow-lg shadow-sotec/20 transition hover:bg-sotec-ink disabled:opacity-70",
                    ANILLO,
                  )}
                >
                  {entrando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4 text-sotec-green" />}
                  {entrando ? "Entrando…" : "Entrar"}
                </button>
              </form>
              <p className="mt-5 text-xs leading-relaxed text-slate-500">
                ¿No tienes acceso? Pídele al administrador de tu empresa que te cree un usuario.
              </p>
            </section>

            {/* 2. Demo corporativa (datos ficticios) */}
            <section aria-labelledby="titulo-demo" className="flex min-w-0 flex-col rounded-2xl border border-sotec-green/50 bg-sotec-soft p-6 sm:p-7">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sotec-green text-sotec">
                  <PlayCircle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-sotec-greenDeep">Demo corporativa</p>
                  <h2 id="titulo-demo" className="text-xl font-semibold text-sotec">
                    ¿Aún no tienes cuenta?
                  </h2>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                Conoce ControlOne con la demo, sin usuario ni contraseña. Elige un perfil: cada uno ve su propio menú y permisos.
              </p>

              {continuarDemo && <Continuar nombre={continuarDemo.nombre} rol={ETIQUETA_ROL[continuarDemo.rol]} />}

              <ul className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-1" aria-label="Perfiles de la demo">
                {PERFILES.map((p) => (
                  <li key={p.rol}>
                    <button
                      type="button"
                      onClick={() => {
                        demo.entrarComo(p.rol);
                        router.push(p.rol === "tecnico" ? "/app/nuevo/reporte" : p.rol === "supervisor" ? "/app/revision" : "/app");
                      }}
                      className={cn(
                        "group flex h-full w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sotec-greenDeep hover:shadow-md",
                        ANILLO,
                      )}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sotec-soft text-sotec-greenDeep transition group-hover:bg-sotec-green group-hover:text-sotec">
                        <p.icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="sr-only">Entrar a la demo como </span>
                        <span className="block text-sm font-semibold text-sotec">{p.titulo}</span>
                        <span className="block text-xs leading-snug text-slate-600">{RESUMEN_ROL[p.rol] ?? p.puede[0]}</span>
                      </span>
                      <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-sotec-greenDeep" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-5 flex gap-2 text-xs leading-relaxed text-slate-600">
                <Building2 aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sotec-greenDeep" />
                Datos ficticios que se guardan solo en este navegador. Puedes cambiar de perfil en cualquier momento.
              </p>
            </section>
          </div>

          {/* Beneficios (móvil y tableta; en escritorio están en el panel de marca) */}
          <ul className="mt-10 space-y-4 lg:hidden">
            {BENEFICIOS.map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-sotec-greenDeep" />
                <span>
                  <span className="block text-sm font-semibold text-sotec">{t}</span>
                  <span className="text-sm text-slate-600">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <footer className="mx-auto w-full max-w-5xl px-4 pb-8 text-xs text-slate-500 sm:px-8 lg:px-10 xl:px-12">
          ControlOne by SOTEC · Toda tu empresa, un solo control.
        </footer>
      </div>
    </main>
  );
}
