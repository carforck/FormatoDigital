import { ClipboardCheck, HardHat, ShieldCheck, Building2 } from "lucide-react";

import type { Rol } from "./types";

/** Tarjetas de acceso rápido de la demo (sin credenciales). */
export const PERFILES: { rol: Rol; titulo: string; persona: string; icon: typeof HardHat; puede: string[] }[] = [
  {
    rol: "tecnico",
    titulo: "Técnico de campo",
    persona: "Andrés Camacho · Ingeniero de campo",
    icon: HardHat,
    puede: ["Diligencia reportes y permisos con el asistente", "Firma desde el celular", "Ve solo sus documentos", "Corrige lo que le rechazan"],
  },
  {
    rol: "supervisor",
    titulo: "Coordinador SST",
    persona: "Andrea Ríos · Coordinadora SST",
    icon: ClipboardCheck,
    puede: ["Bandeja de revisión del equipo", "Aprueba con firma o rechaza con motivo", "Cierra los permisos de trabajo", "Directorio de clientes"],
  },
  {
    rol: "admin",
    titulo: "Administrador",
    persona: "Gerencia SOTEC",
    icon: ShieldCheck,
    puede: ["Todo lo anterior", "Usuarios, roles y activación", "Consecutivos y reglas de los formatos", "Auditoría completa"],
  },
  {
    rol: "cliente",
    titulo: "Portal del cliente",
    persona: "Ing. José · Ladrillera Arcillas del Caribe",
    icon: Building2,
    puede: ["Consulta los reportes de su empresa", "Firma el reporte en línea", "Descarga el PDF", "Sin acceso a lo interno"],
  },
];
