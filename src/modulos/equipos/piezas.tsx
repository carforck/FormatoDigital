/**
 * Piezas visuales del módulo Equipos: íconos por tipo y por sistema y la
 * insignia de estado.
 */

import {
  BatteryCharging,
  Cable,
  Cctv,
  CircleAlert,
  CircleCheck,
  CircleX,
  Archive,
  Cpu,
  DoorClosed,
  Fingerprint,
  Flame,
  HardDrive,
  Keyboard,
  Laptop,
  Monitor,
  Network,
  Printer,
  Radar,
  Router,
  Server,
  Siren,
  Video,
  Wifi,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { COLOR_ESTADO_EQUIPO, ETIQUETA_ESTADO_EQUIPO } from "./catalogo";
import type { EstadoEquipo } from "./tipos";

type Icono = typeof Cctv;

// Ícono de cada sistema del catálogo (al agregar un sistema, agregar aquí su ícono)
const POR_SISTEMA: Record<string, Icono> = { cctv: Cctv, alarmas: Siren, acceso: Fingerprint, incendio: Flame, computo: Monitor, cerca: Zap };

// El primero que coincide con el tipo gana; si ninguno, el ícono del sistema
const POR_TIPO: [RegExp, Icono][] = [
  [/\b(nvr|dvr|disco)/i, HardDrive],
  [/ptz/i, Video],
  [/c[aá]mara/i, Cctv],
  [/servidor/i, Server],
  [/port[aá]til/i, Laptop],
  [/\bpc\b|computador|monitor/i, Monitor],
  [/router/i, Router],
  [/access point|\bap\b|wifi/i, Wifi],
  [/switch/i, Network],
  [/impresora/i, Printer],
  [/ups|bater[ií]a|fuente/i, BatteryCharging],
  [/sensor|detector|contacto/i, Radar],
  [/teclado|panel|controladora|m[oó]dulo/i, Keyboard],
  [/cerradura|torniquete|bot[oó]n de salida/i, DoorClosed],
  [/lectora|biom/i, Fingerprint],
  [/sirena|estrobo|p[aá]nico/i, Siren],
  [/energizador|cerca|tierra/i, Zap],
  [/cable|fibra/i, Cable],
];

/** Ícono por tipo de equipo (NVR, cámara, sensor, panel…) con el del sistema como respaldo. */
export function IconoEquipo({ tipo, sistema, className = "h-5 w-5" }: { tipo: string; sistema: string; className?: string }) {
  const I = POR_TIPO.find(([re]) => re.test(tipo))?.[1] ?? POR_SISTEMA[sistema] ?? Cpu;
  return <I className={className} aria-hidden />;
}

/** Ícono del sistema (Cpu si la clave no está en el catálogo). */
export function IconoSistema({ sistema, className = "h-4 w-4" }: { sistema: string; className?: string }) {
  const I = POR_SISTEMA[sistema] ?? Cpu;
  return <I className={className} aria-hidden />;
}

const ICONO_ESTADO: Record<EstadoEquipo, Icono> = { operativo: CircleCheck, con_falla: CircleAlert, fuera_servicio: CircleX, retirado: Archive };

/** Estado del equipo con texto e ícono (no solo color). */
export function EstadoEquipoBadge({ estado, className }: { estado: EstadoEquipo; className?: string }) {
  const I = ICONO_ESTADO[estado] ?? CircleCheck;
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", COLOR_ESTADO_EQUIPO[estado], className)}>
      <I className="h-3 w-3" aria-hidden />
      {ETIQUETA_ESTADO_EQUIPO[estado] ?? estado}
    </span>
  );
}
