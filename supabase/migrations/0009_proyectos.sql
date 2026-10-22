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
