/**
 * Ruta /imprimir (servidor): fija el título de la página desde ?t= —el consecutivo del
 * documento— para que el PDF se descargue con ese nombre en cualquier navegador o
 * celular desde el primer instante (algunos toman el título antes de que la parte de
 * cliente lo cambie). El contenido lo dibuja ImprimirCliente con los datos del navegador.
 */
import type { Metadata } from "next";

import { tituloArchivo } from "@/nucleo/impresion";

import { ImprimirCliente } from "./ImprimirCliente";

export function generateMetadata({ searchParams }: { searchParams: { t?: string | string[] } }): Metadata {
  const t = tituloArchivo([Array.isArray(searchParams.t) ? searchParams.t[0] : searchParams.t]);
  return { title: { absolute: t || "Imprimir documento" } };
}

export default function Page() {
  return <ImprimirCliente />;
}
