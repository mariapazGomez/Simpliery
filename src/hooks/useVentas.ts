'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/* ---------- Tipos de dominio ---------- */

export interface CartItem {
  /** Clave única en el carrito: productId o productId__varianteId */
  cartKey: string
  productId: string
  varianteId: string | null
  nombre: string
  categoria: string
  precio: number
  costo: number
  qty: number
  /** qty × unidadesBaseFactor — lo que se descuenta del stock */
  unidadesBase: number
  /** variante.unidades_base; 1 para productos sin variantes */
  unidadesBaseFactor: number
  originalPrecio: number
  basePrecio: number
  despachoPrecio: number
  unidad: string
  fotoUrl: string | null
}

export interface ClienteRef {
  id?: string
  nombre: string
  ciudad?: string
  telefono?: string
  numero?: string
  correo?: string
  direccion?: string
  depto?: string
}

export interface VentaExtra {
  tipo?: 'local' | 'despacho'
  cliente?: ClienteRef | null
  clienteId?: string | null
  descuento?: { type: 'pct' | 'fixed'; value: number; amount: number } | null
  pagoMixto?: { metodo: string; monto: number } | null
}

/** ViewModel devuelto por registrarVenta; usado por ComprobanteModal. */
export interface VentaConfirmada {
  id: string
  boleta: number
  date: Date
  items: { name: string; price: number; qty: number; cost: number }[]
  method: string
  total: number
  costo: number
  profit: number
  tipo: 'local' | 'despacho'
  cliente: ClienteRef | null
  credito: boolean
  pagado: boolean
  montoPendiente: number
  descuento: { type: 'pct' | 'fixed'; value: number; amount: number } | null
  pagoMixto: { metodo: string; monto: number } | null
}

/* ---------- Función independiente (sin hook state) ---------- */

export async function registrarVenta(
  cartItems: CartItem[],
  method: string,
  extra: VentaExtra = {},
): Promise<VentaConfirmada> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: perfil } = await supabase
    .from('perfiles').select('negocio_id').eq('id', user.id).single()
  if (!perfil) throw new Error('Sin negocio')
  const negocio_id = (perfil as { negocio_id: string }).negocio_id

  const bruto = cartItems.reduce((a, i) => a + i.precio * i.qty, 0)
  const descMonto = extra.descuento ? Math.min(extra.descuento.amount, bruto) : 0
  const total = Math.round(bruto - descMonto)
  const costo = cartItems.reduce((a, i) => a + i.costo * i.qty, 0)
  const esCredito = method === 'Crédito'

  // Folio atómico desde servidor
  let boleta: number
  const { data: folioData, error: folioErr } = await supabase.rpc('siguiente_boleta')
  if (!folioErr && folioData != null) boleta = Number(folioData)
  else boleta = Math.floor(Date.now() / 1000)

  // 1. INSERT ventas
  const { data: ventaRow, error: ventaErr } = await supabase
    .from('ventas')
    .insert({
      negocio_id,
      boleta,
      tipo: extra.tipo || 'local',
      cliente_id: extra.clienteId || null,
      cliente_snapshot: extra.cliente || null,
      metodo_pago: method,
      total,
      costo,
      ganancia: total - costo,
      credito: esCredito,
      pagado: !esCredito,
      monto_pendiente: esCredito ? total : 0,
      descuento_tipo: extra.descuento?.type || null,
      descuento_valor: extra.descuento?.value ?? null,
      descuento_monto: descMonto > 0 ? Math.round(descMonto) : null,
      pago_mixto_metodo: extra.pagoMixto?.metodo || null,
      pago_mixto_monto: extra.pagoMixto?.monto || null,
    })
    .select('id')
    .single()
  if (ventaErr) throw ventaErr
  const ventaId = (ventaRow as { id: string }).id

  // 2. INSERT venta_items (batch)
  await supabase.from('venta_items').insert(
    cartItems.map(i => ({
      negocio_id,
      venta_id: ventaId,
      producto_id: i.productId,
      variante_id: i.varianteId ?? null,
      nombre: i.nombre,
      categoria: i.categoria,
      qty: i.qty,
      precio: i.precio,
      costo: i.costo,
      unidades_base: i.unidadesBase,
    })),
  )

  // 3. INSERT venta_pagos (si no es crédito)
  if (!esCredito && total > 0) {
    const pagoPrincipal = extra.pagoMixto && extra.pagoMixto.monto > 0
      ? total - extra.pagoMixto.monto
      : total
    const pagos: object[] = [{ negocio_id, venta_id: ventaId, monto: pagoPrincipal, metodo: method }]
    if (extra.pagoMixto && extra.pagoMixto.monto > 0) {
      pagos.push({ negocio_id, venta_id: ventaId, monto: extra.pagoMixto.monto, metodo: extra.pagoMixto.metodo })
    }
    await supabase.from('venta_pagos').insert(pagos)
  }

  // 4. Descontar stock + registrar movimiento (por producto)
  for (const item of cartItems) {
    await supabase.rpc('venta_descontar_stock', {
      p_negocio_id: negocio_id,
      p_producto_id: item.productId,
      p_qty: item.unidadesBase,
    })
    await supabase.from('movimientos_stock').insert({
      negocio_id,
      producto_id: item.productId,
      tipo: 'venta',
      qty: -item.unidadesBase,
      nota: `Boleta ${boleta}`,
      venta_id: ventaId,
    })
  }

  // 5. Si es despacho, crear despacho
  if (extra.tipo === 'despacho' && extra.cliente?.nombre) {
    const c = extra.cliente
    await supabase.from('despachos').insert({
      negocio_id,
      venta_id: ventaId,
      boleta,
      cliente_nombre: c.nombre,
      telefono: c.telefono || c.numero || null,
      correo: c.correo || null,
      direccion: c.direccion || '',
      depto: c.depto || null,
      ciudad: c.ciudad || '',
      total,
      metodo_pago: method,
      estado: 'pendiente',
    })
  }

  return {
    id: ventaId,
    boleta,
    date: new Date(),
    items: cartItems.map(i => ({ name: i.nombre, price: i.precio, qty: i.qty, cost: i.costo })),
    method,
    total,
    costo,
    profit: total - costo,
    tipo: extra.tipo || 'local',
    cliente: extra.cliente || null,
    credito: esCredito,
    pagado: !esCredito,
    montoPendiente: esCredito ? total : 0,
    descuento: extra.descuento || null,
    pagoMixto: extra.pagoMixto || null,
  }
}

/* ---------- Hook (envuelve la función con estado de loading) ---------- */

export function useVentas() {
  const [submitting, setSubmitting] = useState(false)

  const submit = useCallback(async (
    cartItems: CartItem[],
    method: string,
    extra: VentaExtra = {},
  ): Promise<VentaConfirmada> => {
    setSubmitting(true)
    try {
      return await registrarVenta(cartItems, method, extra)
    } finally {
      setSubmitting(false)
    }
  }, [])

  return { registrarVenta: submit, submitting }
}
