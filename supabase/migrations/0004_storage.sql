-- ============================================================================
-- FormatoDigital — 0004 Almacenamiento (solo Supabase)
--
-- Bucket privado "archivos": fotos del registro fotográfico, soportes de
-- gastos y PDFs. Ruta: {organizacion_id}/{documento_o_orden_id}/{archivo}.
-- Cada usuario solo accede a la carpeta de las organizaciones de las que es
-- miembro. En un PostgreSQL sin Supabase este archivo no hace nada.
-- ============================================================================
do $migracion$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise notice 'Sin esquema storage (no es Supabase): se omite 0004_storage';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('archivos', 'archivos', false, 8 * 1024 * 1024,
          array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
  on conflict (id) do nothing;

  execute $p$
    create policy archivos_leer on storage.objects for select to authenticated
    using (bucket_id = 'archivos' and public.es_miembro(((storage.foldername(name))[1])::uuid))
  $p$;
  execute $p$
    create policy archivos_subir on storage.objects for insert to authenticated
    with check (bucket_id = 'archivos'
                and public.tiene_rol(((storage.foldername(name))[1])::uuid, array['admin', 'supervisor', 'tecnico']))
  $p$;
  execute $p$
    create policy archivos_borrar on storage.objects for delete to authenticated
    using (bucket_id = 'archivos'
           and (owner = auth.uid() or public.tiene_rol(((storage.foldername(name))[1])::uuid, array['admin', 'supervisor'])))
  $p$;
end
$migracion$;
