-- ============================================================================
--  B-007 / B-008 — RBAC: empleados con username+PIN y sucursales
--  Ejecutar en Supabase Dashboard › SQL Editor
-- ============================================================================

-- ─── 1. negocios.codigo ──────────────────────────────────────────────────────
ALTER TABLE public.negocios
  ADD COLUMN IF NOT EXISTS codigo TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.generar_codigo_negocio()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  chars  TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i      INT;
  tries  INT  := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.negocios WHERE codigo = result) THEN
      RETURN result;
    END IF;
    tries := tries + 1;
    IF tries > 100 THEN
      RAISE EXCEPTION 'No se pudo generar código único para negocio';
    END IF;
  END LOOP;
END;
$$;

-- Backfill: asignar código a negocios sin uno
UPDATE public.negocios
SET codigo = public.generar_codigo_negocio()
WHERE codigo IS NULL;

-- ─── 2. sucursales ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sucursales (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID        NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  nombre      TEXT        NOT NULL,
  direccion   TEXT,
  activo      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sucursales_negocio_idx ON public.sucursales(negocio_id);

ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sucursales' AND policyname='sucursales_select') THEN
    CREATE POLICY sucursales_select ON public.sucursales
      FOR SELECT USING (negocio_id = current_negocio_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sucursales' AND policyname='sucursales_insert') THEN
    CREATE POLICY sucursales_insert ON public.sucursales
      FOR INSERT WITH CHECK (negocio_id = current_negocio_id() AND current_rol() = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sucursales' AND policyname='sucursales_update') THEN
    CREATE POLICY sucursales_update ON public.sucursales
      FOR UPDATE USING (negocio_id = current_negocio_id() AND current_rol() = 'admin');
  END IF;
END $$;

-- ─── 3. perfiles: sucursal_id y username ─────────────────────────────────────
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS username    TEXT;

-- Username único por negocio (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS perfiles_username_negocio_idx
  ON public.perfiles(negocio_id, lower(username))
  WHERE username IS NOT NULL;

-- ─── 4. insertar_permisos_default ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.insertar_permisos_default(p_negocio_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  perms JSONB := '{
    "admin":    {"dashboard":true,"ventas":true,"transacciones":true,"productos":true,"inventario":true,"despachos":true,"clientes":true,"fiados":true,"finanzas":true,"reportes":true,"crecimiento":true,"proveedores":true,"configuracion":true,"usuarios":true,"cierre-caja":true,"recordatorios":true,"notificaciones":true,"segmentos":true},
    "vendedor": {"dashboard":false,"ventas":true,"transacciones":false,"productos":false,"inventario":false,"despachos":true,"clientes":true,"fiados":true,"finanzas":false,"reportes":false,"crecimiento":false,"proveedores":false,"configuracion":false,"usuarios":false,"cierre-caja":true,"recordatorios":true,"notificaciones":true,"segmentos":false},
    "bodega":   {"dashboard":false,"ventas":true,"transacciones":false,"productos":true,"inventario":true,"despachos":true,"clientes":false,"fiados":false,"finanzas":false,"reportes":false,"crecimiento":false,"proveedores":true,"configuracion":false,"usuarios":false,"cierre-caja":false,"recordatorios":true,"notificaciones":false,"segmentos":false},
    "contador": {"dashboard":true,"ventas":false,"transacciones":true,"productos":false,"inventario":false,"despachos":false,"clientes":true,"fiados":true,"finanzas":true,"reportes":true,"crecimiento":true,"proveedores":false,"configuracion":false,"usuarios":false,"cierre-caja":false,"recordatorios":false,"notificaciones":false,"segmentos":false}
  }';
  modulos TEXT[] := ARRAY[
    'dashboard','ventas','transacciones','productos','inventario',
    'despachos','clientes','fiados','finanzas','reportes','crecimiento',
    'proveedores','configuracion','usuarios','cierre-caja',
    'recordatorios','notificaciones','segmentos'
  ];
  v_rol    TEXT;
  v_modulo TEXT;
BEGIN
  FOREACH v_rol IN ARRAY ARRAY['admin','vendedor','bodega','contador'] LOOP
    FOREACH v_modulo IN ARRAY modulos LOOP
      INSERT INTO public.permisos_modulo_rol (negocio_id, rol, modulo, habilitado)
      VALUES (p_negocio_id, v_rol, v_modulo, COALESCE((perms -> v_rol ->> v_modulo)::boolean, false))
      ON CONFLICT (negocio_id, rol, modulo) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- Backfill: insertar permisos para negocios existentes
DO $$
DECLARE nid UUID;
BEGIN
  FOR nid IN SELECT id FROM public.negocios LOOP
    PERFORM public.insertar_permisos_default(nid);
  END LOOP;
END $$;
