'use client'

// ---------- Finanzas Store: gastos, nómina, marketing, metas, créditos ----------
// Portado de finanzas-store.jsx.

import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useStore, TODAY, clientMetrics } from '@/lib/store'
import type { Gasto, NominaItem, MarketingItem, Meta, Credito, CreditoPago } from '@/types'

/** Mes de una fecha como "AAAA-MM" (comparable como texto). */
const periodoDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
/** ¿Es un gasto fijo? El recurrente "madre" o cualquiera de sus copias mensuales. */
export const esGastoFijo = (g: Gasto) => g.recurrente || !!g.recurrenteOrigen

/** Dada la lista de gastos y la fecha de hoy, devuelve las copias mensuales que
 *  FALTAN para los gastos recurrentes: una por cada mes entre el mes del gasto
 *  madre y el mes actual. Id determinista (`g-rec-<madre>-<AAAA-MM>`) → idempotente
 *  y a prueba de carreras multi-dispositivo (un mismo mes nunca se duplica). */
export function instanciasFaltantes(gastos: Gasto[], hoy: Date): Gasto[] {
  const anclas = gastos.filter((g) => g.recurrente && !g.recurrenteOrigen)
  if (!anclas.length) return []
  const existentes = new Set(gastos.map((g) => g.id))
  const periodoHoy = periodoDe(hoy)
  const nuevos: Gasto[] = []
  for (const ancla of anclas) {
    const cursor = new Date(ancla.fecha.getFullYear(), ancla.fecha.getMonth(), 1)
    while (periodoDe(cursor) <= periodoHoy) {
      const periodo = periodoDe(cursor)
      const id = `g-rec-${ancla.id}-${periodo}`
      // El mes del ancla ya está cubierto por el ancla; los demás se generan.
      if (periodoDe(ancla.fecha) !== periodo && !existentes.has(id)) {
        const ultimoDia = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
        const dia = Math.min(ancla.fecha.getDate(), ultimoDia)
        nuevos.push({
          ...ancla,
          id,
          fecha: new Date(cursor.getFullYear(), cursor.getMonth(), dia),
          periodo,
          recurrente: false,
          recurrenteOrigen: ancla.id,
          estado: 'pendiente',
        })
      }
      cursor.setMonth(cursor.getMonth() + 1)
    }
  }
  return nuevos
}

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
  addNomina: (n: Omit<NominaItem, 'id'>) => void
  payNomina: (id: string) => void
  deleteNomina: (id: string) => void
  addMarketing: (mk: Omit<MarketingItem, 'id'>) => void
  deleteMarketing: (id: string) => void
  addMeta: (m: Omit<Meta, 'id'>) => void
  updateMeta: (id: string, p: Partial<Meta>) => void
  deleteMeta: (id: string) => void
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
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [nomina, setNomina] = useState<NominaItem[]>([])
  const [marketing, setMarketing] = useState<MarketingItem[]>([])
  const [metas, setMetas] = useState<Meta[]>([])
  const [creditos, setCreditos] = useState<Credito[]>([])

  const addGasto = useCallback((g: Omit<Gasto, 'id'>) => setGastos((gs) => [...gs, { ...g, id: 'g' + Date.now() }]), [setGastos])
  const updateGasto = useCallback((id: string, p: Partial<Gasto>) => setGastos((gs) => gs.map((g) => (g.id === id ? { ...g, ...p } : g))), [setGastos])
  const deleteGasto = useCallback((id: string) => setGastos((gs) => gs.filter((g) => g.id !== id)), [setGastos])
  const addNomina = useCallback((n: Omit<NominaItem, 'id'>) => setNomina((ns) => [...ns, { ...n, id: 'n' + Date.now() }]), [setNomina])
  // Alterna pagado↔pendiente (permite deshacer un clic por error, igual que en gastos).
  const payNomina = useCallback((id: string) => setNomina((ns) => ns.map((n) => (n.id === id ? { ...n, estado: n.estado === 'pagado' ? 'pendiente' as const : 'pagado' as const } : n))), [setNomina])
  const deleteNomina = useCallback((id: string) => setNomina((ns) => ns.filter((n) => n.id !== id)), [setNomina])
  const addMarketing = useCallback((mk: Omit<MarketingItem, 'id'>) => setMarketing((ms) => [...ms, { ...mk, id: 'mk' + Date.now() }]), [setMarketing])
  const deleteMarketing = useCallback((id: string) => setMarketing((ms) => ms.filter((m) => m.id !== id)), [setMarketing])
  const addMeta = useCallback((m: Omit<Meta, 'id'>) => setMetas((ms) => [...ms, { ...m, id: 'mt' + Date.now() }]), [setMetas])
  const updateMeta = useCallback((id: string, p: Partial<Meta>) => setMetas((ms) => ms.map((m) => (m.id === id ? { ...m, ...p } : m))), [setMetas])
  const deleteMeta = useCallback((id: string) => setMetas((ms) => ms.filter((m) => m.id !== id)), [setMetas])
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

  // Genera las copias mensuales faltantes de los gastos recurrentes (arriendo,
  // sueldos fijos…) hasta el mes actual. Idempotente: una vez creadas, no repite.
  useEffect(() => {
    if (!negocioId) return
    const faltan = instanciasFaltantes(gastos, TODAY)
    if (faltan.length) setGastos((gs) => [...gs, ...faltan])
  }, [negocioId, gastos, setGastos])

  const value: FinanzasValue = { gastos, nomina, marketing, metas, creditos, addGasto, updateGasto, deleteGasto, addNomina, payNomina, deleteNomina, addMarketing, deleteMarketing, addMeta, updateMeta, deleteMeta, addCredito, updateCredito, pagarCredito }
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
    // Fijos = los recurrentes de ESTE mes (madre o copia mensual generada), no
    // todos los de la historia. El resto del mes es variable.
    const gastosFijos = gastosMes.filter(esGastoFijo).reduce((a, g) => a + g.monto, 0)
    const gastosVariables = totalGastosMes - gastosFijos
    const gastosPendientes = gastos.filter((g) => g.estado === 'pendiente').reduce((a, g) => a + g.monto, 0)
    const utilidadEstimada = gananciaMes - totalGastosMes
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()
    const cajaProyectada = utilidadEstimada + ventasPorDia * daysLeft * (margenProm / 100) - gastosPendientes

    const valInventario = products.reduce((a, p) => a + p.stock * p.cost, 0)
    const bajaRotacion = products.filter((p) => p.sold < 3)
    const prodBajaRotacion = bajaRotacion.length
    const valBajaRotacion = bajaRotacion.reduce((a, p) => a + p.stock * p.cost, 0)

    const enriched = clientes.map((c) => clientMetrics(c))
    const clientesActivos = enriched.filter((c) => c.daysSinceLast != null && c.daysSinceLast <= 30).length
    const proximos7 = enriched.filter((c) => c.daysUntilNext != null && c.daysUntilNext >= 0 && c.daysUntilNext <= 7).length
    const ticketProm = sales.length ? sales.reduce((a, s) => a + s.total, 0) / sales.length : 0
    const frecArr = enriched.filter((c) => c.frecuencia != null)
    const frecProm = frecArr.reduce((a, c) => a + (c.frecuencia || 0), 0) / (frecArr.length || 1)

    const nominaMes = nomina.reduce((a, n) => a + n.monto + (n.bono || 0), 0)

    const diaHoy = now.getDate()
    const finDeMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const weeklyFlow = [1, 2, 3, 4].map((w) => {
      // La semana 4 llega hasta fin de mes (días 29-31 incluidos).
      const lastDay = w === 4 ? finDeMes : w * 7
      const wStart = new Date(now.getFullYear(), now.getMonth(), (w - 1) * 7 + 1)
      const wEnd = new Date(now.getFullYear(), now.getMonth(), lastDay, 23, 59, 59)
      const wSales = sales.filter((s) => s.date >= wStart && s.date <= wEnd)
      const wIng = wSales.reduce((a, s) => a + s.total, 0)
      const wCost = wSales.reduce((a, s) => a + s.cost, 0)
      const wGastos = gastos.filter((g) => { const d = g.fecha.getDate(); return d >= (w - 1) * 7 + 1 && d <= lastDay && g.fecha.getMonth() === now.getMonth() }).reduce((a, g) => a + g.monto, 0)
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
      gastosVariables, gastosPendientes, utilidadEstimada, cajaProyectada, valInventario, prodBajaRotacion, valBajaRotacion,
      clientesActivos, proximos7, ticketProm, frecProm, nominaMes, weeklyFlow, metaPrincipal, ventasNecesarias,
      totalDeuda, clientesDeudoresN,
    }
  }, [sales, products, clientes, gastos, nomina, metas])
}
