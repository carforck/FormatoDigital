/**
 * Ruta /app/nuevo/reporte: Nuevo reporte técnico. Toda la lógica vive en PaginaGenerador
 * (@/components/generador):
 * ?id= continúa un borrador o rechazado propio; ?proyecto=, ?cliente= o ?equipo= lo precargan.
 * Acceso: perfiles con permiso `crear` (técnico, supervisor y administración); AppShell bloquea la ruta si el perfil no puede crear este tipo.
 */
import { PaginaGenerador } from "@/components/generador/PaginaGenerador";

export default function Page() {
  return <PaginaGenerador tipo="reporte" />;
}
