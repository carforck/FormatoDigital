"use client";

/**
 * Ruta /app/cobros/ver?id=<cuenta>: detalle de una cuenta de cobro con su plantilla,
 * soportes (reportes facturados) y trazabilidad. ?desde= define a dónde regresa «Volver».
 * La administración (`cobros`) edita, emite, envía, marca pagada o anula; el cliente solo
 * consulta las emitidas a su empresa (puedeVerCuenta de @/nucleo/permisos).
 */
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Ban, CheckCircle2, FolderKanban, PenLine, Printer, Send, Stamp } from "lucide-react";

import { EnviarDocumento } from "@/components/docs/EnviarDocumento";
import { Volver, marcarEdicion, useOrigen } from "@/components/ui/volver";
import { Button } from "@/components/ui/button";
import { EstadoCuentaBadge } from "@/components/ui/estado-cuenta";
import { PlantillaCuentaCobro } from "@/modulos/cobros/PlantillaCuentaCobro";
import { totales } from "@/modulos/cobros/tipos";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { abrirImpresion } from "@/nucleo/impresion";
import { cop } from "@/nucleo/letras";
import { puede, puedeVerCuenta } from "@/nucleo/permisos";
import { rutaDoc, rutaProyecto } from "@/nucleo/rutas";

/**
 * Contenido del detalle. Ciclo de estados: borrador → emitida → enviada → pagada, o
 * anulada (libera sus reportes para cobrarse en otra cuenta).
 */
function Ver() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const demo = useDemo();
  const u = demo.usuario!;
  const c = demo.cuentas.find((x) => x.id === id);
  const origen = useOrigen({ href: "/app/cobros", label: "Cuentas de cobro" });
  const [enviar, setEnviar] = useState(false);

  if (!c || !puedeVerCuenta(u, c)) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="font-semibold">Cuenta de cobro no disponible para este perfil</p>
        <Link href="/app/cobros" className="mt-3 inline-block text-sm text-sotec-greenDeep underline">
          Ir a cuentas de cobro
        </Link>
      </div>
    );
  }

  const gestiona = puede(u.rol, "cobros");
  const cliente = demo.clientes.find((x) => x.id === c.clienteId);
  const proyecto = demo.proyectos.find((x) => x.id === c.proyectoId);
  const { total } = totales(c);
  const nombre = (uid: string) => demo.usuarios.find((x) => x.id === uid)?.nombre ?? "Sistema";
  const creador = demo.usuarios.find((x) => x.id === c.creadoPor)?.nombre;

  return (
    <div className="space-y-4">
      <Volver href={origen.href} label={origen.label} />

      <div className="print:hidden flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-sotec-greenDeep">Cuenta de cobro</p>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
            <span className="font-mono">{c.codigo}</span> <EstadoCuentaBadge estado={c.estado} />
          </h1>
          <p className="text-sm text-slate-500">
            {cliente?.nombre} · <strong className="text-slate-700">{cop(total)}</strong>
          </p>
          {proyecto && (
            <Link href={rutaProyecto(proyecto.id)} className="mt-1 block text-sm font-medium text-sotec-greenDeep hover:underline">
              <FolderKanban className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />
              Proyecto <span className="whitespace-nowrap font-mono">{proyecto.codigo}</span> · {proyecto.nombre}
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {gestiona && c.estado === "borrador" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  marcarEdicion();
                  router.push(`/app/cobros/nueva?id=${c.id}${origen.query ? `&${origen.query}` : ""}`);
                }}
              >
                <PenLine className="h-4 w-4" /> Editar
              </Button>
              <Button onClick={() => demo.cambiarEstadoCuenta(c.id, "emitida")} disabled={c.items.length === 0 || c.items.some((i) => i.valorUnitario <= 0)}>
                <Stamp className="h-4 w-4" /> Emitir
              </Button>
            </>
          )}
          {gestiona && (c.estado === "emitida" || c.estado === "enviada") && (
            <>
              <Button variant="outline" onClick={() => setEnviar(true)}>
                <Send className="h-4 w-4" /> Enviar al cliente
              </Button>
              <Button onClick={() => demo.cambiarEstadoCuenta(c.id, "pagada")}>
                <CheckCircle2 className="h-4 w-4" /> Marcar pagada
              </Button>
              <Button
                variant="ghost"
                className="text-rose-700 hover:bg-rose-50"
                onClick={() => {
                  if (confirm(`¿Anular la cuenta de cobro ${c.codigo}? Sus reportes quedarán disponibles para cobrarse de nuevo.`)) demo.cambiarEstadoCuenta(c.id, "anulada");
                }}
              >
                <Ban className="h-4 w-4" /> Anular
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => abrirImpresion(router, { cuenta: c.id })}>
            <Printer className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="min-w-0 overflow-x-auto rounded-lg bg-slate-100 p-2 sm:p-4">
          <PlantillaCuentaCobro cuenta={c} cliente={cliente} proyecto={proyecto} config={demo.config} documentos={demo.documentos} firmante={creador} />
        </div>
        <aside className="print:hidden h-fit space-y-4">
          {c.items.some((i) => i.documentoId) && u.rol !== "cliente" && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold">Soportes</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {c.items
                  .filter((i) => i.documentoId)
                  .map((i) => (
                    <li key={i.id}>
                      <Link href={rutaDoc(i.documentoId!, `&desde=cuenta:${c.id}`)} className="font-mono text-sotec-greenDeep hover:underline">
                        {demo.documentos.find((d) => d.id === i.documentoId)?.codigo}
                      </Link>{" "}
                      <span className="text-slate-600">{i.descripcion}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Trazabilidad</h2>
            <ol className="mt-3 space-y-3 border-l border-slate-200 pl-4">
              {c.historial.map((h, k) => (
                <li key={k} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-sotec-green ring-2 ring-white" />
                  <p className="font-medium">{h.accion}</p>
                  <p className="text-xs text-slate-500">
                    {nombre(h.usuarioId)} · {h.fecha.replace("T", " ").slice(0, 16)}
                  </p>
                  {h.detalle && <p className="text-xs text-slate-600">{h.detalle}</p>}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      {enviar && (
        <EnviarDocumento
          titulo={`Enviar ${c.codigo}`}
          correo={cliente?.correo ?? ""}
          telefono={cliente?.telefono ?? ""}
          asunto={`Cuenta de cobro ${c.codigo} · ${demo.config.empresa}`}
          mensaje={`Cordial saludo${cliente?.contacto ? `, ${cliente.contacto}` : ""}.\n\n${demo.config.empresa} le remite la cuenta de cobro ${c.codigo} por ${cop(total)}, por concepto de: ${c.concepto}.\n\nFavor consignar en ${demo.config.banco}, cuenta de ${demo.config.tipoCuenta.toLowerCase()} No. ${demo.config.numeroCuenta}. Quedamos atentos.`}
          onEnviado={(canal, destino) => demo.registrarEnvio({ cuentaId: c.id }, canal, destino)}
          onCerrar={() => setEnviar(false)}
        />
      )}
    </div>
  );
}

/** Suspense requerido por useSearchParams. */
export default function Page() {
  return (
    <Suspense>
      <Ver />
    </Suspense>
  );
}
