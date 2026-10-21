-- ============================================================================
-- FormatoDigital — 0001 Núcleo multiempresa
--
-- Cada empresa cliente de la plataforma es una ORGANIZACIÓN. Todo registro
-- lleva organizacion_id y las políticas RLS aíslan los datos entre empresas:
-- un usuario solo ve lo de las organizaciones de las que es miembro, y dentro
-- de ellas, lo que su rol permite.
--
-- Roles por organización: admin · supervisor · tecnico · cliente
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Utilidad: updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Organizaciones (empresas que usan la plataforma)
-- ---------------------------------------------------------------------------
create table public.organizaciones (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  nombre text not null,
  nit text not null default '',
  logo_url text,
  color_primario text not null default '#1F1F1F',
  color_acento text not null default '#92D050',
  -- Reglas configurables: vigencia del permiso, exigir firma del cliente, etc.
  config jsonb not null default '{}'::jsonb,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_organizaciones_touch before update on public.organizaciones
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Perfiles (extiende auth.users; una persona puede estar en varias empresas)
-- ---------------------------------------------------------------------------
create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nombre text not null default '',
  cedula text not null default '',
  telefono text not null default '',
  -- Firma guardada para reutilizar (data URL PNG o ruta en storage)
  firma text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_perfiles_touch before update on public.perfiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Clientes de cada organización (p. ej. Ladrillera Arcillas del Caribe para SOTEC)
-- ---------------------------------------------------------------------------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  nombre text not null,
  nit text not null default '',
  direccion text not null default '',
  contacto text not null default '',
  cargo text not null default '',
  correo text not null default '',
  telefono text not null default '',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organizacion_id, nombre)
);

create index clientes_org_idx on public.clientes (organizacion_id);
create trigger trg_clientes_touch before update on public.clientes
  for each row execute function public.touch_updated_at();

create table public.sitios (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nombre text not null,
  direccion text not null default '',
  created_at timestamptz not null default now()
);

create index sitios_cliente_idx on public.sitios (cliente_id);

-- ---------------------------------------------------------------------------
-- Miembros: quién pertenece a qué organización y con qué rol.
-- Los usuarios con rol "cliente" quedan atados a un cliente concreto.
-- ---------------------------------------------------------------------------
create table public.miembros (
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  rol text not null check (rol in ('admin', 'supervisor', 'tecnico', 'cliente')),
  cargo text not null default '',
  cliente_id uuid references public.clientes(id) on delete cascade,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organizacion_id, usuario_id),
  constraint miembros_cliente_chk check ((rol = 'cliente') = (cliente_id is not null))
);

create index miembros_usuario_idx on public.miembros (usuario_id);

-- ---------------------------------------------------------------------------
-- Funciones auxiliares para RLS (SECURITY DEFINER: leen miembros sin
-- recursión de políticas; search_path fijo para evitar secuestro)
-- ---------------------------------------------------------------------------
create or replace function public.rol_en(org uuid)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select m.rol from public.miembros m
  where m.organizacion_id = org and m.usuario_id = auth.uid() and m.activo
$$;

create or replace function public.es_miembro(org uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.miembros m
    where m.organizacion_id = org and m.usuario_id = auth.uid() and m.activo
  )
$$;

-- Personal interno (no cliente) con un rol de la lista
create or replace function public.tiene_rol(org uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(public.rol_en(org) = any (roles), false)
$$;

-- Cliente al que está atado el usuario actual (si su rol es "cliente")
create or replace function public.cliente_de(org uuid)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select m.cliente_id from public.miembros m
  where m.organizacion_id = org and m.usuario_id = auth.uid() and m.activo and m.rol = 'cliente'
$$;

-- ¿El usuario actual comparte alguna organización con otro usuario?
create or replace function public.comparte_org(otro uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.miembros a
    join public.miembros b on b.organizacion_id = a.organizacion_id
    where a.usuario_id = auth.uid() and a.activo and b.usuario_id = otro
  )
$$;

-- ---------------------------------------------------------------------------
-- Consecutivos por organización, formato y año: RT-001-26, PT-001-26…
-- ---------------------------------------------------------------------------
create table public.consecutivos (
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  clave text not null,
  anio int not null,
  ultimo int not null default 0,
  primary key (organizacion_id, clave, anio)
);

-- Reserva el siguiente número de forma atómica (bloqueo de fila).
create or replace function public.siguiente_consecutivo(org uuid, clave_formato text, anio_doc int default extract(year from now())::int)
returns int
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  n int;
begin
  if not public.tiene_rol(org, array['admin', 'supervisor', 'tecnico']) then
    raise exception 'Sin permiso para generar consecutivos en esta organización' using errcode = '42501';
  end if;
  insert into public.consecutivos as c (organizacion_id, clave, anio, ultimo)
  values (org, clave_formato, anio_doc, 1)
  on conflict (organizacion_id, clave, anio) do update set ultimo = c.ultimo + 1
  returning ultimo into n;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Auditoría (solo inserción, vía función)
-- ---------------------------------------------------------------------------
create table public.auditoria (
  id bigint generated always as identity primary key,
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  accion text not null,
  entidad text not null,
  entidad_id uuid,
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index auditoria_org_fecha_idx on public.auditoria (organizacion_id, created_at desc);

create or replace function public.registrar_auditoria(org uuid, accion text, entidad text, entidad_id uuid, detalle jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  insert into public.auditoria (organizacion_id, actor_id, accion, entidad, entidad_id, detalle)
  values (org, auth.uid(), accion, entidad, entidad_id, coalesce(detalle, '{}'::jsonb))
$$;

-- ---------------------------------------------------------------------------
-- Notificaciones in-app: a un usuario concreto o a todo un rol de la org
-- ---------------------------------------------------------------------------
create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete cascade,
  rol text check (rol in ('admin', 'supervisor', 'tecnico', 'cliente')),
  texto text not null,
  documento_id uuid,
  leida boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notificaciones_destino_chk check (usuario_id is not null or rol is not null)
);

create index notificaciones_org_idx on public.notificaciones (organizacion_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.organizaciones enable row level security;
alter table public.perfiles enable row level security;
alter table public.clientes enable row level security;
alter table public.sitios enable row level security;
alter table public.miembros enable row level security;
alter table public.consecutivos enable row level security;
alter table public.auditoria enable row level security;
alter table public.notificaciones enable row level security;

create policy org_ver on public.organizaciones for select to authenticated
  using (public.es_miembro(id));
create policy org_editar on public.organizaciones for update to authenticated
  using (public.tiene_rol(id, array['admin'])) with check (public.tiene_rol(id, array['admin']));

create policy perfil_ver on public.perfiles for select to authenticated
  using (id = auth.uid() or public.comparte_org(id));
create policy perfil_editar on public.perfiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Personal interno ve todos los clientes; un usuario cliente solo el suyo
create policy clientes_ver on public.clientes for select to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']) or id = public.cliente_de(organizacion_id));
create policy clientes_escribir on public.clientes for all to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor']))
  with check (public.tiene_rol(organizacion_id, array['admin', 'supervisor']));

create policy sitios_ver on public.sitios for select to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']) or cliente_id = public.cliente_de(organizacion_id));
create policy sitios_escribir on public.sitios for all to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor']))
  with check (public.tiene_rol(organizacion_id, array['admin', 'supervisor']));

create policy miembros_ver on public.miembros for select to authenticated
  using (usuario_id = auth.uid() or public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']));
create policy miembros_escribir on public.miembros for all to authenticated
  using (public.tiene_rol(organizacion_id, array['admin']))
  with check (public.tiene_rol(organizacion_id, array['admin']));

-- consecutivos: sin políticas → solo accesible vía siguiente_consecutivo()

create policy auditoria_ver on public.auditoria for select to authenticated
  using (public.tiene_rol(organizacion_id, array['admin']));

create policy notif_ver on public.notificaciones for select to authenticated
  using (public.es_miembro(organizacion_id) and (usuario_id = auth.uid() or (usuario_id is null and rol = public.rol_en(organizacion_id))));
create policy notif_marcar on public.notificaciones for update to authenticated
  using (public.es_miembro(organizacion_id) and (usuario_id = auth.uid() or (usuario_id is null and rol = public.rol_en(organizacion_id))))
  with check (public.es_miembro(organizacion_id));

-- ---------------------------------------------------------------------------
-- Permisos de ejecución de funciones
-- ---------------------------------------------------------------------------
revoke execute on function public.rol_en(uuid), public.es_miembro(uuid), public.tiene_rol(uuid, text[]),
  public.cliente_de(uuid), public.comparte_org(uuid), public.siguiente_consecutivo(uuid, text, int),
  public.registrar_auditoria(uuid, text, text, uuid, jsonb), public.touch_updated_at()
  from public, anon;
grant execute on function public.rol_en(uuid), public.es_miembro(uuid), public.tiene_rol(uuid, text[]),
  public.cliente_de(uuid), public.comparte_org(uuid), public.siguiente_consecutivo(uuid, text, int)
  to authenticated;
-- registrar_auditoria solo la usan otras funciones/triggers internos
revoke execute on function public.registrar_auditoria(uuid, text, text, uuid, jsonb) from authenticated;
