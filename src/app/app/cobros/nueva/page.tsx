"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Plus, Save, Stamp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Volver, useOrigen } from "@/components/ui/volver";
import { PageHeader } from "@/components/ui/corporativo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlantillaCuentaCobro } from "@/modulos/cobros/PlantillaCuentaCobro";
import { totales, type CuentaCobro, type ItemCuentaCobro } from "@/modulos/cobros/tipos";
import { ahora, hoy, useDemo } from "@/nucleo/datos/DemoProvider";
import { cop } from "@/nucleo/letras";
import { rutaCuenta } from "@/nucleo/rutas";

function Nueva() {
  const demo = useDemo();
  const router = useRouter();
  const params = useSearchParams();
  const u = demo.usuario!;
  const existente = demo.cuentas.find((c) => c.id === params.get("id") && c.estado === "borrador");
  const origen = useOrigen(existente ? { href: rutaCuenta(existente.id), label: existente.codigo } : { href: "/app/cobros", label: "Cuentas de cobro" });

  const [cuenta, setCuenta] = useState<CuentaCobro>(() => {
    if (existente) return existente;
    const n = demo.nuevoCodigoCuenta();
    // Desde un proyecto: ?proyecto=<id> fija el cliente del proyecto
    const proyecto = demo.proyectosVisibles.find((p) => p.id === params.get("proyecto"));
    const clienteId = proyecto?.clienteId ?? params.get("cliente") ?? "";
    // Solo se precarga un reporte cobrable: aprobado o cerrado, del cliente y sin otra cuenta activa
    const rep = demo.documentos.find(
      (d) => d.id === params.get("reporte") && d.tipo === "reporte" && (d.estado === "aprobado" || d.estado === "cerrado") && d.clienteId === clienteId && !demo.cuentaDeReporte(d.id),
    );
    const items: ItemCuentaCobro[] = rep && rep.tipo === "reporte" ? [{ id: `i-${rep.id}`, documentoId: rep.id, descripcion: rep.datos.asunto, cantidad: 1, valorUnitario: 0 }] : [];
    return {
      ...n,
      clienteId,
      proyectoId: proyecto?.id ?? (rep?.proyectoId || undefined),
      fecha: hoy(),
      concepto: rep && rep.tipo === "reporte" ? `Servicio técnico: ${rep.datos.asunto}` : proyecto ? proyecto.nombre : "",
      items,
      ivaPorcentaje: demo.config.ivaPorcentaje,
      notas: "Pago a 30 días.",
      estado: "borrador",
      creadoPor: u.id,
      creado: ahora(),
      actualizado: ahora(),
      historial: [],
    };
  });
  const [aviso, setAviso] = useState<string | null>(null);
  const set = (p: Partial<CuentaCobro>) => setCuenta((c) => ({ ...c, ...p }));
  const setItem = (id: string, p: Partial<ItemCuentaCobro>) => set({ items: cuenta.items.map((i) => (i.id === id ? { ...i, ...p } : i)) });

  // Reportes del cliente que se pueden cobrar: aprobados o cerrados y sin otra cuenta activa
  const reportes = useMemo(
    () =>
      demo.documentos.filter((d) => {
        if (d.tipo !== "reporte" || d.clienteId !== cuenta.clienteId || !["aprobado", "cerrado"].includes(d.estado)) return false;
        // Con proyecto, solo los reportes de ese proyecto
        if (cuenta.proyectoId && d.proyectoId !== cuenta.proyectoId) return false;
        const otra = demo.cuentaDeReporte(d.id);
        return !otra || otra.id === cuenta.id;
      }),
    [demo, cuenta.clienteId, cuenta.id, cuenta.proyectoId],
  );
  const incluido = (docId: string) => cuenta.items.some((i) => i.documentoId === docId);
  const { total } = totales(cuenta);

  function guardar(emitir: boolean) {
    if (!cuenta.clienteId) return setAviso("Elige el cliente.");
    if (!cuenta.concepto.trim()) return setAviso("Escribe el concepto.");
    if (emitir && (cuenta.items.length === 0 || cuenta.items.some((i) => !i.descripcion.trim() || i.valorUnitario <= 0 || i.cantidad <= 0))) {
      return setAviso("Para emitir, cada ítem necesita descripción, cantidad y valor mayor que cero.");
    }
    const error = demo.guardarCuenta(cuenta);
    if (error) return setAviso(error);
    if (emitir) demo.cambiarEstadoCuenta(cuenta.id, "emitida");
    // replace: «atrás» desde la cuenta guardada no reabre el formulario
    router.replace(`${rutaCuenta(cuenta.id)}${origen.query ? `&${origen.query}` : ""}`);
  }

  return (
    <div className="space-y-5">
      <Volver href={origen.href} label={origen.label} />
      <PageHeader
        etiqueta="Finanzas · cuenta de cobro"
        titulo={
          <>
            {existente ? "Editar" : "Nueva"} cuenta de cobro <span className="font-mono text-base text-slate-500">{cuenta.codigo}</span>
          </>
        }
        descripcion="Elige el cliente, marca los reportes que vas a cobrar y pon el valor de cada uno."
      />

      <div className="grid gap-5 xl:grid-cols-[420px_1fr] [&>*]:min-w-0">
        <div className="space-y-4">
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="block text-sm">
              <span className="text-xs text-slate-500">Cliente</span>
              <select value={cuenta.clienteId} onChange={(e) => set({ clienteId: e.target.value, proyectoId: undefined, items: cuenta.items.filter((i) => !i.documentoId) })} className="h-10 w-full rounded-md border border-slate-200 bg-white px-2">
                <option value="">Selecciona…</option>
                {demo.clientes
                  .filter((c) => c.activo !== false || c.id === cuenta.clienteId)
                  .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs text-slate-500">Proyecto (opcional)</span>
              <select
                value={cuenta.proyectoId ?? ""}
                onChange={(e) => set({ proyectoId: e.target.value || undefined, items: cuenta.items.filter((i) => !i.documentoId) })}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-2"
              >
                <option value="">Sin proyecto</option>
                {demo.proyectosVisibles
                  .filter((p) => p.clienteId === cuenta.clienteId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} · {p.nombre}
                    </option>
                  ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-xs text-slate-500">Fecha</span>
                <Input type="date" value={cuenta.fecha} onChange={(e) => set({ fecha: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-xs text-slate-500">IVA %</span>
                <Input type="number" min={0} max={100} value={cuenta.ivaPorcentaje} onChange={(e) => set({ ivaPorcentaje: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-xs text-slate-500">Concepto</span>
              <Input value={cuenta.concepto} onChange={(e) => set({ concepto: e.target.value })} placeholder="Mantenimiento CCTV octubre" />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="font-semibold text-slate-900">Reportes técnicos {cuenta.proyectoId ? "del proyecto" : "del cliente"}</p>
            <p className="text-xs text-slate-500">Aprobados o cerrados que aún no se han cobrado.</p>
            {!cuenta.clienteId ? (
              <p className="mt-3 text-sm text-slate-500">Elige un cliente para ver sus reportes.</p>
            ) : reportes.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Este cliente no tiene reportes pendientes de cobro.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {reportes.map((r) =>
                  r.tipo !== "reporte" ? null : (
                    <li key={r.id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-2.5 hover:border-sotec-green">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={incluido(r.id)}
                          onChange={(e) =>
                            set({
                              items: e.target.checked
                                ? [...cuenta.items, { id: `i-${r.id}`, documentoId: r.id, descripcion: r.datos.asunto, cantidad: 1, valorUnitario: 0 }]
                                : cuenta.items.filter((i) => i.documentoId !== r.id),
                            })
                          }
                        />
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="flex items-center gap-1.5 font-medium text-slate-900">
                            <FileText className="h-3.5 w-3.5 text-slate-400" /> <span className="font-mono">{r.codigo}</span>
                          </span>
                          <span className="block truncate text-slate-600">{r.datos.asunto}</span>
                        </span>
                      </label>
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>

          <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">Ítems</p>
              <Button variant="outline" size="sm" onClick={() => set({ items: [...cuenta.items, { id: `i-${Date.now()}`, descripcion: "", cantidad: 1, valorUnitario: 0 }] })}>
                <Plus className="h-3.5 w-3.5" /> Ítem libre
              </Button>
            </div>
            {cuenta.items.length === 0 && <p className="text-sm text-slate-500">Marca reportes arriba o agrega un ítem libre (materiales, visita…).</p>}
            {cuenta.items.map((i) => (
              <div key={i.id} className="space-y-1.5 rounded-lg bg-slate-50 p-2.5">
                <div className="flex gap-2">
                  <Input value={i.descripcion} onChange={(e) => setItem(i.id, { descripcion: e.target.value })} placeholder="Descripción" className="h-9 bg-white text-sm" />
                  <button aria-label="Quitar ítem" onClick={() => set({ items: cuenta.items.filter((x) => x.id !== i.id) })} className="rounded p-1.5 text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <Input type="number" min={1} aria-label="Cantidad" value={i.cantidad} onChange={(e) => setItem(i.id, { cantidad: Math.max(1, Number(e.target.value)) })} className="h-9 bg-white text-sm" />
                  <Input type="number" min={0} step={1000} aria-label="Valor unitario" value={i.valorUnitario || ""} placeholder="Valor unitario" onChange={(e) => setItem(i.id, { valorUnitario: Math.max(0, Number(e.target.value)) })} className="h-9 bg-white text-sm" />
                </div>
              </div>
            ))}
            <p className="pt-1 text-right text-sm">
              Total: <strong className="tabular-nums">{cop(total)}</strong>
            </p>
          </section>

          <label className="block text-sm">
            <span className="text-xs text-slate-500">Notas (condiciones de pago, observaciones)</span>
            <Textarea rows={2} value={cuenta.notas} onChange={(e) => set({ notas: e.target.value })} />
          </label>

          {aviso && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{aviso}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => guardar(false)}>
              <Save className="h-4 w-4" /> Guardar borrador
            </Button>
            <Button onClick={() => guardar(true)}>
              <Stamp className="h-4 w-4" /> Emitir
            </Button>
          </div>
          <p className="text-xs text-slate-500">El número se asigna al guardarla por primera vez. Al emitirla queda bloqueada y el cliente la ve en su portal.</p>
        </div>

        <div className="min-w-0 overflow-x-auto rounded-lg bg-slate-100 p-2 sm:p-4">
          <PlantillaCuentaCobro cuenta={cuenta} cliente={demo.clientes.find((c) => c.id === cuenta.clienteId)} proyecto={demo.proyectos.find((p) => p.id === cuenta.proyectoId)} config={demo.config} documentos={demo.documentos} firmante={u.nombre} />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Nueva />
    </Suspense>
  );
}
