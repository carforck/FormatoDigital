-- ============================================================================
-- FormatoDigital — 0010 Equipos (hoja de vida simple por cliente y sistema)
--  1. equipos: inventario de cada cliente (y, opcional, de un proyecto),
--     agrupado por sistema (cctv, alarmas, acceso, incendio, computo, cerca:
--     el catálogo vive en la app, aquí es texto). Nombre único por cliente y
--     sistema (sin mayúsculas ni espacios repetidos): crear dos veces el mismo
--     equipo no lo duplica.
--     El equipo interno (admin, supervisor, técnico) ve, crea y edita los
--     equipos de su empresa; el cliente solo ve los de su empresa. Borrar:
--     admin y supervisor, y solo si ningún documento lo marca (si no, se
--     retira con estado 'retirado' y se conserva su historial).
--  2. documento_equipos: equipos atendidos en un documento (reporte). Su
--     historial = los documentos que lo marcan. Solo el autor del documento
--     los marca mientras está en borrador o rechazado, y solo equipos del
--     mismo cliente del documento. Se ve si el documento se ve (el cliente:
--     solo sus reportes aprobados o cerrados).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Equipos
-- ---------------------------------------------------------------------------
create table if not exists public.equipos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id),
  proyecto_id uuid references public.proyectos(id) on delete set null,
  sistema text not null check (length(trim(sistema)) > 0),
  tipo text not null check (length(trim(tipo)) > 0),
  nombre text not null check (length(trim(nombre)) >= 2),
  marca text not null default '',
  modelo text not null default '',
  serial text not null default '',
  ubicacion text not null default '',
  estado text not null default 'operativo' check (estado in ('operativo', 'con_falla', 'fuera_servicio', 'retirado')),
  notas text not null default '',
  creado_por uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists equipos_cliente_idx on public.equipos (organizacion_id, cliente_id, sistema);
create index if not exists equipos_proyecto_idx on public.equipos (proyecto_id);
-- Un nombre por cliente y sistema (la app compara igual: sin mayúsculas ni espacios de más)
create unique index if not exists equipos_nombre_unico on public.equipos
  (organizacion_id, cliente_id, sistema, lower(regexp_replace(trim(nombre), '\s+', ' ', 'g')));

drop trigger if exists trg_equipos_touch on public.equipos;
create trigger trg_equipos_touch before update on public.equipos
  for each row execute function public.touch_updated_at();

-- Cliente y proyecto de la misma organización (y el proyecto, del mismo cliente);
-- la organización y el cliente no cambian después de creado
create or replace function public.equipos_coherencia()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' and (new.organizacion_id <> old.organizacion_id or new.cliente_id <> old.cliente_id or new.creado_por <> old.creado_por) then
    raise exception 'No se puede cambiar la organización ni el cliente del equipo' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clientes c where c.id = new.cliente_id and c.organizacion_id = new.organizacion_id) then
    raise exception 'El cliente no pertenece a esta organización' using errcode = '42501';
  end if;
  if new.proyecto_id is not null and not exists (
    select 1 from public.proyectos p
    where p.id = new.proyecto_id and p.organizacion_id = new.organizacion_id and p.cliente_id = new.cliente_id
  ) then
    raise exception 'El proyecto no pertenece a esta organización o a este cliente' using errcode = '42501';
  end if;
  new.nombre := regexp_replace(trim(new.nombre), '\s+', ' ', 'g');
  if tg_op = 'INSERT' then
    perform public.registrar_auditoria(new.organizacion_id, 'Registró equipo', 'equipo', new.id, jsonb_build_object('nombre', new.nombre));
  elsif new.estado <> old.estado then
    perform public.registrar_auditoria(new.organizacion_id, 'Equipo ' || new.estado, 'equipo', new.id, jsonb_build_object('nombre', new.nombre));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_equipos_coherencia on public.equipos;
create trigger trg_equipos_coherencia before insert or update on public.equipos
  for each row execute function public.equipos_coherencia();

alter table public.equipos enable row level security;

drop policy if exists equipos_ver on public.equipos;
create policy equipos_ver on public.equipos for select to authenticated
  using (
    public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico'])
    or cliente_id = public.cliente_de(organizacion_id)
  );
drop policy if exists equipos_crear on public.equipos;
create policy equipos_crear on public.equipos for insert to authenticated
  with check (creado_por = auth.uid() and public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']));
drop policy if exists equipos_editar on public.equipos;
create policy equipos_editar on public.equipos for update to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']))
  with check (public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']));
-- Borrar solo sin historial (además, la FK de documento_equipos lo impide)
drop policy if exists equipos_borrar on public.equipos;
create policy equipos_borrar on public.equipos for delete to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor']));

-- ---------------------------------------------------------------------------
-- 2. Equipos atendidos en un documento
-- ---------------------------------------------------------------------------
create table if not exists public.documento_equipos (
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  documento_id uuid not null references public.documentos(id) on delete cascade,
  -- restrict: un equipo con historial no se borra, se retira
  equipo_id uuid not null references public.equipos(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (documento_id, equipo_id)
);

create index if not exists documento_equipos_equipo_idx on public.documento_equipos (equipo_id);

-- Mismo organización y cliente del documento; solo mientras el documento es editable y lo hace su autor
create or replace function public.documento_equipos_coherencia()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  fila public.documento_equipos := case when tg_op = 'DELETE' then old else new end;
  d public.documentos;
begin
  select * into d from public.documentos where id = fila.documento_id;
  if not found or d.organizacion_id <> fila.organizacion_id then
    raise exception 'El documento no pertenece a esta organización' using errcode = '42501';
  end if;
  if d.estado not in ('borrador', 'rechazado') or d.autor_id is distinct from auth.uid() then
    raise exception 'Solo el autor marca los equipos, y solo antes de enviar el documento' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and not exists (
    select 1 from public.equipos e
    where e.id = new.equipo_id and e.organizacion_id = d.organizacion_id and e.cliente_id is not distinct from d.cliente_id
  ) then
    raise exception 'El equipo no es del cliente del documento' using errcode = '42501';
  end if;
  return fila;
end;
$$;

drop trigger if exists trg_documento_equipos_coherencia on public.documento_equipos;
create trigger trg_documento_equipos_coherencia before insert or delete on public.documento_equipos
  for each row execute function public.documento_equipos_coherencia();

alter table public.documento_equipos enable row level security;

-- Visible si el documento es visible (la subconsulta aplica la RLS de documentos)
drop policy if exists documento_equipos_ver on public.documento_equipos;
create policy documento_equipos_ver on public.documento_equipos for select to authenticated
  using (exists (select 1 from public.documentos d where d.id = documento_id));
drop policy if exists documento_equipos_crear on public.documento_equipos;
create policy documento_equipos_crear on public.documento_equipos for insert to authenticated
  with check (public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']));
drop policy if exists documento_equipos_borrar on public.documento_equipos;
create policy documento_equipos_borrar on public.documento_equipos for delete to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']));

-- Las funciones de trigger no se llaman directo (igual que 0006)
revoke execute on function public.equipos_coherencia(), public.documento_equipos_coherencia() from public, anon, authenticated;
