-- ============================================================================
-- FormatoDigital — 0003 Finanzas: gastos y cuentas de cobro
--
-- Ambos cuelgan de la orden de servicio, de modo que cada trabajo muestra lo
-- que costó (gastos) y lo que se cobró (cuentas de cobro).
--
-- GASTOS: estructura provisional. Se ajustará al formato que envíe SOTEC; los
-- campos propios del formato van en `datos`.
-- CUENTAS DE COBRO: la empresa (SOTEC) le cobra a su cliente por el servicio.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Gastos
-- ---------------------------------------------------------------------------
create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  orden_id uuid references public.ordenes_servicio(id) on delete set null,
  tecnico_id uuid not null default auth.uid() references auth.users(id),
  fecha date not null default current_date,
  categoria text not null check (categoria in ('materiales', 'transporte', 'alimentacion', 'hospedaje', 'herramienta', 'otro')),
  descripcion text not null,
  valor numeric(14, 2) not null check (valor > 0),
  soporte_id uuid references public.archivos(id) on delete set null,
  datos jsonb not null default '{}'::jsonb,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado', 'reembolsado')),
  motivo_rechazo text,
  revisado_por uuid references auth.users(id),
  revisado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gastos_org_idx on public.gastos (organizacion_id, fecha desc);
create index gastos_orden_idx on public.gastos (orden_id);
create trigger trg_gastos_touch before update on public.gastos
  for each row execute function public.touch_updated_at();

-- Reglas: el técnico edita su gasto mientras está pendiente; aprobar o
-- rechazar es del supervisor/admin y deja constancia de quién y cuándo.
create or replace function public.gastos_flujo()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  revisor boolean := public.tiene_rol(new.organizacion_id, array['admin', 'supervisor']);
begin
  if new.organizacion_id <> old.organizacion_id or new.tecnico_id <> old.tecnico_id then
    raise exception 'No se puede cambiar la organización ni el técnico del gasto' using errcode = '42501';
  end if;
  if new.estado <> old.estado then
    if not revisor then
      raise exception 'Solo un supervisor o administrador cambia el estado de un gasto' using errcode = '42501';
    end if;
    if new.estado = 'rechazado' and coalesce(trim(new.motivo_rechazo), '') = '' then
      raise exception 'El rechazo requiere un motivo' using errcode = '23514';
    end if;
    new.revisado_por := auth.uid();
    new.revisado_at := now();
    perform public.registrar_auditoria(new.organizacion_id, 'Gasto ' || new.estado, 'gasto', new.id, jsonb_build_object('valor', new.valor));
  elsif old.estado <> 'pendiente' and not revisor then
    raise exception 'El gasto ya fue revisado y no se puede modificar' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trg_gastos_flujo before update on public.gastos
  for each row execute function public.gastos_flujo();

-- ---------------------------------------------------------------------------
-- Cuentas de cobro (la empresa le cobra a su cliente)
-- ---------------------------------------------------------------------------
create table public.cuentas_cobro (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  orden_id uuid references public.ordenes_servicio(id) on delete set null,
  cliente_id uuid not null references public.clientes(id),
  codigo text not null,
  consecutivo int not null,
  fecha date not null default current_date,
  concepto text not null,
  subtotal numeric(14, 2) not null default 0 check (subtotal >= 0),
  iva numeric(14, 2) not null default 0 check (iva >= 0),
  total numeric(14, 2) generated always as (subtotal + iva) stored,
  valor_en_letras text not null default '',
  datos jsonb not null default '{}'::jsonb,       -- condiciones de pago, cuenta bancaria, notas…
  estado text not null default 'borrador' check (estado in ('borrador', 'emitida', 'enviada', 'pagada', 'anulada')),
  creado_por uuid not null default auth.uid() references auth.users(id),
  emitida_at timestamptz,
  pagada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organizacion_id, codigo)
);

create index cuentas_cobro_org_idx on public.cuentas_cobro (organizacion_id, fecha desc);
create index cuentas_cobro_cliente_idx on public.cuentas_cobro (cliente_id);
create trigger trg_cuentas_cobro_touch before update on public.cuentas_cobro
  for each row execute function public.touch_updated_at();

-- Ítems: líneas de la cuenta; pueden referenciar el reporte técnico que respaldan
create table public.cuenta_cobro_items (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  cuenta_id uuid not null references public.cuentas_cobro(id) on delete cascade,
  documento_id uuid references public.documentos(id) on delete set null,
  descripcion text not null,
  cantidad numeric(10, 2) not null default 1 check (cantidad > 0),
  valor_unitario numeric(14, 2) not null check (valor_unitario >= 0),
  total numeric(14, 2) generated always as (cantidad * valor_unitario) stored,
  posicion int not null default 0
);

create index cuenta_items_cuenta_idx on public.cuenta_cobro_items (cuenta_id, posicion);

-- Recalcula el subtotal de la cuenta cuando cambian sus ítems
create or replace function public.cuentas_cobro_recalcular()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  cid uuid := coalesce(new.cuenta_id, old.cuenta_id);
begin
  update public.cuentas_cobro
  set subtotal = coalesce((select sum(total) from public.cuenta_cobro_items where cuenta_id = cid), 0)
  where id = cid;
  return null;
end;
$$;

create trigger trg_cuenta_items_recalcular after insert or update or delete on public.cuenta_cobro_items
  for each row execute function public.cuentas_cobro_recalcular();

-- Una cuenta emitida ya no cambia de contenido (solo avanza de estado)
create or replace function public.cuentas_cobro_flujo()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.organizacion_id <> old.organizacion_id or new.codigo <> old.codigo then
    raise exception 'No se puede cambiar la organización ni el código' using errcode = '42501';
  end if;
  if old.estado <> 'borrador'
     and (new.concepto, new.cliente_id, new.iva, new.datos) is distinct from (old.concepto, old.cliente_id, old.iva, old.datos) then
    raise exception 'La cuenta de cobro ya fue emitida y no se puede modificar' using errcode = '42501';
  end if;
  if new.estado <> old.estado then
    if not ((old.estado = 'borrador' and new.estado = 'emitida')
         or (old.estado = 'emitida' and new.estado in ('enviada', 'pagada', 'anulada'))
         or (old.estado = 'enviada' and new.estado in ('pagada', 'anulada'))) then
      raise exception 'Transición no permitida: % → %', old.estado, new.estado using errcode = '42501';
    end if;
    if new.estado = 'emitida' then new.emitida_at := now(); end if;
    if new.estado = 'pagada' then new.pagada_at := now(); end if;
    perform public.registrar_auditoria(new.organizacion_id, 'Cuenta de cobro ' || new.estado, 'cuenta_cobro', new.id, jsonb_build_object('codigo', new.codigo));
  end if;
  return new;
end;
$$;

create trigger trg_cuentas_cobro_flujo before update on public.cuentas_cobro
  for each row execute function public.cuentas_cobro_flujo();

-- Los ítems solo se editan mientras la cuenta es borrador
create or replace function public.cuenta_items_bloqueo()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if (select estado from public.cuentas_cobro where id = coalesce(new.cuenta_id, old.cuenta_id)) <> 'borrador' then
    raise exception 'La cuenta de cobro ya fue emitida y no se puede modificar' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_cuenta_items_bloqueo before insert or update or delete on public.cuenta_cobro_items
  for each row execute function public.cuenta_items_bloqueo();

-- Crea la cuenta con su consecutivo (clave de formato: cuenta_cobro)
create or replace function public.crear_cuenta_cobro(org uuid, cliente uuid, concepto text, orden uuid default null)
returns public.cuentas_cobro
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  f public.formatos;
  n int;
  anio int := extract(year from now())::int;
  c public.cuentas_cobro;
begin
  select * into f from public.formatos where organizacion_id = org and clave = 'cuenta_cobro' and activo;
  if not found then
    raise exception 'Formato cuenta_cobro no habilitado en esta organización' using errcode = 'P0002';
  end if;
  n := public.siguiente_consecutivo(org, 'cuenta_cobro', anio);
  insert into public.cuentas_cobro (organizacion_id, orden_id, cliente_id, codigo, consecutivo, concepto)
  values (org, orden, cliente, format('%s-%s-%s', f.prefijo, lpad(n::text, 3, '0'), right(anio::text, 2)), n, concepto)
  returning * into c;
  return c;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.gastos enable row level security;
alter table public.cuentas_cobro enable row level security;
alter table public.cuenta_cobro_items enable row level security;

create policy gastos_ver on public.gastos for select to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor']) or (tecnico_id = auth.uid() and public.es_miembro(organizacion_id)));
create policy gastos_crear on public.gastos for insert to authenticated
  with check (tecnico_id = auth.uid() and estado = 'pendiente' and public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']));
create policy gastos_editar on public.gastos for update to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor']) or (tecnico_id = auth.uid() and public.es_miembro(organizacion_id)))
  with check (public.es_miembro(organizacion_id));
create policy gastos_borrar on public.gastos for delete to authenticated
  using (tecnico_id = auth.uid() and estado = 'pendiente');

-- Las cuentas de cobro las maneja la administración; el cliente ve las suyas emitidas
create policy cuentas_ver on public.cuentas_cobro for select to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor'])
         or (cliente_id = public.cliente_de(organizacion_id) and estado in ('emitida', 'enviada', 'pagada')));
create policy cuentas_crear on public.cuentas_cobro for insert to authenticated
  with check (creado_por = auth.uid() and public.tiene_rol(organizacion_id, array['admin', 'supervisor']));
create policy cuentas_editar on public.cuentas_cobro for update to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor']))
  with check (public.tiene_rol(organizacion_id, array['admin', 'supervisor']));

create policy items_ver on public.cuenta_cobro_items for select to authenticated
  using (exists (select 1 from public.cuentas_cobro c where c.id = cuenta_id));
create policy items_escribir on public.cuenta_cobro_items for all to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor']))
  with check (public.tiene_rol(organizacion_id, array['admin', 'supervisor']));

revoke execute on function public.gastos_flujo(), public.cuentas_cobro_recalcular(), public.cuentas_cobro_flujo(),
  public.cuenta_items_bloqueo(), public.crear_cuenta_cobro(uuid, uuid, text, uuid) from public;
grant execute on function public.crear_cuenta_cobro(uuid, uuid, text, uuid) to authenticated;
