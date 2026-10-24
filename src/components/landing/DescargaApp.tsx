"use client";

/**
 * Landing · «Llévala como app»: presenta ControlOne como aplicación web progresiva
 * (PWA) instalable sin tiendas, con sus funciones y los pasos según el equipo
 * (Android, iPhone o computador). Detecta el sistema para abrir la pestaña que
 * corresponde y, si el navegador lo permite (`beforeinstallprompt`), ofrece
 * instalar con un clic. Incluye un aviso flotante que lleva a esta sección y se
 * descarta una sola vez por navegador.
 */
import { useEffect, useState } from "react";
import { BellRing, Check, Download, Laptop, MoreVertical, Plus, RefreshCw, Share, Smartphone, WifiOff, X, Zap } from "lucide-react";

import { Reveal } from "@/components/fx/Reveal";
import { cn } from "@/lib/utils";

type Plataforma = "android" | "iphone" | "computador";

/** Evento de instalación de Chrome/Edge (no está en los tipos del DOM). */
interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const KEY_AVISO = "fd-aviso-app-visto";

const FUNCIONES = [
  { icon: Zap, t: "Abre al instante", d: "Desde el ícono en tu pantalla de inicio, a pantalla completa, sin buscar el enlace." },
  { icon: WifiOff, t: "Funciona sin señal", d: "Llena reportes, permisos y gastos en obra o en sótanos; se sincroniza al volver la conexión." },
  { icon: RefreshCw, t: "Siempre al día", d: "Se actualiza sola en segundo plano: nada que descargar ni reinstalar." },
  { icon: Smartphone, t: "Un solo sistema, cualquier pantalla", d: "Diseño responsive: celular, tableta o computador con los mismos datos." },
];

const PASOS: Record<Plataforma, { icon: typeof Share; t: string }[]> = {
  android: [
    { icon: Smartphone, t: "Abre controlone.sotecse.com en Google Chrome." },
    { icon: MoreVertical, t: "Toca el menú ⋮ (arriba a la derecha)." },
    { icon: Download, t: "Elige «Instalar aplicación» o «Agregar a la pantalla principal»." },
    { icon: Check, t: "Listo: ControlOne queda con su ícono junto a tus apps." },
  ],
  iphone: [
    { icon: Smartphone, t: "Abre controlone.sotecse.com en Safari." },
    { icon: Share, t: "Toca el botón Compartir (el cuadro con la flecha hacia arriba)." },
    { icon: Plus, t: "Desliza y elige «Agregar a pantalla de inicio»." },
    { icon: Check, t: "Toca «Agregar»: ControlOne aparece en tu pantalla de inicio." },
  ],
  computador: [
    { icon: Laptop, t: "Abre controlone.sotecse.com en Chrome o Edge." },
    { icon: Download, t: "Haz clic en el ícono de instalar en la barra de direcciones (o menú ⋮ → «Instalar ControlOne»)." },
    { icon: Check, t: "Se abre en su propia ventana y queda en el escritorio o el Dock." },
  ],
};

const PESTANAS: { clave: Plataforma; nombre: string }[] = [
  { clave: "android", nombre: "Android" },
  { clave: "iphone", nombre: "iPhone" },
  { clave: "computador", nombre: "Computador" },
];

function detectar(): Plataforma {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iphone";
  if (/Android/i.test(ua)) return "android";
  return "computador";
}

export function DescargaApp() {
  const [plataforma, setPlataforma] = useState<Plataforma>("android");
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    setPlataforma(detectar());
    setInstalada(window.matchMedia("(display-mode: standalone)").matches);
    // Chrome/Edge avisan que se puede instalar: se guarda el evento para el botón
    const alPoder = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    const alInstalar = () => setInstalada(true);
    window.addEventListener("beforeinstallprompt", alPoder);
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", alPoder);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  const instalar = async () => {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "accepted") setInstalada(true);
    setEvento(null);
  };

  return (
    <section id="app" className="relative scroll-mt-16 overflow-hidden bg-gradient-to-br from-white via-sotec-soft to-[#E9F5DC] py-20">
      <div aria-hidden className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-sotec-green/20 blur-3xl" />
      <div className="container relative grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-sotec-greenDeep/30 bg-white/80 px-3 py-1 text-xs font-semibold text-sotec-greenDeep">
            <BellRing className="h-3.5 w-3.5" /> Nuevo · ya disponible como app
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Lleva ControlOne <span className="text-sotec-greenDeep">en tu bolsillo</span>.
          </h2>
          <p className="mt-4 max-w-xl text-lg text-slate-700">
            Instálala en tu celular o computador en segundos, <strong>sin pasar por App Store ni Google Play</strong>. Es una aplicación web progresiva
            (PWA): la misma plataforma, responsive en cualquier pantalla, con la experiencia de una app nativa.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {FUNCIONES.map((f) => (
              <li key={f.t} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sotec text-sotec-green">
                  <f.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold text-slate-900">{f.t}</span>
                  <span className="text-sm text-slate-600">{f.d}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-slate-600">
            Sin descargas pesadas ni actualizaciones manuales · ocupa una fracción de una app tradicional · tus datos siguen protegidos en la nube.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-sotec-greenDeep">Instálala en 1 minuto</p>
            <div role="tablist" aria-label="Tu equipo" className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
              {PESTANAS.map((p) => (
                <button
                  key={p.clave}
                  role="tab"
                  aria-selected={plataforma === p.clave}
                  onClick={() => setPlataforma(p.clave)}
                  className={cn(
                    "rounded-lg px-2 py-2 text-sm font-medium transition",
                    plataforma === p.clave ? "bg-sotec text-white shadow" : "text-slate-600 hover:bg-white",
                  )}
                >
                  {p.nombre}
                </button>
              ))}
            </div>

            <ol className="mt-6 space-y-4" aria-live="polite">
              {PASOS[plataforma].map((p, k) => (
                <li key={p.t} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sotec-soft text-sm font-semibold text-sotec-greenDeep">{k + 1}</span>
                  <span className="flex flex-1 items-start gap-2 pt-1 text-sm text-slate-700">
                    <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    {p.t}
                  </span>
                </li>
              ))}
            </ol>

            {instalada ? (
              <p className="mt-6 flex items-center gap-2 rounded-lg bg-sotec-soft px-4 py-3 text-sm font-medium text-sotec-greenDeep">
                <Check className="h-4 w-4" /> ControlOne ya está instalada en este equipo.
              </p>
            ) : (
              evento && (
                <button
                  onClick={instalar}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-sotec px-4 py-3 text-sm font-semibold text-white transition hover:bg-black"
                >
                  <Download className="h-4 w-4 text-sotec-green" /> Instalar ControlOne ahora
                </button>
              )
            )}
            {plataforma === "iphone" && <p className="mt-4 text-xs text-slate-500">En iPhone la instalación se hace desde Safari; Apple no muestra un botón de instalar automático.</p>}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Aviso flotante (una vez por navegador) que invita a ver la sección de la app. */
export function AvisoApp() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let visto = false;
    try {
      visto = localStorage.getItem(KEY_AVISO) === "1" || window.matchMedia("(display-mode: standalone)").matches;
    } catch {
      /* sin almacenamiento: se muestra igual */
    }
    if (visto) return;
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const cerrar = () => {
    setVisible(false);
    try {
      localStorage.setItem(KEY_AVISO, "1");
    } catch {
      /* ignorar */
    }
  };

  if (!visible) return null;
  return (
    <div role="dialog" aria-label="ControlOne ya se instala como app" className="fixed bottom-4 left-4 right-4 z-40 sm:right-auto sm:w-[360px]">
      <div className="flex gap-3 rounded-2xl border border-white/10 bg-sotec p-4 text-white shadow-2xl">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sotec-green text-sotec">
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">ControlOne ya es app 📲</p>
          <p className="mt-0.5 text-sm text-white/75">Instálala en tu celular o computador, sin tiendas. Funciona sin señal.</p>
          <a href="#app" onClick={cerrar} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-sotec-green hover:underline">
            Ver cómo instalarla →
          </a>
        </div>
        <button onClick={cerrar} aria-label="Cerrar aviso" className="h-7 w-7 shrink-0 rounded-md text-white/60 hover:bg-white/10 hover:text-white">
          <X className="mx-auto h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
