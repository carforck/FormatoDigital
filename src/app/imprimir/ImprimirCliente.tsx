"use client";

/**
 * Ruta /imprimir: hoja limpia para imprimir o guardar en PDF un documento, una cuenta de
 * cobro o el borrador del generador (se abre con abrirImpresion de @/nucleo/impresion).
 * Cualquier perfil con sesión, sujeto a puedeVerDoc / puedeVerCuenta. Otros params:
 * ?volver= (regreso, solo rutas /app), ?n= (evita reimprimir al recargar), ?auto=0 (no imprime solo).
 */
import Link from "next/link";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Printer } from "lucide-react";

import { ConVariante } from "@/components/docs/VarianteFormato";
import { PlantillaCuentaCobro } from "@/modulos/cobros/PlantillaCuentaCobro";
import { equiposAtendidos, equiposIdsDe } from "@/modulos/equipos/logica";
import { clienteDoc, empresaDe, infoDoc, prefijoDe } from "@/modulos/registro";
import { hoy, useDemo } from "@/nucleo/datos/DemoProvider";
import { CLAVE_ORIGEN_IMPRESION, leerBorradorImpresion, tituloArchivo } from "@/nucleo/impresion";
import { puedeUsarTipo, puedeVerCuenta, puedeVerDoc } from "@/nucleo/permisos";
import type { Documento, TipoDoc } from "@/nucleo/tipos";

/**
 * Papel de cada formato: el permiso y la legalización se diseñaron en A4; el resto toma el
 * papel que elija quien imprime (carta o A4). Forzar carta hacía que al imprimir en A4 el
 * navegador ajustara la hoja y a veces sacara una página en blanco.
 */
const PAPEL: Partial<Record<TipoDoc, "A4" | "letter">> = { permiso: "A4", gasto: "A4" };

/** Solo rutas internas del aplicativo como destino de «Volver». */
const destinoSeguro = (v: string | null) => (v && /^\/app(\/|\?|$)/.test(v) ? v : "/app/documentos");

/**
 * Página de impresión: solo las hojas del documento (formato + anexos), en
 * flujo normal, tema claro y sin el shell del aplicativo. Espera fotos y
 * fuentes, pone el consecutivo como título (nombre del PDF) e imprime una vez.
 *
 *   /imprimir?doc=<id> · /imprimir?cuenta=<id> · /imprimir?borrador=<clave>&tipo=<tipo>&id=<id>
 */
function Imprimir() {
  const params = useSearchParams();
  const router = useRouter();
  const demo = useDemo();
  const u = demo.usuario;
  const volver = destinoSeguro(params.get("volver"));
  const nonce = params.get("n") ?? "";
  const zona = useRef<HTMLDivElement>(null);
  const [lista, setLista] = useState(false);

  // ── Qué se imprime
  let hojas: ReactNode = null;
  let titulo = "";
  let papel: "A4" | "letter" | null = null;
  let aviso: string | null = null;
  let error: string | null = null;

  const idDoc = params.get("doc");
  const idCuenta = params.get("cuenta");
  const claveBorrador = params.get("borrador");

  if (demo.listo && u) {
    if (idCuenta) {
      const c = demo.cuentas.find((x) => x.id === idCuenta);
      if (!c || !puedeVerCuenta(u, c)) error = "Cuenta de cobro no disponible para este perfil";
      else {
        const cliente = demo.clientes.find((x) => x.id === c.clienteId);
        titulo = tituloArchivo([c.codigo, "Cuenta de cobro", cliente?.nombre]);
        hojas = (
          <PlantillaCuentaCobro
            cuenta={c}
            cliente={cliente}
            proyecto={demo.proyectos.find((x) => x.id === c.proyectoId)}
            config={demo.config}
            documentos={demo.documentos}
            firmante={demo.usuarios.find((x) => x.id === c.creadoPor)?.nombre}
          />
        );
      }
    } else {
      let doc: Documento | undefined;
      let guardado: Documento | undefined;
      if (claveBorrador !== null) {
        // Lo que el generador tiene en memoria; si no está, su guardado automático
        const tipo = params.get("tipo") as TipoDoc | null;
        doc = leerBorradorImpresion(claveBorrador) ?? undefined;
        if (!doc && tipo) {
          try {
            const d = JSON.parse(localStorage.getItem(`fd-generador-${tipo}-${u.id}`) ?? "null") as Documento | null;
            if (d && d.tipo === tipo && d.autorId === u.id) doc = d;
          } catch {
            /* sin almacenamiento */
          }
        }
        // Último recurso: la versión guardada del documento que se estaba editando
        if (!doc) doc = demo.documentos.find((x) => x.id === params.get("id"));
        guardado = doc && demo.documentos.find((x) => x.id === doc!.id);
        if (doc && !(guardado ? puedeVerDoc(u, guardado) : puedeUsarTipo(u.rol, doc.tipo) && doc.autorId === u.id)) doc = undefined;
      } else {
        guardado = demo.documentos.find((x) => x.id === idDoc);
        doc = guardado && puedeVerDoc(u, guardado) ? guardado : undefined;
      }
      if (!doc) error = claveBorrador !== null ? "No encontré el borrador para imprimir. Vuelve al formulario e inténtalo de nuevo." : "Documento no disponible para este perfil";
      else {
        const info = infoDoc(doc.tipo);
        const { Plantilla } = info;
        papel = PAPEL[doc.tipo] ?? null;
        if (!guardado) aviso = "Borrador sin guardar — guárdalo para asignarle su consecutivo.";
        else if (claveBorrador !== null && JSON.stringify([doc.datos, doc.equiposIds ?? []]) !== JSON.stringify([guardado.datos, guardado.equiposIds ?? []]))
          aviso = "Incluye cambios sin guardar — guárdalos para que queden en el documento.";
        // Sin guardar, el código es provisional (como en el generador); el archivo no lo lleva
        const codigo = guardado ? doc.codigo : `${prefijoDe(demo.config, doc.tipo)}-borrador-${hoy()}`;
        titulo = tituloArchivo([codigo, info.formato.corto, clienteDoc(doc)]);
        const equipos = equiposAtendidos(equiposIdsDe(doc), guardado ? demo.equiposVisibles : demo.equipos);
        // Con la variante de formato del documento (o la que resolvió el generador para el borrador)
        hojas = (
          <ConVariante variante={doc.variante} tipo={doc.tipo}>
            <Plantilla datos={doc.datos} codigoDoc={doc.codigo} empresa={empresaDe(demo.config)} equipos={equipos} />
          </ConVariante>
        );
      }
    }
  }

  // Título = nombre del archivo PDF (Chrome, Android y Safari lo usan por defecto): el consecutivo del documento.
  // Next aplica el título de los metadatos al navegar dentro de la app y en algunos celulares lo hace después de
  // este efecto; por eso se vuelve a fijar si algo lo cambia mientras la página está abierta y justo antes de imprimir.
  const tituloRef = useRef("");
  tituloRef.current = titulo;
  useEffect(() => {
    if (!titulo) return;
    const fijar = () => {
      if (document.title !== tituloRef.current) document.title = tituloRef.current;
    };
    fijar();
    const obs = new MutationObserver(fijar);
    obs.observe(document.head, { subtree: true, childList: true, characterData: true });
    window.addEventListener("beforeprint", fijar);
    return () => {
      obs.disconnect();
      window.removeEventListener("beforeprint", fijar);
    };
  }, [titulo]);

  // Marca de la página: las reglas de impresión dentro del aplicativo no aplican aquí
  useEffect(() => {
    document.documentElement.classList.add("fd-impresion");
    return () => document.documentElement.classList.remove("fd-impresion");
  }, []);

  // Fotos decodificadas y fuentes listas; luego imprime una sola vez por apertura
  const impreso = useRef(false);
  useEffect(() => {
    if (!hojas || !zona.current) return;
    let vivo = true;
    const imgs = Array.from(zona.current.querySelectorAll("img"));
    const cargar = (img: HTMLImageElement) =>
      (img.complete ? Promise.resolve() : new Promise<void>((r) => { img.addEventListener("load", () => r(), { once: true }); img.addEventListener("error", () => r(), { once: true }); }))
        .then(() => (img.decode ? img.decode().catch(() => {}) : undefined));
    const limite = new Promise((r) => setTimeout(r, 10000));
    void Promise.race([Promise.all([...imgs.map(cargar), document.fonts?.ready]), limite])
      .then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
      .then(() => {
        if (!vivo) return;
        setLista(true);
        if (impreso.current || params.get("auto") === "0") return;
        impreso.current = true;
        const marca = `fd-imprimir-hecho-${nonce}`;
        try {
          if (nonce && sessionStorage.getItem(marca)) return; // ya se imprimió (volvió con «adelante» o recargó)
          if (nonce) sessionStorage.setItem(marca, "1");
        } catch {
          /* sin almacenamiento */
        }
        if (tituloRef.current) document.title = tituloRef.current;
        window.print();
      });
    return () => {
      vivo = false;
    };
    // Se calcula una vez que el documento está en pantalla
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(hojas)]);

  const imprimir = () => {
    if (tituloRef.current) document.title = tituloRef.current;
    window.print();
  };

  /** «Volver»: si se abrió desde el aplicativo en esta pestaña usa «atrás»; si no, reemplaza por ?volver=. */
  const regresar = () => {
    let origen: string | null = null;
    try {
      origen = sessionStorage.getItem(CLAVE_ORIGEN_IMPRESION);
      sessionStorage.removeItem(CLAVE_ORIGEN_IMPRESION);
    } catch {
      /* sin almacenamiento */
    }
    // Abierta desde el aplicativo en esta pestaña: «atrás» deja el historial como estaba
    if (origen === params.get("volver") && window.history.length > 1) router.back();
    else router.replace(volver);
  };

  const barra = (
    <div className="print:hidden sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[860px] flex-wrap items-center gap-2 px-4 py-2">
        <button type="button" onClick={regresar} className="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Volver
        </button>
        <p className="min-w-0 flex-1 truncate text-center font-mono text-xs text-slate-500">{titulo}</p>
        <button
          type="button"
          onClick={imprimir}
          disabled={!hojas}
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-sotec px-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
        >
          <Printer className="h-4 w-4" aria-hidden /> Imprimir / Guardar PDF
        </button>
      </div>
    </div>
  );

  if (!demo.listo) return <p className="p-10 text-center text-sm text-slate-500">Cargando…</p>;
  if (!u || error) {
    return (
      <main className="min-h-screen bg-slate-100">
        {barra}
        <div className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-semibold">{u ? error : "Inicia sesión para imprimir"}</p>
          <Link href={u ? volver : "/acceso"} className="mt-3 inline-block text-sm text-sotec-greenDeep underline">
            {u ? "Volver" : "Ir al acceso"}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="fd-impresion-pagina min-h-screen bg-slate-100 print:bg-white">
      {/* Tamaño del papel del formato; márgenes en cero: cada hoja trae su margen interior */}
      <style>{papel ? `@page { size: ${papel}; margin: 0; }` : "@page { margin: 0; }"}</style>
      {barra}
      {aviso && (
        <p role="status" className="print:hidden mx-auto mt-3 flex max-w-[816px] items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> {aviso}
        </p>
      )}
      <div ref={zona} className="fd-hojas mx-auto max-w-[860px] px-2 py-4 sm:px-6 print:max-w-none print:p-0" data-impresion-lista={lista ? "1" : undefined}>
        {hojas}
      </div>
    </main>
  );
}

/** Parte de cliente de /imprimir (la página de servidor pone el título desde ?t=). Suspense requerido por useSearchParams. */
export function ImprimirCliente() {
  return (
    <Suspense>
      <Imprimir />
    </Suspense>
  );
}
