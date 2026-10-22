/* eslint-disable @next/next/no-img-element */
import { cop, pesosEnLetras } from "@/nucleo/letras";
import { asset } from "@/nucleo/rutas";
import type { Cliente, Config, Documento, Proyecto } from "@/nucleo/tipos";

import { totalItem, totales, type CuentaCobro } from "./tipos";

interface Props {
  cuenta: CuentaCobro;
  cliente?: Cliente;
  /** Proyecto u obra al que se carga la cuenta. */
  proyecto?: Proyecto;
  config: Config;
  /** Documentos para mostrar el código del reporte que respalda cada línea. */
  documentos: Documento[];
  /** Nombre de quien firma por la empresa. */
  firmante?: string;
}

function fechaLarga(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

/** Cuenta de cobro de la empresa a su cliente (carta). */
export function PlantillaCuentaCobro({ cuenta, cliente, proyecto, config, documentos, firmante }: Props) {
  const { subtotal, iva, total } = totales(cuenta);
  const codigoDe = (id?: string) => documentos.find((d) => d.id === id)?.codigo ?? "—";

  return (
    <div className="doc-zona">
      <article className="doc-print mx-auto w-full max-w-[816px] bg-white p-6 text-[12px] leading-snug shadow-sm ring-1 ring-slate-200 sm:p-10">
        <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
          <img src={asset("/sotec-logo-v3.png")} alt={config.empresa} className="h-16 w-auto" />
          <div className="text-right">
            <p className="text-lg font-bold tracking-wide">CUENTA DE COBRO</p>
            <p className="font-mono text-sm">No. {cuenta.codigo}</p>
          </div>
        </header>

        <p className="mt-4">
          {config.ciudad}, {fechaLarga(cuenta.fecha)}
        </p>

        <div className="mt-4">
          <p>Señores:</p>
          <p className="font-bold uppercase">{cliente?.nombre ?? "—"}</p>
          {cliente?.nit && <p>NIT {cliente.nit}</p>}
          {cliente?.direccion && <p>{cliente.direccion}</p>}
          {cliente?.contacto && (
            <p>
              Atn.: {cliente.contacto}
              {cliente.cargo ? ` · ${cliente.cargo}` : ""}
            </p>
          )}
          {(cliente?.correo || cliente?.telefono) && <p className="[overflow-wrap:anywhere]">{[cliente.correo, cliente.telefono && `Tel. ${cliente.telefono}`].filter(Boolean).join(" · ")}</p>}
        </div>

        <div className="mt-6 text-center">
          <p className="font-bold">DEBE A:</p>
          <p className="text-base font-bold uppercase">{config.empresa}</p>
          <p>NIT {config.nit}</p>
        </div>

        <div className="mt-5 text-center">
          <p className="font-bold">LA SUMA DE:</p>
          <p className="mx-auto mt-1 max-w-xl text-[13px] font-semibold uppercase">
            {pesosEnLetras(total)} ({cop(total)})
          </p>
        </div>

        <div className="mt-5">
          <p className="font-bold">POR CONCEPTO DE:</p>
          <p className="mt-0.5">{cuenta.concepto || "—"}</p>
          {proyecto && (
            <p className="mt-0.5">
              <strong>Proyecto:</strong> {proyecto.codigo} · {proyecto.nombre}
              {proyecto.sitio ? ` · ${proyecto.sitio}` : ""}
            </p>
          )}
        </div>

        <table className="mt-4 w-full border-collapse border border-black text-[11px]">
          <thead>
            <tr className="hdr">
              <td className="w-8 border border-black py-1 text-center">#</td>
              <td className="border border-black px-2 py-1">Descripción</td>
              <td className="w-24 border border-black px-1 py-1 text-center">Soporte</td>
              <td className="w-12 border border-black px-1 py-1 text-center">Cant.</td>
              <td className="w-28 border border-black px-2 py-1 text-right">Valor unitario</td>
              <td className="w-28 border border-black px-2 py-1 text-right">Total</td>
            </tr>
          </thead>
          <tbody>
            {cuenta.items.length === 0 && (
              <tr>
                <td colSpan={6} className="border border-black p-3 text-center text-slate-400">
                  Agrega los ítems de la cuenta
                </td>
              </tr>
            )}
            {cuenta.items.map((i, k) => (
              <tr key={i.id}>
                <td className="border border-black text-center">{k + 1}</td>
                <td className="border border-black px-2 py-1">{i.descripcion}</td>
                <td className="border border-black px-1 text-center font-mono text-[10px]">{i.documentoId ? codigoDe(i.documentoId) : "—"}</td>
                <td className="border border-black text-center tabular-nums">{i.cantidad}</td>
                <td className="border border-black px-2 text-right tabular-nums">{cop(i.valorUnitario)}</td>
                <td className="border border-black px-2 text-right tabular-nums">{cop(totalItem(i))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="border border-black px-2 py-1 text-right font-semibold">
                Subtotal
              </td>
              <td className="border border-black px-2 text-right tabular-nums">{cop(subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="border border-black px-2 py-1 text-right font-semibold">
                IVA {cuenta.ivaPorcentaje}%
              </td>
              <td className="border border-black px-2 text-right tabular-nums">{cop(iva)}</td>
            </tr>
            <tr className="hdr">
              <td colSpan={5} className="border border-black px-2 py-1 text-right">
                TOTAL A PAGAR
              </td>
              <td className="border border-black px-2 text-right tabular-nums">{cop(total)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-4 rounded border border-black p-2">
          <p>
            <strong>Favor consignar en:</strong> {config.banco} · Cuenta de {config.tipoCuenta.toLowerCase()} No. {config.numeroCuenta} · a nombre de {config.titularCuenta}
          </p>
          {cuenta.notas && <p className="mt-1">{cuenta.notas}</p>}
        </div>

        <div className="mt-14 w-64">
          <div className="border-t border-black pt-1">
            <p className="font-semibold">{firmante || "Firma autorizada"}</p>
            <p>{config.empresa} · NIT {config.nit}</p>
          </div>
        </div>
      </article>
    </div>
  );
}
