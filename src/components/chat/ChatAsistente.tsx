"use client";

/**
 * Asistente conversacional guiado (sin IA): recorre una lista de `Paso` que
 * aporta cada módulo de formato, muestra el control adecuado a cada tipo y
 * entrega las respuestas con `aplicar`. Lo usa el Generador; los tipos `Paso`
 * y `ValorPaso` forman parte del contrato de módulos (`src/modulos/contrato.ts`).
 * Las fotos (registro fotográfico, facturas) se toman con la cámara o se eligen de la
 * galería (`ElegirImagen`); un paso de firma puede preguntar quién firma (`firmante`).
 */
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, Check, CheckCircle2, PenLine, Plus, Send, Sparkles, Trash2, User } from "lucide-react";

import { ElegirImagen, avisoSobrantes, mensajeImagenIlegible } from "@/components/docs/ElegirImagen";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { comprimirImagen, comprimirVarias } from "@/nucleo/imagenes";
import type { Ejecutor, FotoReporte, ItemGasto } from "@/nucleo/tipos";
import { TIPOS_GASTO } from "@/modulos/gastos/catalogo";
import { UNIDADES } from "@/modulos/cotizaciones/catalogo";

/** Control que muestra el asistente para responder el paso. */
export type TipoPaso = "texto" | "textarea" | "fecha" | "hora" | "email" | "tel" | "select" | "multi" | "firma" | "ejecutores" | "verificacion" | "fotos" | "gastos" | "componente";

/** Una pregunta del asistente; los módulos la construyen en su función `pasos`. */
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
  /** Valida respuestas de texto: devuelve el mensaje de error o `null`. No se aplica si el paso es opcional y vino vacío. */
  validar?: (v: string) => string | null;
  /** Paso «componente»: control propio (p. ej. el selector de equipos) que llama a `avanzar` al terminar. */
  render?: (avanzar: (v: ValorPaso, eco: string) => void) => React.ReactNode;
  /**
   * «＋ Agregar otro» en listas (select y multi): por defecto se ofrece y lo nuevo se guarda
   * para toda la empresa. `false` lo quita (p. ej. proyecto o confirmar); «servicio» pide
   * descripción, unidad y precio (catálogo de la cotización).
   */
  agregar?: false | "servicio";
  /** Texto de ayuda del formulario de «Agregar otro». */
  ayudaAgregar?: string;
  /**
   * Paso «firma» de alguien más (p. ej. el cliente): pide su nombre y cargo, prellenados con
   * estos valores. Al continuar firmado, `aplicar` recibe `[nombre, cargo]`; omitido, recibe "".
   */
  firmante?: { nombre: string; cargo: string };
  /** Paso «firma»: texto del botón para firmar («El cliente firma ahora»). Por defecto «Firmar ahora». */
  firmar?: string;
  /** Paso «firma»: texto del botón para seguir sin firma («El cliente firma después»). Por defecto «Después». */
  omitir?: string;
}

/** Servicio o producto nuevo para el catálogo de la cotización. */
export interface ServicioNuevo {
  descripcion: string;
  unidad: string;
  precioReferencia: number;
}

/** Respuesta de un paso: texto, lista (multi / verificación) o colecciones (ejecutores, fotos, gastos). */
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
  /** Guarda una opción nueva de una lista para toda la empresa. Sin esta función no se ofrece «Agregar otro». */
  onAgregarOpcion?: (pasoId: string, valor: string) => void;
  /** Agrega un servicio al catálogo y devuelve su etiqueta (la opción que queda marcada). */
  onAgregarServicio?: (s: ServicioNuevo) => string;
}

interface Msg {
  id: number;
  rol: "bot" | "user";
  texto: string;
}

// Id incremental de módulo para las `key` de los mensajes
let seq = 0;
const m = (rol: Msg["rol"], texto: string): Msg => ({ id: ++seq, rol, texto });

/**
 * Chat paso a paso con barra de avance. Con `retomando` arranca ya completo
 * (documento existente o recuperado) y solo muestra las acciones y el atajo
 * «Volver a una pregunta». Las respuestas largas se recortan en el eco (140).
 */
export function ChatAsistente({ titulo, subtitulo, pasos, aplicar, onPaso, onFirmar, firmado, ejecutoresIniciales = [], bienvenida, retomando, acciones, onAgregarOpcion, onAgregarServicio }: Props) {
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
  // «＋ Agregar otro»: formulario abierto, texto nuevo y datos del servicio nuevo (cotización)
  const [otroAbierto, setOtroAbierto] = useState(false);
  const [otro, setOtro] = useState("");
  const [servicio, setServicio] = useState({ unidad: "Unidades", precio: "" });
  // Paso de firma de un tercero (cliente): quién firma y su cargo
  const [firmante, setFirmante] = useState({ nombre: "", cargo: "" });
  const [avisoFirma, setAvisoFirma] = useState<string | null>(null);

  /** Agrega hasta 12 fotos comprimidas; las que no se pudieron leer o pasaron de 12 se avisan (ElegirImagen muestra el texto). */
  async function agregarFotos(lista: File[]): Promise<string | void> {
    setProcesando(true);
    try {
      const { imagenes, fallidas, sobrantes } = await comprimirVarias(lista);
      const t = Date.now();
      setFotos((p) => [...p, ...imagenes.map((src, k) => ({ id: `f-${t}-${p.length + k}`, src, descripcion: "", etiqueta: "" as const }))]);
      return [fallidas ? mensajeImagenIlegible(fallidas) : "", avisoSobrantes(sobrantes)].filter(Boolean).join(" ") || undefined;
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
    setOtroAbierto(false);
    setOtro("");
    setServicio({ unidad: "Unidades", precio: "" });
    setFirmante({ nombre: paso?.firmante?.nombre ?? "", cargo: paso?.firmante?.cargo ?? "" });
    setAvisoFirma(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  /** Valida, aplica la respuesta, deja el eco del usuario y pasa a la siguiente pregunta. */
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

  /** Lista con «＋ Agregar otro»: select avanza con lo nuevo; multi lo deja marcado. */
  const agregaAqui =
    paso && (paso.tipo === "select" || paso.tipo === "multi") && paso.agregar !== false && (paso.agregar === "servicio" ? Boolean(onAgregarServicio) : Boolean(onAgregarOpcion));

  function agregarOtro(e: React.FormEvent) {
    e.preventDefault();
    if (!paso) return;
    const v = otro.trim().replace(/\s+/g, " ");
    if (!v) return;
    let opcion = v;
    if (paso.agregar === "servicio") {
      const precio = Number(servicio.precio.replace(/\D/g, ""));
      opcion = onAgregarServicio!({ descripcion: v, unidad: servicio.unidad, precioReferencia: precio });
    } else {
      // Si ya existe con otras mayúsculas se usa la existente (no se duplica)
      opcion = paso.opciones?.find((x) => x.toLowerCase() === v.toLowerCase()) ?? v;
      onAgregarOpcion!(paso.id, opcion);
    }
    setOtroAbierto(false);
    setOtro("");
    setServicio({ unidad: "Unidades", precio: "" });
    if (paso.tipo === "select") avanzar(opcion, opcion);
    else setMulti((p) => (p.includes(opcion) ? p : [...p, opcion]));
  }

  const bloqueAgregar = agregaAqui ? (
    otroAbierto ? (
      <form onSubmit={agregarOtro} className="space-y-2 rounded-lg border border-dashed border-sotec-greenDeep/50 bg-sotec-soft/50 p-2.5">
        <p className="text-[11px] text-slate-600">{paso?.ayudaAgregar ?? "Lo que agregues queda disponible en esta lista para todo el equipo."}</p>
        <Input autoFocus value={otro} onChange={(e) => setOtro(e.target.value)} placeholder={paso?.agregar === "servicio" ? "Servicio o producto (p. ej. Cámara domo 4 MP)" : "Escribe la nueva opción"} aria-label="Nueva opción" />
        {paso?.agregar === "servicio" && (
          <div className="grid grid-cols-2 gap-2">
            <select value={servicio.unidad} onChange={(e) => setServicio({ ...servicio, unidad: e.target.value })} aria-label="Unidad" className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm">
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <Input inputMode="numeric" value={servicio.precio} onChange={(e) => setServicio({ ...servicio, precio: e.target.value })} placeholder="Precio sin IVA" aria-label="Precio de referencia sin IVA" />
          </div>
        )}
        <div className="flex gap-2">
          <Button type="submit" size="sm" className="flex-1" disabled={!otro.trim() || (paso?.agregar === "servicio" && !servicio.precio.replace(/\D/g, ""))}>
            <Plus className="h-4 w-4" /> Agregar
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOtroAbierto(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    ) : (
      <button
        type="button"
        onClick={() => setOtroAbierto(true)}
        className="flex items-center gap-1 rounded-full border border-dashed border-sotec-greenDeep/60 px-2.5 py-1 text-[11px] font-semibold text-sotec-greenDeep transition hover:bg-sotec-soft"
      >
        <Plus className="h-3 w-3" /> {paso?.agregar === "servicio" ? "Agregar servicio o producto" : "Agregar otro"}
      </button>
    )
  ) : null;

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
                {bloqueAgregar && <div className={otroAbierto ? "w-full" : ""}>{bloqueAgregar}</div>}
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
                {bloqueAgregar}
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
                <ElegirImagen multiple que="fotos del registro fotográfico" textoGaleria="Galería / archivos" onElegir={agregarFotos} />
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
                  {gasto.soporte && (
                    <p className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={gasto.soporte} alt="Factura" className="h-8 w-8 rounded object-cover" /> Factura adjunta · puedes cambiarla
                    </p>
                  )}
                  <ElegirImagen
                    que="factura o recibo del gasto"
                    textoCamara={gasto.soporte ? "Otra foto" : "Foto de la factura"}
                    textoGaleria="Galería / archivos"
                    onElegir={async ([f]) => {
                      setProcesando(true);
                      try {
                        const soporte = await comprimirImagen(f, 1400, 0.75);
                        setGasto((g) => ({ ...g, soporte }));
                      } finally {
                        setProcesando(false);
                      }
                    }}
                  />
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

            {paso.tipo === "componente" && paso.render?.(avanzar)}

            {paso.tipo === "firma" && (
              <div className="space-y-2">
                {paso.firmante && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Etiquetas visibles: prellenados, el placeholder ya no dice cuál es el nombre y cuál el cargo */}
                    <label className="block text-[11px] font-medium text-slate-600">
                      Quien firma
                      <Input className="mt-0.5 h-9 text-sm" placeholder="Nombre de quien firma" aria-label="Nombre de quien firma" value={firmante.nombre} onChange={(e) => setFirmante({ ...firmante, nombre: e.target.value })} />
                    </label>
                    <label className="block text-[11px] font-medium text-slate-600">
                      Cargo
                      <Input className="mt-0.5 h-9 text-sm" placeholder="Cargo" aria-label="Cargo de quien firma" value={firmante.cargo} onChange={(e) => setFirmante({ ...firmante, cargo: e.target.value })} />
                    </label>
                  </div>
                )}
                {avisoFirma && <p className="text-xs text-amber-700">{avisoFirma}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button className="flex-1" variant={firmado(paso.id) ? "outline" : "default"} onClick={() => onFirmar(paso.id)}>
                    <PenLine className="h-4 w-4" /> {firmado(paso.id) ? "Volver a firmar" : (paso.firmar ?? "Firmar ahora")}
                  </Button>
                  {firmado(paso.id) ? (
                    <Button
                      variant="default"
                      onClick={() => {
                        if (!paso.firmante) return avanzar("", "Firmado ✓");
                        const nombre = firmante.nombre.trim().replace(/\s+/g, " ");
                        if (nombre.length < 3) return setAvisoFirma("Escribe el nombre de quien firma.");
                        avanzar([nombre, firmante.cargo.trim()], `Firmó ${nombre}${firmante.cargo.trim() ? ` (${firmante.cargo.trim()})` : ""} ✓`);
                      }}
                    >
                      Continuar
                    </Button>
                  ) : (
                    <Button variant="ghost" onClick={() => avanzar("", paso.omitir ?? "Firmaré después")}>
                      {paso.omitir ?? "Después"}
                    </Button>
                  )}
                </div>
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

/** Mensaje del chat; los del bot que empiezan con «⚠️» se pintan como alerta. */
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
