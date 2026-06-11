'use client'

// ---------- Formats Store: inventario multi-formato (portado de formats-store.jsx) ----------
import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { useStore } from '@/lib/store'
import { useCloudCollection } from '@/lib/supabase/cloud-state'
import type { Product, Format } from '@/types'

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
  const { negocioId } = useStore()
  // Formatos persistentes en la nube (tabla `formatos`). Misma firma que useState.
  const [formats, setFormats, rdyFmt] = useCloudCollection<Format>('formatos', negocioId)

  const getFormats = useCallback((productId: number) => formats.filter((f) => f.productId === productId), [formats])
  const getFormat = useCallback((formatId: string) => formats.find((f) => f.id === formatId), [formats])
  // "Tiene formatos" se deduce de si hay formatos guardados (sin un mapa aparte que persistir).
  const productHasFormats = useCallback((productId: number) => formats.some((f) => f.productId === productId), [formats])
  // Mantener la firma: desactivar = borrar los formatos del producto; activar = se "activa" al crear el primero.
  const toggleFormats = useCallback((productId: number, val: boolean) => { if (!val) setFormats((fs) => fs.filter((f) => f.productId !== productId)) }, [setFormats])
  const addFormat = useCallback((productId: number, f: Omit<Format, 'id' | 'productId'>) => setFormats((fs) => [...fs, { ...f, id: `f-${productId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, productId }]), [setFormats])
  const updateFormat = useCallback((id: string, patch: Partial<Format>) => setFormats((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f))), [setFormats])
  const deleteFormat = useCallback((id: string) => setFormats((fs) => fs.filter((f) => f.id !== id)), [setFormats])

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
    formats, getFormats, getFormat, productHasFormats, toggleFormats, addFormat, updateFormat, deleteFormat,
    baseStockForSale, canSellFormat, maxUnitsForFormat,
  }
  // Espera a que carguen los formatos para no mostrar un producto con formatos como simple por un instante.
  if (negocioId && !rdyFmt)
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--surface-2, #f6f5f1)' }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid var(--line)', borderTopColor: 'var(--primary)', animation: 'navspin .8s linear infinite' }} />
      </div>
    )
  return <FmtCtx.Provider value={value}>{children}</FmtCtx.Provider>
}
