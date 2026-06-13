// Tests de los gastos recurrentes: un gasto marcado "se repite cada mes" debe
// materializar una copia por cada mes entre el mes en que se creó y el mes
// actual, sin duplicar (id determinista) y dejando cada mes como pendiente.
import { describe, it, expect } from 'vitest'
import { instanciasFaltantes, esGastoFijo } from '@/lib/finanzas-store'
import type { Gasto } from '@/types'

const mkGasto = (p: Partial<Gasto> = {}): Gasto => ({
  id: 'g1', fecha: new Date(2026, 2, 5), cat: 'Arriendo', desc: 'Arriendo', monto: 300000,
  method: 'Transferencia', recurrente: false, proveedor: 'Inmobiliaria', estado: 'pagado', ...p,
})

const HOY = new Date(2026, 5, 12) // 12-jun-2026

describe('instanciasFaltantes — copias mensuales de gastos recurrentes', () => {
  it('un recurrente de marzo genera abril, mayo y junio (no marzo: ya está el madre)', () => {
    const ancla = mkGasto({ id: 'g1', recurrente: true, fecha: new Date(2026, 2, 5) })
    const out = instanciasFaltantes([ancla], HOY)
    expect(out.map((g) => g.periodo)).toEqual(['2026-04', '2026-05', '2026-06'])
    expect(out.every((g) => g.recurrenteOrigen === 'g1')).toBe(true)
    expect(out.every((g) => g.estado === 'pendiente' && !g.recurrente)).toBe(true)
    expect(out.every((g) => g.monto === 300000)).toBe(true)
  })

  it('id determinista g-rec-<madre>-<mes>', () => {
    const ancla = mkGasto({ id: 'gX', recurrente: true, fecha: new Date(2026, 4, 1) })
    const out = instanciasFaltantes([ancla], HOY)
    expect(out.map((g) => g.id)).toEqual(['g-rec-gX-2026-06'])
  })

  it('idempotente: si las copias ya existen, no genera nada', () => {
    const ancla = mkGasto({ id: 'g1', recurrente: true, fecha: new Date(2026, 2, 5) })
    const primera = instanciasFaltantes([ancla], HOY)
    const segunda = instanciasFaltantes([ancla, ...primera], HOY)
    expect(segunda).toEqual([])
  })

  it('un gasto NO recurrente no genera copias', () => {
    expect(instanciasFaltantes([mkGasto({ recurrente: false })], HOY)).toEqual([])
  })

  it('recurrente creado este mes: aún no genera (solo el madre cubre el mes)', () => {
    const ancla = mkGasto({ id: 'g1', recurrente: true, fecha: new Date(2026, 5, 3) })
    expect(instanciasFaltantes([ancla], HOY)).toEqual([])
  })

  it('día 31 en un mes corto se ajusta al último día (no se desborda al mes siguiente)', () => {
    const ancla = mkGasto({ id: 'g1', recurrente: true, fecha: new Date(2026, 0, 31) }) // 31-ene
    const out = instanciasFaltantes([ancla], new Date(2026, 1, 15)) // hasta feb-2026
    expect(out).toHaveLength(1)
    expect(out[0].periodo).toBe('2026-02')
    expect(out[0].fecha.getMonth()).toBe(1) // febrero, no marzo
    expect(out[0].fecha.getDate()).toBe(28)
  })

  it('esGastoFijo reconoce al madre y a las copias', () => {
    expect(esGastoFijo(mkGasto({ recurrente: true }))).toBe(true)
    expect(esGastoFijo(mkGasto({ recurrente: false, recurrenteOrigen: 'g1' }))).toBe(true)
    expect(esGastoFijo(mkGasto({ recurrente: false }))).toBe(false)
  })
})
