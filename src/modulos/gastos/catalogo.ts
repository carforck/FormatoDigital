import type { DatosGasto, TipoGasto } from "./tipos";

export const TIPOS_GASTO: TipoGasto[] = ["Transporte", "Alimentación", "Hospedaje", "Materiales", "Otros"];

export function gastoVacio(fecha: string): DatosGasto {
  return {
    fecha,
    centroCostos: "",
    colaborador: "",
    cedula: "",
    cargo: "",
    telefono: "",
    clienteObra: "",
    items: [],
    observaciones: "",
    firmaColaborador: "",
    voboNombre: "",
    firmaVobo: "",
  };
}
