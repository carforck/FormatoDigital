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
