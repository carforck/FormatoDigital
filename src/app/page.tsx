/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building,
  Building2,
  FileCheck2,
  Fingerprint,
  Lock,
  ShieldCheck,
  Timer,
} from "lucide-react";

import { asset } from "@/nucleo/rutas";
import { FondoInteractivo } from "@/components/fx/FondoInteractivo";
import { Contador, Icono, ProgresoScroll, Reveal, TextoRotativo } from "@/components/fx/Reveal";
import { GraficasImpacto } from "@/components/landing/GraficasImpacto";
import { AccesoRoles, Contacto, Faq, VitrinaFormatos } from "@/components/landing/Interactivos";
import { CalculadoraROI } from "@/components/landing/CalculadoraROI";
import { ChatEnVivo } from "@/components/landing/ChatEnVivo";
import { FirmaDigital, Foto, ServiciosSotec } from "@/components/landing/Fotos";
import { FuncionesBento } from "@/components/landing/FuncionesBento";
import { LottieDigitaliza } from "@/components/landing/LottieDigitaliza";
import { NormasReferencia } from "@/components/landing/NormasReferencia";
import { PapelVsDigital } from "@/components/landing/PapelVsDigital";

const FORMATOS_TIPICOS = [
  "Permisos de trabajo",
  "Análisis de trabajo seguro (ATS)",
  "Reportes técnicos",
  "Inspección de EPP",
  "Listas de chequeo",
  "Inspección de extintores",
  "Órdenes de servicio",
  "Actas de reunión",
  "Entrega de dotación",
  "Reporte de incidentes",
  "Cuentas de cobro",
  "Solicitud de permisos laborales",
  "Control de asistencia a capacitaciones",
  "Inspección preoperacional de vehículos",
];

export default function Landing() {
  return (
    <div className="bg-white text-slate-900">
      <ProgresoScroll />
      {/* Navegación */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-sotec/95 text-white backdrop-blur">
        <div className="container flex h-14 items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sotec-green text-sotec">
              <Icono><FileCheck2 className="h-4 w-4" /></Icono>
            </span>
            FormatoDigital
          </Link>
          <nav className="hidden gap-5 text-sm text-white/70 lg:flex">
            <a href="#formatos" className="hover:text-white">Caso SOTEC</a>
            <a href="#impacto" className="hover:text-white">Impacto</a>
            <a href="#funciones" className="hover:text-white">Funcionalidades</a>
            <a href="#roles" className="hover:text-white">Roles</a>
            <a href="#ahorro" className="hover:text-white">Ahorro</a>
            <a href="#planes" className="hover:text-white">Planes</a>
            <a href="#faq" className="hover:text-white">Preguntas</a>
          </nav>
          <Link href="/acceso" className="icono-nudge ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sotec-green px-4 py-1.5 text-sm font-semibold text-sotec hover:brightness-110">
            <span className="min-[400px]:hidden">Demo</span>
            <span className="hidden min-[400px]:inline">Probar la demo</span> <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-sotec text-white">
        {/* Foto de fondo: oscurecida y con degradado para mantener el contraste del texto */}
        <div aria-hidden className="pointer-events-none absolute inset-0 lg:left-[35%]">
          <img
            src={asset("/landing/tecnico-tablet-obra.webp")}
            alt=""
            width={1600}
            height={1067}
            className="h-full w-full object-cover object-[70%_center] opacity-25 lg:opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-sotec/70 via-sotec/80 to-sotec lg:bg-gradient-to-r lg:from-sotec lg:via-sotec/70 lg:to-sotec/30" />
        </div>
        <FondoInteractivo />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-sotec to-transparent" />
        <div className="container relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-sotec-green/40 bg-sotec-green/10 px-3 py-1 text-xs font-medium text-sotec-green">
              <ShieldCheck className="h-3.5 w-3.5" /> Calidad · SG-SST · ISO 9001
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Digitalizamos y optimizamos <span className="text-sotec-green">cualquier formato</span> de tu sistema de gestión.
            </h1>
            <p className="mt-5 flex flex-wrap items-center gap-2 font-mono text-sm text-white/60">
              <span className="h-2 w-2 animate-pulse rounded-full bg-sotec-green" /> digitalizando:
              <span className="text-sotec-green">
                <TextoRotativo palabras={["permisos de trabajo", "reportes técnicos", "inspecciones de EPP", "análisis de trabajo seguro", "actas y listas de chequeo", "cuentas de cobro"]} />
              </span>
            </p>
            <p className="mt-4 max-w-xl text-lg text-white/75">
              De papel, Word o Excel a un formulario guiado con firmas, aprobaciones y trazabilidad lista para auditoría. Para pequeñas y grandes empresas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/acceso" className="icono-nudge inline-flex items-center gap-2 rounded-full bg-sotec-green px-6 py-3 font-semibold text-sotec shadow-[0_0_0_0_rgba(146,208,80,0.6)] transition hover:shadow-[0_0_0_8px_rgba(146,208,80,0.15)] hover:brightness-110">
                Probar la demo con SOTEC <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#contacto" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 font-semibold hover:bg-white/10">
                Solicitar propuesta
              </a>
            </div>
            <p className="mt-4 text-sm text-white/50">Sin registro ni contraseña · datos de ejemplo</p>
          </div>
          <LottieDigitaliza />
        </div>
      </section>

      {/* Caso de cliente */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="container flex flex-col items-center gap-6 py-8 md:flex-row">
          <div className="flex items-center gap-4">
            <img src={asset("/sotec-logo-v3.png")} alt="SOTEC" className="h-16 w-auto shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-sotec-greenDeep">Caso de cliente</p>
              <p className="font-semibold">SOTEC · seguridad electrónica y telecomunicaciones</p>
              <p className="text-sm text-slate-500">CCTV, control de acceso, cercas eléctricas, fibra óptica y energía solar</p>
            </div>
          </div>
          <div className="grid w-full grid-cols-3 gap-4 text-center md:ml-auto md:w-auto md:gap-10">
            <div>
              <p className="text-3xl font-semibold"><Contador valor={2} /></p>
              <p className="text-xs text-slate-500">formatos del SG-SST digitalizados</p>
            </div>
            <div>
              <p className="text-3xl font-semibold"><Contador valor={82} prefijo="−" sufijo="%" /></p>
              <p className="text-xs text-slate-500">tiempo de diligenciamiento*</p>
            </div>
            <div>
              <p className="text-3xl font-semibold"><Contador valor={0} /></p>
              <p className="text-xs text-slate-500">formatos en papel por archivar</p>
            </div>
          </div>
        </div>
      </section>

      {/* Míralo llenarse */}
      <section className="relative overflow-hidden bg-sotec py-16 text-white sm:py-24">
        <div aria-hidden className="pointer-events-none absolute -right-40 top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full bg-sotec-green/10 blur-3xl" />
        <div className="container relative grid items-center gap-10 lg:grid-cols-[0.8fr_1.4fr] lg:gap-12">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wider text-sotec-green">Así se llena</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">El técnico conversa; el formato se diligencia solo</h2>
            <p className="mt-3 text-white/70">
              El asistente pregunta en lenguaje sencillo, valida cada respuesta y la ubica en el campo correcto del formato oficial. Al final el técnico firma con el dedo y el documento sale a revisión.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {["Autocompleta desde el directorio", "Bloquea campos inválidos", "Redacción asistida", "Firma y envío en un toque"].map((x, k) => (
                <Reveal key={x} delay={k * 90} as="li" className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:border-sotec-green/50 hover:bg-white/10">
                  <Icono efecto="bounce"><FileCheck2 className="h-4 w-4 text-sotec-green" /></Icono> {x}
                </Reveal>
              ))}
            </ul>
            <Foto
              src="/landing/inspeccion-obra-tablet-radio.webp"
              alt="Supervisor con radio e ingeniera con tablet haciendo una inspección en obra"
              ancho={1600}
              alto={1067}
              className="mt-8 aspect-[16/9] ring-white/10 sm:aspect-[21/9]"
            >
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sotec/90 via-transparent to-transparent" />
              <figcaption className="absolute bottom-3 left-4 right-4 flex items-center gap-2 text-sm font-medium text-white">
                <ShieldCheck className="h-4 w-4 shrink-0 text-sotec-green" /> Inspección en obra, diligenciada desde la tablet
              </figcaption>
            </Foto>
          </Reveal>
          <Reveal delay={150} className="min-w-0">
            <ChatEnVivo />
          </Reveal>
        </div>
      </section>

      {/* Problema → solución */}
      <section className="container py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">El papel le cuesta a tu empresa más de lo que parece</h2>
          <p className="mt-3 text-slate-600">Cada problema del formato en papel, con la solución que lo elimina.<span className="hidden md:inline"> Pasa el mouse por una fila.</span><span className="md:hidden"> Toca «Después» para ver el cambio.</span></p>
        </Reveal>
        <Reveal className="mx-auto mt-12 max-w-5xl">
          <PapelVsDigital />
        </Reveal>
      </section>

      {/* Vitrina de los dos formatos */}
      <section id="formatos" className="scroll-mt-16 border-y border-slate-200 bg-slate-50 py-20">
        <div className="container">
          <p className="text-sm font-semibold uppercase tracking-wider text-sotec-greenDeep">Caso SOTEC</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Sus dos formatos del SG-SST, ya digitales y funcionando</h2>
          <p className="mt-3 max-w-2xl text-slate-600">Tomamos el reporte técnico y el permiso de trabajo que SOTEC usa en campo y los convertimos en documentos inteligentes. Cámbialos aquí y pruébalos en la demo.</p>
          <Reveal className="mt-10">
            <VitrinaFormatos />
          </Reveal>
        </div>
      </section>

      <ServiciosSotec />

      {/* Cómo funciona */}
      <section className="container py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">De tu formato a la app, en cuatro pasos</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {[
            ["01", "Levantamos tu formato", "Nos compartes el formato en papel, Word, Excel o PDF y cómo lo usa tu equipo."],
            ["02", "Lo digitalizamos fiel", "Misma estructura y control documental, más reglas de validación de tu SGC."],
            ["03", "Tu equipo lo diligencia", "Con el asistente, desde el celular o el computador, con firma en pantalla."],
            ["04", "Apruebas y auditas", "Revisión, cierre, PDF, indicadores y trazabilidad completa."],
          ].map(([n, t, d], k) => (
            <Reveal key={n} delay={k * 120} className="group relative rounded-2xl border border-slate-200 p-6 transition hover:-translate-y-1 hover:border-sotec-green hover:shadow-lg">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sotec font-mono text-sm font-semibold text-sotec-green transition group-hover:scale-110">{n}</span>
              <p className="mt-3 text-lg font-semibold">{t}</p>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
              {k < 3 && <span aria-hidden className="absolute -right-4 top-11 hidden h-0.5 w-8 bg-gradient-to-r from-sotec-green to-transparent md:block" />}
            </Reveal>
          ))}
        </div>
      </section>

      <FirmaDigital />

      {/* Funcionalidades */}
      <section id="funciones" className="scroll-mt-16 bg-slate-50 py-20">
        <div className="container">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-sotec-greenDeep">Funcionalidades</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Todo lo que tu sistema de gestión necesita, en un solo lugar</h2>
          </Reveal>
          <Reveal className="mt-12">
            <FuncionesBento />
          </Reveal>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="relative scroll-mt-16 overflow-hidden bg-sotec py-20 text-white">
        <FondoInteractivo densidad={0.00005} />
        <div className="container relative">
          <p className="text-sm font-semibold uppercase tracking-wider text-sotec-green">Roles y accesos</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Entra a la demo con el perfil que quieras</h2>
          <p className="mt-3 max-w-2xl text-white/70">
            Sin usuario ni contraseña. Prueba el recorrido completo: el técnico crea y firma, el coordinador SST aprueba, el cliente firma su reporte y el administrador lo controla todo.
          </p>
          <div className="mt-10">
            <AccesoRoles />
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-white/50">
            <Icono><Lock className="h-4 w-4" /></Icono> En producción cada persona entra con su cuenta y los permisos se validan en el servidor.
          </p>
        </div>
      </section>

      {/* Frase gancho */}
      <section aria-label="Medición" className="relative overflow-hidden border-b border-slate-200 bg-white py-14 sm:py-16">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-sotec-green via-sotec-green/60 to-transparent" />
        <Reveal className="container relative">
          <figure className="mx-auto max-w-4xl">
            <span aria-hidden className="block select-none font-serif text-7xl leading-none text-sotec-green sm:text-8xl">“</span>
            <blockquote className="-mt-6 space-y-1 text-2xl font-semibold leading-tight tracking-tight text-sotec sm:-mt-8 sm:text-3xl lg:text-4xl">
              <p>Lo que no se define, no se puede <span className="text-sotec-greenDeep">medir</span>.</p>
              <p>Lo que no se mide, no se puede <span className="text-sotec-greenDeep">mejorar</span>.</p>
              <p>Lo que no se mejora, se <span className="text-sotec-greenDeep">degrada</span> siempre.</p>
            </blockquote>
            <p className="mt-3 text-sm text-slate-500">— Frase atribuida a Lord Kelvin (William Thomson)</p>
            <figcaption className="mt-5 flex flex-col gap-4 border-l-2 border-sotec-green pl-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="max-w-2xl text-slate-600">
                Con cada formato digital, tu sistema de gestión mide en tiempo real: tiempos, aprobaciones, pendientes y cumplimiento.
              </span>
              <a href="#impacto" className="icono-nudge inline-flex shrink-0 items-center gap-1.5 font-semibold text-sotec-greenDeep hover:underline">
                Ver los indicadores <ArrowRight className="h-4 w-4" />
              </a>
            </figcaption>
          </figure>
        </Reveal>
      </section>

      {/* Impacto */}
      <section id="impacto" className="scroll-mt-16 bg-slate-50 py-20">
        <div className="container">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-sotec-greenDeep">Impacto medible<span aria-hidden>*</span></p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Menos tiempo, menos errores, cero papeles perdidos</h2>
            <p className="mt-3 text-slate-600">Pasa el mouse por las gráficas para ver cada valor.</p>
          </Reveal>
          <GraficasImpacto />
        </div>
      </section>

      {/* Calculadora */}
      <section id="ahorro" className="container scroll-mt-16 py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-sotec-greenDeep">
            <Icono><Timer className="h-4 w-4" /></Icono> Calcula tu ahorro
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">¿Cuánto le cuesta el papel a tu empresa?</h2>
          <p className="mt-3 text-slate-600">Un caso de negocio con supuestos visibles y fuentes: ajústalo con tus datos y descárgalo en PDF.</p>
        </div>
        <Reveal>
          <CalculadoraROI />
        </Reveal>
      </section>

      {/* Formatos que digitalizamos */}
      <section className="border-y border-slate-200 bg-slate-50 py-16">
        <div className="container text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Si existe en papel, lo digitalizamos</h2>
          <div className="relative mt-8 space-y-3 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
            {[FORMATOS_TIPICOS, [...FORMATOS_TIPICOS].reverse()].map((fila, k) => (
              <div key={k} className="flex w-max animate-marquee gap-2 hover:[animation-play-state:paused]" style={{ animationDirection: k ? "reverse" : "normal" }}>
                {[...fila, ...fila].map((f, j) => (
                  <span key={j} className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-sotec-green hover:bg-sotec-soft">
                    {f}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <span className="mt-6 inline-block rounded-full bg-sotec px-4 py-2 text-sm font-medium text-white">+ el formato que tú necesites</span>
        </div>
      </section>

      <NormasReferencia />

      {/* Planes */}
      <section id="planes" className="container scroll-mt-16 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">Para pequeñas y grandes empresas</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">Empieza con los formatos críticos y crece a tu ritmo.</p>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {[
            {
              icon: Building,
              n: "Esencial",
              p: "Pequeñas empresas y contratistas",
              f: ["Hasta 3 formatos digitalizados", "Asistente, firmas y PDF", "Roles básicos: campo y supervisión", "Tablero de indicadores"],
            },
            {
              icon: Building2,
              n: "Empresarial",
              p: "Medianas empresas con varias áreas",
              f: ["Hasta 10 formatos", "Flujos de aprobación por área", "Portal para clientes", "Auditoría y exportación de datos"],
              destacado: true,
            },
            {
              icon: Fingerprint,
              n: "Corporativo",
              p: "Grandes empresas y grupos",
              f: ["Formatos ilimitados y multi-sede", "Integración con ERP, correo y nube", "Inicio de sesión corporativo", "Acompañamiento y soporte dedicado"],
            },
          ].map((pl, k) => (
            <Reveal key={pl.n} delay={k * 120}>
            <div className={pl.destacado ? "group relative h-full rounded-3xl bg-sotec p-7 text-white shadow-xl transition hover:-translate-y-1" : "group h-full rounded-3xl border border-slate-200 p-7 transition hover:-translate-y-1 hover:shadow-lg"}>
              {pl.destacado && <span className="absolute -top-3 left-7 rounded-full bg-sotec-green px-3 py-0.5 text-xs font-semibold text-sotec">El más elegido</span>}
              <Icono efecto="bounce"><pl.icon className={pl.destacado ? "h-6 w-6 text-sotec-green" : "h-6 w-6 text-sotec-greenDeep"} /></Icono>
              <p className="mt-4 text-xl font-semibold">{pl.n}</p>
              <p className={pl.destacado ? "text-sm text-white/70" : "text-sm text-slate-500"}>{pl.p}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {pl.f.map((x) => (
                  <li key={x} className="flex gap-2">
                    <FileCheck2 className={pl.destacado ? "h-4 w-4 shrink-0 text-sotec-green" : "h-4 w-4 shrink-0 text-sotec-greenDeep"} /> {x}
                  </li>
                ))}
              </ul>
              <a
                href="#contacto"
                className={
                  pl.destacado
                    ? "mt-8 block rounded-full bg-sotec-green py-2.5 text-center font-semibold text-sotec hover:brightness-110"
                    : "mt-8 block rounded-full border border-slate-300 py-2.5 text-center font-semibold hover:bg-slate-50"
                }
              >
                Cotizar
              </a>
            </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 bg-slate-50 py-20">
        <div className="container max-w-3xl">
          <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">Preguntas frecuentes</h2>
          <div className="mt-10">
            <Faq />
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="relative scroll-mt-16 overflow-hidden bg-sotec py-20 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <img
            src={asset("/landing/equipo-revision-reportes.webp")}
            alt=""
            width={1600}
            height={1069}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-sotec via-sotec/85 to-sotec/60" />
        </div>
        <div className="container relative grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Digitalicemos tu primer formato</h2>
            <p className="mt-3 text-white/70">Cuéntanos qué formatos usa tu equipo y te mostramos cómo se verían funcionando, como lo hicimos con SOTEC.</p>
            <Link href="/acceso" className="icono-nudge mt-6 inline-flex items-center gap-2 font-semibold text-sotec-green hover:underline">
              O recorre la demo ahora <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <Contacto />
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black py-10 text-white/60">
        <div className="container">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sotec-green text-sotec">
                  <FileCheck2 className="h-4 w-4" />
                </span>
                FormatoDigital
              </p>
              <p className="mt-2 text-sm">Digitalización de formatos para sistemas de gestión</p>
            </div>
            <p className="text-sm">
              Desarrollado por{" "}
              <a
                href="https://vanttagetech.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-sotec-green hover:underline"
              >
                Vanttage <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </p>
          </div>
          <div className="mt-8 border-t border-white/10 pt-5 text-xs leading-relaxed text-white/50">
            <p className="font-semibold uppercase tracking-wider text-white/60">Notas</p>
            <ul className="mt-2 space-y-1">
              <li>* Cifras ilustrativas de un piloto típico (50 min en papel frente a 9 min digital por formato).</li>
              <li>Las normas ISO y la legislación se citan solo como referencia; FormatoDigital no otorga certificación ni está avalado por ISO u organismos certificadores.</li>
              <li>Los clientes, personas y datos de la demo son ficticios. SOTEC aparece con su autorización.</li>
              <li>Fotografías: Pexels (licencia libre).</li>
            </ul>
            <p className="mt-4">© {new Date().getFullYear()} FormatoDigital · Prototipo de demostración para SOTEC</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
