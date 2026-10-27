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
--     'reporte'; la cotización no pasa por revisión). La imagen es un PNG en
--     data URL de hasta 300 000 caracteres (igual que el portal y el enlace).
--  2. Retirar para corregir: el autor pasa su documento de en_revision a
--     borrador mientras nadie lo ha aprobado («Retiró el envío para corregir»).
--     Ya aprobado no se retira: solo el revisor lo devuelve con motivo.
--     Quien llegue primero gana (la fila ya no está en el estado esperado).
--     Al retirar o rechazar, la firma del cliente tomada en sitio se ANULA (el
--     contenido va a cambiar): se vacían firmaCliente, nombreRecibe y
--     cargoRecibe, se borra su fila de `firmas` (origen 'en_sitio') y queda el
--     evento «Se anuló la firma del cliente (el contenido cambió)». Así el
--     portal, el enlace o una nueva firma en sitio vuelven a funcionar.
--  3. Clientes desde los formatos: el técnico puede CREAR clientes de su
--     organización (no editarlos, desactivarlos ni borrarlos; eso sigue siendo
--     de admin y supervisor). No se duplican: el nombre se compara sin
--     mayúsculas, tildes (la ñ cuenta), puntuación, espacios de más ni la razón
--     social del final (`clave_nombre`, idéntica a claveNombre de la app).
--     `completar_cliente` llena solo los campos VACÍOS de un cliente activo
--     con lo del formato.
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
     and coalesce(nuevo ->> 'firmaCliente', '') like 'data:image/png;base64,%'
     and length(nuevo ->> 'firmaCliente') <= 300000
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
  -- Retirar o rechazar un documento con la firma del cliente en sitio la anula
  anula_firma boolean := false;
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
    -- Una firma en sitio anterior (anulada y vuelta a tomar) se reemplaza; la del portal o el enlace no
    on conflict (documento_id, campo) do update
      set firmante_nombre = excluded.firmante_nombre, imagen = excluded.imagen, firmado_at = now()
      where public.firmas.origen = 'en_sitio';
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
      anula_firma := coalesce(old.datos ->> 'firmaCliente', '') <> '';
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
      anula_firma := coalesce(old.datos ->> 'firmaCliente', '') <> '';
    elsif old.estado = 'aprobado' and new.estado = 'cerrado' and firma_en_sitio then
      -- El autor toma en sitio la firma del cliente que faltaba sobre un aprobado: lo cierra (0013)
      insert into public.firmas (organizacion_id, documento_id, campo, firmante_nombre, firmante_usuario_id, imagen, origen)
      values (new.organizacion_id, new.id, 'firmaCliente', coalesce(nullif(trim(new.datos ->> 'nombreRecibe'), ''), 'Cliente'), null, new.datos ->> 'firmaCliente', 'en_sitio')
      on conflict (documento_id, campo) do update
        set firmante_nombre = excluded.firmante_nombre, imagen = excluded.imagen, firmado_at = now()
        where public.firmas.origen = 'en_sitio';
      update public.enlaces_firma set usado_at = now() where documento_id = new.id and usado_at is null;
      -- Mismos eventos que la app: «Firma del cliente en sitio» y luego «Cerrado con…»
      insert into public.documento_eventos (organizacion_id, documento_id, actor_id, actor_nombre, accion, detalle)
      values (new.organizacion_id, new.id, auth.uid(), actor, 'Firma del cliente en sitio', nullif(trim(new.datos ->> 'nombreRecibe'), ''));
      perform public.registrar_auditoria(new.organizacion_id, 'Firma del cliente en sitio', 'documento', new.id, jsonb_build_object('codigo', new.codigo));
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
    -- Sale de revisión para corregirse: la firma del cliente en sitio ya no vale (portal, enlace o en sitio otra vez)
    if anula_firma then
      new.datos := new.datos || '{"firmaCliente":"","nombreRecibe":"","cargoRecibe":""}'::jsonb;
      delete from public.firmas where documento_id = new.id and campo = 'firmaCliente' and origen = 'en_sitio';
      insert into public.documento_eventos (organizacion_id, documento_id, actor_id, actor_nombre, accion, detalle)
      values (new.organizacion_id, new.id, auth.uid(), actor, 'Se anuló la firma del cliente (el contenido cambió)', null);
      perform public.registrar_auditoria(new.organizacion_id, 'Se anuló la firma del cliente (el contenido cambió)', 'documento', new.id, jsonb_build_object('codigo', new.codigo));
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Clientes desde los formatos (el técnico crea; no edita ni borra)
-- ---------------------------------------------------------------------------

-- Nombre comparable, idéntico a claveNombre (src/nucleo/clientes.ts; mismos casos de prueba en
-- tests/unit/clientes.test.ts y supabase/tests): NFC, sin tildes (la ñ cuenta: «Peña» ≠ «Pena»),
-- minúsculas, sin puntuación, un solo espacio (también tabulaciones y espacios duros) y sin la
-- razón social del final («S.A.S.», «SAS», «S.A.», «Ltda.», «S. en C.», «E.U.»). Solo para comparar.
create or replace function public.clave_nombre(t text)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $$
  select btrim(regexp_replace(
           btrim(regexp_replace(regexp_replace(lower(translate(normalize(coalesce(t, ''), NFC),
             'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÇÑáàäâãéèëêíìïîóòöôõúùüûçñ',
             'aaaaaeeeeiiiiooooouuuucñaaaaaeeeeiiiiooooouuuucñ')),
             '[.,''’´`"]', '', 'g'),
             '[^a-z0-9ñ]+', ' ', 'g')),
           ' (s ?a ?s|s ?a|ltda|limitada|s en c( ?s)?|e ?u)$', ''))
$$;

-- Sin duplicados por organización con otras mayúsculas, tildes o espacios (incluye los creados por el técnico).
-- Es un trigger y no un índice único para no fallar con duplicados que ya existan en una base en uso
-- (p. ej. «X S.A.S.» y «X SAS» creados antes de 0013). Dos altas simultáneas del mismo nombre no se
-- cuelan: el candado por organización y nombre comparable hace que la segunda espere a la primera
-- y la vea al revisar.
create or replace function public.clientes_sin_duplicar()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  new.nombre := btrim(regexp_replace(normalize(new.nombre, NFC), '[\s\u00a0\u1680\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff]+', ' ', 'g'));
  if new.nombre = '' then
    raise exception 'El cliente necesita un nombre' using errcode = '23514';
  end if;
  perform pg_advisory_xact_lock(hashtext(new.organizacion_id::text || '|' || public.clave_nombre(new.nombre)));
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

-- Llena solo los campos vacíos de un cliente ACTIVO con lo escrito en un formato (nunca sobrescribe);
-- solo deja auditoría si algo cambió
create or replace function public.completar_cliente(cliente uuid, datos jsonb)
returns public.clientes
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  c public.clientes;
  antes public.clientes;
  d jsonb := coalesce(datos, '{}'::jsonb);
  correo_nuevo text := btrim(coalesce(d ->> 'correo', ''));
  telefono_nuevo text := btrim(coalesce(d ->> 'telefono', ''));
begin
  select * into c from public.clientes where id = cliente;
  if not found or not public.tiene_rol(c.organizacion_id, array['admin', 'supervisor', 'tecnico']) then
    raise exception 'Cliente no disponible' using errcode = '42501';
  end if;
  -- Un cliente desactivado no se completa desde los formatos
  if not c.activo then
    return c;
  end if;
  antes := c;
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
  -- (updated_at lo cambia el trigger de toque aunque no se haya llenado nada)
  if (to_jsonb(c) - 'updated_at') is distinct from (to_jsonb(antes) - 'updated_at') then
    perform public.registrar_auditoria(c.organizacion_id, 'Completó datos del cliente', 'cliente', c.id, jsonb_build_object('nombre', c.nombre));
  end if;
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
