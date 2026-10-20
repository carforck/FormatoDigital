"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, HardHat } from "lucide-react";

import { EstadoBadge, fechaCorta } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/corporativo";
import { FORMATOS } from "@/lib/formatos";
import { rutaDoc } from "@/lib/base";
import { useDemo } from "@/lib/store";
import { faltantes } from "@/lib/validar";

export default function Revision() {
  const demo = useDemo();
  const cola = demo.visibles.filter((d) => d.estado === "en_revision").sort((a, b) => a.creado.localeCompare(b.creado));
  const porCerrar = demo.visibles.filter((d) => d.tipo === "permiso" && d.estado === "aprobado");
  const autor = (id: string) => demo.usuarios.find((u) => u.id === id)?.nombre ?? "—";

  const tarjeta = (d: (typeof cola)[number], cta: string) => {
    const p = faltantes(d);
    return (
      <Link key={d.id} href={rutaDoc(d.id)} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sotec-greenDeep hover:shadow-md">
        <div className="flex items-center gap-2">
          {d.tipo === "reporte" ? <FileText className="h-4 w-4 text-slate-500" /> : <HardHat className="h-4 w-4 text-slate-500" />}
          <span className="font-mono text-sm font-semibold">{d.codigo}</span>
          <span className="ml-auto">
            <EstadoBadge estado={d.estado} />
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm font-medium">{d.tipo === "reporte" ? d.datos.asunto : d.datos.actividades}</p>
        <p className="text-xs text-slate-500">
          {FORMATOS[d.tipo].corto} · {d.datos.cliente} · {autor(d.autorId)} · {fechaCorta(d.creado)}
        </p>
        {p.length === 0 ? (
          <p className="mt-2 flex items-center gap-1 text-xs text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Validación automática superada
          </p>
        ) : (
          <p className="mt-2 flex items-center gap-1 text-xs text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" /> {p.length} observación(es) de la validación
          </p>
        )}
        <p className="mt-3 text-sm font-semibold text-sotec-greenDeep">{cta} →</p>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader etiqueta="Gestión SST" titulo="Revisión y aprobación" descripcion="Los documentos llegan validados por el sistema; tú decides si se aprueban o vuelven al autor con el motivo." />
      <section>
        <h2 className="mb-2 font-semibold">Por revisar ({cola.length})</h2>
        {cola.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Bandeja al día.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{cola.map((d) => tarjeta(d, "Revisar"))}</div>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Permisos aprobados pendientes de cierre ({porCerrar.length})</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{porCerrar.map((d) => tarjeta(d, "Cerrar permiso"))}</div>
      </section>
    </div>
  );
}
