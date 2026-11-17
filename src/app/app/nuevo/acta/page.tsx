/**
 * Ruta /app/nuevo/acta: Acta de entrega del sistema de seguridad electrónica, formato propio de
 * Fortox (FORMA 7PA/F1-13). Toda la lógica vive en PaginaGenerador (@/components/generador):
 * ?id= continúa un borrador o rechazado propio; ?proyecto= o ?cliente= lo precargan.
 * Acceso: perfiles con permiso `crear` (técnico, coordinación y administración); AppShell bloquea la ruta si el perfil no puede crear este tipo.
 */
import { PaginaGenerador } from "@/components/generador/PaginaGenerador";

export default function Page() {
  return <PaginaGenerador tipo="acta" />;
}
