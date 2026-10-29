"use client";


/**
 * Plantilla de la cotización: réplica en carta de la cotización de Odoo de SOTEC
 * (colores y encabezado propios), ítems editables con catálogo, IVA por tarifa,
 * valor en letras, condiciones comerciales y aceptación con la firma del cliente.
 */

import { useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";

import { EditableText } from "@/components/docs/EditableText";
import { SelectConOtro } from "@/components/ui/SelectConOtro";
import { Firma, LogoFormato } from "@/components/docs/Encabezado";
import { cn } from "@/lib/utils";
import type { PropsPlantilla } from "@/modulos/contrato";
import { useDemoOpcional } from "@/nucleo/datos/DemoProvider";
import { cop, pesosEnLetras } from "@/nucleo/letras";
import { LISTA } from "@/nucleo/opciones";

import { cantidadTexto, diasEntre, fechaCorta, importeItem, totalesCotizacion } from "./calculos";
import { CATALOGO_SERVICIOS, EMPRESA_COTIZACION, FORMATO_COTIZACION, TARIFAS_IVA, UNIDADES, itemDeCatalogo, itemVacio, type EmpresaCotizacion, type ServicioCatalogo } from "./catalogo";
import type { DatosCotizacion, ItemCotizacion } from "./tipos";

/** Props de la plantilla: las comunes más los datos de empresa propios de la cotización (lema, web). */
export interface PropsPlantillaCotizacion extends PropsPlantilla<DatosCotizacion> {
  /** Datos de la empresa para el encabezado y el pie (teléfono, NIT…). Por defecto: `EMPRESA_COTIZACION`. */
  empresa?: Partial<EmpresaCotizacion>;
}

// Colores de la cotización de Odoo enviada por SOTEC
const VERDE = "#3BA10E";
const VERDE_ETIQUETA = "#688C5A";
const FRANJA = "#EFF7EC";
const GRIS_FILA = "#F4F5F7";

type CampoTexto = Exclude<keyof DatosCotizacion, "items">;
type OpcCampo = { multiline?: boolean; type?: "text" | "date" | "email" | "tel"; placeholder?: string; display?: string; className?: string };

/**
 * Réplica de la cotización de SOTEC (Odoo), en carta. Una hoja con hasta ~12
 * ítems; con más, las filas, los totales y la aceptación no se parten.
 */
export function PlantillaCotizacion({ datos, codigoDoc, editar, firmar, resaltar, empresa: empresaProp }: PropsPlantillaCotizacion) {
  const empresa = { ...EMPRESA_COTIZACION, ...empresaProp };
  const { subtotal, tarifas, iva, total } = totalesCotizacion(datos);
  const conIva = tarifas.filter((t) => t.pct > 0);
  const exento = tarifas.find((t) => t.pct === 0 && t.base > 0);
  const dias = diasEntre(datos.fecha, datos.vencimiento);
  const validezAuto = datos.vencimiento ? `Oferta válida hasta el ${fechaCorta(datos.vencimiento)}${dias >= 0 ? ` (${dias} días calendario)` : ""}.` : "";

  const marca = (k: string) => resaltar !== undefined && resaltar === k && "rounded bg-[#3BA10E]/15 ring-2 ring-[#3BA10E]";

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
        onCommit={(v) => editar?.({ [k]: v } as Partial<DatosCotizacion>)}
        className={cn(o.multiline && "block min-h-[1.2em] w-full whitespace-pre-line", o.className)}
      />
    </span>
  );

  const item = (id: string, patch: Partial<ItemCotizacion>) => editar?.({ items: datos.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  // Acepta coma decimal es-CO; negativos o texto quedan en 0
  const numero = (v: string) => Math.max(0, Number(String(v).replace(",", ".")) || 0);

  const etiqueta = "text-[12px] leading-tight" as const;
  // Con muchos ítems, el papel se compacta para que hasta 12 quepan en una carta
  const k = datos.items.length > 6;
  const pk = (clases: string) => (k ? clases : "");
  const sel = "max-w-full bg-transparent text-inherit outline-none hover:bg-amber-50 print:appearance-none";
  // Catálogo: el del formato + lo que la empresa agregó (asistente o «＋ Nuevo servicio o producto…»)
  const demo = useDemoOpcional();
  const catalogo = [...CATALOGO_SERVICIOS, ...(demo?.config.serviciosPropios ?? [])];
  const [nuevoServicio, setNuevoServicio] = useState(false);

  return (
    <div className="doc-zona space-y-4">
      <article
        className={cn(
          "doc-print doc-pie-fijo mx-auto flex w-full max-w-[816px] flex-col overflow-hidden bg-white px-5 pb-6 text-[11px] leading-snug text-slate-800 shadow-sm ring-1 ring-slate-200 sm:min-h-[1056px] sm:px-10 sm:pb-8 sm:text-[12px]",
          // En papel, la hoja ocupa la carta completa para que el pie quede abajo como en el original
          "print:min-h-[27.5cm]",
          pk("print:text-[10px] print:leading-tight"),
        )}
      >
        {/* Franja verde del encabezado: va de borde a borde, también al imprimir */}
        <header className="relative -mx-5 sm:-mx-10 print:-mx-[1cm] print:-mt-[0.8cm]" style={{ background: FRANJA }}>
          <div className={cn("flex items-start justify-between gap-3 px-5 pt-5 sm:px-10 sm:pt-7", pk("print:pt-4"))}>
            <LogoFormato className={cn("h-16 w-auto object-contain sm:h-[88px]", pk("print:h-14"))} anchoDemo="max-w-[200px] sm:max-w-[240px]" />
            <div className="text-right text-[11px] leading-[1.6] sm:text-[12.5px]">
              <p>{empresa.nombre}</p>
              {empresa.direccion.map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
          </div>
          <div className="relative flex flex-wrap items-end justify-between gap-x-3 px-5 pb-2 pt-2 sm:px-10 sm:pb-3">
            <p className="relative z-10 text-[11px] sm:text-[13px]" style={{ color: VERDE }}>
              {empresa.lema}
            </p>
            {/* Recorte blanco con chaflán, detrás del título (como en Odoo) */}
            <span aria-hidden="true" className="absolute bottom-0 right-0 h-[62%] w-[48%] bg-white" style={{ clipPath: "polygon(11% 0, 100% 0, 100% 100%, 0 100%)" }} />
            <h1 className="relative z-10 ml-auto whitespace-nowrap text-[20px] font-normal leading-none sm:text-[26px]" style={{ color: VERDE }}>
              Cotización # {codigoDoc || "borrador"}
            </h1>
          </div>
        </header>

        {/* Cliente */}
        <section className={cn("mt-5 space-y-0.5", pk("print:mt-3"), marca("cliente"))}>
          <p className="text-[13px] sm:text-[13.5px]">{campo("cliente", { placeholder: editar ? "Nombre del cliente" : " " })}</p>
          <div className="flex flex-wrap gap-x-4 text-[10.5px] text-slate-600 sm:text-[11px]">
            {(editar || datos.clienteNit) && <span className={cn(!datos.clienteNit && "print:hidden")}>NIT/C.C.: {campo("clienteNit", { placeholder: editar ? "por definir" : " " })}</span>}
            {(editar || datos.contacto) && <span>Atn.: {campo("contacto")}</span>}
            {(editar || datos.direccion) && <span>{campo("direccion", { placeholder: editar ? "Dirección" : " " })}</span>}
            {(editar || datos.correo) && <span className="[overflow-wrap:anywhere]">{campo("correo", { type: "email", placeholder: editar ? "correo@cliente" : " " })}</span>}
            {(editar || datos.telefono) && <span>Tel. {campo("telefono", { type: "tel" })}</span>}
          </div>
        </section>

        {/* Fecha · Vencimiento · Vendedor */}
        <section className={cn("mt-4 grid grid-cols-3 gap-3", pk("print:mt-2"))}>
          {(
            [
              ["Fecha de cotización", "fecha", "date"],
              ["Vencimiento", "vencimiento", "date"],
              ["Vendedor", "vendedor", "text"],
            ] as const
          ).map(([t, k, type]) => (
            <div key={k} className="min-w-0">
              <p className={etiqueta} style={{ color: VERDE_ETIQUETA }}>
                {t}
              </p>
              <p className="mt-0.5">{campo(k, { type, display: type === "date" ? fechaCorta(datos[k]) || undefined : undefined })}</p>
            </div>
          ))}
        </section>

        <p className={cn("mt-4", pk("print:mt-2"), marca("asunto"))}>
          <span style={{ color: VERDE_ETIQUETA }}>Asunto: </span>
          {campo("asunto", { placeholder: editar ? "Proyecto o servicio que se cotiza" : " " })}
        </p>

        {/* Ítems */}
        <div className={cn("mt-3", pk("print:mt-1"), marca("items"))}>
          {/* En celular la tabla se desplaza dentro de su contenedor; en papel ocupa el ancho */}
          <div className="-mx-1 overflow-x-auto px-1 print:mx-0 print:overflow-visible print:px-0">
          <table className="w-full min-w-[540px] border-collapse sm:min-w-0 print:min-w-0">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className={cn("py-2 pl-2 font-normal", pk("print:py-1"))}>Descripción</th>
                <th className="w-[17%] py-2 text-right font-normal">Cantidad</th>
                <th className="w-[15%] py-2 text-right font-normal">Precio unitario</th>
                <th className="w-[10%] py-2 text-center font-normal">Impuestos</th>
                <th className="w-[16%] py-2 pr-2 text-right font-normal">Importe</th>
              </tr>
            </thead>
            <tbody>
              {datos.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="border-b border-slate-200 px-2 py-4 text-center text-slate-400">
                    {editar ? "Agrega los ítems de la cotización con los botones de abajo." : "Sin ítems"}
                  </td>
                </tr>
              )}
              {datos.items.map((i, k) => (
                <tr key={i.id} className="break-inside-avoid border-b border-slate-200 align-top" style={k % 2 === 0 ? { background: GRIS_FILA } : undefined}>
                  <td className={cn("py-2 pl-2 pr-2", pk("print:py-[3px]"))}>
                    <EditableText value={i.descripcion} disabled={!editar} placeholder={editar ? "Descripción" : " "} ariaLabel={`Descripción ítem ${k + 1}`} onCommit={(v) => item(i.id, { descripcion: v })} className="block" />
                    {(editar || i.detalle) && (
                      <EditableText value={i.detalle ?? ""} disabled={!editar} placeholder={editar ? "Detalle (opcional)" : " "} ariaLabel={`Detalle ítem ${k + 1}`} onCommit={(v) => item(i.id, { detalle: v })} className="block" />
                    )}
                  </td>
                  <td className={cn("whitespace-nowrap py-2 text-right tabular-nums", pk("print:py-[3px]"))}>
                    <EditableText value={String(i.cantidad)} type="number" disabled={!editar} displayValue={cantidadTexto(i.cantidad)} ariaLabel={`Cantidad ítem ${k + 1}`} onCommit={(v) => item(i.id, { cantidad: numero(v) })} />{" "}
                    {editar ? (
                      <SelectConOtro compacto clave={LISTA.unidad} base={UNIDADES} value={i.unidad} onChange={(unidad) => item(i.id, { unidad })} placeholderOtro="Unidad" className={sel} aria-label={`Unidad ítem ${k + 1}`} />
                    ) : (
                      i.unidad
                    )}
                  </td>
                  <td className={cn("py-2 text-right tabular-nums", pk("print:py-[3px]"))}>
                    <EditableText value={String(i.precioUnitario)} type="number" disabled={!editar} displayValue={i.precioUnitario.toLocaleString("es-CO")} ariaLabel={`Precio ítem ${k + 1}`} onCommit={(v) => item(i.id, { precioUnitario: Math.round(numero(v)) })} />
                  </td>
                  <td className={cn("py-2 text-center tabular-nums", pk("print:py-[3px]"))}>
                    {editar ? (
                      <select value={i.ivaPct} onChange={(e) => item(i.id, { ivaPct: Number(e.target.value) })} className={sel} aria-label={`IVA ítem ${k + 1}`}>
                        {[...new Set([i.ivaPct, ...TARIFAS_IVA])].map((p) => (
                          <option key={p} value={p}>
                            {p} %
                          </option>
                        ))}
                      </select>
                    ) : (
                      `${i.ivaPct} %`
                    )}
                  </td>
                  <td className={cn("whitespace-nowrap py-2 pr-2 text-right tabular-nums", pk("print:py-[3px]"))}>
                    <div className="flex items-start justify-end gap-1">
                      {cop(importeItem(i))}
                      {editar && (
                        <button type="button" aria-label={`Quitar ítem ${k + 1}`} onClick={() => editar({ items: datos.items.filter((x) => x.id !== i.id) })} className="print:hidden rounded p-0.5 text-rose-600 hover:bg-rose-50">
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
              <button type="button" onClick={() => editar({ items: [...datos.items, itemVacio()] })} className="inline-flex items-center gap-1 rounded px-2 py-1 font-semibold text-[#2E7D32] hover:bg-[#F1F8E9]">
                <Plus className="h-3.5 w-3.5" /> Agregar ítem
              </button>
              {nuevoServicio && demo ? (
                <NuevoServicio
                  onCancelar={() => setNuevoServicio(false)}
                  onGuardar={(m) => {
                    // Queda en el catálogo de la empresa (Configuración · opciones agregadas) y como ítem
                    editar({ items: [...datos.items, itemDeCatalogo(demo.agregarServicio(m))] });
                    setNuevoServicio(false);
                  }}
                />
              ) : (
                <select
                  value=""
                  aria-label="Agregar del catálogo"
                  onChange={(e) => {
                    if (e.target.value === "__nuevo__") return setNuevoServicio(true);
                    const s = catalogo.find((x) => x.clave === e.target.value);
                    if (s) editar({ items: [...datos.items, itemDeCatalogo(s)] });
                  }}
                  className="max-w-[16rem] rounded border border-slate-200 bg-white px-1 py-1 text-[11px] text-slate-700"
                >
                  <option value="">+ Del catálogo (precio de referencia)…</option>
                  {catalogo.map((s) => (
                    <option key={s.clave} value={s.clave}>
                      {s.descripcion} · {cop(s.precioReferencia)}
                    </option>
                  ))}
                  {demo?.usuario && <option value="__nuevo__">＋ Nuevo servicio o producto…</option>}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Cierre: total, valor en letras, condiciones y aceptación van juntos en la última hoja
            (si no caben después de los ítems, pasan completos a la hoja siguiente) */}
        <div className="break-inside-avoid">
          {/* Totales */}
          <div className={cn("break-inside-avoid mt-0 flex justify-end", marca("total"))}>
            <table className="w-full border-collapse sm:w-1/2 print:w-1/2">
              <tbody>
                <tr className="border-b border-slate-200" style={{ background: GRIS_FILA }}>
                  <td className={cn("px-2 py-2", pk("print:py-1"))}>Subtotal (base sin impuestos)</td>
                  <td className={cn("px-2 py-2 text-right tabular-nums", pk("print:py-1"))}>{cop(subtotal)}</td>
                </tr>
                {conIva.length === 0 && (
                  <tr className="border-b border-slate-200">
                    <td className={cn("px-2 py-2", pk("print:py-1"))}>IVA</td>
                    <td className={cn("px-2 py-2 text-right tabular-nums", pk("print:py-1"))}>{cop(0)}</td>
                  </tr>
                )}
                {conIva.map((t) => (
                  <tr key={t.pct} className="border-b border-slate-200">
                    <td className={cn("px-2 py-2", pk("print:py-1"))}>
                      IVA {t.pct} %{tarifas.length > 1 && <span className="text-slate-500"> sobre {cop(t.base)}</span>}
                    </td>
                    <td className={cn("px-2 py-2 text-right tabular-nums", pk("print:py-1"))}>{cop(t.iva)}</td>
                  </tr>
                ))}
                {exento && (
                  <tr className="border-b border-slate-200">
                    <td className={cn("px-2 py-2", pk("print:py-1"))}>Excluido / exento de IVA</td>
                    <td className={cn("px-2 py-2 text-right tabular-nums", pk("print:py-1"))}>{cop(exento.base)}</td>
                  </tr>
                )}
                <tr className="border-b border-slate-200" style={{ background: GRIS_FILA, color: VERDE }}>
                  <td className={cn("px-2 py-2", pk("print:py-1"))}>Total</td>
                  <td className={cn("px-2 py-2 text-right font-semibold tabular-nums", pk("print:py-1"))}>{cop(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="break-inside-avoid mt-2 text-[10.5px] sm:text-[11px]">
            <span style={{ color: VERDE_ETIQUETA }}>Son: </span>
            <span className="font-semibold uppercase">{pesosEnLetras(total)}</span>
            {iva > 0 && <span className="text-slate-500"> · IVA incluido</span>}
          </p>

          {/* Condiciones comerciales */}
          <section className={cn("break-inside-avoid mt-5", pk("print:mt-3"))}>
            <h2 className="border-b pb-1 text-[12.5px] sm:text-[13px]" style={{ color: VERDE, borderColor: VERDE }}>
              Condiciones comerciales
            </h2>
            <dl className={cn("mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 print:grid-cols-2", pk("print:mt-1 print:grid-cols-4 print:gap-x-3"))}>
              {(
                [
                  ["Forma de pago", "formaPago"],
                  ["Tiempo de entrega", "tiempoEntrega"],
                  ["Garantía", "garantia"],
                  ["Validez de la oferta", "validez"],
                ] as const
              ).map(([t, k]) => (
                <div key={k} className="min-w-0">
                  <dt className={etiqueta} style={{ color: VERDE_ETIQUETA }}>
                    {t}
                  </dt>
                  <dd className={cn(k === "validez" && marca("vencimiento"))}>
                    {campo(k, k === "validez" ? { placeholder: validezAuto || " ", display: datos.validez || validezAuto || undefined } : { placeholder: editar ? "Por definir" : " " })}
                  </dd>
                </div>
              ))}
            </dl>
            {(editar || datos.observaciones.trim()) && (
              <div className="mt-2">
                <p className={etiqueta} style={{ color: VERDE_ETIQUETA }}>
                  Observaciones
                </p>
                {campo("observaciones", { multiline: true, placeholder: editar ? "Alcance, exclusiones, requisitos de acceso al sitio…" : " " })}
              </div>
            )}
            <p className="mt-2 text-[10px] text-slate-500">Precios en pesos colombianos (COP). Los valores de IVA se liquidan según la tarifa vigente en la fecha de facturación.</p>
          </section>

          {/* Aceptación del cliente: con su firma la cotización queda aceptada */}
          <section className={cn("break-inside-avoid mt-5 rounded border border-slate-300 p-3", pk("print:mt-3 print:p-2"), marca("firmaCliente"))}>
            <h2 className="text-[12.5px] sm:text-[13px]" style={{ color: VERDE }}>
              Aceptación del cliente
            </h2>
            <p className="mt-0.5 text-[10.5px] text-slate-600 sm:text-[11px]">Acepto la presente cotización con sus ítems, valores y condiciones comerciales.</p>
            <div className="mt-2 grid grid-cols-2 items-end gap-x-4 gap-y-2 sm:grid-cols-[1.3fr_1fr_1fr_0.8fr] print:grid-cols-[1.3fr_1fr_1fr_0.8fr]">
              <div className="col-span-2 sm:col-span-1 print:col-span-1">
                <Firma src={datos.firmaCliente} etiqueta="cliente" onFirmar={firmar ? () => firmar("firmaCliente") : undefined} />
                <p className="border-t border-slate-500 pt-0.5 text-[10px] text-slate-500">Firma</p>
              </div>
              {(
                [
                  ["Nombre", "aceptaNombre", "text"],
                  ["Cargo", "aceptaCargo", "text"],
                  ["Fecha", "aceptaFecha", "date"],
                ] as const
              ).map(([t, k, type]) => (
                <div key={k} className="min-w-0">
                  <div className="min-h-[1.4em] break-words">{campo(k, { type, display: type === "date" ? fechaCorta(datos[k]) || undefined : undefined })}</div>
                  <p className="border-t border-slate-500 pt-0.5 text-[10px] text-slate-500">{t}</p>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Pie de página: en pantalla al final de la hoja; al imprimir se repite en cada hoja
            (posición fija: Chrome y Safari la dibujan en todas las páginas; el margen inferior
            de la hoja deja su espacio, ver .doc-pie-fijo en globals.css) */}
        <div aria-hidden="true" className="min-h-8 flex-1 print:hidden" />
        <footer className="pie-cotizacion flex items-end gap-3 border-t border-slate-400 pt-2 text-[9.5px] text-slate-700 sm:text-[10.5px]">
          <p className="flex-1 text-center">
            {empresa.telefonos} · {empresa.correo} · {empresa.web} · {empresa.nit}
          </p>
          <p className="shrink-0 text-slate-500">{FORMATO_COTIZACION.codigo}</p>
        </footer>
      </article>
    </div>
  );
}

/**
 * Servicio o producto nuevo para el catálogo de la empresa (el mismo que agrega el asistente):
 * descripción, unidad (con «＋ Agregar otro…») y precio de referencia sin IVA. No es un `<form>`
 * (la plantilla puede ir dentro de otro); Enter guarda y Esc cancela.
 */
function NuevoServicio({ onGuardar, onCancelar }: { onGuardar: (m: Pick<ServicioCatalogo, "descripcion" | "unidad" | "precioReferencia">) => void; onCancelar: () => void }) {
  const [descripcion, setDescripcion] = useState("");
  const [unidad, setUnidad] = useState<string>("Unidades");
  const [precio, setPrecio] = useState("");
  const listo = descripcion.trim().length > 1 && Number(precio.replace(/\D/g, "")) > 0;
  const guardar = () => listo && onGuardar({ descripcion: descripcion.trim().replace(/\s+/g, " "), unidad, precioReferencia: Number(precio.replace(/\D/g, "")) });
  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      guardar();
    } else if (e.key === "Escape") onCancelar();
  };
  const campo = "h-8 rounded border border-slate-300 bg-white px-1.5 text-[11px] text-slate-800";
  return (
    <div role="group" aria-label="Nuevo servicio o producto" className="flex w-full flex-wrap items-center gap-1.5 rounded border border-dashed border-[#3BA10E] bg-[#EFF7EC] p-1.5" onKeyDown={teclas}>
      <input autoFocus value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Servicio o producto (p. ej. Cámara domo 4 MP)" aria-label="Descripción del servicio o producto" className={cn(campo, "min-w-[12rem] flex-1")} />
      <SelectConOtro clave={LISTA.unidad} base={UNIDADES} value={unidad} onChange={setUnidad} placeholderOtro="Unidad" aria-label="Unidad del servicio" className={campo} />
      <input inputMode="numeric" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Precio sin IVA" aria-label="Precio de referencia sin IVA" className={cn(campo, "w-28")} />
      <button type="button" disabled={!listo} onClick={guardar} className="inline-flex h-8 items-center gap-1 rounded bg-[#3BA10E] px-2 text-[11px] font-semibold text-white disabled:opacity-50">
        <Check className="h-3.5 w-3.5" aria-hidden /> Agregar
      </button>
      <button type="button" onClick={onCancelar} aria-label="Cancelar" className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-white">
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
