'use client'

// ---------- Formats Store: inventario multi-formato (portado de formats-store.jsx) ----------
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useStore } from '@/lib/store'
import type { Product, Format } from '@/types'

function seedFormats(products: Product[]): Format[] {
  const formats: Format[] = []
  products
    .filter((p) => p.cat === 'Huevos')
    .forEach((p) => {
      const cpu = p.cost
      formats.push(
        { id: `f-${p.id}-1`, productId: p.id, name: 'Pack 6 unidades', qty: 6, price: Math.round(cpu * 6 * 1.45) },
        { id: `f-${p.id}-2`, productId: p.id, name: 'Docena 12 unidades', qty: 12, price: Math.round(cpu * 12 * 1.42) },
        { id: `f-${p.id}-3`, productId: p.id, name: 'Bandeja 30 unidades', qty: 30, price: p.price },
        { id: `f-${p.id}-4`, productId: p.id, name: 'Pack 90 unidades', qty: 90, price: Math.round(p.price * 2.9) },
        { id: `f-${p.id}-5`, productId: p.id, name: 'Caja 180 unidades', qty: 180, price: Math.round(p.price * 5.5) },
      )
    })
  products
    .filter((p) => p.cat === 'Frutos secos')
    .forEach((p) => {
      const pu = p.unit || ''
      formats.push(
        { id: `f-${p.id}-1`, productId: p.id, name: `1 ${pu}`, qty: 1, price: p.price },
        { id: `f-${p.id}-2`, productId: p.id, name: `2 ${pu}`, qty: 2, price: Math.round(p.price * 2 * 0.97) },
        { id: `f-${p.id}-3`, productId: p.id, name: `5 ${pu}`, qty: 5, price: Math.round(p.price * 5 * 0.93) },
        { id: `f-${p.id}-4`, productId: p.id, name: `Caja 10 ${pu}`, qty: 10, price: Math.round(p.price * 10 * 0.88) },
      )
    })
  products
    .filter((p) => p.cat === 'Quesos' || p.cat === 'Queso de cabra')
    .forEach((p) => {
      const pu = p.unit || ''
      formats.push(
        { id: `f-${p.id}-1`, productId: p.id, name: `1 ${pu}`, qty: 1, price: p.price },
        { id: `f-${p.id}-2`, productId: p.id, name: `2 ${pu}`, qty: 2, price: Math.round(p.price * 2 * 0.96) },
        { id: `f-${p.id}-3`, productId: p.id, name: `3 ${pu}`, qty: 3, price: Math.round(p.price * 3 * 0.93) },
        { id: `f-${p.id}-4`, productId: p.id, name: `Caja 6 ${pu}`, qty: 6, price: Math.round(p.price * 6 * 0.87) },
      )
    })
  return formats
}

function seedHasFormats(products: Product[]): Record<number, boolean> {
  const enabled: Record<number, boolean> = {}
  products.forEach((p) => {
    if (p.cat === 'Huevos' || p.cat === 'Frutos secos' || p.cat === 'Quesos' || p.cat === 'Queso de cabra') enabled[p.id] = true
  })
  return enabled
}

export interface BaseUnit {
  unit: string
  label: string
  displayFn: (n: number) => string
}
export const BASE_UNITS: Record<string, BaseUnit> = {
  Huevos: { unit: 'unidad', label: 'unidades', displayFn: (n) => `${n} u.` },
  'Frutos secos': { unit: 'unidad', label: 'unidades', displayFn: (n) => `${n} u.` },
  Quesos: { unit: 'unidad', label: 'unidades', displayFn: (n) => `${n} u.` },
  'Queso de cabra': { unit: 'unidad', label: 'unidades', displayFn: (n) => `${n} u.` },
}
export function getBaseUnit(cat: string): BaseUnit {
  return BASE_UNITS[cat] || { unit: 'unidad', label: 'unidades', displayFn: (n) => n + ' u.' }
}

interface FormatsValue {
  formats: Format[]
  hasFormats: Record<number, boolean>
  getFormats: (productId: number) => Format[]
  getFormat: (formatId: string) => Format | undefined
  productHasFormats: (productId: number) => boolean
  toggleFormats: (productId: number, val: boolean) => void
  addFormat: (productId: number, f: Omit<Format, 'id' | 'productId'>) => void
  updateFormat: (id: string, patch: Partial<Format>) => void
  deleteFormat: (id: string) => void
  baseStockForSale: (productId: number, formatId: string, qty: number) => number
  canSellFormat: (product: Product, formatId: string, qty?: number) => { ok: boolean; needed: number; available: number; formatQty?: number }
  maxUnitsForFormat: (product: Product, formatId: string) => number
}

const FmtCtx = createContext<FormatsValue | null>(null)
export function useFormats(): FormatsValue {
  const ctx = useContext(FmtCtx)
  if (!ctx) throw new Error('useFormats debe usarse dentro de FormatsProvider')
  return ctx
}

export function FormatsProvider({ children }: { children: ReactNode }) {
  const { products } = useStore()
  const [formats, setFormats] = useState<Format[]>(() => seedFormats(products))
  const [hasFormats, setHasFormats] = useState<Record<number, boolean>>(() => seedHasFormats(products))

  const getFormats = useCallback((productId: number) => formats.filter((f) => f.productId === productId), [formats])
  const getFormat = useCallback((formatId: string) => formats.find((f) => f.id === formatId), [formats])
  const productHasFormats = useCallback((productId: number) => !!hasFormats[productId], [hasFormats])
  const toggleFormats = useCallback((productId: number, val: boolean) => setHasFormats((h) => ({ ...h, [productId]: val })), [])
  const addFormat = useCallback((productId: number, f: Omit<Format, 'id' | 'productId'>) => setFormats((fs) => [...fs, { ...f, id: `f-${productId}-${Date.now()}`, productId }]), [])
  const updateFormat = useCallback((id: string, patch: Partial<Format>) => setFormats((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f))), [])
  const deleteFormat = useCallback((id: string) => setFormats((fs) => fs.filter((f) => f.id !== id)), [])

  const baseStockForSale = useCallback(
    (productId: number, formatId: string, qty: number) => {
      const fmt = formats.find((f) => f.id === formatId)
      if (!fmt) return qty
      return fmt.qty * qty
    },
    [formats],
  )
  const canSellFormat = useCallback(
    (product: Product, formatId: string, qty = 1) => {
      const fmt = formats.find((f) => f.id === formatId)
      if (!fmt) return { ok: true, needed: qty, available: product.stock }
      const needed = fmt.qty * qty
      return { ok: product.stock >= needed, needed, available: product.stock, formatQty: fmt.qty }
    },
    [formats],
  )
  const maxUnitsForFormat = useCallback(
    (product: Product, formatId: string) => {
      const fmt = formats.find((f) => f.id === formatId)
      if (!fmt || fmt.qty <= 0) return 0
      return Math.floor(product.stock / fmt.qty)
    },
    [formats],
  )

  const value: FormatsValue = {
    formats, hasFormats, getFormats, getFormat, productHasFormats, toggleFormats, addFormat, updateFormat, deleteFormat,
    baseStockForSale, canSellFormat, maxUnitsForFormat,
  }
  return <FmtCtx.Provider value={value}>{children}</FmtCtx.Provider>
}
