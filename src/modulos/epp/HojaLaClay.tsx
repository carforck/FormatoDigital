"use client";

/**
 * Hoja de la Entrega de EPP en el formato de LADRILLERA LA CLAY S.A.S. (variante «laclay»,
 * @/nucleo/variantes): «Matriz Entrega de EPP's» del Sistema Integrado de Gestión, versión 0,
 * fecha de edición 5/05/2026 (réplica de la estructura del formato en papel).
 *
 * Es una matriz: una fila por elemento entregado (CÓDIGO, DESCRIPCIÓN, UND., NOMBRE, CARGO,
 * PROCESO, EMISIÓN, SOLICITADO) y renglones vacíos hasta llenar la hoja; el trabajador firma
 * una sola vez al pie (nombre completo, firma, número de identificación y fecha).
 * Mapeo con `DatosEpp`: NOMBRE/CARGO/PROCESO = trabajador, cargo y proceso; EMISIÓN = fecha
 * de entrega de cada elemento; SOLICITADO, CÓDIGO y unidad son campos opcionales del elemento.
 * Los renglones son bordes de verdad (nada de degradados: en Safari iOS salen como un cuadro negro).
 */
import { Plus, Trash2 } from "lucide-react";

import { EditableText } from "@/components/docs/EditableText";
import { Firma, LogoFormato } from "@/components/docs/Encabezado";
import { useVariante } from "@/components/docs/VarianteFormato";
import { SelectConOtro } from "@/components/ui/SelectConOtro";
import { cn } from "@/lib/utils";

import { EPP_CATALOGO, MOTIVOS_EPP, itemEpp } from "./catalogo";
import { fechaLaClay, unidadEpp, type DatosEpp, type ItemEpp } from "./tipos";

/** Renglones de la matriz impresa (con los elementos): llenan una hoja carta como el papel. */
const FILAS_HOJA = 38;

interface Props {
  datos: DatosEpp;
  codigoDoc?: string;
  editar?: (patch: Partial<DatosEpp> | ((d: DatosEpp) => Partial<DatosEpp>)) => void;
  firmar?: (campo: "firmaRecibe" | "firmaEntrega") => void;
  resaltar?: string;
}

/** Encabezado de la matriz: logo, proceso y formato, y el control documental de La Clay. */
export function EncabezadoLaClay({ codigoDoc }: { codigoDoc?: string }) {
  const f = useVariante("epp").formatos.epp;
  const c = "border border-black px-1.5 py-0.5";
  return (
    <table className="w-full table-fixed border-collapse border border-black text-[11px]">
      <tbody>
        <tr>
          <td rowSpan={3} className="w-[16%] border border-black p-1 text-center">
            {/* En la demo, la marca de la app en vez del logo de La Clay (LogoFormato) */}
            <LogoFormato className="mx-auto h-12 w-auto object-contain" anchoDemo="max-w-[120px]" alt="LADRILLERA LA CLAY S.A.S." />
          </td>
          <td className={cn(c, "w-[24%] text-center")}>Proceso</td>
          <td className={cn(c, "text-center")}>Sistema Integrado de Gestión</td>
          <td className={cn(c, "w-[11%] text-center text-[10px]")}>Código</td>
          <td className={cn(c, "w-[13%] text-center")}>{f?.codigo || " "}</td>
        </tr>
        <tr>
          <td rowSpan={2} className={cn(c, "text-center")}>
            Formato
          </td>
          <td rowSpan={2} className={cn(c, "text-center text-[12px]")}>
            {f?.nombre ?? "Matriz Entrega de EPP's"}
            {codigoDoc && <div className="mt-0.5 font-mono text-[9.5px] text-slate-600">No. {codigoDoc}</div>}
          </td>
          <td className={cn(c, "text-center text-[10px]")}>Versión</td>
          <td className={cn(c, "text-center")}>{f?.version ?? "0"}</td>
        </tr>
        <tr>
          <td className={cn(c, "text-center text-[10px] leading-tight")}>Fecha de Edición</td>
          <td className={cn(c, "text-center")}>{f?.fecha ?? ""}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** Hoja de la entrega de EPP en la matriz de La Clay (carta). */
export function HojaLaClay({ datos, codigoDoc, editar, firmar, resaltar }: Props) {
  const res = (k: string) => resaltar === k && "bg-sotec-green/40 ring-2 ring-inset ring-sotec-green";
  const campo = (k: "trabajador" | "cedula" | "cargo" | "proceso" | "obra" | "fecha", opts: { type?: "date"; placeholder?: string } = {}) => (
    <span className={cn("rounded transition-colors", res(k))}>
      <EditableText
        value={String(datos[k] ?? "")}
        disabled={!editar}
        type={opts.type}
        displayValue={opts.type === "date" && datos[k] ? fechaLaClay(datos[k]) : undefined}
        placeholder={opts.placeholder ?? " "}
        ariaLabel={k}
        onCommit={(v) => editar?.({ [k]: v } as Partial<DatosEpp>)}
      />
    </span>
  );
  const item = (id: string, patch: Partial<ItemEpp>) => editar?.((d) => ({ items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const fechaItem = (i: ItemEpp, k: number, c: "fecha" | "solicitado") => (
    <EditableText
      value={i[c] ?? ""}
      type="date"
      disabled={!editar}
      displayValue={i[c] ? fechaLaClay(i[c]) : undefined}
      placeholder=" "
      ariaLabel={`${c === "fecha" ? "Emisión" : "Solicitado"} ${k + 1}`}
      onCommit={(v) => item(i.id, { [c]: v })}
    />
  );
  const vacias = Math.max(0, FILAS_HOJA - datos.items.length);
  const celda = "border-x border-b border-black px-1 py-0 align-middle";
  const th = "hdr border border-black px-1 py-1 text-[10px] font-normal uppercase";
  const mayus = "uppercase";
  // Motivo común de las filas (no va en el papel, pero la entrega lo registra)
  const motivos = [...new Set(datos.items.map((i) => i.motivo))];
  const motivoComun = motivos.length === 1 ? motivos[0] : "";

  return (
    <article className="doc-print mx-auto w-full max-w-[816px] bg-white p-6 text-[11px] leading-snug shadow-sm ring-1 ring-slate-200 sm:p-10 doc-ajustado" data-hoja="laclay">
      <EncabezadoLaClay codigoDoc={codigoDoc} />

      {/* Datos que el papel no muestra pero la entrega necesita: solo al diligenciar */}
      {editar && (
        <div className="mt-2 grid gap-x-3 gap-y-1 rounded border border-dashed border-slate-300 bg-slate-50 p-2 text-[11px] sm:grid-cols-2 print:hidden">
          <div>
            <span className="font-semibold">Área / obra: </span>
            {campo("obra", { placeholder: "Área, proyecto u obra" })}
          </div>
          <div>
            <span className="font-semibold">Fecha de la entrega: </span>
            {campo("fecha", { type: "date" })}
          </div>
          <div>
            <span className="font-semibold">Cargo: </span>
            {campo("cargo", { placeholder: "Cargo del trabajador" })}
          </div>
          <div>
            <span className="font-semibold">Proceso: </span>
            {campo("proceso", { placeholder: "Proceso o área (opcional)" })}
          </div>
          <label className="flex items-center gap-1 sm:col-span-2">
            <span className="font-semibold">Motivo (todas las filas):</span>
            <select
              value={motivoComun}
              onChange={(e) => e.target.value && editar((d) => ({ items: d.items.map((i) => ({ ...i, motivo: e.target.value })) }))}
              aria-label="Motivo de la entrega"
              className="bg-transparent"
            >
              <option value="">{motivos.length > 1 ? "Varios" : "Selecciona…"}</option>
              {MOTIVOS_EPP.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className={cn("mt-2 overflow-x-auto", resaltar === "items" && "rounded ring-2 ring-sotec-green")}>
        <table className="w-full min-w-[640px] table-fixed border-collapse text-[9.5px] leading-tight print:min-w-0">
          <thead>
            <tr className="text-center">
              <th className={cn(th, "w-[11%]")}>Código</th>
              <th className={cn(th, "w-[26%]")}>Descripción</th>
              <th className={cn(th, "w-[7%]")}>Und.</th>
              <th className={cn(th, "w-[17%]")}>Nombre</th>
              <th className={cn(th, "w-[10%]")}>Cargo</th>
              <th className={cn(th, "w-[10%]")}>Proceso</th>
              <th className={cn(th, "w-[9.5%]")}>Emisión</th>
              <th className={cn(th, "w-[9.5%]")}>Solicitado</th>
              {editar && <th className={cn(th, "w-7 print:hidden")} aria-label="Quitar" />}
            </tr>
          </thead>
          <tbody>
            {datos.items.map((i, k) => (
              <tr key={i.id} className="h-[18px]">
                <td className={cn(celda, mayus)}>
                  <EditableText value={i.codigo ?? ""} disabled={!editar} placeholder={editar ? "Código" : " "} ariaLabel={`Código ${k + 1}`} onCommit={(v) => item(i.id, { codigo: v.trim() })} />
                </td>
                <td className={cn(celda, mayus)}>
                  {editar ? (
                    <span className="flex items-center gap-1">
                      <SelectConOtro compacto clave="epp.elementos" base={EPP_CATALOGO} value={i.elemento} onChange={(v) => item(i.id, { elemento: v })} aria-label={`Elemento ${k + 1}`} className="min-w-0 flex-1 bg-transparent" />
                      <EditableText value={i.talla} placeholder="Talla" ariaLabel={`Talla ${k + 1}`} onCommit={(v) => item(i.id, { talla: v })} />
                    </span>
                  ) : (
                    [i.elemento, i.talla].filter((x) => x?.trim()).join(" ")
                  )}
                </td>
                <td className={cn(celda, "text-center", mayus)}>
                  {editar ? (
                    <span className="inline-flex items-center gap-0.5">
                      <EditableText value={String(i.cantidad || "")} type="number" placeholder="1" ariaLabel={`Cantidad ${k + 1}`} onCommit={(v) => item(i.id, { cantidad: Math.max(0, Math.round(Number(v) || 0)) })} />
                      <EditableText value={i.unidad ?? ""} displayValue={unidadEpp(i)} placeholder={unidadEpp(i)} ariaLabel={`Unidad ${k + 1}`} onCommit={(v) => item(i.id, { unidad: v.trim().toUpperCase() })} />
                    </span>
                  ) : (
                    `${i.cantidad > 1 ? `${i.cantidad} ` : ""}${unidadEpp(i)}`
                  )}
                </td>
                <td className={cn(celda, mayus, "break-words")}>{datos.trabajador}</td>
                <td className={cn(celda, mayus, "break-words")}>{datos.cargo}</td>
                <td className={cn(celda, mayus, "break-words")}>{datos.proceso ?? ""}</td>
                <td className={cn(celda, "text-center")}>{fechaItem(i, k, "fecha")}</td>
                <td className={cn(celda, "text-center")}>{fechaItem(i, k, "solicitado")}</td>
                {editar && (
                  <td className={cn(celda, "text-center print:hidden")}>
                    <button type="button" aria-label={`Quitar elemento ${k + 1}`} onClick={() => editar((d) => ({ items: d.items.filter((x) => x.id !== i.id) }))} className="text-slate-500 hover:text-red-600">
                      <Trash2 className="mx-auto h-3 w-3" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {Array.from({ length: vacias }, (_, k) => (
              <tr key={`v-${k}`} aria-hidden className={cn("h-[18px]", editar && k > 1 && "hidden print:table-row")}>
                {Array.from({ length: editar ? 9 : 8 }, (_, c) => (
                  <td key={c} className={cn(celda, c === 8 && "print:hidden")} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editar && (
        <button
          type="button"
          onClick={() => editar((d) => ({ items: [...d.items, itemEpp("", d.fecha, d.items[d.items.length - 1]?.motivo || MOTIVOS_EPP[0], d.items.length)] }))}
          className="mt-2 inline-flex items-center gap-1 rounded-full border border-dashed border-sotec-greenDeep/60 px-2.5 py-1 text-[11px] font-semibold text-sotec-greenDeep hover:bg-sotec-soft print:hidden"
        >
          <Plus className="h-3 w-3" aria-hidden /> Agregar elemento
        </button>
      )}

      {/* Pie: el trabajador firma una sola vez por todas las filas */}
      <div className="mt-4 w-full max-w-[380px] space-y-1.5 text-[10.5px] font-semibold print:mt-3">
        <div className="flex items-end gap-2">
          <span className="w-28 shrink-0 leading-tight">NOMBRE COMPLETO:</span>
          <span className="min-w-0 flex-1 border-b border-black font-normal uppercase">{campo("trabajador")}</span>
        </div>
        <div className={cn("flex items-end gap-2", res("firmaRecibe"))}>
          <span className="w-28 shrink-0">FIRMA:</span>
          <span className="min-w-0 flex-1 border-b border-black font-normal">
            <Firma src={datos.firmaRecibe} etiqueta="trabajador que recibe" texto="✍ Firma de quien recibe" onFirmar={firmar ? () => firmar("firmaRecibe") : undefined} />
          </span>
        </div>
        <div className="flex items-end gap-2">
          <span className="w-28 shrink-0 leading-tight">NUMERO DE IDENTIFICACIÓN:</span>
          <span className="min-w-0 flex-1 border-b border-black font-normal">{campo("cedula")}</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="w-28 shrink-0">FECHA:</span>
          <span className="min-w-0 flex-1 border-b border-black font-normal">{campo("fecha", { type: "date" })}</span>
        </div>
      </div>
    </article>
  );
}
