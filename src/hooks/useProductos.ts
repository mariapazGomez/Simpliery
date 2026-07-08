'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Producto {
  id: string
  negocio_id: string
  nombre: string
  categoria: string
  unidad: string
  costo: number
  precio: number
  stock: number
  stock_minimo: number
  foto_url: string | null
  kg_por_unidad: number | null
  precio_despacho: number | null
  orden: number
  activo: boolean
  // campos calculados
  margen: number
  margen_pct: number
  vendido: number
}

export type InsertProducto = Omit<Producto, 'id' | 'negocio_id' | 'activo' | 'margen' | 'margen_pct' | 'vendido'>

function calcular(row: Record<string, unknown>): Producto {
  const costo = Number(row.costo) || 0
  const precio = Number(row.precio) || 0
  const margen = precio - costo
  return {
    id:              row.id as string,
    negocio_id:      row.negocio_id as string,
    nombre:          row.nombre as string,
    categoria:       row.categoria as string,
    unidad:          row.unidad as string,
    costo,
    precio,
    stock:           Number(row.stock) || 0,
    stock_minimo:    Number(row.stock_minimo) || 0,
    foto_url:        (row.foto_url as string | null) ?? null,
    kg_por_unidad:   row.kg_por_unidad != null ? Number(row.kg_por_unidad) : null,
    precio_despacho: row.precio_despacho != null ? Number(row.precio_despacho) : null,
    orden:           Number(row.orden) || 0,
    activo:          Boolean(row.activo),
    margen,
    margen_pct:      precio > 0 ? (margen / precio) * 100 : 0,
    vendido:         0, // se calculará desde ventas en B-022
  }
}

export function useProductos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [negocioId, setNegocioId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data: perfil } = await supabase
        .from('perfiles').select('negocio_id').eq('id', user.id).single()
      if (!perfil || cancelled) return
      const nid = (perfil as { negocio_id: string }).negocio_id
      setNegocioId(nid)

      const { data } = await supabase
        .from('productos')
        .select('*')
        .eq('negocio_id', nid)
        .eq('activo', true)
        .order('categoria')
        .order('orden')
        .order('nombre')
      if (!cancelled) {
        setProductos(((data ?? []) as Record<string, unknown>[]).map(calcular))
        setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  const agregar = useCallback(async (p: InsertProducto): Promise<string> => {
    if (!negocioId) throw new Error('Negocio no disponible')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('productos')
      .insert({ ...p, negocio_id: negocioId, activo: true })
      .select('*')
      .single()
    if (error) throw error
    const nuevo = calcular(data as Record<string, unknown>)
    setProductos(ps => [...ps, nuevo])
    return nuevo.id
  }, [negocioId])

  const actualizar = useCallback(async (id: string, patch: Partial<InsertProducto>) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('productos')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    setProductos(ps => ps.map(p => p.id === id ? calcular(data as Record<string, unknown>) : p))
  }, [])

  const eliminar = useCallback(async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('productos')
      .update({ activo: false })
      .eq('id', id)
    if (error) throw error
    setProductos(ps => ps.filter(p => p.id !== id))
  }, [])

  const reponer = useCallback(async (id: string, qty: number, nota?: string) => {
    if (!negocioId) return
    const supabase = createClient()
    const { error } = await supabase.rpc('reponer_stock', {
      p_negocio_id:  negocioId,
      p_producto_id: id,
      p_qty:         qty,
      p_nota:        nota ?? null,
    })
    if (error) throw error
    setProductos(ps => ps.map(p => p.id === id ? { ...p, stock: p.stock + qty } : p))
  }, [negocioId])

  const importarMasivo = useCallback(async (rows: InsertProducto[]) => {
    if (!negocioId) throw new Error('Negocio no disponible')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('productos')
      .insert(rows.map((p) => ({ ...p, negocio_id: negocioId, activo: true })))
      .select('*')
    if (error) throw error
    const nuevos = ((data ?? []) as Record<string, unknown>[]).map(calcular)
    setProductos((ps) => [...ps, ...nuevos])
  }, [negocioId])

  const ajustar = useCallback(async (id: string, nuevoStock: number, nota?: string) => {
    if (!negocioId) return
    const supabase = createClient()
    const { error } = await supabase.rpc('ajustar_stock', {
      p_negocio_id:  negocioId,
      p_producto_id: id,
      p_nuevo_stock: nuevoStock,
      p_nota:        nota ?? null,
    })
    if (error) throw error
    setProductos(ps => ps.map(p => p.id === id ? { ...p, stock: nuevoStock } : p))
  }, [negocioId])

  return { productos, loading, agregar, actualizar, eliminar, reponer, ajustar, importarMasivo }
}
