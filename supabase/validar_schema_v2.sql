-- ============================================================================
--  Validación del schema_v2 — ejecutar en Supabase SQL Editor
--  Cada bloque devuelve una tabla de resultados con estado OK / FALTA
-- ============================================================================

-- ----------------------------------------------------------------------------
--  1. Tablas
-- ----------------------------------------------------------------------------
SELECT
  t.expected                              AS tabla,
  CASE WHEN c.relname IS NOT NULL
       THEN '✅ OK' ELSE '❌ FALTA' END   AS estado
FROM (VALUES
  ('negocios'),('perfiles'),('permisos_modulo_rol'),('invitaciones'),
  ('configuracion'),('categorias'),('folios'),
  ('productos'),('formatos'),
  ('clientes'),
  ('ventas'),('venta_items'),('venta_pagos'),
  ('movimientos_stock'),
  ('despachos'),('despacho_items'),
  ('gastos'),('nomina'),('marketing'),('metas'),('creditos'),('credito_pagos'),
  ('proveedores'),('cierres_caja'),('recordatorios')
) AS t(expected)
LEFT JOIN pg_class c
  ON c.relname = t.expected
 AND c.relnamespace = 'public'::regnamespace
 AND c.relkind = 'r'
ORDER BY estado, tabla;

-- ----------------------------------------------------------------------------
--  2. Funciones
-- ----------------------------------------------------------------------------
SELECT
  f.expected                              AS funcion,
  CASE WHEN p.proname IS NOT NULL
       THEN '✅ OK' ELSE '❌ FALTA' END   AS estado
FROM (VALUES
  ('current_negocio_id'),
  ('current_rol'),
  ('set_updated_at'),
  ('siguiente_boleta'),
  ('handle_new_user')
) AS f(expected)
LEFT JOIN pg_proc p
  ON p.proname = f.expected
 AND p.pronamespace = 'public'::regnamespace
ORDER BY estado, funcion;

-- ----------------------------------------------------------------------------
--  3. Triggers en tablas de la app
-- ----------------------------------------------------------------------------
SELECT
  e.tabla                                 AS tabla,
  e.trigger                               AS trigger_esperado,
  CASE WHEN t.tgname IS NOT NULL
       THEN '✅ OK' ELSE '❌ FALTA' END   AS estado
FROM (VALUES
  ('negocios',      'negocios_updated_at'),
  ('perfiles',      'perfiles_updated_at'),
  ('configuracion', 'configuracion_updated_at'),
  ('productos',     'productos_updated_at'),
  ('clientes',      'clientes_updated_at'),
  ('ventas',        'ventas_updated_at'),
  ('despachos',     'despachos_updated_at'),
  ('gastos',        'gastos_updated_at'),
  ('nomina',        'nomina_updated_at'),
  ('metas',         'metas_updated_at'),
  ('creditos',      'creditos_updated_at'),
  ('proveedores',   'proveedores_updated_at'),
  ('recordatorios', 'recordatorios_updated_at')
) AS e(tabla, trigger)
LEFT JOIN pg_trigger t
  ON t.tgname = e.trigger
 AND t.tgrelid = (('public.' || e.tabla)::regclass)
ORDER BY estado, tabla;

-- ----------------------------------------------------------------------------
--  4. Trigger de auto-provisión en auth.users
-- ----------------------------------------------------------------------------
SELECT
  tgname                                  AS trigger,
  CASE WHEN tgname IS NOT NULL
       THEN '✅ OK' ELSE '❌ FALTA' END   AS estado
FROM pg_trigger
WHERE tgname = 'on_auth_user_created'
  AND tgrelid = 'auth.users'::regclass;

-- ----------------------------------------------------------------------------
--  5. RLS habilitado en todas las tablas
-- ----------------------------------------------------------------------------
SELECT
  t.expected                              AS tabla,
  CASE WHEN c.relrowsecurity
       THEN '✅ RLS ON' ELSE '❌ RLS OFF' END AS estado
FROM (VALUES
  ('negocios'),('perfiles'),('permisos_modulo_rol'),('invitaciones'),
  ('configuracion'),('categorias'),('folios'),
  ('productos'),('formatos'),
  ('clientes'),
  ('ventas'),('venta_items'),('venta_pagos'),
  ('movimientos_stock'),
  ('despachos'),('despacho_items'),
  ('gastos'),('nomina'),('marketing'),('metas'),('creditos'),('credito_pagos'),
  ('proveedores'),('cierres_caja'),('recordatorios')
) AS t(expected)
LEFT JOIN pg_class c
  ON c.relname = t.expected
 AND c.relnamespace = 'public'::regnamespace
ORDER BY estado, tabla;

-- ----------------------------------------------------------------------------
--  6. Conteo de políticas RLS por tabla
-- ----------------------------------------------------------------------------
SELECT
  c.relname                               AS tabla,
  COUNT(p.polname)                        AS politicas,
  CASE WHEN COUNT(p.polname) >= 2
       THEN '✅ OK' ELSE '⚠️  REVISAR' END AS estado
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relkind = 'r'
  AND c.relname IN (
    'negocios','perfiles','permisos_modulo_rol','invitaciones',
    'configuracion','categorias','folios',
    'productos','formatos','clientes',
    'ventas','venta_items','venta_pagos','movimientos_stock',
    'despachos','despacho_items',
    'gastos','nomina','marketing','metas','creditos','credito_pagos',
    'proveedores','cierres_caja','recordatorios'
  )
GROUP BY c.relname
ORDER BY estado, tabla;

-- ----------------------------------------------------------------------------
--  7. Índices creados (conteo por tabla)
-- ----------------------------------------------------------------------------
SELECT
  t.tablename                             AS tabla,
  COUNT(i.indexname)                      AS indices
FROM pg_tables t
LEFT JOIN pg_indexes i
  ON i.tablename = t.tablename
 AND i.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'negocios','perfiles','permisos_modulo_rol','invitaciones',
    'configuracion','categorias','folios',
    'productos','formatos','clientes',
    'ventas','venta_items','venta_pagos','movimientos_stock',
    'despachos','despacho_items',
    'gastos','nomina','marketing','metas','creditos','credito_pagos',
    'proveedores','cierres_caja','recordatorios'
  )
GROUP BY t.tablename
ORDER BY tabla;

-- ----------------------------------------------------------------------------
--  8. Resumen ejecutivo
-- ----------------------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM pg_class
   WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
     AND relname IN (
       'negocios','perfiles','permisos_modulo_rol','invitaciones',
       'configuracion','categorias','folios','productos','formatos',
       'clientes','ventas','venta_items','venta_pagos','movimientos_stock',
       'despachos','despacho_items','gastos','nomina','marketing','metas',
       'creditos','credito_pagos','proveedores','cierres_caja','recordatorios'
     )
  )                                        AS tablas_creadas,
  25                                       AS tablas_esperadas,
  (SELECT COUNT(*) FROM pg_proc
   WHERE pronamespace = 'public'::regnamespace
     AND proname IN (
       'current_negocio_id','current_rol','set_updated_at',
       'siguiente_boleta','handle_new_user'
     )
  )                                        AS funciones_creadas,
  5                                        AS funciones_esperadas,
  (SELECT COUNT(*) FROM pg_trigger
   WHERE tgname = 'on_auth_user_created'
     AND tgrelid = 'auth.users'::regclass
  )                                        AS trigger_auth_ok;
