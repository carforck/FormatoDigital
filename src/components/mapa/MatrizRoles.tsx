"use client";

/**
 * Pestaña «Roles y permisos» del Mapa del sistema (src/app/app/mapa/page.tsx):
 * tabla acción × rol generada en vivo desde la matriz de permisos del núcleo.
 */
import { Check, Minus } from "lucide-react";

import { ETIQUETA_ROL } from "@/nucleo/catalogos";
import { ACCIONES, DESCRIPCION_ACCION, puede } from "@/nucleo/permisos";
import type { Rol } from "@/nucleo/tipos";

/** Matriz rol → acción leída de `src/nucleo/permisos.ts` (una acción nueva aparece sola). */
export default function MatrizRoles() {
  const roles = Object.keys(ETIQUETA_ROL) as Rol[];
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        {roles.length} roles y {ACCIONES.length} acciones, leídos de la matriz de <code className="rounded bg-slate-100 px-1 text-xs">src/nucleo/permisos.ts</code>. La base de datos aplica las mismas reglas con RLS.
      </p>
      <div className="relative overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">Permisos por rol: una fila por acción, una columna por rol</caption>
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Acción</th>
              {roles.map((r) => (
                <th key={r} scope="col" className="px-3 py-2.5 text-center font-medium">
                  <span className="block text-slate-800">{ETIQUETA_ROL[r]}</span>
                  <span className="font-normal">{ACCIONES.filter((a) => puede(r, a)).length} de {ACCIONES.length}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ACCIONES.map((a) => (
              <tr key={a}>
                <th scope="row" className="px-4 py-2 font-normal">
                  <span className="block text-slate-800">{DESCRIPCION_ACCION[a]}</span>
                  <code className="text-[11px] text-slate-500">{a}</code>
                </th>
                {roles.map((r) => (
                  <td key={r} className="px-3 py-2 text-center">
                    {puede(r, a) ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sotec-soft text-sotec-greenDeep" title={`${ETIQUETA_ROL[r]}: sí`}>
                        <Check className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only">Sí</span>
                      </span>
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center text-slate-300" title={`${ETIQUETA_ROL[r]}: no`}>
                        <Minus className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only">No</span>
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
        <li className="rounded-lg border border-slate-200 bg-white p-3">
          <strong className="text-slate-800">Separación de funciones:</strong> solo el autor edita y envía su documento (en borrador o rechazado) y nadie aprueba lo propio.
        </li>
        <li className="rounded-lg border border-slate-200 bg-white p-3">
          <strong className="text-slate-800">Cliente:</strong> ve solo los documentos aprobados o cerrados de su empresa, nunca los formatos internos (gastos), y sus cuentas ya emitidas.
        </li>
      </ul>
    </div>
  );
}
