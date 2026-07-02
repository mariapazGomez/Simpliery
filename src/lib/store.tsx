'use client'

// ---------- Store global: productos, ventas, inventario, clientes ----------
// Portado de store.jsx del prototipo.

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { catColor, stockState, fmtCLP } from '@/lib/format'
import { Icon } from '@/components/icon'
import { usePerfil, useCloudCollection, useCloudSingleton, setCloudErrorHandler } from '@/lib/supabase/cloud-state'
import { createClient } from '@/lib/supabase/client'
import { PRODUCT_UNITS } from '@/types'
import type {
  Product, Sale, SaleItem, Cliente, Compra, Movement, Settings, ClienteRef, ClientMetrics, Despacho,
} from '@/types'

const supabase = createClient()

export const TODAY = new Date() // fecha real actual

/** Redondeo a 3 decimales: evita la deriva binaria del granel (9.299999999… kg). */
const r3 = (n: number) => Math.round(n * 1000) / 1000

const DEFAULT_SETTINGS: Settings = {
  business: 'Mi negocio', ownerName: '', ownerRole: 'Dueño/a', currency: 'Peso chileno (CLP)',
  methods: ['Efectivo', 'Transferencia', 'Tarjeta'], minStockDefault: 5, minMargin: 25,
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
  const headers = ['Boleta', 'Fecha', 'Hora', 'Categoría', 'Producto', 'Cantidad', 'Precio Unitario', 'Total Item', 'Costo Item', 'Ganancia Item', 'Método Pago', 'Tipo Venta', 'Cliente', 'Ciudad', 'Teléfono', 'Correo', 'Descuento Boleta', 'Total Boleta']
  const rows: (string | number)[][] = [headers]
  for (const s of sales) {
    const fecha = s.date.toLocaleDateString('es-CL')
    const hora = s.date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    const tipo = s.tipo || 'local'
    const cl = s.cliente || ({} as ClienteRef)
    for (const it of s.items) {
      rows.push([s.boleta, fecha, hora, it.cat, it.name, it.qty, it.price, it.price * it.qty, it.cost, it.price * it.qty - it.cost * it.qty, s.method, tipo, cl.nombre || '', cl.ciudad || '', cl.numero || '', cl.correo || '', s.descuento?.amount || 0, s.total])
    }
  }
  exportCSV(`ventas_${label}_${new Date().toLocaleDateString('es-CL').replace(/\//g, '-')}.csv`, rows)
}

interface Toast {
  id: string
  msg: string
  icon: string
}

interface RegistrarVentaExtra {
  tipo?: 'local' | 'despacho'
  cliente?: ClienteRef | null
  /** Id del cliente registrado al que se le vende (para alimentar su historial). */
  clienteId?: string | null
  /** Descuento de la boleta: el total de la venta queda YA descontado. */
  descuento?: Sale['descuento']
  /** Pago dividido en dos métodos. */
  pagoMixto?: Sale['pagoMixto']
}

/**
 * Cuánto entró por cada método de pago en una venta (soporta pago dividido).
 * Única fuente de verdad para cierre de caja, flujo y reportes.
 */
export function montosPorMetodo(s: Sale): [string, number][] {
  const mixto = s.pagoMixto
  if (!mixto || !mixto.monto || s.method === 'Crédito') return [[s.method, s.total]]
  const secundario = Math.min(mixto.monto, s.total)
  return [[s.method, s.total - secundario], [mixto.metodo, secundario]]
}

/* ---------- Matemática de stock (pura, testeable) ----------
   La regla de oro del inventario: una venta descuenta unidades BASE
   (simple = qty, variante = qty × unidades del formato, granel = fracción)
   y su anulación repone EXACTAMENTE lo mismo. */

/** Unidades base que mueven los ítems de una venta (todas sus líneas). */
export function unidadesBaseDeItems(items: SaleItem[]): number {
  return items.reduce((a, i) => a + i.qty * (i.baseUnitsPerItem || 1), 0)
}

/** Aplica una venta a un producto: descuenta stock y suma `sold` en unidades base
 *  (así "Inicial = stock + vendido" no cambia al vender variantes o granel).
 *  El clamp a 0 es defensa ante carreras multi-dispositivo; la UI impide sobrevender. */
export function aplicarVentaAProducto(p: Product, items: SaleItem[]): Product {
  const propios = items.filter((i) => i.productId === p.id)
  if (!propios.length) return p
  const deduct = unidadesBaseDeItems(propios)
  return { ...p, stock: r3(Math.max(0, p.stock - deduct)), sold: r3(p.sold + deduct) }
}

/** Espejo EXACTO de aplicarVentaAProducto: la venta "no ocurrió". */
export function revertirVentaDeProducto(p: Product, items: SaleItem[]): Product {
  const propios = items.filter((i) => i.productId === p.id)
  if (!propios.length) return p
  const back = unidadesBaseDeItems(propios)
  return { ...p, stock: r3(p.stock + back), sold: r3(Math.max(0, p.sold - back)) }
}

/** Construye el Despacho que corresponde a una venta tipo despacho.
 *  `cliente` aporta los datos de contacto/dirección (de la venta o de un edit).
 *  Si hay un despacho `previo`, conserva lo que es del despacho (estado, repartidor,
 *  observación y los datos de OptiRoute) y refresca lo que manda la venta. */
export function despachoDesdeVenta(sale: Sale, cliente: ClienteRef | null, previo?: Despacho): Despacho {
  const c = cliente || sale.cliente
  return {
    id: previo?.id ?? 'desp_' + sale.id,
    saleId: sale.id,
    boleta: sale.boleta,
    fecha: sale.date,
    cliente: c?.nombre || '',
    telefono: c?.numero || c?.telefono || '',
    correo: c?.correo || '',
    direccion: c?.direccion || '',
    depto: c?.depto,
    ciudad: c?.ciudad || '',
    nota: previo?.nota ?? '',
    repartidor: previo?.repartidor ?? 'Sin asignar',
    estado: previo?.estado ?? 'pendiente',
    items: sale.items,
    total: sale.total,
    method: sale.method,
    // Conserva el enlace con OptiRoute si el despacho ya fue enviado.
    ...(previo?.optirouteId
      ? {
          optirouteId: previo.optirouteId,
          trackingUrl: previo.trackingUrl,
          trackingCode: previo.trackingCode,
          optirouteStatus: previo.optirouteStatus,
          enviadoEn: previo.enviadoEn,
        }
      : {}),
  }
}

/** Dada una venta (ya con sus cambios aplicados) y el despacho que tenía, decide
 *  qué hacer: crear el despacho (pasó a despacho), actualizarlo (sigue siendo
 *  despacho), quitarlo (volvió a local) o nada. Función pura → testeable. */
export function reconciliarDespacho(
  sale: Sale,
  cliente: ClienteRef | null,
  previo: Despacho | undefined,
): { accion: 'crear' | 'actualizar' | 'quitar' | 'ninguna'; despacho?: Despacho } {
  if (sale.tipo === 'despacho') {
    return { accion: previo ? 'actualizar' : 'crear', despacho: despachoDesdeVenta(sale, cliente, previo) }
  }
  return previo ? { accion: 'quitar' } : { accion: 'ninguna' }
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
  addProduct: (p: Omit<Product, 'id' | 'margin' | 'marginPct' | 'sold'>) => number
  updateProduct: (id: number, patch: Partial<Product>) => void
  deleteProduct: (id: number) => void
  reponer: (id: number, qty: number) => void
  ajustarStock: (id: number, nuevo: number, note?: string) => void
  addClientes: (arr: Cliente[]) => void
  updateCliente: (id: string, patch: Partial<Cliente>) => void
  deleteCliente: (id: string) => void
  saldarDeuda: (saleId: string, montoPagado: number, metodo?: string) => void
  deleteSale: (saleId: string) => void
  updateSale: (saleId: string, patch: Partial<Sale>) => void
  despachos: Despacho[]
  addDespacho: (d: Despacho) => void
  updateDespacho: (id: string, patch: Partial<Despacho>) => void
  deleteDespacho: (id: string) => void
  categorias: string[]
  addCategoria: (name: string) => void
  renameCategoria: (oldName: string, nuevo: string) => void
  deleteCategoria: (name: string) => void
  reorderCategorias: (order: string[]) => void
}

const Store = createContext<StoreValue | null>(null)
export function useStore(): StoreValue {
  const ctx = useContext(Store)
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider')
  return ctx
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { negocioId, rol } = usePerfil()
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [despachos, setDespachos] = useState<Despacho[]>([])
  const [settings, setSettings, rdySet] = useCloudSingleton<Settings>('configuracion', 'data', negocioId, DEFAULT_SETTINGS)
  const [categorias, setCategorias] = useState<string[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const toast = useCallback((msg: string, icon = 'check') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, msg, icon }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  // Conecta los errores de la nube con el toast: si un guardado/carga falla, el usuario
  // lo ve al instante (en vez de descubrirlo al recargar). No afecta el camino exitoso.
  useEffect(() => {
    setCloudErrorHandler((msg) => toast(msg, 'alert'))
    return () => setCloudErrorHandler(null)
  }, [toast])

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
      const bruto = items.reduce((a, it) => a + it.price * it.qty, 0)
      // El descuento rebaja el total registrado: lo que queda en el sistema es lo
      // que realmente se cobró (así cuadran caja, finanzas y reportes).
      const desc = extra.descuento ? Math.min(extra.descuento.amount, bruto) : 0
      const total = bruto - desc
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
        descuento: extra.descuento || null, pagoMixto: esCredito ? null : extra.pagoMixto || null,
      }
      setSales((s) => [sale, ...s])
      // La venta alimenta la ficha del cliente: su historial de compras crece y,
      // si es un cliente nuevo, se crea en la base. Se busca por id (seleccionado),
      // luego por teléfono y por nombre exacto, para no duplicar.
      const ref = extra.cliente
      if (ref && ref.nombre.trim()) {
        const compra: Compra = { id: sale.id, boleta, date: sale.date, items, method, total, cost, profit: total - cost }
        setClientes((cs) => {
          const fono = (ref.numero || ref.telefono || '').replace(/\D/g, '')
          const nombreL = ref.nombre.trim().toLowerCase()
          let idx = extra.clienteId ? cs.findIndex((c) => c.id === extra.clienteId) : -1
          if (idx < 0 && fono) idx = cs.findIndex((c) => (c.telefono || '').replace(/\D/g, '') === fono)
          if (idx < 0) idx = cs.findIndex((c) => c.nombre.trim().toLowerCase() === nombreL)
          if (idx < 0) {
            const nuevo: Cliente = {
              id: 'cl' + sale.id, nombre: ref.nombre.trim(), telefono: ref.numero || ref.telefono || '',
              correo: ref.correo || '', ciudad: ref.ciudad || '', createdAt: new Date(), nota: '',
              compras: [compra],
              ...(ref.direccion ? { direccion: ref.direccion } : {}),
              ...(ref.depto ? { depto: ref.depto } : {}),
            }
            return [nuevo, ...cs]
          }
          return cs.map((c, i) => {
            if (i !== idx) return c
            // Completa SOLO los datos que el cliente no tenía (no pisa los existentes).
            return {
              ...c,
              telefono: c.telefono || ref.numero || ref.telefono || '',
              correo: c.correo || ref.correo || '',
              ciudad: c.ciudad || ref.ciudad || '',
              direccion: c.direccion || ref.direccion || c.direccion,
              depto: c.depto || ref.depto || c.depto,
              compras: [...c.compras, compra],
            }
          })
        })
      }
      setProducts((ps) => ps.map((p) => aplicarVentaAProducto(p, items)))
      setMovements((m) => [
        { id: 'mv' + boleta, date: new Date(), product: items.length > 1 ? `${items.length} productos` : items[0].name, type: 'Venta', qty: -unidadesBaseDeItems(items), note: 'Boleta ' + boleta },
        ...m,
      ])
      // Si es despacho, el store crea el despacho persistente (un solo lugar para esto).
      if (sale.tipo === 'despacho' && sale.cliente) {
        setDespachos((ds) => [despachoDesdeVenta(sale, sale.cliente), ...ds])
      }
      toast('Venta registrada · ' + fmtCLP(total))
      return sale
    },
    [sales, setSales, setProducts, setMovements, setClientes, setDespachos, toast],
  )

  const deleteSale = useCallback((saleId: string) => {
    const sale = sales.find((s) => s.id === saleId)
    if (!sale) return
    // Repone el stock que esta venta había descontado (la venta "no ocurrió").
    setProducts((ps) => ps.map((p) => revertirVentaDeProducto(p, sale.items)))
    setMovements((mv) => [
      { id: 'mv' + Date.now(), date: new Date(), product: sale.items.length > 1 ? `${sale.items.length} productos` : sale.items[0]?.name ?? '', type: 'Ajuste', qty: unidadesBaseDeItems(sale.items), note: 'Anulación boleta ' + sale.boleta },
      ...mv,
    ])
    setSales((ss) => ss.filter((s) => s.id !== saleId))
    // También sale del historial del cliente (la venta "no ocurrió").
    setClientes((cs) => cs.map((c) => (c.compras.some((x) => x.id === saleId) ? { ...c, compras: c.compras.filter((x) => x.id !== saleId) } : c)))
    // Y se lleva su despacho (si lo tenía) para no dejarlo huérfano.
    const desp = despachos.find((d) => d.saleId === saleId)
    if (desp) {
      setDespachos((ds) => ds.filter((d) => d.id !== desp.id))
      toast(desp.optirouteId ? 'Eliminada · stock repuesto · cancela el envío en OptiRoute' : 'Transacción y despacho eliminados · stock repuesto')
    } else {
      toast('Transacción eliminada · stock repuesto')
    }
  }, [sales, despachos, setProducts, setMovements, setSales, setClientes, setDespachos, toast])

  // Editar una venta reconcilia TODO lo que depende de ella: el despacho
  // (crear/actualizar/quitar según el tipo) y la copia de la compra en la ficha
  // del cliente. La venta es la fuente de la verdad de productos/total/método/tipo.
  const updateSale = useCallback((saleId: string, patch: Partial<Sale>) => {
    const prev = sales.find((s) => s.id === saleId)
    if (!prev) return
    const merged: Sale = { ...prev, ...patch }
    setSales((ss) => ss.map((s) => (s.id === saleId ? merged : s)))
    // Si cambian los PRODUCTOS de la boleta, reconcilia el stock: repone las
    // unidades base de los items viejos y descuenta las de los nuevos (mismos
    // helpers de venta/anulación, simétricos y testeados) + deja un movimiento.
    if (patch.items) {
      setProducts((ps) => ps.map((p) => aplicarVentaAProducto(revertirVentaDeProducto(p, prev.items), merged.items)))
      const deltaBase = unidadesBaseDeItems(merged.items) - unidadesBaseDeItems(prev.items)
      if (deltaBase !== 0) {
        setMovements((m) => [
          { id: 'mv' + Date.now(), date: new Date(), product: merged.items.length > 1 ? `${merged.items.length} productos` : merged.items[0]?.name ?? '', type: 'Ajuste', qty: -deltaBase, note: 'Edición boleta ' + merged.boleta },
          ...m,
        ])
      }
    }
    // Mantiene sincronizada la compra dentro de la ficha del cliente.
    setClientes((cs) =>
      cs.map((c) =>
        c.compras.some((x) => x.id === saleId)
          ? { ...c, compras: c.compras.map((x) => (x.id === saleId ? { ...x, method: merged.method, total: merged.total, cost: merged.cost, profit: merged.profit, items: merged.items } : x)) }
          : c,
      ),
    )
    // Reconcilia el despacho asociado.
    const previo = despachos.find((d) => d.saleId === saleId)
    const { accion, despacho } = reconciliarDespacho(merged, merged.cliente, previo)
    if (accion === 'crear' && despacho) {
      setDespachos((ds) => [despacho, ...ds])
      toast('Transacción actualizada · despacho creado')
    } else if (accion === 'actualizar' && despacho) {
      setDespachos((ds) => ds.map((d) => (d.id === despacho.id ? despacho : d)))
      toast(previo?.optirouteId ? 'Actualizado aquí · en OptiRoute sigue el original' : 'Transacción y despacho actualizados')
    } else if (accion === 'quitar' && previo) {
      setDespachos((ds) => ds.filter((d) => d.id !== previo.id))
      toast(previo.optirouteId ? 'Pasó a mostrador · cancela el envío en OptiRoute' : 'Transacción actualizada · despacho quitado')
    } else {
      toast('Transacción actualizada')
    }
  }, [sales, despachos, setSales, setClientes, setDespachos, setProducts, setMovements, toast])

  const addDespacho = useCallback((d: Despacho) => {
    setDespachos((ds) => [d, ...ds])
  }, [setDespachos])

  // Editar un despacho: si tocas datos de contacto/dirección, se espejan de vuelta
  // a la venta para que no diverjan. Estado/repartidor/nota son solo del despacho.
  const updateDespacho = useCallback((id: string, patch: Partial<Despacho>) => {
    const previo = despachos.find((d) => d.id === id)
    setDespachos((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)))
    const tocaContacto = (['cliente', 'telefono', 'correo', 'direccion', 'depto', 'ciudad'] as const).some((k) => k in patch)
    if (tocaContacto && previo?.saleId) {
      setSales((ss) =>
        ss.map((s) => {
          if (s.id !== previo.saleId || !s.cliente) return s
          return {
            ...s,
            cliente: {
              ...s.cliente,
              ...(patch.cliente !== undefined ? { nombre: patch.cliente } : {}),
              ...(patch.telefono !== undefined ? { telefono: patch.telefono, numero: patch.telefono } : {}),
              ...(patch.correo !== undefined ? { correo: patch.correo } : {}),
              ...(patch.direccion !== undefined ? { direccion: patch.direccion } : {}),
              ...(patch.depto !== undefined ? { depto: patch.depto } : {}),
              ...(patch.ciudad !== undefined ? { ciudad: patch.ciudad } : {}),
            },
          }
        }),
      )
    }
  }, [despachos, setDespachos, setSales])

  const deleteDespacho = useCallback((id: string) => {
    const desp = despachos.find((d) => d.id === id)
    setDespachos((ds) => ds.filter((d) => d.id !== id))
    toast(desp?.optirouteId ? 'Despacho eliminado aquí · cancélalo en OptiRoute si ya iba en ruta' : 'Despacho eliminado')
  }, [despachos, setDespachos, toast])

  // Devuelve el id asignado para que quien lo crea (p. ej. con variantes) lo use
  // sin adivinar. Calculamos el id una sola vez desde `products` y ese mismo va al estado.
  const addProduct = useCallback((p: Omit<Product, 'id' | 'margin' | 'marginPct' | 'sold'>) => {
    const id = Math.max(0, ...products.map((x) => x.id)) + 1
    const ordenMax = Math.max(0, ...products.filter((x) => x.cat === p.cat).map((x) => x.orden ?? 0))
    setProducts((ps) => [...ps, { ...p, id, orden: ordenMax + 1, margin: p.price - p.cost, marginPct: p.price ? Math.round(((p.price - p.cost) / p.price) * 1000) / 10 : 0, sold: 0 }])
    toast('Producto agregado')
    return id
  }, [products, setProducts, toast])

  const deleteProduct = useCallback((id: number) => {
    setProducts((ps) => ps.filter((p) => p.id !== id))
    toast('Producto eliminado')
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
      // Dedupe por correo o teléfono SOLO cuando el dato existe; un campo vacío
      // no debe marcar como duplicados a todos los demás clientes sin ese dato.
      const correos = new Set(cs.map((c) => (c.correo || '').trim().toLowerCase()).filter(Boolean))
      const fonos = new Set(cs.map((c) => (c.telefono || '').replace(/\D/g, '')).filter(Boolean))
      const nuevos = arr.filter((c) => {
        const correo = (c.correo || '').trim().toLowerCase()
        const fono = (c.telefono || '').replace(/\D/g, '')
        return !(correo && correos.has(correo)) && !(fono && fonos.has(fono))
      })
      return [...cs, ...nuevos]
    })
    toast('Importación completada')
  }, [setClientes, toast])

  // Editar la ficha del cliente actualiza su contacto en las ventas de ese cliente
  // y en sus despachos PENDIENTES (los entregados/no entregados quedan históricos).
  const updateCliente = useCallback((id: string, patch: Partial<Cliente>) => {
    setClientes((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    const tocaContacto = (['nombre', 'telefono', 'correo', 'direccion', 'depto', 'ciudad'] as const).some((k) => k in patch)
    if (!tocaContacto) return
    const saleIds = new Set(sales.filter((s) => s.cliente?.id === id).map((s) => s.id))
    if (!saleIds.size) return
    setSales((ss) =>
      ss.map((s) =>
        saleIds.has(s.id) && s.cliente
          ? {
              ...s,
              cliente: {
                ...s.cliente,
                ...(patch.nombre !== undefined ? { nombre: patch.nombre } : {}),
                ...(patch.telefono !== undefined ? { telefono: patch.telefono, numero: patch.telefono } : {}),
                ...(patch.correo !== undefined ? { correo: patch.correo } : {}),
                ...(patch.direccion !== undefined ? { direccion: patch.direccion } : {}),
                ...(patch.depto !== undefined ? { depto: patch.depto } : {}),
                ...(patch.ciudad !== undefined ? { ciudad: patch.ciudad } : {}),
              },
            }
          : s,
      ),
    )
    setDespachos((ds) =>
      ds.map((d) => {
        if (!saleIds.has(d.saleId) || d.estado === 'entregado' || d.estado === 'no_entregado') return d
        return {
          ...d,
          ...(patch.nombre !== undefined ? { cliente: patch.nombre } : {}),
          ...(patch.telefono !== undefined ? { telefono: patch.telefono } : {}),
          ...(patch.correo !== undefined ? { correo: patch.correo } : {}),
          ...(patch.direccion !== undefined ? { direccion: patch.direccion } : {}),
          ...(patch.depto !== undefined ? { depto: patch.depto } : {}),
          ...(patch.ciudad !== undefined ? { ciudad: patch.ciudad } : {}),
        }
      }),
    )
  }, [sales, setClientes, setSales, setDespachos])

  // Borra un cliente de la base. NO toca sus ventas (la plata ya ocurrió); el
  // aviso de deuda pendiente lo da la página antes de llamar aquí.
  const deleteCliente = useCallback((id: string) => {
    setClientes((cs) => cs.filter((c) => c.id !== id))
    toast('Cliente eliminado')
  }, [setClientes, toast])

  const addCategoria = useCallback((name: string) => {
    const c = name.trim()
    if (!c) return
    setCategorias((cs) => (cs.includes(c) ? cs : [...cs, c]))
  }, [setCategorias])

  // Reordena las categorías (el orden manda en el catálogo de ventas).
  const reorderCategorias = useCallback((order: string[]) => {
    setCategorias(order)
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

  // Normaliza UNA vez las unidades mal cargadas (ej. "250g", "x12", "500g") → "Unidad".
  // Idempotente: una vez corregidas, vuelve a salir sin tocar nada.
  useEffect(() => {
    const valida = (u: string) => (PRODUCT_UNITS as readonly string[]).includes(u)
    if (products.every((p) => valida(p.unit))) return
    setProducts((ps) => ps.map((p) => (valida(p.unit) ? p : { ...p, unit: 'Unidad' })))
  }, [products, setProducts])

  // Memoizamos el value: así un cambio de `toasts` (un aviso aparece/desaparece)
  // NO recrea el objeto ni re-renderiza a todos los que usan useStore(). El value
  // solo cambia cuando cambian datos reales (los callbacks ya son estables).
  const value = useMemo<StoreValue>(
    () => ({
      negocioId, rol,
      products, sales, movements, settings, setSettings, toast, clientes,
      registrarVenta, addProduct, updateProduct, deleteProduct, reponer, ajustarStock, addClientes, updateCliente, deleteCliente, saldarDeuda,
      deleteSale, updateSale,
      despachos, addDespacho, updateDespacho, deleteDespacho,
      categorias, addCategoria, renameCategoria, deleteCategoria, reorderCategorias,
    }),
    [
      negocioId, rol,
      products, sales, movements, settings, setSettings, toast, clientes,
      registrarVenta, addProduct, updateProduct, deleteProduct, reponer, ajustarStock, addClientes, updateCliente, deleteCliente, saldarDeuda,
      deleteSale, updateSale,
      despachos, addDespacho, updateDespacho, deleteDespacho,
      categorias, addCategoria, renameCategoria, deleteCategoria, reorderCategorias,
    ],
  )

  const cargando = !negocioId || !rdySet
  if (cargando) return <PantallaCargando />

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
    for (const s of todaySales) for (const [metodo, monto] of montosPorMetodo(s)) pay[metodo] = (pay[metodo] || 0) + monto

    const topProducts = [...products].sort((a, b) => b.sold - a.sold).slice(0, 6)
    const bestMargin = [...products].filter((p) => p.price > 0).sort((a, b) => b.marginPct - a.marginPct).slice(0, 5)
    const worstMargin = [...products].filter((p) => p.price > 0).sort((a, b) => a.marginPct - b.marginPct).slice(0, 5)

    const lowStock = products.filter((p) => stockState(p) !== 'ok')
    const topCat = cats[0]

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
      totalDeuda, clientesDeudores: clientesDeudoresList.length, deudaPorCliente, deudaPendiente,
    }
  }, [products, sales])
}
