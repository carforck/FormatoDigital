"use client";

/**
 * Ruta /app/auditoria: registro de quién hizo qué y cuándo (demo.auditoria de useDemo()).
 * Solo la administración (permiso `auditoria`; AppShell bloquea al resto).
 * Celular: línea de tiempo; escritorio: tabla.
 */
import { Avatar, PageHeader } from "@/components/ui/corporativo";
import { useDemo } from "@/nucleo/datos/DemoProvider";

/** Listado de solo lectura de los eventos de auditoría. */
export default function Auditoria() {
  const demo = useDemo();
  const nombre = (id: string) => demo.usuarios.find((u) => u.id === id)?.nombre ?? id;
  const fecha = (f: string) => f.replace("T", " ").slice(0, 16);
  return (
    <div className="space-y-4">
      <PageHeader etiqueta="Administración" titulo="Auditoría" descripcion="Quién hizo qué y cuándo. Registro inalterable para las auditorías del SGC." />

      {/* Celular: línea de tiempo */}
      <ol className="space-y-2 md:hidden">
        {demo.auditoria.map((a) => (
          <li key={a.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <Avatar nombre={nombre(a.usuarioId)} className="h-8 w-8" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium text-slate-900">{nombre(a.usuarioId)}</span> <span className="text-slate-600">{a.accion.toLowerCase()}</span>{" "}
                <span className="font-mono text-xs text-slate-700">{a.detalle}</span>
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500">{fecha(a.fecha)}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Escritorio: tabla */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Fecha</th>
              <th className="px-4 py-2.5">Usuario</th>
              <th className="px-4 py-2.5">Acción</th>
              <th className="px-4 py-2.5">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {demo.auditoria.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-600">{fecha(a.fecha)}</td>
                <td className="px-4">
                  <span className="flex items-center gap-2">
                    <Avatar nombre={nombre(a.usuarioId)} className="h-7 w-7 text-[10px]" /> {nombre(a.usuarioId)}
                  </span>
                </td>
                <td className="px-4 font-medium text-slate-900">{a.accion}</td>
                <td className="px-4 text-slate-600">{a.detalle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
