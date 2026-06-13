// Tests de los helpers de precio/formato — la matemática que cobra al cliente.
// Importan el código REAL de format.ts; si alguien cambia un cálculo, esto truena.
import { describe, it, expect } from 'vitest'
import {
  precioPorTramo,
  granelToBase,
  baseToSmall,
  granelInputUnit,
  precioDespachoDe,
  precioFormatoCanal,
  formatoEnCanal,
  stockState,
  UNIT_IS_WEIGHT,
} from '@/lib/format'
import type { Format } from '@/types'

const tramo = (qty: number, price: number): Format => ({ id: 'f' + qty, productId: 1, name: `${qty}`, qty, price })

describe('precioPorTramo — "a menor cantidad, mayor precio"', () => {
  // Tramos reales estilo frutos secos: 100g/$1.500 · 250g/$3.000 · 1kg/$10.000
  const tramos = [tramo(0.1, 1500), tramo(0.25, 3000), tramo(1, 10000)]

  it('usa la tarifa del tramo más grande que no supere la cantidad', () => {
    // 0.35 kg cae en el tramo de 0.25 (tarifa $12.000/kg) → $4.200
    expect(precioPorTramo(0.35, tramos)).toBe(4200)
  })
  it('bajo el tramo más chico usa la tarifa del más chico', () => {
    // 0.05 kg con tarifa del tramo 0.1 ($15.000/kg) → $750
    expect(precioPorTramo(0.05, tramos)).toBe(750)
  })
  it('cantidad exacta de un tramo cobra exactamente su precio', () => {
    expect(precioPorTramo(0.25, tramos)).toBe(3000)
    expect(precioPorTramo(1, tramos)).toBe(10000)
  })
  it('sobre el tramo más grande extiende su tarifa', () => {
    // 1.5 kg a $10.000/kg → $15.000
    expect(precioPorTramo(1.5, tramos)).toBe(15000)
  })
  it('sin tramos o cantidad cero devuelve 0', () => {
    expect(precioPorTramo(0.5, [])).toBe(0)
    expect(precioPorTramo(0, tramos)).toBe(0)
    // Tramos con qty 0 se ignoran (no dividen por cero)
    expect(precioPorTramo(0.5, [tramo(0, 999)])).toBe(0)
  })
  it('redondea a peso entero', () => {
    // 0.333 kg × $12.000 = $3.996 (entero, sin decimales)
    expect(Number.isInteger(precioPorTramo(0.333, tramos))).toBe(true)
  })
})

describe('granel: conversión unidad chica ↔ unidad base', () => {
  it('kg y litro se ingresan en g/ml y se convierten ÷1000', () => {
    expect(granelToBase('kg', 350)).toBe(0.35)
    expect(granelToBase('litro', 500)).toBe(0.5)
  })
  it('gramo y mililitro ya son la unidad chica (sin conversión)', () => {
    expect(granelToBase('gramo', 350)).toBe(350)
    expect(granelToBase('mililitro', 90)).toBe(90)
  })
  it('baseToSmall es el inverso exacto (ida y vuelta sin pérdida)', () => {
    expect(baseToSmall('kg', granelToBase('kg', 350))).toBe(350)
    expect(baseToSmall('gramo', granelToBase('gramo', 350))).toBe(350)
  })
  it('la unidad de entrada es g para pesos y ml para volúmenes', () => {
    expect(granelInputUnit('kg')).toBe('g')
    expect(granelInputUnit('gramo')).toBe('g')
    expect(granelInputUnit('litro')).toBe('ml')
    expect(granelInputUnit('mililitro')).toBe('ml')
  })
  it('UNIT_IS_WEIGHT reconoce solo unidades de peso/volumen', () => {
    expect(UNIT_IS_WEIGHT('kg')).toBe(true)
    expect(UNIT_IS_WEIGHT('Unidad')).toBe(false)
    expect(UNIT_IS_WEIGHT('caja')).toBe(false)
  })
})

describe('precios por canal (local vs despacho)', () => {
  it('producto: usa el precio de despacho solo si está definido y > 0', () => {
    expect(precioDespachoDe(1000, 1200)).toBe(1200)
    expect(precioDespachoDe(1000, undefined)).toBe(1000)
    expect(precioDespachoDe(1000, null)).toBe(1000)
    expect(precioDespachoDe(1000, 0)).toBe(1000)
  })
  it('formato: en local siempre cobra `price`; online usa su precio propio si existe', () => {
    const f = { price: 2000, precioDespacho: 2500 }
    expect(precioFormatoCanal(f, 'local')).toBe(2000)
    expect(precioFormatoCanal(f, 'despacho')).toBe(2500)
    expect(precioFormatoCanal({ price: 2000 }, 'despacho')).toBe(2000)
    expect(precioFormatoCanal({ price: 2000, precioDespacho: 0 }, 'despacho')).toBe(2000)
  })
  it('formatoEnCanal: vacío = ambos (retrocompatible); canal propio solo en su canal', () => {
    expect(formatoEnCanal(undefined, 'local')).toBe(true)
    expect(formatoEnCanal(undefined, 'despacho')).toBe(true)
    expect(formatoEnCanal('ambos', 'despacho')).toBe(true)
    expect(formatoEnCanal('local', 'local')).toBe(true)
    expect(formatoEnCanal('local', 'despacho')).toBe(false)
    expect(formatoEnCanal('despacho', 'local')).toBe(false)
  })
})

describe('stockState — semáforo de inventario', () => {
  it('sin stock / bajo / ok según el mínimo', () => {
    expect(stockState({ stock: 0, min: 5 })).toBe('sin')
    expect(stockState({ stock: 3, min: 5 })).toBe('bajo')
    expect(stockState({ stock: 5, min: 5 })).toBe('bajo') // igual al mínimo = bajo
    expect(stockState({ stock: 6, min: 5 })).toBe('ok')
  })
})
