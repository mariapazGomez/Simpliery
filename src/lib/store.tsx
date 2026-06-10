'use client'

// ---------- Store global: productos, ventas, inventario, clientes ----------
// Portado de store.jsx del prototipo.

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { catColor, stockState, fmtCLP } from '@/lib/format'
import { Icon } from '@/components/icon'
import { PRODUCTS, CATEGORIES } from '@/lib/data'
import { usePerfil, useCloudCollection, useCloudSingleton } from '@/lib/supabase/cloud-state'
import { createClient } from '@/lib/supabase/client'
import type {
  Product, Sale, SaleItem, Cliente, Compra, Movement, Settings, ClienteRef, ClientMetrics, Despacho,
} from '@/types'

const supabase = createClient()

export const TODAY = new Date() // fecha real actual

const DEFAULT_SETTINGS: Settings = {
  business: 'Mi negocio', ownerName: '', ownerRole: 'Dueño/a', currency: 'Peso chileno (CLP)',
  methods: ['Efectivo', 'Transferencia', 'Tarjeta'], minStockDefault: 5, minMargin: 25,
}

/** Lista de categorías de ejemplo (se usa al sembrar datos de demo). */
export function seedCategorias(): string[] {
  return [...new Set([...CATEGORIES, ...PRODUCTS.map((p) => p.cat)])]
}
export function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

/* ---------- Seed de clientes ---------- */
export function seedClientes(products: Product[]): Cliente[] {
  let s = 77321
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  const names: [string, string][] = [
    ['María', 'González Rojas'], ['Carlos', 'Pérez Fuentes'], ['Ana', 'Martínez Silva'],
    ['Pedro', 'López Araya'], ['Sofía', 'Hernández Vega'], ['Luis', 'Torres Molina'],
    ['Valentina', 'Ramos Castro'], ['Diego', 'Flores Muñoz'], ['Camila', 'Díaz Soto'],
    ['Rodrigo', 'Vargas Pinto'], ['Javiera', 'Morales Rojas'], ['Felipe', 'Jiménez Lagos'],
    ['Isidora', 'Castro Núñez'], ['Matías', 'Álvarez Cerda'], ['Paula', 'Reyes Tapia'], ['Tomás', 'Sánchez Vera'],
  ]
  const cities = ['Santiago', 'Providencia', 'Ñuñoa', 'Las Condes', 'Maipú', 'Viña del Mar', 'La Florida', 'San Bernardo']
  const methods = ['Efectivo', 'Efectivo', 'Tarjeta', 'Tarjeta', 'Transferencia']
  const domains = ['gmail.com', 'hotmail.com', 'yahoo.es', 'outlook.com']
  let bol = 45800
  return names.map(([fn, ln], i) => {
    const nComp = 1 + Math.floor(rnd() * 13)
    const city = cities[Math.floor(rnd() * cities.length)]
    const compras: Compra[] = []
    let daysAgo = Math.floor(rnd() * 8) + 1
    for (let j = 0; j < nComp; j++) {
      const nIt = 1 + Math.floor(rnd() * 3)
      const items = []
      for (let k = 0; k < nIt; k++) {
        const p = products[Math.floor(rnd() * products.length)]
        const qty = 1 + Math.floor(rnd() * 2)
        items.push({ productId: p.id, name: p.name, cat: p.cat, qty, price: p.price, cost: p.cost })
      }
      const total = items.reduce((a, it) => a + it.price * it.qty, 0)
      const cost = items.reduce((a, it) => a + it.cost * it.qty, 0)
      const d = new Date(TODAY)
      d.setDate(d.getDate() - daysAgo)
      compras.push({ id: 'cv' + bol, boleta: bol++, date: d, items, method: methods[Math.floor(rnd() * methods.length)], total, cost, profit: total - cost })
      daysAgo += Math.floor(rnd() * 14) + 3
    }
    compras.sort((a, b) => b.date.getTime() - a.date.getTime())
    const slug = fn.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const slug2 = ln.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    return {
      id: 'c' + (i + 1),
      nombre: fn + ' ' + ln,
      telefono: '+56 9 ' + Math.floor(rnd() * 9000 + 1000) + ' ' + Math.floor(rnd() * 9000 + 1000),
      correo: slug + '.' + slug2 + '@' + domains[Math.floor(rnd() * domains.length)],
      ciudad: city,
      createdAt: compras[compras.length - 1].date,
      nota: '',
      compras,
    }
  })
}

/* ---------- Métricas derivadas por cliente ---------- */
export function clientMetrics(c: Cliente): ClientMetrics {
  if (!c.compras.length)
    return { totalGastado: 0, ticketMedio: 0, lastCompra: null, daysSinceLast: null, frecuencia: null, nextExpected: null, daysUntilNext: null, categoria: 'Nuevo', topProductos: [], topCats: [] }
  const totalGastado = c.compras.reduce((a, v) => a + v.total, 0)
  const ticketMedio = totalGastado / c.compras.length
  const sorted = [...c.compras].sort((a, b) => a.date.getTime() - b.date.getTime())
  const lastCompra = sorted[sorted.length - 1].date
  const daysSinceLast = Math.round((TODAY.getTime() - lastCompra.getTime()) / 86400000)
  let frecuencia: number | null = null
  let nextExpected: Date | null = null
  let daysUntilNext: number | null = null
  if (sorted.length > 1) {
    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) gaps.push((sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / 86400000)
    frecuencia = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
    nextExpected = new Date(lastCompra)
    nextExpected.setDate(nextExpected.getDate() + frecuencia)
    daysUntilNext = Math.round((nextExpected.getTime() - TODAY.getTime()) / 86400000)
  }
  let categoria: ClientMetrics['categoria']
  if (totalGastado >= 200000 && c.compras.length >= 6) categoria = 'VIP'
  else if (c.compras.length >= 5 && daysSinceLast <= 45) categoria = 'Frecuente'
  else if (daysSinceLast > 45) categoria = 'En riesgo'
  else if (c.compras.length <= 2) categoria = 'Nuevo'
  else categoria = 'Regular'
  const prodMap: Record<string, { name: string; cat: string; qty: number; total: number }> = {}
  for (const v of c.compras)
    for (const it of v.items) {
      if (!prodMap[it.name]) prodMap[it.name] = { name: it.name, cat: it.cat, qty: 0, total: 0 }
      prodMap[it.name].qty += it.qty
      prodMap[it.name].total += it.price * it.qty
    }
  const catMap: Record<string, number> = {}
  for (const v of c.compras) for (const it of v.items) catMap[it.cat] = (catMap[it.cat] || 0) + it.price * it.qty
  return {
    totalGastado, ticketMedio, lastCompra, daysSinceLast, frecuencia, nextExpected, daysUntilNext, categoria,
    topProductos: Object.values(prodMap).sort((a, b) => b.total - a.total).slice(0, 5),
    topCats: Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 4) as [string, number][],
  }
}

/* ---------- Exportación CSV ---------- */
export function exportCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function buildSalesCSV(sales: Sale[], label: string) {
  const headers = ['Boleta', 'Fecha', 'Hora', 'Categoría', 'Producto', 'Cantidad', 'Precio Unitario', 'Total Item', 'Costo Item', 'Ganancia Item', 'Método Pago', 'Tipo Venta', 'Cliente', 'Ciudad', 'Teléfono', 'Correo']
  const rows: (string | number)[][] = [headers]
  for (const s of sales) {
    const fecha = s.date.toLocaleDateString('es-CL')
    const hora = s.date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    const tipo = s.tipo || 'local'
    const cl = s.cliente || ({} as ClienteRef)
    for (const it of s.items) {
      rows.push([s.boleta, fecha, hora, it.cat, it.name, it.qty, it.price, it.price * it.qty, it.cost, it.price * it.qty - it.cost * it.qty, s.method, tipo, cl.nombre || '', cl.ciudad || '', cl.numero || '', cl.correo || ''])
    }
  }
  exportCSV(`ventas_${label}_${new Date().toLocaleDateString('es-CL').replace(/\//g, '-')}.csv`, rows)
}

/* ---------- Seed de ventas del "día" ---------- */
export function seedSales(products: Product[]): Sale[] {
  let s = 987654
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  const methods = ['Efectivo', 'Efectivo', 'Efectivo', 'Tarjeta', 'Tarjeta', 'Transferencia']
  const sales: Sale[] = []
  let bol = 46210
  const hours = [9, 10, 10, 11, 11, 12, 12, 13, 14, 16, 17, 17, 18, 19]
  const despachoClientes: ClienteRef[] = [
    { nombre: 'María González', ciudad: 'Santiago', telefono: '+56912345678' },
    { nombre: 'Pedro Soto', ciudad: 'Providencia', telefono: '+56923456789' },
    { nombre: 'Ana Martínez', ciudad: 'Las Condes', telefono: '+56934567890' },
    { nombre: 'Luis Rojas', ciudad: 'Ñuñoa', telefono: '+56945678901' },
    { nombre: 'Carmen López', ciudad: 'Maipú', telefono: '+56956789012' },
  ]
  for (let i = 0; i < 14; i++) {
    const nItems = 1 + Math.floor(rnd() * 3)
    const items: SaleItem[] = []
    for (let k = 0; k < nItems; k++) {
      const p = products[Math.floor(rnd() * products.length)]
      const qty = 1 + Math.floor(rnd() * 2)
      items.push({ productId: p.id, name: p.name, cat: p.cat, qty, price: p.price, cost: p.cost })
    }
    const total = items.reduce((a, it) => a + it.price * it.qty, 0)
    const cost = items.reduce((a, it) => a + it.cost * it.qty, 0)
    const h = hours[i]
    const isDespacho = rnd() < 0.38
    const cliente = isDespacho ? despachoClientes[Math.floor(rnd() * despachoClientes.length)] : null
    const isCredito = !isDespacho && rnd() < 0.15
    const creditoCliente = isCredito ? despachoClientes[Math.floor(rnd() * despachoClientes.length)] : null
    const metodoPago = isCredito ? 'Crédito' : methods[Math.floor(rnd() * methods.length)]
    sales.push({
      id: 'b' + bol, boleta: bol++, date: (() => { const d = new Date(TODAY); d.setHours(h, Math.floor(rnd() * 60), 0, 0); return d })(),
      items, method: metodoPago, total, cost, profit: total - cost,
      tipo: isDespacho ? 'despacho' : 'local', cliente: isDespacho ? cliente : isCredito ? creditoCliente : null,
      credito: isCredito, pagado: !isCredito, montoPendiente: isCredito ? total : 0, pagos: [],
    })
  }
  return sales
}

interface Toast {
  id: string
  msg: string
  icon: string
}

interface RegistrarVentaExtra {
  tipo?: 'local' | 'despacho'
  cliente?: ClienteRef | null
}

interface StoreValue {
  negocioId: string | null
  rol: string | null
  products: Product[]
  sales: Sale[]
  movements: Movement[]
  settings: Settings
  setSettings: (updater: Settings | ((p: Settings) => Settings)) => void
  toast: (msg: string, icon?: string) => void
  clientes: Cliente[]
  registrarVenta: (items: SaleItem[], method: string, extra?: RegistrarVentaExtra) => Promise<Sale>
  addProduct: (p: Omit<Product, 'id' | 'margin' | 'marginPct' | 'sold'>) => void
  updateProduct: (id: number, patch: Partial<Product>) => void
  reponer: (id: number, qty: number) => void
  ajustarStock: (id: number, nuevo: number, note?: string) => void
  addClientes: (arr: Cliente[]) => void
  updateCliente: (id: string, patch: Partial<Cliente>) => void
  saldarDeuda: (saleId: string, montoPagado: number, metodo?: string) => void
  deleteSale: (saleId: string) => void
  updateSale: (saleId: string, patch: Partial<Sale>) => void
  despachos: Despacho[]
  addDespacho: (d: Despacho) => void
  updateDespacho: (id: string, patch: Partial<Despacho>) => void
  categorias: string[]
  addCategoria: (name: string) => void
  renameCategoria: (oldName: string, nuevo: string) => void
  deleteCategoria: (name: string) => void
}

const Store = createContext<StoreValue | null>(null)
export function useStore(): StoreValue {
  const ctx = useContext(Store)
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider')
  return ctx
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { negocioId, rol } = usePerfil()
  const [products, setProducts, rdyProd] = useCloudCollection<Product>('productos', negocioId)
  const [sales, setSales, rdySales] = useCloudCollection<Sale>('ventas', negocioId)
  const [clientes, setClientes, rdyCli] = useCloudCollection<Cliente>('clientes', negocioId)
  const [movements, setMovements, rdyMov] = useCloudCollection<Movement>('movimientos', negocioId)
  const [despachos, setDespachos, rdyDesp] = useCloudCollection<Despacho>('despachos', negocioId)
  const [settings, setSettings, rdySet] = useCloudSingleton<Settings>('configuracion', 'data', negocioId, DEFAULT_SETTINGS)
  const [categorias, setCategorias, rdyCat] = useCloudSingleton<string[]>('categorias', 'lista', negocioId, [])
  const [toasts, setToasts] = useState<Toast[]>([])
  const toast = useCallback((msg: string, icon = 'check') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, msg, icon }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  const saldarDeuda = useCallback((saleId: string, montoPagado: number, metodo?: string) => {
    setSales((ss) =>
      ss.map((s) => {
        if (s.id !== saleId) return s
        const pagos = [...(s.pagos || []), { fecha: new Date(), monto: montoPagado, metodo }]
        const totalPagado = pagos.reduce((a, p) => a + p.monto, 0)
        return { ...s, pagos, pagado: totalPagado >= s.total, montoPendiente: Math.max(0, s.total - totalPagado) }
      }),
    )
    toast(`Abono registrado · ${fmtCLP(montoPagado)}${metodo ? ' · ' + metodo : ''}`)
  }, [setSales, toast])

  const registrarVenta = useCallback(
    async (items: SaleItem[], method: string, extra: RegistrarVentaExtra = {}) => {
      const total = items.reduce((a, it) => a + it.price * it.qty, 0)
      const cost = items.reduce((a, it) => a + it.cost * it.qty, 0)
      // Folio atómico desde el servidor (evita boletas duplicadas con varios vendedores).
      // Si falla la red, cae al cálculo local como respaldo.
      let boleta: number
      const { data: folio, error: folioErr } = await supabase.rpc('siguiente_boleta')
      if (!folioErr && folio != null) boleta = Number(folio)
      else boleta = sales.reduce((m, s) => Math.max(m, s.boleta), 46209) + 1
      const esCredito = method === 'Crédito'
      const sale: Sale = {
        id: 'b' + boleta, boleta, date: new Date(), items, method, total, cost, profit: total - cost,
        tipo: extra.tipo || 'local', cliente: extra.cliente || null,
        credito: esCredito, pagado: !esCredito, montoPendiente: esCredito ? total : 0, pagos: [],
      }
      setSales((s) => [sale, ...s])
      setProducts((ps) =>
        ps.map((p) => {
          const simpleIt = items.find((i) => i.productId === p.id && !i.formatId)
          const fmtItems = items.filter((i) => i.productId === p.id && i.formatId)
          if (!simpleIt && !fmtItems.length) return p
          const simpleDeduct = simpleIt ? simpleIt.qty : 0
          const fmtDeduct = fmtItems.reduce((a, i) => a + i.qty * (i.baseUnitsPerItem || 1), 0)
          const totalDeduct = simpleDeduct + fmtDeduct
          const totalSold = simpleDeduct + fmtItems.reduce((a, i) => a + i.qty, 0)
          return { ...p, stock: Math.max(0, p.stock - totalDeduct), sold: p.sold + totalSold }
        }),
      )
      setMovements((m) => [
        { id: 'mv' + boleta, date: new Date(), product: items.length > 1 ? `${items.length} productos` : items[0].name, type: 'Venta', qty: -items.reduce((a, i) => a + i.qty, 0), note: 'Boleta ' + boleta },
        ...m,
      ])
      toast('Venta registrada · ' + fmtCLP(total))
      return sale
    },
    [sales, setSales, setProducts, setMovements, toast],
  )

  const deleteSale = useCallback((saleId: string) => {
    const sale = sales.find((s) => s.id === saleId)
    if (!sale) return
    // Repone el stock que esta venta había descontado (la venta "no ocurrió").
    setProducts((ps) =>
      ps.map((p) => {
        const simpleIt = sale.items.find((i) => i.productId === p.id && !i.formatId)
        const fmtItems = sale.items.filter((i) => i.productId === p.id && i.formatId)
        if (!simpleIt && !fmtItems.length) return p
        const simpleAdd = simpleIt ? simpleIt.qty : 0
        const fmtAdd = fmtItems.reduce((a, i) => a + i.qty * (i.baseUnitsPerItem || 1), 0)
        const soldBack = simpleAdd + fmtItems.reduce((a, i) => a + i.qty, 0)
        return { ...p, stock: p.stock + simpleAdd + fmtAdd, sold: Math.max(0, p.sold - soldBack) }
      }),
    )
    setMovements((mv) => [
      { id: 'mv' + Date.now(), date: new Date(), product: sale.items.length > 1 ? `${sale.items.length} productos` : sale.items[0]?.name ?? '', type: 'Ajuste', qty: sale.items.reduce((a, i) => a + i.qty, 0), note: 'Anulación boleta ' + sale.boleta },
      ...mv,
    ])
    setSales((ss) => ss.filter((s) => s.id !== saleId))
    toast('Transacción eliminada · stock repuesto')
  }, [sales, setProducts, setMovements, setSales, toast])

  const updateSale = useCallback((saleId: string, patch: Partial<Sale>) => {
    setSales((ss) => ss.map((s) => (s.id === saleId ? { ...s, ...patch } : s)))
    toast('Transacción actualizada')
  }, [setSales, toast])

  const addDespacho = useCallback((d: Despacho) => {
    setDespachos((ds) => [d, ...ds])
  }, [setDespachos])
  const updateDespacho = useCallback((id: string, patch: Partial<Despacho>) => {
    setDespachos((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }, [setDespachos])

  const addProduct = useCallback((p: Omit<Product, 'id' | 'margin' | 'marginPct' | 'sold'>) => {
    setProducts((ps) => {
      const id = Math.max(...ps.map((x) => x.id), 0) + 1
      return [...ps, { ...p, id, margin: p.price - p.cost, marginPct: p.price ? Math.round(((p.price - p.cost) / p.price) * 1000) / 10 : 0, sold: 0 }]
    })
    toast('Producto agregado')
  }, [setProducts, toast])

  const updateProduct = useCallback((id: number, patch: Partial<Product>) => {
    setProducts((ps) =>
      ps.map((p) => {
        if (p.id !== id) return p
        const n = { ...p, ...patch }
        n.margin = n.price - n.cost
        n.marginPct = n.price ? Math.round(((n.price - n.cost) / n.price) * 1000) / 10 : 0
        return n
      }),
    )
  }, [setProducts])

  const reponer = useCallback((id: number, qty: number) => {
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, stock: p.stock + qty } : p)))
    const p = products.find((x) => x.id === id)
    setMovements((m) => [{ id: 'mv' + Date.now(), date: new Date(), product: p?.name ?? '', type: 'Reposición', qty: +qty, note: 'Reposición manual' }, ...m])
    toast('Stock repuesto · +' + qty + ' u.')
  }, [products, setProducts, setMovements, toast])

  const ajustarStock = useCallback((id: number, nuevo: number, note?: string) => {
    const p = products.find((x) => x.id === id)
    const diff = nuevo - (p?.stock || 0)
    setProducts((ps) => ps.map((x) => (x.id === id ? { ...x, stock: nuevo } : x)))
    setMovements((m) => [{ id: 'mv' + Date.now(), date: new Date(), product: p?.name ?? '', type: 'Ajuste', qty: diff, note: note || 'Ajuste manual' }, ...m])
    toast('Stock ajustado')
  }, [products, setProducts, setMovements, toast])

  const addClientes = useCallback((arr: Cliente[]) => {
    setClientes((cs) => {
      const ids = new Set(cs.map((c) => c.correo.toLowerCase()))
      const nuevos = arr.filter((c) => !ids.has((c.correo || '').toLowerCase()))
      return [...cs, ...nuevos]
    })
    toast('Importación completada')
  }, [setClientes, toast])

  const updateCliente = useCallback((id: string, patch: Partial<Cliente>) => {
    setClientes((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }, [setClientes])

  const addCategoria = useCallback((name: string) => {
    const c = name.trim()
    if (!c) return
    setCategorias((cs) => (cs.includes(c) ? cs : [...cs, c]))
  }, [setCategorias])

  const renameCategoria = useCallback((oldName: string, nuevo: string) => {
    const n = nuevo.trim()
    if (!n || n === oldName) return
    setCategorias((cs) => [...new Set(cs.map((c) => (c === oldName ? n : c)))])
    setProducts((ps) => ps.map((p) => (p.cat === oldName ? { ...p, cat: n } : p)))
    toast('Categoría actualizada')
  }, [setCategorias, setProducts, toast])

  const deleteCategoria = useCallback((name: string) => {
    const afectados = products.filter((p) => p.cat === name).length
    if (afectados > 0) setProducts((ps) => ps.map((p) => (p.cat === name ? { ...p, cat: 'Otros' } : p)))
    setCategorias((cs) => {
      const sinEsta = cs.filter((c) => c !== name)
      return afectados > 0 && !sinEsta.includes('Otros') ? [...sinEsta, 'Otros'] : sinEsta
    })
    toast(afectados > 0 ? `Categoría eliminada · ${afectados} producto(s) movido(s) a "Otros"` : 'Categoría eliminada')
  }, [products, setCategorias, setProducts, toast])

  const cargando = !negocioId || !rdyProd || !rdySales || !rdyCli || !rdyMov || !rdyDesp || !rdySet || !rdyCat
  if (cargando) return <PantallaCargando />

  const value: StoreValue = {
    negocioId, rol,
    products, sales, movements, settings, setSettings, toast, clientes,
    registrarVenta, addProduct, updateProduct, reponer, ajustarStock, addClientes, updateCliente, saldarDeuda,
    deleteSale, updateSale,
    despachos, addDespacho, updateDespacho,
    categorias, addCategoria, renameCategoria, deleteCategoria,
  }
  return (
    <Store.Provider value={value}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span style={{ display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: 6, background: 'var(--primary)' }}>
              <Icon name={t.icon} size={13} />
            </span>
            {t.msg}
          </div>
        ))}
      </div>
    </Store.Provider>
  )
}

/* ---------- Pantalla de carga (mientras se trae el negocio desde la nube) ---------- */
function PantallaCargando() {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--surface-2, #f6f5f1)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--line)', borderTopColor: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-3)' }}>Cargando tu negocio…</div>
      </div>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}

/* ---------- Métricas derivadas ---------- */
export function useMetrics() {
  const { products, sales } = useStore()
  return useMemo(() => {
    const todaySales = sales.filter((s) => s.date.toDateString() === TODAY.toDateString())
    const todayTotal = todaySales.reduce((a, s) => a + s.total, 0)
    const todayProfit = todaySales.reduce((a, s) => a + s.profit, 0)
    const todayCost = todaySales.reduce((a, s) => a + s.cost, 0)
    const boletas = todaySales.length
    const avgMargin = todayTotal ? (todayProfit / todayTotal) * 100 : 0

    const byCat: Record<string, { cat: string; units: number; revenue: number; cost: number; profit: number }> = {}
    for (const p of products) {
      const c = byCat[p.cat] || (byCat[p.cat] = { cat: p.cat, units: 0, revenue: 0, cost: 0, profit: 0 })
      c.units += p.sold
      c.revenue += p.sold * p.price
      c.cost += p.sold * p.cost
      c.profit += p.sold * (p.price - p.cost)
    }
    const cats = Object.values(byCat)
      .map((c) => ({ ...c, marginPct: c.revenue ? (c.profit / c.revenue) * 100 : 0, color: catColor(c.cat), share: 0 }))
      .sort((a, b) => b.revenue - a.revenue)
    const totRevenue = cats.reduce((a, c) => a + c.revenue, 0)
    const totCost = cats.reduce((a, c) => a + c.cost, 0)
    const totProfit = cats.reduce((a, c) => a + c.profit, 0)
    cats.forEach((c) => (c.share = totRevenue ? (c.revenue / totRevenue) * 100 : 0))

    const pay: Record<string, number> = {}
    for (const s of todaySales) pay[s.method] = (pay[s.method] || 0) + s.total

    const topProducts = [...products].sort((a, b) => b.sold - a.sold).slice(0, 6)
    const bestMargin = [...products].filter((p) => p.price > 0).sort((a, b) => b.marginPct - a.marginPct).slice(0, 5)
    const worstMargin = [...products].filter((p) => p.price > 0).sort((a, b) => a.marginPct - b.marginPct).slice(0, 5)

    const lowStock = products.filter((p) => stockState(p) !== 'ok')
    const topCat = cats[0]

    function canalMetrics(salesArr: Sale[]) {
      const local = salesArr.filter((s) => (s.tipo || 'local') === 'local')
      const despacho = salesArr.filter((s) => s.tipo === 'despacho')
      const calc = (arr: Sale[]) => ({ count: arr.length, total: arr.reduce((a, s) => a + s.total, 0), cost: arr.reduce((a, s) => a + s.cost, 0), profit: arr.reduce((a, s) => a + s.profit, 0) })
      const lm = calc(local)
      const dm = calc(despacho)
      return {
        local: { ...lm, margin: lm.total ? (lm.profit / lm.total) * 100 : 0, ticket: lm.count ? lm.total / lm.count : 0 },
        despacho: { ...dm, margin: dm.total ? (dm.profit / dm.total) * 100 : 0, ticket: dm.count ? dm.total / dm.count : 0 },
      }
    }
    const canalHoy = canalMetrics(todaySales)
    const localShare = todayTotal > 0 ? canalHoy.local.total / todayTotal : 0.62
    const canalMes = {
      local: { count: Math.round(boletas * localShare * 25), total: totRevenue * localShare, cost: totCost * localShare, profit: totProfit * localShare, margin: totRevenue ? (totProfit / totRevenue) * 100 : 0, ticket: (totRevenue * localShare) / (boletas * localShare * 25 || 1) },
      despacho: { count: Math.round(boletas * (1 - localShare) * 25), total: totRevenue * (1 - localShare), cost: totCost * (1 - localShare), profit: totProfit * (1 - localShare), margin: totRevenue ? (totProfit / totRevenue) * 100 : 0, ticket: (totRevenue * (1 - localShare)) / (boletas * (1 - localShare) * 25 || 1) },
    }

    const deudaPendiente = sales.filter((s) => s.credito && !s.pagado)
    const totalDeuda = deudaPendiente.reduce((a, s) => a + (s.montoPendiente || s.total), 0)
    const clientesDeudoresList = [...new Set(deudaPendiente.map((s) => s.cliente?.nombre).filter(Boolean))]
    const deudaPorCliente: Record<string, { nombre: string; telefono: string; ventas: Sale[]; total: number }> = {}
    for (const s of deudaPendiente) {
      const k = s.cliente?.nombre || 'Sin nombre'
      if (!deudaPorCliente[k]) deudaPorCliente[k] = { nombre: k, telefono: s.cliente?.telefono || '', ventas: [], total: 0 }
      deudaPorCliente[k].ventas.push(s)
      deudaPorCliente[k].total += s.montoPendiente || s.total
    }

    return {
      todaySales, todayTotal, todayProfit, todayCost, boletas, avgMargin,
      cats, totRevenue, totCost, totProfit, totMargin: totRevenue ? (totProfit / totRevenue) * 100 : 0,
      pay, topProducts, bestMargin, worstMargin, lowStock, topCat,
      canalHoy, canalMes,
      totalDeuda, clientesDeudores: clientesDeudoresList.length, deudaPorCliente, deudaPendiente,
    }
  }, [products, sales])
}
