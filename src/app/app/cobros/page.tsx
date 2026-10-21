"use client";

import Link from "next/link";
import { CircleDollarSign, Clock, Plus, Receipt } from "lucide-react";

import { Contador } from "@/components/fx/Reveal";
import { fechaCorta } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/corporativo";
import { EstadoCuentaBadge } from "@/components/ui/estado-cuenta";
import { totales } from "@/modulos/cobros/tipos";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { cop } from "@/nucleo/letras";
import { puede } from "@/nucleo/permisos";
import { rutaCuenta } from "@/nucleo/rutas";

export default function Cobros() {
  const demo = useDemo();
  const u = demo.usuario!;
  const cuentas = [...demo.cuentasVisibles].sort((a, b) => b.consecutivo - a.consecutivo);
  const cliente = (id: string) => demo.clientes.find((c) => c.id === id)?.nombre ?? "—";
  const suma = (estados: string[]) => cuentas.filter((c) => estados.includes(c.estado)).reduce((a, c) => a + totales(c).total, 0);
  const kpis = [
    { label: "Por cobrar", valor: suma(["emitida", "enviada"]), icon: Clock, tono: "bg-amber-50 text-amber-700" },
    { label: "Pagado", valor: suma(["pagada"]), icon: CircleDollarSign, tono: "bg-emerald-50 text-emerald-700" },
    { label: "Borradores", valor: cuentas.filter((c) => c.estado === "borrador").length, icon: Receipt, tono: "bg-slate-100 text-slate-700", cantidad: true },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        etiqueta="Finanzas"
        titulo="Cuentas de cobro"
        descripcion={u.rol === "cliente" ? "Cuentas de cobro emitidas a tu empresa." : `${demo.config.empresa} le cobra a sus clientes por los servicios, con soporte en los reportes técnicos.`}
        acciones={
          puede(u.rol, "cobros") && (
            <Link href="/app/cobros/nueva" className="inline-flex items-center gap-2 rounded-lg bg-sotec px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-black">
              <Plus className="h-4 w-4" /> Nueva cuenta de cobro
            </Link>
          )
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-sm text-slate-500">{k.label}</p>
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.tono}`}>
                <k.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              <Contador valor={k.valor} duracion={900} formato={k.cantidad ? undefined : (n) => cop(n)} />
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="hidden bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 md:table-header-group">
            <tr>
              <th className="px-4 py-2.5">Cuenta</th>
              <th className="px-4 py-2.5">Cliente</th>
              <th className="px-4 py-2.5">Fecha</th>
              <th className="px-4 py-2.5 text-right">Total</th>
              <th className="px-4 py-2.5">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cuentas.map((c) => (
              <tr key={c.id} className="block hover:bg-slate-50 md:table-row">
                <td className="block px-4 pt-3 md:table-cell md:py-3">
                  <Link href={rutaCuenta(c.id)} className="font-mono font-semibold hover:underline">
                    {c.codigo}
                  </Link>
                  <p className="truncate text-xs text-slate-500 md:max-w-xs">{c.concepto}</p>
                </td>
                <td className="block px-4 md:table-cell">{cliente(c.clienteId)}</td>
                <td className="inline-block px-4 text-slate-600 md:table-cell">{fechaCorta(c.fecha)}</td>
                <td className="inline-block px-4 font-medium tabular-nums md:table-cell md:text-right">{cop(totales(c).total)}</td>
                <td className="block px-4 pb-3 md:table-cell md:py-3">
                  <EstadoCuentaBadge estado={c.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cuentas.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No hay cuentas de cobro todavía.</p>}
      </div>
    </div>
  );
}
