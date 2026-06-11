-- ============================================================================
--  Control Local — Tablas `recordatorios` y `notif_config` + RLS + realtime
-- ============================================================================
--  Supabase → SQL Editor → pega TODO → Run. Idempotente (puedes repetirlo).
--  - recordatorios : tareas/recordatorios de la pantalla Recordatorios.
--  - notif_config  : preferencias de la pestaña Recordatorios de Notificaciones.
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array['recordatorios', 'notif_config']
  loop
    -- Tabla (una fila por entidad, contenido en JSONB `data`)
    execute format($f$
      create table if not exists public.%I (
        id          text primary key default gen_random_uuid()::text,
        negocio_id  uuid not null references public.negocios(id) on delete cascade,
        data        jsonb not null,
        created_at  timestamptz not null default now()
      );
    $f$, t);
    execute format('create index if not exists %I on public.%I(negocio_id);', t || '_negocio_idx', t);

    -- RLS: cada negocio ve solo lo suyo
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t || '_rw', t);
    execute format($p$
      create policy %I on public.%I
        for all
        using (negocio_id = public.current_negocio_id())
        with check (negocio_id = public.current_negocio_id());
    $p$, t || '_rw', t);

    -- Permisos (las filas las filtra RLS)
    execute format('grant select, insert, update, delete on public.%I to authenticated;', t);

    -- Tiempo real (ver cambios en vivo entre usuarios)
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
