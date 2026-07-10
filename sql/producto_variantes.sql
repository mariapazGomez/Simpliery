-- ──────────────────────────────────────────────────────────
-- Variantes de producto
-- Ejecutar en Supabase SQL Editor (una vez)
-- ──────────────────────────────────────────────────────────

-- 1. Tabla principal
CREATE TABLE IF NOT EXISTS producto_variantes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id      UUID        NOT NULL REFERENCES negocios(id)   ON DELETE CASCADE,
  producto_id     UUID        NOT NULL REFERENCES productos(id)  ON DELETE CASCADE,
  nombre          TEXT        NOT NULL,                          -- "Trozo 500 gr"
  precio          NUMERIC(12,2) NOT NULL,                        -- precio presencial
  precio_despacho NUMERIC(12,2),                                 -- precio despacho (null = mismo que presencial)
  -- cuántas unidades base del producto padre se descuentan del stock al vender 1 u. de esta variante
  -- ej: variante "Trozo 500 gr" de un queso medido en kg → unidades_base = 0.5
  unidades_base   NUMERIC(10,4) NOT NULL DEFAULT 1,
  activo          BOOLEAN     NOT NULL DEFAULT true,
  orden           INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pv_producto_id ON producto_variantes(producto_id);
CREATE INDEX IF NOT EXISTS idx_pv_negocio_id  ON producto_variantes(negocio_id);

-- Dos variantes del mismo producto no pueden tener el mismo nombre
ALTER TABLE producto_variantes
  DROP CONSTRAINT IF EXISTS uq_pv_producto_nombre;
ALTER TABLE producto_variantes
  ADD  CONSTRAINT uq_pv_producto_nombre UNIQUE (producto_id, nombre);

-- 2. RLS (misma política que productos: acceso por negocio del perfil)
ALTER TABLE producto_variantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pv_negocio_select" ON producto_variantes;
DROP POLICY IF EXISTS "pv_negocio_insert" ON producto_variantes;
DROP POLICY IF EXISTS "pv_negocio_update" ON producto_variantes;
DROP POLICY IF EXISTS "pv_negocio_delete" ON producto_variantes;

CREATE POLICY "pv_negocio_select" ON producto_variantes FOR SELECT
  USING (negocio_id = (SELECT negocio_id FROM perfiles WHERE id = auth.uid()));

CREATE POLICY "pv_negocio_insert" ON producto_variantes FOR INSERT
  WITH CHECK (negocio_id = (SELECT negocio_id FROM perfiles WHERE id = auth.uid()));

CREATE POLICY "pv_negocio_update" ON producto_variantes FOR UPDATE
  USING (negocio_id = (SELECT negocio_id FROM perfiles WHERE id = auth.uid()));

CREATE POLICY "pv_negocio_delete" ON producto_variantes FOR DELETE
  USING (negocio_id = (SELECT negocio_id FROM perfiles WHERE id = auth.uid()));

-- 3. Columna variante_id en venta_items (nullable, no rompe nada existente)
ALTER TABLE venta_items
  ADD COLUMN IF NOT EXISTS variante_id UUID REFERENCES producto_variantes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vi_variante_id ON venta_items(variante_id)
  WHERE variante_id IS NOT NULL;
