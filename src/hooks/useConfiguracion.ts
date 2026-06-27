'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Configuracion {
  negocio_id: string
  nombre_negocio: string
  moneda: string
  metodos_pago: string[]
  stock_minimo_default: number
  margen_minimo: number
  owner_nombre: string | null
  owner_rol: string | null
  notif_stock_bajo: boolean
  notif_metas: boolean
}

const DEFAULTS: Configuracion = {
  negocio_id: '',
  nombre_negocio: 'Mi negocio',
  moneda: 'CLP',
  metodos_pago: ['Efectivo', 'Transferencia', 'Tarjeta'],
  stock_minimo_default: 5,
  margen_minimo: 20,
  owner_nombre: null,
  owner_rol: null,
  notif_stock_bajo: true,
  notif_metas: true,
}

export function useConfiguracion() {
  const [config, setConfig] = useState<Configuracion>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase
      .from('configuracion')
      .select('*')
      .maybeSingle()
      .then((result: { data: Configuracion | null; error: { message: string } | null }) => {
        if (cancelled) return
        if (result.error) setError(result.error.message)
        else if (result.data) setConfig(result.data)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const guardar = useCallback(async (updates: Partial<Omit<Configuracion, 'negocio_id'>>) => {
    if (!config.negocio_id) throw new Error('negocio_id no disponible')
    const supabase = createClient()
    const { error: err } = await supabase
      .from('configuracion')
      .update(updates)
      .eq('negocio_id', config.negocio_id)
    if (err) throw err
    setConfig(c => ({ ...c, ...updates }))
  }, [config.negocio_id])

  return { config, loading, error, guardar }
}
