"use client";

/**
 * Plantilla del FO-GSST-22 · Reporte técnico: réplica en carta del formato con
 * edición en línea, firmas del técnico y del cliente (su «recibido a satisfacción»,
 * con quién firma y su cargo), equipos atendidos y el registro fotográfico como
 * hoja(s) anexa(s) con el mismo encabezado; las fotos se toman con la cámara o se
 * eligen de la galería (`ElegirImagen`). Sale con la variante de formato de quien lo
 * muestra (`ConVariante`: logo, control documental, colores, pie y etiquetas). Una variante
 * con hoja propia (FORTOX) sale en su formato (`HojaFortox`), con los mismos datos.
 */

import { Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { comprimirVarias } from "@/nucleo/imagenes";
import type { DatosReporte, FotoReporte } from "@/nucleo/tipos";

import { EditableText } from "@/components/docs/EditableText";
import { ElegirImagen, avisoSobrantes, mensajeImagenIlegible } from "@/components/docs/ElegirImagen";
import { Encabezado, Firma } from "@/components/docs/Encabezado";
import { PieFormato, useEtiquetas, useVariante } from "@/components/docs/VarianteFormato";
import { EncabezadoFortox, HojaFortox, PieFortox } from "@/modulos/reportes/HojaFortox";
import { EquiposEnFormato } from "@/modulos/equipos/EquiposEnFormato";
import type { EquipoAtendido } from "@/modulos/equipos/tipos";

interface Props {
  datos: DatosReporte;
  codigoDoc?: string;
  /** Si existe, los campos se editan en línea. */
  editar?: (patch: Partial<DatosReporte> | ((d: DatosReporte) => Partial<DatosReporte>)) => void;
  /** Abre el pad de firma para el campo indicado. */
  firmar?: (campo: "firmaTecnico" | "firmaCliente") => void;
  /** Campo que el asistente está preguntando; se resalta en la vista previa. */
  resaltar?: string;
  /** Equipos atendidos (módulo Equipos), resueltos por quien muestra el formato. */
  equipos?: EquipoAtendido[];
}

/** Campos de texto del formato (todo menos el registro fotográfico). */
type CampoTexto = Exclude<keyof DatosReporte, "fotos">;

/** Réplica del FO-GSST-22 · Formato de reporte técnico (carta). El anexo de fotos solo sale si hay fotos o se está editando. */
export function PlantillaReporte({ datos, codigoDoc, editar, firmar, resaltar, equipos = [] }: Props) {
  const fotos = datos.fotos ?? [];
  // Etiquetas de los campos según la variante de formato (FORTOX puede nombrarlos distinto)
  const et = useEtiquetas("reporte");
  const fortox = useVariante("reporte").hoja === "fortox";
  const campo = (k: CampoTexto, opts: { multiline?: boolean; type?: "text" | "date" | "time" | "email" | "tel"; placeholder?: string } = {}) => (
    <span className={cn("rounded transition-colors", resaltar === k && "bg-sotec-green/40 ring-2 ring-sotec-green")}>
      <EditableText
        value={datos[k] ?? ""}
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
      <span className="shrink-0">{et(etiqueta)}:</span>
      <span className={cn("min-w-0 flex-1 border-b border-black leading-tight", type === "email" ? "[overflow-wrap:anywhere]" : "break-words")}>{campo(k, { type })}</span>
    </div>
  );

  const anexo = (fotos.length > 0 || editar) && <AnexoFotos fotos={fotos} codigoDoc={codigoDoc} editar={editar} resaltar={resaltar === "fotos"} fortox={fortox} />;

  if (fortox) {
    return (
      <div className="doc-zona space-y-4">
        <HojaFortox datos={datos} codigoDoc={codigoDoc} campo={campo} editar={editar} firmar={firmar} resaltar={resaltar} equipos={equipos} />
        {anexo}
      </div>
    );
  }

  return (
    <div className="doc-zona space-y-4">
    <article className="doc-print mx-auto w-full max-w-[816px] bg-white p-6 text-[12px] leading-snug shadow-sm ring-1 ring-slate-200 sm:p-10 doc-ajustado">
      <Encabezado tipo="reporte" codigoDoc={codigoDoc} />

      <div className="mt-6 flex justify-end print:mt-3">
        <table className="w-[56%] border-collapse border border-black">
          <tbody>
            <tr>
              <td className="hdr w-1/2 border border-black py-1">{et("FECHA:")}</td>
              <td className="border border-black px-2">{campo("fecha", { type: "date" })}</td>
            </tr>
            <tr>
              <td className="hdr border border-black py-1">{et("HORA DE LLEGADA:")}</td>
              <td className="border border-black px-2">{campo("horaLlegada", { type: "time" })}</td>
            </tr>
            <tr>
              <td className="hdr border border-black py-1">{et("HORA DE SALIDA:")}</td>
              <td className="border border-black px-2">{campo("horaSalida", { type: "time" })}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <section className="mt-2 border border-black">
        <div className="hdr border-b border-black py-0.5">{et("DATOS GENERALES")}</div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 p-3 sm:grid-cols-2 print:grid-cols-2">
          {linea("Tipo reporte", "tipoReporte")}
          {linea("Correo", "correo", "email")}
          {linea("Cliente", "cliente")}
          {linea("Teléfono", "telefono", "tel")}
          {linea("Dirección", "direccion")}
          {linea("Cargo", "cargo")}
          {linea("Persona contactada", "personaContactada")}
          {datos.proyecto && linea("Proyecto", "proyecto")}
        </div>
        <div className="space-y-1.5 px-3 pb-3">
          {linea("Asunto", "asunto")}
          {(equipos.length > 0 || resaltar === "equipos") && (
            <div className={cn("rounded", resaltar === "equipos" && "bg-sotec-green/40 ring-2 ring-sotec-green print:bg-transparent print:ring-0")}>
              {equipos.length > 0 ? <EquiposEnFormato equipos={equipos} /> : <span className="print:hidden text-slate-400">Equipos atendidos: ninguno marcado</span>}
            </div>
          )}
        </div>
      </section>

      <section className="border-x border-b border-black">
        <div className="hdr border-b border-black py-0.5">{et("DESCRIPCIÓN")}</div>
        <div className="min-h-[150px] p-2 text-justify print:min-h-[90px]">{campo("descripcion", { multiline: true })}</div>
      </section>

      <section className="mt-5 border border-black print:mt-3">
        <div className="hdr border-b border-black py-0.5">{et("RECOMENDACIÓN(ES)")}</div>
        <div className="min-h-[100px] p-2 text-justify print:min-h-[60px]">{campo("recomendaciones", { multiline: true })}</div>
      </section>

      <div className="mt-6 w-full sm:w-2/3 print:mt-4">{linea("Nombre técnico", "nombreTecnico")}</div>

      <div className="mt-6 grid grid-cols-2 gap-10 print:mt-3">
        <div className={cn(resaltar === "firmaTecnico" && "rounded ring-2 ring-sotec-green")}>
          <Firma src={datos.firmaTecnico} etiqueta="técnico" onFirmar={firmar ? () => firmar("firmaTecnico") : undefined} />
          <div className="border-t border-black pt-0.5">Firma técnico</div>
        </div>
        <div className={cn(resaltar === "firmaCliente" && "rounded ring-2 ring-sotec-green")}>
          <Firma src={datos.firmaCliente} etiqueta="cliente" texto="✍ Toca para que firme el cliente" onFirmar={firmar ? () => firmar("firmaCliente") : undefined} />
          <div className="border-t border-black pt-0.5">Firma cliente · recibido a satisfacción</div>
          {/* Al diligenciar: quién recibe se corrige con un toque (la firma tomada aquí lo prellena con el contacto) */}
          {editar && datos.firmaCliente ? (
            <div className="text-[10.5px] leading-tight">
              {campo("nombreRecibe", { placeholder: "Nombre de quien recibe" })} · {campo("cargoRecibe", { placeholder: "Cargo" })}
            </div>
          ) : (datos.nombreRecibe || datos.cargoRecibe) && (
            <div className="text-[10.5px] leading-tight">
              {datos.nombreRecibe}
              {datos.cargoRecibe ? ` · ${datos.cargoRecibe}` : ""}
            </div>
          )}
        </div>
      </div>

      <PieFormato tipo="reporte" className="mt-6 text-center text-[9.5px] font-bold print:mt-3">
        Documento emitido por el Servicio de Calidad de la Compañía. El documento es propiedad de SOTEC. La compañía protegerá
        sus propios derechos en los tribunales civiles y penales de acuerdo con la ley.
      </PieFormato>
    </article>
    {anexo}
    </div>
  );
}

/** Fotos por hoja del anexo: 3 filas de 2 caben en carta y A4 con encabezado y pie. */
const FOTOS_POR_HOJA = 6;

/**
 * Hoja(s) anexa(s) «Registro fotográfico»: cada grupo de 6 fotos es una hoja propia
 * con su encabezado, así ninguna foto queda partida entre páginas al imprimir.
 */
function AnexoFotos({ fotos, codigoDoc, editar, resaltar, fortox }: { fotos: FotoReporte[]; codigoDoc?: string; editar?: Props["editar"]; resaltar: boolean; fortox: boolean }) {
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
          fortox={fortox}
        />
      ))}
    </>
  );
}

/** Una hoja del anexo; solo la última ofrece «Agregar fotos» (máx. 12 por carga, comprimidas). */
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
  fortox,
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
  fortox: boolean;
}) {
  const cambiar = (id: string, patch: Partial<FotoReporte>) => editar?.({ fotos: fotos.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  /** Agrega hasta 12 fotos comprimidas; devuelve el aviso si alguna no se pudo leer (HEIC fuera de Safari). */
  const subir = async (lista: File[]): Promise<string | void> => {
    if (!lista.length || !editar) return;
    const { imagenes, fallidas, sobrantes } = await comprimirVarias(lista);
    const t = Date.now();
    // Sobre las fotos más recientes: mientras se comprimía pudo cambiar una descripción u otra foto
    if (imagenes.length) editar((d) => ({ fotos: [...(d.fotos ?? []), ...imagenes.map((src, k): FotoReporte => ({ id: `f-${t}-${k}`, src, descripcion: "", etiqueta: "" }))] }));
    return [fallidas ? mensajeImagenIlegible(fallidas) : "", avisoSobrantes(sobrantes)].filter(Boolean).join(" ") || undefined;
  };
  return (
    <article className={cn("doc-print mx-auto w-full max-w-[816px] bg-white p-6 text-[12px] leading-snug shadow-sm ring-1 ring-slate-200 sm:p-10", resaltar && "ring-2 ring-sotec-green")}>
      {fortox ? <EncabezadoFortox codigoDoc={codigoDoc} /> : <Encabezado tipo="reporte" codigoDoc={codigoDoc} />}
      <div className="hdr mt-6 border border-black py-0.5 print:mt-3">
        REGISTRO FOTOGRÁFICO · ANEXO{codigoDoc ? ` DEL REPORTE ${codigoDoc}` : ""}
        {totalHojas > 1 ? ` · HOJA ${hoja} DE ${totalHojas}` : ""}
      </div>
      {grupo.length === 0 ? (
        <p className="border-x border-b border-black p-6 text-center text-slate-400 print:hidden">Aún no hay fotos. Agrégalas desde el asistente o con el botón de abajo.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 border-x border-b border-black p-3 sm:grid-cols-2 print:grid-cols-2">
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
      {editar && ultima && <ElegirImagen multiple className="mt-3" que="fotos del registro fotográfico" textoCamara="Tomar foto" textoGaleria="Galería / archivos" onElegir={subir} />}
      {fortox ? (
        <PieFortox />
      ) : (
        <PieFormato tipo="reporte" anexo className="mt-6 text-center text-[9.5px] font-bold print:mt-3">
          Documento emitido por el Servicio de Calidad de la Compañía. El documento es propiedad de SOTEC.
        </PieFormato>
      )}
    </article>
  );
}
