// ---------- Formato y helpers de datos ----------
// Portado de lib.jsx (parte no-visual). Los componentes de gráfico y StockChip
// viven en components/charts.tsx.

import type { Product, StockState } from '@/types'

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
