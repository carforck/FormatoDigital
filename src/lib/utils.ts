/**
 * Utilidades genéricas de la UI (estilo shadcn/ui). Usado por casi todos los
 * componentes y páginas para combinar clases de Tailwind.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Une clases condicionales (clsx) y resuelve conflictos de Tailwind (la última gana, p. ej. `px-2` vs `px-4`). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
