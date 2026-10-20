"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Eye, MessageSquare, Printer, Save, SendHorizonal } from "lucide-react";

import { ChatAsistente, type Paso, type ValorPaso } from "@/components/chat/ChatAsistente";
import { FirmaPad } from "@/components/docs/FirmaPad";
import { PlantillaPermiso, type CampoFirmaPermiso } from "@/components/docs/PlantillaPermiso";
import { PlantillaReporte } from "@/components/docs/PlantillaReporte";
import { Button } from "@/components/ui/button";
import {
  EPP,
  EQUIPO_REQUERIDO,
  FORMATOS,
  MEDIDAS,
  PELIGROS,
  PLANTILLAS_ACTIVIDAD,
  PREGUNTAS_VERIFICACION,
  TIPOS_REPORTE,
  permisoVacio,
  reporteVacio,
} from "@/lib/formatos";
import { rutaDoc } from "@/lib/base";
import { hoy, useDemo } from "@/lib/store";
import type { DatosPermiso, DatosReporte, DocPermiso, DocReporte, Documento, Ejecutor, SiNoNa, TipoDoc } from "@/lib/types";
import { cn } from "@/lib/utils";
import { avance, faltantes } from "@/lib/validar";

interface Props {
  tipo: TipoDoc;
  /** Documento existente a continuar (borrador o rechazado). */
  existente?: Documento;
}

function redactarDescripcion(d: DatosReporte): string {
  const tipo = (d.tipoReporte || "técnico").toLowerCase();
  const asunto = d.asunto || "la solicitud del cliente";
  return `Se realiza visita de mantenimiento ${tipo} en las instalaciones de ${d.cliente || "el cliente"} para atender: ${asunto.toLowerCase()}.

Durante el diagnóstico se inspeccionan equipos, conexiones, alimentación eléctrica y estado general de la infraestructura, identificando los puntos que afectan el funcionamiento del sistema.

Como acción ${tipo === "preventivo" ? "preventiva" : "correctiva"}, se ejecutan los ajustes, reemplazos y configuraciones necesarias, dejando registro fotográfico del antes y el después.

Finalmente se realizan pruebas de funcionamiento junto con ${d.personaContactada || "la persona contactada"}, confirmando que el sistema queda operando bajo condiciones normales.`;
}

export function Generador({ tipo, existente }: Props) {
  const demo = useDemo();
  const router = useRouter();
  const usuario = demo.usuario!;
  const [doc, setDoc] = useState<Documento>(() => {
    if (existente) return existente;
    const n = demo.nuevoId(tipo);
    const base = { ...n, estado: "borrador" as const, autorId: usuario.id, clienteId: "", creado: hoy(), actualizado: hoy(), historial: [] };
    return tipo === "reporte"
      ? ({ ...base, tipo: "reporte", datos: { ...reporteVacio(hoy()), nombreTecnico: usuario.nombre } } as DocReporte)
      : ({ ...base, tipo: "permiso", datos: { ...permisoVacio(hoy()), responsable: usuario.nombre, encargado: usuario.nombre } } as DocPermiso);
  });
  const [resaltar, setResaltar] = useState<string | undefined>();
  const [firmando, setFirmando] = useState<string | null>(null);
  const [vista, setVista] = useState<"chat" | "doc">("chat");
  const [aviso, setAviso] = useState<string | null>(null);

  const pendientes = useMemo(() => faltantes(doc), [doc]);
  const pct = avance(doc);

  const editarReporte = (p: Partial<DatosReporte>) => setDoc((d) => ({ ...d, datos: { ...d.datos, ...p } }) as Documento);
  const editarPermiso = (p: Partial<DatosPermiso>) => setDoc((d) => ({ ...d, datos: { ...d.datos, ...p } }) as Documento);

  function elegirCliente(nombre: string): string | void {
    const c = demo.clientes.find((x) => x.nombre === nombre);
    if (!c) {
      setDoc((d) => ({ ...d, clienteId: "", datos: { ...d.datos, cliente: nombre } }) as Documento);
      return;
    }
    if (tipo === "reporte") {
      setDoc((d) => ({
        ...d,
        clienteId: c.id,
        datos: { ...d.datos, cliente: c.nombre, direccion: c.direccion, personaContactada: c.contacto, correo: c.correo, telefono: c.telefono, cargo: c.cargo },
      }) as Documento);
      return `Encontré a ${c.nombre} en tu directorio. Completé dirección, contacto (${c.contacto}), correo, teléfono y cargo. Puedes ajustarlos con un clic en el formato.`;
    }
    setDoc((d) => ({ ...d, clienteId: c.id, datos: { ...d.datos, cliente: c.nombre, sitioTrabajo: c.sitio } }) as Documento);
    return `Cliente ${c.nombre} seleccionado. Sitio de trabajo sugerido: ${c.sitio}.`;
  }

  const pasosReporte: Paso[] = [
    { id: "cliente", tipo: "texto", resaltar: "cliente", pregunta: "¿Para qué cliente es el reporte?", sugerencias: demo.clientes.map((c) => c.nombre), ayuda: "Elige uno del directorio para autocompletar sus datos, o escribe uno nuevo." },
    { id: "tipoReporte", tipo: "select", resaltar: "tipoReporte", pregunta: "¿Qué tipo de reporte es?", opciones: [...TIPOS_REPORTE] },
    { id: "fecha", tipo: "fecha", resaltar: "fecha", pregunta: "¿En qué fecha se hizo la visita?", sugerencias: [hoy()] },
    { id: "personaContactada", tipo: "texto", resaltar: "personaContactada", pregunta: "¿Con quién se atendió la visita?", sugerencias: doc.datos && (doc as DocReporte).datos.personaContactada ? [(doc as DocReporte).datos.personaContactada] : [], validar: (v) => (v.trim().length < 3 ? "Escribe el nombre de la persona contactada." : null) },
    {
      id: "asunto",
      tipo: "texto",
      resaltar: "asunto",
      pregunta: "¿Cuál es el asunto?",
      sugerencias: ["Mantenimiento preventivo CCTV", "Reparación fibra óptica", "Instalación control de acceso", "Revisión cerca eléctrica"],
      validar: (v) => (v.trim().length < 5 ? "El asunto debe tener al menos 5 caracteres." : null),
    },
    {
      id: "descripcion",
      tipo: "textarea",
      resaltar: "descripcion",
      pregunta: "Describe el trabajo realizado: diagnóstico, acción y resultado.",
      ayuda: "¿Sin tiempo? Usa «Redactar borrador» y ajústalo: el texto queda en el estilo del formato.",
      generar: () => redactarDescripcion((doc as DocReporte).datos),
      validar: (v) => (v.trim().length < 40 ? "La descripción debe tener al menos 40 caracteres para que sea útil al cliente." : null),
    },
    {
      id: "recomendaciones",
      tipo: "textarea",
      resaltar: "recomendaciones",
      opcional: true,
      pregunta: "¿Alguna recomendación para el cliente?",
      sugerencias: ["Programar mantenimiento preventivo trimestral.", "Proteger con tubería los tramos de cable expuestos.", "Instalar UPS para respaldo eléctrico de los equipos."],
    },
    { id: "nombreTecnico", tipo: "texto", resaltar: "nombreTecnico", pregunta: "Nombre del técnico que firma", sugerencias: [usuario.nombre] },
    { id: "firmaTecnico", tipo: "firma", resaltar: "firmaTecnico", pregunta: "Firma del técnico. Puedes firmar con el dedo desde el celular." },
  ];

  const d = doc.datos as DatosPermiso;
  const pasosPermiso: Paso[] = [
    { id: "cliente", tipo: "texto", resaltar: "cliente", pregunta: "¿Para qué cliente es el permiso de trabajo?", sugerencias: demo.clientes.map((c) => c.nombre) },
    { id: "sitioTrabajo", tipo: "texto", resaltar: "sitioTrabajo", pregunta: "¿Cuál es el sitio de trabajo?", sugerencias: d.sitioTrabajo ? [d.sitioTrabajo] : [] },
    { id: "hora", tipo: "hora", resaltar: "hora", pregunta: "¿A qué hora se emite el permiso?", sugerencias: ["07:00", "07:30", "08:00", "13:00"], ayuda: `Fecha de emisión: ${d.fechaEmision}. Puedes cambiarla en el formato.` },
    {
      id: "puestoProyecto",
      tipo: "select",
      resaltar: "puestoProyecto",
      pregunta: "¿Qué tipo de trabajo se va a realizar?",
      ayuda: "Al elegir la actividad, precargo los peligros, medidas y EPP típicos. Luego los ajustas.",
      opciones: [...Object.keys(PLANTILLAS_ACTIVIDAD), "Otro"],
    },
    { id: "actividades", tipo: "texto", resaltar: "actividades", pregunta: "Describe brevemente las actividades a realizar", sugerencias: d.puestoProyecto ? [`${d.puestoProyecto} en ${d.sitioTrabajo || "sitio"}`] : [] },
    { id: "equipo", tipo: "multi", resaltar: "equipo", pregunta: "Equipo requerido", opciones: [...EQUIPO_REQUERIDO], inicial: () => (doc.datos as DatosPermiso).equipo },
    { id: "peligros", tipo: "multi", resaltar: "peligros", pregunta: "Peligros identificados", opciones: [...PELIGROS], inicial: () => (doc.datos as DatosPermiso).peligros },
    { id: "medidas", tipo: "multi", resaltar: "medidas", pregunta: "Medidas de seguridad requeridas", opciones: [...MEDIDAS], inicial: () => (doc.datos as DatosPermiso).medidas },
    { id: "epp", tipo: "multi", resaltar: "epp", pregunta: "Verificación de elementos de protección personal", opciones: [...EPP], inicial: () => (doc.datos as DatosPermiso).epp },
    {
      id: "verificacion",
      tipo: "verificacion",
      resaltar: "verificacion",
      pregunta: "Verificación de condiciones de trabajo. Responde cada punto.",
      ayuda: "Si algún punto queda en NO, el sistema no deja enviar el permiso: así lo exige el SG-SST.",
      opciones: [...PREGUNTAS_VERIFICACION],
      inicial: () => (doc.datos as DatosPermiso).verificacion,
    },
    { id: "ejecutores", tipo: "ejecutores", resaltar: "ejecutores", pregunta: "¿Quiénes conforman el grupo ejecutor?" },
    { id: "firmaEncargado", tipo: "firma", resaltar: "autorizacion", pregunta: "Firma de la persona encargada de ejecutar el trabajo." },
  ];

  function aplicar(id: string, v: ValorPaso): string | void {
    if (id === "cliente") return elegirCliente(v as string);
    if (id.startsWith("firma")) return;
    if (tipo === "reporte") {
      editarReporte({ [id]: v } as Partial<DatosReporte>);
      return;
    }
    if (id === "puestoProyecto") {
      const t = PLANTILLAS_ACTIVIDAD[v as string];
      if (t) {
        editarPermiso({ puestoProyecto: v as string, equipo: t.equipo, peligros: t.peligros, medidas: t.medidas, epp: t.epp });
        return `Precargué ${t.peligros.length} peligros, ${t.medidas.length} medidas y ${t.epp.length} EPP para «${v}». Revísalos en los siguientes pasos.`;
      }
      editarPermiso({ puestoProyecto: "" });
      return "Escribe el puesto o proyecto directamente en el formato (clic sobre el campo).";
    }
    if (id === "hora") {
      const [h, mm] = (v as string).split(":").map(Number);
      if (!Number.isNaN(h)) editarPermiso({ hora: `${String(h % 12 || 12).padStart(2, "0")}:${String(mm || 0).padStart(2, "0")}`, ampm: h >= 12 ? "PM" : "AM" });
      return;
    }
    if (id === "verificacion") {
      editarPermiso({ verificacion: v as SiNoNa[] });
      if ((v as string[]).includes("NO")) return "⚠️ Hay puntos en NO. Corrige la condición antes de iniciar: el permiso no podrá enviarse así.";
      return;
    }
    if (id === "ejecutores") {
      editarPermiso({ ejecutores: v as Ejecutor[] });
      return "Agregué el grupo ejecutor al formato. Cada persona puede firmar en su fila.";
    }
    editarPermiso({ [id]: v } as Partial<DatosPermiso>);
  }

  function guardarFirma(url: string) {
    const campo = firmando!;
    setFirmando(null);
    if (campo.startsWith("ejecutor:")) {
      const k = Number(campo.split(":")[1]);
      editarPermiso({ ejecutores: d.ejecutores.map((e, j) => (j === k ? { ...e, firma: url } : e)) });
      return;
    }
    if (tipo === "reporte") editarReporte({ [campo]: url } as Partial<DatosReporte>);
    else editarPermiso({ [campo]: url } as Partial<DatosPermiso>);
  }

  function guardar(enviar: boolean) {
    if (enviar && pendientes.length) {
      setAviso(`Faltan ${pendientes.length} punto(s) por completar antes de enviar.`);
      setVista("doc");
      return;
    }
    const clienteId = doc.clienteId || demo.clientes.find((c) => c.nombre === doc.datos.cliente)?.id || "";
    const g = demo.guardar({ ...doc, clienteId });
    if (enviar) demo.enviar(g.id);
    router.push(rutaDoc(g.id, `&ok=${enviar ? "enviado" : "guardado"}`));
  }

  const f = FORMATOS[tipo];
  const acciones = (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" onClick={() => guardar(false)}>
        <Save className="h-4 w-4" /> Guardar borrador
      </Button>
      <Button onClick={() => guardar(true)}>
        <SendHorizonal className="h-4 w-4" /> Enviar a revisión
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-sotec-greenDeep">
            {f.codigo} · v{f.version}
          </p>
          <h1 className="text-xl font-semibold">
            {existente ? "Continuar" : "Nuevo"} {f.corto.toLowerCase()} <span className="font-mono text-base text-slate-500">{doc.codigo}</span>
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
          <Button variant="outline" size="sm" onClick={() => window.print()}>
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

      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className={cn("lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)] print:hidden", vista !== "chat" && "hidden lg:block")}>
          <ChatAsistente
            titulo="Asistente SOTEC"
            subtitulo={`${f.corto} · ${f.codigo}`}
            pasos={tipo === "reporte" ? pasosReporte : pasosPermiso}
            aplicar={aplicar}
            onPaso={(p) => setResaltar(p?.resaltar)}
            onFirmar={(id) => setFirmando(id)}
            firmado={(id) => Boolean((doc.datos as unknown as Record<string, string>)[id])}
            ejecutoresIniciales={tipo === "permiso" ? d.ejecutores : []}
            retomando={Boolean(existente)}
            bienvenida={
              existente
                ? `Retomamos ${doc.codigo}. Edita lo que necesites directamente en el formato.${doc.motivoRechazo ? `\n\nMotivo del rechazo: ${doc.motivoRechazo}` : ""}`
                : `Hola, ${usuario.nombre.split(" ")[0]}. Te guío para diligenciar el ${f.corto.toLowerCase()} (${f.codigo}). Lo que respondas aparece al instante en el formato.`
            }
            acciones={acciones}
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
              <CheckCircle2 className="h-4 w-4" /> Todo completo: ya puedes enviarlo a revisión.
            </p>
          )}
          <p className="text-xs text-slate-500 print:hidden">Clic sobre cualquier campo del formato para editarlo. Los campos resaltados en verde son los que el asistente está preguntando.</p>
          <div className="overflow-x-auto rounded-lg bg-slate-100 p-2 sm:p-4">
            {doc.tipo === "reporte" ? (
              <PlantillaReporte datos={doc.datos} codigoDoc={doc.codigo} editar={editarReporte} firmar={(c) => setFirmando(c)} resaltar={resaltar} />
            ) : (
              <PlantillaPermiso datos={doc.datos} codigoDoc={doc.codigo} editar={editarPermiso} firmar={(c: CampoFirmaPermiso) => setFirmando(c)} resaltar={resaltar} />
            )}
          </div>
          <div className="lg:hidden print:hidden">{acciones}</div>
        </div>
      </div>

      {firmando && <FirmaPad titulo="Firma" onCerrar={() => setFirmando(null)} onGuardar={guardarFirma} />}
    </div>
  );
}
