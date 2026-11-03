/**
 * Ruta /app/nuevo/epp: Entrega de EPP. Toda la lógica vive en PaginaGenerador
 * (@/components/generador):
 * ?id= continúa un borrador o rechazado propio; ?proyecto= o ?cliente= lo precargan.
 * Acceso: perfiles con permiso `crear` (técnico, supervisor y administración); AppShell bloquea la ruta si el perfil no puede crear este tipo.
 */
import { PaginaGenerador } from "@/components/generador/PaginaGenerador";

export default function Page() {
  return <PaginaGenerador tipo="epp" />;
}
