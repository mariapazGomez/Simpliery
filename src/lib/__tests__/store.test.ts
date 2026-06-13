// Tests de los invariantes del store: montosPorMetodo (la única fuente de verdad
// del dinero por método — la consumen cierre de caja, flujo, reportes y dashboard)
// y clientMetrics (categoría VIP/riesgo, frecuencia y proyección de recompra).
import { describe, it, expect } from 'vitest'
import { montosPorMetodo, clientMetrics } from '@/lib/store'
import type { Sale, Cliente, Compra } from '@/types'

/* ── helpers de datos mínimos (tipos completos, valores de prueba) ── */
const mkSale = (p: Partial<Sale>): Sale => ({
  id: 'b1', boleta: 1, date: new Date(), items: [], method: 'Efectivo',
  total: 0, cost: 0, profit: 0, tipo: 'local', cliente: null,
  credito: false, pagado: true, montoPendiente: 0, pagos: [],
  ...p,
})

const DIA = 86400000
const hace = (dias: number) => new Date(Date.now() - dias * DIA)

const mkCompra = (p: Partial<Compra>): Compra => ({
  id: 'c1', boleta: 1, date: new Date(), method: 'Efectivo', total: 0, cost: 0, profit: 0,
  items: [],
  ...p,
})

const mkCliente = (compras: Compra[]): Cliente => ({
  id: 'cl1', nombre: 'Test', telefono: '', correo: '', ciudad: '', createdAt: hace(100), nota: '', compras,
})

/* ── montosPorMetodo ── */
describe('montosPorMetodo — dinero por método (cierre/flujo/reportes)', () => {
  it('venta simple: todo al método principal', () => {
    expect(montosPorMetodo(mkSale({ method: 'Efectivo', total: 10000 }))).toEqual([['Efectivo', 10000]])
  })
  it('pago dividido: reparte entre principal y secundario', () => {
    const s = mkSale({ method: 'Efectivo', total: 10000, pagoMixto: { metodo: 'Tarjeta', monto: 4000 } })
    expect(montosPorMetodo(s)).toEqual([['Efectivo', 6000], ['Tarjeta', 4000]])
  })
  it('el monto secundario nunca supera el total (clamp)', () => {
    const s = mkSale({ method: 'Efectivo', total: 10000, pagoMixto: { metodo: 'Tarjeta', monto: 15000 } })
    expect(montosPorMetodo(s)).toEqual([['Efectivo', 0], ['Tarjeta', 10000]])
  })
  it('crédito ignora el pago dividido (la caja entra vía abonos)', () => {
    const s = mkSale({ method: 'Crédito', total: 10000, credito: true, pagado: false, montoPendiente: 10000, pagoMixto: { metodo: 'Tarjeta', monto: 4000 } })
    expect(montosPorMetodo(s)).toEqual([['Crédito', 10000]])
  })
  it('pago dividido con monto 0 cuenta como pago simple', () => {
    const s = mkSale({ method: 'Efectivo', total: 5000, pagoMixto: { metodo: 'Tarjeta', monto: 0 } })
    expect(montosPorMetodo(s)).toEqual([['Efectivo', 5000]])
  })
  it('la suma de los repartos SIEMPRE es igual al total de la venta', () => {
    const casos = [
      mkSale({ total: 9990, pagoMixto: { metodo: 'Tarjeta', monto: 3333 } }),
      mkSale({ total: 100, pagoMixto: { metodo: 'Transferencia', monto: 100 } }),
      mkSale({ total: 7500 }),
    ]
    for (const s of casos) {
      const suma = montosPorMetodo(s).reduce((a, [, v]) => a + v, 0)
      expect(suma).toBe(s.total)
    }
  })
})

/* ── clientMetrics ── */
describe('clientMetrics — el cliente como activo', () => {
  it('cliente sin compras: todo en cero y categoría Nuevo', () => {
    const m = clientMetrics(mkCliente([]))
    expect(m.totalGastado).toBe(0)
    expect(m.ticketMedio).toBe(0)
    expect(m.lastCompra).toBeNull()
    expect(m.frecuencia).toBeNull()
    expect(m.nextExpected).toBeNull()
    expect(m.categoria).toBe('Nuevo')
  })

  it('total, ticket medio, frecuencia y próxima compra desde el historial', () => {
    const c = mkCliente([
      mkCompra({ id: 'a', date: hace(20), total: 8000 }),
      mkCompra({ id: 'b', date: hace(10), total: 12000 }),
    ])
    const m = clientMetrics(c)
    expect(m.totalGastado).toBe(20000)
    expect(m.ticketMedio).toBe(10000)
    expect(m.daysSinceLast).toBe(10)
    expect(m.frecuencia).toBe(10) // compró cada 10 días
    // próxima esperada = última + frecuencia = hoy (±0 días)
    expect(Math.abs(m.daysUntilNext ?? 99)).toBeLessThanOrEqual(1)
  })

  it('VIP requiere gasto alto Y muchas compras', () => {
    const seisCompras = Array.from({ length: 6 }, (_, i) => mkCompra({ id: 'v' + i, date: hace(30 - i * 5), total: 40000 }))
    expect(clientMetrics(mkCliente(seisCompras)).categoria).toBe('VIP')
    // Mismo gasto pero pocas compras NO es VIP
    const dosGrandes = [mkCompra({ id: 'g1', date: hace(10), total: 120000 }), mkCompra({ id: 'g2', date: hace(5), total: 120000 })]
    expect(clientMetrics(mkCliente(dosGrandes)).categoria).not.toBe('VIP')
  })

  it('más de 45 días sin comprar = En riesgo', () => {
    const c = mkCliente([
      mkCompra({ id: 'r1', date: hace(90), total: 5000 }),
      mkCompra({ id: 'r2', date: hace(75), total: 5000 }),
      mkCompra({ id: 'r3', date: hace(60), total: 5000 }),
    ])
    expect(clientMetrics(mkCliente(c.compras)).categoria).toBe('En riesgo')
  })

  it('5+ compras recientes = Frecuente', () => {
    const cincoRecientes = Array.from({ length: 5 }, (_, i) => mkCompra({ id: 'f' + i, date: hace(25 - i * 5), total: 3000 }))
    expect(clientMetrics(mkCliente(cincoRecientes)).categoria).toBe('Frecuente')
  })

  it('productos y categorías favoritas suman precio×cantidad por nombre', () => {
    const items = [
      { productId: 1, name: 'Huevo Docena', cat: 'Huevos', qty: 2, price: 7000, cost: 5000 },
      { productId: 2, name: 'Almendras', cat: 'Frutos secos', qty: 1, price: 4000, cost: 2500 },
    ]
    const c = mkCliente([
      mkCompra({ id: 'p1', date: hace(10), total: 18000, items }),
      mkCompra({ id: 'p2', date: hace(5), total: 14000, items: [items[0]] }),
    ])
    const m = clientMetrics(c)
    // Huevo Docena: 2+2 unidades, $14.000+$14.000 = $28.000 → top 1
    expect(m.topProductos[0]).toMatchObject({ name: 'Huevo Docena', qty: 4, total: 28000 })
    expect(m.topCats[0]).toEqual(['Huevos', 28000])
  })
})
