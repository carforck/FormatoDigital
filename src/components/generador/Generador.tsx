"use client";

/**
 * Pantalla de diligenciamiento de un formato (`/app/nuevo/<tipo>`, vía
 * PaginaGenerador): chat guiado (ChatAsistente) a la izquierda y la plantilla
 * editable a la derecha (pestañas en móvil). Guarda borradores en localStorage,
 * avisa antes de salir con cambios y guarda/envía con `useDemo`. El cliente escrito a
 * mano que no está en el directorio se guarda allí al GUARDAR el documento (también
 * desde el técnico, ver @/nucleo/clientes); uno desactivado no se recrea: se ofrece usarlo.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Cctv, CheckCircle2, Eye, FolderKanban, MessageSquare, Printer, Save, SendHorizonal } from "lucide-react";

import { ChatAsistente, type ValorPaso } from "@/components/chat/ChatAsistente";
import { FirmaPad } from "@/components/docs/FirmaPad";
import { Button } from "@/components/ui/button";
import { Volver, salirAlDetalle, useOrigen } from "@/components/ui/volver";
import type { Paso } from "@/components/chat/ChatAsistente";
import { etiquetaServicio, type ServicioCatalogo } from "@/modulos/cotizaciones/catalogo";
import { equiposAtendidos, puedeEditarEquipos } from "@/modulos/equipos/logica";
import { SelectorEquipos } from "@/modulos/equipos/SelectorEquipos";
import type { EquipoMinimo } from "@/modulos/equipos/tipos";
import { clienteDoc, empresaDe, infoDoc, moduloDe, prefijoDe } from "@/modulos/registro";
import { ETIQUETA_ESTADO_PROYECTO } from "@/nucleo/catalogos";
import { hoy, useDemo } from "@/nucleo/datos/DemoProvider";
import { CLAVE_RETORNO_GENERADOR, abrirImpresion, leerBorradorImpresion, tituloArchivo } from "@/nucleo/impresion";
import { rutaDoc } from "@/nucleo/rutas";
import type { Cliente, Documento, Proyecto, TipoDoc } from "@/nucleo/tipos";
import { cn } from "@/lib/utils";
import { avance, faltantes } from "@/nucleo/validar";
import { puede } from "@/nucleo/permisos";
import { avisoPlan, buscarCliente, claveNombre, dejarAvisoCliente, planCliente } from "@/nucleo/clientes";

interface Props {
  tipo: TipoDoc;
  /** Documento existente a continuar (borrador o rechazado). */
  existente?: Documento;
  /** Proyecto preseleccionado (`?proyecto=`): fija también el cliente. */
  proyectoInicial?: string;
  /** Cliente preseleccionado (`?cliente=`). */
  clienteInicial?: string;
  /** Equipo preseleccionado (`?equipo=`, desde su ficha): queda marcado como atendido. */
  equipoInicial?: string;
}

const SIN_PROYECTO = "Sin proyecto";
const etiquetaProyecto = (p: Proyecto) => `${p.codigo} · ${p.nombre}`;

/**
 * Generador genérico: asistente conversacional + vista previa editable.
 * Lo propio de cada formato (pasos, autollenado, reglas) lo aporta su módulo
 * en src/modulos/<clave>/. El generador intercala dos pasos comunes: el
 * proyecto (justo después del cliente) y, si el formato los registra, los equipos.
 */
export function Generador({ tipo, existente, proyectoInicial, clienteInicial, equipoInicial }: Props) {
  const demo = useDemo();
  const router = useRouter();
  const usuario = demo.usuario!;
  const modulo = moduloDe(tipo);
  const info = infoDoc(tipo);
  // Desde un proyecto (?proyecto= o ?desde=proyecto:) se vuelve al proyecto; si no, a Documentos
  const origenLista = useOrigen({ href: "/app/documentos", label: "Documentos" });
  // Continuar un documento existente: «Volver» regresa a su detalle (que conserva su propio origen)
  const origen = existente
    ? { href: rutaDoc(existente.id, origenLista.query ? `&${origenLista.query}` : ""), label: `Volver al documento ${existente.codigo}`, query: origenLista.query }
    : origenLista;
  // Lo que se va diligenciando en un documento nuevo se guarda en el navegador:
  // si se recarga o se cambia de perfil a mitad, se recupera al volver.
  const claveCache = `fd-generador-${tipo}-${usuario.id}`;
  const recuperado = useRef(false);
  // Los módulos están tipados por formato; el generador los trata de forma uniforme.
  const mod = modulo as unknown as {
    pasos: (c: { datos: unknown; clientes: typeof demo.clientes; usuarioNombre: string; hoy: string; serviciosPropios?: ServicioCatalogo[] }) => Paso[];
    aplicar: (id: string, v: ValorPaso, d: unknown, extras?: { serviciosPropios?: ServicioCatalogo[] }) => { cambio: Record<string, unknown>; mensaje?: string };
    alElegirCliente: (c: Cliente) => { cambio: Record<string, unknown>; mensaje: string };
    vacio: (hoy: string, u: typeof usuario) => Documento["datos"];
  };

  /** Autollenado del cliente y, si hay, del proyecto (los dos van al formato). */
  const conCliente = (d: Documento, c: Cliente): Documento => ({ ...d, clienteId: c.id, datos: { ...d.datos, ...mod.alElegirCliente(c).cambio } }) as Documento;
  const conProyecto = (d: Documento, p: Proyecto): Documento => {
    const c = demo.clientes.find((x) => x.id === p.clienteId);
    const base = c && d.clienteId !== c.id ? conCliente(d, c) : d;
    const r = info.alElegirProyecto?.(p, c);
    return { ...base, clienteId: p.clienteId, proyectoId: p.id, datos: { ...base.datos, ...(r?.cambio ?? {}) } } as Documento;
  };
  const preseleccion = (d0: Documento): Documento => {
    const p = demo.proyectosVisibles.find((x) => x.id === proyectoInicial);
    const c = demo.clientes.find((x) => x.id === clienteInicial);
    const d = p ? conProyecto(d0, p) : c ? conCliente(d0, c) : d0;
    // Desde la ficha de un equipo: queda marcado (si es del cliente del documento y el formato registra equipos)
    const eq = info.equipos && demo.equiposVisibles.find((e) => e.id === equipoInicial && e.clienteId === d.clienteId && e.estado !== "retirado");
    return eq ? ({ ...d, equiposIds: Array.from(new Set([...(d.equiposIds ?? []), eq.id])) } as Documento) : d;
  };

  const [doc, setDoc] = useState<Documento>(() => {
    if (existente) {
      // De vuelta de «Imprimir / PDF»: se recupera lo que no se había guardado
      try {
        const r = JSON.parse(sessionStorage.getItem(CLAVE_RETORNO_GENERADOR) ?? "null") as { id: string; clave: string; t: number } | null;
        sessionStorage.removeItem(CLAVE_RETORNO_GENERADOR);
        const d = r && r.id === existente.id && Date.now() - r.t < 2 * 3600e3 ? leerBorradorImpresion(r.clave) : null;
        if (d && d.id === existente.id && d.tipo === existente.tipo) return { ...existente, datos: d.datos, clienteId: d.clienteId, proyectoId: d.proyectoId, equiposIds: d.equiposIds } as Documento;
      } catch {
        /* sin almacenamiento */
      }
      return existente;
    }
    try {
      const cache = localStorage.getItem(claveCache);
      if (cache) {
        const d = JSON.parse(cache) as Documento;
        if (d.tipo === tipo && d.autorId === usuario.id && !demo.documentos.some((x) => x.id === d.id)) {
          recuperado.current = true;
          return preseleccion({ ...d, ...demo.nuevoId(tipo), id: d.id });
        }
      }
    } catch {
      /* sin almacenamiento */
    }
    const n = demo.nuevoId(tipo);
    const base = { ...n, estado: "borrador" as const, autorId: usuario.id, clienteId: "", creado: hoy(), actualizado: hoy(), historial: [] };
    return preseleccion({ ...base, tipo, datos: mod.vacio(hoy(), usuario) } as Documento);
  });
  const [resaltar, setResaltar] = useState<string | undefined>();
  const [firmando, setFirmando] = useState<string | null>(null);
  const [vista, setVista] = useState<"chat" | "doc">("chat");
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  // Lo preseleccionado desde un proyecto no cuenta como cambio sin guardar
  const contenido = (d: Documento) => JSON.stringify([d.datos, d.equiposIds ?? []]);
  const inicialJson = useRef(contenido(existente ?? doc));
  const sucio = contenido(doc) !== inicialJson.current;

  // Guardado local continuo del documento nuevo
  useEffect(() => {
    if (existente || guardando) return;
    try {
      if (sucio || recuperado.current) localStorage.setItem(claveCache, JSON.stringify(doc));
    } catch {
      /* sin almacenamiento */
    }
  }, [doc, existente, guardando, sucio, claveCache]);

  // Aviso del navegador si se intenta salir con cambios sin guardar
  useEffect(() => {
    if (!sucio || guardando) return;
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio, guardando]);

  const pendientes = useMemo(() => faltantes(doc), [doc]);
  const pct = avance(doc);

  /** Mezcla un cambio parcial en el contenido del formato. */
  const editar = (cambio: object) => setDoc((d) => ({ ...d, datos: { ...d.datos, ...cambio } }) as Documento);

  /**
   * Edición en línea del formato. Si se escribe el cliente a mano: uno del directorio (activo)
   * autollena sus datos; uno distinto del elegido deja el documento sin cliente del directorio
   * (se registrará al guardar).
   */
  const editarFormato = (cambio: object) => {
    const c = cambio as Record<string, unknown>;
    if (info.campoCliente in c && typeof c[info.campoCliente] === "string") {
      const texto = c[info.campoCliente] as string;
      const elegido = demo.clientes.find((x) => x.id === doc.clienteId);
      const otro = buscarCliente(demo.clientesActivos, texto);
      if (otro && otro.id !== doc.clienteId) {
        elegirCliente(otro);
        return;
      }
      if (elegido && texto.trim() && claveNombre(texto) !== claveNombre(elegido.nombre) && !otro) {
        elegirCliente(undefined, texto);
        return;
      }
    }
    editar(cambio);
  };

  // Proyectos que se pueden elegir: los visibles, no cerrados, del cliente elegido (o todos si aún no hay cliente)
  const proyectosElegibles = demo.proyectosVisibles.filter((p) => (p.estado !== "cerrado" || p.id === doc.proyectoId) && (!doc.clienteId || p.clienteId === doc.clienteId));
  const proyecto = demo.proyectos.find((p) => p.id === doc.proyectoId);

  // El cliente escrito a mano se registra en el directorio al guardar (si el formato lo registra y el perfil puede)
  const registraClientes = Boolean(info.datosCliente) && (puede(usuario.rol, "registrar_clientes") || puede(usuario.rol, "clientes"));

  /** Elige un cliente del directorio (o lo deja escrito a mano); un proyecto de otro cliente se quita. */
  function elegirCliente(c: Cliente | undefined, texto = ""): string | undefined {
    if (!c) {
      setDoc((d) => ({ ...d, clienteId: "", proyectoId: undefined, equiposIds: undefined, datos: { ...d.datos, [info.campoCliente]: texto } }) as Documento);
      // Cliente nuevo escrito en el chat: se guarda en el directorio cuando se guarde el documento (no en cada tecla)
      const nombre = texto.trim();
      if (!nombre || !registraClientes) return;
      const existente = buscarCliente(demo.clientes, nombre);
      if (existente?.activo === false) return `«${existente.nombre}» está desactivado en el directorio de clientes. Al guardar te pregunto si quieres usarlo (no se crea otro).`;
      return `«${nombre}» es un cliente nuevo: al guardar ${info.formato.el} ${info.formato.corto.toLowerCase()} lo dejo en el directorio con los datos que escribas, para que la próxima vez se autocomplete.`;
    }
    const r = mod.alElegirCliente(c);
    setDoc((d) => {
      const otro = d.proyectoId && demo.proyectos.find((p) => p.id === d.proyectoId)?.clienteId !== c.id;
      // Los equipos son de cada cliente: al cambiarlo se quitan los del anterior
      const equiposIds = (d.equiposIds ?? []).filter((id) => demo.equipos.some((e) => e.id === id && e.clienteId === c.id));
      return { ...conCliente(d, c), proyectoId: otro ? undefined : d.proyectoId, equiposIds } as Documento;
    });
    return r.mensaje;
  }

  /** Elige el proyecto: fija el cliente y llena los campos de proyecto u obra del formato. */
  function elegirProyecto(p: Proyecto | undefined): string | undefined {
    if (!p) {
      setDoc((d) => ({ ...d, proyectoId: undefined }) as Documento);
      return "Sin proyecto: el documento queda solo asociado al cliente.";
    }
    setDoc((d) => conProyecto(d, p));
    const c = demo.clientes.find((x) => x.id === p.clienteId);
    const r = info.alElegirProyecto?.(p, c);
    return [`Proyecto ${etiquetaProyecto(p)}${c ? ` de ${c.nombre}` : ""}.`, r?.mensaje].filter(Boolean).join(" ");
  }

  /** Aplica la respuesta de un paso del chat; devuelve el mensaje de confirmación del asistente. */
  function aplicar(id: string, v: ValorPaso): string | void {
    if (id.startsWith("firma")) {
      // Firma de un tercero (cliente): el asistente entrega quién firma; la imagen ya está en el formato
      if (Array.isArray(v)) {
        const r = mod.aplicar(id, v, doc.datos);
        editar(r.cambio);
        return r.mensaje;
      }
      const campoCliente = info.flujo.campoFirmaCliente;
      if (id === campoCliente && !(doc.datos as unknown as Record<string, string>)[id]) {
        return `Sin firma del cliente por ahora. Cuando ${info.formato.el} ${info.formato.corto.toLowerCase()} se apruebe, el cliente podrá firmarlo en su portal o con el enlace de firma; también puedes tomarla en sitio desde el documento.`;
      }
      return;
    }
    // Sin importar mayúsculas, tildes ni espacios: «ladrillera arcillas…» autollena como la del directorio
    if (id === "cliente") return elegirCliente(buscarCliente(demo.clientesActivos, v as string), v as string);
    if (id === "proyecto") return elegirProyecto(demo.proyectosVisibles.find((p) => etiquetaProyecto(p) === v));
    // Los equipos ya quedaron marcados en el documento desde el selector
    if (id === "equipos") {
      const n = (doc.equiposIds ?? []).length;
      return n ? `Quedan ${n} equipo(s) en «Equipos atendidos»: el reporte aparecerá en el historial de cada uno.` : undefined;
    }
    const r = mod.aplicar(id, v, doc.datos, { serviciosPropios: demo.config.serviciosPropios });
    editar(r.cambio);
    return r.mensaje;
  }

  // Pasos del módulo + la pregunta del proyecto justo después del cliente
  // Las listas suman lo que el equipo agregó con «＋ Agregar otro» (Configuración · opciones por «formato.paso»)
  const propias = demo.config.opcionesPropias ?? {};
  const pasosModulo = mod
    .pasos({ datos: doc.datos, clientes: demo.clientesActivos, usuarioNombre: usuario.nombre, hoy: hoy(), serviciosPropios: demo.config.serviciosPropios })
    .map((p) => {
      const extra = propias[`${tipo}.${p.id}`];
      if (!extra?.length || !p.opciones || (p.tipo !== "select" && p.tipo !== "multi")) return p;
      // Lo agregado va antes de «Otro» (si la lista lo tiene) y sin repetir
      const base = p.opciones.filter((o) => o !== "Otro");
      const nuevas = extra.filter((x) => !base.some((o) => o.toLowerCase() === x.toLowerCase()));
      return { ...p, opciones: [...base, ...nuevas, ...(p.opciones.includes("Otro") ? ["Otro"] : [])] };
    });
  const pasoProyecto: Paso = {
    id: "proyecto",
    tipo: "select",
    opcional: true,
    resaltar: "proyecto",
    pregunta: "¿A qué proyecto u obra pertenece?",
    agregar: false,
    ayuda: proyectosElegibles.length ? "Al elegirlo, el documento aparece en el proyecto y se llenan los campos de obra del formato." : "Este cliente no tiene proyectos abiertos; puedes seguir sin proyecto.",
    opciones: [...proyectosElegibles.map(etiquetaProyecto), SIN_PROYECTO],
  };
  const iCliente = pasosModulo.findIndex((p) => p.id === "cliente");
  const pasos = [...pasosModulo.slice(0, iCliente + 1), pasoProyecto, ...pasosModulo.slice(iCliente + 1)];

  // Equipos atendidos (módulo Equipos), si el formato los registra: se preguntan después del paso que indique el módulo
  const equiposIds = doc.equiposIds ?? [];
  const equiposCliente = doc.clienteId ? demo.equiposVisibles.filter((e) => e.clienteId === doc.clienteId) : [];
  const marcarEquipos = (ids: string[]) => setDoc((d) => ({ ...d, equiposIds: ids }) as Documento);
  const crearEquipo = (m: Omit<EquipoMinimo, "clienteId" | "proyectoId">) => demo.crearEquipo({ ...m, clienteId: doc.clienteId, proyectoId: doc.proyectoId });
  const selector = (compacto: boolean) => (
    <SelectorEquipos
      equipos={equiposCliente}
      seleccion={equiposIds}
      onCambiar={marcarEquipos}
      crear={puedeEditarEquipos(usuario.rol) ? crearEquipo : undefined}
      proyectoId={doc.proyectoId}
      sinCliente={!doc.clienteId}
      compacto={compacto}
    />
  );
  if (info.equipos) {
    const pasoEquipos: Paso = {
      id: "equipos",
      tipo: "componente",
      opcional: true,
      resaltar: "equipos",
      pregunta: "¿Qué equipos atendiste? Márcalos; si alguno no está, créalo con «Nuevo equipo».",
      ayuda: "Cada equipo marcado tendrá este reporte en su historial. Marca, modelo y serial se completan después en Equipos.",
      render: (avanzar) => (
        <div className="space-y-2">
          {selector(true)}
          <Button size="sm" className="w-full" onClick={() => avanzar(equiposIds, equiposIds.length ? `${equiposIds.length} equipo(s) atendido(s)` : "Sin equipos")}>
            {equiposIds.length ? `Continuar con ${equiposIds.length}` : "Continuar sin equipos"}
          </Button>
        </div>
      ),
    };
    const k = pasos.findIndex((p) => p.id === info.equipos!.despuesDe);
    pasos.splice(k < 0 ? pasos.length : k + 1, 0, pasoEquipos);
  }

  function guardarFirma(url: string) {
    const campo = firmando!;
    setFirmando(null);
    editar(info.aplicarFirma(campo, url, doc.datos));
  }

  /** Guarda (y con `enviar`, envía a revisión o aprueba según el flujo del formato) y abre el detalle. */
  function guardar(enviar: boolean) {
    if (guardando) return; // un solo envío aunque se haga doble clic
    if (enviar && pendientes.length) {
      setAviso(`Faltan ${pendientes.length} punto(s) por completar antes de enviar.`);
      setVista("doc");
      return;
    }
    let clienteId = doc.clienteId;
    // Directorio: un cliente desactivado no se vuelve a crear; se ofrece usarlo
    let plan = registraClientes ? planCliente(demo.clientes, doc, "nuevo") : null;
    if (plan?.accion === "inactivo") {
      const usar = confirm(`«${plan.cliente.nombre}» está desactivado en el directorio de clientes.\n\n¿Usarlo para este documento? (Si no, queda escrito a mano y no se crea otro cliente.)`);
      if (usar) {
        clienteId = plan.cliente.id;
        plan = planCliente(demo.clientes, { ...doc, clienteId }, "nuevo");
      }
    }
    setGuardando(true);
    const g = demo.guardar({ ...doc, clienteId });
    if (enviar) demo.enviar(g.id);
    const avisoDirectorio = plan && avisoPlan(plan);
    if (avisoDirectorio) dejarAvisoCliente(g.id, avisoDirectorio);
    try {
      localStorage.removeItem(claveCache);
    } catch {
      /* sin almacenamiento */
    }
    // replace: «atrás» desde el detalle vuelve a donde se abrió el generador, no a un formulario vacío.
    // Abierto con «Editar» desde el detalle: se regresa a esa entrada (sin duplicarla en el historial)
    const destino = rutaDoc(g.id, `${origen.query ? `&${origen.query}` : ""}`);
    if (existente) salirAlDetalle(router, destino, enviar ? "enviado" : "guardado");
    else router.replace(rutaDoc(g.id, `&ok=${enviar ? "enviado" : "guardado"}${origen.query ? `&${origen.query}` : ""}`));
  }

  /** Imprime lo que hay en pantalla, guardado o no (la página de impresión lo recibe en memoria). */
  function imprimir() {
    // Nombre del PDF: el consecutivo (sin guardar, uno provisional como en la página de impresión)
    const codigo = existente ? doc.codigo : `${prefijoDe(demo.config, doc.tipo)}-borrador-${hoy()}`;
    const titulo = tituloArchivo([codigo, info.formato.corto, clienteDoc(doc)]);
    if (existente && !sucio) return abrirImpresion(router, { doc: existente.id, titulo });
    const clave = abrirImpresion(router, { borrador: doc, titulo });
    // Un documento ya guardado no tiene guardado automático: al volver se recupera de aquí
    if (existente && clave) {
      try {
        sessionStorage.setItem(CLAVE_RETORNO_GENERADOR, JSON.stringify({ id: existente.id, clave, t: Date.now() }));
      } catch {
        /* sin almacenamiento */
      }
    }
  }

  const f = info.formato;
  const Plantilla = info.Plantilla;
  const clienteSel = demo.clientes.find((c) => c.id === doc.clienteId);
  const sel = "h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800";
  const acciones = (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" disabled={guardando} onClick={() => guardar(false)}>
        <Save className="h-4 w-4" /> Guardar borrador
      </Button>
      <Button disabled={guardando} onClick={() => guardar(true)}>
        <SendHorizonal className="h-4 w-4" /> {info.flujo.aprobarAlEnviar ?? "Enviar a revisión"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <Volver href={origen.href} label={origen.label} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-sotec-greenDeep">
            {f.codigo} · v{f.version}
          </p>
          <h1 className="text-xl font-semibold">
            {existente ? "Continuar" : f.nuevo} {f.corto.toLowerCase()} <span className="font-mono text-base text-slate-500">{doc.codigo}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden w-40 sm:block">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Diligenciado</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded bg-slate-200">
              <div className="h-1.5 rounded bg-sotec-green transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={imprimir}>
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </Button>
        </div>
      </div>

      <div className="flex rounded-lg bg-slate-100 p-1 lg:hidden print:hidden">
        {(["chat", "doc"] as const).map((v) => (
          <button key={v} onClick={() => setVista(v)} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium", vista === v && "bg-white shadow-sm")}>
            {v === "chat" ? <MessageSquare className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {v === "chat" ? "Asistente" : "Formato"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[400px_1fr] [&>*]:min-w-0">
        <div className={cn("lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)] print:hidden", vista !== "chat" && "hidden lg:block")}>
          <ChatAsistente
            titulo="Asistente SOTEC"
            subtitulo={`${f.corto} · ${f.codigo}`}
            pasos={pasos}
            aplicar={aplicar}
            onPaso={(p) => setResaltar(p?.resaltar)}
            onFirmar={(id) => setFirmando(id)}
            firmado={(id) => Boolean((doc.datos as unknown as Record<string, string>)[id])}
            ejecutoresIniciales={doc.tipo === "permiso" ? doc.datos.ejecutores : []}
            retomando={Boolean(existente) || recuperado.current}
            bienvenida={
              existente
                ? `Retomamos ${doc.codigo}. Edita lo que necesites directamente en el formato.${doc.motivoRechazo ? `\n\nMotivo del rechazo: ${doc.motivoRechazo}` : ""}`
                : recuperado.current
                  ? `Recuperé lo que estabas diligenciando en ${f.el} ${f.corto.toLowerCase()}. Revisa el formato y continúa donde quedaste.`
                  : `Hola, ${usuario.nombre.split(" ")[0]}. Te guío para diligenciar ${f.el} ${f.corto.toLowerCase()} (${f.codigo}). Lo que respondas aparece al instante en el formato.${proyecto ? `\n\nQueda en el proyecto ${etiquetaProyecto(proyecto)}${clienteSel ? ` de ${clienteSel.nombre}` : ""}.` : ""}`
            }
            acciones={acciones}
            onAgregarOpcion={(pasoId, valor) => demo.agregarOpcion(`${tipo}.${pasoId}`, valor)}
            onAgregarServicio={(sv) => etiquetaServicio(demo.agregarServicio(sv))}
          />
        </div>

        <div className={cn("min-w-0 space-y-3", vista !== "doc" && "hidden lg:block")}>
          {aviso && pendientes.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 print:hidden">
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" /> {aviso}
              </p>
              <ul className="mt-1 list-disc pl-6 text-xs">
                {pendientes.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {aviso && pendientes.length === 0 && (
            <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 print:hidden">
              <CheckCircle2 className="h-4 w-4" /> Todo completo: ya puedes {info.flujo.aprobarAlEnviar ? "aprobarlo y enviarlo al cliente" : "enviarlo a revisión"}.
            </p>
          )}
          {/* Cliente y proyecto también desde el formulario: autollenan el formato igual que el asistente */}
          <section aria-label="Cliente y proyecto" className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 print:hidden">
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-600">Cliente del directorio</span>
              <select
                className={sel}
                value={doc.clienteId}
                onChange={(e) => {
                  const c = demo.clientes.find((x) => x.id === e.target.value);
                  elegirCliente(c, c ? "" : clienteDoc(doc));
                }}
              >
                <option value="">{doc.clienteId ? "Sin cliente del directorio" : clienteDoc(doc) ? `Escrito a mano: ${clienteDoc(doc)}` : "Selecciona…"}</option>
                {/* Solo clientes activos; el ya elegido se conserva aunque se haya desactivado */}
                {demo.clientes
                  .filter((c) => c.activo !== false || c.id === doc.clienteId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                      {c.activo === false ? " (inactivo)" : ""}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
                <FolderKanban className="h-3.5 w-3.5" aria-hidden /> Proyecto u obra
              </span>
              <select className={sel} value={doc.proyectoId ?? ""} onChange={(e) => elegirProyecto(demo.proyectosVisibles.find((p) => p.id === e.target.value))}>
                <option value="">{SIN_PROYECTO}</option>
                {proyectosElegibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {etiquetaProyecto(p)}
                    {p.estado !== "activo" ? ` (${ETIQUETA_ESTADO_PROYECTO[p.estado].toLowerCase()})` : ""}
                  </option>
                ))}
              </select>
            </label>
            {clienteSel && (
              <p className="text-xs text-slate-500 sm:col-span-2">
                {clienteSel.contacto} · {clienteSel.cargo} · {clienteSel.correo} · {clienteSel.telefono}
                {proyecto?.sitio ? ` · Sitio: ${proyecto.sitio}` : clienteSel.sitio ? ` · Sitio: ${clienteSel.sitio}` : ""}
              </p>
            )}
          </section>
          {info.equipos && (
            <section aria-labelledby="titulo-equipos" className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 print:hidden">
              <h2 id="titulo-equipos" className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <Cctv className="h-3.5 w-3.5" aria-hidden /> Equipos atendidos
              </h2>
              {selector(false)}
            </section>
          )}
          <p className="text-xs text-slate-500 print:hidden">Clic sobre cualquier campo del formato para editarlo. Los campos resaltados en verde son los que el asistente está preguntando.</p>
          <div className="overflow-x-auto rounded-lg bg-slate-100 p-2 sm:p-4">
            <Plantilla datos={doc.datos} codigoDoc={doc.codigo} empresa={empresaDe(demo.config)} equipos={equiposAtendidos(equiposIds, demo.equipos)} editar={editarFormato} firmar={(c) => setFirmando(c)} resaltar={resaltar} />
          </div>
          <div className="lg:hidden print:hidden">{acciones}</div>
        </div>
      </div>

      {firmando && (
        <FirmaPad
          titulo={firmando === info.flujo.campoFirmaCliente ? "Firma del cliente · recibido a satisfacción" : "Firma"}
          onCerrar={() => setFirmando(null)}
          onGuardar={guardarFirma}
        />
      )}
    </div>
  );
}
