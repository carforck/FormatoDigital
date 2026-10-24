"use client";

/**
 * Acceso a los equipos desde los componentes. Hoy es un alias de `useDemo`;
 * punto único para cambiar de proveedor cuando los equipos vengan de Supabase.
 */

import { useDemo } from "@/nucleo/datos/DemoProvider";

/** Datos de la demo con el inventario de equipos (el proveedor implementa ApiEquipos). */
export const useEquipos = useDemo;
