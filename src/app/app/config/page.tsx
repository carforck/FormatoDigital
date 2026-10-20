"use client";

import { useState } from "react";
import { RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FORMATOS } from "@/lib/formatos";
import { CONFIG_SEED } from "@/lib/seed";
import { useDemo } from "@/lib/store";

export default function Config() {
  const demo = useDemo();
  const [c, setC] = useState(demo.config);
  const [ok, setOk] = useState(false);
  const yy = new Date().getFullYear().toString().slice(2);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-slate-500">Control documental de los formatos y reglas del flujo.</p>
      </div>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-xs text-slate-500">Empresa</span>
          <Input value={c.empresa} onChange={(e) => setC({ ...c, empresa: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">NIT</span>
          <Input value={c.nit} onChange={(e) => setC({ ...c, nit: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">Prefijo {FORMATOS.reporte.codigo}</span>
          <Input value={c.prefijoReporte} maxLength={4} onChange={(e) => setC({ ...c, prefijoReporte: e.target.value.toUpperCase() })} />
          <span className="text-xs text-slate-500">Próximo: {c.prefijoReporte}-NNN-{yy}</span>
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">Prefijo {FORMATOS.permiso.codigo}</span>
          <Input value={c.prefijoPermiso} maxLength={4} onChange={(e) => setC({ ...c, prefijoPermiso: e.target.value.toUpperCase() })} />
          <span className="text-xs text-slate-500">Próximo: {c.prefijoPermiso}-NNN-{yy}</span>
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">Vigencia del permiso (horas)</span>
          <Input type="number" min={1} max={24} value={c.vigenciaPermisoHoras} onChange={(e) => setC({ ...c, vigenciaPermisoHoras: Number(e.target.value) })} />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" checked={c.exigirFirmaCliente} onChange={(e) => setC({ ...c, exigirFirmaCliente: e.target.checked })} />
          Exigir firma del cliente para cerrar el reporte
        </label>
        <div className="flex items-center justify-end gap-2 sm:col-span-2">
          {ok && <span className="text-sm text-emerald-700">Guardado</span>}
          <Button
            onClick={() => {
              demo.actualizarConfig(c);
              setOk(true);
            }}
          >
            <Save className="h-4 w-4" /> Guardar
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Formatos digitalizados</h2>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {Object.values(FORMATOS).map((f) => (
            <li key={f.codigo} className="flex justify-between py-2">
              <span>
                <strong>{f.codigo}</strong> · {f.nombre}
              </span>
              <span className="text-slate-500">
                v{f.version} · {f.fecha}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <h2 className="font-semibold text-rose-900">Restablecer la demo</h2>
        <p className="text-sm text-rose-800">Vuelve a los datos de ejemplo iniciales. Útil antes de cada presentación.</p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => {
            if (confirm("¿Restablecer todos los datos de la demo?")) {
              demo.reiniciar();
              setC(CONFIG_SEED);
            }
          }}
        >
          <RotateCcw className="h-4 w-4" /> Restablecer datos
        </Button>
      </section>
    </div>
  );
}
