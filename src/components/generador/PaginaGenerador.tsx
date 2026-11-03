"use client";

/**
 * Envoltura de página del generador para `/app/nuevo/<tipo>`.
 * Lee los parámetros de la URL (`id`, `proyecto`, `cliente`, `equipo` y, en la cotización,
 * `requerimiento`) y decide entre crear un documento nuevo, continuar uno editable o bloquear.
 */
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";

import { Generador } from "@/components/generador/Generador";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { cotizacionDe } from "@/modulos/requerimientos/conversion";
import { puedeConvertirRequerimiento, puedeEditarDoc } from "@/nucleo/permisos";
import { rutaDoc } from "@/nucleo/rutas";
import type { TipoDoc } from "@/nucleo/tipos";

/**
 * Página del generador (nuevo o continuar). Con `?id=` solo abre documentos que
 * el usuario puede editar: los suyos en borrador, rechazados o en revisión mientras nadie
 * los haya revisado. Cualquier otro caso (ajeno, aprobado, cerrado o inexistente) se bloquea
 * aunque se escriba la URL.
 */
function Contenido({ tipo }: { tipo: TipoDoc }) {
  const params = useSearchParams();
  const id = params.get("id");
  const demo = useDemo();
  const u = demo.usuario!;
  // Desde un proyecto: ?proyecto=<id> (fija cliente y proyecto) o ?cliente=<id>
  const proyecto = params.get("proyecto") ?? undefined;
  const cliente = params.get("cliente") ?? undefined;
  // Desde la ficha de un equipo: ?equipo=<id> lo deja marcado como atendido
  const equipo = params.get("equipo") ?? undefined;
  // «Empezar uno nuevo» sobre un borrador recuperado: se vuelve a montar el generador en limpio
  const [vuelta, setVuelta] = useState(0);
  // Convertir un requerimiento en cotización: ?requerimiento=<id>. Se decide al abrir: al guardar,
  // el requerimiento queda convertido y no debe cambiar a «ya convertido» mientras se sale al detalle.
  const reqId = tipo === "cotizacion" && !id ? params.get("requerimiento") : null;
  const [conversion] = useState(() => {
    if (!reqId) return null;
    const req = demo.documentos.find((d) => d.id === reqId && d.tipo === "requerimiento");
    const ya = req ? cotizacionDe(req.id, demo.documentos) : undefined;
    return { req, ya, puede: Boolean(req && puedeConvertirRequerimiento(u, req, demo.documentos)) };
  });
  if (conversion) {
    const { req, ya } = conversion;
    if (!req || !conversion.puede) {
      const verYa = ya && demo.visibles.some((d) => d.id === ya.id);
      return (
        <Bloqueo
          titulo={ya ? `${req?.codigo ?? "El requerimiento"} ya se convirtió en la cotización ${ya.codigo}` : "Este requerimiento no se puede convertir"}
          texto={ya ? "Un requerimiento se convierte una sola vez: sigue con esa cotización." : "Lo convierte la administración cuando está en revisión o aprobado, y una sola vez."}
          href={verYa ? rutaDoc(ya!.id, `&desde=doc:${req!.id}`) : req && demo.visibles.some((d) => d.id === req.id) ? rutaDoc(req.id) : "/app/documentos"}
          enlace={verYa ? `Ver la cotización ${ya!.codigo}` : req ? "Ver el requerimiento" : "Ir a documentos"}
        />
      );
    }
    return <Generador key={`rq-${req.id}`} tipo={tipo} desde={req} />;
  }
  if (!id)
    return (
      <Generador
        key={`nuevo-${proyecto ?? ""}-${cliente ?? ""}-${equipo ?? ""}-${vuelta}`}
        tipo={tipo}
        proyectoInicial={proyecto}
        clienteInicial={cliente}
        equipoInicial={equipo}
        onEmpezarNuevo={() => setVuelta((v) => v + 1)}
      />
    );

  const doc = demo.documentos.find((d) => d.id === id && d.tipo === tipo);
  if (!doc || !puedeEditarDoc(u, doc)) {
    const visible = doc && demo.visibles.some((d) => d.id === doc.id);
    return (
      <Bloqueo
        titulo="Este documento no se puede editar"
        texto="Solo su autor lo edita, y solo mientras está en borrador, fue devuelto con observaciones o sigue en revisión sin que nadie lo haya revisado. Lo aprobado o cerrado queda bloqueado para la trazabilidad."
        href={visible ? rutaDoc(doc!.id) : "/app/documentos"}
        enlace={visible ? "Ver el documento" : "Ir a documentos"}
      />
    );
  }
  return <Generador key={id} tipo={tipo} existente={doc} />;
}

/** Aviso de que el generador no se abre, con un enlace a donde seguir. */
function Bloqueo({ titulo, texto, href, enlace }: { titulo: string; texto: string; href: string; enlace: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Lock className="h-5 w-5" />
      </span>
      <p className="mt-4 text-lg font-semibold">{titulo}</p>
      <p className="mt-1 text-sm text-slate-600">{texto}</p>
      <Link href={href} className="mt-5 inline-flex rounded-lg bg-sotec px-4 py-2 text-sm font-medium text-white hover:bg-black">
        {enlace}
      </Link>
    </div>
  );
}

/** Generador del `tipo` dado, dentro de `Suspense` porque `useSearchParams` lo exige al prerenderizar la página. */
export function PaginaGenerador({ tipo }: { tipo: TipoDoc }) {
  return (
    <Suspense>
      <Contenido tipo={tipo} />
    </Suspense>
  );
}
