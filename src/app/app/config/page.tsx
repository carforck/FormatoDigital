"use client";

/**
 * Ruta /app/config: datos de la empresa, prefijos de consecutivos, vigencia de permisos,
 * datos bancarios e IVA de las cuentas de cobro y reglas del flujo; lista los módulos y
 * formatos de @/modulos/registro. Solo la administración (permiso `config`). En modo demo
 * permite restablecer los datos de ejemplo.
 */
import { useState } from "react";
import { RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/corporativo";
import { Input } from "@/components/ui/input";
import { MODULOS, TIPOS_DOC, formatoDe, prefijoDe } from "@/modulos/registro";
import { CONFIG_SEED } from "@/nucleo/datos/seed";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { OpcionesAgregadas } from "@/components/config/OpcionesAgregadas";

/** Formulario local (copia de demo.config) que se aplica con demo.actualizarConfig al guardar. */
export default function Config() {
  const demo = useDemo();
  const [c, setC] = useState(demo.config);
  const [ok, setOk] = useState(false);
  const yy = new Date().getFullYear().toString().slice(2);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader etiqueta="Administración" titulo="Configuración" descripcion="Control documental de los formatos y reglas del flujo." />

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-xs text-slate-500">Empresa</span>
          <Input value={c.empresa} onChange={(e) => setC({ ...c, empresa: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">NIT</span>
          <Input value={c.nit} onChange={(e) => setC({ ...c, nit: e.target.value })} />
        </label>
        {/* Un prefijo por formato registrado (los módulos nuevos aparecen solos) */}
        {TIPOS_DOC.map((t) => {
          const valor = prefijoDe(c, t);
          // Reporte, permiso y gasto tienen campo propio en Config (legado); los demás tipos van en `prefijos`
          const cambiar = (v: string) => {
            const p = v.toUpperCase();
            if (t === "reporte") return setC({ ...c, prefijoReporte: p });
            if (t === "permiso") return setC({ ...c, prefijoPermiso: p });
            if (t === "gasto") return setC({ ...c, prefijoGasto: p });
            setC({ ...c, prefijos: { ...c.prefijos, [t]: p } });
          };
          return (
            <label key={t} className="text-sm">
              <span className="text-xs text-slate-500">
                Prefijo {formatoDe(t).corto.toLowerCase()} · {formatoDe(t).codigo}
              </span>
              <Input value={valor} maxLength={4} onChange={(e) => cambiar(e.target.value)} />
              <span className="text-xs text-slate-500">
                Próximo: {valor}-NNN-{yy}
              </span>
            </label>
          );
        })}
        <label className="text-sm">
          <span className="text-xs text-slate-500">Prefijo de proyecto</span>
          <Input value={c.prefijoProyecto ?? "PRY"} maxLength={4} onChange={(e) => setC({ ...c, prefijoProyecto: e.target.value.toUpperCase() })} />
          <span className="text-xs text-slate-500">Próximo: {c.prefijoProyecto ?? "PRY"}-NNN-{yy}</span>
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">Vigencia del permiso (horas)</span>
          <Input type="number" min={1} max={24} value={c.vigenciaPermisoHoras} onChange={(e) => setC({ ...c, vigenciaPermisoHoras: Number(e.target.value) })} />
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">Prefijo cuenta de cobro</span>
          <Input value={c.prefijoCobro} maxLength={4} onChange={(e) => setC({ ...c, prefijoCobro: e.target.value.toUpperCase() })} />
          <span className="text-xs text-slate-500">Próximo: {c.prefijoCobro}-NNN-{yy}</span>
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">Ciudad (encabezado de la cuenta)</span>
          <Input value={c.ciudad} onChange={(e) => setC({ ...c, ciudad: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">IVA por defecto (%)</span>
          <Input type="number" min={0} max={100} value={c.ivaPorcentaje} onChange={(e) => setC({ ...c, ivaPorcentaje: Number(e.target.value) })} />
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">Banco</span>
          <Input value={c.banco} onChange={(e) => setC({ ...c, banco: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">Tipo de cuenta</span>
          <select value={c.tipoCuenta} onChange={(e) => setC({ ...c, tipoCuenta: e.target.value })} className="h-10 w-full rounded-md border border-slate-200 bg-white px-2">
            <option>Ahorros</option>
            <option>Corriente</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">Número de cuenta</span>
          <Input value={c.numeroCuenta} onChange={(e) => setC({ ...c, numeroCuenta: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">Titular de la cuenta</span>
          <Input value={c.titularCuenta} onChange={(e) => setC({ ...c, titularCuenta: e.target.value })} />
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

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Módulos de la plataforma</h2>
        <p className="text-sm text-slate-500">Todos comparten el núcleo y se unen a través de la orden de servicio.</p>
        <ul className="mt-3 divide-y divide-slate-100">
          {MODULOS.map((m) => (
            <li key={m.clave} className="flex flex-wrap items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">
                  {m.nombre}
                  {m.formato && <span className="ml-2 font-mono text-xs text-slate-500">{m.formato}</span>}
                </p>
                <p className="text-sm text-slate-600">{m.descripcion}</p>
              </div>
              <span
                className={
                  m.estado === "activo"
                    ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200"
                    : m.estado === "en_construccion"
                      ? "rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200"
                      : "rounded-full border border-dashed border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                }
              >
                {m.estado === "activo" ? "Activo" : m.estado === "en_construccion" ? "En construcción" : "Planeado"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Formatos digitalizados</h2>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {TIPOS_DOC.map(formatoDe).map((f) => (
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

      <OpcionesAgregadas />

      {demo.modo === "demo" && (
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
      )}
    </div>
  );
}
