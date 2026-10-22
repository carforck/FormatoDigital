"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, Camera, Check, CheckCircle2, PenLine, Plus, Send, Sparkles, Trash2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { comprimirImagen } from "@/nucleo/imagenes";
import type { Ejecutor, FotoReporte, ItemGasto } from "@/nucleo/tipos";
import { TIPOS_GASTO } from "@/modulos/gastos/catalogo";

export type TipoPaso = "texto" | "textarea" | "fecha" | "hora" | "email" | "tel" | "select" | "multi" | "firma" | "ejecutores" | "verificacion" | "fotos" | "gastos";

export interface Paso {
  id: string;
  pregunta: string;
  ayuda?: string;
  tipo: TipoPaso;
  opciones?: string[];
  sugerencias?: string[];
  opcional?: boolean;
  /** Campo que se resalta en la vista previa mientras se pregunta. */
  resaltar?: string;
  /** Valores iniciales (multi / verificación) leídos del documento. */
  inicial?: () => string[];
  /** Genera un borrador del texto (redacción asistida). */
  generar?: () => string;
  validar?: (v: string) => string | null;
}

export type ValorPaso = string | string[] | Ejecutor[] | FotoReporte[] | ItemGasto[];

interface Props {
  titulo: string;
  subtitulo: string;
  pasos: Paso[];
  /** Aplica la respuesta al documento; puede devolver un mensaje extra del asistente. */
  aplicar: (id: string, valor: ValorPaso) => string | void;
  onPaso?: (paso: Paso | null) => void;
  onFirmar: (id: string) => void;
  firmado: (id: string) => boolean;
  ejecutoresIniciales?: Ejecutor[];
  bienvenida: string;
  retomando?: boolean;
  acciones: React.ReactNode;
}

interface Msg {
  id: number;
  rol: "bot" | "user";
  texto: string;
}

let seq = 0;
const m = (rol: Msg["rol"], texto: string): Msg => ({ id: ++seq, rol, texto });

export function ChatAsistente({ titulo, subtitulo, pasos, aplicar, onPaso, onFirmar, firmado, ejecutoresIniciales = [], bienvenida, retomando, acciones }: Props) {
  const [i, setI] = useState(retomando ? pasos.length : 0);
  const [hist, setHist] = useState<Msg[]>(() =>
    retomando ? [m("bot", bienvenida)] : [m("bot", bienvenida), m("bot", pasos[0].pregunta)],
  );
  const [valor, setValor] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const [ejec, setEjec] = useState<Ejecutor[]>(ejecutoresIniciales);
  const [nuevo, setNuevo] = useState<Ejecutor>({ nombre: "", cedula: "", arlEps: "", horaInicio: "", horaFin: "", firma: "" });
  const [fotos, setFotos] = useState<FotoReporte[]>([]);
  const gastoNuevo = (): ItemGasto => ({ id: `g-${Date.now()}`, fecha: new Date().toISOString().slice(0, 10), tipo: "Transporte", descripcion: "", recibo: "", cantidad: 1, valorUnitario: 0, soporte: "" });
  const [gastos, setGastos] = useState<ItemGasto[]>([]);
  const [gasto, setGasto] = useState<ItemGasto>(gastoNuevo);
  const [procesando, setProcesando] = useState(false);

  async function agregarFotos(lista: FileList | null) {
    if (!lista?.length) return;
    setProcesando(true);
    try {
      const nuevas: FotoReporte[] = [];
      for (const f of Array.from(lista).slice(0, 12)) {
        nuevas.push({ id: `f-${Date.now()}-${nuevas.length}`, src: await comprimirImagen(f), descripcion: "", etiqueta: "" });
      }
      setFotos((p) => [...p, ...nuevas]);
    } finally {
      setProcesando(false);
    }
  }
  const scroll = useRef<HTMLDivElement | null>(null);

  const paso: Paso | undefined = pasos[i];
  const completo = i >= pasos.length;

  useEffect(() => {
    scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "smooth" });
  }, [hist.length]);

  useEffect(() => {
    onPaso?.(paso ?? null);
    if (paso?.inicial) setMulti(paso.inicial());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  function avanzar(v: ValorPaso, eco: string) {
    if (!paso) return;
    if (typeof v === "string" && paso.validar && !(paso.opcional && !v.trim())) {
      const err = paso.validar(v);
      if (err) {
        setHist((h) => [...h, m("user", eco), m("bot", `⚠️ ${err}`)]);
        return;
      }
    }
    const extra = aplicar(paso.id, v);
    const sig = pasos[i + 1];
    setHist((h) => [
      ...h,
      m("user", eco.length > 140 ? `${eco.slice(0, 140)}…` : eco || "(omitido)"),
      ...(extra ? [m("bot", extra)] : []),
      m("bot", sig ? sig.pregunta : "¡Listo! Revisa el formato: puedes editar cualquier campo con un clic. Cuando quieras, guárdalo o envíalo a revisión."),
    ]);
    setI(i + 1);
    setValor("");
  }

  function enviarTexto(e: React.FormEvent) {
    e.preventDefault();
    if (!paso) return;
    const v = valor.trim();
    if (!v && !paso.opcional) return;
    avanzar(v, v);
  }

  function irA(idx: number) {
    setI(idx);
    setHist((h) => [...h, m("bot", `Volvamos a: ${pasos[idx].pregunta}`)]);
  }

  return (
    <div className="flex h-full min-h-[520px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sotec text-sotec-green">
          <Bot className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{titulo}</p>
          <p className="truncate text-xs text-slate-500">{subtitulo}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-sotec-soft px-2 py-0.5 text-[11px] font-medium text-sotec-greenDeep">
          {completo ? "Completo" : `Paso ${i + 1} / ${pasos.length}`}
        </span>
      </header>
      <div className="h-1 bg-slate-100">
        <div className="h-1 bg-sotec-green transition-all" style={{ width: `${(Math.min(i, pasos.length) / pasos.length) * 100}%` }} />
      </div>

      <div ref={scroll} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
        {hist.map((x) => (
          <Burbuja key={x.id} msg={x} />
        ))}
        {completo && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> Información completa.
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-slate-200 px-4 py-3">
        {paso && (
          <>
            {paso.ayuda && <p className="whitespace-pre-line text-xs text-slate-500">{paso.ayuda}</p>}

            {paso.tipo === "select" && (
              <div className="flex flex-wrap gap-2">
                {paso.opciones?.map((op) => (
                  <Button key={op} type="button" variant="outline" size="sm" onClick={() => avanzar(op, op)}>
                    {op}
                  </Button>
                ))}
              </div>
            )}

            {paso.tipo === "multi" && (
              <div className="space-y-2">
                <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
                  {paso.opciones?.map((op) => {
                    const on = multi.includes(op);
                    return (
                      <button
                        key={op}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setMulti((p) => (on ? p.filter((x) => x !== op) : [...p, op]))}
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                          on ? "border-sotec bg-sotec text-white" : "border-slate-200 bg-white text-slate-700 hover:border-sotec-greenDeep",
                        )}
                      >
                        {on && <Check className="h-3 w-3" />} {op}
                      </button>
                    );
                  })}
                </div>
                <Button className="w-full" onClick={() => avanzar(multi, multi.length ? `${multi.length} seleccionados: ${multi.slice(0, 3).join(", ")}${multi.length > 3 ? "…" : ""}` : "Ninguno")}>
                  Continuar con {multi.length}
                </Button>
              </div>
            )}

            {paso.tipo === "verificacion" && (
              <div className="space-y-2">
                <div className="max-h-48 space-y-1.5 overflow-y-auto">
                  {paso.opciones?.map((q, k) => (
                    <div key={k} className="flex items-start gap-2 text-xs">
                      <span className="flex-1 text-slate-600">
                        {k + 1}. {q}
                      </span>
                      {(["SI", "NO", "NA"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setMulti((p) => p.map((x, j) => (j === k ? v : x)))}
                          className={cn(
                            "rounded border px-1.5 py-0.5 font-semibold",
                            multi[k] === v ? (v === "NO" ? "border-rose-600 bg-rose-600 text-white" : "border-sotec bg-sotec text-white") : "border-slate-200",
                          )}
                        >
                          {v === "NA" ? "N/A" : v}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setMulti((paso.opciones ?? []).map(() => "SI"))}>
                    Todas en SÍ
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={multi.some((x) => !x)}
                    onClick={() => avanzar(multi, `SÍ: ${multi.filter((x) => x === "SI").length} · NO: ${multi.filter((x) => x === "NO").length} · N/A: ${multi.filter((x) => x === "NA").length}`)}
                  >
                    Confirmar verificación
                  </Button>
                </div>
              </div>
            )}

            {paso.tipo === "ejecutores" && (
              <div className="space-y-2">
                {ejec.map((e, k) => (
                  <div key={k} className="flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1 text-xs">
                    <span className="flex-1 truncate">
                      <strong>{e.nombre}</strong> · {e.cedula} · {e.arlEps} · {e.horaInicio}–{e.horaFin}
                    </span>
                    <button type="button" aria-label="Quitar" onClick={() => setEjec((p) => p.filter((_, j) => j !== k))}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    </button>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-1.5">
                  <Input className="col-span-2 h-8 text-xs" placeholder="Nombre completo" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
                  <Input className="h-8 text-xs" inputMode="numeric" placeholder="Cédula" value={nuevo.cedula} onChange={(e) => setNuevo({ ...nuevo, cedula: e.target.value.replace(/\D/g, "") })} />
                  <Input className="h-8 text-xs" placeholder="ARL / EPS" value={nuevo.arlEps} onChange={(e) => setNuevo({ ...nuevo, arlEps: e.target.value })} />
                  <Input className="h-8 text-xs" type="time" aria-label="Hora inicio" value={nuevo.horaInicio} onChange={(e) => setNuevo({ ...nuevo, horaInicio: e.target.value })} />
                  <Input className="h-8 text-xs" type="time" aria-label="Hora fin" value={nuevo.horaFin} onChange={(e) => setNuevo({ ...nuevo, horaFin: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!nuevo.nombre.trim() || nuevo.cedula.length < 6}
                    onClick={() => {
                      setEjec((p) => [...p, nuevo]);
                      setNuevo({ nombre: "", cedula: "", arlEps: nuevo.arlEps, horaInicio: nuevo.horaInicio, horaFin: nuevo.horaFin, firma: "" });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar
                  </Button>
                  <Button size="sm" className="flex-1" disabled={ejec.length === 0} onClick={() => avanzar(ejec, `${ejec.length} integrante(s): ${ejec.map((e) => e.nombre.split(" ")[0]).join(", ")}`)}>
                    Continuar
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">Cada integrante firma directamente en su fila del formato.</p>
              </div>
            )}

            {paso.tipo === "fotos" && (
              <div className="space-y-2">
                {fotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {fotos.map((f) => (
                      <div key={f.id} className="relative aspect-square overflow-hidden rounded-md bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.src} alt="" className="h-full w-full object-cover" />
                        <button type="button" aria-label="Quitar foto" onClick={() => setFotos((p) => p.filter((x) => x.id !== f.id))} className="absolute right-0.5 top-0.5 rounded bg-black/60 p-0.5 text-white">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-sotec-green/60 bg-sotec-soft px-3 py-3 text-sm font-medium text-sotec-greenDeep hover:bg-sotec-green/20">
                  <Camera className="h-4 w-4" /> {procesando ? "Procesando…" : "Tomar o subir fotos"}
                  <input type="file" accept="image/*" capture="environment" multiple className="sr-only"
                    onChange={(e) => {
                      // agregarFotos copia la lista antes de su primer await; se limpia el input para poder elegir el mismo archivo otra vez
                      void agregarFotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" disabled={procesando} onClick={() => avanzar(fotos, fotos.length ? `${fotos.length} foto(s) agregadas` : "Sin fotos")}>
                    {fotos.length ? `Continuar con ${fotos.length}` : "Continuar sin fotos"}
                  </Button>
                </div>
              </div>
            )}

            {paso.tipo === "gastos" && (
              <div className="space-y-2">
                {gastos.map((g, k) => (
                  <div key={g.id} className="flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs">
                    {g.soporte ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.soporte} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-amber-100 text-[9px] font-semibold text-amber-800">sin foto</span>
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      <strong>{k + 1}. {g.tipo}</strong> · {g.descripcion} · ${(g.cantidad * g.valorUnitario).toLocaleString("es-CO")}
                    </span>
                    <button type="button" aria-label="Quitar gasto" onClick={() => setGastos((p) => p.filter((x) => x.id !== g.id))}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    </button>
                  </div>
                ))}
                <div className="space-y-1.5 rounded-lg border border-slate-200 p-2">
                  <div className="flex flex-wrap gap-1">
                    {TIPOS_GASTO.map((t) => (
                      <button key={t} type="button" onClick={() => setGasto({ ...gasto, tipo: t })} className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", gasto.tipo === t ? "border-sotec bg-sotec text-white" : "border-slate-200")}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <Input className="h-8 text-xs" placeholder="Descripción o motivo" value={gasto.descripcion} onChange={(e) => setGasto({ ...gasto, descripcion: e.target.value })} />
                  <div className="grid grid-cols-2 gap-1.5">
                    <Input className="h-8 text-xs" type="date" aria-label="Fecha del gasto" value={gasto.fecha} onChange={(e) => setGasto({ ...gasto, fecha: e.target.value })} />
                    <Input className="h-8 text-xs" placeholder="N° recibo / factura" value={gasto.recibo} onChange={(e) => setGasto({ ...gasto, recibo: e.target.value })} />
                    <Input className="h-8 text-xs" type="number" min={1} aria-label="Cantidad" value={gasto.cantidad} onChange={(e) => setGasto({ ...gasto, cantidad: Math.max(1, Number(e.target.value)) })} />
                    <Input className="h-8 text-xs" type="number" min={0} step={100} placeholder="Valor unitario" aria-label="Valor del gasto" value={gasto.valorUnitario || ""} onChange={(e) => setGasto({ ...gasto, valorUnitario: Math.max(0, Number(e.target.value)) })} />
                  </div>
                  <label className={cn("flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed px-2 py-2 text-xs font-medium", gasto.soporte ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-sotec-green/60 bg-sotec-soft text-sotec-greenDeep")}>
                    {gasto.soporte ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={gasto.soporte} alt="Factura" className="h-8 w-8 rounded object-cover" /> Factura adjunta · cambiar
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" /> {procesando ? "Procesando…" : "Foto de la factura o recibo"}
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      aria-label="Foto de la factura"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        // Se limpia para que elegir de nuevo el mismo archivo vuelva a disparar «change»
                        e.target.value = "";
                        if (!f) return;
                        setProcesando(true);
                        try {
                          setGasto({ ...gasto, soporte: await comprimirImagen(f, 1400, 0.75) });
                        } finally {
                          setProcesando(false);
                        }
                      }}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={!gasto.descripcion.trim() || gasto.valorUnitario <= 0 || procesando}
                    onClick={() => {
                      setGastos((p) => [...p, gasto]);
                      setGasto({ ...gastoNuevo(), fecha: gasto.fecha });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar gasto
                  </Button>
                </div>
                <Button size="sm" className="w-full" disabled={gastos.length === 0} onClick={() => avanzar(gastos, `${gastos.length} gasto(s) por $${gastos.reduce((a, g) => a + g.cantidad * g.valorUnitario, 0).toLocaleString("es-CO")}`)}>
                  Continuar con {gastos.length}
                </Button>
              </div>
            )}

            {paso.tipo === "firma" && (
              <div className="flex gap-2">
                <Button className="flex-1" variant={firmado(paso.id) ? "outline" : "default"} onClick={() => onFirmar(paso.id)}>
                  <PenLine className="h-4 w-4" /> {firmado(paso.id) ? "Volver a firmar" : "Firmar ahora"}
                </Button>
                <Button variant="ghost" onClick={() => avanzar("", firmado(paso.id) ? "Firmado ✓" : "Firmaré después")}>
                  {firmado(paso.id) ? "Continuar" : "Después"}
                </Button>
              </div>
            )}

            {["texto", "textarea", "fecha", "hora", "email", "tel"].includes(paso.tipo) && (
              <form onSubmit={enviarTexto} className="space-y-2">
                {paso.sugerencias && paso.sugerencias.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {paso.sugerencias.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => avanzar(s, s)}
                        className="max-w-full truncate rounded-full border border-sotec-green/60 bg-sotec-soft px-2.5 py-1 text-[11px] font-medium text-sotec-greenDeep hover:bg-sotec hover:text-white"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {paso.tipo === "textarea" ? (
                  <>
                    <Textarea rows={4} value={valor} onChange={(e) => setValor(e.target.value)} placeholder={paso.opcional ? "Opcional" : "Escribe aquí…"} />
                    <div className="flex gap-2">
                      {paso.generar && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setValor(paso.generar!())}>
                          <Sparkles className="h-3.5 w-3.5" /> Redactar borrador
                        </Button>
                      )}
                      <Button type="submit" size="sm" className="flex-1">
                        <Send className="h-3.5 w-3.5" /> Enviar
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      autoFocus={i > 0}
                      type={paso.tipo === "fecha" ? "date" : paso.tipo === "hora" ? "time" : paso.tipo === "email" ? "email" : paso.tipo === "tel" ? "tel" : "text"}
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      placeholder={paso.sugerencias ? "U otro (escribe libre)" : paso.opcional ? "Opcional" : ""}
                    />
                    <Button type="submit" size="icon" aria-label="Enviar">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {paso.opcional && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => avanzar("", "(omitido)")}>
                    Omitir
                  </Button>
                )}
              </form>
            )}
          </>
        )}

        {completo && (
          <div className="space-y-2">
            {acciones}
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer">Volver a una pregunta</summary>
              <div className="mt-2 flex flex-wrap gap-1">
                {pasos.map((p, k) => (
                  <button key={p.id} type="button" onClick={() => irA(k)} className="rounded border border-slate-200 px-2 py-0.5 hover:bg-slate-50">
                    {k + 1}. {p.resaltar ?? p.id}
                  </button>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

function Burbuja({ msg }: { msg: Msg }) {
  const bot = msg.rol === "bot";
  const alerta = msg.texto.startsWith("⚠️");
  return (
    <div className={cn("flex items-start gap-2 animate-in fade-in duration-200", bot ? "justify-start" : "justify-end")}>
      {bot && (
        <div className={cn("mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", alerta ? "bg-amber-500 text-white" : "bg-sotec text-sotec-green")}>
          {alerta ? <AlertTriangle className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm",
          bot ? (alerta ? "bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-800") : "bg-sotec text-white",
        )}
      >
        {msg.texto}
      </div>
      {!bot && (
        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
          <User className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}
