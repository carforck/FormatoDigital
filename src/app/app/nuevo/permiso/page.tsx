"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Generador } from "@/components/generador/Generador";
import { useDemo } from "@/nucleo/datos/DemoProvider";

function Contenido() {
  const id = useSearchParams().get("id");
  const demo = useDemo();
  const existente = id ? demo.documentos.find((d) => d.id === id && d.tipo === "permiso") : undefined;
  return <Generador key={id ?? "nuevo"} tipo="permiso" existente={existente} />;
}

export default function Page() {
  return (
    <Suspense>
      <Contenido />
    </Suspense>
  );
}
