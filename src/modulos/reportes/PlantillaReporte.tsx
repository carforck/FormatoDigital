"use client";

import { Camera, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { comprimirImagen } from "@/nucleo/imagenes";
import type { DatosReporte, FotoReporte } from "@/nucleo/tipos";

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
/** Campos de texto del formato (todo menos el registro fotográfico). */
type CampoTexto = Exclude<keyof DatosReporte, "fotos">;

export function PlantillaReporte({ datos, codigoDoc, editar, firmar, resaltar }: Props) {
  const fotos = datos.fotos ?? [];
  const campo = (k: CampoTexto, opts: { multiline?: boolean; type?: "text" | "date" | "email" | "tel"; placeholder?: string } = {}) => (
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

  const linea = (etiqueta: string, k: CampoTexto, type?: "text" | "email" | "tel") => (
    <div className="flex min-w-0 items-end gap-1">
      <span className="shrink-0">{etiqueta}:</span>
      <span className={cn("min-w-0 flex-1 border-b border-black leading-tight", type === "email" ? "[overflow-wrap:anywhere]" : "break-words")}>{campo(k, { type })}</span>
    </div>
  );

  return (
    <div className="doc-zona space-y-4">
    <article className="doc-print mx-auto w-full max-w-[816px] bg-white p-6 text-[12px] leading-snug shadow-sm ring-1 ring-slate-200 sm:p-10 doc-ajustado">
      <Encabezado tipo="reporte" codigoDoc={codigoDoc} />

      <div className="mt-6 flex justify-end print:mt-3">
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
        <div className="min-h-[150px] p-2 text-justify print:min-h-[90px]">{campo("descripcion", { multiline: true })}</div>
      </section>

      <section className="mt-5 border border-black print:mt-3">
        <div className="hdr border-b border-black py-0.5">RECOMENDACIÓN(ES)</div>
        <div className="min-h-[100px] p-2 text-justify print:min-h-[60px]">{campo("recomendaciones", { multiline: true })}</div>
      </section>

      <div className="mt-6 w-full sm:w-2/3 print:mt-4">{linea("Nombre técnico", "nombreTecnico")}</div>

      <div className="mt-6 grid grid-cols-2 gap-10 print:mt-3">
        <div className={cn(resaltar === "firmaTecnico" && "rounded ring-2 ring-sotec-green")}>
          <Firma src={datos.firmaTecnico} etiqueta="técnico" onFirmar={firmar ? () => firmar("firmaTecnico") : undefined} />
          <div className="border-t border-black pt-0.5">Firma técnico</div>
        </div>
        <div className={cn(resaltar === "firmaCliente" && "rounded ring-2 ring-sotec-green")}>
          <Firma src={datos.firmaCliente} etiqueta="cliente" onFirmar={firmar ? () => firmar("firmaCliente") : undefined} />
          <div className="border-t border-black pt-0.5">Firma cliente</div>
        </div>
      </div>

      <p className="mt-6 text-center text-[9.5px] font-bold print:mt-3">
        Documento emitido por el Servicio de Calidad de la Compañía. El documento es propiedad de SOTEC. La compañía protegerá
        sus propios derechos en los tribunales civiles y penales de acuerdo con la ley.
      </p>
    </article>
    {(fotos.length > 0 || editar) && <AnexoFotos fotos={fotos} codigoDoc={codigoDoc} editar={editar} resaltar={resaltar === "fotos"} />}
    </div>
  );
}

/** Fotos por hoja del anexo: 3 filas de 2 caben en carta y A4 con encabezado y pie. */
const FOTOS_POR_HOJA = 6;

/**
 * Hoja(s) anexa(s) «Registro fotográfico»: cada grupo de 6 fotos es una hoja propia
 * con su encabezado, así ninguna foto queda partida entre páginas al imprimir.
 */
function AnexoFotos({ fotos, codigoDoc, editar, resaltar }: { fotos: FotoReporte[]; codigoDoc?: string; editar?: Props["editar"]; resaltar: boolean }) {
  const hojas: FotoReporte[][] = [];
  for (let i = 0; i < fotos.length; i += FOTOS_POR_HOJA) hojas.push(fotos.slice(i, i + FOTOS_POR_HOJA));
  if (hojas.length === 0) hojas.push([]);
  return (
    <>
      {hojas.map((grupo, h) => (
        <HojaFotos
          key={h}
          fotos={fotos}
          grupo={grupo}
          desde={h * FOTOS_POR_HOJA}
          hoja={h + 1}
          totalHojas={hojas.length}
          codigoDoc={codigoDoc}
          editar={editar}
          resaltar={resaltar && h === 0}
          ultima={h === hojas.length - 1}
        />
      ))}
    </>
  );
}

function HojaFotos({
  fotos,
  grupo,
  desde,
  hoja,
  totalHojas,
  codigoDoc,
  editar,
  resaltar,
  ultima,
}: {
  fotos: FotoReporte[];
  grupo: FotoReporte[];
  desde: number;
  hoja: number;
  totalHojas: number;
  codigoDoc?: string;
  editar?: Props["editar"];
  resaltar: boolean;
  ultima: boolean;
}) {
  const cambiar = (id: string, patch: Partial<FotoReporte>) => editar?.({ fotos: fotos.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  const subir = async (lista: File[]) => {
    if (!lista.length || !editar) return;
    const nuevas: FotoReporte[] = [];
    for (const f of lista.slice(0, 12)) nuevas.push({ id: `f-${Date.now()}-${nuevas.length}`, src: await comprimirImagen(f), descripcion: "", etiqueta: "" });
    editar({ fotos: [...fotos, ...nuevas] });
  };
  return (
    <article className={cn("doc-print mx-auto w-full max-w-[816px] bg-white p-6 text-[12px] leading-snug shadow-sm ring-1 ring-slate-200 sm:p-10", resaltar && "ring-2 ring-sotec-green")}>
      <Encabezado tipo="reporte" codigoDoc={codigoDoc} />
      <div className="hdr mt-6 border border-black py-0.5 print:mt-3">
        REGISTRO FOTOGRÁFICO · ANEXO{codigoDoc ? ` DEL REPORTE ${codigoDoc}` : ""}
        {totalHojas > 1 ? ` · HOJA ${hoja} DE ${totalHojas}` : ""}
      </div>
      {grupo.length === 0 ? (
        <p className="border-x border-b border-black p-6 text-center text-slate-400 print:hidden">Aún no hay fotos. Agrégalas desde el asistente o con el botón de abajo.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 border-x border-b border-black p-3 sm:grid-cols-2">
          {grupo.map((f, j) => {
            const k = desde + j;
            return (
            <figure key={f.id} className="break-inside-avoid">
              <div className="relative aspect-[4/3] overflow-hidden border border-black bg-slate-100 print:aspect-auto print:h-[222px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.src} alt={f.descripcion || `Foto ${k + 1}`} className="h-full w-full object-cover" />
                {editar && (
                  <button type="button" aria-label={`Quitar foto ${k + 1}`} onClick={() => editar({ fotos: fotos.filter((x) => x.id !== f.id) })} className="print:hidden absolute right-1 top-1 rounded bg-black/60 p-1 text-white hover:bg-black">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <figcaption className="mt-1 flex items-start gap-2">
                <span className="shrink-0 font-bold">Foto {k + 1}</span>
                {editar ? (
                  <span className="print:hidden flex shrink-0 gap-1">
                    {(["antes", "despues"] as const).map((e) => (
                      <button key={e} type="button" onClick={() => cambiar(f.id, { etiqueta: f.etiqueta === e ? "" : e })} className={cn("rounded border px-1 text-[10px] font-semibold", f.etiqueta === e ? "border-black bg-black text-white" : "border-slate-300 text-slate-500")}>
                        {e === "antes" ? "Antes" : "Después"}
                      </button>
                    ))}
                  </span>
                ) : null}
                {f.etiqueta && <span className={cn("shrink-0 font-semibold uppercase", editar && "hidden print:inline")}>· {f.etiqueta === "antes" ? "Antes" : "Después"}</span>}
                <span className="min-w-0 flex-1">
                  <EditableText value={f.descripcion} disabled={!editar} placeholder={editar ? "Descripción de la foto" : " "} ariaLabel={`Descripción foto ${k + 1}`} onCommit={(v) => cambiar(f.id, { descripcion: v })} />
                </span>
              </figcaption>
            </figure>
            );
          })}
        </div>
      )}
      {editar && ultima && (
        <label className="print:hidden mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-sotec-green/60 bg-sotec-soft px-3 py-3 text-sm font-medium text-sotec-greenDeep hover:bg-sotec-green/20">
          <Camera className="h-4 w-4" /> Agregar fotos
          <input type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={(e) => {
              const lista = e.target.files ? Array.from(e.target.files) : [];
              e.target.value = "";
              void subir(lista);
            }} />
        </label>
      )}
      <p className="mt-6 text-center text-[9.5px] font-bold print:mt-3">
        Documento emitido por el Servicio de Calidad de la Compañía. El documento es propiedad de SOTEC.
      </p>
    </article>
  );
}
