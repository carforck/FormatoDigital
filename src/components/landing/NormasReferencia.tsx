import { ClipboardList, FileCheck2, HardHat, Landmark } from "lucide-react";

import { Icono, Reveal } from "@/components/fx/Reveal";

/**
 * Normas mencionadas solo como referencia, en texto y con íconos genéricos propios.
 * No se usan logos de ISO ni de certificadoras: su uso está restringido y daría
 * a entender una certificación que la herramienta no otorga.
 */
const NORMAS = [
  { icon: FileCheck2, codigo: "ISO 9001:2015", tema: "Gestión de la calidad", apoyo: "Control documental, versiones, registros y trazabilidad de cada formato." },
  { icon: HardHat, codigo: "ISO 45001:2018", tema: "Seguridad y salud en el trabajo", apoyo: "Permisos de trabajo, identificación de peligros, controles y EPP." },
  { icon: Landmark, codigo: "Decreto 1072 de 2015", tema: "SG-SST en Colombia", apoyo: "Evidencia ordenada del sistema de gestión y conservación de registros." },
  { icon: ClipboardList, codigo: "Resolución 0312 de 2019", tema: "Estándares mínimos del SG-SST", apoyo: "Indicadores y soportes listos para la autoevaluación y las auditorías." },
];

export function NormasReferencia() {
  return (
    <section className="border-y border-slate-200 bg-white py-16">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-sotec-greenDeep">Marco de referencia</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Diseñado para apoyar tu cumplimiento de</h2>
        </Reveal>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NORMAS.map((n, k) => (
            <Reveal key={n.codigo} delay={k * 100}>
              <div className="group flex h-full gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition sm:block sm:p-5 hover:-translate-y-0.5 hover:border-sotec-green hover:bg-white hover:shadow-md">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-sotec-greenDeep transition group-hover:border-sotec group-hover:bg-sotec group-hover:text-sotec-green">
                  <Icono efecto="bounce">
                    <n.icon className="h-5 w-5" />
                  </Icono>
                </span>
                <div className="min-w-0">
                  <p className="font-semibold tracking-tight text-slate-900 sm:mt-4">{n.codigo}</p>
                  <p className="text-sm font-medium text-slate-600">{n.tema}</p>
                  <p className="mt-1.5 text-sm text-slate-500 sm:mt-2">{n.apoyo}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
