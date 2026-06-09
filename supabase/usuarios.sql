-- ============================================================================
--  Control Local — Equipo: invitar usuarios al MISMO negocio
-- ============================================================================
--  Cómo usarlo:
--    1. Supabase → SQL Editor.
--    2. Pega TODO este archivo y dale "Run". Es idempotente (se puede repetir).
--
--  Qué hace:
--    - Agrega `email` al perfil (para listar al equipo).
--    - Crea la tabla `invitaciones`.
--    - Cambia el registro: si el correo tiene una invitación pendiente, el nuevo
--      usuario se UNE a ese negocio con el rol invitado (en vez de crear uno nuevo).
--    - Permite que un admin gestione (cambie rol / desactive / quite) a los demás
--      miembros de SU negocio.
-- ============================================================================

-- 1. Email en el perfil (para mostrar al equipo en la app)
alter table public.perfiles add column if not exists email text;

-- 2. Rol del usuario actual (SECURITY DEFINER → sin recursión en las políticas)
create or replace function public.current_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

-- 3. Tabla de invitaciones
create table if not exists public.invitaciones (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  email       text not null,
  rol         text not null default 'vendedor'
              check (rol in ('admin', 'vendedor', 'bodega', 'contador')),
  estado      text not null default 'pendiente'
              check (estado in ('pendiente', 'aceptada')),
  created_at  timestamptz not null default now()
);
create index if not exists invitaciones_negocio_idx on public.invitaciones(negocio_id);
create index if not exists invitaciones_email_idx on public.invitaciones(lower(email));

-- 4. RLS de invitaciones: el equipo puede verlas; solo un admin puede crear/borrar.
alter table public.invitaciones enable row level security;
drop policy if exists invitaciones_select on public.invitaciones;
create policy invitaciones_select on public.invitaciones
  for select using (negocio_id = public.current_negocio_id());
drop policy if exists invitaciones_admin on public.invitaciones;
create policy invitaciones_admin on public.invitaciones
  for all
  using (negocio_id = public.current_negocio_id() and public.current_rol() = 'admin')
  with check (negocio_id = public.current_negocio_id() and public.current_rol() = 'admin');

-- 5. Un admin puede gestionar los perfiles de SU negocio (cambiar rol, desactivar).
drop policy if exists perfiles_admin_update on public.perfiles;
create policy perfiles_admin_update on public.perfiles
  for update
  using (negocio_id = public.current_negocio_id() and public.current_rol() = 'admin')
  with check (negocio_id = public.current_negocio_id());
-- Un admin puede quitar a otro miembro (no a sí mismo).
drop policy if exists perfiles_admin_delete on public.perfiles;
create policy perfiles_admin_delete on public.perfiles
  for delete
  using (negocio_id = public.current_negocio_id() and public.current_rol() = 'admin' and id <> auth.uid());

-- 6. Registro: si hay invitación pendiente para el correo, unir a ESE negocio.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nid uuid;
  inv public.invitaciones%rowtype;
begin
  -- ¿Hay una invitación pendiente para este correo?
  select * into inv
  from public.invitaciones
  where lower(email) = lower(new.email) and estado = 'pendiente'
  order by created_at desc
  limit 1;

  if inv.id is not null then
    -- Unir al usuario al negocio que lo invitó, con el rol asignado.
    insert into public.perfiles (id, negocio_id, nombre, email, rol)
    values (
      new.id,
      inv.negocio_id,
      coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
      new.email,
      inv.rol
    );
    update public.invitaciones set estado = 'aceptada' where id = inv.id;
    return new;
  end if;

  -- Sin invitación: crear su propio negocio (comportamiento normal).
  insert into public.negocios (nombre) values ('Mi negocio') returning id into nid;

  insert into public.perfiles (id, negocio_id, nombre, email, rol)
  values (
    new.id,
    nid,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    'admin'
  );

  insert into public.configuracion (negocio_id, data)
  values (nid, jsonb_build_object(
    'business', 'Mi negocio',
    'currency', 'Peso chileno (CLP)',
    'methods', jsonb_build_array('Efectivo', 'Transferencia', 'Tarjeta'),
    'minStockDefault', 5,
    'minMargin', 20
  ));

  insert into public.categorias (negocio_id, lista)
  values (nid, jsonb_build_array('Abarrotes', 'Bebidas', 'Limpieza', 'Otros'));

  return new;
end;
$$;

-- (El trigger on_auth_user_created ya existe del esquema base y usa esta función.)

-- ============================================================================
--  Fin.
-- ============================================================================
