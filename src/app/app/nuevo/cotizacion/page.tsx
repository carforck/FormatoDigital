/**
 * Ruta /app/nuevo/cotizacion: Nueva cotización (comercial). Toda la lógica vive en PaginaGenerador
 * (@/components/generador):
 * ?id= continúa un borrador o rechazado propio; ?proyecto=, ?cliente= o ?equipo= lo precargan.
 * Acceso: solo la administración (permiso `cotizar` del módulo); AppShell bloquea la ruta si el perfil no puede crear este tipo.
 */
import { PaginaGenerador } from "@/components/generador/PaginaGenerador";

export default function Page() {
  return <PaginaGenerador tipo="cotizacion" />;
}
