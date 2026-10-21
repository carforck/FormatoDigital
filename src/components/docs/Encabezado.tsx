/* eslint-disable @next/next/no-img-element */
import { asset } from "@/nucleo/rutas";
import { FORMATOS } from "@/nucleo/catalogos";
import type { TipoDoc } from "@/nucleo/tipos";

/** Encabezado del formato: logo, título y control documental (código, versión, fecha). */
export function Encabezado({ tipo, codigoDoc }: { tipo: TipoDoc; codigoDoc?: string }) {
  const f = FORMATOS[tipo];
  return (
    <table className="w-full border-collapse border border-black text-[11px]">
      <tbody>
        <tr>
          <td rowSpan={3} className="w-[30%] border border-black p-2">
            <img src={asset("/sotec-logo-v3.png")} alt="SOTEC" className="mx-auto h-14 w-auto object-contain" />
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

/** Imagen de firma o línea vacía; si `onFirmar` existe, invita a firmar. */
export function Firma({ src, onFirmar, etiqueta }: { src?: string; onFirmar?: () => void; etiqueta: string }) {
  if (src) {
    return (
      <button type="button" disabled={!onFirmar} onClick={onFirmar} className="block h-12 w-full" title={onFirmar ? "Volver a firmar" : etiqueta}>
        <img src={src} alt={`Firma: ${etiqueta}`} className="mx-auto h-12 w-auto object-contain" />
      </button>
    );
  }
  if (onFirmar) {
    return (
      <button
        type="button"
        onClick={onFirmar}
        className="print:hidden mx-auto block h-12 w-full rounded border border-dashed border-sotec-greenDeep/60 bg-sotec-soft text-[11px] font-medium text-sotec-greenDeep hover:bg-sotec-green/30"
      >
        ✍ Firmar aquí
      </button>
    );
  }
  return <div className="h-12" />;
}
