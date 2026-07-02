'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface FiadoRow {
  id: string
  boleta: number
  fecha: string
  cliente_nombre: string
  cliente_telefono: string
  total: number
  monto_pendiente: number
  // computed
  vencimiento: Date
  dias_atraso: number
  estado: 'al_dia' | 'por_vencer' | 'vencida'
}

type VentaFiadoRaw = {
  id: string
  boleta: number
  fecha: string
  total: number
  monto_pendiente: number
  cliente_snapshot: { nombre?: string; telefono?: string } | null
}

function computarEstado(fecha: string): Pick<FiadoRow, 'vencimiento' | 'dias_atraso' | 'estado'> {
  const vencimiento = new Date(fecha)
  vencimiento.setDate(vencimiento.getDate() + 30)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const diasAtraso = Math.max(0, Math.round((hoy.getTime() - vencimiento.getTime()) / 86400000))
  const msHastaVencer = vencimiento.getTime() - hoy.getTime()
  const estado: FiadoRow['estado'] =
    diasAtraso > 0 ? 'vencida' : msHastaVencer < 7 * 86400000 ? 'por_vencer' : 'al_dia'
  return { vencimiento, dias_atraso: diasAtraso, estado }
}

function mapFiado(raw: VentaFiadoRaw): FiadoRow {
  const snap = raw.cliente_snapshot
  return {
    id:                raw.id,
    boleta:            raw.boleta,
    fecha:             raw.fecha,
    cliente_nombre:    snap?.nombre    || 'Sin nombre',
    cliente_telefono:  snap?.telefono  || '',
    total:             Number(raw.total),
    monto_pendiente:   Number(raw.monto_pendiente),
    ...computarEstado(raw.fecha),
  }
}

export function useFiados() {
  const [fiados, setFiados]   = useState<FiadoRow[]>([])
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
        .from('ventas')
        .select('id, boleta, fecha, total, monto_pendiente, cliente_snapshot')
        .eq('negocio_id', nid)
        .eq('credito', true)
        .eq('pagado', false)
        .eq('anulada', false)
        .gt('monto_pendiente', 0)
        .order('fecha', { ascending: false })

      if (!cancelled) {
        setFiados(((data ?? []) as VentaFiadoRaw[]).map(mapFiado))
        setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  const abonar = useCallback(async (ventaId: string, monto: number, metodo: string) => {
    if (!negocioId) return
    const supabase = createClient()

    const { error: errPago } = await supabase.from('venta_pagos').insert({
      negocio_id: negocioId,
      venta_id:   ventaId,
      fecha:      new Date().toISOString(),
      monto,
      metodo,
    })
    if (errPago) throw errPago

    const fiado = fiados.find(f => f.id === ventaId)
    const nuevoPendiente = Math.max(0, (fiado?.monto_pendiente ?? 0) - monto)
    const pagado = nuevoPendiente <= 0

    const { error: errVenta } = await supabase
      .from('ventas')
      .update({ monto_pendiente: nuevoPendiente, pagado })
      .eq('id', ventaId)
    if (errVenta) throw errVenta

    setFiados(fs =>
      pagado
        ? fs.filter(f => f.id !== ventaId)
        : fs.map(f => f.id === ventaId ? { ...f, monto_pendiente: nuevoPendiente } : f)
    )
  }, [negocioId, fiados])

  const totalDeuda = fiados.reduce((a, f) => a + f.monto_pendiente, 0)

  return { fiados, loading, abonar, totalDeuda }
}
