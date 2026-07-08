'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/* ---------- Tipos ---------- */

export interface VentaItem {
  id: string
  producto_id: string | null
  nombre: string
  categoria: string
  qty: number
  precio: number
  costo: number
  unidades_base: number
}

export interface VentaPago {
  id: string
  monto: number
  metodo: string
  created_at: string
}

export interface ClienteSnap {
  id?: string
  nombre: string
  telefono?: string
  numero?: string
  ciudad?: string
  correo?: string
  direccion?: string
  depto?: string
}

export interface VentaRow {
  id: string
  negocio_id: string
  boleta: number
  tipo: 'local' | 'despacho'
  cliente_id: string | null
  cliente_snapshot: ClienteSnap | null
  metodo_pago: string
  total: number
  costo: number
  ganancia: number
  credito: boolean
  pagado: boolean
  monto_pendiente: number
  descuento_tipo: 'pct' | 'fixed' | null
  descuento_valor: number | null
  descuento_monto: number | null
  pago_mixto_metodo: string | null
  pago_mixto_monto: number | null
  anulada: boolean
  created_at: string
  items: VentaItem[]
  pagos: VentaPago[]
}

export type VentaUpdatePatch = Partial<Omit<VentaRow, 'id' | 'negocio_id' | 'boleta' | 'anulada' | 'items' | 'pagos'>>

export interface BolataImport {
  boleta: number
  created_at: string
  tipo: 'local' | 'despacho'
  metodo_pago: string
  total: number
  costo: number
  ganancia: number
  descuento: number
  cliente: ClienteSnap | null
  items: {
    nombre: string
    categoria: string
    qty: number
    precio: number
    costo_unitario: number
  }[]
}

export interface EditItem {
  producto_id: string | null
  nombre: string
  categoria: string
  qty: number
  precio: number
  costo: number
  unidades_base: number
}

/* ---------- Mapper ---------- */

function mapRow(raw: Record<string, unknown>): VentaRow {
  const items = (raw.venta_items as Record<string, unknown>[] | null) ?? []
  const pagos = (raw.venta_pagos as Record<string, unknown>[] | null) ?? []
  return {
    id:                raw.id as string,
    negocio_id:        raw.negocio_id as string,
    boleta:            Number(raw.boleta),
    tipo:              (raw.tipo as 'local' | 'despacho') ?? 'local',
    cliente_id:        (raw.cliente_id as string | null) ?? null,
    cliente_snapshot:  (raw.cliente_snapshot as ClienteSnap | null) ?? null,
    metodo_pago:       (raw.metodo_pago as string) ?? '',
    total:             Number(raw.total) || 0,
    costo:             Number(raw.costo) || 0,
    ganancia:          Number(raw.ganancia) || 0,
    credito:           Boolean(raw.credito),
    pagado:            Boolean(raw.pagado),
    monto_pendiente:   Number(raw.monto_pendiente) || 0,
    descuento_tipo:    (raw.descuento_tipo as 'pct' | 'fixed' | null) ?? null,
    descuento_valor:   raw.descuento_valor != null ? Number(raw.descuento_valor) : null,
    descuento_monto:   raw.descuento_monto != null ? Number(raw.descuento_monto) : null,
    pago_mixto_metodo: (raw.pago_mixto_metodo as string | null) ?? null,
    pago_mixto_monto:  raw.pago_mixto_monto != null ? Number(raw.pago_mixto_monto) : null,
    anulada:           Boolean(raw.anulada),
    created_at:        raw.created_at as string,
    items: items.map(i => ({
      id:            i.id as string,
      producto_id:   (i.producto_id as string | null) ?? null,
      nombre:        i.nombre as string,
      categoria:     (i.categoria as string) ?? '',
      qty:           Number(i.qty),
      precio:        Number(i.precio),
      costo:         Number(i.costo) || 0,
      unidades_base: Number(i.unidades_base) || Number(i.qty),
    })),
    pagos: pagos.map(p => ({
      id:         p.id as string,
      monto:      Number(p.monto),
      metodo:     (p.metodo as string) ?? '',
      created_at: p.created_at as string,
    })),
  }
}

/* ---------- Hook ---------- */

export function useTransacciones() {
  const [ventas, setVentas] = useState<VentaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [negocioId, setNegocioId] = useState<string | null>(null)

  // Exposed so the page can trigger a reload (e.g. refresh button, visibilitychange)
  const recargar = useCallback(async (nid: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('ventas')
      .select('*, venta_items(id, producto_id, nombre, categoria, qty, precio, costo, unidades_base), venta_pagos(id, monto, metodo, created_at)')
      .eq('negocio_id', nid)
      .eq('anulada', false)
      .order('created_at', { ascending: false })
    setVentas(((data ?? []) as Record<string, unknown>[]).map(mapRow))
    setLoading(false)
  }, [])

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
      if (!cancelled) await recargar(nid)
    }
    init()
    return () => { cancelled = true }
  }, [recargar])

  const anular = useCallback(async (ventaId: string) => {
    if (!negocioId) return
    const supabase = createClient()
    // Revert stock for each item
    const { data: items } = await supabase
      .from('venta_items')
      .select('producto_id, unidades_base')
      .eq('venta_id', ventaId)
    for (const item of (items ?? []) as { producto_id: string | null; unidades_base: number }[]) {
      if (item.producto_id) {
        await supabase.rpc('venta_descontar_stock', {
          p_negocio_id: negocioId,
          p_producto_id: item.producto_id,
          p_qty: -item.unidades_base,
        })
      }
    }
    await supabase.from('ventas').update({ anulada: true }).eq('id', ventaId)
    // Delete linked despacho if any (silently)
    await supabase.from('despachos').delete().eq('venta_id', ventaId)
    setVentas(vs => vs.filter(v => v.id !== ventaId))
  }, [negocioId])

  const actualizar = useCallback(async (ventaId: string, patch: VentaUpdatePatch, newItems?: EditItem[]) => {
    if (!negocioId) return
    const supabase = createClient()

    // Build DB patch (drop undefined keys)
    const dbPatch: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
      if (v !== undefined) dbPatch[k] = v
    }

    if (newItems !== undefined) {
      const venta = ventas.find(v => v.id === ventaId)
      if (venta) {
        // Revert old stock
        for (const item of venta.items) {
          if (item.producto_id) {
            await supabase.rpc('venta_descontar_stock', {
              p_negocio_id: negocioId,
              p_producto_id: item.producto_id,
              p_qty: -item.unidades_base,
            })
          }
        }
        // Replace items in DB
        await supabase.from('venta_items').delete().eq('venta_id', ventaId)
        if (newItems.length > 0) {
          await supabase.from('venta_items').insert(
            newItems.map(i => ({
              negocio_id:    negocioId,
              venta_id:      ventaId,
              producto_id:   i.producto_id,
              nombre:        i.nombre,
              categoria:     i.categoria,
              qty:           i.qty,
              precio:        i.precio,
              costo:         i.costo,
              unidades_base: i.unidades_base,
            }))
          )
        }
        // Apply new stock
        for (const item of newItems) {
          if (item.producto_id) {
            await supabase.rpc('venta_descontar_stock', {
              p_negocio_id: negocioId,
              p_producto_id: item.producto_id,
              p_qty: item.unidades_base,
            })
          }
        }
      }
    }

    // Handle tipo changes: create or delete despacho
    const oldVenta = ventas.find(v => v.id === ventaId)
    if (oldVenta && patch.tipo !== undefined && patch.tipo !== oldVenta.tipo) {
      if (patch.tipo === 'despacho') {
        const cs = patch.cliente_snapshot ?? oldVenta.cliente_snapshot
        if (cs?.nombre) {
          await supabase.from('despachos').insert({
            negocio_id:     negocioId,
            venta_id:       ventaId,
            boleta:         oldVenta.boleta,
            cliente_nombre: cs.nombre,
            telefono:       cs.telefono || cs.numero || null,
            correo:         cs.correo || null,
            direccion:      cs.direccion || '',
            depto:          cs.depto || null,
            ciudad:         cs.ciudad || '',
            total:          (dbPatch.total as number) ?? oldVenta.total,
            metodo_pago:    patch.metodo_pago ?? oldVenta.metodo_pago,
            estado:         'pendiente',
          })
        }
      } else if (patch.tipo === 'local') {
        await supabase.from('despachos').delete().eq('venta_id', ventaId)
      }
    }

    const { error } = await supabase.from('ventas').update(dbPatch).eq('id', ventaId)
    if (error) throw error

    setVentas(vs => vs.map(v => {
      if (v.id !== ventaId) return v
      return {
        ...v,
        ...patch,
        items: newItems !== undefined
          ? newItems.map(i => ({ ...i, id: '' }))
          : v.items,
      }
    }))
  }, [negocioId, ventas])

  const saldar = useCallback(async (ventaId: string, monto: number, metodo: string) => {
    if (!negocioId) return
    const supabase = createClient()
    await supabase.from('venta_pagos').insert({ negocio_id: negocioId, venta_id: ventaId, monto, metodo })
    const venta = ventas.find(v => v.id === ventaId)
    if (!venta) return
    const nuevoPendiente = Math.max(0, venta.monto_pendiente - monto)
    const pagado = nuevoPendiente <= 0
    await supabase.from('ventas').update({ monto_pendiente: nuevoPendiente, pagado }).eq('id', ventaId)
    setVentas(vs => vs.map(v => {
      if (v.id !== ventaId) return v
      return {
        ...v,
        monto_pendiente: nuevoPendiente,
        pagado,
        pagos: [...v.pagos, { id: crypto.randomUUID(), monto, metodo, created_at: new Date().toISOString() }],
      }
    }))
  }, [negocioId, ventas])

  const importarMasivoVentas = useCallback(async (boletas: BolataImport[]) => {
    if (!negocioId) throw new Error('Negocio no disponible')
    const supabase = createClient()

    // Insert all ventas in one batch
    const { data: ventasData, error: ve } = await supabase
      .from('ventas')
      .insert(boletas.map(b => ({
        negocio_id:       negocioId,
        boleta:           b.boleta,
        tipo:             b.tipo,
        cliente_snapshot: b.cliente,
        metodo_pago:      b.metodo_pago,
        total:            b.total,
        costo:            b.costo,
        ganancia:         b.ganancia,
        descuento_monto:  b.descuento > 0 ? b.descuento : null,
        descuento_tipo:   b.descuento > 0 ? 'fixed' : null,
        descuento_valor:  b.descuento > 0 ? b.descuento : null,
        credito:          false,
        pagado:           true,
        monto_pendiente:  0,
        anulada:          false,
        created_at:       b.created_at,
      })))
      .select('id, boleta')
    if (ve) throw new Error(`Error al insertar ventas: ${ve.message}`)

    // Map boleta number → venta id
    const boletaToId = new Map(
      ((ventasData ?? []) as { id: string; boleta: number }[]).map(v => [v.boleta, v.id])
    )

    // Insert all items in one batch
    const allItems = boletas.flatMap(b => {
      const ventaId = boletaToId.get(b.boleta)
      if (!ventaId || b.items.length === 0) return []
      return b.items.map(i => ({
        negocio_id:    negocioId,
        venta_id:      ventaId,
        producto_id:   null,
        nombre:        i.nombre,
        categoria:     i.categoria,
        qty:           i.qty,
        precio:        i.precio,
        costo:         i.costo_unitario,
        unidades_base: i.qty,
      }))
    })
    if (allItems.length > 0) {
      const { error: ie } = await supabase.from('venta_items').insert(allItems)
      if (ie) throw new Error(`Error al insertar items: ${ie.message}`)
    }

    // Reload ventas list
    const { data } = await supabase
      .from('ventas')
      .select('*, venta_items(id, producto_id, nombre, categoria, qty, precio, costo, unidades_base), venta_pagos(id, monto, metodo, created_at)')
      .eq('negocio_id', negocioId)
      .eq('anulada', false)
      .order('created_at', { ascending: false })
    setVentas(((data ?? []) as Record<string, unknown>[]).map(mapRow))
  }, [negocioId])

  const recargarPublico = useCallback(async () => {
    if (!negocioId) return
    await recargar(negocioId)
  }, [negocioId, recargar])

  return { ventas, loading, anular, actualizar, saldar, importarMasivoVentas, recargar: recargarPublico }
}
