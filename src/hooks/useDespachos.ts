'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EstadoDespacho } from '@/types'

export interface DespachoItem {
  id: string
  nombre: string
  qty: number
  precio: number
  costo: number
  producto_id: string | null
}

export interface DespachoDBRow {
  id: string
  negocio_id: string
  venta_id: string | null
  boleta: number | null
  fecha: string
  cliente_nombre: string
  telefono: string | null
  correo: string | null
  direccion: string
  depto: string | null
  ciudad: string
  nota: string | null
  repartidor: string | null
  estado: EstadoDespacho
  total: number
  metodo_pago: string | null
  optiroute_id: string | null
  tracking_url: string | null
  tracking_code: string | null
  optiroute_status: number | null
  enviado_en: string | null
  items: DespachoItem[]
}

export type DespachoUpdatePatch = Partial<Omit<DespachoDBRow, 'id' | 'negocio_id' | 'items' | 'venta_id' | 'boleta' | 'fecha'>>

function mapRow(raw: Record<string, unknown>): DespachoDBRow {
  const items = (raw.despacho_items as Record<string, unknown>[] | null) ?? []
  return {
    id:               raw.id as string,
    negocio_id:       raw.negocio_id as string,
    venta_id:         (raw.venta_id as string | null) ?? null,
    boleta:           raw.boleta != null ? Number(raw.boleta) : null,
    fecha:            raw.fecha as string,
    cliente_nombre:   raw.cliente_nombre as string,
    telefono:         (raw.telefono as string | null) ?? null,
    correo:           (raw.correo as string | null) ?? null,
    direccion:        (raw.direccion as string) ?? '',
    depto:            (raw.depto as string | null) ?? null,
    ciudad:           (raw.ciudad as string) ?? '',
    nota:             (raw.nota as string | null) ?? null,
    repartidor:       (raw.repartidor as string | null) ?? 'Sin asignar',
    estado:           (raw.estado as EstadoDespacho) ?? 'pendiente',
    total:            Number(raw.total) || 0,
    metodo_pago:      (raw.metodo_pago as string | null) ?? null,
    optiroute_id:     (raw.optiroute_id as string | null) ?? null,
    tracking_url:     (raw.tracking_url as string | null) ?? null,
    tracking_code:    (raw.tracking_code as string | null) ?? null,
    optiroute_status: raw.optiroute_status != null ? Number(raw.optiroute_status) : null,
    enviado_en:       (raw.enviado_en as string | null) ?? null,
    items: items.map(i => ({
      id:          i.id as string,
      nombre:      i.nombre as string,
      qty:         Number(i.qty),
      precio:      Number(i.precio),
      costo:       Number(i.costo) || 0,
      producto_id: (i.producto_id as string | null) ?? null,
    })),
  }
}

export function useDespachos() {
  const [despachos, setDespachos] = useState<DespachoDBRow[]>([])
  const [loading, setLoading] = useState(true)
  const [negocioId, setNegocioId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user.id).single()
      if (!perfil || cancelled) return
      const nid = (perfil as { negocio_id: string }).negocio_id
      setNegocioId(nid)
      const { data } = await supabase
        .from('despachos')
        .select('*, despacho_items(id, nombre, qty, precio, costo, producto_id)')
        .eq('negocio_id', nid)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setDespachos(((data ?? []) as Record<string, unknown>[]).map(mapRow))
        setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  const actualizar = useCallback(async (id: string, patch: DespachoUpdatePatch) => {
    const supabase = createClient()
    const { error } = await supabase.from('despachos').update(patch).eq('id', id)
    if (error) throw error
    setDespachos(ds => ds.map(d => d.id === id ? { ...d, ...patch } : d))
  }, [])

  const eliminar = useCallback(async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('despachos').delete().eq('id', id)
    if (error) throw error
    setDespachos(ds => ds.filter(d => d.id !== id))
  }, [])

  const anularVenta = useCallback(async (ventaId: string) => {
    if (!negocioId || !ventaId) return
    const supabase = createClient()
    await supabase.from('ventas').update({ anulada: true }).eq('id', ventaId)
    const { data: items } = await supabase
      .from('venta_items')
      .select('producto_id, unidades_base')
      .eq('venta_id', ventaId)
    for (const item of (items ?? []) as { producto_id: string | null; unidades_base: number }[]) {
      if (item.producto_id) {
        // Negative qty = revert (stock = stock - (-qty) = stock + qty)
        await supabase.rpc('venta_descontar_stock', {
          p_negocio_id: negocioId,
          p_producto_id: item.producto_id,
          p_qty: -item.unidades_base,
        })
      }
    }
    // Remove despacho linked to this venta from DB and state
    const linked = despachos.find(d => d.venta_id === ventaId)
    if (linked) {
      await supabase.from('despachos').delete().eq('id', linked.id)
      setDespachos(ds => ds.filter(d => d.venta_id !== ventaId))
    }
  }, [negocioId, despachos])

  return { despachos, loading, actualizar, eliminar, anularVenta }
}
