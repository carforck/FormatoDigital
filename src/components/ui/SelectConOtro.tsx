"use client";

/**
 * «＋ Agregar otro» en los formularios (pedido de SOTEC: «si de pronto no tengo el producto
 * creado, que pueda agregar otro… en todos los campos que se pueda colocar otro»). Lo mismo
 * que ya hace el asistente (`ChatAsistente`), con el MISMO almacén de la empresa
 * (`config.opcionesPropias`, @/nucleo/opciones): lo que se escribe se usa de una vez, queda
 * para todo el equipo en el formulario y en el asistente, y la administración lo revisa en
 * Configuración · «Opciones agregadas».
 *
 * - `SelectConOtro`: `<select>` nativo (accesible y cómodo en el celular) con la última opción
 *   «＋ Agregar otro…», que cambia el control por un campo de texto en el mismo lugar.
 * - `AgregarOtro`: botón «＋ Agregar otro» para listas de chips o casillas.
 * - `useListaPropia`: catálogo + lo agregado + lo que ya tiene el documento, y `agregar`.
 *
 * No repite opciones (sin mayúsculas, tildes ni espacios de más), recorta y no acepta vacío.
 * Enter confirma y Esc cancela sin enviar el formulario que lo contiene (no es un `<form>`:
 * puede ir dentro de otro). Sin sesión (p. ej. /firmar) no se ofrece agregar.
 */
import { useState } from "react";
import { Check, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDemoOpcional } from "@/nucleo/datos/DemoProvider";
import { buscarOpcion, comparable, limpiarOpcion, unirOpciones } from "@/nucleo/opciones";

/** Valor reservado de la opción «＋ Agregar otro…» del `<select>`. */
const OTRO = "__agregar_otro__";

/**
 * Opciones de una lista de la empresa: `base` (catálogo del formato) + lo agregado con
 * «＋ Agregar otro» (`clave`) + `actuales` (valores que ya tiene el documento, aunque se hayan
 * quitado de la lista). `etiqueta` es el texto visible si difiere del valor (p. ej. sistemas).
 */
export function useListaPropia(clave: string | undefined, base: readonly string[], actuales: readonly string[] = [], etiqueta?: (v: string) => string) {
  const demo = useDemoOpcional();
  const propias = clave ? demo?.config.opcionesPropias?.[clave] : undefined;
  const opciones = unirOpciones(base, propias, actuales);
  const puedeAgregar = Boolean(clave && demo?.usuario);

  /** Agrega (si no estaba) y devuelve la opción que queda elegida; null si el texto está vacío. */
  function agregar(texto: string): string | null {
    const v = limpiarOpcion(texto);
    if (!v) return null;
    const lista = unirOpciones(base, propias);
    const existente = buscarOpcion(lista, v) ?? (etiqueta ? lista.find((x) => comparable(etiqueta(x)) === comparable(v)) : undefined);
    if (existente) return existente;
    if (clave) demo?.agregarOpcion(clave, v);
    return v;
  }
  return { opciones, agregar, puedeAgregar };
}

interface PropsCampoOtro {
  onAgregar: (texto: string) => void;
  onCancelar: () => void;
  placeholder?: string;
  /** Nombre accesible del campo («Nuevo tipo de gasto»). */
  etiqueta: string;
  /** Dentro de una plantilla: hereda la letra del formato y ocupa poco. */
  compacto?: boolean;
  className?: string;
}

/** Campo de texto de la opción nueva con «Agregar» y «Cancelar». */
function CampoOtro({ onAgregar, onCancelar, placeholder = "Escribe la nueva opción", etiqueta, compacto, className }: PropsCampoOtro) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState(false);
  const confirmar = () => {
    if (!limpiarOpcion(texto)) return setError(true);
    onAgregar(texto);
  };
  const boton = compacto ? "rounded p-0.5" : "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border";
  return (
    <span className={cn("block print:hidden", className)}>
      <span className="flex items-center gap-1">
        <input
          autoFocus
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => {
            // Enter no envía el formulario que lo contiene; Esc vuelve a la lista
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              confirmar();
            } else if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onCancelar();
            }
          }}
          placeholder={placeholder}
          aria-label={etiqueta}
          aria-invalid={error || undefined}
          enterKeyHint="done"
          className={cn(
            "min-w-0 flex-1 rounded border bg-white text-slate-900 outline-none focus:ring-2 focus:ring-sotec-green/50",
            compacto ? "border-sotec-greenDeep px-1 py-0 text-inherit" : "h-10 rounded-md border-slate-300 px-2 text-sm",
            error && "border-rose-500",
          )}
        />
        <button type="button" onClick={confirmar} aria-label="Agregar" title="Agregar" className={cn(boton, "border-sotec-greenDeep bg-sotec-soft text-sotec-greenDeep hover:bg-sotec-green/30")}>
          <Check className={compacto ? "h-3 w-3" : "h-4 w-4"} aria-hidden />
        </button>
        <button type="button" onClick={onCancelar} aria-label="Cancelar" title="Cancelar" className={cn(boton, "border-slate-200 text-slate-500 hover:bg-slate-100")}>
          <X className={compacto ? "h-3 w-3" : "h-4 w-4"} aria-hidden />
        </button>
      </span>
      {error && (
        <span role="alert" className={cn("block text-rose-700", compacto ? "text-[0.85em]" : "mt-0.5 text-xs")}>
          Escribe la nueva opción.
        </span>
      )}
    </span>
  );
}

interface PropsSelect {
  /** Lista de la empresa donde se guarda lo nuevo (`LISTA` o «formato.paso»); sin clave no se ofrece agregar. */
  clave?: string;
  /** Catálogo del formato. */
  base: readonly string[];
  value: string;
  onChange: (v: string) => void;
  /** Texto de la opción vacía («Selecciona…»); sin esto no hay opción vacía. */
  vacio?: string;
  /** Texto visible de cada valor (p. ej. la clave «cctv» → «Sistema CCTV»). */
  etiqueta?: (v: string) => string;
  /** Texto de la última opción. Por defecto «＋ Agregar otro…». */
  textoOtro?: string;
  placeholderOtro?: string;
  className?: string;
  /** Nombre accesible del `<select>`. */
  "aria-label"?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  /** Dentro de una plantilla (letra del formato, sin alto mínimo). */
  compacto?: boolean;
}

/** `<select>` con «＋ Agregar otro…»: lo escrito queda elegido y guardado para toda la empresa. */
export function SelectConOtro({ clave, base, value, onChange, vacio, etiqueta, textoOtro = "＋ Agregar otro…", placeholderOtro, className, id, disabled, required, compacto, ...rest }: PropsSelect) {
  const { opciones, agregar, puedeAgregar } = useListaPropia(clave, base, value ? [value] : [], etiqueta);
  const [otro, setOtro] = useState(false);
  const nombre = rest["aria-label"];

  if (otro)
    return (
      <CampoOtro
        compacto={compacto}
        etiqueta={nombre ? `Nuevo: ${nombre}` : "Nueva opción"}
        placeholder={placeholderOtro}
        onCancelar={() => setOtro(false)}
        onAgregar={(t) => {
          const v = agregar(t);
          if (!v) return;
          onChange(v);
          setOtro(false);
        }}
      />
    );

  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      required={required}
      aria-label={nombre}
      onChange={(e) => (e.target.value === OTRO ? setOtro(true) : onChange(e.target.value))}
      className={className}
    >
      {(vacio !== undefined || !value) && <option value="">{vacio ?? "Selecciona…"}</option>}
      {opciones.map((o) => (
        <option key={o} value={o}>
          {etiqueta ? etiqueta(o) : o}
        </option>
      ))}
      {puedeAgregar && <option value={OTRO}>{textoOtro}</option>}
    </select>
  );
}

interface PropsAgregar {
  clave?: string;
  base: readonly string[];
  /** Recibe la opción que queda (la existente si ya estaba, o la nueva ya guardada). */
  onAgregado: (v: string) => void;
  texto?: string;
  placeholder?: string;
  etiqueta?: (v: string) => string;
  /** Dentro de una plantilla (letra del formato). */
  compacto?: boolean;
  className?: string;
}

/** Botón «＋ Agregar otro» para listas de chips o casillas; abre el campo en el mismo lugar. */
export function AgregarOtro({ clave, base, onAgregado, texto = "Agregar otro", placeholder, etiqueta, compacto, className }: PropsAgregar) {
  const { agregar, puedeAgregar } = useListaPropia(clave, base, [], etiqueta);
  const [abierto, setAbierto] = useState(false);
  if (!puedeAgregar) return null;
  if (abierto)
    return (
      <CampoOtro
        compacto={compacto}
        className={cn("w-full", className)}
        etiqueta={`Nuevo: ${texto.replace(/^Agregar /, "")}`}
        placeholder={placeholder}
        onCancelar={() => setAbierto(false)}
        onAgregar={(t) => {
          const v = agregar(t);
          if (!v) return;
          onAgregado(v);
          setAbierto(false);
        }}
      />
    );
  return (
    <button
      type="button"
      onClick={() => setAbierto(true)}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-dashed border-sotec-greenDeep/60 font-semibold text-sotec-greenDeep transition hover:bg-sotec-soft print:hidden",
        compacto ? "px-1.5 py-0 text-[0.95em]" : "min-h-[28px] px-2.5 py-1 text-[11px]",
        className,
      )}
    >
      <Plus className="h-3 w-3" aria-hidden /> {texto}
    </button>
  );
}
