'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface MovimientoStock {
  id: string
  negocio_id: string
  fecha: string
  producto_id: string
  producto_nombre: string
  tipo: 'entrada' | 'salida' | 'ajuste' | 'venta' | 'devolucion'
  qty: number
  nota: string | null
  venta_id: string | null
  created_at: string
}

function mapMov(raw: Record<string, unknown>): MovimientoStock {
  const prod = (raw.productos as { nombre: string } | null)
  return {
    id:               raw.id as string,
    negocio_id:       raw.negocio_id as string,
    fecha:            raw.fecha as string,
    producto_id:      raw.producto_id as string,
    producto_nombre:  prod?.nombre ?? '',
    tipo:             raw.tipo as MovimientoStock['tipo'],
    qty:              Number(raw.qty),
    nota:             (raw.nota as string | null) ?? null,
    venta_id:         (raw.venta_id as string | null) ?? null,
    created_at:       raw.created_at as string,
  }
}

export function useMovimientos() {
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([])
  const [loading, setLoading] = useState(true)
  const [negocioId, setNegocioId] = useState<string | null>(null)

  const cargar = useCallback(async (nid: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('movimientos_stock')
      .select('*, productos(nombre)')
      .eq('negocio_id', nid)
      .order('created_at', { ascending: false })
      .limit(300)
    setMovimientos(((data ?? []) as Record<string, unknown>[]).map(mapMov))
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
      if (!cancelled) await cargar(nid)
    }
    init()
    return () => { cancelled = true }
  }, [cargar])

  const recargar = useCallback(() => {
    if (negocioId) cargar(negocioId)
  }, [negocioId, cargar])

  return { movimientos, loading, recargar }
}
