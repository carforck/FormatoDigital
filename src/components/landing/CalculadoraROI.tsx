"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Building, Building2, Calculator, ChevronDown, Download, Factory, Info, ShieldAlert, Users } from "lucide-react";

import { Contador } from "@/components/fx/Reveal";
import { cn } from "@/lib/utils";

/**
 * Calculadora de retorno (caso de negocio) de digitalizar los formatos del SGC.
 * Todos los supuestos son visibles y editables, con su fuente; el resultado se
 * puede descargar en PDF para presentarlo internamente.
 */

const HORAS_MES = Math.round((42 * 52) / 12); // 182 h: jornada de 42 h/semana (Ley 2101 de 2021, desde julio de 2026)

type Etapa = { clave: string; nombre: string; papel: number; digital: number };
const ETAPAS_BASE: Etapa[] = [
  { clave: "diligenciar", nombre: "Diligenciar el formato", papel: 15, digital: 6 },
  { clave: "firmas", nombre: "Firmas y aprobaciones", papel: 8, digital: 2 },
  { clave: "entrega", nombre: "Entregar, escanear o digitar", papel: 7, digital: 0 },
  { clave: "busqueda", nombre: "Buscarlo para el cliente o la auditoría", papel: 20, digital: 1 },
];

interface Supuestos {
  formatos: number;
  tecnicos: number;
  salario: number;
  factor: number;
  etapas: Etapa[];
  devueltosPapel: number; // %
  devueltosDigital: number; // %
  minCorreccion: number;
  hojas: number;
  costoHoja: number;
  inversion: number; // COP/mes del plan
}

const ESCENARIOS: { nombre: string; icon: typeof Building; d: string; valores: Partial<Supuestos> }[] = [
  { nombre: "Pequeña", icon: Building, d: "≈ 60 formatos/mes · 4 técnicos", valores: { formatos: 60, tecnicos: 4, salario: 2_000_000 } },
  { nombre: "Mediana", icon: Building2, d: "≈ 400 formatos/mes · 20 técnicos", valores: { formatos: 400, tecnicos: 20, salario: 2_500_000 } },
  { nombre: "Grande", icon: Factory, d: "≈ 2.500 formatos/mes · 120 técnicos", valores: { formatos: 2500, tecnicos: 120, salario: 2_800_000 } },
];

const INICIAL: Supuestos = {
  formatos: 400,
  tecnicos: 20,
  salario: 2_500_000,
  factor: 1.52,
  etapas: ETAPAS_BASE,
  devueltosPapel: 38,
  devueltosDigital: 1,
  minCorreccion: 30,
  hojas: 2,
  costoHoja: 250,
  inversion: 0,
};

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Math.round(n));
const num = (n: number, d = 0) => n.toLocaleString("es-CO", { maximumFractionDigits: d, minimumFractionDigits: d });

function calcular(s: Supuestos) {
  const costoHora = (s.salario * s.factor) / HORAS_MES;
  const minPapel = s.etapas.reduce((a, e) => a + e.papel, 0);
  const minDigital = s.etapas.reduce((a, e) => a + e.digital, 0);
  const minGestion = s.formatos * Math.max(0, minPapel - minDigital);
  const minReproceso = s.formatos * (Math.max(0, s.devueltosPapel - s.devueltosDigital) / 100) * s.minCorreccion;
  const horasMes = (minGestion + minReproceso) / 60;
  const tiempo = (minGestion / 60) * costoHora;
  const reprocesos = (minReproceso / 60) * costoHora;
  const papel = s.formatos * s.hojas * s.costoHoja;
  const mensual = tiempo + reprocesos + papel;
  const inversionAnual = s.inversion * 12;
  return {
    costoHora,
    minPapel,
    minDigital,
    horasMes,
    horasPorTecnico: s.tecnicos ? horasMes / s.tecnicos : 0,
    personas: horasMes / HORAS_MES,
    partes: [
      { nombre: "Tiempo de gestión", valor: tiempo * 12, nota: `${num(minPapel - minDigital)} min menos por formato` },
      { nombre: "Reprocesos evitados", valor: reprocesos * 12, nota: `${num(s.devueltosPapel - s.devueltosDigital)} % menos formatos devueltos` },
      { nombre: "Papel, impresión y archivo", valor: papel * 12, nota: `${num(s.formatos * s.hojas * 12)} hojas al año` },
    ],
    mensual,
    anual: mensual * 12,
    hojasAnio: s.formatos * s.hojas * 12,
    roi: inversionAnual > 0 ? (mensual * 12 - inversionAnual) / inversionAnual : null,
    diasPago: s.inversion > 0 && mensual > 0 ? s.inversion / (mensual / 30) : null,
  };
}

function Campo({ label, ayuda, children }: { label: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {ayuda && <span className="block text-xs text-slate-500">{ayuda}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Deslizador({ valor, min, max, paso, onChange, formato }: { valor: number; min: number; max: number; paso: number; onChange: (n: number) => void; formato: (n: number) => string }) {
  return (
    <div className="flex items-center gap-3">
      <input type="range" min={min} max={max} step={paso} value={valor} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#3F7A12]" />
      <input
        type="number"
        min={min}
        value={valor}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        aria-label="Valor exacto"
        className="w-28 shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-sm tabular-nums"
      />
      <span className="sr-only">{formato(valor)}</span>
    </div>
  );
}

export function CalculadoraROI() {
  const [s, setS] = useState<Supuestos>(INICIAL);
  const [escenario, setEscenario] = useState("Mediana");
  const [supuestos, setSupuestos] = useState(false);
  const set = (p: Partial<Supuestos>) => setS((x) => ({ ...x, ...p }));
  const r = useMemo(() => calcular(s), [s]);
  const maxParte = Math.max(1, ...r.partes.map((p) => p.valor));
  const setEtapa = (clave: string, campo: "papel" | "digital", v: number) => set({ etapas: s.etapas.map((e) => (e.clave === clave ? { ...e, [campo]: Math.max(0, v) } : e)) });

  return (
    <div className="space-y-6">
      {/* Escenarios */}
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Escenarios de ejemplo">
        {ESCENARIOS.map((e) => (
          <button
            key={e.nombre}
            onClick={() => {
              setEscenario(e.nombre);
              set(e.valores);
            }}
            aria-pressed={escenario === e.nombre}
            className={cn(
              "group flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
              escenario === e.nombre ? "border-sotec bg-sotec text-white shadow" : "border-slate-200 bg-white text-slate-700 hover:border-sotec-green",
            )}
          >
            <e.icon className={cn("h-4 w-4", escenario === e.nombre ? "text-sotec-green" : "text-slate-400")} />
            <span className="font-semibold">Empresa {e.nombre.toLowerCase()}</span>
            <span className={cn("hidden text-xs sm:inline", escenario === e.nombre ? "text-white/60" : "text-slate-400")}>{e.d}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
        {/* Entradas */}
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-sotec-greenDeep">
            <Calculator className="h-4 w-4" /> Tu operación
          </p>
          <Campo label="Formatos diligenciados al mes" ayuda="Permisos, reportes, inspecciones, actas… de todas las áreas">
            <Deslizador valor={s.formatos} min={10} max={5000} paso={10} onChange={(n) => (setEscenario(""), set({ formatos: n }))} formato={num} />
          </Campo>
          <Campo label="Personas que diligencian formatos" ayuda="Técnicos, supervisores, coordinadores">
            <Deslizador valor={s.tecnicos} min={1} max={300} paso={1} onChange={(n) => (setEscenario(""), set({ tecnicos: n }))} formato={num} />
          </Campo>
          <Campo label="Salario mensual promedio (COP)" ayuda={`Costo hora con prestaciones: ${cop(r.costoHora)} (factor ${num(s.factor, 2)} · ${HORAS_MES} h/mes)`}>
            <Deslizador valor={s.salario} min={1_000_000} max={10_000_000} paso={50_000} onChange={(n) => (setEscenario(""), set({ salario: n }))} formato={cop} />
          </Campo>
          <Campo label="Inversión mensual en la plataforma (COP)" ayuda="Opcional: el valor de tu plan para calcular el retorno">
            <Deslizador valor={s.inversion} min={0} max={10_000_000} paso={50_000} onChange={(n) => set({ inversion: n })} formato={cop} />
          </Campo>

          <button onClick={() => setSupuestos(!supuestos)} aria-expanded={supuestos} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:border-sotec-green">
            Ajustar supuestos con tus propios datos
            <ChevronDown className={cn("h-4 w-4 transition", supuestos && "rotate-180")} />
          </button>
          {supuestos && (
            <div className="space-y-4 animate-in fade-in">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Minutos por formato</th>
                      <th className="px-2 py-2 font-medium">Papel</th>
                      <th className="px-2 py-2 font-medium">Digital</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {s.etapas.map((e) => (
                      <tr key={e.clave}>
                        <td className="px-3 py-1.5 text-slate-700">{e.nombre}</td>
                        {(["papel", "digital"] as const).map((c) => (
                          <td key={c} className="px-2 py-1.5">
                            <input type="number" min={0} value={e[c]} aria-label={`${e.nombre} en ${c}`} onChange={(ev) => setEtapa(e.clave, c, Number(ev.target.value))} className="w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-right tabular-nums" />
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-3 py-1.5">Total</td>
                      <td className="px-2 text-right tabular-nums">{r.minPapel}</td>
                      <td className="px-2 text-right tabular-nums">{r.minDigital}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {(
                  [
                    ["devueltosPapel", "% devueltos en papel", 1],
                    ["devueltosDigital", "% devueltos digital", 1],
                    ["minCorreccion", "Min. para corregir uno", 1],
                    ["factor", "Factor prestacional", 0.01],
                    ["hojas", "Hojas por formato", 1],
                    ["costoHoja", "Costo por hoja (COP)", 10],
                  ] as [keyof Supuestos, string, number][]
                ).map(([k, l, paso]) => (
                  <label key={k} className="block">
                    <span className="text-xs text-slate-500">{l}</span>
                    <input type="number" min={0} step={paso} value={s[k] as number} onChange={(e) => set({ [k]: Math.max(0, Number(e.target.value) || 0) } as Partial<Supuestos>)} className="mt-0.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-right tabular-nums" />
                  </label>
                ))}
              </div>
              <button onClick={() => (setS(INICIAL), setEscenario("Mediana"))} className="text-xs font-medium text-sotec-greenDeep hover:underline">
                Restablecer supuestos
              </button>
            </div>
          )}
        </div>

        {/* Resultados */}
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-3xl bg-sotec p-6 text-white shadow-xl md:p-8">
            <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sotec-green/20 blur-3xl" />
            <p className="relative text-sm text-white/70">Ahorro estimado al año</p>
            <p className="relative mt-1 text-4xl font-semibold tracking-tight text-sotec-green md:text-5xl">
              <Contador valor={r.anual} duracion={700} formato={cop} />
            </p>
            <p className="relative mt-1 text-sm text-white/70">
              {cop(r.mensual)} al mes en tiempo, reprocesos y papel
            </p>
            {r.roi !== null && r.diasPago !== null && (
              <div className="relative mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                <div>
                  <p className="text-xs text-white/60">Retorno sobre la inversión</p>
                  <p className="text-2xl font-semibold tabular-nums">{num(r.roi * 100)} %</p>
                </div>
                <div>
                  <p className="text-xs text-white/60">La plataforma se paga con</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {r.diasPago < 1 ? "menos de 1" : num(Math.ceil(r.diasPago))} día{r.diasPago >= 1.5 ? "s" : ""} <span className="text-sm font-normal text-white/60">de ahorro al mes</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { t: "Horas liberadas al mes", v: <Contador valor={r.horasMes} duracion={700} formato={(n) => num(n)} /> },
              { t: "Equivale a personas de tiempo completo", v: <Contador valor={r.personas} duracion={700} formato={(n) => num(n, 1)} /> },
              { t: "Horas recuperadas por persona al mes", v: <Contador valor={r.horasPorTecnico} duracion={700} formato={(n) => num(n, 1)} /> },
            ].map((k) => (
              <div key={k.t} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-2xl font-semibold tracking-tight text-slate-900">{k.v}</p>
                <p className="text-xs text-slate-500">{k.t}</p>
              </div>
            ))}
          </div>

          {/* Desglose: barras horizontales etiquetadas (un solo color; la etiqueta identifica) */}
          <figure className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <figcaption className="text-sm font-semibold text-slate-900">¿De dónde sale el ahorro? (al año)</figcaption>
            <ul className="mt-3 space-y-3">
              {r.partes.map((p) => (
                <li key={p.nombre}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-slate-700">{p.nombre}</span>
                    <span className="font-semibold tabular-nums text-slate-900">{cop(p.valor)}</span>
                  </div>
                  <div className="mt-1 h-2.5 rounded-full bg-slate-100">
                    <div className="h-2.5 rounded-full bg-[#4E9A2A] transition-[width] duration-500" style={{ width: `${Math.max(1.5, (p.valor / maxParte) * 100)}%` }} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{p.nota}</p>
                </li>
              ))}
            </ul>
          </figure>

          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              <strong>Lo que no sumamos y pesa más:</strong> incumplir el SG-SST puede acarrear multas graduadas por el Decreto 1072 de 2015 e incluso el cierre de la obra (Ley 1610 de 2013). Con permisos que no se envían si falta el arnés o la verificación, ese riesgo baja.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={() => window.print()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:border-sotec-green">
              <Download className="h-4 w-4" /> Descargar el caso de negocio (PDF)
            </button>
            <a href="#contacto" className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-sotec px-5 py-3 text-sm font-semibold text-white hover:bg-black">
              Validar estos números con un asesor <ArrowRight className="h-4 w-4 text-sotec-green transition group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </div>

      {/* Metodología y fuentes */}
      <details className="group rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-900">
          <Info className="h-4 w-4 text-sotec-greenDeep" /> Cómo lo calculamos y de dónde salen los supuestos
          <ChevronDown className="ml-auto h-4 w-4 transition group-open:rotate-180" />
        </summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Costo hora</strong> = salario × factor prestacional ÷ {HORAS_MES} h. Las {HORAS_MES} horas salen de la jornada máxima de <strong>42 h semanales</strong> vigente desde julio de 2026 (Ley 2101 de 2021).
            </li>
            <li>
              <strong>Factor prestacional {num(s.factor, 2)}</strong>: estimación usual del costo total de un empleado en Colombia (prestaciones sociales, seguridad social y parafiscales sobre el salario). Ajústalo con el dato de tu nómina.
            </li>
            <li>
              <strong>Tiempo de gestión</strong> = formatos × (minutos en papel − minutos digital) por etapa: diligenciar, firmar, entregar o digitar, y buscar.
            </li>
            <li>
              <strong>Reprocesos</strong> = formatos × (% devueltos en papel − % digital) × minutos para corregir. El asistente no deja avanzar con campos vacíos o inválidos.
            </li>
            <li>
              <strong>Papel</strong> = formatos × hojas × costo por hoja (impresión, copias y archivo físico).
            </li>
          </ul>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Los tiempos por etapa son una <strong>referencia de piloto</strong>. Para tu caso, cronometra 5 formatos reales y reemplaza los valores en «Ajustar supuestos»: el cálculo se actualiza al instante.
            </li>
            <li>
              <strong>Retorno</strong> = (ahorro anual − inversión anual) ÷ inversión anual. <strong>Días para pagarse</strong> = inversión mensual ÷ ahorro diario.
            </li>
            <li>No incluye beneficios difíciles de cuantificar: menos multas y paradas de obra, mejor servicio al cliente, auditorías más rápidas y decisiones con indicadores.</li>
            <li>Es una estimación para decidir; no es una oferta ni una garantía de resultados.</li>
          </ul>
        </div>
      </details>

      {/* Versión imprimible: caso de negocio en una hoja */}
      <div className="doc-zona hidden print:block" aria-hidden>
        <article className="doc-print bg-white p-8 text-[12px] text-black">
          <div className="flex items-center justify-between border-b-2 border-black pb-2">
            <p className="text-lg font-bold">Caso de negocio · Digitalización de formatos del SGC</p>
            <p className="text-xs">FormatoDigital</p>
          </div>
          <p className="mt-3">
            Escenario: {num(s.formatos)} formatos al mes · {num(s.tecnicos)} personas · salario promedio {cop(s.salario)} · factor prestacional {num(s.factor, 2)} · {HORAS_MES} h/mes.
          </p>
          <table className="mt-4 w-full border-collapse text-[12px]">
            <tbody>
              {[
                ["Ahorro estimado al año", cop(r.anual)],
                ["Ahorro estimado al mes", cop(r.mensual)],
                ["Horas liberadas al mes", num(r.horasMes)],
                ["Equivalente en personas de tiempo completo", num(r.personas, 1)],
                ["Hojas de papel evitadas al año", num(r.hojasAnio)],
                ...r.partes.map((p) => [`· ${p.nombre}`, cop(p.valor)]),
                ...(r.roi !== null && r.diasPago !== null
                  ? [
                      ["Inversión mensual en la plataforma", cop(s.inversion)],
                      ["Retorno sobre la inversión (anual)", `${num(r.roi * 100)} %`],
                      ["Se paga con (días de ahorro al mes)", num(Math.ceil(r.diasPago))],
                    ]
                  : []),
              ].map(([a, b]) => (
                <tr key={a}>
                  <td className="border border-black px-2 py-1">{a}</td>
                  <td className="border border-black px-2 py-1 text-right font-semibold">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 font-semibold">Minutos por formato (papel → digital)</p>
          <ul className="mt-1 list-disc pl-5">
            {s.etapas.map((e) => (
              <li key={e.clave}>
                {e.nombre}: {e.papel} → {e.digital}
              </li>
            ))}
            <li>
              Formatos devueltos por errores: {s.devueltosPapel} % → {s.devueltosDigital} % · {s.minCorreccion} min por corrección
            </li>
            <li>
              Papel: {s.hojas} hoja(s) por formato a {cop(s.costoHoja)} c/u
            </li>
          </ul>
          <p className="mt-4 text-[10.5px]">
            Supuestos: jornada de 42 h semanales (Ley 2101 de 2021); costo hora = salario × factor prestacional ÷ {HORAS_MES} h. Tiempos de referencia de piloto, ajustables con mediciones propias. No incluye el
            riesgo de multas del SG-SST (Decreto 1072 de 2015) ni el cierre de obras (Ley 1610 de 2013). Estimación para decidir; no constituye oferta ni garantía.
          </p>
        </article>
      </div>
    </div>
  );
}
