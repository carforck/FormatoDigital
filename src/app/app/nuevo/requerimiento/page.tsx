/**
 * Ruta /app/nuevo/requerimiento: Requerimiento de ítems (pedido de Magno). Toda la lógica vive
 * en PaginaGenerador (@/components/generador):
 * ?id= continúa un borrador o rechazado propio; ?proyecto= o ?cliente= lo precargan.
 * Acceso: perfiles con permiso `crear` (técnico, supervisor y administración); AppShell bloquea la ruta si el perfil no puede crear este tipo.
 * La conversión en cotización es /app/nuevo/cotizacion?requerimiento=<id> (solo la administración).
 */
import { PaginaGenerador } from "@/components/generador/PaginaGenerador";

export default function Page() {
  return <PaginaGenerador tipo="requerimiento" />;
}
