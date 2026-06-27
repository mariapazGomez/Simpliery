-- ============================================================================
--  Control Local v2 — Esquema OLTP (Supabase / PostgreSQL)
-- ============================================================================
--  Modelo relacional normalizado. Multi-tenant por negocio_id.
--  • Todos los IDs son UUID generados por la BD.
--  • Jerarquías expresadas por FK, no embebidas en el ID.
--  • RLS activo en todas las tablas: el aislamiento lo impone la BD.
--  • updated_at se actualiza automáticamente vía trigger set_updated_at().
--  • Sin triggers de lógica de negocio (stock, etc.): se agregan módulo a módulo.
--
--  Orden de creación:
--    1. set_updated_at()          ← sin dependencias de tabla
--    2. negocios + perfiles       ← base de identidad
--    3. current_negocio_id/rol()  ← LANGUAGE SQL: necesita perfiles existente
--    4. resto de tablas           ← en orden de dependencias FK
--    5. siguiente_boleta()        ← necesita folios existente
--    6. RLS, grants, realtime
--    7. handle_new_user()         ← necesita todas las tablas
--
--  Idempotente: se puede correr más de una vez sin romper datos existentes.
-- ============================================================================


-- ============================================================================
--  1. Función auxiliar sin dependencias de tabla
-- ============================================================================

-- Actualiza updated_at antes de cada UPDATE (LANGUAGE plpgsql: sin validación de tabla).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ============================================================================
--  2. Identidad base: negocios y perfiles
--     (deben existir antes de definir current_negocio_id / current_rol)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.negocios (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT        NOT NULL DEFAULT 'Mi negocio',
  rut        TEXT,
  telefono   TEXT,
  correo     TEXT,
  direccion  TEXT,
  ciudad     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS negocios_updated_at ON public.negocios;
CREATE TRIGGER negocios_updated_at
  BEFORE UPDATE ON public.negocios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.perfiles (
  id         UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  negocio_id UUID    NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  nombre     TEXT,
  email      TEXT,
  rol        TEXT    NOT NULL DEFAULT 'admin'
             CHECK (rol IN ('admin','vendedor','bodega','contador')),
  activo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS perfiles_negocio_idx ON public.perfiles(negocio_id);
CREATE INDEX IF NOT EXISTS perfiles_email_idx   ON public.perfiles(lower(email)) WHERE email IS NOT NULL;

DROP TRIGGER IF EXISTS perfiles_updated_at ON public.perfiles;
CREATE TRIGGER perfiles_updated_at
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
--  3. Funciones auxiliares que dependen de perfiles
--     (LANGUAGE SQL: PostgreSQL valida las tablas referenciadas al crear la función)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_negocio_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT negocio_id FROM public.perfiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_rol()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid();
$$;


-- ============================================================================
--  4. Resto de identidad y acceso
-- ============================================================================

-- Permisos por rol configurables desde la app (no hardcodeados en código).
CREATE TABLE IF NOT EXISTS public.permisos_modulo_rol (
  negocio_id UUID    NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  rol        TEXT    NOT NULL,
  modulo     TEXT    NOT NULL,
  habilitado BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (negocio_id, rol, modulo)
);

CREATE INDEX IF NOT EXISTS permisos_negocio_rol_idx ON public.permisos_modulo_rol(negocio_id, rol);

-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invitaciones (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID        NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  rol        TEXT        NOT NULL DEFAULT 'vendedor'
             CHECK (rol IN ('admin','vendedor','bodega','contador')),
  estado     TEXT        NOT NULL DEFAULT 'pendiente'
             CHECK (estado IN ('pendiente','aceptada','expirada')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invitaciones_negocio_idx ON public.invitaciones(negocio_id);
CREATE INDEX IF NOT EXISTS invitaciones_email_idx   ON public.invitaciones(lower(email));


-- ============================================================================
--  5. Configuración
-- ============================================================================

-- Singleton por negocio. Columnas tipadas; sin JSONB.
CREATE TABLE IF NOT EXISTS public.configuracion (
  negocio_id           UUID    PRIMARY KEY REFERENCES public.negocios(id) ON DELETE CASCADE,
  nombre_negocio       TEXT    NOT NULL DEFAULT 'Mi negocio',
  moneda               TEXT    NOT NULL DEFAULT 'CLP',
  metodos_pago         TEXT[]  NOT NULL DEFAULT ARRAY['Efectivo','Transferencia','Tarjeta'],
  stock_minimo_default INT     NOT NULL DEFAULT 5,
  margen_minimo        INT     NOT NULL DEFAULT 20,
  owner_nombre         TEXT,
  owner_rol            TEXT,
  notif_stock_bajo     BOOLEAN NOT NULL DEFAULT true,
  notif_metas          BOOLEAN NOT NULL DEFAULT true,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS configuracion_updated_at ON public.configuracion;
CREATE TRIGGER configuracion_updated_at
  BEFORE UPDATE ON public.configuracion
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------

-- Tabla propia (reemplaza el array JSON del esquema anterior).
CREATE TABLE IF NOT EXISTS public.categorias (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID        NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  nombre     TEXT        NOT NULL,
  orden      INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS categorias_negocio_orden_idx ON public.categorias(negocio_id, orden);

-- --------------------------------------------------------------------------

-- Contador atómico de boleta por negocio.
CREATE TABLE IF NOT EXISTS public.folios (
  negocio_id UUID   PRIMARY KEY REFERENCES public.negocios(id) ON DELETE CASCADE,
  ultimo     BIGINT NOT NULL DEFAULT 0
);

-- siguiente_boleta() se define aquí porque necesita que folios exista.
CREATE OR REPLACE FUNCTION public.siguiente_boleta()
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  nid UUID   := public.current_negocio_id();
  n   BIGINT;
BEGIN
  INSERT INTO public.folios (negocio_id, ultimo) VALUES (nid, 1)
    ON CONFLICT (negocio_id)
    DO UPDATE SET ultimo = public.folios.ultimo + 1
    RETURNING ultimo INTO n;
  RETURN n;
END;
$$;


-- ============================================================================
--  6. Catálogo
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.productos (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id      UUID          NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  nombre          TEXT          NOT NULL,
  categoria       TEXT          NOT NULL DEFAULT 'Sin categoría',
  unidad          TEXT          NOT NULL DEFAULT 'Unidad'
                  CHECK (unidad IN ('Unidad','kg','gramo','litro','mililitro','caja','paquete')),
  costo           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
  precio          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  stock           NUMERIC(14,3) NOT NULL DEFAULT 0,
  stock_minimo    INT           NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
  foto_url        TEXT,
  kg_por_unidad   NUMERIC(12,4),
  precio_despacho NUMERIC(14,2),
  orden           INT           NOT NULL DEFAULT 0,
  activo          BOOLEAN       NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS productos_negocio_idx           ON public.productos(negocio_id);
CREATE INDEX IF NOT EXISTS productos_negocio_categoria_idx ON public.productos(negocio_id, categoria) WHERE activo = true;
CREATE INDEX IF NOT EXISTS productos_negocio_nombre_idx    ON public.productos(negocio_id, lower(nombre));

DROP TRIGGER IF EXISTS productos_updated_at ON public.productos;
CREATE TRIGGER productos_updated_at
  BEFORE UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.formatos (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id      UUID          NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  producto_id     UUID          NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  nombre          TEXT          NOT NULL,
  qty             NUMERIC(12,4) NOT NULL CHECK (qty > 0),
  precio          NUMERIC(14,2) NOT NULL CHECK (precio >= 0),
  canal           TEXT          NOT NULL DEFAULT 'ambos'
                  CHECK (canal IN ('local','despacho','ambos')),
  precio_despacho NUMERIC(14,2),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS formatos_negocio_idx  ON public.formatos(negocio_id);
CREATE INDEX IF NOT EXISTS formatos_producto_idx ON public.formatos(producto_id);


-- ============================================================================
--  7. Clientes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.clientes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID        NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  nombre     TEXT        NOT NULL,
  telefono   TEXT,
  correo     TEXT,
  ciudad     TEXT,
  direccion  TEXT,
  depto      TEXT,
  nota       TEXT,
  activo     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clientes_negocio_idx        ON public.clientes(negocio_id);
CREATE INDEX IF NOT EXISTS clientes_negocio_nombre_idx ON public.clientes(negocio_id, lower(nombre));

DROP TRIGGER IF EXISTS clientes_updated_at ON public.clientes;
CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
--  8. Ventas
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ventas (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id        UUID          NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  boleta            BIGINT        NOT NULL,
  fecha             TIMESTAMPTZ   NOT NULL DEFAULT now(),
  tipo              TEXT          NOT NULL DEFAULT 'local'
                    CHECK (tipo IN ('local','despacho')),
  cliente_id        UUID          REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_snapshot  JSONB,
  metodo_pago       TEXT          NOT NULL,
  total             NUMERIC(14,2) NOT NULL CHECK (total >= 0),
  costo             NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
  ganancia          NUMERIC(14,2) NOT NULL DEFAULT 0,
  credito           BOOLEAN       NOT NULL DEFAULT false,
  pagado            BOOLEAN       NOT NULL DEFAULT true,
  monto_pendiente   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monto_pendiente >= 0),
  descuento_tipo    TEXT          CHECK (descuento_tipo IN ('pct','fixed')),
  descuento_valor   NUMERIC(14,2),
  descuento_monto   NUMERIC(14,2),
  pago_mixto_metodo TEXT,
  pago_mixto_monto  NUMERIC(14,2),
  anulada           BOOLEAN       NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (negocio_id, boleta)
);

CREATE INDEX IF NOT EXISTS ventas_negocio_fecha_idx     ON public.ventas(negocio_id, fecha DESC);
CREATE INDEX IF NOT EXISTS ventas_negocio_cliente_idx   ON public.ventas(negocio_id, cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ventas_credito_pendiente_idx ON public.ventas(negocio_id, pagado) WHERE credito = true AND pagado = false;
CREATE INDEX IF NOT EXISTS ventas_negocio_tipo_idx      ON public.ventas(negocio_id, tipo, fecha DESC);

DROP TRIGGER IF EXISTS ventas_updated_at ON public.ventas;
CREATE TRIGGER ventas_updated_at
  BEFORE UPDATE ON public.ventas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.venta_items (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id    UUID          NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  venta_id      UUID          NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  producto_id   UUID          REFERENCES public.productos(id) ON DELETE SET NULL,
  nombre        TEXT          NOT NULL,
  categoria     TEXT          NOT NULL,
  qty           NUMERIC(12,4) NOT NULL CHECK (qty > 0),
  precio        NUMERIC(14,2) NOT NULL CHECK (precio >= 0),
  costo         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
  formato_id    UUID          REFERENCES public.formatos(id) ON DELETE SET NULL,
  unidades_base NUMERIC(12,4),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS venta_items_venta_idx    ON public.venta_items(venta_id);
CREATE INDEX IF NOT EXISTS venta_items_producto_idx ON public.venta_items(negocio_id, producto_id) WHERE producto_id IS NOT NULL;

-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.venta_pagos (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID          NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  venta_id   UUID          NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  fecha      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  monto      NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  metodo     TEXT          NOT NULL,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS venta_pagos_venta_idx ON public.venta_pagos(venta_id);


-- ============================================================================
--  9. Stock
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.movimientos_stock (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID          NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  fecha       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  producto_id UUID          NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  tipo        TEXT          NOT NULL
              CHECK (tipo IN ('entrada','salida','ajuste','venta','devolucion')),
  qty         NUMERIC(12,4) NOT NULL,
  nota        TEXT,
  venta_id    UUID          REFERENCES public.ventas(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS movimientos_negocio_producto_idx ON public.movimientos_stock(negocio_id, producto_id, fecha DESC);
CREATE INDEX IF NOT EXISTS movimientos_venta_idx            ON public.movimientos_stock(venta_id) WHERE venta_id IS NOT NULL;


-- ============================================================================
--  10. Despachos
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.despachos (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id       UUID          NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  venta_id         UUID          REFERENCES public.ventas(id) ON DELETE SET NULL,
  boleta           BIGINT,
  fecha            DATE          NOT NULL DEFAULT CURRENT_DATE,
  cliente_nombre   TEXT          NOT NULL,
  telefono         TEXT,
  correo           TEXT,
  direccion        TEXT          NOT NULL,
  depto            TEXT,
  ciudad           TEXT          NOT NULL,
  nota             TEXT,
  repartidor       TEXT,
  estado           TEXT          NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente','en_ruta','entregado','no_entregado')),
  total            NUMERIC(14,2) NOT NULL CHECK (total >= 0),
  metodo_pago      TEXT,
  optiroute_id     TEXT,
  tracking_url     TEXT,
  tracking_code    TEXT,
  optiroute_status INT,
  enviado_en       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS despachos_negocio_idx        ON public.despachos(negocio_id);
CREATE INDEX IF NOT EXISTS despachos_negocio_estado_idx ON public.despachos(negocio_id, estado, fecha DESC);
CREATE INDEX IF NOT EXISTS despachos_venta_idx          ON public.despachos(venta_id) WHERE venta_id IS NOT NULL;

DROP TRIGGER IF EXISTS despachos_updated_at ON public.despachos;
CREATE TRIGGER despachos_updated_at
  BEFORE UPDATE ON public.despachos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.despacho_items (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id    UUID          NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  despacho_id   UUID          NOT NULL REFERENCES public.despachos(id) ON DELETE CASCADE,
  venta_item_id UUID          REFERENCES public.venta_items(id) ON DELETE SET NULL,
  producto_id   UUID          REFERENCES public.productos(id) ON DELETE SET NULL,
  nombre        TEXT          NOT NULL,
  qty           NUMERIC(12,4) NOT NULL CHECK (qty > 0),
  precio        NUMERIC(14,2) NOT NULL CHECK (precio >= 0),
  costo         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS despacho_items_despacho_idx ON public.despacho_items(despacho_id);


-- ============================================================================
--  11. Finanzas
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gastos (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id           UUID          NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  fecha                DATE          NOT NULL,
  categoria            TEXT          NOT NULL,
  descripcion          TEXT          NOT NULL,
  monto                NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  metodo               TEXT          NOT NULL,
  recurrente           BOOLEAN       NOT NULL DEFAULT false,
  proveedor            TEXT,
  estado               TEXT          NOT NULL DEFAULT 'pagado'
                       CHECK (estado IN ('pagado','pendiente')),
  respaldo             BOOLEAN       NOT NULL DEFAULT true,
  periodo              TEXT,
  recurrente_origen_id UUID          REFERENCES public.gastos(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gastos_negocio_fecha_idx ON public.gastos(negocio_id, fecha DESC);
CREATE INDEX IF NOT EXISTS gastos_pendientes_idx    ON public.gastos(negocio_id, estado) WHERE estado = 'pendiente';

DROP TRIGGER IF EXISTS gastos_updated_at ON public.gastos;
CREATE TRIGGER gastos_updated_at
  BEFORE UPDATE ON public.gastos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.nomina (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID          NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  nombre     TEXT          NOT NULL,
  cargo      TEXT          NOT NULL,
  tipo       TEXT          NOT NULL,
  monto      NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  dia        INT           NOT NULL CHECK (dia BETWEEN 1 AND 31),
  estado     TEXT          NOT NULL DEFAULT 'pendiente'
             CHECK (estado IN ('pagado','pendiente')),
  horas      NUMERIC(8,2)  NOT NULL DEFAULT 0,
  bono       NUMERIC(14,2) NOT NULL DEFAULT 0,
  periodo    TEXT,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nomina_negocio_idx ON public.nomina(negocio_id);

DROP TRIGGER IF EXISTS nomina_updated_at ON public.nomina;
CREATE TRIGGER nomina_updated_at
  BEFORE UPDATE ON public.nomina
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.marketing (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id       UUID          NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  campana          TEXT          NOT NULL,
  canal            TEXT          NOT NULL,
  fecha            DATE          NOT NULL,
  monto            NUMERIC(14,2) NOT NULL CHECK (monto >= 0),
  ventas_generadas NUMERIC(14,2) NOT NULL DEFAULT 0,
  clientes_nuevos  INT           NOT NULL DEFAULT 0,
  obs              TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_negocio_fecha_idx ON public.marketing(negocio_id, fecha DESC);

-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.metas (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id      UUID          NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  nombre          TEXT          NOT NULL,
  monto           NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  fecha_objetivo  DATE          NOT NULL,
  saldo_actual    NUMERIC(14,2) NOT NULL DEFAULT 0,
  aporte_esperado NUMERIC(14,2) NOT NULL DEFAULT 0,
  prioridad       TEXT          NOT NULL DEFAULT 'media'
                  CHECK (prioridad IN ('alta','media','baja')),
  color           TEXT          NOT NULL DEFAULT '#6B7280',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS metas_negocio_idx ON public.metas(negocio_id);

DROP TRIGGER IF EXISTS metas_updated_at ON public.metas;
CREATE TRIGGER metas_updated_at
  BEFORE UPDATE ON public.metas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.creditos (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id     UUID          NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  acreedor       TEXT          NOT NULL,
  tipo           TEXT          NOT NULL,
  monto_original NUMERIC(14,2) NOT NULL CHECK (monto_original > 0),
  saldo          NUMERIC(14,2) NOT NULL CHECK (saldo >= 0),
  tasa_anual     NUMERIC(8,4)  NOT NULL DEFAULT 0,
  cuota_mensual  NUMERIC(14,2) NOT NULL DEFAULT 0,
  proxima_cuota  DATE,
  estado         TEXT          NOT NULL DEFAULT 'vigente'
                 CHECK (estado IN ('vigente','pagado','atrasado')),
  notas          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creditos_negocio_idx        ON public.creditos(negocio_id);
CREATE INDEX IF NOT EXISTS creditos_negocio_estado_idx ON public.creditos(negocio_id, estado) WHERE estado != 'pagado';

DROP TRIGGER IF EXISTS creditos_updated_at ON public.creditos;
CREATE TRIGGER creditos_updated_at
  BEFORE UPDATE ON public.creditos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.credito_pagos (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id    UUID          NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  credito_id    UUID          NOT NULL REFERENCES public.creditos(id) ON DELETE CASCADE,
  fecha         DATE          NOT NULL,
  monto         NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  nota          TEXT,
  interes       NUMERIC(14,2),
  amortizacion  NUMERIC(14,2),
  saldo_antes   NUMERIC(14,2),
  saldo_despues NUMERIC(14,2),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credito_pagos_credito_idx ON public.credito_pagos(credito_id);


-- ============================================================================
--  12. Operaciones
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.proveedores (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID        NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  nombre     TEXT        NOT NULL,
  contacto   TEXT,
  telefono   TEXT,
  correo     TEXT,
  categoria  TEXT,
  notas      TEXT,
  activo     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proveedores_negocio_idx ON public.proveedores(negocio_id);

DROP TRIGGER IF EXISTS proveedores_updated_at ON public.proveedores;
CREATE TRIGGER proveedores_updated_at
  BEFORE UPDATE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cierres_caja (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id      UUID          NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  fecha           DATE          NOT NULL,
  total_ventas    NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_gastos    NUMERIC(14,2) NOT NULL DEFAULT 0,
  efectivo_inicio NUMERIC(14,2) NOT NULL DEFAULT 0,
  efectivo_final  NUMERIC(14,2) NOT NULL DEFAULT 0,
  diferencia      NUMERIC(14,2) NOT NULL DEFAULT 0,
  observaciones   TEXT,
  created_by      UUID          REFERENCES public.perfiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (negocio_id, fecha)
);

CREATE INDEX IF NOT EXISTS cierres_caja_negocio_idx ON public.cierres_caja(negocio_id, fecha DESC);

-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.recordatorios (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID        NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  titulo      TEXT        NOT NULL,
  descripcion TEXT,
  fecha       TIMESTAMPTZ NOT NULL,
  completado  BOOLEAN     NOT NULL DEFAULT false,
  created_by  UUID        REFERENCES public.perfiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recordatorios_negocio_fecha_idx ON public.recordatorios(negocio_id, fecha, completado);

DROP TRIGGER IF EXISTS recordatorios_updated_at ON public.recordatorios;
CREATE TRIGGER recordatorios_updated_at
  BEFORE UPDATE ON public.recordatorios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
--  13. Row Level Security
-- ============================================================================

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'negocios','perfiles','permisos_modulo_rol','invitaciones',
    'configuracion','categorias','folios',
    'productos','formatos',
    'clientes',
    'ventas','venta_items','venta_pagos',
    'movimientos_stock',
    'despachos','despacho_items',
    'gastos','nomina','marketing','metas','creditos','credito_pagos',
    'proveedores','cierres_caja','recordatorios'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- ── negocios ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS negocios_select ON public.negocios;
DROP POLICY IF EXISTS negocios_update ON public.negocios;

CREATE POLICY negocios_select ON public.negocios
  FOR SELECT USING (id = public.current_negocio_id());

CREATE POLICY negocios_update ON public.negocios
  FOR UPDATE
  USING  (id = public.current_negocio_id() AND public.current_rol() = 'admin')
  WITH CHECK (id = public.current_negocio_id());

-- ── perfiles ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS perfiles_select       ON public.perfiles;
DROP POLICY IF EXISTS perfiles_update_self  ON public.perfiles;
DROP POLICY IF EXISTS perfiles_update_admin ON public.perfiles;
DROP POLICY IF EXISTS perfiles_delete_admin ON public.perfiles;

CREATE POLICY perfiles_select ON public.perfiles
  FOR SELECT USING (id = auth.uid() OR negocio_id = public.current_negocio_id());

CREATE POLICY perfiles_update_self ON public.perfiles
  FOR UPDATE
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid() AND negocio_id = public.current_negocio_id());

CREATE POLICY perfiles_update_admin ON public.perfiles
  FOR UPDATE
  USING  (negocio_id = public.current_negocio_id() AND public.current_rol() = 'admin')
  WITH CHECK (negocio_id = public.current_negocio_id());

CREATE POLICY perfiles_delete_admin ON public.perfiles
  FOR DELETE
  USING (negocio_id = public.current_negocio_id()
    AND public.current_rol() = 'admin'
    AND id <> auth.uid());

-- ── permisos_modulo_rol ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS permisos_select       ON public.permisos_modulo_rol;
DROP POLICY IF EXISTS permisos_insert_admin ON public.permisos_modulo_rol;
DROP POLICY IF EXISTS permisos_update_admin ON public.permisos_modulo_rol;
DROP POLICY IF EXISTS permisos_delete_admin ON public.permisos_modulo_rol;

CREATE POLICY permisos_select ON public.permisos_modulo_rol
  FOR SELECT USING (negocio_id = public.current_negocio_id());

CREATE POLICY permisos_insert_admin ON public.permisos_modulo_rol
  FOR INSERT WITH CHECK (negocio_id = public.current_negocio_id() AND public.current_rol() = 'admin');

CREATE POLICY permisos_update_admin ON public.permisos_modulo_rol
  FOR UPDATE
  USING  (negocio_id = public.current_negocio_id() AND public.current_rol() = 'admin')
  WITH CHECK (negocio_id = public.current_negocio_id());

CREATE POLICY permisos_delete_admin ON public.permisos_modulo_rol
  FOR DELETE USING (negocio_id = public.current_negocio_id() AND public.current_rol() = 'admin');

-- ── invitaciones ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS invitaciones_select ON public.invitaciones;
DROP POLICY IF EXISTS invitaciones_admin  ON public.invitaciones;

CREATE POLICY invitaciones_select ON public.invitaciones
  FOR SELECT USING (negocio_id = public.current_negocio_id());

CREATE POLICY invitaciones_admin ON public.invitaciones
  FOR ALL
  USING  (negocio_id = public.current_negocio_id() AND public.current_rol() = 'admin')
  WITH CHECK (negocio_id = public.current_negocio_id() AND public.current_rol() = 'admin');

-- ── Resto de tablas: acceso completo al negocio (4 políticas explícitas) ──────
DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'configuracion','categorias','folios',
    'productos','formatos',
    'clientes',
    'ventas','venta_items','venta_pagos',
    'movimientos_stock',
    'despachos','despacho_items',
    'gastos','nomina','marketing','metas','creditos','credito_pagos',
    'proveedores','cierres_caja','recordatorios'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_delete', t);

    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR SELECT
        USING (negocio_id = public.current_negocio_id());
    $p$, t||'_select', t);

    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR INSERT
        WITH CHECK (negocio_id = public.current_negocio_id());
    $p$, t||'_insert', t);

    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR UPDATE
        USING  (negocio_id = public.current_negocio_id())
        WITH CHECK (negocio_id = public.current_negocio_id());
    $p$, t||'_update', t);

    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR DELETE
        USING (negocio_id = public.current_negocio_id());
    $p$, t||'_delete', t);
  END LOOP;
END $$;


-- ============================================================================
--  14. Grants
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_negocio_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_rol()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.siguiente_boleta()   TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;


-- ============================================================================
--  15. Realtime
-- ============================================================================

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'productos','ventas','venta_items',
    'despachos','despacho_items',
    'clientes','recordatorios','perfiles','movimientos_stock'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;


-- ============================================================================
--  16. Auto-provisión al registrar un usuario nuevo
--
--  ELIMINADO: la provisión (negocio + perfil + config + categorías + folios)
--  se hace desde la app en src/lib/actions/provision.ts usando el admin client.
--  Ejecutar en Supabase para limpiar si el trigger ya estaba instalado:
--
--    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--    DROP FUNCTION IF EXISTS public.handle_new_user();
--
-- ============================================================================


-- ============================================================================
--  Fin del esquema v2.
-- ============================================================================
