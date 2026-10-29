"use client";

/**
 * Configuración · «Tipos de proyecto y formato»: la lista de tipos de proyecto que se
 * eligen en el formulario de proyecto, cada uno con su variante de formato
 * (@/nucleo/variantes). P. ej. «Servicios Fortox» → los reportes de esos proyectos salen
 * en el formato de FORTOX. La administración agrega tipos, cambia su formato y quita los
 * que no usa ningún proyecto. Se guarda al instante (demo.guardarTiposProyecto). Cambiar
 * el formato de un tipo no cambia los documentos ya guardados (cada uno guarda el suyo).
 */
import { useState } from "react";
import { Layers, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { TIPO_PROYECTO_BASE, VARIANTES, VARIANTE_BASE, tiposProyectoDe, varianteDe, type TipoProyecto } from "@/nucleo/variantes";

const sel = "h-10 rounded-md border border-slate-200 bg-white px-2 text-sm";

export function TiposProyecto() {
  const demo = useDemo();
  const tipos = tiposProyectoDe(demo.config);
  const [nombre, setNombre] = useState("");
  const [variante, setVariante] = useState(VARIANTE_BASE);
  const [aviso, setAviso] = useState<string | null>(null);
  const usos = (t: TipoProyecto) => demo.proyectos.filter((p) => p.tipo?.toLowerCase() === t.nombre.toLowerCase()).length;
  const guardar = (lista: TipoProyecto[]) => {
    demo.guardarTiposProyecto(lista);
    setAviso(null);
  };

  function agregar(e: React.FormEvent) {
    e.preventDefault();
    const n = nombre.trim();
    if (!n) return;
    if (tipos.some((t) => t.nombre.toLowerCase() === n.toLowerCase())) return setAviso(`«${n}» ya está en la lista.`);
    guardar([...tipos, { nombre: n, variante }]);
    setNombre("");
  }

  return (
    <section aria-labelledby="titulo-tipos-proyecto" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 id="titulo-tipos-proyecto" className="flex items-center gap-2 font-semibold">
        <Layers className="h-4 w-4 text-sotec-greenDeep" /> Tipos de proyecto y formato
      </h2>
      <p className="text-sm text-slate-500">
        Cada tipo define con qué formato salen los documentos de sus proyectos (encabezado, logo, código y pie). Los documentos ya guardados conservan el formato con el que se
        crearon.
      </p>
      <ul className="mt-3 divide-y divide-slate-100">
        {tipos.map((t, k) => {
          const n = usos(t);
          const v = varianteDe(t.variante);
          return (
            <li key={t.nombre} className="flex flex-wrap items-center gap-2 py-2">
              <span className="min-w-0 flex-1 break-words text-sm font-medium text-slate-900">
                {t.nombre}
                <span className="ml-2 text-xs font-normal text-slate-500">{n ? `${n} proyecto(s)` : "sin proyectos"}</span>
                {v.provisional && <span className="ml-2 text-xs font-normal text-amber-700">formato provisional</span>}
              </span>
              <select
                aria-label={`Formato de ${t.nombre}`}
                className={sel}
                value={v.clave}
                onChange={(e) => guardar(tipos.map((x, j) => (j === k ? { ...x, variante: e.target.value } : x)))}
              >
                {VARIANTES.map((x) => (
                  <option key={x.clave} value={x.clave}>
                    Formato {x.marca}
                  </option>
                ))}
              </select>
              {/* Se quita solo si ningún proyecto lo usa; el tipo base no se quita */}
              {t.nombre !== TIPO_PROYECTO_BASE && (
                <button
                  type="button"
                  aria-label={`Quitar ${t.nombre}`}
                  title={n ? "Lo usan proyectos: cámbiales el tipo primero" : "Quitar"}
                  disabled={n > 0}
                  onClick={() => guardar(tipos.filter((_, j) => j !== k))}
                  className="rounded p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <form onSubmit={agregar} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-[12rem] flex-1 text-sm">
          <span className="text-xs text-slate-500">Nuevo tipo de proyecto</span>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Servicios para otra empresa" />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-slate-500">Formato</span>
          <select aria-label="Formato del nuevo tipo" className={sel} value={variante} onChange={(e) => setVariante(e.target.value)}>
            {VARIANTES.map((x) => (
              <option key={x.clave} value={x.clave}>
                Formato {x.marca}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="outline" disabled={!nombre.trim()}>
          <Plus className="h-4 w-4" /> Agregar tipo
        </Button>
      </form>
      {aviso && <p className="mt-2 text-sm text-amber-800">{aviso}</p>}
    </section>
  );
}
