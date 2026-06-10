-- ============================================================================
--  Control Local — Tabla `despachos` (colección por negocio) + RLS + realtime
-- ============================================================================
--  Supabase → SQL Editor → pega TODO → Run. Idempotente.
-- ============================================================================

create table if not exists public.despachos (
  id          text primary key default gen_random_uuid()::text,
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists despachos_negocio_idx on public.despachos(negocio_id);

alter table public.despachos enable row level security;
drop policy if exists despachos_rw on public.despachos;
create policy despachos_rw on public.despachos
  for all
  using (negocio_id = public.current_negocio_id())
  with check (negocio_id = public.current_negocio_id());

grant select, insert, update, delete on public.despachos to authenticated;

-- Tiempo real (para ver despachos en vivo entre usuarios)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'despachos'
  ) then
    alter publication supabase_realtime add table public.despachos;
  end if;
end $$;

-- ============================================================================
--  Fin.
-- ============================================================================
