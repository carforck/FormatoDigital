"use client";

/**
 * Pie común de los formatos SOTEC: «NIT … · Cel. …» (y el correo y la web donde el formato ya
 * los mostraba) centrado en el ancho de la hoja, con los datos de Configuración (`empresaDe`).
 * En la demo, además, el crédito «© <año> ControlOne by SOTEC» (también, discreto, en las hojas
 * propias de FORTOX, SEVIN y LA CLAY, cuyo pie no cambia). En la empresa, las variantes con
 * hoja propia no llevan nada de esto: conservan su pie.
 *
 * El código del formato (`codigo`) no descentra el texto: en papel y desde 640 px va en posición
 * absoluta a la derecha de la última línea (que deja el mismo margen a ambos lados); en celular
 * va en su propia línea.
 */
import { cn } from "@/lib/utils";
import type { EmpresaPlantilla } from "@/modulos/contrato";
import { creditoDemo, partesContacto } from "@/nucleo/contacto";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import type { TipoDoc } from "@/nucleo/tipos";
import { VARIANTE_BASE } from "@/nucleo/variantes";

import { useVariante } from "./VarianteFormato";

interface Props {
  tipo: TipoDoc;
  /** Datos de la organización (Configuración): `nit` (con o sin «NIT»), `telefonos`. */
  empresa?: Partial<EmpresaPlantilla>;
  /** Lo que el formato ya mostraba además del NIT y el celular (correo, web). */
  extras?: (string | undefined)[];
  /** Código del formato, a la derecha sin empujar el texto. */
  codigo?: string;
  className?: string;
}

export function PieContacto({ tipo, empresa, extras, codigo, className }: Props) {
  const { modo } = useDemo();
  const v = useVariante(tipo);
  const base = v.clave === VARIANTE_BASE;
  const demo = modo !== "empresa";
  const partes = base ? partesContacto({ nit: empresa?.nit, telefono: empresa?.telefonos, extras }) : [];
  const conCodigo = base && !!codigo;
  if (!partes.length && !demo && !conCodigo) return null;

  // El código comparte la última línea: esa línea deja el mismo margen a ambos lados
  const ultima = demo ? "credito" : "contacto";
  const margen = conCodigo && "sm:px-[8.5rem] print:px-[8.5rem]";
  return (
    <div data-pie-contacto={v.clave} className={cn("relative mt-2 text-center leading-tight print:mt-1", className)}>
      {partes.length > 0 && (
        <p data-pie-linea className={cn(ultima === "contacto" && margen)}>
          <span>{partes.join(" · ")}</span>
        </p>
      )}
      {demo && (
        <p data-pie-credito className={cn("text-[8px] tracking-wide text-slate-400", partes.length > 0 && "mt-0.5", ultima === "credito" && margen)}>
          <span>{creditoDemo()}</span>
        </p>
      )}
      {conCodigo && (
        <p data-pie-codigo className="mt-0.5 text-right text-slate-500 sm:absolute sm:bottom-0 sm:right-0 sm:mt-0 print:absolute print:bottom-0 print:right-0 print:mt-0">
          {codigo}
        </p>
      )}
    </div>
  );
}
