"use client";

import { useDemo } from "@/lib/store";

export default function Auditoria() {
  const demo = useDemo();
  const nombre = (id: string) => demo.usuarios.find((u) => u.id === id)?.nombre ?? id;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Auditoría</h1>
        <p className="text-sm text-slate-500">Quién hizo qué y cuándo. Registro inalterable para las auditorías del SGC.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Usuario</th>
              <th className="px-4 py-2">Acción</th>
              <th className="px-4 py-2">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {demo.auditoria.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">{a.fecha.replace("T", " ").slice(0, 16)}</td>
                <td className="px-4">{nombre(a.usuarioId)}</td>
                <td className="px-4 font-medium">{a.accion}</td>
                <td className="px-4 text-slate-600">{a.detalle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
