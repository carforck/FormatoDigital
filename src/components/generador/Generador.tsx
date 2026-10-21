"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Eye, MessageSquare, Printer, Save, SendHorizonal } from "lucide-react";

import { ChatAsistente, type ValorPaso } from "@/components/chat/ChatAsistente";
import { FirmaPad } from "@/components/docs/FirmaPad";
import { Button } from "@/components/ui/button";
import { PlantillaPermiso, type CampoFirmaPermiso } from "@/modulos/permisos/PlantillaPermiso";
import { clienteDoc, moduloDe } from "@/modulos/registro";
import { PlantillaGasto } from "@/modulos/gastos/PlantillaGasto";
import { PlantillaReporte } from "@/modulos/reportes/PlantillaReporte";
import { FORMATOS } from "@/nucleo/catalogos";
import { hoy, useDemo } from "@/nucleo/datos/DemoProvider";
import { rutaDoc } from "@/nucleo/rutas";
import type { DatosGasto, DatosPermiso, DatosReporte, DocGasto, DocPermiso, DocReporte, Documento, TipoDoc } from "@/nucleo/tipos";
import { cn } from "@/lib/utils";
import { avance, faltantes } from "@/nucleo/validar";

interface Props {
  tipo: TipoDoc;
  /** Documento existente a continuar (borrador o rechazado). */
  existente?: Documento;
}

/**
 * Generador genérico: asistente conversacional + vista previa editable.
 * Lo propio de cada formato (pasos, autollenado, reglas) lo aporta su módulo
 * en src/modulos/<clave>/.
 */
export function Generador({ tipo, existente }: Props) {
  const demo = useDemo();
  const router = useRouter();
  const usuario = demo.usuario!;
  const modulo = moduloDe(tipo);
  const [doc, setDoc] = useState<Documento>(() => {
    if (existente) return existente;
    const n = demo.nuevoId(tipo);
    const base = { ...n, estado: "borrador" as const, autorId: usuario.id, clienteId: "", creado: hoy(), actualizado: hoy(), historial: [] };
    return tipo === "reporte"
      ? ({ ...base, tipo, datos: moduloDe("reporte").vacio(hoy(), usuario) } as DocReporte)
      : tipo === "permiso"
        ? ({ ...base, tipo, datos: moduloDe("permiso").vacio(hoy(), usuario) } as DocPermiso)
        : ({ ...base, tipo, datos: moduloDe("gasto").vacio(hoy(), usuario) } as DocGasto);
  });
  const [resaltar, setResaltar] = useState<string | undefined>();
  const [firmando, setFirmando] = useState<string | null>(null);
  const [vista, setVista] = useState<"chat" | "doc">("chat");
  const [aviso, setAviso] = useState<string | null>(null);

  const pendientes = useMemo(() => faltantes(doc), [doc]);
  const pct = avance(doc);

  /** Mezcla un cambio parcial en el contenido del formato. */
  const editar = (cambio: Partial<DatosReporte> | Partial<DatosPermiso> | Partial<DatosGasto>) => setDoc((d) => ({ ...d, datos: { ...d.datos, ...cambio } }) as Documento);

  // Los módulos están tipados por formato; el generador los trata de forma uniforme.
  const mod = modulo as unknown as {
    pasos: (c: { datos: unknown; clientes: typeof demo.clientes; usuarioNombre: string; hoy: string }) => ReturnType<typeof modulo.pasos>;
    aplicar: (id: string, v: ValorPaso, d: unknown) => { cambio: Record<string, unknown>; mensaje?: string };
    alElegirCliente: (c: (typeof demo.clientes)[number]) => { cambio: Record<string, unknown>; mensaje: string };
  };

  function aplicar(id: string, v: ValorPaso): string | void {
    if (id.startsWith("firma")) return;
    if (id === "cliente") {
      const c = demo.clientes.find((x) => x.nombre === v);
      if (!c) {
        setDoc((d) => ({ ...d, clienteId: "", datos: { ...d.datos, [d.tipo === "gasto" ? "clienteObra" : "cliente"]: v as string } }) as Documento);
        return;
      }
      const r = mod.alElegirCliente(c);
      setDoc((d) => ({ ...d, clienteId: c.id, datos: { ...d.datos, ...r.cambio } }) as Documento);
      return r.mensaje;
    }
    const r = mod.aplicar(id, v, doc.datos);
    editar(r.cambio);
    return r.mensaje;
  }

  function guardarFirma(url: string) {
    const campo = firmando!;
    setFirmando(null);
    if (campo.startsWith("ejecutor:") && doc.tipo === "permiso") {
      const k = Number(campo.split(":")[1]);
      editar({ ejecutores: doc.datos.ejecutores.map((e, j) => (j === k ? { ...e, firma: url } : e)) });
      return;
    }
    editar({ [campo]: url });
  }

  function guardar(enviar: boolean) {
    if (enviar && pendientes.length) {
      setAviso(`Faltan ${pendientes.length} punto(s) por completar antes de enviar.`);
      setVista("doc");
      return;
    }
    const clienteId = doc.clienteId || demo.clientes.find((c) => c.nombre === clienteDoc(doc))?.id || "";
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[400px_1fr] [&>*]:min-w-0">
        <div className={cn("lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)] print:hidden", vista !== "chat" && "hidden lg:block")}>
          <ChatAsistente
            titulo="Asistente SOTEC"
            subtitulo={`${f.corto} · ${f.codigo}`}
            pasos={mod.pasos({ datos: doc.datos, clientes: demo.clientes, usuarioNombre: usuario.nombre, hoy: hoy() })}
            aplicar={aplicar}
            onPaso={(p) => setResaltar(p?.resaltar)}
            onFirmar={(id) => setFirmando(id)}
            firmado={(id) => Boolean((doc.datos as unknown as Record<string, string>)[id])}
            ejecutoresIniciales={doc.tipo === "permiso" ? doc.datos.ejecutores : []}
            retomando={Boolean(existente)}
            bienvenida={
              existente
                ? `Retomamos ${doc.codigo}. Edita lo que necesites directamente en el formato.${doc.motivoRechazo ? `\n\nMotivo del rechazo: ${doc.motivoRechazo}` : ""}`
                : `Hola, ${usuario.nombre.split(" ")[0]}. Te guío para diligenciar ${f.el} ${f.corto.toLowerCase()} (${f.codigo}). Lo que respondas aparece al instante en el formato.`
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
              <PlantillaReporte datos={doc.datos} codigoDoc={doc.codigo} editar={editar} firmar={(c) => setFirmando(c)} resaltar={resaltar} />
            ) : doc.tipo === "permiso" ? (
              <PlantillaPermiso datos={doc.datos} codigoDoc={doc.codigo} editar={editar} firmar={(c: CampoFirmaPermiso) => setFirmando(c)} resaltar={resaltar} />
            ) : (
              <PlantillaGasto datos={doc.datos} codigoDoc={doc.codigo} editar={editar} firmar={(c) => setFirmando(c)} resaltar={resaltar} />
            )}
          </div>
          <div className="lg:hidden print:hidden">{acciones}</div>
        </div>
      </div>

      {firmando && <FirmaPad titulo="Firma" onCerrar={() => setFirmando(null)} onGuardar={guardarFirma} />}
    </div>
  );
}
