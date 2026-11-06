/**
 * Marca ControlOne para fondos oscuros (barra lateral de la demo): ícono verde con el
 * documento chequeado y «Control» en blanco + «One» en verde, en vectores y CSS (sin raster),
 * igual que en la landing y en /acceso. Sin «by SOTEC»: la marca va limpia.
 * Con `compacta` (riel de la barra lateral) solo queda el ícono.
 */
import { FileCheck2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function MarcaControlOne({ compacta = false, className }: { compacta?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5 font-semibold text-white", className)} data-marca="controlone">
      <span className={cn("flex shrink-0 items-center justify-center rounded-lg bg-sotec-green text-sotec transition-all", compacta ? "h-9 w-9" : "h-10 w-10")}>
        <FileCheck2 className="h-5 w-5" aria-hidden />
      </span>
      <span className={cn("whitespace-nowrap text-xl tracking-tight transition-opacity", compacta && "opacity-0")}>
        Control<span className="text-sotec-green">One</span>
      </span>
    </span>
  );
}
