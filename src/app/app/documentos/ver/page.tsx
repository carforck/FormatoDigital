"use client";

/**
 * Ruta /app/documentos/ver?id=<doc>: detalle de un documento con su plantilla y todas las
 * acciones del flujo (editar, enviar, aprobar/rechazar, firmar, cerrar, duplicar, pedir
 * firma por enlace, enviar, cobrar, PDF). Cada acción se habilita según @/nucleo/permisos y
 * el `flujo` del módulo (@/modulos/registro). Params: ?desde= (regreso), ?ok=guardado|enviado.
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { Cctv, Check, CheckCircle2, Copy, FolderKanban, Link2, Lock, PenLine, Printer, Receipt, Send, SendHorizonal, Trash2, X } from "lucide-react";

import { EnviarDocumento } from "@/components/docs/EnviarDocumento";
import { Volver, marcarEdicion, useAvisoDeRegreso, useOrigen } from "@/components/ui/volver";
import { fondoQueCierra, useModal } from "@/components/ui/useModal";

import { FirmaPad } from "@/components/docs/FirmaPad";
import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/ui/badges";
import { puede, puedeCrearTipo, puedeEditarDoc, puedeRevisarDoc, puedeVerDoc } from "@/nucleo/permisos";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { abrirImpresion } from "@/nucleo/impresion";
import { rutaCuenta, rutaEquipo, rutaProyecto, urlPublica } from "@/nucleo/rutas";
import { equiposAtendidos, equiposIdsDe } from "@/modulos/equipos/logica";
import { IconoEquipo } from "@/modulos/equipos/piezas";
import type { DatosPermiso } from "@/nucleo/tipos";
import { faltantes } from "@/nucleo/validar";
import { clienteDoc, empresaDe, infoDoc, rutaNuevo } from "@/modulos/registro";

/**
 * Contenido del detalle. Reglas clave: solo el autor edita (borrador o rechazado); nadie
 * revisa lo propio; el cierre depende del formato (formulario, firma del cliente o revisor).
 */
function Detalle() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  // Aviso de guardado: en la URL (documento nuevo) o al regresar del formulario de edición
  const avisoRegreso = useAvisoDeRegreso();
  const ok = params.get("ok") ?? avisoRegreso;
  const router = useRouter();
  const demo = useDemo();
  const u = demo.usuario!;
  const doc = demo.documentos.find((d) => d.id === id);
  // Abierto desde un proyecto (?desde=proyecto:<id>), «Volver» regresa al proyecto
  const origen = useOrigen({ href: "/app/documentos", label: "Documentos" });
  const conOrigen = (q: string) => (origen.query ? `${q}&${origen.query}` : q);
  const [firma, setFirma] = useState<null | "aprobar" | "cliente" | "cierre">(null);
  const [rechazo, setRechazo] = useState<string | null>(null);
  const [cierre, setCierre] = useState<Partial<DatosPermiso>>({ cierreAreaLimpia: "", cierraNombre: u.nombre, firmaCierre: "" });
  const [envio, setEnvio] = useState<null | { enlace?: string }>(null);
  // Un solo duplicado aunque se haga doble clic (el botón sigue en pantalla hasta que cambia la ruta)
  const duplicando = useRef(false);

  if (!doc || !puedeVerDoc(u, doc)) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="font-semibold">Documento no disponible para este perfil</p>
        <Link href="/app/documentos" className="mt-3 inline-block text-sm text-sotec-greenDeep underline">
          Ir a documentos
        </Link>
      </div>
    );
  }

  const info = infoDoc(doc.tipo);
  // Equipos atendidos (módulo Equipos): salen en el formato y enlazan a su ficha
  const atendidos = equiposAtendidos(equiposIdsDe(doc), demo.equiposVisibles);
  const { flujo, Plantilla } = info;
  const f = info.formato;
  const editable = puedeEditarDoc(u, doc);
  const pend = faltantes(doc);
  // Nadie aprueba ni rechaza su propio documento (separación de funciones)
  const revisa = puedeRevisarDoc(u, doc);
  // El cierre depende del formato: formulario (permiso), firma del cliente (reporte, cotización) o un revisor (gastos)
  const cierraPermiso = flujo.cierre === "formulario" && doc.estado === "aprobado" && puede(u.rol, "cerrar_permiso");
  const firmaCliente = flujo.cierre === "cliente" && Boolean(flujo.campoFirmaCliente) && doc.estado === "aprobado" && ((u.rol === "cliente" && doc.clienteId === u.clienteId) || puede(u.rol, "revisar"));
  const cierraRevisor = flujo.cierre === "revisor" && doc.estado === "aprobado" && puede(u.rol, "revisar");
  const proyecto = demo.proyectos.find((p) => p.id === doc.proyectoId);
  const datosLibres = doc.datos as unknown as Record<string, string | undefined>;
  const nombre = (uid: string) => demo.usuarios.find((x) => x.id === uid)?.nombre ?? "Sistema";
  const datosVista = doc.tipo === "permiso" && cierraPermiso ? { ...doc.datos, ...cierre } : doc.datos;
  const cliente = demo.clientes.find((c) => c.id === doc.clienteId);
  const correoCliente = datosLibres.correo || cliente?.correo || "";
  const telCliente = datosLibres.telefono || cliente?.telefono || "";
  const interno = u.rol !== "cliente";
  const pedirFirma = interno && doc.tipo === "reporte" && doc.estado === "aprobado" && !doc.datos.firmaCliente;
  const cuenta = doc.tipo === "reporte" ? demo.cuentaDeReporte(doc.id) : undefined;
  const puedeCobrar = doc.tipo === "reporte" && (doc.estado === "aprobado" || doc.estado === "cerrado") && !cuenta && puede(u.rol, "cobros");
  const empresa = demo.config.empresa;
  const contacto = datosLibres.personaContactada || cliente?.contacto;

  return (
    <div className="space-y-4">
      <Volver href={origen.href} label={origen.label} />

      {ok && (
        <p className="print:hidden flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          {ok === "enviado"
            ? flujo.aprobarAlEnviar
              ? "Aprobada y enviada: el cliente ya la ve en su portal para aceptarla con su firma."
              : "Enviado a revisión. El Coordinador SST recibió una notificación (cambia a ese perfil para aprobarlo)."
            : "Borrador guardado."}
        </p>
      )}

      <div className="print:hidden flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-sotec-greenDeep">
            {f.codigo} · {f.corto}
          </p>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
            <span className="font-mono">{doc.codigo}</span> <EstadoBadge estado={doc.estado} tipo={doc.tipo} />
          </h1>
          <p className="text-sm text-slate-500">
            {clienteDoc(doc)} · por {nombre(doc.autorId)}
          </p>
          {proyecto && (
            <Link href={rutaProyecto(proyecto.id)} className="mt-1 block text-sm font-medium text-sotec-greenDeep hover:underline">
              {/* En línea (no flex): en celular el nombre largo se parte como texto y el código no se corta */}
              <FolderKanban className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />
              Proyecto <span className="whitespace-nowrap font-mono">{proyecto.codigo}</span> · {proyecto.nombre}
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Button
              variant="outline"
              onClick={() => {
                marcarEdicion();
                router.push(rutaNuevo(doc.tipo, conOrigen(`id=${doc.id}`)));
              }}
            >
              <PenLine className="h-4 w-4" /> Editar
            </Button>
          )}
          {editable && (
            <Button disabled={pend.length > 0} title={pend.length ? "Completa los pendientes" : ""} onClick={() => demo.enviar(doc.id)}>
              <SendHorizonal className="h-4 w-4" /> {flujo.aprobarAlEnviar ?? "Enviar a revisión"}
            </Button>
          )}
          {revisa && (
            <>
              <Button onClick={() => (flujo.firmaAlAprobar ? setFirma("aprobar") : demo.aprobar(doc.id))}>
                <Check className="h-4 w-4" /> {flujo.aprobar}
              </Button>
              <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => setRechazo("")}>
                <X className="h-4 w-4" /> Rechazar
              </Button>
            </>
          )}
          {firmaCliente && (
            <Button onClick={() => setFirma("cliente")}>
              <PenLine className="h-4 w-4" /> {flujo.cerrar}
            </Button>
          )}
          {puedeCrearTipo(u.rol, doc.tipo) && (
            <Button
              variant="outline"
              onClick={() => {
                if (duplicando.current) return;
                duplicando.current = true;
                const nid = demo.duplicar(doc.id);
                if (nid) router.push(rutaNuevo(doc.tipo, conOrigen(`id=${nid}`)));
              }}
            >
              <Copy className="h-4 w-4" /> Duplicar
            </Button>
          )}
          {cierraRevisor && (
            <Button onClick={() => demo.cerrar(doc.id, {})}>
              <CheckCircle2 className="h-4 w-4" /> {flujo.cerrar}
            </Button>
          )}
          {pedirFirma && (
            <Button
              variant="outline"
              onClick={() => {
                const token = demo.crearEnlaceFirma(doc.id, correoCliente);
                if (token) setEnvio({ enlace: urlPublica("/firmar", `t=${token}`) });
              }}
            >
              <Link2 className="h-4 w-4" /> Pedir firma al cliente
            </Button>
          )}
          {interno && info.visibleCliente && doc.estado !== "borrador" && (
            <Button variant="outline" onClick={() => setEnvio({})}>
              <Send className="h-4 w-4" /> Enviar
            </Button>
          )}
          {puedeCobrar && (
            <Button
              variant="outline"
              onClick={() => {
                marcarEdicion();
                router.push(`/app/cobros/nueva?cliente=${doc.clienteId}&reporte=${doc.id}&desde=doc:${doc.id}`);
              }}
            >
              <Receipt className="h-4 w-4" /> Crear cuenta de cobro
            </Button>
          )}
          <Button variant="outline" onClick={() => abrirImpresion(router, { doc: doc.id })}>
            <Printer className="h-4 w-4" /> PDF
          </Button>
          {editable && doc.estado === "borrador" && (
            <Button
              variant="ghost"
              aria-label="Eliminar"
              onClick={() => {
                if (confirm(`¿Eliminar el borrador ${doc.codigo}?`)) {
                  demo.eliminar(doc.id);
                  // El documento borrado no queda en el historial del navegador
                  router.replace(origen.href);
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-rose-600" />
            </Button>
          )}
        </div>
      </div>

      {cuenta && puede(u.rol, "ver_cobros") && (
        <Link href={`${rutaCuenta(cuenta.id)}&desde=doc:${doc.id}`} className="print:hidden flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 hover:bg-sky-100">
          <Receipt className="h-4 w-4" /> Este reporte ya se cobró en la cuenta de cobro <strong className="font-mono">{cuenta.codigo}</strong> →
        </Link>
      )}

      {doc.estado === "rechazado" && doc.motivoRechazo && (
        <p className="print:hidden rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <strong>Motivo del rechazo:</strong> {doc.motivoRechazo}
        </p>
      )}
      {editable && pend.length > 0 && (
        <div className="print:hidden rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Pendiente para enviar ({pend.length}):</strong> {pend.join(" · ")}
        </div>
      )}
      {!editable && u.rol !== "cliente" && (doc.estado === "en_revision" || doc.estado === "aprobado" || doc.estado === "cerrado") && (
        <p className="print:hidden flex items-center gap-2 text-xs text-slate-500">
          <Lock className="h-3.5 w-3.5" /> Documento bloqueado: después de enviarse no se puede modificar, así queda la trazabilidad del SGC.
        </p>
      )}

      {cierraPermiso && (
        <div className="print:hidden space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          <p>
            <strong>Cierre del permiso:</strong> marca SI/NO en el formato, confirma el nombre y firma en la casilla de cierre.
          </p>
          <Button
            size="sm"
            disabled={!cierre.cierreAreaLimpia || !cierre.firmaCierre || !cierre.cierraNombre}
            onClick={() => demo.cerrar(doc.id, cierre)}
          >
            <Lock className="h-4 w-4" /> Cerrar permiso
          </Button>
        </div>
      )}

      {atendidos.length > 0 && (
        <section aria-label="Equipos atendidos" className="print:hidden rounded-lg border border-slate-200 bg-white p-3">
          <h2 className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Cctv className="h-3.5 w-3.5" aria-hidden /> Equipos atendidos · {atendidos.length}
          </h2>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {atendidos.map((e) => (
              <li key={e.id} className="min-w-0 max-w-full">
                <Link href={`${rutaEquipo(e.id)}&desde=doc:${doc.id}`} className="flex min-w-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-sotec-greenDeep">
                  <IconoEquipo tipo={e.tipo} sistema={e.sistema} className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{e.nombre}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="overflow-x-auto rounded-lg bg-slate-100 p-2 sm:p-4">
          <Plantilla
            datos={datosVista}
            codigoDoc={doc.codigo}
            empresa={empresaDe(demo.config)}
            equipos={atendidos}
            editarCierre={cierraPermiso ? (p) => setCierre((c) => ({ ...c, ...(p as Partial<DatosPermiso>) })) : undefined}
            firmar={cierraPermiso ? () => setFirma("cierre") : undefined}
            resaltar={cierraPermiso ? "cierre" : undefined}
          />
        </div>
        <aside className={u.rol === "cliente" ? "hidden" : "print:hidden h-fit rounded-xl border border-slate-200 bg-white p-4"}>
          <h2 className="text-sm font-semibold">Trazabilidad</h2>
          <ol className="mt-3 space-y-3 border-l border-slate-200 pl-4">
            {doc.historial.map((h, k) => (
              <li key={k} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-sotec-green ring-2 ring-white" />
                <p className="font-medium">{h.accion}</p>
                <p className="text-xs text-slate-500">
                  {nombre(h.usuarioId)} · {h.fecha.replace("T", " ").slice(0, 16)}
                </p>
                {h.detalle && <p className="text-xs italic text-slate-600">“{h.detalle}”</p>}
              </li>
            ))}
          </ol>
        </aside>
      </div>

      {firma && (
        <FirmaPad
          titulo={firma === "aprobar" ? (doc.tipo === "gasto" ? "Firma del Vo.Bo." : "Firma de quien autoriza") : firma === "cliente" ? "Firma del cliente" : "Firma de quien cierra"}
          onCerrar={() => setFirma(null)}
          onGuardar={(url) => {
            if (firma === "aprobar") demo.aprobar(doc.id, url);
            // El módulo decide qué más se llena con la firma (p. ej. la fecha de aceptación de la cotización)
            if (firma === "cliente" && flujo.campoFirmaCliente) demo.cerrar(doc.id, info.aplicarFirma(flujo.campoFirmaCliente, url, doc.datos) as Partial<typeof doc.datos>);
            if (firma === "cierre") setCierre((c) => ({ ...c, firmaCierre: url }));
            setFirma(null);
          }}
        />
      )}

      {envio && (
        <EnviarDocumento
          titulo={envio.enlace ? `Pedir firma de ${doc.codigo}` : `Enviar ${doc.codigo}`}
          correo={correoCliente}
          telefono={telCliente}
          asunto={`${f.corto} ${doc.codigo} · ${empresa}`}
          mensaje={
            envio.enlace
              ? `Cordial saludo${contacto ? `, ${contacto}` : ""}.\n\n${empresa} le comparte ${f.el} ${f.corto.toLowerCase()} ${doc.codigo} del servicio realizado en ${clienteDoc(doc)}. Por favor revíselo y fírmelo desde su celular en el siguiente enlace (válido por 7 días):`
              : `Cordial saludo${contacto ? `, ${contacto}` : ""}.\n\n${empresa} le comparte ${f.el} ${f.corto.toLowerCase()} ${doc.codigo} (${f.codigo}) correspondiente a ${clienteDoc(doc)}. Quedamos atentos a cualquier inquietud.`
          }
          enlace={envio.enlace}
          onEnviado={(canal, destino) => demo.registrarEnvio({ docId: doc.id }, canal, destino)}
          onCerrar={() => setEnvio(null)}
        />
      )}

      {rechazo !== null && <DialogoRechazo codigo={doc.codigo} motivo={rechazo} setMotivo={setRechazo} onRechazar={() => demo.rechazar(doc.id, rechazo.trim())} />}
    </div>
  );
}

/** Motivo del rechazo: Esc o un toque fuera cierran, el foco queda dentro (useModal). */
function DialogoRechazo({ codigo, motivo, setMotivo, onRechazar }: { codigo: string; motivo: string; setMotivo: (m: string | null) => void; onRechazar: () => void }) {
  const cerrar = () => setMotivo(null);
  const ref: React.MutableRefObject<HTMLDivElement | null> = useModal<HTMLDivElement>(cerrar, { focoInicial: (): HTMLElement | null => ref.current?.querySelector("textarea") ?? null });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" {...fondoQueCierra(cerrar)}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={`Rechazar ${codigo}`} className="w-full max-w-md rounded-xl bg-white p-4">
        <p className="font-semibold">Rechazar {codigo}</p>
        <p className="text-sm text-slate-500">El autor recibe el motivo y puede corregirlo.</p>
        <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-3 w-full rounded-md border border-slate-300 p-2 text-sm" placeholder="Ej: falta la lista de verificación de alturas" />
        <div className="mt-2 flex flex-wrap gap-1">
          {["Falta detallar las recomendaciones", "Firma del ejecutor incompleta", "EPP insuficiente para el riesgo"].map((s) => (
            <button key={s} onClick={() => setMotivo(s)} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50">
              {s}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={motivo.trim().length < 5}
            onClick={() => {
              onRechazar();
              cerrar();
            }}
          >
            Rechazar
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Suspense requerido por useSearchParams. */
export default function Page() {
  return (
    <Suspense>
      <Detalle />
    </Suspense>
  );
}
