-- Espacio de trabajo de la empresa (fase 1 de la conexión de la app).
-- La app guarda aquí su estado completo por organización (el mismo que la demo
-- guarda en el navegador) para compartirlo entre usuarios y equipos. Más adelante
-- cada módulo pasa a sus tablas (documentos, firmas, proyectos…) y esta tabla se retira.
--
-- Concurrencia optimista: quien guarda envía la versión que leyó; si otro guardó
-- antes, la actualización no encuentra la fila y la app recarga lo más reciente.

create table if not exists public.espacios (
  organizacion_id uuid primary key references public.organizaciones(id) on delete cascade,
  estado jsonb not null default '{}'::jsonb,
  version bigint not null default 0,
  actualizado_por uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.espacios enable row level security;

-- El equipo interno lee y guarda el espacio de su empresa; el portal del cliente aún no usa este modo.
drop policy if exists espacios_ver on public.espacios;
create policy espacios_ver on public.espacios for select to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']));

drop policy if exists espacios_guardar on public.espacios;
create policy espacios_guardar on public.espacios for update to authenticated
  using (public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']))
  with check (public.tiene_rol(organizacion_id, array['admin', 'supervisor', 'tecnico']));

-- La versión solo avanza de a uno y el autor es quien guarda (no se confía en el navegador).
create or replace function public.espacios_al_guardar()
returns trigger language plpgsql as $$
begin
  if new.version <> old.version + 1 then
    raise exception 'version_invalida' using errcode = '40001';
  end if;
  new.actualizado_por := auth.uid();
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.espacios_al_guardar() from public, anon, authenticated;

drop trigger if exists trg_espacios_guardar on public.espacios;
create trigger trg_espacios_guardar before update on public.espacios
  for each row execute function public.espacios_al_guardar();

grant select, update (estado, version) on public.espacios to authenticated;

-- Un espacio vacío por organización existente (la app lo llena la primera vez).
insert into public.espacios (organizacion_id)
select id from public.organizaciones
on conflict (organizacion_id) do nothing;
