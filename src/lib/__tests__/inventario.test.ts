// Tests del invariante MÁS importante del inventario: una venta descuenta
// unidades base y su anulación repone EXACTAMENTE lo mismo (simple, variantes
// y granel — solos o combinados). Este invariante se rompió dos veces en la
// historia del proyecto; desde aquí lo vigilan estos tests.
import { describe, it, expect } from 'vitest'
import { aplicarVentaAProducto, revertirVentaDeProducto, unidadesBaseDeItems } from '@/lib/store'
import type { Product, SaleItem } from '@/types'

const mkProducto = (p: Partial<Product> = {}): Product => ({
  id: 1, name: 'Huevo', cat: 'Huevos', unit: 'Unidad', cost: 200, price: 300,
  margin: 100, marginPct: 33.3, stock: 180, min: 30, sold: 0,
  ...p,
})

const simple = (qty: number): SaleItem => ({ productId: 1, name: 'Huevo', cat: 'Huevos', qty, price: 300, cost: 200 })
const pack = (qty: number, unidades: number): SaleItem => ({ productId: 1, name: `Huevo — Pack ${unidades}`, cat: 'Huevos', qty, price: 300 * unidades, cost: 200 * unidades, formatId: 'f1', baseUnitsPerItem: unidades })
const granel = (kg: number): SaleItem => ({ productId: 1, name: `Nueces · ${kg * 1000} g`, cat: 'Frutos secos', qty: 1, price: 4200, cost: 2800, formatId: 'granel:1', baseUnitsPerItem: kg })

describe('unidadesBaseDeItems — cuánto mueve cada tipo de línea', () => {
  it('simple = qty · variante = qty × unidades del pack · granel = fracción', () => {
    expect(unidadesBaseDeItems([simple(3)])).toBe(3)
    expect(unidadesBaseDeItems([pack(2, 6)])).toBe(12)
    expect(unidadesBaseDeItems([granel(0.35)])).toBe(0.35)
    expect(unidadesBaseDeItems([simple(3), pack(2, 6), granel(0.35)])).toBe(15.35)
  })
})

describe('aplicarVentaAProducto — la venta descuenta unidades base', () => {
  it('línea simple: stock −qty, vendido +qty', () => {
    const out = aplicarVentaAProducto(mkProducto({ stock: 180 }), [simple(3)])
    expect(out.stock).toBe(177)
    expect(out.sold).toBe(3)
  })
  it('variantes: 2 packs de 6 descuentan 12 del stock madre', () => {
    const out = aplicarVentaAProducto(mkProducto({ stock: 30 }), [pack(2, 6)])
    expect(out.stock).toBe(18)
    expect(out.sold).toBe(12)
  })
  it('combinación simple + variantes del MISMO producto en una boleta', () => {
    const out = aplicarVentaAProducto(mkProducto({ stock: 30 }), [simple(2), pack(1, 12)])
    expect(out.stock).toBe(16) // 30 − 2 − 12
    expect(out.sold).toBe(14)
  })
  it('granel fraccionado, con redondeo a 3 decimales (sin 9.299999…)', () => {
    const p = mkProducto({ unit: 'kg', stock: 10, sold: 0 })
    const una = aplicarVentaAProducto(p, [granel(0.35)])
    expect(una.stock).toBe(9.65)
    const dos = aplicarVentaAProducto(una, [granel(0.35)])
    expect(dos.stock).toBe(9.3) // exacto, no 9.299999999999999
    expect(dos.sold).toBe(0.7)
  })
  it('no toca productos que no están en la venta (misma referencia)', () => {
    const otro = mkProducto({ id: 99 })
    expect(aplicarVentaAProducto(otro, [simple(3)])).toBe(otro)
  })
  it('el invariante de Inventario: "Inicial" (stock + vendido) NO cambia al vender', () => {
    const p = mkProducto({ stock: 30, sold: 5 })
    const out = aplicarVentaAProducto(p, [simple(2), pack(1, 6), granel(0.5)])
    expect(out.stock + out.sold).toBeCloseTo(p.stock + p.sold, 10)
  })
  it('nunca deja stock negativo (defensa ante carreras multi-dispositivo)', () => {
    const out = aplicarVentaAProducto(mkProducto({ stock: 5 }), [pack(2, 6)])
    expect(out.stock).toBe(0)
  })
})

describe('revertirVentaDeProducto — anular es el espejo exacto', () => {
  const casos: [string, SaleItem[]][] = [
    ['simple', [simple(3)]],
    ['variantes', [pack(2, 6)]],
    ['granel', [granel(0.35)]],
    ['combinada', [simple(2), pack(1, 12), granel(0.25)]],
  ]
  it.each(casos)('venta %s: revertir(aplicar(p)) deja stock y vendido EXACTOS', (_n, items) => {
    const p = mkProducto({ unit: 'kg', stock: 50, sold: 7 })
    const vuelto = revertirVentaDeProducto(aplicarVentaAProducto(p, items), items)
    expect(vuelto.stock).toBe(p.stock)
    expect(vuelto.sold).toBe(p.sold)
  })
  it('reponer suma exactamente las unidades base de la venta', () => {
    const out = revertirVentaDeProducto(mkProducto({ stock: 18, sold: 12 }), [pack(2, 6)])
    expect(out.stock).toBe(30)
    expect(out.sold).toBe(0)
  })
  it('no toca productos ajenos a la venta', () => {
    const otro = mkProducto({ id: 99 })
    expect(revertirVentaDeProducto(otro, [simple(3)])).toBe(otro)
  })
})
