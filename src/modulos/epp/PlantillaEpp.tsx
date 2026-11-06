"use client";

/**
 * Plantilla de la Entrega de EPP · Registro de entrega de elementos de protección personal:
 * una hoja carta con el encabezado común de SOTEC (`Encabezado`), datos del trabajador,
 * tabla de elementos editable (elemento con «＋ Agregar otro», lista «epp.elementos» que
 * comparte con el asistente), compromiso del trabajador, observaciones y las firmas de
 * quien recibe y de quien entrega. Con la variante de formato «laclay» (cliente u obra de
 * Ladrillera La Clay) sale en su «Matriz Entrega de EPP's» (`HojaLaClay`), con los mismos datos.
 */

import { Plus, Trash2 } from "lucide-react";

import { EditableText } from "@/components/docs/EditableText";
import { Encabezado, Firma } from "@/components/docs/Encabezado";
import { PieContacto } from "@/components/docs/PieContacto";
import { useVariante } from "@/components/docs/VarianteFormato";
import type { EmpresaPlantilla } from "@/modulos/contrato";
import { SelectConOtro } from "@/components/ui/SelectConOtro";
import { cn } from "@/lib/utils";

import { FotoEntrega } from "./FotoEntrega";
import { COMPROMISO_EPP, EPP_CATALOGO, MOTIVOS_EPP, itemEpp } from "./catalogo";
import { HojaLaClay } from "./HojaLaClay";
import { totalUnidades, type DatosEpp, type ItemEpp } from "./tipos";

/** Campos que se firman en el pad. */
export type CampoFirmaEpp = "firmaRecibe" | "firmaEntrega";

interface Props {
  datos: DatosEpp;
  codigoDoc?: string;
  editar?: (patch: Partial<DatosEpp> | ((d: DatosEpp) => Partial<DatosEpp>)) => void;
  firmar?: (campo: CampoFirmaEpp) => void;
  resaltar?: string;
  /** Datos de la organización para el pie (NIT, celular): `empresaDe(config)`. */
  empresa?: Partial<EmpresaPlantilla>;
}

type CampoTexto = Exclude<keyof DatosEpp, "items" | "fotoRecibe">;

/** Filas mínimas de la tabla impresa (como un formato en papel). */
const FILAS_MINIMAS = 8;

/** Réplica del registro de entrega de EPP (carta). */
export function PlantillaEpp({ datos, codigoDoc, editar, firmar, resaltar, empresa }: Props) {
  const hoja = useVariante("epp").hoja;
  if (hoja === "laclay")
    return (
      <div className="doc-zona space-y-4">
        <HojaLaClay datos={datos} codigoDoc={codigoDoc} editar={editar} firmar={firmar} resaltar={resaltar} />
      </div>
    );
  const marca = (k: string) => resaltar === k && "rounded bg-sotec-green/40 ring-2 ring-sotec-green";
  const campo = (k: CampoTexto, opts: { multiline?: boolean; type?: "text" | "date"; placeholder?: string } = {}) => (
    <span className={cn("rounded transition-colors", marca(k))}>
      <EditableText
        value={String(datos[k] ?? "")}
        disabled={!editar}
        multiline={opts.multiline}
        type={opts.type}
        placeholder={opts.placeholder ?? " "}
        ariaLabel={k}
        onCommit={(v) => editar?.({ [k]: v } as Partial<DatosEpp>)}
        className={opts.multiline ? "block min-h-[1.2em] w-full whitespace-pre-line" : undefined}
      />
    </span>
  );
  const item = (id: string, patch: Partial<ItemEpp>) => editar?.((d) => ({ items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const vacias = Math.max(0, FILAS_MINIMAS - datos.items.length);
  const celda = "border border-black px-1.5 py-1";
  const etiqueta = "hdr w-[17%] border border-black px-1.5 py-1 text-left";

  return (
    <div className="doc-zona space-y-4">
      <article className="doc-print mx-auto w-full max-w-[816px] bg-white p-6 text-[12px] leading-snug shadow-sm ring-1 ring-slate-200 sm:p-10 doc-ajustado">
        <Encabezado tipo="epp" codigoDoc={codigoDoc} />

        <table className="mt-5 w-full border-collapse print:mt-3">
          <tbody>
            <tr>
              <td className={etiqueta}>Trabajador:</td>
              <td className={celda} colSpan={3}>
                {campo("trabajador")}
              </td>
            </tr>
            <tr>
              <td className={etiqueta}>Cédula:</td>
              <td className={celda}>{campo("cedula")}</td>
              <td className={etiqueta}>Cargo:</td>
              <td className={celda}>{campo("cargo")}</td>
            </tr>
            <tr>
              <td className={etiqueta}>Área / obra:</td>
              <td className={celda}>{campo("obra", { placeholder: editar ? "Área, proyecto u obra" : " " })}</td>
              <td className={etiqueta}>Fecha:</td>
              <td className={celda}>{campo("fecha", { type: "date" })}</td>
            </tr>
          </tbody>
        </table>

        <div className={cn("mt-4 print:mt-3", resaltar === "items" && "rounded ring-2 ring-sotec-green")}>
          <div className="hdr border border-black py-0.5">ELEMENTOS DE PROTECCIÓN PERSONAL ENTREGADOS</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[11.5px] print:min-w-0">
              <thead>
                <tr className="bg-slate-100 text-center font-bold">
                  <th className={cn(celda, "w-7")}>#</th>
                  <th className={celda}>Elemento</th>
                  <th className={cn(celda, "w-16")}>Cant.</th>
                  <th className={cn(celda, "w-[18%]")}>Talla / referencia</th>
                  <th className={cn(celda, "w-[19%]")}>Motivo</th>
                  <th className={cn(celda, "w-[15%]")}>Fecha</th>
                  {editar && <th className={cn(celda, "w-8 print:hidden")} aria-label="Quitar" />}
                </tr>
              </thead>
              <tbody>
                {datos.items.map((i, k) => (
                  <tr key={i.id}>
                    <td className={cn(celda, "text-center")}>{k + 1}</td>
                    <td className={celda}>
                      {editar ? (
                        <SelectConOtro compacto clave="epp.elementos" base={EPP_CATALOGO} value={i.elemento} onChange={(v) => item(i.id, { elemento: v })} aria-label={`Elemento ${k + 1}`} className="w-full bg-transparent" />
                      ) : (
                        i.elemento
                      )}
                    </td>
                    <td className={cn(celda, "text-center")}>
                      <EditableText value={String(i.cantidad || "")} type="number" disabled={!editar} placeholder=" " ariaLabel={`Cantidad ${k + 1}`} onCommit={(v) => item(i.id, { cantidad: Math.max(0, Math.round(Number(v) || 0)) })} />
                    </td>
                    <td className={celda}>
                      <EditableText value={i.talla} disabled={!editar} placeholder={editar ? "Talla" : " "} ariaLabel={`Talla ${k + 1}`} onCommit={(v) => item(i.id, { talla: v })} />
                    </td>
                    <td className={celda}>
                      {editar ? (
                        <select value={i.motivo} onChange={(e) => item(i.id, { motivo: e.target.value })} aria-label={`Motivo ${k + 1}`} className="w-full bg-transparent">
                          <option value="">Selecciona…</option>
                          {[...MOTIVOS_EPP, ...(i.motivo && !MOTIVOS_EPP.includes(i.motivo) ? [i.motivo] : [])].map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      ) : (
                        i.motivo
                      )}
                    </td>
                    <td className={cn(celda, "text-center")}>
                      <EditableText value={i.fecha} type="date" disabled={!editar} placeholder=" " ariaLabel={`Fecha ${k + 1}`} onCommit={(v) => item(i.id, { fecha: v })} />
                    </td>
                    {editar && (
                      <td className={cn(celda, "text-center print:hidden")}>
                        <button type="button" aria-label={`Quitar elemento ${k + 1}`} onClick={() => editar((d) => ({ items: d.items.filter((x) => x.id !== i.id) }))} className="text-slate-500 hover:text-red-600">
                          <Trash2 className="mx-auto h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {Array.from({ length: vacias }, (_, k) => (
                  <tr key={`v-${k}`} aria-hidden className={cn(editar && k > 1 && "print:table-row hidden")}>
                    <td className={cn(celda, "h-6 text-center text-slate-400")}>{datos.items.length + k + 1}</td>
                    <td className={celda} />
                    <td className={celda} />
                    <td className={celda} />
                    <td className={celda} />
                    <td className={celda} />
                    {editar && <td className={cn(celda, "print:hidden")} />}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editar && (
            <button
              type="button"
              onClick={() => editar((d) => ({ items: [...d.items, itemEpp("", d.fecha, d.items[d.items.length - 1]?.motivo ?? "")] }))}
              className="mt-2 inline-flex items-center gap-1 rounded-full border border-dashed border-sotec-greenDeep/60 px-2.5 py-1 text-[11px] font-semibold text-sotec-greenDeep hover:bg-sotec-soft print:hidden"
            >
              <Plus className="h-3 w-3" aria-hidden /> Agregar elemento
            </button>
          )}
          {datos.items.length > 0 && <p className="mt-1 text-right text-[10.5px]">Total de unidades entregadas: {totalUnidades(datos)}</p>}
        </div>

        <section className="mt-4 border border-black print:mt-3">
          <div className="hdr border-b border-black py-0.5">COMPROMISO DEL TRABAJADOR</div>
          <p className="p-2 text-justify text-[11px] leading-snug">{COMPROMISO_EPP}</p>
        </section>

        <section className="mt-3 border border-black">
          <div className="hdr border-b border-black py-0.5">OBSERVACIONES</div>
          <div className="min-h-[54px] p-2 text-justify print:min-h-[40px]">{campo("observaciones", { multiline: true, placeholder: editar ? "Observaciones (opcional)" : " " })}</div>
        </section>

        {/* Firmas y, a la derecha, la foto de quien recibe (si la hay; al diligenciar, el botón para tomarla) */}
        <div
          className={cn(
            "mt-6 grid grid-cols-2 gap-10 print:mt-4",
            (datos.fotoRecibe || editar) && "gap-6 sm:grid-cols-[1fr_1fr_150px] sm:gap-8",
            datos.fotoRecibe ? "print:grid-cols-[1fr_1fr_150px] print:gap-8" : "print:grid-cols-2 print:gap-10",
          )}
        >
          <div className={cn(resaltar === "firmaRecibe" && "rounded ring-2 ring-sotec-green")}>
            <Firma src={datos.firmaRecibe} etiqueta="trabajador que recibe" texto="✍ Firma de quien recibe" onFirmar={firmar ? () => firmar("firmaRecibe") : undefined} />
            <div className="border-t border-black pt-0.5 font-bold">Recibe (trabajador)</div>
            <div className="text-[10.5px] leading-tight">
              {datos.trabajador || " "}
              {datos.cedula ? ` · C.C. ${datos.cedula}` : ""}
            </div>
          </div>
          <div className={cn(resaltar === "firmaEntrega" && "rounded ring-2 ring-sotec-green")}>
            <Firma src={datos.firmaEntrega} etiqueta="quien entrega" texto="✍ Firma de quien entrega" onFirmar={firmar ? () => firmar("firmaEntrega") : undefined} />
            <div className="border-t border-black pt-0.5 font-bold">Entrega</div>
            <div className="text-[10.5px] leading-tight">
              {campo("entregaNombre", { placeholder: editar ? "Nombre de quien entrega" : " " })}
              {(datos.entregaCargo || editar) && <> · {campo("entregaCargo", { placeholder: editar ? "Cargo" : " " })}</>}
            </div>
          </div>
          <FotoEntrega className="col-span-2 mx-auto w-[150px] sm:col-span-1 sm:w-auto print:col-span-1 print:w-auto" foto={datos.fotoRecibe} resaltado={resaltar === "fotoRecibe"} onCambiar={editar ? (fotoRecibe) => editar({ fotoRecibe }) : undefined} />
        </div>

        <p className="mt-6 text-center text-[9.5px] font-bold print:mt-3">
          Documento emitido por el Servicio de Calidad de la Compañía. El documento es propiedad de SOTEC. La compañía protegerá sus propios derechos en los
          tribunales civiles y penales de acuerdo con la ley.
        </p>
        <PieContacto tipo="epp" empresa={empresa} className="text-[9.5px]" />
      </article>
    </div>
  );
}
