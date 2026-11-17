"use client";

/**
 * Pasos del asistente para las claves del acta (datos sensibles): se escriben en campos tipo
 * contraseña con «Mostrar», y en el chat solo queda «Claves registradas (ocultas)». Nunca se
 * repiten en el eco ni en los mensajes del asistente.
 */
import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";

import type { ValorPaso } from "@/components/chat/ChatAsistente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { validarClave } from "./claves";
import type { UsuarioActa } from "./tipos";

type Avanzar = (v: ValorPaso, eco: string) => void;

/** Campo de clave del asistente: contraseña numérica, sin autocompletar, con «Mostrar». */
function Clave({ etiqueta, valor, onChange }: { etiqueta: string; valor: string; onChange: (v: string) => void }) {
  const [ver, setVer] = useState(false);
  return (
    <label className="block text-[11px] font-medium text-slate-600">
      {etiqueta}
      <span className="mt-0.5 flex gap-1">
        <Input
          type={ver ? "text" : "password"}
          inputMode="numeric"
          autoComplete="new-password"
          spellCheck={false}
          aria-label={etiqueta}
          className="h-9 font-mono text-sm"
          value={valor}
          onChange={(e) => onChange(e.target.value.replace(/\s/g, ""))}
        />
        <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 px-2" aria-label={`${ver ? "Ocultar" : "Mostrar"} ${etiqueta}`} onClick={() => setVer((x) => !x)}>
          {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </span>
    </label>
  );
}

/** Clave maestra y clave de instalador del panel. */
export function PasoClavesPanel({ maestra, instalador, avanzar }: { maestra: string; instalador: string; avanzar: Avanzar }) {
  const [m, setM] = useState(maestra);
  const [i, setI] = useState(instalador);
  const [error, setError] = useState<string | null>(null);
  const continuar = () => {
    const e = validarClave(m) ?? validarClave(i);
    if (e) return setError(e);
    const n = [m, i].filter(Boolean).length;
    avanzar([m, i], n ? `${n} clave(s) registrada(s) (ocultas) 🔒` : "Sin claves por ahora");
  };
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[11px] text-slate-600">
        <KeyRound className="h-3.5 w-3.5" aria-hidden /> Quedan ocultas (●●●●): solo tú, la coordinación y la administración pueden verlas.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Clave etiqueta="Clave maestra" valor={m} onChange={setM} />
        <Clave etiqueta="Clave de instalador" valor={i} onChange={setI} />
      </div>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={continuar}>
          Guardar claves
        </Button>
        <Button size="sm" variant="ghost" onClick={() => avanzar([maestra, instalador], "Las escribo después")}>
          Después
        </Button>
      </div>
    </div>
  );
}

/** Clave telefónica de cada usuario (en el orden de la tabla). */
export function PasoClavesUsuarios({ usuarios, avanzar }: { usuarios: UsuarioActa[]; avanzar: Avanzar }) {
  const [claves, setClaves] = useState(() => usuarios.map((u) => u.claveTelefonica));
  const [error, setError] = useState<string | null>(null);
  if (!usuarios.length)
    return (
      <Button size="sm" className="w-full" onClick={() => avanzar([], "Sin usuarios")}>
        Continuar sin usuarios
      </Button>
    );
  const continuar = () => {
    const k = claves.findIndex((c) => validarClave(c));
    if (k >= 0) return setError(`${usuarios[k].nombre}: ${validarClave(claves[k])}`);
    const n = claves.filter(Boolean).length;
    avanzar(claves, `${n} clave(s) telefónica(s) registrada(s) (ocultas) 🔒`);
  };
  return (
    <div className="space-y-2">
      <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
        {usuarios.map((u, k) => (
          <Clave key={u.id} etiqueta={`Clave telefónica de ${u.nombre}`} valor={claves[k] ?? ""} onChange={(v) => setClaves((c) => c.map((x, j) => (j === k ? v : x)))} />
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <Button size="sm" className="w-full" onClick={continuar}>
        Guardar claves
      </Button>
    </div>
  );
}
