"use client";

/**
 * Plantilla del F-GSST-13 · Permiso de trabajo: réplica en A4 con casillas,
 * verificaciones SI/NO/N/A, grupo ejecutor (mínimo 5 filas impresas) y la
 * sección de cierre, que se edita aparte con `editarCierre`.
 */

import { EPP, EQUIPO_REQUERIDO, MEDIDAS, PELIGROS, PREGUNTAS_VERIFICACION } from "@/modulos/permisos/catalogo";
import { cn } from "@/lib/utils";
import type { DatosPermiso, Ejecutor, SiNoNa } from "@/nucleo/tipos";

import { EditableText } from "@/components/docs/EditableText";
import { Encabezado, Firma } from "@/components/docs/Encabezado";

/** Campos que se firman en el pad; `ejecutor:<i>` es la fila i del grupo ejecutor. */
export type CampoFirmaPermiso = "firmaAutoriza" | "firmaEncargado" | "firmaCierre" | `ejecutor:${number}`;

interface Props {
  datos: DatosPermiso;
  codigoDoc?: string;
  editar?: (patch: Partial<DatosPermiso>) => void;
  firmar?: (campo: CampoFirmaPermiso) => void;
  resaltar?: string;
  /** Permite llenar el cierre aunque el resto esté bloqueado (lo usa el emisor). */
  editarCierre?: (patch: Partial<DatosPermiso>) => void;
}

/** Réplica del F-GSST-13 · Permiso de trabajo (A4). */
export function PlantillaPermiso({ datos, codigoDoc, editar, firmar, resaltar, editarCierre }: Props) {
  const txt = (k: keyof DatosPermiso, opts: { type?: "text" | "date"; placeholder?: string; fn?: Props["editar"] } = {}) => {
    const fn = opts.fn ?? editar;
    return (
      <span className={cn("rounded", resaltar === k && "bg-sotec-green/40 ring-2 ring-sotec-green")}>
        <EditableText
          value={String(datos[k] ?? "")}
          disabled={!fn}
          type={opts.type}
          placeholder={opts.placeholder ?? " "}
          ariaLabel={k}
          onCommit={(v) => fn?.({ [k]: v } as Partial<DatosPermiso>)}
        />
      </span>
    );
  };

  const toggle = (lista: "equipo" | "peligros" | "medidas" | "epp", item: string) => {
    if (!editar) return;
    const actual = datos[lista];
    editar({ [lista]: actual.includes(item) ? actual.filter((x) => x !== item) : [...actual, item] } as Partial<DatosPermiso>);
  };

  const opcion = (lista: "equipo" | "peligros" | "medidas" | "epp", item: string, extra?: React.ReactNode) => {
    const on = datos[lista].includes(item);
    return (
      <div key={item} className="flex items-start gap-1.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={on}
          aria-label={item}
          disabled={!editar}
          onClick={() => toggle(lista, item)}
          className={cn(
            "mt-[2px] h-3 w-3 shrink-0 rounded-full border border-black",
            on && "bg-black",
            editar && "cursor-pointer hover:ring-2 hover:ring-sotec-green",
          )}
        />
        <span className="leading-tight">
          {item}
          {extra}
        </span>
      </div>
    );
  };

  const seccion = (titulo: string, clave: string) => (
    <div className={cn("border-x border-b border-black py-0.5 text-center text-[12px] font-bold", resaltar === clave && "bg-sotec-green/40")}>{titulo}</div>
  );

  const editarEjecutor = (i: number, patch: Partial<Ejecutor>) =>
    editar?.({ ejecutores: datos.ejecutores.map((e, j) => (j === i ? { ...e, ...patch } : e)) });

  const filas = Math.max(5, datos.ejecutores.length);

  return (
    <div className="doc-zona">
    <article className="doc-print doc-compacto mx-auto w-full max-w-[794px] bg-white p-5 text-[10.5px] leading-snug shadow-sm ring-1 ring-slate-200 sm:p-8">
      <Encabezado tipo="permiso" codigoDoc={codigoDoc} />

      <table className="mt-1 w-full border-collapse border border-black">
        <tbody>
          <tr>
            <td className="w-[18%] border border-black px-1">Fecha emisión</td>
            <td className="border border-black px-1">{txt("fechaEmision", { type: "date" })}</td>
            <td className="w-[8%] border border-black px-1 text-center">HORA</td>
            <td className="w-[14%] border border-black px-1">{txt("hora", { placeholder: "hh:mm" })}</td>
            {(["AM", "PM"] as const).map((x) => (
              <td key={x} className="w-[6%] border border-black text-center">
                <button type="button" disabled={!editar} onClick={() => editar?.({ ampm: x })} className={cn("w-full", datos.ampm === x && "bg-black font-bold text-white")}>
                  {x}
                </button>
              </td>
            ))}
            <td className="w-[16%] border border-black px-1">No. {codigoDoc}</td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border-x border-b border-black">
        <tbody>
          <tr>
            <td className="w-[18%] border border-black px-1">Nombre de cliente</td>
            <td className="border border-black px-1 text-center font-bold uppercase">{txt("cliente")}</td>
            <td className="w-[18%] border border-black px-1">Sitio de trabajo</td>
            <td className="w-[22%] border border-black px-1">{txt("sitioTrabajo")}</td>
          </tr>
          <tr>
            <td className="border border-black px-1">Puesto / Proyecto</td>
            <td className="border border-black px-1 text-center">{txt("puestoProyecto")}</td>
            <td className="border border-black px-1">Responsable del trabajo</td>
            <td className="border border-black px-1 text-center">{txt("responsable")}</td>
          </tr>
          <tr>
            <td className="border border-black px-1">Actividades a realizar</td>
            <td colSpan={3} className="border border-black px-1 text-center">{txt("actividades")}</td>
          </tr>
        </tbody>
      </table>

      {seccion("EQUIPO REQUERIDO:", "equipo")}
      <div className="grid grid-cols-3 gap-x-3 gap-y-1 border-x border-b border-black p-1.5">
        {EQUIPO_REQUERIDO.map((e) =>
          opcion(
            "equipo",
            e,
            e === "Maquinaria" ? <span className="ml-1">· Cuál: {txt("maquinariaCual")}</span> : e === "Equipo menor" ? <span className="ml-1">· Cuál: {txt("equipoMenorCual")}</span> : null,
          ),
        )}
        <div className="col-span-3">Otros: {txt("equipoOtros")}</div>
      </div>

      {seccion("PELIGROS IDENTIFICADOS:", "peligros")}
      <div className="grid grid-cols-3 gap-x-3 gap-y-1 border-x border-b border-black p-1.5">
        {PELIGROS.map((p) => opcion("peligros", p))}
        <div className="col-span-3">Otros. Cuáles: {txt("peligrosOtros")}</div>
      </div>

      {seccion("MEDIDAS DE SEGURIDAD REQUERIDAS:", "medidas")}
      <div className="grid grid-cols-3 gap-x-3 gap-y-1 border-x border-b border-black p-1.5">
        {MEDIDAS.map((m) => opcion("medidas", m))}
        <div className="col-span-3">Otras. Cuáles: {txt("medidasOtras")}</div>
      </div>

      {seccion("VERIFICACIÓN ELEMENTOS DE PROTECCIÓN", "epp")}
      <div className="grid grid-cols-3 gap-x-3 gap-y-1 border-x border-b border-black p-1.5">
        {EPP.map((e) => opcion("epp", e))}
        <div className="col-span-3">Otro: {txt("eppOtro")}</div>
      </div>

      {seccion("VERIFICACIÓN DE CONDICIONES DE TRABAJO", "verificacion")}
      <table className="w-full border-collapse border-x border-b border-black">
        <thead>
          <tr className="bg-slate-100 font-bold">
            <td className="border border-black px-1 text-center">PERSONAL EJECUTANTE</td>
            {(["SI", "NO", "N/A"] as const).map((h) => (
              <td key={h} className="w-9 border border-black text-center">
                {h}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {PREGUNTAS_VERIFICACION.map((q, i) => (
            <tr key={i}>
              <td className="border border-black px-1">
                {i + 1}. {q}
              </td>
              {(["SI", "NO", "NA"] as SiNoNa[]).map((v) => (
                <td key={v} className="border border-black text-center">
                  <button
                    type="button"
                    disabled={!editar}
                    aria-label={`Pregunta ${i + 1}: ${v}`}
                    onClick={() => editar?.({ verificacion: datos.verificacion.map((x, j) => (j === i ? v : x)) })}
                    className={cn("h-5 w-full font-bold", editar && "hover:bg-sotec-soft", datos.verificacion[i] === "NO" && v === "NO" && "text-rose-700")}
                  >
                    {datos.verificacion[i] === v ? "x" : ""}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className={cn("border-x border-b border-black bg-slate-200 py-0.5 text-center text-[13px] font-bold", resaltar === "ejecutores" && "bg-sotec-green/50")}>GRUPO EJECUTOR</div>
      <p className="border-x border-b border-black py-0.5 text-center text-[9.5px] font-bold">
        ATENCIÓN!! EL PERMISO PIERDE VALIDEZ AL SONAR ALARMA, SEÑAL DE EMERGENCIA O AL PRESENTARSE LLUVIAS O VIENTOS FUERTES
      </p>
      <table className="w-full border-collapse border-x border-b border-black">
        <thead>
          <tr className="bg-slate-300 text-center font-bold">
            <td className="border border-black py-1">Nombre</td>
            <td className="w-[15%] border border-black">No. de cédula</td>
            <td className="w-[17%] border border-black">ARL / EPS</td>
            <td className="w-[11%] border border-black">Hora de inicio</td>
            <td className="w-[11%] border border-black">Hora de terminación</td>
            <td className="w-[20%] border border-black">FIRMA</td>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: filas }).map((_, i) => {
            const e = datos.ejecutores[i];
            if (!e) {
              return (
                <tr key={i} className="h-6">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="border border-black" />
                  ))}
                </tr>
              );
            }
            const celda = (k: keyof Ejecutor) => (
              <EditableText value={e[k]} disabled={!editar} placeholder=" " ariaLabel={`${k} ${i + 1}`} onCommit={(v) => editarEjecutor(i, { [k]: v })} />
            );
            return (
              <tr key={i} className="text-center">
                <td className="border border-black px-1">{celda("nombre")}</td>
                <td className="border border-black px-1">{celda("cedula")}</td>
                <td className="border border-black px-1 text-[9px]">{celda("arlEps")}</td>
                <td className="border border-black px-1">{celda("horaInicio")}</td>
                <td className="border border-black px-1">{celda("horaFin")}</td>
                <td className="border border-black px-1">
                  <Firma src={e.firma} etiqueta={e.nombre} onFirmar={firmar ? () => firmar(`ejecutor:${i}`) : undefined} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-x border-b border-black py-0.5 text-center text-[9.5px]">
        Hacemos constar que conocemos los riesgos relacionados con este trabajo y se han aclarado todas las dudas antes de firmar e iniciar el mismo.
      </p>

      <div className={cn("border-x border-b border-black bg-slate-500 py-0.5 text-center font-bold text-white", resaltar === "autorizacion" && "bg-sotec-greenDeep")}>AUTORIZACIÓN</div>
      <div className="grid grid-cols-2 border-x border-b border-black text-center">
        <div className="border-r border-black p-1">
          <Firma src={datos.firmaAutoriza} etiqueta="autoriza" onFirmar={firmar ? () => firmar("firmaAutoriza") : undefined} />
          <div className="font-semibold">{txt("autoriza")}</div>
          <div className="text-[9px] text-slate-500">NOMBRE Y FIRMA DE LA PERSONA QUE AUTORIZA</div>
        </div>
        <div className="p-1">
          <Firma src={datos.firmaEncargado} etiqueta="encargado" onFirmar={firmar ? () => firmar("firmaEncargado") : undefined} />
          <div className="font-semibold">{txt("encargado")}</div>
          <div className="text-[9px] text-slate-500">NOMBRE Y FIRMA DE LA PERSONA ENCARGADA DE EJECUTAR EL TRABAJO</div>
        </div>
      </div>

      <div className={cn("border-x border-b border-black bg-slate-300 py-0.5 text-center font-bold", resaltar === "cierre" && "bg-sotec-green/60")}>
        Cierre del Permiso de Trabajo <span className="font-normal">(espacio para uso exclusivo del emisor del permiso)</span>
      </div>
      <div className="grid grid-cols-[70px_1fr_1fr] border-x border-b border-black">
        <div className="border-r border-black">
          {(["SI", "NO"] as const).map((x) => (
            <button
              key={x}
              type="button"
              disabled={!editarCierre}
              onClick={() => editarCierre?.({ cierreAreaLimpia: x })}
              className={cn("block w-full border-b border-black py-0.5 last:border-b-0", datos.cierreAreaLimpia === x ? "bg-black font-bold text-white" : "text-slate-500")}
            >
              {x}
            </button>
          ))}
        </div>
        <div className="border-r border-black p-1 text-center text-[9.5px] text-slate-600">
          ¿El área donde se ejecutó el trabajo quedó libre de basuras, materiales y residuos y se hizo disposición adecuada de basuras, materiales, equipos y residuos?
        </div>
        <div className="p-1 text-center">
          <Firma src={datos.firmaCierre} etiqueta="cierre" onFirmar={editarCierre && firmar ? () => firmar("firmaCierre") : undefined} />
          <div className="font-semibold">{txt("cierraNombre", { fn: editarCierre })}</div>
          <div className="text-[9px] text-slate-500">NOMBRE Y FIRMA DE LA PERSONA QUE CIERRA</div>
        </div>
      </div>
    </article>
    </div>
  );
}
