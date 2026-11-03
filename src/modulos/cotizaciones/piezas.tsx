/**
 * Piezas del diseño de la cotización (réplica de Odoo de SOTEC) que comparten otros
 * formatos con el mismo estilo (requerimiento): colores, franja del encabezado y pie.
 */

import { LogoFormato } from "@/components/docs/Encabezado";
import { cn } from "@/lib/utils";

import type { EmpresaCotizacion } from "./catalogo";

// Colores de la cotización de Odoo enviada por SOTEC
export const VERDE = "#3BA10E";
export const VERDE_ETIQUETA = "#688C5A";
export const FRANJA = "#EFF7EC";
export const GRIS_FILA = "#F4F5F7";

/**
 * Franja verde del encabezado (logo, dirección, lema y título con el recorte blanco):
 * va de borde a borde, también al imprimir. `compacto` la achica en papel (muchos ítems).
 */
export function FranjaEncabezado({ empresa, titulo, compacto = false }: { empresa: EmpresaCotizacion; titulo: string; compacto?: boolean }) {
  return (
    <header className="relative -mx-5 sm:-mx-10 print:-mx-[1cm] print:-mt-[0.8cm]" style={{ background: FRANJA }}>
      <div className={cn("flex items-start justify-between gap-3 px-5 pt-5 sm:px-10 sm:pt-7", compacto && "print:pt-4")}>
        <LogoFormato className={cn("h-16 w-auto object-contain sm:h-[88px]", compacto && "print:h-14")} anchoDemo="max-w-[200px] sm:max-w-[240px]" />
        <div className="text-right text-[11px] leading-[1.6] sm:text-[12.5px]">
          <p>{empresa.nombre}</p>
          {empresa.direccion.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      </div>
      <div className="relative flex flex-wrap items-end justify-between gap-x-3 px-5 pb-2 pt-2 sm:px-10 sm:pb-3">
        <p className="relative z-10 text-[11px] sm:text-[13px]" style={{ color: VERDE }}>
          {empresa.lema}
        </p>
        {/* Recorte blanco con chaflán, detrás del título (como en Odoo) */}
        <span aria-hidden="true" className="absolute bottom-0 right-0 h-[62%] w-[48%] bg-white" style={{ clipPath: "polygon(11% 0, 100% 0, 100% 100%, 0 100%)" }} />
        <h1 className="relative z-10 ml-auto whitespace-nowrap text-[20px] font-normal leading-none sm:text-[26px]" style={{ color: VERDE }}>
          {titulo}
        </h1>
      </div>
    </header>
  );
}

/**
 * Pie de página: en pantalla al final de la hoja; al imprimir se repite en cada hoja
 * (posición fija: Chrome y Safari la dibujan en todas las páginas; el margen inferior
 * de la hoja deja su espacio, ver .doc-pie-fijo en globals.css).
 */
export function PieFormato({ empresa, codigo }: { empresa: EmpresaCotizacion; codigo: string }) {
  return (
    <>
      <div aria-hidden="true" className="min-h-8 flex-1 print:hidden" />
      <footer className="pie-cotizacion flex items-end gap-3 border-t border-slate-400 pt-2 text-[9.5px] text-slate-700 sm:text-[10.5px]">
        <p className="flex-1 text-center">
          {empresa.telefonos} · {empresa.correo} · {empresa.web} · {empresa.nit}
        </p>
        <p className="shrink-0 text-slate-500">{codigo}</p>
      </footer>
    </>
  );
}
