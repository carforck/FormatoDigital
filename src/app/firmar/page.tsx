"use client";

/* eslint-disable @next/next/no-img-element */
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Lock, PenLine, ShieldAlert } from "lucide-react";

import { FirmaPad } from "@/components/docs/FirmaPad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { equiposAtendidos, equiposIdsDe } from "@/modulos/equipos/logica";
import { PlantillaReporte } from "@/modulos/reportes/PlantillaReporte";
import { formatoDe } from "@/modulos/registro";
import { useDemo } from "@/nucleo/datos/DemoProvider";
import { asset } from "@/nucleo/rutas";

/**
 * Firma remota del cliente: se abre desde el enlace del correo o WhatsApp,
 * sin cuenta. El enlace es de un solo uso y vence a los 7 días.
 */
function Firmar() {
  const token = useSearchParams().get("t") ?? "";
  const demo = useDemo();
  const [nombre, setNombre] = useState("");
  const [firma, setFirma] = useState<string>("");
  const [pad, setPad] = useState(false);
  const [resultado, setResultado] = useState<null | "cerrado" | "firmado" | "invalido">(null);

  if (!demo.listo) return <p className="p-10 text-center text-sm text-slate-500">Cargando…</p>;

  const v = demo.enlaceVigente(token);
  const encabezado = (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
        <img src={asset("/sotec-logo-v3.png")} alt={demo.config.empresa} className="h-11 w-auto" />
        <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          <Lock className="h-3.5 w-3.5" /> Firma segura de documentos
        </span>
      </div>
    </header>
  );

  if (resultado === "cerrado" || resultado === "firmado") {
    return (
      <main className="min-h-screen bg-[#F5F7F3]">
        {encabezado}
        <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <p className="mt-4 text-lg font-semibold">¡Gracias, {nombre.split(" ")[0]}!</p>
          <p className="mt-1 text-sm text-slate-600">
            Tu firma quedó registrada con fecha y hora{resultado === "cerrado" ? " y el reporte quedó cerrado" : ""}. {demo.config.empresa} recibió la notificación.
          </p>
        </div>
      </main>
    );
  }

  if (!v || v.doc.tipo !== "reporte" || resultado === "invalido") {
    return (
      <main className="min-h-screen bg-[#F5F7F3]">
        {encabezado}
        <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-12 w-12 text-amber-500" />
          <p className="mt-4 text-lg font-semibold">Este enlace no está disponible</p>
          <p className="mt-1 text-sm text-slate-600">Puede que ya se haya usado o que haya vencido. Pide a {demo.config.empresa} que te envíe uno nuevo.</p>
          <p className="mt-4 text-xs text-slate-400">En la demo, el enlace funciona en el mismo navegador donde se generó.</p>
        </div>
      </main>
    );
  }

  const doc = v.doc;
  const f = formatoDe("reporte");
  return (
    <main className="min-h-screen bg-[#F5F7F3] pb-32">
      {encabezado}
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sotec-greenDeep">
            {f.codigo} · {f.corto}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Firma del reporte {doc.codigo}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {demo.config.empresa} te pide revisar y firmar el reporte del servicio en {doc.datos.cliente}. Desplázate para leerlo completo.
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg bg-slate-100 p-2 sm:p-4">
          <PlantillaReporte datos={{ ...doc.datos, firmaCliente: firma || doc.datos.firmaCliente }} codigoDoc={doc.codigo} equipos={equiposAtendidos(equiposIdsDe(doc), demo.equipos)} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-sm">
            <span className="text-xs text-slate-500">Tu nombre completo</span>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de quien firma" />
          </label>
          <Button variant="outline" onClick={() => setPad(true)}>
            <PenLine className="h-4 w-4" /> {firma ? "Volver a firmar" : "Dibujar firma"}
          </Button>
          <Button disabled={nombre.trim().length < 3 || !firma} onClick={() => setResultado(demo.firmarConEnlace(token, nombre, firma))}>
            <CheckCircle2 className="h-4 w-4" /> Firmar y enviar
          </Button>
        </div>
      </div>

      {pad && (
        <FirmaPad
          titulo="Firma del cliente"
          onCerrar={() => setPad(false)}
          onGuardar={(url) => {
            setFirma(url);
            setPad(false);
          }}
        />
      )}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Firmar />
    </Suspense>
  );
}
