"use client";

/* eslint-disable @next/next/no-img-element */
/**
 * Fotografías de la landing (src/app/page.tsx): el marco reutilizable `Foto`,
 * el mosaico de servicios en campo y la banda de firma digital. Las imágenes
 * van con <img> + `asset()` (prefijo NEXT_PUBLIC_BASE_PATH), sin next/image.
 */
import { Cable, Camera, HardHat, PenLine, ShieldCheck, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Icono, Reveal } from "@/components/fx/Reveal";
import { asset } from "@/nucleo/rutas";
import { cn } from "@/lib/utils";

/** Fotografía de la landing: marco redondeado, sombra suave y zoom lento al pasar el mouse. */
export function Foto({
  src,
  alt,
  ancho,
  alto,
  className,
  imgClassName,
  prioridad = false,
  children,
}: {
  src: string;
  alt: string;
  ancho: number;
  alto: number;
  className?: string;
  imgClassName?: string;
  prioridad?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <figure className={cn("group relative overflow-hidden rounded-2xl bg-sotec shadow-lg ring-1 ring-black/5", className)}>
      <img
        src={asset(src)}
        alt={alt}
        width={ancho}
        height={alto}
        loading={prioridad ? "eager" : "lazy"}
        decoding="async"
        className={cn(
          "h-full w-full max-w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
          imgClassName,
        )}
      />
      {children}
    </figure>
  );
}

/** Tarjetas del mosaico; `clase` fija su lugar en la rejilla (sin huecos en sm y lg). */
const SERVICIOS: { src: string; alt: string; ancho: number; alto: number; icon: LucideIcon; t: string; d: string; clase: string }[] = [
  {
    src: "/landing/sala-monitoreo-cctv.webp",
    alt: "Operador en una sala de monitoreo revisando varias pantallas de cámaras de seguridad",
    ancho: 1600,
    alto: 1367,
    icon: Camera,
    t: "CCTV y monitoreo",
    d: "Reportes de mantenimiento preventivo y correctivo con evidencia y firma del cliente.",
    clase: "sm:col-span-2 lg:col-span-2 lg:row-span-2 aspect-[4/3] lg:aspect-auto",
  },
  {
    src: "/landing/trabajo-en-altura-escalera.webp",
    alt: "Técnico sobre una escalera trabajando en redes aéreas",
    ancho: 1065,
    alto: 1600,
    icon: HardHat,
    t: "Trabajo en alturas",
    d: "Permiso de trabajo con verificación de EPP antes de subir.",
    clase: "aspect-[4/3] lg:row-span-2 lg:aspect-auto",
  },
  {
    src: "/landing/tecnico-fibra-optica-rack.webp",
    alt: "Técnico conectando cables de fibra óptica en un rack de comunicaciones",
    ancho: 1600,
    alto: 1154,
    icon: Cable,
    t: "Fibra óptica y redes",
    d: "Cada empalme y prueba queda registrado.",
    clase: "aspect-[4/3] lg:aspect-auto",
  },
  {
    src: "/landing/inspeccion-paneles-solares.webp",
    alt: "Técnicos con casco inspeccionando paneles solares y revisando documentos",
    ancho: 1600,
    alto: 1067,
    icon: Sun,
    t: "Energía solar",
    d: "Inspecciones y listas de chequeo en sitio.",
    clase: "aspect-[4/3] sm:col-span-2 sm:aspect-[21/9] lg:col-span-1 lg:aspect-auto",
  },
];

/** Mosaico de servicios en campo de SOTEC: el contexto real donde se usan los formatos. */
export function ServiciosSotec() {
  return (
    <section className="relative overflow-hidden bg-white py-20">
      <div className="container">
        <Reveal className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-sotec-greenDeep">En campo con SOTEC</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Formatos pensados para quien trabaja en sitio</h2>
            <p className="mt-3 text-slate-600">
              Seguridad electrónica, telecomunicaciones y energía: el técnico diligencia, firma y envía desde donde está, sin volver a la oficina.
            </p>
          </div>
          <p className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-500">
            <ShieldCheck className="h-4 w-4 text-sotec-greenDeep" /> Alineado con el SG-SST
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[repeat(2,minmax(0,15rem))]">
          {SERVICIOS.map((s, k) => (
            <Reveal key={s.src} delay={k * 110} className={cn("min-w-0", s.clase)}>
              <Foto src={s.src} alt={s.alt} ancho={s.ancho} alto={s.alto} className="h-full">
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sotec via-sotec/40 to-transparent" />
                <figcaption className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                  <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-sotec-green text-sotec">
                    <Icono icon={s.icon} className="h-4 w-4" />
                  </span>
                  <p className="font-semibold">{s.t}</p>
                  <p className="mt-0.5 text-sm text-white/80">{s.d}</p>
                </figcaption>
              </Foto>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Banda de firma digital: foto de la firma en tablet junto a los beneficios de la aprobación electrónica. */
export function FirmaDigital() {
  const puntos = [
    "Firma del técnico, del coordinador SST y del cliente en el mismo documento",
    "Fecha, hora y responsable de cada firma en el historial",
    "PDF final idéntico al formato oficial, listo para auditoría",
  ];
  return (
    <section className="border-y border-slate-200 bg-white py-20">
      <div className="container grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <Reveal className="order-2 lg:order-1">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-sotec-greenDeep">
            <Icono icon={PenLine} className="h-4 w-4" /> Firmas y aprobaciones
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Firmado en pantalla, aprobado sin perseguir a nadie</h2>
          <p className="mt-3 text-slate-600">
            Cada documento recorre su flujo: quien diligencia firma, el responsable revisa y el cliente aprueba desde su propio portal.
          </p>
          <ul className="mt-6 space-y-3">
            {puntos.map((x, k) => (
              <Reveal key={x} as="li" delay={k * 90} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sotec-greenDeep" /> {x}
              </Reveal>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={150} className="order-1 min-w-0 lg:order-2">
          <div className="relative">
            <div aria-hidden className="absolute -inset-3 -z-10 rounded-[1.75rem] bg-gradient-to-br from-sotec-green/30 to-transparent blur-2xl" />
            <Foto
              src="/landing/firma-digital-tablet.webp"
              alt="Persona firmando con lápiz óptico sobre una tablet"
              ancho={1600}
              alto={1068}
              className="aspect-[3/2]"
            >
              <figcaption className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 shadow-lg">
                <span className="h-2 w-2 rounded-full bg-sotec-green" /> Firma registrada · RT-011-26
              </figcaption>
            </Foto>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
