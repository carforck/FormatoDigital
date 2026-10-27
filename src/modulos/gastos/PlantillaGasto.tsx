"use client";

/* eslint-disable @next/next/no-img-element */

/**
 * Plantilla del FO-GSST-25 · Legalización de gastos: réplica en A4 con los
 * colores del formato de SOTEC (encabezado propio, no el `Encabezado` común),
 * tabla de ítems editable y las fotos de las facturas en hojas anexas «Soportes».
 * La foto de cada factura se toma con la cámara o se elige de la galería (`ElegirImagen`).
 */

import { Plus, Receipt, Trash2 } from "lucide-react";

import { EditableText } from "@/components/docs/EditableText";
import { ElegirImagen } from "@/components/docs/ElegirImagen";
import { Firma, LogoFormato } from "@/components/docs/Encabezado";
import { cn } from "@/lib/utils";
import { formatoDe } from "@/modulos/registro";
import { comprimirImagen } from "@/nucleo/imagenes";
import { cop } from "@/nucleo/letras";

import { TIPOS_GASTO } from "./catalogo";
import { totalGastos, totalItemGasto, type DatosGasto, type ItemGasto, type TipoGasto } from "./tipos";

/** Campos que se firman en el pad (el Vo.Bo. se firma al aprobar, no desde la plantilla). */
export type CampoFirmaGasto = "firmaColaborador" | "firmaVobo";

interface Props {
  datos: DatosGasto;
  codigoDoc?: string;
  editar?: (patch: Partial<DatosGasto> | ((d: DatosGasto) => Partial<DatosGasto>)) => void;
  firmar?: (campo: CampoFirmaGasto) => void;
  resaltar?: string;
}

// Colores del formato FO-GSST-25 enviado por SOTEC
const VERDE = "#2E7D32";
const VERDE_CLARO = "#F1F8E9";

type CampoTexto = Exclude<keyof DatosGasto, "items">;

/** Soportes por hoja del anexo: 3 filas de 2 caben en carta y A4 con su franja y pie. */
const SOPORTES_POR_HOJA = 6;

/** Réplica del FO-GSST-25 · Legalización y registro de gastos operativos (A4). */
export function PlantillaGasto({ datos, codigoDoc, editar, firmar, resaltar }: Props) {
  const f = formatoDe("gasto");
  const total = totalGastos(datos);
  const conSoporte = datos.items.filter((i) => i.soporte);
  const hojasSoporte: ItemGasto[][] = [];
  for (let i = 0; i < conSoporte.length; i += SOPORTES_POR_HOJA) hojasSoporte.push(conSoporte.slice(i, i + SOPORTES_POR_HOJA));

  const campo = (k: CampoTexto, opts: { multiline?: boolean; type?: "text" | "date" | "tel"; placeholder?: string } = {}) => (
    <span className={cn("rounded", resaltar === k && "bg-[#2E7D32]/20 ring-2 ring-[#2E7D32]")}>
      <EditableText
        value={String(datos[k] ?? "")}
        disabled={!editar}
        multiline={opts.multiline}
        type={opts.type}
        placeholder={opts.placeholder ?? " "}
        ariaLabel={k}
        onCommit={(v) => editar?.({ [k]: v } as Partial<DatosGasto>)}
        className={opts.multiline ? "block min-h-[1.2em] w-full whitespace-pre-line" : undefined}
      />
    </span>
  );

  const item = (id: string, patch: Partial<ItemGasto>) => editar?.({ items: datos.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const fotoFactura = async (id: string, archivo?: File) => {
    if (!archivo || !editar) return;
    const soporte = await comprimirImagen(archivo, 1400, 0.75);
    // Sobre los gastos más recientes: mientras se comprimía pudo editarse otra fila
    editar((d) => ({ items: d.items.map((i) => (i.id === id ? { ...i, soporte } : i)) }));
  };

  // Solo se resalta si hay una sección pedida y coincide (en vistas de lectura ambas son undefined)
  const seccion = (titulo: string, clave?: string) => (
    <div className={cn("mt-4 break-after-avoid px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-white", clave !== undefined && resaltar === clave && "ring-2 ring-amber-400")} style={{ background: VERDE }}>
      {titulo}
    </div>
  );
  const etiqueta = "w-[22%] border border-slate-300 bg-slate-50 px-2 py-1.5 font-semibold uppercase text-slate-700";
  const valor = "border border-slate-300 px-2 py-1.5";

  return (
    <div className="doc-zona space-y-4">
      <article className="doc-print mx-auto w-full max-w-[794px] bg-white p-6 text-[11px] leading-snug text-slate-800 shadow-sm ring-1 ring-slate-200 sm:p-9">
        {/* Encabezado */}
        <table className="w-full border-collapse" style={{ border: `1.5px solid ${VERDE}` }}>
          <tbody>
            <tr>
              <td className="w-[26%] p-2 text-center" style={{ background: VERDE_CLARO }}>
                <LogoFormato className="mx-auto h-14 w-auto object-contain" anchoDemo="max-w-[170px]" />
              </td>
              <td className="p-2 text-center text-[14px] font-bold uppercase leading-tight text-white" style={{ background: VERDE }}>
                Formato de legalización y registro de gastos operativos
                {codigoDoc && <div className="mt-1 font-mono text-[10px] font-normal normal-case text-white/80">No. {codigoDoc}</div>}
              </td>
              <td className="w-[24%] p-2 text-[10.5px]" style={{ background: VERDE_CLARO }}>
                <p>
                  <strong>Código:</strong> {f.codigo}
                </p>
                <p>
                  <strong>Versión:</strong> {f.version}
                </p>
                <p>
                  <strong>Fecha:</strong> {f.fecha}
                </p>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="break-inside-avoid">
        {seccion("Datos generales")}
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={etiqueta}>Fecha:</td>
              <td className={valor}>{campo("fecha", { type: "date" })}</td>
              <td className={etiqueta}>Centro de costos:</td>
              <td className={valor}>{campo("centroCostos", { placeholder: "Proyecto / sede" })}</td>
            </tr>
            <tr>
              <td className={etiqueta}>Colaborador:</td>
              <td className={valor} colSpan={3}>
                {campo("colaborador")}
              </td>
            </tr>
            <tr>
              <td className={etiqueta}>Cargo:</td>
              <td className={valor}>{campo("cargo")}</td>
              <td className={etiqueta}>Teléfono:</td>
              <td className={valor}>{campo("telefono", { type: "tel" })}</td>
            </tr>
            <tr>
              <td className={etiqueta}>Cliente / obra:</td>
              <td className={valor} colSpan={3}>
                {campo("clienteObra", { placeholder: "Cliente o proyecto atendido" })}
              </td>
            </tr>
          </tbody>
        </table>
        </div>

        {seccion("Detalle de gastos y soportes", "items")}
        <table className="w-full border-collapse text-[10.5px]">
          <thead>
            <tr className="text-center font-bold uppercase text-white" style={{ background: VERDE }}>
              <td className="w-9 border border-white/30 py-1.5">Ítem</td>
              <td className="w-20 border border-white/30">Fecha</td>
              <td className="w-24 border border-white/30">Tipo de gasto</td>
              <td className="border border-white/30">Descripción / motivo</td>
              <td className="w-24 border border-white/30">N° recibo / factura</td>
              <td className="w-20 border border-white/30">Valor unitario</td>
              <td className="w-24 border border-white/30">Valor total</td>
            </tr>
          </thead>
          <tbody>
            {/* Sin ítems: una fila guía por tipo de gasto (solo visual, no se guarda) */}
            {datos.items.length === 0 &&
              TIPOS_GASTO.map((t, k) => (
                <tr key={t} className="text-slate-400">
                  <td className="border border-slate-300 py-1 text-center">{k + 1}</td>
                  <td className="border border-slate-300" />
                  <td className="border border-slate-300 text-center">{t}</td>
                  <td className="border border-slate-300" />
                  <td className="border border-slate-300" />
                  <td className="border border-slate-300 px-2 text-right">$ 0</td>
                  <td className="border border-slate-300 px-2 text-right">$ 0</td>
                </tr>
              ))}
            {datos.items.map((i, k) => (
              <tr key={i.id} className="break-inside-avoid">
                <td className="border border-slate-300 py-1 text-center">{k + 1}</td>
                <td className="border border-slate-300 px-1 text-center">
                  <EditableText value={i.fecha} type="date" disabled={!editar} ariaLabel={`Fecha gasto ${k + 1}`} onCommit={(v) => item(i.id, { fecha: v })} />
                </td>
                <td className="border border-slate-300 px-1 text-center">
                  {editar ? (
                    <select value={i.tipo} onChange={(e) => item(i.id, { tipo: e.target.value as TipoGasto })} className="w-full bg-transparent text-center text-[10.5px] outline-none print:appearance-none" aria-label={`Tipo gasto ${k + 1}`}>
                      {TIPOS_GASTO.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  ) : (
                    i.tipo
                  )}
                </td>
                <td className="border border-slate-300 px-1">
                  <div className="flex items-center gap-1">
                    <span className="min-w-0 flex-1">
                      <EditableText value={i.descripcion} disabled={!editar} ariaLabel={`Descripción gasto ${k + 1}`} onCommit={(v) => item(i.id, { descripcion: v })} />
                      {i.cantidad > 1 && <span className="text-slate-500"> (×{i.cantidad})</span>}
                    </span>
                    {i.soporte && <Receipt className="h-3 w-3 shrink-0 text-[#2E7D32]" aria-label="Con foto de factura" />}
                  </div>
                </td>
                <td className="border border-slate-300 px-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <EditableText value={i.recibo} disabled={!editar} placeholder={editar ? "N°" : " "} ariaLabel={`Recibo gasto ${k + 1}`} onCommit={(v) => item(i.id, { recibo: v })} />
                    {editar && <ElegirImagen variante="icono" que={`factura del gasto ${k + 1}`} onElegir={([archivo]) => fotoFactura(i.id, archivo)} />}
                  </div>
                </td>
                <td className="border border-slate-300 px-1 text-right tabular-nums">
                  {editar ? (
                    <EditableText value={String(i.valorUnitario)} type="number" disabled={!editar} displayValue={cop(i.valorUnitario)} ariaLabel={`Valor gasto ${k + 1}`} onCommit={(v) => item(i.id, { valorUnitario: Math.max(0, Number(v) || 0) })} />
                  ) : (
                    cop(i.valorUnitario)
                  )}
                </td>
                <td className="border border-slate-300 px-1 text-right tabular-nums">
                  <div className="flex items-center justify-end gap-1">
                    {cop(totalItemGasto(i))}
                    {editar && (
                      <button type="button" aria-label={`Quitar gasto ${k + 1}`} onClick={() => editar({ items: datos.items.filter((x) => x.id !== i.id) })} className="print:hidden rounded p-0.5 text-rose-600 hover:bg-rose-50">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            <tr className="break-inside-avoid">
              <td colSpan={6} className="border border-slate-300 px-2 py-1.5 text-right font-bold uppercase">
                Valor total legalizado:
              </td>
              <td className="border border-slate-300 px-2 text-right font-bold tabular-nums" style={{ background: VERDE_CLARO }}>
                {cop(total)} COP
              </td>
            </tr>
          </tbody>
        </table>
        {editar && (
          <button
            type="button"
            onClick={() => editar({ items: [...datos.items, { id: `g-${Date.now()}`, fecha: datos.fecha, tipo: "Otros", descripcion: "", recibo: "", cantidad: 1, valorUnitario: 0, soporte: "" }] })}
            className="print:hidden mt-1 inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-[#2E7D32] hover:bg-[#F1F8E9]"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar fila
          </button>
        )}

        {/* Encabezado de sección + contenido en un solo bloque: nunca quedan en páginas distintas */}
        <div className="break-inside-avoid">
        {seccion("Observaciones y justificaciones", "observaciones")}
        <div className="min-h-[56px] border border-slate-300 p-2 italic text-slate-600">
          {campo("observaciones", { multiline: true, placeholder: editar ? "Describa detalles adicionales de los gastos o justifique novedades relevantes durante la comisión…" : " " })}
        </div>
        </div>

        <div className="break-inside-avoid">
        {seccion("Control y aprobación", "firmaColaborador")}
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-center font-bold" style={{ background: VERDE_CLARO, color: VERDE }}>
              <td className="w-1/2 border border-slate-300 py-1">Firma colaborador que reporta</td>
              <td className="border border-slate-300 py-1">Vo.Bo. Administración / Gerencia</td>
            </tr>
          </thead>
          <tbody>
            <tr className="text-center">
              <td className={cn("border border-slate-300 px-4 pb-2 pt-3", resaltar === "firmaColaborador" && "ring-2 ring-[#2E7D32]")}>
                <Firma src={datos.firmaColaborador} etiqueta="colaborador" onFirmar={firmar ? () => firmar("firmaColaborador") : undefined} />
                <div className="mx-auto w-4/5 border-t border-slate-500 pt-0.5">
                  {datos.colaborador}
                  <span className="block text-slate-500">C.C: {datos.cedula}</span>
                </div>
              </td>
              <td className="border border-slate-300 px-4 pb-2 pt-3">
                <Firma src={datos.firmaVobo} etiqueta="Vo.Bo." onFirmar={undefined} />
                <div className="mx-auto w-4/5 border-t border-slate-500 pt-0.5">
                  {datos.voboNombre || " "}
                  <span className="block text-slate-500">Aprobado / Revisado</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Pie sin «Página X de Y»: el número real de páginas depende de la impresora y el papel */}
        <div className="mt-8 flex justify-between border-t border-slate-200 pt-2 text-[9.5px] text-slate-500 print:mt-4">
          <span>Documento emitido por el Sistema de Gestión de SOTEC</span>
          <span>Hoja 1 · Formato{conSoporte.length ? ` · ${conSoporte.length} soporte${conSoporte.length === 1 ? "" : "s"} anexo${conSoporte.length === 1 ? "" : "s"}` : ""}</span>
        </div>
        </div>
      </article>

      {hojasSoporte.map((grupo, h) => (
        <article key={h} className="doc-print mx-auto w-full max-w-[794px] bg-white p-6 text-[11px] leading-snug text-slate-800 shadow-sm ring-1 ring-slate-200 sm:p-9">
          <div className="flex items-center justify-between gap-3 px-2 py-1.5 text-white" style={{ background: VERDE }}>
            <span className="text-[11px] font-bold uppercase tracking-wider">Soportes · facturas y recibos{hojasSoporte.length > 1 ? ` (${h + 1}/${hojasSoporte.length})` : ""}</span>
            <span className="font-mono text-[10px]">
              {f.codigo}
              {codigoDoc ? ` · ${codigoDoc}` : ""}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {grupo.map((i) => {
              const n = datos.items.indexOf(i) + 1;
              return (
                <figure key={i.id} className="break-inside-avoid border border-slate-300 p-1.5">
                  <img src={i.soporte} alt={`Factura del gasto ${n}`} className="mx-auto max-h-[300px] w-full object-contain print:max-h-[250px]" />
                  <figcaption className="mt-1 flex justify-between gap-2 text-[10px]">
                    <span>
                      <strong>Ítem {n}</strong> · {i.tipo}
                      {i.recibo ? ` · N° ${i.recibo}` : ""}
                    </span>
                    <strong className="tabular-nums">{cop(totalItemGasto(i))}</strong>
                  </figcaption>
                </figure>
              );
            })}
          </div>
          <div className="mt-8 flex justify-between border-t border-slate-200 pt-2 text-[9.5px] text-slate-500">
            <span>Documento emitido por el Sistema de Gestión de SOTEC</span>
            <span>Hoja {h + 2} · Soportes</span>
          </div>
        </article>
      ))}
    </div>
  );
}
