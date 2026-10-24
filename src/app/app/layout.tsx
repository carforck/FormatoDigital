/**
 * Layout de todas las rutas /app/**: las envuelve en AppShell (barra lateral, barra
 * superior e inferior, notificaciones y cambio de perfil). AppShell también bloquea las
 * secciones que el rol no puede usar (tabla RUTAS + permisos de @/nucleo/permisos).
 */
import { AppShell } from "@/components/shell/AppShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
