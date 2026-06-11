// ---------- Formato y helpers de datos ----------
// Portado de lib.jsx (parte no-visual). Los componentes de gráfico y StockChip
// viven en components/charts.tsx.

import type { Product, StockState, Format } from '@/types'

/** Unidades de medida basadas en peso/volumen (admiten venta a granel y decimales). */
export function UNIT_IS_WEIGHT(unit: string): boolean {
  return ['kg', 'gramo', 'litro', 'mililitro'].includes(unit)
}

/** Para granel: la cantidad se ingresa en g (kg/gramo) o ml (litro/mililitro). */
export function granelInputUnit(unit: string): 'g' | 'ml' {
  return unit === 'litro' || unit === 'mililitro' ? 'ml' : 'g'
}

/** Convierte la cantidad ingresada (g o ml) a la unidad base del producto (kg, gramo, litro, mililitro). */
export function granelToBase(unit: string, small: number): number {
  if (unit === 'kg' || unit === 'litro') return small / 1000 // 1000 g = 1 kg, 1000 ml = 1 L
  return small // gramo / mililitro: la unidad base ya es la chica
}

/** Inverso de granelToBase: de la unidad base (kg, gramo…) a la chica (g/ml) para mostrar. */
export function baseToSmall(unit: string, base: number): number {
  return unit === 'kg' || unit === 'litro' ? Math.round(base * 1000) : base
}

/**
 * Precio de una cantidad arbitraria según TRAMOS (formatos) — "a menor cantidad, mayor precio".
 * Usa la tarifa (precio/cantidad) del tramo más grande que no supere la cantidad pedida
 * (o el tramo más chico si la cantidad es menor a todos). Redondea a peso.
 */
export function precioPorTramo(amountBase: number, formats: Format[]): number {
  const tramos = formats.filter((f) => f.qty > 0).sort((a, b) => a.qty - b.qty)
  if (!tramos.length || amountBase <= 0) return 0
  let tramo = tramos[0]
  for (const f of tramos) if (f.qty <= amountBase) tramo = f
  return Math.round(amountBase * (tramo.price / tramo.qty))
}

export function fmtCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL')
}
export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('es-CL')
}
export function fmtPct(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString('es-CL') + '%'
}

// Colores por categoría conocida; categorías nuevas caen al color por defecto.
export const CAT_COLORS: Record<string, string> = {
  Aceitunas: 'oklch(0.62 0.10 130)',
  Embutidos: 'oklch(0.60 0.13 30)',
  'Frutos secos': 'oklch(0.64 0.10 70)',
  Huevos: 'oklch(0.76 0.11 90)',
  Mantequillas: 'oklch(0.78 0.08 100)',
  Mermeladas: 'oklch(0.62 0.13 10)',
  'Queso de cabra': 'oklch(0.68 0.06 55)',
  Quesos: 'oklch(0.66 0.10 48)',
}

export function catColor(c: string): string {
  return CAT_COLORS[c] || 'var(--ink-3)'
}

/** Precio de despacho de un producto: el fijo si lo definió (>0), si no el precio local. */
export function precioDespachoDe(localPrice: number, precioDespacho: number | null | undefined): number {
  return typeof precioDespacho === 'number' && precioDespacho > 0 ? precioDespacho : localPrice
}

/** Precio de un FORMATO según el canal: online usa su `precioDespacho` propio (si lo definió),
 *  si no, el mismo `price` local. */
export function precioFormatoCanal(
  f: { price: number; precioDespacho?: number | null },
  tipo: 'local' | 'despacho',
): number {
  if (tipo !== 'despacho') return f.price
  return typeof f.precioDespacho === 'number' && f.precioDespacho > 0 ? f.precioDespacho : f.price
}

/** ¿El formato se ofrece en este canal? (canal vacío = 'ambos', retrocompatible). */
export function formatoEnCanal(canal: string | null | undefined, tipo: 'local' | 'despacho'): boolean {
  const c = canal || 'ambos'
  return c === 'ambos' || c === tipo
}

export function stockState(p: Pick<Product, 'stock' | 'min'>): StockState {
  if (p.stock <= 0) return 'sin'
  if (p.stock <= p.min) return 'bajo'
  return 'ok'
}

export const STATE_LABEL: Record<StockState, string> = {
  ok: 'OK',
  bajo: 'Stock bajo',
  sin: 'Sin stock',
}
