'use client'

// ---------- Finanzas Store: gastos, nómina, marketing, metas, créditos ----------
// Portado de finanzas-store.jsx.

import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react'
import { useStore, useMetrics, TODAY, clientMetrics } from '@/lib/store'
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

export function seedGastos(): Gasto[] {
  const d = (daysAgo: number, dia = 1) => {
    const x = new Date(TODAY)
    x.setDate(x.getDate() - daysAgo + dia)
    return x
  }
  return [
    { id: 'g1', fecha: d(5), cat: 'Arriendo', desc: 'Arriendo junio 2026', monto: 480000, method: 'Transferencia', recurrente: true, proveedor: 'Inmobiliaria Castro', estado: 'pagado' },
    { id: 'g2', fecha: d(3), cat: 'Sueldos', desc: 'Sueldo Carlos - cajero', monto: 450000, method: 'Transferencia', recurrente: true, proveedor: 'Carlos Muñoz', estado: 'pagado' },
    { id: 'g3', fecha: d(8), cat: 'Sueldos', desc: 'Sueldo Valentina - despacho', monto: 380000, method: 'Transferencia', recurrente: true, proveedor: 'Valentina Rojas', estado: 'pagado' },
    { id: 'g4', fecha: d(10), cat: 'Marketing', desc: 'Meta Ads - campaña junio', monto: 85000, method: 'Tarjeta', recurrente: false, proveedor: 'Meta', estado: 'pagado' },
    { id: 'g5', fecha: d(12), cat: 'Marketing', desc: 'Instagram - influencer', monto: 60000, method: 'Transferencia', recurrente: false, proveedor: '@emporiochile', estado: 'pagado' },
    { id: 'g6', fecha: d(2), cat: 'Servicios', desc: 'Luz y agua', monto: 62000, method: 'Transferencia', recurrente: true, proveedor: 'CGE', estado: 'pagado' },
    { id: 'g7', fecha: d(1), cat: 'Servicios', desc: 'Internet fibra óptica', monto: 29900, method: 'Débito', recurrente: true, proveedor: 'Entel', estado: 'pagado' },
    { id: 'g8', fecha: d(0), cat: 'Transporte', desc: 'Combustible camioneta', monto: 48000, method: 'Efectivo', recurrente: false, proveedor: 'COPEC', estado: 'pagado' },
    { id: 'g9', fecha: d(0), cat: 'Mercadería', desc: 'Reposición quesos artesanales', monto: 190000, method: 'Transferencia', recurrente: false, proveedor: 'Quesos del Sur', estado: 'pagado' },
    { id: 'g10', fecha: d(15), cat: 'Contabilidad', desc: 'Honorarios contador', monto: 90000, method: 'Transferencia', recurrente: true, proveedor: 'Felipe CPA', estado: 'pagado' },
    { id: 'g11', fecha: d(25), cat: 'Arriendo', desc: 'Arriendo mayo 2026', monto: 480000, method: 'Transferencia', recurrente: true, proveedor: 'Inmobiliaria Castro', estado: 'pagado' },
    { id: 'g12', fecha: d(20), cat: 'Mantención', desc: 'Reparación refrigerador', monto: 75000, method: 'Efectivo', recurrente: false, proveedor: 'Técnico Gómez', estado: 'pagado' },
    { id: 'g13', fecha: d(0), cat: 'Comisiones', desc: 'Comisión Transbank', monto: 18500, method: 'Automático', recurrente: true, proveedor: 'Transbank', estado: 'pendiente' },
    { id: 'g14', fecha: d(0), cat: 'Sueldos', desc: 'Gratificación junio', monto: 82000, method: 'Transferencia', recurrente: false, proveedor: 'Carlos Muñoz', estado: 'pendiente' },
  ]
}

export function seedNomina(): NominaItem[] {
  return [
    { id: 'n1', nombre: 'Carlos Muñoz', cargo: 'Cajero', tipo: 'Fijo', monto: 450000, dia: 5, estado: 'pagado', horas: 160, bono: 0 },
    { id: 'n2', nombre: 'Valentina Rojas', cargo: 'Despacho', tipo: 'Fijo', monto: 380000, dia: 5, estado: 'pagado', horas: 140, bono: 0 },
    { id: 'n3', nombre: 'Pedro Arriagada', cargo: 'Reposición', tipo: 'Variable', monto: 180000, dia: 15, estado: 'pendiente', horas: 80, bono: 15000 },
  ]
}

export function seedMarketing(): MarketingItem[] {
  // Fechas relativas a TODAY (días atrás) para que el ejemplo no quede en el pasado.
  const dAgo = (daysAgo: number) => {
    const x = new Date(TODAY)
    x.setDate(x.getDate() - daysAgo)
    return x
  }
  return [
    { id: 'mk1', campaign: 'Quesos artesanales', canal: 'Meta Ads', fecha: dAgo(7), monto: 85000, ventasGeneradas: 320000, clientesNuevos: 8, obs: 'Buen alcance, bajo CPC' },
    { id: 'mk2', campaign: 'Frutos secos verano', canal: 'Instagram orgánico', fecha: dAgo(5), monto: 0, ventasGeneradas: 85000, clientesNuevos: 3, obs: 'Post viral' },
    { id: 'mk3', campaign: 'Influencer @emporiochile', canal: 'Influencer', fecha: dAgo(11), monto: 60000, ventasGeneradas: 210000, clientesNuevos: 14, obs: 'Buen ROAS' },
    { id: 'mk4', campaign: 'Volantes barrio', canal: 'Volantes', fecha: dAgo(24), monto: 15000, ventasGeneradas: 60000, clientesNuevos: 2, obs: 'Difícil medir' },
  ]
}

export function seedCreditos(): Credito[] {
  // Fechas relativas a TODAY: próximas cuotas a futuro, pagos en el pasado reciente.
  const dRel = (days: number) => {
    const x = new Date(TODAY)
    x.setDate(x.getDate() + days)
    return x
  }
  return [
    { id: 'cr1', acreedor: 'Banco Estado', tipo: 'Préstamo bancario', montoOriginal: 8000000, saldo: 5200000, tasaAnual: 14.5, cuotaMensual: 280000, proximaCuota: dRel(11), estado: 'vigente', notas: 'Crédito 36 meses', pagos: [{ monto: 280000, fecha: dRel(-19), nota: 'Cuota mes anterior', interes: 62833, amortizacion: 217167, saldoAntes: 5417167, saldoDespues: 5200000 }] },
    { id: 'cr2', acreedor: 'Proveedor Quesos del Sur', tipo: 'Deuda proveedor', montoOriginal: 350000, saldo: 190000, tasaAnual: 0, cuotaMensual: 95000, proximaCuota: dRel(6), estado: 'vigente', notas: 'Pago en 2 cuotas acordadas', pagos: [] },
    { id: 'cr3', acreedor: 'Leasing refrigerador', tipo: 'Leasing', montoOriginal: 1200000, saldo: 780000, tasaAnual: 9.8, cuotaMensual: 38000, proximaCuota: dRel(21), estado: 'al_dia', notas: '24 cuotas', pagos: [] },
    { id: 'cr4', acreedor: 'Banco BBCI', tipo: 'Línea de crédito', montoOriginal: 2000000, saldo: 0, tasaAnual: 18, cuotaMensual: 0, proximaCuota: dRel(23), estado: 'pagado', notas: 'Línea disponible, saldo pagado', pagos: [] },
  ]
}

export function seedMetas(): Meta[] {
  // Fechas objetivo relativas a TODAY (meses a futuro) para que el ejemplo no quede vencido.
  const mesesAdelante = (meses: number) => {
    const x = new Date(TODAY)
    x.setMonth(x.getMonth() + meses)
    return x
  }
  return [
    { id: 'mt1', nombre: 'Reposición mercadería', monto: 5000000, fechaObj: mesesAdelante(3), saldoActual: 1200000, aporteEsperado: 295000, prioridad: 'Alta', color: 'var(--primary)' },
    { id: 'mt2', nombre: 'Comprar refrigerador nuevo', monto: 1200000, fechaObj: mesesAdelante(2), saldoActual: 400000, aporteEsperado: 200000, prioridad: 'Media', color: 'var(--info)' },
  ]
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
  // useMetrics no se usa aquí directamente, pero se mantiene la dependencia de datos vía store.
  void useMetrics
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
