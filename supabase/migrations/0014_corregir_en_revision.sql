-- ============================================================================
-- FormatoDigital — 0014 Corregir en revisión (pedido de Magno, SOTEC)
--
--  El AUTOR puede corregir su documento mientras está en revisión, sin retirarlo:
--  sigue en_revision, queda el evento «Corrigió mientras estaba en revisión» y el
--  revisor ve el contenido corregido. Ya aprobado, rechazado por el revisor o
--  cerrado, no (el rechazado vuelve al autor y se edita como siempre). En la base,
--  en_revision implica que nadie lo ha revisado: aprobar o rechazar lo saca de ahí.
--    · Contenido (datos), proyecto/cliente y equipos atendidos: solo el autor.
--    · Lo comercial (cotización) no pasa por revisión: no aplica.
--    · La firma del cliente no se pone ni se cambia en el mismo paso (va aparte,
--      como en 0013). Si el documento ya traía la firma del cliente tomada en
--      sitio, al corregirlo se ANULA (respaldaba lo anterior), igual que al retirar.
--
-- La aplicación (fase 1, `espacios`) aplica las mismas reglas en
-- src/nucleo/permisos.ts (puedeEditarDoc, revisionSinTocar) y DemoProvider (guardar).
-- ============================================================================

-- Flujo de documentos: 0013 + la corrección en revisión
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
  -- El autor corrige su documento en revisión sin retirarlo (0014): sigue en revisión.
  -- En la base, en revisión implica que nadie lo ha revisado (aprobar o rechazar lo saca de ahí).
  -- La firma del cliente no se pone ni se cambia en el mismo paso (va aparte: firma_en_sitio).
  corrige_en_revision boolean := es_autor and not comercial
                                 and old.estado = 'en_revision' and new.estado = 'en_revision'
                                 and new.datos is distinct from old.datos and not firma_en_sitio
                                 and coalesce(new.datos ->> 'firmaCliente', '') in (coalesce(old.datos ->> 'firmaCliente', ''), '');
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
  -- cliente en sitio por el autor (0013) o corregirlo su autor sin retirarlo (0014).
  if new.datos is distinct from old.datos
     and old.estado not in ('borrador', 'rechazado')
     and not (old.estado = 'aprobado' and new.estado = 'cerrado')
     and not (old.estado = 'en_revision' and new.estado = 'en_revision' and (firma_en_sitio or corrige_en_revision)) then
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

  -- Corrigió en revisión: queda en el historial y la firma del cliente en sitio (respaldaba lo anterior) se anula
  if corrige_en_revision then
    insert into public.documento_eventos (organizacion_id, documento_id, actor_id, actor_nombre, accion, detalle)
    values (new.organizacion_id, new.id, auth.uid(), actor, 'Corrigió mientras estaba en revisión', null);
    perform public.registrar_auditoria(new.organizacion_id, 'Corrigió mientras estaba en revisión', 'documento', new.id, jsonb_build_object('codigo', new.codigo));
    if coalesce(old.datos ->> 'firmaCliente', '') <> '' then
      new.datos := new.datos || '{"firmaCliente":"","nombreRecibe":"","cargoRecibe":""}'::jsonb;
      delete from public.firmas where documento_id = new.id and campo = 'firmaCliente' and origen = 'en_sitio';
      insert into public.documento_eventos (organizacion_id, documento_id, actor_id, actor_nombre, accion, detalle)
      values (new.organizacion_id, new.id, auth.uid(), actor, 'Se anuló la firma del cliente (el contenido cambió)', null);
      perform public.registrar_auditoria(new.organizacion_id, 'Se anuló la firma del cliente (el contenido cambió)', 'documento', new.id, jsonb_build_object('codigo', new.codigo));
    end if;
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

-- El proyecto (y su cliente) también se corrige en revisión, solo por el autor
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
    -- Documento: borrador o rechazado, o en revisión corregido por su autor sin retirarlo (0014)
    editable := case tg_table_name
      when 'documentos' then old.estado in ('borrador', 'rechazado')
        or (old.estado = 'en_revision' and new.estado = 'en_revision' and old.autor_id = auth.uid())
      else old.estado = 'borrador' end;
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

-- Equipos atendidos: también los corrige el autor en revisión
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
  -- En revisión también: su autor lo corrige sin retirarlo (0014)
  if d.estado not in ('borrador', 'rechazado', 'en_revision') or d.autor_id is distinct from auth.uid() then
    raise exception 'Solo el autor marca los equipos, y solo mientras puede editar el documento' using errcode = '42501';
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
