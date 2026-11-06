"use client";

/**
 * Plantilla del requerimiento: el mismo diseño de la cotización (franja verde, tabla de
 * ítems y pie) sin el encabezado comercial: ni NIT, ni vencimiento, ni vendedor, ni precios,
 * IVA, totales o condiciones. Solo lo que sabe el técnico: cliente, proyecto y sitio, fechas,
 * qué se requiere, ítems con cantidad, unidad y observación, observaciones y su firma.
 */

import { Plus, Trash2 } from "lucide-react";

import { EditableText } from "@/components/docs/EditableText";
import { Firma } from "@/components/docs/Encabezado";
import { SelectConOtro } from "@/components/ui/SelectConOtro";
import { cn } from "@/lib/utils";
import type { PropsPlantilla } from "@/modulos/contrato";
import { cantidadTexto, fechaCorta } from "@/modulos/cotizaciones/calculos";
import { CATALOGO_SERVICIOS, EMPRESA_COTIZACION, UNIDADES, type EmpresaCotizacion } from "@/modulos/cotizaciones/catalogo";
import { FranjaEncabezado, GRIS_FILA, PieFormato, VERDE, VERDE_ETIQUETA } from "@/modulos/cotizaciones/piezas";
import { useDemoOpcional } from "@/nucleo/datos/DemoProvider";
import { LISTA } from "@/nucleo/opciones";

import { FORMATO_REQUERIMIENTO, itemRqDeServicio, itemRqVacio } from "./catalogo";
import type { DatosRequerimiento, ItemRequerimiento } from "./tipos";

type CampoTexto = Exclude<keyof DatosRequerimiento, "items">;
type OpcCampo = { multiline?: boolean; type?: "text" | "date"; placeholder?: string; display?: string; className?: string };

/** Réplica del requerimiento en carta, con el estilo de la cotización. */
export function PlantillaRequerimiento({ datos, codigoDoc, editar, firmar, resaltar, empresa: empresaProp }: PropsPlantilla<DatosRequerimiento>) {
  const empresa: EmpresaCotizacion = { ...EMPRESA_COTIZACION, ...(empresaProp as Partial<EmpresaCotizacion> | undefined) };
  const marca = (k: string) => resaltar !== undefined && resaltar === k && "rounded bg-[#3BA10E]/15 ring-2 ring-[#3BA10E]";
  const demo = useDemoOpcional();
  const catalogo = [...CATALOGO_SERVICIOS, ...(demo?.config.serviciosPropios ?? [])];

  const campo = (k: CampoTexto, o: OpcCampo = {}) => (
    <span className={cn("rounded transition-colors", marca(k))}>
      <EditableText
        value={String(datos[k] ?? "")}
        disabled={!editar}
        multiline={o.multiline}
        type={o.type}
        placeholder={o.placeholder ?? " "}
        displayValue={o.display}
        ariaLabel={k}
        onCommit={(v) => editar?.({ [k]: v } as Partial<DatosRequerimiento>)}
        className={cn(o.multiline && "block min-h-[1.2em] w-full whitespace-pre-line", o.className)}
      />
    </span>
  );
  const item = (id: string, patch: Partial<ItemRequerimiento>) => editar?.({ items: datos.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  // Acepta coma decimal es-CO; negativos o texto quedan en 0
  const numero = (v: string) => Math.max(0, Number(String(v).replace(",", ".")) || 0);
  const etiqueta = "text-[12px] leading-tight" as const;
  const k = datos.items.length > 10;
  const sel = "max-w-full bg-transparent text-inherit outline-none hover:bg-amber-50 print:appearance-none";

  return (
    <div className="doc-zona space-y-4">
      <article
        className={cn(
          "doc-print doc-pie-fijo mx-auto flex w-full max-w-[816px] flex-col overflow-hidden bg-white px-5 pb-6 text-[11px] leading-snug text-slate-800 shadow-sm ring-1 ring-slate-200 sm:min-h-[1056px] sm:px-10 sm:pb-8 sm:text-[12px]",
          "print:min-h-[27.5cm]",
          k && "print:text-[10px] print:leading-tight",
        )}
      >
        <FranjaEncabezado empresa={empresa} titulo={`Requerimiento # ${codigoDoc || "borrador"}`} compacto={k} />

        {/* Cliente, proyecto y sitio */}
        <section className={cn("mt-5 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 print:grid-cols-2")}>
          <div className={cn("min-w-0", marca("cliente"))}>
            <p className={etiqueta} style={{ color: VERDE_ETIQUETA }}>
              Cliente
            </p>
            <p className="text-[13px]">{campo("cliente", { placeholder: editar ? "Nombre del cliente" : " " })}</p>
          </div>
          <div className={cn("min-w-0", marca("proyecto"))}>
            <p className={etiqueta} style={{ color: VERDE_ETIQUETA }}>
              Proyecto
            </p>
            <p>{campo("proyecto", { placeholder: editar ? "Sin proyecto" : "—" })}</p>
          </div>
          <div className={cn("min-w-0 sm:col-span-2 print:col-span-2", marca("sitio"))}>
            <p className={etiqueta} style={{ color: VERDE_ETIQUETA }}>
              Sitio o área
            </p>
            <p>{campo("sitio", { placeholder: editar ? "Dónde se necesita" : " " })}</p>
          </div>
        </section>

        {/* Fechas y quién solicita */}
        <section className="mt-4 grid grid-cols-3 gap-3">
          {(
            [
              ["Fecha", "fecha", "date"],
              ["Se necesita para", "fechaRequerida", "date"],
            ] as const
          ).map(([t, c, type]) => (
            <div key={c} className={cn("min-w-0", marca(c))}>
              <p className={etiqueta} style={{ color: VERDE_ETIQUETA }}>
                {t}
              </p>
              <p className="mt-0.5">{campo(c, { type, placeholder: editar && c === "fechaRequerida" ? "Opcional" : " ", display: fechaCorta(datos[c]) || undefined })}</p>
            </div>
          ))}
          {/* Se edita en la casilla de la firma */}
          <div className="min-w-0">
            <p className={etiqueta} style={{ color: VERDE_ETIQUETA }}>
              Solicitado por
            </p>
            <p className="mt-0.5 break-words">{datos.solicitante || "—"}</p>
          </div>
        </section>

        <p className={cn("mt-4", marca("asunto"))}>
          <span style={{ color: VERDE_ETIQUETA }}>Requerimiento: </span>
          {campo("asunto", { placeholder: editar ? "Qué se requiere y para qué" : " " })}
        </p>

        {/* Ítems: la misma tabla de la cotización, sin precios ni impuestos */}
        <div className={cn("mt-3", marca("items"))}>
          <div className="-mx-1 overflow-x-auto px-1 print:mx-0 print:overflow-visible print:px-0">
            <table className="w-full min-w-[540px] border-collapse sm:min-w-0 print:min-w-0">
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th className="w-[5%] py-2 pl-2 font-normal">#</th>
                  <th className="py-2 pl-2 font-normal">Descripción</th>
                  <th className="w-[20%] py-2 text-right font-normal">Cantidad</th>
                  <th className="w-[30%] py-2 pl-3 pr-2 font-normal">Observación</th>
                </tr>
              </thead>
              <tbody>
                {datos.items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="border-b border-slate-200 px-2 py-4 text-center text-slate-400">
                      {editar ? "Agrega los ítems con los botones de abajo." : "Sin ítems"}
                    </td>
                  </tr>
                )}
                {datos.items.map((i, n) => (
                  <tr key={i.id} className="break-inside-avoid border-b border-slate-200 align-top" style={n % 2 === 0 ? { background: GRIS_FILA } : undefined}>
                    <td className={cn("py-2 pl-2 tabular-nums text-slate-500", k && "print:py-[3px]")}>{n + 1}</td>
                    <td className={cn("py-2 pl-2 pr-2", k && "print:py-[3px]")}>
                      <EditableText value={i.descripcion} disabled={!editar} placeholder={editar ? "Material, equipo o servicio" : " "} ariaLabel={`Descripción ítem ${n + 1}`} onCommit={(v) => item(i.id, { descripcion: v })} className="block" />
                      {(editar || i.detalle) && (
                        <EditableText value={i.detalle ?? ""} disabled={!editar} placeholder={editar ? "Referencia o detalle (opcional)" : " "} ariaLabel={`Detalle ítem ${n + 1}`} onCommit={(v) => item(i.id, { detalle: v })} className="block text-slate-600" />
                      )}
                    </td>
                    <td className={cn("whitespace-nowrap py-2 text-right tabular-nums", k && "print:py-[3px]")}>
                      <EditableText value={String(i.cantidad)} type="number" disabled={!editar} displayValue={cantidadTexto(i.cantidad)} ariaLabel={`Cantidad ítem ${n + 1}`} onCommit={(v) => item(i.id, { cantidad: numero(v) })} />{" "}
                      {editar ? (
                        <SelectConOtro compacto clave={LISTA.unidad} base={UNIDADES} value={i.unidad} onChange={(unidad) => item(i.id, { unidad })} placeholderOtro="Unidad" className={sel} aria-label={`Unidad ítem ${n + 1}`} />
                      ) : (
                        i.unidad
                      )}
                    </td>
                    <td className={cn("py-2 pl-3 pr-2", k && "print:py-[3px]")}>
                      <div className="flex items-start gap-1">
                        <EditableText value={i.observacion} disabled={!editar} placeholder={editar ? "Para qué o dónde va" : " "} ariaLabel={`Observación ítem ${n + 1}`} onCommit={(v) => item(i.id, { observacion: v })} className="block min-w-0 flex-1" />
                        {editar && (
                          <button type="button" aria-label={`Quitar ítem ${n + 1}`} onClick={() => editar({ items: datos.items.filter((x) => x.id !== i.id) })} className="print:hidden rounded p-0.5 text-rose-600 hover:bg-rose-50">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editar && (
            <div className="print:hidden mt-1 flex flex-wrap items-center gap-2 text-[11px]">
              <button type="button" onClick={() => editar({ items: [...datos.items, itemRqVacio()] })} className="inline-flex items-center gap-1 rounded px-2 py-1 font-semibold text-[#2E7D32] hover:bg-[#F1F8E9]">
                <Plus className="h-3.5 w-3.5" /> Agregar ítem
              </button>
              <select
                value=""
                aria-label="Agregar del catálogo"
                onChange={(e) => {
                  const s = catalogo.find((x) => x.clave === e.target.value);
                  if (s) editar({ items: [...datos.items, itemRqDeServicio(s)] });
                }}
                className="max-w-[16rem] rounded border border-slate-200 bg-white px-1 py-1 text-[11px] text-slate-700"
              >
                <option value="">+ Del catálogo de servicios…</option>
                {catalogo.map((s) => (
                  <option key={s.clave} value={s.clave}>
                    {s.descripcion}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="break-inside-avoid">
          {(editar || datos.observaciones.trim()) && (
            <section className={cn("mt-5", marca("observaciones"))}>
              <h2 className="border-b pb-1 text-[12.5px] sm:text-[13px]" style={{ color: VERDE, borderColor: VERDE }}>
                Observaciones
              </h2>
              <div className="mt-1.5">{campo("observaciones", { multiline: true, placeholder: editar ? "Prioridad, acceso al sitio, lo que ya hay en la obra…" : " " })}</div>
            </section>
          )}

          {/* Firma de quien solicita (el técnico) */}
          <section className={cn("break-inside-avoid mt-6 grid grid-cols-2 items-end gap-x-6 sm:grid-cols-[1.3fr_1fr_1fr] print:grid-cols-[1.3fr_1fr_1fr]", marca("firmaSolicitante"))}>
            <div className="col-span-2 sm:col-span-1 print:col-span-1">
              <Firma src={datos.firmaSolicitante} etiqueta="solicitante" onFirmar={firmar ? () => firmar("firmaSolicitante") : undefined} />
              <p className="border-t border-slate-500 pt-0.5 text-[10px] text-slate-500">Firma de quien solicita</p>
            </div>
            <div className="min-w-0">
              <div className="min-h-[1.4em] break-words">{campo("solicitante")}</div>
              <p className="border-t border-slate-500 pt-0.5 text-[10px] text-slate-500">Nombre</p>
            </div>
            <div className="min-w-0">
              <div className="min-h-[1.4em] break-words">{campo("cargo")}</div>
              <p className="border-t border-slate-500 pt-0.5 text-[10px] text-slate-500">Cargo</p>
            </div>
          </section>
          <p className="mt-3 text-[10px] text-slate-500">Documento interno de {empresa.nombre}: la administración lo revisa y, si aplica, lo convierte en la cotización para el cliente.</p>
        </div>

        <PieFormato tipo="requerimiento" empresa={empresa} codigo={FORMATO_REQUERIMIENTO.codigo} />
      </article>
    </div>
  );
}
