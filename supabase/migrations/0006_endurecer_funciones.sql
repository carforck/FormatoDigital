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
