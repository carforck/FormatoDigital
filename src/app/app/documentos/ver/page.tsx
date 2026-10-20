"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, Copy, Lock, PenLine, Printer, SendHorizonal, Trash2, X } from "lucide-react";

import { FirmaPad } from "@/components/docs/FirmaPad";
import { PlantillaPermiso } from "@/components/docs/PlantillaPermiso";
import { PlantillaReporte } from "@/components/docs/PlantillaReporte";
import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/ui/badges";
import { FORMATOS } from "@/lib/formatos";
import { puede, puedeEditarDoc, puedeVerDoc } from "@/lib/permisos";
import { useDemo } from "@/lib/store";
import type { DatosPermiso } from "@/lib/types";
import { faltantes } from "@/lib/validar";

function Detalle() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const ok = params.get("ok");
  const router = useRouter();
  const demo = useDemo();
  const u = demo.usuario!;
  const doc = demo.documentos.find((d) => d.id === id);
  const [firma, setFirma] = useState<null | "aprobar" | "cliente" | "cierre">(null);
  const [rechazo, setRechazo] = useState<string | null>(null);
  const [cierre, setCierre] = useState<Partial<DatosPermiso>>({ cierreAreaLimpia: "", cierraNombre: u.nombre, firmaCierre: "" });

  if (!doc || !puedeVerDoc(u, doc)) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="font-semibold">Documento no disponible para este perfil</p>
        <Link href="/app/documentos" className="mt-3 inline-block text-sm text-sotec-greenDeep underline">
          Ir a documentos
        </Link>
      </div>
    );
  }

  const f = FORMATOS[doc.tipo];
  const editable = puedeEditarDoc(u, doc);
  const pend = faltantes(doc);
  const revisa = puede(u.rol, "revisar") && doc.estado === "en_revision";
  const cierraPermiso = doc.tipo === "permiso" && doc.estado === "aprobado" && puede(u.rol, "cerrar_permiso");
  const firmaCliente = doc.tipo === "reporte" && doc.estado === "aprobado" && (u.rol === "cliente" || puede(u.rol, "revisar"));
  const nombre = (uid: string) => demo.usuarios.find((x) => x.id === uid)?.nombre ?? "Sistema";
  const datosVista = doc.tipo === "permiso" && cierraPermiso ? { ...doc.datos, ...cierre } : doc.datos;

  return (
    <div className="space-y-4">
      <Link href="/app/documentos" className="print:hidden inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Documentos
      </Link>

      {ok && (
        <p className="print:hidden flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          {ok === "enviado" ? "Enviado a revisión. El Coordinador SST recibió una notificación (cambia a ese perfil para aprobarlo)." : "Borrador guardado."}
        </p>
      )}

      <div className="print:hidden flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-sotec-greenDeep">
            {f.codigo} · {f.corto}
          </p>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
            <span className="font-mono">{doc.codigo}</span> <EstadoBadge estado={doc.estado} />
          </h1>
          <p className="text-sm text-slate-500">
            {doc.datos.cliente} · por {nombre(doc.autorId)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Button variant="outline" onClick={() => router.push(`/app/nuevo/${doc.tipo}?id=${doc.id}`)}>
              <PenLine className="h-4 w-4" /> Editar
            </Button>
          )}
          {editable && (
            <Button disabled={pend.length > 0} title={pend.length ? "Completa los pendientes" : ""} onClick={() => demo.enviar(doc.id)}>
              <SendHorizonal className="h-4 w-4" /> Enviar a revisión
            </Button>
          )}
          {revisa && (
            <>
              <Button onClick={() => (doc.tipo === "permiso" ? setFirma("aprobar") : demo.aprobar(doc.id))}>
                <Check className="h-4 w-4" /> Aprobar{doc.tipo === "permiso" ? " y firmar" : ""}
              </Button>
              <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => setRechazo("")}>
                <X className="h-4 w-4" /> Rechazar
              </Button>
            </>
          )}
          {firmaCliente && (
            <Button onClick={() => setFirma("cliente")}>
              <PenLine className="h-4 w-4" /> Firmar como cliente
            </Button>
          )}
          {puede(u.rol, "crear") && (
            <Button
              variant="outline"
              onClick={() => {
                const nid = demo.duplicar(doc.id);
                if (nid) router.push(`/app/nuevo/${doc.tipo}?id=${nid}`);
              }}
            >
              <Copy className="h-4 w-4" /> Duplicar
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> PDF
          </Button>
          {editable && doc.estado === "borrador" && (
            <Button
              variant="ghost"
              aria-label="Eliminar"
              onClick={() => {
                if (confirm(`¿Eliminar el borrador ${doc.codigo}?`)) {
                  demo.eliminar(doc.id);
                  router.push("/app/documentos");
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-rose-600" />
            </Button>
          )}
        </div>
      </div>

      {doc.estado === "rechazado" && doc.motivoRechazo && (
        <p className="print:hidden rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <strong>Motivo del rechazo:</strong> {doc.motivoRechazo}
        </p>
      )}
      {editable && pend.length > 0 && (
        <div className="print:hidden rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Pendiente para enviar ({pend.length}):</strong> {pend.join(" · ")}
        </div>
      )}
      {!editable && u.rol !== "cliente" && (doc.estado === "en_revision" || doc.estado === "aprobado" || doc.estado === "cerrado") && (
        <p className="print:hidden flex items-center gap-2 text-xs text-slate-500">
          <Lock className="h-3.5 w-3.5" /> Documento bloqueado: después de enviarse no se puede modificar, así queda la trazabilidad del SGC.
        </p>
      )}

      {cierraPermiso && (
        <div className="print:hidden space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          <p>
            <strong>Cierre del permiso:</strong> marca SI/NO en el formato, confirma el nombre y firma en la casilla de cierre.
          </p>
          <Button
            size="sm"
            disabled={!cierre.cierreAreaLimpia || !cierre.firmaCierre || !cierre.cierraNombre}
            onClick={() => demo.cerrar(doc.id, cierre)}
          >
            <Lock className="h-4 w-4" /> Cerrar permiso
          </Button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="overflow-x-auto rounded-lg bg-slate-100 p-2 sm:p-4">
          {doc.tipo === "reporte" ? (
            <PlantillaReporte datos={doc.datos} codigoDoc={doc.codigo} />
          ) : (
            <PlantillaPermiso
              datos={datosVista as DatosPermiso}
              codigoDoc={doc.codigo}
              editarCierre={cierraPermiso ? (p) => setCierre((c) => ({ ...c, ...p })) : undefined}
              firmar={cierraPermiso ? () => setFirma("cierre") : undefined}
              resaltar={cierraPermiso ? "cierre" : undefined}
            />
          )}
        </div>
        <aside className="print:hidden h-fit rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Trazabilidad</h2>
          <ol className="mt-3 space-y-3 border-l border-slate-200 pl-4">
            {doc.historial.map((h, k) => (
              <li key={k} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-sotec-green ring-2 ring-white" />
                <p className="font-medium">{h.accion}</p>
                <p className="text-xs text-slate-500">
                  {nombre(h.usuarioId)} · {h.fecha.replace("T", " ").slice(0, 16)}
                </p>
                {h.detalle && <p className="text-xs italic text-slate-600">“{h.detalle}”</p>}
              </li>
            ))}
          </ol>
        </aside>
      </div>

      {firma && (
        <FirmaPad
          titulo={firma === "aprobar" ? "Firma de quien autoriza" : firma === "cliente" ? "Firma del cliente" : "Firma de quien cierra"}
          onCerrar={() => setFirma(null)}
          onGuardar={(url) => {
            if (firma === "aprobar") demo.aprobar(doc.id, url);
            if (firma === "cliente") demo.cerrar(doc.id, { firmaCliente: url });
            if (firma === "cierre") setCierre((c) => ({ ...c, firmaCierre: url }));
            setFirma(null);
          }}
        />
      )}

      {rechazo !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-4">
            <p className="font-semibold">Rechazar {doc.codigo}</p>
            <p className="text-sm text-slate-500">El autor recibe el motivo y puede corregirlo.</p>
            <textarea autoFocus rows={3} value={rechazo} onChange={(e) => setRechazo(e.target.value)} className="mt-3 w-full rounded-md border border-slate-300 p-2 text-sm" placeholder="Ej: falta la lista de verificación de alturas" />
            <div className="mt-2 flex flex-wrap gap-1">
              {["Falta detallar las recomendaciones", "Firma del ejecutor incompleta", "EPP insuficiente para el riesgo"].map((s) => (
                <button key={s} onClick={() => setRechazo(s)} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50">
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRechazo(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={rechazo.trim().length < 5}
                onClick={() => {
                  demo.rechazar(doc.id, rechazo.trim());
                  setRechazo(null);
                }}
              >
                Rechazar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Detalle />
    </Suspense>
  );
}
