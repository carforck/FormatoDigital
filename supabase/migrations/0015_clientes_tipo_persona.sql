-- ============================================================================
-- FormatoDigital — 0015 Clientes: persona jurídica o natural (pedido de Magno, SOTEC)
--
--  El directorio de clientes se clasifica por tipo de persona: jurídica (empresa,
--  con NIT) o natural (persona, con cédula). El documento sigue en la columna `nit`
--  (su etiqueta cambia: «NIT» o «C.C.»). Los clientes que ya existían quedan como
--  jurídicos (decisión aprobada). Quien ya escribe clientes (admin, supervisor y el
--  técnico al crearlos desde un formato, 0013) también elige el tipo: las políticas
--  no cambian.
--
-- La aplicación (fase 1, `espacios`) aplica lo mismo en src/nucleo/tipos.ts
-- (Cliente.tipoPersona; sin valor = jurídica) y src/nucleo/personas.ts.
-- ============================================================================

alter table public.clientes
  add column if not exists tipo_persona text not null default 'juridica';

alter table public.clientes drop constraint if exists clientes_tipo_persona_valido;
alter table public.clientes
  add constraint clientes_tipo_persona_valido check (tipo_persona in ('juridica', 'natural'));

comment on column public.clientes.tipo_persona is
  'Persona jurídica (NIT) o natural (cédula); la columna nit guarda el documento de ambas.';

-- Para listar el directorio agrupado por tipo
create index if not exists clientes_org_tipo_idx on public.clientes (organizacion_id, tipo_persona);
