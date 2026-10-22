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

select 'OK: todas las pruebas pasaron' as resultado;
