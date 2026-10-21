-- ============================================================================
-- Datos iniciales del piloto: organización SOTEC, sus formatos y clientes.
-- Los usuarios se crean desde Supabase Auth (invitación por correo) y luego se
-- agregan a `miembros` con su rol.
-- ============================================================================
insert into public.organizaciones (slug, nombre, nit, config)
values ('sotec', 'SOTEC', '', '{"vigenciaPermisoHoras": 12, "exigirFirmaCliente": true}')
on conflict (slug) do nothing;

with o as (select id from public.organizaciones where slug = 'sotec')
insert into public.formatos (organizacion_id, clave, codigo, nombre, version, fecha_version, prefijo)
select o.id, f.clave, f.codigo, f.nombre, f.version, f.fecha::date, f.prefijo
from o, (values
  ('reporte',      'FO-GSST-22', 'Formato de reporte técnico', '01', '2020-03-01', 'RT'),
  ('permiso',      'F-GSST-13',  'Permiso de trabajo',         '01', '2019-03-01', 'PT'),
  ('cuenta_cobro', 'CC-01',      'Cuenta de cobro',            '01', null,         'CC'),
  ('orden',        'OS-01',      'Orden de servicio',          '01', null,         'OS'),
  ('gasto',        'FO-GSST-25', 'Formato de legalización y registro de gastos operativos', '01', '2020-03-01', 'LG')
) as f(clave, codigo, nombre, version, fecha, prefijo)
on conflict (organizacion_id, clave) do nothing;

update public.formatos set visible_cliente = false where clave = 'gasto';

with o as (select id from public.organizaciones where slug = 'sotec')
insert into public.clientes (organizacion_id, nombre, direccion, contacto, cargo, correo, telefono)
select o.id, c.* from o, (values
  ('Ladrillera Arcillas del Caribe', 'Pasacaballos, Cartagena', 'Ing. José', 'Ing. sistemas', 'sistemas@arcillas.example', '3000000000')
) as c(nombre, direccion, contacto, cargo, correo, telefono)
on conflict (organizacion_id, nombre) do nothing;
