/* eslint-disable @next/next/no-img-element */
/**
 * Piezas comunes de las plantillas imprimibles de formato (reporte, permiso,
 * gasto, cotización en `src/modulos/<tipo>/Plantilla….tsx`): encabezado con control
 * documental y casilla de firma. Usa `<img>` simple para que salga en el PDF/impresión.
 */
import { cn } from "@/lib/utils";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { asset } from "@/nucleo/rutas";
import { formatoDe } from "@/modulos/registro";
import type { TipoDoc } from "@/nucleo/tipos";

/**
 * Logo de los formatos impresos. En el modo empresa va el logo de la organización
 * (SOTEC); en la demo va la marca ControlOne con «by SOTEC» debajo en pequeño
 * (public/controlone-logo.png, generado por scripts/generar-logo-formato.py).
 * `className` da el tamaño del logo de la empresa; `anchoDemo`, el ancho máximo de la marca.
 */
export function LogoFormato({ className, anchoDemo = "max-w-[190px]", alt = "SOTEC" }: { className?: string; anchoDemo?: string; alt?: string }) {
  const { modo } = useDemo();
  if (modo === "empresa") return <img src={asset("/sotec-logo-v3.png")} alt={alt} className={className} />;
  return (
    <span className="inline-flex flex-col items-center">
      <img src={asset("/controlone-logo.png")} alt="ControlOne" className={cn("h-auto w-full object-contain", anchoDemo)} />
      <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-slate-500">by SOTEC</span>
    </span>
  );
}

/** Encabezado del formato: logo, título y control documental (código, versión, fecha). */
export function Encabezado({ tipo, codigoDoc }: { tipo: TipoDoc; codigoDoc?: string }) {
  // Se lee al dibujar (no al cargar el módulo): el registro importa las plantillas
  const f = formatoDe(tipo);
  return (
    <table className="w-full border-collapse border border-black text-[11px]">
      <tbody>
        <tr>
          <td rowSpan={3} className="w-[30%] border border-black p-2 text-center">
            <LogoFormato className="mx-auto h-14 w-auto object-contain" />
          </td>
          <td rowSpan={3} className="border border-black p-2 text-center font-serif text-[13px] font-bold uppercase">
            {f.nombre}
            {codigoDoc && <div className="mt-1 font-sans text-[10px] font-normal normal-case text-slate-600">No. {codigoDoc}</div>}
          </td>
          <td className="w-[26%] border border-black px-2 py-0.5 font-serif font-bold">Código {f.codigo}</td>
        </tr>
        <tr>
          <td className="border border-black px-2 py-0.5 font-serif">Versión: {f.version}</td>
        </tr>
        <tr>
          <td className="border border-black px-2 py-0.5 font-serif">Fecha {f.fecha}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** Imagen de firma o línea vacía; si `onFirmar` existe, invita a firmar (`texto`: la invitación, p. ej. «Toca para que firme el cliente»). */
export function Firma({ src, onFirmar, etiqueta, texto = "✍ Firmar aquí" }: { src?: string; onFirmar?: () => void; etiqueta: string; texto?: string }) {
  if (src) {
    const imagen = <img src={src} alt={`Firma: ${etiqueta}`} className="mx-auto h-12 w-auto object-contain" />;
    // Solo es botón cuando se puede volver a firmar; si no, es una imagen sin interacción
    if (!onFirmar) return <div className="block h-12 w-full">{imagen}</div>;
    return (
      <button type="button" onClick={onFirmar} className="block h-12 w-full" title="Volver a firmar" aria-label={`Volver a firmar: ${etiqueta}`}>
        {imagen}
      </button>
    );
  }
  if (onFirmar) {
    return (
      <button
        type="button"
        onClick={onFirmar}
        aria-label={`Firmar aquí: ${etiqueta}`}
        className="print:hidden mx-auto block h-12 w-full touch-manipulation rounded border border-dashed border-sotec-greenDeep/60 bg-sotec-soft px-1 text-[11px] font-medium leading-tight text-sotec-greenDeep hover:bg-sotec-green/30"
      >
        {texto}
      </button>
    );
  }
  return <div className="h-12" aria-hidden="true" />;
}
