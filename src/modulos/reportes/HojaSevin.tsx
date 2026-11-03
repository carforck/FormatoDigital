"use client";

/* eslint-disable @next/next/no-img-element */
/**
 * Hoja del reporte en el formato de SEVIN (variante «sevin», @/nucleo/variantes):
 * «Informe de servicios» GSE-FO-03, versión 03, octubre 2023, réplica del formato que
 * envió Sevin. Usa los datos del reporte (`DatosReporte`) más los campos propios de Sevin
 * (lugar del servicio, ubicación, fecha de solicitud, diagnóstico, cargo y empresa del técnico).
 * `EncabezadoSevin` también va en las hojas del registro fotográfico.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { asset } from "@/nucleo/rutas";
import type { DatosReporte } from "@/nucleo/tipos";

import { Firma } from "@/components/docs/Encabezado";
import { Renglones } from "@/components/docs/Renglones";
import { EquiposEnFormato } from "@/modulos/equipos/EquiposEnFormato";
import type { EquipoAtendido } from "@/modulos/equipos/tipos";

/** Tipos de servicio con casilla, en el orden del formato (3 por fila). */
const TIPOS_SEVIN = ["Diagnóstico", "Mantenimiento preventivo", "Mantenimiento correctivo", "Programación", "Parametrización", "Soporte técnico", "Instalación", "Copia de respaldo", "Otros"] as const;

const plano = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Casilla marcada por el «Tipo reporte» del reporte («Preventivo» marca «Mantenimiento preventivo»). */
export function tipoSevinDe(tipo: string): string | undefined {
  const t = plano(tipo || "");
  if (!t) return undefined;
  return TIPOS_SEVIN.find((x) => plano(x) === t) ?? TIPOS_SEVIN.find((x) => plano(x).endsWith(` ${t}`)) ?? (t ? "Otros" : undefined);
}

/** Duración entre la hora de llegada y la de salida («2 h 30 min»); vacío si falta alguna. */
export function duracion(llegada?: string, salida?: string): string {
  const m = (h?: string) => (h && /^\d{1,2}:\d{2}$/.test(h) ? Number(h.split(":")[0]) * 60 + Number(h.split(":")[1]) : NaN);
  let d = m(salida) - m(llegada);
  if (Number.isNaN(d)) return "";
  if (d < 0) d += 24 * 60;
  const h = Math.floor(d / 60);
  const min = d % 60;
  return [h ? `${h} h` : "", min ? `${min} min` : "", !h && !min ? "0 min" : ""].filter(Boolean).join(" ");
}

type CampoTexto = Exclude<keyof DatosReporte, "fotos" | "lugarServicio">;
type Campo = (k: CampoTexto, opts?: { multiline?: boolean; type?: "text" | "date" | "time" | "email" | "tel"; placeholder?: string }) => ReactNode;

/** Encabezado de Sevin: logo, título y control documental. */
export function EncabezadoSevin() {
  return (
    <table className="w-full border-collapse border border-black">
      <tbody>
        <tr>
          <td className="w-[28%] border border-black p-1.5 text-center">
            <img src={asset("/variantes/sevin-logo.png")} alt="SEVIN" className="mx-auto h-12 w-auto object-contain" />
          </td>
          <td className="border border-black p-2 text-center text-[14px] font-bold">INFORME DE SERVICIOS</td>
          <td className="w-[25%] border border-black px-2 py-1 text-[11.5px] font-bold leading-snug">
            <div>Código: GSE-FO-03</div>
            <div>Versión: 03</div>
            <div>Fecha: Octubre 2023</div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Casilla con su texto a la izquierda, como en el formato. */
function Casilla({ texto, marcada, onClick }: { texto: string; marcada: boolean; onClick?: () => void }) {
  return (
    <button type="button" disabled={!onClick} aria-pressed={marcada} onClick={onClick} className="flex w-full items-center justify-end gap-1 px-1 py-0.5 text-right disabled:cursor-default">
      <span>{texto}</span>
      <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-black bg-white text-[10px] font-bold leading-none">{marcada ? "X" : ""}</span>
    </button>
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

/** Hoja principal del reporte en el formato de Sevin (carta). */
export function HojaSevin({ datos, codigoDoc, campo, editar, firmar, resaltar, equipos }: Props) {
  const marcado = tipoSevinDe(datos.tipoReporte);
  const etq = "bg-[#F2F2F2] border border-black px-1.5 py-0.5 font-bold";
  const celda = "border border-black px-1.5 py-0.5";
  const azul = "hdr border border-black px-1.5 py-0.5 text-left text-white";
  const res = (k: string) => resaltar === k && "bg-sotec-green/40 ring-2 ring-inset ring-sotec-green";
  const dur = duracion(datos.horaLlegada, datos.horaSalida);

  return (
    <article className="doc-print mx-auto w-full max-w-[816px] bg-white p-6 text-[11px] leading-snug shadow-sm ring-1 ring-slate-200 sm:p-10 doc-ajustado" data-hoja="sevin">
      <EncabezadoSevin />

      <div className="mt-3 space-y-2 px-2 text-[12px] font-bold sm:px-8 print:px-8">
        <div className="flex items-end gap-2">
          <span className="w-32 shrink-0">Informe de Servicio</span>
          <span className="min-w-0 flex-1 border-b border-black font-mono font-normal sm:max-w-[60%] print:max-w-[60%]">{codigoDoc ?? ""}</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="w-32 shrink-0">Fecha:</span>
          <span className="min-w-0 flex-1 border-b border-black font-normal sm:max-w-[60%] print:max-w-[60%]">{campo("fecha", { type: "date" })}</span>
        </div>
      </div>

      {/* Tipo y lugar del servicio */}
      <table className="mt-3 w-full table-fixed border-collapse border border-black text-[10.5px]">
        <tbody>
          {[0, 1, 2].map((fila) => (
            <tr key={fila} className={cn(fila === 0 && res("tipoReporte"))}>
              {fila === 0 && (
                <td rowSpan={3} className={cn(azul, "w-[24%] text-[12px] font-bold")}>
                  Tipo de Servicio:
                </td>
              )}
              {TIPOS_SEVIN.slice(fila * 3, fila * 3 + 3).map((t) => (
                <td key={t} className="border border-black bg-[#F2F2F2] p-0">
                  <Casilla texto={t} marcada={marcado === t} onClick={editar ? () => editar({ tipoReporte: marcado === t ? "" : t }) : undefined} />
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className={cn(azul, "font-bold")}>Lugar de Servicio:</td>
            <td colSpan={3} className="border border-black bg-[#F2F2F2] p-0">
              <div className="grid grid-cols-2">
                {(["campo", "laboratorio"] as const).map((l) => (
                  <Casilla
                    key={l}
                    texto={l === "campo" ? "En Campo" : "En Laboratorio"}
                    marcada={datos.lugarServicio === l}
                    onClick={editar ? () => editar({ lugarServicio: datos.lugarServicio === l ? "" : l }) : undefined}
                  />
                ))}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Datos del cliente */}
      <table className="mt-1.5 w-full table-fixed border-collapse border border-black">
        <tbody>
          <tr>
            <td colSpan={4} className="hdr h-5 border border-black" />
          </tr>
          <tr>
            <td className={cn(etq, "w-[20%]")}>Cliente:</td>
            <td className={cn(celda, "w-[32%]")}>{campo("cliente")}</td>
            <td className={cn(etq, "w-[16%]")}>Dirección:</td>
            <td className={celda}>{campo("direccion")}</td>
          </tr>
          <tr>
            <td className={etq}>Contacto:</td>
            <td className={celda}>{campo("personaContactada")}</td>
            <td className={etq}>Teléfono:</td>
            <td className={celda}>{campo("telefono", { type: "tel" })}</td>
          </tr>
          <tr>
            <td className={etq}>E-Mail:</td>
            <td className={cn(celda, "[overflow-wrap:anywhere]")}>{campo("correo", { type: "email" })}</td>
            <td className={etq}>Ubicación:</td>
            <td className={celda}>{campo("ubicacion")}</td>
          </tr>
        </tbody>
      </table>

      {/* Información del servicio */}
      <table className="mt-1.5 w-full table-fixed border-collapse border border-black">
        <tbody>
          <tr>
            <td colSpan={4} className={cn(azul, "font-bold italic")}>
              Información del servicio
            </td>
          </tr>
          <tr>
            <td className={cn(etq, "w-[20%]")}>Personal asignado:</td>
            <td className={cn(celda, "w-[32%]")}>{campo("nombreTecnico")}</td>
            <td className={cn(etq, "w-[16%]")}>Fecha de solicitud:</td>
            <td className={celda}>{campo("fechaSolicitud", { type: "date" })}</td>
          </tr>
          <tr>
            <td className={etq}>Duración del servicio:</td>
            <td className={celda}>
              {editar ? (
                <span className="flex flex-wrap items-center gap-1">
                  {campo("horaLlegada", { type: "time", placeholder: "llegada" })} – {campo("horaSalida", { type: "time", placeholder: "salida" })}
                  {dur && <span className="text-slate-500">({dur})</span>}
                </span>
              ) : (
                <>
                  {dur}
                  {datos.horaLlegada && datos.horaSalida ? ` (${datos.horaLlegada} – ${datos.horaSalida})` : ""}
                </>
              )}
            </td>
            <td className={etq}>Fecha de ejecución:</td>
            <td className={celda}>{datos.fecha}</td>
          </tr>
          <tr className={cn(res("asunto"))}>
            <td className={etq}>Trabajo solicitado:</td>
            <td colSpan={3} className={celda}>
              {campo("asunto")}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Actividades, diagnóstico y sugerencias */}
      <section className="mt-1.5 border border-black">
        <div className="hdr border-b border-black py-0.5 text-[10.5px] text-white">Actividades realizadas</div>
        <Renglones minimo={8} alto={20} texto={datos.descripcion} className={cn("px-1.5 text-[11.5px]", res("descripcion"))}>
          {campo("descripcion", { multiline: true, placeholder: editar ? "Actividades realizadas (toca para escribir)" : " " })}
        </Renglones>
        {(equipos.length > 0 || resaltar === "equipos") && (
          <div className={cn("border-t border-black px-1.5 py-1", res("equipos"))}>
            {equipos.length > 0 ? <EquiposEnFormato equipos={equipos} /> : <span className="print:hidden text-slate-400">Equipos atendidos: ninguno marcado</span>}
          </div>
        )}
        <div className="grid grid-cols-[20%_1fr] border-t border-black">
          <div className="border-r border-black bg-[#F2F2F2] px-1.5 py-0.5 text-[12px] font-bold">Diagnóstico</div>
          <Renglones minimo={6} alto={20} texto={datos.diagnostico} className={cn("px-1.5 text-[11.5px]", res("diagnostico"))}>
            {campo("diagnostico", { multiline: true })}
          </Renglones>
        </div>
        <div className="grid grid-cols-[20%_1fr] border-t border-black">
          <div className="border-r border-black bg-[#F2F2F2] px-1.5 py-0.5 text-[12px] font-bold">Sugerencias o acciones correctivas</div>
          <Renglones minimo={6} alto={20} texto={datos.recomendaciones} className={cn("px-1.5 text-[11.5px]", res("recomendaciones"))}>
            {campo("recomendaciones", { multiline: true })}
          </Renglones>
        </div>
      </section>

      {/* Firmas: técnico (quien presta el servicio) y quien recibe */}
      <div className="mt-8 grid grid-cols-2 gap-10 print:mt-6">
        <div className={cn(res("firmaTecnico"))}>
          <Firma src={datos.firmaTecnico} etiqueta="técnico" onFirmar={firmar ? () => firmar("firmaTecnico") : undefined} />
          <div className="border-t border-black text-center">Firma</div>
          <div className="mt-1 space-y-0.5 font-bold">
            <div>Nombre: <span className="font-normal">{campo("nombreTecnico")}</span></div>
            <div>Cargo: <span className="font-normal">{campo("cargoTecnico", { placeholder: "Técnico" })}</span></div>
            <div>Empresa: <span className="font-normal">{campo("empresaTecnico", { placeholder: "SOTEC" })}</span></div>
          </div>
        </div>
        <div className={cn(res("firmaCliente"))}>
          <Firma src={datos.firmaCliente} etiqueta="cliente" texto="✍ Toca para que firme el cliente" onFirmar={firmar ? () => firmar("firmaCliente") : undefined} />
          <div className="border-t border-black text-center">Firma</div>
          <div className="mt-1 space-y-0.5 font-bold">
            <div>Nombre: <span className="font-normal">{campo("nombreRecibe")}</span></div>
            <div>Cargo: <span className="font-normal">{campo("cargoRecibe")}</span></div>
            <div>Empresa: <span className="font-normal">{datos.cliente}</span></div>
          </div>
        </div>
      </div>
    </article>
  );
}
