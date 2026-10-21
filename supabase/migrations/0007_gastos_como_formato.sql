-- ============================================================================
-- FormatoDigital — 0007 Legalización de gastos como formato (FO-GSST-25)
--
-- SOTEC entregó su formato de gastos: una legalización con varios gastos, sus
-- soportes (foto de cada factura), firma del colaborador y Vo.Bo. Encaja en el
-- modelo general de documentos (flujo, historial, firmas, archivos), así que
-- la tabla provisional `gastos` de 0003 deja de usarse.
-- Los ítems viven en documentos.datos.items y las fotos en `archivos`
-- (tipo 'soporte'), igual que el registro fotográfico del reporte.
-- ============================================================================
drop table if exists public.gastos cascade;
drop function if exists public.gastos_flujo();

insert into public.formatos (organizacion_id, clave, codigo, nombre, version, fecha_version, prefijo)
select o.id, 'gasto', 'FO-GSST-25', 'Formato de legalización y registro de gastos operativos', '01', date '2020-03-01', 'LG'
from public.organizaciones o
where o.slug = 'sotec'
on conflict (organizacion_id, clave) do nothing;

-- ---------------------------------------------------------------------------
-- Formatos internos: el portal del cliente no los muestra (p. ej. los gastos
-- son de la operación interna de la empresa, aunque se carguen a su obra).
-- ---------------------------------------------------------------------------
alter table public.formatos add column if not exists visible_cliente boolean not null default true;
update public.formatos set visible_cliente = false where clave = 'gasto';

drop policy if exists documentos_ver on public.documentos;
create policy documentos_ver on public.documentos for select to authenticated
  using (
    deleted_at is null and (
      public.tiene_rol(organizacion_id, array['admin', 'supervisor'])
      or (autor_id = auth.uid() and public.es_miembro(organizacion_id))
      or (cliente_id = public.cliente_de(organizacion_id) and estado in ('aprobado', 'cerrado')
          and exists (select 1 from public.formatos f where f.id = formato_id and f.visible_cliente))
    )
  );
