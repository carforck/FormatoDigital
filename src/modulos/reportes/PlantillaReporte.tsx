"use client";

import { cn } from "@/lib/utils";
import type { DatosReporte } from "@/nucleo/tipos";

import { EditableText } from "@/components/docs/EditableText";
import { Encabezado, Firma } from "@/components/docs/Encabezado";

interface Props {
  datos: DatosReporte;
  codigoDoc?: string;
  /** Si existe, los campos se editan en línea. */
  editar?: (patch: Partial<DatosReporte>) => void;
  /** Abre el pad de firma para el campo indicado. */
  firmar?: (campo: "firmaTecnico" | "firmaCliente") => void;
  /** Campo que el asistente está preguntando; se resalta en la vista previa. */
  resaltar?: string;
}

/** Réplica del FO-GSST-22 · Formato de reporte técnico (carta). */
export function PlantillaReporte({ datos, codigoDoc, editar, firmar, resaltar }: Props) {
  const campo = (k: keyof DatosReporte, opts: { multiline?: boolean; type?: "text" | "date" | "email" | "tel"; placeholder?: string } = {}) => (
    <span className={cn("rounded transition-colors", resaltar === k && "bg-sotec-green/40 ring-2 ring-sotec-green")}>
      <EditableText
        value={datos[k]}
        disabled={!editar}
        multiline={opts.multiline}
        type={opts.type}
        placeholder={opts.placeholder ?? " "}
        ariaLabel={k}
        onCommit={(v) => editar?.({ [k]: v } as Partial<DatosReporte>)}
        className={opts.multiline ? "block min-h-[1.2em] w-full whitespace-pre-line" : undefined}
      />
    </span>
  );

  const linea = (etiqueta: string, k: keyof DatosReporte, type?: "text" | "email" | "tel") => (
    <div className="flex items-end gap-1">
      <span className="shrink-0">{etiqueta}:</span>
      <span className="min-w-0 flex-1 border-b border-black leading-tight">{campo(k, { type })}</span>
    </div>
  );

  return (
    <article className="doc-print mx-auto w-full max-w-[816px] bg-white p-6 text-[12px] leading-snug shadow-sm ring-1 ring-slate-200 sm:p-10">
      <Encabezado tipo="reporte" codigoDoc={codigoDoc} />

      <div className="mt-6 flex justify-end">
        <table className="w-[56%] border-collapse border border-black">
          <tbody>
            <tr>
              <td className="hdr w-1/2 border border-black py-1">FECHA:</td>
              <td className="border border-black px-2">{campo("fecha", { type: "date" })}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <section className="mt-2 border border-black">
        <div className="hdr border-b border-black py-0.5">DATOS GENERALES</div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 p-3 sm:grid-cols-2">
          {linea("Tipo reporte", "tipoReporte")}
          {linea("Correo", "correo", "email")}
          {linea("Cliente", "cliente")}
          {linea("Teléfono", "telefono", "tel")}
          {linea("Dirección", "direccion")}
          {linea("Cargo", "cargo")}
          {linea("Persona contactada", "personaContactada")}
        </div>
        <div className="px-3 pb-3">{linea("Asunto", "asunto")}</div>
      </section>

      <section className="border-x border-b border-black">
        <div className="hdr border-b border-black py-0.5">DESCRIPCIÓN</div>
        <div className="min-h-[150px] p-2 text-justify">{campo("descripcion", { multiline: true })}</div>
      </section>

      <section className="mt-5 border border-black">
        <div className="hdr border-b border-black py-0.5">RECOMENDACIÓN(ES)</div>
        <div className="min-h-[100px] p-2 text-justify">{campo("recomendaciones", { multiline: true })}</div>
      </section>

      <div className="mt-6 w-full sm:w-2/3">{linea("Nombre técnico", "nombreTecnico")}</div>

      <div className="mt-6 grid grid-cols-2 gap-10">
        <div className={cn(resaltar === "firmaTecnico" && "rounded ring-2 ring-sotec-green")}>
          <Firma src={datos.firmaTecnico} etiqueta="técnico" onFirmar={firmar ? () => firmar("firmaTecnico") : undefined} />
          <div className="border-t border-black pt-0.5">Firma técnico</div>
        </div>
        <div className={cn(resaltar === "firmaCliente" && "rounded ring-2 ring-sotec-green")}>
          <Firma src={datos.firmaCliente} etiqueta="cliente" onFirmar={firmar ? () => firmar("firmaCliente") : undefined} />
          <div className="border-t border-black pt-0.5">Firma cliente</div>
        </div>
      </div>

      <p className="mt-6 text-center text-[9.5px] font-bold">
        Documento emitido por el Servicio de Calidad de la Compañía. El documento es propiedad de SOTEC. La compañía protegerá
        sus propios derechos en los tribunales civiles y penales de acuerdo con la ley.
      </p>
    </article>
  );
}
