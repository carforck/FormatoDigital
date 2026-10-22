"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";

import { Generador } from "@/components/generador/Generador";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { puedeEditarDoc } from "@/nucleo/permisos";
import { rutaDoc } from "@/nucleo/rutas";
import type { TipoDoc } from "@/nucleo/tipos";

/**
 * Página del generador (nuevo o continuar). Con `?id=` solo abre documentos que
 * el usuario puede editar: los suyos en borrador o rechazados. Cualquier otro
 * caso (ajeno, enviado, cerrado o inexistente) se bloquea aunque se escriba la URL.
 */
function Contenido({ tipo }: { tipo: TipoDoc }) {
  const id = useSearchParams().get("id");
  const demo = useDemo();
  const u = demo.usuario!;
  if (!id) return <Generador key="nuevo" tipo={tipo} />;

  const doc = demo.documentos.find((d) => d.id === id && d.tipo === tipo);
  if (!doc || !puedeEditarDoc(u, doc)) {
    const visible = doc && demo.visibles.some((d) => d.id === doc.id);
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Lock className="h-5 w-5" />
        </span>
        <p className="mt-4 text-lg font-semibold">Este documento no se puede editar</p>
        <p className="mt-1 text-sm text-slate-600">Solo su autor lo edita, y solo mientras está en borrador o fue devuelto con observaciones. Lo enviado, aprobado o cerrado queda bloqueado para la trazabilidad.</p>
        <Link href={visible ? rutaDoc(doc!.id) : "/app/documentos"} className="mt-5 inline-flex rounded-lg bg-sotec px-4 py-2 text-sm font-medium text-white hover:bg-black">
          {visible ? "Ver el documento" : "Ir a documentos"}
        </Link>
      </div>
    );
  }
  return <Generador key={id} tipo={tipo} existente={doc} />;
}

export function PaginaGenerador({ tipo }: { tipo: TipoDoc }) {
  return (
    <Suspense>
      <Contenido tipo={tipo} />
    </Suspense>
  );
}
