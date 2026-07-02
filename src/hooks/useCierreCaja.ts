'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ResumenDia {
  totalVentas: number
  totalGanancia: number
  nBoletas: number
  nItems: number
  efectivo: number
  tarjeta: number
  transferencia: number
  creditoPendiente: number
  abonosHoy: number
  productosStockBajo: number
}

export interface CierreCajaRow {
  id: string
  fecha: string
  total_ventas: number
  total_gastos: number
  efectivo_inicio: number
  efectivo_final: number
  diferencia: number
  observaciones: string | null
  created_at: string
}

export interface GuardarCierreParams {
  efectivoFinal: number
  diferencia: number
  observaciones: string
}

function todayRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  return { start, end }
}

function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

type VentaRow = {
  id: string; total: number; ganancia: number; credito: boolean
  metodo_pago: string; pago_mixto_metodo: string | null; pago_mixto_monto: number | null
  venta_items: { qty: number }[]
}

type AbonoPagoRow = { monto: number; metodo: string; ventas: { credito: boolean } | null }

export function useCierreCaja() {
  const [resumen, setResumen]               = useState<ResumenDia | null>(null)
  const [cierres, setCierres]               = useState<CierreCajaRow[]>([])
  const [loadingResumen, setLoadingResumen] = useState(true)
  const [loadingCierres, setLoadingCierres] = useState(true)
  const [negocioId, setNegocioId]           = useState<string | null>(null)
  const [userId, setUserId]                 = useState<string | null>(null)

  const cargarResumen = useCallback(async (nid: string) => {
    const supabase = createClient()
    const { start, end } = todayRange()

    const [ventasRes, abonosRes, prodRes] = await Promise.all([
      supabase
        .from('ventas')
        .select('id, total, ganancia, credito, metodo_pago, pago_mixto_metodo, pago_mixto_monto, venta_items(qty)')
        .eq('negocio_id', nid)
        .eq('anulada', false)
        .gte('fecha', start)
        .lt('fecha', end),
      supabase
        .from('venta_pagos')
        .select('monto, metodo, ventas!inner(credito)')
        .eq('negocio_id', nid)
        .gte('fecha', start)
        .lt('fecha', end),
      supabase
        .from('productos')
        .select('stock, stock_minimo')
        .eq('negocio_id', nid)
        .eq('activo', true),
    ])

    const ventas = (ventasRes.data ?? []) as VentaRow[]
    const abonos = (abonosRes.data ?? []) as AbonoPagoRow[]
    const prods  = prodRes.data ?? []

    const porMetodo: Record<string, number> = {}
    let creditoPendiente = 0, nBoletas = 0, nItems = 0, totalVentas = 0, totalGanancia = 0

    for (const v of ventas) {
      nBoletas++
      nItems       += v.venta_items.reduce((a, i) => a + Number(i.qty), 0)
      totalVentas  += Number(v.total)
      totalGanancia += Number(v.ganancia)
      if (v.credito) { creditoPendiente += Number(v.total); continue }
      const m2 = v.pago_mixto_monto ? Number(v.pago_mixto_monto) : null
      const k2 = v.pago_mixto_metodo
      if (m2 && k2) {
        const sec = Math.min(m2, Number(v.total))
        porMetodo[v.metodo_pago] = (porMetodo[v.metodo_pago] || 0) + Number(v.total) - sec
        porMetodo[k2]            = (porMetodo[k2] || 0) + sec
      } else {
        porMetodo[v.metodo_pago] = (porMetodo[v.metodo_pago] || 0) + Number(v.total)
      }
    }

    let abonosHoy = 0
    for (const p of abonos) {
      if (!p.ventas?.credito) continue
      const metodo = p.metodo || 'Efectivo'
      porMetodo[metodo] = (porMetodo[metodo] || 0) + Number(p.monto)
      abonosHoy += Number(p.monto)
    }

    const productosStockBajo = (prods as { stock: number; stock_minimo: number }[])
      .filter(p => Number(p.stock) <= Number(p.stock_minimo)).length

    setResumen({
      totalVentas, totalGanancia, nBoletas, nItems,
      efectivo:        porMetodo['Efectivo']      || 0,
      tarjeta:         porMetodo['Tarjeta']        || 0,
      transferencia:   porMetodo['Transferencia']  || 0,
      creditoPendiente, abonosHoy, productosStockBajo,
    })
    setLoadingResumen(false)
  }, [])

  const cargarCierres = useCallback(async (nid: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('cierres_caja')
      .select('id, fecha, total_ventas, total_gastos, efectivo_inicio, efectivo_final, diferencia, observaciones, created_at')
      .eq('negocio_id', nid)
      .order('fecha', { ascending: false })
      .limit(30)
    setCierres((data ?? []) as CierreCajaRow[])
    setLoadingCierres(false)
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
      setUserId(user.id)
      if (!cancelled) await Promise.all([cargarResumen(nid), cargarCierres(nid)])
    }
    init()
    return () => { cancelled = true }
  }, [cargarResumen, cargarCierres])

  const guardarCierre = useCallback(async (params: GuardarCierreParams) => {
    if (!negocioId) return
    const supabase = createClient()
    const { error } = await supabase.from('cierres_caja').upsert({
      negocio_id:      negocioId,
      fecha:           todayISO(),
      total_ventas:    resumen?.totalVentas ?? 0,
      total_gastos:    0,
      efectivo_inicio: 0,
      efectivo_final:  params.efectivoFinal,
      diferencia:      params.diferencia,
      observaciones:   params.observaciones || null,
      created_by:      userId,
    }, { onConflict: 'negocio_id,fecha' })
    if (error) throw error
    await cargarCierres(negocioId)
  }, [negocioId, userId, resumen, cargarCierres])

  return { resumen, cierres, loadingResumen, loadingCierres, guardarCierre }
}
