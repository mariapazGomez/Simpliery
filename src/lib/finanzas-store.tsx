'use client'

// ---------- Finanzas Store: gastos, nómina, marketing, metas, créditos ----------
// Portado de finanzas-store.jsx.

import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react'
import { useStore, TODAY, clientMetrics } from '@/lib/store'
import { useCloudCollection } from '@/lib/supabase/cloud-state'
import type { Gasto, NominaItem, MarketingItem, Meta, Credito, CreditoPago } from '@/types'

export const GASTO_CATS = ['Arriendo', 'Sueldos', 'Marketing', 'Mercadería', 'Servicios', 'Transporte', 'Comisiones', 'Contabilidad', 'Mantención', 'Otros']
export const GASTO_ICONS: Record<string, string> = {
  Arriendo: 'building', Sueldos: 'nomina', Marketing: 'megaphone', Mercadería: 'box', Servicios: 'zap',
  Transporte: 'truck', Comisiones: 'percent', Contabilidad: 'receipt', Mantención: 'config', Otros: 'tag',
}
export const GASTO_COLORS: Record<string, string> = {
  Arriendo: 'var(--terra)', Sueldos: 'var(--info)', Marketing: 'oklch(0.62 0.12 290)', Mercadería: 'var(--primary)',
  Servicios: 'oklch(0.66 0.10 80)', Transporte: 'var(--warn)', Comisiones: 'oklch(0.60 0.10 200)',
  Contabilidad: 'var(--ink-3)', Mantención: 'oklch(0.60 0.08 30)', Otros: 'var(--ink-3)',
}

interface FinanzasValue {
  gastos: Gasto[]
  nomina: NominaItem[]
  marketing: MarketingItem[]
  metas: Meta[]
  creditos: Credito[]
  addGasto: (g: Omit<Gasto, 'id'>) => void
  updateGasto: (id: string, p: Partial<Gasto>) => void
  deleteGasto: (id: string) => void
  payNomina: (id: string) => void
  addMeta: (m: Omit<Meta, 'id'>) => void
  updateMeta: (id: string, p: Partial<Meta>) => void
  addCredito: (c: Credito) => void
  updateCredito: (id: string, p: Partial<Credito>) => void
  pagarCredito: (id: string, pago: CreditoPago) => void
}

const FinCtx = createContext<FinanzasValue | null>(null)
export function useFinanzas(): FinanzasValue {
  const ctx = useContext(FinCtx)
  if (!ctx) throw new Error('useFinanzas debe usarse dentro de FinanzasProvider')
  return ctx
}

export function FinanzasProvider({ children }: { children: ReactNode }) {
  const { negocioId } = useStore()
  const [gastos, setGastos] = useCloudCollection<Gasto>('gastos', negocioId)
  const [nomina, setNomina] = useCloudCollection<NominaItem>('nomina', negocioId)
  const [marketing] = useCloudCollection<MarketingItem>('marketing', negocioId)
  const [metas, setMetas] = useCloudCollection<Meta>('metas', negocioId)
  const [creditos, setCreditos] = useCloudCollection<Credito>('creditos', negocioId)

  const addGasto = useCallback((g: Omit<Gasto, 'id'>) => setGastos((gs) => [...gs, { ...g, id: 'g' + Date.now() }]), [setGastos])
  const updateGasto = useCallback((id: string, p: Partial<Gasto>) => setGastos((gs) => gs.map((g) => (g.id === id ? { ...g, ...p } : g))), [setGastos])
  const deleteGasto = useCallback((id: string) => setGastos((gs) => gs.filter((g) => g.id !== id)), [setGastos])
  const payNomina = useCallback((id: string) => setNomina((ns) => ns.map((n) => (n.id === id ? { ...n, estado: 'pagado' as const } : n))), [setNomina])
  const addMeta = useCallback((m: Omit<Meta, 'id'>) => setMetas((ms) => [...ms, { ...m, id: 'mt' + Date.now() }]), [setMetas])
  const updateMeta = useCallback((id: string, p: Partial<Meta>) => setMetas((ms) => ms.map((m) => (m.id === id ? { ...m, ...p } : m))), [setMetas])
  const addCredito = useCallback((c: Credito) => setCreditos((cs) => [...cs, c]), [setCreditos])
  const updateCredito = useCallback((id: string, p: Partial<Credito>) => setCreditos((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c))), [setCreditos])
  const pagarCredito = useCallback(
    (id: string, pago: CreditoPago) =>
      setCreditos((cs) =>
        cs.map((c) => {
          if (c.id !== id) return c
          const nuevoSaldo = Math.max(0, c.saldo - (pago.amortizacion || 0))
          const nuevoEstado = nuevoSaldo <= 0 ? 'pagado' : c.estado
          return { ...c, saldo: nuevoSaldo, estado: nuevoEstado, pagos: [...(c.pagos || []), pago] }
        }),
      ),
    [setCreditos],
  )

  const value: FinanzasValue = { gastos, nomina, marketing, metas, creditos, addGasto, updateGasto, deleteGasto, payNomina, addMeta, updateMeta, addCredito, updateCredito, pagarCredito }
  return <FinCtx.Provider value={value}>{children}</FinCtx.Provider>
}

/* ---------- Métricas derivadas de finanzas ---------- */
export function useFinMetrics() {
  const { gastos, nomina, metas } = useFinanzas()
  const { sales, products, clientes } = useStore()
  return useMemo(() => {
    const now = TODAY
    const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1)
    const ventasMes = sales.filter((s) => s.date >= mesInicio)
    const ingresosMes = ventasMes.reduce((a, s) => a + s.total, 0)
    const costosMes = ventasMes.reduce((a, s) => a + s.cost, 0)
    const gananciaMes = ingresosMes - costosMes
    const margenProm = ingresosMes ? (gananciaMes / ingresosMes) * 100 : 0
    const ventasPorDia = ingresosMes / (now.getDate() || 1)
    const ventasPorSemana = ventasPorDia * 7

    const gastosMes = gastos.filter((g) => g.fecha >= mesInicio)
    const totalGastosMes = gastosMes.reduce((a, g) => a + g.monto, 0)
    const gastosFijos = gastos.filter((g) => g.recurrente).reduce((a, g) => a + g.monto, 0)
    const gastosVariables = totalGastosMes - gastos.filter((g) => g.recurrente && g.fecha >= mesInicio).reduce((a, g) => a + g.monto, 0)
    const gastosPendientes = gastos.filter((g) => g.estado === 'pendiente').reduce((a, g) => a + g.monto, 0)
    const utilidadEstimada = gananciaMes - totalGastosMes
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()
    const cajaProyectada = utilidadEstimada + ventasPorDia * daysLeft * (margenProm / 100) - gastosPendientes

    const valInventario = products.reduce((a, p) => a + p.stock * p.cost, 0)
    const prodBajaRotacion = products.filter((p) => p.sold < 3).length

    const enriched = clientes.map((c) => clientMetrics(c))
    const clientesActivos = enriched.filter((c) => c.daysSinceLast != null && c.daysSinceLast <= 30).length
    const proximos7 = enriched.filter((c) => c.daysUntilNext != null && c.daysUntilNext >= 0 && c.daysUntilNext <= 7).length
    const ticketProm = sales.length ? sales.reduce((a, s) => a + s.total, 0) / sales.length : 0
    const frecArr = enriched.filter((c) => c.frecuencia != null)
    const frecProm = frecArr.reduce((a, c) => a + (c.frecuencia || 0), 0) / (frecArr.length || 1)

    const nominaMes = nomina.reduce((a, n) => a + n.monto + (n.bono || 0), 0)

    const diaHoy = now.getDate()
    const weeklyFlow = [1, 2, 3, 4].map((w) => {
      const wStart = new Date(now.getFullYear(), now.getMonth(), (w - 1) * 7 + 1)
      const wEnd = new Date(now.getFullYear(), now.getMonth(), w * 7)
      const wSales = sales.filter((s) => s.date >= wStart && s.date <= wEnd)
      const wIng = wSales.reduce((a, s) => a + s.total, 0)
      const wCost = wSales.reduce((a, s) => a + s.cost, 0)
      const wGastos = gastos.filter((g) => { const d = g.fecha.getDate(); return d >= (w - 1) * 7 + 1 && d <= w * 7 && g.fecha.getMonth() === now.getMonth() }).reduce((a, g) => a + g.monto, 0)
      const isFuture = wStart.getDate() > diaHoy
      return {
        label: `Semana ${w}`,
        ingresos: isFuture ? ventasPorSemana * 0.9 : wIng,
        costos: isFuture ? ventasPorSemana * 0.6 : wCost,
        gastos: isFuture ? wGastos || gastosFijos / 4 : wGastos,
        saldo: isFuture ? (wIng || ventasPorSemana) - (wCost || ventasPorSemana * 0.6) - (wGastos || gastosFijos / 4) : wIng - wCost - wGastos,
        isFuture,
      }
    })

    const metaPrincipal = metas[0]
    const ventasNecesarias = metaPrincipal && margenProm > 0 ? (metaPrincipal.monto - metaPrincipal.saldoActual) / (margenProm / 100) : 0

    // Deuda real: ventas a crédito aún no pagadas. Monto = montoPendiente (cae a total si no existe).
    const deudaPendiente = sales.filter((s) => s.credito && !s.pagado)
    const totalDeuda = deudaPendiente.reduce((a, s) => a + (s.montoPendiente ?? s.total), 0)
    const clientesDeudoresN = new Set(deudaPendiente.map((s) => s.cliente?.nombre).filter(Boolean)).size

    return {
      ingresosMes, costosMes, gananciaMes, margenProm, ventasPorDia, ventasPorSemana, totalGastosMes, gastosFijos,
      gastosVariables, gastosPendientes, utilidadEstimada, cajaProyectada, valInventario, prodBajaRotacion,
      clientesActivos, proximos7, ticketProm, frecProm, nominaMes, weeklyFlow, metaPrincipal, ventasNecesarias,
      totalDeuda, clientesDeudoresN,
    }
  }, [sales, products, clientes, gastos, nomina, metas])
}
