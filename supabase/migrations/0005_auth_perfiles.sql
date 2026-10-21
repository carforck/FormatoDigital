-- ============================================================================
-- FormatoDigital — 0005 Perfil automático al registrarse
-- Cada usuario nuevo de Supabase Auth recibe su fila en `perfiles`. La
-- pertenencia a una organización (y su rol) la asigna después un admin en
-- `miembros`: registrarse no da acceso a ningún dato.
-- ============================================================================
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.perfiles (id, email, nombre)
  values (new.id, coalesce(new.email, ''), coalesce(split_part(new.email, '@', 1), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.crear_perfil() from public, anon, authenticated;

drop trigger if exists trg_crear_perfil on auth.users;
create trigger trg_crear_perfil after insert on auth.users
  for each row execute function public.crear_perfil();
