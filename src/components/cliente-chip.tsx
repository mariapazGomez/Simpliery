'use client'

// ---------- ClienteChip: chip de categoría de cliente (portado de screen-clientes.jsx) ----------
// Reutilizado por Clientes y Segmentos.

import { Icon } from '@/components/icon'
import type { ClientMetrics } from '@/types'

interface ChipCfg {
  bg: string
  fg: string
  icon: string
}

/** Chips de categoría por tipo de cliente. */
export const CAT_CHIP: Record<string, ChipCfg> = {
  VIP: { bg: 'oklch(0.94 0.04 55)', fg: 'oklch(0.50 0.10 55)', icon: 'star' },
  Frecuente: { bg: 'var(--primary-tint)', fg: 'var(--primary-700)', icon: 'zap' },
  Regular: { bg: 'var(--surface-3)', fg: 'var(--ink-2)', icon: 'clientes' },
  'En riesgo': { bg: 'var(--warn-tint)', fg: 'oklch(0.50 0.10 70)', icon: 'bell' },
  Nuevo: { bg: 'var(--info-tint)', fg: 'var(--info)', icon: 'trendUp' },
}

export function ClienteChip({ cat, size = 'sm' }: { cat: ClientMetrics['categoria'] | string; size?: 'sm' | 'lg' }) {
  const c = CAT_CHIP[cat] || CAT_CHIP.Regular
  return (
    <span className="chip" style={{ background: c.bg, color: c.fg, padding: size === 'lg' ? '5px 13px' : '3px 10px', fontSize: size === 'lg' ? 14 : 12.5 }}>
      <Icon name={c.icon} size={size === 'lg' ? 15 : 12} />
      {cat}
    </span>
  )
}
