-- FormatoDigital · instalador generado por scripts/armar-instalador.sh
-- Pegar completo en Supabase → SQL Editor → Run. No editar a mano.

-- ======================== supabase/migrations/0001_nucleo.sql
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

-- ======================== supabase/migrations/0002_operacion.sql
-- ============================================================================
-- FormatoDigital — 0002 Operación: formatos, órdenes de servicio y documentos
--
-- La ORDEN DE SERVICIO es el eje que une los módulos: de ella cuelgan los
-- permisos de trabajo, los reportes técnicos (con su registro fotográfico),
-- los gastos y las cuentas de cobro.
--
-- Los documentos guardan el contenido del formato en `datos` (jsonb), así la
-- plataforma admite formatos nuevos por empresa sin cambiar el esquema; la
-- estructura de cada formato la valida la aplicación.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Formatos habilitados por organización (control documental)
-- ---------------------------------------------------------------------------
create table public.formatos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  clave text not null check (clave ~ '^[a-z_]{3,40}$'),          -- reporte, permiso, cuenta_cobro, gasto…
  codigo text not null,                                          -- FO-GSST-22
  nombre text not null,                                          -- Formato de reporte técnico
  version text not null default '01',
  fecha_version date,
  prefijo text not null check (prefijo ~ '^[A-Z]{1,5}$'),          -- RT, PT, CC…
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organizacion_id, clave)
);

-- ---------------------------------------------------------------------------
-- Órdenes de servicio
-- ---------------------------------------------------------------------------
create table public.ordenes_servicio (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  codigo text not null,
  cliente_id uuid not null references public.clientes(id),
  sitio_id uuid references public.sitios(id),
  titulo text not null,
  descripcion text not null default '',
  estado text not null default 'abierta'
    check (estado in ('abierta', 'en_ejecucion', 'cerrada', 'facturada', 'anulada')),
  responsable_id uuid references auth.users(id),
  fecha_programada date,
  creado_por uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organizacion_id, codigo)
);

create index ordenes_org_idx on public.ordenes_servicio (organizacion_id, created_at desc);
create index ordenes_cliente_idx on public.ordenes_servicio (cliente_id);
create trigger trg_ordenes_touch before update on public.ordenes_servicio
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Documentos (instancias de un formato: un reporte, un permiso…)
-- ---------------------------------------------------------------------------
create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  formato_id uuid not null references public.formatos(id),
  orden_id uuid references public.ordenes_servicio(id) on delete set null,
  cliente_id uuid references public.clientes(id),
  codigo text not null,
  consecutivo int not null,
  estado text not null default 'borrador'
    check (estado in ('borrador', 'en_revision', 'aprobado', 'rechazado', 'cerrado')),
  autor_id uuid not null default auth.uid() references auth.users(id),
  datos jsonb not null default '{}'::jsonb,
  motivo_rechazo text,
  enviado_at timestamptz,
  aprobado_at timestamptz,
  aprobado_por uuid references auth.users(id),
  cerrado_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organizacion_id, codigo)
);

create index documentos_org_idx on public.documentos (organizacion_id, created_at desc);
create index documentos_orden_idx on public.documentos (orden_id);
create index documentos_cliente_idx on public.documentos (cliente_id);
create index documentos_estado_idx on public.documentos (organizacion_id, estado);
create trigger trg_documentos_touch before update on public.documentos
  for each row execute function public.touch_updated_at();

-- Historial visible en la pantalla del documento (trazabilidad)
create table public.documento_eventos (
  id bigint generated always as identity primary key,
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  documento_id uuid not null references public.documentos(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_nombre text not null default '',
  accion text not null,
  detalle text,
  created_at timestamptz not null default now()
);

create index documento_eventos_doc_idx on public.documento_eventos (documento_id, created_at);

-- ---------------------------------------------------------------------------
-- Reglas del flujo: transiciones válidas, bloqueo del contenido y trazabilidad
-- ---------------------------------------------------------------------------
create or replace function public.documentos_flujo()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  rol text := public.rol_en(new.organizacion_id);
  revisor boolean := rol in ('admin', 'supervisor');
  es_autor boolean := new.autor_id = auth.uid();
  accion text;
begin
  -- La organización, el formato, el código y el autor no cambian
  if new.organizacion_id <> old.organizacion_id or new.formato_id <> old.formato_id
     or new.codigo <> old.codigo or new.autor_id <> old.autor_id then
    raise exception 'No se puede cambiar la organización, el formato, el código ni el autor' using errcode = '42501';
  end if;

  -- Contenido editable solo en borrador/rechazado; al cerrar se permite
  -- completar el cierre (permiso) o la firma del cliente (reporte).
  if new.datos is distinct from old.datos
     and old.estado not in ('borrador', 'rechazado')
     and not (old.estado = 'aprobado' and new.estado = 'cerrado') then
    raise exception 'El documento está bloqueado: después de enviarse no se puede modificar' using errcode = '42501';
  end if;

  if new.estado <> old.estado then
    if old.estado in ('borrador', 'rechazado') and new.estado = 'en_revision' and (es_autor or revisor) then
      new.enviado_at := now(); new.motivo_rechazo := null; accion := 'Envió a revisión';
    elsif old.estado = 'rechazado' and new.estado = 'borrador' and (es_autor or revisor) then
      accion := 'Volvió a borrador';
    elsif old.estado = 'en_revision' and new.estado = 'aprobado' and revisor then
      new.aprobado_at := now(); new.aprobado_por := auth.uid(); accion := 'Aprobó';
    elsif old.estado = 'en_revision' and new.estado = 'rechazado' and revisor then
      if coalesce(trim(new.motivo_rechazo), '') = '' then
        raise exception 'El rechazo requiere un motivo' using errcode = '23514';
      end if;
      accion := 'Rechazó';
    elsif old.estado = 'aprobado' and new.estado = 'cerrado' and revisor then
      new.cerrado_at := now(); accion := 'Cerró';
    elsif old.estado = 'aprobado' and new.estado = 'cerrado'
          and current_setting('fd.cierre_por_enlace', true) = 'si'
          and new.datos is not distinct from old.datos
          and exists (select 1 from public.firmas f
                      where f.documento_id = new.id and f.campo = 'firmaCliente' and f.origen = 'enlace') then
      -- Cierre autorizado por la firma remota del cliente (ver firmar_con_enlace)
      new.cerrado_at := now(); accion := 'Cerró con la firma del cliente';
    else
      raise exception 'Transición no permitida: % → % para el rol %', old.estado, new.estado, coalesce(rol, 'sin rol')
        using errcode = '42501';
    end if;

    insert into public.documento_eventos (organizacion_id, documento_id, actor_id, actor_nombre, accion, detalle)
    values (new.organizacion_id, new.id, auth.uid(),
            coalesce((select nombre from public.perfiles where id = auth.uid()), nullif(current_setting('fd.actor_nombre', true), ''), ''),
            accion, case when new.estado = 'rechazado' then new.motivo_rechazo end);
    perform public.registrar_auditoria(new.organizacion_id, accion, 'documento', new.id, jsonb_build_object('codigo', new.codigo));
  end if;

  return new;
end;
$$;

create trigger trg_documentos_flujo before update on public.documentos
  for each row execute function public.documentos_flujo();

-- Al crear: estado inicial borrador y primer evento del historial
create or replace function public.documentos_creado()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.documento_eventos (organizacion_id, documento_id, actor_id, actor_nombre, accion)
  values (new.organizacion_id, new.id, auth.uid(),
          coalesce((select nombre from public.perfiles where id = auth.uid()), ''), 'Creó el documento');
  perform public.registrar_auditoria(new.organizacion_id, 'Creó', 'documento', new.id, jsonb_build_object('codigo', new.codigo));
  return new;
end;
$$;

create trigger trg_documentos_creado after insert on public.documentos
  for each row execute function public.documentos_creado();

-- ---------------------------------------------------------------------------
-- Crear un documento con su código consecutivo en una sola llamada
-- ---------------------------------------------------------------------------
create or replace function public.crear_documento(org uuid, clave_formato text, datos jsonb default '{}'::jsonb,
                                                   orden uuid default null, cliente uuid default null)
returns public.documentos
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  f public.formatos;
  n int;
  anio int := extract(year from now())::int;
  doc public.documentos;
begin
  select * into f from public.formatos where organizacion_id = org and clave = clave_formato and activo;
  if not found then
    raise exception 'Formato % no habilitado en esta organización', clave_formato using errcode = 'P0002';
  end if;
  n := public.siguiente_consecutivo(org, clave_formato, anio);
  insert into public.documentos (organizacion_id, formato_id, orden_id, cliente_id, codigo, consecutivo, datos)
  values (org, f.id, orden, cliente, format('%s-%s-%s', f.prefijo, lpad(n::text, 3, '0'), right(anio::text, 2)), n, coalesce(datos, '{}'::jsonb))
  returning * into doc;
  return doc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Firmas: en sitio (en el equipo del técnico), por portal o por enlace remoto
-- ---------------------------------------------------------------------------
create table public.firmas (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  documento_id uuid not null references public.documentos(id) on delete cascade,
  campo text not null,                          -- firmaTecnico, firmaCliente, ejecutor:0…
  firmante_nombre text not null,
  firmante_usuario_id uuid references auth.users(id) on delete set null,
  imagen text not null,                         -- PNG en data URL (firmas pesan pocos KB)
  origen text not null check (origen in ('en_sitio', 'portal', 'enlace')),
  firmado_at timestamptz not null default now(),
  unique (documento_id, campo)
);

-- Enlaces de firma remota: el cliente firma sin cuenta, desde el correo o WhatsApp.
-- Se guarda solo el hash del token; caducan y se usan una vez.
create table public.enlaces_firma (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  documento_id uuid not null references public.documentos(id) on delete cascade,
  campo text not null default 'firmaCliente',
  token_hash text not null unique,
  correo_destino text not null default '',
  expira_at timestamptz not null default now() + interval '7 days',
  usado_at timestamptz,
  creado_por uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

-- Genera un enlace y devuelve el token en claro (única vez que se ve)
create or replace function public.crear_enlace_firma(doc uuid, correo text default '', campo_firma text default 'firmaCliente')
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  d public.documentos;
  token text := encode(gen_random_bytes(24), 'hex');
begin
  select * into d from public.documentos where id = doc and deleted_at is null;
  if not found or not public.tiene_rol(d.organizacion_id, array['admin', 'supervisor', 'tecnico']) then
    raise exception 'Documento no disponible' using errcode = '42501';
  end if;
  if d.estado not in ('aprobado', 'en_revision') then
    raise exception 'Solo se puede pedir la firma de un documento enviado o aprobado' using errcode = '23514';
  end if;
  insert into public.enlaces_firma (organizacion_id, documento_id, campo, token_hash, correo_destino)
  values (d.organizacion_id, d.id, campo_firma, encode(digest(token, 'sha256'), 'hex'), coalesce(correo, ''));
  perform public.registrar_auditoria(d.organizacion_id, 'Solicitó firma remota', 'documento', d.id, jsonb_build_object('correo', correo));
  return token;
end;
$$;

-- Lo que ve quien abre el enlace (sin sesión): datos del documento para firmar
create or replace function public.documento_por_enlace(token text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select jsonb_build_object(
    'codigo', d.codigo, 'formato', f.clave, 'formato_codigo', f.codigo, 'formato_nombre', f.nombre,
    'organizacion', o.nombre, 'logo', o.logo_url, 'datos', d.datos, 'campo', e.campo, 'expira_at', e.expira_at)
  from public.enlaces_firma e
  join public.documentos d on d.id = e.documento_id
  join public.formatos f on f.id = d.formato_id
  join public.organizaciones o on o.id = d.organizacion_id
  where e.token_hash = encode(digest(token, 'sha256'), 'hex')
    and e.usado_at is null and e.expira_at > now() and d.deleted_at is null
$$;

-- Firma con el enlace: guarda la firma, marca el enlace como usado y, si es la
-- firma del cliente sobre un documento aprobado, lo cierra.
create or replace function public.firmar_con_enlace(token text, nombre text, imagen text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  e public.enlaces_firma;
  d public.documentos;
begin
  if coalesce(trim(nombre), '') = '' or coalesce(imagen, '') not like 'data:image/png;base64,%' then
    raise exception 'Nombre y firma son obligatorios' using errcode = '23514';
  end if;
  if length(imagen) > 300000 then
    raise exception 'La imagen de la firma es demasiado grande' using errcode = '23514';
  end if;
  select * into e from public.enlaces_firma
  where token_hash = encode(digest(token, 'sha256'), 'hex') and usado_at is null and expira_at > now()
  for update;
  if not found then
    raise exception 'El enlace no es válido o ya caducó' using errcode = '42501';
  end if;
  select * into d from public.documentos where id = e.documento_id for update;

  insert into public.firmas (organizacion_id, documento_id, campo, firmante_nombre, imagen, origen)
  values (e.organizacion_id, e.documento_id, e.campo, trim(nombre), imagen, 'enlace')
  on conflict (documento_id, campo) do update
    set firmante_nombre = excluded.firmante_nombre, imagen = excluded.imagen, origen = 'enlace', firmado_at = now();
  update public.enlaces_firma set usado_at = now() where id = e.id;

  insert into public.documento_eventos (organizacion_id, documento_id, actor_nombre, accion, detalle)
  values (e.organizacion_id, e.documento_id, trim(nombre), 'Firmó por enlace', e.campo);

  -- Cierre automático del reporte aprobado cuando firma el cliente
  if e.campo = 'firmaCliente' and d.estado = 'aprobado' then
    -- El trigger de flujo exige rol revisor; este cierre lo autoriza la firma
    -- por enlace recién guardada (el trigger verifica que exista).
    perform set_config('fd.cierre_por_enlace', 'si', true);
    perform set_config('fd.actor_nombre', trim(nombre), true);
    update public.documentos set estado = 'cerrado' where id = d.id;
    perform set_config('fd.cierre_por_enlace', '', true);
    return 'cerrado';
  end if;
  return 'firmado';
end;
$$;

-- ---------------------------------------------------------------------------
-- Archivos: fotos del registro fotográfico, soportes de gastos, PDFs.
-- El binario vive en Storage; aquí la ruta y los metadatos.
-- ---------------------------------------------------------------------------
create table public.archivos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  documento_id uuid references public.documentos(id) on delete cascade,
  orden_id uuid references public.ordenes_servicio(id) on delete cascade,
  tipo text not null check (tipo in ('foto', 'soporte', 'pdf')),
  ruta text not null,                            -- {organizacion_id}/{documento_id}/{archivo}
  descripcion text not null default '',
  etiqueta text check (etiqueta in ('antes', 'despues')),
  posicion int not null default 0,
  creado_por uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  constraint archivos_destino_chk check (documento_id is not null or orden_id is not null)
);

create index archivos_documento_idx on public.archivos (documento_id, posicion);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.formatos enable row level security;
alter table public.ordenes_servicio enable row level security;
alter table public.documentos enable row level security;
alter table public.documento_eventos enable row level security;
alter table public.firmas enable row level security;
alter table public.enlaces_firma enable row level security;
alter table public.archivos enable row level security;

create policy formatos_ver on public.formatos for select to authenticated
  using (public.es_miembro(organizacion_id));
create policy formatos_escribir on public.formatos for all to authenticated
  using (public.tiene_rol(organizacion_id, array['admin'])) with check (public.tiene_rol(organizacion_id, array['admin']));

create policy ordenes_ver on public.ordenes_servicio for select to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']) or cliente_id = public.cliente_de(organizacion_id));
create policy ordenes_crear on public.ordenes_servicio for insert to authenticated
  with check (public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']));
create policy ordenes_editar on public.ordenes_servicio for update to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor']) or (responsable_id = auth.uid() and public.es_miembro(organizacion_id)))
  with check (public.es_miembro(organizacion_id));

-- Revisores ven todo; el técnico, lo suyo; el cliente, lo de su empresa ya enviado
create policy documentos_ver on public.documentos for select to authenticated
  using (
    deleted_at is null and (
      public.tiene_rol(organizacion_id, array['admin', 'supervisor'])
      or (autor_id = auth.uid() and public.es_miembro(organizacion_id))
      or (cliente_id = public.cliente_de(organizacion_id) and estado in ('aprobado', 'cerrado'))
    )
  );
create policy documentos_crear on public.documentos for insert to authenticated
  with check (autor_id = auth.uid() and public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']));
create policy documentos_editar on public.documentos for update to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor']) or (autor_id = auth.uid() and public.es_miembro(organizacion_id)))
  with check (public.es_miembro(organizacion_id));

-- Eventos, firmas y archivos: visibles si el documento lo es (la subconsulta aplica RLS)
create policy eventos_ver on public.documento_eventos for select to authenticated
  using (exists (select 1 from public.documentos d where d.id = documento_id));

create policy firmas_ver on public.firmas for select to authenticated
  using (exists (select 1 from public.documentos d where d.id = documento_id));
create policy firmas_crear on public.firmas for insert to authenticated
  with check (
    public.es_miembro(organizacion_id)
    and exists (select 1 from public.documentos d where d.id = documento_id and d.organizacion_id = organizacion_id)
  );
create policy firmas_actualizar on public.firmas for update to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']))
  with check (public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']));

create policy enlaces_ver on public.enlaces_firma for select to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor']));

create policy archivos_ver on public.archivos for select to authenticated
  using (
    (documento_id is not null and exists (select 1 from public.documentos d where d.id = documento_id))
    or (orden_id is not null and exists (select 1 from public.ordenes_servicio o where o.id = orden_id))
  );
create policy archivos_crear on public.archivos for insert to authenticated
  with check (public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']) and creado_por = auth.uid());
create policy archivos_borrar on public.archivos for delete to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor']) or creado_por = auth.uid());

-- ---------------------------------------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------------------------------------
revoke execute on function public.documentos_flujo(), public.documentos_creado(),
  public.crear_documento(uuid, text, jsonb, uuid, uuid), public.crear_enlace_firma(uuid, text, text),
  public.documento_por_enlace(text), public.firmar_con_enlace(text, text, text)
  from public;
grant execute on function public.crear_documento(uuid, text, jsonb, uuid, uuid), public.crear_enlace_firma(uuid, text, text)
  to authenticated;
-- El enlace de firma funciona sin sesión
grant execute on function public.documento_por_enlace(text), public.firmar_con_enlace(text, text, text)
  to anon, authenticated;

-- ======================== supabase/migrations/0003_finanzas.sql
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

-- ======================== supabase/migrations/0004_storage.sql
-- ============================================================================
-- FormatoDigital — 0004 Almacenamiento (solo Supabase)
--
-- Bucket privado "archivos": fotos del registro fotográfico, soportes de
-- gastos y PDFs. Ruta: {organizacion_id}/{documento_o_orden_id}/{archivo}.
-- Cada usuario solo accede a la carpeta de las organizaciones de las que es
-- miembro. En un PostgreSQL sin Supabase este archivo no hace nada.
-- ============================================================================
do $migracion$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise notice 'Sin esquema storage (no es Supabase): se omite 0004_storage';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('archivos', 'archivos', false, 8 * 1024 * 1024,
          array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
  on conflict (id) do nothing;

  execute $p$
    create policy archivos_leer on storage.objects for select to authenticated
    using (bucket_id = 'archivos' and public.es_miembro(((storage.foldername(name))[1])::uuid))
  $p$;
  execute $p$
    create policy archivos_subir on storage.objects for insert to authenticated
    with check (bucket_id = 'archivos'
                and public.tiene_rol(((storage.foldername(name))[1])::uuid, array['admin', 'supervisor', 'tecnico']))
  $p$;
  execute $p$
    create policy archivos_borrar on storage.objects for delete to authenticated
    using (bucket_id = 'archivos'
           and (owner = auth.uid() or public.tiene_rol(((storage.foldername(name))[1])::uuid, array['admin', 'supervisor'])))
  $p$;
end
$migracion$;

-- ======================== supabase/migrations/0005_auth_perfiles.sql
-- ============================================================================
-- FormatoDigital — 0005 Perfil automático al registrarse
-- Cada usuario nuevo de Supabase Auth recibe su fila en `perfiles`. La
-- pertenencia a una organización (y su rol) la asigna después un admin en
-- `miembros`: registrarse no da acceso a ningún dato.
-- ============================================================================
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.perfiles (id, email, nombre)
  values (new.id, coalesce(new.email, ''), coalesce(split_part(new.email, '@', 1), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.crear_perfil() from public, anon, authenticated;

drop trigger if exists trg_crear_perfil on auth.users;
create trigger trg_crear_perfil after insert on auth.users
  for each row execute function public.crear_perfil();

-- ======================== supabase/migrations/0006_endurecer_funciones.sql
-- ============================================================================
-- FormatoDigital — 0006 Endurecimiento (Security Advisor de Supabase)
--
-- Supabase otorga EXECUTE a anon y authenticated en cada función nueva del
-- esquema public; las migraciones anteriores solo lo retiraban de PUBLIC.
--  1. Funciones de trigger: nadie las invoca por la API.
--  2. crear_enlace_firma: solo usuarios con sesión.
--  3. Consecutivos: ya no se reservan por fuera de la creación del documento
--     (evita "quemar" números y dejar huecos en la numeración del SGC).
--     crear_documento y crear_cuenta_cobro pasan a SECURITY DEFINER con sus
--     propias verificaciones de rol y pertenencia.
-- Se mantienen abiertas a propósito: documento_por_enlace y firmar_con_enlace
-- (el cliente firma sin cuenta) y las funciones auxiliares que usan las
-- políticas RLS (rol_en, es_miembro, tiene_rol, cliente_de, comparte_org).
-- ============================================================================

-- 1. Funciones de trigger
revoke execute on function
  public.touch_updated_at(), public.documentos_flujo(), public.documentos_creado(),
  public.gastos_flujo(), public.cuentas_cobro_recalcular(), public.cuentas_cobro_flujo(),
  public.cuenta_items_bloqueo(), public.crear_perfil()
  from public, anon, authenticated;

-- 2. Pedir firma requiere sesión
revoke execute on function public.crear_enlace_firma(uuid, text, text) from anon;
revoke execute on function public.registrar_auditoria(uuid, text, text, uuid, jsonb) from anon, authenticated;

-- 3. Consecutivos solo a través de la creación del documento o la cuenta
revoke execute on function public.siguiente_consecutivo(uuid, text, int) from anon, authenticated;

create or replace function public.crear_documento(org uuid, clave_formato text, datos jsonb default '{}'::jsonb,
                                                   orden uuid default null, cliente uuid default null)
returns public.documentos
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  f public.formatos;
  n int;
  anio int := extract(year from now())::int;
  doc public.documentos;
begin
  if auth.uid() is null or not public.tiene_rol(org, array['admin', 'supervisor', 'tecnico']) then
    raise exception 'Sin permiso para crear documentos en esta organización' using errcode = '42501';
  end if;
  if cliente is not null and not exists (select 1 from public.clientes where id = cliente and organizacion_id = org) then
    raise exception 'El cliente no pertenece a esta organización' using errcode = '42501';
  end if;
  if orden is not null and not exists (select 1 from public.ordenes_servicio where id = orden and organizacion_id = org) then
    raise exception 'La orden no pertenece a esta organización' using errcode = '42501';
  end if;
  select * into f from public.formatos where organizacion_id = org and clave = clave_formato and activo;
  if not found then
    raise exception 'Formato % no habilitado en esta organización', clave_formato using errcode = 'P0002';
  end if;
  n := public.siguiente_consecutivo(org, clave_formato, anio);
  insert into public.documentos (organizacion_id, formato_id, orden_id, cliente_id, codigo, consecutivo, autor_id, datos)
  values (org, f.id, orden, cliente, format('%s-%s-%s', f.prefijo, lpad(n::text, 3, '0'), right(anio::text, 2)), n, auth.uid(), coalesce(datos, '{}'::jsonb))
  returning * into doc;
  return doc;
end;
$$;

create or replace function public.crear_cuenta_cobro(org uuid, cliente uuid, concepto text, orden uuid default null)
returns public.cuentas_cobro
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  f public.formatos;
  n int;
  anio int := extract(year from now())::int;
  c public.cuentas_cobro;
begin
  if auth.uid() is null or not public.tiene_rol(org, array['admin', 'supervisor']) then
    raise exception 'Sin permiso para crear cuentas de cobro en esta organización' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clientes where id = cliente and organizacion_id = org) then
    raise exception 'El cliente no pertenece a esta organización' using errcode = '42501';
  end if;
  if orden is not null and not exists (select 1 from public.ordenes_servicio where id = orden and organizacion_id = org) then
    raise exception 'La orden no pertenece a esta organización' using errcode = '42501';
  end if;
  select * into f from public.formatos where organizacion_id = org and clave = 'cuenta_cobro' and activo;
  if not found then
    raise exception 'Formato cuenta_cobro no habilitado en esta organización' using errcode = 'P0002';
  end if;
  n := public.siguiente_consecutivo(org, 'cuenta_cobro', anio);
  insert into public.cuentas_cobro (organizacion_id, orden_id, cliente_id, codigo, consecutivo, concepto, creado_por)
  values (org, orden, cliente, format('%s-%s-%s', f.prefijo, lpad(n::text, 3, '0'), right(anio::text, 2)), n, concepto, auth.uid())
  returning * into c;
  return c;
end;
$$;

revoke execute on function public.crear_documento(uuid, text, jsonb, uuid, uuid), public.crear_cuenta_cobro(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.crear_documento(uuid, text, jsonb, uuid, uuid), public.crear_cuenta_cobro(uuid, uuid, text, uuid) to authenticated;

-- ======================== supabase/migrations/0007_gastos_como_formato.sql
-- ============================================================================
-- FormatoDigital — 0007 Legalización de gastos como formato (FO-GSST-25)
--
-- SOTEC entregó su formato de gastos: una legalización con varios gastos, sus
-- soportes (foto de cada factura), firma del colaborador y Vo.Bo. Encaja en el
-- modelo general de documentos (flujo, historial, firmas, archivos), así que
-- la tabla provisional `gastos` de 0003 deja de usarse.
-- Los ítems viven en documentos.datos.items y las fotos en `archivos`
-- (tipo 'soporte'), igual que el registro fotográfico del reporte.
-- ============================================================================
drop table if exists public.gastos cascade;
drop function if exists public.gastos_flujo();

insert into public.formatos (organizacion_id, clave, codigo, nombre, version, fecha_version, prefijo)
select o.id, 'gasto', 'FO-GSST-25', 'Formato de legalización y registro de gastos operativos', '01', date '2020-03-01', 'LG'
from public.organizaciones o
where o.slug = 'sotec'
on conflict (organizacion_id, clave) do nothing;

-- ---------------------------------------------------------------------------
-- Formatos internos: el portal del cliente no los muestra (p. ej. los gastos
-- son de la operación interna de la empresa, aunque se carguen a su obra).
-- ---------------------------------------------------------------------------
alter table public.formatos add column if not exists visible_cliente boolean not null default true;
update public.formatos set visible_cliente = false where clave = 'gasto';

drop policy if exists documentos_ver on public.documentos;
create policy documentos_ver on public.documentos for select to authenticated
  using (
    deleted_at is null and (
      public.tiene_rol(organizacion_id, array['admin', 'supervisor'])
      or (autor_id = auth.uid() and public.es_miembro(organizacion_id))
      or (cliente_id = public.cliente_de(organizacion_id) and estado in ('aprobado', 'cerrado')
          and exists (select 1 from public.formatos f where f.id = formato_id and f.visible_cliente))
    )
  );

-- ======================== supabase/migrations/0008_separacion_funciones.sql
-- ============================================================================
-- FormatoDigital — 0008 Separación de funciones y firma por enlace más estricta
-- (hallazgos de las pruebas exploratorias)
--  1. Solo el autor edita el contenido y envía su documento; nadie aprueba ni
--     rechaza lo propio.
--  2. Los enlaces de firma solo se crean para reportes APROBADOS que aún no
--     tienen la firma del cliente.
--  3. Al firmar por enlace se anulan los demás enlaces pendientes del
--     documento, y una firma del cliente ya registrada no se reemplaza.
-- ============================================================================

create or replace function public.documentos_flujo()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  rol text := public.rol_en(new.organizacion_id);
  revisor boolean := rol in ('admin', 'supervisor');
  es_autor boolean := new.autor_id = auth.uid();
  accion text;
begin
  -- La organización, el formato, el código y el autor no cambian
  if new.organizacion_id <> old.organizacion_id or new.formato_id <> old.formato_id
     or new.codigo <> old.codigo or new.autor_id <> old.autor_id then
    raise exception 'No se puede cambiar la organización, el formato, el código ni el autor' using errcode = '42501';
  end if;

  -- Contenido editable solo en borrador/rechazado; al cerrar se permite
  -- completar el cierre (permiso) o la firma del cliente (reporte).
  if new.datos is distinct from old.datos
     and old.estado not in ('borrador', 'rechazado')
     and not (old.estado = 'aprobado' and new.estado = 'cerrado') then
    raise exception 'El documento está bloqueado: después de enviarse no se puede modificar' using errcode = '42501';
  end if;

  -- En borrador o rechazado, el contenido solo lo edita su autor (separación de funciones)
  if new.datos is distinct from old.datos and old.estado in ('borrador', 'rechazado') and not es_autor then
    raise exception 'Solo el autor puede editar el documento' using errcode = '42501';
  end if;

  if new.estado <> old.estado then
    if old.estado in ('borrador', 'rechazado') and new.estado = 'en_revision' and es_autor then
      new.enviado_at := now(); new.motivo_rechazo := null; accion := 'Envió a revisión';
    elsif old.estado = 'rechazado' and new.estado = 'borrador' and es_autor then
      accion := 'Volvió a borrador';
    elsif old.estado = 'en_revision' and new.estado in ('aprobado', 'rechazado') and revisor and es_autor then
      raise exception 'Nadie aprueba ni rechaza su propio documento' using errcode = '42501';
    elsif old.estado = 'en_revision' and new.estado = 'aprobado' and revisor then
      new.aprobado_at := now(); new.aprobado_por := auth.uid(); accion := 'Aprobó';
    elsif old.estado = 'en_revision' and new.estado = 'rechazado' and revisor then
      if coalesce(trim(new.motivo_rechazo), '') = '' then
        raise exception 'El rechazo requiere un motivo' using errcode = '23514';
      end if;
      accion := 'Rechazó';
    elsif old.estado = 'aprobado' and new.estado = 'cerrado' and revisor then
      new.cerrado_at := now(); accion := 'Cerró';
    elsif old.estado = 'aprobado' and new.estado = 'cerrado'
          and current_setting('fd.cierre_por_enlace', true) = 'si'
          and new.datos is not distinct from old.datos
          and exists (select 1 from public.firmas f
                      where f.documento_id = new.id and f.campo = 'firmaCliente' and f.origen = 'enlace') then
      -- Cierre autorizado por la firma remota del cliente (ver firmar_con_enlace)
      new.cerrado_at := now(); accion := 'Cerró con la firma del cliente';
    else
      raise exception 'Transición no permitida: % → % para el rol %', old.estado, new.estado, coalesce(rol, 'sin rol')
        using errcode = '42501';
    end if;

    insert into public.documento_eventos (organizacion_id, documento_id, actor_id, actor_nombre, accion, detalle)
    values (new.organizacion_id, new.id, auth.uid(),
            coalesce((select nombre from public.perfiles where id = auth.uid()), nullif(current_setting('fd.actor_nombre', true), ''), ''),
            accion, case when new.estado = 'rechazado' then new.motivo_rechazo end);
    perform public.registrar_auditoria(new.organizacion_id, accion, 'documento', new.id, jsonb_build_object('codigo', new.codigo));
  end if;

  return new;
end;
$$;

create or replace function public.crear_enlace_firma(doc uuid, correo text default '', campo_firma text default 'firmaCliente')
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  d public.documentos;
  token text := encode(gen_random_bytes(24), 'hex');
begin
  select * into d from public.documentos where id = doc and deleted_at is null;
  if not found or not public.tiene_rol(d.organizacion_id, array['admin', 'supervisor', 'tecnico']) then
    raise exception 'Documento no disponible' using errcode = '42501';
  end if;
  if d.estado <> 'aprobado' then
    raise exception 'Solo se puede pedir la firma del cliente sobre un documento aprobado' using errcode = '23514';
  end if;
  if exists (select 1 from public.firmas f where f.documento_id = d.id and f.campo = campo_firma) then
    raise exception 'El documento ya tiene esa firma' using errcode = '23514';
  end if;
  insert into public.enlaces_firma (organizacion_id, documento_id, campo, token_hash, correo_destino)
  values (d.organizacion_id, d.id, campo_firma, encode(digest(token, 'sha256'), 'hex'), coalesce(correo, ''));
  perform public.registrar_auditoria(d.organizacion_id, 'Solicitó firma remota', 'documento', d.id, jsonb_build_object('correo', correo));
  return token;
end;
$$;

create or replace function public.firmar_con_enlace(token text, nombre text, imagen text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  e public.enlaces_firma;
  d public.documentos;
begin
  if coalesce(trim(nombre), '') = '' or coalesce(imagen, '') not like 'data:image/png;base64,%' then
    raise exception 'Nombre y firma son obligatorios' using errcode = '23514';
  end if;
  if length(imagen) > 300000 then
    raise exception 'La imagen de la firma es demasiado grande' using errcode = '23514';
  end if;
  select * into e from public.enlaces_firma
  where token_hash = encode(digest(token, 'sha256'), 'hex') and usado_at is null and expira_at > now()
  for update;
  if not found then
    raise exception 'El enlace no es válido o ya caducó' using errcode = '42501';
  end if;
  select * into d from public.documentos where id = e.documento_id for update;
  -- El documento debe seguir aprobado y sin esa firma (pudo cerrarse por otra vía)
  if d.estado <> 'aprobado' or exists (select 1 from public.firmas f where f.documento_id = d.id and f.campo = e.campo) then
    update public.enlaces_firma set usado_at = now() where id = e.id;
    raise exception 'El enlace no es válido o ya caducó' using errcode = '42501';
  end if;

  insert into public.firmas (organizacion_id, documento_id, campo, firmante_nombre, imagen, origen)
  values (e.organizacion_id, e.documento_id, e.campo, trim(nombre), imagen, 'enlace');
  -- Se anulan todos los enlaces pendientes de este documento
  update public.enlaces_firma set usado_at = now() where documento_id = e.documento_id and usado_at is null;

  insert into public.documento_eventos (organizacion_id, documento_id, actor_nombre, accion, detalle)
  values (e.organizacion_id, e.documento_id, trim(nombre), 'Firmó por enlace', e.campo);

  if e.campo = 'firmaCliente' then
    perform set_config('fd.cierre_por_enlace', 'si', true);
    perform set_config('fd.actor_nombre', trim(nombre), true);
    update public.documentos set estado = 'cerrado' where id = d.id;
    perform set_config('fd.cierre_por_enlace', '', true);
    return 'cerrado';
  end if;
  return 'firmado';
end;
$$;

revoke execute on function public.documentos_flujo() from public, anon, authenticated;
revoke execute on function public.crear_enlace_firma(uuid, text, text) from public, anon;
grant execute on function public.crear_enlace_firma(uuid, text, text) to authenticated;
revoke execute on function public.firmar_con_enlace(text, text, text) from public;
grant execute on function public.firmar_con_enlace(text, text, text) to anon, authenticated;

-- ======================== supabase/migrations/0009_proyectos.sql
-- ============================================================================
-- FormatoDigital — 0009 Proyectos y cotizaciones
--  1. Proyectos: cada obra de un cliente (PRY-001-26) agrupa sus documentos
--     (reportes, permisos, gastos, cotizaciones) y sus cuentas de cobro.
--     Miembros internos ven los proyectos de su empresa; el cliente, solo los
--     suyos. Se crean con crear_proyecto (admin y SST) y su consecutivo.
--  2. documentos.proyecto_id y cuentas_cobro.proyecto_id: opcionales, de la
--     misma organización y del mismo cliente; se bloquean con el documento.
--  3. Cotización (COT, visible para el cliente) como formato de documentos.
--  4. firmar_como_cliente: el cliente acepta en su portal (reporte o
--     cotización aprobados) y su firma cierra el documento.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Proyectos
-- ---------------------------------------------------------------------------
create table if not exists public.proyectos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id),
  codigo text not null,
  consecutivo int not null,
  nombre text not null check (length(trim(nombre)) > 0),
  sitio text not null default '',
  descripcion text not null default '',
  responsable_id uuid references auth.users(id) on delete set null,
  fecha_inicio date not null default current_date,
  fecha_fin date,
  estado text not null default 'activo' check (estado in ('activo', 'en_pausa', 'cerrado')),
  presupuesto numeric(14, 2) check (presupuesto is null or presupuesto >= 0),
  creado_por uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organizacion_id, codigo),
  constraint proyectos_fechas_chk check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

create index if not exists proyectos_org_idx on public.proyectos (organizacion_id, estado);
create index if not exists proyectos_cliente_idx on public.proyectos (cliente_id);
drop trigger if exists trg_proyectos_touch on public.proyectos;
create trigger trg_proyectos_touch before update on public.proyectos
  for each row execute function public.touch_updated_at();

-- El cliente y el responsable son de la misma organización; el código no cambia
create or replace function public.proyectos_coherencia()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' and (new.organizacion_id <> old.organizacion_id or new.codigo <> old.codigo or new.consecutivo <> old.consecutivo) then
    raise exception 'No se puede cambiar la organización ni el código del proyecto' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clientes c where c.id = new.cliente_id and c.organizacion_id = new.organizacion_id) then
    raise exception 'El cliente no pertenece a esta organización' using errcode = '42501';
  end if;
  if new.responsable_id is not null and not exists (
    select 1 from public.miembros m
    where m.organizacion_id = new.organizacion_id and m.usuario_id = new.responsable_id and m.rol <> 'cliente'
  ) then
    raise exception 'El responsable debe ser del equipo de la organización' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.estado <> old.estado then
    if new.estado = 'cerrado' and new.fecha_fin is null then new.fecha_fin := current_date; end if;
    perform public.registrar_auditoria(new.organizacion_id, 'Proyecto ' || new.estado, 'proyecto', new.id, jsonb_build_object('codigo', new.codigo));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proyectos_coherencia on public.proyectos;
create trigger trg_proyectos_coherencia before insert or update on public.proyectos
  for each row execute function public.proyectos_coherencia();

alter table public.proyectos enable row level security;

drop policy if exists proyectos_ver on public.proyectos;
create policy proyectos_ver on public.proyectos for select to authenticated
  using (
    public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico'])
    or cliente_id = public.cliente_de(organizacion_id)
  );
-- Se crean solo con crear_proyecto (consecutivo); los editan admin y SST
drop policy if exists proyectos_editar on public.proyectos;
create policy proyectos_editar on public.proyectos for update to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor']))
  with check (public.tiene_rol(organizacion_id, array['admin', 'supervisor']));

create or replace function public.crear_proyecto(org uuid, cliente uuid, nombre text, sitio text default '',
                                                 responsable uuid default null, fecha_inicio date default current_date,
                                                 presupuesto numeric default null, descripcion text default '')
returns public.proyectos
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  n int;
  anio int := extract(year from coalesce(fecha_inicio, current_date))::int;
  prefijo text;
  p public.proyectos;
begin
  if auth.uid() is null or not public.tiene_rol(org, array['admin', 'supervisor']) then
    raise exception 'Sin permiso para crear proyectos en esta organización' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clientes c where c.id = cliente and c.organizacion_id = org) then
    raise exception 'El cliente no pertenece a esta organización' using errcode = '42501';
  end if;
  select coalesce(nullif(o.config->>'prefijoProyecto', ''), 'PRY') into prefijo from public.organizaciones o where o.id = org;
  n := public.siguiente_consecutivo(org, 'proyecto', anio);
  insert into public.proyectos (organizacion_id, cliente_id, codigo, consecutivo, nombre, sitio, responsable_id, fecha_inicio, presupuesto, descripcion, creado_por)
  values (org, cliente, format('%s-%s-%s', prefijo, lpad(n::text, 3, '0'), right(anio::text, 2)), n, trim(nombre), coalesce(sitio, ''),
          coalesce(responsable, auth.uid()), coalesce(fecha_inicio, current_date), presupuesto, coalesce(descripcion, ''), auth.uid())
  returning * into p;
  perform public.registrar_auditoria(org, 'Creó proyecto', 'proyecto', p.id, jsonb_build_object('codigo', p.codigo));
  return p;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Documentos y cuentas de cobro dentro de un proyecto
-- ---------------------------------------------------------------------------
alter table public.documentos add column if not exists proyecto_id uuid references public.proyectos(id) on delete set null;
alter table public.cuentas_cobro add column if not exists proyecto_id uuid references public.proyectos(id) on delete set null;
create index if not exists documentos_proyecto_idx on public.documentos (proyecto_id);
create index if not exists cuentas_cobro_proyecto_idx on public.cuentas_cobro (proyecto_id);

-- Se elimina solo un proyecto vacío (sin documentos ni cuentas); si tiene historial, se cierra
drop policy if exists proyectos_borrar on public.proyectos;
create policy proyectos_borrar on public.proyectos for delete to authenticated
  using (
    public.tiene_rol(organizacion_id, array['admin', 'supervisor'])
    and not exists (select 1 from public.documentos d where d.proyecto_id = proyectos.id)
    and not exists (select 1 from public.cuentas_cobro c where c.proyecto_id = proyectos.id)
  );


-- El proyecto es de la misma organización y del mismo cliente; cambia solo mientras
-- el documento es editable (borrador/rechazado) o la cuenta está en borrador
create or replace function public.proyecto_coherente()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  editable boolean;
begin
  if new.proyecto_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.proyecto_id is not distinct from old.proyecto_id and new.cliente_id is not distinct from old.cliente_id then return new; end if;
  if tg_op = 'UPDATE' and new.proyecto_id is distinct from old.proyecto_id then
    editable := case tg_table_name when 'documentos' then old.estado in ('borrador', 'rechazado') else old.estado = 'borrador' end;
    if not editable then
      raise exception 'El proyecto no se puede cambiar después de enviar o emitir' using errcode = '42501';
    end if;
  end if;
  if not exists (
    select 1 from public.proyectos p
    where p.id = new.proyecto_id and p.organizacion_id = new.organizacion_id
      and (new.cliente_id is null or p.cliente_id = new.cliente_id)
  ) then
    raise exception 'El proyecto no pertenece a esta organización o a este cliente' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_documentos_proyecto on public.documentos;
create trigger trg_documentos_proyecto before insert or update of proyecto_id, cliente_id on public.documentos
  for each row execute function public.proyecto_coherente();
drop trigger if exists trg_cuentas_proyecto on public.cuentas_cobro;
create trigger trg_cuentas_proyecto before insert or update of proyecto_id, cliente_id on public.cuentas_cobro
  for each row execute function public.proyecto_coherente();

-- crear_documento y crear_cuenta_cobro reciben el proyecto (el cliente sale de él si no se indica)
drop function if exists public.crear_documento(uuid, text, jsonb, uuid, uuid);
create or replace function public.crear_documento(org uuid, clave_formato text, datos jsonb default '{}'::jsonb,
                                                   orden uuid default null, cliente uuid default null, proyecto uuid default null)
returns public.documentos
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  f public.formatos;
  n int;
  anio int := extract(year from now())::int;
  doc public.documentos;
  cli uuid := cliente;
begin
  if auth.uid() is null or not public.tiene_rol(org, array['admin', 'supervisor', 'tecnico']) then
    raise exception 'Sin permiso para crear documentos en esta organización' using errcode = '42501';
  end if;
  if proyecto is not null then
    select coalesce(cli, p.cliente_id) into cli from public.proyectos p where p.id = proyecto and p.organizacion_id = org and p.estado <> 'cerrado';
    if not found then
      raise exception 'El proyecto no está abierto en esta organización' using errcode = '42501';
    end if;
  end if;
  if cli is not null and not exists (select 1 from public.clientes where id = cli and organizacion_id = org) then
    raise exception 'El cliente no pertenece a esta organización' using errcode = '42501';
  end if;
  if orden is not null and not exists (select 1 from public.ordenes_servicio where id = orden and organizacion_id = org) then
    raise exception 'La orden no pertenece a esta organización' using errcode = '42501';
  end if;
  select * into f from public.formatos where organizacion_id = org and clave = clave_formato and activo;
  if not found then
    raise exception 'Formato % no habilitado en esta organización', clave_formato using errcode = 'P0002';
  end if;
  n := public.siguiente_consecutivo(org, clave_formato, anio);
  insert into public.documentos (organizacion_id, formato_id, orden_id, cliente_id, proyecto_id, codigo, consecutivo, autor_id, datos)
  values (org, f.id, orden, cli, proyecto, format('%s-%s-%s', f.prefijo, lpad(n::text, 3, '0'), right(anio::text, 2)), n, auth.uid(), coalesce(datos, '{}'::jsonb))
  returning * into doc;
  return doc;
end;
$$;

drop function if exists public.crear_cuenta_cobro(uuid, uuid, text, uuid);
create or replace function public.crear_cuenta_cobro(org uuid, cliente uuid, concepto text, orden uuid default null, proyecto uuid default null)
returns public.cuentas_cobro
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  f public.formatos;
  n int;
  anio int := extract(year from now())::int;
  c public.cuentas_cobro;
  cli uuid := cliente;
begin
  if auth.uid() is null or not public.tiene_rol(org, array['admin', 'supervisor']) then
    raise exception 'Sin permiso para crear cuentas de cobro en esta organización' using errcode = '42501';
  end if;
  if proyecto is not null then
    select coalesce(cli, p.cliente_id) into cli from public.proyectos p where p.id = proyecto and p.organizacion_id = org;
    if not found then
      raise exception 'El proyecto no pertenece a esta organización' using errcode = '42501';
    end if;
  end if;
  if not exists (select 1 from public.clientes where id = cli and organizacion_id = org) then
    raise exception 'El cliente no pertenece a esta organización' using errcode = '42501';
  end if;
  if orden is not null and not exists (select 1 from public.ordenes_servicio where id = orden and organizacion_id = org) then
    raise exception 'La orden no pertenece a esta organización' using errcode = '42501';
  end if;
  select * into f from public.formatos where organizacion_id = org and clave = 'cuenta_cobro' and activo;
  if not found then
    raise exception 'Formato cuenta_cobro no habilitado en esta organización' using errcode = 'P0002';
  end if;
  n := public.siguiente_consecutivo(org, 'cuenta_cobro', anio);
  insert into public.cuentas_cobro (organizacion_id, orden_id, cliente_id, proyecto_id, codigo, consecutivo, concepto, creado_por)
  values (org, orden, cli, proyecto, format('%s-%s-%s', f.prefijo, lpad(n::text, 3, '0'), right(anio::text, 2)), n, concepto, auth.uid())
  returning * into c;
  return c;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Cotización como formato (visible para el cliente) en las organizaciones existentes
-- ---------------------------------------------------------------------------
insert into public.formatos (organizacion_id, clave, codigo, nombre, version, fecha_version, prefijo, visible_cliente)
select o.id, 'cotizacion', 'FO-COM-01', 'Cotización', '01', date '2026-10-01', 'COT', true
from public.organizaciones o
where exists (select 1 from public.formatos f where f.organizacion_id = o.id and f.clave = 'reporte')
on conflict (organizacion_id, clave) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Firma del cliente en su portal: reporte o cotización aprobados de su empresa
-- ---------------------------------------------------------------------------
create or replace function public.documentos_flujo()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  rol text := public.rol_en(new.organizacion_id);
  revisor boolean := rol in ('admin', 'supervisor');
  es_autor boolean := new.autor_id = auth.uid();
  accion text;
begin
  -- La organización, el formato, el código y el autor no cambian
  if new.organizacion_id <> old.organizacion_id or new.formato_id <> old.formato_id
     or new.codigo <> old.codigo or new.autor_id <> old.autor_id then
    raise exception 'No se puede cambiar la organización, el formato, el código ni el autor' using errcode = '42501';
  end if;

  -- Contenido editable solo en borrador/rechazado; al cerrar se permite
  -- completar el cierre (permiso) o la firma del cliente (reporte).
  if new.datos is distinct from old.datos
     and old.estado not in ('borrador', 'rechazado')
     and not (old.estado = 'aprobado' and new.estado = 'cerrado') then
    raise exception 'El documento está bloqueado: después de enviarse no se puede modificar' using errcode = '42501';
  end if;

  -- En borrador o rechazado, el contenido solo lo edita su autor (separación de funciones)
  if new.datos is distinct from old.datos and old.estado in ('borrador', 'rechazado') and not es_autor then
    raise exception 'Solo el autor puede editar el documento' using errcode = '42501';
  end if;

  if new.estado <> old.estado then
    if old.estado in ('borrador', 'rechazado') and new.estado = 'en_revision' and es_autor then
      new.enviado_at := now(); new.motivo_rechazo := null; accion := 'Envió a revisión';
    elsif old.estado = 'rechazado' and new.estado = 'borrador' and es_autor then
      accion := 'Volvió a borrador';
    elsif old.estado = 'en_revision' and new.estado in ('aprobado', 'rechazado') and revisor and es_autor then
      raise exception 'Nadie aprueba ni rechaza su propio documento' using errcode = '42501';
    elsif old.estado = 'en_revision' and new.estado = 'aprobado' and revisor then
      new.aprobado_at := now(); new.aprobado_por := auth.uid(); accion := 'Aprobó';
    elsif old.estado = 'en_revision' and new.estado = 'rechazado' and revisor then
      if coalesce(trim(new.motivo_rechazo), '') = '' then
        raise exception 'El rechazo requiere un motivo' using errcode = '23514';
      end if;
      accion := 'Rechazó';
    elsif old.estado = 'aprobado' and new.estado = 'cerrado' and revisor then
      new.cerrado_at := now(); accion := 'Cerró';
    elsif old.estado = 'aprobado' and new.estado = 'cerrado'
          and current_setting('fd.cierre_por_enlace', true) = 'si'
          and new.datos is not distinct from old.datos
          and exists (select 1 from public.firmas f
                      where f.documento_id = new.id and f.campo = 'firmaCliente' and f.origen = 'enlace') then
      -- Cierre autorizado por la firma remota del cliente (ver firmar_con_enlace)
      new.cerrado_at := now(); accion := 'Cerró con la firma del cliente';
    elsif old.estado = 'aprobado' and new.estado = 'cerrado'
          and current_setting('fd.cierre_por_cliente', true) = 'si'
          and new.datos is not distinct from old.datos
          and exists (select 1 from public.firmas f
                      where f.documento_id = new.id and f.campo = 'firmaCliente' and f.origen = 'portal'
                        and f.firmante_usuario_id = auth.uid()) then
      -- Cierre por la firma del cliente en su portal (ver firmar_como_cliente)
      new.cerrado_at := now(); accion := 'Cerró con la firma del cliente (portal)';
    else
      raise exception 'Transición no permitida: % → % para el rol %', old.estado, new.estado, coalesce(rol, 'sin rol')
        using errcode = '42501';
    end if;

    insert into public.documento_eventos (organizacion_id, documento_id, actor_id, actor_nombre, accion, detalle)
    values (new.organizacion_id, new.id, auth.uid(),
            coalesce((select nombre from public.perfiles where id = auth.uid()), nullif(current_setting('fd.actor_nombre', true), ''), ''),
            accion, case when new.estado = 'rechazado' then new.motivo_rechazo end);
    perform public.registrar_auditoria(new.organizacion_id, accion, 'documento', new.id, jsonb_build_object('codigo', new.codigo));
  end if;

  return new;
end;
$$;

create or replace function public.firmar_como_cliente(doc uuid, nombre text, imagen text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  d public.documentos;
  v_clave text;
begin
  if coalesce(trim(nombre), '') = '' or coalesce(imagen, '') not like 'data:image/png;base64,%' then
    raise exception 'Nombre y firma son obligatorios' using errcode = '23514';
  end if;
  if length(imagen) > 300000 then
    raise exception 'La imagen de la firma es demasiado grande' using errcode = '23514';
  end if;
  select * into d from public.documentos where id = doc and deleted_at is null for update;
  if not found or d.cliente_id is null or d.cliente_id is distinct from public.cliente_de(d.organizacion_id) then
    raise exception 'Documento no disponible' using errcode = '42501';
  end if;
  select f.clave into v_clave from public.formatos f where f.id = d.formato_id and f.visible_cliente;
  if v_clave is null or v_clave not in ('reporte', 'cotizacion') then
    raise exception 'Este formato no lo firma el cliente' using errcode = '42501';
  end if;
  if d.estado <> 'aprobado' or exists (select 1 from public.firmas f where f.documento_id = d.id and f.campo = 'firmaCliente') then
    raise exception 'El documento no está pendiente de la firma del cliente' using errcode = '23514';
  end if;

  insert into public.firmas (organizacion_id, documento_id, campo, firmante_nombre, firmante_usuario_id, imagen, origen)
  values (d.organizacion_id, d.id, 'firmaCliente', trim(nombre), auth.uid(), imagen, 'portal');
  update public.enlaces_firma set usado_at = now() where documento_id = d.id and usado_at is null;

  perform set_config('fd.cierre_por_cliente', 'si', true);
  update public.documentos set estado = 'cerrado' where id = d.id;
  perform set_config('fd.cierre_por_cliente', '', true);
  return 'cerrado';
end;
$$;

-- Permisos de ejecución (igual que 0006 y 0008)
revoke execute on function public.documentos_flujo(), public.proyectos_coherencia(), public.proyecto_coherente() from public, anon, authenticated;
revoke execute on function public.crear_documento(uuid, text, jsonb, uuid, uuid, uuid), public.crear_cuenta_cobro(uuid, uuid, text, uuid, uuid),
  public.crear_proyecto(uuid, uuid, text, text, uuid, date, numeric, text), public.firmar_como_cliente(uuid, text, text) from public, anon;
grant execute on function public.crear_documento(uuid, text, jsonb, uuid, uuid, uuid), public.crear_cuenta_cobro(uuid, uuid, text, uuid, uuid),
  public.crear_proyecto(uuid, uuid, text, text, uuid, date, numeric, text), public.firmar_como_cliente(uuid, text, text) to authenticated;

-- ======================== supabase/migrations/0010_equipos.sql
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

-- ======================== supabase/migrations/0011_comercial_solo_admin.sql
-- ============================================================================
-- FormatoDigital — 0011 Lo comercial es solo de la administración
-- (pedido de SOTEC: «que el admin sea el único que tenga acceso a estos
-- módulos de cotización y demás; el técnico no»)
--
--  1. formato_comercial(formato): formatos comerciales (hoy: 'cotizacion').
--     Sus documentos los ven, crean, editan y aprueban solo los miembros con
--     rol admin. El técnico y el Coordinador SST (supervisor) no los ven, ni
--     siquiera los propios. El cliente sigue viendo los de su empresa ya
--     aprobados o aceptados (regla de 0007) y los acepta firmando (0009).
--  2. Flujo de la cotización: sin revisor aparte. La administración es quien
--     cotiza y quien aprueba, así que pasa de borrador (o rechazado) a
--     aprobado = enviada al cliente en un solo paso («Aprobó y envió al
--     cliente»). No pasa por en_revision. La separación de funciones de 0008
--     se mantiene para los demás formatos (nadie aprueba lo propio).
--  3. Cuentas de cobro (y sus ítems): solo admin; el cliente ve las suyas
--     emitidas, enviadas o pagadas. crear_cuenta_cobro exige admin.
--  4. proyectos_borrar cuenta los documentos y cuentas sin RLS (SST ya no
--     ve lo comercial y no debe poder borrar un proyecto que lo tiene).
--  5. Defensa en profundidad: crear_documento ('cotizacion') y
--     crear_enlace_firma exigen admin para lo comercial; las notificaciones
--     de un documento solo se ven si el documento es visible.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Formatos comerciales
-- ---------------------------------------------------------------------------
create or replace function public.formato_comercial(formato uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  -- Agregar aquí la clave de un formato comercial nuevo (y su `requiere` en la aplicación)
  select coalesce((select f.clave in ('cotizacion') from public.formatos f where f.id = formato), false)
$$;

drop policy if exists documentos_ver on public.documentos;
create policy documentos_ver on public.documentos for select to authenticated
  using (
    deleted_at is null and (
      public.tiene_rol(organizacion_id, array['admin'])
      or (not public.formato_comercial(formato_id) and (
            public.tiene_rol(organizacion_id, array['supervisor'])
            or (autor_id = auth.uid() and public.es_miembro(organizacion_id))))
      or (cliente_id = public.cliente_de(organizacion_id) and estado in ('aprobado', 'cerrado')
          and exists (select 1 from public.formatos f where f.id = formato_id and f.visible_cliente))
    )
  );

drop policy if exists documentos_crear on public.documentos;
create policy documentos_crear on public.documentos for insert to authenticated
  with check (
    autor_id = auth.uid()
    and public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico'])
    and (not public.formato_comercial(formato_id) or public.tiene_rol(organizacion_id, array['admin']))
  );

drop policy if exists documentos_editar on public.documentos;
create policy documentos_editar on public.documentos for update to authenticated
  using (
    public.tiene_rol(organizacion_id, array['admin'])
    or (not public.formato_comercial(formato_id) and (
          public.tiene_rol(organizacion_id, array['supervisor'])
          or (autor_id = auth.uid() and public.es_miembro(organizacion_id))))
  )
  with check (public.es_miembro(organizacion_id));

-- ---------------------------------------------------------------------------
-- 2. Flujo: la cotización la aprueba y la envía la administración en un paso
-- ---------------------------------------------------------------------------
create or replace function public.documentos_flujo()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  rol text := public.rol_en(new.organizacion_id);
  revisor boolean := rol in ('admin', 'supervisor');
  es_autor boolean := new.autor_id = auth.uid();
  comercial boolean := public.formato_comercial(new.formato_id);
  accion text;
begin
  -- La organización, el formato, el código y el autor no cambian
  if new.organizacion_id <> old.organizacion_id or new.formato_id <> old.formato_id
     or new.codigo <> old.codigo or new.autor_id <> old.autor_id then
    raise exception 'No se puede cambiar la organización, el formato, el código ni el autor' using errcode = '42501';
  end if;

  -- Lo comercial no lo toca el personal que no es de la administración
  if comercial and rol in ('supervisor', 'tecnico') then
    raise exception 'Solo la administración gestiona las cotizaciones' using errcode = '42501';
  end if;

  -- Contenido editable solo en borrador/rechazado; al cerrar se permite
  -- completar el cierre (permiso) o la firma del cliente (reporte).
  if new.datos is distinct from old.datos
     and old.estado not in ('borrador', 'rechazado')
     and not (old.estado = 'aprobado' and new.estado = 'cerrado') then
    raise exception 'El documento está bloqueado: después de enviarse no se puede modificar' using errcode = '42501';
  end if;

  -- En borrador o rechazado, el contenido solo lo edita su autor (separación de funciones)
  if new.datos is distinct from old.datos and old.estado in ('borrador', 'rechazado') and not es_autor then
    raise exception 'Solo el autor puede editar el documento' using errcode = '42501';
  end if;

  if new.estado <> old.estado then
    if comercial and old.estado in ('borrador', 'rechazado') and new.estado = 'aprobado' and es_autor and rol = 'admin' then
      -- Cotización: la administración la aprueba y queda enviada al cliente (sin revisor aparte)
      new.enviado_at := now(); new.aprobado_at := now(); new.aprobado_por := auth.uid(); new.motivo_rechazo := null;
      accion := 'Aprobó y envió al cliente';
    elsif comercial and new.estado = 'en_revision' then
      raise exception 'La cotización no pasa por revisión: la administración la aprueba y la envía' using errcode = '42501';
    elsif old.estado in ('borrador', 'rechazado') and new.estado = 'en_revision' and es_autor then
      new.enviado_at := now(); new.motivo_rechazo := null; accion := 'Envió a revisión';
    elsif old.estado = 'rechazado' and new.estado = 'borrador' and es_autor then
      accion := 'Volvió a borrador';
    elsif old.estado = 'en_revision' and new.estado in ('aprobado', 'rechazado') and revisor and es_autor then
      raise exception 'Nadie aprueba ni rechaza su propio documento' using errcode = '42501';
    elsif old.estado = 'en_revision' and new.estado = 'aprobado' and revisor then
      new.aprobado_at := now(); new.aprobado_por := auth.uid(); accion := 'Aprobó';
    elsif old.estado = 'en_revision' and new.estado = 'rechazado' and revisor then
      if coalesce(trim(new.motivo_rechazo), '') = '' then
        raise exception 'El rechazo requiere un motivo' using errcode = '23514';
      end if;
      accion := 'Rechazó';
    elsif old.estado = 'aprobado' and new.estado = 'cerrado' and revisor then
      new.cerrado_at := now(); accion := 'Cerró';
    elsif old.estado = 'aprobado' and new.estado = 'cerrado'
          and current_setting('fd.cierre_por_enlace', true) = 'si'
          and new.datos is not distinct from old.datos
          and exists (select 1 from public.firmas f
                      where f.documento_id = new.id and f.campo = 'firmaCliente' and f.origen = 'enlace') then
      -- Cierre autorizado por la firma remota del cliente (ver firmar_con_enlace)
      new.cerrado_at := now(); accion := 'Cerró con la firma del cliente';
    elsif old.estado = 'aprobado' and new.estado = 'cerrado'
          and current_setting('fd.cierre_por_cliente', true) = 'si'
          and new.datos is not distinct from old.datos
          and exists (select 1 from public.firmas f
                      where f.documento_id = new.id and f.campo = 'firmaCliente' and f.origen = 'portal'
                        and f.firmante_usuario_id = auth.uid()) then
      -- Cierre por la firma del cliente en su portal (ver firmar_como_cliente)
      new.cerrado_at := now(); accion := 'Cerró con la firma del cliente (portal)';
    else
      raise exception 'Transición no permitida: % → % para el rol %', old.estado, new.estado, coalesce(rol, 'sin rol')
        using errcode = '42501';
    end if;

    insert into public.documento_eventos (organizacion_id, documento_id, actor_id, actor_nombre, accion, detalle)
    values (new.organizacion_id, new.id, auth.uid(),
            coalesce((select nombre from public.perfiles where id = auth.uid()), nullif(current_setting('fd.actor_nombre', true), ''), ''),
            accion, case when new.estado = 'rechazado' then new.motivo_rechazo end);
    perform public.registrar_auditoria(new.organizacion_id, accion, 'documento', new.id, jsonb_build_object('codigo', new.codigo));
  end if;

  return new;
end;
$$;

-- crear_documento: igual que 0009, y un formato comercial exige admin
create or replace function public.crear_documento(org uuid, clave_formato text, datos jsonb default '{}'::jsonb,
                                                   orden uuid default null, cliente uuid default null, proyecto uuid default null)
returns public.documentos
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  f public.formatos;
  n int;
  anio int := extract(year from now())::int;
  doc public.documentos;
  cli uuid := cliente;
begin
  if auth.uid() is null or not public.tiene_rol(org, array['admin', 'supervisor', 'tecnico']) then
    raise exception 'Sin permiso para crear documentos en esta organización' using errcode = '42501';
  end if;
  select * into f from public.formatos where organizacion_id = org and clave = clave_formato and activo;
  if not found then
    raise exception 'Formato % no habilitado en esta organización', clave_formato using errcode = 'P0002';
  end if;
  if public.formato_comercial(f.id) and not public.tiene_rol(org, array['admin']) then
    raise exception 'Solo la administración crea cotizaciones' using errcode = '42501';
  end if;
  if proyecto is not null then
    select coalesce(cli, p.cliente_id) into cli from public.proyectos p where p.id = proyecto and p.organizacion_id = org and p.estado <> 'cerrado';
    if not found then
      raise exception 'El proyecto no está abierto en esta organización' using errcode = '42501';
    end if;
  end if;
  if cli is not null and not exists (select 1 from public.clientes where id = cli and organizacion_id = org) then
    raise exception 'El cliente no pertenece a esta organización' using errcode = '42501';
  end if;
  if orden is not null and not exists (select 1 from public.ordenes_servicio where id = orden and organizacion_id = org) then
    raise exception 'La orden no pertenece a esta organización' using errcode = '42501';
  end if;
  n := public.siguiente_consecutivo(org, clave_formato, anio);
  insert into public.documentos (organizacion_id, formato_id, orden_id, cliente_id, proyecto_id, codigo, consecutivo, autor_id, datos)
  values (org, f.id, orden, cli, proyecto, format('%s-%s-%s', f.prefijo, lpad(n::text, 3, '0'), right(anio::text, 2)), n, auth.uid(), coalesce(datos, '{}'::jsonb))
  returning * into doc;
  return doc;
end;
$$;

-- crear_enlace_firma (0008): sobre un documento comercial, solo la administración
create or replace function public.crear_enlace_firma(doc uuid, correo text default '', campo_firma text default 'firmaCliente')
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  d public.documentos;
  token text := encode(gen_random_bytes(24), 'hex');
begin
  select * into d from public.documentos where id = doc and deleted_at is null;
  if not found or not public.tiene_rol(d.organizacion_id, array['admin', 'supervisor', 'tecnico'])
     or (public.formato_comercial(d.formato_id) and not public.tiene_rol(d.organizacion_id, array['admin'])) then
    raise exception 'Documento no disponible' using errcode = '42501';
  end if;
  if d.estado <> 'aprobado' then
    raise exception 'Solo se puede pedir la firma del cliente sobre un documento aprobado' using errcode = '23514';
  end if;
  if exists (select 1 from public.firmas f where f.documento_id = d.id and f.campo = campo_firma) then
    raise exception 'El documento ya tiene esa firma' using errcode = '23514';
  end if;
  insert into public.enlaces_firma (organizacion_id, documento_id, campo, token_hash, correo_destino)
  values (d.organizacion_id, d.id, campo_firma, encode(digest(token, 'sha256'), 'hex'), coalesce(correo, ''));
  perform public.registrar_auditoria(d.organizacion_id, 'Solicitó firma remota', 'documento', d.id, jsonb_build_object('correo', correo));
  return token;
end;
$$;

-- Enlaces de firma: los de lo comercial, solo la administración
drop policy if exists enlaces_ver on public.enlaces_firma;
create policy enlaces_ver on public.enlaces_firma for select to authenticated
  using (
    public.tiene_rol(organizacion_id, array['admin'])
    or (public.tiene_rol(organizacion_id, array['supervisor'])
        and not exists (select 1 from public.documentos d where d.id = documento_id and public.formato_comercial(d.formato_id)))
  );

-- ---------------------------------------------------------------------------
-- 3. Cuentas de cobro: solo admin; el cliente, las suyas emitidas
-- ---------------------------------------------------------------------------
drop policy if exists cuentas_ver on public.cuentas_cobro;
create policy cuentas_ver on public.cuentas_cobro for select to authenticated
  using (public.tiene_rol(organizacion_id, array['admin'])
         or (cliente_id = public.cliente_de(organizacion_id) and estado in ('emitida', 'enviada', 'pagada')));
drop policy if exists cuentas_crear on public.cuentas_cobro;
create policy cuentas_crear on public.cuentas_cobro for insert to authenticated
  with check (creado_por = auth.uid() and public.tiene_rol(organizacion_id, array['admin']));
drop policy if exists cuentas_editar on public.cuentas_cobro;
create policy cuentas_editar on public.cuentas_cobro for update to authenticated
  using (public.tiene_rol(organizacion_id, array['admin']))
  with check (public.tiene_rol(organizacion_id, array['admin']));

drop policy if exists items_escribir on public.cuenta_cobro_items;
create policy items_escribir on public.cuenta_cobro_items for all to authenticated
  using (public.tiene_rol(organizacion_id, array['admin']))
  with check (public.tiene_rol(organizacion_id, array['admin']));

create or replace function public.crear_cuenta_cobro(org uuid, cliente uuid, concepto text, orden uuid default null, proyecto uuid default null)
returns public.cuentas_cobro
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  f public.formatos;
  n int;
  anio int := extract(year from now())::int;
  c public.cuentas_cobro;
  cli uuid := cliente;
begin
  if auth.uid() is null or not public.tiene_rol(org, array['admin']) then
    raise exception 'Solo la administración crea cuentas de cobro' using errcode = '42501';
  end if;
  if proyecto is not null then
    select coalesce(cli, p.cliente_id) into cli from public.proyectos p where p.id = proyecto and p.organizacion_id = org;
    if not found then
      raise exception 'El proyecto no pertenece a esta organización' using errcode = '42501';
    end if;
  end if;
  if not exists (select 1 from public.clientes where id = cli and organizacion_id = org) then
    raise exception 'El cliente no pertenece a esta organización' using errcode = '42501';
  end if;
  if orden is not null and not exists (select 1 from public.ordenes_servicio where id = orden and organizacion_id = org) then
    raise exception 'La orden no pertenece a esta organización' using errcode = '42501';
  end if;
  select * into f from public.formatos where organizacion_id = org and clave = 'cuenta_cobro' and activo;
  if not found then
    raise exception 'Formato cuenta_cobro no habilitado en esta organización' using errcode = 'P0002';
  end if;
  n := public.siguiente_consecutivo(org, 'cuenta_cobro', anio);
  insert into public.cuentas_cobro (organizacion_id, orden_id, cliente_id, proyecto_id, codigo, consecutivo, concepto, creado_por)
  values (org, orden, cli, proyecto, format('%s-%s-%s', f.prefijo, lpad(n::text, 3, '0'), right(anio::text, 2)), n, concepto, auth.uid())
  returning * into c;
  return c;
end;
$$;

-- Un proyecto con historial no se elimina aunque quien borra no vea parte de él
-- (SST no ve las cotizaciones ni las cuentas): se cuenta sin RLS
create or replace function public.proyecto_vacio(proyecto uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select not exists (select 1 from public.documentos d where d.proyecto_id = proyecto)
     and not exists (select 1 from public.cuentas_cobro c where c.proyecto_id = proyecto)
$$;

drop policy if exists proyectos_borrar on public.proyectos;
create policy proyectos_borrar on public.proyectos for delete to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor']) and public.proyecto_vacio(id));

-- ---------------------------------------------------------------------------
-- 4. Notificaciones de un documento: solo si el documento es visible (RLS de documentos)
-- ---------------------------------------------------------------------------
drop policy if exists notif_ver on public.notificaciones;
create policy notif_ver on public.notificaciones for select to authenticated
  using (public.es_miembro(organizacion_id)
         and (usuario_id = auth.uid() or (usuario_id is null and rol = public.rol_en(organizacion_id)))
         and (documento_id is null or exists (select 1 from public.documentos d where d.id = documento_id)));

-- ---------------------------------------------------------------------------
-- Permisos de ejecución (igual que 0006, 0008 y 0009)
-- ---------------------------------------------------------------------------
revoke execute on function public.documentos_flujo() from public, anon, authenticated;
revoke execute on function public.formato_comercial(uuid), public.proyecto_vacio(uuid) from public, anon;
grant execute on function public.formato_comercial(uuid), public.proyecto_vacio(uuid) to authenticated;
revoke execute on function public.crear_documento(uuid, text, jsonb, uuid, uuid, uuid), public.crear_cuenta_cobro(uuid, uuid, text, uuid, uuid),
  public.crear_enlace_firma(uuid, text, text) from public, anon;
grant execute on function public.crear_documento(uuid, text, jsonb, uuid, uuid, uuid), public.crear_cuenta_cobro(uuid, uuid, text, uuid, uuid),
  public.crear_enlace_firma(uuid, text, text) to authenticated;

-- ======================== supabase/seed.sql
-- ============================================================================
-- Datos iniciales del piloto: organización SOTEC, sus formatos y clientes.
-- Los usuarios se crean desde Supabase Auth (invitación por correo) y luego se
-- agregan a `miembros` con su rol.
-- ============================================================================
insert into public.organizaciones (slug, nombre, nit, config)
values ('sotec', 'SOTEC', '', '{"vigenciaPermisoHoras": 12, "exigirFirmaCliente": true}')
on conflict (slug) do nothing;

with o as (select id from public.organizaciones where slug = 'sotec')
insert into public.formatos (organizacion_id, clave, codigo, nombre, version, fecha_version, prefijo)
select o.id, f.clave, f.codigo, f.nombre, f.version, f.fecha::date, f.prefijo
from o, (values
  ('reporte',      'FO-GSST-22', 'Formato de reporte técnico', '01', '2020-03-01', 'RT'),
  ('permiso',      'F-GSST-13',  'Permiso de trabajo',         '01', '2019-03-01', 'PT'),
  ('cuenta_cobro', 'CC-01',      'Cuenta de cobro',            '01', null,         'CC'),
  ('orden',        'OS-01',      'Orden de servicio',          '01', null,         'OS'),
  ('gasto',        'FO-GSST-25', 'Formato de legalización y registro de gastos operativos', '01', '2020-03-01', 'LG'),
  ('cotizacion',   'FO-COM-01',  'Cotización',                 '01', '2026-10-01', 'COT')
) as f(clave, codigo, nombre, version, fecha, prefijo)
on conflict (organizacion_id, clave) do nothing;

-- Internos: el cliente no los ve. La cotización sí (visible_cliente = true por defecto)
update public.formatos set visible_cliente = false where clave = 'gasto';
update public.formatos set visible_cliente = true where clave = 'cotizacion';

with o as (select id from public.organizaciones where slug = 'sotec')
insert into public.clientes (organizacion_id, nombre, direccion, contacto, cargo, correo, telefono)
select o.id, c.* from o, (values
  ('Ladrillera Arcillas del Caribe', 'Zona Industrial, Cartagena', 'Ing. Daniel', 'Ing. sistemas', 'sistemas@arcillasdelcaribe.example', '3000000000')
) as c(nombre, direccion, contacto, cargo, correo, telefono)
on conflict (organizacion_id, nombre) do nothing;
