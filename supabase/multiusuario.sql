-- ============================================================================
--  Control Local — Seguridad multi-usuario (boleta atómica + tiempo real)
-- ============================================================================
--  Cómo usarlo: Supabase → SQL Editor → pega TODO → Run. Idempotente.
--  Resuelve: boletas duplicadas entre vendedores y datos desactualizados.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  1. Folios: numeración de boleta atómica por negocio (sin duplicados)
-- ----------------------------------------------------------------------------
create table if not exists public.folios (
  negocio_id uuid primary key references public.negocios(id) on delete cascade,
  ultimo     bigint not null default 46209
);

alter table public.folios enable row level security;
drop policy if exists folios_rw on public.folios;
create policy folios_rw on public.folios
  for all
  using (negocio_id = public.current_negocio_id())
  with check (negocio_id = public.current_negocio_id());
grant select, insert, update, delete on public.folios to authenticated;

-- Inicializa el contador desde las ventas que ya existen (para no repetir números).
insert into public.folios (negocio_id, ultimo)
select negocio_id, max((data->>'boleta')::bigint)
from public.ventas
where data ? 'boleta'
group by negocio_id
on conflict (negocio_id) do update set ultimo = greatest(public.folios.ultimo, excluded.ultimo);

-- Devuelve el siguiente folio de forma atómica (una sola operación, sin carreras).
create or replace function public.siguiente_boleta()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  nid uuid := public.current_negocio_id();
  n bigint;
begin
  insert into public.folios (negocio_id, ultimo) values (nid, 46210)
    on conflict (negocio_id) do update set ultimo = public.folios.ultimo + 1
    returning ultimo into n;
  return n;
end;
$$;
grant execute on function public.siguiente_boleta() to authenticated;

-- ----------------------------------------------------------------------------
--  2. Tiempo real: publicar las tablas para que los cambios lleguen en vivo
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'productos', 'ventas', 'clientes', 'movimientos', 'gastos', 'nomina',
    'marketing', 'metas', 'creditos', 'proveedores', 'cierres', 'formatos',
    'configuracion', 'categorias', 'folios'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ============================================================================
--  Fin.
-- ============================================================================
