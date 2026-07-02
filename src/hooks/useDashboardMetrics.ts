'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { catColor } from '@/lib/format'
import { downloadBlob } from '@/lib/exports'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CatMetric {
  cat: string
  revenue: number
  cost: number
  profit: number
  marginPct: number
  color: string
}

export interface ProductMetric {
  id: string
  name: string
  cat: string
  sold: number       // unidades vendidas (30d)
  price: number
  cost: number
  marginPct: number
}

export interface DashboardMetrics {
  // hoy
  todayTotal: number
  todayProfit: number
  todayCost: number
  boletas: number
  avgMargin: number
  pay: Record<string, number>       // breakdown por método de pago (hoy)
  // tendencia 7 días
  trend: number[]
  trendLabels: string[]
  weekDelta: number | null          // % vs semana anterior
  // categorías y productos (últimos 30 días)
  cats: CatMetric[]
  topProducts: ProductMetric[]
  // alertas
  lowStockCount: number
  totalDeuda: number
  clientesDeudores: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayKey(d: Date): string { return d.toDateString() }

function daysAgoStart(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function monthStart(): string {
  const d = new Date()
  d.setDate(1); d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function todayRange(): { start: string; end: string } {
  const now = new Date()
  return {
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
    end:   new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
  }
}

// Replica la lógica de montosPorMetodo del store (sin importar el store)
function ventaMetodos(row: {
  total: number; metodo_pago: string; credito: boolean
  pago_mixto_metodo: string | null; pago_mixto_monto: number | null
}): [string, number][] {
  if (row.credito) return []
  const m2 = row.pago_mixto_metodo
  const v2 = row.pago_mixto_monto ? Number(row.pago_mixto_monto) : null
  if (m2 && v2) {
    const sec = Math.min(v2, Number(row.total))
    return [[row.metodo_pago, Number(row.total) - sec], [m2, sec]]
  }
  return [[row.metodo_pago, Number(row.total)]]
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const EMPTY: DashboardMetrics = {
  todayTotal: 0, todayProfit: 0, todayCost: 0, boletas: 0, avgMargin: 0,
  pay: {}, trend: Array(7).fill(0), trendLabels: [], weekDelta: null,
  cats: [], topProducts: [], lowStockCount: 0, totalDeuda: 0, clientesDeudores: 0,
}

export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY)
  const [loading, setLoading]   = useState(true)
  const [negocioId, setNegocioId] = useState<string | null>(null)

  const cargar = useCallback(async (nid: string) => {
    const supabase = createClient()

    const [ventasRes, itemsRes, deudaRes, prodsRes] = await Promise.all([
      // 1. Ventas últimos 30 días (today + trend + pay)
      supabase
        .from('ventas')
        .select('id, fecha, total, ganancia, costo, metodo_pago, pago_mixto_metodo, pago_mixto_monto, credito, pagado, monto_pendiente, cliente_snapshot')
        .eq('negocio_id', nid)
        .eq('anulada', false)
        .gte('fecha', daysAgoStart(29)),

      // 2. Venta items últimos 30 días (categorías y top productos)
      supabase
        .from('venta_items')
        .select('producto_id, nombre, categoria, qty, precio, costo')
        .eq('negocio_id', nid)
        .gte('created_at', daysAgoStart(29)),

      // 3. Fiados pendientes (de cualquier fecha)
      supabase
        .from('ventas')
        .select('total, monto_pendiente, cliente_snapshot')
        .eq('negocio_id', nid)
        .eq('credito', true)
        .eq('pagado', false)
        .eq('anulada', false),

      // 4. Productos para stock bajo
      supabase
        .from('productos')
        .select('stock, stock_minimo')
        .eq('negocio_id', nid)
        .eq('activo', true),
    ])

    const ventas = (ventasRes.data ?? []) as {
      id: string; fecha: string; total: number; ganancia: number; costo: number
      metodo_pago: string; pago_mixto_metodo: string | null; pago_mixto_monto: number | null
      credito: boolean; pagado: boolean; monto_pendiente: number
      cliente_snapshot: { nombre?: string } | null
    }[]
    const items = (itemsRes.data ?? []) as {
      producto_id: string | null; nombre: string; categoria: string
      qty: number; precio: number; costo: number
    }[]
    const deudas  = (deudaRes.data  ?? []) as { total: number; monto_pendiente: number; cliente_snapshot: { nombre?: string } | null }[]
    const prods   = (prodsRes.data  ?? []) as { stock: number; stock_minimo: number }[]

    // ── Hoy ───────────────────────────────────────────────────────────────────
    const { start: todayStart, end: todayEnd } = todayRange()
    const todaySales = ventas.filter(v => v.fecha >= todayStart && v.fecha < todayEnd)
    const todayTotal  = todaySales.reduce((a, v) => a + Number(v.total),   0)
    const todayProfit = todaySales.reduce((a, v) => a + Number(v.ganancia), 0)
    const todayCost   = todaySales.reduce((a, v) => a + Number(v.costo),   0)
    const boletas     = todaySales.length
    const avgMargin   = todayTotal > 0 ? (todayProfit / todayTotal) * 100 : 0

    const pay: Record<string, number> = {}
    for (const v of todaySales)
      for (const [m, amt] of ventaMetodos(v))
        pay[m] = (pay[m] || 0) + amt

    // ── Tendencia 7 días ──────────────────────────────────────────────────────
    const totalsByDay: Record<string, number> = {}
    for (const v of ventas)
      totalsByDay[dayKey(new Date(v.fecha))] = (totalsByDay[dayKey(new Date(v.fecha))] || 0) + Number(v.total)

    const today = new Date()
    const trend: number[] = []
    const trendLabels: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      trend.push(totalsByDay[dayKey(d)] || 0)
      trendLabels.push(i === 0 ? 'Hoy' : d.toLocaleDateString('es-CL', { weekday: 'short' }))
    }
    const thisWeek = trend.reduce((a, b) => a + b, 0)
    let prevWeek = 0
    for (let i = 13; i >= 7; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      prevWeek += totalsByDay[dayKey(d)] || 0
    }
    const weekDelta = prevWeek > 0 ? ((thisWeek - prevWeek) / prevWeek) * 100 : null

    // ── Categorías (30d) ──────────────────────────────────────────────────────
    const byCat: Record<string, { cat: string; revenue: number; cost: number; profit: number }> = {}
    for (const it of items) {
      const cat = it.categoria || 'Sin categoría'
      if (!byCat[cat]) byCat[cat] = { cat, revenue: 0, cost: 0, profit: 0 }
      const rev = Number(it.qty) * Number(it.precio)
      const cos = Number(it.qty) * Number(it.costo)
      byCat[cat].revenue += rev
      byCat[cat].cost    += cos
      byCat[cat].profit  += rev - cos
    }
    const cats: CatMetric[] = Object.values(byCat)
      .map(c => ({ ...c, marginPct: c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0, color: catColor(c.cat) }))
      .sort((a, b) => b.revenue - a.revenue)

    // ── Top productos (30d) ───────────────────────────────────────────────────
    const byProd: Record<string, { id: string; name: string; cat: string; sold: number; price: number; cost: number }> = {}
    for (const it of items) {
      const key = it.producto_id ?? it.nombre
      if (!byProd[key]) byProd[key] = { id: it.producto_id ?? key, name: it.nombre, cat: it.categoria || '', sold: 0, price: Number(it.precio), cost: Number(it.costo) }
      byProd[key].sold  += Number(it.qty)
      byProd[key].price  = Math.max(byProd[key].price, Number(it.precio))
      byProd[key].cost   = Number(it.costo) || byProd[key].cost
    }
    const topProducts: ProductMetric[] = Object.values(byProd)
      .map(p => ({ ...p, marginPct: p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0 }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 6)

    // ── Alertas ───────────────────────────────────────────────────────────────
    const lowStockCount = prods.filter(p => Number(p.stock) <= Number(p.stock_minimo)).length

    const totalDeuda = deudas.reduce((a, d) => a + (Number(d.monto_pendiente) || Number(d.total)), 0)
    const clientesDeudores = new Set(
      deudas.map(d => d.cliente_snapshot?.nombre).filter(Boolean)
    ).size

    setMetrics({
      todayTotal, todayProfit, todayCost, boletas, avgMargin, pay,
      trend, trendLabels, weekDelta,
      cats, topProducts,
      lowStockCount, totalDeuda, clientesDeudores,
    })
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

  // Exporta ventas del mes actual con sus ítems (lazy, on demand)
  const exportarMes = useCallback(async () => {
    if (!negocioId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('ventas')
      .select('boleta, fecha, total, ganancia, metodo_pago, cliente_snapshot, venta_items(nombre, categoria, qty, precio, costo)')
      .eq('negocio_id', negocioId)
      .eq('anulada', false)
      .gte('fecha', monthStart())
      .order('fecha', { ascending: false })

    type RawV = { boleta: number; fecha: string; total: number; ganancia: number; metodo_pago: string; cliente_snapshot: { nombre?: string } | null; venta_items: { nombre: string; categoria: string; qty: number; precio: number; costo: number }[] }
    const rows = ((data ?? []) as RawV[]).flatMap(v =>
      v.venta_items.map(it => ({
        Boleta: v.boleta,
        Fecha: new Date(v.fecha).toLocaleDateString('es-CL'),
        Hora: new Date(v.fecha).toLocaleTimeString('es-CL'),
        Producto: it.nombre,
        Categoría: it.categoria,
        Cantidad: it.qty,
        Precio_unit: it.precio,
        Total_item: Number(it.precio) * Number(it.qty),
        Costo_unit: it.costo,
        Costo_total: Number(it.costo) * Number(it.qty),
        Ganancia: (Number(it.precio) - Number(it.costo)) * Number(it.qty),
        Metodo_pago: v.metodo_pago,
        Cliente: v.cliente_snapshot?.nombre || '',
      }))
    )

    const hdrs = ['Boleta','Fecha','Hora','Producto','Categoría','Cantidad','Precio_unit','Total_item','Costo_unit','Costo_total','Ganancia','Metodo_pago','Cliente']
    const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s }
    const csv = [hdrs.join(','), ...rows.map(r => hdrs.map(h => esc(r[h as keyof typeof r])).join(','))].join('\r\n')
    const mes = new Date().toLocaleDateString('es-CL', { month: 'short', year: 'numeric' }).replace(/ /g, '_')
    downloadBlob(csv, `ventas_${mes}.csv`)
  }, [negocioId])

  return { metrics, loading, exportarMes }
}
