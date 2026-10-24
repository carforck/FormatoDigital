"use client";

/**
 * Bloques interactivos de la landing (src/app/page.tsx): vitrina de los
 * formatos digitalizados, acceso a la demo por rol, preguntas frecuentes y
 * formulario de contacto. Usan el DemoProvider (datos ficticios en el navegador).
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown, FileText, HardHat } from "lucide-react";

import { Icono, Tilt } from "@/components/fx/Reveal";
import { PlantillaPermiso } from "@/modulos/permisos/PlantillaPermiso";
import { PlantillaReporte } from "@/modulos/reportes/PlantillaReporte";
import { PERFILES } from "@/nucleo/perfiles";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { cn } from "@/lib/utils";

/**
 * Muestra los dos formatos reales de SOTEC ya digitalizados, renderizando la
 * plantilla con los documentos de ejemplo `d-rt-clay` y `d-pt-clay` de la demo
 * (a escala reducida, sin interacción).
 */
export function VitrinaFormatos() {
  const demo = useDemo();
  const [tab, setTab] = useState<"reporte" | "permiso">("reporte");
  const rt = demo.documentos.find((d) => d.id === "d-rt-clay");
  const pt = demo.documentos.find((d) => d.id === "d-pt-clay");

  const info = {
    reporte: {
      titulo: "FO-GSST-22 · Reporte técnico",
      puntos: [
        "El asistente autocompleta los datos del cliente desde el directorio",
        "Redacción asistida de la descripción en el estilo del formato",
        "Firma del técnico en el celular y del cliente desde su portal",
        "Se cierra solo cuando el cliente firma: sin papeles perdidos",
      ],
    },
    permiso: {
      titulo: "F-GSST-13 · Permiso de trabajo",
      puntos: [
        "Al elegir la actividad se precargan peligros, medidas y EPP",
        "Reglas SST: si hay caída desde altura exige arnés y lista de alturas",
        "Un «NO» en la verificación bloquea el envío del permiso",
        "Firma de cada ejecutor, de quien autoriza y cierre con área limpia",
      ],
    },
  }[tab];

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[360px_1fr]">
      <div>
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          {(["reporte", "permiso"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn("flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition", tab === t ? "bg-sotec text-white shadow" : "text-slate-600 hover:text-slate-900")}
            >
              {t === "reporte" ? <FileText className="h-4 w-4" /> : <HardHat className="h-4 w-4" />}
              {t === "reporte" ? "Reporte técnico" : "Permiso de trabajo"}
            </button>
          ))}
        </div>
        <h3 className="mt-6 text-xl font-semibold">{info.titulo}</h3>
        <ul className="mt-4 space-y-3">
          {info.puntos.map((p) => (
            <li key={p} className="flex gap-2 text-slate-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sotec-green text-sotec">
                <Icono icon={Check} className="h-3.5 w-3.5" />
              </span>{" "}
              {p}
            </li>
          ))}
        </ul>
        <Link href="/acceso" className="icono-nudge mt-6 inline-flex items-center gap-2 rounded-full bg-sotec px-5 py-2.5 text-sm font-semibold text-white hover:bg-black">
          Diligenciar este formato <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-3 text-xs text-slate-500">Mismo código, versión y estructura del formato original: el auditor reconoce el documento.</p>
      </div>
      <Tilt max={5}>
      <div className="relative h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xl sm:h-[620px]">
        <div key={tab} className="pointer-events-none absolute left-1/2 top-4 w-[816px] origin-top -translate-x-1/2 scale-[0.42] animate-in fade-in slide-in-from-bottom-4 duration-500 sm:scale-[0.62] xl:scale-[0.72]">
          {tab === "reporte" && rt?.tipo === "reporte" && <PlantillaReporte datos={rt.datos} codigoDoc={rt.codigo} />}
          {tab === "permiso" && pt?.tipo === "permiso" && <PlantillaPermiso datos={pt.datos} codigoDoc={pt.codigo} />}
        </div>
        <div key={`barra-${tab}`} className="pointer-events-none absolute inset-x-0 top-0 h-1 animate-grow-x origin-left bg-sotec-green" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-100" />
      </div>
      </Tilt>
    </div>
  );
}

/** Tarjetas para entrar a la app con un rol, sin credenciales; cada rol aterriza en su pantalla principal. */
export function AccesoRoles() {
  const demo = useDemo();
  const router = useRouter();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PERFILES.map((p) => (
        <button
          key={p.rol}
          onClick={() => {
            demo.entrarComo(p.rol);
            router.push(p.rol === "tecnico" ? "/app/nuevo/reporte" : p.rol === "supervisor" ? "/app/revision" : "/app");
          }}
          className="group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:-translate-y-1 hover:border-sotec-green hover:bg-white/10"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sotec-green text-sotec">
            <Icono icon={p.icon} efecto="bounce" className="h-5 w-5" />
          </span>
          <span className="mt-4 font-semibold text-white">{p.titulo}</span>
          <span className="text-xs text-white/60">{p.persona}</span>
          <ul className="mt-3 flex-1 space-y-1 text-sm text-white/75">
            {p.puede.slice(0, 3).map((x) => (
              <li key={x} className="flex gap-1.5">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sotec-green" /> {x}
              </li>
            ))}
          </ul>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sotec-green">
            Entrar sin contraseña <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </button>
      ))}
    </div>
  );
}

const PREGUNTAS = [
  ["¿Qué formatos pueden digitalizar?", "Cualquier formato de tu sistema de gestión: permisos de trabajo, ATS, inspecciones, listas de chequeo, reportes técnicos, actas, órdenes de servicio, entrega de dotación, cuentas de cobro… Si existe en papel, Word o Excel, lo convertimos en un formulario guiado con su misma estructura."],
  ["¿El documento sigue siendo válido para la auditoría?", "Sí. Conservamos el código, la versión y la fecha de control documental del formato original, y cada documento guarda quién lo diligenció, aprobó y firmó, con fecha y hora. El PDF sale idéntico al formato aprobado en tu SGC."],
  ["¿Sirve para una empresa pequeña?", "Sí. Puedes empezar con uno o dos formatos críticos, como SOTEC, y sumar más cuando lo necesites. Las empresas grandes agregan áreas, sedes, roles y reglas propias de aprobación."],
  ["¿Funciona en el celular, en campo?", "Sí. El técnico diligencia y firma con el dedo desde el celular; el supervisor aprueba desde donde esté y el cliente firma desde su propio portal."],
  ["¿Qué pasa con nuestros datos?", "En producción cada empresa tiene su base de datos con acceso por roles, copias de seguridad y registro de auditoría. Esta demo guarda datos ficticios solo en tu navegador."],
  ["¿Cuánto tarda la implementación?", "Un formato típico queda listo en una o dos semanas: levantamiento, digitalización fiel, reglas de validación, roles y pruebas con tu equipo."],
] as const;

/** Acordeón de preguntas frecuentes (una abierta a la vez; la primera abierta al cargar). */
export function Faq() {
  const [abierta, setAbierta] = useState<number | null>(0);
  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {PREGUNTAS.map(([q, a], k) => (
        <div key={q}>
          <button onClick={() => setAbierta(abierta === k ? null : k)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium" aria-expanded={abierta === k}>
            {q}
            <ChevronDown className={cn("h-5 w-5 shrink-0 transition", abierta === k && "rotate-180")} />
          </button>
          {abierta === k && <p className="px-5 pb-5 text-slate-600 animate-in fade-in">{a}</p>}
        </div>
      ))}
    </div>
  );
}

/** Formulario de interés (demo: no envía datos a ningún servidor). */
export function Contacto() {
  const [enviado, setEnviado] = useState(false);
  if (enviado) {
    return (
      <div className="rounded-2xl bg-white/10 p-6 text-center text-white">
        <Check className="mx-auto h-10 w-10 rounded-full bg-sotec-green p-2 text-sotec" />
        <p className="mt-3 text-lg font-semibold">¡Gracias! Te contactaremos pronto.</p>
        <p className="text-sm text-white/70">Mientras tanto, recorre la demo con cualquier perfil.</p>
      </div>
    );
  }
  const campo = "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-sotec-green focus:outline-none";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setEnviado(true);
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <input required placeholder="Nombre" className={campo} />
      <input required placeholder="Empresa" className={campo} />
      <input required type="email" placeholder="Correo" className={campo} />
      <select className={campo} defaultValue="">
        <option value="" disabled>
          Tamaño de la empresa
        </option>
        <option className="text-black">1 a 10 personas</option>
        <option className="text-black">11 a 50 personas</option>
        <option className="text-black">51 a 200 personas</option>
        <option className="text-black">Más de 200 personas</option>
      </select>
      <textarea placeholder="¿Qué formatos quieres digitalizar?" rows={3} className={cn(campo, "sm:col-span-2")} />
      <button className="rounded-full bg-sotec-green px-6 py-3 font-semibold text-sotec hover:brightness-110 sm:col-span-2">Solicitar propuesta</button>
    </form>
  );
}
