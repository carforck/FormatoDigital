"use client";

/**
 * Plantilla del acta de entrega: réplica de «PROGRAMACIÓN Y ACTA DE ENTREGA DEL SISTEMA DE
 * SEGURIDAD ELECTRÓNICA» de Fortox (FORMA 7PA/F1-13, insumos/fortox-7PA-F1-13-acta-de-entrega.pdf,
 * fuera del repo). Formato propio de Fortox (variante «fortox», @/nucleo/variantes): dos hojas carta.
 *   Hoja 1: logo, título, No., Cliente Nuevo / Adición, ciudad y fecha; I. Información de contacto;
 *           II. Materiales (dos tablas de 6 renglones); III. Zonificación (tipo de sistema,
 *           particiones 1–8 y zonas 1–36); sedes de Fortox y la FORMA.
 *   Hoja 2: registro de usuarios activos (Unidad nueva / Actualización), IV. Personal responsable
 *           (27 renglones), V. Horarios, capacitación, VI. Protocolos, declaración, firmas y
 *           VII. Control interno (Fortox lo firma en papel: va en blanco).
 * Los renglones y casillas son bordes de verdad (nada de degradados: en Safari iOS salen como un
 * cuadro negro). Las claves van con `CampoClave` (enmascaradas según `ConClaves`).
 * En la demo el logo es la marca de la app (LogoFormato) y el pie lleva el crédito (PieContacto).
 */
import type { ReactNode } from "react";

import { CampoClave } from "@/components/docs/Claves";
import { EditableText } from "@/components/docs/EditableText";
import { Firma, LogoFormato } from "@/components/docs/Encabezado";
import { PieContacto } from "@/components/docs/PieContacto";
import { Renglones } from "@/components/docs/Renglones";
import { cn } from "@/lib/utils";
import type { PropsPlantilla } from "@/modulos/contrato";

import {
  CAPACITACION_TEXTO,
  CONTROL_INTERNO,
  DECLARACION_ACTA,
  DIAS_ACTA,
  MAX_MATERIALES,
  MAX_PARTICIONES,
  MAX_USUARIOS,
  MAX_ZONAS,
  NOTA_PERSONAL,
  SEDES_FORTOX,
  SISTEMAS_ACTA,
  TEMAS_CAPACITACION,
  casillasFecha,
  materialVacio,
  usuarioVacio,
} from "./catalogo";
import type { DatosActa, DiaActa, MaterialActa, UsuarioActa, ZonaActa } from "./tipos";

/** Azul de las franjas del formato de Fortox y gris de los encabezados de tabla. */
const AZUL = "#17375E";
const GRIS = "#D9D9D9";
const BEIGE = "#EEECE1";
const FORMA = "7PA/F1-13";

type CampoTexto =
  | "ciudad"
  | "fecha"
  | "cliente"
  | "abonado"
  | "nit"
  | "an8"
  | "ciudadCliente"
  | "direccion"
  | "telefono"
  | "barrio"
  | "correo"
  | "contacto"
  | "cargo"
  | "panel"
  | "comunicacionPrimaria"
  | "simCard"
  | "comunicacionSecundaria"
  | "intervaloTest"
  | "capacitacionOtro"
  | "observaciones"
  | "nombreFirmaCliente"
  | "cedulaFirmaCliente"
  | "tecnico";

/** Franja azul de sección («I. INFORMACIÓN DE CONTACTO»). */
function Franja({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="border border-black py-[1px] text-center font-bold uppercase leading-tight text-white" style={{ backgroundColor: AZUL }}>
      {children}
      {sub && <div className="text-[7.5px] font-normal normal-case leading-tight">{sub}</div>}
    </div>
  );
}

/** Casilla del formato (□ / ☒): botón al diligenciar, dibujo al ver o imprimir. */
function Casilla({ marcada, etiqueta, onClick }: { marcada: boolean; etiqueta: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      aria-pressed={marcada}
      aria-label={etiqueta}
      className="inline-flex h-[11px] w-[13px] shrink-0 items-center justify-center border border-black bg-white text-[9px] font-bold leading-none disabled:cursor-default"
    >
      {marcada ? "X" : ""}
    </button>
  );
}

/** Réplica del acta de entrega de Fortox (dos hojas carta). */
export function HojaActaFortox({ datos, codigoDoc, editar, firmar, resaltar }: PropsPlantilla<DatosActa>) {
  const res = (...k: string[]) => resaltar !== undefined && k.includes(resaltar) && "rounded-sm bg-sotec-green/40 ring-2 ring-sotec-green print:bg-transparent print:ring-0";
  const campo = (k: CampoTexto, o: { type?: "text" | "date" | "tel" | "email"; placeholder?: string; multiline?: boolean; className?: string } = {}) => (
    <span className={cn("rounded transition-colors", res(k), o.className)}>
      <EditableText
        value={String(datos[k] ?? "")}
        disabled={!editar}
        type={o.type}
        multiline={o.multiline}
        placeholder={o.placeholder ?? " "}
        ariaLabel={k}
        onCommit={(v) => editar?.({ [k]: v } as Partial<DatosActa>)}
        className={o.multiline ? "block min-h-[1.1em] w-full whitespace-pre-line" : undefined}
      />
    </span>
  );
  /** Renglón «Etiqueta: ______». */
  const linea = (etiqueta: string, k: CampoTexto, o: { type?: "text" | "tel" | "email"; ancho?: string; className?: string } = {}) => (
    <div className={cn("flex min-w-0 items-end gap-1", o.className)}>
      <span className={cn("shrink-0", o.ancho)}>{etiqueta}</span>
      <span className="min-w-0 flex-1 truncate border-b border-black leading-tight print:whitespace-normal">{campo(k, { type: o.type })}</span>
    </div>
  );
  const clave = (etiqueta: string, k: "claveMaestra" | "claveInstalador", ancho?: string) => (
    <div className={cn("flex min-w-0 items-end gap-1", res(k, "claves"))}>
      <span className={cn("shrink-0", ancho)}>{etiqueta}</span>
      <span className="min-w-0 flex-1 border-b border-black leading-tight">
        <CampoClave valor={datos[k]} etiqueta={etiqueta.replace(/:$/, "")} onCambiar={editar ? (v) => editar({ [k]: v } as Partial<DatosActa>) : undefined} />
      </span>
    </div>
  );
  const alternar = <T extends string>(lista: T[], x: T) => (lista.includes(x) ? lista.filter((y) => y !== x) : [...lista, x]);

  // ── Tablas: renglones fijos del papel; editar un renglón vacío lo crea
  const material = (i: number, patch: Partial<MaterialActa>) =>
    editar?.((d) => {
      const lista = [...d.materiales];
      while (lista.length <= i) lista.push(materialVacio());
      lista[i] = { ...lista[i], ...patch };
      return { materiales: lista.filter((m) => m.descripcion.trim() || m.despacho || m.instalado || m.reintegro) };
    });
  const zona = (numero: number, patch: Partial<ZonaActa>) =>
    editar?.((d) => {
      const actual = d.zonas.find((z) => z.numero === numero) ?? { numero, cantidad: "", descripcion: "", particion: "" };
      const nueva = { ...actual, ...patch };
      const resto = d.zonas.filter((z) => z.numero !== numero);
      const llena = nueva.cantidad || nueva.descripcion.trim() || nueva.particion;
      return { zonas: (llena ? [...resto, nueva] : resto).sort((a, b) => a.numero - b.numero) };
    });
  const usuario = (i: number, patch: Partial<UsuarioActa>) =>
    editar?.((d) => {
      const lista = [...d.usuarios];
      while (lista.length <= i) lista.push(usuarioVacio());
      lista[i] = { ...lista[i], ...patch };
      return { usuarios: lista.filter((u) => u.nombre.trim() || u.cargo || u.usuario || u.claveTelefonica || u.telefono || u.celular) };
    });
  const celdaTexto = (valor: string, etiqueta: string, onCommit: (v: string) => void, className?: string) => (
    <EditableText value={valor} disabled={!editar} placeholder=" " ariaLabel={etiqueta} onCommit={onCommit} className={className} />
  );

  const [aa, mm, dd] = casillasFecha(datos.fecha);
  const td = "border border-black px-1 leading-[11px]";
  const th = "border border-black px-1 font-normal leading-[11px]";
  const mitad = MAX_MATERIALES / 2;

  const tablaMateriales = (desde: number) => (
    <table className="w-full table-fixed border-collapse text-center">
      <thead>
        <tr style={{ backgroundColor: GRIS }}>
          <th rowSpan={2} className={cn(th, "w-[55%]")}>
            Descripción
          </th>
          <th colSpan={3} className={th}>
            Cantidad
          </th>
        </tr>
        <tr style={{ backgroundColor: GRIS }}>
          <th className={th}>Despacho</th>
          <th className={th}>Instalado</th>
          <th className={th}>Reintegro</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: mitad }, (_, k) => {
          const i = desde + k;
          const m = datos.materiales[i];
          return (
            <tr key={i} className="h-[13px]">
              <td className={cn(td, "text-left")}>{celdaTexto(m?.descripcion ?? "", `Material ${i + 1}`, (v) => material(i, { descripcion: v }))}</td>
              {(["despacho", "instalado", "reintegro"] as const).map((c) => (
                <td key={c} className={td}>
                  {celdaTexto(m?.[c] ?? "", `${c} ${i + 1}`, (v) => material(i, { [c]: v.trim() }))}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const particion = (i: number) => (
    <tr key={i} className="h-[12px]">
      <td className={cn(td, "w-[17%] text-center")}>{i + 1}</td>
      <td className={td}>
        {celdaTexto(datos.particiones[i] ?? "", `Partición ${i + 1}`, (v) =>
          editar?.((d) => ({ particiones: Array.from({ length: MAX_PARTICIONES }, (_, j) => (j === i ? v.trim() : d.particiones[j] ?? "")) })),
        )}
      </td>
    </tr>
  );

  return (
    <div className="doc-zona space-y-4">
      {/* ═══════════════ HOJA 1 ═══════════════ */}
      <article className="doc-print doc-acta mx-auto w-full max-w-[816px] bg-white p-4 text-[9.5px] leading-tight shadow-sm ring-1 ring-slate-200 sm:p-8" data-hoja="acta-fortox">
        <div className="border-t border-black pt-1">
          <div className="grid grid-cols-[30%_1fr] items-end gap-2">
            <div className="self-center">
              {/* En la demo, la marca de la app en vez del logo de Fortox (LogoFormato) */}
              <LogoFormato className="h-12 w-auto object-contain" anchoDemo="max-w-[170px]" alt="FORTOX" />
            </div>
            <div>
              <h2 className="text-center text-[11.5px] font-bold leading-tight">PROGRAMACIÓN Y ACTA DE ENTREGA DEL SISTEMA DE SEGURIDAD ELECTRÓNICA</h2>
              <div className="mt-0.5 flex justify-end">
                <div className="w-[40%] text-[9px] font-bold">
                  NO.
                  <div className="border-b border-black text-center font-mono text-[10px] font-normal">{codigoDoc ?? " "}</div>
                </div>
              </div>
              <div className="mt-1 flex items-end justify-between gap-2">
                <div className={cn("flex flex-wrap items-center gap-x-6 gap-y-1 pb-0.5", res("tipoActa"))}>
                  {(["Cliente Nuevo", "Adición"] as const).map((t) => (
                    <span key={t} className="inline-flex items-center gap-2">
                      {t}
                      <Casilla marcada={datos.tipoActa === t} etiqueta={t} onClick={editar ? () => editar({ tipoActa: datos.tipoActa === t ? "" : t }) : undefined} />
                    </span>
                  ))}
                </div>
                <table className="w-[40%] shrink-0 table-fixed border-collapse text-center">
                  <tbody>
                    <tr style={{ backgroundColor: GRIS }}>
                      <td className={cn(td, "w-1/2 font-bold")}>CIUDAD</td>
                      <td colSpan={3} className={cn(td, "font-bold")}>
                        FECHA
                      </td>
                    </tr>
                    <tr className="h-[14px]">
                      <td className={cn(td, res("ciudad"))}>{campo("ciudad")}</td>
                      {editar ? (
                        <td colSpan={3} className={cn(td, res("fecha"))}>
                          {campo("fecha", { type: "date" })}
                        </td>
                      ) : (
                        [aa, mm, dd].map((x, i) => (
                          <td key={i} className={cn(td, !x && "text-slate-400")}>
                            {x || ["AA", "MM", "DD"][i]}
                          </td>
                        ))
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* I. Información de contacto */}
        <section className="mt-0.5">
          <Franja>I. INFORMACIÓN DE CONTACTO</Franja>
          <div className="grid grid-cols-1 gap-x-4 gap-y-[3px] px-0.5 py-1 sm:grid-cols-[1.15fr_1fr] print:grid-cols-[1.15fr_1fr]">
            {linea("Nombre del Cliente:", "cliente")}
            {linea("Abonado", "abonado", { ancho: "w-16" })}
            <div className="flex min-w-0 gap-3">
              {linea("NIT:", "nit", { className: "flex-1" })}
              {linea("AN8:", "an8", { className: "w-[45%]" })}
            </div>
            {linea("Ciudad", "ciudadCliente", { ancho: "w-16" })}
            {linea("Dirección:", "direccion")}
            {linea("Teléfono:", "telefono", { type: "tel", ancho: "w-16" })}
            {linea("Barrio:", "barrio")}
            {linea("E-mail:", "correo", { type: "email", ancho: "w-16" })}
            {linea("Contacto:", "contacto")}
            {linea("Cargo:", "cargo", { ancho: "w-16" })}
            {linea("Marca y Ref. Panel de alarma:", "panel", { className: "sm:col-span-2 print:col-span-2" })}
            {linea("Medio de Comunicación Primario:", "comunicacionPrimaria")}
            {linea("Sim Card # :", "simCard")}
            {linea("Medio de Comunicación Secundario:", "comunicacionSecundaria")}
            {linea("Intervalo de Test:", "intervaloTest")}
            {clave("Clave Maestra:", "claveMaestra")}
            {clave("Clave de Instalador:", "claveInstalador")}
          </div>
        </section>

        {/* II. Materiales: dos tablas de 6 renglones lado a lado */}
        <section className={cn("mt-0.5", res("materiales"))}>
          <Franja>II. MATERIALES</Franja>
          <div className="grid grid-cols-2">
            <div className="border-r-2 border-black">{tablaMateriales(0)}</div>
            {tablaMateriales(mitad)}
          </div>
        </section>

        {/* III. Zonificación */}
        <section className="mt-0.5">
          <Franja>III. ZONIFICACIÓN DEL SISTEMA</Franja>
          <div className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-0.5 py-1.5", res("sistemas"))}>
            <span className="font-bold">Tipo de Sistema:</span>
            {SISTEMAS_ACTA.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                {s}
                <Casilla marcada={datos.sistemas.includes(s)} etiqueta={s} onClick={editar ? () => editar({ sistemas: alternar(datos.sistemas, s) }) : undefined} />
              </span>
            ))}
          </div>
          <div className={cn("grid grid-cols-2 gap-4", res("particiones"))}>
            {[0, 4].map((desde) => (
              <table key={desde} className="w-full table-fixed border-collapse">
                <thead>
                  <tr style={{ backgroundColor: GRIS }}>
                    <th className={cn(th, "w-[17%]")}>Partición #</th>
                    <th className={th}>Nombre de {desde ? "partición" : "Partición"}</th>
                  </tr>
                </thead>
                <tbody>{[0, 1, 2, 3].map((k) => particion(desde + k))}</tbody>
              </table>
            ))}
          </div>
          <table className={cn("mt-1.5 w-full table-fixed border-collapse", res("zonas"))}>
            <thead>
              <tr style={{ backgroundColor: GRIS }}>
                <th className={cn(th, "w-[8%]")}># Zona</th>
                <th className={cn(th, "w-[6.5%]")}>Cantidad</th>
                <th className={th}>Descripción de zona</th>
                <th className={cn(th, "w-[8.5%]")}>Partición</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: MAX_ZONAS }, (_, k) => {
                const n = k + 1;
                const z = datos.zonas.find((x) => x.numero === n);
                return (
                  <tr key={n} className="h-[11.5px]">
                    <td className={cn(td, "text-center")}>{n}</td>
                    <td className={cn(td, "text-center")}>{celdaTexto(z?.cantidad ?? "", `Cantidad zona ${n}`, (v) => zona(n, { cantidad: v.trim() }))}</td>
                    <td className={td}>{celdaTexto(z?.descripcion ?? "", `Zona ${n}`, (v) => zona(n, { descripcion: v.trim() }))}</td>
                    <td className={cn(td, "text-center")}>{celdaTexto(z?.particion ?? "", `Partición zona ${n}`, (v) => zona(n, { particion: v.trim() }))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Sedes de Fortox y la FORMA */}
        <div className="border-x border-b border-black px-2 py-1.5">
          <div className="grid grid-cols-4 gap-x-2 gap-y-1 text-center text-[8px] font-bold leading-tight sm:grid-cols-7 print:grid-cols-7">
            {SEDES_FORTOX.map(([ciudad, pbx]) => (
              <div key={ciudad}>
                <div>{ciudad}</div>
                <div>PBX: {pbx}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-[8px]">FORMA: {FORMA}</div>
        <PieContacto tipo="acta" className="!mt-0" />
      </article>

      {/* ═══════════════ HOJA 2 ═══════════════ */}
      <article className="doc-print doc-acta mx-auto w-full max-w-[816px] bg-white p-4 text-[9.5px] leading-tight shadow-sm ring-1 ring-slate-200 sm:p-8" data-hoja="acta-fortox-2">
        <h2 className="mt-1 text-center text-[11px] font-bold">REGISTRO DE USUARIOS ACTIVOS EN EL SISTEMA DE ALARMA</h2>
        <div className={cn("mx-auto mt-1.5 flex w-fit flex-wrap items-center justify-center gap-x-10 gap-y-1 font-bold", res("registro"))}>
          {(["Unidad nueva", "Actualización de datos"] as const).map((t) => (
            <span key={t} className="inline-flex items-center gap-3">
              {t}
              <Casilla marcada={datos.registro === t} etiqueta={t} onClick={editar ? () => editar({ registro: datos.registro === t ? "" : t }) : undefined} />
            </span>
          ))}
        </div>

        <section className={cn("mt-2 overflow-x-auto", res("usuarios", "clavesUsuarios"))}>
          <Franja sub={NOTA_PERSONAL}>IV. PERSONAL RESPONSABLE</Franja>
          <table className="w-full min-w-[600px] table-fixed border-collapse print:min-w-0">
            <thead>
              <tr style={{ backgroundColor: BEIGE }} className="font-bold">
                <th className={cn(th, "w-[25.5%] font-bold")}>Nombre</th>
                <th className={cn(th, "w-[19.5%] font-bold")}>Cargo</th>
                <th className={cn(th, "w-[15%] font-bold")}>Usuario</th>
                <th className={cn(th, "w-[13%] font-bold")}>Clave Telefónica</th>
                <th className={cn(th, "w-[14%] font-bold")}>Teléfono residencia</th>
                <th className={cn(th, "font-bold")}>Celular</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: MAX_USUARIOS }, (_, i) => {
                const u = datos.usuarios[i];
                return (
                  <tr key={i} className="h-[13px]">
                    <td className={td}>{celdaTexto(u?.nombre ?? "", `Nombre usuario ${i + 1}`, (v) => usuario(i, { nombre: v.trim() }))}</td>
                    <td className={td}>{celdaTexto(u?.cargo ?? "", `Cargo usuario ${i + 1}`, (v) => usuario(i, { cargo: v.trim() }))}</td>
                    <td className={cn(td, "text-center")}>{celdaTexto(u?.usuario ?? "", `Usuario ${i + 1}`, (v) => usuario(i, { usuario: v.trim() }))}</td>
                    <td className={cn(td, "text-center")}>
                      {(u || editar) && <CampoClave valor={u?.claveTelefonica ?? ""} etiqueta={`Clave telefónica ${i + 1}`} onCambiar={editar && u ? (v) => usuario(i, { claveTelefonica: v }) : undefined} />}
                    </td>
                    <td className={cn(td, "text-center")}>{celdaTexto(u?.telefono ?? "", `Teléfono usuario ${i + 1}`, (v) => usuario(i, { telefono: v.trim() }))}</td>
                    <td className={cn(td, "text-center")}>{celdaTexto(u?.celular ?? "", `Celular usuario ${i + 1}`, (v) => usuario(i, { celular: v.trim() }))}</td>
                  </tr>
                );
              })}
              <tr className="h-[14px]">
                <td colSpan={6} className="border border-black" />
              </tr>
            </tbody>
          </table>
        </section>

        {/* V. Horarios */}
        <section className="border-x border-b border-black">
          <Franja>V. HORARIOS</Franja>
          <div className={cn("overflow-x-auto px-6 py-2", res("horarios"))}>
            <table className="w-full min-w-[520px] table-fixed border-collapse print:min-w-0">
              <thead>
                <tr style={{ backgroundColor: BEIGE }}>
                  <th className={cn(th, "w-[12%] border-r font-bold")}>Actividad/Día</th>
                  {DIAS_ACTA.map((d) => (
                    <th key={d} className="border-y border-black px-1 text-left font-bold leading-[13px]">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["apertura", "cierre"] as const).map((fila) => (
                  <tr key={fila} className="h-[15px]">
                    <td className={cn(td, "text-center font-bold uppercase")}>{fila}</td>
                    {DIAS_ACTA.map((d: DiaActa, k) => (
                      <td key={d} className={cn("border-b border-black px-1", k === DIAS_ACTA.length - 1 && "border-r")}>
                        <Casilla marcada={datos[fila].includes(d)} etiqueta={`${fila === "apertura" ? "Apertura" : "Cierre"} ${d}`} onClick={editar ? () => editar({ [fila]: alternar(datos[fila], d) } as Partial<DatosActa>) : undefined} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={cn("px-4 pb-2", res("capacitacion"))}>
            <p className="font-bold">{CAPACITACION_TEXTO}</p>
            <div className="mt-1 grid grid-cols-1 gap-x-10 gap-y-0.5 pl-10 sm:grid-cols-2 print:grid-cols-2">
              {[TEMAS_CAPACITACION[0], TEMAS_CAPACITACION[2], TEMAS_CAPACITACION[1]].map((t) => (
                <span key={t} className="flex items-center justify-between gap-2">
                  {t}:
                  <Casilla marcada={datos.capacitacion.includes(t)} etiqueta={t} onClick={editar ? () => editar({ capacitacion: alternar(datos.capacitacion, t) }) : undefined} />
                </span>
              ))}
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1">
                  Otro. Cuál? <span className="border-b border-black">{campo("capacitacionOtro")}</span>
                </span>
                <Casilla marcada={Boolean(datos.capacitacionOtro.trim())} etiqueta="Otro" />
              </span>
            </div>
          </div>

          {/* VI. Protocolos u observaciones */}
          <Franja>VI. PROTOCOLOS U OBSERVACIONES DEL CLIENTE</Franja>
          <Renglones minimo={4} alto={15} texto={datos.observaciones} className={cn("mx-4 mt-1 text-[10px]", res("observaciones"))}>
            {campo("observaciones", { multiline: true })}
          </Renglones>
          <p className="mx-4 mt-1 text-justify font-bold">{DECLARACION_ACTA}</p>

          {/* Firmas */}
          <div className="grid grid-cols-2 gap-14 px-10 pb-3 pt-2">
            <div className={cn("text-center", res("firmaCliente"))}>
              <div className="mx-auto max-w-[220px]">
                <Firma src={datos.firmaCliente} etiqueta="cliente" texto="✍ Toca para que firme el cliente" onFirmar={firmar ? () => firmar("firmaCliente") : undefined} />
              </div>
              <div className="border-t border-black pt-0.5 font-bold">Firma y C.C Cliente</div>
              <div className="text-[9px]">
                {campo("nombreFirmaCliente", { placeholder: editar ? "Nombre" : " " })}
                {(datos.cedulaFirmaCliente || editar) && <> · C.C. {campo("cedulaFirmaCliente", { placeholder: editar ? "Cédula" : " " })}</>}
              </div>
            </div>
            <div className={cn("flex flex-col justify-end text-center", res("tecnico"))}>
              <div className="text-[10px]">{campo("tecnico")}</div>
              <div className="border-t border-black pt-0.5 font-bold">Nombre del Técnico</div>
              <div className="text-[9px]">&nbsp;</div>
            </div>
          </div>

          {/* VII. Control interno: lo firma Fortox en papel */}
          <Franja>VII. CONTROL INTERNO</Franja>
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr style={{ backgroundColor: GRIS }}>
                <th className={cn(th, "w-[39%] border-l-0")}>Actividad</th>
                <th className={cn(th, "w-[21%]")}>Responsable</th>
                <th className={cn(th, "w-[21%]")}>Firma</th>
                <th className={th}>AA</th>
                <th className={cn(th, "w-[5.5%]")}>MM</th>
                <th className={cn(th, "w-[4.2%] border-r-0")}>DD</th>
              </tr>
            </thead>
            <tbody>
              {CONTROL_INTERNO.map(([actividad, responsable]) => (
                <tr key={actividad} className="fila-alta h-[22px]">
                  <td className={cn(td, "border-l-0")}>{actividad}</td>
                  <td className={td}>{responsable}</td>
                  <td className={td} />
                  <td className={td} />
                  <td className={td} />
                  <td className={cn(td, "border-r-0")} />
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <div className="text-[8px]">FORMA: {FORMA}</div>
        {datos.proyecto && <p className="print:hidden mt-1 text-[9px] text-slate-500">Proyecto: {datos.proyecto}</p>}
        <PieContacto tipo="acta" className="!mt-0" />
      </article>
    </div>
  );
}
