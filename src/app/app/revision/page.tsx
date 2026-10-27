"use client";

/**
 * Ruta /app/revision: bandeja del revisor. Muestra los documentos en revisión (más
 * antiguos primero) y los aprobados que cierra SST. Para perfiles con permiso `revisar`
 * (supervisor/Coordinador SST y administración). Cada tarjeta abre el detalle con
 * ?desde=revision para volver aquí. Datos: demo.visibles de useDemo(), así la bandeja se
 * actualiza sola cuando el autor envía o retira un documento (otra pestaña o equipo). Marca
 * los reportes que traen la firma del cliente en sitio (al aprobarlos quedan cerrados).
 */
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Signature } from "lucide-react";

import { EstadoBadge, fechaCorta } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/corporativo";
import { rutaDoc } from "@/nucleo/rutas";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { faltantes } from "@/nucleo/validar";
import { clienteDoc, formatoDe, infoDoc, tituloDoc } from "@/modulos/registro";
import { IconoDoc } from "@/components/ui/icono-doc";

/** Bandeja de revisión y de cierre pendiente. */
export default function Revision() {
  const demo = useDemo();
  const cola = demo.visibles.filter((d) => d.estado === "en_revision").sort((a, b) => a.creado.localeCompare(b.creado));
  // Aprobados que cierra SST (permisos, gastos); los que cierra el cliente con su firma esperan en su portal
  const porCerrar = demo.visibles.filter((d) => d.estado === "aprobado" && infoDoc(d.tipo).flujo.cierre !== "cliente");
  const autor = (id: string) => demo.usuarios.find((u) => u.id === id)?.nombre ?? "—";
  /** El formato lo cierra la firma del cliente y ya la trae (tomada en sitio). */
  const firmadoEnSitio = (d: (typeof cola)[number]) => {
    const campo = infoDoc(d.tipo).flujo.campoFirmaCliente;
    return Boolean(campo && String((d.datos as unknown as Record<string, unknown>)[campo] ?? "").startsWith("data:image/"));
  };

  /** Tarjeta de un documento con el resultado de la validación automática (faltantes) y el llamado a la acción. */
  const tarjeta = (d: (typeof cola)[number], cta: string) => {
    const p = faltantes(d);
    return (
      <Link key={d.id} href={rutaDoc(d.id, "&desde=revision")} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sotec-greenDeep hover:shadow-md">
        <div className="flex items-center gap-2">
          <IconoDoc tipo={d.tipo} className="h-4 w-4 text-slate-500" />
          <span className="font-mono text-sm font-semibold">{d.codigo}</span>
          <span className="ml-auto">
            <EstadoBadge estado={d.estado} tipo={d.tipo} />
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm font-medium">{tituloDoc(d)}</p>
        <p className="text-xs text-slate-500">
          {formatoDe(d.tipo).corto} · {clienteDoc(d)} · {autor(d.autorId)} · {fechaCorta(d.creado)}
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
        {d.estado === "en_revision" && firmadoEnSitio(d) && (
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
            <Signature className="h-3.5 w-3.5" /> Con firma del cliente en sitio: se cierra al aprobar
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
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            <p>Bandeja al día: no hay documentos esperando tu revisión.</p>
            <Link href="/app/documentos" className="mt-2 inline-block font-medium text-sotec-greenDeep hover:underline">
              Ver todos los documentos →
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{cola.map((d) => tarjeta(d, "Revisar"))}</div>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Aprobados pendientes de cierre ({porCerrar.length})</h2>
        {porCerrar.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Nada pendiente de cierre. Los reportes y cotizaciones aprobados los cierra el cliente con su firma.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{porCerrar.map((d) => tarjeta(d, infoDoc(d.tipo).flujo.cerrar))}</div>
        )}
      </section>
    </div>
  );
}
