"use client";

/* eslint-disable @next/next/no-img-element */
/**
 * Hoja del reporte en el formato de FORTOX (variante «fortox», @/nucleo/variantes):
 * «Reporte de mantenimiento de seguridad electrónica», FORMA 7PA/F1-15, réplica del PDF
 * que envió Fortox. Usa los mismos datos del reporte (`DatosReporte`) más los campos
 * propios de Fortox (ciudad, abonado, AN8, valor del servicio, factura). El visto bueno
 * de Coordinador de Tecnología y de Auxiliar contable lo firma Fortox en papel.
 * `EncabezadoFortox` y `PieFortox` también van en las hojas del registro fotográfico.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { asset } from "@/nucleo/rutas";
import type { DatosReporte } from "@/nucleo/tipos";

import { Firma } from "@/components/docs/Encabezado";
import { EquiposEnFormato } from "@/modulos/equipos/EquiposEnFormato";
import type { EquipoAtendido } from "@/modulos/equipos/tipos";

/** Datos fijos del formato de Fortox (tal cual el PDF). */
const FORTOX = {
  nit: "860.046.201-2",
  forma: "7PA/F1-15",
  vigilado: "VIGILADO Supervigilancia R.2016100093177 de 02-11-2016.",
  sedes: [
    ["Bogotá", "(1) 7477878"],
    ["Cali", "(2) 4874747"],
    ["Medellín", "(4) 6048718"],
    ["Pereira", "(6) 3401290"],
    ["Buenaventura", "(2) 2978607"],
    ["Barranquilla", "(5) 3854969"],
    ["Bucaramanga", "(7) 6976753"],
  ],
} as const;

/** Tipos de mantenimiento con casilla en el formato de Fortox. */
const TIPOS_FORTOX = ["Preventivo", "Correctivo", "Garantía"] as const;

type CampoTexto = Exclude<keyof DatosReporte, "fotos">;
type Campo = (k: CampoTexto, opts?: { multiline?: boolean; type?: "text" | "date" | "time" | "email" | "tel"; placeholder?: string }) => ReactNode;

/** Logo, título y NIT de Fortox; con `codigoDoc`, el «No.» del reporte. */
export function EncabezadoFortox({ codigoDoc, titulo = "REPORTE DE MANTENIMIENTO DE SEGURIDAD ELECTRÓNICA" }: { codigoDoc?: string; titulo?: string }) {
  return (
    <div>
      <h2 className="text-center text-[13px] font-bold">{titulo}</h2>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <img src={asset("/variantes/fortox-logo.png")} alt="FORTOX" className="h-9 w-auto object-contain sm:h-11 print:h-11" />
          <div className="mt-1 text-[9.5px] font-bold">Nit. {FORTOX.nit}</div>
        </div>
        <div className="text-right font-bold">
          No. <span className="inline-block min-w-[110px] border-b border-black text-left font-mono font-normal">{codigoDoc ?? ""}</span>
        </div>
      </div>
    </div>
  );
}

/** Sedes de Fortox y la FORMA del formato. */
export function PieFortox() {
  return (
    <div className="mt-4 print:mt-2">
      <div className="grid grid-cols-4 gap-x-2 gap-y-1 text-center text-[8.5px] leading-tight sm:grid-cols-7 print:grid-cols-7">
        {FORTOX.sedes.map(([ciudad, pbx]) => (
          <div key={ciudad}>
            <div className="font-bold">{ciudad}</div>
            <div>PBX: {pbx}</div>
          </div>
        ))}
      </div>
      <div className="mt-1 text-[8.5px]">FORMA: {FORTOX.forma}</div>
    </div>
  );
}

interface Props {
  datos: DatosReporte;
  codigoDoc?: string;
  campo: Campo;
  editar?: (patch: Partial<DatosReporte>) => void;
  firmar?: (campo: "firmaTecnico" | "firmaCliente") => void;
  resaltar?: string;
  equipos: EquipoAtendido[];
}

/** Hoja principal del reporte en el formato de Fortox (carta). */
export function HojaFortox({ datos, codigoDoc, campo, editar, firmar, resaltar, equipos }: Props) {
  const linea = (etiqueta: string, k: CampoTexto, type?: "text" | "tel", className?: string) => (
    <div className={cn("flex min-w-0 items-end gap-1", className)}>
      <span className="shrink-0 text-[11px]">{etiqueta}</span>
      <span className="min-w-0 flex-1 break-words border-b border-black leading-tight">{campo(k, { type })}</span>
    </div>
  );
  const tipo = datos.tipoReporte;
  const otroTipo = tipo && !TIPOS_FORTOX.some((t) => t.toLowerCase() === tipo.toLowerCase());

  return (
    <article className="doc-print relative mx-auto w-full max-w-[816px] bg-white p-6 text-[12px] leading-snug shadow-sm ring-1 ring-slate-200 sm:p-10 sm:pl-14 doc-ajustado" data-hoja="fortox">
      {/* Franja vertical de Supervigilancia, como en el formato */}
      <div className="pointer-events-none absolute bottom-24 left-1 hidden origin-bottom-left -rotate-90 translate-x-4 whitespace-nowrap text-[9px] sm:block print:block">{FORTOX.vigilado}</div>

      <EncabezadoFortox codigoDoc={codigoDoc} />

      <div className="mt-1 flex justify-end">
        <table className="w-[56%] border-collapse border border-black text-center text-[11px]">
          <tbody>
            <tr>
              <td className="border border-black">Ciudad</td>
              <td className="border border-black">Fecha de Elaboración</td>
            </tr>
            <tr>
              <td className="border border-black px-1">{campo("ciudad", { placeholder: "Cartagena" })}</td>
              <td className="border border-black p-0">
                {/* Al diligenciar, selector de fecha; impresa, en casillas AA · MM · DD como el formato */}
                {editar ? (
                  <div className="px-1">{campo("fecha", { type: "date" })}</div>
                ) : (
                  <div className="grid grid-cols-3">
                    {(datos.fecha || "").split("-").concat(["", "", ""]).slice(0, 3).map((x, i) => (
                      <span key={i} className={cn("py-0.5", i > 0 && "border-l border-black")}>{x || ["AA", "MM", "DD"][i]}</span>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <section className="border border-black">
        <div className="hdr border-b border-black py-0.5">I. INFORMACIÓN GENERAL</div>
        <div className="space-y-1.5 p-2">
          <div className={cn("flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px]", resaltar === "tipoReporte" && "rounded bg-sotec-green/40 ring-2 ring-sotec-green")}>
            <span>Tipo de mantenimiento{otroTipo ? `: ${tipo}` : ""}</span>
            {TIPOS_FORTOX.map((t) => {
              const marcado = tipo?.toLowerCase() === t.toLowerCase();
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!editar}
                  aria-pressed={marcado}
                  onClick={() => editar?.({ tipoReporte: marcado ? "" : t })}
                  className="inline-flex items-center gap-1.5 disabled:cursor-default"
                >
                  {t}
                  <span className="inline-flex h-4 w-5 items-center justify-center border border-black text-[11px] font-bold leading-none">{marcado ? "X" : ""}</span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-[1.4fr_1fr] print:grid-cols-[1.4fr_1fr]">
            {linea("Cliente/ Puesto", "cliente")}
            <div className="flex min-w-0 gap-3">
              {linea("Abonado No.", "abonado", "text", "flex-1")}
              {linea("AN8", "an8", "text", "w-[38%]")}
            </div>
            {linea("Dirección", "direccion")}
            {linea("Teléfono", "telefono", "tel")}
            {linea("Persona Contactada", "personaContactada")}
            {linea("Cargo", "cargo")}
          </div>
          <div className={cn("text-[11px]", resaltar === "asunto" && "rounded bg-sotec-green/40 ring-2 ring-sotec-green")}>
            Diagnóstico:
            <div className="min-h-[2.4em] border-b border-black pl-4 text-[12.5px]">{campo("asunto", { multiline: true })}</div>
          </div>
          {datos.proyecto && <div className="text-[10.5px] text-slate-600">Proyecto: {datos.proyecto}</div>}
          {(equipos.length > 0 || resaltar === "equipos") && (
            <div className={cn("rounded", resaltar === "equipos" && "bg-sotec-green/40 ring-2 ring-sotec-green print:bg-transparent print:ring-0")}>
              {equipos.length > 0 ? <EquiposEnFormato equipos={equipos} /> : <span className="print:hidden text-slate-400">Equipos atendidos: ninguno marcado</span>}
            </div>
          )}
        </div>
      </section>

      <section className="border-x border-b border-black">
        <div className="hdr border-b border-black py-0.5">II. ACTIVIDAD REALIZADA</div>
        <div className="p-2">
          <div className="grid grid-cols-2 gap-6">
            {linea("Hora de Llegada", "horaLlegada")}
            {linea("Hora de Salida", "horaSalida")}
          </div>
          <div
            className="mt-3 min-h-[190px] text-justify text-[12.5px] leading-[24px] print:min-h-[170px]"
            style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 23px, #000 23px 24px)" }}
          >
            {campo("descripcion", { multiline: true, placeholder: editar ? "Actividad realizada (toca para escribir)" : " " })}
            {(datos.recomendaciones || editar) && (
              <div className={cn(resaltar === "recomendaciones" && "rounded bg-sotec-green/40 ring-2 ring-sotec-green")}>
                <span className="font-semibold">Recomendaciones: </span>
                {campo("recomendaciones", { multiline: true })}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 border-t border-black p-2 font-bold sm:grid-cols-2 print:grid-cols-2">
          {linea("Valor Servicio (antes de IVA) $", "valorServicio")}
          {linea("Factura No.", "factura")}
        </div>
      </section>

      <section className="grid grid-cols-2 border-x border-b border-black">
        <div className={cn("border-r border-black p-2", resaltar === "firmaTecnico" && "ring-2 ring-inset ring-sotec-green")}>
          <div className="text-center font-bold">TÉCNICO</div>
          {linea("Nombre", "nombreTecnico")}
          <div className="mt-1 flex items-end gap-1">
            <span className="text-[11px]">Firma</span>
            <div className="flex-1 border-b border-black">
              <Firma src={datos.firmaTecnico} etiqueta="técnico" onFirmar={firmar ? () => firmar("firmaTecnico") : undefined} />
            </div>
          </div>
        </div>
        <div className={cn("p-2", resaltar === "firmaCliente" && "ring-2 ring-inset ring-sotec-green")}>
          <div className="text-center font-bold">CLIENTE</div>
          {linea("Nombre", "nombreRecibe")}
          <div className="mt-1 flex items-end gap-1">
            <span className="text-[11px]">Firma</span>
            <div className="flex-1 border-b border-black">
              <Firma src={datos.firmaCliente} etiqueta="cliente" texto="✍ Toca para que firme el cliente" onFirmar={firmar ? () => firmar("firmaCliente") : undefined} />
            </div>
          </div>
        </div>
      </section>

      {/* Visto bueno de Fortox: se firma a mano sobre el impreso */}
      <section className="grid grid-cols-2 gap-10 border-x border-b border-black px-6 pb-3 pt-10 text-center print:pt-8">
        {["Coordinador de Tecnologia", "Auxiliar Contable Facturación"].map((t) => (
          <div key={t}>
            <div className="border-t border-black pt-0.5 font-bold">{t}</div>
            <div className="mt-1 flex items-end justify-center gap-1 text-[9px]">
              Fecha
              {["AA", "MM", "DD"].map((x) => (
                <span key={x} className="inline-flex w-7 flex-col items-center border-x border-b border-black pt-3 text-[7.5px] leading-none text-slate-500">{x}</span>
              ))}
            </div>
          </div>
        ))}
      </section>

      <PieFortox />
    </article>
  );
}
