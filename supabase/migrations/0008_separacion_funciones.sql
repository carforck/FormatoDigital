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
