"use client";

/**
 * Datos sensibles en las plantillas (claves del panel de alarma del acta de entrega de Fortox).
 * Quien muestra el documento decide con `<ConClaves modo>` qué puede ver el perfil:
 *   - "ocultas": enmascaradas (●●●●) sin «Mostrar» (por defecto, sin envoltura). Quien muestra
 *     además le pasa a la plantilla el contenido ya enmascarado (`sensibles.ocultar` del módulo),
 *     así la clave ni siquiera llega a la página.
 *   - "revelables": enmascaradas con el botón «Mostrar» (autor, coordinación y administración).
 *   - "visibles": tal cual (solo /imprimir, para los perfiles que pueden verlas: el acta impresa las lleva).
 * `CampoClave` dibuja una clave según ese modo; al diligenciar, se escribe en un campo tipo
 * contraseña (sin autocompletar) que también se puede mostrar.
 */
import { createContext, useContext, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { enmascarar } from "@/modulos/actas/claves";

export type ModoClaves = "ocultas" | "revelables" | "visibles";

const Contexto = createContext<ModoClaves>("ocultas");

/** Fija cómo se ven las claves de las plantillas que envuelve. */
export function ConClaves({ modo, children }: { modo: ModoClaves; children: ReactNode }) {
  return <Contexto.Provider value={modo}>{children}</Contexto.Provider>;
}

/** Modo de las claves de la plantilla que se está dibujando. */
export const useModoClaves = () => useContext(Contexto);

interface Props {
  valor: string;
  /** Nombre del campo para lectores de pantalla y pruebas («Clave maestra»). */
  etiqueta: string;
  /** Si existe, la clave se edita (solo el autor diligenciando). */
  onCambiar?: (v: string) => void;
  className?: string;
}

/** Una clave: enmascarada, con «Mostrar» si el perfil puede verla, o editable al diligenciar. */
export function CampoClave({ valor, etiqueta, onCambiar, className }: Props) {
  const modo = useModoClaves();
  const [ver, setVer] = useState(false);
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState("");
  const puedeVer = modo !== "ocultas" || Boolean(onCambiar);

  if (onCambiar && editando) {
    const terminar = () => {
      setEditando(false);
      if (borrador !== valor) onCambiar(borrador.trim());
    };
    return (
      <span className={cn("inline-flex items-center gap-1", className)}>
        <input
          autoFocus
          type={ver ? "text" : "password"}
          inputMode="numeric"
          autoComplete="new-password"
          spellCheck={false}
          aria-label={etiqueta}
          value={borrador}
          onChange={(e) => setBorrador(e.target.value.replace(/\s/g, ""))}
          onBlur={terminar}
          onKeyDown={(e) => {
            if (e.key === "Enter") terminar();
            if (e.key === "Escape") setEditando(false);
          }}
          className="w-24 rounded border border-sotec-greenDeep bg-white px-1 py-0 font-mono text-inherit outline-none"
        />
        <BotonVer ver={ver} etiqueta={etiqueta} onClick={() => setVer((x) => !x)} mantener />
      </span>
    );
  }

  const visible = modo === "visibles" || (ver && puedeVer);
  const texto = visible ? valor : enmascarar(valor);
  return (
    <span className={cn("inline-flex items-center gap-1", className)} data-clave={etiqueta} data-clave-visible={visible && valor ? "1" : undefined}>
      {onCambiar ? (
        <button
          type="button"
          aria-label={`Editar ${etiqueta}`}
          onClick={() => {
            setBorrador(valor);
            setEditando(true);
          }}
          className="min-w-[2.5em] rounded px-0.5 text-left font-mono hover:bg-amber-50"
        >
          {texto || <span className="text-slate-400 print:text-transparent">Escribir</span>}
        </button>
      ) : (
        <span className="font-mono">{texto}</span>
      )}
      {valor && puedeVer && modo !== "visibles" && <BotonVer ver={ver} etiqueta={etiqueta} onClick={() => setVer((x) => !x)} />}
    </span>
  );
}

function BotonVer({ ver, etiqueta, onClick, mantener }: { ver: boolean; etiqueta: string; onClick: () => void; mantener?: boolean }) {
  return (
    <button
      type="button"
      // Dentro del campo que se edita: no le quita el foco (no lo cierra)
      onMouseDown={mantener ? (e) => e.preventDefault() : undefined}
      onClick={onClick}
      aria-label={`${ver ? "Ocultar" : "Mostrar"} ${etiqueta}`}
      title={ver ? "Ocultar" : "Mostrar"}
      className="print:hidden inline-flex items-center gap-0.5 rounded px-0.5 text-[9px] font-sans font-semibold text-slate-500 hover:text-slate-800"
    >
      {ver ? <EyeOff className="h-3 w-3" aria-hidden /> : <Eye className="h-3 w-3" aria-hidden />}
      {ver ? "Ocultar" : "Mostrar"}
    </button>
  );
}
