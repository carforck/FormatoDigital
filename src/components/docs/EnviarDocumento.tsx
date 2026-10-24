"use client";

import { useId, useState } from "react";
import { Check, Copy, ExternalLink, Mail, MessageCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fondoQueCierra, useModal } from "@/components/ui/useModal";

interface Props {
  titulo: string;
  correo: string;
  telefono: string;
  asunto: string;
  mensaje: string;
  /** Enlace para firmar o consultar, si aplica. */
  enlace?: string;
  onEnviado: (canal: "correo" | "whatsapp", destino: string) => void;
  onCerrar: () => void;
}

/** Celular colombiano a formato internacional para wa.me: 300 000 0000 → 573000000000 */
function telefonoWhatsApp(t: string): string {
  const d = t.replace(/\D/g, "");
  return d.length === 10 ? `57${d}` : d;
}

/**
 * Envío por correo o WhatsApp con el mensaje listo.
 * En la demo abre la app de correo o WhatsApp del usuario; con la base de
 * datos conectada, el correo sale desde la plataforma con el PDF adjunto.
 */
export function EnviarDocumento({ titulo, correo: c0, telefono: t0, asunto: a0, mensaje: m0, enlace, onEnviado, onCerrar }: Props) {
  const [correo, setCorreo] = useState(c0);
  const [telefono, setTelefono] = useState(t0);
  const [asunto, setAsunto] = useState(a0);
  const [mensaje, setMensaje] = useState(m0);
  const [copiado, setCopiado] = useState(false);
  const dialogo = useModal<HTMLDivElement>(onCerrar);
  const fondo = fondoQueCierra(onCerrar);
  const idTitulo = useId();
  const idDescripcion = useId();

  const cuerpo = enlace ? `${mensaje}\n\n${enlace}` : mensaje;
  const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo);
  const telValido = telefono.replace(/\D/g, "").length >= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" {...fondo}>
      <div ref={dialogo} role="dialog" aria-modal="true" aria-labelledby={idTitulo} aria-describedby={idDescripcion} className="max-h-[92vh] outline-none w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p id={idTitulo} className="font-semibold text-slate-900">{titulo}</p>
            <p id={idDescripcion} className="text-sm text-slate-500">Revisa el mensaje y elige por dónde enviarlo.</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-xs text-slate-500">Correo del destinatario</span>
            <Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="cliente@empresa.com" />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-slate-500">Celular (WhatsApp)</span>
            <Input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="300 000 0000" />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-slate-500">Asunto</span>
            <Input value={asunto} onChange={(e) => setAsunto(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-slate-500">Mensaje</span>
            <Textarea rows={5} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
          </label>
          {enlace && (
            <div className="rounded-lg border border-sotec-green/50 bg-sotec-soft p-3 text-xs">
              <p className="font-semibold text-sotec-greenDeep">Enlace incluido en el mensaje</p>
              <p className="mt-1 break-all font-mono text-slate-700">{enlace}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(enlace).then(() => setCopiado(true))}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 font-medium hover:bg-slate-50"
                >
                  {copiado ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} {copiado ? "Copiado" : "Copiar enlace"}
                </button>
                <a href={enlace} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 font-medium hover:bg-slate-50">
                  <ExternalLink className="h-3.5 w-3.5" /> Probar enlace
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            disabled={!correoValido}
            onClick={() => {
              window.location.href = `mailto:${encodeURIComponent(correo)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
              onEnviado("correo", correo);
            }}
          >
            <Mail className="h-4 w-4" /> Enviar por correo
          </Button>
          <Button
            variant="outline"
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
            disabled={!telValido}
            onClick={() => {
              window.open(`https://wa.me/${telefonoWhatsApp(telefono)}?text=${encodeURIComponent(`${asunto}\n\n${cuerpo}`)}`, "_blank", "noopener");
              onEnviado("whatsapp", telefono);
            }}
          >
            <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Demo: se abre tu correo o WhatsApp con el mensaje listo; descarga el PDF con el botón «PDF» si quieres adjuntarlo. Con la plataforma conectada, el correo sale automáticamente con el PDF adjunto
          {enlace ? " y el enlace funciona en el celular del cliente (en la demo, solo en este navegador)" : ""}.
        </p>
      </div>
    </div>
  );
}
