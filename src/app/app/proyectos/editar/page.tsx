"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Volver } from "@/components/ui/volver";
import { PageHeader } from "@/components/ui/corporativo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ETIQUETA_ESTADO_PROYECTO } from "@/nucleo/catalogos";
import { ahora, hoy, useDemo } from "@/nucleo/datos/DemoProvider";
import { cop } from "@/nucleo/letras";
import { rutaProyecto } from "@/nucleo/rutas";
import type { EstadoProyecto, Proyecto } from "@/nucleo/tipos";

/** Crear o editar un proyecto (administración y SST). */
function Editar() {
  const demo = useDemo();
  const router = useRouter();
  const params = useSearchParams();
  const u = demo.usuario!;
  const existente = demo.proyectos.find((p) => p.id === params.get("id"));
  const [p, setP] = useState<Proyecto>(() => {
    if (existente) return existente;
    const n = demo.nuevoCodigoProyecto();
    const clienteId = params.get("cliente") ?? "";
    const c = demo.clientes.find((x) => x.id === clienteId);
    return { ...n, nombre: "", clienteId, sitio: c?.sitio ?? "", responsableId: u.id, fechaInicio: hoy(), estado: "activo", descripcion: "", creado: ahora(), actualizado: ahora(), historial: [] };
  });
  const [aviso, setAviso] = useState<string | null>(null);
  const regreso = existente ? rutaProyecto(existente.id) : "/app/proyectos";
  const set = (x: Partial<Proyecto>) => setP((v) => ({ ...v, ...x }));
  // Responsables posibles: el equipo interno activo
  const equipo = demo.usuarios.filter((x) => x.activo && x.rol !== "cliente");
  const campo = "h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm";

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    const error = demo.guardarProyecto(p);
    if (error) return setAviso(error);
    // replace: «atrás» desde el proyecto guardado no reabre el formulario
    router.replace(rutaProyecto(p.id));
  }

  return (
    <div className="max-w-3xl space-y-5">
      <Volver href={regreso} label={existente ? `Volver al proyecto ${existente.codigo}` : "Volver a Proyectos"} />
      <PageHeader
        etiqueta="Gestión · proyecto"
        titulo={
          <>
            {existente ? "Editar" : "Nuevo"} proyecto <span className="font-mono text-base text-slate-500">{p.codigo}</span>
          </>
        }
        descripcion="Los documentos y cuentas de cobro del cliente se agrupan en el proyecto."
      />

      <form onSubmit={guardar} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="text-xs text-slate-500">Nombre del proyecto u obra</span>
          <Input required value={p.nombre} onChange={(e) => set({ nombre: e.target.value })} placeholder="CCTV hornos y patio de secado" />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Cliente</span>
          <select
            required
            className={campo}
            value={p.clienteId}
            onChange={(e) => {
              const c = demo.clientes.find((x) => x.id === e.target.value);
              set({ clienteId: e.target.value, sitio: p.sitio || c?.sitio || "" });
            }}
          >
            <option value="">Selecciona…</option>
            {demo.clientes
              .filter((c) => c.activo !== false || c.id === p.clienteId)
              .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Sitio o ubicación</span>
          <Input value={p.sitio} onChange={(e) => set({ sitio: e.target.value })} placeholder="Área de hornos" />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Responsable</span>
          <select className={campo} value={p.responsableId} onChange={(e) => set({ responsableId: e.target.value })}>
            {equipo.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nombre} · {x.cargo}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Estado</span>
          <select className={campo} value={p.estado} onChange={(e) => set({ estado: e.target.value as EstadoProyecto })}>
            {(Object.keys(ETIQUETA_ESTADO_PROYECTO) as EstadoProyecto[]).map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ESTADO_PROYECTO[e]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Fecha de inicio</span>
          <Input type="date" required value={p.fechaInicio} onChange={(e) => set({ fechaInicio: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Fecha de fin (opcional)</span>
          <Input type="date" value={p.fechaFin ?? ""} min={p.fechaInicio} onChange={(e) => set({ fechaFin: e.target.value || undefined })} />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Presupuesto (COP, opcional)</span>
          <Input type="number" min={0} step={100000} value={p.presupuesto ?? ""} onChange={(e) => set({ presupuesto: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })} />
          {p.presupuesto ? <span className="text-xs text-slate-500">{cop(p.presupuesto)}</span> : null}
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-xs text-slate-500">Descripción y alcance</span>
          <Textarea rows={3} value={p.descripcion} onChange={(e) => set({ descripcion: e.target.value })} />
        </label>
        {aviso && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">{aviso}</p>}
        <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2">
          <p className="mr-auto text-xs text-slate-500">{existente ? "El código no cambia." : "El código se asigna al guardar."}</p>
          <Link href={regreso} className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Cancelar
          </Link>
          <Button type="submit">
            <Save className="h-4 w-4" /> Guardar proyecto
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Editar />
    </Suspense>
  );
}
