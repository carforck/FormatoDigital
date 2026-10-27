-- Pruebas del modelo multiempresa: aislamiento, roles, flujo y firma remota.
-- Uso: scripts/probar-db.sh   (cada bloque falla con un mensaje claro)
\set ON_ERROR_STOP on
set client_min_messages = warning;
\pset tuples_only on
\pset format unaligned

-- ---------------------------------------------------------------- datos base
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'gerencia@sotec.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'sst@sotec.test'),
  ('00000000-0000-0000-0000-0000000000a3', 'tecnico@sotec.test'),
  ('00000000-0000-0000-0000-0000000000a4', 'tecnico2@sotec.test'),
  ('00000000-0000-0000-0000-0000000000a5', 'cliente@arcillas.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'admin@otra.test');
-- El trigger crear_perfil (0005) ya creó los perfiles
do $$ begin assert (select count(*) from public.perfiles) = 6, 'perfil automático al registrarse'; end $$;

insert into public.organizaciones (id, slug, nombre) values
  ('10000000-0000-0000-0000-000000000001', 'sotec-prueba', 'SOTEC prueba'),
  ('20000000-0000-0000-0000-000000000002', 'otra', 'Otra Empresa');
insert into public.clientes (id, organizacion_id, nombre) values
  ('c0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ladrillera Arcillas del Caribe'),
  ('c0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Constructora Horizonte Azul'),
  ('c0000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000002', 'Cliente de la otra');
insert into public.miembros (organizacion_id, usuario_id, rol, cliente_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'admin', null),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2', 'supervisor', null),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a3', 'tecnico', null),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a4', 'tecnico', null),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a5', 'cliente', 'c0000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'admin', null);
insert into public.formatos (organizacion_id, clave, codigo, nombre, prefijo) values
  ('10000000-0000-0000-0000-000000000001', 'reporte', 'FO-GSST-22', 'Formato de reporte técnico', 'RT'),
  ('10000000-0000-0000-0000-000000000001', 'permiso', 'F-GSST-13', 'Permiso de trabajo', 'PT'),
  ('10000000-0000-0000-0000-000000000001', 'cuenta_cobro', 'CC-01', 'Cuenta de cobro', 'CC'),
  ('20000000-0000-0000-0000-000000000002', 'reporte', 'R-01', 'Reporte', 'RT');

-- Ayudante: actuar como un usuario (o anónimo si es null)
create or replace function pg_temp.como(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false);
  if uid is null then execute 'set role anon'; else execute 'set role authenticated'; end if;
end $$;
create temp table ctx (k text primary key, v text);
grant all on ctx to anon, authenticated;

-- ------------------------------------------------- 1. el técnico crea reportes
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
insert into ctx select 'rt1', (public.crear_documento('10000000-0000-0000-0000-000000000001', 'reporte', '{"asunto":"Fibra"}', null, 'c0000000-0000-0000-0000-000000000001')).id;
insert into ctx select 'rt2', (public.crear_documento('10000000-0000-0000-0000-000000000001', 'reporte', '{}', null, 'c0000000-0000-0000-0000-000000000001')).id;
do $$ begin
  assert (select codigo from public.documentos where id = (select v::uuid from ctx where k = 'rt1')) = 'RT-001-' || to_char(now(), 'YY'), 'código RT-001';
  assert (select codigo from public.documentos where id = (select v::uuid from ctx where k = 'rt2')) = 'RT-002-' || to_char(now(), 'YY'), 'consecutivo RT-002';
  assert (select count(*) from public.documento_eventos where documento_id = (select v::uuid from ctx where k = 'rt1')) = 1, 'evento de creación';
end $$;
reset role;

-- --------------------------------------- 2. otra empresa: consecutivo propio y aislamiento
select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
do $$ begin
  assert (public.crear_documento('20000000-0000-0000-0000-000000000002', 'reporte')).codigo = 'RT-001-' || to_char(now(), 'YY'), 'la otra empresa arranca en 001';
  assert (select count(*) from public.documentos) = 1, 'la otra empresa solo ve su documento';
  assert (select count(*) from public.clientes) = 1, 'la otra empresa solo ve su cliente';
  assert (select count(*) from public.organizaciones) = 1, 'la otra empresa solo ve su organización';
end $$;
do $$ begin
  perform public.crear_documento('10000000-0000-0000-0000-000000000001', 'reporte');
  raise exception 'FALLO: creó un documento en una empresa ajena';
-- Rechazo sin revelar nada: ni siquiera ve que el formato existe
exception when insufficient_privilege or no_data_found then null; end $$;
reset role;

-- ------------------------------------------------- 3. visibilidad por rol
select pg_temp.como('00000000-0000-0000-0000-0000000000a4');
do $$ begin assert (select count(*) from public.documentos) = 0, 'el técnico 2 no ve reportes del técnico 1'; end $$;
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a5');
do $$ begin
  assert (select count(*) from public.documentos) = 0, 'el cliente no ve borradores';
  assert (select count(*) from public.clientes) = 1, 'el cliente solo ve su empresa';
end $$;
do $$ begin
  perform public.crear_documento('10000000-0000-0000-0000-000000000001', 'reporte');
  raise exception 'FALLO: un cliente creó un documento';
exception when insufficient_privilege then null; end $$;
reset role;

-- ------------------------------------------------- 4. flujo de estados
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
do $$ begin
  update public.documentos set estado = 'aprobado' where id = (select v::uuid from ctx where k = 'rt1');
  raise exception 'FALLO: el técnico se aprobó su propio reporte';
exception when insufficient_privilege then null; end $$;
update public.documentos set estado = 'en_revision' where id = (select v::uuid from ctx where k = 'rt1');
do $$ begin
  update public.documentos set datos = '{"asunto":"cambiado"}' where id = (select v::uuid from ctx where k = 'rt1');
  raise exception 'FALLO: modificó un documento ya enviado';
exception when insufficient_privilege then null; end $$;
reset role;

select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
do $$ begin
  update public.documentos set estado = 'rechazado' where id = (select v::uuid from ctx where k = 'rt1');
  raise exception 'FALLO: rechazó sin motivo';
exception when check_violation then null; end $$;
update public.documentos set estado = 'aprobado' where id = (select v::uuid from ctx where k = 'rt1');
do $$ begin
  assert (select aprobado_por from public.documentos where id = (select v::uuid from ctx where k = 'rt1')) = '00000000-0000-0000-0000-0000000000a2', 'registra quién aprobó';
  assert (select count(*) from public.documento_eventos where documento_id = (select v::uuid from ctx where k = 'rt1')) = 3, 'creó, envió y aprobó';
end $$;
reset role;

select pg_temp.como('00000000-0000-0000-0000-0000000000a5');
do $$ begin assert (select count(*) from public.documentos) = 1, 'el cliente ve el reporte aprobado de su empresa'; end $$;
reset role;

-- ------------------------------------------------- 5. firma remota por enlace
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
insert into ctx select 'token', public.crear_enlace_firma((select v::uuid from ctx where k = 'rt1'), 'cliente@arcillas.test');
reset role;

select pg_temp.como(null);  -- anónimo, sin cuenta
do $$ begin
  assert (public.documento_por_enlace((select v from ctx where k = 'token')) ->> 'codigo') like 'RT-001-%', 'el enlace muestra el documento';
  assert public.documento_por_enlace('token-falso') is null, 'un token falso no muestra nada';
  assert (select count(*) from public.documentos) = 0, 'anónimo no lee la tabla directamente';
end $$;
do $$ begin
  perform public.firmar_con_enlace((select v from ctx where k = 'token'), 'Ing. Daniel', 'no-es-imagen');
  raise exception 'FALLO: aceptó una firma inválida';
exception when check_violation then null; end $$;
do $$ begin
  assert public.firmar_con_enlace((select v from ctx where k = 'token'), 'Ing. Daniel', 'data:image/png;base64,iVBORw0KGgo=') = 'cerrado', 'la firma del cliente cierra el reporte';
end $$;
do $$ begin
  perform public.firmar_con_enlace((select v from ctx where k = 'token'), 'Otra persona', 'data:image/png;base64,iVBORw0KGgo=');
  raise exception 'FALLO: el enlace se pudo usar dos veces';
exception when insufficient_privilege then null; end $$;
reset role;

select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
do $$ begin
  assert (select estado from public.documentos where id = (select v::uuid from ctx where k = 'rt1')) = 'cerrado', 'quedó cerrado';
  assert (select firmante_nombre from public.firmas where documento_id = (select v::uuid from ctx where k = 'rt1') and campo = 'firmaCliente') = 'Ing. Daniel', 'firma guardada';
  assert exists (select 1 from public.documento_eventos where documento_id = (select v::uuid from ctx where k = 'rt1') and accion = 'Cerró con la firma del cliente' and actor_nombre = 'Ing. Daniel'), 'evento de cierre con nombre';
end $$;
reset role;

-- El técnico no puede cerrar su reporte "fingiendo" el enlace
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
update public.documentos set estado = 'en_revision' where id = (select v::uuid from ctx where k = 'rt2');
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
update public.documentos set estado = 'aprobado' where id = (select v::uuid from ctx where k = 'rt2');
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
do $$ begin
  perform set_config('fd.cierre_por_enlace', 'si', false);
  update public.documentos set estado = 'cerrado' where id = (select v::uuid from ctx where k = 'rt2');
  raise exception 'FALLO: cerró sin firma real del cliente';
exception when insufficient_privilege then null; end $$;
select set_config('fd.cierre_por_enlace', '', false);
reset role;

-- ------------------------------------------------- 6. auditoría solo para admin
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
do $$ begin assert (select count(*) from public.auditoria) = 0, 'el técnico no ve la auditoría'; end $$;
do $$ begin
  perform public.registrar_auditoria('10000000-0000-0000-0000-000000000001', 'falso', 'x', null);
  raise exception 'FALLO: escribió en la auditoría directamente';
exception when insufficient_privilege then null; end $$;
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
do $$ begin assert (select count(*) from public.auditoria) >= 5, 'el admin ve la auditoría'; end $$;
reset role;

-- ------------------------------------------------- 7. legalización de gastos (FO-GSST-25 como documento)
insert into public.formatos (organizacion_id, clave, codigo, nombre, prefijo)
values ('10000000-0000-0000-0000-000000000001', 'gasto', 'FO-GSST-25', 'Legalización de gastos', 'LG');
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
insert into ctx select 'lg', (public.crear_documento('10000000-0000-0000-0000-000000000001', 'gasto',
  '{"items":[{"tipo":"Transporte","descripcion":"Taxi","recibo":"TX-1","cantidad":1,"valorUnitario":60000}]}', null, 'c0000000-0000-0000-0000-000000000001')).id;
do $$ begin
  assert (select codigo from public.documentos where id = (select v::uuid from ctx where k = 'lg')) like 'LG-001-%', 'código LG-001';
  assert to_regclass('public.gastos') is null, 'la tabla provisional gastos ya no existe';
end $$;
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a4');
do $$ begin assert (select count(*) from public.documentos where codigo like 'LG-%') = 0, 'el técnico 2 no ve legalizaciones ajenas'; end $$;
reset role;
update public.formatos set visible_cliente = false where clave = 'gasto';
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
update public.documentos set estado = 'en_revision' where id = (select v::uuid from ctx where k = 'lg');
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
update public.documentos set estado = 'aprobado' where id = (select v::uuid from ctx where k = 'lg');
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a5');
do $$ begin assert (select count(*) from public.documentos where codigo like 'LG-%') = 0, 'el cliente no ve legalizaciones de gastos aunque estén aprobadas'; end $$;
do $$ begin assert (select count(*) from public.documentos where codigo like 'RT-%') = 2, 'el cliente sigue viendo sus 2 reportes (cerrado y aprobado)'; end $$;
reset role;

-- ------------------------------------------------- 8. cuentas de cobro
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
insert into ctx select 'cc', (public.crear_cuenta_cobro('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Mantenimiento CCTV octubre')).id;
insert into public.cuenta_cobro_items (organizacion_id, cuenta_id, descripcion, cantidad, valor_unitario, documento_id) values
  ('10000000-0000-0000-0000-000000000001', (select v::uuid from ctx where k = 'cc'), 'Reparación fibra óptica', 1, 450000, (select v::uuid from ctx where k = 'rt1')),
  ('10000000-0000-0000-0000-000000000001', (select v::uuid from ctx where k = 'cc'), 'Visita técnica', 2, 120000, null);
update public.cuentas_cobro set iva = 131100 where id = (select v::uuid from ctx where k = 'cc');
do $$ begin
  assert (select subtotal from public.cuentas_cobro where id = (select v::uuid from ctx where k = 'cc')) = 690000, 'subtotal recalculado';
  assert (select total from public.cuentas_cobro where id = (select v::uuid from ctx where k = 'cc')) = 821100, 'total con IVA';
  assert (select codigo from public.cuentas_cobro where id = (select v::uuid from ctx where k = 'cc')) like 'CC-001-%', 'código CC-001';
end $$;
update public.cuentas_cobro set estado = 'emitida' where id = (select v::uuid from ctx where k = 'cc');
do $$ begin
  insert into public.cuenta_cobro_items (organizacion_id, cuenta_id, descripcion, valor_unitario)
  values ('10000000-0000-0000-0000-000000000001', (select v::uuid from ctx where k = 'cc'), 'Extra', 1);
  raise exception 'FALLO: agregó ítems a una cuenta emitida';
exception when insufficient_privilege then null; end $$;
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
do $$ begin assert (select count(*) from public.cuentas_cobro) = 0, 'el técnico no ve cuentas de cobro'; end $$;
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
do $$ begin
  assert (select count(*) from public.cuentas_cobro) = 0, 'SST no ve cuentas de cobro (0011: solo la administración)';
  assert (select count(*) from public.cuenta_cobro_items) = 0, 'SST no ve los ítems de las cuentas';
end $$;
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a5');
do $$ begin assert (select count(*) from public.cuentas_cobro) = 1, 'el cliente ve su cuenta emitida'; end $$;
reset role;

-- ------------------------------------------------- 9. endurecimiento (0006)
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
do $$ begin
  perform public.siguiente_consecutivo('10000000-0000-0000-0000-000000000001', 'reporte');
  raise exception 'FALLO: reservó un consecutivo por fuera de crear_documento';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.crear_documento('10000000-0000-0000-0000-000000000001', 'reporte', '{}', null, 'c0000000-0000-0000-0000-000000000009');
  raise exception 'FALLO: creó un documento con un cliente de otra empresa';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.crear_cuenta_cobro('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'x');
  raise exception 'FALLO: un técnico creó una cuenta de cobro';
exception when insufficient_privilege then null; end $$;
reset role;
select pg_temp.como(null);
do $$ begin
  perform public.crear_enlace_firma((select v::uuid from ctx where k = 'rt2'), '');
  raise exception 'FALLO: un anónimo pidió una firma';
exception when insufficient_privilege then null; end $$;
reset role;

-- ------------------------------------------------- 10. separación de funciones y enlaces (0008)
-- La coordinadora crea un documento propio: no puede aprobarlo
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
insert into ctx select 'propio', (public.crear_documento('10000000-0000-0000-0000-000000000001', 'reporte', '{}', null, 'c0000000-0000-0000-0000-000000000001')).id;
update public.documentos set estado = 'en_revision' where id = (select v::uuid from ctx where k = 'propio');
do $$ begin
  update public.documentos set estado = 'aprobado' where id = (select v::uuid from ctx where k = 'propio');
  raise exception 'FALLO: aprobó su propio documento';
exception when insufficient_privilege then null; end $$;
reset role;
-- La coordinadora no edita el borrador de un técnico
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
insert into ctx select 'borr', (public.crear_documento('10000000-0000-0000-0000-000000000001', 'reporte', '{"asunto":"x"}', null, 'c0000000-0000-0000-0000-000000000001')).id;
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
do $$ begin
  update public.documentos set datos = '{"asunto":"editado por otro"}' where id = (select v::uuid from ctx where k = 'borr');
  raise exception 'FALLO: editó un borrador ajeno';
exception when insufficient_privilege then null; end $$;
-- No hay enlace de firma para un documento en revisión
do $$ begin
  perform public.crear_enlace_firma((select v::uuid from ctx where k = 'propio'), '');
  raise exception 'FALLO: creó un enlace sobre un documento en revisión';
exception when check_violation then null; end $$;
reset role;
-- Dos enlaces sobre un reporte aprobado: al firmar con uno, el otro queda anulado
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
update public.documentos set estado = 'en_revision' where id = (select v::uuid from ctx where k = 'borr');
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
update public.documentos set estado = 'aprobado' where id = (select v::uuid from ctx where k = 'borr');
insert into ctx select 'tk1', public.crear_enlace_firma((select v::uuid from ctx where k = 'borr'), '');
insert into ctx select 'tk2', public.crear_enlace_firma((select v::uuid from ctx where k = 'borr'), '');
reset role;
select pg_temp.como(null);
do $$ begin assert public.firmar_con_enlace((select v from ctx where k = 'tk1'), 'Cliente Uno', 'data:image/png;base64,iVBORw0KGgo=') = 'cerrado', 'firma con el primer enlace'; end $$;
do $$ begin
  perform public.firmar_con_enlace((select v from ctx where k = 'tk2'), 'Otra persona', 'data:image/png;base64,iVBORw0KGgo=');
  raise exception 'FALLO: el segundo enlace reemplazó la firma';
exception when insufficient_privilege then null; end $$;
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
do $$ begin assert (select firmante_nombre from public.firmas where documento_id = (select v::uuid from ctx where k = 'borr') and campo = 'firmaCliente') = 'Cliente Uno', 'la firma original se conserva'; end $$;
reset role;

-- ------------------------------------------------- 11. proyectos y cotizaciones (0009)
insert into public.formatos (organizacion_id, clave, codigo, nombre, prefijo, visible_cliente) values
  ('10000000-0000-0000-0000-000000000001', 'cotizacion', 'FO-COM-01', 'Cotización', 'COT', true);
-- El técnico no crea proyectos
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
do $$ begin
  perform public.crear_proyecto('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Proyecto del técnico');
  raise exception 'FALLO: el técnico creó un proyecto';
exception when insufficient_privilege then null; end $$;
reset role;
-- La coordinadora crea dos proyectos con su consecutivo
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
insert into ctx select 'p1', (public.crear_proyecto('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'CCTV hornos', 'Área de hornos', '00000000-0000-0000-0000-0000000000a3', current_date, 18000000)).id;
insert into ctx select 'p2', (public.crear_proyecto('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Control de acceso torre B')).id;
do $$ begin
  assert (select codigo from public.proyectos where id = (select v::uuid from ctx where k = 'p1')) = 'PRY-001-' || to_char(now(), 'YY'), 'código PRY-001';
  assert (select codigo from public.proyectos where id = (select v::uuid from ctx where k = 'p2')) = 'PRY-002-' || to_char(now(), 'YY'), 'consecutivo PRY-002';
end $$;
-- Un documento no puede ir a un proyecto de otro cliente
do $$ begin
  perform public.crear_documento('10000000-0000-0000-0000-000000000001', 'reporte', '{}', null, 'c0000000-0000-0000-0000-000000000002', (select v::uuid from ctx where k = 'p1'));
  raise exception 'FALLO: documento en un proyecto de otro cliente';
exception when insufficient_privilege then null; end $$;
-- La cotización es comercial (0011): ni SST ni el técnico la crean
do $$ begin
  perform public.crear_documento('10000000-0000-0000-0000-000000000001', 'cotizacion', '{"asunto":"De SST"}', null, null, (select v::uuid from ctx where k = 'p1'));
  raise exception 'FALLO: SST creó una cotización';
exception when insufficient_privilege then null; end $$;
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
do $$ begin
  perform public.crear_documento('10000000-0000-0000-0000-000000000001', 'cotizacion', '{"asunto":"Del técnico"}');
  raise exception 'FALLO: el técnico creó una cotización';
exception when insufficient_privilege then null; end $$;
reset role;
-- La gerencia la crea; con el proyecto basta: el cliente sale de él
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
insert into ctx select 'cot1', (public.crear_documento('10000000-0000-0000-0000-000000000001', 'cotizacion', '{"asunto":"Ampliación CCTV"}', null, null, (select v::uuid from ctx where k = 'p1'))).id;
do $$ begin
  assert (select cliente_id from public.documentos where id = (select v::uuid from ctx where k = 'cot1')) = 'c0000000-0000-0000-0000-000000000001', 'el documento toma el cliente del proyecto';
  assert (select codigo from public.documentos where id = (select v::uuid from ctx where k = 'cot1')) like 'COT-001-%', 'código COT-001 (los intentos rechazados no queman consecutivo)';
end $$;
-- Sin revisor aparte: no va a revisión; la gerencia la aprueba y queda enviada al cliente
do $$ begin
  update public.documentos set estado = 'en_revision' where id = (select v::uuid from ctx where k = 'cot1');
  raise exception 'FALLO: la cotización pasó por revisión';
exception when insufficient_privilege then null; end $$;
update public.documentos set estado = 'aprobado' where id = (select v::uuid from ctx where k = 'cot1');
do $$ begin
  assert (select aprobado_por from public.documentos where id = (select v::uuid from ctx where k = 'cot1')) = '00000000-0000-0000-0000-0000000000a1', 'la gerencia aprobó su cotización';
  assert exists (select 1 from public.documento_eventos where documento_id = (select v::uuid from ctx where k = 'cot1') and accion = 'Aprobó y envió al cliente'), 'evento «Aprobó y envió al cliente»';
end $$;
-- Enviada, ya no cambia de proyecto
do $$ begin
  update public.documentos set proyecto_id = (select v::uuid from ctx where k = 'p2'), cliente_id = 'c0000000-0000-0000-0000-000000000002' where id = (select v::uuid from ctx where k = 'cot1');
  raise exception 'FALLO: cambió el proyecto de un documento enviado';
exception when insufficient_privilege then null; end $$;
-- La gerencia crea la cuenta de cobro del proyecto
insert into ctx select 'cc2', (public.crear_cuenta_cobro('10000000-0000-0000-0000-000000000001', null, 'Anticipo CCTV hornos', null, (select v::uuid from ctx where k = 'p1'))).id;
do $$ begin
  assert (select cliente_id from public.cuentas_cobro where id = (select v::uuid from ctx where k = 'cc2')) = 'c0000000-0000-0000-0000-000000000001', 'la cuenta toma el cliente del proyecto';
  assert (select proyecto_id from public.cuentas_cobro where id = (select v::uuid from ctx where k = 'cc2')) = (select v::uuid from ctx where k = 'p1'), 'la cuenta queda en el proyecto';
end $$;
-- Proyecto cerrado: no recibe documentos nuevos
update public.proyectos set estado = 'cerrado' where id = (select v::uuid from ctx where k = 'p2');
do $$ begin
  assert (select fecha_fin from public.proyectos where id = (select v::uuid from ctx where k = 'p2')) = current_date, 'al cerrar se fija la fecha de fin';
  perform public.crear_documento('10000000-0000-0000-0000-000000000001', 'reporte', '{}', null, null, (select v::uuid from ctx where k = 'p2'));
  raise exception 'FALLO: documento nuevo en un proyecto cerrado';
exception when insufficient_privilege then null; end $$;
reset role;
-- Un proyecto con documentos no se elimina; uno vacío sí (solo admin y SST)
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
insert into ctx select 'p3', (public.crear_proyecto('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Proyecto sin documentos')).id;
delete from public.proyectos where id = (select v::uuid from ctx where k = 'p1');
do $$ begin assert (select count(*) from public.proyectos where id = (select v::uuid from ctx where k = 'p1')) = 1, 'un proyecto con documentos no se elimina'; end $$;
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
delete from public.proyectos where id = (select v::uuid from ctx where k = 'p3');
reset role;
do $$ begin assert (select count(*) from public.proyectos where id = (select v::uuid from ctx where k = 'p3')) = 1, 'el técnico no elimina proyectos'; end $$;
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
delete from public.proyectos where id = (select v::uuid from ctx where k = 'p3');
reset role;
do $$ begin assert (select count(*) from public.proyectos where id = (select v::uuid from ctx where k = 'p3')) = 0, 'SST elimina un proyecto vacío'; end $$;
-- Un cliente con historial no se puede borrar (se desactiva)
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  delete from public.clientes where id = 'c0000000-0000-0000-0000-000000000001';
  raise exception 'FALLO: borró un cliente con documentos';
exception when foreign_key_violation then null; end $$;
update public.clientes set activo = false where id = 'c0000000-0000-0000-0000-000000000002';
do $$ begin assert (select count(*) from public.documentos where cliente_id = 'c0000000-0000-0000-0000-000000000001') > 0, 'el historial del cliente se conserva'; end $$;
update public.clientes set activo = true where id = 'c0000000-0000-0000-0000-000000000002';
reset role;

-- El técnico ve los proyectos de su empresa; la otra empresa, ninguno
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
do $$ begin assert (select count(*) from public.proyectos) = 2, 'el técnico ve los proyectos de su empresa'; end $$;
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
do $$ begin
  assert (select count(*) from public.proyectos) = 0, 'la otra empresa no ve proyectos ajenos';
  perform public.crear_documento('20000000-0000-0000-0000-000000000002', 'reporte', '{}', null, null, (select v::uuid from ctx where k = 'p1'));
  raise exception 'FALLO: usó un proyecto de otra empresa';
exception when insufficient_privilege then null; end $$;
reset role;
-- El cliente ve solo los proyectos de su empresa, no los edita y acepta la cotización firmando en su portal
select pg_temp.como('00000000-0000-0000-0000-0000000000a5');
do $$ begin
  assert (select count(*) from public.proyectos) = 1, 'el cliente solo ve los proyectos de su empresa';
  assert (select count(*) from public.documentos where id = (select v::uuid from ctx where k = 'cot1')) = 1, 'el cliente ve la cotización aprobada';
end $$;
update public.proyectos set nombre = 'Cambiado por el cliente' where id = (select v::uuid from ctx where k = 'p1');
do $$ begin
  assert (select public.firmar_como_cliente((select v::uuid from ctx where k = 'cot1'), 'Ing. Daniel', 'data:image/png;base64,AAAA')) = 'cerrado', 'el cliente acepta la cotización firmando';
  assert (select estado from public.documentos where id = (select v::uuid from ctx where k = 'cot1')) = 'cerrado', 'la cotización aceptada queda cerrada';
end $$;
do $$ begin
  perform public.firmar_como_cliente((select v::uuid from ctx where k = 'cot1'), 'Ing. Daniel', 'data:image/png;base64,AAAA');
  raise exception 'FALLO: firmó dos veces';
exception when check_violation then null; end $$;
reset role;
do $$ begin assert (select nombre from public.proyectos where id = (select v::uuid from ctx where k = 'p1')) = 'CCTV hornos', 'el cliente no edita proyectos'; end $$;
-- Otro cliente no firma la cotización ajena
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
do $$ begin
  perform public.firmar_como_cliente((select v::uuid from ctx where k = 'cot1'), 'Técnico', 'data:image/png;base64,AAAA');
  raise exception 'FALLO: alguien que no es el cliente firmó como cliente';
exception when insufficient_privilege then null; end $$;
reset role;

-- ------------------------------------------------- 12. lo comercial es solo de la administración (0011)
-- Avisos de la cotización para los roles: SST no ve el suyo (el documento no le es visible)
insert into public.notificaciones (organizacion_id, rol, texto, documento_id) values
  ('10000000-0000-0000-0000-000000000001', 'supervisor', 'Cotización para SST', (select v::uuid from ctx where k = 'cot1')),
  ('10000000-0000-0000-0000-000000000001', 'admin', 'Cotización para la gerencia', (select v::uuid from ctx where k = 'cot1'));
-- La gerencia: un borrador de cotización y una cuenta en borrador
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
insert into ctx select 'cot2', (public.crear_documento('10000000-0000-0000-0000-000000000001', 'cotizacion', '{"asunto":"Borrador de la gerencia"}', null, 'c0000000-0000-0000-0000-000000000001')).id;
insert into ctx select 'cc3', (public.crear_cuenta_cobro('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Borrador de cuenta')).id;
update public.documentos set datos = '{"asunto":"Editado por la gerencia"}' where id = (select v::uuid from ctx where k = 'cot2');
do $$ begin
  assert (select count(*) from public.documentos where codigo like 'COT-%') = 2, 'la gerencia ve todas las cotizaciones';
  assert (select count(*) from public.cuentas_cobro) = 3, 'la gerencia ve todas las cuentas de cobro';
  assert (select count(*) from public.notificaciones where texto = 'Cotización para la gerencia') = 1, 'la gerencia ve el aviso de la cotización';
  assert (select datos ->> 'asunto' from public.documentos where id = (select v::uuid from ctx where k = 'cot2')) = 'Editado por la gerencia', 'la gerencia edita su cotización';
end $$;
reset role;
-- SST y el técnico: no leen, no crean, no editan ni aprueban cotizaciones o cuentas
create or replace function pg_temp.sin_comercial(quien text) returns void language plpgsql as $f$
declare n int;
begin
  assert (select count(*) from public.documentos d join public.formatos f on f.id = d.formato_id where f.clave = 'cotizacion') = 0, quien || ' no ve cotizaciones';
  assert (select count(*) from public.documento_eventos where documento_id = (select v::uuid from ctx where k = 'cot1')) = 0, quien || ' no ve el historial de la cotización';
  assert (select count(*) from public.cuentas_cobro) = 0, quien || ' no ve cuentas de cobro';
  assert (select count(*) from public.cuenta_cobro_items) = 0, quien || ' no ve ítems de cuentas';
  assert (select count(*) from public.notificaciones where documento_id = (select v::uuid from ctx where k = 'cot1')) = 0, quien || ' no ve avisos de cotizaciones';
  update public.documentos set datos = '{"asunto":"intruso"}' where id in (select v::uuid from ctx where k in ('cot1', 'cot2'));
  get diagnostics n = row_count;
  assert n = 0, quien || ' no edita cotizaciones';
  update public.documentos set estado = 'aprobado' where id = (select v::uuid from ctx where k = 'cot2');
  get diagnostics n = row_count;
  assert n = 0, quien || ' no aprueba cotizaciones';
  update public.cuentas_cobro set estado = 'emitida' where id = (select v::uuid from ctx where k = 'cc3');
  get diagnostics n = row_count;
  assert n = 0, quien || ' no emite cuentas de cobro';
  begin
    insert into public.documentos (organizacion_id, formato_id, codigo, consecutivo, autor_id)
    select '10000000-0000-0000-0000-000000000001', f.id, 'COT-999-99', 999, auth.uid()
    from public.formatos f where f.organizacion_id = '10000000-0000-0000-0000-000000000001' and f.clave = 'cotizacion';
    raise exception 'FALLO: % insertó una cotización directamente', quien;
  exception when insufficient_privilege then null; end;
  begin
    perform public.crear_cuenta_cobro('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'x');
    raise exception 'FALLO: % creó una cuenta de cobro', quien;
  exception when insufficient_privilege then null; end;
  begin
    insert into public.cuentas_cobro (organizacion_id, cliente_id, codigo, consecutivo, concepto, creado_por)
    values ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'CC-999-99', 999, 'x', auth.uid());
    raise exception 'FALLO: % insertó una cuenta de cobro directamente', quien;
  exception when insufficient_privilege then null; end;
  begin
    insert into public.cuenta_cobro_items (organizacion_id, cuenta_id, descripcion, valor_unitario)
    values ('10000000-0000-0000-0000-000000000001', (select v::uuid from ctx where k = 'cc3'), 'Extra', 1);
    raise exception 'FALLO: % agregó ítems a una cuenta', quien;
  exception when insufficient_privilege then null; end;
  begin
    perform public.crear_enlace_firma((select v::uuid from ctx where k = 'cot1'), '');
    raise exception 'FALLO: % pidió la firma de una cotización', quien;
  exception when insufficient_privilege or check_violation then null; end;
end $f$;
grant execute on function pg_temp.sin_comercial(text) to authenticated;
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select pg_temp.sin_comercial('SST');
do $$ begin
  assert (select count(*) from public.notificaciones where texto = 'Cotización para SST') = 0, 'SST no ve el aviso de la cotización';
  assert (select count(*) from public.documentos where codigo like 'RT-%') > 0, 'SST sigue viendo los reportes del equipo';
end $$;
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
select pg_temp.sin_comercial('el técnico');
do $$ begin assert (select count(*) from public.documentos where codigo like 'LG-%') = 1, 'el técnico sigue viendo su legalización de gastos'; end $$;
reset role;
do $$ begin
  assert (select datos ->> 'asunto' from public.documentos where id = (select v::uuid from ctx where k = 'cot2')) = 'Editado por la gerencia', 'nadie más cambió la cotización';
  assert (select estado from public.documentos where id = (select v::uuid from ctx where k = 'cot2')) = 'borrador', 'la cotización sigue en borrador';
  assert (select estado from public.cuentas_cobro where id = (select v::uuid from ctx where k = 'cc3')) = 'borrador', 'la cuenta sigue en borrador';
end $$;
-- El cliente ve su cotización aceptada (no el borrador) y sus cuentas emitidas (no el borrador)
select pg_temp.como('00000000-0000-0000-0000-0000000000a5');
do $$ begin
  assert (select count(*) from public.documentos where codigo like 'COT-%') = 1, 'el cliente ve solo su cotización aceptada';
  assert (select estado from public.documentos where id = (select v::uuid from ctx where k = 'cot1')) = 'cerrado', 'la ve aceptada';
  assert (select count(*) from public.cuentas_cobro) = 1, 'el cliente ve solo su cuenta emitida';
end $$;
reset role;
-- La gerencia emite la cuenta: el cliente la ve
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
update public.cuentas_cobro set estado = 'emitida' where id = (select v::uuid from ctx where k = 'cc3');
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a5');
do $$ begin assert (select count(*) from public.cuentas_cobro) = 2, 'el cliente ve la cuenta recién emitida'; end $$;
reset role;

-- ------------------------------------------------- 10. equipos (0010): inventario por cliente e historial
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
with x as (insert into public.equipos (organizacion_id, cliente_id, proyecto_id, sistema, tipo, nombre)
  values ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', (select v::uuid from ctx where k = 'p1'), 'cctv', 'NVR', 'NVR principal 16 canales') returning id) insert into ctx select 'e1', id from x;
with x as (insert into public.equipos (organizacion_id, cliente_id, sistema, tipo, nombre)
  values ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'cctv', 'Cámara domo', 'Cámara 1 – Portería') returning id) insert into ctx select 'e2', id from x;
with x as (insert into public.equipos (organizacion_id, cliente_id, sistema, tipo, nombre)
  values ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'acceso', 'Controladora', 'Controladora torre B') returning id) insert into ctx select 'e3', id from x;
-- El mismo nombre (otras mayúsculas y espacios) en el mismo cliente y sistema no se duplica
do $$ begin
  insert into public.equipos (organizacion_id, cliente_id, sistema, tipo, nombre)
  values ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'cctv', 'NVR', '  nvr principal   16 CANALES ');
  raise exception 'FALLO: equipo duplicado';
exception when unique_violation then null; end $$;
-- El proyecto debe ser del mismo cliente
do $$ begin
  insert into public.equipos (organizacion_id, cliente_id, proyecto_id, sistema, tipo, nombre)
  values ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', (select v::uuid from ctx where k = 'p1'), 'cctv', 'NVR', 'NVR torre B');
  raise exception 'FALLO: equipo en un proyecto de otro cliente';
exception when insufficient_privilege then null; end $$;
-- El técnico marca los equipos atendidos en su reporte (del mismo cliente)
insert into ctx select 'rtE', (public.crear_documento('10000000-0000-0000-0000-000000000001', 'reporte', '{"asunto":"Preventivo CCTV"}', null, 'c0000000-0000-0000-0000-000000000001')).id;
insert into public.documento_equipos (organizacion_id, documento_id, equipo_id)
select '10000000-0000-0000-0000-000000000001', (select v::uuid from ctx where k = 'rtE'), v::uuid from ctx where k in ('e1', 'e2');
do $$ begin
  insert into public.documento_equipos (organizacion_id, documento_id, equipo_id)
  values ('10000000-0000-0000-0000-000000000001', (select v::uuid from ctx where k = 'rtE'), (select v::uuid from ctx where k = 'e3'));
  raise exception 'FALLO: marcó un equipo de otro cliente';
exception when insufficient_privilege then null; end $$;
update public.documentos set estado = 'en_revision' where id = (select v::uuid from ctx where k = 'rtE');
-- Enviado: los equipos atendidos quedan fijos
do $$ begin
  delete from public.documento_equipos where documento_id = (select v::uuid from ctx where k = 'rtE');
  raise exception 'FALLO: cambió los equipos de un reporte enviado';
exception when insufficient_privilege then null; end $$;
-- El técnico edita y retira, pero no borra ni cambia el cliente
update public.equipos set marca = 'Dahua', estado = 'con_falla' where id = (select v::uuid from ctx where k = 'e2');
delete from public.equipos where id = (select v::uuid from ctx where k = 'e3');
do $$ begin
  update public.equipos set cliente_id = 'c0000000-0000-0000-0000-000000000002' where id = (select v::uuid from ctx where k = 'e2');
  raise exception 'FALLO: cambió el cliente de un equipo';
exception when insufficient_privilege then null; end $$;
do $$ begin
  assert (select marca from public.equipos where id = (select v::uuid from ctx where k = 'e2')) = 'Dahua', 'el técnico edita la ficha';
  assert (select count(*) from public.equipos where id = (select v::uuid from ctx where k = 'e3')) = 1, 'el técnico no borra equipos';
end $$;
reset role;
-- Otro técnico no marca equipos en un reporte ajeno
select pg_temp.como('00000000-0000-0000-0000-0000000000a4');
insert into ctx select 'rtE2', (public.crear_documento('10000000-0000-0000-0000-000000000001', 'reporte', '{}', null, 'c0000000-0000-0000-0000-000000000001')).id;
do $$ begin
  insert into public.documento_equipos (organizacion_id, documento_id, equipo_id)
  values ('10000000-0000-0000-0000-000000000001', (select v::uuid from ctx where k = 'rtE2'), (select v::uuid from ctx where k = 'e1'));
  insert into public.documento_equipos (organizacion_id, documento_id, equipo_id)
  values ('10000000-0000-0000-0000-000000000001', (select v::uuid from ctx where k = 'rtE'), (select v::uuid from ctx where k = 'e2'));
  raise exception 'FALLO: marcó equipos en el reporte de otro técnico';
exception when insufficient_privilege or unique_violation then null; end $$;
reset role;
-- El cliente: solo los equipos de su empresa; el historial, solo de reportes aprobados o cerrados
select pg_temp.como('00000000-0000-0000-0000-0000000000a5');
do $$ begin
  assert (select count(*) from public.equipos) = 2, 'el cliente solo ve los equipos de su empresa';
  assert (select count(*) from public.documento_equipos where documento_id = (select v::uuid from ctx where k = 'rtE')) = 0, 'el cliente no ve el historial de un reporte en revisión';
end $$;
update public.equipos set nombre = 'Cambiado por el cliente' where id = (select v::uuid from ctx where k = 'e1');
do $$ begin
  insert into public.equipos (organizacion_id, cliente_id, sistema, tipo, nombre)
  values ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'cctv', 'Cámara domo', 'Cámara del cliente');
  raise exception 'FALLO: el cliente registró un equipo';
exception when insufficient_privilege then null; end $$;
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
update public.documentos set estado = 'aprobado' where id = (select v::uuid from ctx where k = 'rtE');
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a5');
do $$ begin
  assert (select count(*) from public.documento_equipos where documento_id = (select v::uuid from ctx where k = 'rtE')) = 2, 'aprobado, el cliente ve los equipos atendidos';
  assert (select nombre from public.equipos where id = (select v::uuid from ctx where k = 'e1')) = 'NVR principal 16 canales', 'el cliente no edita equipos';
end $$;
reset role;
-- La administración borra solo equipos sin historial; con reportes se retiran
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  delete from public.equipos where id = (select v::uuid from ctx where k = 'e1');
  raise exception 'FALLO: borró un equipo con reportes';
exception when foreign_key_violation then null; end $$;
update public.equipos set estado = 'retirado' where id = (select v::uuid from ctx where k = 'e1');
delete from public.equipos where id = (select v::uuid from ctx where k = 'e3');
do $$ begin
  assert (select estado from public.equipos where id = (select v::uuid from ctx where k = 'e1')) = 'retirado', 'el equipo con historial se retira';
  assert (select count(*) from public.equipos where id = (select v::uuid from ctx where k = 'e3')) = 0, 'la administración borra un equipo sin reportes';
  assert (select count(*) from public.auditoria where entidad = 'equipo') >= 3, 'registro y cambios de estado en la auditoría';
end $$;
reset role;
-- Otra empresa: no ve ni crea equipos ajenos
select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
do $$ begin
  assert (select count(*) from public.equipos) = 0, 'la otra empresa no ve equipos ajenos';
  assert (select count(*) from public.documento_equipos) = 0, 'la otra empresa no ve historiales ajenos';
end $$;
do $$ begin
  insert into public.equipos (organizacion_id, cliente_id, sistema, tipo, nombre)
  values ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'cctv', 'NVR', 'Intruso');
  raise exception 'FALLO: creó un equipo en otra empresa';
exception when insufficient_privilege then null; end $$;
reset role;

-- ------------------------------------------------- 13. trabajo de campo (0013)
-- Firma del cliente en sitio, retirar para corregir y clientes nuevos desde los formatos
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
insert into ctx select 'fc1', (public.crear_documento('10000000-0000-0000-0000-000000000001', 'reporte', '{"asunto":"Campo 1","firmaCliente":""}', null, 'c0000000-0000-0000-0000-000000000001')).id;
insert into ctx select 'fc2', (public.crear_documento('10000000-0000-0000-0000-000000000001', 'reporte', '{"asunto":"Campo 2"}', null, 'c0000000-0000-0000-0000-000000000001')).id;
insert into ctx select 'fc3', (public.crear_documento('10000000-0000-0000-0000-000000000001', 'reporte', '{"asunto":"Campo 3"}', null, 'c0000000-0000-0000-0000-000000000001')).id;
update public.documentos set estado = 'en_revision' where id in (select v::uuid from ctx where k in ('fc1', 'fc2', 'fc3'));
-- En revisión, el autor toma la firma del cliente en sitio (sin cambiar nada más)
update public.documentos set datos = datos || '{"firmaCliente":"data:image/png;base64,AAAA","nombreRecibe":"Ing. Daniel","cargoRecibe":"Sistemas"}'
  where id = (select v::uuid from ctx where k = 'fc1');
do $$ begin
  assert (select estado from public.documentos where id = (select v::uuid from ctx where k = 'fc1')) = 'en_revision', 'la firma en sitio no cambia el estado';
  assert exists (select 1 from public.documento_eventos where documento_id = (select v::uuid from ctx where k = 'fc1') and accion = 'Firma del cliente en sitio' and detalle = 'Ing. Daniel'), 'evento «Firma del cliente en sitio»';
  assert (select origen from public.firmas where documento_id = (select v::uuid from ctx where k = 'fc1') and campo = 'firmaCliente') = 'en_sitio', 'la firma queda en firmas con origen en_sitio';
end $$;
-- Con la firma no se aprovecha para cambiar el contenido, ni se reemplaza la firma ya puesta
do $$ begin
  update public.documentos set datos = datos || '{"asunto":"cambiado","firmaCliente":"data:image/png;base64,BBBB"}' where id = (select v::uuid from ctx where k = 'fc2');
  raise exception 'FALLO: cambió el contenido junto con la firma en revisión';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.documentos set datos = datos || '{"firmaCliente":"data:image/png;base64,CCCC"}' where id = (select v::uuid from ctx where k = 'fc1');
  raise exception 'FALLO: reemplazó la firma del cliente en revisión';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.documentos set datos = datos || '{"firmaCliente":"no-es-imagen"}' where id = (select v::uuid from ctx where k = 'fc2');
  raise exception 'FALLO: aceptó una firma que no es imagen';
exception when insufficient_privilege then null; end $$;
-- Retirar para corregir: en revisión → borrador (solo el autor), se corrige y se reenvía
update public.documentos set estado = 'borrador' where id = (select v::uuid from ctx where k = 'fc2');
update public.documentos set datos = datos || '{"asunto":"Campo 2 corregido"}' where id = (select v::uuid from ctx where k = 'fc2');
update public.documentos set estado = 'en_revision' where id = (select v::uuid from ctx where k = 'fc2');
do $$ begin
  assert exists (select 1 from public.documento_eventos where documento_id = (select v::uuid from ctx where k = 'fc2') and accion = 'Retiró el envío para corregir'), 'evento «Retiró el envío para corregir»';
  assert (select datos ->> 'asunto' from public.documentos where id = (select v::uuid from ctx where k = 'fc2')) = 'Campo 2 corregido', 'corregido tras retirarlo';
  assert (select estado from public.documentos where id = (select v::uuid from ctx where k = 'fc2')) = 'en_revision', 'reenviado a revisión';
end $$;
-- Retirar no permite cambiar el contenido en el mismo paso
do $$ begin
  update public.documentos set estado = 'borrador', datos = datos || '{"asunto":"a la vez"}' where id = (select v::uuid from ctx where k = 'fc3');
  raise exception 'FALLO: retiró y cambió el contenido en un solo paso';
exception when insufficient_privilege then null; end $$;
reset role;
-- Otro técnico no ve ni retira lo ajeno
select pg_temp.como('00000000-0000-0000-0000-0000000000a4');
update public.documentos set estado = 'borrador' where id = (select v::uuid from ctx where k = 'fc3');
reset role;
do $$ begin assert (select estado from public.documentos where id = (select v::uuid from ctx where k = 'fc3')) = 'en_revision', 'otro técnico no retira lo ajeno'; end $$;
-- La coordinadora no pone firmas ni retira lo ajeno; aprueba: con firma en sitio queda cerrado
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
do $$ begin
  update public.documentos set datos = datos || '{"firmaCliente":"data:image/png;base64,AAAA"}' where id = (select v::uuid from ctx where k = 'fc3');
  raise exception 'FALLO: la coordinadora puso la firma del cliente en un documento ajeno en revisión';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.documentos set estado = 'borrador' where id = (select v::uuid from ctx where k = 'fc3');
  raise exception 'FALLO: la coordinadora retiró un documento ajeno';
exception when insufficient_privilege then null; end $$;
update public.documentos set estado = 'aprobado' where id = (select v::uuid from ctx where k = 'fc1');
update public.documentos set estado = 'aprobado' where id = (select v::uuid from ctx where k = 'fc2');
do $$ begin
  assert (select estado from public.documentos where id = (select v::uuid from ctx where k = 'fc1')) = 'cerrado', 'aprobar con firma del cliente en sitio lo cierra';
  assert (select cerrado_at is not null and aprobado_por = '00000000-0000-0000-0000-0000000000a2' from public.documentos where id = (select v::uuid from ctx where k = 'fc1')), 'registra aprobación y cierre';
  assert (select count(*) from public.documento_eventos where documento_id = (select v::uuid from ctx where k = 'fc1') and accion in ('Aprobó', 'Cerrado con la firma del cliente en sitio')) = 2, 'eventos Aprobó + Cerrado con la firma del cliente en sitio';
  assert (select estado from public.documentos where id = (select v::uuid from ctx where k = 'fc2')) = 'aprobado', 'sin firma del cliente queda aprobado';
end $$;
reset role;
-- Ya aprobado, el autor no lo retira; sí toma la firma en sitio y eso lo cierra (y anula los enlaces)
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
do $$ begin
  update public.documentos set estado = 'borrador' where id = (select v::uuid from ctx where k = 'fc2');
  raise exception 'FALLO: retiró un documento ya aprobado';
exception when insufficient_privilege then null; end $$;
insert into ctx select 'tkc', public.crear_enlace_firma((select v::uuid from ctx where k = 'fc2'), '');
do $$ begin
  update public.documentos set estado = 'cerrado', datos = datos || '{"asunto":"otro","firmaCliente":"data:image/png;base64,AAAA"}' where id = (select v::uuid from ctx where k = 'fc2');
  raise exception 'FALLO: cerró cambiando el contenido además de la firma';
exception when insufficient_privilege then null; end $$;
update public.documentos set estado = 'cerrado', datos = datos || '{"firmaCliente":"data:image/png;base64,AAAA","nombreRecibe":"Arq. Laura"}' where id = (select v::uuid from ctx where k = 'fc2');
do $$ begin
  assert (select estado from public.documentos where id = (select v::uuid from ctx where k = 'fc2')) = 'cerrado', 'la firma en sitio sobre un aprobado lo cierra';
  assert exists (select 1 from public.documento_eventos where documento_id = (select v::uuid from ctx where k = 'fc2') and accion = 'Cerrado con la firma del cliente en sitio'), 'evento de cierre en sitio';
end $$;
do $$ begin
  perform public.crear_enlace_firma((select v::uuid from ctx where k = 'fc1'), '');
  raise exception 'FALLO: pidió firma por enlace de un reporte ya firmado en sitio';
exception when check_violation then null; end $$;
reset role;
select pg_temp.como(null);
do $$ begin
  perform public.firmar_con_enlace((select v from ctx where k = 'tkc'), 'Otra persona', 'data:image/png;base64,iVBORw0KGgo=');
  raise exception 'FALLO: un enlace anterior firmó un reporte ya cerrado en sitio';
exception when insufficient_privilege then null; end $$;
reset role;

-- Retirar o rechazar anula la firma del cliente en sitio (el contenido va a cambiar) y libera su fila de
-- `firmas`: luego se vuelve a firmar en sitio, en el portal o por enlace
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
insert into ctx select 'fc4', (public.crear_documento('10000000-0000-0000-0000-000000000001', 'reporte', '{"asunto":"Campo 4"}', null, 'c0000000-0000-0000-0000-000000000001')).id;
insert into ctx select 'fc5', (public.crear_documento('10000000-0000-0000-0000-000000000001', 'reporte', '{"asunto":"Campo 5"}', null, 'c0000000-0000-0000-0000-000000000001')).id;
update public.documentos set estado = 'en_revision' where id in (select v::uuid from ctx where k in ('fc4', 'fc5'));
-- Solo PNG en data URL y de hasta 300 000 caracteres (igual que el portal y el enlace)
do $$ begin
  update public.documentos set datos = datos || '{"firmaCliente":"data:image/jpeg;base64,AAAA","nombreRecibe":"X"}' where id = (select v::uuid from ctx where k = 'fc4');
  raise exception 'FALLO: aceptó una firma en sitio que no es PNG';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.documentos set datos = datos || jsonb_build_object('firmaCliente', 'data:image/png;base64,' || repeat('A', 300000), 'nombreRecibe', 'X') where id = (select v::uuid from ctx where k = 'fc4');
  raise exception 'FALLO: aceptó una firma en sitio de más de 300 000 caracteres';
exception when insufficient_privilege then null; end $$;
update public.documentos set datos = datos || '{"firmaCliente":"data:image/png;base64,AAAA","nombreRecibe":"Ing. Daniel","cargoRecibe":"Sistemas"}' where id in (select v::uuid from ctx where k in ('fc4', 'fc5'));
-- El autor retira fc4: la firma se anula
update public.documentos set estado = 'borrador' where id = (select v::uuid from ctx where k = 'fc4');
do $$ begin
  assert (select datos ->> 'firmaCliente' = '' and datos ->> 'nombreRecibe' = '' and datos ->> 'cargoRecibe' = '' and datos ->> 'asunto' = 'Campo 4' from public.documentos where id = (select v::uuid from ctx where k = 'fc4')), 'retirar vacía la firma del cliente y quién recibe (y conserva lo demás)';
  assert not exists (select 1 from public.firmas where documento_id = (select v::uuid from ctx where k = 'fc4') and campo = 'firmaCliente'), 'retirar borra la fila en_sitio de firmas';
  assert exists (select 1 from public.documento_eventos where documento_id = (select v::uuid from ctx where k = 'fc4') and accion = 'Se anuló la firma del cliente (el contenido cambió)'), 'evento «Se anuló la firma del cliente»';
end $$;
-- Corregido y reenviado: se vuelve a tomar la firma en sitio y al aprobarlo queda cerrado con la NUEVA firma
update public.documentos set datos = datos || '{"asunto":"Campo 4 corregido"}' where id = (select v::uuid from ctx where k = 'fc4');
update public.documentos set estado = 'en_revision' where id = (select v::uuid from ctx where k = 'fc4');
update public.documentos set datos = datos || '{"firmaCliente":"data:image/png;base64,NUEVA","nombreRecibe":"Arq. Laura"}' where id = (select v::uuid from ctx where k = 'fc4');
do $$ begin
  assert (select imagen = 'data:image/png;base64,NUEVA' and firmante_nombre = 'Arq. Laura' from public.firmas where documento_id = (select v::uuid from ctx where k = 'fc4') and campo = 'firmaCliente'), 'la nueva firma en sitio queda en firmas';
end $$;
reset role;
-- Una fila en_sitio que quedó de antes (base en uso) se reemplaza al volver a firmar en sitio
insert into ctx select 'fc6', (select id from public.documentos where datos ->> 'asunto' = 'Campo 3');
insert into public.firmas (organizacion_id, documento_id, campo, firmante_nombre, imagen, origen)
values ('10000000-0000-0000-0000-000000000001', (select v::uuid from ctx where k = 'fc6'), 'firmaCliente', 'Viejo', 'data:image/png;base64,VIEJA', 'en_sitio');
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
update public.documentos set datos = datos || '{"firmaCliente":"data:image/png;base64,OTRA","nombreRecibe":"Nuevo"}' where id = (select v::uuid from ctx where k = 'fc6');
reset role;
do $$ begin
  assert (select imagen = 'data:image/png;base64,OTRA' and firmante_nombre = 'Nuevo' from public.firmas where documento_id = (select v::uuid from ctx where k = 'fc6') and campo = 'firmaCliente'), 'una firma en sitio vieja se reemplaza (on conflict do update)';
end $$;
-- La coordinadora rechaza fc5 (con firma en sitio): se anula; corregido, aprobado sin firma y el cliente firma en su portal
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
update public.documentos set estado = 'rechazado', motivo_rechazo = 'Falta detallar el trabajo' where id = (select v::uuid from ctx where k = 'fc5');
reset role;
do $$ begin
  assert (select estado = 'rechazado' and datos ->> 'firmaCliente' = '' from public.documentos where id = (select v::uuid from ctx where k = 'fc5')), 'rechazar anula la firma del cliente';
  assert not exists (select 1 from public.firmas where documento_id = (select v::uuid from ctx where k = 'fc5') and campo = 'firmaCliente'), 'rechazar borra la fila en_sitio';
  assert exists (select 1 from public.documento_eventos where documento_id = (select v::uuid from ctx where k = 'fc5') and accion = 'Se anuló la firma del cliente (el contenido cambió)'), 'evento de anulación al rechazar';
end $$;
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
update public.documentos set datos = datos || '{"asunto":"Campo 5 detallado"}' where id = (select v::uuid from ctx where k = 'fc5');
update public.documentos set estado = 'en_revision' where id = (select v::uuid from ctx where k = 'fc5');
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
update public.documentos set estado = 'aprobado' where id = (select v::uuid from ctx where k = 'fc5');
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000a5');
do $$ begin
  assert public.firmar_como_cliente((select v::uuid from ctx where k = 'fc5'), 'Ing. Daniel', 'data:image/png;base64,iVBORw0KGgo=') = 'cerrado', 'tras el rechazo el cliente sí firma en su portal (sin fila huérfana)';
end $$;
reset role;
-- Aprobar fc4 (firma en sitio nueva) lo cierra; cerrar un aprobado con firma en sitio deja los mismos eventos que la app
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
update public.documentos set estado = 'aprobado' where id = (select v::uuid from ctx where k = 'fc4');
reset role;
do $$ begin
  assert (select estado from public.documentos where id = (select v::uuid from ctx where k = 'fc4')) = 'cerrado', 'aprobado con la nueva firma en sitio queda cerrado';
  assert (select array_agg(accion order by created_at, id) from public.documento_eventos
          where documento_id = (select v::uuid from ctx where k = 'fc2') and accion in ('Firma del cliente en sitio', 'Cerrado con la firma del cliente en sitio'))
         = array['Firma del cliente en sitio', 'Cerrado con la firma del cliente en sitio'], 'cierre en sitio de un aprobado: «Firma del cliente en sitio» + «Cerrado con…» (como la app)';
end $$;

-- Clientes: el técnico los crea (sin duplicados) pero no los edita ni los borra
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
insert into public.clientes (id, organizacion_id, nombre, contacto)
values ('c0000000-0000-0000-0000-0000000000f1', '10000000-0000-0000-0000-000000000001', '  Ferretería  El Tornillo ', 'Marta Gómez');
do $$ begin
  insert into public.clientes (organizacion_id, nombre) values ('10000000-0000-0000-0000-000000000001', 'ferreteria el TORNILLO');
  raise exception 'FALLO: duplicó un cliente con otras mayúsculas y sin tildes';
exception when unique_violation then null; end $$;
do $$ begin
  insert into public.clientes (organizacion_id, nombre, activo) values ('10000000-0000-0000-0000-000000000001', 'Cliente inactivo', false);
  raise exception 'FALLO: el técnico creó un cliente inactivo';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.clientes (organizacion_id, nombre) values ('20000000-0000-0000-0000-000000000002', 'Intruso');
  raise exception 'FALLO: el técnico creó un cliente en otra empresa';
exception when insufficient_privilege then null; end $$;
update public.clientes set contacto = 'Otro', activo = false where id = 'c0000000-0000-0000-0000-0000000000f1';
delete from public.clientes where id = 'c0000000-0000-0000-0000-0000000000f1';
do $$ begin
  assert (select public.completar_cliente('c0000000-0000-0000-0000-0000000000f1', '{"correo":"compras@eltornillo.test","contacto":"Pedro","telefono":"12"}')).correo = 'compras@eltornillo.test', 'completa el correo vacío';
end $$;
reset role;
do $$ begin
  assert (select nombre from public.clientes where id = 'c0000000-0000-0000-0000-0000000000f1') = 'Ferretería El Tornillo', 'el nombre se guarda sin espacios de más';
  assert (select contacto from public.clientes where id = 'c0000000-0000-0000-0000-0000000000f1') = 'Marta Gómez', 'el técnico no edita ni completar_cliente sobrescribe el contacto';
  assert (select activo from public.clientes where id = 'c0000000-0000-0000-0000-0000000000f1'), 'el técnico no desactiva clientes';
  assert (select telefono from public.clientes where id = 'c0000000-0000-0000-0000-0000000000f1') = '', 'un teléfono inválido no se completa';
end $$;
-- El cliente del portal no crea clientes; otra empresa no completa los ajenos
select pg_temp.como('00000000-0000-0000-0000-0000000000a5');
do $$ begin
  insert into public.clientes (organizacion_id, nombre) values ('10000000-0000-0000-0000-000000000001', 'Desde el portal');
  raise exception 'FALLO: un usuario cliente creó clientes';
exception when insufficient_privilege then null; end $$;
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
do $$ begin
  perform public.completar_cliente('c0000000-0000-0000-0000-0000000000f1', '{"nit":"1"}');
  raise exception 'FALLO: otra empresa completó un cliente ajeno';
exception when insufficient_privilege then null; end $$;
reset role;
-- La coordinadora sí edita (y renombrar a un duplicado se rechaza)
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
do $$ begin
  update public.clientes set nombre = 'LADRILLERA arcillas del caribe' where id = 'c0000000-0000-0000-0000-0000000000f1';
  raise exception 'FALLO: renombró un cliente a uno que ya existe';
exception when unique_violation then null; end $$;
update public.clientes set contacto = 'Pedro Ruiz' where id = 'c0000000-0000-0000-0000-0000000000f1';
do $$ begin assert (select contacto from public.clientes where id = 'c0000000-0000-0000-0000-0000000000f1') = 'Pedro Ruiz', 'la coordinadora edita clientes'; end $$;
reset role;

-- Nombre comparable: los MISMOS casos los lee tests/unit/clientes.test.ts (claveNombre de la app)
-- casos clave_nombre: inicio
create temp table casos_clave (entrada text, esperado text);
insert into casos_clave values
  (E'  Ferretería  EL Tornillo ', 'ferreteria el tornillo'),
  (E'FERRETERÍA EL TORNILLO S.A.S.', 'ferreteria el tornillo'),
  (E'Ferreteria el Tornillo SAS', 'ferreteria el tornillo'),
  (E'Ferretería El Tornillo S. A. S.', 'ferreteria el tornillo'),
  (E'Ferretería El Tornillo, S.A.', 'ferreteria el tornillo'),
  (E'Constructora Prueba Ñandú', 'constructora prueba ñandu'),
  (E'constructora prueba ñandu', 'constructora prueba ñandu'),
  (E'Peña Hermanos', 'peña hermanos'),
  (E'Pena Hermanos', 'pena hermanos'),
  (E'Cigüeña Ñoño', 'cigueña ñoño'),
  (E'Inversiones López Ltda.', 'inversiones lopez'),
  (E'Comercial Díaz S. en C.', 'comercial diaz'),
  (E'Comercial Díaz S en C S', 'comercial diaz'),
  (E'Transportes Ruiz E.U.', 'transportes ruiz'),
  (E'Arcillas & Cía.', 'arcillas cia'),
  (E'O’Brien Ltda', 'obrien'),
  (E'D''Angelo Café', 'dangelo cafe'),
  (E'Café—Bar 24/7', 'cafe bar 24 7'),
  (E'Tab\tAquí y allá​', 'tab aqui y alla'),
  (E'José Pérez', 'jose perez'),
  (E'S.A.S.', 'sas'),
  (E'Sasquatch SAS', 'sasquatch'),
  (E'   ', '');
-- casos clave_nombre: fin
do $$ declare r record; begin
  for r in select * from casos_clave loop
    assert public.clave_nombre(r.entrada) = r.esperado, format('clave_nombre(%L) = %L (esperado %L)', r.entrada, public.clave_nombre(r.entrada), r.esperado);
  end loop;
end $$;
-- Con la clave nueva: «S.A.S.» no duplica, pero «Peña» y «Pena» son clientes distintos; el nombre se guarda
-- sin tabulaciones ni espacios duros
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
do $$ begin
  insert into public.clientes (organizacion_id, nombre) values ('10000000-0000-0000-0000-000000000001', 'Ferretería El Tornillo S.A.S.');
  raise exception 'FALLO: duplicó un cliente agregando la razón social';
exception when unique_violation then null; end $$;
insert into public.clientes (organizacion_id, nombre) values ('10000000-0000-0000-0000-000000000001', 'Peña Hermanos');
insert into public.clientes (organizacion_id, nombre) values ('10000000-0000-0000-0000-000000000001', E'Pena Hermanos\t');
reset role;
do $$ begin
  assert (select count(*) from public.clientes where organizacion_id = '10000000-0000-0000-0000-000000000001' and nombre in ('Peña Hermanos', 'Pena Hermanos')) = 2, '«Peña» y «Pena» no se confunden; el espacio duro y la tabulación se limpian';
end $$;
-- completar_cliente: sin auditoría si no cambió nada y no toca clientes desactivados
insert into ctx select 'aud0', (select count(*) from public.auditoria where accion = 'Completó datos del cliente')::text;
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
do $$ begin perform public.completar_cliente('c0000000-0000-0000-0000-0000000000f1', '{"contacto":"Otro"}'); end $$;
reset role;
do $$ begin
  assert (select count(*) from public.auditoria where accion = 'Completó datos del cliente')::text = (select v from ctx where k = 'aud0'), 'sin auditoría cuando no se llenó nada';
end $$;
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
update public.clientes set activo = false where nombre = 'Peña Hermanos';
do $$ begin
  assert (select public.completar_cliente((select id from public.clientes where nombre = 'Peña Hermanos'), '{"contacto":"Alguien"}')).contacto = '', 'un cliente desactivado no se completa';
end $$;
reset role;

select 'OK: todas las pruebas pasaron' as resultado;
