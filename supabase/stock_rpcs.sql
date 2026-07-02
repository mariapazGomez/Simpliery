-- ============================================================================
--  RPCs de stock — ejecutar en Supabase SQL Editor
--  Reemplaza venta_descontar_stock y agrega reponer_stock + ajustar_stock
--  Todos registran movimiento en movimientos_stock automáticamente.
-- ============================================================================

-- Descuenta (o devuelve) stock al vender/anular una venta.
-- p_qty > 0 = descontar (venta), p_qty < 0 = devolver (anulación)
CREATE OR REPLACE FUNCTION public.venta_descontar_stock(
  p_negocio_id  UUID,
  p_producto_id UUID,
  p_qty         NUMERIC,
  p_venta_id    UUID DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tipo    TEXT;
  v_qty_abs NUMERIC;
BEGIN
  IF p_qty > 0 THEN
    v_tipo    := 'venta';
    v_qty_abs := p_qty;
  ELSE
    v_tipo    := 'devolucion';
    v_qty_abs := ABS(p_qty);
  END IF;

  UPDATE public.productos
     SET stock = stock - p_qty
   WHERE id          = p_producto_id
     AND negocio_id  = p_negocio_id;

  INSERT INTO public.movimientos_stock (negocio_id, producto_id, tipo, qty, venta_id)
  VALUES (p_negocio_id, p_producto_id, v_tipo, v_qty_abs, p_venta_id);
END;
$$;

-- Repone stock (entrada de mercadería).
CREATE OR REPLACE FUNCTION public.reponer_stock(
  p_negocio_id  UUID,
  p_producto_id UUID,
  p_qty         NUMERIC,
  p_nota        TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.productos
     SET stock = stock + p_qty
   WHERE id          = p_producto_id
     AND negocio_id  = p_negocio_id;

  INSERT INTO public.movimientos_stock (negocio_id, producto_id, tipo, qty, nota)
  VALUES (p_negocio_id, p_producto_id, 'entrada', p_qty, p_nota);
END;
$$;

-- Ajusta stock al valor real contado (inventario físico).
-- Registra el diff (positivo o negativo) como ajuste.
CREATE OR REPLACE FUNCTION public.ajustar_stock(
  p_negocio_id  UUID,
  p_producto_id UUID,
  p_nuevo_stock NUMERIC,
  p_nota        TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stock_actual NUMERIC;
  v_diff         NUMERIC;
BEGIN
  SELECT stock INTO v_stock_actual
    FROM public.productos
   WHERE id         = p_producto_id
     AND negocio_id = p_negocio_id;

  v_diff := p_nuevo_stock - COALESCE(v_stock_actual, 0);

  UPDATE public.productos
     SET stock = p_nuevo_stock
   WHERE id          = p_producto_id
     AND negocio_id  = p_negocio_id;

  INSERT INTO public.movimientos_stock (negocio_id, producto_id, tipo, qty, nota)
  VALUES (p_negocio_id, p_producto_id, 'ajuste', v_diff, p_nota);
END;
$$;

-- Permisos de ejecución para usuarios autenticados
GRANT EXECUTE ON FUNCTION public.venta_descontar_stock(UUID, UUID, NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reponer_stock(UUID, UUID, NUMERIC, TEXT)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.ajustar_stock(UUID, UUID, NUMERIC, TEXT)         TO authenticated;
