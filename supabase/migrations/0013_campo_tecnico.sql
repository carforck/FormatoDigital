-- ============================================================================
-- FormatoDigital — 0013 Trabajo de campo del técnico (pedidos de Magno, SOTEC)
--
--  1. Firma del cliente en sitio (su «recibido a satisfacción»): el AUTOR puede
--     poner la firma del cliente (datos.firmaCliente, con nombreRecibe y
--     cargoRecibe) en borrador (ya se podía), en revisión o ya aprobado, solo
--     si aún no la tiene y sin tocar nada más del contenido. Queda en `firmas`
--     con origen 'en_sitio' (así no se puede pedir otra por enlace).
--       · En revisión: el estado no cambia; evento «Firma del cliente en sitio».
--       · Aprobado → cerrado por el autor con esa firma: «Cerrado con la firma
--         del cliente en sitio».
--     Al aprobar un reporte que ya trae la firma del cliente, queda CERRADO de
--     una vez (eventos «Aprobó» y «Cerrado con la firma del cliente en sitio»).
--     Formatos con firma del cliente en sitio: `formato_firma_en_sitio` (hoy
--     'reporte'; la cotización no pasa por revisión).
--  2. Retirar para corregir: el autor pasa su documento de en_revision a
--     borrador mientras nadie lo ha aprobado («Retiró el envío para corregir»).
--     Ya aprobado no se retira: solo el revisor lo devuelve con motivo.
--     Quien llegue primero gana (la fila ya no está en el estado esperado).
--  3. Clientes desde los formatos: el técnico puede CREAR clientes de su
--     organización (no editarlos, desactivarlos ni borrarlos; eso sigue siendo
--     de admin y supervisor). No se duplican: el nombre se compara sin
--     mayúsculas, tildes ni espacios de más (`clave_nombre`). `completar_cliente`
--     llena solo los campos VACÍOS de un cliente existente con lo del formato.
--
-- La aplicación (fase 1, `espacios`) aplica las mismas reglas en
-- src/nucleo/permisos.ts, src/nucleo/clientes.ts y DemoProvider.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1 y 2. Flujo de documentos
-- ---------------------------------------------------------------------------

-- Formatos cuyo cliente firma en sitio el recibido (agregar aquí uno nuevo)
create or replace function public.formato_firma_en_sitio(formato uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce((select f.clave in ('reporte') from public.formatos f where f.id = formato), false)
$$;

-- El único cambio del contenido es poner la firma del cliente que faltaba (y quién la da)
create or replace function public.solo_firma_cliente(nuevo jsonb, viejo jsonb)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select (coalesce(nuevo, '{}'::jsonb) - array['firmaCliente', 'nombreRecibe', 'cargoRecibe'])
           = (coalesce(viejo, '{}'::jsonb) - array['firmaCliente', 'nombreRecibe', 'cargoRecibe'])
     and coalesce(viejo ->> 'firmaCliente', '') = ''
     and coalesce(nuevo ->> 'firmaCliente', '') like 'data:image/%'
$$;

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
  -- El autor pone en sitio la firma del cliente que faltaba, sin cambiar nada más
  firma_en_sitio boolean := es_autor and public.formato_firma_en_sitio(new.formato_id)
                            and public.solo_firma_cliente(new.datos, old.datos);
  cierre_en_sitio boolean := false;
  actor text := coalesce((select nombre from public.perfiles where id = auth.uid()), nullif(current_setting('fd.actor_nombre', true), ''), '');
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

  -- Contenido editable solo en borrador/rechazado; al cerrar se permite completar el
  -- cierre (permiso) o la firma del cliente (reporte); en revisión, solo la firma del
  -- cliente en sitio por el autor (0013).
  if new.datos is distinct from old.datos
     and old.estado not in ('borrador', 'rechazado')
     and not (old.estado = 'aprobado' and new.estado = 'cerrado')
     and not (old.estado = 'en_revision' and new.estado = 'en_revision' and firma_en_sitio) then
    raise exception 'El documento está bloqueado: después de enviarse no se puede modificar' using errcode = '42501';
  end if;

  -- En borrador o rechazado, el contenido solo lo edita su autor (separación de funciones)
  if new.datos is distinct from old.datos and old.estado in ('borrador', 'rechazado') and not es_autor then
    raise exception 'Solo el autor puede editar el documento' using errcode = '42501';
  end if;

  -- Firma del cliente en sitio sobre un documento en revisión: el estado no cambia (se cierra al aprobarlo)
  if new.estado = old.estado and old.estado = 'en_revision' and firma_en_sitio then
    insert into public.firmas (organizacion_id, documento_id, campo, firmante_nombre, firmante_usuario_id, imagen, origen)
    values (new.organizacion_id, new.id, 'firmaCliente', coalesce(nullif(trim(new.datos ->> 'nombreRecibe'), ''), 'Cliente'), null, new.datos ->> 'firmaCliente', 'en_sitio')
    on conflict (documento_id, campo) do nothing;
    insert into public.documento_eventos (organizacion_id, documento_id, actor_id, actor_nombre, accion, detalle)
    values (new.organizacion_id, new.id, auth.uid(), actor, 'Firma del cliente en sitio', nullif(trim(new.datos ->> 'nombreRecibe'), ''));
    perform public.registrar_auditoria(new.organizacion_id, 'Firma del cliente en sitio', 'documento', new.id, jsonb_build_object('codigo', new.codigo));
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
    elsif old.estado = 'en_revision' and new.estado = 'borrador' and es_autor then
      -- Retirar para corregir (0013): solo el autor y antes de la aprobación
      new.enviado_at := null; accion := 'Retiró el envío para corregir';
    elsif old.estado = 'en_revision' and new.estado in ('aprobado', 'rechazado') and revisor and es_autor then
      raise exception 'Nadie aprueba ni rechaza su propio documento' using errcode = '42501';
    elsif old.estado = 'en_revision' and new.estado = 'aprobado' and revisor then
      new.aprobado_at := now(); new.aprobado_por := auth.uid(); accion := 'Aprobó';
      -- Ya trae la firma del cliente tomada en sitio: queda cerrado (0013)
      if public.formato_firma_en_sitio(new.formato_id) and coalesce(new.datos ->> 'firmaCliente', '') like 'data:image/%' then
        new.estado := 'cerrado'; new.cerrado_at := now(); cierre_en_sitio := true;
      end if;
    elsif old.estado = 'en_revision' and new.estado = 'rechazado' and revisor then
      if coalesce(trim(new.motivo_rechazo), '') = '' then
        raise exception 'El rechazo requiere un motivo' using errcode = '23514';
      end if;
      accion := 'Rechazó';
    elsif old.estado = 'aprobado' and new.estado = 'cerrado' and firma_en_sitio then
      -- El autor toma en sitio la firma del cliente que faltaba sobre un aprobado: lo cierra (0013)
      insert into public.firmas (organizacion_id, documento_id, campo, firmante_nombre, firmante_usuario_id, imagen, origen)
      values (new.organizacion_id, new.id, 'firmaCliente', coalesce(nullif(trim(new.datos ->> 'nombreRecibe'), ''), 'Cliente'), null, new.datos ->> 'firmaCliente', 'en_sitio')
      on conflict (documento_id, campo) do nothing;
      update public.enlaces_firma set usado_at = now() where documento_id = new.id and usado_at is null;
      new.cerrado_at := now(); accion := 'Cerrado con la firma del cliente en sitio';
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
    values (new.organizacion_id, new.id, auth.uid(), actor, accion, case when new.estado = 'rechazado' then new.motivo_rechazo end);
    perform public.registrar_auditoria(new.organizacion_id, accion, 'documento', new.id, jsonb_build_object('codigo', new.codigo));
    if cierre_en_sitio then
      insert into public.documento_eventos (organizacion_id, documento_id, actor_id, actor_nombre, accion, detalle)
      values (new.organizacion_id, new.id, auth.uid(), actor, 'Cerrado con la firma del cliente en sitio', null);
      perform public.registrar_auditoria(new.organizacion_id, 'Cerrado con la firma del cliente en sitio', 'documento', new.id, jsonb_build_object('codigo', new.codigo));
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Clientes desde los formatos (el técnico crea; no edita ni borra)
-- ---------------------------------------------------------------------------

-- Nombre comparable: minúsculas, sin tildes y con un solo espacio (igual que claveNombre en la app)
create or replace function public.clave_nombre(t text)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $$
  select lower(regexp_replace(btrim(translate(coalesce(t, ''),
    'ÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑáàäâéèëêíìïîóòöôúùüûñ',
    'AAAAEEEEIIIIOOOOUUUUNaaaaeeeeiiiioooouuuun')), '\s+', ' ', 'g'))
$$;

-- Sin duplicados por organización con otras mayúsculas, tildes o espacios (incluye los creados por el técnico).
-- Es un trigger y no un índice único para no fallar con duplicados que ya existan en una base en uso.
create or replace function public.clientes_sin_duplicar()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  new.nombre := regexp_replace(btrim(new.nombre), '\s+', ' ', 'g');
  if new.nombre = '' then
    raise exception 'El cliente necesita un nombre' using errcode = '23514';
  end if;
  if (tg_op = 'INSERT' or public.clave_nombre(new.nombre) <> public.clave_nombre(old.nombre))
     and exists (select 1 from public.clientes c
                 where c.organizacion_id = new.organizacion_id and c.id <> new.id
                   -- El mismo nombre exacto lo resuelve la restricción única (y `on conflict` de la semilla)
                   and c.nombre <> new.nombre
                   and public.clave_nombre(c.nombre) = public.clave_nombre(new.nombre)) then
    raise exception 'El cliente «%» ya está en el directorio', new.nombre using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clientes_sin_duplicar on public.clientes;
create trigger trg_clientes_sin_duplicar before insert or update of nombre on public.clientes
  for each row execute function public.clientes_sin_duplicar();

-- El técnico agrega clientes activos de su organización (admin y supervisor ya escriben con clientes_escribir)
drop policy if exists clientes_registrar_tecnico on public.clientes;
create policy clientes_registrar_tecnico on public.clientes for insert to authenticated
  with check (public.tiene_rol(organizacion_id, array['tecnico']) and activo);

-- Llena solo los campos vacíos de un cliente con lo escrito en un formato (nunca sobrescribe)
create or replace function public.completar_cliente(cliente uuid, datos jsonb)
returns public.clientes
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  c public.clientes;
  d jsonb := coalesce(datos, '{}'::jsonb);
  correo_nuevo text := btrim(coalesce(d ->> 'correo', ''));
  telefono_nuevo text := btrim(coalesce(d ->> 'telefono', ''));
begin
  select * into c from public.clientes where id = cliente;
  if not found or not public.tiene_rol(c.organizacion_id, array['admin', 'supervisor', 'tecnico']) then
    raise exception 'Cliente no disponible' using errcode = '42501';
  end if;
  if correo_nuevo !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then correo_nuevo := ''; end if;
  if length(regexp_replace(telefono_nuevo, '\D', '', 'g')) < 7 then telefono_nuevo := ''; end if;
  update public.clientes set
    nit       = case when btrim(nit) = ''       then btrim(coalesce(d ->> 'nit', ''))       else nit end,
    direccion = case when btrim(direccion) = '' then btrim(coalesce(d ->> 'direccion', '')) else direccion end,
    contacto  = case when btrim(contacto) = ''  then btrim(coalesce(d ->> 'contacto', ''))  else contacto end,
    cargo     = case when btrim(cargo) = ''     then btrim(coalesce(d ->> 'cargo', ''))     else cargo end,
    correo    = case when btrim(correo) = ''   then correo_nuevo   else correo end,
    telefono  = case when btrim(telefono) = '' then telefono_nuevo else telefono end
  where id = cliente
  returning * into c;
  perform public.registrar_auditoria(c.organizacion_id, 'Completó datos del cliente', 'cliente', c.id, jsonb_build_object('nombre', c.nombre));
  return c;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de ejecución (igual que 0006, 0008, 0009 y 0011)
-- ---------------------------------------------------------------------------
revoke execute on function public.documentos_flujo(), public.clientes_sin_duplicar() from public, anon, authenticated;
revoke execute on function public.formato_firma_en_sitio(uuid), public.solo_firma_cliente(jsonb, jsonb), public.clave_nombre(text),
  public.completar_cliente(uuid, jsonb) from public, anon;
grant execute on function public.formato_firma_en_sitio(uuid), public.solo_firma_cliente(jsonb, jsonb), public.clave_nombre(text),
  public.completar_cliente(uuid, jsonb) to authenticated;
