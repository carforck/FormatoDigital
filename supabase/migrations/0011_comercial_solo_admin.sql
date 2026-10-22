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
